import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Shield, ShieldAlert, AlertTriangle, AlertCircle, Clock, ChevronRight, CheckCircle, XCircle, Send,
  Camera, CameraOff, Play, RotateCcw, FileText,
  ChevronLeft, Award, Star, Target, BookOpen, Lock, Eye, LogOut,
} from 'lucide-react';
import elearningService from '../../services/elearning';
import { analyzeFrame, preloadProctoringModels } from '../../utils/examProctoring';
import { useAuth } from '../../context/AuthContext';
import PdfModal from '../../components/exam/PdfModal';

/* ── constants ───────────────────────────────────────────────────────────── */
const LOG_COOLDOWN      = 3000;
const WEBCAM_INTERVAL   = 30000;
const DETECT_INTERVAL   = 3000;   // local TF.js detection — cheap, so tighter than the snapshot upload
const AI_FLAG_COOLDOWN  = 20000;  // avoid spamming log-event while a phone stays in frame
const FRAUD_HIT_THRESHOLD = 3; // total occurrences of the same issue across the whole exam before a hard block
const GAZE_LABEL = { gauche: 'vers la gauche', droite: 'vers la droite', haut: 'vers le haut', bas: 'vers le bas' };
// Looking-away escalation is duration-based, not count-based like the other
// categories above: a continuous away-streak only counts as an "incident"
// once it exceeds 30s (brief, normal glances never count). Two independent
// running totals are then tracked for the whole exam — total incidents and
// total cumulated away-time — and escalates to onFraudBlock the moment
// EITHER crosses its own threshold, whichever comes first: enough short
// incidents (GAZE_TOLERATED_INCIDENTS), or fewer but longer ones adding up
// to GAZE_CUM_SUSPEND_MS. Keeping these decoupled (rather than a single
// "tolerate N, then check the sum" gate) avoids a degenerate threshold: with
// incidents required to individually exceed GAZE_STRIKE_MIN_MS, N of them
// are *mathematically guaranteed* to already sum past any cumulative
// threshold set below N × GAZE_STRIKE_MIN_MS, making that threshold
// meaningless — two independent counters don't have that failure mode.
const GAZE_STRIKE_MIN_MS       = 30_000;
const GAZE_TOLERATED_INCIDENTS = 5;
const GAZE_CUM_SUSPEND_MS      = 5 * 60 * 1000;

/* ── helpers ─────────────────────────────────────────────────────────────── */
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

  // Shared by both detection paths (browser-tab switch AND window/app focus loss,
  // e.g. Alt-Tab to another application, minimizing the window, opening File
  // Explorer) so neither one can silently skip the block — a single physical
  // switch usually fires both blur and visibilitychange, so debounce here to
  // avoid double-counting (and double-triggering the fraud block) for one
  // switch. Leaving the exam window at all is treated as seriously as a
  // webcam-detected fraud signal — same 5-minute-suspend-then-terminate flow,
  // triggered on the very first occurrence rather than waiting for a count.
  const registerTabSwitch = useCallback((detail) => {
    const now = Date.now();
    if (now - lastSwitchAt.current < 1000) return;
    lastSwitchAt.current = now;
    tabCount.current++;
    logEvent('TAB_SWITCH', detail || `#${tabCount.current}`);
    onFraudBlockRef.current?.('Vous avez quitté ou réduit la fenêtre de l\'examen (changement de fenêtre/application détecté).');
  }, [logEvent]);

  // Leaving fullscreen (Esc, OS shortcut...) is exactly the kind of "browsing
  // the computer" escape hatch fullscreen mode is meant to close — the
  // backend already had a dedicated FULLSCREEN_EXIT event type and counter
  // (fullscreen_exit_count) that nothing on the frontend ever fired.
  const registerFullscreenExit = useCallback(() => {
    fsExitCount.current++;
    logEvent('FULLSCREEN_EXIT', `#${fsExitCount.current}`);
    onFraudBlockRef.current?.('Vous avez quitté le mode plein écran pendant l\'examen.');
  }, [logEvent]);

  useEffect(() => {
    if (!enabled) return;
    const onBlur   = () => registerTabSwitch('Window lost focus');
    const onVis    = () => {
      if (document.hidden) registerTabSwitch(`#${tabCount.current + 1}`);
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
    const blockCopy = e => { e.preventDefault(); logEvent('COPY_ATTEMPT', e.type); };
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
    document.addEventListener('copy', blockCopy);
    document.addEventListener('cut', blockCopy);
    document.addEventListener('keydown', blockKeys);
    document.addEventListener('contextmenu', blockCtx);
    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVis);
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('copy', blockCopy);
      document.removeEventListener('cut', blockCopy);
      document.removeEventListener('keydown', blockKeys);
      document.removeEventListener('contextmenu', blockCtx);
    };
  }, [enabled, logEvent, registerTabSwitch, registerFullscreenExit, fullscreenEl]);

  return { logEvent };
}

/* ── Webcam ──────────────────────────────────────────────────────────────── */
function WebcamMonitor({ examId, sessionId, enabled, onFlag, onFraudBlock, onGazeWarning, onSuspensionEvent, paused }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [active, setActive] = useState(false);
  const [faceOk, setFaceOk] = useState(null);
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

  // Local (in-browser) phone/face detection via TensorFlow.js — no external
  // AI account needed. Cooldown per message so a phone held up continuously
  // doesn't flood log-event.
  const lastAiFlag = useRef({});
  const flagLocal = useCallback((detail) => {
    const now = Date.now();
    if (now - (lastAiFlag.current[detail] || 0) < AI_FLAG_COOLDOWN) return;
    lastAiFlag.current[detail] = now;
    if (examId) elearningService.logExamEvent(examId, 'AI_FLAG', detail).catch(() => {});
    onFlag?.(detail);
  }, [examId, onFlag]);

  // Kept in refs (not effect deps) so the detection interval below doesn't
  // get torn down and restarted every time the parent re-renders with a new
  // callback reference or flips `paused` — only `enabled`/`active` should
  // do that.
  const onFraudBlockRef = useRef(onFraudBlock);
  const onGazeWarningRef = useRef(onGazeWarning);
  const onSuspensionEventRef = useRef(onSuspensionEvent);
  const pausedRef = useRef(paused);
  useEffect(() => { onFraudBlockRef.current = onFraudBlock; }, [onFraudBlock]);
  useEffect(() => { onGazeWarningRef.current = onGazeWarning; }, [onGazeWarning]);
  useEffect(() => { onSuspensionEventRef.current = onSuspensionEvent; }, [onSuspensionEvent]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

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
    if (node && streamRef.current) node.srcObject = streamRef.current;
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
        if (videoRef.current) videoRef.current.srcObject = s;
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

  // Snapshot archival — periodic evidence images stored server-side for the
  // admin correction screen, analyzed by Gemini there. Bumped up from the
  // original 240x180 @ 0.6 quality — those were too soft/blurry for the AI
  // (and a human reviewer) to make out small objects like a phone held at
  // arm's length. Detection itself happens locally below in real time; this
  // is just the archived evidence trail.
  useEffect(() => {
    if (!enabled || !active) return;
    const capture = async () => {
      const cv = canvasRef.current; const vd = videoRef.current;
      if (!cv || !vd || vd.readyState < 2) return;
      cv.width = 480; cv.height = 360;
      cv.getContext('2d').drawImage(vd, 0, 0, 480, 360);
      cv.toBlob(async blob => {
        if (!blob || !sessionId) return;
        const fd = new FormData(); fd.append('snapshot', blob, `snap_${Date.now()}.jpg`);
        try { await elearningService.uploadExamSnapshot(sessionId, fd); } catch {}
      }, 'image/jpeg', 0.85);
    };
    const t = setInterval(capture, WEBCAM_INTERVAL); capture();
    return () => clearInterval(t);
  }, [enabled, active, sessionId]);

  // Local, in-browser phone/face/gaze detection (TensorFlow.js coco-ssd +
  // blazeface). Runs entirely on-device — no API key, no per-image network
  // cost — and tighter than the snapshot interval since it's free to run
  // more often. Two tiers of response:
  //  - A single positive tick raises the lightweight banner + AI_FLAG log
  //    (flagLocal, cooldown-based) so the admin sees *something* happened.
  //  - The SAME category reaching FRAUD_HIT_THRESHOLD total occurrences
  //    ANYWHERE across the exam — not necessarily back-to-back — escalates
  //    to a hard block (onFraudBlock). Counting cumulatively rather than
  //    requiring consecutive ticks matters in practice: a student flashing a
  //    phone briefly several times, minutes apart, is just as much a
  //    repeated attempt as one continuous 6-second hold, and a strict
  //    consecutive-run requirement let every one of those brief attempts
  //    reset the count back to zero before it could ever add up.
  useEffect(() => {
    if (!enabled || !active) return;
    let cancelled = false;
    let busy = false;
    const totals = { phone: 0, noFace: 0, multiFace: 0 };
    // Gaze-away episode tracking (duration-based — see GAZE_* constants).
    // gazeEpisode holds the timestamp the current continuous away-streak
    // started, or null while the student is looking at the screen.
    // gazeIncidentCount/gazeTotalMs are running totals across the whole
    // exam attempt, fed by every qualifying (>30s) episode.
    let gazeEpisode = null;
    let gazeIncidentCount = 0;
    let gazeTotalMs = 0;
    const detect = async () => {
      if (busy) return;
      busy = true;
      const result = await analyzeFrame(videoRef.current);
      busy = false;
      if (cancelled || !result) return;
      const { phoneDetected, faceCount, gazeAway } = result;
      setFaceOk(faceCount === 1);

      if (pausedRef.current) {
        // Suspended (5- or 10-minute block) — keep watching instead of going
        // blind, but route any positive reading into the suspension-review
        // collector rather than the normal strike/threshold pipeline below,
        // which is for detecting the *first* offense. Once already
        // suspended, a single positive reading is worth surfacing to the
        // student at the resume review, full stop — see onSuspensionEvent.
        if (phoneDetected) onSuspensionEventRef.current?.('phone', 'Objet suspect (téléphone, cahier, notes...) tenu ou visible.');
        else if (faceCount === 0) onSuspensionEventRef.current?.('noFace', 'Absence du champ de la webcam (déplacement, éloignement, ou levé du poste).');
        else if (faceCount > 1) onSuspensionEventRef.current?.('multiFace', 'Présence d\'une autre personne / conversation détectée.');
        else if (gazeAway) onSuspensionEventRef.current?.('gaze', `Regard détourné de l'écran (${GAZE_LABEL[gazeAway]}).`);
        gazeEpisode = null; // don't let a streak spanning the pause boundary get misattributed once resumed
        return;
      }

      if (phoneDetected) {
        flagLocal('Téléphone détecté (analyse locale sur l\'appareil) — tentative de fraude signalée.');
      } else if (faceCount === 0) {
        flagLocal('Visage non détecté (analyse locale) — restez visible pendant l\'examen.');
      } else if (faceCount > 1) {
        flagLocal('Plusieurs visages détectés dans le champ de la webcam (analyse locale).');
      } else if (gazeAway) {
        flagLocal(`Regard détourné de l'écran (${GAZE_LABEL[gazeAway]}) — restez face à l'écran.`);
      }

      if (phoneDetected) totals.phone++;
      if (faceCount === 0) totals.noFace++;
      if (faceCount > 1) totals.multiFace++;

      // Duration-based looking-away escalation. A continuous streak only
      // becomes an "incident" once it exceeds GAZE_STRIKE_MIN_MS; escalates
      // to onFraudBlock the moment EITHER running total crosses its own
      // threshold — enough incidents (GAZE_TOLERATED_INCIDENTS) or enough
      // cumulated away-time (GAZE_CUM_SUSPEND_MS), whichever comes first.
      const now = Date.now();
      if (gazeAway) {
        if (!gazeEpisode) gazeEpisode = now;
      } else if (gazeEpisode) {
        const durationMs = now - gazeEpisode;
        gazeEpisode = null;
        if (durationMs > GAZE_STRIKE_MIN_MS) {
          gazeIncidentCount++;
          gazeTotalMs += durationMs;
          const secs = Math.round(durationMs / 1000);
          const totalMin = (gazeTotalMs / 60000).toFixed(1);
          if (gazeIncidentCount >= GAZE_TOLERATED_INCIDENTS || gazeTotalMs >= GAZE_CUM_SUSPEND_MS) {
            onFraudBlockRef.current?.(`Regard détourné de l'écran répété (${gazeIncidentCount} épisodes, ${totalMin} min cumulées) — comportement suspect confirmé.`);
          } else {
            onGazeWarningRef.current?.(gazeIncidentCount, secs, totalMin);
          }
        }
      }

      if (totals.phone >= FRAUD_HIT_THRESHOLD) {
        totals.phone = 0;
        onFraudBlockRef.current?.('Un objet suspect (téléphone, papier, ou autre) a été tenu ou approché de votre visage à plusieurs reprises pendant l\'examen.');
      } else if (totals.multiFace >= FRAUD_HIT_THRESHOLD) {
        totals.multiFace = 0;
        onFraudBlockRef.current?.('Une autre personne a été détectée à plusieurs reprises dans le champ de la webcam — conversation ou aide extérieure suspectée.');
      } else if (totals.noFace >= FRAUD_HIT_THRESHOLD) {
        totals.noFace = 0;
        onFraudBlockRef.current?.('Vous avez quitté le champ de la webcam ou regardé derrière vous à plusieurs reprises pendant l\'examen.');
      }
    };
    const t = setInterval(detect, DETECT_INTERVAL); detect();
    return () => { cancelled = true; clearInterval(t); };
  }, [enabled, active, flagLocal]);

  if (!enabled) return null;
  return (
    <div className="relative flex-shrink-0">
      <div className="w-24 h-16 rounded-lg overflow-hidden" style={{ background: '#111827' }}>
        {active ? <video ref={attachVideo} autoPlay muted playsInline className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><CameraOff size={16} className="text-gray-600" /></div>}
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
        !active ? 'bg-gray-400' : faceOk === false ? 'bg-red-500 animate-pulse' : 'bg-green-400'}`} />
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
function PdfAnswerSection({ sessionId, content, setContent, error }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');
  const sentTimer = useRef(null);

  const handleSend = async () => {
    if (!content.trim()) { setSendError('Rédigez une réponse avant d\'envoyer.'); return; }
    if (!sessionId) { setSendError('Session introuvable — réessayez dans quelques secondes.'); return; }
    setSendError('');
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('note', content.trim());
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
    <div className="rounded-2xl p-5 space-y-4 h-full" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <div>
        <h2 className="text-sm font-black" style={{ color: '#1e293b' }}>Votre réponse au sujet PDF</h2>
        <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
          Rédigez votre réponse ci-dessous, puis cliquez sur « Envoyer ». Vous pouvez la modifier et la
          renvoyer autant de fois que nécessaire jusqu'à la soumission finale de l'examen.
        </p>
      </div>

      <textarea value={content} onChange={e => { setContent(e.target.value); setSent(false); }} rows={14}
                placeholder="Rédigez votre réponse ici..."
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#374151', lineHeight: '1.6' }} />

      {(sendError || error) && (
        <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: '#fef2f2' }}>
          <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: '#dc2626' }} />
          <p className="text-xs font-semibold" style={{ color: '#dc2626' }}>{sendError || error}</p>
        </div>
      )}

      <button onClick={handleSend} disabled={sending}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black text-white disabled:opacity-50 transition-all"
              style={{ background: sent ? 'linear-gradient(135deg,#059669,#047857)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
        {sending
          ? <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          : sent ? <CheckCircle className="h-4 w-4" /> : <Send className="h-4 w-4" />}
        {sending ? 'Envoi en cours…' : sent ? 'Réponse envoyée ✓' : 'Envoyer ma réponse'}
      </button>
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

function QuestionCard({ question, idx, total, answer, onAnswer, onPrev, onNext, onExpire }) {
  const choices   = question.choices || [];
  const choiceIds = answer?.choice_ids || [];
  const meta      = QTYPE_META[question.question_type] || QTYPE_META.QCU;

  const pick   = (id) => onAnswer({ choice_ids: [id] });
  const toggle = (id) => {
    const next = choiceIds.includes(id) ? choiceIds.filter(x => x !== id) : [...choiceIds, id];
    onAnswer({ choice_ids: next });
  };

  return (
    <div className="flex flex-col gap-5 h-full">
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

        {/* Per-question timer */}
        {question.time_limit > 0 && (
          <QuestionTimer key={question.id} limit={question.time_limit} onExpire={onExpire} />
        )}

        {/* Question text */}
        <p className="text-base font-semibold leading-relaxed" style={{ color: '#1e293b' }}>
          {question.text}
        </p>
      </div>

      {/* Answer area */}
      <div className="rounded-2xl p-5 flex-1" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
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
                   className="w-full border-2 rounded-xl px-4 py-4 text-lg text-center font-semibold outline-none focus:border-indigo-400"
                   style={{ borderColor: '#e2e8f0' }} />
          </div>
        ) : (
          <textarea value={answer?.text_response || ''}
                    onChange={e => onAnswer({ text_response: e.target.value })}
                    rows={8}
                    placeholder="Rédigez votre réponse ici…"
                    className="w-full border-2 rounded-xl px-4 py-3 text-sm resize-none outline-none focus:border-amber-400"
                    style={{ borderColor: '#e2e8f0' }} />
        )}
      </div>

      {/* Nav buttons */}
      <div className="flex items-center justify-between">
        <button onClick={onPrev} disabled={idx === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-30"
                style={{ background: '#f1f5f9', color: '#374151' }}>
          <ChevronLeft className="h-4 w-4" /> Précédente
        </button>
        <span className="text-xs" style={{ color: '#94a3b8' }}>
          {idx + 1} / {total}
        </span>
        <button onClick={onNext} disabled={idx === total - 1}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-30"
                style={{ background: '#f1f5f9', color: '#374151' }}>
          Suivante <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ── QUESTION NAVIGATOR ──────────────────────────────────────────────────── */
function QuestionNav({ questions, current, answers, onSelect, onSubmit, submitting }) {
  const answered = Object.values(answers).filter(a =>
    (a.choice_ids?.length > 0) || a.text_response?.trim() || a.numeric_response != null
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

      {/* Dot grid */}
      <div className="rounded-2xl p-4" style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <p className="text-xs font-black mb-3" style={{ color: '#64748b' }}>NAVIGATION</p>
        <div className="grid grid-cols-5 gap-2">
          {questions.map((q, i) => {
            const a = answers[q.id];
            const done = !!(a?.choice_ids?.length || a?.text_response?.trim() || a?.numeric_response != null);
            const isCurrent = i === current;
            return (
              <button key={q.id} onClick={() => onSelect(i)}
                      className="h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all"
                      style={isCurrent
                        ? { background: '#6366f1', color: 'white' }
                        : done
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

// Mirrors apps/elearning/models.py's MENTION_THRESHOLDS/mention_for_percent —
// keep the two in sync if the scale ever changes.
const RESULT_MENTION_THRESHOLDS = [[90, 'Excellent'], [80, 'Très bien'], [70, 'Bien'], [60, 'Assez bien'], [50, 'Passable']];
function mentionForPercent(pct) {
  for (const [threshold, label] of RESULT_MENTION_THRESHOLDS) if (pct >= threshold) return label;
  return 'Insuffisant';
}

/* ── RESULTS PAGE ────────────────────────────────────────────────────────── */
function ResultsPage({ exam, questions, result, navigate }) {
  const { logout } = useAuth();
  const handleLogout = async () => {
    try { await logout(); } catch {}
    navigate('/login');
  };

  // No quiz was submitted (PDF-only exam, or an exam whose only content was
  // the PDF response) — there's no auto-computed score to show yet, just
  // confirmation that the copy reached the teacher.
  if (!result) {
    return (
      <div className="min-h-screen py-10 px-4" style={{ background: '#f8fafc' }}>
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="rounded-3xl p-8 text-center text-white relative overflow-hidden"
               style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
            <div className="relative z-10">
              <FileText className="h-20 w-20 mx-auto mb-4 opacity-90" />
              <h1 className="text-2xl font-black mb-2">{exam?.title}</h1>
              <p className="text-sm opacity-80">Votre copie a été transmise à votre enseignant.</p>
            </div>
            <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white opacity-5" />
            <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-white opacity-5" />
          </div>
          <div className="rounded-2xl p-5 flex items-center gap-3" style={{ background: 'white', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
            <Clock className="h-5 w-5 flex-shrink-0" style={{ color: '#d97706' }} />
            <p className="text-sm font-semibold" style={{ color: '#374151' }}>
              En attente de correction — votre note apparaîtra ici une fois la copie corrigée.
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

  const score    = result?.score ?? 0;
  const maxScore = result?.max_score ?? questions.reduce((s, q) => s + (q.points || 1), 0);
  const pct      = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const passed   = pct >= (exam?.pass_score_percent || 50);
  const mention  = mentionForPercent(pct);

  // Backend returns `question` (UUID) and `selected_choice_ids` (not question_id / choice_ids)
  // Count correct: is_correct=true OR partial credit (points_earned > 0)
  const answers = result?.answers || [];
  const correctCount   = answers.filter(a => !!a.is_correct || Number(a.points_earned ?? 0) > 0).length;
  const partialCount   = answers.filter(a => !a.is_correct && Number(a.points_earned ?? 0) > 0).length;
  const incorrectCount = questions.length - correctCount;

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: '#f8fafc' }}>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Score card */}
        <div className="rounded-3xl p-8 text-center text-white relative overflow-hidden"
             style={{ background: passed ? 'linear-gradient(135deg,#059669,#047857)' : 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
          <div className="relative z-10">
            {passed ? <Award className="h-20 w-20 mx-auto mb-4 opacity-90" /> : <Target className="h-20 w-20 mx-auto mb-4 opacity-90" />}
            <h1 className="text-2xl font-black mb-4">{exam?.title}</h1>

            {/* Mention — not the raw score/percent, per policy: students see
                a qualitative grade (Excellent…Insuffisant), not exact points,
                consistent with the Classement tab. */}
            <div className="mb-3">
              <span className="text-5xl font-black">{mention}</span>
            </div>

            <div className="flex items-center justify-center gap-3">
              <div className="px-4 py-1.5 rounded-full text-sm font-bold"
                   style={{ background: 'rgba(255,255,255,0.18)' }}>
                {passed ? '✓ Réussi' : '✗ Non validé'}
              </div>
            </div>
            <p className="text-xs opacity-60 mt-3">Seuil de réussite : {exam?.pass_score_percent || 50}%</p>
          </div>
          <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white opacity-5" />
          <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-white opacity-5" />
        </div>

        {/* Stats row */}
        <div className={`grid gap-4 ${partialCount > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {[
            { icon: BookOpen,    label: 'Questions',   value: questions.length,             color: '#6366f1', bg: '#eef2ff', show: true },
            { icon: CheckCircle, label: 'Correctes',   value: correctCount - partialCount,  color: '#059669', bg: '#f0fdf4', show: true },
            { icon: AlertCircle, label: 'Partielles',  value: partialCount,                 color: '#d97706', bg: '#fffbeb', show: partialCount > 0 },
            { icon: XCircle,     label: 'Incorrectes', value: incorrectCount,               color: '#ef4444', bg: '#fef2f2', show: true },
          ].filter(c => c.show).map(c => (
            <div key={c.label} className="rounded-2xl p-5 text-center" style={{ background: 'white', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-2" style={{ background: c.bg }}>
                <c.icon className="h-6 w-6" style={{ color: c.color }} />
              </div>
              <p className="text-2xl font-black" style={{ color: '#1e293b' }}>{c.value}</p>
              <p className="text-xs font-semibold mt-0.5" style={{ color: '#64748b' }}>{c.label}</p>
            </div>
          ))}
        </div>

        {/* Per-question breakdown */}
        {(result?.answers || []).length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: '#f1f5f9' }}>
              <h2 className="text-sm font-black" style={{ color: '#1e293b' }}>Détail des réponses</h2>
            </div>
            <div className="divide-y" style={{ '--tw-divide-color': '#f8fafc' }}>
              {result.answers.map((a, i) => {
                // Backend returns `question` (UUID), not `question_id`
                const q = questions.find(x => String(x.id) === String(a.question)) || questions[i];
                if (!q) return null;
                const qType = a.question_type || q.question_type;
                const meta  = QTYPE_META[qType] || QTYPE_META.QCU;
                const pts   = Number(a.points_earned ?? 0);
                const isPartial = a.is_correct !== true && pts > 0;
                const iconColor = a.is_correct ? '#059669' : isPartial ? '#d97706' : '#ef4444';
                const iconBg    = a.is_correct ? '#f0fdf4' : isPartial ? '#fffbeb' : '#fef2f2';
                // Backend returns `selected_choice_ids`, not `choice_ids`
                const pickedIds = a.selected_choice_ids || a.choice_ids || [];

                return (
                  <div key={i} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                           style={{ background: iconBg }}>
                        {a.is_correct
                          ? <CheckCircle className="h-4 w-4" style={{ color: '#059669' }} />
                          : isPartial
                          ? <AlertCircle className="h-4 w-4" style={{ color: '#d97706' }} />
                          : <XCircle    className="h-4 w-4" style={{ color: '#ef4444' }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
                          <span className="text-xs font-semibold" style={{ color: '#64748b' }}>Q{i + 1}</span>
                          {isPartial && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                  style={{ color: '#d97706', background: '#fffbeb' }}>Partielle</span>
                          )}
                        </div>
                        <p className="text-sm font-medium mb-2" style={{ color: '#1e293b' }}>{a.question_text || q.text}</p>

                        {/* Show correct choices */}
                        {q.choices && q.choices.length > 0 && (
                          <div className="space-y-1">
                            {q.choices.map(c => {
                              const studentPicked = pickedIds.includes(String(c.id));
                              const correct       = c.is_correct;
                              let style = {};
                              if (correct && studentPicked) style = { background: '#f0fdf4', color: '#059669', borderColor: '#86efac' };
                              else if (correct)             style = { background: '#f0fdf4', color: '#059669', borderColor: '#86efac' };
                              else if (studentPicked)       style = { background: '#fef2f2', color: '#dc2626', borderColor: '#fca5a5' };
                              else                          style = { color: '#94a3b8', borderColor: '#e2e8f0' };
                              return (
                                <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium"
                                     style={style}>
                                  {correct    && <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />}
                                  {studentPicked && !correct && <XCircle className="h-3.5 w-3.5 flex-shrink-0" />}
                                  {!correct && !studentPicked && <div className="h-3.5 w-3.5 flex-shrink-0" />}
                                  <span>{c.text}</span>
                                  {correct           && <span className="ml-auto text-[10px] font-black">Bonne réponse</span>}
                                  {studentPicked && !correct && <span className="ml-auto text-[10px] font-black">Votre réponse</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Text answer */}
                        {qType === 'TEXT' && a.text_response && (
                          <div className="mt-2 px-3 py-2 rounded-lg text-xs" style={{ background: '#f8fafc', color: '#374151' }}>
                            <span className="font-bold">Votre réponse : </span>{a.text_response}
                          </div>
                        )}

                        {/* Score per question */}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs font-bold" style={{ color: iconColor }}>
                            {pts} / {q.points || 1} point{(q.points || 1) > 1 ? 's' : ''}
                          </span>
                          {qType === 'TEXT' && a.is_correct == null && (
                            <span className="text-xs" style={{ color: '#94a3b8' }}>Correction manuelle</span>
                          )}
                          {a.explanation && (
                            <span className="text-xs italic" style={{ color: '#64748b' }}>{a.explanation}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
function LockedOverlay({ submitted, reason = 'timer', fraudReason, onViewResults, onDashboard, onLogout }) {
  const title = reason === 'fraud' ? 'Examen terminé — récidive de fraude' : 'Temps écoulé';
  const subtitle = reason === 'fraud'
    ? (fraudReason || 'Un second comportement suspect a été détecté après le premier avertissement.')
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
// First offense: a sustained suspicious signal from the webcam (see
// WebcamMonitor's streak tracking below) suspends the exam behind this
// blocking overlay for 5 minutes rather than ending it outright — a single
// incident could still be a false positive (bad lighting, a stretch), so the
// student gets one chance to resume normally. The exam clock is paused for
// the duration (handleFraudBlock deducts a flat 5 minutes from timeLeft up
// front instead) — letting it keep running live in the background used to
// silently burn through a short exam's remaining time *during* the block,
// making the resume look broken (exam flashes back for a few seconds, then
// closes on its own). A repeat offense after resuming is handled separately
// by ending the session (see handleFraudBlock / LockedOverlay reason="fraud").
function FraudSuspensionModal({ reason, until, stage, onExpire }) {
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
  const minutes = stage === 2 ? 10 : 5;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
         style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center space-y-5">
        <div className="h-20 w-20 rounded-full flex items-center justify-center mx-auto"
             style={{ background: '#fef2f2', border: '3px solid #fca5a5' }}>
          <ShieldAlert className="h-10 w-10" style={{ color: '#ef4444' }} />
        </div>
        <div>
          <h1 className="text-xl font-black" style={{ color: '#1e293b' }}>
            Examen suspendu — comportement suspect détecté{stage === 2 ? ' (récidive)' : ''}
          </h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: '#64748b' }}>{reason}</p>
        </div>
        <div className="text-5xl font-black tabular-nums" style={{ color: '#ef4444' }}>{mm}:{ss}</div>
        <p className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>
          La webcam continue de vous surveiller pendant cette suspension. L'examen reprendra automatiquement à la fin
          du compte à rebours. Ces {minutes} minutes sont déduites de votre temps d'examen — le chronomètre est pour
          l'instant en pause et reprendra là où il en était.
          {stage === 2
            ? ' En cas de nouveau comportement suspect pendant cette suspension, votre examen sera immédiatement terminé et vos réponses soumises pour correction.'
            : ' Si un comportement suspect est de nouveau détecté pendant cette suspension, une suspension plus longue (10 minutes) s\'appliquera à la reprise.'}
        </p>
      </div>
    </div>
  );
}

/* ── SUSPENSION REVIEW MODAL ─────────────────────────────────────────────── */
// Shown right when a suspension (5 or 10 min) expires AND the webcam caught
// further suspicious behavior *during* that suspension (see WebcamMonitor's
// paused-but-still-watching branch, which feeds onSuspensionEvent instead of
// the normal live-detection pipeline while fraudBlock is active). Requires
// an explicit acknowledgment before applying the consequence (a longer
// suspension, or closing the exam) so the student can't miss what was
// recorded — see acknowledgeSuspensionReview.
function SuspensionReviewModal({ summary, outcome, onAcknowledge }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
         style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center space-y-5">
        <div className="h-20 w-20 rounded-full flex items-center justify-center mx-auto"
             style={{ background: '#fef2f2', border: '3px solid #fca5a5' }}>
          <ShieldAlert className="h-10 w-10" style={{ color: '#ef4444' }} />
        </div>
        <div>
          <h1 className="text-xl font-black" style={{ color: '#1e293b' }}>
            Comportements suspects détectés pendant la suspension
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#64748b' }}>
            Voici ce que la webcam a observé pendant que votre examen était suspendu :
          </p>
        </div>
        <ul className="text-left space-y-2 rounded-2xl p-4" style={{ background: '#fef2f2' }}>
          {summary.map((s, i) => (
            <li key={i} className="text-sm flex items-start gap-2" style={{ color: '#7f1d1d' }}>
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: '#ef4444' }} />
              {s}
            </li>
          ))}
        </ul>
        <p className="text-sm font-black" style={{ color: '#dc2626' }}>
          {outcome === 'lock'
            ? 'Votre examen est immédiatement terminé et vos réponses sont soumises pour correction.'
            : 'Votre examen est suspendu pour 10 minutes supplémentaires.'}
        </p>
        <button onClick={onAcknowledge}
                className="w-full py-3.5 rounded-2xl text-sm font-black text-white"
                style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
          J'ai compris
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
    exam?.webcam_required     && 'Webcam requise',
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
        // Kick off the TF.js model download now (~10MB) so it's already
        // cached by the time WebcamMonitor needs it, instead of stalling the
        // first detection tick of the exam.
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
            {exam?.description && <p className="text-sm opacity-70 mt-2">{exam.description}</p>}
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
  const [timeLeft, setTimeLeft] = useState(0);
  const [flags, setFlags]       = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [lockReason, setLockReason]     = useState('timer'); // 'timer' | 'fraud'
  const [error, setError]       = useState('');
  const [result, setResult]     = useState(null);
  const [attemptsExhausted, setAttemptsExhausted] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [fraudAlert, setFraudAlert] = useState(null);
  // Sustained-behavior webcam block (see WebcamMonitor's streak tracking):
  // 1st offense suspends 5 min (stage 1), a repeat offense *during* that
  // suspension escalates to a 10-min suspension (stage 2, see
  // suspensionEvents/escalateFraud below), and a third strike ends the exam.
  const [fraudBlock, setFraudBlock] = useState(null); // { reason, until, stage } | null
  const [fraudLockMessage, setFraudLockMessage] = useState('');
  // Set while resolving a just-expired suspension that caught further
  // misbehavior (logging the event server-side, deciding the next stage) —
  // keeps the exam timer/webcam paused through that brief async gap so no
  // time or detection is lost between the modals.
  const [escalating, setEscalating] = useState(false);
  // { summary: string[], outcome: 'lock' | 'suspend10' } | null — drives
  // SuspensionReviewModal once a suspension expires with captured events.
  const [suspensionReview, setSuspensionReview] = useState(null);
  // Per-category tally of what the webcam caught *during* the current
  // suspension — reset at the start of each new suspension stage, read once
  // at expiry to build the review. { [category]: { detail, count } }
  const suspensionEvents = useRef({});
  const [showPdf, setShowPdf] = useState(false);
  // "Répondre dans le système" section for exams that carry a PDF subject
  // (subject_file/exam_pdf) — shown alongside the quiz stepper when the exam
  // also has a quiz, or in its place when the exam is PDF-only. Submitted
  // together with the quiz (if any) from the single "Soumettre" action — see
  // handleSubmit below — mirroring the Assignment ("devoir") submission UX.
  const [pdfContent, setPdfContent] = useState('');
  const [pdfError, setPdfError] = useState('');
  const [contentTab, setContentTab] = useState('questions'); // 'questions' | 'pdf' — only relevant when both a quiz and a PDF are present
  const fullscreenEl = useRef(null);
  const fraudAlertTimer = useRef(null);

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
  // handleFraudBlock below, which deducts the 5-minute penalty from
  // timeLeft up front instead). Letting this interval keep running in the
  // background during the suspension modal used to silently drain the
  // clock in real time; on a short exam that could burn through all the
  // remaining time *during* the block, so the exam screen would reappear
  // for only a few seconds before the (already independently expiring)
  // timer closed it — looking like the resume itself was broken.
  useEffect(() => {
    if (phase !== 'exam' || fraudBlock || escalating || suspensionReview) return;
    const t = setInterval(() => {
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
  }, [phase, fraudBlock, escalating, suspensionReview]);

  // Keep a stable ref to handleSubmit to avoid stale closure in locked effect
  const handleSubmitRef = useRef(null);
  useEffect(() => { handleSubmitRef.current = handleSubmit; });

  // Mirror current question + answers into localStorage as the candidate
  // progresses, so a remount (fraud-block-triggered reload, tab discarded
  // while minimized, accidental refresh) can restore exactly where they
  // were — see the restore logic in startExam() above.
  useEffect(() => {
    if (phase !== 'exam') return;
    try {
      localStorage.setItem(`examProgress_${examId}`, JSON.stringify({
        attemptId: attempt?.id || null, current, answers, pdfContent,
      }));
    } catch { /* storage unavailable/full — resuming just falls back to the start */ }
  }, [phase, attempt, examId, current, answers, pdfContent]);

  // Auto-submit when locked (tab switch limit hit OR timer expired)
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
    };
    setFlags(f => [...f.slice(-3), { type, message: msgs[type] || type }]);
  }, []);

  // Webcam-based fraud signal (phone visible / face missing) — shown as a
  // prominent on-screen banner rather than the small top-bar chip used for
  // client-detected events, since this comes from the AI vision check and
  // is the strongest evidence of an actual cheating attempt.
  const onWebcamFlag = useCallback((message) => {
    setFraudAlert(message);
    clearTimeout(fraudAlertTimer.current);
    fraudAlertTimer.current = setTimeout(() => setFraudAlert(null), 8000);
  }, []);

  // Tolerated looking-away incident — escalating warning, no suspension yet
  // (see WebcamMonitor: escalates on its own via onFraudBlock once either
  // running total, incident count or cumulated time, crosses its threshold).
  const onGazeWarning = useCallback((incidentCount, secs, totalMin) => {
    setFraudAlert(
      `Regard détourné de l'écran pendant ${secs}s (${incidentCount} épisode${incidentCount > 1 ? 's' : ''}, ${totalMin} min cumulées). ` +
      `Restez face à l'écran — au-delà de ${GAZE_TOLERATED_INCIDENTS} épisodes ou ${GAZE_CUM_SUSPEND_MS / 60000} min cumulées, l'examen sera suspendu.`
    );
    clearTimeout(fraudAlertTimer.current);
    fraudAlertTimer.current = setTimeout(() => setFraudAlert(null), 8000);
  }, []);

  // Sustained webcam fraud signal (see WebcamMonitor) — the first ever
  // trigger for this exam attempt. The backend keeps the authoritative
  // block count on the session (survives a page refresh mid-block, unlike
  // client state): count 1 → 5-minute suspension (stage 1), count 2 →
  // 10-minute suspension (stage 2 — only reachable here if a refresh lost
  // the local suspensionReview state; the normal path to stage 2 is
  // escalateFraud below), count 3+ → exam closed.
  const handleFraudBlock = useCallback(async (reason) => {
    if (phase !== 'exam' || fraudBlock) return;
    let res = null;
    try { res = await elearningService.logExamEvent(examId, 'FRAUD_BLOCK', reason); } catch {}
    const count = res?.fraud_block_count ?? 1;
    if (count >= 3) {
      setFraudLockMessage(reason);
      setLockReason('fraud');
      setPhase('locked');
      return;
    }
    const stage = count >= 2 ? 2 : 1;
    const durationMin = stage === 2 ? 10 : 5;
    suspensionEvents.current = {};
    // Deduct the penalty once, up front, rather than letting the countdown
    // keep running live during the suspension — the global countdown effect
    // pauses whenever fraudBlock/escalating/suspensionReview is set, so this
    // is the only place time is actually lost to the block.
    setTimeLeft(t => Math.max(0, t - durationMin * 60));
    setFraudBlock({ reason, until: Date.now() + durationMin * 60 * 1000, stage });
  }, [phase, fraudBlock, examId]);

  // Called once per webcam tick while a suspension is active (see
  // WebcamMonitor's paused-but-still-watching branch) — tallies what's
  // observed instead of acting on it immediately; the tally is only read
  // once, when the suspension's countdown naturally expires (see
  // handleSuspensionExpire), so a brief/borderline glance during the
  // suspension doesn't retrigger anything mid-countdown.
  const onSuspensionEvent = useCallback((category, detail) => {
    const prev = suspensionEvents.current[category];
    suspensionEvents.current[category] = { detail, count: (prev?.count || 0) + 1 };
  }, []);

  // A suspension just expired with events captured during it — log one more
  // FRAUD_BLOCK server-side (bumping the authoritative count) and, based on
  // what that count becomes, decide whether the student is about to see a
  // longer (10-min) suspension or the exam closing outright. Either way the
  // decision is shown via SuspensionReviewModal before it's actually applied
  // — see acknowledgeSuspensionReview.
  const escalateFraud = useCallback(async (events) => {
    const summary = events.map(e => e.count > 1 ? `${e.detail} (×${e.count})` : e.detail);
    const reasonText = `Comportement suspect détecté pendant la suspension : ${summary.join(' · ')}`;
    let res = null;
    try { res = await elearningService.logExamEvent(examId, 'FRAUD_BLOCK', reasonText); } catch {}
    const count = res?.fraud_block_count ?? 2;
    setSuspensionReview({ summary, outcome: count >= 3 ? 'lock' : 'suspend10', reasonText });
  }, [examId]);

  // FraudSuspensionModal's onExpire — resolves to either a plain resume (no
  // events captured), or hands off to escalateFraud/SuspensionReviewModal.
  const handleSuspensionExpire = useCallback(() => {
    const events = Object.values(suspensionEvents.current);
    suspensionEvents.current = {};
    setFraudBlock(null);
    if (events.length === 0) {
      if (timeLeft <= 0) { setLockReason('timer'); setPhase('locked'); }
      return;
    }
    setEscalating(true);
    escalateFraud(events).finally(() => setEscalating(false));
  }, [timeLeft, escalateFraud]);

  // SuspensionReviewModal's acknowledgment — only now does the decided
  // outcome (10-min suspension or exam closure) actually take effect.
  const acknowledgeSuspensionReview = useCallback(() => {
    const review = suspensionReview;
    setSuspensionReview(null);
    if (!review) return;
    if (review.outcome === 'lock') {
      setFraudLockMessage(review.reasonText);
      setLockReason('fraud');
      setPhase('locked');
    } else {
      suspensionEvents.current = {};
      setTimeLeft(t => Math.max(0, t - 10 * 60));
      setFraudBlock({ reason: review.reasonText, until: Date.now() + 10 * 60 * 1000, stage: 2 });
    }
  }, [suspensionReview]);

  useAntiCheat({
    examId,
    enabled: phase === 'exam',
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
        qs   = quiz?.questions || [];
      }

      const sess = await elearningService.startExamSession(examId);
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
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
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

      setPhase('exam');
    } catch (e) {
      const status = e?.response?.status;
      if (status === 403) {
        setAttemptsExhausted(true);
        setError('');
      } else {
        setError(e.message || 'Impossible de démarrer l\'examen.');
      }
    } finally {
      setStarting(false);
    }
  };

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
      try { localStorage.removeItem(`examProgress_${examId}`); } catch {}
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
        fraudReason={fraudLockMessage}
        onViewResults={autoSubmitted ? () => setPhase('submitted') : null}
        onDashboard={() => navigate('/student/dashboard/elearning')}
        onLogout={handleLogout}
      />
    );
  }

  /* ── EXAM PHASE ── */
  const q = questions[current];
  const timerPct   = (exam?.duration_minutes || 60) * 60;
  const pct        = timerPct > 0 ? (timeLeft / timerPct) * 100 : 0;
  const timerColor = timeLeft < 300 ? '#ef4444' : timeLeft < 600 ? '#d97706' : '#059669';
  const answered = Object.values(answers).filter(a =>
    (a.choice_ids?.length > 0) || a.text_response?.trim() || a.numeric_response != null
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
      {fraudBlock && !suspensionReview && (
        <FraudSuspensionModal
          reason={fraudBlock.reason}
          until={fraudBlock.until}
          stage={fraudBlock.stage}
          onExpire={handleSuspensionExpire}
        />
      )}
      {suspensionReview && (
        <SuspensionReviewModal
          summary={suspensionReview.summary}
          outcome={suspensionReview.outcome}
          onAcknowledge={acknowledgeSuspensionReview}
        />
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

          {/* PDF sujet — in-page modal only, never a new tab, so consulting
              it mid-exam can't be mistaken for a tab switch. Deliberately
              styled as a solid, high-contrast button (not a subtle chip) —
              this is the primary way to (re-)read the subject during a
              surveilled exam and needs to stand out next to the timer. */}
          {exam?.exam_pdf && (
            <button onClick={() => setShowPdf(true)}
                    className="order-3 sm:order-4 flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black text-white transition-all hover:brightness-110 active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 4px 12px rgba(124,58,237,0.35)' }}>
              <FileText className="h-4 w-4" />
              Sujet
            </button>
          )}
          {showPdf && <PdfModal url={exam.exam_pdf} onClose={() => setShowPdf(false)} />}

          {/* Webcam */}
          <div className="order-3 sm:order-4">
            <WebcamMonitor examId={examId} sessionId={session?.id} enabled={!!exam?.webcam_required}
                           onFlag={onWebcamFlag} onFraudBlock={handleFraudBlock} onGazeWarning={onGazeWarning}
                           onSuspensionEvent={onSuspensionEvent} paused={!!fraudBlock || escalating} />
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

      {fraudAlert && (
        <div className="flex-shrink-0 flex items-center gap-2 px-6 py-2.5" style={{ background: '#dc2626' }}>
          <ShieldAlert className="h-4 w-4 text-white flex-shrink-0" />
          <p className="text-sm font-bold text-white">{fraudAlert}</p>
        </div>
      )}

      {/* ── MAIN AREA ── */}
      {/* Stacked (question, then navigator below) and whole-page-scrolling on
          mobile/tablet — the fixed side-by-side split (question left, w-64
          navigator right) only has room to breathe on a desktop-width
          viewport; below md it left the question area squeezed into a sliver. */}
      <div className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col gap-3 p-3 sm:p-6">
        {/* Questions / Réponse PDF switcher — only shown when the exam
            combines a quiz AND a PDF subject; a PDF-only exam skips straight
            to the answer section below, a quiz-only exam skips straight to
            the stepper, so nobody sees a pointless single-item switcher. */}
        {hasQuestions && hasPdfAnswer && (
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => setContentTab('questions')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                    style={effectiveTab === 'questions' ? { background: '#6366f1', color: 'white' } : { background: 'white', color: '#64748b', boxShadow: '0 1px 4px #0001' }}>
              <BookOpen className="h-3.5 w-3.5" /> Questions ({answered}/{questions.length})
            </button>
            <button onClick={() => setContentTab('pdf')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                    style={effectiveTab === 'pdf' ? { background: '#7c3aed', color: 'white' } : { background: 'white', color: '#64748b', boxShadow: '0 1px 4px #0001' }}>
              <FileText className="h-3.5 w-3.5" /> Réponse PDF
            </button>
          </div>
        )}

        <div className="flex-1 md:overflow-hidden flex flex-col md:flex-row gap-4 md:gap-6">
          {effectiveTab === 'questions' && hasQuestions && (
            <>
              {/* Question area */}
              <div className="flex-1 md:overflow-y-auto">
                <QuestionCard
                  question={q}
                  idx={current}
                  total={questions.length}
                  answer={answers[q.id]}
                  onAnswer={(data) => setAnswer(q.id, data)}
                  onPrev={() => setCurrent(c => Math.max(0, c - 1))}
                  onNext={() => setCurrent(c => Math.min(questions.length - 1, c + 1))}
                  onExpire={() => setCurrent(c => Math.min(questions.length - 1, c + 1))}
                />
              </div>

              {/* Navigator */}
              <div className="w-full md:w-auto flex-shrink-0 md:overflow-y-auto">
                <QuestionNav
                  questions={questions}
                  current={current}
                  answers={answers}
                  onSelect={setCurrent}
                  onSubmit={() => setShowSubmitModal(true)}
                  submitting={submitting}
                />
              </div>
            </>
          )}

          {effectiveTab === 'pdf' && hasPdfAnswer && (
            <div className="flex-1 md:overflow-y-auto">
              <PdfAnswerSection
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
  );
}
