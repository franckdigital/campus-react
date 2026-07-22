import { useState, useMemo, useCallback, useRef, useEffect, Component } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, FileText, Video, ClipboardList, ClipboardCheck,
  Shield, FlaskConical, Library, Bot, Film, Layers, MonitorPlay,
  GraduationCap, TrendingUp, ChevronLeft, ChevronRight, ChevronDown,
  Settings2, Award, Users, Star, Play, Clock, Calendar, Search,
  Plus, ExternalLink, CheckCircle2, Wifi, WifiOff, BarChart2,
  ListChecks, Grid3X3 as GridIcon, List as ListIcon, BookMarked,
  GanttChartSquare, Sparkles, PanelLeftClose, PanelLeftOpen,
  MessageSquare, Send, User,
} from 'lucide-react';
import { elearningService } from '../../services/elearning';
import { useApi } from '../../hooks/useApi';
import academicService from '../../services/academic';
import { useSite } from '../../contexts/SiteContext';
import VirtualClassSessions from '../components/VirtualClassSessions';
import { useNotifications } from '../../components/Notifications';
import CourseManager from './CourseManager';
import QuizManager from './quiz/QuizManager';
import AssignmentManager from './AssignmentManager';
import ExamManager from './ExamManager';
import VirtualLabManager from './VirtualLabManager';
import LibraryManager from './LibraryManager';
import VideoLibraryManager from './VideoLibraryManager';
import AITeacherPanel from './AITeacherPanel';
import VirtualClassroomManager from './VirtualClassroomManager';
import PedagogicalManager from '../../components/academic/PedagogicalManager';
import LessonsHub from './LessonsHub';
import ZoomSessionsHub from './ZoomSessionsHub';
import CorrectionHub from './CorrectionHub';
import { WorkflowHelpButton } from '../../components/WorkflowHelpModal';

// ─── Design tokens ───────────────────────────────────────────────────────────
const P = '#db2777';
const P_BG = '#fdf2f8';
const P_LIGHT = '#fce7f3';

// ─── Sidebar config ──────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    group: 'APPRENTISSAGE',
    items: [
      { id: 'cours',          label: 'Cours',                icon: BookOpen },
      { id: 'manage-cours',   label: 'Gérer mes cours',      icon: Settings2 },
      { id: 'lecons',         label: 'Leçons & Parcours',    icon: FileText },
      { id: 'progression',    label: 'Progression',           icon: TrendingUp },
      { id: 'sessions',       label: 'Sessions Zoom',         icon: Video },
      { id: 'classes-virt',   label: 'Classes virtuelles',   icon: MonitorPlay },
    ],
  },
  {
    group: 'ÉVALUATION & CERTIFICATION',
    items: [
      { id: 'evaluations',    label: 'Évaluations',          icon: ClipboardList },
      { id: 'manage-eval',    label: 'Gérer les évaluations',icon: ClipboardCheck },
      { id: 'devoirs',        label: 'Devoirs & Exercices',  icon: GanttChartSquare },
      { id: 'examens',        label: 'Examens sécurisés',    icon: Shield },
      { id: 'labos',          label: 'Laboratoires virtuels',icon: FlaskConical },
    ],
  },
  {
    group: 'RESSOURCES',
    items: [
      { id: 'bibliotheque',   label: 'Bibliothèque',         icon: Library },
      { id: 'videoteque',     label: 'Vidéothèque',          icon: Film },
      { id: 'ia',             label: 'IA Enseignant',        icon: Bot },
    ],
  },
  {
    group: 'ADMINISTRATION',
    items: [
      { id: 'pedagogie',      label: 'Gestion Pédagogique', icon: GraduationCap },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 rounded-full border-[3px] animate-spin" style={{ borderColor: P_LIGHT, borderTopColor: P }} />
    </div>
  );
}

const LEVEL_META = {
  beginner:     { label: 'Débutant',       bg: '#d1fae5', color: '#065f46' },
  intermediate: { label: 'Intermédiaire',  bg: '#fef3c7', color: '#92400e' },
  advanced:     { label: 'Avancé',         bg: '#fee2e2', color: '#991b1b' },
  all_levels:   { label: 'Tous niveaux',   bg: '#ede9fe', color: '#5b21b6' },
};

const STATUS_META = {
  published: { label: 'Publié',   bg: '#d1fae5', color: '#065f46' },
  draft:     { label: 'Brouillon',bg: '#fef3c7', color: '#92400e' },
  archived:  { label: 'Archivé', bg: '#f1f5f9', color: '#64748b' },
};

function LevelBadge({ level }) {
  const m = LEVEL_META[level] || LEVEL_META.all_levels;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: m.bg, color: m.color }}>{m.label}</span>;
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.draft;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: m.bg, color: m.color }}>{m.label}</span>;
}

function StatCard({ icon: Icon, value, label, color = P, bg = P_BG }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl p-5 bg-white" style={{ border: '1.5px solid #f0f4f9' }}>
      <div className="h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
        <Icon className="h-6 w-6" style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-black" style={{ color: '#0f172a' }}>{value}</p>
        <p className="text-xs font-semibold" style={{ color: '#64748b' }}>{label}</p>
      </div>
    </div>
  );
}

// ─── Admin Course Detail ──────────────────────────────────────────────────────
function AdminCourseDetailView({ course, onBack, onManage }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const secs = await elearningService.getCourseSections(course.id)
          .then(r => Array.isArray(r) ? r : r?.results || []);
        // Sections' chapters, and each chapter's lessons, are independent of
        // each other — fetch concurrently instead of one round-trip at a time.
        await Promise.all(secs.map(async (sec) => {
          const chs = await elearningService.getCourseChapters(sec.id)
            .then(r => Array.isArray(r) ? r : r?.results || []);
          await Promise.all(chs.map(async (ch) => {
            ch.lessons = await elearningService.getCourseLessons(ch.id)
              .then(r => Array.isArray(r) ? r : r?.results || []);
          }));
          sec.chapters = chs;
        }));
        setSections(secs);
      } catch { setSections([]); }
      finally { setLoading(false); }
    })();
  }, [course.id]);

  const totalLessons = sections.reduce((s, sec) =>
    s + (sec.chapters||[]).reduce((cs, ch) => cs + (ch.lessons||[]).length, 0), 0);
  const totalMin = sections.reduce((s, sec) =>
    s + (sec.chapters||[]).reduce((cs, ch) =>
      cs + (ch.lessons||[]).reduce((ls, l) => ls + (l.duration_seconds||0), 0), 0), 0);

  const THUMB_GRADS = [
    'linear-gradient(135deg,#6366f1,#8b5cf6)',
    'linear-gradient(135deg,#db2777,#f43f5e)',
    'linear-gradient(135deg,#0891b2,#0284c7)',
    'linear-gradient(135deg,#059669,#10b981)',
    'linear-gradient(135deg,#d97706,#f59e0b)',
  ];
  const grad = THUMB_GRADS[course.id % THUMB_GRADS.length] || THUMB_GRADS[0];

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold hover:opacity-80" style={{ color: P }}>
        <ChevronLeft className="h-4 w-4" /> Retour aux cours
      </button>

      {/* Hero */}
      <div className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <div className="h-52 relative">
          {course.thumbnail
            ? <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center" style={{ background: grad }}>
                <BookMarked className="h-16 w-16 text-white opacity-30" />
              </div>
          }
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom,transparent 40%,rgba(0,0,0,0.6))' }} />
          <div className="absolute bottom-4 left-6 right-6">
            <p className="text-white text-2xl font-black">{course.title}</p>
            {course.subtitle && <p className="text-white/80 text-sm mt-1">{course.subtitle}</p>}
          </div>
          <div className="absolute top-4 right-4">
            <StatusBadge status={course.status} />
          </div>
        </div>
        <div className="p-6 bg-white flex flex-wrap gap-6">
          <div className="flex items-center gap-2 text-sm" style={{ color: '#64748b' }}>
            <BookOpen className="h-4 w-4" /> {totalLessons} leçons
          </div>
          <div className="flex items-center gap-2 text-sm" style={{ color: '#64748b' }}>
            <Clock className="h-4 w-4" /> {Math.round(totalMin / 60)}h {totalMin % 60}min
          </div>
          <div className="flex items-center gap-2 text-sm" style={{ color: '#64748b' }}>
            <Users className="h-4 w-4" /> {course.total_students || 0} apprenants
          </div>
          {course.language && (
            <div className="flex items-center gap-2 text-sm" style={{ color: '#64748b' }}>
              🌐 {course.language}
            </div>
          )}
          <div className="ml-auto flex gap-2">
            <button onClick={onManage} className="px-4 py-2 rounded-xl text-sm font-bold text-white"
                    style={{ background: `linear-gradient(135deg,${P},#be185d)` }}>
              Modifier le cours
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Programme */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-lg font-extrabold" style={{ color: '#0f172a' }}>
            Programme du cours
            {totalLessons > 0 && (
              <span className="ml-2 text-sm font-normal" style={{ color: '#94a3b8' }}>
                {sections.length} sections · {totalLessons} leçons
              </span>
            )}
          </h2>
          {loading ? <Spinner /> : sections.length === 0 ? (
            <div className="rounded-2xl p-8 text-center bg-white" style={{ border: '1.5px dashed #e2e8f0' }}>
              <p className="text-sm" style={{ color: '#94a3b8' }}>Aucun contenu — ajoutez des sections depuis l'éditeur</p>
            </div>
          ) : sections.map((sec, si) => {
            const secLessons = (sec.chapters||[]).flatMap(ch => ch.lessons||[]);
            const secMin = Math.round(secLessons.reduce((s, l) => s + (l.duration_seconds||0), 0) / 60);
            return (
              <div key={sec.id} className="rounded-2xl overflow-hidden bg-white" style={{ border: '1.5px solid #f0f4f9' }}>
                <button onClick={() => setOpen(open === si ? -1 : si)}
                        className="w-full flex items-center justify-between p-4 text-left">
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-lg flex items-center justify-center text-xs font-black text-white"
                         style={{ background: grad }}>
                      {si + 1}
                    </div>
                    <span className="text-sm font-bold" style={{ color: '#0f172a' }}>{sec.title}</span>
                    <span className="text-xs" style={{ color: '#94a3b8' }}>
                      {secLessons.length} leçons{secMin > 0 ? ` · ${secMin}min` : ''}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 transition-transform" style={{ color: '#94a3b8', transform: open === si ? 'rotate(90deg)' : 'none' }} />
                </button>
                {open === si && (sec.chapters||[]).map(ch => (
                  <div key={ch.id}>
                    {(ch.lessons||[]).map((l, li) => (
                      <div key={l.id} className="flex items-center gap-3 px-5 py-2.5" style={{ borderTop: '1px solid #f8fafc' }}>
                        <Play className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#94a3b8' }} />
                        <span className="text-sm flex-1 truncate" style={{ color: '#374151' }}>{l.title}</span>
                        {l.duration_seconds > 0 && (
                          <span className="text-xs flex-shrink-0" style={{ color: '#94a3b8' }}>{Math.round(l.duration_seconds/60)} min</span>
                        )}
                        {l.is_preview_free && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: '#f0fdf4', color: '#059669' }}>Aperçu</span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {course.description && (
            <div className="bg-white rounded-2xl p-5" style={{ border: '1.5px solid #f0f4f9' }}>
              <h3 className="text-sm font-extrabold mb-2" style={{ color: '#0f172a' }}>À propos</h3>
              <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>{course.description}</p>
            </div>
          )}
          {course.what_you_will_learn?.length > 0 && (
            <div className="bg-white rounded-2xl p-5" style={{ border: '1.5px solid #f0f4f9' }}>
              <h3 className="text-sm font-extrabold mb-3" style={{ color: '#0f172a' }}>Objectifs</h3>
              <ul className="space-y-1.5">
                {course.what_you_will_learn.map((it, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs" style={{ color: '#475569' }}>
                    <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: '#059669' }} />
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Cours — Catalogue view (LMS Pro style) ──────────────────────────────────
function CourseCatalogView({ onManage, initialSelectedCourse, onInitialCourseConsumed }) {
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [view, setView] = useState('grid');
  const [selectedCourse, setSelectedCourse] = useState(null);

  const { data, loading } = useApi(() => elearningService.getCourses({ page_size: 100 }), [], true);
  const all = data?.results ?? data ?? [];

  // Land on a specific course's detail page after it was just created/updated
  // in the editor, using the freshly-fetched copy rather than the stale one
  // passed in.
  useEffect(() => {
    if (!initialSelectedCourse || loading) return;
    const fresh = all.find(c => c.id === initialSelectedCourse.id) || initialSelectedCourse;
    setSelectedCourse(fresh);
    onInitialCourseConsumed?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelectedCourse, loading]);

  const filtered = useMemo(() => all.filter(c => {
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || (c.subtitle || '').toLowerCase().includes(search.toLowerCase());
    const matchLevel = !filterLevel || c.level === filterLevel;
    return matchSearch && matchLevel;
  }), [all, search, filterLevel]);

  const published = all.filter(c => c.status === 'published').length;

  if (loading) return <Spinner />;
  if (selectedCourse) return <AdminCourseDetailView course={selectedCourse} onBack={() => setSelectedCourse(null)} onManage={() => onManage(selectedCourse)} />;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>Catalogue de formations</h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>Explorez et gérez les cours disponibles</p>
        </div>
        <button onClick={() => onManage()}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white flex-shrink-0 w-full sm:w-auto"
          style={{ background: `linear-gradient(135deg,${P},#be185d)`, boxShadow: `0 4px 14px ${P}40` }}>
          <Settings2 className="h-4 w-4" /> Gérer mes cours
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={BookOpen} value={all.length} label="Cours disponibles" color="#2563eb" bg="#dbeafe" />
        <StatCard icon={CheckCircle2} value={published} label="Cours publiés" color="#059669" bg="#d1fae5" />
        <StatCard icon={Award} value={0} label="Avec certification" color="#d97706" bg="#fef3c7" />
      </div>

      {/* Search + filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-48 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#94a3b8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un cours…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border outline-none"
            style={{ borderColor: '#e2e8f0', background: '#fff' }} />
        </div>
        <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm border outline-none cursor-pointer bg-white"
          style={{ borderColor: '#e2e8f0' }}>
          <option value="">Tous niveaux</option>
          {Object.entries(LEVEL_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#f1f5f9' }}>
          <button onClick={() => setView('grid')} className="p-2 rounded-lg transition-all" style={{ background: view === 'grid' ? '#fff' : 'transparent', color: view === 'grid' ? P : '#64748b', boxShadow: view === 'grid' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none' }}>
            <GridIcon className="h-4 w-4" />
          </button>
          <button onClick={() => setView('list')} className="p-2 rounded-lg transition-all" style={{ background: view === 'list' ? '#fff' : 'transparent', color: view === 'list' ? P : '#64748b', boxShadow: view === 'list' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none' }}>
            <ListIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 rounded-2xl" style={{ border: '1.5px dashed #e2e8f0' }}>
          <BookOpen className="h-12 w-12 mb-3 opacity-20" style={{ color: P }} />
          <p className="text-sm font-bold" style={{ color: '#64748b' }}>Aucun cours trouvé</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(c => (
            <div key={c.id} onClick={() => setSelectedCourse(c)}
                 className="bg-white rounded-2xl overflow-hidden transition-all hover:shadow-lg cursor-pointer group" style={{ border: '1.5px solid #f0f4f9' }}>
              <div className="relative overflow-hidden h-44">
              {c.thumbnail ? (
                <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#fdf2f8,#ede9fe)' }}>
                  <BookMarked className="h-12 w-12 opacity-30" style={{ color: P }} />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                   style={{ background: 'rgba(0,0,0,0.25)' }}>
                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow">
                  <Play className="h-5 w-5 ml-0.5" style={{ color: P }} />
                </div>
              </div>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <LevelBadge level={c.level} />
                  {c.category_name && <span className="text-[10px] font-semibold" style={{ color: '#94a3b8' }}>{c.category_name}</span>}
                </div>
                <p className="text-sm font-extrabold leading-tight" style={{ color: '#0f172a' }}>{c.title}</p>
                {c.subtitle && <p className="text-xs line-clamp-2" style={{ color: '#64748b' }}>{c.subtitle}</p>}
                <div className="flex items-center gap-3 pt-1">
                  {c.duration_hours > 0 && (
                    <span className="text-xs flex items-center gap-1" style={{ color: '#94a3b8' }}>
                      <Clock className="h-3 w-3" />{c.duration_hours}h
                    </span>
                  )}
                  {c.enrollment_count > 0 && (
                    <span className="text-xs flex items-center gap-1" style={{ color: '#94a3b8' }}>
                      <Users className="h-3 w-3" />{c.enrollment_count}
                    </span>
                  )}
                  <StatusBadge status={c.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1.5px solid #f0f4f9' }}>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #f0f4f9' }}>
                {['Cours', 'Niveau', 'Statut', 'Étudiants'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wide" style={{ color: '#94a3b8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} onClick={() => setSelectedCourse(c)} style={{ borderBottom: '1px solid #f8fafc', cursor: 'pointer' }} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: P_BG }}>
                        <BookOpen className="h-4 w-4" style={{ color: P }} />
                      </div>
                      <div>
                        <p className="font-bold" style={{ color: '#0f172a' }}>{c.title}</p>
                        {c.subtitle && <p className="text-xs truncate max-w-xs" style={{ color: '#64748b' }}>{c.subtitle}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><LevelBadge level={c.level} /></td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#64748b' }}>{c.enrollment_count || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Évaluations catalog (LMS Pro style) ─────────────────────────────────────
function EvaluationsCatalogView({ onManage }) {
  const { data, loading } = useApi(() => elearningService.getQuizzes({ page_size: 100 }), [], true);
  const quizzes = data?.results ?? data ?? [];

  const published = quizzes.filter(q => q.is_published).length;

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>Évaluations</h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>Quiz, examens et exercices pour valider les connaissances</p>
        </div>
        <button onClick={onManage}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white flex-shrink-0 w-full sm:w-auto"
          style={{ background: `linear-gradient(135deg,${P},#be185d)`, boxShadow: `0 4px 14px ${P}40` }}>
          <Settings2 className="h-4 w-4" /> Gérer les évaluations
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={ClipboardList} value={quizzes.length} label="Disponibles" color="#2563eb" bg="#dbeafe" />
        <StatCard icon={CheckCircle2} value={published} label="Publiées" color="#059669" bg="#d1fae5" />
        <StatCard icon={Award} value={0} label="Réussies (global)" color="#d97706" bg="#fef3c7" />
        <StatCard icon={BarChart2} value="—" label="Score moyen" color="#7c3aed" bg="#ede9fe" />
      </div>

      {quizzes.length === 0 ? (
        <div className="flex flex-col items-center py-20 rounded-2xl" style={{ border: '1.5px dashed #e2e8f0' }}>
          <ClipboardList className="h-12 w-12 mb-3 opacity-20" style={{ color: P }} />
          <p className="text-sm font-bold" style={{ color: '#64748b' }}>Aucune évaluation</p>
          <button onClick={onManage} className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: `linear-gradient(135deg,${P},#be185d)` }}>
            <Plus className="h-4 w-4" /> Créer une évaluation
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizzes.map(q => (
            <div key={q.id} className="bg-white rounded-2xl p-5 space-y-4" style={{ border: '1.5px solid #f0f4f9' }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#dbeafe', color: '#2563eb' }}>Quiz</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: q.is_published ? '#d1fae5' : '#fef3c7', color: q.is_published ? '#065f46' : '#92400e' }}>
                    {q.is_published ? 'Publié' : 'Brouillon'}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-extrabold" style={{ color: '#0f172a' }}>{q.title}</p>
                {q.course_title && <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{q.course_title}</p>}
                {q.class_name && <p className="text-xs" style={{ color: '#94a3b8' }}>{q.class_name}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Questions', value: q.questions_count ?? '—' },
                  { label: 'Durée', value: q.time_limit_minutes ? `${q.time_limit_minutes}m` : '—' },
                  { label: 'Score requis', value: q.pass_score_percent ? `${q.pass_score_percent}%` : '—' },
                ].map(s => (
                  <div key={s.label} className="text-center rounded-xl py-2" style={{ background: '#f8fafc' }}>
                    <p className="text-base font-extrabold" style={{ color: '#0f172a' }}>{s.value}</p>
                    <p className="text-[10px]" style={{ color: '#94a3b8' }}>{s.label}</p>
                  </div>
                ))}
              </div>
              <button onClick={onManage}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: `linear-gradient(135deg,${P},#be185d)` }}>
                Gérer l'évaluation
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Admin Virtual Class Detail + Chat ───────────────────────────────────────
function AdminVirtualClassDetailView({ classroom, onBack }) {
  const st = classStatus(classroom);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef(null);

  const stStyle = st === 'live'
    ? { color: '#dc2626', bg: '#fef2f2', label: 'En direct', dot: true }
    : st === 'upcoming'
    ? { color: '#2563eb', bg: '#dbeafe', label: 'Planifiée' }
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
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: P }}>
        <ChevronLeft className="h-4 w-4" /> Retour aux classes virtuelles
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: session info + gestion segments */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl p-6 bg-white" style={{ border: '1.5px solid #f0f4f9' }}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3"
                      style={{ background: stStyle.bg, color: stStyle.color }}>
                  {stStyle.dot && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />}
                  {stStyle.label}
                </span>
                <h1 className="text-xl font-black mb-1" style={{ color: '#0f172a' }}>{classroom.title}</h1>
                {classroom.description && (
                  <p className="text-sm" style={{ color: '#64748b' }}>{classroom.description}</p>
                )}
              </div>
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                   style={{ background: stStyle.bg }}>
                <MonitorPlay className="h-6 w-6" style={{ color: stStyle.color }} />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4" style={{ borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <p className="text-xs font-bold mb-0.5" style={{ color: '#94a3b8' }}>Date & heure</p>
                <p className="text-sm font-black" style={{ color: '#0f172a' }}>{fmtDT(classroom.start_time)}</p>
              </div>
              <div>
                <p className="text-xs font-bold mb-0.5" style={{ color: '#94a3b8' }}>Durée</p>
                <p className="text-sm font-black" style={{ color: '#0f172a' }}>{classroom.duration_minutes || 60} min</p>
              </div>
              {classroom.students_count > 0 && (
                <div>
                  <p className="text-xs font-bold mb-0.5" style={{ color: '#94a3b8' }}>Participants</p>
                  <p className="text-sm font-black" style={{ color: '#0f172a' }}>{classroom.students_count}</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mt-4">
              {st === 'live' && (classroom.join_url || classroom.jitsi_url || classroom.meeting_url) && (
                <a href={classroom.join_url || classroom.jitsi_url || classroom.meeting_url} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black text-white"
                   style={{ background: '#dc2626' }}>
                  <Video className="h-4 w-4" /> Rejoindre la session
                </a>
              )}
              {st !== 'ended' && (
                <button className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
                        style={{ background: P_BG, color: P }}>
                  <ExternalLink className="h-4 w-4" /> Gérer la session
                </button>
              )}
              {st === 'ended' && classroom.recording_url && (
                <a href={classroom.recording_url} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black"
                   style={{ background: '#f1f5f9', color: '#374151' }}>
                  <Play className="h-4 w-4" /> Voir l'enregistrement
                </a>
              )}
            </div>
          </div>

          {/* Gestion des sessions multi-segments */}
          <VirtualClassSessions classroom={classroom} isAdmin={true} />
        </div>

        {/* Chat panel */}
        <div className="flex flex-col rounded-2xl overflow-hidden bg-white"
             style={{ border: '1.5px solid #f0f4f9', height: '460px' }}>
          <div className="px-4 py-3 flex items-center gap-2 flex-shrink-0"
               style={{ background: P_LIGHT, borderBottom: '1px solid #fce7f3' }}>
            <MessageSquare className="h-4 w-4" style={{ color: P }} />
            <span className="text-sm font-black" style={{ color: P }}>Chat en direct</span>
            <div className="ml-auto flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#059669' }} />
              <span className="text-xs font-semibold" style={{ color: '#059669' }}>Auto</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <MessageSquare className="h-8 w-8 mb-2 opacity-20" style={{ color: P }} />
                <p className="text-xs font-bold" style={{ color: '#94a3b8' }}>Aucun message</p>
              </div>
            ) : messages.map((msg, i) => {
              const initial = (msg.sender_name || msg.sender || '?')[0]?.toUpperCase() || '?';
              const isAdmin = msg.is_teacher || msg.role === 'teacher';
              return (
                <div key={msg.id || i} className={`flex gap-2 ${isAdmin ? 'flex-row-reverse' : ''}`}>
                  <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                       style={{ background: isAdmin ? P : '#6366f1' }}>
                    {initial}
                  </div>
                  <div className={`max-w-[75%] flex flex-col gap-0.5 ${isAdmin ? 'items-end' : 'items-start'}`}>
                    <p className="text-xs font-bold" style={{ color: '#64748b' }}>{msg.sender_name || msg.sender}</p>
                    <div className="px-3 py-2 rounded-2xl text-sm"
                         style={{ background: isAdmin ? P : '#f1f5f9', color: isAdmin ? 'white' : '#374151' }}>
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

// ─── Classes virtuelles view (grid + detail) ─────────────────────────────────
function VirtualClassroomsCatalogView({ onManage }) {
  const { data, loading } = useApi(() => elearningService.getClassrooms({ page_size: 100 }), [], true);
  const all = data?.results ?? data ?? [];
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const live     = all.filter(c => classStatus(c) === 'live');
  const upcoming = all.filter(c => classStatus(c) === 'upcoming');
  const ended    = all.filter(c => classStatus(c) === 'ended');

  const filtered = filter === 'live' ? live : filter === 'upcoming' ? upcoming : filter === 'ended' ? ended : all;

  if (selected) {
    return <AdminVirtualClassDetailView classroom={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>Classes virtuelles</h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>Gérez vos sessions d'apprentissage en direct</p>
        </div>
        <button onClick={onManage}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white flex-shrink-0 w-full sm:w-auto"
          style={{ background: `linear-gradient(135deg,${P},#be185d)`, boxShadow: `0 4px 14px ${P}40` }}>
          <Plus className="h-4 w-4" /> Nouvelle classe
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Wifi}    value={live.length}     label="En direct"  color="#dc2626" bg="#fef2f2" />
        <StatCard icon={Clock}   value={upcoming.length} label="À venir"    color="#2563eb" bg="#dbeafe" />
        <StatCard icon={WifiOff} value={ended.length}    label="Passées"    color="#64748b" bg="#f1f5f9" />
      </div>

      <div className="flex gap-2 flex-wrap">
        {[['all', 'Toutes'], ['live', 'En direct'], ['upcoming', 'À venir'], ['ended', 'Passées']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
                  className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  style={filter === k ? { background: P, color: 'white' } : { background: 'white', color: '#64748b', border: '1.5px solid #f0f4f9' }}>
            {k === 'live' && <span className="inline-block h-2 w-2 rounded-full bg-red-500 mr-1.5 align-middle" />}
            {l}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 rounded-2xl" style={{ border: '1.5px dashed #e2e8f0' }}>
          <MonitorPlay className="h-12 w-12 mb-3 opacity-20" style={{ color: P }} />
          <p className="text-sm font-bold" style={{ color: '#64748b' }}>Aucune classe virtuelle</p>
          <button onClick={onManage} className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white"
                  style={{ background: `linear-gradient(135deg,${P},#be185d)` }}>
            <Plus className="h-4 w-4" /> Créer une session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(c => {
            const st = classStatus(c);
            const isLive = st === 'live';
            const isUpcoming = st === 'upcoming';
            const stStyle = isLive
              ? { color: '#dc2626', bg: 'linear-gradient(135deg,#dc2626,#ef4444)', badge: '#fef2f2', badgeText: '#dc2626', label: 'En direct' }
              : isUpcoming
              ? { color: '#2563eb', bg: 'linear-gradient(135deg,#2563eb,#3b82f6)', badge: '#dbeafe', badgeText: '#2563eb', label: 'Planifiée' }
              : { color: '#64748b', bg: 'linear-gradient(135deg,#64748b,#94a3b8)', badge: '#f1f5f9', badgeText: '#64748b', label: 'Terminée' };
            return (
              <div key={c.id} onClick={() => setSelected(c)}
                   className="rounded-2xl overflow-hidden flex flex-col cursor-pointer"
                   style={{ background: 'white', border: '1.5px solid #f0f4f9', transition: 'box-shadow .2s, transform .2s' }}
                   onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 6px 24px ${P}20`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                   onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}>
                {/* Header */}
                <div className="h-28 flex items-center justify-center relative" style={{ background: stStyle.bg }}>
                  <MonitorPlay className="h-10 w-10 text-white opacity-80" />
                  {isLive && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                         style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                      <span className="text-xs font-bold text-white">LIVE</span>
                    </div>
                  )}
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background: 'rgba(255,255,255,0.9)', color: stStyle.color }}>{stStyle.label}</span>
                </div>
                {/* Body */}
                <div className="p-4 flex-1 space-y-1.5">
                  <h3 className="text-sm font-black line-clamp-2" style={{ color: '#0f172a' }}>{c.title}</h3>
                  <p className="text-xs flex items-center gap-1" style={{ color: '#64748b' }}>
                    <Clock className="h-3 w-3" /> {fmtDT(c.start_time)} · {c.duration_minutes || 60} min
                  </p>
                  {c.students_count > 0 && (
                    <p className="text-xs flex items-center gap-1" style={{ color: '#94a3b8' }}>
                      <Users className="h-3 w-3" /> {c.students_count} participant{c.students_count > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <div className="px-4 pb-4">
                  <div className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold"
                       style={{ background: stStyle.badge, color: stStyle.color }}>
                    {isLive ? <><Video className="h-3.5 w-3.5" /> Rejoindre</> : isUpcoming ? <><Clock className="h-3.5 w-3.5" /> Voir les détails</> : <><Play className="h-3.5 w-3.5" /> Voir les détails</>}
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

// ─── Manage Evaluations wrapper (LMS Pro table style) ────────────────────────
function ManageEvaluationsView() {
  const [tab, setTab] = useState('quiz');
  const { notify } = useNotifications();
  const { data: quizzesData, loading } = useApi(() => elearningService.getQuizzes({ page_size: 100 }), [], true);
  const quizzes = quizzesData?.results ?? quizzesData ?? [];

  const { data: classesData } = useApi(() => academicService.getClasses({ is_active: true, page_size: 500 }), [], true);
  const classesList = classesData?.results || classesData || [];
  const { data: subjectsData } = useApi(() => academicService.getSubjects({ page_size: 500 }), [], true);
  const subjectsList = subjectsData?.results || subjectsData || [];
  const { data: lessonsData } = useApi(() => elearningService.getLessons({ is_active: true, page_size: 200 }), [], true);
  const lessons = lessonsData?.results || lessonsData || [];

  const total = quizzes.length;
  const published = quizzes.filter(q => q.is_published).length;
  const drafts = total - published;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>Gérer les évaluations</h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>Créez, configurez et organisez vos évaluations et banques de questions</p>
        </div>
        <WorkflowHelpButton defaultTab="admin" />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1 rounded-xl w-fit" style={{ background: '#f1f5f9' }}>
        {[{ id: 'quiz',        label: 'Quiz & Évaluations',  icon: ClipboardCheck },
          { id: 'devoirs',     label: 'Devoirs & Exercices', icon: GanttChartSquare },
          { id: 'examens',     label: 'Examens sécurisés',   icon: Shield },
          { id: 'corrections', label: 'Corrections',          icon: Star },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background: tab === t.id ? '#fff' : 'transparent', color: tab === t.id ? P : '#64748b', boxShadow: tab === t.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none' }}>
            <t.icon className="h-3.5 w-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      {tab === 'quiz' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={ClipboardList} value={total} label="Total" color={P} bg={P_BG} />
          <StatCard icon={CheckCircle2} value={published} label="Publiées" color="#059669" bg="#d1fae5" />
          <StatCard icon={ClipboardCheck} value={drafts} label="Brouillons" color="#d97706" bg="#fef3c7" />
        </div>
      )}

      {/* Content */}
      {tab === 'quiz'        && <QuizManager classesList={classesList} subjectsList={subjectsList} lessons={lessons} notify={notify} />}
      {tab === 'devoirs'     && <AssignmentManager classesList={classesList} subjectsList={subjectsList} selectedClass="" notify={notify} />}
      {tab === 'examens'     && <ExamManager classesList={classesList} subjectsList={subjectsList} notify={notify} />}
      {tab === 'corrections' && <CorrectionHub notify={notify} />}
    </div>
  );
}

// ─── Manage Courses wrapper ───────────────────────────────────────────────────
function ManageCoursesView({ initialCourse, onCourseOpened, onSaved }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>Gérer mes cours</h1>
        <p className="text-sm mt-1" style={{ color: '#64748b' }}>Créez, modifiez et organisez le contenu de vos formations</p>
      </div>
      <CourseManager initialCourse={initialCourse} onCourseOpened={onCourseOpened} onSaved={onSaved} />
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({ activeTab, setActiveTab, collapsed, setCollapsed }) {
  const navigate = useNavigate();

  return (
    <aside className="flex flex-col h-full bg-white transition-all duration-300 flex-shrink-0"
      style={{ width: collapsed ? 64 : 'min(256px, 78vw)', borderRight: '1.5px solid #f1f5f9' }}>
      {/* Logo + toggle */}
      {collapsed ? (
        /* Collapsed: only the expand button centred in the 64px slot */
        <div className="flex items-center justify-center py-5 flex-shrink-0"
             style={{ borderBottom: '1.5px solid #f1f5f9', height: 72 }}>
          <button onClick={() => setCollapsed(false)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center transition-all hover:bg-pink-50"
                  style={{ color: P }}>
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
      ) : (
        /* Expanded: logo + title + collapse button */
        <div className="flex items-center gap-3 px-4 py-5 flex-shrink-0"
             style={{ borderBottom: '1.5px solid #f1f5f9', height: 72 }}>
          <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: `linear-gradient(135deg,${P},#be185d)` }}>
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-extrabold leading-tight" style={{ color: '#0f172a' }}>CampusLMS</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>E-Learning</p>
          </div>
          <button onClick={() => setCollapsed(true)}
                  className="h-7 w-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0 hover:bg-pink-50"
                  style={{ color: '#94a3b8' }}>
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-4 px-2">
        {NAV_SECTIONS.map(section => (
          <div key={section.group}>
            {!collapsed && (
              <p className="px-2 mb-1 text-[10px] font-extrabold uppercase tracking-widest" style={{ color: '#94a3b8' }}>
                {section.group}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(item => {
                const active = activeTab === item.id;
                return (
                  <button key={item.id} onClick={() => setActiveTab(item.id)}
                    title={collapsed ? item.label : undefined}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                    style={{
                      background: active ? P_BG : 'transparent',
                      color: active ? P : '#475569',
                      borderLeft: active ? `3px solid ${P}` : '3px solid transparent',
                    }}>
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && <span className="text-sm font-semibold truncate">{item.label}</span>}
                    {active && !collapsed && <span className="ml-auto h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: P }} />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Back button */}
      <div className="px-2 py-3" style={{ borderTop: '1.5px solid #f1f5f9' }}>
        <button onClick={() => navigate('/admin')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-slate-50"
          style={{ color: '#64748b' }}>
          <ChevronLeft className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-semibold">Retour Admin</span>}
        </button>
      </div>
    </aside>
  );
}

// ─── Content router ───────────────────────────────────────────────────────────
function ContentArea({ activeTab, setActiveTab, editingCourse, setEditingCourse }) {
  const { notify } = useNotifications();

  const { data: classesData } = useApi(() => academicService.getClasses({ is_active: true, page_size: 500 }), [], true);
  const classesList = classesData?.results || classesData || [];
  const { data: subjectsData } = useApi(() => academicService.getSubjects({ page_size: 500 }), [], true);
  const subjectsList = subjectsData?.results || subjectsData || [];
  const { data: lessonsData } = useApi(() => elearningService.getLessons({ is_active: true, page_size: 200 }), [], true);
  const lessonsList = lessonsData?.results || lessonsData || [];

  const [courseToView, setCourseToView] = useState(null);

  const handleManageCourse = (course) => {
    setEditingCourse(course || null);
    setActiveTab('manage-cours');
  };

  // After a course is created or updated, land back on its detail page instead
  // of staying in the editor.
  const handleCourseSaved = (course) => {
    setCourseToView(course);
    setActiveTab('cours');
  };

  switch (activeTab) {
    case 'cours':
      return (
        <CourseCatalogView
          onManage={handleManageCourse}
          initialSelectedCourse={courseToView}
          onInitialCourseConsumed={() => setCourseToView(null)}
        />
      );
    case 'manage-cours':
      return <ManageCoursesView initialCourse={editingCourse} onCourseOpened={() => setEditingCourse(null)} onSaved={handleCourseSaved} />;
    case 'evaluations':
      return <EvaluationsCatalogView onManage={() => setActiveTab('manage-eval')} />;
    case 'manage-eval':
      return <ManageEvaluationsView />;
    case 'classes-virt':
      return <VirtualClassroomManager />;
    case 'pedagogie':
      return (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>Gestion Pédagogique</h1>
              <p className="text-sm mt-1" style={{ color: '#64748b' }}>Filières, niveaux et classes</p>
            </div>
          </div>
          <PedagogicalManager showHeader={false} />
        </div>
      );
    case 'devoirs':
      return (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>Devoirs & Exercices</h1>
            <p className="text-sm mt-1" style={{ color: '#64748b' }}>Gérez les devoirs et exercices des étudiants</p>
          </div>
          <AssignmentManager classesList={classesList} subjectsList={subjectsList} selectedClass="" notify={notify} />
        </div>
      );
    case 'examens':
      return (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>Examens sécurisés</h1>
            <p className="text-sm mt-1" style={{ color: '#64748b' }}>Gérez les examens et sessions d'évaluation</p>
          </div>
          <ExamManager classesList={classesList} subjectsList={subjectsList} notify={notify} />
        </div>
      );
    case 'labos':
      return (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>Laboratoires virtuels</h1>
            <p className="text-sm mt-1" style={{ color: '#64748b' }}>Gérez les laboratoires pratiques en ligne</p>
          </div>
          <VirtualLabManager classesList={classesList} subjectsList={subjectsList} lessons={lessonsList} selectedClass="all" notify={notify} />
        </div>
      );
    case 'bibliotheque':
      return (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>Bibliothèque numérique</h1>
            <p className="text-sm mt-1" style={{ color: '#64748b' }}>Gérez les ressources documentaires</p>
          </div>
          <LibraryManager />
        </div>
      );
    case 'videoteque':
      return (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>Vidéothèque</h1>
            <p className="text-sm mt-1" style={{ color: '#64748b' }}>Gérez vos ressources vidéo pédagogiques</p>
          </div>
          <VideoLibraryManager />
        </div>
      );
    case 'ia':
      return (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>IA Enseignant</h1>
            <p className="text-sm mt-1" style={{ color: '#64748b' }}>Assistants IA pour la création de contenu pédagogique</p>
          </div>
          <AITeacherPanel />
        </div>
      );
    case 'lecons':
      return <LessonsHub />;
    case 'progression':
      return (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>Progression des étudiants</h1>
            <p className="text-sm mt-1" style={{ color: '#64748b' }}>Suivez l'avancement des étudiants sur les leçons et cours</p>
          </div>
          <div className="flex flex-col items-center py-20 rounded-2xl" style={{ border: '1.5px dashed #e2e8f0', background: '#fff' }}>
            <TrendingUp className="h-12 w-12 mb-4 opacity-20" style={{ color: P }} />
            <p className="text-sm font-bold" style={{ color: '#64748b' }}>Module progression en cours de développement</p>
            <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Cette fonctionnalité sera disponible prochainement</p>
          </div>
        </div>
      );
    case 'sessions':
      return <ZoomSessionsHub />;
    default:
      return null;
  }
}

// ─── Error boundary ───────────────────────────────────────────────────────────
class SectionErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl" style={{ border: '1.5px dashed #fca5a5', background: '#fff5f5' }}>
          <p className="text-sm font-bold" style={{ color: '#dc2626' }}>Une erreur est survenue dans cette section.</p>
          <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ error: null })} className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: '#dc2626' }}>
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Main hub ─────────────────────────────────────────────────────────────────
export default function ELearningHub() {
  const [activeTab, setActiveTab] = useState('cours');
  const [collapsed, setCollapsed] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8fafc' }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} collapsed={collapsed} setCollapsed={setCollapsed} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
          <SectionErrorBoundary key={activeTab}>
            <ContentArea
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              editingCourse={editingCourse}
              setEditingCourse={setEditingCourse}
            />
          </SectionErrorBoundary>
        </div>
      </main>
    </div>
  );
}
