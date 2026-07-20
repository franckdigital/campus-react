import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, GraduationCap, Video, ClipboardList, ClipboardCheck,
  Award, FileText, Calendar, DollarSign, MessageSquare, Library, Film,
  FlaskConical, Bot, User, ChevronLeft, ChevronRight,
  Search, Grid, List, Play, CheckCircle, Clock, BarChart2,
  Radio, Trophy, Files, RefreshCw, Lock, Globe, Send, Users,
} from 'lucide-react';
import { studentsService } from '../../services/students';
import { academicService } from '../../services/academic';
import { elearningService } from '../../services/elearning';
import { useApi } from '../../hooks/useApi';
import { useNotifications } from '../../components/Notifications';
import StudentNotes from './StudentNotes';
import StudentPresences from './StudentPresences';
import StudentPlanning from './StudentPlanning';
import StudentFinances from './StudentFinances';
import StudentDocuments from './StudentDocuments';
import StudentMessages from './StudentMessages';
import StudentVideoLibrary from './StudentVideoLibrary';
import StudentVirtualLabs from './StudentVirtualLabs';
import StudentLibrary from './StudentLibrary';
import StudentAITutor from './StudentAITutor';
import StudentAssignmentsHub from './StudentAssignmentsHub';
import StudentExamsHub from './StudentExamsHub';
import StudentResultsHub from './StudentResultsHub';
import VirtualClassSessions from '../components/VirtualClassSessions';
import { WorkflowHelpButton } from '../../components/WorkflowHelpModal';

/* ── tokens ──────────────────────────────────────────────────────────────── */
const P = '#db2777';
const P_BG = '#fdf2f8';
const P_LIGHT = '#fce7f3';

/* ── helpers ─────────────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="h-9 w-9 rounded-full border-[3px] animate-spin"
           style={{ borderColor: P_LIGHT, borderTopColor: P }} />
      <p className="text-sm font-semibold" style={{ color: '#64748b' }}>Chargement…</p>
    </div>
  );
}

function Empty({ icon: Icon, text, sub }) {
  return (
    <div className="flex flex-col items-center py-16 rounded-2xl" style={{ border: '1.5px dashed #e2e8f0' }}>
      <Icon className="h-10 w-10 mb-3 opacity-25" style={{ color: P }} />
      <p className="text-sm font-bold" style={{ color: '#64748b' }}>{text}</p>
      {sub && <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>{sub}</p>}
    </div>
  );
}

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDT(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function classStatus(c) {
  const now = new Date();
  const start = new Date(c.start_time);
  const end = new Date(start.getTime() + (c.duration_minutes || 60) * 60000);
  if (now < start) return 'upcoming';
  if (now <= end) return 'live';
  return 'ended';
}

const LEVEL_META = {
  beginner:     { label: 'Débutant',       color: '#059669', bg: '#f0fdf4' },
  intermediate: { label: 'Intermédiaire',  color: '#d97706', bg: '#fffbeb' },
  advanced:     { label: 'Avancé',         color: '#dc2626', bg: '#fef2f2' },
  all_levels:   { label: 'Tous niveaux',   color: '#7c3aed', bg: '#f5f3ff' },
  BEGINNER:     { label: 'Débutant',       color: '#059669', bg: '#f0fdf4' },
  INTERMEDIATE: { label: 'Intermédiaire',  color: '#d97706', bg: '#fffbeb' },
  ADVANCED:     { label: 'Avancé',         color: '#dc2626', bg: '#fef2f2' },
  ALL:          { label: 'Tous niveaux',   color: '#7c3aed', bg: '#f5f3ff' },
};

const COURSE_GRADIENTS = [
  { from: '#6366f1', to: '#8b5cf6', icon: '💡' },
  { from: '#db2777', to: '#f43f5e', icon: '🗄️' },
  { from: '#0891b2', to: '#0284c7', icon: '🌐' },
  { from: '#059669', to: '#10b981', icon: '🔒' },
  { from: '#d97706', to: '#f59e0b', icon: '🤖' },
  { from: '#7c3aed', to: '#a855f7', icon: '📊' },
  { from: '#dc2626', to: '#ef4444', icon: '⚙️' },
  { from: '#0d9488', to: '#14b8a6', icon: '📱' },
];

function CourseThumbnail({ course, idx = 0, height = 'h-40', overlay = false }) {
  const g = COURSE_GRADIENTS[idx % COURSE_GRADIENTS.length];
  const [imgErr, setImgErr] = useState(false);
  const src = course.thumbnail
    ? course.thumbnail
    : `https://picsum.photos/seed/${encodeURIComponent(course.title || course.id || idx)}/640/360`;

  if (!imgErr) {
    return (
      <div className={`w-full ${height} relative overflow-hidden`}>
        <img src={src} alt={course.title}
             className="w-full h-full object-cover"
             onError={() => setImgErr(true)} />
        {overlay && (
          <div className="absolute inset-0"
               style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 100%)' }} />
        )}
      </div>
    );
  }
  return (
    <div className={`w-full ${height} flex flex-col items-center justify-center relative overflow-hidden`}
         style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}>
      <div className="absolute inset-0 opacity-10"
           style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      <span className="text-5xl mb-1 relative z-10">{g.icon}</span>
      <p className="text-white text-xs font-bold opacity-70 relative z-10 px-4 text-center line-clamp-2 mt-1">
        {course.title}
      </p>
    </div>
  );
}

function LevelBadge({ level }) {
  const m = LEVEL_META[level] || LEVEL_META.all_levels;
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0"
          style={{ color: m.color, background: m.bg }}>{m.label}</span>
  );
}

function StatCard({ icon: Icon, value, label, color = P, bg = P_LIGHT }) {
  return (
    <div className="rounded-2xl p-5 flex items-center gap-4"
         style={{ background: 'white', boxShadow: '0 1px 6px #0001' }}>
      <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
           style={{ background: bg }}>
        <Icon className="h-6 w-6" style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-black" style={{ color: '#1e293b' }}>{value ?? '—'}</p>
        <p className="text-xs font-semibold mt-0.5" style={{ color: '#64748b' }}>{label}</p>
      </div>
    </div>
  );
}

/* ── NAV ─────────────────────────────────────────────────────────────────── */
const NAV_SECTIONS = [
  {
    title: 'GÉNÉRAL',
    items: [
      { id: 'dashboard',    label: 'Tableau de bord',    icon: LayoutDashboard },
    ],
  },
  {
    title: 'APPRENTISSAGE',
    items: [
      { id: 'courses',      label: 'Cours',              icon: BookOpen },
      { id: 'my-learning',  label: 'Mon apprentissage',  icon: GraduationCap },
      { id: 'classrooms',   label: 'Classes virtuelles', icon: Video },
    ],
  },
  {
    title: 'ÉVALUATION',
    items: [
      { id: 'evaluations',  label: 'Évaluations',        icon: ClipboardCheck },
      { id: 'assignments',  label: 'Devoirs & Exercices',icon: ClipboardList },
      { id: 'exams',        label: 'Examens',            icon: Award },
      { id: 'results',      label: 'Mes Résultats',      icon: Trophy },
      { id: 'notes',        label: 'Mes notes',          icon: BarChart2 },
    ],
  },
  {
    title: 'SCOLARITÉ',
    items: [
      { id: 'presences',    label: 'Présences',          icon: CheckCircle },
      { id: 'planning',     label: 'Emploi du temps',    icon: Calendar },
      { id: 'finances',     label: 'Finances',           icon: DollarSign },
      { id: 'documents',    label: 'Documents',          icon: Files },
    ],
  },
  {
    title: 'RESSOURCES',
    items: [
      { id: 'library',      label: 'Bibliothèque',       icon: Library },
      { id: 'videos',       label: 'Vidéothèque',        icon: Film },
      { id: 'labs',         label: 'Laboratoires',       icon: FlaskConical },
    ],
  },
  {
    title: 'COMMUNAUTÉ',
    items: [
      { id: 'messages',     label: 'Messages',           icon: MessageSquare },
      { id: 'ai-tutor',     label: 'Tuteur IA',          icon: Bot },
    ],
  },
];

/* ── SIDEBAR ─────────────────────────────────────────────────────────────── */
function Sidebar({ active, setActive, collapsed, setCollapsed, student }) {
  const navigate = useNavigate();
  const su = student?.user;
  const fullName = su?.full_name ||
    `${su?.first_name || ''} ${su?.last_name || ''}`.trim() || 'Étudiant';
  const initial = fullName.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col h-screen border-r overflow-y-auto flex-shrink-0 transition-all duration-200"
         style={{ width: collapsed ? 64 : 240, background: 'white', borderColor: '#f1f5f9' }}>

      {/* Logo row */}
      <div className="flex items-center gap-2 px-3 py-4 border-b" style={{ borderColor: '#f1f5f9' }}>
        <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
             style={{ background: P, color: 'white', fontSize: 12, fontWeight: 900 }}>C</div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black leading-tight" style={{ color: '#1e293b' }}>Campus LMS</p>
            <p className="text-[10px] font-bold" style={{ color: P }}>Espace E-Learning</p>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)}
                className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 ml-auto"
                style={{ background: P_LIGHT, color: P }}>
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Back link */}
      <div className="px-3 pt-2 pb-1">
        <button onClick={() => navigate('/student')}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl w-full transition-all hover:bg-pink-50"
                style={{ color: '#94a3b8' }}>
          <ChevronLeft className="h-3.5 w-3.5 flex-shrink-0" />
          {!collapsed && <span className="text-xs font-semibold">Tableau de bord</span>}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-1 space-y-3 overflow-y-auto">
        {NAV_SECTIONS.map(section => (
          <div key={section.title}>
            {!collapsed && (
              <p className="text-[9px] font-black tracking-widest px-2 mb-1 mt-1"
                 style={{ color: '#cbd5e1' }}>{section.title}</p>
            )}
            {section.items.map(item => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <button key={item.id} onClick={() => setActive(item.id)}
                        title={collapsed ? item.label : undefined}
                        className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-left transition-all"
                        style={{
                          background: isActive ? P_LIGHT : 'transparent',
                          color: isActive ? P : '#475569',
                          borderLeft: `3px solid ${isActive ? P : 'transparent'}`,
                          fontWeight: isActive ? 700 : 500,
                        }}>
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && <span className="text-sm">{item.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Profile footer */}
      <div className="border-t p-3" style={{ borderColor: '#f1f5f9' }}>
        <button onClick={() => setActive('profile')}
                className="flex items-center gap-2.5 w-full px-2 py-2 rounded-xl"
                style={{ background: active === 'profile' ? P_LIGHT : 'transparent' }}>
          <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
               style={{ background: P }}>{initial}</div>
          {!collapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-bold truncate" style={{ color: '#1e293b' }}>{fullName}</p>
              <p className="text-[10px]" style={{ color: '#94a3b8' }}>
                {student?.matricule || 'Étudiant'}
              </p>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

/* ── DASHBOARD HOME ──────────────────────────────────────────────────────── */
function DashboardHome({ student, enrollments, onNav }) {
  const [courses, setCourses] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      elearningService.getCourses({ page_size: 6 }).catch(() => []),
      elearningService.getClassrooms({ page_size: 6 }).catch(() => []),
      elearningService.getAssignments({ page_size: 6 }).catch(() => []),
    ]).then(([c, v, a]) => {
      setCourses(Array.isArray(c) ? c : c?.results || []);
      setClassrooms(Array.isArray(v) ? v : v?.results || []);
      setAssignments(Array.isArray(a) ? a : a?.results || []);
      setLoading(false);
    });
  }, []);

  const su = student?.user;
  const firstName = su?.first_name || su?.full_name?.split(' ')[0] || 'Étudiant';
  const enrollment = enrollments[0];
  const className = enrollment?.class_obj_name || enrollment?.class_name || '—';
  const yearName = enrollment?.academic_year_name || '—';

  const live = classrooms.filter(c => classStatus(c) === 'live');
  const upcoming = classrooms.filter(c => classStatus(c) === 'upcoming');
  const pending = assignments.filter(a => !a.submission);

  return (
    <div className="p-8 space-y-8 max-w-6xl">
      {/* Welcome banner */}
      <div className="rounded-3xl p-8 text-white relative overflow-hidden"
           style={{ background: `linear-gradient(135deg, ${P} 0%, #9d174d 100%)` }}>
        <div className="relative z-10">
          <p className="text-sm font-semibold opacity-75">Bienvenue 👋</p>
          <h1 className="text-3xl font-black mt-1">{firstName}</h1>
          <div className="flex items-center flex-wrap gap-3 mt-3">
            <span className="text-sm opacity-80">{className}</span>
            <span className="w-1 h-1 rounded-full bg-white opacity-50" />
            <span className="text-sm opacity-80">{yearName}</span>
            {student?.status === 'ACTIVE' && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                    style={{ background: 'rgba(255,255,255,0.2)' }}>Actif</span>
            )}
          </div>
          <p className="mt-3 text-sm opacity-60 max-w-md">
            Continuez votre apprentissage là où vous en étiez.
          </p>
        </div>
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white opacity-[0.07]" />
        <div className="absolute right-8 -bottom-20 w-72 h-72 rounded-full bg-white opacity-[0.05]" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen}       value={courses.length}  label="Cours disponibles"  color="#6366f1" bg="#eef2ff" />
        <StatCard icon={ClipboardList}  value={pending.length}  label="Devoirs à rendre"   color="#d97706" bg="#fffbeb" />
        <StatCard icon={Radio}          value={live.length}     label="En direct"           color="#dc2626" bg="#fef2f2" />
        <StatCard icon={Calendar}       value={upcoming.length} label="Sessions à venir"   />
      </div>

      {/* 2-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Courses */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-black" style={{ color: '#1e293b' }}>Cours récents</h2>
            <button onClick={() => onNav('courses')}
                    className="text-xs font-bold flex items-center gap-1" style={{ color: P }}>
              Voir tout <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          {loading ? <Spinner /> : courses.length === 0 ? (
            <Empty icon={BookOpen} text="Aucun cours disponible" />
          ) : (
            <div className="space-y-2.5">
              {courses.slice(0, 5).map(c => (
                <div key={c.id} className="p-4 rounded-2xl flex items-center gap-3"
                     style={{ background: 'white', boxShadow: '0 1px 4px #0001' }}>
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                       style={{ background: P_LIGHT }}>
                    <BookOpen className="h-5 w-5" style={{ color: P }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: '#1e293b' }}>{c.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                      {c.subject_name || c.category || '—'}
                    </p>
                  </div>
                  <LevelBadge level={c.level} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming sessions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-black" style={{ color: '#1e293b' }}>Prochaines sessions</h2>
            <button onClick={() => onNav('classrooms')}
                    className="text-xs font-bold flex items-center gap-1" style={{ color: P }}>
              Voir tout <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          {loading ? <Spinner /> : (
            <div className="space-y-2.5">
              {classrooms.filter(c => classStatus(c) !== 'ended').slice(0, 4).map(c => {
                const st = classStatus(c);
                return (
                  <div key={c.id} className="p-4 rounded-2xl"
                       style={{ background: 'white', boxShadow: '0 1px 4px #0001' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                            style={st === 'live'
                              ? { background: '#fef2f2', color: '#dc2626' }
                              : { background: '#f0fdf4', color: '#059669' }}>
                        {st === 'live' ? '🔴 EN DIRECT' : '⏰ À VENIR'}
                      </span>
                    </div>
                    <p className="text-sm font-bold truncate" style={{ color: '#1e293b' }}>{c.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{fmtDT(c.start_time)}</p>
                    {st === 'live' && (c.provider === 'JITSI' ? (c.jitsi_url || c.join_url) : c.join_url) && (
                      <a href={c.provider === 'JITSI' ? (c.jitsi_url || c.join_url) : c.join_url}
                         target="_blank" rel="noopener noreferrer"
                         className="mt-2 inline-flex items-center gap-1 text-xs font-bold"
                         style={{ color: c.provider === 'MEET' ? '#1a73e8' : '#dc2626' }}>
                        <Play className="h-3 w-3" />
                        {c.provider === 'MEET' ? 'Rejoindre Google Meet' : 'Rejoindre'}
                      </a>
                    )}
                  </div>
                );
              })}
              {!loading && classrooms.filter(c => classStatus(c) !== 'ended').length === 0 && (
                <Empty icon={Video} text="Aucune session" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Assignments */}
      {!loading && assignments.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-black" style={{ color: '#1e293b' }}>Devoirs récents</h2>
            <button onClick={() => onNav('assignments')}
                    className="text-xs font-bold flex items-center gap-1" style={{ color: P }}>
              Voir tout <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignments.slice(0, 3).map(a => {
              const isPastDue = a.due_date && new Date(a.due_date) < new Date() && !a.submission;
              return (
                <div key={a.id} className="p-4 rounded-2xl"
                     style={{ background: 'white', boxShadow: '0 1px 4px #0001',
                              borderLeft: `4px solid ${a.submission ? '#059669' : isPastDue ? '#dc2626' : '#d97706'}` }}>
                  <p className="text-sm font-bold" style={{ color: '#1e293b' }}>{a.title}</p>
                  {a.due_date && (
                    <p className="text-xs mt-1" style={{ color: isPastDue ? '#dc2626' : '#64748b' }}>
                      <Clock className="h-3 w-3 inline mr-1" />
                      À rendre le {fmt(a.due_date)}
                    </p>
                  )}
                  <div className="mt-2">
                    {a.submission ? (
                      <span className="text-xs font-bold" style={{ color: '#059669' }}>
                        <CheckCircle className="h-3 w-3 inline mr-1" />Rendu
                      </span>
                    ) : (
                      <span className="text-xs font-bold" style={{ color: '#d97706' }}>
                        <Clock className="h-3 w-3 inline mr-1" />En attente
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── LOAD COURSE CONTENT (sections → chapters → lessons) ────────────────── */
async function loadCourseContent(courseId) {
  const secs = await elearningService.getCourseSections(courseId)
    .then(r => Array.isArray(r) ? r : r?.results || []);
  // Sections' chapters, and each chapter's lessons, are independent of each
  // other — fetch concurrently instead of one sequential round-trip at a time.
  await Promise.all(secs.map(async (sec) => {
    const chs = await elearningService.getCourseChapters(sec.id)
      .then(r => Array.isArray(r) ? r : r?.results || []);
    await Promise.all(chs.map(async (ch) => {
      ch.lessons = await elearningService.getCourseLessons(ch.id)
        .then(r => Array.isArray(r) ? r : r?.results || []);
    }));
    sec.chapters = chs;
  }));
  return secs;
}

/* ── COURSE PLAYER ───────────────────────────────────────────────────────── */
function LessonContent({ lesson, g }) {
  if (!lesson) return (
    <div className="flex flex-col items-center justify-center h-full" style={{ color: '#94a3b8' }}>
      <Play className="h-16 w-16 mb-4 opacity-20" />
      <p className="text-sm font-bold">Sélectionnez une leçon</p>
    </div>
  );

  const type = lesson.content_type || '';
  const url = lesson.external_embed_url || '';
  const videoFile = lesson.video_file || '';
  const docFile = lesson.document_file || '';

  const getYouTubeId = (u) => {
    const m = u.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/);
    return m ? m[1] : null;
  };

  if (type === 'video' && videoFile) {
    return (
      <div className="flex flex-col h-full">
        <video controls className="w-full rounded-t-xl bg-black" style={{ maxHeight: '70%' }} src={videoFile}>
          Votre navigateur ne supporte pas la vidéo.
        </video>
        <div className="p-5">
          <h2 className="text-lg font-black mb-1" style={{ color: '#1e293b' }}>{lesson.title}</h2>
          {lesson.duration_seconds > 0 && (
            <p className="text-xs" style={{ color: '#94a3b8' }}>
              <Clock className="h-3 w-3 inline mr-1" />{Math.round(lesson.duration_seconds / 60)} min
            </p>
          )}
        </div>
      </div>
    );
  }

  if ((type === 'youtube' || type === 'video') && url) {
    const ytId = getYouTubeId(url);
    const embedUrl = ytId
      ? `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`
      : url.replace('watch?v=', 'embed/');
    return (
      <div className="flex flex-col h-full">
        <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
          <iframe src={embedUrl} className="absolute inset-0 w-full h-full rounded-xl"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen title={lesson.title} />
        </div>
        <div className="p-5">
          <h2 className="text-lg font-black mb-1" style={{ color: '#1e293b' }}>{lesson.title}</h2>
          {lesson.duration_seconds > 0 && (
            <p className="text-xs" style={{ color: '#94a3b8' }}>
              <Clock className="h-3 w-3 inline mr-1" />{Math.round(lesson.duration_seconds / 60)} min
            </p>
          )}
        </div>
      </div>
    );
  }

  if (type === 'audio' && videoFile) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="h-20 w-20 rounded-2xl flex items-center justify-center"
             style={{ background: `${g.from}22` }}>
          <Radio className="h-10 w-10" style={{ color: g.from }} />
        </div>
        <h2 className="text-lg font-black text-center" style={{ color: '#1e293b' }}>{lesson.title}</h2>
        <audio controls className="w-full max-w-md" src={videoFile} />
      </div>
    );
  }

  if (type === 'text' || lesson.text_content) {
    return (
      <div className="p-6 overflow-y-auto h-full">
        <h2 className="text-xl font-black mb-4" style={{ color: '#1e293b' }}>{lesson.title}</h2>
        <div className="prose prose-sm max-w-none" style={{ color: '#374151', lineHeight: 1.8 }}>
          {lesson.text_content || (
            <p style={{ color: '#94a3b8' }}>Le contenu texte de cette leçon sera disponible prochainement.</p>
          )}
        </div>
      </div>
    );
  }

  if (type === 'pdf') {
    return docFile ? (
      <div className="h-full flex flex-col">
        <iframe src={docFile} title={lesson.title} className="flex-1 w-full border-0" />
        <div className="p-4 flex items-center justify-between" style={{ borderTop: '1px solid #334155' }}>
          <h2 className="text-sm font-black" style={{ color: '#fff' }}>{lesson.title}</h2>
          <a href={docFile} target="_blank" rel="noopener noreferrer"
             className="px-4 py-2 rounded-lg text-xs font-bold text-white flex-shrink-0"
             style={{ background: `linear-gradient(135deg,${g.from},${g.to})` }}>
            Ouvrir dans un nouvel onglet
          </a>
        </div>
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="h-20 w-20 rounded-2xl flex items-center justify-center" style={{ background: '#fef2f2' }}>
          <FileText className="h-10 w-10" style={{ color: '#dc2626' }} />
        </div>
        <h2 className="text-lg font-black text-center" style={{ color: '#1e293b' }}>{lesson.title}</h2>
        <p className="text-sm text-center" style={{ color: '#94a3b8' }}>Document PDF non disponible</p>
      </div>
    );
  }

  if (type === 'image' && docFile) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center overflow-auto p-4" style={{ background: '#f8fafc' }}>
          <img src={docFile} alt={lesson.title} className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
        <div className="p-4" style={{ borderTop: '1px solid #f1f5f9' }}>
          <h2 className="text-sm font-black" style={{ color: '#1e293b' }}>{lesson.title}</h2>
        </div>
      </div>
    );
  }

  if ((type === 'ppt' || type === 'word' || type === 'html5') && docFile) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="h-20 w-20 rounded-2xl flex items-center justify-center"
             style={{ background: `${g.from}22` }}>
          <Files className="h-10 w-10" style={{ color: g.from }} />
        </div>
        <h2 className="text-lg font-black text-center" style={{ color: '#1e293b' }}>{lesson.title}</h2>
        <p className="text-sm text-center" style={{ color: '#64748b' }}>
          Document {type === 'ppt' ? 'PowerPoint' : type === 'word' ? 'Word' : 'HTML5'} disponible
        </p>
        <a href={docFile} target="_blank" rel="noopener noreferrer"
           className="px-6 py-3 rounded-xl text-sm font-bold text-white flex items-center gap-2"
           style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}>
          <Files className="h-4 w-4" /> Ouvrir le document
        </a>
      </div>
    );
  }

  if (type === 'iframe' && url) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1">
          <iframe src={url} className="w-full h-full rounded-t-xl border-0" title={lesson.title} />
        </div>
        <div className="p-4" style={{ borderTop: '1px solid #f1f5f9' }}>
          <h2 className="text-sm font-black" style={{ color: '#1e293b' }}>{lesson.title}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
      <div className="h-16 w-16 rounded-2xl flex items-center justify-center"
           style={{ background: `linear-gradient(135deg, ${g.from}22, ${g.to}22)` }}>
        <BookOpen className="h-8 w-8" style={{ color: g.from }} />
      </div>
      <h2 className="text-lg font-black text-center" style={{ color: '#1e293b' }}>{lesson.title}</h2>
      <p className="text-sm text-center" style={{ color: '#64748b' }}>
        Contenu de type <strong>{type || 'non défini'}</strong> — disponible prochainement
      </p>
    </div>
  );
}

// Strip "CONTENU — " or "CONTENT — " prefix and compare to section title
function chapterLabel(chTitle, secTitle) {
  const cleaned = (chTitle || '').replace(/^(contenu|content)\s*[—–-]+\s*/i, '').trim();
  if (!cleaned) return null;
  if (cleaned.toLowerCase() === (secTitle || '').toLowerCase()) return null;
  return cleaned;
}

function CoursePlayerView({ course, idx, sections, completedIds: initCompleted, onCompletedChange, onBack, onEvaluate }) {
  const g = COURSE_GRADIENTS[idx % COURSE_GRADIENTS.length];

  const allChapters = sections.flatMap((sec, si) =>
    (sec.chapters || []).map(ch => ({ ...ch, sectionIdx: si, sectionTitle: sec.title }))
  ).map((ch, chi) => ({ ...ch, chapterIdx: chi }));
  const allLessons = allChapters.flatMap((ch, chi) =>
    (ch.lessons || []).map(l => ({ ...l, chapterIdx: chi }))
  );

  const [currentIdx, setCurrentIdx] = useState(0);
  const [completedIds, setCompletedIds] = useState(initCompleted || new Set());
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Sync si initCompleted change (ex: chargement tardif depuis le parent)
  useEffect(() => {
    if (initCompleted && initCompleted.size > 0) setCompletedIds(initCompleted);
  }, [initCompleted]);

  const currentLesson = allLessons[currentIdx] || null;
  const progress = allLessons.length > 0 ? Math.min(100, Math.round((completedIds.size / allLessons.length) * 100)) : 0;
  const isCurrentDone = currentLesson ? completedIds.has(String(currentLesson.id)) : false;

  const isChapterUnlocked = (chi) => {
    if (chi === 0) return true;
    const prevCh = allChapters[chi - 1];
    return (prevCh?.lessons || []).every(l => completedIds.has(String(l.id)));
  };

  const isLessonUnlocked = (l) => isChapterUnlocked(l.chapterIdx);

  const handleMarkDone = () => {
    if (!currentLesson) return;
    const newDone = new Set([...completedIds, String(currentLesson.id)]);
    setCompletedIds(newDone);
    if (onCompletedChange) onCompletedChange(newDone);
    elearningService.markCourseLessonComplete(currentLesson.id).catch(() => {});
    // Show completion modal on last lesson; otherwise stay on current and let user click Suivant
    if (currentIdx === allLessons.length - 1) {
      setShowCompletionModal(true);
    }
  };

  const handleLessonClick = (gIdx, l) => {
    if (!isLessonUnlocked(l)) return;
    setCurrentIdx(gIdx);
  };

  return (
    <div className="flex flex-col" style={{ height: '100vh', background: '#f8fafc' }}>
      {/* Completion modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
             style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-8 text-center max-w-sm w-full mx-4"
               style={{ background: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div className="h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4"
                 style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}>
              <Trophy className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-xl font-black mb-2" style={{ color: '#1e293b' }}>Félicitations !</h2>
            <p className="text-sm mb-1 font-bold" style={{ color: '#374151' }}>{course.title}</p>
            <p className="text-sm mb-6" style={{ color: '#64748b' }}>
              Vous avez terminé ce cours avec succès. Passez maintenant à l'évaluation ou revenez au programme.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={onEvaluate}
                      className="w-full py-3 rounded-xl text-sm font-black text-white"
                      style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}>
                Passer l'évaluation
              </button>
              <button onClick={() => setShowCompletionModal(false)}
                      className="w-full py-3 rounded-xl text-sm font-bold"
                      style={{ background: '#f1f5f9', color: '#374151' }}>
                Retour au cours
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar — LMSPro style: lesson title left, Suivant right */}
      <div className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0"
           style={{ background: 'white', borderBottom: '1px solid #f1f5f9', minHeight: 52 }}>
        <button onClick={onBack}
                className="flex items-center gap-1 text-xs font-semibold flex-shrink-0 hover:opacity-70"
                style={{ color: '#64748b' }}>
          <ChevronLeft className="h-3.5 w-3.5" /> Retour au cours
        </button>
        <div className="flex-1 min-w-0 hidden sm:block px-2">
          <p className="text-sm font-bold truncate" style={{ color: '#1e293b' }}>
            {currentLesson?.title || course.title}
          </p>
          <p className="text-xs truncate" style={{ color: '#94a3b8' }}>{course.title}</p>
        </div>
        {/* Suivant — always visible in top bar */}
        <button
          onClick={() => {
            const next = allLessons[currentIdx + 1];
            if (next && isLessonUnlocked(next)) setCurrentIdx(currentIdx + 1);
          }}
          disabled={currentIdx >= allLessons.length - 1 || !isLessonUnlocked(allLessons[currentIdx + 1])}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-30 flex-shrink-0"
          style={{ background: `linear-gradient(135deg,${g.from},${g.to})` }}>
          Suivant <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar — flat like LMSPro, no accordion, always shows all */}
        <div className="w-72 flex-shrink-0 flex flex-col overflow-hidden"
             style={{ background: 'white', borderRight: '1px solid #f1f5f9' }}>
          {/* Course header in sidebar */}
          <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <p className="text-xs font-bold mb-2 line-clamp-2" style={{ color: '#1e293b' }}>{course.title}</p>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs" style={{ color: '#64748b' }}>{progress}% complété</span>
              <span className="text-xs" style={{ color: '#64748b' }}>
                {allLessons.filter(l => completedIds.has(String(l.id))).length}/{allLessons.length} leçons
              </span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
              <div className="h-full rounded-full transition-all duration-500"
                   style={{ width: `${progress}%`, background: `linear-gradient(90deg,${g.from},${g.to})` }} />
            </div>
          </div>

          {/* Flat lesson list — all sections/chapters/lessons always visible */}
          <div className="flex-1 overflow-y-auto">
            {sections.map((sec, si) => {
              const secChapters = allChapters.filter(ch => ch.sectionIdx === si);
              const secFirstChIdx = allChapters.findIndex(ch => ch.sectionIdx === si);
              const secUnlocked = isChapterUnlocked(secFirstChIdx < 0 ? 0 : secFirstChIdx);

              return (
                <div key={sec.id}>
                  {/* Section — uppercase divider (not clickable) */}
                  <div className="flex items-center gap-1.5 px-4 pt-4 pb-1.5">
                    {!secUnlocked && <Lock className="h-2.5 w-2.5 flex-shrink-0" style={{ color: '#cbd5e1' }} />}
                    <span className="text-xs font-black uppercase tracking-widest"
                          style={{ color: secUnlocked ? '#94a3b8' : '#cbd5e1' }}>
                      {sec.title}
                    </span>
                  </div>

                  {secChapters.map(ch => {
                    const chUnlocked = isChapterUnlocked(ch.chapterIdx);
                    const label = chapterLabel(ch.title, sec.title);
                    return (
                      <div key={ch.id}>
                        {/* Chapter sub-header */}
                        {label && (
                          <div className="flex items-center gap-1.5 px-4 py-1">
                            {!chUnlocked && <Lock className="h-2.5 w-2.5 flex-shrink-0" style={{ color: '#94a3b8' }} />}
                            <span className="text-xs font-semibold"
                                  style={{ color: chUnlocked ? '#475569' : '#94a3b8' }}>
                              {label}
                            </span>
                          </div>
                        )}
                        {/* Lessons */}
                        {(ch.lessons || []).map(l => {
                          const gIdx = allLessons.findIndex(x => x.id === l.id);
                          const isCurrent = gIdx === currentIdx;
                          const isDone = completedIds.has(String(l.id));
                          const isLocked = !chUnlocked;
                          return (
                            <button key={l.id}
                                    onClick={() => !isLocked && handleLessonClick(gIdx, allLessons[gIdx] || l)}
                                    disabled={isLocked}
                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-slate-50"
                                    style={{
                                      background: isCurrent ? P_LIGHT : 'transparent',
                                      cursor: isLocked ? 'default' : 'pointer',
                                    }}>
                              {/* Status icon */}
                              <div className="flex-shrink-0 w-5 flex items-center justify-center">
                                {isCurrent
                                  ? <div className="h-5 w-5 rounded-full flex items-center justify-center"
                                         style={{ background: P }}>
                                      <Play className="h-2.5 w-2.5 text-white ml-0.5" />
                                    </div>
                                  : isDone
                                    ? <CheckCircle className="h-4 w-4" style={{ color: '#059669' }} />
                                    : isLocked
                                      ? <Lock className="h-3.5 w-3.5" style={{ color: '#cbd5e1' }} />
                                      : <Play className="h-3.5 w-3.5" style={{ color: '#94a3b8' }} />
                                }
                              </div>
                              {/* Lesson text */}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate"
                                   style={{ color: isCurrent ? P : isDone ? '#1e293b' : isLocked ? '#94a3b8' : '#374151' }}>
                                  {l.title}
                                </p>
                              </div>
                              {l.duration_seconds > 0 && (
                                <span className="text-xs tabular-nums flex-shrink-0" style={{ color: '#94a3b8' }}>
                                  {Math.round(l.duration_seconds / 60)}m
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0f172a' }}>
          <div className="flex-1 overflow-auto">
            <LessonContent lesson={currentLesson} g={g} />
          </div>

          {/* Bottom bar — Précédent + lesson info + Marquer comme terminé (always visible) */}
          <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
               style={{ background: '#1e293b', borderTop: '1px solid #334155' }}>
            <button onClick={() => currentIdx > 0 && setCurrentIdx(i => i - 1)}
                    disabled={currentIdx === 0}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-30"
                    style={{ background: '#334155', color: '#94a3b8' }}>
              <ChevronLeft className="h-3.5 w-3.5" /> Précédent
            </button>

            <p className="text-xs flex-1 text-center truncate" style={{ color: '#64748b' }}>
              Leçon {currentIdx + 1}/{allLessons.length} · {currentLesson?.title || ''}
            </p>

            {isCurrentDone ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold flex-shrink-0"
                   style={{ background: '#052e16', color: '#059669' }}>
                <CheckCircle className="h-4 w-4" /> Terminée
              </div>
            ) : (
              <button onClick={handleMarkDone}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white flex-shrink-0 hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>
                <CheckCircle className="h-4 w-4" /> Marquer comme terminé
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── COURSE DETAIL VIEW ──────────────────────────────────────────────────── */
function CourseDetailView({ course, idx, onBack, onNav }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState(new Set([0]));
  const [playing, setPlaying] = useState(false);
  const [completedIds, setCompletedIds] = useState(new Set());
  const g = COURSE_GRADIENTS[idx % COURSE_GRADIENTS.length];
  const navigate = useNavigate();

  const handleEvaluate = useCallback(async () => {
    setPlaying(false);
    try {
      const res = await elearningService.findCourseQuiz(course.id);
      if (res?.id) {
        navigate(`/student/quiz/${res.id}`);
      } else {
        if (onNav) onNav('evaluations');
      }
    } catch {
      if (onNav) onNav('evaluations');
    }
  }, [course.id, navigate, onNav]);

  useEffect(() => {
    Promise.all([
      loadCourseContent(course.id),
      elearningService.getMyCompletedCourseLessons().catch(() => []),
    ]).then(([s, ids]) => {
      setSections(s);
      // Filter to only IDs belonging to THIS course's lessons
      const courseLessonIds = new Set(
        s.flatMap(sec => (sec.chapters || []).flatMap(ch => (ch.lessons || []).map(l => String(l.id))))
      );
      setCompletedIds(new Set(ids.map(String).filter(id => courseLessonIds.has(id))));
    }).finally(() => setLoading(false));
  }, [course.id]);

  const allLessons = sections.flatMap(sec =>
    (sec.chapters || []).flatMap(ch => ch.lessons || [])
  );
  const totalMinutes = Math.round(
    allLessons.reduce((s, l) => s + (l.duration_seconds || 0), 0) / 60
  );
  const totalHours = totalMinutes >= 60
    ? `${Math.floor(totalMinutes / 60)}h${totalMinutes % 60 > 0 ? (totalMinutes % 60) + 'min' : ''}`
    : `${totalMinutes} min`;
  const progressPct = allLessons.length > 0
    ? Math.min(100, Math.round((completedIds.size / allLessons.length) * 100)) : 0;
  const hasProgress = completedIds.size > 0;

  const toggleSectionAcc = (si) => {
    setOpenSections(prev => {
      const n = new Set(prev);
      n.has(si) ? n.delete(si) : n.add(si);
      return n;
    });
  };

  const LEVEL_LABEL = {
    beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé', all_levels: 'Tous niveaux',
    BEGINNER: 'Débutant', INTERMEDIATE: 'Intermédiaire', ADVANCED: 'Avancé', ALL: 'Tous niveaux',
  };

  if (playing) {
    return (
      <CoursePlayerView
        course={course}
        idx={idx}
        sections={sections}
        completedIds={completedIds}
        onCompletedChange={setCompletedIds}
        onBack={() => setPlaying(false)}
        onEvaluate={handleEvaluate}
      />
    );
  }

  return (
    <div style={{ background: '#f8fafc', minHeight: '100%' }}>
      {/* Hero banner */}
      <div className="relative" style={{ background: `linear-gradient(135deg, ${g.from} 0%, ${g.to} 100%)` }}>
        <div className="absolute inset-0 overflow-hidden opacity-30">
          <CourseThumbnail course={course} idx={idx} height="h-full" />
        </div>
        <div className="relative z-10 px-6 py-8 max-w-5xl mx-auto">
          <button onClick={onBack}
                  className="flex items-center gap-1.5 text-sm font-semibold mb-5"
                  style={{ color: 'rgba(255,255,255,0.85)' }}>
            <ChevronLeft className="h-4 w-4" /> Retour aux cours
          </button>
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {course.level && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                  {LEVEL_LABEL[course.level] || course.level}
                </span>
              )}
              {course.certificate_enabled && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{ background: 'rgba(255,215,0,0.25)', color: '#fde68a' }}>
                  Certification
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-white mb-2 leading-tight">{course.title}</h1>
            {course.subtitle && (
              <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.82)' }}>{course.subtitle}</p>
            )}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              {course.instructor_name && (
                <span className="flex items-center gap-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  <User className="h-3.5 w-3.5" /> {course.instructor_name}
                </span>
              )}
              {course.average_rating > 0 && (
                <span className="text-sm font-bold" style={{ color: '#fde68a' }}>
                  {parseFloat(course.average_rating).toFixed(1)} / 5
                </span>
              )}
              {course.total_students > 0 && (
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {course.total_students} étudiants
                </span>
              )}
            </div>
            {hasProgress ? (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-white">Votre progression</span>
                  <span className="text-xs font-black" style={{ color: '#fde68a' }}>{progressPct}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden mb-4" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: '#fde68a' }} />
                </div>
                <button onClick={() => setPlaying(true)}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black text-white"
                        style={{ background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.35)' }}>
                  <Play className="h-4 w-4" /> Continuer l'apprentissage · {progressPct}%
                </button>
              </div>
            ) : (
              <button onClick={() => setPlaying(true)}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black"
                      style={{ background: 'white', color: g.from }}>
                <Play className="h-4 w-4" /> Commencer le cours
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {course.description && (
              <div className="rounded-2xl p-6" style={{ background: 'white', boxShadow: '0 1px 6px #0001' }}>
                <h2 className="text-base font-black mb-3" style={{ color: '#1e293b' }}>À propos de ce cours</h2>
                <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>{course.description}</p>
              </div>
            )}

            {course.what_you_will_learn?.length > 0 && (
              <div className="rounded-2xl p-6" style={{ background: 'white', boxShadow: '0 1px 6px #0001' }}>
                <h2 className="text-base font-black mb-4" style={{ color: '#1e293b' }}>Ce que vous apprendrez</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {course.what_you_will_learn.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#059669' }} />
                      <span className="text-sm" style={{ color: '#374151' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Programme */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-black" style={{ color: '#1e293b' }}>Programme du cours</h2>
                {!loading && sections.length > 0 && (
                  <span className="text-xs font-semibold" style={{ color: '#94a3b8' }}>
                    {sections.length} section{sections.length > 1 ? 's' : ''} · {allLessons.length} leçon{allLessons.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {loading ? <Spinner /> : sections.length === 0 ? (
                <div className="rounded-2xl p-8 text-center" style={{ background: 'white', boxShadow: '0 1px 6px #0001' }}>
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-20" style={{ color: P }} />
                  <p className="text-sm font-bold" style={{ color: '#64748b' }}>Programme en cours de préparation</p>
                  <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Le contenu sera disponible prochainement</p>
                </div>
              ) : (() => {
                // Build flat chapter list for unlock logic (same as player)
                const detailAllChapters = sections.flatMap(sec => sec.chapters || []);
                const isDetailChUnlocked = (chi) => {
                  if (chi === 0) return true;
                  return (detailAllChapters[chi - 1]?.lessons || []).every(l => completedIds.has(String(l.id)));
                };

                return (
                  <div className="space-y-2">
                    {sections.map((sec, si) => {
                      const secLessons = (sec.chapters || []).flatMap(ch => ch.lessons || []);
                      const secDuration = Math.round(secLessons.reduce((s, l) => s + (l.duration_seconds || 0), 0) / 60);
                      const secDone = secLessons.filter(l => completedIds.has(String(l.id))).length;
                      const isOpen = openSections.has(si);
                      const secChOffset = sections.slice(0, si).reduce((acc, s) => acc + (s.chapters || []).length, 0);
                      const secFirstChUnlocked = isDetailChUnlocked(secChOffset);

                      return (
                        <div key={sec.id} className="rounded-xl overflow-hidden"
                             style={{ background: 'white', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px #0001' }}>
                          {/* Section header */}
                          <button onClick={() => toggleSectionAcc(si)}
                                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50">
                            <div className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                                 style={{
                                   background: secFirstChUnlocked ? `linear-gradient(135deg,${g.from},${g.to})` : '#e2e8f0',
                                   color: secFirstChUnlocked ? 'white' : '#94a3b8',
                                 }}>
                              {secFirstChUnlocked ? si + 1 : <Lock className="h-3 w-3" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate"
                                 style={{ color: secFirstChUnlocked ? '#1e293b' : '#94a3b8' }}>{sec.title}</p>
                              <p className="text-xs" style={{ color: '#94a3b8' }}>
                                {secLessons.length} leçon{secLessons.length > 1 ? 's' : ''}
                                {secDuration > 0 && ` · ${secDuration} min`}
                              </p>
                            </div>
                            {secDone > 0 && secFirstChUnlocked && (
                              <span className="text-xs font-bold flex-shrink-0" style={{ color: '#059669' }}>
                                {secDone}/{secLessons.length}
                              </span>
                            )}
                            {secFirstChUnlocked && (
                              <ChevronRight className="h-4 w-4 flex-shrink-0 transition-transform"
                                            style={{ color: '#94a3b8', transform: isOpen ? 'rotate(90deg)' : 'none' }} />
                            )}
                          </button>

                          {/* Chapters + Lessons */}
                          {isOpen && secFirstChUnlocked && (sec.chapters || []).map((ch, ci) => {
                            const globalChIdx = secChOffset + ci;
                            const chUnlocked = isDetailChUnlocked(globalChIdx);

                            return (
                              <div key={ch.id}>
                                {/* Chapter sub-header — hidden when redundant with section */}
                                {chapterLabel(ch.title, sec.title) && (
                                  <div className="flex items-center gap-2 px-4 py-2"
                                       style={{ background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                                    {!chUnlocked && <Lock className="h-3 w-3 flex-shrink-0" style={{ color: '#94a3b8' }} />}
                                    <span className="text-xs font-semibold"
                                          style={{ color: chUnlocked ? '#64748b' : '#94a3b8' }}>
                                      {chapterLabel(ch.title, sec.title)}
                                    </span>
                                  </div>
                                )}
                                {/* Lessons */}
                                {(ch.lessons || []).map((l) => {
                                  const isDone = completedIds.has(String(l.id));
                                  const isLocked = !chUnlocked;
                                  const lessonNum = allLessons.findIndex(x => x.id === l.id) + 1;
                                  return (
                                    <div key={l.id} className="flex items-center gap-3 px-4 py-3"
                                         style={{ borderTop: '1px solid #f8fafc', opacity: isLocked ? 0.6 : 1 }}>
                                      <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0"
                                           style={{
                                             background: isLocked ? '#f1f5f9' : isDone ? '#dcfce7' : '#f8fafc',
                                             border: `1.5px solid ${isLocked ? '#e2e8f0' : isDone ? '#86efac' : '#e2e8f0'}`,
                                           }}>
                                        {isLocked
                                          ? <Lock className="h-3 w-3" style={{ color: '#cbd5e1' }} />
                                          : isDone
                                            ? <CheckCircle className="h-4 w-4" style={{ color: '#059669' }} />
                                            : <span className="text-xs font-bold" style={{ color: '#94a3b8' }}>{lessonNum}</span>
                                        }
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate"
                                           style={{ color: isLocked ? '#94a3b8' : isDone ? '#374151' : '#1e293b' }}>
                                          {l.title}
                                        </p>
                                        {l.content_type && (
                                          <p className="text-xs capitalize" style={{ color: '#cbd5e1' }}>{l.content_type}</p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        {!isLocked && l.is_preview_free && (
                                          <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                                                style={{ background: '#f0fdf4', color: '#059669' }}>Aperçu</span>
                                        )}
                                        {l.duration_seconds > 0 && (
                                          <span className="text-xs tabular-nums" style={{ color: '#94a3b8' }}>
                                            {Math.round(l.duration_seconds / 60)} min
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Start card */}
            <div className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
              <div className="h-36 relative">
                <CourseThumbnail course={course} idx={idx} height="h-36" overlay />
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="h-12 w-12 rounded-full flex items-center justify-center"
                       style={{ background: 'rgba(255,255,255,0.9)' }}>
                    <Play className="h-5 w-5 ml-0.5" style={{ color: g.from }} />
                  </div>
                </div>
              </div>
              <div className="p-5" style={{ background: 'white' }}>
                {hasProgress && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold" style={{ color: '#64748b' }}>Progression</span>
                      <span className="font-black" style={{ color: P }}>{progressPct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
                      <div className="h-full rounded-full" style={{ width: `${progressPct}%`, background: P }} />
                    </div>
                  </div>
                )}
                <button onClick={() => setPlaying(true)}
                        className="w-full py-3 rounded-xl text-sm font-black text-white hover:opacity-90 flex items-center justify-center gap-2"
                        style={{ background: `linear-gradient(135deg,${g.from},${g.to})` }}>
                  <Play className="h-4 w-4" />
                  {hasProgress ? `Continuer · ${progressPct}%` : 'Commencer le cours'}
                </button>
              </div>
            </div>

            {/* Ce cours inclut */}
            <div className="rounded-2xl p-5" style={{ background: 'white', boxShadow: '0 1px 6px #0001' }}>
              <h3 className="text-sm font-black mb-4" style={{ color: '#1e293b' }}>Ce cours inclut</h3>
              <div className="space-y-3">
                {totalMinutes > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: P_LIGHT }}>
                      <Clock className="h-4 w-4" style={{ color: P }} />
                    </div>
                    <div>
                      <p className="text-xs font-black" style={{ color: '#1e293b' }}>{totalHours} de contenu</p>
                      <p className="text-xs" style={{ color: '#94a3b8' }}>Accès à vie</p>
                    </div>
                  </div>
                )}
                {allLessons.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: P_LIGHT }}>
                      <BookOpen className="h-4 w-4" style={{ color: P }} />
                    </div>
                    <div>
                      <p className="text-xs font-black" style={{ color: '#1e293b' }}>{allLessons.length} leçons</p>
                      <p className="text-xs" style={{ color: '#94a3b8' }}>{sections.length} section{sections.length > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                )}
                {course.level && (
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: P_LIGHT }}>
                      <BarChart2 className="h-4 w-4" style={{ color: P }} />
                    </div>
                    <div>
                      <p className="text-xs font-black" style={{ color: '#1e293b' }}>{LEVEL_LABEL[course.level] || course.level}</p>
                      <p className="text-xs" style={{ color: '#94a3b8' }}>Niveau</p>
                    </div>
                  </div>
                )}
                {course.language && (
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: P_LIGHT }}>
                      <Globe className="h-4 w-4" style={{ color: P }} />
                    </div>
                    <div>
                      <p className="text-xs font-black" style={{ color: '#1e293b' }}>{course.language}</p>
                      <p className="text-xs" style={{ color: '#94a3b8' }}>Langue</p>
                    </div>
                  </div>
                )}
                {course.certificate_enabled && (
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fef3c7' }}>
                      <Trophy className="h-4 w-4" style={{ color: '#d97706' }} />
                    </div>
                    <div>
                      <p className="text-xs font-black" style={{ color: '#1e293b' }}>Certificat</p>
                      <p className="text-xs" style={{ color: '#94a3b8' }}>À la fin du cours</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {course.requirements?.length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: 'white', boxShadow: '0 1px 6px #0001' }}>
                <h3 className="text-sm font-black mb-3" style={{ color: '#1e293b' }}>Prérequis</h3>
                <ul className="space-y-2">
                  {course.requirements.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs" style={{ color: '#475569' }}>
                      <span className="font-black mt-0.5 flex-shrink-0" style={{ color: P }}>→</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── COURSES CATALOG ─────────────────────────────────────────────────────── */
function CourseCard({ course, idx, onSelect }) {
  const g = COURSE_GRADIENTS[idx % COURSE_GRADIENTS.length];
  return (
    <div className="rounded-2xl overflow-hidden flex flex-col cursor-pointer group"
         style={{ background: 'white', boxShadow: '0 1px 8px #0001', transition: 'box-shadow .2s' }}
         onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 24px rgba(219,39,119,0.12)'}
         onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 8px #0001'}
         onClick={() => onSelect(course, idx)}>
      <div className="h-40 relative overflow-hidden">
        <CourseThumbnail course={course} idx={idx} height="h-40" />
        {course.level && (
          <div className="absolute top-3 left-3 z-10"><LevelBadge level={course.level} /></div>
        )}
        {course.certificate_enabled && (
          <div className="absolute top-3 right-3 z-10 px-2 py-0.5 rounded-full text-xs font-bold"
               style={{ background: 'rgba(255,255,255,0.9)', color: '#d97706' }}>🏆</div>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
             style={{ background: 'rgba(0,0,0,0.25)' }}>
          <div className="h-12 w-12 rounded-full flex items-center justify-center"
               style={{ background: 'white' }}>
            <Play className="h-5 w-5 ml-0.5" style={{ color: g.from }} />
          </div>
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1 gap-1.5">
        {course.subject_name && (
          <p className="text-xs font-bold" style={{ color: P }}>{course.subject_name}</p>
        )}
        <h3 className="text-sm font-black leading-tight" style={{ color: '#1e293b' }}>{course.title}</h3>
        {course.description && (
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: '#64748b' }}>
            {course.description}
          </p>
        )}
        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {course.total_students > 0 && (
              <span className="text-xs" style={{ color: '#94a3b8' }}>👥 {course.total_students}</span>
            )}
            {course.average_rating > 0 && (
              <span className="text-xs font-semibold" style={{ color: '#d97706' }}>
                ⭐ {parseFloat(course.average_rating).toFixed(1)}
              </span>
            )}
          </div>
          <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-white flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
                  onClick={e => { e.stopPropagation(); onSelect(course, idx); }}>
            Accéder
          </button>
        </div>
      </div>
    </div>
  );
}

function CourseCatalogView({ onSelectCourse }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const p = { page_size: 100 };
      if (levelFilter) p.level = levelFilter;
      const res = await elearningService.getCourses(p);
      setCourses(Array.isArray(res) ? res : res?.results || []);
    } catch { setCourses([]); }
    finally { setLoading(false); }
  }, [levelFilter]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const filtered = useMemo(() => {
    if (!search) return courses;
    const q = search.toLowerCase();
    return courses.filter(c =>
      c.title?.toLowerCase().includes(q) ||
      c.subject_name?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    );
  }, [courses, search]);

  const beginnerCount = courses.filter(c => ['beginner', 'BEGINNER'].includes(c.level)).length;

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#1e293b' }}>Cours</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>{filtered.length} cours disponibles</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl text-sm font-semibold outline-none"
                  style={{ background: 'white', boxShadow: '0 1px 4px #0001', color: '#374151', border: 'none' }}>
            <option value="">Tous les niveaux</option>
            <option value="beginner">Débutant</option>
            <option value="intermediate">Intermédiaire</option>
            <option value="advanced">Avancé</option>
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#94a3b8' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
                   placeholder="Rechercher…"
                   className="pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
                   style={{ background: 'white', boxShadow: '0 1px 4px #0001', border: 'none', width: 200 }} />
          </div>
          <div className="flex rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 4px #0001' }}>
            {[['grid', Grid], ['list', List]].map(([m, Icon]) => (
              <button key={m} onClick={() => setViewMode(m)} className="px-3 py-2"
                      style={{ background: viewMode === m ? P : 'white', color: viewMode === m ? 'white' : '#64748b' }}>
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard icon={BookOpen}    value={courses.length}  label="Disponibles"      color="#6366f1" bg="#eef2ff" />
        <StatCard icon={GraduationCap} value={beginnerCount} label="Débutant"         color="#059669" bg="#f0fdf4" />
        <StatCard icon={Award} value={courses.filter(c => c.certificate_enabled).length} label="Avec certification" color="#d97706" bg="#fffbeb" />
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <Empty icon={BookOpen} text="Aucun cours" sub="Revenez plus tard" />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c, i) => (
            <CourseCard key={c.id} course={c} idx={i} onSelect={onSelectCourse} />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((c, i) => {
            const g = COURSE_GRADIENTS[i % COURSE_GRADIENTS.length];
            return (
              <div key={c.id} className="p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
                   style={{ background: 'white', boxShadow: '0 1px 4px #0001' }}
                   onClick={() => onSelectCourse(c, i)}>
                <div className="h-12 w-12 rounded-xl overflow-hidden flex-shrink-0">
                  <CourseThumbnail course={c} idx={i} height="h-12" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: '#1e293b' }}>{c.title}</p>
                  <p className="text-xs" style={{ color: '#64748b' }}>{c.subject_name || c.language || '—'}</p>
                </div>
                <LevelBadge level={c.level} />
                <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-white flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
                        onClick={e => { e.stopPropagation(); onSelectCourse(c, i); }}>
                  Accéder
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── MY LEARNING ─────────────────────────────────────────────────────────── */
function MyLearningView({ enrollments }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    elearningService.getCourses({ page_size: 100 })
      .then(res => setCourses(Array.isArray(res) ? res : res?.results || []))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? courses
    : filter === 'in-progress' ? courses.filter(c => c.progress > 0 && c.progress < 100)
    : courses.filter(c => c.progress >= 100);

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black" style={{ color: '#1e293b' }}>Mon apprentissage</h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>Suivez votre progression</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard icon={BookOpen}     value={courses.length}                              label="Cours suivis"   color="#6366f1" bg="#eef2ff" />
        <StatCard icon={RefreshCw}    value={courses.filter(c => (c.progress||0) > 0 && (c.progress||0) < 100).length} label="En cours" color="#d97706" bg="#fffbeb" />
        <StatCard icon={CheckCircle}  value={courses.filter(c => (c.progress||0) >= 100).length} label="Complétés"     color="#059669" bg="#f0fdf4" />
      </div>

      <div className="flex gap-2 mb-6">
        {[['all','Tous'],['in-progress','En cours'],['completed','Complétés']].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)}
                  className="px-4 py-2 rounded-xl text-sm font-bold"
                  style={filter === k ? { background: P, color: 'white' } : { background: 'white', color: '#64748b', boxShadow: '0 1px 4px #0001' }}>
            {l}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <Empty icon={BookOpen} text="Aucun cours" />
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const pct = Math.min(100, Math.max(0, c.progress || 0));
            return (
              <div key={c.id} className="p-5 rounded-2xl"
                   style={{ background: 'white', boxShadow: '0 1px 6px #0001' }}>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
                       style={{ background: P_LIGHT }}>
                    <BookOpen className="h-6 w-6" style={{ color: P }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-black truncate" style={{ color: '#1e293b' }}>{c.title}</p>
                      <span className="text-xs font-bold flex-shrink-0" style={{ color: P }}>{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: P_LIGHT }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: P }} />
                    </div>
                    <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                      {c.subject_name || '—'}
                      {c.lessons_count ? ` · ${c.lessons_count} leçons` : ''}
                    </p>
                  </div>
                  <LevelBadge level={c.level} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── VIRTUAL CLASS DETAIL + CHAT ─────────────────────────────────────────── */
function VirtualClassDetailView({ classroom, student, onBack }) {
  const st = classStatus(classroom);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef(null);
  const senderName = student?.user?.full_name || '';

  const stStyle = st === 'live'
    ? { color: '#dc2626', bg: '#fef2f2', label: 'En direct', dot: true }
    : st === 'upcoming'
    ? { color: '#059669', bg: '#f0fdf4', label: 'À venir' }
    : { color: '#64748b', bg: '#f1f5f9', label: 'Terminée' };

  const fetchMessages = useCallback(() => {
    elearningService.getClassroomChat(classroom.id)
      .then(res => setMessages(Array.isArray(res) ? res : res?.results || []))
      .catch(() => {});
  }, [classroom.id]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const txt = newMsg.trim();
    if (!txt || sending) return;
    setSending(true);
    try {
      await elearningService.sendClassroomChat(classroom.id, txt);
      setNewMsg('');
      fetchMessages();
    } catch (e) {} finally { setSending(false); }
  };

  return (
    <div className="p-6 max-w-6xl" style={{ minHeight: '100%' }}>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold mb-5" style={{ color: P }}>
        <ChevronLeft className="h-4 w-4" /> Retour aux classes virtuelles
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: session info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl p-6" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3"
                      style={{ background: stStyle.bg, color: stStyle.color }}>
                  {stStyle.dot && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />}
                  {stStyle.label}
                </span>
                <h1 className="text-xl font-black mb-1" style={{ color: '#1e293b' }}>{classroom.title}</h1>
                {classroom.description && (
                  <p className="text-sm" style={{ color: '#64748b' }}>{classroom.description}</p>
                )}
              </div>
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                   style={{ background: stStyle.bg }}>
                <Video className="h-6 w-6" style={{ color: stStyle.color }} />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4" style={{ borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <p className="text-xs font-bold mb-0.5" style={{ color: '#94a3b8' }}>Date & heure</p>
                <p className="text-sm font-black" style={{ color: '#1e293b' }}>{fmtDT(classroom.start_time)}</p>
              </div>
              <div>
                <p className="text-xs font-bold mb-0.5" style={{ color: '#94a3b8' }}>Durée</p>
                <p className="text-sm font-black" style={{ color: '#1e293b' }}>{classroom.duration_minutes || 60} min</p>
              </div>
              {classroom.instructor_name && (
                <div>
                  <p className="text-xs font-bold mb-0.5" style={{ color: '#94a3b8' }}>Enseignant</p>
                  <p className="text-sm font-black" style={{ color: '#1e293b' }}>{classroom.instructor_name}</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mt-4">
              {st === 'live' && (classroom.provider === 'JITSI' ? (classroom.jitsi_url || classroom.join_url) : classroom.join_url) && (
                <a href={classroom.provider === 'JITSI' ? (classroom.jitsi_url || classroom.join_url) : classroom.join_url}
                   target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black text-white"
                   style={{ background: classroom.provider === 'MEET' ? '#1a73e8' : '#dc2626' }}>
                  <Video className="h-4 w-4" />
                  {classroom.provider === 'MEET' ? 'Rejoindre Google Meet' : 'Rejoindre la session'}
                </a>
              )}
              {st === 'upcoming' && (
                <div className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold"
                     style={{ background: '#f0fdf4', color: '#059669' }}>
                  <Clock className="h-4 w-4" /> La session commence bientôt
                </div>
              )}
              {st === 'ended' && classroom.recording_url && (
                <a href={classroom.recording_url} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black"
                   style={{ background: '#f1f5f9', color: '#374151' }}>
                  <Play className="h-4 w-4" /> Voir l'enregistrement
                </a>
              )}
              {st === 'ended' && !classroom.recording_url && (
                <div className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm" style={{ background: '#f8fafc', color: '#94a3b8' }}>
                  Enregistrement non disponible
                </div>
              )}
            </div>
          </div>

          {/* Participants */}
          {classroom.students_count > 0 && (
            <div className="rounded-2xl p-5" style={{ background: 'white', boxShadow: '0 1px 6px #0001' }}>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" style={{ color: P }} />
                <span className="text-sm font-black" style={{ color: '#1e293b' }}>
                  {classroom.students_count} participant{classroom.students_count > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}

          {/* Sessions multi-segments */}
          <VirtualClassSessions classroom={classroom} isAdmin={false} />
        </div>

        {/* Chat panel */}
        <div className="flex flex-col rounded-2xl overflow-hidden"
             style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', height: '480px' }}>
          {/* Chat header */}
          <div className="px-4 py-3 flex items-center gap-2 flex-shrink-0"
               style={{ background: P_LIGHT, borderBottom: '1px solid #fce7f3' }}>
            <MessageSquare className="h-4 w-4" style={{ color: P }} />
            <span className="text-sm font-black" style={{ color: P }}>Chat en direct</span>
            <div className="ml-auto flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#059669' }} />
              <span className="text-xs font-semibold" style={{ color: '#059669' }}>Auto</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <MessageSquare className="h-8 w-8 mb-2 opacity-20" style={{ color: P }} />
                <p className="text-xs font-bold" style={{ color: '#94a3b8' }}>Aucun message</p>
                <p className="text-xs mt-0.5" style={{ color: '#cbd5e1' }}>Démarrez la conversation</p>
              </div>
            ) : messages.map((msg, i) => {
              const isMe = senderName && (msg.sender_name === senderName || msg.is_mine);
              const initial = (msg.sender_name || msg.sender || '?')[0]?.toUpperCase() || '?';
              return (
                <div key={msg.id || i} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                       style={{ background: isMe ? P : '#6366f1' }}>
                    {initial}
                  </div>
                  <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && (
                      <p className="text-xs font-bold" style={{ color: '#64748b' }}>
                        {msg.sender_name || msg.sender}
                      </p>
                    )}
                    <div className="px-3 py-2 rounded-2xl text-sm leading-snug"
                         style={{ background: isMe ? P : '#f1f5f9', color: isMe ? 'white' : '#374151' }}>
                      {msg.message || msg.content || msg.text}
                    </div>
                    {msg.created_at && (
                      <p className="text-xs" style={{ color: '#cbd5e1' }}>
                        {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Send */}
          <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid #f1f5f9' }}>
            <div className="flex gap-2">
              <input value={newMsg} onChange={e => setNewMsg(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                     placeholder="Écrire un message..."
                     className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                     style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#374151' }} />
              <button onClick={handleSend} disabled={sending || !newMsg.trim()}
                      className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                      style={{ background: P }}>
                <Send className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── VIRTUAL CLASSROOMS ──────────────────────────────────────────────────── */
const VCR_PAGE_SIZE = 12;

function VirtualClassroomsView({ student }) {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    elearningService.getClassrooms({ page_size: 200 })
      .then(res => setClassrooms(Array.isArray(res) ? res : res?.results || []))
      .catch(() => setClassrooms([]))
      .finally(() => setLoading(false));
  }, []);

  // Restore selected classroom from sessionStorage after refresh
  useEffect(() => {
    if (!classrooms.length) return;
    const savedId = sessionStorage.getItem('vcr_selected_id');
    if (savedId) {
      const found = classrooms.find(c => c.id === savedId);
      sessionStorage.removeItem('vcr_selected_id');
      if (found) setSelected(found);
    }
  }, [classrooms]);

  const live     = classrooms.filter(c => classStatus(c) === 'live');
  const upcoming = classrooms.filter(c => classStatus(c) === 'upcoming');
  const ended    = classrooms.filter(c => classStatus(c) === 'ended');

  const byFilter = filter === 'live' ? live
    : filter === 'upcoming' ? upcoming
    : filter === 'ended' ? ended
    : classrooms;

  const filtered = search
    ? byFilter.filter(c =>
        c.title?.toLowerCase().includes(search.toLowerCase()) ||
        c.subject_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.class_name?.toLowerCase().includes(search.toLowerCase())
      )
    : byFilter;

  const totalPages = Math.max(1, Math.ceil(filtered.length / VCR_PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const paged = filtered.slice((curPage - 1) * VCR_PAGE_SIZE, curPage * VCR_PAGE_SIZE);

  // Reset to page 1 when filter or search changes
  useEffect(() => { setPage(1); }, [filter, search]);

  const handleSelect = (c) => {
    sessionStorage.setItem('vcr_selected_id', c.id);
    setSelected(c);
  };

  if (selected) {
    return <VirtualClassDetailView classroom={selected} student={student} onBack={() => setSelected(null)} />;
  }

  const FILTERS = [['all', 'Toutes'], ['live', 'En direct'], ['upcoming', 'À venir'], ['ended', 'Passées']];

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black" style={{ color: '#1e293b' }}>Classes virtuelles</h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>Vos sessions en ligne</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard icon={Radio}    value={live.length}     label="En direct"   color="#dc2626" bg="#fef2f2" />
        <StatCard icon={Calendar} value={upcoming.length} label="À venir"     color="#059669" bg="#f0fdf4" />
        <StatCard icon={Clock}    value={ended.length}    label="Passées"     color="#64748b" bg="#f8fafc" />
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#94a3b8' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une session…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'white', boxShadow: '0 1px 4px #0001', border: 'none' }}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)}
                    className="px-3 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap"
                    style={filter === k ? { background: P, color: 'white' } : { background: 'white', color: '#64748b', boxShadow: '0 1px 4px #0001' }}>
              {k === 'live' && <span className="inline-block h-2 w-2 rounded-full bg-red-500 mr-1.5 align-middle" />}
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Result count */}
      {!loading && (
        <p className="text-xs font-semibold mb-4" style={{ color: '#94a3b8' }}>
          {filtered.length} session{filtered.length !== 1 ? 's' : ''}
          {search && ` pour "${search}"`}
        </p>
      )}

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <Empty icon={Video} text="Aucune session" sub={search ? 'Essayez un autre terme de recherche' : undefined} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {paged.map(c => {
              const st = classStatus(c);
              const isLive = st === 'live';
              const isUpcoming = st === 'upcoming';
              const stStyle = isLive
                ? { color: '#dc2626', bg: '#fef2f2', label: 'En direct', dot: true }
                : isUpcoming
                ? { color: '#059669', bg: '#f0fdf4', label: 'À venir' }
                : { color: '#64748b', bg: '#f1f5f9', label: 'Terminée' };
              return (
                <div key={c.id}
                     onClick={() => handleSelect(c)}
                     className="rounded-2xl overflow-hidden flex flex-col cursor-pointer group"
                     style={{ background: 'white', boxShadow: '0 1px 8px #0001', transition: 'box-shadow .2s, transform .2s' }}
                     onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(219,39,119,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                     onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 8px #0001'; e.currentTarget.style.transform = 'none'; }}>
                  <div className="h-32 flex items-center justify-center relative"
                       style={{ background: isLive ? 'linear-gradient(135deg,#dc2626,#ef4444)' : isUpcoming ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#64748b,#94a3b8)' }}>
                    <Video className="h-10 w-10 text-white opacity-80" />
                    {isLive && (
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                           style={{ background: 'rgba(0,0,0,0.3)' }}>
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                        <span className="text-xs font-bold text-white">LIVE</span>
                      </div>
                    )}
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-bold"
                          style={{ background: 'rgba(255,255,255,0.9)', color: stStyle.color }}>
                      {stStyle.label}
                    </span>
                  </div>
                  <div className="p-4 flex-1 flex flex-col gap-2">
                    <h3 className="text-sm font-black line-clamp-2" style={{ color: '#1e293b' }}>{c.title}</h3>
                    <p className="text-xs" style={{ color: '#64748b' }}>
                      {fmtDT(c.start_time)} · {c.duration_minutes || 60} min
                    </p>
                    {c.instructor_name && (
                      <p className="text-xs flex items-center gap-1" style={{ color: '#94a3b8' }}>
                        <User className="h-3 w-3" /> {c.instructor_name}
                      </p>
                    )}
                    {c.description && (
                      <p className="text-xs line-clamp-2 mt-1" style={{ color: '#94a3b8' }}>{c.description}</p>
                    )}
                  </div>
                  <div className="px-4 pb-4">
                    <div className="flex items-center gap-2 text-xs font-bold py-2 px-3 rounded-xl justify-center"
                         style={{ background: stStyle.bg, color: stStyle.color }}>
                      {isLive ? <><Video className="h-3.5 w-3.5" /> Rejoindre</> : isUpcoming ? <><Clock className="h-3.5 w-3.5" /> Voir les détails</> : <><Play className="h-3.5 w-3.5" /> Voir les détails</>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: '1px solid #f1f5f9' }}>
              <p className="text-xs font-semibold" style={{ color: '#94a3b8' }}>
                Page {curPage} / {totalPages} · {filtered.length} sessions
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={curPage === 1}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-bold disabled:opacity-40"
                  style={{ background: 'white', color: '#64748b', boxShadow: '0 1px 4px #0001' }}>
                  <ChevronLeft className="h-4 w-4" /> Précédent
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(totalPages - 4, curPage - 2)) + i;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                            className="w-8 h-8 rounded-lg text-sm font-bold"
                            style={curPage === p ? { background: P, color: 'white' } : { background: 'white', color: '#64748b', boxShadow: '0 1px 4px #0001' }}>
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={curPage === totalPages}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-bold disabled:opacity-40"
                  style={{ background: 'white', color: '#64748b', boxShadow: '0 1px 4px #0001' }}>
                  Suivant <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── EVALUATIONS ─────────────────────────────────────────────────────────── */
function QuizRanking({ quizId }) {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    elearningService.getQuizAttempts(quizId)
      .then(res => {
        const all = Array.isArray(res) ? res : res?.results || [];
        const done = all.filter(a => a.status === 'COMPLETED' && a.score != null)
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        setAttempts(done);
      })
      .catch(() => setAttempts([]))
      .finally(() => setLoading(false));
  }, [quizId]);

  if (loading) return <div className="py-8 text-center"><div className="h-6 w-6 rounded-full border-2 animate-spin mx-auto" style={{ borderColor: P_LIGHT, borderTopColor: P }} /></div>;
  if (attempts.length === 0) return <p className="text-sm text-center py-8" style={{ color: '#94a3b8' }}>Aucun classement disponible</p>;

  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="rounded-xl overflow-hidden mt-4" style={{ boxShadow: '0 1px 6px #0001' }}>
      <table className="w-full text-sm">
        <thead><tr style={{ background: '#f8fafc' }}>
          <th className="px-3 py-2.5 text-left text-xs font-black" style={{ color: '#64748b' }}>#</th>
          <th className="px-3 py-2.5 text-left text-xs font-black" style={{ color: '#64748b' }}>Étudiant</th>
          <th className="px-3 py-2.5 text-right text-xs font-black" style={{ color: '#64748b' }}>Score</th>
        </tr></thead>
        <tbody>
          {attempts.map((a, i) => (
            <tr key={a.id} style={{ borderTop: '1px solid #f1f5f9' }}>
              <td className="px-3 py-2 text-xs" style={{ color: '#64748b' }}>{i < 3 ? medals[i] : `#${i+1}`}</td>
              <td className="px-3 py-2 text-sm font-semibold" style={{ color: '#374151' }}>{a.student_name || '—'}</td>
              <td className="px-3 py-2 text-sm font-black text-right" style={{ color: P }}>{a.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EvaluationDetailView({ quiz, onBack }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('detail');
  const attempt = quiz.attempt;
  const isDone  = attempt?.status === 'COMPLETED';
  const isPassed = isDone && (attempt?.score || 0) >= (quiz.passing_score || 0);

  return (
    <div className="p-8 max-w-4xl">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold mb-6" style={{ color: P }}>
        <ChevronLeft className="h-4 w-4" /> Retour aux évaluations
      </button>

      <div className="rounded-2xl p-6 mb-6" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', borderLeft: `4px solid ${isPassed ? '#059669' : isDone ? '#ef4444' : P}` }}>
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0"
               style={{ background: isDone ? (isPassed ? '#f0fdf4' : '#fef2f2') : P_LIGHT }}>
            <ClipboardCheck className="h-6 w-6" style={{ color: isDone ? (isPassed ? '#059669' : '#ef4444') : P }} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black mb-1" style={{ color: '#1e293b' }}>{quiz.title}</h1>
            {quiz.description && <p className="text-sm mb-2" style={{ color: '#64748b' }}>{quiz.description}</p>}
            <div className="flex gap-3 flex-wrap text-xs">
              {quiz.questions_count > 0 && <span className="px-2 py-0.5 rounded-full font-bold" style={{ background: '#eef2ff', color: '#6366f1' }}>{quiz.questions_count} questions</span>}
              {quiz.duration_minutes && <span className="px-2 py-0.5 rounded-full font-bold" style={{ background: '#f8fafc', color: '#64748b' }}>{quiz.duration_minutes} min</span>}
              {quiz.passing_score && <span className="px-2 py-0.5 rounded-full font-bold" style={{ background: '#fffbeb', color: '#d97706' }}>Seuil : {quiz.passing_score} pts</span>}
              {isDone && <span className="px-2 py-0.5 rounded-full font-bold" style={{ background: isPassed ? '#f0fdf4' : '#fef2f2', color: isPassed ? '#059669' : '#ef4444' }}>{isPassed ? '✓ Réussi' : '✗ Échoué'}</span>}
            </div>
          </div>
        </div>
        {isDone && (
          <div className="mt-4 px-4 py-3 rounded-xl" style={{ background: isPassed ? '#f0fdf4' : '#fef2f2' }}>
            <p className="text-sm font-black" style={{ color: isPassed ? '#059669' : '#ef4444' }}>
              Score : {attempt.score}/{attempt.max_score || quiz.total_points || 100}
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        {[['detail','Détails',ClipboardCheck],['ranking','Classement',Trophy]].map(([k,l,Icon]) => (
          <button key={k} onClick={() => setTab(k)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  style={tab === k ? { background: P, color: 'white' } : { background: 'white', color: '#64748b', boxShadow: '0 1px 4px #0001' }}>
            <Icon className="h-3.5 w-3.5" /> {l}
          </button>
        ))}
      </div>

      {tab === 'detail' && (
        <div className="rounded-2xl p-6" style={{ background: 'white', boxShadow: '0 1px 6px #0001' }}>
          {isDone ? (
            <div className="text-center py-6">
              <CheckCircle className="h-10 w-10 mx-auto mb-3" style={{ color: '#059669' }} />
              <p className="text-sm font-black" style={{ color: '#1e293b' }}>Évaluation complétée</p>
              <button onClick={() => navigate(`/student/quiz/${quiz.id}`)}
                      className="mt-4 px-5 py-2.5 rounded-xl text-sm font-black text-white"
                      style={{ background: '#64748b' }}>
                Voir les résultats détaillés
              </button>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: P_LIGHT }}>
                <ClipboardCheck className="h-7 w-7" style={{ color: P }} />
              </div>
              <p className="text-sm font-black mb-1" style={{ color: '#1e293b' }}>Prêt à commencer ?</p>
              <p className="text-xs mb-6" style={{ color: '#64748b' }}>
                {quiz.questions_count} questions · {quiz.duration_minutes} min
              </p>
              <button onClick={() => navigate(`/student/quiz/${quiz.id}`)}
                      className="px-6 py-3 rounded-xl text-sm font-black text-white"
                      style={{ background: `linear-gradient(135deg,${P},#be185d)` }}>
                {attempt ? 'Continuer l\'évaluation' : 'Commencer l\'évaluation'}
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'ranking' && <QuizRanking quizId={quiz.id} />}
    </div>
  );
}

function EvaluationsView() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    elearningService.getQuizzes({ page_size: 100 })
      .then(res => setQuizzes(Array.isArray(res) ? res : res?.results || []))
      .catch(() => setQuizzes([]))
      .finally(() => setLoading(false));
  }, []);

  if (selected) return <EvaluationDetailView quiz={selected} onBack={() => setSelected(null)} />;

  const completed = quizzes.filter(q => q.attempt?.status === 'COMPLETED');
  const passed    = completed.filter(q => (q.attempt?.score || 0) >= (q.passing_score || 0));
  const pending   = quizzes.filter(q => !q.attempt || q.attempt.status !== 'COMPLETED');

  const filtered = filter === 'pending' ? pending
    : filter === 'done' ? completed
    : quizzes;

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#1e293b' }}>Évaluations</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>Quiz et évaluations en ligne</p>
        </div>
        <WorkflowHelpButton defaultTab="student" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={ClipboardCheck} value={quizzes.length}                  label="Disponibles"  color="#6366f1" bg="#eef2ff" />
        <StatCard icon={Clock}          value={pending.length}                   label="À compléter"  color="#d97706" bg="#fffbeb" />
        <StatCard icon={CheckCircle}    value={completed.length}                 label="Complétées"   color="#059669" bg="#f0fdf4" />
        <StatCard icon={Trophy}         value={passed.length}                    label="Réussies"     />
      </div>

      <div className="flex gap-2 mb-6">
        {[['all','Toutes'],['pending','À compléter'],['done','Complétées']].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)}
                  className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  style={filter === k ? { background: P, color: 'white' } : { background: 'white', color: '#64748b', boxShadow: '0 1px 4px #0001' }}>
            {l}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <Empty icon={ClipboardCheck} text="Aucune évaluation" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(q => {
            const attempt  = q.attempt;
            const isDone   = attempt?.status === 'COMPLETED';
            const isPassed = isDone && (attempt?.score || 0) >= (q.passing_score || 0);
            const accentC  = isDone ? (isPassed ? '#059669' : '#ef4444') : P;
            return (
              <div key={q.id} onClick={() => setSelected(q)}
                   className="rounded-2xl overflow-hidden flex flex-col cursor-pointer"
                   style={{ background: 'white', boxShadow: '0 1px 8px #0001', transition: 'box-shadow .2s, transform .2s' }}
                   onMouseEnter={e => { e.currentTarget.style.boxShadow='0 6px 24px rgba(219,39,119,0.12)'; e.currentTarget.style.transform='translateY(-2px)'; }}
                   onMouseLeave={e => { e.currentTarget.style.boxShadow='0 1px 8px #0001'; e.currentTarget.style.transform='none'; }}>
                {/* Colored header stripe */}
                <div className="h-24 flex items-center justify-center"
                     style={{ background: `linear-gradient(135deg,${accentC},${accentC}aa)` }}>
                  <ClipboardCheck className="h-8 w-8 text-white opacity-80" />
                </div>
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <h3 className="text-sm font-black line-clamp-2" style={{ color: '#1e293b' }}>{q.title}</h3>
                  {q.subject_name && <p className="text-xs" style={{ color: '#64748b' }}>{q.subject_name}</p>}
                  <div className="flex items-center gap-2 text-xs flex-wrap" style={{ color: '#94a3b8' }}>
                    {q.questions_count > 0 && <span>{q.questions_count} questions</span>}
                    {q.duration_minutes && <span>· {q.duration_minutes} min</span>}
                  </div>
                  {isDone && (
                    <div className="px-3 py-1.5 rounded-lg" style={{ background: isPassed ? '#f0fdf4' : '#fef2f2' }}>
                      <p className="text-xs font-black" style={{ color: isPassed ? '#059669' : '#ef4444' }}>
                        {attempt.score}/{attempt.max_score || q.total_points || 100} pts · {isPassed ? 'Réussi' : 'Échoué'}
                      </p>
                    </div>
                  )}
                </div>
                <div className="px-4 pb-4">
                  <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold"
                       style={{ background: isDone ? (isPassed ? '#f0fdf4' : '#fef2f2') : P_LIGHT, color: accentC }}>
                    {isDone ? <><CheckCircle className="h-3.5 w-3.5" /> Voir résultats</>
                             : <><Play className="h-3.5 w-3.5" /> {attempt ? 'Continuer' : 'Commencer'}</>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── ASSIGNMENTS ─────────────────────────────────────────────────────────── */
function AssignmentsView() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    elearningService.getAssignments({ page_size: 100 })
      .then(res => setAssignments(Array.isArray(res) ? res : res?.results || []))
      .catch(() => setAssignments([]))
      .finally(() => setLoading(false));
  }, []);

  const pending   = assignments.filter(a => !a.submission);
  const submitted = assignments.filter(a => !!a.submission);

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black" style={{ color: '#1e293b' }}>Devoirs & Exercices</h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>Vos devoirs à rendre</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard icon={ClipboardList} value={assignments.length} label="Devoirs"    color="#6366f1" bg="#eef2ff" />
        <StatCard icon={Clock}         value={pending.length}     label="À rendre"   color="#d97706" bg="#fffbeb" />
        <StatCard icon={CheckCircle}   value={submitted.length}   label="Rendus"     color="#059669" bg="#f0fdf4" />
      </div>

      {loading ? <Spinner /> : assignments.length === 0 ? (
        <Empty icon={ClipboardList} text="Aucun devoir" />
      ) : (
        <div className="space-y-4">
          {assignments.map(a => {
            const isPastDue = a.due_date && new Date(a.due_date) < new Date() && !a.submission;
            const isGraded  = a.submission?.score != null;
            const borderClr = a.submission ? '#059669' : isPastDue ? '#dc2626' : '#d97706';
            return (
              <div key={a.id} className="p-5 rounded-2xl"
                   style={{ background: 'white', boxShadow: '0 1px 6px #0001', borderLeft: `4px solid ${borderClr}` }}>
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                       style={{ background: a.submission ? '#f0fdf4' : '#fffbeb' }}>
                    <ClipboardList className="h-5 w-5"
                      style={{ color: a.submission ? '#059669' : '#d97706' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-black" style={{ color: '#1e293b' }}>{a.title}</h3>
                      {isGraded && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                              style={{ background: '#f0fdf4', color: '#059669' }}>
                          {a.submission.score}/{a.max_score || 20} pts
                        </span>
                      )}
                      {a.quiz && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                              style={{ background: P_LIGHT, color: P }}>Exercice en ligne</span>
                      )}
                    </div>
                    {a.description && (
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: '#64748b' }}>{a.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                      {a.due_date && (
                        <span className="text-xs flex items-center gap-1"
                              style={{ color: isPastDue ? '#dc2626' : '#64748b' }}>
                          <Clock className="h-3 w-3" />
                          {isPastDue ? 'Dépassé · ' : 'À rendre le '}{fmt(a.due_date)}
                        </span>
                      )}
                      {a.course_title && (
                        <span className="text-xs" style={{ color: '#94a3b8' }}>{a.course_title}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-xs font-bold">
                    {a.submission
                      ? <span className="flex items-center gap-1" style={{ color: '#059669' }}>
                          <CheckCircle className="h-4 w-4" /> Rendu
                        </span>
                      : <span className="flex items-center gap-1" style={{ color: '#d97706' }}>
                          <Clock className="h-4 w-4" /> En attente
                        </span>
                    }
                  </div>
                </div>
                {!a.submission && (
                  <div className="mt-3 pt-3 border-t text-xs" style={{ borderColor: '#f1f5f9', color: '#94a3b8' }}>
                    Rendez ce devoir depuis l'onglet E-Learning › Devoirs
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── EXAMS ───────────────────────────────────────────────────────────────── */
function ExamsView() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    elearningService.getSecureExams({ page_size: 100, is_published: true })
      .then(res => setExams(Array.isArray(res) ? res : res?.results || []))
      .catch(() => setExams([]))
      .finally(() => setLoading(false));
  }, []);

  const EXAM_TYPES = { MID: 'Partiel', FINAL: 'Examen final', SUPP: 'Rattrapage', TP: 'TP noté', CONCOURS: 'Concours' };
  const EXAM_COLORS = { MID: '#d97706', FINAL: '#ef4444', SUPP: '#7c3aed', TP: '#059669', CONCOURS: '#0ea5e9' };

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black" style={{ color: '#1e293b' }}>Examens</h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>Vos examens programmés</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard icon={Award}       value={exams.length}                                                   label="Examens"    color="#6366f1" bg="#eef2ff" />
        <StatCard icon={Clock}       value={exams.filter(e => e.is_available).length}                       label="En cours"   color="#d97706" bg="#fffbeb" />
        <StatCard icon={CheckCircle} value={exams.filter(e => e.my_session?.status === 'SUBMITTED').length} label="Complétés"  color="#059669" bg="#f0fdf4" />
      </div>

      {loading ? <Spinner /> : exams.length === 0 ? (
        <Empty icon={Award} text="Aucun examen disponible" sub="Les examens publiés apparaîtront ici" />
      ) : (
        <div className="space-y-3">
          {exams.map(e => {
            const isDone = e.my_session?.status === 'SUBMITTED';
            const isLive = e.is_available;
            const tc = EXAM_COLORS[e.exam_type] || '#6366f1';
            return (
              <div key={e.id} className="p-5 rounded-2xl flex items-center gap-4"
                   style={{ background: 'white', boxShadow: '0 1px 6px #0001', borderLeft: `4px solid ${isDone ? '#059669' : isLive ? '#ef4444' : '#e2e8f0'}` }}>
                <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: `${tc}15` }}>
                  <Award className="h-5 w-5" style={{ color: tc }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-black" style={{ color: '#1e293b' }}>{e.title}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: `${tc}15`, color: tc }}>
                      {EXAM_TYPES[e.exam_type] || e.exam_type}
                    </span>
                    {isLive && !isDone && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse"
                            style={{ background: '#fee2e2', color: '#dc2626' }}>EN COURS</span>
                    )}
                    {e.exam_pdf && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: '#f5f3ff', color: '#7c3aed' }}>📄 PDF</span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: '#64748b' }}>
                    {e.subject_name || '—'} · {e.duration_minutes} min · Seuil {e.pass_score_percent || 50}%
                  </p>
                  {isDone && e.my_session?.score != null && (
                    <p className="text-xs mt-0.5 font-bold" style={{ color: '#059669' }}>
                      Score : {e.my_session.score} pts
                    </p>
                  )}
                </div>
                {isDone ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0"
                        style={{ background: '#f0fdf4', color: '#059669' }}>✓ Complété</span>
                ) : isLive ? (
                  <button onClick={() => navigate(`/student/exams/${e.id}`)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white flex-shrink-0 flex items-center gap-1.5"
                          style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
                    Passer l'examen
                  </button>
                ) : (
                  <span className="text-xs flex-shrink-0" style={{ color: '#94a3b8' }}>Non disponible</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── PROFILE ─────────────────────────────────────────────────────────────── */
function ProfileView({ student }) {
  if (!student) return <Spinner />;
  const su = student.user || {};
  const fullName = su.full_name || `${su.first_name || ''} ${su.last_name || ''}`.trim() || 'Étudiant';
  const initial  = fullName.charAt(0).toUpperCase();

  const fields = [
    { label: 'Nom complet',   value: fullName },
    { label: 'Email',         value: su.email || '—' },
    { label: 'Matricule',     value: student.matricule || '—' },
    { label: 'Date naissance',value: fmt(student.birth_date) },
    { label: 'Genre',         value: student.gender === 'M' ? 'Masculin' : student.gender === 'F' ? 'Féminin' : '—' },
    { label: 'Adresse',       value: student.address || '—' },
    { label: 'Téléphone',     value: student.phone || su.phone || '—' },
  ];

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-black mb-6" style={{ color: '#1e293b' }}>Mon profil</h1>
      <div className="rounded-3xl p-8" style={{ background: 'white', boxShadow: '0 1px 8px #0001' }}>
        <div className="flex items-center gap-5 mb-8">
          <div className="h-20 w-20 rounded-2xl flex items-center justify-center text-white text-3xl font-black"
               style={{ background: P }}>{initial}</div>
          <div>
            <h2 className="text-xl font-black" style={{ color: '#1e293b' }}>{fullName}</h2>
            <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>Étudiant</p>
            {student.matricule && (
              <span className="mt-1.5 inline-block px-2.5 py-0.5 rounded-full text-xs font-bold"
                    style={{ background: P_LIGHT, color: P }}>{student.matricule}</span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map(f => (
            <div key={f.label} className="rounded-xl p-4" style={{ background: '#f8fafc' }}>
              <p className="text-[10px] font-black tracking-widest mb-1" style={{ color: '#94a3b8' }}>
                {f.label.toUpperCase()}
              </p>
              <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>{f.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── CONTENT AREA ────────────────────────────────────────────────────────── */
function ContentArea({ active, student, enrollments, onNav, selectedCourse, onSelectCourse, onBackFromCourse }) {
  if (active === 'courses' && selectedCourse) {
    return <CourseDetailView course={selectedCourse.course} idx={selectedCourse.idx} onBack={onBackFromCourse} onNav={onNav} />;
  }
  switch (active) {
    case 'dashboard':   return <DashboardHome student={student} enrollments={enrollments} onNav={onNav} />;
    case 'courses':     return <CourseCatalogView onSelectCourse={onSelectCourse} />;
    case 'my-learning': return <MyLearningView enrollments={enrollments} />;
    case 'classrooms':  return <VirtualClassroomsView student={student} />;
    case 'evaluations': return <EvaluationsView />;
    case 'assignments': return <StudentAssignmentsHub />;
    case 'exams':       return <StudentExamsHub />;
    case 'results':     return <StudentResultsHub />;
    case 'notes':       return <StudentNotes />;
    case 'presences':   return <StudentPresences />;
    case 'planning':    return <StudentPlanning />;
    case 'finances':    return <StudentFinances />;
    case 'documents':   return <StudentDocuments />;
    case 'messages':    return <StudentMessages />;
    case 'library':     return <StudentLibrary />;
    case 'videos':      return <StudentVideoLibrary />;
    case 'labs':        return <StudentVirtualLabs />;
    case 'ai-tutor':    return <StudentAITutor />;
    case 'profile':     return <ProfileView student={student} />;
    default:            return <DashboardHome student={student} enrollments={enrollments} onNav={onNav} />;
  }
}

/* ── STUDENT HUB ─────────────────────────────────────────────────────────── */
export default function StudentHub() {
  const [active, setActiveState] = useState(() => {
    try { return localStorage.getItem('studentHub_active') || 'dashboard'; } catch { return 'dashboard'; }
  });
  const [collapsed, setCollapsed] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const setActive = useCallback((tab) => {
    setActiveState(tab);
    setSelectedCourse(null);
    try { localStorage.setItem('studentHub_active', tab); } catch {}
  }, []);

  const handleSelectCourse = (course, idx) => setSelectedCourse({ course, idx });
  const handleBackFromCourse = () => setSelectedCourse(null);

  const { data: student, loading: studentLoading } = useApi(
    () => studentsService.getMe(), [], true
  );

  const studentId = student?.id;

  const { data: enrollmentsData } = useApi(
    () => studentId
      ? academicService.getEnrollments({ student: studentId, page_size: 10 })
      : Promise.resolve([]),
    [studentId], !!studentId
  );

  const enrollments = Array.isArray(enrollmentsData)
    ? enrollmentsData
    : (enrollmentsData?.results || []);

  if (studentLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#f8fafc' }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8fafc' }}>
      <Sidebar
        active={active}
        setActive={setActive}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        student={student}
      />
      <main className="flex-1 overflow-y-auto">
        <ContentArea
          active={active}
          student={student}
          enrollments={enrollments}
          onNav={setActive}
          selectedCourse={selectedCourse}
          onSelectCourse={handleSelectCourse}
          onBackFromCourse={handleBackFromCourse}
        />
      </main>
    </div>
  );
}
