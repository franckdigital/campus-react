import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, ClipboardCheck, Star, BookOpen,
  ChevronRight, Sparkles, CheckCircle, AlertCircle,
} from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { academicService, attendanceService, gradesService } from '../../services';

const QUICK = [
  { label: 'Emploi du temps',  href: '/teacher/timetable',  icon: Calendar,       color: '#0d9488', bg: '#f0fdfa' },
  { label: 'Marquer présence', href: '/teacher/attendance', icon: ClipboardCheck, color: '#059669', bg: '#ecfdf5' },
  { label: 'Saisie des notes', href: '/teacher/grades',     icon: Star,           color: '#d97706', bg: '#fffbeb' },
];

export default function TeacherDashboard() {
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  // Sessions are recurring weekly slots keyed by `day_of_week` (0=Monday…
  // 5=Saturday) — there's no absolute-date filter on the backend, so "today's
  // courses" has to go through the same teacher-scoped sessions endpoint the
  // timetable page uses, then filter client-side by today's weekday.
  const [todaySessions, setTodaySessions] = useState([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await academicService.getTeacherMe();
        if (!me?.id || cancelled) return;
        const res = await academicService.getTeacherSessions(me.id);
        const sessions = res?.results || res || [];
        const jsDay = new Date().getDay(); // 0=Sun,1=Mon…
        const todayIdx = jsDay === 0 ? -1 : jsDay - 1; // Sunday has no class column
        if (!cancelled) {
          setTodaySessions(
            sessions
              .filter(s => (s.day_of_week ?? -1) === todayIdx)
              .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
              .slice(0, 5)
          );
        }
      } catch { /* leave todaySessions empty */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const { data: evalData } = useApi(
    () => gradesService.getEvaluations({ is_locked: false }),
    [], true
  );
  const { data: absenceData } = useApi(
    () => attendanceService.getAbsenceRequests({ status: 'PENDING' }),
    [], true
  );

  const pendingEvals  = (evalData?.results || evalData || []).slice(0, 4);
  const pendingAbs    = (absenceData?.results || absenceData || []).slice(0, 3);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: '#f5f3ff' }}>
            <Sparkles className="h-3 w-3" style={{ color: '#7c3aed' }} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#7c3aed' }}>Espace enseignant</span>
        </div>
        <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a', letterSpacing: '-0.03em' }}>Bonjour 👋</h1>
        <p className="text-sm mt-0.5 font-medium capitalize" style={{ color: '#94a3b8' }}>{today}</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-4">
        {QUICK.map(qa => (
          <Link key={qa.label} to={qa.href}
            className="flex flex-col items-center gap-3 p-5 rounded-2xl text-center transition-all hover:scale-105 card"
            style={{ borderTop: `3px solid ${qa.color}` }}>
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ background: qa.bg }}>
              <qa.icon className="h-6 w-6" style={{ color: qa.color }} />
            </div>
            <span className="text-sm font-bold" style={{ color: '#1e293b' }}>{qa.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Today's sessions */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold" style={{ color: '#0f172a' }}>Cours d'aujourd'hui</h3>
              <p className="text-xs mt-0.5 font-medium capitalize" style={{ color: '#94a3b8' }}>
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long' })}
              </p>
            </div>
            <Link to="/teacher/timetable"
              className="text-xs font-bold flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-teal-50"
              style={{ color: '#0d9488' }}>
              Tout voir <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {todaySessions.length > 0 ? (
            <div className="space-y-2">
              {todaySessions.map((s, i) => (
                <div key={s.id || i}
                     className="flex items-center gap-4 p-3 rounded-xl"
                     style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                  <div className="flex flex-col items-center px-3 py-1 rounded-lg flex-shrink-0"
                       style={{ background: '#f0fdfa', minWidth: 56 }}>
                    <span className="text-[11px] font-bold" style={{ color: '#0d9488' }}>{s.start_time?.slice(0, 5) || '—'}</span>
                    <span className="text-[10px]" style={{ color: '#94a3b8' }}>{s.end_time?.slice(0, 5) || ''}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: '#1e293b' }}>
                      {s.subject_name || s.subject?.name || 'Matière'}
                    </p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: '#64748b' }}>
                      {s.class_name || s.class_group?.name || ''}{s.room_name ? ` · Salle ${s.room_name}` : ''}
                    </p>
                  </div>
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
                       style={{ background: '#f0fdfa' }}>
                    <BookOpen className="h-3.5 w-3.5" style={{ color: '#0d9488' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: '#f1f5f9' }}>
                <Calendar className="h-6 w-6 opacity-30" style={{ color: '#64748b' }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: '#94a3b8' }}>Aucun cours aujourd'hui</p>
            </div>
          )}
        </div>

        {/* Side panels */}
        <div className="space-y-4">

          {/* Open evaluations */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: '#0f172a' }}>Évaluations ouvertes</h3>
              <Link to="/teacher/grades"
                className="text-xs font-bold px-2.5 py-1.5 rounded-lg hover:bg-amber-50"
                style={{ color: '#d97706' }}>
                Saisir
              </Link>
            </div>
            {pendingEvals.length > 0 ? (
              <div className="space-y-2">
                {pendingEvals.map(ev => (
                  <div key={ev.id} className="flex items-center gap-3 p-2.5 rounded-xl"
                       style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fef3c7' }}>
                      <Star className="h-3.5 w-3.5" style={{ color: '#d97706' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: '#92400e' }}>{ev.title}</p>
                      <p className="text-[11px] truncate" style={{ color: '#b45309' }}>
                        {ev.subject_name || ''}{ev.class_name ? ` · ${ev.class_name}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 py-3">
                <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: '#059669' }} />
                <p className="text-xs font-semibold" style={{ color: '#94a3b8' }}>Tout est à jour</p>
              </div>
            )}
          </div>

          {/* Absence requests */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: '#0f172a' }}>Demandes d'absence</h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: pendingAbs.length > 0 ? '#fef2f2' : '#f0fdf4', color: pendingAbs.length > 0 ? '#ef4444' : '#059669' }}>
                {pendingAbs.length} en attente
              </span>
            </div>
            {pendingAbs.length > 0 ? (
              <div className="space-y-2">
                {pendingAbs.map(req => (
                  <div key={req.id} className="flex items-start gap-3 p-2.5 rounded-xl"
                       style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: '#991b1b' }}>
                        {req.student_name || req.student || 'Étudiant'}
                      </p>
                      <p className="text-[11px] truncate" style={{ color: '#b91c1c' }}>{req.reason || 'Motif non précisé'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 py-2">
                <CheckCircle className="h-4 w-4" style={{ color: '#059669' }} />
                <p className="text-xs font-semibold" style={{ color: '#94a3b8' }}>Aucune en attente</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
