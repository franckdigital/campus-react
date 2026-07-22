import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit, Trash2, BookOpen, FileText, Video, ClipboardList, ClipboardCheck, Upload, X, Calendar, Clock, Users, GraduationCap, CheckCircle, ExternalLink, Play, Link2, Layers, Type, Code, Film, Music, Image as ImageIcon, Paperclip, Youtube, MonitorPlay, GripVertical, Eye, Shield, FlaskConical, Bot, TrendingUp, BarChart2, Sparkles, Award, LayoutDashboard } from 'lucide-react';
import { academicService, elearningService } from '../../services';
import { useApi } from '../../hooks/useApi';
import { useSite } from '../../contexts/SiteContext';
import { useNotifications } from '../../components/Notifications';
import { useConfirm } from '../../components/ConfirmDialog';
import { PageHeader, PrimaryButton, IconBtn, Pagination } from '../../components/ui/PageHeader';
import CourseManager from './CourseManager';
import QuizManager from './quiz/QuizManager';
import LibraryManager from './LibraryManager';
import ExamManager from './ExamManager';
import VirtualLabManager from './VirtualLabManager';
import AITeacherPanel from './AITeacherPanel';
import VideoLibraryManager from './VideoLibraryManager';
import VirtualClassroomManager from './VirtualClassroomManager';
import PedagogicalManager from '../../components/academic/PedagogicalManager';
import AssignmentManager from './AssignmentManager';

const COLOR = '#db2777'; const COLOR_BG = '#fdf2f8'; const COLOR_ICON = '#fce7f3';
const ITEMS_PER_PAGE = 8;

const BLOCK_TYPES = [
  { type: 'TEXT',    label: 'Texte',   icon: Type,       color: '#64748b' },
  { type: 'HTML',     label: 'HTML',    icon: Code,       color: '#0ea5e9' },
  { type: 'VIDEO',    label: 'Vidéo',   icon: Film,       color: '#db2777', file: true },
  { type: 'AUDIO',    label: 'Audio',   icon: Music,      color: '#7c3aed', file: true },
  { type: 'IMAGE',    label: 'Image',   icon: ImageIcon,  color: '#059669', file: true },
  { type: 'PDF',      label: 'PDF',     icon: FileText,   color: '#ef4444', file: true },
  { type: 'FILE',     label: 'Fichier', icon: Paperclip,  color: '#94a3b8', file: true },
  { type: 'YOUTUBE',  label: 'YouTube', icon: Youtube,    color: '#ef4444', url: true },
  { type: 'VIMEO',    label: 'Vimeo',   icon: MonitorPlay,color: '#1ab7ea', url: true },
  { type: 'IFRAME',   label: 'Iframe',  icon: Link2,      color: '#6366f1', url: true },
];
const getBlockMeta = (type) => BLOCK_TYPES.find(b => b.type === type) || BLOCK_TYPES[0];

const ModalShell = ({ open, onClose, title, subtitle, zIndex = 50, size = 'md', color = COLOR, children }) => {
  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-3xl' };
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4" style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', zIndex }}
      onClick={onClose}>
      <div className={`bg-white rounded-2xl w-full ${widths[size]} max-h-[90vh] overflow-y-auto`}
        style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.2), 0 8px 32px rgba(0,0,0,0.1)' }}
        onClick={e => e.stopPropagation()}>
        <div className="h-1 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${color}, #6366f1, #8b5cf6)` }} />
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4" style={{ background: `linear-gradient(135deg, #fafbff, #ffffff)`, borderBottom: '1px solid #f1f5f9' }}>
          <div className="min-w-0">
            <h2 className="text-base font-extrabold truncate" style={{ color: '#0f172a' }}>{title}</h2>
            {subtitle && <p className="text-xs font-semibold mt-0.5 truncate" style={{ color: '#94a3b8' }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
            style={{ color: '#64748b' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 sm:p-6 space-y-4">{children}</div>
      </div>
    </div>,
    document.body
  );
};

const Field = ({ label, required, children }) => (
  <div>
    <label className="block mb-1.5" style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
    </label>
    {children}
  </div>
);

const ModalFooter = ({ onCancel, loading, submitLabel, color = COLOR }) => (
  <div className="flex justify-end gap-3 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
    <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:bg-slate-50"
      style={{ color: '#64748b', borderColor: '#e2e8f0' }}>Annuler</button>
    <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
      style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, boxShadow: `0 4px 14px ${color}40` }}
      onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${color}55`; } }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 14px ${color}40`; }}>
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          Enregistrement…
        </span>
      ) : submitLabel}
    </button>
  </div>
);

// ─── Lesson Progress Dashboard (Lot 7 & 10) ─────────────────────────────────
function LessonProgressDashboard({ classesList, subjectsList }) {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!selectedClass || !selectedSubject) return;
    setLoading(true); setError('');
    try {
      const res = await elearningService.getLessonProgressOverview(selectedClass, selectedSubject);
      setData(res.data || res);
    } catch {
      setError('Impossible de charger les données de progression.');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [selectedClass, selectedSubject]);

  const lessons = data?.lessons || [];
  const students = data?.students || [];

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSubject(''); }}
          className="input-field w-48 cursor-pointer">
          <option value="">Toutes les classes</option>
          {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
          className="input-field w-48 cursor-pointer" disabled={!selectedClass}>
          <option value="">Toutes les matières</option>
          {subjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {!selectedClass || !selectedSubject ? (
        <div className="flex flex-col items-center py-20 rounded-2xl" style={{ border: '1.5px dashed #e2e8f0' }}>
          <TrendingUp className="h-10 w-10 mb-3 opacity-30" style={{ color: COLOR }} />
          <p className="text-sm font-semibold" style={{ color: '#64748b' }}>Sélectionnez une classe et une matière</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-10 text-red-500 text-sm">{error}</div>
      ) : (
        <div className="space-y-5">
          {/* Per-lesson completion heatmap */}
          {lessons.length > 0 && (
            <div className="bg-white rounded-2xl p-5" style={{ border: '1.5px solid #f0f4f9' }}>
              <p className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                <BarChart2 className="h-4 w-4" style={{ color: COLOR }} /> Taux de complétion par leçon
              </p>
              <div className="space-y-3">
                {lessons.map(l => (
                  <div key={l.lesson_id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700 truncate max-w-xs">{l.lesson_title}</span>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-gray-400">{l.started} ont commencé</span>
                        <span className="font-bold" style={{ color: l.completion_rate >= 70 ? '#059669' : l.completion_rate >= 40 ? '#d97706' : '#ef4444' }}>
                          {l.completion_rate.toFixed(0)}% fini
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${l.completion_rate}%`,
                          background: l.completion_rate >= 70 ? '#059669' : l.completion_rate >= 40 ? '#f59e0b' : '#ef4444',
                        }} />
                    </div>
                    {l.avg_watch_percent > 0 && (
                      <p className="text-[10px] text-gray-400">Visionnage moyen : {l.avg_watch_percent.toFixed(0)}%</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-student progress table */}
          {students.length > 0 && (
            <div className="bg-white rounded-2xl p-5" style={{ border: '1.5px solid #f0f4f9' }}>
              <p className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                <Users className="h-4 w-4" style={{ color: COLOR }} /> Progression par étudiant
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                      <th className="pb-2 font-bold">Étudiant</th>
                      <th className="pb-2 font-bold text-center">Terminées</th>
                      <th className="pb-2 font-bold text-center">Total</th>
                      <th className="pb-2 font-bold text-right">Progression</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {students.map(s => (
                      <tr key={s.student_id}>
                        <td className="py-2.5 font-medium text-gray-800">{s.student_name}</td>
                        <td className="py-2.5 text-center font-bold text-green-600">{s.completed}</td>
                        <td className="py-2.5 text-center text-gray-500">{s.total}</td>
                        <td className="py-2.5">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full"
                                style={{ width: `${s.percent}%`, background: s.percent >= 70 ? '#059669' : s.percent >= 40 ? '#f59e0b' : '#ef4444' }} />
                            </div>
                            <span className="text-xs font-bold w-9 text-right"
                              style={{ color: s.percent >= 70 ? '#059669' : s.percent >= 40 ? '#d97706' : '#ef4444' }}>
                              {s.percent.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {lessons.length === 0 && students.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">Aucune donnée de progression disponible.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Soumissions & correction automatique IA (Lot 17) ───────────────────────
const SUBMISSION_STATUS = {
  SUBMITTED: { label: 'Soumis', bg: '#dbeafe', color: '#1d4ed8' },
  LATE:      { label: 'En retard', bg: '#fef3c7', color: '#92400e' },
  GRADED:    { label: 'Noté', bg: '#d1fae5', color: '#065f46' },
  RETURNED:  { label: 'Rendu', bg: '#ede9fe', color: '#6d28d9' },
};

function GradeSubmissionCard({ submission, assignment, onGraded, notify }) {
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  const graded = !!submission.correction;
  const st = SUBMISSION_STATUS[submission.status] || SUBMISSION_STATUS.SUBMITTED;

  const handleAIGrade = async () => {
    setAiLoading(true);
    try {
      const res = await elearningService.aiGradeSubmission({
        submission_id: submission.id,
        grading_criteria: assignment.instructions || assignment.description || '',
        max_score: assignment.max_score,
      });
      const r = res.ai_result || {};
      setAiResult(r);
      setScore(r.score != null ? String(r.score) : '');
      setFeedback(r.feedback || '');
      setShowForm(true);
    } catch (err) {
      notify({ type: 'error', title: 'Erreur IA', message: err.message || 'Erreur de correction automatique' });
    } finally { setAiLoading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (score === '') return;
    setSaving(true);
    try {
      await elearningService.gradeSubmission(submission.id, { score: parseFloat(score), feedback });
      notify({ type: 'success', title: 'Devoir corrigé', message: 'La note a été enregistrée' });
      onGraded();
    } catch (err) {
      notify({ type: 'error', title: 'Erreur', message: err.message || "Erreur lors de l'enregistrement" });
    } finally { setSaving(false); }
  };

  return (
    <div className="rounded-xl p-4" style={{ border: '1.5px solid #f0f4f9' }}>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
        <div>
          <p className="text-sm font-bold" style={{ color: '#0f172a' }}>{submission.student_name}</p>
          <p className="text-xs" style={{ color: '#94a3b8' }}>{submission.student_matricule} · {new Date(submission.submitted_at).toLocaleString('fr-FR')}</p>
        </div>
        <div className="flex items-center gap-2">
          {submission.is_late && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#fef3c7', color: '#92400e' }}>En retard</span>}
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
        </div>
      </div>

      {submission.content && <p className="text-xs whitespace-pre-wrap rounded-lg p-2.5 mb-2" style={{ background: '#f8faff', color: '#475569' }}>{submission.content}</p>}
      {submission.file && (
        <a href={submission.file} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold mb-2" style={{ color: COLOR }}>
          <FileText className="h-3.5 w-3.5" /> Voir le fichier joint
        </a>
      )}

      {graded ? (
        <div className="flex items-center gap-3 p-3 rounded-xl mt-2" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <Award className="h-6 w-6 flex-shrink-0" style={{ color: '#059669' }} />
          <div>
            <p className="text-sm font-bold" style={{ color: '#065f46' }}>Note : {submission.correction.score} / {assignment.max_score}</p>
            {submission.correction.feedback && <p className="text-xs mt-0.5" style={{ color: '#15803d' }}>{submission.correction.feedback}</p>}
            <p className="text-[10px] mt-0.5" style={{ color: '#86efac' }}>Corrigé par {submission.correction.corrected_by_name || '—'}</p>
          </div>
        </div>
      ) : showForm ? (
        <form onSubmit={handleSave} className="space-y-2.5 mt-2 p-3 rounded-xl" style={{ background: '#faf5ff', border: '1px solid #e9d5ff' }}>
          {aiResult && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wide flex items-center gap-1" style={{ color: '#7c3aed' }}>
                <Sparkles className="h-3 w-3" /> Suggestion IA
              </p>
              {Array.isArray(aiResult.strengths) && aiResult.strengths.length > 0 && (
                <p className="text-xs" style={{ color: '#15803d' }}><strong>Points forts :</strong> {aiResult.strengths.join(', ')}</p>
              )}
              {Array.isArray(aiResult.weaknesses) && aiResult.weaknesses.length > 0 && (
                <p className="text-xs" style={{ color: '#92400e' }}><strong>Points faibles :</strong> {aiResult.weaknesses.join(', ')}</p>
              )}
              {Array.isArray(aiResult.suggestions) && aiResult.suggestions.length > 0 && (
                <p className="text-xs" style={{ color: '#0369a1' }}><strong>Suggestions :</strong> {aiResult.suggestions.join(', ')}</p>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input type="number" step="0.01" min="0" max={assignment.max_score} required value={score}
              onChange={e => setScore(e.target.value)} placeholder="Note" className="input-field w-24 text-sm" />
            <span className="text-xs font-semibold" style={{ color: '#94a3b8' }}>/ {assignment.max_score}</span>
          </div>
          <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={3} placeholder="Commentaire pour l'étudiant…"
            className="input-field resize-none text-sm w-full" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-xs font-semibold" style={{ color: '#64748b' }}>Annuler</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50" style={{ background: COLOR }}>
              {saving ? 'Enregistrement…' : 'Valider la note'}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-2 mt-2">
          <button onClick={handleAIGrade} disabled={aiLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, #7c3aed, #db2777)` }}>
            {aiLoading ? <><span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />Analyse en cours…</> : <><Bot className="h-3.5 w-3.5" />Corriger avec l'IA</>}
          </button>
          <button onClick={() => setShowForm(true)} className="text-xs font-semibold" style={{ color: COLOR }}>Noter manuellement</button>
        </div>
      )}
    </div>
  );
}

function SubmissionsPanel({ assignment, notify }) {
  const { data, loading, refetch } = useApi(() => elearningService.getSubmissions(assignment.id), [assignment.id], true);
  const submissions = data?.results || data || [];

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="flex justify-center py-10"><div className="h-7 w-7 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin" /></div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-10" style={{ color: '#94a3b8' }}>
          <ClipboardCheck className="h-9 w-9 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucune soumission pour ce devoir</p>
        </div>
      ) : (
        submissions.map(s => (
          <GradeSubmissionCard key={s.id} submission={s} assignment={assignment} onGraded={refetch} notify={notify} />
        ))
      )}
    </div>
  );
}

export default function ELearning() {
  const { selectedSite } = useSite();
  const { notify } = useNotifications();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedClass, setSelectedClass] = useState('all');
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [submissionsAssignment, setSubmissionsAssignment] = useState(null);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPageLessons, setCurrentPageLessons] = useState(1);
  const [currentPageZoom, setCurrentPageZoom] = useState(1);
  const [currentPageAssignments, setCurrentPageAssignments] = useState(1);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [zoomCreationMode, setZoomCreationMode] = useState('manual');
  const [sessionFormData, setSessionFormData] = useState({ class_obj: '', subject: '', day_of_week: 0, start_time: '08:00', end_time: '10:00' });

  const modalRef = useRef(null);
  const sessionModalRef = useRef(null);
  const subjectModalRef = useRef(null);

  const [lessonFormData, setLessonFormData] = useState({ title: '', description: '', content: '', class_obj: '', subject: '', chapter: '', order: 1, file: null, min_watch_percent: 100, min_duration_minutes: 0, requires_assignment: false, requires_quiz: false });
  const [showLessonModalFromZoom, setShowLessonModalFromZoom] = useState(false);
  const [showLessonModalFromAssignment, setShowLessonModalFromAssignment] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [showLockSettings, setShowLockSettings] = useState(false);
  const lessonModalRef = useRef(null);

  // Créateur de cours (course builder)
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const [builderLesson, setBuilderLesson] = useState(null);
  const [builderBlocks, setBuilderBlocks] = useState([]);
  const [builderLoading, setBuilderLoading] = useState(false);
  const [showBlockEditor, setShowBlockEditor] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [blockForm, setBlockForm] = useState({ block_type: 'TEXT', title: '', content: '', url: '', file: null });
  const [savingBlock, setSavingBlock] = useState(false);
  const [draggedBlockId, setDraggedBlockId] = useState(null);

  const [assignmentFormData, setAssignmentFormData] = useState({ title: '', description: '', instructions: '', class_obj: '', subject: '', due_date: '', max_score: 20, file: null, lesson: '' });
  const [zoomFormData, setZoomFormData] = useState({ session: '', topic: '', start_time: '', duration: 60, meeting_id: '', join_url: '', password: '', lesson: '' });

  const siteFilter = selectedSite !== 'all' ? { site: selectedSite } : {};
  const { data: classesData } = useApi(() => academicService.getClasses({ is_active: true, ...siteFilter, page_size: 500 }), [selectedSite], true);
  const classesList = classesData?.results || classesData || [];

  const { data: subjectsData } = useApi(() => academicService.getSubjects({ page_size: 500 }), [], true);
  const subjectsList = subjectsData?.results || subjectsData || [];

  const { data: sessionsData } = useApi(() => academicService.getSessions({ is_active: true, ...siteFilter }), [selectedSite], true);
  const sessionsList = sessionsData?.results || sessionsData || [];

  const classFilter = selectedClass !== 'all' ? { class_obj: selectedClass } : {};
  const { data: lessonsData, refetch: refetchLessons } = useApi(() => elearningService.getLessons({ ...classFilter, is_active: true }), [selectedClass], true);
  const lessons = lessonsData?.results || lessonsData || [];

  const { data: assignmentsData, refetch: refetchAssignments } = useApi(() => elearningService.getAssignments({ ...classFilter, is_active: true, page_size: 200 }), [selectedClass], true);
  const assignments = assignmentsData?.results || assignmentsData || [];

  const { data: zoomData, refetch: refetchZoom } = useApi(() => elearningService.getZoomMeetings({ is_active: true }), [], true);
  const zoomMeetings = zoomData?.results || zoomData || [];

  const { data: chaptersData, refetch: refetchChapters } = useApi(
    () => (lessonFormData.class_obj && lessonFormData.subject)
      ? elearningService.getChapters({ class_obj: lessonFormData.class_obj, subject: lessonFormData.subject, is_active: true })
      : Promise.resolve({ results: [] }),
    [lessonFormData.class_obj, lessonFormData.subject],
    true
  );
  const chaptersList = chaptersData?.results || chaptersData || [];

  const totalPagesLessons = Math.ceil(lessons.length / ITEMS_PER_PAGE);
  const paginatedLessons = lessons.slice((currentPageLessons - 1) * ITEMS_PER_PAGE, currentPageLessons * ITEMS_PER_PAGE);
  const totalPagesZoom = Math.ceil(zoomMeetings.length / ITEMS_PER_PAGE);
  const paginatedZoom = zoomMeetings.slice((currentPageZoom - 1) * ITEMS_PER_PAGE, currentPageZoom * ITEMS_PER_PAGE);
  const totalPagesAssignments = Math.ceil(assignments.length / ITEMS_PER_PAGE);
  const paginatedAssignments = assignments.slice((currentPageAssignments - 1) * ITEMS_PER_PAGE, currentPageAssignments * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPageLessons(1); setCurrentPageZoom(1); setCurrentPageAssignments(1); }, [selectedClass]);
  useEffect(() => setCurrentPageLessons(1), [activeTab]);
  useEffect(() => setCurrentPageZoom(1), [activeTab]);
  useEffect(() => setCurrentPageAssignments(1), [activeTab]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSessionModal || showSubjectModal || showLessonModalFromZoom || showLessonModalFromAssignment) return;
      if (modalRef.current && !modalRef.current.contains(event.target)) closeAllModals();
    };
    if (showLessonModal || showZoomModal || showAssignmentModal) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLessonModal, showZoomModal, showAssignmentModal, showSessionModal, showSubjectModal, showLessonModalFromZoom, showLessonModalFromAssignment]);

  const closeAllModals = () => {
    setShowLessonModal(false); setShowZoomModal(false); setShowAssignmentModal(false);
    setShowSubjectModal(false); setShowSessionModal(false);
    setShowLessonModalFromZoom(false); setShowLessonModalFromAssignment(false);
    setEditingItem(null); resetForms();
  };

  const isLiveMeeting = (meeting) => {
    const now = new Date(); const startTime = new Date(meeting.start_time);
    const endTime = new Date(startTime.getTime() + meeting.duration * 60000);
    const earlyJoin = new Date(startTime.getTime() - 15 * 60000);
    return now >= earlyJoin && now <= endTime;
  };

  const isUpcomingMeeting = (meeting) => {
    const now = new Date(); const startTime = new Date(meeting.start_time);
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60000);
    return startTime > now && startTime <= in24Hours;
  };

  const openZoomMeeting = (meeting) => {
    if (meeting.join_url) window.open(meeting.join_url, '_blank', 'noopener,noreferrer');
    else notify({ type: 'error', title: 'Erreur', message: 'Lien Zoom non disponible' });
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    setLoading(true);
    try {
      await academicService.createSubject({ name: newSubjectName, code: newSubjectCode || newSubjectName.substring(0, 3).toUpperCase() });
      notify({ type: 'success', title: 'Matière créée', message: 'La nouvelle matière a été créée' });
      window.location.reload();
      setShowSubjectModal(false); setNewSubjectName(''); setNewSubjectCode('');
    } catch (err) {
      const msg = err.message?.includes('code') ? 'Ce code de matière existe déjà.' : 'Erreur lors de la création de la matière';
      notify({ type: 'error', title: 'Erreur', message: msg });
    } finally { setLoading(false); }
  };

  const handlePublishLesson = async (lesson) => {
    try { await elearningService.publishLesson(lesson.id); notify({ type: 'success', title: 'Leçon publiée', message: 'La leçon a été publiée' }); refetchLessons(); }
    catch (err) { notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la publication' }); }
  };

  const resetForms = () => {
    setLessonFormData({ title: '', description: '', content: '', class_obj: '', subject: '', chapter: '', order: 1, file: null, min_watch_percent: 100, min_duration_minutes: 0, requires_assignment: false, requires_quiz: false });
    setAssignmentFormData({ title: '', description: '', instructions: '', class_obj: '', subject: '', due_date: '', max_score: 20, file: null, lesson: '' });
    setZoomFormData({ session: '', topic: '', start_time: '', duration: 60, meeting_id: '', join_url: '', password: '', lesson: '' });
    setSessionFormData({ class_obj: '', subject: '', day_of_week: 0, start_time: '08:00', end_time: '10:00' });
    setShowLockSettings(false);
  };

  const handleCreateChapter = async (e) => {
    e.preventDefault();
    if (!newChapterTitle.trim()) return;
    if (!lessonFormData.class_obj || !lessonFormData.subject) {
      return notify({ type: 'error', title: 'Erreur', message: 'Sélectionnez d\'abord une classe et une matière' });
    }
    setLoading(true);
    try {
      const chapter = await elearningService.createChapter({
        title: newChapterTitle, class_obj: lessonFormData.class_obj, subject: lessonFormData.subject,
        order: chaptersList.length, is_published: true,
      });
      notify({ type: 'success', title: 'Chapitre créé', message: 'Le nouveau chapitre a été créé' });
      setShowChapterModal(false); setNewChapterTitle('');
      refetchChapters();
      setLessonFormData(p => ({ ...p, chapter: chapter.id }));
    } catch (err) {
      notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la création du chapitre' });
    } finally { setLoading(false); }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await academicService.createSession(sessionFormData); notify({ type: 'success', title: 'Séance créée', message: 'La nouvelle séance a été créée' }); window.location.reload(); }
    catch (err) { notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la création de la séance' }); }
    finally { setLoading(false); }
  };

  const handleLessonSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const payload = {
        title: lessonFormData.title, description: lessonFormData.description, content: lessonFormData.content,
        class_obj: lessonFormData.class_obj, subject: lessonFormData.subject, order: lessonFormData.order,
        chapter: lessonFormData.chapter || null,
        min_watch_percent: lessonFormData.min_watch_percent,
        min_duration_seconds: (lessonFormData.min_duration_minutes || 0) * 60,
        requires_assignment: lessonFormData.requires_assignment,
        requires_quiz: lessonFormData.requires_quiz,
      };
      if (editingItem) { await elearningService.updateLesson(editingItem.id, payload); notify({ type: 'success', title: 'Leçon modifiée', message: 'La leçon a été mise à jour' }); }
      else { await elearningService.createLesson(payload); notify({ type: 'success', title: 'Leçon créée', message: 'La nouvelle leçon a été créée' }); }
      refetchLessons(); closeAllModals();
    } catch (err) { notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de l\'enregistrement de la leçon' }); }
    finally { setLoading(false); }
  };

  const handleDeleteLesson = async (lesson) => {
    if (!await confirm({ title: `Supprimer la leçon "${lesson.title}" ?`, message: 'Cette action est irréversible.', confirmLabel: 'Supprimer', destructive: true })) return;
    try { await elearningService.deleteLesson(lesson.id); notify({ type: 'success', title: 'Leçon supprimée', message: 'La leçon a été supprimée' }); refetchLessons(); }
    catch (err) { notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la suppression' }); }
  };

  const handleEditLesson = (lesson) => {
    setEditingItem(lesson);
    setLessonFormData({
      title: lesson.title, description: lesson.description || '', content: lesson.content || '',
      class_obj: lesson.class_obj, subject: lesson.subject, chapter: lesson.chapter || '',
      order: lesson.order || 1, file: null,
      min_watch_percent: lesson.min_watch_percent ?? 100,
      min_duration_minutes: Math.round((lesson.min_duration_seconds || 0) / 60),
      requires_assignment: lesson.requires_assignment || false,
      requires_quiz: lesson.requires_quiz || false,
    });
    setShowLessonModal(true);
  };

  // ── Créateur de cours (course builder) ──────────────────────────────
  const openBuilder = async (lesson) => {
    setBuilderLesson(lesson);
    setShowBuilderModal(true);
    setBuilderLoading(true);
    try {
      const res = await elearningService.getLessonAttachments(lesson.id);
      const list = res?.results || res || [];
      setBuilderBlocks(list.slice().sort((a, b) => (a.order || 0) - (b.order || 0)));
    } catch {
      notify({ type: 'error', title: 'Erreur', message: 'Impossible de charger le contenu du cours' });
    } finally {
      setBuilderLoading(false);
    }
  };

  const closeBuilder = () => {
    setShowBuilderModal(false); setBuilderLesson(null); setBuilderBlocks([]);
    setShowBlockEditor(false); setEditingBlock(null);
  };

  const openAddBlock = (type) => {
    setEditingBlock(null);
    setBlockForm({ block_type: type, title: '', content: '', url: '', file: null });
    setShowBlockEditor(true);
  };

  const openEditBlock = (block) => {
    setEditingBlock(block);
    setBlockForm({ block_type: block.block_type, title: block.title, content: block.content || '', url: block.url || '', file: null });
    setShowBlockEditor(true);
  };

  const handleSaveBlock = async (e) => {
    e.preventDefault();
    if (!blockForm.title.trim()) return notify({ type: 'error', title: 'Erreur', message: 'Le titre est requis' });
    const meta = getBlockMeta(blockForm.block_type);
    if (!editingBlock && meta.file && !blockForm.file) return notify({ type: 'error', title: 'Erreur', message: 'Sélectionnez un fichier' });
    if (!editingBlock && meta.url && !blockForm.url.trim()) return notify({ type: 'error', title: 'Erreur', message: 'Le lien est requis' });
    setSavingBlock(true);
    try {
      if (!editingBlock && meta.file) {
        const fd = new FormData();
        fd.append('lesson', builderLesson.id);
        fd.append('block_type', blockForm.block_type);
        fd.append('title', blockForm.title);
        fd.append('order', builderBlocks.length);
        fd.append('file', blockForm.file);
        await elearningService.createContentBlockWithFile(fd);
      } else if (editingBlock) {
        await elearningService.updateContentBlock(editingBlock.id, {
          title: blockForm.title, content: blockForm.content, url: blockForm.url,
        });
      } else {
        await elearningService.createContentBlock({
          lesson: builderLesson.id, block_type: blockForm.block_type,
          title: blockForm.title, content: blockForm.content, url: blockForm.url,
          order: builderBlocks.length,
        });
      }
      notify({ type: 'success', title: editingBlock ? 'Bloc modifié' : 'Bloc ajouté', message: '' });
      setShowBlockEditor(false); setEditingBlock(null);
      openBuilder(builderLesson);
    } catch (err) {
      notify({ type: 'error', title: 'Erreur', message: err.message || 'Erreur lors de l\'enregistrement' });
    } finally {
      setSavingBlock(false);
    }
  };

  const handleDeleteBlock = async (block) => {
    if (!await confirm({ title: `Supprimer le bloc "${block.title}" ?`, message: 'Cette action est irréversible.', confirmLabel: 'Supprimer', destructive: true })) return;
    try {
      await elearningService.deleteAttachment(block.id);
      notify({ type: 'success', title: 'Bloc supprimé', message: '' });
      openBuilder(builderLesson);
    } catch {
      notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la suppression' });
    }
  };

  const handleBlockDrop = async (targetId) => {
    if (!draggedBlockId || draggedBlockId === targetId) return;
    const list = builderBlocks.slice();
    const fromIdx = list.findIndex(b => b.id === draggedBlockId);
    const toIdx = list.findIndex(b => b.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    setBuilderBlocks(list);
    setDraggedBlockId(null);
    try {
      await elearningService.reorderContentBlocks(list.map((b, i) => ({ id: b.id, order: i })));
    } catch {
      notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la réorganisation' });
      openBuilder(builderLesson);
    }
  };

  const handleCreateLessonFromModal = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (lessonFormData.file) {
        const fd = new FormData();
        fd.append('title', lessonFormData.title); fd.append('description', lessonFormData.description);
        fd.append('content', lessonFormData.content); fd.append('class_obj', lessonFormData.class_obj);
        fd.append('subject', lessonFormData.subject); fd.append('order', lessonFormData.order); fd.append('file', lessonFormData.file);
        await elearningService.createLessonWithFile(fd);
      } else { await elearningService.createLesson(lessonFormData); }
      notify({ type: 'success', title: 'Leçon créée', message: 'La nouvelle leçon a été créée' });
      refetchLessons(); setShowLessonModalFromZoom(false); setShowLessonModalFromAssignment(false);
      setLessonFormData({ title: '', description: '', content: '', class_obj: '', subject: '', order: 1, file: null });
    } catch (err) { notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la création de la leçon' }); }
    finally { setLoading(false); }
  };

  const handleAssignmentSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const fd = new FormData();
      fd.append('title', assignmentFormData.title); fd.append('description', assignmentFormData.description);
      fd.append('instructions', assignmentFormData.instructions); fd.append('class_obj', assignmentFormData.class_obj);
      fd.append('subject', assignmentFormData.subject); fd.append('due_date', assignmentFormData.due_date);
      fd.append('max_score', assignmentFormData.max_score);
      if (assignmentFormData.file) fd.append('attachment', assignmentFormData.file);
      if (editingItem) { await elearningService.updateAssignment(editingItem.id, assignmentFormData); notify({ type: 'success', title: 'Devoir modifié', message: 'Le devoir a été mis à jour' }); }
      else { await elearningService.createAssignmentWithFile(fd); notify({ type: 'success', title: 'Devoir créé', message: 'Le nouveau devoir a été créé' }); }
      refetchAssignments(); closeAllModals();
    } catch (err) { notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de l\'enregistrement du devoir' }); }
    finally { setLoading(false); }
  };

  const handleDeleteAssignment = async (assignment) => {
    if (!await confirm({ title: `Supprimer le devoir "${assignment.title}" ?`, message: 'Cette action est irréversible.', confirmLabel: 'Supprimer', destructive: true })) return;
    try { await elearningService.deleteAssignment(assignment.id); notify({ type: 'success', title: 'Devoir supprimé', message: 'Le devoir a été supprimé' }); refetchAssignments(); }
    catch (err) { notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la suppression' }); }
  };

  const handleEditAssignment = (assignment) => {
    setEditingItem(assignment);
    setAssignmentFormData({ title: assignment.title, description: assignment.description || '', instructions: assignment.instructions || '', class_obj: assignment.class_obj, subject: assignment.subject, due_date: assignment.due_date ? assignment.due_date.split('T')[0] : '', max_score: assignment.max_score || 20, file: null });
    setShowAssignmentModal(true);
  };

  const handlePublishAssignment = async (assignment) => {
    try { await elearningService.publishAssignment(assignment.id); notify({ type: 'success', title: 'Devoir publié', message: 'Le devoir a été publié' }); refetchAssignments(); }
    catch (err) { notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la publication' }); }
  };

  const handleZoomSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (zoomCreationMode === 'api') {
        await elearningService.createZoomMeeting({ session_id: zoomFormData.session, topic: zoomFormData.topic, start_time: zoomFormData.start_time, duration: zoomFormData.duration });
      } else {
        await elearningService.createZoomMeetingManual({ session: zoomFormData.session, topic: zoomFormData.topic, start_time: zoomFormData.start_time, duration: zoomFormData.duration, meeting_id: zoomFormData.meeting_id, join_url: zoomFormData.join_url, password: zoomFormData.password });
      }
      notify({ type: 'success', title: 'Réunion Zoom créée', message: 'La réunion Zoom a été créée avec succès' });
      refetchZoom(); closeAllModals();
    } catch (err) { notify({ type: 'error', title: 'Erreur', message: err.message || 'Erreur lors de la création de la réunion Zoom' }); }
    finally { setLoading(false); }
  };

  const handleDeleteZoom = async (meeting) => {
    if (!await confirm({ title: `Supprimer la réunion "${meeting.topic}" ?`, message: 'Cette action est irréversible.', confirmLabel: 'Supprimer', destructive: true })) return;
    try { await elearningService.deleteZoomMeeting(meeting.id); notify({ type: 'success', title: 'Réunion supprimée', message: 'La réunion a été supprimée' }); refetchZoom(); }
    catch (err) { notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la suppression' }); }
  };

  const kpiStats = [
    { title: 'Leçons totales',  value: lessons.length,      icon: FileText,     color: '#059669', bg: '#d1fae5', tab: 'lecons' },
    { title: 'Sessions Zoom',   value: zoomMeetings.length, icon: Video,        color: '#7c3aed', bg: '#ede9fe', tab: 'sessions' },
    { title: 'Devoirs',         value: assignments.length,  icon: ClipboardList,color: '#d97706', bg: '#fef3c7', tab: 'devoirs' },
    { title: 'Classes',         value: classesList.length,  icon: GraduationCap,color: COLOR,     bg: COLOR_ICON, tab: 'dashboard' },
  ];

  const sidebarGroups = [
    { label: 'Général', items: [
      { id: 'dashboard',    label: 'Tableau de bord',      icon: LayoutDashboard },
    ]},
    { label: 'Apprentissage', items: [
      { id: 'cours',        label: 'Cours',                icon: BookOpen },
      { id: 'lecons',       label: 'Leçons',               icon: FileText },
      { id: 'progression',  label: 'Progression',           icon: TrendingUp },
      { id: 'videoteque',   label: 'Vidéothèque',           icon: Film },
    ]},
    { label: 'Enseignement en ligne', items: [
      { id: 'classes-virt', label: 'Classes virtuelles',    icon: MonitorPlay },
      { id: 'sessions',     label: 'Sessions Zoom',         icon: Video },
    ]},
    { label: 'Évaluation', items: [
      { id: 'devoirs',      label: 'Devoirs & Exercices',   icon: ClipboardList },
      { id: 'quiz',         label: 'Quiz intelligents',     icon: ClipboardCheck },
      { id: 'examens',      label: 'Examens sécurisés',     icon: Shield },
      { id: 'labos',        label: 'Laboratoires virtuels', icon: FlaskConical },
    ]},
    { label: 'Ressources', items: [
      { id: 'bibliotheque', label: 'Bibliothèque',          icon: BookOpen },
    ]},
    { label: 'Intelligence Artificielle', items: [
      { id: 'ia',           label: 'IA Enseignant',         icon: Bot },
    ]},
    { label: 'Administration', items: [
      { id: 'pedagogie',    label: 'Gestion Pédagogique',   icon: GraduationCap },
    ]},
  ];

  const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader icon={Layers} iconColor={COLOR} iconBg={COLOR_ICON}
        title="E-Learning" subtitle="Gérez vos cours en ligne, sessions Zoom, exercices et devoirs"
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setActiveTab('pedagogie')} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg,#db2777,#f472b6)', boxShadow: '0 4px 14px #db277740' }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 20px #db277755'; }}
              onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 4px 14px #db277740'; }}>
              <GraduationCap className="h-4 w-4" /> Gestion Pédagogique
            </button>
            <button onClick={() => setShowZoomModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)', boxShadow: '0 4px 14px #7c3aed40' }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 20px #7c3aed55'; }}
              onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 4px 14px #7c3aed40'; }}>
              <Video className="h-4 w-4" /> Session Zoom
            </button>
            <button onClick={() => setShowLessonModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg,#059669,#10b981)', boxShadow: '0 4px 14px #05966940' }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 20px #05966955'; }}
              onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 4px 14px #05966940'; }}>
              <Plus className="h-4 w-4" /> Nouvelle Leçon
            </button>
            <PrimaryButton icon={Plus} label="Nouveau Devoir" color={COLOR} onClick={() => setShowAssignmentModal(true)} />
          </div>
        } />

      {/* E-Learning — Tab nav + Content */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #f0f4f9' }}>

        {/* HORIZONTAL TAB NAV */}
        <div className="flex overflow-x-auto px-3 py-2 gap-0.5" style={{ background: 'linear-gradient(180deg,#fafbff,#f8fafc)', borderBottom: '1.5px solid #f0f4f9' }}>
          {sidebarGroups.flatMap(g => g.items).map(item => {
            const active = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0"
                style={{
                  background: active ? COLOR_BG : 'transparent',
                  color: active ? COLOR : '#64748b',
                  border: `1px solid ${active ? COLOR + '33' : 'transparent'}`,
                }}>
                <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* MAIN CONTENT */}
        <div className="bg-white">
          {/* Class filter bar */}
          <div className="px-5 py-2.5 flex items-center gap-3" style={{ borderBottom: '1.5px solid #f0f4f9', background: 'linear-gradient(135deg,#fafbff,#ffffff)' }}>
            <GraduationCap className="h-4 w-4 flex-shrink-0" style={{ color: '#94a3b8' }} />
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
              className="input-field" style={{ maxWidth: 260, fontSize: '0.8rem', padding: '5px 10px', height: 34 }}>
              <option value="all">Toutes les classes</option>
              {classesList.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
          </div>

          <div className="p-4 sm:p-6">

            {/* Dashboard */}
            {activeTab === 'dashboard' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-base font-extrabold" style={{ color: '#0f172a' }}>Tableau de bord</h2>
                  <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Vue d'ensemble de la plateforme pédagogique</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {kpiStats.map((s, i) => (
                    <div key={i} className="rounded-2xl p-5 overflow-hidden relative cursor-pointer transition-all"
                      style={{ border: '1.5px solid #f0f4f9', background: '#fff' }}
                      onClick={() => setActiveTab(s.tab)}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = s.color + '44'; e.currentTarget.style.background = s.bg + '55'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#f0f4f9'; e.currentTarget.style.background = '#fff'; }}>
                      <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-[0.07] blur-lg" style={{ background: s.color }} />
                      <div className="h-11 w-11 rounded-2xl flex items-center justify-center mb-4"
                        style={{ background: `linear-gradient(135deg, ${s.bg}, ${s.color}22)`, boxShadow: `0 4px 14px ${s.color}20` }}>
                        <s.icon className="h-5 w-5" style={{ color: s.color }} />
                      </div>
                      <p className="kpi-label mb-1">{s.title}</p>
                      <p className="kpi-number" style={{ fontSize: '1.5rem' }}>{s.value}</p>
                    </div>
                  ))}
                </div>
                {lessons.length > 0 && (
                  <div className="rounded-2xl p-5" style={{ border: '1.5px solid #f0f4f9' }}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-extrabold" style={{ color: '#0f172a' }}>Leçons récentes</h3>
                      <button onClick={() => setActiveTab('lecons')} className="text-xs font-semibold" style={{ color: COLOR }}>Voir tout →</button>
                    </div>
                    <div className="space-y-2.5">
                      {lessons.slice(0, 5).map((lesson, idx) => (
                        <div key={lesson.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#f8faff', border: '1px solid #eef1f7' }}>
                          <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-extrabold"
                            style={{ background: 'linear-gradient(135deg,#d1fae5,#059669)', color: '#fff' }}>
                            {String(lesson.order || idx + 1).padStart(2, '0')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate" style={{ color: '#0f172a' }}>{lesson.title}</p>
                            <p className="text-xs" style={{ color: '#94a3b8' }}>{lesson.class_name} · {lesson.subject_name}</p>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: lesson.is_published ? '#d1fae5' : '#fef9c3', color: lesson.is_published ? '#065f46' : '#92400e' }}>
                            {lesson.is_published ? 'Publié' : 'Brouillon'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {zoomMeetings.filter(m => isLiveMeeting(m)).length > 0 && (
                  <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg,#fff1f2,#fff5f5)', border: '1.5px solid #fecdd3' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-7 w-7 rounded-lg flex items-center justify-center animate-pulse" style={{ background: 'linear-gradient(135deg,#ef4444,#db2777)' }}>
                        <Play className="h-3.5 w-3.5 text-white" />
                      </div>
                      <h3 className="text-sm font-extrabold" style={{ color: '#b91c1c' }}>Sessions en direct</h3>
                    </div>
                    <div className="space-y-2">
                      {zoomMeetings.filter(m => isLiveMeeting(m)).map(meeting => (
                        <div key={meeting.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-xl" style={{ border: '1px solid #fca5a5' }}>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold truncate" style={{ color: '#0f172a' }}>{meeting.topic}</p>
                            {meeting.session_info && <p className="text-xs" style={{ color: '#7c3aed' }}>{meeting.session_info.class} – {meeting.session_info.subject}</p>}
                          </div>
                          <button onClick={() => openZoomMeeting(meeting)} className="px-4 py-2 rounded-xl text-xs font-bold text-white flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg,#ef4444,#db2777)' }}>
                            Rejoindre
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {lessons.length === 0 && zoomMeetings.length === 0 && assignments.length === 0 && (
                  <div className="flex flex-col items-center py-16 rounded-2xl" style={{ border: '1.5px dashed #f0f4f9' }}>
                    <LayoutDashboard className="h-12 w-12 mb-3 opacity-20" style={{ color: COLOR }} />
                    <p className="text-sm font-semibold mb-1" style={{ color: '#1e293b' }}>Aucun contenu disponible</p>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>Commencez par créer une leçon ou une session</p>
                  </div>
                )}
              </div>
            )}

            {/* Cours autonomes Tab */}
            {activeTab === 'cours' && (
              <CourseManager />
            )}

            {/* Leçons Tab */}
            {activeTab === 'lecons' && (
            lessons.length === 0 ? (
              <div className="flex flex-col items-center py-16">
                <div className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'linear-gradient(135deg,#d1fae5,#a7f3d0)', boxShadow: '0 4px 14px #05966920' }}>
                  <FileText className="h-8 w-8 opacity-50" style={{ color: '#059669' }} />
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: '#1e293b' }}>Aucune leçon disponible</p>
                <p className="text-xs mb-4" style={{ color: '#94a3b8' }}>Créez votre première leçon pour démarrer</p>
                <button onClick={() => setShowLessonModal(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg,#059669,#10b981)', boxShadow: '0 4px 14px #05966940' }}>
                  <Plus className="h-4 w-4" /> Créer une leçon
                </button>
              </div>
            ) : (
              <>
              <div className="space-y-3">
                {paginatedLessons.map((lesson, idx) => (
                  <div key={lesson.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-xl transition-all"
                    style={{ border: '1.5px solid #f0f4f9' }}
                    onMouseEnter={e => { e.currentTarget.style.background='#f8faff'; e.currentTarget.style.borderColor='#e0e7ff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='#f0f4f9'; }}>
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-extrabold"
                        style={{ background: 'linear-gradient(135deg,#d1fae5,#059669)', color: '#fff', boxShadow: '0 3px 10px #05966930' }}>
                        {String(lesson.order || idx + 1).padStart(2, '0')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                          <span className="text-sm font-extrabold" style={{ color: '#0f172a' }}>{lesson.title}</span>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                            style={{ background: lesson.is_published ? 'linear-gradient(135deg,#d1fae5,#a7f3d0)' : 'linear-gradient(135deg,#fef9c3,#fde68a)', color: lesson.is_published ? '#065f46' : '#92400e' }}>
                            {lesson.is_published ? 'Publié' : 'Brouillon'}
                          </span>
                        </div>
                        {lesson.description && <p className="text-xs mb-1 font-medium line-clamp-1" style={{ color: '#64748b' }}>{lesson.description}</p>}
                        <div className="flex items-center gap-3 text-xs flex-wrap">
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg font-semibold"
                            style={{ background: '#ede9fe', color: '#7c3aed' }}>{lesson.class_name}</span>
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg font-semibold"
                            style={{ background: COLOR_BG, color: COLOR }}>{lesson.subject_name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 self-end sm:self-auto">
                      {!lesson.is_published && <IconBtn onClick={() => handlePublishLesson(lesson)} icon={CheckCircle} color="#059669" hoverBg="#d1fae5" title="Publier" />}
                      <IconBtn onClick={() => openBuilder(lesson)} icon={Layers} color="#db2777" hoverBg="#fce7f3" title="Créateur de cours" />
                      <IconBtn onClick={() => handleEditLesson(lesson)} icon={Edit} color="#2563eb" hoverBg="#dbeafe" title="Modifier" />
                      <IconBtn onClick={() => handleDeleteLesson(lesson)} icon={Trash2} color="#ef4444" hoverBg="#fee2e2" title="Supprimer" />
                    </div>
                  </div>
                ))}
              </div>
              <Pagination currentPage={currentPageLessons} totalPages={totalPagesLessons} onPageChange={setCurrentPageLessons}
                accentColor="#059669" totalItems={lessons.length} itemsPerPage={ITEMS_PER_PAGE} />
              </>
            )
          )}

          {/* Sessions Zoom Tab */}
          {activeTab === 'sessions' && (
            <div className="space-y-6">
              {/* Live Sessions */}
              {zoomMeetings.filter(m => isLiveMeeting(m)).length > 0 && (
                <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg,#fff1f2,#fff5f5)', border: '1.5px solid #fecdd3', boxShadow: '0 4px 20px #ef444418' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 rounded-xl flex items-center justify-center animate-pulse" style={{ background: 'linear-gradient(135deg,#ef4444,#db2777)' }}>
                      <Play className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold" style={{ color: '#b91c1c' }}>Sessions en direct</h3>
                      <p className="text-xs font-semibold" style={{ color: '#f87171' }}>{zoomMeetings.filter(m => isLiveMeeting(m)).length} session{zoomMeetings.filter(m => isLiveMeeting(m)).length > 1 ? 's' : ''} active{zoomMeetings.filter(m => isLiveMeeting(m)).length > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {zoomMeetings.filter(m => isLiveMeeting(m)).map(meeting => (
                      <div key={meeting.id} className="bg-white rounded-2xl p-5 overflow-hidden" style={{ border: '2px solid #fca5a5', boxShadow: '0 4px 16px #ef444420' }}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-11 w-11 rounded-2xl flex items-center justify-center animate-pulse flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg,#ef4444,#db2777)', boxShadow: '0 4px 12px #ef444450' }}>
                            <Play className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-extrabold truncate" style={{ color: '#0f172a' }}>{meeting.topic}</p>
                            {meeting.session_info && <p className="text-xs font-semibold" style={{ color: '#7c3aed' }}>{meeting.session_info.class} – {meeting.session_info.subject}</p>}
                          </div>
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full animate-pulse flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg,#fee2e2,#fecaca)', color: '#ef4444' }}>
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />EN DIRECT
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-medium mb-3" style={{ color: '#64748b' }}>
                          <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{new Date(meeting.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="px-2 py-0.5 rounded-md font-bold text-[11px]" style={{ background: '#f1f5f9', color: '#475569' }}>{meeting.duration} min</span>
                        </div>
                        <button onClick={() => openZoomMeeting(meeting)}
                          className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all"
                          style={{ background: 'linear-gradient(135deg,#ef4444,#db2777)', boxShadow: '0 4px 14px #ef444440' }}
                          onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 20px #ef444455'; }}
                          onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 4px 14px #ef444440'; }}>
                          <ExternalLink className="h-4 w-4" /> Rejoindre maintenant
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Zoom meetings */}
              {zoomMeetings.length === 0 ? (
                <div className="flex flex-col items-center py-16">
                  <div className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: 'linear-gradient(135deg,#ede9fe,#ddd6fe)', boxShadow: '0 4px 14px #7c3aed20' }}>
                    <Video className="h-8 w-8 opacity-50" style={{ color: '#7c3aed' }} />
                  </div>
                  <p className="text-sm font-semibold mb-1" style={{ color: '#1e293b' }}>Aucune session Zoom disponible</p>
                  <p className="text-xs mb-4" style={{ color: '#94a3b8' }}>Planifiez votre première session en ligne</p>
                  <button onClick={() => setShowZoomModal(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)', boxShadow: '0 4px 14px #7c3aed40' }}>
                    <Plus className="h-4 w-4" /> Créer une session
                  </button>
                </div>
              ) : (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {paginatedZoom.map(meeting => {
                    const live = isLiveMeeting(meeting);
                    const upcoming = isUpcomingMeeting(meeting);
                    return (
                      <div key={meeting.id} className="card card-interactive overflow-hidden"
                        style={{ border: live ? '2px solid #fca5a5' : upcoming ? '1.5px solid #c7d2fe' : undefined }}>
                        <div className="h-1.5" style={{ background: live ? 'linear-gradient(90deg,#ef4444,#db2777)' : upcoming ? 'linear-gradient(90deg,#6366f1,#7c3aed)' : 'linear-gradient(90deg,#7c3aed,#6366f1)' }} />
                        <div className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${live ? 'animate-pulse' : ''}`}
                              style={{ background: live ? 'linear-gradient(135deg,#ef4444,#db2777)' : 'linear-gradient(135deg,#ede9fe,#7c3aed22)', boxShadow: live ? '0 4px 12px #ef444440' : '0 4px 12px #7c3aed20' }}>
                              <Video className="h-5 w-5" style={{ color: live ? '#fff' : '#7c3aed' }} />
                            </div>
                            {live && (
                              <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full animate-pulse"
                                style={{ background: 'linear-gradient(135deg,#fee2e2,#fecaca)', color: '#ef4444' }}>
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />EN DIRECT
                              </span>
                            )}
                            {upcoming && !live && (
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                                style={{ background: 'linear-gradient(135deg,#e0e7ff,#c7d2fe)', color: '#4338ca' }}>Bientôt</span>
                            )}
                          </div>
                          <h3 className="text-sm font-extrabold mb-2" style={{ color: '#0f172a' }}>{meeting.topic}</h3>
                          <div className="space-y-1.5 mb-3 text-xs">
                            {meeting.session_info && (
                              <p className="flex items-center gap-1.5 font-semibold" style={{ color: '#7c3aed' }}>
                                <Users className="h-3 w-3" />{meeting.session_info.class} – {meeting.session_info.subject}
                              </p>
                            )}
                            <p className="flex items-center gap-1.5 font-medium" style={{ color: '#64748b' }}>
                              <Calendar className="h-3 w-3" />{new Date(meeting.start_time).toLocaleDateString('fr-FR')}
                            </p>
                            <p className="flex items-center gap-1.5 font-medium" style={{ color: '#64748b' }}>
                              <Clock className="h-3 w-3" />{new Date(meeting.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold" style={{ background: '#f1f5f9', color: '#94a3b8' }}>{meeting.duration} min</span>
                            </p>
                          </div>
                          <div className="rounded-xl p-3 mb-3" style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe33)', border: '1px solid #ede9fe' }}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-[10px] font-bold mb-0.5 uppercase tracking-wide" style={{ color: '#94a3b8' }}>ID réunion</p>
                                <p className="font-mono text-xs font-extrabold" style={{ color: '#7c3aed' }}>{meeting.meeting_id}</p>
                                {meeting.password && <p className="text-[10px] font-semibold mt-0.5" style={{ color: '#94a3b8' }}>Mot de passe: <span style={{ color: '#475569' }}>{meeting.password}</span></p>}
                              </div>
                              {meeting.join_url && (
                                <button onClick={() => { navigator.clipboard.writeText(meeting.join_url); notify({ type: 'success', title: 'Copié', message: 'Lien Zoom copié' }); }}
                                  className="h-8 w-8 rounded-xl flex items-center justify-center transition-all" style={{ color: '#7c3aed' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#ede9fe'; e.currentTarget.style.transform = 'scale(1.08)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}>
                                  <Link2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {meeting.join_url && (
                              <button onClick={() => openZoomMeeting(meeting)}
                                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all"
                                style={{ background: live ? 'linear-gradient(135deg,#ef4444,#db2777)' : 'linear-gradient(135deg,#7c3aed,#6366f1)', boxShadow: live ? '0 4px 12px #ef444435' : '0 4px 12px #7c3aed35' }}
                                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform='none'; }}>
                                <ExternalLink className="h-3.5 w-3.5" />{live ? 'Rejoindre maintenant' : 'Ouvrir'}
                              </button>
                            )}
                            <IconBtn onClick={() => handleDeleteZoom(meeting)} icon={Trash2} color="#ef4444" hoverBg="#fee2e2" title="Supprimer" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Pagination currentPage={currentPageZoom} totalPages={totalPagesZoom} onPageChange={setCurrentPageZoom}
                  accentColor="#7c3aed" totalItems={zoomMeetings.length} itemsPerPage={ITEMS_PER_PAGE} />
                </>
              )}
            </div>
          )}

          {/* Devoirs Tab */}
          {activeTab === 'devoirs' && (
            <AssignmentManager
              classesList={classesList}
              subjectsList={subjectsList}
              selectedClass={selectedClass !== 'all' ? selectedClass : ''}
              notify={notify}
            />
          )}

          {/* Progression Tab — Lot 7 & 10 */}
          {activeTab === 'progression' && (
            <LessonProgressDashboard
              classesList={classesList}
              subjectsList={subjectsList}
            />
          )}

          {/* Vidéothèque Tab — Lot 9 */}
          {activeTab === 'videoteque' && (
            <VideoLibraryManager />
          )}

          {/* Classes virtuelles Tab — Lot 8 */}
          {activeTab === 'classes-virt' && (
            <VirtualClassroomManager />
          )}

          {/* Quiz intelligents Tab */}
          {activeTab === 'quiz' && (
            <QuizManager
              classesList={classesList}
              subjectsList={subjectsList}
              lessons={lessons}
              selectedClass={selectedClass}
              notify={notify}
            />
          )}

          {/* Examens sécurisés Tab */}
          {activeTab === 'examens' && (
            <ExamManager
              classesList={classesList}
              subjectsList={subjectsList}
              selectedClass={selectedClass}
              notify={notify}
            />
          )}

          {/* Laboratoires virtuels Tab */}
          {activeTab === 'labos' && (
            <VirtualLabManager
              classesList={classesList}
              subjectsList={subjectsList}
              lessons={lessons}
              selectedClass={selectedClass}
              notify={notify}
            />
          )}

          {/* Bibliothèque numérique Tab */}
          {activeTab === 'bibliotheque' && (
            <LibraryManager
              subjectsList={subjectsList}
              notify={notify}
            />
          )}

          {/* IA Enseignant Tab */}
          {activeTab === 'ia' && (
            <AITeacherPanel
              subjectsList={subjectsList}
              lessons={lessons}
              notify={notify}
            />
          )}

          {/* Gestion Pédagogique Tab */}
          {activeTab === 'pedagogie' && (
            <PedagogicalManager showHeader={false} />
          )}

          </div>{/* closes p-6 */}
        </div>{/* closes main content area */}
      </div>{/* closes tab nav + content wrapper */}

      {/* Lesson Modal */}
      <ModalShell open={showLessonModal} onClose={closeAllModals} title={editingItem ? 'Modifier la leçon' : 'Nouvelle Leçon'} zIndex={50}>
        <form onSubmit={handleLessonSubmit} className="space-y-4">
          <Field label="Titre" required><input type="text" required value={lessonFormData.title} onChange={e => setLessonFormData(p => ({ ...p, title: e.target.value }))} className="input-field" /></Field>
          <Field label="Description"><textarea value={lessonFormData.description} onChange={e => setLessonFormData(p => ({ ...p, description: e.target.value }))} rows={2} className="input-field resize-none" /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Classe" required>
              <select required value={lessonFormData.class_obj} onChange={e => setLessonFormData(p => ({ ...p, class_obj: e.target.value }))} className="input-field cursor-pointer">
                <option value="">Sélectionner…</option>
                {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Matière" required>
              <div className="flex gap-2">
                <select required value={lessonFormData.subject} onChange={e => setLessonFormData(p => ({ ...p, subject: e.target.value }))} className="input-field cursor-pointer flex-1">
                  <option value="">Sélectionner…</option>
                  {subjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button type="button" onClick={() => setShowSubjectModal(true)} className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#d1fae5', color: '#059669' }}><Plus className="h-4 w-4" /></button>
              </div>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Chapitre (parcours pédagogique)">
              <div className="flex gap-2">
                <select value={lessonFormData.chapter} onChange={e => setLessonFormData(p => ({ ...p, chapter: e.target.value }))}
                  disabled={!lessonFormData.class_obj || !lessonFormData.subject} className="input-field cursor-pointer flex-1">
                  <option value="">Aucun (leçon libre)</option>
                  {chaptersList.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                <button type="button" disabled={!lessonFormData.class_obj || !lessonFormData.subject}
                  onClick={() => setShowChapterModal(true)}
                  className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                  style={{ background: '#d1fae5', color: '#059669' }}><Plus className="h-4 w-4" /></button>
              </div>
              {(!lessonFormData.class_obj || !lessonFormData.subject) && <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Sélectionnez classe + matière pour gérer les chapitres</p>}
            </Field>
            <Field label="Ordre"><input type="number" min="1" value={lessonFormData.order} onChange={e => setLessonFormData(p => ({ ...p, order: parseInt(e.target.value) || 1 }))} className="input-field" /></Field>
          </div>
          <Field label="Contenu"><textarea value={lessonFormData.content} onChange={e => setLessonFormData(p => ({ ...p, content: e.target.value }))} rows={4} className="input-field resize-none" placeholder="Contenu de la leçon…" /></Field>
          <Field label="Fichier (PDF, Word)">
            <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={e => setLessonFormData(p => ({ ...p, file: e.target.files[0] }))} className="input-field file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 file:text-xs hover:file:bg-green-100" />
            {lessonFormData.file && <p className="text-xs mt-1" style={{ color: '#059669' }}>Fichier: {lessonFormData.file.name}</p>}
          </Field>

          {/* Verrouillage intelligent */}
          <div className="rounded-xl" style={{ border: '1.5px solid #f0f4f9' }}>
            <button type="button" onClick={() => setShowLockSettings(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wide" style={{ color: '#64748b' }}>
              Verrouillage intelligent (conditions pour débloquer la suite)
              <span style={{ transform: showLockSettings ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }}>›</span>
            </button>
            {showLockSettings && (
              <div className="px-4 pb-4 space-y-3">
                <Field label="Visionnage minimum requis (%)">
                  <input type="number" min="0" max="100" value={lessonFormData.min_watch_percent}
                    onChange={e => setLessonFormData(p => ({ ...p, min_watch_percent: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) }))}
                    className="input-field" />
                  <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>S'applique aux blocs vidéo/audio. 0 = pas de condition de visionnage.</p>
                </Field>
                <Field label="Temps minimum sur la leçon (minutes)">
                  <input type="number" min="0" value={lessonFormData.min_duration_minutes}
                    onChange={e => setLessonFormData(p => ({ ...p, min_duration_minutes: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className="input-field" />
                </Field>
                <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#475569' }}>
                  <input type="checkbox" checked={lessonFormData.requires_assignment}
                    onChange={e => setLessonFormData(p => ({ ...p, requires_assignment: e.target.checked }))}
                    className="h-4 w-4 rounded" />
                  Devoir associé obligatoire pour valider la leçon
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#475569' }}>
                  <input type="checkbox" checked={lessonFormData.requires_quiz}
                    onChange={e => setLessonFormData(p => ({ ...p, requires_quiz: e.target.checked }))}
                    className="h-4 w-4 rounded" />
                  Quiz obligatoire (réussir le quiz pour valider la leçon)
                </label>
              </div>
            )}
          </div>

          <ModalFooter onCancel={closeAllModals} loading={loading} submitLabel={editingItem ? 'Mettre à jour' : 'Créer'} color="#059669" />
        </form>
      </ModalShell>

      {/* Chapter creation modal (z-75) */}
      <ModalShell open={showChapterModal} onClose={() => { setShowChapterModal(false); setNewChapterTitle(''); }} title="Nouveau Chapitre" zIndex={75} size="sm">
        <form onSubmit={handleCreateChapter} className="space-y-4">
          <Field label="Titre du chapitre" required>
            <input type="text" required value={newChapterTitle} onChange={e => setNewChapterTitle(e.target.value)} className="input-field" placeholder="Ex: Chapitre 1 — Introduction" />
          </Field>
          <p className="text-xs" style={{ color: '#94a3b8' }}>Le chapitre sera créé pour la classe et la matière sélectionnées dans le formulaire de leçon.</p>
          <ModalFooter onCancel={() => { setShowChapterModal(false); setNewChapterTitle(''); }} loading={loading} submitLabel="Créer le chapitre" color="#059669" />
        </form>
      </ModalShell>

      {/* Assignment Modal */}
      <ModalShell open={showAssignmentModal} onClose={closeAllModals} title={editingItem ? 'Modifier le devoir' : 'Nouveau Devoir'} zIndex={50}>
        <form onSubmit={handleAssignmentSubmit} className="space-y-4">
          <Field label="Titre" required><input type="text" required value={assignmentFormData.title} onChange={e => setAssignmentFormData(p => ({ ...p, title: e.target.value }))} className="input-field" /></Field>
          <Field label="Description" required><textarea required value={assignmentFormData.description} onChange={e => setAssignmentFormData(p => ({ ...p, description: e.target.value }))} rows={2} className="input-field resize-none" /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Classe" required>
              <select required value={assignmentFormData.class_obj} onChange={e => setAssignmentFormData(p => ({ ...p, class_obj: e.target.value }))} className="input-field cursor-pointer">
                <option value="">Sélectionner…</option>
                {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Matière" required>
              <div className="flex gap-2">
                <select required value={assignmentFormData.subject} onChange={e => setAssignmentFormData(p => ({ ...p, subject: e.target.value }))} className="input-field cursor-pointer flex-1">
                  <option value="">Sélectionner…</option>
                  {subjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button type="button" onClick={() => setShowSubjectModal(true)} className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: COLOR_ICON, color: COLOR }}><Plus className="h-4 w-4" /></button>
              </div>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Date limite" required><input type="datetime-local" required value={assignmentFormData.due_date} onChange={e => setAssignmentFormData(p => ({ ...p, due_date: e.target.value }))} className="input-field" /></Field>
            <Field label="Note maximale"><input type="number" min="1" value={assignmentFormData.max_score} onChange={e => setAssignmentFormData(p => ({ ...p, max_score: parseInt(e.target.value) || 20 }))} className="input-field" /></Field>
          </div>
          <Field label="Instructions"><textarea value={assignmentFormData.instructions} onChange={e => setAssignmentFormData(p => ({ ...p, instructions: e.target.value }))} rows={2} className="input-field resize-none" /></Field>
          <Field label="Leçon associée">
            <div className="flex gap-2">
              <select value={assignmentFormData.lesson} onChange={e => setAssignmentFormData(p => ({ ...p, lesson: e.target.value }))} className="input-field cursor-pointer flex-1">
                <option value="">Sélectionner une leçon (optionnel)…</option>
                {lessons.map(l => <option key={l.id} value={l.id}>{l.title} - {l.class_name} ({l.subject_name})</option>)}
              </select>
              <button type="button" onClick={e => { e.stopPropagation(); setShowLessonModalFromAssignment(true); }} className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#d1fae5', color: '#059669' }}><Plus className="h-4 w-4" /></button>
            </div>
          </Field>
          <Field label="Fichier joint (optionnel)"><input type="file" onChange={e => setAssignmentFormData(p => ({ ...p, file: e.target.files[0] }))} className="input-field" /></Field>
          <ModalFooter onCancel={closeAllModals} loading={loading} submitLabel={editingItem ? 'Mettre à jour' : 'Créer'} color={COLOR} />
        </form>
      </ModalShell>

      {/* Submissions & AI Grading Modal (Lot 17) */}
      <ModalShell open={showSubmissionsModal} onClose={() => { setShowSubmissionsModal(false); setSubmissionsAssignment(null); }}
        title={`Soumissions — ${submissionsAssignment?.title || ''}`} subtitle="Correction manuelle ou assistée par IA" zIndex={50} size="lg">
        {submissionsAssignment && <SubmissionsPanel assignment={submissionsAssignment} notify={notify} />}
      </ModalShell>

      {/* Zoom Modal */}
      <ModalShell open={showZoomModal} onClose={closeAllModals} title="Nouvelle Session Zoom" zIndex={50}>
        <form onSubmit={handleZoomSubmit} className="space-y-4">
          {/* Mode toggle */}
          <div className="flex p-1 rounded-xl" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
            {[{ id: 'manual', label: 'Lien manuel' }, { id: 'api', label: 'Créer via Zoom API' }].map(m => (
              <button key={m.id} type="button" onClick={() => setZoomCreationMode(m.id)}
                className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: zoomCreationMode === m.id ? '#fff' : 'transparent',
                  color: zoomCreationMode === m.id ? '#7c3aed' : '#64748b',
                  boxShadow: zoomCreationMode === m.id ? '0 2px 8px rgba(124,58,237,0.15)' : 'none',
                  fontWeight: zoomCreationMode === m.id ? 700 : 600,
                }}>
                {m.label}
              </button>
            ))}
          </div>
          <Field label="Séance" required>
            <div className="flex gap-2">
              <select required value={zoomFormData.session} onChange={e => setZoomFormData(p => ({ ...p, session: e.target.value }))} className="input-field cursor-pointer flex-1">
                <option value="">Sélectionner une séance…</option>
                {sessionsList.map(s => <option key={s.id} value={s.id}>{s.class_name || s.class_obj} - {s.subject_name || s.subject} ({DAYS[s.day_of_week] || s.day_of_week})</option>)}
              </select>
              <button type="button" onClick={() => setShowSessionModal(true)} className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#ede9fe', color: '#7c3aed' }}><Plus className="h-4 w-4" /></button>
            </div>
            {sessionsList.length === 0 && <p className="text-xs mt-1" style={{ color: '#d97706' }}>Aucune séance disponible. Cliquez sur + pour en créer une.</p>}
          </Field>
          <Field label="Leçon associée">
            <div className="flex gap-2">
              <select value={zoomFormData.lesson} onChange={e => setZoomFormData(p => ({ ...p, lesson: e.target.value }))} className="input-field cursor-pointer flex-1">
                <option value="">Sélectionner une leçon (optionnel)…</option>
                {lessons.map(l => <option key={l.id} value={l.id}>{l.title} - {l.class_name} ({l.subject_name})</option>)}
              </select>
              <button type="button" onClick={e => { e.stopPropagation(); setShowLessonModalFromZoom(true); }} className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#d1fae5', color: '#059669' }}><Plus className="h-4 w-4" /></button>
            </div>
          </Field>
          <Field label="Sujet de la réunion" required><input type="text" required value={zoomFormData.topic} onChange={e => setZoomFormData(p => ({ ...p, topic: e.target.value }))} className="input-field" placeholder="Ex: Cours de Mathématiques - Chapitre 5" /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Date et heure" required><input type="datetime-local" required value={zoomFormData.start_time} onChange={e => setZoomFormData(p => ({ ...p, start_time: e.target.value }))} className="input-field" /></Field>
            <Field label="Durée (minutes)"><input type="number" min="15" value={zoomFormData.duration} onChange={e => setZoomFormData(p => ({ ...p, duration: parseInt(e.target.value) || 60 }))} className="input-field" /></Field>
          </div>
          {zoomCreationMode === 'manual' && (
            <div className="space-y-3 p-4 rounded-xl" style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe33)', border: '1.5px solid #ede9fe' }}>
              <p className="text-xs font-extrabold uppercase tracking-wide" style={{ color: '#7c3aed' }}>Détails de la réunion Zoom</p>
              <Field label="ID de réunion" required><input type="text" required value={zoomFormData.meeting_id} onChange={e => setZoomFormData(p => ({ ...p, meeting_id: e.target.value }))} className="input-field" placeholder="Ex: 123 456 7890" /></Field>
              <Field label="Lien Zoom (join_url)" required><input type="url" required value={zoomFormData.join_url} onChange={e => setZoomFormData(p => ({ ...p, join_url: e.target.value }))} className="input-field" placeholder="https://zoom.us/j/…" /></Field>
              <Field label="Mot de passe (optionnel)"><input type="text" value={zoomFormData.password} onChange={e => setZoomFormData(p => ({ ...p, password: e.target.value }))} className="input-field" placeholder="Ex: abc123" /></Field>
            </div>
          )}
          {zoomCreationMode === 'api' && (
            <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe33)', border: '1.5px solid #bfdbfe' }}>
              <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#dbeafe' }}>
                <Video className="h-4 w-4" style={{ color: '#2563eb' }} />
              </div>
              <div className="text-xs font-medium" style={{ color: '#1d4ed8' }}>
                <p className="font-bold mb-0.5">Mode API Zoom</p>
                <p>Une réunion Zoom sera créée automatiquement via l'API Zoom. Le lien et le mot de passe seront générés automatiquement.</p>
              </div>
            </div>
          )}
          <ModalFooter onCancel={closeAllModals} loading={loading} submitLabel="Créer la réunion" color="#7c3aed" />
        </form>
      </ModalShell>

      {/* Subject Modal (z-70) */}
      <ModalShell open={showSubjectModal} onClose={() => setShowSubjectModal(false)} title="Nouvelle Matière" zIndex={70} size="sm">
        <form onSubmit={handleCreateSubject} className="space-y-4">
          <Field label="Nom de la matière" required><input type="text" required value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} className="input-field" placeholder="Ex: Mathématiques" /></Field>
          <Field label="Code (optionnel)">
            <input type="text" value={newSubjectCode} onChange={e => setNewSubjectCode(e.target.value.toUpperCase())} maxLength={10} className="input-field" placeholder="Ex: MATH" />
            <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Si vide, un code sera généré automatiquement</p>
          </Field>
          <ModalFooter onCancel={() => setShowSubjectModal(false)} loading={loading} submitLabel="Créer la matière" color="#2563eb" />
        </form>
      </ModalShell>

      {/* Session Modal (z-60) */}
      <ModalShell open={showSessionModal} onClose={() => setShowSessionModal(false)} title="Nouvelle Séance" zIndex={60} size="sm">
        <form onSubmit={handleCreateSession} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Classe" required>
              <select required value={sessionFormData.class_obj} onChange={e => setSessionFormData(p => ({ ...p, class_obj: e.target.value }))} className="input-field cursor-pointer">
                <option value="">Sélectionner…</option>
                {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Matière" required>
              <div className="flex gap-2">
                <select required value={sessionFormData.subject} onChange={e => setSessionFormData(p => ({ ...p, subject: e.target.value }))} className="input-field cursor-pointer flex-1">
                  <option value="">Sélectionner…</option>
                  {subjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button type="button" onClick={e => { e.stopPropagation(); setShowSubjectModal(true); }} className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#ede9fe', color: '#7c3aed' }}><Plus className="h-4 w-4" /></button>
              </div>
              {subjectsList.length === 0 && <p className="text-xs mt-1" style={{ color: '#d97706' }}>Aucune matière. Cliquez sur + pour en créer une.</p>}
            </Field>
          </div>
          {subjectsList.length > 0 && (
            <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg,#fafbff,#f8f9ff)', border: '1px solid #eef1f7' }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#64748b' }}>Matières disponibles ({subjectsList.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {subjectsList.slice(0, 10).map(s => (
                  <span key={s.id} className="px-2.5 py-0.5 rounded-lg text-xs font-semibold"
                    style={{ background: '#fff', border: '1.5px solid #e2e8f0', color: '#475569' }}>{s.name}</span>
                ))}
                {subjectsList.length > 10 && <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold" style={{ background: '#f1f5f9', color: '#94a3b8' }}>+{subjectsList.length - 10} autres</span>}
              </div>
            </div>
          )}
          <Field label="Jour" required>
            <select required value={sessionFormData.day_of_week} onChange={e => setSessionFormData(p => ({ ...p, day_of_week: parseInt(e.target.value) }))} className="input-field cursor-pointer">
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Heure début" required><input type="time" required value={sessionFormData.start_time} onChange={e => setSessionFormData(p => ({ ...p, start_time: e.target.value }))} className="input-field" /></Field>
            <Field label="Heure fin" required><input type="time" required value={sessionFormData.end_time} onChange={e => setSessionFormData(p => ({ ...p, end_time: e.target.value }))} className="input-field" /></Field>
          </div>
          <ModalFooter onCancel={() => setShowSessionModal(false)} loading={loading} submitLabel="Créer la séance" color="#7c3aed" />
        </form>
      </ModalShell>

      {/* Lesson from Zoom/Assignment Modal (z-80) */}
      <ModalShell open={showLessonModalFromZoom || showLessonModalFromAssignment} onClose={() => { setShowLessonModalFromZoom(false); setShowLessonModalFromAssignment(false); }} title="Nouvelle Leçon" zIndex={80} size="sm">
        <form onSubmit={handleCreateLessonFromModal} className="space-y-4">
          <Field label="Titre" required><input type="text" required value={lessonFormData.title} onChange={e => setLessonFormData(p => ({ ...p, title: e.target.value }))} className="input-field" /></Field>
          <Field label="Description"><textarea value={lessonFormData.description} onChange={e => setLessonFormData(p => ({ ...p, description: e.target.value }))} rows={2} className="input-field resize-none" /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Classe" required>
              <select required value={lessonFormData.class_obj} onChange={e => setLessonFormData(p => ({ ...p, class_obj: e.target.value }))} className="input-field cursor-pointer">
                <option value="">Sélectionner…</option>
                {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Matière" required>
              <select required value={lessonFormData.subject} onChange={e => setLessonFormData(p => ({ ...p, subject: e.target.value }))} className="input-field cursor-pointer">
                <option value="">Sélectionner…</option>
                {subjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Contenu"><textarea value={lessonFormData.content} onChange={e => setLessonFormData(p => ({ ...p, content: e.target.value }))} rows={3} className="input-field resize-none" placeholder="Contenu de la leçon…" /></Field>
          <Field label="Fichier (PDF, Word)">
            <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={e => setLessonFormData(p => ({ ...p, file: e.target.files[0] }))} className="input-field file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 file:text-xs hover:file:bg-green-100" />
            {lessonFormData.file && <p className="text-xs mt-1" style={{ color: '#059669' }}>Fichier: {lessonFormData.file.name}</p>}
          </Field>
          <ModalFooter onCancel={() => { setShowLessonModalFromZoom(false); setShowLessonModalFromAssignment(false); }} loading={loading} submitLabel="Créer la leçon" color="#059669" />
        </form>
      </ModalShell>

      {/* Course Builder Modal */}
      {showBuilderModal && (
        <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4" style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)', zIndex: 90 }}>
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[88vh] overflow-y-auto" style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.2)' }}>
            <div className="h-1 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${COLOR}, #6366f1, #8b5cf6)` }} />
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4" style={{ background: 'linear-gradient(135deg, #fafbff, #ffffff)', borderBottom: '1px solid #f1f5f9' }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: COLOR_ICON }}>
                  <Layers className="h-5 w-5" style={{ color: COLOR }} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-extrabold truncate" style={{ color: '#0f172a' }}>Créateur de cours</h2>
                  <p className="text-xs font-semibold mt-0.5 truncate" style={{ color: '#94a3b8' }}>{builderLesson?.title}</p>
                </div>
              </div>
              <button onClick={closeBuilder} className="h-8 w-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0" style={{ color: '#64748b' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-5">
              {/* Toolbar to add blocks */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#64748b' }}>Ajouter un bloc de contenu</p>
                <div className="flex flex-wrap gap-2">
                  {BLOCK_TYPES.map(bt => (
                    <button key={bt.type} onClick={() => openAddBlock(bt.type)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                      style={{ background: `${bt.color}12`, color: bt.color, border: `1.5px solid ${bt.color}30` }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${bt.color}22`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = `${bt.color}12`; }}>
                      <bt.icon className="h-3.5 w-3.5" /> {bt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Block list (drag & drop reorder) */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#64748b' }}>
                  Contenu du cours {builderBlocks.length > 0 && `(${builderBlocks.length})`}
                </p>
                {builderLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-7 w-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${COLOR} transparent transparent transparent` }} />
                  </div>
                ) : builderBlocks.length === 0 ? (
                  <div className="flex flex-col items-center py-12 rounded-xl" style={{ border: '1.5px dashed #e2e8f0' }}>
                    <Layers className="h-8 w-8 mb-2 opacity-40" style={{ color: COLOR }} />
                    <p className="text-sm font-semibold" style={{ color: '#64748b' }}>Aucun contenu pour le moment</p>
                    <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Ajoutez un bloc ci-dessus pour démarrer</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {builderBlocks.map(block => {
                      const meta = getBlockMeta(block.block_type);
                      return (
                        <div key={block.id}
                          draggable
                          onDragStart={() => setDraggedBlockId(block.id)}
                          onDragOver={e => e.preventDefault()}
                          onDrop={() => handleBlockDrop(block.id)}
                          className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl transition-all cursor-grab active:cursor-grabbing"
                          style={{ border: '1.5px solid #f0f4f9', background: draggedBlockId === block.id ? '#f8faff' : '#fff' }}>
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <GripVertical className="h-4 w-4 flex-shrink-0" style={{ color: '#cbd5e1' }} />
                            <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${meta.color}15` }}>
                              <meta.icon className="h-4 w-4" style={{ color: meta.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate" style={{ color: '#0f172a' }}>{block.title}</p>
                              <div className="flex items-center gap-2 text-[11px] flex-wrap">
                                <span className="px-2 py-0.5 rounded-md font-bold" style={{ background: `${meta.color}12`, color: meta.color }}>{meta.label}</span>
                                {block.file_type && <span style={{ color: '#94a3b8' }}>.{block.file_type}</span>}
                                {block.url && <span className="truncate" style={{ color: '#94a3b8', maxWidth: 220 }}>{block.url}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 self-end sm:self-auto">
                            {block.file && (
                              <IconBtn onClick={() => window.open(block.file, '_blank', 'noopener,noreferrer')} icon={Eye} color="#2563eb" hoverBg="#dbeafe" title="Aperçu" />
                            )}
                            <IconBtn onClick={() => openEditBlock(block)} icon={Edit} color="#2563eb" hoverBg="#dbeafe" title="Modifier" />
                            <IconBtn onClick={() => handleDeleteBlock(block)} icon={Trash2} color="#ef4444" hoverBg="#fee2e2" title="Supprimer" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Block Editor Modal */}
      <ModalShell open={showBlockEditor} onClose={() => { setShowBlockEditor(false); setEditingBlock(null); }}
        title={editingBlock ? 'Modifier le bloc' : `Ajouter un bloc — ${getBlockMeta(blockForm.block_type).label}`}
        zIndex={95} size="sm" color={COLOR}>
        <form onSubmit={handleSaveBlock} className="space-y-4">
          <Field label="Titre" required>
            <input type="text" required value={blockForm.title} onChange={e => setBlockForm(p => ({ ...p, title: e.target.value }))} className="input-field" placeholder="Titre du bloc" />
          </Field>

          {getBlockMeta(blockForm.block_type).file && !editingBlock && (
            <Field label="Fichier" required>
              <input type="file" required onChange={e => setBlockForm(p => ({ ...p, file: e.target.files[0] }))}
                className="input-field file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-pink-50 file:text-pink-700 file:text-xs hover:file:bg-pink-100" />
              {blockForm.file && <p className="text-xs mt-1" style={{ color: '#059669' }}>Fichier: {blockForm.file.name}</p>}
            </Field>
          )}
          {getBlockMeta(blockForm.block_type).file && editingBlock && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: '#fef3c7', color: '#92400e' }}>
              Pour remplacer le fichier, supprimez ce bloc et ajoutez-en un nouveau.
            </p>
          )}

          {getBlockMeta(blockForm.block_type).url && (
            <Field label="Lien" required>
              <input type="url" required={!editingBlock} value={blockForm.url} onChange={e => setBlockForm(p => ({ ...p, url: e.target.value }))}
                className="input-field" placeholder={blockForm.block_type === 'YOUTUBE' ? 'https://youtube.com/watch?v=...' : blockForm.block_type === 'VIMEO' ? 'https://vimeo.com/...' : 'https://...'} />
            </Field>
          )}

          {!getBlockMeta(blockForm.block_type).file && !getBlockMeta(blockForm.block_type).url && (
            <Field label={blockForm.block_type === 'HTML' ? 'Code HTML' : 'Contenu'} required>
              <textarea required value={blockForm.content} onChange={e => setBlockForm(p => ({ ...p, content: e.target.value }))}
                rows={6} className="input-field resize-none font-mono text-xs"
                placeholder={blockForm.block_type === 'HTML' ? '<p>Votre contenu HTML…</p>' : 'Texte du bloc…'} />
            </Field>
          )}

          <ModalFooter onCancel={() => { setShowBlockEditor(false); setEditingBlock(null); }} loading={savingBlock}
            submitLabel={editingBlock ? 'Enregistrer' : 'Ajouter le bloc'} color={COLOR} />
        </form>
      </ModalShell>
    </div>
  );
}
