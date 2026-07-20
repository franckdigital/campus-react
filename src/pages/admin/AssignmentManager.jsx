import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Trash2, Edit, X, ClipboardList, ClipboardCheck, CheckCircle,
  FileText, Upload, Download, Calendar, Award, Users, Send,
  ChevronRight, CheckCircle2, ToggleLeft, Type, ListChecks,
  Layers, MonitorPlay, BookOpen, Star, AlertCircle, Eye,
} from 'lucide-react';
import { elearningService } from '../../services/elearning';
import academicService from '../../services/academic';
import { useApi } from '../../hooks/useApi';
import { useNotifications } from '../../components/Notifications';
import { useConfirm } from '../../components/ConfirmDialog';
import { IconBtn, Pagination } from '../../components/ui/PageHeader';

const C = '#db2777'; const C_BG = '#fdf2f8'; const C_ICON = '#fce7f3';
const ITEMS_PER_PAGE = 8;

function Spinner() {
  return <div className="flex justify-center py-10"><div className="h-8 w-8 rounded-full border-[3px] animate-spin" style={{ borderColor: C_ICON, borderTopColor: C }} /></div>;
}

function Shell({ open, onClose, title, subtitle, size = 'md', zIndex = 60, children }) {
  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4" style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)', zIndex }} onClick={onClose}>
      <div className={`bg-white rounded-2xl w-full ${widths[size]} max-h-[92vh] overflow-y-auto`} style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div className="h-1 rounded-t-2xl" style={{ background: `linear-gradient(90deg,${C},#6366f1,#8b5cf6)` }} />
        <div className="flex items-center justify-between px-4 sm:px-6 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div className="min-w-0">
            <h2 className="text-base font-extrabold truncate" style={{ color: '#0f172a' }}>{title}</h2>
            {subtitle && <p className="text-xs font-semibold mt-0.5 truncate" style={{ color: '#94a3b8' }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ color: '#64748b' }}><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 sm:p-6 space-y-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}

const Fld = ({ label, required, children }) => (
  <div>
    <label className="block mb-1.5" style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
    </label>
    {children}
  </div>
);

// ─── QUESTION EDITOR INLINE ──────────────────────────────────────────────────

const QTYPES = [
  { type: 'QCU',       label: 'Choix unique',  icon: CheckCircle2,  color: '#2563eb' },
  { type: 'QCM',       label: 'Choix multiple', icon: ListChecks,   color: '#7c3aed' },
  { type: 'TRUEFALSE', label: 'Vrai ou Faux',   icon: ToggleLeft,   color: '#0891b2' },
  { type: 'TEXT',      label: 'Texte libre',    icon: Type,         color: '#64748b' },
];

function QuestionEditorModal({ quizId, editingQ, onClose, onSaved, notify }) {
  const [form, setForm] = useState(editingQ ? {
    question_type: editingQ.question_type,
    text: editingQ.text,
    points: editingQ.points || 1,
    explanation: editingQ.explanation || '',
    text_answer: editingQ.text_answer || '',
    true_false_answer: editingQ.question_type === 'TRUEFALSE'
      ? ((editingQ.choices || []).find(c => c.text === 'Vrai' && c.is_correct) ? 'VRAI' : 'FAUX')
      : 'VRAI',
    choices: (editingQ.choices || []).map(c => ({ text: c.text, is_correct: c.is_correct })),
  } : {
    question_type: 'QCU', text: '', points: 1, explanation: '',
    text_answer: '', true_false_answer: 'VRAI',
    choices: [{ text: '', is_correct: false }, { text: '', is_correct: false }],
  });
  const [saving, setSaving] = useState(false);
  const needsChoices = ['QCU', 'QCM'].includes(form.question_type);

  const setType = (t) => setForm(p => ({
    ...p, question_type: t,
    choices: ['QCU', 'QCM'].includes(t) ? [{ text: '', is_correct: false }, { text: '', is_correct: false }] : [],
    true_false_answer: t === 'TRUEFALSE' ? 'VRAI' : p.true_false_answer,
    text_answer: '',
  }));

  const save = async () => {
    if (!form.text.trim()) return notify({ type: 'error', title: 'Énoncé requis', message: '' });
    if (needsChoices) {
      const filledChoices = form.choices.filter(c => c.text.trim());
      if (filledChoices.length < 2) return notify({ type: 'error', title: 'Erreur', message: 'Ajoutez au moins 2 choix remplis' });
      if (!filledChoices.some(c => c.is_correct)) return notify({ type: 'error', title: 'Sélectionnez la bonne réponse', message: '' });
    }
    setSaving(true);
    try {
      const payload = {
        quiz: quizId, question_type: form.question_type, text: form.text.trim(),
        points: form.points, explanation: form.explanation,
        text_answer: form.question_type === 'TEXT' ? form.text_answer : '',
        order: editingQ?.order ?? 0,
      };
      let q;
      if (editingQ) {
        q = await elearningService.updateQuestion(editingQ.id, payload);
        await Promise.all((editingQ.choices || []).map(c => elearningService.deleteChoice(c.id)));
      } else {
        q = await elearningService.createQuestion(payload);
      }
      if (needsChoices) {
        const validChoices = form.choices.filter(c => c.text.trim());
        await Promise.all(validChoices.map((c, i) => elearningService.createChoice({ question: q.id, text: c.text.trim(), is_correct: !!c.is_correct, order: i })));
      }
      if (form.question_type === 'TRUEFALSE') {
        await Promise.all([
          elearningService.createChoice({ question: q.id, text: 'Vrai', is_correct: form.true_false_answer === 'VRAI', order: 0 }),
          elearningService.createChoice({ question: q.id, text: 'Faux', is_correct: form.true_false_answer === 'FAUX', order: 1 }),
        ]);
      }
      notify({ type: 'success', title: editingQ ? 'Question modifiée' : 'Question ajoutée', message: '' });
      onSaved();
    } catch (e) {
      notify({ type: 'error', title: 'Erreur', message: e.message });
    } finally { setSaving(false); }
  };

  return (
    <Shell open onClose={onClose} title={editingQ ? 'Modifier la question' : 'Nouvelle question'} zIndex={80} size="lg">
      <div className="space-y-4">
        <Fld label="Type de question" required>
          <div className="flex flex-wrap gap-2">
            {QTYPES.map(t => (
              <button key={t.type} type="button" onClick={() => setType(t.type)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: form.question_type === t.type ? `${t.color}1f` : '#f8fafc', color: form.question_type === t.type ? t.color : '#94a3b8', border: `1.5px solid ${form.question_type === t.type ? t.color + '40' : '#f0f4f9'}` }}>
                <t.icon className="h-3.5 w-3.5" />{t.label}
              </button>
            ))}
          </div>
        </Fld>
        <Fld label="Énoncé" required>
          <textarea value={form.text} onChange={e => setForm(p => ({ ...p, text: e.target.value }))} rows={2} className="input-field resize-none" placeholder="Posez votre question…" />
        </Fld>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Fld label="Points"><input type="number" min="0.5" step="0.5" value={form.points} onChange={e => setForm(p => ({ ...p, points: parseFloat(e.target.value) || 1 }))} className="input-field" /></Fld>
          <Fld label="Explication"><input type="text" value={form.explanation} onChange={e => setForm(p => ({ ...p, explanation: e.target.value }))} className="input-field" placeholder="Optionnel" /></Fld>
        </div>

        {form.question_type === 'TEXT' && (
          <Fld label="Réponse de référence (auto-correction si renseignée)">
            <input type="text" value={form.text_answer} onChange={e => setForm(p => ({ ...p, text_answer: e.target.value }))} className="input-field" placeholder="Laissez vide → correction manuelle" />
          </Fld>
        )}

        {form.question_type === 'TRUEFALSE' && (
          <Fld label="Bonne réponse" required>
            <div className="flex gap-3">
              {[{ val: 'VRAI', label: '✓ Vrai', color: '#059669' }, { val: 'FAUX', label: '✗ Faux', color: '#ef4444' }].map(o => (
                <button key={o.val} type="button" onClick={() => setForm(p => ({ ...p, true_false_answer: o.val }))}
                  className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
                  style={{ background: form.true_false_answer === o.val ? `${o.color}18` : '#f8fafc', color: form.true_false_answer === o.val ? o.color : '#94a3b8', border: `1.5px solid ${form.true_false_answer === o.val ? o.color + '40' : '#f0f4f9'}` }}>
                  {o.label}
                </button>
              ))}
            </div>
          </Fld>
        )}

        {needsChoices && (
          <Fld label={form.question_type === 'QCU' ? 'Choix (sélectionnez la bonne réponse)' : 'Choix (cochez les bonnes réponses)'} required>
            <div className="space-y-2">
              {form.choices.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type={form.question_type === 'QCU' ? 'radio' : 'checkbox'} checked={!!c.is_correct}
                    onChange={() => form.question_type === 'QCU'
                      ? setForm(p => ({ ...p, choices: p.choices.map((x, j) => ({ ...x, is_correct: i === j })) }))
                      : setForm(p => ({ ...p, choices: p.choices.map((x, j) => j === i ? { ...x, is_correct: !x.is_correct } : x) }))}
                    className="h-4 w-4 flex-shrink-0" />
                  <input type="text" value={c.text} onChange={e => setForm(p => ({ ...p, choices: p.choices.map((x, j) => j === i ? { ...x, text: e.target.value } : x) }))}
                    className="input-field flex-1" placeholder={`Choix ${i + 1}`} />
                  <button type="button" onClick={() => setForm(p => ({ ...p, choices: p.choices.filter((_, j) => j !== i) }))}
                    className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ color: '#ef4444' }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => setForm(p => ({ ...p, choices: [...p.choices, { text: '', is_correct: false }] }))}
                className="text-xs font-bold flex items-center gap-1" style={{ color: C }}>
                <Plus className="h-3.5 w-3.5" /> Ajouter un choix
              </button>
            </div>
          </Fld>
        )}

        <div className="flex justify-end gap-3 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold border" style={{ color: '#64748b', borderColor: '#e2e8f0' }}>Annuler</button>
          <button onClick={save} disabled={saving} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: `linear-gradient(135deg,${C},${C}cc)`, boxShadow: `0 4px 14px ${C}40` }}>
            {saving ? 'Enregistrement…' : editingQ ? 'Mettre à jour' : 'Ajouter'}
          </button>
        </div>
      </div>
    </Shell>
  );
}

// ─── QUIZ BUILDER pour devoirs ────────────────────────────────────────────────

function QuizBuilderTab({ assignment, notify, onQuizLinked }) {
  const [showEditor, setShowEditor] = useState(false);
  const [editingQ, setEditingQ] = useState(null);
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const confirm = useConfirm();

  const { data: questionsData, loading, refetch } = useApi(
    () => assignment.quiz ? elearningService.getQuestions(assignment.quiz) : Promise.resolve([]),
    [assignment.quiz], !!assignment.quiz
  );
  const questions = (questionsData?.results ?? questionsData ?? []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));

  const ensureQuiz = async () => {
    if (assignment.quiz) return assignment.quiz;
    setCreatingQuiz(true);
    try {
      const quiz = await elearningService.createQuiz({
        title: `Questions — ${assignment.title}`,
        class_obj: assignment.class_obj,
        subject: assignment.subject,
        is_published: false,
        pass_score_percent: 0,
        time_limit_minutes: 0,
        max_attempts: 3,
      });
      const quizId = quiz?.id ?? quiz?.data?.id;
      await elearningService.updateAssignment(assignment.id, { quiz: quizId });
      onQuizLinked(quizId);
      return quizId;
    } catch (e) {
      notify({ type: 'error', title: 'Erreur création quiz', message: e.message });
      return null;
    } finally { setCreatingQuiz(false); }
  };

  const handleAddQuestion = async () => {
    const qid = await ensureQuiz();
    if (qid) { setEditingQ(null); setShowEditor(true); }
  };

  const handleDelete = async (q) => {
    if (!await confirm({ title: 'Supprimer cette question ?', confirmLabel: 'Supprimer', destructive: true })) return;
    await elearningService.deleteQuestion(q.id);
    refetch();
  };

  const QTYPE_META = { QCU: { label: 'Choix unique', color: '#2563eb' }, QCM: { label: 'Choix multiple', color: '#7c3aed' }, TRUEFALSE: { label: 'Vrai/Faux', color: '#0891b2' }, TEXT: { label: 'Texte libre', color: '#64748b' } };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm font-extrabold" style={{ color: '#0f172a' }}>Questions de l'exercice ({questions.length})</p>
        <button onClick={handleAddQuestion} disabled={creatingQuiz}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50"
          style={{ background: `linear-gradient(135deg,${C},#6366f1)`, boxShadow: `0 4px 14px ${C}30` }}>
          {creatingQuiz ? 'Création…' : <><Plus className="h-3.5 w-3.5" /> Ajouter une question</>}
        </button>
      </div>

      {!assignment.quiz && (
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: '#fffbeb', border: '1.5px solid #fde68a' }}>
          <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: '#d97706' }} />
          <p className="text-xs font-semibold" style={{ color: '#92400e' }}>Cliquez "Ajouter une question" pour composer les exercices en ligne. Un quiz sera automatiquement créé.</p>
        </div>
      )}

      {loading ? <Spinner /> : questions.length === 0 && assignment.quiz ? (
        <div className="py-8 text-center rounded-xl" style={{ border: '1.5px dashed #e2e8f0' }}>
          <p className="text-sm" style={{ color: '#94a3b8' }}>Aucune question pour le moment</p>
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map((q, idx) => {
            const meta = QTYPE_META[q.question_type] || QTYPE_META.TEXT;
            return (
              <div key={q.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ border: '1.5px solid #f0f4f9' }}>
                <span className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0" style={{ background: C_ICON, color: C }}>{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: '#0f172a' }}>{q.text}</p>
                  <div className="flex items-center gap-2 text-[11px] mt-0.5">
                    <span className="px-2 py-0.5 rounded-md font-bold" style={{ background: `${meta.color}12`, color: meta.color }}>{meta.label}</span>
                    <span style={{ color: '#94a3b8' }}>{q.points} pt{q.points > 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <IconBtn onClick={() => { setEditingQ(q); setShowEditor(true); }} icon={Edit} color="#2563eb" hoverBg="#dbeafe" title="Modifier" />
                  <IconBtn onClick={() => handleDelete(q)} icon={Trash2} color="#ef4444" hoverBg="#fee2e2" title="Supprimer" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showEditor && (
        <QuestionEditorModal quizId={assignment.quiz} editingQ={editingQ} notify={notify}
          onClose={() => { setShowEditor(false); setEditingQ(null); }}
          onSaved={() => { setShowEditor(false); setEditingQ(null); refetch(); }} />
      )}
    </div>
  );
}

// ─── SUBMISSIONS PANEL ────────────────────────────────────────────────────────

function SubmissionsPanel({ assignment, notify }) {
  const [gradingId, setGradingId] = useState(null);
  const [gradeForm, setGradeForm] = useState({ score: '', feedback: '' });
  const [saving, setSaving] = useState(false);

  const { data, loading, refetch } = useApi(
    () => elearningService.getSubmissions(assignment.id),
    [assignment.id], true
  );
  const submissions = data?.results ?? data ?? [];

  const submitGrade = async (sub) => {
    setSaving(true);
    try {
      await elearningService.gradeSubmission(sub.id, { score: parseFloat(gradeForm.score), feedback: gradeForm.feedback });
      notify({ type: 'success', title: 'Note enregistrée', message: '' });
      setGradingId(null); refetch();
    } catch (e) {
      notify({ type: 'error', title: 'Erreur', message: e.message });
    } finally { setSaving(false); }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-extrabold" style={{ color: '#0f172a' }}>{submissions.length} soumission{submissions.length > 1 ? 's' : ''}</p>
      </div>
      {submissions.length === 0 ? (
        <div className="py-10 text-center rounded-xl" style={{ border: '1.5px dashed #e2e8f0' }}>
          <p className="text-sm" style={{ color: '#94a3b8' }}>Aucune soumission pour le moment</p>
        </div>
      ) : submissions.map(sub => (
        <div key={sub.id} className="rounded-xl p-4 space-y-3" style={{ border: '1.5px solid #f0f4f9' }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold" style={{ color: '#0f172a' }}>{sub.student_name || sub.student}</p>
              <p className="text-xs" style={{ color: '#94a3b8' }}>
                Soumis le {new Date(sub.submitted_at).toLocaleDateString('fr-FR')}
                {sub.is_late && <span className="ml-2 text-red-500 font-bold">En retard</span>}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
              {sub.grade !== null && sub.grade !== undefined && (
                <span className="text-sm font-black" style={{ color: C }}>{sub.grade}/20</span>
              )}
              {sub.file && (
                <a href={sub.file} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: '#dbeafe', color: '#2563eb' }}>
                  <Download className="h-3.5 w-3.5" /> Fichier
                </a>
              )}
              {/* Quiz score if answered online */}
              {sub.quiz_score !== null && sub.quiz_score !== undefined && (
                <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#d1fae5', color: '#059669' }}>
                  Quiz : {sub.quiz_score}%
                </span>
              )}
            </div>
          </div>

          {sub.content && (
            <div className="rounded-lg p-3" style={{ background: '#f8fafc' }}>
              <p className="text-xs font-bold uppercase mb-1" style={{ color: '#94a3b8' }}>Réponse en ligne</p>
              <p className="text-sm whitespace-pre-wrap" style={{ color: '#334155' }}>{sub.content}</p>
            </div>
          )}

          {gradingId === sub.id ? (
            <div className="space-y-2 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#64748b' }}>Note /20</label>
                  <input type="number" min="0" max="20" step="0.5" value={gradeForm.score}
                    onChange={e => setGradeForm(p => ({ ...p, score: e.target.value }))}
                    className="input-field" placeholder="Ex: 16" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#64748b' }}>Appréciation</label>
                  <input type="text" value={gradeForm.feedback}
                    onChange={e => setGradeForm(p => ({ ...p, feedback: e.target.value }))}
                    className="input-field" placeholder="Optionnel" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => submitGrade(sub)} disabled={!gradeForm.score || saving}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg,${C},${C}cc)` }}>
                  {saving ? 'Enregistrement…' : 'Valider la note'}
                </button>
                <button onClick={() => setGradingId(null)} className="px-4 py-2 rounded-xl text-xs font-semibold border" style={{ color: '#64748b', borderColor: '#e2e8f0' }}>Annuler</button>
              </div>
            </div>
          ) : (
            <button onClick={() => { setGradingId(sub.id); setGradeForm({ score: sub.grade ?? '', feedback: sub.feedback ?? '' }); }}
              className="text-xs font-bold flex items-center gap-1 transition-all"
              style={{ color: C }}>
              <Star className="h-3.5 w-3.5" /> {sub.grade !== null && sub.grade !== undefined ? 'Modifier la note' : 'Attribuer une note'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── ASSIGNMENT FORM MODAL ────────────────────────────────────────────────────

const EMPTY = {
  title: '', description: '', instructions: '',
  class_obj: '', subject: '', due_date: '', max_score: 20,
  allow_late_submission: false,
  course: '', virtual_classroom: '',
};

function AssignmentFormModal({ assignment, classesList = [], subjectsList = [], coursesList = [], classroomsList = [], onClose, onSaved, notify = () => {} }) {
  const [activeTab, setActiveTab] = useState('info');
  const [form, setForm] = useState(assignment ? {
    ...EMPTY,
    title: assignment.title, description: assignment.description || '',
    instructions: assignment.instructions || '',
    class_obj: String(assignment.class_obj || ''), subject: String(assignment.subject || ''),
    due_date: assignment.due_date ? assignment.due_date.slice(0, 16) : '',
    max_score: assignment.max_score || 20,
    allow_late_submission: assignment.allow_late_submission || false,
    course: String(assignment.course || ''), virtual_classroom: String(assignment.virtual_classroom || ''),
  } : { ...EMPTY });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [localAssignment, setLocalAssignment] = useState(assignment || null);
  const fileRef = useRef();

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Deadline as separate date/time inputs so the time can't be silently left at
  // midnight (00:00) — a same-day deadline would then read as already passed.
  // Defaults the time to 23:59 (end of day) until the teacher changes it.
  const [dueDatePart, dueTimePart] = form.due_date ? form.due_date.split('T') : ['', '23:59'];
  const setDueDatePart = (d) => set('due_date', d ? `${d}T${dueTimePart || '23:59'}` : '');
  const setDueTimePart = (t) => set('due_date', dueDatePart ? `${dueDatePart}T${t}` : '');

  const saveInfo = async () => {
    if (!form.title || !form.class_obj || !form.subject || !form.due_date) {
      notify({ type: 'error', title: 'Champs requis manquants', message: 'Titre, classe, matière et date limite sont obligatoires' }); return;
    }
    setSaving(true);
    try {
      const payload = new FormData();
      ['title', 'description', 'instructions', 'class_obj', 'subject', 'due_date', 'max_score', 'allow_late_submission'].forEach(k => {
        if (form[k] !== '' && form[k] !== null && form[k] !== undefined) payload.append(k, form[k]);
      });
      if (form.course) payload.append('course', form.course);
      if (form.virtual_classroom) payload.append('virtual_classroom', form.virtual_classroom);
      if (file) payload.append('attachment', file);

      let saved;
      if (localAssignment) {
        saved = await elearningService.updateAssignment(localAssignment.id, Object.fromEntries(
          [...payload.entries()].filter(([k]) => k !== 'attachment')
        ));
        if (file) {
          const fd2 = new FormData(); fd2.append('attachment', file);
          await elearningService.updateAssignmentWithFile(localAssignment.id, fd2);
        }
      } else {
        saved = await elearningService.createAssignmentWithFile(payload);
      }
      const a = saved?.data ?? saved;
      setLocalAssignment(a);
      notify({ type: 'success', title: localAssignment ? 'Devoir mis à jour' : 'Devoir créé', message: '' });
      setFile(null);
      onSaved(a);
      onClose();
    } catch (e) {
      notify({ type: 'error', title: 'Erreur', message: e.message || 'Erreur lors de la sauvegarde' });
    } finally { setSaving(false); }
  };

  const TABS = [
    { id: 'info', label: 'Informations', icon: FileText },
    { id: 'questions', label: 'Questions / Exercices', icon: ClipboardCheck },
    ...(localAssignment ? [{ id: 'submissions', label: 'Soumissions', icon: Users }] : []),
  ];

  return (
    <Shell open onClose={onClose} title={assignment ? 'Modifier le devoir' : 'Nouveau devoir/exercice'} size="xl" zIndex={60}>
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-2" style={{ background: '#f8fafc' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all"
            style={{ background: activeTab === t.id ? '#fff' : 'transparent', color: activeTab === t.id ? C : '#64748b', boxShadow: activeTab === t.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none' }}>
            <t.icon className="h-3.5 w-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {activeTab === 'info' && (
        <div className="space-y-4">
          <Fld label="Titre" required>
            <input value={form.title} onChange={e => set('title', e.target.value)} className="input-field" placeholder="Ex: Exercice sur les fonctions dérivées" />
          </Fld>
          <Fld label="Description">
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className="input-field resize-none" placeholder="Description du devoir…" />
          </Fld>
          <Fld label="Instructions">
            <textarea value={form.instructions} onChange={e => set('instructions', e.target.value)} rows={2} className="input-field resize-none" placeholder="Consignes pour les étudiants…" />
          </Fld>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Fld label="Classe" required>
              <select value={form.class_obj} onChange={e => set('class_obj', e.target.value)} className="input-field cursor-pointer">
                <option value="">Sélectionner…</option>
                {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Fld>
            <Fld label="Matière" required>
              <select value={form.subject} onChange={e => set('subject', e.target.value)} className="input-field cursor-pointer">
                <option value="">Sélectionner…</option>
                {subjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Fld>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Fld label="Date limite" required>
              <div className="flex gap-2">
                <input type="date" value={dueDatePart} onChange={e => setDueDatePart(e.target.value)} className="input-field flex-1" />
                <input type="time" value={dueTimePart} onChange={e => setDueTimePart(e.target.value)} className="input-field" style={{ width: '6.5rem' }} title="Heure limite (23:59 par défaut = fin de journée)" />
              </div>
            </Fld>
            <Fld label="Note maximale">
              <input type="number" min="1" max="100" value={form.max_score} onChange={e => set('max_score', parseFloat(e.target.value) || 20)} className="input-field" />
            </Fld>
          </div>

          {/* Liens contextuels */}
          <div className="rounded-xl p-4 space-y-3" style={{ border: '1.5px solid #f0f4f9', background: '#fafbff' }}>
            <p className="text-xs font-extrabold uppercase tracking-wide" style={{ color: '#94a3b8' }}>Lier à (optionnel)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Fld label={<><Layers className="inline h-3 w-3 mr-1" />Cours en ligne</>}>
                <select value={form.course} onChange={e => set('course', e.target.value)} className="input-field cursor-pointer">
                  <option value="">Aucun cours</option>
                  {coursesList.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </Fld>
              <Fld label={<><MonitorPlay className="inline h-3 w-3 mr-1" />Classe virtuelle</>}>
                <select value={form.virtual_classroom} onChange={e => set('virtual_classroom', e.target.value)} className="input-field cursor-pointer">
                  <option value="">Aucune classe</option>
                  {classroomsList.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </Fld>
            </div>
          </div>

          {/* Sujet PDF */}
          <Fld label="Fichier sujet (PDF / image)">
            {(() => {
              const existingFile = localAssignment?.attachment;
              const existingName = existingFile ? decodeURIComponent(existingFile.split('/').pop().split('?')[0]) : null;
              const hasFile = !!(file || existingFile);
              const displayName = file ? file.name : existingName;
              return (
                <div className="space-y-2">
                  <div onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all"
                    style={{ border: `2px dashed ${hasFile ? C : '#e2e8f0'}`, background: hasFile ? C_BG : '#f8fafc' }}>
                    <Upload className="h-4 w-4 flex-shrink-0" style={{ color: hasFile ? C : '#94a3b8' }} />
                    <span className="text-sm font-semibold flex-1 truncate" style={{ color: hasFile ? C : '#94a3b8' }}>
                      {displayName || 'Cliquer pour uploader le sujet…'}
                    </span>
                    {hasFile && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-lg flex-shrink-0"
                        style={{ background: file ? '#fce7f3' : '#dbeafe', color: file ? C : '#2563eb' }}>
                        {file ? 'Nouveau' : 'Enregistré'}
                      </span>
                    )}
                    <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.docx" className="hidden"
                      onChange={e => setFile(e.target.files[0] || null)} />
                  </div>
                  {existingFile && (
                    <a href={existingFile} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold" style={{ color: '#2563eb' }}>
                      <Eye className="h-3.5 w-3.5" /> Voir le fichier actuel
                    </a>
                  )}
                </div>
              );
            })()}
          </Fld>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="late" checked={form.allow_late_submission} onChange={e => set('allow_late_submission', e.target.checked)} className="h-4 w-4" />
            <label htmlFor="late" className="text-sm font-semibold" style={{ color: '#475569' }}>Autoriser les soumissions en retard</label>
          </div>

          <div className="flex justify-end gap-3 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold border" style={{ color: '#64748b', borderColor: '#e2e8f0' }}>Annuler</button>
            <button onClick={saveInfo} disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ background: `linear-gradient(135deg,${C},${C}cc)`, boxShadow: `0 4px 14px ${C}40` }}>
              {saving ? 'Enregistrement…' : localAssignment ? 'Mettre à jour' : 'Créer le devoir'}
            </button>
          </div>
        </div>
      )}

      {/* Tab: Questions */}
      {activeTab === 'questions' && localAssignment && (
        <QuizBuilderTab
          assignment={localAssignment}
          notify={notify}
          onQuizLinked={(qid) => setLocalAssignment(p => ({ ...p, quiz: qid }))}
        />
      )}
      {activeTab === 'questions' && !localAssignment && (
        <div className="py-10 text-center">
          <p className="text-sm" style={{ color: '#94a3b8' }}>Enregistrez d'abord les informations pour ajouter des questions.</p>
        </div>
      )}

      {/* Tab: Submissions */}
      {activeTab === 'submissions' && localAssignment && (
        <SubmissionsPanel assignment={localAssignment} notify={notify} />
      )}
    </Shell>
  );
}

// ─── MAIN ASSIGNMENT MANAGER ──────────────────────────────────────────────────

export default function AssignmentManager({ classesList = [], subjectsList = [], selectedClass, courseFilter, notify = () => {} }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const confirm = useConfirm();

  const params = { page_size: 200 };
  if (selectedClass) params.class_obj = selectedClass;
  if (courseFilter) params.course = courseFilter;

  const { data: assignmentsData, loading, refetch } = useApi(
    () => elearningService.getAssignments(params),
    [selectedClass, courseFilter], true
  );
  const { data: coursesData } = useApi(() => elearningService.getCourses({ page_size: 100 }), [], true);
  const { data: classroomsData } = useApi(() => elearningService.getClassrooms({ page_size: 100 }), [], true);

  const assignments = assignmentsData?.results ?? assignmentsData ?? [];
  const coursesList = coursesData?.results ?? coursesData ?? [];
  const classroomsList = classroomsData?.results ?? classroomsData ?? [];

  const paginated = assignments.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(assignments.length / ITEMS_PER_PAGE);

  const handleDelete = async (a) => {
    if (!await confirm({ title: `Supprimer "${a.title}" ?`, confirmLabel: 'Supprimer', destructive: true })) return;
    try {
      await elearningService.deleteAssignment(a.id); refetch();
      notify({ type: 'success', title: 'Devoir supprimé', message: '' });
    } catch (e) {
      notify({ type: 'error', title: 'Erreur', message: e.message || 'Erreur lors de la suppression' });
    }
  };

  const handlePublish = async (a) => {
    try {
      await elearningService.publishAssignment(a.id); refetch();
      notify({ type: 'success', title: 'Devoir publié', message: '' });
    } catch (e) {
      notify({ type: 'error', title: 'Erreur', message: e.message || 'Erreur lors de la publication' });
    }
  };

  const ST = {
    PUBLISHED: { label: 'Publié', bg: '#d1fae5', color: '#059669' },
    DRAFT:     { label: 'Brouillon', bg: '#fef9c3', color: '#92400e' },
    CLOSED:    { label: 'Fermé', bg: '#fee2e2', color: '#991b1b' },
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold" style={{ color: '#0f172a' }}>Devoirs & Exercices</h2>
          <p className="text-xs font-semibold mt-0.5" style={{ color: '#94a3b8' }}>{assignments.length} devoir{assignments.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ background: `linear-gradient(135deg,${C},#be185d)`, boxShadow: `0 4px 14px ${C}40` }}>
          <Plus className="h-4 w-4" /> Nouveau devoir
        </button>
      </div>

      {assignments.length === 0 ? (
        <div className="flex flex-col items-center py-16 rounded-2xl" style={{ border: '1.5px dashed #e2e8f0' }}>
          <ClipboardList className="h-10 w-10 mb-3 opacity-30" style={{ color: C }} />
          <p className="text-sm font-bold" style={{ color: '#64748b' }}>Aucun devoir pour le moment</p>
          <p className="text-xs mt-1 mb-4" style={{ color: '#94a3b8' }}>Créez des devoirs liés à vos cours ou classes virtuelles</p>
          <button onClick={() => { setEditing(null); setShowModal(true); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: `linear-gradient(135deg,${C},#be185d)` }}>
            <Plus className="h-4 w-4" /> Créer un devoir
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {paginated.map(a => {
              const st = ST[a.status] || ST.DRAFT;
              return (
                <div key={a.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-2xl transition-all" style={{ border: '1.5px solid #f0f4f9', background: '#fff' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#fafbff'; e.currentTarget.style.borderColor = '#f0e0ee'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#f0f4f9'; }}>
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: C_ICON }}>
                      <ClipboardList className="h-5 w-5" style={{ color: C }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-extrabold" style={{ color: '#0f172a' }}>{a.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        {a.quiz && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#ede9fe', color: '#7c3aed' }}>Exercices en ligne</span>}
                        {a.course_title && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: C_BG, color: C }}><Layers className="inline h-2.5 w-2.5 mr-0.5" />{a.course_title}</span>}
                        {a.classroom_title && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#dbeafe', color: '#2563eb' }}><MonitorPlay className="inline h-2.5 w-2.5 mr-0.5" />{a.classroom_title}</span>}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-xs" style={{ color: '#64748b' }}>
                        <span>{a.class_name}</span>
                        <span>·</span>
                        <span>{a.subject_name}</span>
                        {a.due_date && <><span>·</span><span style={{ color: new Date(a.due_date) < new Date() ? '#ef4444' : '#64748b' }}><Calendar className="inline h-3 w-3 mr-0.5" />{new Date(a.due_date).toLocaleDateString('fr-FR')}</span></>}
                        {a.submission_count > 0 && <><span>·</span><span style={{ color: '#7c3aed' }}>{a.submission_count} soumission{a.submission_count > 1 ? 's' : ''}</span></>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 self-end sm:self-auto">
                    {a.status === 'DRAFT' && <IconBtn onClick={() => handlePublish(a)} icon={CheckCircle} color="#059669" hoverBg="#d1fae5" title="Publier" />}
                    <IconBtn onClick={() => { setEditing(a); setShowModal(true); }} icon={Edit} color="#2563eb" hoverBg="#dbeafe" title="Modifier / Questions / Soumissions" />
                    <IconBtn onClick={() => handleDelete(a)} icon={Trash2} color="#ef4444" hoverBg="#fee2e2" title="Supprimer" />
                  </div>
                </div>
              );
            })}
          </div>
          {totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} accentColor={C} totalItems={assignments.length} itemsPerPage={ITEMS_PER_PAGE} />}
        </>
      )}

      {showModal && (
        <AssignmentFormModal
          assignment={editing}
          classesList={classesList}
          subjectsList={subjectsList}
          coursesList={coursesList}
          classroomsList={classroomsList}
          notify={notify}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={() => refetch()}
        />
      )}
    </div>
  );
}
