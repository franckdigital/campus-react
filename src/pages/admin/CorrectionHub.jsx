import { useState, useRef, useMemo, useEffect } from 'react';
import DOMPurify from 'dompurify';
import {
  ClipboardList, ClipboardCheck, Shield, Download, Upload, Star,
  CheckCircle, Clock, ChevronDown, ChevronUp, FileText, Award,
  BarChart2, X, Search, Users, Trophy, AlertTriangle, Plus,
  Hash, ToggleLeft, Type, ListChecks, GitCompare, ArrowUpDown,
  Camera, ShieldAlert, Calendar,
} from 'lucide-react';
import { elearningService } from '../../services/elearning';
import { useApi } from '../../hooks/useApi';

const P = '#7c3aed';
const C = '#db2777';
const A = '#d97706';

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-7 w-7 rounded-full border-[3px] animate-spin"
           style={{ borderColor: '#f3e8ff', borderTopColor: P }} />
    </div>
  );
}

function Empty({ icon: Icon, text, sub, color = '#94a3b8' }) {
  return (
    <div className="py-14 text-center rounded-2xl" style={{ border: '1.5px dashed #e2e8f0' }}>
      <Icon className="h-9 w-9 mx-auto mb-3 opacity-20" style={{ color }} />
      <p className="text-sm font-bold" style={{ color: '#64748b' }}>{text}</p>
      {sub && <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>{sub}</p>}
    </div>
  );
}

const QTYPE_LABEL = { QCU: 'Choix unique', QCM: 'Choix multiple', TRUEFALSE: 'Vrai/Faux', TEXT: 'Texte libre', NUMERIC: 'Calcul', MATCHING: 'Association', ORDERING: 'Ordre' };
const QTYPE_SHORT = { QCU: 'QCU', QCM: 'QCM', TRUEFALSE: 'V/F', TEXT: 'Texte', NUMERIC: 'Calcul', MATCHING: 'Assoc.', ORDERING: 'Ordre' };

// ─── ScoreBar ─────────────────────────────────────────────────────────────────
function ScoreBar({ earned, max, color = P }) {
  const pct = max > 0 ? Math.min(100, Math.round((earned / max) * 100)) : 0;
  const good = pct >= 50;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
        <div className="h-full rounded-full transition-all"
             style={{ width: `${pct}%`, background: good ? '#059669' : '#ef4444' }} />
      </div>
      <span className="text-xs font-black w-8 text-right"
            style={{ color: good ? '#059669' : '#ef4444' }}>{pct}%</span>
    </div>
  );
}

// ─── TotalBadge ───────────────────────────────────────────────────────────────
function TotalBadge({ earned, max, label = 'Total calculé' }) {
  const pct = max > 0 ? Math.round((earned / max) * 100) : 0;
  const good = pct >= 50;
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl"
         style={{ background: good ? '#f0fdf4' : '#fef2f2', border: `1.5px solid ${good ? '#bbf7d0' : '#fecaca'}` }}>
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-widest"
           style={{ color: good ? '#059669' : '#dc2626' }}>{label}</p>
        <div className="flex items-end gap-1 mt-0.5">
          <span className="text-2xl font-black leading-none"
                style={{ color: good ? '#059669' : '#dc2626' }}>{+earned.toFixed(2)}</span>
          <span className="text-sm font-bold mb-0.5" style={{ color: '#94a3b8' }}>/ {max} pts</span>
        </div>
      </div>
      <div className="text-right">
        <p className="text-3xl font-black" style={{ color: good ? '#059669' : '#dc2626' }}>{pct}%</p>
        <p className="text-[10px] font-bold" style={{ color: good ? '#059669' : '#dc2626' }}>
          {good ? '✓ Validé' : '✗ Insuffisant'}
        </p>
      </div>
    </div>
  );
}

// ─── QuestionGradeRow (shared between quiz and assignment grading) ─────────────
function QuestionGradeRow({ q, idx, ans, earned, maxPts, status, manualVal, onManualChange }) {
  const STATUS_STYLE = {
    correct:   { bg: '#f0fdf4', color: '#059669', icon: '✓' },
    incorrect: { bg: '#fef2f2', color: '#ef4444', icon: '✗' },
    pending:   { bg: '#fffbeb', color: '#d97706', icon: '⏳' },
    manual:    { bg: '#f0fdf4', color: '#059669', icon: '✎' },
    missing:   { bg: '#f8fafc', color: '#94a3b8', icon: '—' },
  };
  const st = STATUS_STYLE[status] || STATUS_STYLE.missing;
  const needsInput = q.question_type === 'TEXT' || !ans;
  const isInput = needsInput && onManualChange;

  return (
    <div className="px-4 py-3 flex items-start gap-3">
      <span className="h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-extrabold flex-shrink-0"
            style={{ background: '#ede9fe', color: P }}>{idx + 1}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: '#f1f5f9', color: '#64748b' }}>
            {QTYPE_SHORT[q.question_type] || q.question_type}
          </span>
          <p className="text-xs font-semibold leading-snug truncate" style={{ color: '#334155' }}>{q.text}</p>
        </div>
        {ans?.text_response && (
          <p className="text-[11px] italic mt-0.5 line-clamp-2"
             style={{ color: '#64748b' }}>↳ {ans.text_response}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: st.bg, color: st.color }}>{st.icon}</span>
        {isInput ? (
          <div className="flex items-center gap-1">
            <input
              type="number" min="0" max={maxPts} step="0.5"
              value={manualVal ?? ''}
              onChange={e => onManualChange(e.target.value)}
              className="w-16 px-2 py-1 rounded-lg text-xs border text-center font-black outline-none"
              style={{ borderColor: `${P}40`, color: P }}
              placeholder="0"
            />
            <span className="text-xs font-bold" style={{ color: '#94a3b8' }}>/{maxPts}</span>
          </div>
        ) : (
          <span className="text-sm font-black"
                style={{ color: status === 'correct' || status === 'manual' ? '#059669' : status === 'incorrect' ? '#ef4444' : '#94a3b8' }}>
            {earned != null ? earned : '—'}<span className="text-xs font-normal" style={{ color: '#94a3b8' }}>/{maxPts}</span>
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Assignment corrections ───────────────────────────────────────────────────

function AssignmentPerQuestionPanel({ sub, assignment, setForm, onApplyAndSave }) {
  const quizId = assignment?.quiz;
  const [qScores, setQScores] = useState({});

  const { data: questionsData, loading: loadingQ } = useApi(
    () => quizId ? elearningService.getQuestions(quizId) : Promise.resolve(null),
    [quizId], !!quizId,
  );
  const { data: attemptsData, loading: loadingA } = useApi(
    () => quizId ? elearningService.getQuizAttempts(quizId) : Promise.resolve(null),
    [quizId], !!quizId,
  );

  const questions = useMemo(() => (questionsData?.results ?? (Array.isArray(questionsData) ? questionsData : [])), [questionsData]);
  const allAttempts = useMemo(() => (attemptsData?.results ?? (Array.isArray(attemptsData) ? attemptsData : [])), [attemptsData]);
  const studentAttempt = useMemo(() =>
    allAttempts.find(a => String(a.student) === String(sub.student) || String(a.student_id) === String(sub.student)),
    [allAttempts, sub.student],
  );
  const answerMap = useMemo(() => {
    const m = {};
    (studentAttempt?.answers || []).forEach(a => { m[a.question] = a; });
    return m;
  }, [studentAttempt]);

  const rows = useMemo(() => questions.map(q => {
    const ans = answerMap[q.id];
    const maxPts = parseFloat(q.points) || 1;
    const manual = qScores[q.id];
    const existing = ans?.manual_score ?? (ans?.is_correct != null ? (ans.is_correct ? maxPts : 0) : null);
    const earned = manual !== undefined ? (parseFloat(manual) || 0) : (existing ?? null);
    const autoStatus = !ans ? 'missing'
      : q.question_type === 'TEXT' ? (earned == null ? 'pending' : 'manual')
      : ans.is_correct ? 'correct' : ans.is_correct === false ? 'incorrect' : 'pending';
    return { q, ans, earned, maxPts, status: autoStatus };
  }), [questions, answerMap, qScores]);

  const totalMax = rows.reduce((s, r) => s + r.maxPts, 0);
  const totalEarned = rows.reduce((s, r) => s + (r.earned ?? 0), 0);

  const assignmentMaxScore = assignment?.max_score || 20;
  const normalizedTotal = totalMax > 0 ? (totalEarned / totalMax) * assignmentMaxScore : totalEarned;
  const previewScore = Math.min(assignmentMaxScore, +normalizedTotal.toFixed(2));

  const applyTotal = async () => {
    setForm(p => ({ ...p, score: previewScore }));
    // Applying the total used to only pre-fill the score field — a separate
    // "Enregistrer" click was the only thing that actually persisted it, and
    // the toast here made it look done, so that second click was easy to
    // skip. Save right away so this button really does grade the copy.
    await onApplyAndSave?.(previewScore);
  };

  if (!quizId) return (
    <div className="p-3 rounded-xl text-xs text-center" style={{ background: '#f8fafc', color: '#94a3b8' }}>
      Ce devoir n'a pas de questions en ligne associées
    </div>
  );

  if (loadingQ || loadingA) return <Spinner />;
  if (questions.length === 0) return (
    <div className="p-3 rounded-xl text-xs text-center" style={{ background: '#f8fafc', color: '#94a3b8' }}>
      Aucune question enregistrée pour ce devoir
    </div>
  );

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${P}20` }}>
      <div className="flex items-center justify-between px-4 py-2.5"
           style={{ background: `${P}08` }}>
        <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: P }}>
          Notation par question
        </span>
        {!studentAttempt && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: '#fff7ed', color: '#d97706' }}>
            Pas de réponse en ligne
          </span>
        )}
      </div>
      <div className="divide-y bg-white" style={{ borderColor: '#f8fafc' }}>
        {rows.map(({ q, ans, earned, maxPts, status }, i) => (
          <QuestionGradeRow
            key={q.id} q={q} idx={i} ans={ans} earned={earned} maxPts={maxPts} status={status}
            manualVal={qScores[q.id] ?? (ans?.manual_score ?? '')}
            onManualChange={val => setQScores(p => ({ ...p, [q.id]: val }))}
          />
        ))}
      </div>
      <div className="px-4 py-3 space-y-2" style={{ background: '#fafbff', borderTop: '1.5px solid #f1f5f9' }}>
        <TotalBadge earned={totalEarned} max={totalMax} />
        <button onClick={applyTotal}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-white"
                style={{ background: `linear-gradient(135deg,${P},#6366f1)` }}>
          <CheckCircle className="h-3.5 w-3.5" />
          Utiliser ce total comme note finale ({previewScore} / {assignmentMaxScore})
        </button>
      </div>
    </div>
  );
}

function SubmissionRow({ sub, assignment, notify, onGraded }) {
  const maxScore = assignment?.max_score || 20;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('global'); // 'global' | 'perQuestion'
  const [form, setForm] = useState({
    score: sub.correction?.score ?? '',
    feedback: sub.correction?.feedback ?? '',
  });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const isGraded = sub.correction?.score != null;

  // Shared by the manual "Enregistrer" button and the per-question panel's
  // "Utiliser ce total" button — extracted so applying a computed total
  // persists immediately instead of just pre-filling the form and leaving a
  // separate, easy-to-skip click as the only thing that actually saves it.
  const saveGrade = async (scoreValue, feedbackValue) => {
    const score = parseFloat(scoreValue);
    if (isNaN(score) || score < 0 || score > maxScore) {
      notify({ type: 'error', title: 'Erreur', message: `La note doit être entre 0 et ${maxScore}` });
      return false;
    }
    setSaving(true);
    try {
      if (file) {
        const fd = new FormData();
        fd.append('score', score);
        if (feedbackValue) fd.append('feedback', feedbackValue);
        fd.append('corrected_file', file);
        await elearningService.gradeSubmissionWithFile(sub.id, fd);
      } else {
        await elearningService.gradeSubmission(sub.id, { score, feedback: feedbackValue });
      }
      notify({ type: 'success', title: 'Note enregistrée', message: `${sub.student_name || 'Étudiant'} : ${score}/${maxScore}` });
      setOpen(false); setFile(null); onGraded();
      return true;
    } catch (e) {
      notify({ type: 'error', title: 'Erreur', message: e.message });
      return false;
    } finally { setSaving(false); }
  };

  const handleSave = () => saveGrade(form.score, form.feedback);

  return (
    <div className="border-t" style={{ borderColor: '#f8fafc' }}>
      {/* Row header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
               style={{ background: isGraded ? '#f0fdf4' : '#fffbeb' }}>
            {isGraded
              ? <CheckCircle className="h-4 w-4" style={{ color: '#059669' }} />
              : <Clock className="h-4 w-4" style={{ color: '#d97706' }} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: '#1e293b' }}>
              {sub.student_name || `Étudiant #${sub.student}`}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: '#94a3b8' }}>
              {sub.submitted_at && (
                <span>{new Date(sub.submitted_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              )}
              {sub.is_late && <span className="font-bold" style={{ color: '#ef4444' }}>· En retard</span>}
              {isGraded && (
                <span className="font-black" style={{ color: '#059669' }}>· {sub.correction.score}/{maxScore}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0 self-end sm:self-auto">
          {sub.file && (
            <a href={sub.file} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
               style={{ background: '#dbeafe', color: '#2563eb' }}>
              <Download className="h-3 w-3" /> Travail
            </a>
          )}
          {sub.correction?.corrected_file && (
            <a href={sub.correction.corrected_file} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
               style={{ background: '#d1fae5', color: '#059669' }}>
              <FileText className="h-3 w-3" /> Correction
            </a>
          )}
          <button
            onClick={() => { setOpen(!open); if (!open) setForm({ score: sub.correction?.score ?? '', feedback: sub.correction?.feedback ?? '' }); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: isGraded ? '#fce7f3' : `${C}12`, color: C }}>
            <Star className="h-3 w-3" /> {isGraded ? 'Modifier' : 'Corriger'}
          </button>
        </div>
      </div>

      {sub.content && (
        <div className="mx-5 mb-3 p-3 rounded-xl text-xs leading-relaxed"
             style={{ background: '#f8fafc', border: '1px solid #f1f5f9', color: '#475569' }}>
          <span className="font-extrabold uppercase text-[10px] tracking-wide mr-2" style={{ color: '#94a3b8' }}>Réponse :</span>
          {sub.content.length > 280 ? sub.content.slice(0, 280) + '…' : sub.content}
        </div>
      )}

      {open && (
        <div className="mx-5 mb-4 space-y-3">
          {/* Mode toggle */}
          {assignment?.quiz && (
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#f8fafc' }}>
              {[{ id: 'global', label: 'Note globale' }, { id: 'perQuestion', label: 'Par question' }].map(m => (
                <button key={m.id} onClick={() => setView(m.id)}
                        className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                        style={{ background: view === m.id ? 'white' : 'transparent', color: view === m.id ? C : '#64748b', boxShadow: view === m.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none' }}>
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {/* Per-question panel */}
          {view === 'perQuestion' && (
            <AssignmentPerQuestionPanel
              sub={sub} assignment={assignment}
              setForm={setForm}
              onApplyAndSave={(score) => saveGrade(score, form.feedback)}
            />
          )}

          {/* Global grading form */}
          {view === 'global' && (
            <div className="p-4 rounded-2xl space-y-3"
                 style={{ background: '#fdf2f8', border: `1.5px solid ${C}20` }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: '#64748b' }}>
                    Note /{maxScore}
                  </label>
                  <input
                    type="number" min="0" max={maxScore} step="0.5"
                    value={form.score}
                    onChange={e => setForm(p => ({ ...p, score: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm border outline-none font-black"
                    style={{ borderColor: `${C}30`, color: C }}
                    placeholder={`0 – ${maxScore}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: '#64748b' }}>Appréciation</label>
                  <input
                    type="text" value={form.feedback}
                    onChange={e => setForm(p => ({ ...p, feedback: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                    style={{ borderColor: '#e2e8f0' }}
                    placeholder="Bien, Insuffisant, Excellent…"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#64748b' }}>
                  Fichier corrigé (optionnel)
                </label>
                <input type="file" ref={fileRef} className="hidden"
                       accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                       onChange={e => setFile(e.target.files[0])} />
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border-2 border-dashed"
                  style={{ borderColor: file ? C : '#e2e8f0', color: file ? C : '#94a3b8', background: file ? '#fdf2f8' : 'white' }}>
                  <Upload className="h-3.5 w-3.5" />
                  {file ? file.name : 'Joindre un fichier corrigé'}
                  {file && (
                    <span onClick={e => { e.stopPropagation(); setFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                          className="ml-1 cursor-pointer" style={{ color: '#94a3b8' }}>
                      <X className="h-3 w-3" />
                    </span>
                  )}
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={form.score === '' || saving}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40"
                        style={{ background: `linear-gradient(135deg,${C},#be185d)` }}>
                  <CheckCircle className="h-3.5 w-3.5" />
                  {saving ? 'Enregistrement…' : 'Valider la note'}
                </button>
                <button onClick={() => { setOpen(false); setFile(null); }}
                        className="px-4 py-2 rounded-xl text-xs font-bold border"
                        style={{ color: '#64748b', borderColor: '#e2e8f0' }}>
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AssignmentCard({ assignment, notify }) {
  const [open, setOpen] = useState(false);
  const { data, loading, refetch } = useApi(
    () => (open ? elearningService.getSubmissions(assignment.id) : Promise.resolve(null)),
    [open, assignment.id], open,
  );
  const subs = data?.results ?? (Array.isArray(data) ? data : []);
  const graded = subs.filter(s => s.correction?.score != null).length;
  const total = assignment.submission_count ?? 0;
  const pct = subs.length > 0 ? Math.round((graded / subs.length) * 100) : 0;

  return (
    <div className="rounded-2xl overflow-hidden"
         style={{ background: 'white', border: '1.5px solid #f1f5f9', boxShadow: '0 1px 4px #0001' }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-4 px-5 py-4 text-left">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
             style={{ background: '#fdf2f8' }}>
          <ClipboardList className="h-5 w-5" style={{ color: C }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black truncate" style={{ color: '#1e293b' }}>{assignment.title}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs mt-0.5">
            <span style={{ color: '#64748b' }}>{assignment.class_name}</span>
            {assignment.subject_name && (<><span style={{ color: '#cbd5e1' }}>·</span><span style={{ color: '#64748b' }}>{assignment.subject_name}</span></>)}
            <span style={{ color: '#cbd5e1' }}>·</span>
            <span style={{ color: total > 0 ? P : '#94a3b8' }}>{total} soumission{total > 1 ? 's' : ''}</span>
            {assignment.quiz && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                    style={{ background: '#ede9fe', color: P }}>Questions en ligne</span>
            )}
          </div>
          {open && subs.length > 0 && (
            <div className="flex items-center gap-2 mt-1.5">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#f1f5f9', width: 80 }}>
                <div className="h-full rounded-full transition-all"
                     style={{ width: `${pct}%`, background: pct === 100 ? '#059669' : C }} />
              </div>
              <span className="text-[10px] font-black"
                    style={{ color: pct === 100 ? '#059669' : C }}>{graded}/{subs.length} corrigés</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {total > 0 && !open && (
            <span className="text-xs px-2.5 py-1 rounded-full font-bold"
                  style={{ background: graded === total && total > 0 ? '#d1fae5' : '#fff7ed', color: graded === total && total > 0 ? '#059669' : '#d97706' }}>
              {graded}/{total}
            </span>
          )}
          {open ? <ChevronUp className="h-4 w-4" style={{ color: '#94a3b8' }} />
                : <ChevronDown className="h-4 w-4" style={{ color: '#94a3b8' }} />}
        </div>
      </button>

      {open && (
        <div style={{ borderTop: '1.5px solid #f8fafc' }}>
          {loading ? <Spinner />
            : subs.length === 0 ? (
              <div className="py-10 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-20" style={{ color: '#94a3b8' }} />
                <p className="text-sm font-bold" style={{ color: '#94a3b8' }}>Aucune soumission reçue</p>
              </div>
            ) : subs.map(sub => (
              <SubmissionRow key={sub.id} sub={sub} assignment={assignment} notify={notify} onGraded={refetch} />
            ))}
        </div>
      )}
    </div>
  );
}

function AssignmentsCorrectionList({ notify }) {
  const [search, setSearch] = useState('');
  const { data, loading } = useApi(() => elearningService.getAssignments({ page_size: 200 }), [], true);
  const all = data?.results ?? (Array.isArray(data) ? data : []);
  const filtered = search ? all.filter(a => a.title.toLowerCase().includes(search.toLowerCase())) : all;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#94a3b8' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
               className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border outline-none"
               style={{ borderColor: '#e2e8f0' }} placeholder="Rechercher un devoir ou exercice…" />
      </div>
      {loading ? <Spinner />
        : filtered.length === 0 ? <Empty icon={ClipboardList} text="Aucun devoir trouvé" color={C} />
        : filtered.map(a => <AssignmentCard key={a.id} assignment={a} notify={notify} />)}
    </div>
  );
}

// ─── Quiz corrections ─────────────────────────────────────────────────────────

function QuizAttemptRow({ attempt, questions, notify, onGraded }) {
  const [open, setOpen] = useState(false);
  const [manualPts, setManualPts] = useState({});
  const [saving, setSaving] = useState(false);

  const answerMap = useMemo(() => {
    const m = {};
    (attempt.answers || []).forEach(a => { m[a.question] = a; });
    return m;
  }, [attempt.answers]);

  const rows = useMemo(() => questions.map(q => {
    const ans = answerMap[q.id];
    const maxPts = parseFloat(q.points) || 1;
    if (!ans) return { q, ans: null, earned: 0, maxPts, status: 'missing' };
    if (q.question_type === 'TEXT') {
      const pending = manualPts[ans.id];
      const existing = ans.manual_score;
      const earned = pending !== undefined ? (parseFloat(pending) || 0) : existing;
      return { q, ans, earned, maxPts, status: earned == null ? 'pending' : 'manual' };
    }
    const earned = ans.points_earned ?? (ans.is_correct ? maxPts : 0);
    return { q, ans, earned, maxPts, status: ans.is_correct === true ? 'correct' : ans.is_correct === false ? 'incorrect' : 'pending' };
  }), [questions, answerMap, manualPts]);

  const totalMax = rows.reduce((s, r) => s + r.maxPts, 0);
  const totalEarned = rows.reduce((s, r) => s + (r.earned ?? 0), 0);
  const pendingCount = rows.filter(r => r.status === 'pending').length;
  const attemptPct = attempt.score != null ? Math.round(attempt.score) : null;
  const hasPendingManual = Object.keys(manualPts).length > 0;

  const saveGrades = async () => {
    const entries = Object.entries(manualPts).filter(([, v]) => v !== '');
    if (!entries.length) return;
    setSaving(true);
    try {
      // Independent per-answer grading calls — run concurrently instead of
      // one sequential round-trip at a time.
      await Promise.all(entries.map(([answerId, score]) =>
        elearningService.gradeTextAnswer(attempt.id, { answer_id: Number(answerId), score: parseFloat(score) })
      ));
      notify({ type: 'success', title: 'Notes enregistrées', message: '' });
      setManualPts({}); onGraded();
    } catch (e) {
      notify({ type: 'error', title: 'Erreur', message: e.message });
    } finally { setSaving(false); }
  };

  return (
    <div className="border-t" style={{ borderColor: '#f8fafc' }}>
      <div className="flex items-center gap-3 px-5 py-3">
        <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
             style={{ background: attemptPct == null ? '#f1f5f9' : attempt.passed ? '#f0fdf4' : '#fef2f2' }}>
          {attemptPct == null ? <Clock className="h-4 w-4" style={{ color: '#94a3b8' }} />
            : attempt.passed ? <Trophy className="h-4 w-4" style={{ color: '#059669' }} />
            : <X className="h-4 w-4" style={{ color: '#ef4444' }} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: '#1e293b' }}>
            {attempt.student_name || `Étudiant #${attempt.student}`}
          </p>
          <div className="flex items-center gap-2 text-xs flex-wrap" style={{ color: '#94a3b8' }}>
            {attempt.completed_at && (
              <span>{new Date(attempt.completed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
            )}
            {attemptPct != null && (
              <span className="font-black" style={{ color: attempt.passed ? '#059669' : '#ef4444' }}>
                · {attemptPct}%
              </span>
            )}
            {questions.length > 0 && (
              <span className="font-bold" style={{ color: '#7c3aed' }}>
                · {totalEarned.toFixed(1)}/{totalMax} pts
              </span>
            )}
            {pendingCount > 0 && (
              <span className="font-bold px-1.5 py-0.5 rounded-md"
                    style={{ background: '#fef3c7', color: '#d97706' }}>{pendingCount} à noter</span>
            )}
          </div>
        </div>
        <button onClick={() => setOpen(!open)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: open ? '#ede9fe' : '#f8fafc', color: P, border: `1.5px solid ${P}20` }}>
          <BarChart2 className="h-3 w-3" />
          {open ? 'Fermer' : 'Voir / Noter'}
        </button>
      </div>

      {open && (
        <div className="mx-5 mb-4 rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${P}20` }}>
          {/* Total header */}
          <div className="px-4 py-3" style={{ background: `${P}08` }}>
            <TotalBadge earned={totalEarned} max={totalMax} label="Total calculé" />
          </div>

          {/* Per-question rows */}
          <div className="divide-y" style={{ borderColor: '#f8fafc', background: 'white' }}>
            {rows.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: '#94a3b8' }}>Aucune question disponible</p>
            ) : rows.map(({ q, ans, earned, maxPts, status }, i) => (
              <QuestionGradeRow
                key={q.id} q={q} idx={i} ans={ans} earned={earned} maxPts={maxPts} status={status}
                manualVal={manualPts[ans?.id] ?? (ans?.manual_score ?? '')}
                onManualChange={ans ? (val => setManualPts(p => ({ ...p, [ans.id]: val }))) : null}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 flex items-center justify-between"
               style={{ background: '#fafbff', borderTop: '1.5px solid #f1f5f9' }}>
            <span className="text-xs font-bold" style={{ color: pendingCount > 0 ? '#d97706' : '#059669' }}>
              {pendingCount > 0 ? `${pendingCount} question${pendingCount > 1 ? 's' : ''} texte à noter` : '✓ Toutes les questions sont notées'}
            </span>
            {hasPendingManual && (
              <button onClick={saveGrades} disabled={saving}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white disabled:opacity-40"
                      style={{ background: `linear-gradient(135deg,${P},#6366f1)` }}>
                <CheckCircle className="h-3 w-3" />
                {saving ? 'Enregistrement…' : 'Valider les notes texte'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function QuizCard({ quiz, notify }) {
  const [open, setOpen] = useState(false);
  const { data: attemptsData, loading: attLoading, refetch } = useApi(
    () => (open ? elearningService.getQuizAttempts(quiz.id) : Promise.resolve(null)),
    [open, quiz.id], open,
  );
  const { data: qData } = useApi(
    () => (open ? elearningService.getQuizById(quiz.id) : Promise.resolve(null)),
    [open, quiz.id], open,
  );

  const attempts = attemptsData?.results ?? (Array.isArray(attemptsData) ? attemptsData : []);
  const completed = attempts.filter(a => a.completed_at);
  const questions = qData?.questions ?? [];
  const avgScore = completed.length > 0
    ? Math.round(completed.reduce((s, a) => s + (a.score || 0), 0) / completed.length) : null;
  const passCount = completed.filter(a => a.passed).length;
  const totalMax = questions.reduce((s, q) => s + (parseFloat(q.points) || 1), 0);

  return (
    <div className="rounded-2xl overflow-hidden"
         style={{ background: 'white', border: '1.5px solid #f1f5f9', boxShadow: '0 1px 4px #0001' }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-4 px-5 py-4 text-left">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
             style={{ background: '#f5f3ff' }}>
          <ClipboardCheck className="h-5 w-5" style={{ color: P }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black truncate" style={{ color: '#1e293b' }}>{quiz.title}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs mt-0.5">
            <span style={{ color: '#64748b' }}>{quiz.class_name}</span>
            {quiz.subject_name && (<><span style={{ color: '#cbd5e1' }}>·</span><span style={{ color: '#64748b' }}>{quiz.subject_name}</span></>)}
            {(quiz.attempt_count ?? 0) > 0 && (<><span style={{ color: '#cbd5e1' }}>·</span><span style={{ color: P }}>{quiz.attempt_count} tentative{quiz.attempt_count > 1 ? 's' : ''}</span></>)}
            {avgScore != null && (<><span style={{ color: '#cbd5e1' }}>·</span><span style={{ color: '#059669' }}>Moy. {avgScore}%</span></>)}
            {totalMax > 0 && (<><span style={{ color: '#cbd5e1' }}>·</span><span style={{ color: '#7c3aed' }}>{totalMax} pts total</span></>)}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {open && completed.length > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-bold"
                  style={{ background: '#d1fae5', color: '#059669' }}>{passCount}/{completed.length} réussis</span>
          )}
          {open ? <ChevronUp className="h-4 w-4" style={{ color: '#94a3b8' }} />
                : <ChevronDown className="h-4 w-4" style={{ color: '#94a3b8' }} />}
        </div>
      </button>

      {open && (
        <div style={{ borderTop: '1.5px solid #f8fafc' }}>
          {attLoading ? <Spinner />
            : completed.length === 0 ? (
              <div className="py-10 text-center">
                <BarChart2 className="h-8 w-8 mx-auto mb-2 opacity-20" style={{ color: '#94a3b8' }} />
                <p className="text-sm font-bold" style={{ color: '#94a3b8' }}>Aucune tentative complétée</p>
              </div>
            ) : completed.map(att => (
              <QuizAttemptRow key={att.id} attempt={att} questions={questions} notify={notify} onGraded={refetch} />
            ))}
        </div>
      )}
    </div>
  );
}

function QuizCorrectionList({ notify }) {
  const [search, setSearch] = useState('');
  const { data, loading } = useApi(() => elearningService.getQuizzes({ page_size: 200, is_published: true }), [], true);
  const all = data?.results ?? (Array.isArray(data) ? data : []);
  const filtered = search ? all.filter(q => q.title.toLowerCase().includes(search.toLowerCase())) : all;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#94a3b8' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
               className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border outline-none"
               style={{ borderColor: '#e2e8f0' }} placeholder="Rechercher un quiz…" />
      </div>
      {loading ? <Spinner />
        : filtered.length === 0 ? <Empty icon={ClipboardCheck} text="Aucun quiz publié" color={P} />
        : filtered.map(q => <QuizCard key={q.id} quiz={q} notify={notify} />)}
    </div>
  );
}

// ─── Exam corrections ─────────────────────────────────────────────────────────

function ExamSessionRow({ session: s, exam, notify, onGraded }) {
  const maxScore = exam?.max_score || 20;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ score: s.score ?? '', feedback: s.feedback ?? '' });
  const [qScores, setQScores] = useState({});
  const [saving, setSaving] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const isGraded = s.score != null;
  const fileRef = useRef();
  const [file, setFile] = useState(null);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  // Webcam proctoring: lazy-load snapshots + AI analysis only when the admin
  // actually opens the gallery, so sessions nobody reviews cost nothing extra.
  const { data: snapshotsData, loading: snapshotsLoading } = useApi(
    () => showSnapshots ? elearningService.getExamSessionSnapshots(s.id) : Promise.resolve(null),
    [showSnapshots, s.id], showSnapshots,
  );
  const snapshots = snapshotsData?.results ?? (Array.isArray(snapshotsData) ? snapshotsData : []);

  // Load exam questions if the exam has a linked quiz
  const quizId = exam?.quiz;
  const { data: questionsData } = useApi(
    () => open && quizId ? elearningService.getQuestions(quizId) : Promise.resolve(null),
    [open, quizId], open && !!quizId,
  );
  const questions = questionsData?.results ?? (Array.isArray(questionsData) ? questionsData : []);

  // Auto-load quiz attempt answers when panel opens
  const { data: attemptData } = useApi(
    () => open && s.quiz_attempt ? elearningService.getQuizAttemptById(s.quiz_attempt) : Promise.resolve(null),
    [open, s.quiz_attempt], open && !!s.quiz_attempt,
  );

  // Pre-fill qScores from auto-graded attempt answers
  useEffect(() => {
    if (!attemptData?.answers?.length) return;
    const initial = {};
    attemptData.answers.forEach(a => {
      initial[a.question] = parseFloat(a.points_earned ?? 0);
    });
    setQScores(initial);
    // Pre-fill global score from quiz attempt if not yet manually graded —
    // computed against the real, current total question points (the same
    // source the "Notation par question" panel below uses), not
    // attemptData.max_score. That field is Quiz.max_score, a live property
    // that only sums is_active questions; if a question was deactivated
    // after this attempt was graded, max_score can shrink below the actual
    // points_earned sum, pushing this ratio to >=1 and silently pre-filling
    // a false "full marks" score.
    if (!isGraded && questions.length > 0) {
      const realTotalMax = questions.reduce((sum, q) => sum + (parseFloat(q.points) || 1), 0);
      const realTotalEarned = questions.reduce((sum, q) => sum + (initial[q.id] ?? 0), 0);
      if (realTotalMax > 0) {
        const normalized = +((realTotalEarned / realTotalMax) * maxScore).toFixed(2);
        setForm(p => ({ ...p, score: Math.min(maxScore, normalized) }));
      }
    }
  }, [attemptData]);

  // Shared by the manual "Valider la note" button and the auto-correction
  // flow below — extracted so auto-correction can persist immediately
  // instead of just pre-filling the form and leaving a second, separate
  // click as the only thing that actually saves anything.
  const saveGrade = async (scoreValue, feedbackValue) => {
    const score = parseFloat(scoreValue);
    if (isNaN(score)) { notify({ type: 'error', title: 'Erreur', message: 'Note invalide' }); return false; }
    setSaving(true);
    try {
      const payload = { score, feedback: feedbackValue ?? form.feedback };
      if (file) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => v !== undefined && fd.append(k, String(v)));
        fd.append('corrected_file', file);
        await elearningService.gradeExamSessionWithFile(s.id, fd);
      } else {
        await elearningService.gradeExamSession(s.id, payload);
      }
      return true;
    } catch (e) {
      notify({ type: 'error', title: 'Erreur', message: e.message });
      return false;
    } finally { setSaving(false); }
  };

  const applyAutoCorrection = async () => {
    if (!s.quiz_attempt) return;
    setAutoFilling(true);
    try {
      const data = await elearningService.getQuizAttemptById(s.quiz_attempt);
      if (data?.answers?.length) {
        const scores = {};
        data.answers.forEach(a => { scores[a.question] = parseFloat(a.points_earned ?? 0); });
        setQScores(scores);
        // Computed against the real, current total question points (same
        // source as the "Notation par question" panel below) — NOT
        // data.max_score. That's Quiz.max_score, a live property that only
        // sums is_active questions; if a question was deactivated after
        // this attempt was graded, max_score can shrink below the actual
        // points_earned sum, pushing this ratio to >=1 and the Math.min
        // clamp then silently saved a false "full marks" score (this is
        // exactly how a student who actually earned 18/52 points got
        // graded 20/20).
        const realTotalMax = questions.reduce((sum, q) => sum + (parseFloat(q.points) || 1), 0);
        const realTotalEarned = questions.reduce((sum, q) => sum + (scores[q.id] ?? 0), 0);
        if (realTotalMax > 0) {
          const normalized = Math.min(maxScore, +((realTotalEarned / realTotalMax) * maxScore).toFixed(2));
          setForm(p => ({ ...p, score: normalized }));
          // Applying the auto-correction used to only fill the form — the
          // success toast below made it look done, but nothing was actually
          // saved until a separate "Valider la note" click, which teachers
          // reasonably skipped. Save right away so "appliquer" really means
          // graded, with no silent no-op step in between.
          const ok = await saveGrade(normalized, form.feedback);
          if (ok) {
            notify({ type: 'success', title: 'Correction automatique appliquée et enregistrée', message: '' });
            setOpen(false); setFile(null); onGraded();
            return;
          }
        }
      }
      notify({ type: 'success', title: 'Correction automatique appliquée', message: '' });
    } catch { notify({ type: 'error', title: 'Erreur', message: 'Impossible de charger la correction' }); }
    finally { setAutoFilling(false); }
  };

  const rows = useMemo(() => questions.map(q => {
    const maxPts = parseFloat(q.points) || 1;
    const val = qScores[q.id];
    const earned = val !== undefined ? (parseFloat(val) || 0) : null;
    return { q, maxPts, earned };
  }), [questions, qScores]);

  const totalMax = rows.reduce((s, r) => s + r.maxPts, 0);
  const totalEarned = rows.reduce((s, r) => s + (r.earned ?? 0), 0);

  const applyTotal = () => {
    const normalized = totalMax > 0 ? (totalEarned / totalMax) * maxScore : totalEarned;
    const rounded = Math.min(maxScore, +normalized.toFixed(2));
    setForm(p => ({ ...p, score: rounded }));
  };

  const handleSave = async () => {
    const ok = await saveGrade(form.score, form.feedback);
    if (ok) {
      notify({ type: 'success', title: 'Note enregistrée', message: '' });
      setOpen(false); setFile(null); onGraded();
    }
  };

  return (
    <div className="border-t" style={{ borderColor: '#f8fafc' }}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
               style={{ background: isGraded ? '#f0fdf4' : '#fffbeb' }}>
            {isGraded ? <CheckCircle className="h-4 w-4" style={{ color: '#059669' }} />
                      : <Clock className="h-4 w-4" style={{ color: '#d97706' }} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate flex items-center gap-1.5" style={{ color: '#1e293b' }}>
              {s.student_name || `Étudiant #${s.student}`}
              {s.is_flagged && (
                <span title={s.flag_reason || 'Session signalée'}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-black"
                      style={{ background: '#fef2f2', color: '#dc2626' }}>
                  <ShieldAlert className="h-2.5 w-2.5" /> Signalé
                </span>
              )}
            </p>
            <div className="flex items-center gap-2 text-xs flex-wrap" style={{ color: '#94a3b8' }}>
              {s.submitted_at && <span>{new Date(s.submitted_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>}
              {s.status && <span>· {s.status}</span>}
              {isGraded && <span className="font-black" style={{ color: '#059669' }}>· {s.score}/{maxScore}</span>}
            </div>
            {s.is_flagged && s.flag_reason && (
              <p className="text-xs mt-0.5 truncate" style={{ color: '#dc2626' }}>{s.flag_reason}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0 self-end sm:self-auto">
          {s.submission_file && (
            <a href={s.submission_file} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
               style={{ background: '#f5f3ff', color: '#7c3aed' }}>
              <FileText className="h-3 w-3" /> Copie étudiant
            </a>
          )}
          {s.submission_note && (
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: '#f5f3ff', color: '#7c3aed' }}>
              <FileText className="h-3 w-3" /> Réponse rédigée
            </span>
          )}
          <button onClick={() => setShowSnapshots(v => !v)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: showSnapshots ? '#dbeafe' : '#eff6ff', color: '#2563eb' }}>
            <Camera className="h-3 w-3" /> Captures
          </button>
          <button onClick={() => setOpen(!open)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: open ? '#fef3c7' : '#fff7ed', color: A }}>
            <Star className="h-3 w-3" /> {isGraded ? 'Modifier' : 'Corriger'}
          </button>
        </div>
      </div>

      {showSnapshots && (
        <div className="mx-5 mb-4 rounded-2xl overflow-hidden" style={{ border: '1.5px solid #dbeafe' }}>
          <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#eff6ff' }}>
            <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: '#2563eb' }}>
              Captures webcam & analyse IA
            </span>
            {snapshots.length > 0 && (
              <span className="text-xs font-black" style={{ color: '#2563eb' }}>{snapshots.length} capture{snapshots.length > 1 ? 's' : ''}</span>
            )}
          </div>
          <div className="p-4 bg-white">
            {snapshotsLoading ? (
              <p className="text-xs text-center py-6" style={{ color: '#94a3b8' }}>Chargement…</p>
            ) : snapshots.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: exam?.webcam_required ? '#dc2626' : '#94a3b8' }}>
                {exam?.webcam_required
                  ? 'Aucune capture alors que la webcam était obligatoire pour cet examen — l\'étudiant n\'a peut-être pas autorisé sa caméra, ou la connexion a coupé les envois.'
                  : 'Aucune capture — la webcam n\'était pas requise pour cet examen.'}
              </p>
            ) : (
              <div className="space-y-2">
                {snapshots.map(snap => {
                  const anomaly = snap.face_detected === false || snap.phone_detected;
                  return (
                    <button key={snap.id} onClick={() => setLightbox(snap)}
                            className="w-full flex items-start gap-3 p-2 rounded-xl text-left transition-colors"
                            style={{ background: anomaly ? '#fef2f2' : '#f8fafc', border: `1.5px solid ${anomaly ? '#fecaca' : '#f1f5f9'}` }}>
                      <div className="relative rounded-lg overflow-hidden flex-shrink-0" style={{ width: 96, height: 72 }}>
                        <img src={snap.image} alt="" className="w-full h-full object-cover" />
                        {anomaly && (
                          <span className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full flex items-center justify-center"
                                style={{ background: '#ef4444' }}>
                            <ShieldAlert className="h-2.5 w-2.5 text-white" />
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-[11px] font-bold" style={{ color: '#64748b' }}>
                          {new Date(snap.taken_at).toLocaleString('fr-FR')}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: snap.face_detected === false ? '#fee2e2' : '#dcfce7', color: snap.face_detected === false ? '#dc2626' : '#059669' }}>
                            {snap.face_detected === false ? 'Visage non détecté' : 'Visage détecté'}
                          </span>
                          {snap.phone_detected && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#fee2e2', color: '#dc2626' }}>
                              Téléphone détecté
                            </span>
                          )}
                        </div>
                        {snap.ai_analysis && (
                          <p className="text-xs mt-1.5 leading-snug" style={{ color: anomaly ? '#991b1b' : '#475569' }}>
                            {snap.ai_analysis}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
             style={{ background: 'rgba(15,23,42,0.75)' }}
             onClick={() => setLightbox(null)}>
          <div className="relative bg-white rounded-2xl overflow-hidden max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <img src={lightbox.image} alt="" className="w-full" />
            <div className="p-4 space-y-1.5">
              <p className="text-xs font-bold" style={{ color: '#64748b' }}>
                {new Date(lightbox.taken_at).toLocaleString('fr-FR')}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: lightbox.face_detected === false ? '#fef2f2' : '#f0fdf4', color: lightbox.face_detected === false ? '#dc2626' : '#059669' }}>
                  {lightbox.face_detected === false ? 'Visage non détecté' : 'Visage détecté'}
                </span>
                {lightbox.phone_detected && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#fef2f2', color: '#dc2626' }}>
                    Téléphone détecté
                  </span>
                )}
              </div>
              {lightbox.ai_analysis && (
                <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>{lightbox.ai_analysis}</p>
              )}
            </div>
            <button onClick={() => setLightbox(null)}
                    className="absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(15,23,42,0.5)' }}>
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {open && (
        <div className="mx-5 mb-4 space-y-3">
          {/* Per-question panel if exam has a quiz */}
          {questions.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${A}20` }}>
              <div className="flex items-center justify-between px-4 py-2.5"
                   style={{ background: `${A}08` }}>
                <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: A }}>
                  Notation par question
                </span>
                <span className="text-xs font-black" style={{ color: A }}>
                  {totalEarned.toFixed(1)} / {totalMax} pts
                </span>
              </div>
              <div className="divide-y bg-white" style={{ borderColor: '#f8fafc' }}>
                {rows.map(({ q, maxPts, earned }, i) => (
                  <div key={q.id} className="px-4 py-3 flex items-center gap-3">
                    <span className="h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-extrabold flex-shrink-0"
                          style={{ background: '#fef3c7', color: A }}>{i + 1}</span>
                    <p className="text-xs font-semibold flex-1 truncate" style={{ color: '#334155' }}>{q.text}</p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <input
                        type="number" min="0" max={maxPts} step="0.5"
                        value={qScores[q.id] ?? ''}
                        onChange={e => setQScores(p => ({ ...p, [q.id]: e.target.value }))}
                        className="w-16 px-2 py-1 rounded-lg text-xs border text-center font-black outline-none"
                        style={{ borderColor: `${A}40`, color: A }}
                        placeholder="0"
                      />
                      <span className="text-xs font-bold" style={{ color: '#94a3b8' }}>/{maxPts}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 space-y-2" style={{ background: '#fafbff', borderTop: '1.5px solid #f1f5f9' }}>
                <TotalBadge earned={totalEarned} max={totalMax} />
                {s.quiz_attempt && (
                  <button onClick={applyAutoCorrection} disabled={autoFilling}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border-2 disabled:opacity-50"
                          style={{ borderColor: '#4f46e5', color: '#4f46e5', background: '#eef2ff' }}>
                    <CheckCircle className="h-3.5 w-3.5" />
                    {autoFilling ? 'Chargement…' : 'Appliquer la correction automatique'}
                  </button>
                )}
                <button onClick={applyTotal}
                        className="w-full py-2 rounded-xl text-xs font-bold text-white"
                        style={{ background: `linear-gradient(135deg,${A},#b45309)` }}>
                  Utiliser ce total comme note finale
                </button>
              </div>
            </div>
          )}

          {/* Réponse rédigée dans le système ("répondre dans le système" —
              exams that carry a PDF subject) — submission_note was saved but
              never actually displayed anywhere in this screen before. */}
          {s.submission_note && (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #ede9fe' }}>
              <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: '#f5f3ff' }}>
                <FileText className="h-3.5 w-3.5" style={{ color: '#7c3aed' }} />
                <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: '#7c3aed' }}>
                  Réponse rédigée dans le système
                </span>
              </div>
              <div className="px-4 py-3 bg-white text-xs leading-relaxed"
                   style={{ color: '#334155' }}
                   dangerouslySetInnerHTML={{
                     __html: DOMPurify.sanitize(
                       // Older submissions were saved as plain text (no rich-text
                       // editor at the time) — preserve their line breaks, since a
                       // bare "\n" renders as nothing in HTML.
                       /<[a-z][\s\S]*>/i.test(s.submission_note)
                         ? s.submission_note
                         : s.submission_note.replace(/\n/g, '<br>')
                     ),
                   }} />
            </div>
          )}

          {/* Global grading form */}
          <div className="p-4 rounded-2xl space-y-3"
               style={{ background: '#fffbeb', border: `1.5px solid ${A}20` }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#64748b' }}>Note /{maxScore}</label>
                <input type="number" min="0" max={maxScore} step="0.5"
                       value={form.score}
                       onChange={e => setForm(p => ({ ...p, score: e.target.value }))}
                       className="w-full px-3 py-2 rounded-xl text-sm border outline-none font-black"
                       style={{ borderColor: `${A}30`, color: A }}
                       placeholder={`0 – ${maxScore}`} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#64748b' }}>Appréciation</label>
                <input type="text" value={form.feedback}
                       onChange={e => setForm(p => ({ ...p, feedback: e.target.value }))}
                       className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                       style={{ borderColor: '#e2e8f0' }} placeholder="Commentaire…" />
              </div>
            </div>
            {/* Correction file */}
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: '#64748b' }}>Fichier corrigé (optionnel)</label>
              <input type="file" ref={fileRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                     onChange={e => setFile(e.target.files[0])} />
              <button type="button" onClick={() => fileRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border-2 border-dashed"
                      style={{ borderColor: file ? A : '#e2e8f0', color: file ? A : '#94a3b8', background: file ? '#fffbeb' : 'white' }}>
                <Upload className="h-3.5 w-3.5" />
                {file ? file.name : 'Joindre un fichier corrigé'}
                {file && <span onClick={e => { e.stopPropagation(); setFile(null); }} className="ml-1 cursor-pointer"><X className="h-3 w-3" /></span>}
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={form.score === '' || saving}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40"
                      style={{ background: `linear-gradient(135deg,${A},#b45309)` }}>
                <CheckCircle className="h-3.5 w-3.5" />
                {saving ? 'Enregistrement…' : 'Valider la note'}
              </button>
              <button onClick={() => { setOpen(false); setFile(null); }}
                      className="px-4 py-2 rounded-xl text-xs font-bold border"
                      style={{ color: '#64748b', borderColor: '#e2e8f0' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExamCard({ exam, notify }) {
  const [open, setOpen] = useState(false);
  const { data, loading, refetch } = useApi(
    () => (open ? elearningService.getExamSessions(exam.id) : Promise.resolve(null)),
    [open, exam.id], open,
  );
  const sessions = data?.results ?? (Array.isArray(data) ? data : []);
  const graded = sessions.filter(s => s.score != null).length;

  return (
    <div className="rounded-2xl overflow-hidden"
         style={{ background: 'white', border: '1.5px solid #f1f5f9', boxShadow: '0 1px 4px #0001' }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-4 px-5 py-4 text-left">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
             style={{ background: '#fef3c7' }}>
          <Shield className="h-5 w-5" style={{ color: A }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black truncate" style={{ color: '#1e293b' }}>{exam.title}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs mt-0.5">
            <span style={{ color: '#64748b' }}>{exam.class_name}</span>
            {exam.subject_name && (<><span style={{ color: '#cbd5e1' }}>·</span><span style={{ color: '#64748b' }}>{exam.subject_name}</span></>)}
            {(exam.max_score || 0) > 0 && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold" style={{ background: '#fef3c7', color: A }}>
                /{exam.max_score} pts
              </span>
            )}
            {exam.start_date ? (
              <span className="flex items-center gap-1" style={{ color: '#64748b' }}>
                <Calendar className="h-3 w-3" />
                {new Date(exam.start_date).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            ) : (
              <span className="flex items-center gap-1" style={{ color: '#cbd5e1' }}>
                <Calendar className="h-3 w-3" /> Date non définie
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {open && sessions.length > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-bold"
                  style={{ background: graded === sessions.length ? '#d1fae5' : '#fff7ed', color: graded === sessions.length ? '#059669' : A }}>
              {graded}/{sessions.length} corrigés
            </span>
          )}
          {open ? <ChevronUp className="h-4 w-4" style={{ color: '#94a3b8' }} />
                : <ChevronDown className="h-4 w-4" style={{ color: '#94a3b8' }} />}
        </div>
      </button>

      {open && (
        <div style={{ borderTop: '1.5px solid #f8fafc' }}>
          {loading ? <Spinner />
            : sessions.length === 0 ? (
              <div className="py-10 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-20" style={{ color: '#94a3b8' }} />
                <p className="text-sm font-bold" style={{ color: '#94a3b8' }}>Aucune session enregistrée</p>
              </div>
            ) : sessions.map(s => (
              <ExamSessionRow key={s.id} session={s} exam={exam} notify={notify} onGraded={refetch} />
            ))}
        </div>
      )}
    </div>
  );
}

function ExamCorrectionList({ notify }) {
  const [search, setSearch] = useState('');
  const { data, loading } = useApi(() => elearningService.getSecureExams({ page_size: 200 }), [], true);
  const all = data?.results ?? (Array.isArray(data) ? data : []);
  const filtered = search ? all.filter(e => e.title.toLowerCase().includes(search.toLowerCase())) : all;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#94a3b8' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
               className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border outline-none"
               style={{ borderColor: '#e2e8f0' }} placeholder="Rechercher un examen…" />
      </div>
      {loading ? <Spinner />
        : filtered.length === 0 ? <Empty icon={Shield} text="Aucun examen" color={A} />
        : filtered.map(e => <ExamCard key={e.id} exam={e} notify={notify} />)}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

const TABS = [
  { id: 'assignments', label: 'Devoirs & Exercices', icon: ClipboardList, color: C },
  { id: 'quiz',        label: 'Quiz & Évaluations',  icon: ClipboardCheck, color: P },
  { id: 'exams',       label: 'Examens sécurisés',   icon: Shield,         color: A },
];

export default function CorrectionHub({ notify }) {
  const [tab, setTab] = useState('assignments');

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black" style={{ color: '#1e293b' }}>Corrections</h2>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
          Notation par question avec calcul automatique du total — devoirs, quiz et examens
        </p>
      </div>

      <div className="flex gap-2 p-1 rounded-xl w-full sm:w-fit overflow-x-auto" style={{ background: '#f1f5f9' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-shrink-0 whitespace-nowrap"
                  style={{ background: tab === t.id ? 'white' : 'transparent', color: tab === t.id ? t.color : '#64748b', boxShadow: tab === t.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none' }}>
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'assignments' && <AssignmentsCorrectionList notify={notify} />}
      {tab === 'quiz'        && <QuizCorrectionList        notify={notify} />}
      {tab === 'exams'       && <ExamCorrectionList        notify={notify} />}
    </div>
  );
}
