import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  CheckCircle, XCircle, Clock, Search, ChevronRight,
  BookOpen, ChevronLeft, Calendar, MapPin, AlertTriangle,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1';
const C = '#059669';

function fmtTime(d) {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(d) {
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

const STATUS_UI = {
  PRESENT: {
    label: 'Présence enregistrée',
    sub: null,
    color: C,
    bg: '#d1fae5',
    Icon: CheckCircle,
  },
  LATE: {
    label: 'Présent — En retard',
    sub: 'Vous êtes bien présent, mais noté en retard pour ce cours.',
    color: '#d97706',
    bg: '#fef3c7',
    Icon: Clock,
  },
};

function Header({ className, now }) {
  return (
    <div className="px-5 pt-8 pb-6 text-center" style={{ background: C }}>
      <div className="flex items-center justify-center gap-2 mb-3">
        <BookOpen className="h-6 w-6 text-white opacity-80" />
        <span className="text-xs font-bold text-white opacity-80 tracking-widest uppercase">Campus LMS</span>
      </div>
      <h1 className="text-xl font-extrabold text-white mb-1">{className}</h1>
      <p className="text-xs text-emerald-100">{fmtDate(now)} · {fmtTime(now)}</p>
    </div>
  );
}

export default function ScanPage() {
  const { classId } = useParams();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code'); // Option B: teacher QR token

  /* ── Data ── */
  const [classInfo, setClassInfo]       = useState(null);
  const [students, setStudents]         = useState([]);
  const [todaySessions, setTodaySessions] = useState([]);
  const [loadError, setLoadError]       = useState(null);
  const [loading, setLoading]           = useState(true);

  /* ── Step machine: 'sessions' | 'students' | 'result' ── */
  const [step, setStep]                 = useState('sessions');
  const [selectedSession, setSelectedSession] = useState(null);

  /* ── Student selection ── */
  const [search, setSearch]             = useState('');
  const [selected, setSelected]         = useState(null);

  /* ── Submit ── */
  const [submitting, setSubmitting]     = useState(false);
  const [result, setResult]             = useState(null);
  const [scanError, setScanError]       = useState(null);

  /* ── GPS ── */
  const gpsRef = useRef({ latitude: null, longitude: null });
  const [gpsStatus, setGpsStatus] = useState('idle'); // 'idle'|'acquiring'|'ok'|'denied'|'error'

  useEffect(() => {
    if (!navigator.geolocation) { setGpsStatus('error'); return; }
    setGpsStatus('acquiring');
    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        gpsRef.current = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setGpsStatus('ok');
      },
      () => setGpsStatus('denied'),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 }
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  /* ── Clock ── */
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  /* ── Load class + sessions ── */
  useEffect(() => {
    async function load() {
      try {
        const [classRes, sessRes] = await Promise.all([
          fetch(`${API_BASE}/attendance/class-students/${classId}/`).then(r => r.json()),
          code
            ? Promise.resolve(null) // Option B: no session picker needed
            : fetch(`${API_BASE}/attendance/class-sessions-today/${classId}/`).then(r => r.json()),
        ]);

        if (classRes.detail) throw new Error(classRes.detail);
        setClassInfo({ name: classRes.class_name, code: classRes.class_code });
        setStudents(classRes.students);

        if (code) {
          // Option B — skip session step
          setStep('students');
        } else if (sessRes) {
          const sess = sessRes.sessions || [];
          setTodaySessions(sess);
          if (sess.length === 1) {
            // Only 1 session today → auto-select
            setSelectedSession(sess[0]);
            setStep('students');
          } else {
            setStep('sessions');
          }
        }
      } catch (e) {
        setLoadError(e.message);
      }
      setLoading(false);
    }
    load();
  }, [classId, code]);

  const filtered = useMemo(() =>
    students.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.matricule.toLowerCase().includes(search.toLowerCase())
    ), [students, search]);

  async function handleConfirm() {
    if (!selected || submitting) return;
    setSubmitting(true);
    setScanError(null);
    try {
      const { latitude, longitude } = gpsRef.current;
      const body = {
        class_id:  classId,
        student_id: selected.id,
        ...(code ? { code } : { session_id: selectedSession.session_id }),
        ...(latitude  != null ? { latitude }  : {}),
        ...(longitude != null ? { longitude } : {}),
      };
      const r = await fetch(`${API_BASE}/attendance/student-scan/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) {
        // Surface specific error codes with richer messages
        if (d.code === 'GPS_REQUIRED') {
          throw new Error('Votre localisation GPS est requise. Autorisez l\'accès à la position dans votre navigateur.');
        }
        if (d.code === 'GPS_OUT_OF_RANGE') {
          throw new Error(`Vous êtes trop loin de la salle (${d.distance_meters} m). Restez dans un rayon de ${d.allowed_radius} m.`);
        }
        if (d.code === 'POSTPONED') {
          throw new Error('Ce cours a été ajourné par l\'enseignant. Aucune présence n\'est requise.');
        }
        throw new Error(d.detail || 'Erreur lors du pointage');
      }
      setResult(d);
      setStep('result');
    } catch (e) {
      setScanError(e.message);
    }
    setSubmitting(false);
  }

  function goBack() {
    setSelected(null);
    setSearch('');
    setScanError(null);
    // If there were multiple sessions, go back to session picker; otherwise stay
    if (!code && todaySessions.length > 1) {
      setSelectedSession(null);
      setStep('sessions');
    }
  }

  /* ══ Loading ════════════════════════════════════════════════════ */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0fdf4' }}>
      <div className="h-10 w-10 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
    </div>
  );

  /* ══ Error ══════════════════════════════════════════════════════ */
  if (loadError) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6"
         style={{ background: '#fef2f2' }}>
      <XCircle className="h-16 w-16 text-red-400" />
      <p className="text-center font-bold text-red-700">{loadError}</p>
      <p className="text-xs text-red-400 text-center">Vérifiez le QR code ou contactez l'administration</p>
    </div>
  );

  /* ══ Result ═════════════════════════════════════════════════════ */
  if (step === 'result' && result) {
    const ui = STATUS_UI[result.record_status] || STATUS_UI.PRESENT;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6"
           style={{ background: ui.bg }}>
        <div className="w-24 h-24 rounded-full flex items-center justify-center"
             style={{ background: '#fff', boxShadow: `0 0 0 6px ${ui.color}22` }}>
          <ui.Icon className="h-12 w-12" style={{ color: ui.color }} />
        </div>

        <div className="text-center">
          <p className="text-2xl font-extrabold mb-1" style={{ color: ui.color }}>{ui.label}</p>
          <p className="text-base font-semibold text-gray-800">{result.student_name}</p>
          {ui.sub && (
            <p className="text-sm mt-1 font-medium" style={{ color: ui.color }}>{ui.sub}</p>
          )}
        </div>

        <div className="w-full max-w-sm rounded-2xl p-5 space-y-2"
             style={{ background: '#fff', border: `1.5px solid ${ui.color}44` }}>
          {[
            ['Classe',  result.class_name],
            ['Matière', result.subject_name],
            ['Horaire', result.session_time],
            ['Statut',  result.record_status === 'LATE' ? 'En retard (présent)' : 'Présent'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm">
              <span className="text-gray-500 font-medium">{k}</span>
              <span className="font-bold text-gray-800">{v}</span>
            </div>
          ))}
        </div>

        {result.already_marked && (
          <p className="text-xs text-center" style={{ color: ui.color }}>
            Vous étiez déjà enregistré pour ce cours.
          </p>
        )}

        <button
          onClick={() => {
            setResult(null); setSelected(null); setSearch(''); setScanError(null);
            setStep(!code && todaySessions.length > 1 ? 'sessions' : 'students');
          }}
          className="mt-2 text-sm font-semibold px-6 py-2 rounded-full"
          style={{ background: ui.color, color: '#fff' }}>
          Retour
        </button>
      </div>
    );
  }

  /* ══ Step: Session picker (Option A, >1 session) ════════════════ */
  if (step === 'sessions') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#f0fdf4' }}>
        <Header className={classInfo?.name} now={now} />
        <div className="flex-1 px-4 py-6 max-w-md mx-auto w-full space-y-4">
          <div className="rounded-2xl p-4 text-center"
               style={{ background: '#fff', border: '1.5px solid #d1fae5' }}>
            <p className="text-sm font-semibold text-gray-700">
              Quel cours souhaitez-vous pointer ?
            </p>
          </div>

          {todaySessions.length === 0 ? (
            <div className="rounded-2xl p-10 flex flex-col items-center gap-3"
                 style={{ background: '#fff', border: '1.5px solid #e2e8f0' }}>
              <Calendar className="h-10 w-10 text-gray-300" />
              <p className="text-sm font-semibold text-gray-500">Aucun cours prévu aujourd'hui</p>
              <p className="text-xs text-gray-400">Vérifiez l'emploi du temps avec l'administration</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden divide-y divide-gray-100"
                 style={{ border: '1.5px solid #d1fae5', background: '#fff' }}>
              {todaySessions.map(s => (
                <button key={s.session_id}
                  onClick={() => { if (!s.is_postponed) { setSelectedSession(s); setStep('students'); } }}
                  disabled={s.is_postponed}
                  className="w-full flex items-center justify-between px-4 py-4 transition-colors text-left"
                  style={{ opacity: s.is_postponed ? 0.6 : 1, cursor: s.is_postponed ? 'not-allowed' : 'pointer' }}>
                  <div>
                    <p className="text-sm font-bold text-gray-800"
                       style={{ textDecoration: s.is_postponed ? 'line-through' : 'none' }}>
                      {s.subject_name}
                    </p>
                    <p className="text-xs text-gray-400">{s.start_time} – {s.end_time}</p>
                    {s.is_postponed && (
                      <span className="inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ background: '#fee2e2', color: '#b91c1c' }}>
                        Cours ajourné
                      </span>
                    )}
                  </div>
                  {!s.is_postponed && <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ══ Step: Student picker ═══════════════════════════════════════ */
  const sessionLabel = code
    ? 'Cours en cours (QR enseignant)'
    : selectedSession
      ? `${selectedSession.subject_name} · ${selectedSession.start_time}–${selectedSession.end_time}`
      : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f0fdf4' }}>
      <Header className={classInfo?.name} now={now} />
      <div className="flex-1 px-4 py-6 max-w-md mx-auto w-full space-y-4">

        {/* Back + session label */}
        <div className="flex items-center gap-3">
          {!code && todaySessions.length > 1 && (
            <button onClick={goBack}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl flex-shrink-0"
              style={{ background: '#fff', color: C, border: `1.5px solid ${C}40` }}>
              <ChevronLeft className="h-3.5 w-3.5" /> Cours
            </button>
          )}
          {sessionLabel && (
            <div className="rounded-xl px-3 py-2 text-xs font-semibold flex-1"
                 style={{ background: '#d1fae5', color: '#065f46' }}>
              {sessionLabel}
            </div>
          )}
        </div>

        <div className="rounded-2xl p-4 text-center"
             style={{ background: '#fff', border: '1.5px solid #d1fae5' }}>
          <p className="text-sm font-semibold text-gray-700">
            Sélectionnez votre nom puis confirmez votre présence
          </p>
        </div>

        {/* GPS status badge */}
        {gpsStatus === 'acquiring' && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold"
               style={{ background: '#fef3c7', color: '#92400e' }}>
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            Localisation en cours…
          </div>
        )}
        {gpsStatus === 'denied' && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold"
               style={{ background: '#fee2e2', color: '#b91c1c' }}>
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            GPS refusé — certaines salles exigent la localisation pour pointer.
          </div>
        )}
        {gpsStatus === 'ok' && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold"
               style={{ background: '#d1fae5', color: '#065f46' }}>
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            Localisation GPS active
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setSelected(null); }}
            placeholder="Rechercher par nom ou matricule…"
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-9 pr-4 text-sm outline-none focus:border-emerald-500"
            autoComplete="off"
          />
        </div>

        {/* Student list (hidden once one is selected) */}
        {!selected && (
          <div className="rounded-2xl overflow-hidden divide-y divide-gray-100"
               style={{ border: '1.5px solid #d1fae5', background: '#fff' }}>
            {filtered.length === 0
              ? <p className="py-8 text-center text-sm text-gray-400">Aucun étudiant trouvé</p>
              : filtered.map(s => (
                  <button key={s.id} onClick={() => setSelected(s)}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-emerald-50 transition-colors text-left">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.matricule}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                  </button>
                ))
            }
          </div>
        )}

        {/* Confirmation panel */}
        {selected && (
          <div className="space-y-4">
            <div className="rounded-2xl p-4"
                 style={{ background: '#fff', border: '2px solid #059669' }}>
              <p className="text-xs text-emerald-600 font-bold mb-1">Étudiant sélectionné</p>
              <p className="text-base font-extrabold text-gray-800">{selected.name}</p>
              <p className="text-xs text-gray-400">{selected.matricule}</p>
            </div>

            {scanError && (
              <div className="rounded-xl p-3 flex items-start gap-2"
                   style={{ background: '#fee2e2', border: '1.5px solid #fecaca' }}>
                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-medium">{scanError}</p>
              </div>
            )}

            <button onClick={handleConfirm} disabled={submitting}
              className="w-full py-4 rounded-2xl font-extrabold text-white text-base transition-all"
              style={{ background: submitting ? '#a7f3d0' : C }}>
              {submitting ? 'Enregistrement…' : 'Confirmer ma présence'}
            </button>

            <button onClick={() => { setSelected(null); setScanError(null); }}
              className="w-full py-2.5 rounded-2xl text-sm font-semibold text-gray-500 bg-white border border-gray-200">
              Changer de nom
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
