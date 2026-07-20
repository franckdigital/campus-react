import { useState, useEffect, useMemo } from 'react';
import {
  Award, ClipboardCheck, ClipboardList, Shield, Trophy, Clock,
  CheckCircle, AlertCircle, BarChart2, FileText, Download,
  TrendingUp, Star, ChevronRight, ChevronDown, ChevronUp,
} from 'lucide-react';
import { elearningService } from '../../services/elearning';
import { useApi } from '../../hooks/useApi';
import { WorkflowHelpButton } from '../../components/WorkflowHelpModal';

const P = '#db2777';
const P_BG = '#fdf2f8';
const P_LIGHT = '#fce7f3';

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="h-9 w-9 rounded-full border-[3px] animate-spin"
           style={{ borderColor: P_LIGHT, borderTopColor: P }} />
      <p className="text-sm font-semibold" style={{ color: '#64748b' }}>Chargement de vos résultats…</p>
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

function ScoreBar({ score, max = 100, color = P }) {
  const pct = Math.min(100, Math.round((score / max) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
        <div className="h-full rounded-full transition-all"
             style={{ width: `${pct}%`, background: pct >= 50 ? '#059669' : '#ef4444' }} />
      </div>
      <span className="text-xs font-black w-8 text-right"
            style={{ color: pct >= 50 ? '#059669' : '#ef4444' }}>
        {pct}%
      </span>
    </div>
  );
}

// ─── Summary stats ────────────────────────────────────────────────────────────

function SummaryCards({ assignments, quizResults, examSessions, exams }) {
  const gradedAssignments = assignments.filter(a => a.submission?.correction?.score != null);
  const submittedAssignments = assignments.filter(a => !!a.submission);
  const completedQuizzes = quizResults.filter(q => q.bestAttempt?.score != null);
  const gradedExams = (exams || [])
    .map(e => ({ exam: e, session: examSessions?.[e.id] }))
    .filter(({ session }) => session?.score != null);

  const avgAssignment = gradedAssignments.length > 0
    ? gradedAssignments.reduce((s, a) => {
        const score = parseFloat(a.submission.correction.score) || 0;
        const max = parseFloat(a.max_score) || 20;
        return s + (score / max) * 100;
      }, 0) / gradedAssignments.length
    : null;

  const avgQuiz = completedQuizzes.length > 0
    ? completedQuizzes.reduce((s, q) => s + (parseFloat(q.bestAttempt.score) || 0), 0) / completedQuizzes.length
    : null;

  const avgExam = gradedExams.length > 0
    ? gradedExams.reduce((s, { exam, session }) => {
        const score = parseFloat(session.score) || 0;
        const max = parseFloat(exam.max_score) || 20;
        return s + (score / max) * 100;
      }, 0) / gradedExams.length
    : null;

  const overallAvg = (() => {
    const vals = [];
    if (avgAssignment != null) vals.push(avgAssignment);
    if (avgQuiz != null) vals.push(avgQuiz);
    if (avgExam != null) vals.push(avgExam);
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b) / vals.length) : null;
  })();

  const cards = [
    {
      icon: TrendingUp, value: overallAvg != null ? `${overallAvg}%` : '—',
      label: 'Moyenne générale', color: P, bg: P_BG,
    },
    {
      icon: ClipboardList, value: submittedAssignments.length,
      label: 'Devoirs rendus', color: '#7c3aed', bg: '#f5f3ff',
    },
    {
      icon: ClipboardCheck, value: completedQuizzes.length,
      label: 'Quiz complétés', color: '#0ea5e9', bg: '#e0f2fe',
    },
    {
      icon: Award, value: gradedAssignments.length + gradedExams.length,
      label: 'Travaux corrigés', color: '#059669', bg: '#d1fae5',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <div key={i} className="rounded-2xl p-4 flex items-center gap-3"
             style={{ background: 'white', boxShadow: '0 1px 6px #0001' }}>
          <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: c.bg }}>
            <c.icon className="h-5 w-5" style={{ color: c.color }} />
          </div>
          <div>
            <p className="text-xl font-black" style={{ color: '#1e293b' }}>{c.value}</p>
            <p className="text-xs font-semibold mt-0.5" style={{ color: '#64748b' }}>{c.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Assignment result card ───────────────────────────────────────────────────

function AssignmentResultCard({ assignment: a }) {
  const sub = a.submission;
  const correction = sub?.correction;
  const isGraded = correction?.score != null;
  const isSubmitted = !!sub;
  const max = a.max_score || 20;

  const status = !isSubmitted ? 'pending'
    : !isGraded ? 'submitted'
    : 'graded';

  const STATUS = {
    pending:   { label: 'À rendre',    color: '#94a3b8', bg: '#f1f5f9', icon: AlertCircle },
    submitted: { label: 'En attente',  color: '#d97706', bg: '#fff7ed', icon: Clock },
    graded:    { label: 'Corrigé',     color: '#059669', bg: '#d1fae5', icon: CheckCircle },
  };
  const s = STATUS[status];

  return (
    <div className="rounded-2xl p-5 space-y-3"
         style={{ background: 'white', boxShadow: '0 1px 6px #0001', border: `1.5px solid ${isGraded ? '#d1fae5' : '#f1f5f9'}` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: '#fdf2f8' }}>
            <ClipboardList className="h-5 w-5" style={{ color: P }} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-extrabold uppercase tracking-widest"
                  style={{ color: P }}>Devoir</span>
            <p className="text-sm font-black truncate" style={{ color: '#1e293b' }}>{a.title}</p>
            <p className="text-xs" style={{ color: '#94a3b8' }}>{a.subject_name || a.class_name}</p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
              style={{ background: s.bg, color: s.color }}>
          <s.icon className="h-3 w-3" />
          {s.label}
        </span>
      </div>

      {isGraded && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold" style={{ color: '#64748b' }}>Note</span>
            <span className="text-sm font-black" style={{ color: correction.score / max >= 0.5 ? '#059669' : '#ef4444' }}>
              {correction.score} / {max}
            </span>
          </div>
          <ScoreBar score={correction.score} max={max} />
          {correction.feedback && (
            <div className="p-3 rounded-xl text-xs leading-relaxed italic"
                 style={{ background: '#f8fafc', color: '#475569' }}>
              "{correction.feedback}"
            </div>
          )}
          {correction.corrected_file && (
            <a href={correction.corrected_file} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold w-fit"
               style={{ background: '#d1fae5', color: '#059669' }}>
              <FileText className="h-3.5 w-3.5" /> Voir la correction du prof
            </a>
          )}
        </div>
      )}

      {isSubmitted && !isGraded && (
        <p className="text-xs" style={{ color: '#94a3b8' }}>
          Rendu le {fmt(sub.submitted_at)} · En attente de correction
        </p>
      )}
      {!isSubmitted && a.due_date && (
        <p className="text-xs" style={{ color: new Date(a.due_date) < new Date() ? '#ef4444' : '#94a3b8' }}>
          Date limite : {fmt(a.due_date)}
        </p>
      )}
    </div>
  );
}

// ─── Quiz detail panel (per-question breakdown) ───────────────────────────────

const QV = '#7c3aed';
const QTYPE_S = { QCU: 'QCU', QCM: 'QCM', TRUEFALSE: 'V/F', TEXT: 'Texte', NUMERIC: 'Calcul', MATCHING: 'Assoc.', ORDERING: 'Ordre' };

function QuizDetailPanel({ quiz, bestAttempt }) {
  const { data: questionsData, loading } = useApi(
    () => elearningService.getQuestions(quiz.id),
    [quiz.id], true,
  );
  const questions = questionsData?.results ?? (Array.isArray(questionsData) ? questionsData : []);

  const answerMap = useMemo(() => {
    const m = {};
    (bestAttempt?.answers || []).forEach(a => { m[a.question] = a; });
    return m;
  }, [bestAttempt]);

  const rows = useMemo(() => questions.map(q => {
    const ans = answerMap[q.id];
    const maxPts = parseFloat(q.points) || 1;
    if (!ans) return { q, ans: null, earned: 0, maxPts, status: 'missing' };
    if (q.question_type === 'TEXT') {
      const earned = ans.manual_score ?? null;
      return { q, ans, earned, maxPts, status: earned == null ? 'pending' : earned >= maxPts * 0.5 ? 'correct' : 'incorrect' };
    }
    const earned = ans.points_earned ?? (ans.is_correct ? maxPts : 0);
    return { q, ans, earned, maxPts, status: ans.is_correct === true ? 'correct' : ans.is_correct === false ? 'incorrect' : 'pending' };
  }), [questions, answerMap]);

  const totalMax = rows.reduce((s, r) => s + r.maxPts, 0);
  const totalEarned = rows.reduce((s, r) => s + (r.earned ?? 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center py-6">
      <div className="h-5 w-5 rounded-full border-2 animate-spin"
           style={{ borderColor: '#ede9fe', borderTopColor: QV }} />
    </div>
  );

  if (rows.length === 0) return (
    <p className="text-xs text-center py-4" style={{ color: '#94a3b8' }}>Aucune question disponible</p>
  );

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1.5px solid ${QV}20` }}>
      {/* Total */}
      <div className="flex items-center justify-between px-3 py-2"
           style={{ background: `${QV}08` }}>
        <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: QV }}>
          Détail par question
        </span>
        <span className="text-xs font-black" style={{ color: QV }}>
          {+totalEarned.toFixed(1)} / {totalMax} pts
        </span>
      </div>

      {/* Rows */}
      <div className="divide-y" style={{ borderColor: '#f8fafc', background: 'white' }}>
        {rows.map(({ q, ans, earned, maxPts, status }, i) => {
          const ST = {
            correct:   { color: '#059669', icon: '✓', bg: '#f0fdf4' },
            incorrect: { color: '#ef4444', icon: '✗', bg: '#fef2f2' },
            pending:   { color: '#d97706', icon: '⏳', bg: '#fffbeb' },
            missing:   { color: '#94a3b8', icon: '—', bg: '#f8fafc' },
          };
          const st = ST[status] || ST.missing;
          return (
            <div key={q.id} className="flex items-start gap-2 px-3 py-2.5">
              <span className="h-5 w-5 rounded flex items-center justify-center text-[9px] font-extrabold flex-shrink-0 mt-0.5"
                    style={{ background: '#ede9fe', color: QV }}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded"
                        style={{ background: '#f1f5f9', color: '#64748b' }}>
                    {QTYPE_S[q.question_type] || q.question_type}
                  </span>
                  <p className="text-xs font-semibold leading-snug line-clamp-2" style={{ color: '#334155' }}>{q.text}</p>
                </div>
                {ans?.text_response && (
                  <p className="text-[10px] italic mt-0.5" style={{ color: '#64748b' }}>
                    Votre réponse : {ans.text_response.length > 80 ? ans.text_response.slice(0, 80) + '…' : ans.text_response}
                  </p>
                )}
                {status === 'pending' && q.question_type === 'TEXT' && (
                  <p className="text-[10px] font-bold mt-0.5" style={{ color: '#d97706' }}>En attente de correction</p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                      style={{ background: st.bg, color: st.color }}>{st.icon}</span>
                <span className="text-xs font-black"
                      style={{ color: st.color }}>
                  {earned != null ? +earned.toFixed(1) : '—'}
                  <span className="font-normal text-[10px]" style={{ color: '#94a3b8' }}>/{maxPts}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Quiz result card ─────────────────────────────────────────────────────────

function QuizResultCard({ quiz, attempts }) {
  const [showDetail, setShowDetail] = useState(false);
  const best = attempts.reduce((b, a) => {
    if (!b || (a.score ?? -1) > (b.score ?? -1)) return a;
    return b;
  }, null);
  const pct = best?.score != null ? Math.round(best.score) : null;
  const completed = attempts.filter(a => a.completed_at);

  return (
    <div className="rounded-2xl p-5 space-y-3"
         style={{ background: 'white', boxShadow: '0 1px 6px #0001', border: `1.5px solid ${pct != null && pct >= (quiz.passing_score || 50) ? '#e9d5ff' : '#f1f5f9'}` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: '#f5f3ff' }}>
            <ClipboardCheck className="h-5 w-5" style={{ color: QV }} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-extrabold uppercase tracking-widest"
                  style={{ color: QV }}>Quiz</span>
            <p className="text-sm font-black truncate" style={{ color: '#1e293b' }}>{quiz.title}</p>
            <p className="text-xs" style={{ color: '#94a3b8' }}>{quiz.subject_name || quiz.class_name}</p>
          </div>
        </div>
        {pct != null ? (
          <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                style={{ background: best.passed ? '#d1fae5' : '#fef2f2', color: best.passed ? '#059669' : '#ef4444' }}>
            {best.passed ? <Trophy className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
            {best.passed ? 'Réussi' : 'Échoué'}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                style={{ background: '#f1f5f9', color: '#94a3b8' }}>
            <Clock className="h-3 w-3" /> À compléter
          </span>
        )}
      </div>

      {pct != null && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold" style={{ color: '#64748b' }}>
              Meilleur score{completed.length > 1 && ` · ${completed.length} tentatives`}
            </span>
            <span className="text-sm font-black"
                  style={{ color: best.passed ? '#059669' : '#ef4444' }}>{pct}%</span>
          </div>
          <ScoreBar score={best.score} max={100} />
          {quiz.passing_score && (
            <p className="text-xs" style={{ color: '#94a3b8' }}>Seuil de réussite : {quiz.passing_score}%</p>
          )}

          {/* Expand detail */}
          <button
            onClick={() => setShowDetail(!showDetail)}
            className="flex items-center gap-1.5 text-xs font-bold mt-1 transition-colors"
            style={{ color: QV }}>
            {showDetail ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showDetail ? 'Masquer le détail' : 'Voir le détail des questions'}
          </button>

          {showDetail && <QuizDetailPanel quiz={quiz} bestAttempt={best} />}
        </div>
      )}

      {completed.length === 0 && (
        <p className="text-xs" style={{ color: '#94a3b8' }}>Vous n'avez pas encore tenté ce quiz</p>
      )}
    </div>
  );
}

// ─── Exam result card ─────────────────────────────────────────────────────────

function ExamResultCard({ exam, session }) {
  const isGraded = session?.score != null;
  const isDone = !!session;
  const max = parseFloat(exam.max_score) || 20;
  const score = parseFloat(session?.score) || 0;
  const pct = isGraded ? Math.round((score / max) * 100) : null;
  const note20 = isGraded ? ((score / max) * 20).toFixed(2) : null;

  return (
    <div className="rounded-2xl p-5 space-y-3"
         style={{ background: 'white', boxShadow: '0 1px 6px #0001', border: `1.5px solid ${isGraded ? '#fef3c7' : '#f1f5f9'}` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: '#fef3c7' }}>
            <Shield className="h-5 w-5" style={{ color: '#d97706' }} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-extrabold uppercase tracking-widest"
                  style={{ color: '#d97706' }}>Examen</span>
            <p className="text-sm font-black truncate" style={{ color: '#1e293b' }}>{exam.title}</p>
            <p className="text-xs" style={{ color: '#94a3b8' }}>{exam.subject_name || exam.class_name}</p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
              style={{
                background: isGraded ? '#fef3c7' : isDone ? '#fff7ed' : '#f1f5f9',
                color: isGraded ? '#d97706' : isDone ? '#d97706' : '#94a3b8',
              }}>
          {isGraded ? <><Star className="h-3 w-3" /> Noté</> : isDone ? <><Clock className="h-3 w-3" /> En attente</> : <><AlertCircle className="h-3 w-3" /> À passer</>}
        </span>
      </div>

      {isGraded && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold" style={{ color: '#64748b' }}>Note obtenue</span>
            <span className="text-sm font-black"
                  style={{ color: pct >= 50 ? '#059669' : '#ef4444' }}>
              {note20} / 20
            </span>
          </div>
          <ScoreBar score={pct} max={100} />
          {session.feedback && (
            <div className="p-3 rounded-xl text-xs leading-relaxed italic"
                 style={{ background: '#f8fafc', color: '#475569' }}>
              "{session.feedback}"
            </div>
          )}
          {session.corrected_file && (
            <a href={session.corrected_file} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold w-fit"
               style={{ background: '#fef3c7', color: '#d97706' }}>
              <FileText className="h-3.5 w-3.5" /> Voir la copie corrigée
            </a>
          )}
        </div>
      )}

      {isDone && !isGraded && (
        <p className="text-xs" style={{ color: '#94a3b8' }}>Examen passé · en attente de correction</p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const FILTER_TABS = [
  { id: 'all',         label: 'Tout',     icon: BarChart2 },
  { id: 'quiz',        label: 'Quiz',     icon: ClipboardCheck },
  { id: 'assignments', label: 'Devoirs',  icon: ClipboardList },
  { id: 'exams',       label: 'Examens',  icon: Shield },
];

export default function StudentResultsHub() {
  const [filter, setFilter] = useState('all');
  const [quizAttempts, setQuizAttempts] = useState({});
  const [examSessions, setExamSessions] = useState({});

  // Fetch all assignments (student-scoped by backend)
  const { data: assignmentsData, loading: loadingAssignments } = useApi(
    () => elearningService.getAssignments({ page_size: 100 }), [], true,
  );
  const assignments = assignmentsData?.results ?? (Array.isArray(assignmentsData) ? assignmentsData : []);

  // Fetch all published quizzes
  const { data: quizzesData, loading: loadingQuizzes } = useApi(
    () => elearningService.getQuizzes({ is_published: true, page_size: 100 }), [], true,
  );
  const quizzes = quizzesData?.results ?? (Array.isArray(quizzesData) ? quizzesData : []);

  // Fetch all exams
  const { data: examsData, loading: loadingExams } = useApi(
    () => elearningService.getSecureExams({ page_size: 100 }), [], true,
  );
  const exams = examsData?.results ?? (Array.isArray(examsData) ? examsData : []);

  // Load my quiz attempts for each quiz
  useEffect(() => {
    if (quizzes.length === 0) return;
    Promise.all(
      quizzes.map(q =>
        elearningService.getMyQuizAttempts(q.id)
          .then(res => ({ id: q.id, attempts: Array.isArray(res) ? res : res?.results ?? [] }))
          .catch(() => ({ id: q.id, attempts: [] }))
      )
    ).then(results => {
      const map = {};
      results.forEach(r => { map[r.id] = r.attempts; });
      setQuizAttempts(map);
    });
  }, [quizzes.length]);

  // Load my exam sessions
  useEffect(() => {
    if (exams.length === 0) return;
    Promise.all(
      exams.map(e =>
        elearningService.getMyExamSession(e.id)
          .then(res => ({ id: e.id, session: res }))
          .catch(() => ({ id: e.id, session: null }))
      )
    ).then(results => {
      const map = {};
      results.forEach(r => { map[r.id] = r.session; });
      setExamSessions(map);
    });
  }, [exams.length]);

  const quizResults = useMemo(() =>
    quizzes.map(q => ({
      quiz: q,
      attempts: quizAttempts[q.id] ?? [],
      bestAttempt: (quizAttempts[q.id] ?? []).reduce((b, a) => {
        if (!b || (a.score ?? -1) > (b.score ?? -1)) return a;
        return b;
      }, null),
    })),
  [quizzes, quizAttempts]);

  const loading = loadingAssignments || loadingQuizzes || loadingExams;

  // Items for the selected filter
  const items = useMemo(() => {
    const all = [];
    if (filter === 'all' || filter === 'assignments') {
      assignments.filter(a => !!a.submission).forEach(a => all.push({ type: 'assignment', data: a }));
    }
    if (filter === 'all' || filter === 'quiz') {
      quizResults.filter(r => r.attempts.length > 0).forEach(r => all.push({ type: 'quiz', data: r }));
    }
    if (filter === 'all' || filter === 'exams') {
      exams.filter(e => !!examSessions[e.id]).forEach(e => all.push({ type: 'exam', data: { exam: e, session: examSessions[e.id] } }));
    }
    return all;
  }, [filter, assignments, quizResults, exams, examSessions]);

  // Pending items (not yet submitted / attempted)
  const pendingAssignments = assignments.filter(a => !a.submission);
  const pendingQuizzes = quizResults.filter(r => r.attempts.length === 0);

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#1e293b' }}>Mes Résultats</h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            Retrouvez vos notes, corrections et retours pour tous vos travaux
          </p>
        </div>
        <WorkflowHelpButton defaultTab="student" />
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* Summary */}
          <SummaryCards assignments={assignments} quizResults={quizResults} examSessions={examSessions} exams={exams} />

          {/* Filter tabs */}
          <div className="flex gap-2 p-1 rounded-xl w-fit" style={{ background: '#f1f5f9' }}>
            {FILTER_TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: filter === t.id ? 'white' : 'transparent',
                  color: filter === t.id ? P : '#64748b',
                  boxShadow: filter === t.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                }}>
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Cards grid */}
          {items.length === 0 ? (
            <Empty
              icon={Award}
              text="Aucun résultat pour cette catégorie"
              sub="Soumettez vos travaux pour voir vos résultats ici"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map((item, i) => {
                if (item.type === 'assignment') return (
                  <AssignmentResultCard key={`a-${item.data.id}`} assignment={item.data} />
                );
                if (item.type === 'quiz') return (
                  <QuizResultCard key={`q-${item.data.quiz.id}`} quiz={item.data.quiz} attempts={item.data.attempts} />
                );
                if (item.type === 'exam') return (
                  <ExamResultCard key={`e-${item.data.exam.id}`} exam={item.data.exam} session={item.data.session} />
                );
                return null;
              })}
            </div>
          )}

          {/* Pending section */}
          {filter === 'all' && (pendingAssignments.length > 0 || pendingQuizzes.length > 0) && (
            <div className="rounded-2xl overflow-hidden"
                 style={{ background: 'white', border: '1.5px solid #f1f5f9' }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: '#f8fafc' }}>
                <p className="text-sm font-black" style={{ color: '#1e293b' }}>À faire</p>
                <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                  Travaux non soumis ou quiz non tentés
                </p>
              </div>
              <div className="divide-y" style={{ borderColor: '#f8fafc' }}>
                {pendingAssignments.map(a => (
                  <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                         style={{ background: '#fff7ed' }}>
                      <ClipboardList className="h-4 w-4" style={{ color: '#d97706' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: '#1e293b' }}>{a.title}</p>
                      <p className="text-xs" style={{ color: a.due_date && new Date(a.due_date) < new Date() ? '#ef4444' : '#94a3b8' }}>
                        Devoir · {a.due_date ? `Échéance ${fmt(a.due_date)}` : 'Pas de date limite'}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                          style={{ background: '#fff7ed', color: '#d97706' }}>
                      À rendre
                    </span>
                  </div>
                ))}
                {pendingQuizzes.map(({ quiz: q }) => (
                  <div key={q.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                         style={{ background: '#f5f3ff' }}>
                      <ClipboardCheck className="h-4 w-4" style={{ color: '#7c3aed' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: '#1e293b' }}>{q.title}</p>
                      <p className="text-xs" style={{ color: '#94a3b8' }}>
                        Quiz · {q.time_limit ? `${q.time_limit} min` : 'Sans limite de temps'}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                          style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                      À faire
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
