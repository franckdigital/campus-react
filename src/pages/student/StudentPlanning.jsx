import { useState } from 'react';
import { Calendar, Clock, BookOpen, RefreshCw } from 'lucide-react';
import { studentsService } from '../../services/students';
import { academicService } from '../../services/academic';
import { useApi } from '../../hooks/useApi';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const DAY_NUMS = [1, 2, 3, 4, 5, 6];

const COLORS = [
  { color: '#6366f1', bg: '#eef2ff' },
  { color: '#059669', bg: '#f0fdf4' },
  { color: '#0891b2', bg: '#ecfeff' },
  { color: '#7c3aed', bg: '#f5f3ff' },
  { color: '#d97706', bg: '#fffbeb' },
  { color: '#0284c7', bg: '#f0f9ff' },
  { color: '#db2777', bg: '#fdf2f8' },
];

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="h-10 w-10 rounded-full border-[3px] animate-spin"
           style={{ borderColor: '#f5f3ff', borderTopColor: '#7c3aed' }} />
      <p className="text-sm font-semibold" style={{ color: '#64748b' }}>Chargement…</p>
    </div>
  );
}

export default function StudentPlanning() {
  const [view, setView] = useState('week');

  const { data: profile, loading: loadProfile } = useApi(
    () => studentsService.getMe(), [], true
  );

  const { data: enrollmentsData, loading: loadEnrollments } = useApi(
    () => profile?.id ? studentsService.getEnrollments(profile.id) : Promise.resolve([]),
    [profile?.id], !!profile?.id
  );

  const enrollments = Array.isArray(enrollmentsData) ? enrollmentsData : (enrollmentsData?.results || []);
  const activeEnrollment = enrollments.find(e => e.status === 'ACTIVE') || enrollments[0];
  const classId = activeEnrollment?.class_obj;

  const { data: sessionsData, loading: loadSessions, execute: refresh } = useApi(
    () => classId ? academicService.getSessions({ class_id: classId, page_size: 200 }) : Promise.resolve([]),
    [classId], !!classId
  );

  const sessions = Array.isArray(sessionsData) ? sessionsData : (sessionsData?.results || []);

  // Assign stable colors per subject
  const subjectColors = {};
  let colorIdx = 0;
  sessions.forEach(s => {
    const key = s.subject_name || s.subject || '';
    if (!subjectColors[key]) {
      subjectColors[key] = COLORS[colorIdx % COLORS.length];
      colorIdx++;
    }
  });

  const sessionsByDay = {};
  DAY_NUMS.forEach(d => { sessionsByDay[d] = []; });
  sessions.forEach(s => {
    const day = s.day_of_week;
    if (day && sessionsByDay[day]) {
      sessionsByDay[day].push(s);
    }
  });
  // Sort by start time within each day
  Object.keys(sessionsByDay).forEach(d => {
    sessionsByDay[d].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  });

  const loading = loadProfile || loadEnrollments || loadSessions;

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6 animate-fade-in">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold" style={{ color: '#0f172a' }}>Emploi du temps</h1>
          <p className="text-sm" style={{ color: '#64748b' }}>
            {activeEnrollment
              ? `Classe : ${activeEnrollment.class_name || '—'}`
              : 'Aucune inscription active'}
          </p>
        </div>
        <button onClick={() => refresh()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
          style={{ background: '#f1f5f9', color: '#64748b' }}>
          <RefreshCw className="h-3.5 w-3.5" /> Actualiser
        </button>
      </div>

      {!classId ? (
        <div className="card flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)' }}>
            <Calendar className="h-8 w-8" style={{ color: '#7c3aed' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: '#475569' }}>Aucune inscription active trouvée</p>
          <p className="text-xs text-center max-w-xs" style={{ color: '#94a3b8' }}>
            Votre emploi du temps apparaîtra ici lorsque vous serez inscrit à une classe.
          </p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)' }}>
            <Calendar className="h-8 w-8" style={{ color: '#7c3aed' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: '#475569' }}>Aucune séance planifiée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DAY_NUMS.map((dayNum, idx) => {
            const daySessions = sessionsByDay[dayNum] || [];
            return (
              <div key={dayNum} className="card overflow-hidden">
                <div className="px-4 py-3" style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <p className="text-sm font-extrabold" style={{ color: '#0f172a' }}>{DAYS[idx]}</p>
                  <p className="text-[10px] font-semibold" style={{ color: '#94a3b8' }}>
                    {daySessions.length} séance{daySessions.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="p-3 space-y-2 min-h-[80px]">
                  {daySessions.length === 0 ? (
                    <p className="text-xs text-center py-4" style={{ color: '#cbd5e1' }}>Aucun cours</p>
                  ) : daySessions.map(s => {
                    const subjectKey = s.subject_name || s.subject || '';
                    const c = subjectColors[subjectKey] || COLORS[0];
                    return (
                      <div key={s.id} className="p-3 rounded-xl"
                           style={{ background: c.bg, border: `1.5px solid ${c.color}20` }}>
                        <p className="text-xs font-extrabold truncate" style={{ color: c.color }}>
                          {s.subject_name || s.subject || 'Cours'}
                        </p>
                        {s.teacher_name && (
                          <p className="text-[10px] mt-0.5 truncate" style={{ color: '#64748b' }}>
                            {s.teacher_name}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-1.5">
                          <Clock className="h-3 w-3" style={{ color: '#94a3b8' }} />
                          <span className="text-[10px] font-semibold" style={{ color: '#94a3b8' }}>
                            {s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}
                          </span>
                          {s.room_name && (
                            <span className="text-[10px] ml-auto" style={{ color: '#94a3b8' }}>
                              {s.room_name}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      {sessions.length > 0 && (
        <div className="card p-4">
          <p className="text-xs font-extrabold mb-3" style={{ color: '#0f172a' }}>Matières</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(subjectColors).map(([name, c]) => (
              <span key={name} className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: c.bg, color: c.color, border: `1.5px solid ${c.color}30` }}>
                <BookOpen className="h-3 w-3" />
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
