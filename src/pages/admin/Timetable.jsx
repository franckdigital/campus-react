import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Plus, Edit, Trash2, Clock, MapPin, User, BookOpen, X, Printer } from 'lucide-react';
import { academicService } from '../../services';
import { useApi } from '../../hooks/useApi';
import { useNotifications } from '../../components/Notifications';
import { useSite } from '../../contexts/SiteContext';
import {
  PageHeader, FilterBar, FilterSelect, PrimaryButton, IconBtn
} from '../../components/ui/PageHeader';

const COLOR = '#0d9488';
const COLOR_BG = '#f0fdfa';
const COLOR_ICON = '#ccfbf1';

// value = Django day_of_week (0=Lundi … 5=Samedi), iso = JS ISO weekday (1=Mon … 6=Sat)
const DAYS = [
  { value: 0, label: 'Lundi',    short: 'Lun', iso: 1 },
  { value: 1, label: 'Mardi',    short: 'Mar', iso: 2 },
  { value: 2, label: 'Mercredi', short: 'Mer', iso: 3 },
  { value: 3, label: 'Jeudi',    short: 'Jeu', iso: 4 },
  { value: 4, label: 'Vendredi', short: 'Ven', iso: 5 },
  { value: 5, label: 'Samedi',   short: 'Sam', iso: 6 },
];

// Returns the Date for a given ISO weekday (1=Mon … 6=Sat) in the current week
function getWeekDate(isoDay) {
  const now = new Date();
  const currentDay = now.getDay() || 7; // 0(Sun)→7
  const diff = isoDay - currentDay;
  const d = new Date(now);
  d.setDate(now.getDate() + diff);
  return d;
}

function fmtDate(d) {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);

const SESSION_COLORS = [
  { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
  { bg: '#fce7f3', color: '#be185d', border: '#fbcfe8' },
  { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
  { bg: '#fef9c3', color: '#a16207', border: '#fef08a' },
  { bg: '#ede9fe', color: '#6d28d9', border: '#ddd6fe' },
  { bg: '#ffedd5', color: '#c2410c', border: '#fed7aa' },
  { bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' },
  { bg: '#fdf2f8', color: '#9d174d', border: '#f9a8d4' },
];

function getSessionColor(subjectName) {
  if (!subjectName) return SESSION_COLORS[0];
  let hash = 0;
  for (let i = 0; i < subjectName.length; i++) hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
  return SESSION_COLORS[Math.abs(hash) % SESSION_COLORS.length];
}

function timeToHour(timeStr) {
  if (!timeStr) return null;
  const [h] = timeStr.split(':').map(Number);
  return h;
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  return `${h}h${m && m !== '00' ? m : ''}`;
}

function teacherLabel(t) {
  if (!t) return '';
  return t.full_name || (t.user ? `${t.user.first_name} ${t.user.last_name}`.trim() : '') || t.employee_id || '';
}

export default function Timetable() {
  const { selectedSite } = useSite();
  const { notify } = useNotifications();

  // ── Display filters ──────────────────────────────────────────
  const [filterYear,     setFilterYear]     = useState('all');
  const [filterClass,    setFilterClass]    = useState('all');
  const [filterSemester, setFilterSemester] = useState('all');
  const [filterTeacher,  setFilterTeacher]  = useState('all');

  // ── UI state ─────────────────────────────────────────────────
  const [showModal,       setShowModal]       = useState(false);
  const [editingSession,  setEditingSession]  = useState(null);
  const [confirmModal,    setConfirmModal]    = useState(null);
  const [saving,          setSaving]          = useState(false);
  const [activeDay,       setActiveDay]       = useState(0);
  const [isMobile,        setIsMobile]        = useState(false);

  const [formData, setFormData] = useState({
    subject_id: '', class_id: '', teacher_id: '', room: '',
    day_of_week: '0', start_time: '08:00', end_time: '09:00',
    semester_id: '', academic_year_id: '',
  });

  // ── Site param (accept both field names the backend uses) ────
  const siteParam = selectedSite !== 'all' ? { site_id: selectedSite } : {};

  // ── Fetch reference data ─────────────────────────────────────
  const { data: academicYearsData } = useApi(() => academicService.getAcademicYears({ page_size: 500 }), [], true);

  // Semesters: server-filtered by selected year (display) or form year
  const { data: semestersData } = useApi(
    () => academicService.getSemesters({ ...(filterYear !== 'all' ? { academic_year: filterYear } : {}), page_size: 500 }),
    [filterYear], true
  );
  const { data: formSemestersData } = useApi(
    () => academicService.getSemesters({ ...(formData.academic_year_id ? { academic_year: formData.academic_year_id } : {}), page_size: 500 }),
    [formData.academic_year_id], true
  );

  // Classes: server-filtered by site + selected year (display) or form year
  const { data: classesData } = useApi(
    () => academicService.getClasses({
      ...siteParam,
      ...(filterYear !== 'all' ? { academic_year: filterYear } : {}),
      page_size: 500,
    }),
    [selectedSite, filterYear], true
  );
  const { data: formClassesData } = useApi(
    () => academicService.getClasses({
      ...siteParam,
      ...(formData.academic_year_id ? { academic_year: formData.academic_year_id } : {}),
      page_size: 500,
    }),
    [selectedSite, formData.academic_year_id], true
  );

  const { data: subjectsData } = useApi(() => academicService.getSubjects({ ...siteParam, page_size: 500 }), [selectedSite], true);
  const { data: teachersData } = useApi(() => academicService.getTeachers({ ...siteParam, page_size: 500 }), [selectedSite], true);
  const { data: roomsData }    = useApi(() => academicService.getRooms({ ...siteParam, page_size: 500 }),    [selectedSite], true);

  const academicYears    = academicYearsData?.results  || academicYearsData  || [];
  const semesterOptions  = semestersData?.results      || semestersData      || [];
  const formSemesterOpts = formSemestersData?.results  || formSemestersData  || [];
  const classOptions     = classesData?.results        || classesData        || [];
  const formClassOptions = formClassesData?.results    || formClassesData    || [];
  const subjects         = subjectsData?.results       || subjectsData       || [];
  const teachers         = teachersData?.results       || teachersData       || [];
  const rooms            = roomsData?.results          || roomsData          || [];

  // ── Fetch sessions with active filters ───────────────────────
  const sessionParams = {
    ...siteParam,
    ...(filterClass    !== 'all' ? { class_id:         filterClass    } : {}),
    ...(filterSemester !== 'all' ? { semester_id:      filterSemester } : {}),
    ...(filterTeacher  !== 'all' ? { teacher_id:       filterTeacher  } : {}),
    ...(filterYear     !== 'all' ? { academic_year_id: filterYear     } : {}),
  };

  const { data: sessionsData, loading, execute: fetchSessions } = useApi(
    () => academicService.getSessions(sessionParams),
    [filterClass, filterSemester, filterTeacher, filterYear, selectedSite],
    true
  );

  const sessions = sessionsData?.results || sessionsData || [];

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Reset class and semester when year changes
  useEffect(() => {
    setFilterClass('all');
    setFilterSemester('all');
  }, [filterYear]);

  function getSessionsForCell(day, hour) {
    return sessions.filter(s => {
      if (s.day_of_week !== day) return false;
      return timeToHour(s.start_time) === hour;
    });
  }

  function getSessionDuration(session) {
    const start = timeToMinutes(session.start_time);
    const end   = timeToMinutes(session.end_time);
    return Math.max(1, Math.round((end - start) / 60));
  }

  function resetForm() {
    setFormData({
      subject_id: '', class_id: '', teacher_id: '', room: '',
      day_of_week: '0', start_time: '08:00', end_time: '09:00',
      semester_id: '', academic_year_id: '',
    });
  }

  function openCreate(day, hour) {
    setEditingSession(null);
    // Pre-fill from active display filters
    const classId = filterClass !== 'all' ? filterClass : '';
    const yearId  = filterYear  !== 'all' ? filterYear  : '';
    const semId   = filterSemester !== 'all' ? filterSemester : '';
    setFormData(f => ({
      ...f,
      day_of_week:      String(day ?? 0),
      start_time:       hour ? `${String(hour).padStart(2, '0')}:00` : '08:00',
      end_time:         hour ? `${String(hour + 1).padStart(2, '0')}:00` : '09:00',
      class_id:         classId,
      academic_year_id: yearId,
      semester_id:      semId,
    }));
    setShowModal(true);
  }

  function openEdit(session) {
    setEditingSession(session);
    setFormData({
      subject_id:       String(session.subject  || ''),
      class_id:         String(session.class_obj || ''),
      teacher_id:       String(session.teacher   || ''),
      room:             String(session.room       || ''),
      day_of_week:      String(session.day_of_week ?? 0),
      start_time:       session.start_time || '08:00',
      end_time:         session.end_time   || '09:00',
      semester_id:      String(session.semester   || ''),
      academic_year_id: String(session.academic_year_id || ''),
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.subject_id || !formData.start_time || !formData.end_time) {
      notify('Matière, heure de début et heure de fin sont obligatoires', 'error');
      return;
    }
    if (formData.start_time >= formData.end_time) {
      notify('L\'heure de fin doit être après l\'heure de début', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        subject:     formData.subject_id  || undefined,
        class_obj:   formData.class_id    || undefined,
        teacher:     formData.teacher_id  || undefined,
        room:        formData.room        || undefined,
        semester:    formData.semester_id || undefined,
        day_of_week: parseInt(formData.day_of_week),
        start_time:  formData.start_time,
        end_time:    formData.end_time,
      };
      if (editingSession) {
        await academicService.updateSession(editingSession.id, payload);
        notify('Session modifiée avec succès', 'success');
      } else {
        await academicService.createSession(payload);
        notify('Session ajoutée à l\'emploi du temps', 'success');
      }
      setShowModal(false);
      resetForm();
      fetchSessions();
    } catch (err) {
      notify(err?.message || 'Impossible d\'enregistrer la session', 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(id) {
    setConfirmModal({
      message: 'Êtes-vous sûr de vouloir supprimer cette session ?',
      onConfirm: async () => {
        try {
          await academicService.deleteSession(id);
          notify('Session retirée de l\'emploi du temps', 'success');
          fetchSessions();
        } catch {
          notify('Impossible de supprimer la session', 'error');
        }
      }
    });
  }

  const sessionsByDay = DAYS.reduce((acc, d) => {
    acc[d.value] = sessions.filter(s => s.day_of_week === d.value)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
    return acc;
  }, {});

  // ── Derived subject for preview ──────────────────────────────
  const previewSubject = subjects.find(s => String(s.id) === String(formData.subject_id));
  const previewColor   = getSessionColor(previewSubject?.name || '');

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        icon={Calendar}
        iconColor={COLOR}
        iconBg={COLOR_ICON}
        title="Emploi du Temps"
        subtitle="Planification hebdomadaire des cours et sessions"
        action={
          <PrimaryButton icon={Plus} label="Nouvelle session" color={COLOR} onClick={() => openCreate(activeDay, null)} />
        }
      />

      {/* ── Filter bar ── */}
      <FilterBar>
        {/* Année académique */}
        <FilterSelect value={filterYear} onChange={e => setFilterYear(e.target.value)}>
          <option value="all">Toutes les années</option>
          {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
        </FilterSelect>

        {/* Semestre (cascadé sur l'année) */}
        <FilterSelect value={filterSemester} onChange={e => setFilterSemester(e.target.value)}>
          <option value="all">Tous les semestres</option>
          {semesterOptions.map(s => <option key={s.id} value={s.id}>{s.label || s.name}</option>)}
        </FilterSelect>

        {/* Classe (cascadée sur l'année) */}
        <FilterSelect value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="all">Toutes les classes</option>
          {classOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </FilterSelect>

        {/* Enseignant */}
        <FilterSelect value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}>
          <option value="all">Tous les enseignants</option>
          {teachers.map(t => <option key={t.id} value={t.id}>{teacherLabel(t)}</option>)}
        </FilterSelect>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border print:hidden"
            style={{ color: COLOR, borderColor: `${COLOR}30`, background: COLOR_BG }}
            onMouseEnter={e => { e.currentTarget.style.background = '#99f6e4'; }}
            onMouseLeave={e => { e.currentTarget.style.background = COLOR_BG; }}
            title="Imprimer / Exporter PDF"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimer
          </button>
        </div>
      </FilterBar>

      {loading ? (
        <div className="rounded-2xl border border-[#f0f4f9] bg-white flex flex-col items-center justify-center py-24"
             style={{ boxShadow: '0 2px 12px rgba(15,23,50,0.05)' }}>
          <div className="h-6 w-6 rounded-full border-2 border-t-teal-600 border-teal-200 animate-spin mx-auto" />
          <p className="text-sm font-medium mt-3" style={{ color: '#94a3b8' }}>Chargement de l'emploi du temps…</p>
        </div>
      ) : (
        <>
          {isMobile ? (
            <div className="rounded-2xl border border-[#f0f4f9] bg-white overflow-hidden"
                 style={{ boxShadow: '0 2px 12px rgba(15,23,50,0.05)' }}>
              <div className="flex border-b border-[#f0f4f9] overflow-x-auto">
                {DAYS.map(day => (
                  <button key={day.value}
                          onClick={() => setActiveDay(day.value)}
                          className="flex-1 min-w-[64px] py-3 text-xs font-bold uppercase tracking-wider transition-all"
                          style={activeDay === day.value
                            ? { color: COLOR, borderBottom: `2px solid ${COLOR}`, background: `${COLOR}08` }
                            : { color: '#94a3b8', borderBottom: '2px solid transparent' }}>
                    {day.short}
                  </button>
                ))}
              </div>
              <div className="p-4 space-y-3">
                {sessionsByDay[activeDay].length === 0 ? (
                  <div className="flex flex-col items-center py-12">
                    <Calendar className="h-10 w-10 mb-3 opacity-20" style={{ color: '#64748b' }} />
                    <p className="text-sm font-semibold" style={{ color: '#94a3b8' }}>Aucune session ce jour</p>
                    <button onClick={() => openCreate(activeDay, null)}
                            className="mt-3 text-xs font-bold px-3 py-1.5 rounded-xl"
                            style={{ background: `${COLOR}15`, color: COLOR }}>
                      + Ajouter une session
                    </button>
                  </div>
                ) : sessionsByDay[activeDay].map(session => {
                  const col = getSessionColor(session.subject_name);
                  return (
                    <div key={session.id}
                         className="rounded-xl p-3 border flex items-start justify-between gap-3"
                         style={{ background: col.bg, borderColor: col.border }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: col.color }}>{session.subject_name || 'Matière'}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="flex items-center gap-1 text-xs font-medium" style={{ color: col.color }}>
                            <Clock className="h-3 w-3" />
                            {formatTime(session.start_time)} – {formatTime(session.end_time)}
                          </span>
                          {session.class_name && (
                            <span className="flex items-center gap-1 text-xs" style={{ color: col.color }}>
                              <BookOpen className="h-3 w-3" />{session.class_name}
                            </span>
                          )}
                          {session.teacher_name && (
                            <span className="flex items-center gap-1 text-xs" style={{ color: col.color }}>
                              <User className="h-3 w-3" />{session.teacher_name}
                            </span>
                          )}
                          {(session.room_name || session.room) && (
                            <span className="flex items-center gap-1 text-xs" style={{ color: col.color }}>
                              <MapPin className="h-3 w-3" />{session.room_name || session.room}
                            </span>
                          )}
                          {session.semester_name && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                  style={{ background: `${col.color}18`, color: col.color }}>
                              {session.semester_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <IconBtn icon={Edit}   color={col.color} hoverBg={`${col.color}18`} size="sm" title="Modifier"   onClick={() => openEdit(session)} />
                        <IconBtn icon={Trash2} color="#ef4444"   hoverBg="#fee2e2"          size="sm" title="Supprimer" onClick={() => handleDelete(session.id)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#f0f4f9] bg-white overflow-hidden"
                 style={{ boxShadow: '0 2px 12px rgba(15,23,50,0.05)' }}>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ minWidth: 900 }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg,#fafbff,#f8fafc)', borderBottom: '1px solid #f0f4f9' }}>
                      <th className="w-16 px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 border-r border-[#f0f4f9]">
                        Heure
                      </th>
                      {DAYS.map(day => {
                        const weekDate = getWeekDate(day.iso);
                        const isToday  = new Date().toDateString() === weekDate.toDateString();
                        return (
                          <th key={day.value}
                              className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider border-r border-[#f0f4f9] last:border-r-0"
                              style={{ color: '#64748b', background: isToday ? `${COLOR}08` : undefined }}>
                            <span className="block text-xs font-bold" style={{ color: isToday ? COLOR : '#0f172a' }}>{day.label}</span>
                            <span className="block text-[11px] font-semibold mt-0.5" style={{ color: isToday ? COLOR : '#94a3b8' }}>
                              {fmtDate(weekDate)}
                            </span>
                            <span className="block text-[10px] font-medium text-slate-400 mt-0.5">
                              {sessionsByDay[day.value].length} cours
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {HOURS.map((hour, hIdx) => (
                      <tr key={hour}
                          style={{ background: hIdx % 2 === 0 ? '#fafbff' : 'transparent', borderBottom: '1px solid #f1f5f9' }}>
                        <td className="w-16 px-3 py-2 text-[11px] font-bold text-slate-400 border-r border-[#f0f4f9] align-top whitespace-nowrap">
                          {String(hour).padStart(2, '0')}:00
                        </td>
                        {DAYS.map(day => {
                          const cellSessions = getSessionsForCell(day.value, hour);
                          return (
                            <td key={day.value}
                                className="px-1.5 py-1.5 border-r border-[#f0f4f9] last:border-r-0 align-top"
                                style={{ minHeight: 56, verticalAlign: 'top' }}>
                              <div className="space-y-1 min-h-[48px]">
                                {cellSessions.map(session => {
                                  const col      = getSessionColor(session.subject_name);
                                  const duration = getSessionDuration(session);
                                  return (
                                    <div key={session.id}
                                         className="rounded-xl p-2 border group relative transition-all hover:shadow-md cursor-default"
                                         style={{ background: col.bg, borderColor: col.border, minHeight: 48 * duration }}>
                                      <p className="text-[11px] font-bold leading-tight truncate" style={{ color: col.color }}>
                                        {session.subject_name || 'Matière'}
                                      </p>
                                      {session.class_name && (
                                        <p className="text-[10px] font-medium mt-0.5 truncate" style={{ color: col.color, opacity: 0.8 }}>
                                          {session.class_name}
                                        </p>
                                      )}
                                      <p className="text-[10px] mt-0.5" style={{ color: col.color, opacity: 0.7 }}>
                                        {formatTime(session.start_time)}–{formatTime(session.end_time)}
                                      </p>
                                      {session.teacher_name && (
                                        <p className="text-[10px] truncate" style={{ color: col.color, opacity: 0.7 }}>
                                          <User className="inline h-2.5 w-2.5 mr-0.5" />
                                          {session.teacher_name}
                                        </p>
                                      )}
                                      {(session.room_name || session.room) && (
                                        <p className="text-[10px] truncate" style={{ color: col.color, opacity: 0.7 }}>
                                          <MapPin className="inline h-2.5 w-2.5 mr-0.5" />
                                          {session.room_name || session.room}
                                        </p>
                                      )}
                                      {session.semester_name && (
                                        <p className="text-[10px] truncate font-semibold" style={{ color: col.color, opacity: 0.6 }}>
                                          {session.semester_name}
                                        </p>
                                      )}
                                      <div className="absolute top-1 right-1 hidden group-hover:flex items-center gap-0.5 bg-white rounded-lg shadow-sm p-0.5">
                                        <button onClick={() => openEdit(session)}
                                                className="h-5 w-5 rounded flex items-center justify-center hover:bg-slate-100 transition-colors"
                                                title="Modifier">
                                          <Edit className="h-2.5 w-2.5" style={{ color: col.color }} />
                                        </button>
                                        <button onClick={() => handleDelete(session.id)}
                                                className="h-5 w-5 rounded flex items-center justify-center hover:bg-red-50 transition-colors"
                                                title="Supprimer">
                                          <Trash2 className="h-2.5 w-2.5" style={{ color: '#ef4444' }} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                                <button
                                  onClick={() => openCreate(day.value, hour)}
                                  className="w-full h-6 rounded-lg text-[10px] font-bold opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-1"
                                  style={{ background: `${COLOR}12`, color: COLOR }}>
                                  <Plus className="h-2.5 w-2.5" /> Ajouter
                                </button>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Session Modal ── */}
      {showModal && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4"
             style={{ background: 'rgba(8,12,36,0.58)', backdropFilter: 'blur(10px)', zIndex: 9000 }}
             onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
               style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.2)' }}
               onClick={e => e.stopPropagation()}>
            <div style={{ height: 4, background: `linear-gradient(90deg,${COLOR},${COLOR}80)`, borderRadius: '16px 16px 0 0' }} />
            <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
                 style={{ borderBottom: '1px solid #f0f4f9', background: 'linear-gradient(180deg,#fafbff 0%,#fff 100%)' }}>
              <div>
                <h2 className="text-base font-bold" style={{ color: '#0f172a' }}>
                  {editingSession ? 'Modifier la session' : 'Nouvelle session'}
                </h2>
                <p className="text-xs mt-0.5 font-medium" style={{ color: '#94a3b8' }}>
                  {editingSession ? 'Modifier les détails du cours' : 'Ajouter un cours à l\'emploi du temps'}
                </p>
              </div>
              <button onClick={() => { setShowModal(false); resetForm(); }}
                      className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-all">
                <X className="h-4 w-4" style={{ color: '#94a3b8' }} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

              {/* Année académique + Semestre */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Année académique
                  </label>
                  <select className="input-field cursor-pointer w-full"
                          value={formData.academic_year_id}
                          onChange={e => setFormData(f => ({
                            ...f,
                            academic_year_id: e.target.value,
                            class_id: '',
                            semester_id: '',
                          }))}>
                    <option value="">— Année —</option>
                    {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Semestre</label>
                  <select className="input-field cursor-pointer w-full"
                          value={formData.semester_id}
                          onChange={e => setFormData(f => ({ ...f, semester_id: e.target.value }))}>
                    <option value="">— Semestre —</option>
                    {formSemesterOpts.map(s => <option key={s.id} value={s.id}>{s.label || s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Classe + Matière */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Classe</label>
                  <select className="input-field cursor-pointer w-full"
                          value={formData.class_id}
                          onChange={e => setFormData(f => ({ ...f, class_id: e.target.value }))}>
                    <option value="">— Classe —</option>
                    {formClassOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Matière <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select className="input-field cursor-pointer w-full"
                          value={formData.subject_id}
                          onChange={e => setFormData(f => ({ ...f, subject_id: e.target.value }))}>
                    <option value="">— Choisir —</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Enseignant */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Enseignant</label>
                <select className="input-field cursor-pointer w-full"
                        value={formData.teacher_id}
                        onChange={e => setFormData(f => ({ ...f, teacher_id: e.target.value }))}>
                  <option value="">— Choisir un enseignant —</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{teacherLabel(t)}</option>
                  ))}
                </select>
              </div>

              {/* Salle + Jour */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Salle</label>
                  {rooms.length > 0 ? (
                    <select className="input-field cursor-pointer w-full"
                            value={formData.room}
                            onChange={e => setFormData(f => ({ ...f, room: e.target.value }))}>
                      <option value="">— Salle —</option>
                      {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  ) : (
                    <input type="text" className="input-field w-full"
                           placeholder="Ex: Salle A12"
                           value={formData.room}
                           onChange={e => setFormData(f => ({ ...f, room: e.target.value }))} />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Jour <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select className="input-field cursor-pointer w-full"
                          value={formData.day_of_week}
                          onChange={e => setFormData(f => ({ ...f, day_of_week: e.target.value }))}>
                    {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Horaires */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Heure de début <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input type="time" className="input-field w-full"
                         value={formData.start_time}
                         min="07:00" max="22:00"
                         onChange={e => setFormData(f => ({ ...f, start_time: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Heure de fin <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input type="time" className="input-field w-full"
                         value={formData.end_time}
                         min="07:00" max="22:00"
                         onChange={e => setFormData(f => ({ ...f, end_time: e.target.value }))} />
                </div>
              </div>

              {/* Aperçu */}
              {formData.subject_id && formData.start_time && formData.end_time && (
                <div className="rounded-xl p-3 border"
                     style={{ background: previewColor.bg, borderColor: previewColor.border }}>
                  <p className="text-xs font-bold" style={{ color: previewColor.color }}>
                    Aperçu — {DAYS.find(d => String(d.value) === formData.day_of_week)?.label}
                    {' · '}{formatTime(formData.start_time)} – {formatTime(formData.end_time)}
                    {formData.room && ` · ${rooms.find(r => String(r.id) === String(formData.room))?.name || formData.room}`}
                    {formData.semester_id && ` · ${formSemesterOpts.find(s => String(s.id) === String(formData.semester_id))?.label || ''}`}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2" style={{ borderTop: '1px solid #f0f4f9' }}>
                <button type="button"
                        onClick={() => { setShowModal(false); resetForm(); }}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold border"
                        style={{ color: '#64748b', borderColor: '#e2e8f2', background: 'transparent' }}>
                  Annuler
                </button>
                <button type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                        style={{ background: `linear-gradient(135deg,${COLOR},${COLOR}bb)`, boxShadow: `0 3px 12px ${COLOR}32` }}>
                  {saving ? (
                    <><span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />Enregistrement…</>
                  ) : (editingSession ? 'Modifier' : 'Ajouter')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Confirm Modal ── */}
      {confirmModal && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4"
             style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', zIndex: 9999 }}
             onClick={() => setConfirmModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-xs overflow-hidden"
               onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4"
                   style={{ background: '#fee2e2' }}>
                <Trash2 className="h-7 w-7" style={{ color: '#ef4444' }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>{confirmModal.message}</p>
            </div>
            <div className="px-4 pb-4 flex gap-3">
              <button onClick={() => setConfirmModal(null)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                      style={{ background: '#f1f5f9', color: '#64748b' }}>
                Annuler
              </button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                      style={{ background: '#ef4444' }}>
                Confirmer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
