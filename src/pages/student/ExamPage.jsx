import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Shield, ShieldAlert, AlertTriangle, Clock, CheckCircle, XCircle, Send,
  Camera, CameraOff, Play, RotateCcw, FileText,
  Star, Target, BookOpen, Lock, Eye, LogOut, Calculator as CalculatorIcon, NotebookPen,
  MessageCircle,
} from 'lucide-react';
import elearningService from '../../services/elearning';
import { useAuth } from '../../context/AuthContext';
import PdfModal from '../../components/exam/PdfModal';
import RichTextEditor from '../../components/exam/RichTextEditor';
import CalculatorWidget from '../../components/exam/CalculatorWidget';
import DraftPad from '../../components/exam/DraftPad';
import ConductNoteModal from '../../components/exam/ConductNoteModal';
import { analyzeFrame, preloadProctoringModels } from '../../utils/examProctoring';
import { sanitizeRichText, stripHtml } from '../../utils/richText';

/* ── constants ───────────────────────────────────────────────────────────── */
const LOG_COOLDOWN      = 3000;
const WEBCAM_INTERVAL   = 30000;
const DETECT_INTERVAL   = 3000;   // local TF.js phone/face detection — cheap, so tighter than the snapshot upload
// Cumulative phone-detection ticks across the whole exam before suspending —
// a single frame where coco-ssd confidently names a phone is already a
// meaningful signal, but requiring a few (not necessarily consecutive)
// occurrences absorbs the rare one-off misclassification.
const PHONE_HIT_THRESHOLD = 3;
// A brief, normal absence — reaching for something on the desk, a stretch —
// must never suspend on its own. Only a face that stays out of frame this
// long (continuously) counts as "left the screen": a red warning banner
// fires first at NO_FACE_WARN_MS so the candidate can come back on their
// own, and only an absence that keeps going past NO_FACE_SUSPEND_MS actually
// suspends.
const NO_FACE_WARN_MS    = 30_000;
const NO_FACE_SUSPEND_MS = 60_000;
// Flat suspension duration for every anti-cheat trigger below: a tab/window
// switch, a blocked copy/paste, a detected phone, a prolonged absence from
// the webcam, or a sustained averted gaze. Each individual block still just
// pauses/resumes — only crossing FRAUD_AUTO_SUBMIT_THRESHOLD total blocks
// (see handleFraudBlock) auto-submits the exam instead.
const FRAUD_SUSPEND_MIN = 5;
// 1st block suspends (as always) + 3 récidives (repeat offenses) also
// suspend — the 4th total block is what auto-submits the exam outright.
const FRAUD_AUTO_SUBMIT_THRESHOLD = 4;

// Mandatory-but-skippable bathroom breaks: every break interval of actual
// exam time (suspensions/breaks themselves don't count toward this clock),
// the exam auto-pauses for BREAK_DURATION_MS with a modal explaining why —
// time spent on a break is never deducted. How many breaks an exam is
// entitled to scales with its own duration (see maxBreaksFor below) rather
// than a flat count — a 1h exam only ever reaches one 30-minute mark with
// meaningful time left afterward, a 1h30 exam reaches two, etc.
// Both the interval (default 30min) and the duration below are admin-
// configurable per exam (SecureExam.break_interval_minutes/
// break_duration_minutes) — e.g. to demo/test the break flow on a short
// exam without waiting a real 30 minutes for one to trigger.
const BREAK_INTERVAL_MS = 30 * 60 * 1000;
const BREAK_DURATION_MS = 3 * 60 * 1000;

// Only counts an interval mark as an earned break if there's still more than
// zero exam time left after it — an exam whose duration is an exact
// multiple of the interval doesn't get a break AT its own final minute,
// since there'd be nothing left to actually work on afterward.
// intervalMinutes defaults to 30 for exams predating the per-exam setting.
function maxBreaksFor(durationMinutes, intervalMinutes) {
  const interval = intervalMinutes || (BREAK_INTERVAL_MS / 60000);
  return Math.max(0, Math.ceil((durationMinutes || 60) / interval) - 1);
}

const BREAK_ORDINALS = ['première', 'seconde', 'troisième', 'quatrième', 'cinquième'];

// Anti-multi-device: interval between two heartbeat pings to the backend
// while an exam is in progress. Must stay comfortably under the server's
// DEVICE_LOCK_STALE_SECONDS (60s) so a single slow/dropped request doesn't
// make another device think this one is gone.
const HEARTBEAT_INTERVAL_MS = 20_000;

/* ── helpers ─────────────────────────────────────────────────────────────── */

// Identifies this browser tab (not this student) for the "one device at a
// time" exam lock — sessionStorage keeps it stable across a reload of the
// same tab, but a new tab/window/device always gets a fresh one.
function getDeviceToken() {
  const KEY = 'exam_device_token';
  let token = sessionStorage.getItem(KEY);
  if (!token) {
    token = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    sessionStorage.setItem(KEY, token);
  }
  return token;
}

function fmtTime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

const QTYPE_META = {
  QCU:       { label: 'QCM',       color: '#6366f1', bg: '#eef2ff' },
  QCM:       { label: 'QCD',       color: '#0ea5e9', bg: '#f0f9ff' },
  TRUEFALSE: { label: 'Vrai/Faux', color: '#059669', bg: '#f0fdf4' },
  TEXT:      { label: 'Texte',     color: '#d97706', bg: '#fffbeb' },
  NUMERIC:   { label: 'Num',       color: '#7c3aed', bg: '#f5f3ff' },
};

/* ── Anti-cheat hook ─────────────────────────────────────────────────────── */
function useAntiCheat({ examId, enabled, onFlag, fullscreenEl, onFraudBlock }) {
  const lastLog  = useRef({});
  const tabCount = useRef(0);
  const fsExitCount = useRef(0);
  const lastSwitchAt = useRef(0);
  // Kept in a ref (not a useCallback dep) so registerTabSwitch/registerFullscreenExit
  // stay stable across renders even as onFraudBlock's identity changes with
  // phase/fraudBlock state — mirrors the same pattern WebcamMonitor uses for
  // its own onFraudBlock prop.
  const onFraudBlockRef = useRef(onFraudBlock);
  useEffect(() => { onFraudBlockRef.current = onFraudBlock; }, [onFraudBlock]);

  const logEvent = useCallback((type, detail = '') => {
    const now = Date.now();
    if (now - (lastLog.current[type] || 0) < LOG_COOLDOWN) return;
    lastLog.current[type] = now;
    // logExamEvent posts to /elearning/exams/<exam_id>/log-event/ (it resolves
    // the session server-side from exam+student) — passing a session id here
    // instead of the exam id 404s silently and the event never reaches the DB.
    if (examId) elearningService.logExamEvent(examId, type, detail).catch(() => {});
    onFlag(type, detail);
  }, [examId, onFlag]);

  // Only two things left trigger a suspension at all: switching away from
  // the exam window/tab, and a copy/paste attempt. Shared by both detection
  // paths for tab-switch (browser-tab switch AND window/app focus loss, e.g.
  // Alt-Tab to another application, minimizing the window, opening File
  // Explorer) so neither one can silently skip the block — a single physical
  // switch usually fires both blur and visibilitychange, so debounce here to
  // avoid double-counting (and double-triggering the suspension) for one
  // switch. Always a flat FRAUD_SUSPEND_MIN suspension, on the very first
  // occurrence — never escalates, never ends the exam on its own.
  const registerTabSwitch = useCallback((detail) => {
    const now = Date.now();
    if (now - lastSwitchAt.current < 1000) return;
    lastSwitchAt.current = now;
    tabCount.current++;
    logEvent('TAB_SWITCH', detail || `#${tabCount.current}`);
    onFraudBlockRef.current?.('Vous avez quitté ou réduit la fenêtre de l\'examen (changement de fenêtre/application détecté).');
  }, [logEvent]);

  // Leaving fullscreen (Esc, OS shortcut...) is still logged/counted
  // (fullscreen_exit_count) and best-effort re-entered, but no longer
  // suspends on its own — only an actual tab/window switch or copy/paste
  // does now.
  const registerFullscreenExit = useCallback(() => {
    fsExitCount.current++;
    logEvent('FULLSCREEN_EXIT', `#${fsExitCount.current}`);
  }, [logEvent]);

  useEffect(() => {
    if (!enabled) return;
    const onBlur   = () => {
      // Clicking inside the in-page PDF subject <iframe> to scroll/select
      // text moves focus into that frame and fires `blur` on the parent
      // window exactly like switching to another tab/app does — even
      // though the student never left this page. document.activeElement
      // becomes the <iframe> element itself in that specific case (and
      // only that case), so this is the reliable way to tell the two
      // apart without also missing a genuine tab/app switch.
      if (document.activeElement?.tagName === 'IFRAME') return;
      registerTabSwitch('Window lost focus');
    };
    const onVis    = () => {
      if (!document.hidden) return;
      // Same false positive as onBlur above (see its comment): interacting
      // with the in-page PDF subject <iframe> — e.g. clicking its native
      // toolbar/zoom controls — can flip document.hidden on some browsers
      // without the student ever actually leaving this tab.
      if (document.activeElement?.tagName === 'IFRAME') return;
      registerTabSwitch(`#${tabCount.current + 1}`);
    };
    const onFsChange = () => {
      if (document.fullscreenElement) return;
      registerFullscreenExit();
      // Best-effort silent re-entry — some browsers only honor
      // requestFullscreen from a fresh user gesture and will just no-op
      // here, which is fine: the event above is still logged and counted
      // either way.
      const el = fullscreenEl?.current;
      if (el?.requestFullscreen) el.requestFullscreen().catch(() => {});
    };
    const blockCopyPaste = e => {
      e.preventDefault();
      logEvent('COPY_ATTEMPT', e.type);
      onFraudBlockRef.current?.('Tentative de copier-coller détectée pendant l\'examen.');
    };
    const blockKeys = e => {
      const blocked = [
        e.key === 'PrintScreen',
        e.ctrlKey && ['c','v','a','s','p','u'].includes(e.key.toLowerCase()),
        e.altKey && e.key === 'Tab',
        e.key === 'F12',
        e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key),
      ];
      if (blocked.some(Boolean)) { e.preventDefault(); logEvent('KEYBOARD_SHORTCUT', e.key); }
    };
    const blockCtx = e => { e.preventDefault(); logEvent('RIGHT_CLICK'); };

    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVis);
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('copy', blockCopyPaste);
    document.addEventListener('cut', blockCopyPaste);
    document.addEventListener('paste', blockCopyPaste);
    document.addEventListener('keydown', blockKeys);
    document.addEventListener('contextmenu', blockCtx);
    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVis);
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('copy', blockCopyPaste);
      document.removeEventListener('cut', blockCopyPaste);
      document.removeEventListener('paste', blockCopyPaste);
      document.removeEventListener('keydown', blockKeys);
      document.removeEventListener('contextmenu', blockCtx);
    };
  }, [enabled, logEvent, registerTabSwitch, registerFullscreenExit, fullscreenEl]);

  return { logEvent };
}

/* ── Webcam ──────────────────────────────────────────────────────────────── */
// Periodically captures snapshots for the teacher to review during
// correction, plus a narrow, local (in-browser) fraud check: a confidently
// phone-shaped object, or a face missing from frame for over a minute
// straight. Deliberately narrow — see examProctoring.js's header comment —
// so an innocent gesture (a hand on the cheek, scratching an itch,
// stretching, briefly reaching off-screen) never gets misread as either one.
function WebcamMonitor({ examId, sessionId, enabled, onFlag, onFraudBlock, paused, breakActive }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [active, setActive] = useState(false);
  // Kept in refs (not effect deps) so the detection interval below doesn't
  // get torn down and restarted every time the parent re-renders with a new
  // callback reference or flips `paused`/`breakActive` — only
  // `enabled`/`active` should do that.
  const onFraudBlockRef = useRef(onFraudBlock);
  const onFlagRef = useRef(onFlag);
  const pausedRef = useRef(paused);
  const breakActiveRef = useRef(breakActive);
  useEffect(() => { onFraudBlockRef.current = onFraudBlock; }, [onFraudBlock]);
  useEffect(() => { onFlagRef.current = onFlag; }, [onFlag]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { breakActiveRef.current = breakActive; }, [breakActive]);
  // The intro screen already confirmed the webcam works before the student
  // was allowed to start, so by the time this mounts any failure to (re-)
  // acquire the stream — including the first attempt here — is a real loss
  // worth flagging for the teacher, not a startup formality.
  const reportedLoss = useRef(false);

  const reportLoss = useCallback((detail) => {
    if (reportedLoss.current || !examId) return;
    reportedLoss.current = true;
    elearningService.logExamEvent(examId, 'WEBCAM_LOST', detail).catch(() => {});
  }, [examId]);

  // A physically covered lens, a closed privacy shutter, or a driver still
  // sharing the device with another app can all report a perfectly "active"
  // MediaStream (green dot, non-zero readyState) while every frame it
  // delivers is uniformly black — indistinguishable from a working camera
  // by the active flag alone, and otherwise uploads useless blank evidence
  // for the whole exam without anyone noticing until correction. Tracked
  // here so both the student (visual warning) and the teacher (logged
  // event) find out immediately instead of after the fact.
  const blankStreakRef = useRef(0);
  const blankReportedRef = useRef(false);
  const [looksBlank, setLooksBlank] = useState(false);
  // A distinct counter for "no frame at all" (readyState never reaches
  // HAVE_CURRENT_DATA) — some locked-down/managed browsers (school lab
  // machines in particular) block autoplay outright even for a muted
  // stream, so the getUserMedia promise resolves (active/green dot) but
  // play() never actually starts and no frame is ever available to sample.
  // Without this, that case bailed out of capture() silently forever, with
  // the green dot misleadingly implying everything was fine.
  const notReadyStreakRef = useRef(0);

  // The <video> element only mounts once `active` flips true (see render
  // below), which happens *after* the getUserMedia promise resolves — so at
  // the time that resolves, videoRef.current is still null and the stream
  // never gets attached to any element once it does mount. A callback ref
  // (instead of a plain useRef) catches the moment the node actually appears
  // and attaches whatever stream is already sitting in streamRef.current.
  // Without this, the video (and every downstream snapshot/AI-detection read
  // of it) stays permanently blank at readyState 0, silently producing zero
  // captures even though the camera itself is working fine.
  const attachVideo = useCallback((node) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      // autoPlay alone isn't always honored when srcObject is assigned to a
      // node that just mounted (vs. one already in the DOM when the stream
      // arrives) — some browsers then leave the element paused at frame 0
      // forever, so both the preview and every capture drawn from it stay
      // blank even though `active`/the green dot correctly say the stream
      // itself is live. An explicit play() call covers that gap.
      node.play?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    // Higher resolution than the archived-snapshot canvas (still 240x180,
    // see the capture effect below) — local phone/face detection reads
    // straight off this video element, and a small, blurry source frame was
    // making coco-ssd miss a phone held right up against the lens.
    navigator.mediaDevices?.getUserMedia({ video: { width: { ideal: 480 }, height: { ideal: 360 }, facingMode: 'user' } })
      .then(s => {
        if (!mounted) { s.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play?.().catch(() => {});
        }
        setActive(true);
        s.getVideoTracks().forEach(track => {
          track.onended = () => {
            setActive(false);
            reportLoss('Caméra déconnectée pendant l\'examen');
          };
        });
      }).catch(() => {
        setActive(false);
        reportLoss('Accès webcam perdu après le démarrage de l\'examen');
      });
    return () => { mounted = false; streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, [enabled, reportLoss]);

  // Snapshot archival — periodic evidence images stored server-side, purely
  // for the teacher's own judgment during correction. Bumped up from the
  // original 240x180 @ 0.6 quality — those were too soft/blurry to make out
  // small details at arm's length.
  useEffect(() => {
    if (!enabled || !active) return;
    const capture = async () => {
      const cv = canvasRef.current; const vd = videoRef.current;
      if (!cv || !vd || vd.readyState < 2) {
        notReadyStreakRef.current += 1;
        if (notReadyStreakRef.current >= 3) {
          setLooksBlank(true);
          if (!blankReportedRef.current && examId) {
            blankReportedRef.current = true;
            elearningService.logExamEvent(examId, 'WEBCAM_BLANK',
              'Flux caméra actif mais aucune image exploitable (lecture vidéo bloquée) — vérifiez les autorisations/paramètres du navigateur.'
            ).catch(() => {});
          }
        }
        return;
      }
      notReadyStreakRef.current = 0;
      cv.width = 480; cv.height = 360;
      const ctx = cv.getContext('2d');
      ctx.drawImage(vd, 0, 0, 480, 360);

      // Cheap average-luma sample (every 10th pixel) over the frame just
      // drawn — three consecutive near-black captures (~90s) is treated as
      // a blank/obstructed camera rather than a single dark room/frame.
      try {
        const { data } = ctx.getImageData(0, 0, 480, 360);
        let sum = 0, n = 0;
        for (let i = 0; i < data.length; i += 40) { sum += (data[i] + data[i + 1] + data[i + 2]) / 3; n++; }
        const avgLuma = n ? sum / n : 0;
        if (avgLuma < 8) {
          blankStreakRef.current += 1;
        } else {
          blankStreakRef.current = 0;
          setLooksBlank(false);
        }
        if (blankStreakRef.current >= 3) {
          setLooksBlank(true);
          if (!blankReportedRef.current && examId) {
            blankReportedRef.current = true;
            elearningService.logExamEvent(examId, 'WEBCAM_BLANK',
              'Image caméra uniformément noire depuis plusieurs captures — objectif peut-être obstrué ou caméra partagée avec une autre application.'
            ).catch(() => {});
          }
        }
      } catch { /* getImageData can throw on a tainted canvas — capture still proceeds below */ }

      cv.toBlob(async blob => {
        if (!blob || !sessionId) return;
        const fd = new FormData(); fd.append('snapshot', blob, `snap_${Date.now()}.jpg`);
        try {
          const res = await elearningService.uploadExamSnapshot(sessionId, fd);
          // Gemini's gaze_direction classification of THIS single snapshot —
          // captures are already WEBCAM_INTERVAL (30s) apart, so one
          // "looking away" verdict already represents a sustained 30s
          // window; no extra streak-counting needed (unlike PHONE_HIT_THRESHOLD,
          // which absorbs occasional misclassifications on a faster local loop).
          // Skipped while already paused/on a break, same as the local
          // phone/face checks below, so this never stacks a second
          // suspension on top of one already showing.
          if (res?.looking_away && !pausedRef.current && !breakActiveRef.current) {
            onFraudBlockRef.current?.('Regard détourné de l\'écran détecté pendant plus de 30 secondes.');
          }
        } catch {}
      }, 'image/jpeg', 0.85);
    };
    const t = setInterval(capture, WEBCAM_INTERVAL); capture();
    return () => clearInterval(t);
  }, [enabled, active, sessionId, examId]);

  // Local, in-browser phone/face detection (TensorFlow.js coco-ssd +
  // blazeface) — see examProctoring.js. Runs entirely on-device, tighter
  // than the snapshot interval since it's free to run more often.
  //  - Phone: cumulative occurrences (not necessarily consecutive) across
  //    the whole exam — reaching PHONE_HIT_THRESHOLD suspends.
  //  - Absence: a *continuous* no-face streak — reaching NO_FACE_WARN_MS
  //    shows the red warning banner (onFlag), reaching NO_FACE_SUSPEND_MS
  //    suspends. Any face sighting resets the streak, so a stretch or a
  //    glance away and back never accumulates toward anything.
  useEffect(() => {
    if (!enabled || !active) return;
    let cancelled = false;
    let busy = false;
    let phoneHits = 0;
    let noFaceSince = null;
    let noFaceWarned = false;
    const detect = async () => {
      if (busy) return;
      busy = true;
      const result = await analyzeFrame(videoRef.current);
      busy = false;
      if (cancelled || !result) return;
      const { phoneDetected, faceCount } = result;

      if (breakActiveRef.current) {
        // Authorized break — stepping away is expected and must never count
        // toward anything once resumed.
        noFaceSince = null; noFaceWarned = false;
        return;
      }
      if (pausedRef.current) {
        // Already suspended (any reason) — detection stays idle rather than
        // stacking a second, unrelated suspension on top of the first.
        noFaceSince = null; noFaceWarned = false;
        return;
      }

      if (phoneDetected) {
        phoneHits++;
        if (phoneHits >= PHONE_HIT_THRESHOLD) {
          phoneHits = 0;
          onFraudBlockRef.current?.('Un téléphone (ou objet ressemblant) a été détecté à plusieurs reprises dans le champ de la webcam.');
          return;
        }
      }

      const now = Date.now();
      if (faceCount === 0) {
        if (!noFaceSince) noFaceSince = now;
        const awayMs = now - noFaceSince;
        if (awayMs >= NO_FACE_SUSPEND_MS) {
          noFaceSince = null; noFaceWarned = false;
          onFraudBlockRef.current?.('Absence prolongée du champ de la webcam pendant plus d\'une minute.');
        } else if (awayMs >= NO_FACE_WARN_MS && !noFaceWarned) {
          noFaceWarned = true;
          if (examId) elearningService.logExamEvent(examId, 'AI_FLAG', 'Absence du champ de la webcam depuis 30s — avertissement avant suspension.').catch(() => {});
          onFlagRef.current?.('NO_FACE_WARNING');
        }
      } else {
        noFaceSince = null;
        noFaceWarned = false;
      }
    };
    const t = setInterval(detect, DETECT_INTERVAL); detect();
    return () => { cancelled = true; clearInterval(t); };
  }, [enabled, active, examId]);

  if (!enabled) return null;
  return (
    <div className="relative flex-shrink-0" title={looksBlank ? 'Votre caméra ne semble transmettre aucune image — vérifiez qu\'aucun cache/volet ne bloque l\'objectif et qu\'aucune autre application ne l\'utilise.' : undefined}>
      <div className="w-24 h-16 rounded-lg overflow-hidden" style={{ background: '#111827' }}>
        {active ? <video ref={attachVideo} autoPlay muted playsInline className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><CameraOff size={16} className="text-gray-600" /></div>}
        {active && looksBlank && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
            <AlertTriangle size={16} className="text-amber-400" />
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${looksBlank ? 'bg-amber-400' : active ? 'bg-green-400' : 'bg-gray-400'}`} />
    </div>
  );
}

/* ── PDF ANSWER SECTION ──────────────────────────────────────────────────── */
// "Répondre dans le système" for exams that carry a PDF subject. Unlike the
// Devoirs page (StudentAssignmentsHub.jsx), this is a proctored exam screen —
// no file-upload mode here: the native OS file picker steals window focus,
// which the anti-cheat's tab-switch detection reads exactly like switching
// to another tab (see useAntiCheat's blur/visibility listeners), risking a
// false suspension for simply attaching a file. Text-in-system is the only
// supported answer mode on this screen. Has its own "Envoyer" button that
// saves immediately (via submitExamFile) rather than only being bundled into
// the exam's final "Soumettre" action — the final submit still resends
// whatever's in content as a safety net (idempotent), but a student
// shouldn't have to trust a silent background save for something they spent
// time writing.
//
// The rich-text editor + built-in calculator below exist for the same
// anti-cheat reason as the missing file-upload mode: alt-tabbing to an OS
// calculator app is itself read as a tab switch. Giving students a
// calculator that lives inside this same page sidesteps that false-positive
// path entirely.
function PdfAnswerSection({ examId, sessionId, content, setContent, error }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [conductOpen, setConductOpen] = useState(false);
  const sentTimer = useRef(null);
  const editorRef = useRef(null);

  const plainText = content.replace(/<[^>]*>/g, '').trim();

  const handleSend = async () => {
    if (!plainText) { setSendError('Rédigez une réponse avant d\'envoyer.'); return; }
    if (!sessionId) { setSendError('Session introuvable — réessayez dans quelques secondes.'); return; }
    setSendError('');
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('note', content);
      await elearningService.submitExamFile(sessionId, fd);
      setSent(true);
      clearTimeout(sentTimer.current);
      sentTimer.current = setTimeout(() => setSent(false), 5000);
    } catch {
      setSendError('Erreur lors de l\'envoi — vérifiez votre connexion et réessayez.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden h-full flex flex-col" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-black" style={{ color: '#1e293b' }}>Votre réponse au sujet PDF</h2>
            <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
              Rédigez votre réponse ci-dessous, puis cliquez sur « Envoyer ». Vous pouvez la modifier et la
              renvoyer autant de fois que nécessaire jusqu'à la soumission finale de l'examen.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setDraftOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
              style={{ background: '#cffafe', color: '#0e7490' }}>
              <NotebookPen className="h-3.5 w-3.5" /> Brouillon
            </button>
            <button onClick={() => setCalculatorOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
              style={{ background: '#ede9fe', color: '#6d28d9' }}>
              <CalculatorIcon className="h-3.5 w-3.5" /> Calculatrice
            </button>
            <button onClick={() => setConductOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
              style={{ background: '#fef3c7', color: '#b45309' }}>
              <MessageCircle className="h-3.5 w-3.5" /> Conduite
            </button>
          </div>
        </div>

        <RichTextEditor
          ref={editorRef}
          initialValue={content}
          onChange={html => { setContent(html); setSent(false); }}
          placeholder="Rédigez votre réponse ici..."
        />

        {(sendError || error) && (
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: '#fef2f2' }}>
            <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: '#dc2626' }} />
            <p className="text-xs font-semibold" style={{ color: '#dc2626' }}>{sendError || error}</p>
          </div>
        )}
      </div>

      {/* A plain flex-shrink-0 footer below the scrollable answer area above
          — always visible, never overlapping the text, since the content
          area scrolls on its own instead of the whole card growing past the
          screen and needing a sticky button pinned over it. */}
      <div className="flex-shrink-0 px-5 py-4" style={{ background: 'white', borderTop: '1px solid #f1f5f9' }}>
        <button onClick={handleSend} disabled={sending}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black text-white disabled:opacity-50 transition-all"
                style={{ background: sent ? 'linear-gradient(135deg,#059669,#047857)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
          {sending
            ? <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            : sent ? <CheckCircle className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          {sending ? 'Envoi en cours…' : sent ? 'Réponse envoyée ✓' : 'Envoyer ma réponse'}
        </button>
      </div>

      {calculatorOpen && (
        <CalculatorWidget
          onClose={() => setCalculatorOpen(false)}
          onInsert={text => { editorRef.current?.insertText(text); setSent(false); }}
        />
      )}

      {draftOpen && (
        <DraftPad examId={examId} onClose={() => setDraftOpen(false)} />
      )}

      {conductOpen && (
        <ConductNoteModal examId={examId} onClose={() => setConductOpen(false)} />
      )}
    </div>
  );
}

/* ── QUESTION CARD ───────────────────────────────────────────────────────── */
function QuestionTimer({ limit, onExpire }) {
  const [left, setLeft] = useState(limit);

  useEffect(() => {
    if (limit <= 0) return;
    setLeft(limit);
    const t = setInterval(() => {
      setLeft(l => {
        if (l <= 1) { clearInterval(t); onExpire(); return 0; }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [limit]);

  if (limit <= 0) return null;
  const pct   = (left / limit) * 100;
  const color = pct > 50 ? '#059669' : pct > 25 ? '#d97706' : '#ef4444';

  return (
    <div className="flex items-center gap-2">
      <Clock className="h-3.5 w-3.5 flex-shrink-0" style={{ color }} />
      <div className="flex-1 h-1.5 rounded-full" style={{ background: '#e2e8f0' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono font-bold flex-shrink-0" style={{ color }}>{fmtTime(left)}</span>
    </div>
  );
}

function QuestionCard({ question, idx, total, answer, onAnswer, expired, onExpire, registerEditorRef, onFocusAnswer }) {
  const choices   = question.choices || [];
  const choiceIds = answer?.choice_ids || [];
  const meta      = QTYPE_META[question.question_type] || QTYPE_META.QCU;

  const pick   = (id) => { if (!expired) onAnswer({ choice_ids: [id] }); };
  const toggle = (id) => {
    if (expired) return;
    const next = choiceIds.includes(id) ? choiceIds.filter(x => x !== id) : [...choiceIds, id];
    onAnswer({ choice_ids: next });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Card header */}
      <div className="rounded-2xl p-5 space-y-3" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-black"
                  style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
            <span className="text-xs font-semibold" style={{ color: '#94a3b8' }}>Question {idx + 1} / {total}</span>
          </div>
          <span className="px-2.5 py-1 rounded-xl text-xs font-bold"
                style={{ background: '#f8fafc', color: '#64748b' }}>
            {question.points || 1} pt{(question.points || 1) > 1 ? 's' : ''}
          </span>
        </div>

        {/* Per-question timer — since every question is visible at once
            there's nothing to "advance" to on expiry; it just locks this
            question's inputs instead (see `expired` below). */}
        {question.time_limit > 0 && !expired && (
          <QuestionTimer key={question.id} limit={question.time_limit} onExpire={onExpire} />
        )}
        {expired && (
          <div className="flex items-center gap-2 text-xs font-bold" style={{ color: '#ef4444' }}>
            <Clock className="h-3.5 w-3.5" /> Temps écoulé pour cette question
          </div>
        )}

        {/* Question text */}
        <div className="text-base font-semibold leading-relaxed" style={{ color: '#1e293b' }}
             dangerouslySetInnerHTML={{ __html: sanitizeRichText(question.text) }} />

        {/* Question précise — distincte de l'énoncé/mise en situation
            ci-dessus (voir ExamManager.jsx). Uniquement pour le type TEXT —
            l'éditeur admin ne montre/édite ce champ que pour ce type, mais
            une question basculée depuis TEXT vers QCM/QCU/Vrai-Faux pouvait
            garder une ancienne valeur de question_prompt en base ; sans ce
            garde-fou, elle s'affichait ici en plus de l'énoncé, comme une
            question dupliquée aux yeux du candidat. */}
        {question.question_type === 'TEXT' && question.question_prompt?.trim() && (
          <div className="pt-2 mt-1" style={{ borderTop: '1.5px dashed #e2e8f0' }}>
            <p className="text-[11px] font-black uppercase tracking-wide mb-1" style={{ color: '#7c3aed' }}>Question</p>
            <div className="text-sm font-semibold leading-relaxed" style={{ color: '#1e293b' }}
                 dangerouslySetInnerHTML={{ __html: sanitizeRichText(question.question_prompt) }} />
          </div>
        )}
      </div>

      {/* Answer area */}
      <div className="rounded-2xl p-5" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', opacity: expired ? 0.6 : 1, pointerEvents: expired ? 'none' : 'auto' }}>
        {(question.question_type === 'TRUEFALSE') ? (
          <div className="grid grid-cols-2 gap-4 h-full">
            {choices.map(c => {
              const isVrai = c.text === 'Vrai';
              const sel    = choiceIds.includes(c.id);
              return (
                <button key={c.id} onClick={() => pick(c.id)}
                        className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 py-10 transition-all font-black text-xl"
                        style={sel
                          ? { borderColor: isVrai ? '#059669' : '#ef4444', background: isVrai ? '#f0fdf4' : '#fef2f2', color: isVrai ? '#059669' : '#ef4444' }
                          : { borderColor: '#e2e8f0', color: '#94a3b8' }}>
                  <span className="text-4xl">{isVrai ? '✓' : '✗'}</span>
                  <span>{c.text}</span>
                </button>
              );
            })}
          </div>
        ) : (question.question_type === 'QCU' || question.question_type === 'QCM') ? (
          <div className="space-y-2.5">
            {choices.map((c, ci) => {
              const sel = choiceIds.includes(c.id);
              const letter = String.fromCharCode(65 + ci);
              return (
                <button key={c.id}
                        onClick={() => question.question_type === 'QCM' ? toggle(c.id) : pick(c.id)}
                        className="w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all"
                        style={sel
                          ? { borderColor: '#6366f1', background: '#eef2ff', color: '#4f46e5' }
                          : { borderColor: '#e2e8f0', color: '#374151' }}>
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
                       style={sel ? { background: '#6366f1', color: 'white' } : { background: '#f1f5f9', color: '#64748b' }}>
                    {sel ? '✓' : letter}
                  </div>
                  <span className="text-sm font-medium">{c.text}</span>
                </button>
              );
            })}
            {question.question_type === 'QCM' && (
              <p className="text-xs pt-1" style={{ color: '#94a3b8' }}>
                Sélectionnez une ou plusieurs réponses
              </p>
            )}
          </div>
        ) : question.question_type === 'NUMERIC' ? (
          <div>
            <input type="number" step="any"
                   value={answer?.numeric_response ?? ''}
                   onChange={e => onAnswer({ numeric_response: e.target.value === '' ? null : parseFloat(e.target.value) })}
                   placeholder="Votre réponse numérique…"
                   disabled={expired}
                   className="w-full border-2 rounded-xl px-4 py-4 text-lg text-center font-semibold outline-none focus:border-indigo-400"
                   style={{ borderColor: '#e2e8f0' }} />
          </div>
        ) : (
          <RichTextEditor
            ref={registerEditorRef}
            initialValue={answer?.text_response || ''}
            onChange={html => onAnswer({ text_response: html })}
            onFocus={onFocusAnswer}
            placeholder="Rédigez votre réponse ici…"
            minHeight={200}
          />
        )}
      </div>
    </div>
  );
}

/* ── QUESTION NAVIGATOR ──────────────────────────────────────────────────── */
function QuestionNav({ questions, answers, onSelect, onSubmit, submitting }) {
  const answered = Object.values(answers).filter(a =>
    (a.choice_ids?.length > 0) || stripHtml(a.text_response) || a.numeric_response != null
  ).length;
  const total = questions.length;

  return (
    <div className="w-full md:w-64 flex flex-col gap-4 flex-shrink-0">
      {/* Progress summary */}
      <div className="rounded-2xl p-4" style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <p className="text-xs font-black mb-3" style={{ color: '#64748b' }}>PROGRESSION</p>
        <div className="h-2 rounded-full mb-2" style={{ background: '#f1f5f9' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${(answered / total) * 100}%`, background: '#6366f1' }} />
        </div>
        <div className="flex justify-between text-xs font-semibold" style={{ color: '#64748b' }}>
          <span>{answered} répondues</span><span>{total - answered} restantes</span>
        </div>
      </div>

      {/* Dot grid — jumps/scrolls to the question, all of them already visible below */}
      <div className="rounded-2xl p-4" style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <p className="text-xs font-black mb-3" style={{ color: '#64748b' }}>ALLER À</p>
        <div className="grid grid-cols-5 gap-2">
          {questions.map((q, i) => {
            const a = answers[q.id];
            const done = !!(a?.choice_ids?.length || stripHtml(a?.text_response) || a?.numeric_response != null);
            return (
              <button key={q.id} onClick={() => onSelect(i)} title={`Question ${i + 1}`}
                      className="h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all"
                      style={done
                        ? { background: '#f0fdf4', color: '#059669', border: '2px solid #86efac' }
                        : { background: '#f8fafc', color: '#94a3b8', border: '1.5px solid #e2e8f0' }}>
                {i + 1}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: '#94a3b8' }}>
          <span className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-green-100 border border-green-300" /> Répondues
          </span>
          <span className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-gray-100 border border-gray-200" /> Non répondues
          </span>
        </div>
      </div>

      {/* Submit */}
      <button onClick={onSubmit} disabled={submitting}
              className="w-full py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 4px 14px rgba(239,68,68,0.35)' }}>
        <Send className="h-4 w-4" />
        {submitting ? 'Envoi en cours…' : 'Soumettre l\'examen'}
      </button>
      <p className="text-center text-xs" style={{ color: '#94a3b8' }}>
        {answered}/{total} questions répondues
      </p>
    </div>
  );
}

/* ── RESULTS PAGE ────────────────────────────────────────────────────────── */
// Never shows the score/pass-fail breakdown right here, regardless of
// whether the quiz part auto-graded — results (once a teacher has reviewed
// the session and finished correcting any manually-graded part) are only
// ever consulted later, from the student's own space.
function ResultsPage({ exam, navigate }) {
  const { logout } = useAuth();
  const handleLogout = async () => {
    try { await logout(); } catch {}
    navigate('/login');
  };

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: '#f8fafc' }}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-3xl p-8 text-center text-white relative overflow-hidden"
             style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
          <div className="relative z-10">
            <CheckCircle className="h-20 w-20 mx-auto mb-4 opacity-90" />
            <h1 className="text-2xl font-black mb-2">{exam?.title}</h1>
            <p className="text-base font-bold mb-1">Merci d'avoir soumis votre examen !</p>
            <p className="text-sm opacity-80">Votre copie a bien été transmise à votre enseignant.</p>
          </div>
          <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white opacity-5" />
          <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-white opacity-5" />
        </div>
        <div className="rounded-2xl p-5 flex items-center gap-3" style={{ background: 'white', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
          <Clock className="h-5 w-5 flex-shrink-0" style={{ color: '#d97706' }} />
          <p className="text-sm font-semibold" style={{ color: '#374151' }}>
            Vous pourrez consulter vos résultats plus tard, une fois la correction terminée, depuis votre espace.
          </p>
        </div>
        <button onClick={() => navigate('/student/dashboard/elearning')}
                className="w-full py-3.5 rounded-2xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
          Retour au tableau de bord E-Learning
        </button>
        <button onClick={handleLogout}
                className="w-full py-3 rounded-2xl text-sm font-bold border-2 flex items-center justify-center gap-2"
                style={{ borderColor: '#e2e8f0', color: '#64748b' }}>
          <LogOut className="h-4 w-4" /> Se déconnecter
        </button>
      </div>
    </div>
  );
}

/* ── SUBMIT MODAL ────────────────────────────────────────────────────────── */
function SubmitModal({ answered, total, onConfirm, onCancel }) {
  const unanswered = total - answered;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 space-y-5"
           style={{ animation: 'fadeInUp .2s ease' }}>
        <div className="text-center">
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
               style={{ background: '#fef2f2' }}>
            <Send className="h-7 w-7" style={{ color: '#ef4444' }} />
          </div>
          <h2 className="text-xl font-black mb-1" style={{ color: '#1e293b' }}>
            Soumettre l'examen ?
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>
            Cette action est <strong>irréversible</strong>. Vos réponses seront envoyées et notées immédiatement.
          </p>
        </div>

        {unanswered > 0 && (
          <div className="flex items-start gap-3 p-3 rounded-xl"
               style={{ background: '#fffbeb', border: '1.5px solid #fde68a' }}>
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: '#d97706' }} />
            <p className="text-xs font-semibold" style={{ color: '#92400e' }}>
              {unanswered} question{unanswered > 1 ? 's' : ''} sans réponse. Elles compteront pour 0 point.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button onClick={onCancel}
                  className="py-3 rounded-2xl text-sm font-bold border-2 transition-all"
                  style={{ borderColor: '#e2e8f0', color: '#64748b' }}>
            Annuler
          </button>
          <button onClick={onConfirm}
                  className="py-3 rounded-2xl text-sm font-black text-white transition-all"
                  style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 4px 14px rgba(239,68,68,0.35)' }}>
            Soumettre
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── LOCKED OVERLAY ──────────────────────────────────────────────────────── */
// Reached either when the exam's own timer runs out (reason='TIME', the
// original/default case), or when a student rack up FRAUD_AUTO_SUBMIT_THRESHOLD
// fraud blocks (reason='FRAUD', see handleFraudBlock) — a single fraud block
// still just pauses/resumes (FraudSuspensionModal) below that count.
function LockedOverlay({ submitted, reason = 'TIME', onViewResults, onDashboard, onLogout }) {
  const title = reason === 'FRAUD' ? 'Examen soumis automatiquement' : 'Temps écoulé';
  const subtitle = reason === 'FRAUD'
    ? 'Trop d\'incidents détectés pendant la composition.'
    : 'Le temps imparti est écoulé.';
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
         style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center space-y-5">
        <div className="h-20 w-20 rounded-full flex items-center justify-center mx-auto"
             style={{ background: '#fef2f2', border: '3px solid #fca5a5' }}>
          <Lock className="h-10 w-10" style={{ color: '#ef4444' }} />
        </div>
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#1e293b' }}>{title}</h1>
          <p className="mt-1 text-xs font-semibold" style={{ color: '#ef4444' }}>{subtitle}</p>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: '#64748b' }}>
            {submitted
              ? 'Vos réponses ont été soumises automatiquement. Votre examen est maintenant verrouillé.'
              : 'Soumission automatique en cours…'}
          </p>
        </div>
        {!submitted && (
          <div className="flex items-center justify-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full animate-ping" style={{ background: '#ef4444' }} />
            <span className="text-sm font-bold" style={{ color: '#ef4444' }}>Envoi en cours…</span>
          </div>
        )}
        {submitted && (
          <div className="space-y-3">
            {onViewResults && (
              <button onClick={onViewResults}
                      className="w-full py-3 rounded-2xl text-sm font-black text-white"
                      style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                Voir mes résultats
              </button>
            )}
            <button onClick={onDashboard}
                    className="w-full py-2.5 rounded-2xl text-sm font-bold border-2"
                    style={{ borderColor: '#e2e8f0', color: '#64748b' }}>
              Retour au tableau de bord
            </button>
            {onLogout && (
              <button onClick={onLogout}
                      className="w-full py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
                      style={{ color: '#94a3b8' }}>
                <LogOut className="h-3.5 w-3.5" /> Se déconnecter
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── FRAUD SUSPENSION MODAL ──────────────────────────────────────────────── */
// A tab/window switch or a copy/paste attempt suspends the exam behind this
// blocking overlay for a flat FRAUD_SUSPEND_MIN minutes — never escalates,
// never ends the exam: the student just waits it out and resumes exactly
// where they were. The exam clock is paused for the duration
// (handleFraudBlock deducts the minutes from timeLeft up front instead) —
// letting it keep running live in the background used to silently burn
// through a short exam's remaining time *during* the block, making the
// resume look broken (exam flashes back for a few seconds, then closes on
// its own).
function FraudSuspensionModal({ reason, until, onExpire }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) onExpire();
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [until, onExpire]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
         style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center space-y-5">
        <div className="h-20 w-20 rounded-full flex items-center justify-center mx-auto"
             style={{ background: '#fef2f2', border: '3px solid #fca5a5' }}>
          <ShieldAlert className="h-10 w-10" style={{ color: '#ef4444' }} />
        </div>
        <div>
          <h1 className="text-xl font-black" style={{ color: '#1e293b' }}>Examen suspendu</h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: '#64748b' }}>{reason}</p>
        </div>
        <div className="text-5xl font-black tabular-nums" style={{ color: '#ef4444' }}>{mm}:{ss}</div>
        <p className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>
          L'examen reprendra automatiquement à la fin du compte à rebours. Ces {FRAUD_SUSPEND_MIN} minutes sont
          déduites de votre temps d'examen — le chronomètre est pour l'instant en pause et reprendra là où il en était.
        </p>
      </div>
    </div>
  );
}

/* ── BATHROOM BREAK MODAL ────────────────────────────────────────────────── */
// Auto-triggered every BREAK_INTERVAL_MS of actual exam time, up to
// maxBreaksFor(exam.duration_minutes) times — the countdown/webcam/anti-cheat
// are all paused for the duration (see breakState wiring above). Skippable
// early via "Reprendre l'examen" for a student who doesn't need the full 3
// minutes.
function BreakModal({ index, total, until, onResume }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) onResume();
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [until, onResume]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
         style={{ background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center space-y-5">
        <div className="h-20 w-20 rounded-full flex items-center justify-center mx-auto"
             style={{ background: '#eff6ff', border: '3px solid #bfdbfe' }}>
          <Clock className="h-10 w-10" style={{ color: '#2563eb' }} />
        </div>
        <div>
          <h1 className="text-xl font-black" style={{ color: '#1e293b' }}>Pause autorisée ({index}/{total})</h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: '#64748b' }}>
            Vous pouvez vous absenter quelques instants (vous soulager, vous étirer...). La surveillance et le
            chronomètre de l'examen sont mis en pause — ce temps n'est pas décompté.
          </p>
        </div>
        <div className="text-5xl font-black tabular-nums" style={{ color: '#2563eb' }}>{mm}:{ss}</div>
        <button onClick={onResume}
                className="w-full py-3.5 rounded-2xl text-sm font-black text-white"
                style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)' }}>
          Reprendre l'examen
        </button>
      </div>
    </div>
  );
}

/* ── INTRO PAGE ──────────────────────────────────────────────────────────── */
function IntroPage({ exam, onStart, error, attemptsExhausted, starting }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => {
    try { await logout(); } catch {}
    navigate('/login');
  };
  const rules = [
    exam?.fullscreen_required && 'Mode plein écran obligatoire',
    exam?.block_copy_paste    && 'Copier-coller désactivé',
    exam?.max_tab_switches != null && `Changements d'onglet limités à ${exam.max_tab_switches}`,
    exam?.webcam_required     && 'Webcam requise — détection de téléphone et d\'absence prolongée du champ de la caméra',
    exam?.ai_proctoring       && 'Surveillance IA activée',
  ].filter(Boolean);

  // iOS Safari on iPhone has no Fullscreen API — informational only, doesn't
  // block starting (startExam() logs FULLSCREEN_UNSUPPORTED instead of
  // silently failing), but the student should know the other checks
  // (webcam/onglet/copier-coller) are what's actually monitoring them here.
  const fullscreenUnsupported = !!exam?.fullscreen_required
    && typeof document !== 'undefined' && document.fullscreenEnabled === false;

  // Webcam pre-flight check — required exams can't be started until this
  // resolves, so a defective/missing camera is caught before the attempt is
  // consumed instead of silently going unmonitored for the whole exam.
  const needsWebcam = !!exam?.webcam_required;
  const [webcamStatus, setWebcamStatus] = useState(needsWebcam ? 'checking' : 'not_required');
  const [webcamError, setWebcamError] = useState('');
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!needsWebcam) return;
    let cancelled = false;
    setWebcamStatus('checking');
    setWebcamError('');
    navigator.mediaDevices?.getUserMedia({ video: { width: 240, height: 180, facingMode: 'user' } })
      .then(stream => {
        // Only testing access here — WebcamMonitor opens its own stream once
        // the exam actually starts, so release this one immediately.
        stream.getTracks().forEach(t => t.stop());
        // Start downloading/warming up the TF.js models now, in parallel
        // with the student reading the exam conditions, so they're already
        // cached by the time WebcamMonitor needs them instead of stalling
        // the first detection tick of the exam.
        preloadProctoringModels();
        if (!cancelled) setWebcamStatus('ready');
      })
      .catch(err => {
        if (cancelled) return;
        setWebcamStatus('failed');
        setWebcamError(
          err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError'
            ? 'Aucune webcam détectée sur cet appareil.'
            : err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
            ? 'Accès à la webcam refusé — autorisez la caméra dans les paramètres de votre navigateur puis réessayez.'
            : 'Impossible d\'accéder à la webcam (vérifiez qu\'aucune autre application ne l\'utilise).'
        );
      });
    return () => { cancelled = true; };
  }, [needsWebcam, retryToken]);

  const canStart = !needsWebcam || webcamStatus === 'ready';
  const [showPdf, setShowPdf] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg,#f8fafc 0%,#e0e7ff 100%)' }}>
      <button onClick={handleLogout}
              className="fixed top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
              style={{ background: 'rgba(255,255,255,0.9)', color: '#64748b', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <LogOut className="h-3.5 w-3.5" /> Déconnexion
      </button>
      <div className="w-full max-w-xl space-y-6">
        {/* Header card */}
        <div className="rounded-3xl p-8 text-center text-white relative overflow-hidden"
             style={{ background: 'linear-gradient(135deg,#ef4444,#7c3aed)' }}>
          <div className="relative z-10">
            <div className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                 style={{ background: 'rgba(255,255,255,0.2)' }}>
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-black mb-1">{exam?.title}</h1>
            {exam?.description && (
              <div className="text-sm opacity-70 mt-2" dangerouslySetInnerHTML={{ __html: sanitizeRichText(exam.description) }} />
            )}
          </div>
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white opacity-10" />
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Durée', value: `${exam?.duration_minutes} min`, icon: Clock, color: '#6366f1' },
            { label: 'Seuil de réussite', value: `${exam?.pass_score_percent || 50}%`, icon: Target, color: '#059669' },
            { label: 'Tentatives', value: exam?.max_attempts || 1, icon: RotateCcw, color: '#d97706' },
            { label: 'Coefficient', value: exam?.coefficient || 1, icon: Star, color: '#ef4444' },
          ].map(c => (
            <div key={c.label} className="rounded-2xl p-4 flex items-center gap-3"
                 style={{ background: 'white', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
              <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background: `${c.color}15` }}>
                <c.icon className="h-5 w-5" style={{ color: c.color }} />
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: '#64748b' }}>{c.label}</p>
                <p className="text-base font-black" style={{ color: '#1e293b' }}>{c.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Rules */}
        {rules.length > 0 && (
          <div className="rounded-2xl p-5" style={{ background: '#fffbeb', border: '1.5px solid #fde68a' }}>
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#92400e' }}>
              Conditions de l'examen
            </p>
            <div className="space-y-2">
              {rules.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm" style={{ color: '#78350f' }}>
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                  {r}
                </div>
              ))}
            </div>
          </div>
        )}

        {fullscreenUnsupported && (
          <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: '#fffbeb', border: '1.5px solid #fde68a' }}>
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: '#d97706' }} />
            <p className="text-xs leading-relaxed" style={{ color: '#92400e' }}>
              Le mode plein écran n'est pas disponible sur cet appareil (iPhone notamment). L'examen reste surveillé
              par les autres contrôles (webcam, changement d'onglet/application, copier-coller).
            </p>
          </div>
        )}

        {/* Webcam pre-flight check */}
        {needsWebcam && (
          <div className="rounded-2xl p-4 flex items-center gap-3"
               style={{
                 background: webcamStatus === 'ready' ? '#f0fdf4' : webcamStatus === 'failed' ? '#fef2f2' : '#f8fafc',
                 border: `1.5px solid ${webcamStatus === 'ready' ? '#bbf7d0' : webcamStatus === 'failed' ? '#fecaca' : '#e2e8f0'}`,
               }}>
            <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: webcamStatus === 'ready' ? '#dcfce7' : webcamStatus === 'failed' ? '#fee2e2' : '#f1f5f9' }}>
              {webcamStatus === 'ready'
                ? <CheckCircle className="h-5 w-5" style={{ color: '#059669' }} />
                : webcamStatus === 'failed'
                ? <CameraOff className="h-5 w-5" style={{ color: '#dc2626' }} />
                : <Camera className="h-5 w-5 animate-pulse" style={{ color: '#64748b' }} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: webcamStatus === 'ready' ? '#059669' : webcamStatus === 'failed' ? '#dc2626' : '#1e293b' }}>
                {webcamStatus === 'ready' ? 'Webcam prête' : webcamStatus === 'failed' ? 'Webcam indisponible' : 'Vérification de la webcam…'}
              </p>
              {webcamStatus === 'failed' && (
                <p className="text-xs mt-0.5" style={{ color: '#b91c1c' }}>
                  {webcamError} Cet examen exige une webcam fonctionnelle pour démarrer.
                </p>
              )}
            </div>
            {webcamStatus === 'failed' && (
              <button onClick={() => setRetryToken(t => t + 1)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0"
                      style={{ background: '#fee2e2', color: '#dc2626' }}>
                <RotateCcw className="h-3.5 w-3.5" /> Réessayer
              </button>
            )}
          </div>
        )}

        {/* PDF — opens in-page (no new tab) so consulting it here, before the
            exam even starts, never risks looking like a tab-switch once the
            anti-cheat listeners arm. */}
        {exam?.exam_pdf && (
          <button onClick={() => setShowPdf(true)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl text-left"
                  style={{ background: '#f5f3ff', border: '1.5px solid #c4b5fd' }}>
            <FileText className="h-5 w-5 flex-shrink-0" style={{ color: '#7c3aed' }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: '#1e293b' }}>Voir l'épreuve PDF</p>
              <p className="text-xs" style={{ color: '#64748b' }}>Consultez le sujet avant de démarrer</p>
            </div>
            <Eye className="h-4 w-4 flex-shrink-0" style={{ color: '#7c3aed' }} />
          </button>
        )}
        {showPdf && <PdfModal url={exam.exam_pdf} onClose={() => setShowPdf(false)} />}

        {error && !attemptsExhausted && (
          <div className="rounded-xl p-3 text-sm flex items-center gap-2"
               style={{ background: '#fef2f2', color: '#dc2626' }}>
            <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {error}
          </div>
        )}

        {attemptsExhausted ? (
          <div className="rounded-2xl p-5 text-center space-y-3" style={{ background: '#fef2f2', border: '1.5px solid #fca5a5' }}>
            <AlertTriangle className="h-8 w-8 mx-auto" style={{ color: '#ef4444' }} />
            <p className="text-sm font-black" style={{ color: '#dc2626' }}>Nombre maximum de tentatives atteint</p>
            <p className="text-xs" style={{ color: '#ef4444' }}>Vous avez utilisé toutes vos tentatives pour cet examen.</p>
          </div>
        ) : (
          <>
            <button onClick={onStart} disabled={!canStart || starting}
                    className="w-full py-4 rounded-2xl font-black text-white flex items-center justify-center gap-3 transition-all cursor-pointer hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:active:scale-100"
                    style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: canStart ? '0 8px 24px rgba(239,68,68,0.4)' : 'none' }}>
              {starting
                ? <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                : <Play className="h-5 w-5" />}
              {starting ? 'Démarrage…' : 'Commencer l\'examen'}
            </button>
            <p className="text-center text-xs" style={{ color: '#94a3b8' }}>
              {!canStart
                ? 'Résolvez le problème de webcam ci-dessus pour pouvoir démarrer.'
                : 'En démarrant, vous acceptez les conditions de surveillance. L\'examen commencera immédiatement.'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ── MAIN EXAM PAGE ──────────────────────────────────────────────────────── */
export default function ExamPage() {
  const { examId } = useParams();
  const navigate   = useNavigate();
  const { logout } = useAuth();
  const handleLogout = async () => {
    try { await logout(); } catch {}
    navigate('/login');
  };

  const [phase, setPhase]       = useState('loading'); // loading | intro | exam | locked | submitted
  const [exam, setExam]         = useState(null);
  const [session, setSession]   = useState(null);
  const [attempt, setAttempt]   = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers]   = useState({});
  const [current, setCurrent]   = useState(0);
  const [expiredIds, setExpiredIds] = useState(() => new Set());
  const questionRefs = useRef({});
  // Calculator/Brouillon on the QCM/questions screen (mirrors the PDF-answer
  // section's widgets) — textEditorRefs + activeTextQuestionId let the
  // calculator's "Insérer" button target whichever TEXT question's rich-text
  // editor the student last focused, since several may be on screen at once.
  const textEditorRefs = useRef({});
  const [activeTextQuestionId, setActiveTextQuestionId] = useState(null);
  const [quizCalculatorOpen, setQuizCalculatorOpen] = useState(false);
  const [quizDraftOpen, setQuizDraftOpen] = useState(false);
  const [quizConductOpen, setQuizConductOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [flags, setFlags]       = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [lockReason, setLockReason] = useState('TIME'); // 'TIME' | 'FRAUD' — see LockedOverlay
  const [error, setError]       = useState('');
  const [result, setResult]     = useState(null);
  const [attemptsExhausted, setAttemptsExhausted] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  // Flat, single-stage suspension (see useAntiCheat's registerTabSwitch/
  // blockCopyPaste) — a tab/window switch or a copy/paste attempt suspends
  // the exam for FRAUD_SUSPEND_MIN minutes, then resumes automatically.
  // Never escalates and never ends the exam on its own.
  const [fraudBlock, setFraudBlock] = useState(null); // { reason, until } | null
  // Mandatory-but-skippable bathroom break (see BREAK_* constants) — null
  // outside a break, otherwise { index, until }. Time spent here is excluded
  // from both the exam countdown and the elapsed-time clock that schedules
  // the next break (see the countdown effect below).
  const [breakState, setBreakState] = useState(null);
  // Confirmation banner shown right after a break ends (timer ran out, or
  // the student clicked "Reprendre l'examen") — "vous avez bénéficié de la
  // première/deuxième... pause", auto-clears after a few seconds since it's
  // a one-off confirmation, not an ongoing warning like the security flags.
  const [breakDoneMsg, setBreakDoneMsg] = useState('');
  const breakDoneTimer = useRef(null);
  const handleBreakResume = useCallback(() => {
    setBreakState(prev => {
      if (prev) {
        const ordinal = BREAK_ORDINALS[prev.index - 1] || `${prev.index}e`;
        setBreakDoneMsg(`Vous avez bénéficié de la ${ordinal} pause de 30 minutes.`);
        clearTimeout(breakDoneTimer.current);
        breakDoneTimer.current = setTimeout(() => setBreakDoneMsg(''), 10000);
      }
      return null;
    });
  }, []);
  const breaksUsedRef = useRef(0);
  const elapsedMsRef = useRef(0);
  // "Répondre dans le système" section for exams that carry a PDF subject
  // (subject_file/exam_pdf) — shown alongside the quiz stepper when the exam
  // also has a quiz, or in its place when the exam is PDF-only. Submitted
  // together with the quiz (if any) from the single "Soumettre" action — see
  // handleSubmit below — mirroring the Assignment ("devoir") submission UX.
  const [pdfContent, setPdfContent] = useState('');
  const [pdfError, setPdfError] = useState('');
  const [contentTab, setContentTab] = useState('questions'); // 'questions' | 'pdf' — only relevant when both a quiz and a PDF are present
  const fullscreenEl = useRef(null);

  // Load exam info
  useEffect(() => {
    elearningService.getSecureExamById(examId)
      .then(res => {
        setExam(res);
        // Block when the student has a submitted OR flagged session (attempts
        // exhausted) — FLAGGED means the anti-cheat auto-submit already closed
        // it, same as a normal submission. In-progress sessions are handled by
        // backend resumption (start-attempt returns existing attempt).
        if (['SUBMITTED', 'FLAGGED'].includes(res.my_session?.status)) {
          setAttemptsExhausted(true);
        }
        setPhase('intro');
      })
      .catch(() => { setError('Examen introuvable.'); setPhase('error'); });
  }, [examId]);

  // Global countdown — paused while fraudBlock is active (see
  // handleFraudBlock below, which deducts the suspension's minutes from
  // timeLeft up front instead). Letting this interval keep running in the
  // background during the suspension modal used to silently drain the
  // clock in real time; on a short exam that could burn through all the
  // remaining time *during* the block, so the exam screen would reappear
  // for only a few seconds before the (already independently expiring)
  // timer closed it — looking like the resume itself was broken.
  useEffect(() => {
    if (phase !== 'exam' || fraudBlock || breakState) return;
    const t = setInterval(() => {
      // Bathroom-break scheduling — ticks alongside the exam countdown so a
      // fraud suspension or an already-active break never counts toward the
      // next one; only genuine exam-taking time does. Checked BEFORE the
      // time's-up lock below and returns early when a break just became
      // due: when the exam's duration is an exact multiple of
      // BREAK_INTERVAL_MS (e.g. a 30-minute exam, or any exam at its last
      // break), both conditions could fire on the very same tick — without
      // this ordering, `setPhase('locked')` won and BreakModal (only
      // rendered in the phase==='exam' tree) never mounted, so the pause
      // silently never appeared. The countdown simply doesn't advance this
      // tick — time spent on a break is never deducted anyway — and resumes
      // (then locks if it's genuinely already at 0) once the break ends.
      elapsedMsRef.current += 1000;
      // Persisted separately from the answers/pdfContent mirror below (which
      // only writes on state changes) so a refresh can restore the *actual*
      // active working time — see the restore logic in startExam() above.
      try { localStorage.setItem(`examElapsed_${examId}`, String(elapsedMsRef.current)); } catch { /* storage unavailable/full */ }
      const examBreakIntervalMs = (exam?.break_interval_minutes || (BREAK_INTERVAL_MS / 60000)) * 60000;
      const examMaxBreaks = maxBreaksFor(exam?.duration_minutes, exam?.break_interval_minutes);
      if (breaksUsedRef.current < examMaxBreaks && elapsedMsRef.current >= (breaksUsedRef.current + 1) * examBreakIntervalMs) {
        breaksUsedRef.current += 1;
        // Admin-configurable per exam (SecureExam.break_duration_minutes) —
        // only the pause's length, not how often it's earned (fixed at
        // BREAK_INTERVAL_MS). Falls back to the old hard-coded 3 minutes for
        // exams predating this setting (shouldn't happen post-migration, but
        // exam could still be null/loading here on a very fast first tick).
        const durationMs = (exam?.break_duration_minutes ?? (BREAK_DURATION_MS / 60000)) * 60000;
        setBreakState({ index: breaksUsedRef.current, until: Date.now() + durationMs });
        return;
      }
      setTimeLeft(l => {
        if (l <= 1) {
          clearInterval(t);
          setPhase('locked');
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, fraudBlock, breakState, exam, examId]);

  // Keep a stable ref to handleSubmit to avoid stale closure in locked effect
  const handleSubmitRef = useRef(null);
  useEffect(() => { handleSubmitRef.current = handleSubmit; });

  // Mirror current question + answers into localStorage as the candidate
  // progresses, so a remount (fraud-block-triggered reload, tab discarded
  // while minimized, accidental refresh) can restore exactly where they
  // were — see the restore logic in startExam() above. fraudBlock rides
  // along too, so refreshing mid-suspension can't be used to skip the wait.
  useEffect(() => {
    if (phase !== 'exam') return;
    try {
      localStorage.setItem(`examProgress_${examId}`, JSON.stringify({
        attemptId: attempt?.id || null, current, answers, pdfContent, fraudBlock,
      }));
    } catch { /* storage unavailable/full — resuming just falls back to the start */ }
  }, [phase, attempt, examId, current, answers, pdfContent, fraudBlock]);

  // Auto-submit when locked — only ever reached once the exam's own timer
  // expires now; a fraud suspension never locks/auto-submits on its own.
  useEffect(() => {
    if (phase !== 'locked') return;
    handleSubmitRef.current?.(true).then(() => setAutoSubmitted(true));
  }, [phase]);

  // Anti-cheat flag handler
  const onFlag = useCallback((type) => {
    const msgs = {
      TAB_SWITCH:        'Changement d\'onglet détecté',
      COPY_ATTEMPT:      'Tentative de copie bloquée',
      KEYBOARD_SHORTCUT: 'Raccourci bloqué',
      RIGHT_CLICK:       'Clic droit bloqué',
      NO_FACE_WARNING:   'Vous avez quitté le champ de la webcam — revenez immédiatement ou l\'examen sera suspendu.',
    };
    setFlags(f => [...f.slice(-3), { type, message: msgs[type] || type }]);
  }, []);

  // Tab/window switch or copy/paste — the only two things left that suspend
  // the exam. Always a flat FRAUD_SUSPEND_MIN minutes, logged server-side
  // for the teacher's own review (fraud_block_count), but never escalates
  // and never ends the exam on its own — the student just waits it out and
  // resumes exactly where they were.
  const handleFraudBlock = useCallback((reason) => {
    if (phase !== 'exam' || fraudBlock) return;
    // Optimistically suspend right away (below) for responsive feedback —
    // the server round-trip below only ever *escalates* that to an
    // auto-submit once fraud_block_count crosses the threshold, it never
    // needs to be awaited to show the suspension itself.
    elearningService.logExamEvent(examId, 'FRAUD_BLOCK', reason).then(res => {
      if ((res?.fraud_block_count ?? 0) >= FRAUD_AUTO_SUBMIT_THRESHOLD) {
        setLockReason('FRAUD');
        setPhase('locked');
      }
    }).catch(() => {});
    // Deduct the penalty once, up front, rather than letting the countdown
    // keep running live during the suspension — the global countdown effect
    // pauses whenever fraudBlock is set, so this is the only place time is
    // actually lost to the block.
    setTimeLeft(t => Math.max(0, t - FRAUD_SUSPEND_MIN * 60));
    setFraudBlock({ reason, until: Date.now() + FRAUD_SUSPEND_MIN * 60 * 1000 });
  }, [phase, fraudBlock, examId]);

  // FraudSuspensionModal's onExpire — just resumes; if the suspension itself
  // ran the clock down to zero, the exam locks (legitimately, on time) right
  // after.
  const handleSuspensionExpire = useCallback(() => {
    setFraudBlock(null);
    if (timeLeft <= 0) setPhase('locked');
  }, [timeLeft]);

  useAntiCheat({
    examId,
    // Suppressed during an authorized break, same as the webcam/gaze checks
    // (see WebcamMonitor's breakActive handling below) — a student stepping
    // away, alt-tabbing, or exiting fullscreen during their 3-minute pause
    // must never trigger an automatic fraud suspension; whether that's
    // actually suspect is left to the teacher's own judgment (e.g. via the
    // session's later review), not an automatic block.
    //
    // Also suppressed whenever the PDF subject panel (contentTab === 'pdf')
    // is the one showing — a targeted activeElement-tagName check here
    // wasn't enough (see onBlur/onVis in useAntiCheat): the browser's native
    // PDF viewer inside the iframe has its own toolbar (zoom, print, "open
    // in new tab"...) and its own keyboard/context-menu handling that never
    // reaches this page's listeners at all, so any interaction with it can
    // still flip document.hidden or steal window focus in ways no DOM signal
    // here can reliably tell apart from a genuine tab switch. copy/paste and
    // keyboard-shortcut blocking were already no-ops for content inside that
    // iframe for the same reason, so disabling the whole hook here loses no
    // real protection — it only stops the false positives.
    enabled: phase === 'exam' && !breakState && contentTab !== 'pdf',
    onFlag,
    fullscreenEl,
    onFraudBlock: handleFraudBlock,
  });

  // Start exam
  const startExam = async () => {
    // Without this guard, a slow first click (webcam re-acquisition, the
    // fullscreen prompt, two sequential API calls) gave zero visual
    // feedback, so a student who wasn't sure it registered would click
    // again — re-running the whole sequence (and risking a second
    // startQuizAttempt/startExamSession call) instead of just waiting.
    if (starting) return;
    setStarting(true);
    setError('');
    try {
      // Always enter fullscreen when starting an exam, regardless of the
      // per-exam fullscreen_required toggle — without it, a student can
      // freely switch to File Explorer or another app to look things up,
      // and only the (separate, tolerant-up-to-a-limit) tab-switch counter
      // would ever notice. Best-effort: some browsers/policies can still
      // block it, so this never blocks starting the exam itself.
      // iOS Safari on iPhone (unlike iPad) has no Fullscreen API at all —
      // requestFullscreen is simply undefined there, so the .catch() below
      // never even fires and the gap goes completely unnoticed by the
      // teacher reviewing flags. Log it explicitly once so mobile sessions
      // are visibly distinguishable from a desktop session that genuinely
      // never left fullscreen.
      if (!document.fullscreenEnabled) {
        elearningService.logExamEvent(examId, 'FULLSCREEN_UNSUPPORTED', 'Plein écran non disponible sur cet appareil (mobile).').catch(() => {});
      } else if (fullscreenEl.current) {
        await fullscreenEl.current.requestFullscreen?.().catch(() => {});
      }

      let att = null;
      let qs  = [];
      // Check quiz attempt quota FIRST (before creating exam session)
      if (exam.quiz) {
        att  = await elearningService.startQuizAttempt(exam.quiz);
        const quiz = await elearningService.getQuizById(exam.quiz);
        // Sort explicitly by `order` rather than trusting the array as
        // received from the API — questions/choices saved before the admin
        // builder started sending an explicit order (or not yet backfilled
        // server-side) all tie at order=0, which showed the student a
        // different question/choice sequence than what the teacher actually
        // composed (and than what the teacher sees while editing).
        const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);
        qs = [...(quiz?.questions || [])].sort(byOrder)
          .map(q => ({ ...q, choices: [...(q.choices || [])].sort(byOrder) }));
      }

      const sess = await elearningService.startExamSession(examId, getDeviceToken());
      setSession(sess);
      if (att) { setAttempt(att); setQuestions(qs); }

      // Resume exactly where the candidate left off — a fraud-block
      // suspension, an accidental reload, or the browser discarding a
      // minimized tab would otherwise silently reset the question index and
      // every answer back to the very start. Mid-exam answers only live in
      // this component's local state (the backend only records them once
      // the exam is finally submitted), so a browser-local snapshot is what
      // makes resuming after a remount possible.
      const storageKey = `examProgress_${examId}`;
      let restored = false;
      let pdfRestored = false;
      let saved = null;
      try {
        saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
        if (saved) {
          if (att && saved.attemptId === att.id) {
            setCurrent(saved.current || 0);
            setAnswers(saved.answers || {});
            restored = true;
          }
          if (saved.pdfContent) { setPdfContent(saved.pdfContent); pdfRestored = true; }
        }
      } catch { /* corrupted/unavailable storage — fall back to a fresh start below */ }
      if (!restored) {
        setCurrent(0);
        setAnswers({});
      }
      // The session may already carry a previously-saved PDF answer (e.g. a
      // resumed session after a fraud-block reload) — the local draft above
      // takes priority since it's more recent, but this is the fallback when
      // localStorage was cleared/unavailable.
      if (!pdfRestored && sess?.submission_note) setPdfContent(sess.submission_note);
      setContentTab(att ? 'questions' : 'pdf');

      // Time actually already elapsed since the session started server-side,
      // not just "reset to the full duration on every startExam() call" —
      // so reloading can't be used to get extra time, and a resumed session
      // correctly shows however much genuinely remains.
      const durationSeconds = (exam.duration_minutes || 60) * 60;
      const startedAtMs = sess?.started_at ? new Date(sess.started_at).getTime() : Date.now();
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
      setTimeLeft(Math.max(0, durationSeconds - elapsedSeconds));
      // Reseed the break-scheduling refs — they're plain useRefs (reset to 0
      // on every remount: reload, tab discard/restore, a fraud-suspension
      // screen swap), so without this a break "due" at the 30-minute mark
      // could silently slip past if the student reloaded partway through, or
      // a break already taken before the reload could wrongly fire again a
      // fresh 30 minutes later. Prefer the persisted *active* elapsed time
      // (see the per-tick write in the countdown effect above) over deriving
      // it from raw wall-clock time since started_at: the wall-clock delta
      // also counts every minute spent suspended or on a break, so a student
      // suspended for a total of 15+ minutes could cross the 30-minute mark
      // in wall-clock terms while having done barely any actual exam work —
      // silently marking a break as already "used" that they never got to
      // take. Falls back to the wall-clock estimate only when nothing was
      // ever persisted (a genuinely fresh first start).
      const persistedElapsedMs = parseInt(localStorage.getItem(`examElapsed_${examId}`), 10);
      const elapsedMs = Number.isFinite(persistedElapsedMs) ? persistedElapsedMs : elapsedSeconds * 1000;
      elapsedMsRef.current = elapsedMs;
      breaksUsedRef.current = Math.min(
        maxBreaksFor(exam?.duration_minutes, exam?.break_interval_minutes),
        Math.floor(elapsedMs / ((exam?.break_interval_minutes || (BREAK_INTERVAL_MS / 60000)) * 60000))
      );

      // Resume an in-progress fraud suspension across the reload too — its
      // `until` timestamp is wall-clock, so simply re-showing the modal
      // picks up with exactly the time actually remaining. timeLeft above
      // is already recomputed from real elapsed time since started_at, so
      // it already reflects time lost during the suspension; nothing extra
      // to deduct here, only the modal itself needs restoring. If `until`
      // has already passed, treat it as naturally expired — don't restore.
      if (saved?.fraudBlock?.until > Date.now()) {
        setFraudBlock(saved.fraudBlock);
      }

      setPhase('exam');
    } catch (e) {
      const status = e?.response?.status;
      if (status === 403) {
        setAttemptsExhausted(true);
        setError('');
      } else if (e?.code === 'DEVICE_LOCKED') {
        setError(e.message || 'Cet examen est déjà ouvert sur un autre appareil.');
        setPhase('error');
      } else {
        setError(e.message || 'Impossible de démarrer l\'examen.');
      }
    } finally {
      setStarting(false);
    }
  };

  // A refresh must never drop the student back on the "Commencer l'examen"
  // screen once a session already exists server-side (status STARTED) —
  // that looked like the exam had been abandoned/reset, when really nothing
  // was lost. start-session/start-attempt are both idempotent (they resume
  // the existing session/attempt instead of creating a new one), so calling
  // startExam() again here is exactly what the "Commencer" button itself
  // does — it just skips the extra click and jumps straight back into the
  // exam, restoring answers/pdfContent/fraudBlock from localStorage same as
  // any other resume.
  useEffect(() => {
    if (phase === 'intro' && exam?.my_session?.status === 'STARTED') {
      startExam();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, exam]);

  // Once the exam is actually launched, the browser Back button must not be
  // able to leave this screen — it would let a student escape a fraud
  // suspension, a fullscreen prompt, or the exam entirely without going
  // through submission. Pushing a dummy history entry and immediately
  // re-pushing it on every popstate traps the student on the current URL;
  // there's nothing behind it to go back to for as long as the exam runs.
  useEffect(() => {
    if (phase !== 'exam') return;
    window.history.pushState(null, '', window.location.href);
    const trapBack = () => window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', trapBack);
    return () => window.removeEventListener('popstate', trapBack);
  }, [phase]);

  // Anti-multi-device: periodic heartbeat while the exam is in progress. If
  // another device/tab has taken over the lock (this one went quiet for too
  // long — e.g. laptop sleep), the server starts rejecting our heartbeats;
  // deliberately does NOT auto-submit here, since the other device may now
  // be the one genuinely finishing the exam — this tab just backs off.
  useEffect(() => {
    if (phase !== 'exam') return;
    const t = setInterval(() => {
      elearningService.heartbeatExamSession(examId, getDeviceToken()).catch((e) => {
        if (e?.code === 'DEVICE_LOCKED') {
          clearInterval(t);
          setError(e.message || 'Votre session a été reprise sur un autre appareil.');
          setPhase('error');
        }
      });
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(t);
  }, [phase, examId]);

  // Submit answers — quiz attempt (if any) and/or the PDF "répondre dans le
  // système" section (if the exam carries a subject PDF), together as one
  // final action. A PDF-only exam has no `attempt` at all, so the old
  // `!attempt` guard would have made "Soumettre" a silent no-op for it.
  const handleSubmit = useCallback(async (auto = false) => {
    if (submitting || (!attempt && !session)) return;
    // A PDF-only exam has nothing else to fall back on — block a voluntary
    // empty submission (auto-submit on timer/fraud lock still goes through
    // regardless, closing the session even with a blank draft).
    if (!auto && !attempt && exam?.exam_pdf && !pdfContent.trim()) {
      setPdfError('Rédigez une réponse avant de soumettre.');
      setContentTab('pdf');
      return;
    }
    setPdfError('');
    setSubmitting(true);
    try {
      let res = null;
      if (attempt) {
        const payload = questions.map(q => {
          const a = answers[q.id] || {};
          return {
            question_id: q.id,
            choice_ids:  a.choice_ids || [],
            text_response:    a.text_response || '',
            numeric_response: a.numeric_response ?? null,
            ordering_response: [],
            matching_response: {},
          };
        });
        res = await elearningService.submitQuizAttempt(attempt.id, payload);
      }
      if (exam?.exam_pdf && session?.id) {
        const fd = new FormData();
        if (pdfContent.trim()) fd.append('note', pdfContent.trim());
        await elearningService.submitExamFile(session.id, fd);
      }
      setResult(res);
      if (document.fullscreenElement) document.exitFullscreen?.();
      try {
        localStorage.removeItem(`examProgress_${examId}`);
        localStorage.removeItem(`examElapsed_${examId}`);
      } catch {}
      setPhase('submitted');
    } catch {
      if (!auto) setError('Erreur lors de la soumission.');
    } finally {
      setSubmitting(false);
    }
  }, [answers, attempt, questions, submitting, examId, exam, session, pdfContent]);

  const setAnswer = (qid, data) => setAnswers(prev => ({ ...prev, [qid]: { ...(prev[qid] || {}), ...data } }));

  /* Phases ---------------------------------------------------------------- */
  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8fafc' }}>
        <div className="space-y-4 text-center">
          <div className="h-12 w-12 rounded-2xl mx-auto" style={{ background: '#fee2e2', animation: 'pulse 2s infinite' }}>
            <Shield className="h-6 w-6 m-3" style={{ color: '#ef4444' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: '#64748b' }}>Chargement de l'examen…</p>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8fafc' }}>
        <div className="text-center space-y-4">
          <XCircle className="h-12 w-12 mx-auto" style={{ color: '#ef4444' }} />
          <p className="text-gray-700">{error}</p>
          <button onClick={() => navigate('/student/dashboard/elearning')} className="text-indigo-600 hover:underline text-sm">Retour</button>
          <button onClick={handleLogout} className="block mx-auto text-slate-400 hover:underline text-xs">Se déconnecter</button>
        </div>
      </div>
    );
  }

  if (phase === 'intro') {
    return <IntroPage exam={exam} onStart={startExam} error={error} attemptsExhausted={attemptsExhausted} starting={starting} />;
  }

  if (phase === 'submitted') {
    return <ResultsPage exam={exam} questions={questions} result={result} navigate={navigate} />;
  }

  if (phase === 'locked') {
    return (
      <LockedOverlay
        submitted={autoSubmitted}
        reason={lockReason}
        onViewResults={autoSubmitted ? () => setPhase('submitted') : null}
        onDashboard={() => navigate('/student/dashboard/elearning')}
        onLogout={handleLogout}
      />
    );
  }

  /* ── EXAM PHASE ── */
  const timerPct   = (exam?.duration_minutes || 60) * 60;
  const pct        = timerPct > 0 ? (timeLeft / timerPct) * 100 : 0;
  const timerColor = timeLeft < 300 ? '#ef4444' : timeLeft < 600 ? '#d97706' : '#059669';
  const answered = Object.values(answers).filter(a =>
    (a.choice_ids?.length > 0) || stripHtml(a.text_response) || a.numeric_response != null
  ).length;
  const hasQuestions = questions.length > 0;
  const hasPdfAnswer = !!exam?.exam_pdf;
  // A PDF-only exam never has a 'questions' tab to switch to, so it always
  // effectively shows the PDF panel regardless of contentTab's stored value
  // (which defaults to 'questions' and is only meaningful once both exist).
  const effectiveTab = hasQuestions ? contentTab : 'pdf';

  return (
    <div ref={fullscreenEl} className="h-screen flex flex-col overflow-hidden" style={{ background: '#f8fafc' }}>
      {showSubmitModal && (
        <SubmitModal
          answered={answered}
          total={questions.length}
          onConfirm={() => { setShowSubmitModal(false); handleSubmit(false); }}
          onCancel={() => setShowSubmitModal(false)}
        />
      )}
      {fraudBlock && (
        <FraudSuspensionModal
          reason={fraudBlock.reason}
          until={fraudBlock.until}
          onExpire={handleSuspensionExpire}
        />
      )}
      {breakState && (
        <BreakModal index={breakState.index} total={maxBreaksFor(exam?.duration_minutes, exam?.break_interval_minutes)} until={breakState.until} onResume={handleBreakResume} />
      )}
      {quizCalculatorOpen && (
        <CalculatorWidget
          onClose={() => setQuizCalculatorOpen(false)}
          onInsert={activeTextQuestionId ? (text => textEditorRefs.current[activeTextQuestionId]?.insertText(text)) : undefined}
        />
      )}
      {quizDraftOpen && (
        <DraftPad examId={examId} onClose={() => setQuizDraftOpen(false)} />
      )}
      {quizConductOpen && (
        <ConductNoteModal examId={examId} onClose={() => setQuizConductOpen(false)} />
      )}
      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* ── TOP BAR ── */}
      <div className="flex-shrink-0" style={{ background: 'white', boxShadow: '0 1px 8px rgba(0,0,0,0.08)' }}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 sm:px-6 py-2 sm:py-3">
          {/* Title */}
          <div className="flex-1 min-w-[100px] order-1">
            <p className="text-sm font-black truncate" style={{ color: '#1e293b' }}>{exam?.title}</p>
            <p className="text-xs" style={{ color: '#94a3b8' }}>{answered}/{questions.length} répondues</p>
          </div>

          {/* Break-just-ended confirmation */}
          {breakDoneMsg && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold order-2"
                 style={{ background: '#eff6ff', color: '#2563eb' }}>
              <Clock className="h-3 w-3" /> {breakDoneMsg}
            </div>
          )}

          {/* Security flags */}
          {flags.slice(-1).map((f, i) => (
            <div key={i} className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold order-2"
                 style={{ background: '#fef2f2', color: '#ef4444' }}>
              <AlertTriangle className="h-3 w-3" /> {f.message}
            </div>
          ))}

          {/* Timer */}
          <div className="flex items-center gap-2 order-2 sm:order-3">
            <Clock className="h-4 w-4 flex-shrink-0" style={{ color: timerColor }} />
            <span className="font-mono font-black text-xl sm:text-2xl" style={{ color: timerColor, minWidth: 70 }}>
              {fmtTime(timeLeft)}
            </span>
          </div>

          {/* Webcam */}
          <div className="order-3 sm:order-4">
            <WebcamMonitor examId={examId} sessionId={session?.id} enabled={!!exam?.webcam_required}
                           onFlag={onFlag} onFraudBlock={handleFraudBlock}
                           paused={!!fraudBlock} breakActive={!!breakState} />
          </div>

          {/* Submit */}
          <button onClick={() => setShowSubmitModal(true)}
                  disabled={submitting}
                  className="order-4 sm:order-5 flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
            <Send className="h-3.5 w-3.5" />
            {submitting ? '…' : 'Soumettre'}
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1" style={{ background: '#f1f5f9' }}>
          <div className="h-full transition-all"
               style={{ width: `${pct}%`, background: timerColor }} />
        </div>
      </div>


      {/* ── MAIN AREA ── */}
      {/* Stacked (question, then navigator below) and whole-page-scrolling on
          mobile/tablet — the fixed side-by-side split (question left, w-64
          navigator right) only has room to breathe on a desktop-width
          viewport; below md it left the question area squeezed into a sliver. */}
      <div className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row gap-3 p-3 sm:p-6">
        {/* Sujet — shown automatically the moment composition starts (no more
            click-to-open button/modal), taking half the screen alongside the
            questions/answer on desktop, stretched to the full available
            height (not just 50vh, which used to leave the pane looking
            half-empty on tall viewports). Stacked above the content at a
            fixed height on narrow screens, where a true 50/50 split wouldn't
            leave room to work. Never a new tab (iframe, in-page) so it can't
            be mistaken for a tab switch by the anti-cheat. */}
        {exam?.exam_pdf && (
          <div className="w-full md:w-1/2 flex-shrink-0 flex flex-col rounded-2xl overflow-hidden h-[50vh] md:h-auto">
            <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2"
                 style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
              <FileText className="h-4 w-4 text-white" />
              <span className="text-xs font-black text-white">Sujet de l'examen</span>
            </div>
            {/* #navpanes=0 hides Chrome's built-in PDF.js thumbnail sidebar,
                #toolbar=0 its top toolbar — together they let the PDF page
                itself fill 100% of the pane instead of being squeezed by
                chrome the student never needs here. */}
            <iframe src={`${exam.exam_pdf}#toolbar=0&navpanes=0`} title="Sujet de l'examen" className="flex-1 w-full" style={{ border: 'none' }} />
          </div>
        )}

        <div className="flex-1 md:overflow-hidden flex flex-col gap-3 min-w-0">
        {/* Questions / Réponse PDF switcher — only shown when the exam
            combines a quiz AND a PDF subject; a PDF-only exam skips straight
            to the answer section below, a quiz-only exam skips straight to
            the stepper, so nobody sees a pointless single-item switcher. */}
        {hasQuestions && hasPdfAnswer && (
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => setContentTab('questions')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${effectiveTab === 'questions' ? '' : 'animate-pulse'}`}
                    style={effectiveTab === 'questions' ? { background: '#6366f1', color: 'white' } : { background: '#fee2e2', color: '#b91c1c', boxShadow: '0 1px 4px #0001' }}>
              <BookOpen className="h-3.5 w-3.5" /> Répondez aux QCM ({answered}/{questions.length})
            </button>
            <button onClick={() => setContentTab('pdf')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${effectiveTab === 'pdf' ? '' : 'animate-pulse'}`}
                    style={effectiveTab === 'pdf' ? { background: '#7c3aed', color: 'white' } : { background: '#fee2e2', color: '#b91c1c', boxShadow: '0 1px 4px #0001' }}>
              <FileText className="h-3.5 w-3.5" /> Répondez aux questions du sujet
            </button>
          </div>
        )}

        <div className="flex-1 md:overflow-hidden flex flex-col md:flex-row gap-4 md:gap-6">
          {effectiveTab === 'questions' && hasQuestions && (
            <>
              {/* Question area */}
              <div className="flex-1 md:overflow-y-auto flex flex-col gap-4">
                {/* Calculator/Brouillon — available for every question type,
                    not just the PDF-answer section, so a QCM/numeric/TEXT
                    question can be worked out the same way. Sticky so it
                    stays reachable while scrolling through 10+ questions
                    instead of scrolling out of view after question 1. */}
                <div className="sticky top-0 z-10 flex items-center gap-2 flex-shrink-0 py-1 -mx-1 px-1"
                     style={{ background: 'linear-gradient(#f8fafc 70%, transparent)' }}>
                  <button onClick={() => setQuizDraftOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shadow-sm"
                    style={{ background: '#cffafe', color: '#0e7490' }}>
                    <NotebookPen className="h-3.5 w-3.5" /> Brouillon
                  </button>
                  <button onClick={() => setQuizCalculatorOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shadow-sm"
                    style={{ background: '#ede9fe', color: '#6d28d9' }}>
                    <CalculatorIcon className="h-3.5 w-3.5" /> Calculatrice
                  </button>
                  <button onClick={() => setQuizConductOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shadow-sm"
                    style={{ background: '#fef3c7', color: '#b45309' }}>
                    <MessageCircle className="h-3.5 w-3.5" /> Conduite
                  </button>
                </div>
                {questions.map((question, i) => (
                  <div key={question.id} ref={el => { questionRefs.current[question.id] = el; }}>
                    <QuestionCard
                      question={question}
                      idx={i}
                      total={questions.length}
                      answer={answers[question.id]}
                      onAnswer={(data) => setAnswer(question.id, data)}
                      expired={expiredIds.has(question.id)}
                      onExpire={() => setExpiredIds(prev => new Set(prev).add(question.id))}
                      registerEditorRef={question.question_type === 'TEXT' ? (el => { textEditorRefs.current[question.id] = el; }) : undefined}
                      onFocusAnswer={question.question_type === 'TEXT' ? (() => setActiveTextQuestionId(question.id)) : undefined}
                    />
                  </div>
                ))}
              </div>

              {/* Navigator */}
              <div className="w-full md:w-auto flex-shrink-0 md:overflow-y-auto">
                <QuestionNav
                  questions={questions}
                  answers={answers}
                  onSelect={i => {
                    setCurrent(i);
                    questionRefs.current[questions[i].id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  onSubmit={() => setShowSubmitModal(true)}
                  submitting={submitting}
                />
              </div>
            </>
          )}

          {effectiveTab === 'pdf' && hasPdfAnswer && (
            <div className="flex-1 md:overflow-y-auto">
              <PdfAnswerSection
                examId={examId}
                sessionId={session?.id}
                content={pdfContent} setContent={setPdfContent}
                error={pdfError}
              />
            </div>
          )}

          {!hasQuestions && !hasPdfAnswer && (
            <div className="flex-1 flex flex-col items-center justify-center h-full" style={{ color: '#94a3b8' }}>
              <BookOpen className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Aucune question disponible</p>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
