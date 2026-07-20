import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Edit, Trash2, X, ClipboardCheck, CheckCircle, Layers,
  ListChecks, Type, Calculator, GitCompare, ArrowUpDown, ChevronRight,
  BarChart2, Sparkles, Award, AlertCircle, Check, ChevronDown, ChevronUp,
  Loader, GraduationCap, Users, Target, TrendingUp, ToggleLeft,
} from 'lucide-react';
import { elearningService } from '../../../services';
import { useApi } from '../../../hooks/useApi';
import { PageHeader, FilterSelect, PrimaryButton, IconBtn, Pagination } from '../../../components/ui/PageHeader';
import { useConfirm } from '../../../components/ConfirmDialog';

const COLOR = '#7c3aed'; const COLOR_BG = '#ede9fe'; const COLOR_ICON = '#ddd6fe';
const ITEMS_PER_PAGE = 8;

const QUESTION_TYPES = [
  { type: 'QCU',       label: 'Choix unique',    icon: CheckCircle, color: '#2563eb' },
  { type: 'QCM',       label: 'Choix multiple',  icon: ListChecks,  color: '#7c3aed' },
  { type: 'TRUEFALSE', label: 'Vrai ou Faux',    icon: ToggleLeft,  color: '#0891b2' },
  { type: 'TEXT',      label: 'Texte libre',     icon: Type,        color: '#64748b' },
  { type: 'NUMERIC',   label: 'Calcul',          icon: Calculator,  color: '#d97706' },
  { type: 'MATCHING',  label: 'Association',     icon: GitCompare,  color: '#059669' },
  { type: 'ORDERING',  label: 'Glisser-déposer', icon: ArrowUpDown, color: '#db2777' },
];
const getTypeMeta = (t) => QUESTION_TYPES.find(q => q.type === t) || QUESTION_TYPES[0];

function ModalShell({ open, onClose, title, subtitle, zIndex = 50, size = 'md', children }) {
  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-3xl', xl: 'max-w-4xl' };
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4" style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)', zIndex }} onClick={onClose}>
      <div className={`bg-white rounded-2xl w-full ${widths[size]} max-h-[92vh] overflow-y-auto`} style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div className="h-1 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${COLOR}, #6366f1, #db2777)` }} />
        <div className="flex items-center justify-between px-4 sm:px-6 py-4" style={{ background: 'linear-gradient(135deg, #fafbff, #ffffff)', borderBottom: '1px solid #f1f5f9' }}>
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

const Field = ({ label, required, children, hint }) => (
  <div>
    <label className="block mb-1.5" style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
    </label>
    {children}
    {hint && <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>{hint}</p>}
  </div>
);

const ModalFooter = ({ onCancel, loading, submitLabel }) => (
  <div className="flex justify-end gap-3 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
    <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl text-sm font-semibold border hover:bg-slate-50" style={{ color: '#64748b', borderColor: '#e2e8f0' }}>Annuler</button>
    <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
      style={{ background: `linear-gradient(135deg, ${COLOR}, ${COLOR}cc)`, boxShadow: `0 4px 14px ${COLOR}40` }}>
      {loading ? 'Enregistrement…' : submitLabel}
    </button>
  </div>
);

function emptyChoiceFor(type) {
  if (type === 'MATCHING') return { text: '', match_text: '' };
  return { text: '', is_correct: false };
}
function needsChoicesFor(t) { return ['QCU', 'QCM', 'MATCHING', 'ORDERING'].includes(t); }

// ─── Single question form block (reusable, no modal) ──────────────────────────
function QuestionFormBlock({ q, qIdx, total, onUpdate, onRemove }) {
  const nc = needsChoicesFor(q.question_type);

  const updateChoice = (cIdx, patch) => onUpdate({
    choices: q.choices.map((c, i) => i === cIdx ? { ...c, ...patch } : c),
  });
  const toggleQCU = (cIdx) => onUpdate({
    choices: q.choices.map((c, i) => ({ ...c, is_correct: i === cIdx })),
  });
  const addChoice = () => onUpdate({ choices: [...q.choices, emptyChoiceFor(q.question_type)] });
  const removeChoice = (cIdx) => onUpdate({ choices: q.choices.filter((_, i) => i !== cIdx) });
  const changeType = (type) => {
    const base = needsChoicesFor(type)
      ? (q.choices.length >= 2 ? q.choices : [emptyChoiceFor(type), emptyChoiceFor(type)])
      : q.choices;
    onUpdate({ question_type: type, choices: base });
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${COLOR}22` }}>
      {/* Block header */}
      <div className="flex items-center justify-between px-5 py-3" style={{ background: `${COLOR}08` }}>
        <span className="text-xs font-black uppercase tracking-widest" style={{ color: COLOR }}>
          Question {qIdx + 1}
        </span>
        {total > 1 && (
          <button type="button" onClick={onRemove}
                  className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors hover:bg-red-50"
                  style={{ color: '#ef4444' }}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="p-5 space-y-4" style={{ background: 'white' }}>
        {/* Type */}
        <Field label="Type" required>
          <div className="flex flex-wrap gap-1.5">
            {QUESTION_TYPES.map(t => (
              <button key={t.type} type="button" onClick={() => changeType(t.type)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{ background: q.question_type === t.type ? `${t.color}1f` : '#f8fafc', color: q.question_type === t.type ? t.color : '#94a3b8', border: `1.5px solid ${q.question_type === t.type ? t.color + '40' : '#f0f4f9'}` }}>
                <t.icon className="h-3 w-3" /> {t.label}
              </button>
            ))}
          </div>
        </Field>

        {/* Énoncé */}
        <Field label="Énoncé" required>
          <textarea value={q.text} onChange={e => onUpdate({ text: e.target.value })}
                    rows={2} className="input-field resize-none" placeholder="Posez votre question…" />
        </Field>

        {/* Points + Explication */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Points">
            <input type="number" min="0.5" step="0.5" value={q.points}
                   onChange={e => onUpdate({ points: parseFloat(e.target.value) || 1 })} className="input-field" />
          </Field>
          <Field label="Explication (affichée après correction)">
            <input type="text" value={q.explanation}
                   onChange={e => onUpdate({ explanation: e.target.value })} className="input-field" placeholder="Optionnel" />
          </Field>
        </div>

        {/* NUMERIC */}
        {q.question_type === 'NUMERIC' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Réponse attendue" required>
              <input type="number" step="any" value={q.numeric_answer}
                     onChange={e => onUpdate({ numeric_answer: e.target.value })} className="input-field" />
            </Field>
            <Field label="Tolérance (±)">
              <input type="number" step="any" min="0" value={q.numeric_tolerance}
                     onChange={e => onUpdate({ numeric_tolerance: e.target.value })} className="input-field" />
            </Field>
          </div>
        )}

        {/* TEXT */}
        {q.question_type === 'TEXT' && (
          <Field label="Réponse de référence" hint="Optionnel — laissez vide pour correction manuelle.">
            <input type="text" value={q.text_answer}
                   onChange={e => onUpdate({ text_answer: e.target.value })} className="input-field" placeholder="Optionnel" />
          </Field>
        )}

        {/* TRUEFALSE */}
        {q.question_type === 'TRUEFALSE' && (
          <Field label="Bonne réponse" required>
            <div className="flex gap-3">
              {[{ val: 'VRAI', label: '✓ Vrai', color: '#059669' }, { val: 'FAUX', label: '✗ Faux', color: '#ef4444' }].map(opt => (
                <button key={opt.val} type="button" onClick={() => onUpdate({ true_false_answer: opt.val })}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{ background: q.true_false_answer === opt.val ? `${opt.color}18` : '#f8fafc', color: q.true_false_answer === opt.val ? opt.color : '#94a3b8', border: `1.5px solid ${q.true_false_answer === opt.val ? opt.color + '40' : '#f0f4f9'}` }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>
        )}

        {/* QCU / QCM */}
        {(q.question_type === 'QCU' || q.question_type === 'QCM') && (
          <Field label={q.question_type === 'QCU' ? 'Choix — sélectionnez la bonne réponse' : 'Choix — cochez les bonnes réponses'} required>
            <div className="space-y-2">
              {q.choices.map((c, cIdx) => (
                <div key={cIdx} className="flex items-center gap-2">
                  <input type={q.question_type === 'QCU' ? 'radio' : 'checkbox'}
                         name={`qblock_${qIdx}_correct`}
                         checked={!!c.is_correct}
                         onChange={() => q.question_type === 'QCU' ? toggleQCU(cIdx) : updateChoice(cIdx, { is_correct: !c.is_correct })}
                         className="h-4 w-4 flex-shrink-0" />
                  <input type="text" value={c.text} onChange={e => updateChoice(cIdx, { text: e.target.value })}
                         className="input-field flex-1" placeholder={`Choix ${cIdx + 1}`} />
                  <button type="button" onClick={() => removeChoice(cIdx)}
                          className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ color: '#ef4444' }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addChoice} className="text-xs font-bold flex items-center gap-1" style={{ color: COLOR }}>
                <Plus className="h-3.5 w-3.5" /> Ajouter un choix
              </button>
            </div>
          </Field>
        )}

        {/* MATCHING */}
        {q.question_type === 'MATCHING' && (
          <Field label="Paires à associer" required>
            <div className="space-y-2">
              {q.choices.map((c, cIdx) => (
                <div key={cIdx} className="flex items-center gap-2">
                  <input type="text" value={c.text} onChange={e => updateChoice(cIdx, { text: e.target.value })}
                         className="input-field flex-1" placeholder="Élément" />
                  <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: '#94a3b8' }} />
                  <input type="text" value={c.match_text || ''} onChange={e => updateChoice(cIdx, { match_text: e.target.value })}
                         className="input-field flex-1" placeholder="Correspond à…" />
                  <button type="button" onClick={() => removeChoice(cIdx)}
                          className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ color: '#ef4444' }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addChoice} className="text-xs font-bold flex items-center gap-1" style={{ color: COLOR }}>
                <Plus className="h-3.5 w-3.5" /> Ajouter une paire
              </button>
            </div>
          </Field>
        )}

        {/* ORDERING */}
        {q.question_type === 'ORDERING' && (
          <Field label="Éléments dans l'ordre correct" required hint="L'ordre ci-dessous est l'ordre correct attendu de l'étudiant.">
            <div className="space-y-2">
              {q.choices.map((c, cIdx) => (
                <div key={cIdx} className="flex items-center gap-2">
                  <span className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: COLOR_ICON, color: COLOR }}>{cIdx + 1}</span>
                  <input type="text" value={c.text} onChange={e => updateChoice(cIdx, { text: e.target.value })}
                         className="input-field flex-1" placeholder={`Étape ${cIdx + 1}`} />
                  <button type="button" onClick={() => removeChoice(cIdx)}
                          className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ color: '#ef4444' }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addChoice} className="text-xs font-bold flex items-center gap-1" style={{ color: COLOR }}>
                <Plus className="h-3.5 w-3.5" /> Ajouter un élément
              </button>
            </div>
          </Field>
        )}
      </div>
    </div>
  );
}

// ─── Batch question editor (add multiple / edit one) ──────────────────────────
function BatchQuestionEditor({ quiz, editingQuestion, onClose, onSaved, notify }) {
  const makeQ = () => ({
    _key: Math.random().toString(36).slice(2),
    question_type: 'QCU', text: '', points: 1, explanation: '',
    choices: [emptyChoiceFor('QCU'), emptyChoiceFor('QCU')],
    true_false_answer: 'VRAI', numeric_answer: '', numeric_tolerance: 0, text_answer: '',
  });

  const [questions, setQuestions] = useState(() => {
    if (editingQuestion) {
      return [{
        _key: 'edit',
        question_type: editingQuestion.question_type,
        text: editingQuestion.text,
        points: editingQuestion.points || 1,
        explanation: editingQuestion.explanation || '',
        choices: (editingQuestion.choices || []).map(c => ({ text: c.text, is_correct: c.is_correct, match_text: c.match_text || '' })),
        true_false_answer: editingQuestion.question_type === 'TRUEFALSE'
          ? ((editingQuestion.choices || []).find(c => c.text === 'Vrai' && c.is_correct) ? 'VRAI' : 'FAUX')
          : 'VRAI',
        numeric_answer: editingQuestion.numeric_answer ?? '',
        numeric_tolerance: editingQuestion.numeric_tolerance ?? 0,
        text_answer: editingQuestion.text_answer || '',
      }];
    }
    return [makeQ()];
  });
  const [saving, setSaving] = useState(false);

  const updateQ = (idx, patch) => setQuestions(qs => qs.map((q, i) => i === idx ? { ...q, ...patch } : q));
  const addQuestion = () => setQuestions(qs => [...qs, makeQ()]);
  const removeQuestion = (idx) => setQuestions(qs => qs.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) return notify({ type: 'error', title: 'Erreur', message: `Question ${i + 1} : l'énoncé est requis` });
      if (needsChoicesFor(q.question_type)) {
        const empty = q.choices.filter(c => !c.text.trim());
        if (empty.length) return notify({ type: 'error', title: 'Erreur', message: `Question ${i + 1} : remplissez ou supprimez les choix vides` });
        if (q.question_type === 'QCU' && !q.choices.some(c => c.is_correct))
          return notify({ type: 'error', title: 'Erreur', message: `Question ${i + 1} : sélectionnez la bonne réponse` });
        if (q.question_type === 'QCM' && !q.choices.some(c => c.is_correct))
          return notify({ type: 'error', title: 'Erreur', message: `Question ${i + 1} : sélectionnez au moins une bonne réponse` });
      }
      if (q.question_type === 'MATCHING' && q.choices.some(c => !c.match_text?.trim()))
        return notify({ type: 'error', title: 'Erreur', message: `Question ${i + 1} : complétez toutes les paires` });
    }

    setSaving(true);
    try {
      const baseOrder = editingQuestion ? editingQuestion.order : (quiz.question_count || 0);
      // Questions are independent of each other — save them concurrently
      // instead of one sequential round-trip at a time.
      await Promise.all(questions.map(async (q, idx) => {
        const payload = {
          quiz: quiz.id, question_type: q.question_type, text: q.text.trim(),
          points: q.points, explanation: q.explanation,
          numeric_answer: q.question_type === 'NUMERIC' ? (q.numeric_answer || null) : null,
          numeric_tolerance: q.question_type === 'NUMERIC' ? (parseFloat(q.numeric_tolerance) || 0) : 0,
          text_answer: q.question_type === 'TEXT' ? q.text_answer : '',
          order: baseOrder + idx,
        };
        let question;
        if (editingQuestion) {
          question = await elearningService.updateQuestion(editingQuestion.id, payload);
          await Promise.all((editingQuestion.choices || []).map(c => elearningService.deleteChoice(c.id)));
        } else {
          question = await elearningService.createQuestion(payload);
        }
        if (needsChoicesFor(q.question_type)) {
          const valid = q.choices.filter(c => c.text.trim());
          await Promise.all(valid.map((c, i) => elearningService.createChoice({
            question: question.id, text: c.text.trim(), is_correct: !!c.is_correct,
            match_text: c.match_text || '', order: i,
          })));
        }
        if (q.question_type === 'TRUEFALSE') {
          await Promise.all([
            elearningService.createChoice({ question: question.id, text: 'Vrai', is_correct: q.true_false_answer === 'VRAI', order: 0 }),
            elearningService.createChoice({ question: question.id, text: 'Faux', is_correct: q.true_false_answer === 'FAUX', order: 1 }),
          ]);
        }
      }));
      const n = questions.length;
      notify({ type: 'success', title: editingQuestion ? 'Question modifiée' : `${n} question${n > 1 ? 's' : ''} ajoutée${n > 1 ? 's' : ''}`, message: '' });
      onSaved();
    } catch (err) {
      notify({ type: 'error', title: 'Erreur', message: err.message || 'Erreur lors de l\'enregistrement' });
    } finally { setSaving(false); }
  };

  const n = questions.length;
  const submitLabel = editingQuestion ? 'Mettre à jour' : `Ajouter ${n} question${n > 1 ? 's' : ''}`;

  return (
    <ModalShell open onClose={onClose}
                title={editingQuestion ? 'Modifier la question' : 'Ajouter des questions au quiz'}
                subtitle={editingQuestion ? undefined : `${quiz.title} · ${n} question${n > 1 ? 's' : ''} en cours de saisie`}
                zIndex={95} size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {questions.map((q, idx) => (
          <QuestionFormBlock key={q._key} q={q} qIdx={idx} total={n}
            onUpdate={(patch) => updateQ(idx, patch)}
            onRemove={() => removeQuestion(idx)} />
        ))}

        {!editingQuestion && (
          <button type="button" onClick={addQuestion}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed text-sm font-bold transition-all"
                  style={{ borderColor: `${COLOR}40`, color: COLOR }}
                  onMouseEnter={e => e.currentTarget.style.background = `${COLOR}06`}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <Plus className="h-4 w-4" /> Ajouter une question
          </button>
        )}

        <ModalFooter onCancel={onClose} loading={saving} submitLabel={submitLabel} />
      </form>
    </ModalShell>
  );
}

function QuizBuilderModal({ quiz, onClose, notify, onUpdated }) {
  const { data: questionsData, refetch } = useApi(() => elearningService.getQuestions(quiz.id), [quiz.id], true);
  const questions = (questionsData?.results || questionsData || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const [showEditor, setShowEditor] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const confirm = useConfirm();

  const handleDeleteQuestion = async (q) => {
    if (!await confirm({ title: 'Supprimer cette question ?', message: 'Cette action est irréversible.', confirmLabel: 'Supprimer', destructive: true })) return;
    try { await elearningService.deleteQuestion(q.id); notify({ type: 'success', title: 'Question supprimée', message: '' }); refetch(); onUpdated(); }
    catch { notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la suppression' }); }
  };

  return (
    <ModalShell open onClose={onClose} title="Questions du quiz" subtitle={quiz.title} zIndex={90} size="xl">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#64748b' }}>{questions.length} question{questions.length > 1 ? 's' : ''}</p>
        <button onClick={() => { setEditingQuestion(null); setShowEditor(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white"
          style={{ background: `linear-gradient(135deg,${COLOR},#6366f1)`, boxShadow: `0 4px 14px ${COLOR}40` }}>
          <Plus className="h-3.5 w-3.5" /> Ajouter une question
        </button>
      </div>

      {questions.length === 0 ? (
        <div className="flex flex-col items-center py-14 rounded-xl" style={{ border: '1.5px dashed #e2e8f0' }}>
          <ClipboardCheck className="h-8 w-8 mb-2 opacity-40" style={{ color: COLOR }} />
          <p className="text-sm font-semibold" style={{ color: '#64748b' }}>Aucune question pour le moment</p>
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map((q, idx) => {
            const meta = getTypeMeta(q.question_type);
            return (
              <div key={q.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ border: '1.5px solid #f0f4f9' }}>
                <span className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0" style={{ background: COLOR_ICON, color: COLOR }}>{idx + 1}</span>
                <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${meta.color}15` }}>
                  <meta.icon className="h-4 w-4" style={{ color: meta.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: '#0f172a' }}>{q.text}</p>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded-md font-bold" style={{ background: `${meta.color}12`, color: meta.color }}>{meta.label}</span>
                    <span style={{ color: '#94a3b8' }}>{q.points} pt{q.points > 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <IconBtn onClick={() => { setEditingQuestion(q); setShowEditor(true); }} icon={Edit} color="#2563eb" hoverBg="#dbeafe" title="Modifier" />
                  <IconBtn onClick={() => handleDeleteQuestion(q)} icon={Trash2} color="#ef4444" hoverBg="#fee2e2" title="Supprimer" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showEditor && (
        <BatchQuestionEditor quiz={{ ...quiz, question_count: questions.length }} editingQuestion={editingQuestion}
          onClose={() => { setShowEditor(false); setEditingQuestion(null); }}
          onSaved={() => { setShowEditor(false); setEditingQuestion(null); refetch(); onUpdated(); }}
          notify={notify} />
      )}
    </ModalShell>
  );
}

function QuizFormModal({ quiz, classesList = [], subjectsList = [], lessons = [], onClose, onSaved, notify }) {
  const [form, setForm] = useState(quiz ? {
    title: quiz.title, description: quiz.description || '', class_obj: quiz.class_obj, subject: quiz.subject,
    lesson: quiz.lesson || '', time_limit_minutes: quiz.time_limit_minutes || 0, max_attempts: quiz.max_attempts || 0,
    pass_score_percent: quiz.pass_score_percent || 50, shuffle_questions: quiz.shuffle_questions ?? true, is_published: quiz.is_published || false,
  } : { title: '', description: '', class_obj: '', subject: '', lesson: '', time_limit_minutes: 0, max_attempts: 0, pass_score_percent: 50, shuffle_questions: true, is_published: false });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.class_obj || !form.subject) return notify({ type: 'error', title: 'Erreur', message: 'Titre, classe et matière sont requis' });
    setSaving(true);
    try {
      const payload = { ...form, lesson: form.lesson || null };
      if (quiz) { await elearningService.updateQuiz(quiz.id, payload); notify({ type: 'success', title: 'Quiz modifié', message: '' }); }
      else { await elearningService.createQuiz(payload); notify({ type: 'success', title: 'Quiz créé', message: '' }); }
      onSaved();
    } catch (err) { notify({ type: 'error', title: 'Erreur', message: err.message || 'Erreur lors de l\'enregistrement' }); }
    finally { setSaving(false); }
  };

  return (
    <ModalShell open onClose={onClose} title={quiz ? 'Modifier le quiz' : 'Nouveau Quiz'} zIndex={50}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Titre" required><input type="text" required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="input-field" /></Field>
        <Field label="Description"><textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className="input-field resize-none" /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Classe" required>
            <select required value={form.class_obj} onChange={e => setForm(p => ({ ...p, class_obj: e.target.value }))} className="input-field cursor-pointer">
              <option value="">Sélectionner…</option>
              {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Matière" required>
            <select required value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} className="input-field cursor-pointer">
              <option value="">Sélectionner…</option>
              {subjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Leçon associée (verrouillage)" hint="Si définie, l'étudiant doit réussir ce quiz pour débloquer la suite (si 'devoir/quiz obligatoire' activé sur la leçon).">
          <select value={form.lesson} onChange={e => setForm(p => ({ ...p, lesson: e.target.value }))} className="input-field cursor-pointer">
            <option value="">Aucune</option>
            {lessons.filter(l => l.class_obj === form.class_obj && l.subject === form.subject).map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Limite (minutes)" hint="0 = illimité"><input type="number" min="0" value={form.time_limit_minutes} onChange={e => setForm(p => ({ ...p, time_limit_minutes: parseInt(e.target.value) || 0 }))} className="input-field" /></Field>
          <Field label="Tentatives max" hint="0 = illimité"><input type="number" min="0" value={form.max_attempts} onChange={e => setForm(p => ({ ...p, max_attempts: parseInt(e.target.value) || 0 }))} className="input-field" /></Field>
          <Field label="Score pour réussir (%)"><input type="number" min="0" max="100" value={form.pass_score_percent} onChange={e => setForm(p => ({ ...p, pass_score_percent: parseInt(e.target.value) || 0 }))} className="input-field" /></Field>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#475569' }}>
            <input type="checkbox" checked={form.shuffle_questions} onChange={e => setForm(p => ({ ...p, shuffle_questions: e.target.checked }))} className="h-4 w-4 rounded" />
            Mélanger les questions
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#475569' }}>
            <input type="checkbox" checked={form.is_published} onChange={e => setForm(p => ({ ...p, is_published: e.target.checked }))} className="h-4 w-4 rounded" />
            Publié (visible des étudiants)
          </label>
        </div>
        <ModalFooter onCancel={onClose} loading={saving} submitLabel={quiz ? 'Mettre à jour' : 'Créer'} />
      </form>
    </ModalShell>
  );
}

// ─── Quiz Analytics Panel ──────────────────────────────────────────────────────
function QuizAnalyticsModal({ quiz, onClose, notify }) {
  const { data, loading, error } = useApi(() => elearningService.getQuizAnalytics(quiz.id), [quiz.id], true);
  const [gradingAnswer, setGradingAnswer] = useState(null);
  const [gradeForm, setGradeForm] = useState({ is_correct: true, points_earned: 0, feedback: '' });
  const [saving, setSaving] = useState(false);

  const submitGrade = async (attemptId) => {
    setSaving(true);
    try {
      await elearningService.gradeTextAnswer(attemptId, {
        answer_id: gradingAnswer.id,
        is_correct: gradeForm.is_correct,
        points_earned: parseFloat(gradeForm.points_earned),
        feedback: gradeForm.feedback,
      });
      notify({ type: 'success', title: 'Note enregistrée', message: '' });
      setGradingAnswer(null);
    } catch {
      notify({ type: 'error', title: 'Erreur', message: 'Impossible d\'enregistrer la note' });
    }
    setSaving(false);
  };

  if (loading) return (
    <ModalShell open onClose={onClose} title="Analytiques" subtitle={quiz.title} zIndex={90} size="xl">
      <div className="flex items-center justify-center py-16"><Loader className="animate-spin h-8 w-8 text-purple-600" /></div>
    </ModalShell>
  );

  const stats = data || {};
  const questions = stats.questions || [];
  const students = stats.student_results || [];
  const ungraded = stats.ungraded || [];

  return (
    <ModalShell open onClose={onClose} title="Analytiques du quiz" subtitle={quiz.title} zIndex={90} size="xl">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Tentatives', value: stats.total_attempts || 0, icon: Users, color: '#2563eb', bg: '#dbeafe' },
          { label: 'Réussite', value: `${(stats.pass_rate || 0).toFixed(0)}%`, icon: Target, color: '#059669', bg: '#d1fae5' },
          { label: 'Score moyen', value: `${(stats.average_score || 0).toFixed(1)}%`, icon: TrendingUp, color: '#d97706', bg: '#fef3c7' },
          { label: 'À corriger', value: ungraded.length, icon: AlertCircle, color: '#dc2626', bg: '#fee2e2' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl p-3.5" style={{ background: bg }}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={14} style={{ color }} />
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color }}>{label}</span>
            </div>
            <p className="text-2xl font-black" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Per-question stats */}
      {questions.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Analyse par question</p>
          <div className="space-y-2">
            {questions.map((q, i) => {
              const rate = q.success_rate || 0;
              return (
                <div key={q.id} className="p-3 rounded-xl border border-gray-100">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="w-6 h-6 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-sm text-gray-700 font-medium flex-1">{q.text}</p>
                    <span className={`text-xs font-bold flex-shrink-0 ${rate >= 70 ? 'text-green-600' : rate >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                      {rate.toFixed(0)}% réussite
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${rate >= 70 ? 'bg-green-400' : rate >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${rate}%` }} />
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-gray-400">
                    <span>{q.total_answers} rép.</span>
                    <span className="text-green-600">{q.correct} correctes</span>
                    <span className="text-red-500">{q.incorrect} incorrectes</span>
                    {q.pending > 0 && <span className="text-amber-500">{q.pending} à corriger</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top students */}
      {students.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Classement des étudiants</p>
          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {students.map((s, i) => (
              <div key={s.attempt_id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50">
                <span className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center flex-shrink-0 ${
                  i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-amber-700 text-white' : 'bg-gray-200 text-gray-500'
                }`}>{i + 1}</span>
                <span className="flex-1 text-sm font-medium text-gray-700 truncate">{s.student_name}</span>
                <span className={`text-sm font-bold ${s.is_passed ? 'text-green-600' : 'text-red-500'}`}>
                  {parseFloat(s.percent).toFixed(1)}%
                </span>
                {s.is_passed && <Check size={14} className="text-green-500 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ungraded TEXT answers */}
      {ungraded.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Réponses à corriger manuellement ({ungraded.length})</p>
          <div className="space-y-2">
            {ungraded.map(a => (
              <div key={a.id} className="p-3 rounded-xl border-2 border-amber-200 bg-amber-50">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-xs font-bold text-amber-700 mb-0.5">{a.student_name}</p>
                    <p className="text-sm text-gray-700">{a.question_text}</p>
                  </div>
                  <button onClick={() => { setGradingAnswer(a); setGradeForm({ is_correct: false, points_earned: 0, feedback: '' }); }}
                    className="flex-shrink-0 text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-amber-600">
                    Corriger
                  </button>
                </div>
                <div className="bg-white rounded-lg px-3 py-2 text-sm text-gray-600 border border-amber-100">
                  {a.response || <em className="text-gray-400">Réponse vide</em>}
                </div>

                {gradingAnswer?.id === a.id && (
                  <div className="mt-3 space-y-2">
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" checked={gradeForm.is_correct === true} onChange={() => setGradeForm(p => ({ ...p, is_correct: true }))} />
                        <span className="text-green-700 font-semibold">Correcte</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" checked={gradeForm.is_correct === false} onChange={() => setGradeForm(p => ({ ...p, is_correct: false }))} />
                        <span className="text-red-600 font-semibold">Incorrecte</span>
                      </label>
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-xs text-gray-500">Points:</span>
                        <input type="number" step="0.5" min="0" value={gradeForm.points_earned}
                          onChange={e => setGradeForm(p => ({ ...p, points_earned: e.target.value }))}
                          className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-xs" />
                      </div>
                    </div>
                    <input type="text" placeholder="Commentaire pour l'étudiant (optionnel)"
                      value={gradeForm.feedback} onChange={e => setGradeForm(p => ({ ...p, feedback: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs" />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setGradingAnswer(null)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5">Annuler</button>
                      <button onClick={() => submitGrade(a.attempt_id)} disabled={saving}
                        className="text-xs bg-purple-600 text-white px-4 py-1.5 rounded-lg font-semibold disabled:opacity-50">
                        {saving ? 'Enregistrement...' : 'Valider'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && questions.length === 0 && students.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <BarChart2 size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Aucune tentative enregistrée pour ce quiz.</p>
        </div>
      )}
    </ModalShell>
  );
}

// ─── AI Question Generator ─────────────────────────────────────────────────────
function AIGenerateModal({ quiz, onClose, notify, onGenerated }) {
  const [form, setForm] = useState({ topic: '', count: 5, question_type: 'QCU', level: 'moyen' });
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState(null);

  const generate = async () => {
    if (!form.topic.trim()) return notify({ type: 'error', title: 'Sujet requis', message: 'Précisez le sujet pour la génération IA' });
    setGenerating(true);
    setPreview(null);
    try {
      const res = await elearningService.aiGenerateQuestions(quiz.id, form);
      setPreview(res);
      notify({ type: 'success', title: `${res.created} questions générées`, message: 'Les questions ont été ajoutées au quiz' });
      onGenerated();
    } catch (e) {
      notify({ type: 'error', title: 'Erreur IA', message: e.message || 'La génération a échoué' });
    }
    setGenerating(false);
  };

  return (
    <ModalShell open onClose={onClose} title="Générer des questions par IA" subtitle={quiz.title} zIndex={90} size="md">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 border border-purple-200 mb-4">
        <Sparkles size={20} className="text-purple-600 flex-shrink-0" />
        <p className="text-xs text-purple-700">Claude va générer des questions adaptées au sujet que vous indiquez et les ajouter directement au quiz.</p>
      </div>

      <div className="space-y-4">
        <Field label="Sujet / Thème" required>
          <input type="text" value={form.topic} onChange={e => setForm(p => ({ ...p, topic: e.target.value }))}
            className="input-field" placeholder="Ex: La photosynthèse, Les équations du 2nd degré…" />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Nombre" hint="max 20">
            <input type="number" min={1} max={20} value={form.count} onChange={e => setForm(p => ({ ...p, count: parseInt(e.target.value) || 5 }))}
              className="input-field" />
          </Field>
          <Field label="Type">
            <select value={form.question_type} onChange={e => setForm(p => ({ ...p, question_type: e.target.value }))} className="input-field cursor-pointer">
              {QUESTION_TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Niveau">
            <select value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))} className="input-field cursor-pointer">
              {['facile', 'moyen', 'difficile', 'expert'].map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
            </select>
          </Field>
        </div>

        <button onClick={generate} disabled={generating}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-white disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)' }}>
          {generating ? <><Loader size={16} className="animate-spin" /> Génération en cours…</> : <><Sparkles size={16} /> Générer {form.count} questions</>}
        </button>

        {preview && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800">
            <div className="flex items-center gap-2 font-bold mb-1"><Check size={14} /> {preview.created} questions ajoutées au quiz</div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

export default function QuizManager({ classesList = [], subjectsList = [], lessons = [], selectedClass, notify = () => {} }) {
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [builderQuiz, setBuilderQuiz] = useState(null);
  const [analyticsQuiz, setAnalyticsQuiz] = useState(null);
  const [aiGenQuiz, setAiGenQuiz] = useState(null);
  const confirm = useConfirm();

  const classFilter = selectedClass && selectedClass !== 'all' ? { class_obj: selectedClass } : {};
  const { data, refetch } = useApi(() => elearningService.getQuizzes({ ...classFilter, page_size: 200 }), [selectedClass], true);
  const quizzes = (data?.results || data || []).slice().sort((a, b) => b.id - a.id);
  const totalPages = Math.ceil(quizzes.length / ITEMS_PER_PAGE);
  const paginated = quizzes.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleDelete = async (quiz) => {
    if (!await confirm({ title: `Supprimer le quiz "${quiz.title}" ?`, message: 'Cette action est irréversible.', confirmLabel: 'Supprimer', destructive: true })) return;
    try { await elearningService.deleteQuiz(quiz.id); notify({ type: 'success', title: 'Quiz supprimé', message: '' }); refetch(); }
    catch { notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la suppression' }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <PrimaryButton icon={Plus} label="Nouveau Quiz" color={COLOR} onClick={() => { setEditingQuiz(null); setShowForm(true); }} />
      </div>

      {quizzes.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg,#ede9fe,#ddd6fe)' }}>
            <ClipboardCheck className="h-8 w-8 opacity-50" style={{ color: COLOR }} />
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: '#1e293b' }}>Aucun quiz disponible</p>
          <p className="text-xs mb-4" style={{ color: '#94a3b8' }}>Créez votre premier quiz intelligent</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map(quiz => (
              <div key={quiz.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-xl transition-all" style={{ border: '1.5px solid #f0f4f9' }}>
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg,${COLOR_ICON},${COLOR})` }}>
                    <ClipboardCheck className="h-4.5 w-4.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                      <span className="text-sm font-extrabold" style={{ color: '#0f172a' }}>{quiz.title}</span>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                        style={{ background: quiz.is_published ? '#d1fae5' : '#fef9c3', color: quiz.is_published ? '#065f46' : '#92400e' }}>
                        {quiz.is_published ? 'Publié' : 'Brouillon'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg font-semibold" style={{ background: '#dbeafe', color: '#2563eb' }}>{quiz.class_name}</span>
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg font-semibold" style={{ background: COLOR_BG, color: COLOR }}>{quiz.subject_name}</span>
                      <span style={{ color: '#94a3b8' }}>{quiz.question_count} question{quiz.question_count > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 self-end sm:self-auto">
                  <IconBtn onClick={() => setBuilderQuiz(quiz)} icon={Layers} color={COLOR} hoverBg={COLOR_ICON} title="Questions" />
                  <IconBtn onClick={() => setAiGenQuiz(quiz)} icon={Sparkles} color="#8b5cf6" hoverBg="#ede9fe" title="Générer par IA" />
                  <IconBtn onClick={() => setAnalyticsQuiz(quiz)} icon={BarChart2} color="#059669" hoverBg="#d1fae5" title="Analytiques" />
                  <IconBtn onClick={() => { setEditingQuiz(quiz); setShowForm(true); }} icon={Edit} color="#2563eb" hoverBg="#dbeafe" title="Modifier" />
                  <IconBtn onClick={() => handleDelete(quiz)} icon={Trash2} color="#ef4444" hoverBg="#fee2e2" title="Supprimer" />
                </div>
              </div>
            ))}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} accentColor={COLOR} totalItems={quizzes.length} itemsPerPage={ITEMS_PER_PAGE} />
        </>
      )}

      {showForm && (
        <QuizFormModal quiz={editingQuiz} classesList={classesList} subjectsList={subjectsList} lessons={lessons}
          onClose={() => { setShowForm(false); setEditingQuiz(null); }}
          onSaved={() => { setShowForm(false); setEditingQuiz(null); refetch(); setPage(1); }}
          notify={notify} />
      )}

      {builderQuiz && (
        <QuizBuilderModal quiz={builderQuiz} onClose={() => setBuilderQuiz(null)} notify={notify} onUpdated={refetch} />
      )}

      {analyticsQuiz && (
        <QuizAnalyticsModal quiz={analyticsQuiz} onClose={() => setAnalyticsQuiz(null)} notify={notify} />
      )}

      {aiGenQuiz && (
        <AIGenerateModal quiz={aiGenQuiz} onClose={() => setAiGenQuiz(null)} notify={notify}
          onGenerated={() => { refetch(); setBuilderQuiz(aiGenQuiz); }} />
      )}
    </div>
  );
}
