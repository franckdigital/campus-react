import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Clock, ChevronRight, ChevronLeft, Send, CheckCircle,
  XCircle, AlertCircle, RotateCcw, Trophy, BookOpen,
  ArrowUpDown, GitCompare, Calculator, Type, ListChecks, Hash, Download, FileText,
} from 'lucide-react';
import elearningService from '../../services/elearning';

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// ─── Question type renderers ──────────────────────────────────────────────────

function QCUQuestion({ question, answer, onAnswer }) {
  return (
    <div className="space-y-3">
      {question.choices.map(c => (
        <button key={c.id} onClick={() => onAnswer(question.id, { choice_ids: [c.id] })}
          className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 text-sm transition-all ${
            answer?.choice_ids?.includes(c.id)
              ? 'border-indigo-500 bg-indigo-50 text-indigo-800 font-medium'
              : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 text-gray-700'
          }`}>
          <span className="flex items-center gap-3">
            <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
              answer?.choice_ids?.includes(c.id) ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
            }`}>
              {answer?.choice_ids?.includes(c.id) && <span className="w-2 h-2 bg-white rounded-full" />}
            </span>
            {c.text}
          </span>
        </button>
      ))}
    </div>
  );
}

function QCMQuestion({ question, answer, onAnswer }) {
  const selected = answer?.choice_ids || [];
  const toggle = (id) => {
    const next = selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id];
    onAnswer(question.id, { choice_ids: next });
  };
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 italic">Plusieurs réponses possibles</p>
      {question.choices.map(c => (
        <button key={c.id} onClick={() => toggle(c.id)}
          className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 text-sm transition-all ${
            selected.includes(c.id)
              ? 'border-indigo-500 bg-indigo-50 text-indigo-800 font-medium'
              : 'border-gray-200 hover:border-indigo-300 text-gray-700'
          }`}>
          <span className="flex items-center gap-3">
            <span className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center ${
              selected.includes(c.id) ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
            }`}>
              {selected.includes(c.id) && <CheckCircle size={12} className="text-white" />}
            </span>
            {c.text}
          </span>
        </button>
      ))}
    </div>
  );
}

function TextQuestion({ question, answer, onAnswer }) {
  return (
    <textarea
      value={answer?.text_response || ''}
      onChange={e => onAnswer(question.id, { text_response: e.target.value })}
      rows={5}
      placeholder="Rédigez votre réponse ici..."
      className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm resize-none focus:border-indigo-400 focus:outline-none text-gray-700"
    />
  );
}

function NumericQuestion({ question, answer, onAnswer }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="number"
        step="any"
        value={answer?.numeric_response ?? ''}
        onChange={e => onAnswer(question.id, { numeric_response: e.target.value === '' ? null : parseFloat(e.target.value) })}
        placeholder="Entrez votre réponse numérique..."
        className="flex-1 border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm focus:border-indigo-400 focus:outline-none"
      />
    </div>
  );
}

function MatchingQuestion({ question, answer, onAnswer }) {
  const resp = answer?.matching_response || {};
  const update = (choiceId, val) => {
    const next = { ...resp, [choiceId]: val };
    onAnswer(question.id, { matching_response: next });
  };
  // Shuffle right-side options
  const rightOptions = [...question.choices].sort(() => Math.random() - 0.5);
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 italic">Associez chaque élément à gauche avec sa correspondance</p>
      {question.choices.map(c => (
        <div key={c.id} className="flex items-center gap-3">
          <div className="flex-1 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2 text-sm font-medium text-indigo-800">
            {c.text}
          </div>
          <span className="text-gray-400 flex-shrink-0">→</span>
          <input
            value={resp[c.id] || ''}
            onChange={e => update(c.id, e.target.value)}
            placeholder="Votre association..."
            className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          />
        </div>
      ))}
    </div>
  );
}

function OrderingQuestion({ question, answer, onAnswer }) {
  const initial = question.choices.map(c => c.id);
  const [order, setOrder] = useState(answer?.ordering_response?.length === initial.length ? answer.ordering_response : initial);
  const choiceMap = Object.fromEntries(question.choices.map(c => [c.id, c.text]));

  const move = (idx, delta) => {
    const newOrder = [...order];
    const swapIdx = idx + delta;
    if (swapIdx < 0 || swapIdx >= newOrder.length) return;
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    setOrder(newOrder);
    onAnswer(question.id, { ordering_response: newOrder });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 italic">Ordonnez les éléments dans le bon ordre</p>
      {order.map((id, idx) => (
        <div key={id} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
          <span className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0">
            {idx + 1}
          </span>
          <span className="flex-1 text-sm text-gray-700">{choiceMap[id]}</span>
          <div className="flex flex-col gap-0.5">
            <button onClick={() => move(idx, -1)} disabled={idx === 0}
              className="p-0.5 text-gray-400 hover:text-indigo-600 disabled:opacity-30">
              <ChevronLeft size={14} className="rotate-90" />
            </button>
            <button onClick={() => move(idx, 1)} disabled={idx === order.length - 1}
              className="p-0.5 text-gray-400 hover:text-indigo-600 disabled:opacity-30">
              <ChevronRight size={14} className="rotate-90" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function TrueFalseQuestion({ question, answer, onAnswer }) {
  return (
    <div className="flex gap-3">
      {question.choices.map(c => {
        const isVrai = c.text === 'Vrai';
        const selected = answer?.choice_ids?.includes(c.id);
        return (
          <button key={c.id} onClick={() => onAnswer(question.id, { choice_ids: [c.id] })}
            className={`flex-1 py-6 rounded-2xl border-2 text-base font-black transition-all ${
              selected
                ? isVrai ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-red-400 bg-red-50 text-red-700'
                : 'border-gray-200 hover:border-indigo-300 text-gray-500'
            }`}>
            {isVrai ? '✓ Vrai' : '✗ Faux'}
          </button>
        );
      })}
    </div>
  );
}

function QuestionRenderer({ question, answer, onAnswer }) {
  const types = { QCU: QCUQuestion, QCM: QCMQuestion, TRUEFALSE: TrueFalseQuestion, TEXT: TextQuestion, NUMERIC: NumericQuestion, MATCHING: MatchingQuestion, ORDERING: OrderingQuestion };
  const Component = types[question.question_type] || TextQuestion;
  return <Component question={question} answer={answer} onAnswer={onAnswer} />;
}

// ─── Results screen ───────────────────────────────────────────────────────────
function QuizResults({ attempt, questions, answers, onRetry, onBack }) {
  const score   = parseFloat(attempt.percent || 0);
  const passed  = attempt.is_passed;
  const pending = !attempt.is_graded;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Score card */}
      <div className={`rounded-3xl p-8 text-center ${passed ? 'bg-gradient-to-br from-green-50 to-emerald-100' : pending ? 'bg-gradient-to-br from-amber-50 to-yellow-100' : 'bg-gradient-to-br from-red-50 to-rose-100'}`}>
        <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${passed ? 'bg-green-500' : pending ? 'bg-amber-400' : 'bg-red-500'}`}>
          {pending ? <AlertCircle size={36} className="text-white" /> : passed ? <Trophy size={36} className="text-white" /> : <XCircle size={36} className="text-white" />}
        </div>
        <h2 className={`text-2xl font-black mb-1 ${passed ? 'text-green-800' : pending ? 'text-amber-800' : 'text-red-800'}`}>
          {pending ? 'En attente de correction' : passed ? 'Réussi !' : 'Non validé'}
        </h2>
        <p className={`text-5xl font-black my-3 ${passed ? 'text-green-700' : pending ? 'text-amber-700' : 'text-red-600'}`}>
          {score.toFixed(1)}%
        </p>
        <p className={`text-sm ${passed ? 'text-green-600' : pending ? 'text-amber-600' : 'text-red-600'}`}>
          {attempt.score}/{attempt.max_score} points
        </p>
        {pending && <p className="text-xs text-amber-600 mt-2">Certaines réponses textuelles attendent la correction du professeur.</p>}
      </div>

      {/* Per-question feedback */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-700">Détail des réponses</h3>
        {questions.map((q, idx) => {
          const a   = answers[q.id];
          const result = attempt.answers?.find(x => x.question === q.id);
          const correct = result?.is_correct;
          const pending = result?.is_correct === null || result?.is_correct === undefined;
          return (
            <div key={q.id} className={`p-4 rounded-2xl border-2 ${correct ? 'border-green-200 bg-green-50' : pending ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${correct ? 'bg-green-500' : pending ? 'bg-amber-400' : 'bg-red-500'}`}>
                  {correct ? <CheckCircle size={14} className="text-white" /> : pending ? <AlertCircle size={14} className="text-white" /> : <XCircle size={14} className="text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">Q{idx + 1}. {q.text}</p>
                  {q.explanation && !pending && (
                    <p className="text-xs text-gray-500 mt-1 italic">{q.explanation}</p>
                  )}
                  {result?.manual_feedback && (
                    <div className="mt-2 text-xs text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg">
                      Commentaire : {result.manual_feedback}
                    </div>
                  )}
                </div>
                <span className={`text-xs font-bold flex-shrink-0 ${correct ? 'text-green-600' : pending ? 'text-amber-600' : 'text-red-600'}`}>
                  {result ? `${parseFloat(result.points_earned).toFixed(1)}/${parseFloat(q.points).toFixed(1)} pt` : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onBack}
          className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-700 py-3 rounded-2xl text-sm font-semibold hover:bg-gray-50">
          <BookOpen size={16} /> Retour au cours
        </button>
        {onRetry && (
          <button onClick={onRetry}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-2xl text-sm font-semibold hover:bg-indigo-700">
            <RotateCcw size={16} /> Recommencer
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Time Expired Modal ───────────────────────────────────────────────────────
function TimeExpiredModal({ open, submitted, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center space-y-5">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
             style={{ background: '#fef2f2', border: '3px solid #fca5a5' }}>
          <Clock size={36} style={{ color: '#ef4444' }} />
        </div>
        <div>
          <h2 className="text-2xl font-black" style={{ color: '#1e293b' }}>Temps écoulé !</h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: '#64748b' }}>
            {submitted
              ? 'Votre copie a été soumise automatiquement. Consultez vos résultats ci-dessous.'
              : 'Soumission automatique en cours…'}
          </p>
        </div>
        {submitted ? (
          <button onClick={onClose}
                  className="w-full py-3 rounded-2xl text-sm font-black text-white"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
            Voir mes résultats
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full animate-ping" style={{ background: '#ef4444' }} />
            <span className="text-sm font-bold" style={{ color: '#ef4444' }}>Envoi en cours…</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main StudentQuizPage ─────────────────────────────────────────────────────
export default function StudentQuizPage() {
  const { quizId }       = useParams();
  const navigate         = useNavigate();
  const [searchParams]   = useSearchParams();
  const lessonId         = searchParams.get('lesson');

  const [phase, setPhase]         = useState('loading'); // loading|intro|quiz|submitted
  const [quiz, setQuiz]           = useState(null);
  const [attempt, setAttempt]     = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers]     = useState({});
  const [current, setCurrent]     = useState(0);
  const [timeLeft, setTimeLeft]   = useState(null);
  const [submitting, setSub]      = useState(false);
  const [error, setError]         = useState('');
  const [result, setResult]       = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showTimeExpiredModal, setShowTimeExpiredModal] = useState(false);
  const questionRefs = useRef({});

  // Load quiz info
  useEffect(() => {
    elearningService.getQuizById(quizId)
      .then(res => { setQuiz(res); setPhase('intro'); })
      .catch(() => { setError('Quiz introuvable.'); setPhase('error'); });
  }, [quizId]);

  // Timer
  useEffect(() => {
    if (phase !== 'quiz' || !timeLeft) return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(t); setShowTimeExpiredModal(true); handleSubmit(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  const startQuiz = async () => {
    try {
      const att = await elearningService.startQuizAttempt(quizId);
      setAttempt(att);
      const q = await elearningService.takeQuiz(quizId);
      const qs = q.questions || [];
      setQuestions(qs);
      if (q.time_limit_minutes > 0) setTimeLeft(q.time_limit_minutes * 60);
      setPhase('quiz');
    } catch (e) {
      setError(e.message || 'Impossible de démarrer le quiz.');
    }
  };

  const setAnswer = useCallback((qId, data) => {
    setAnswers(prev => ({ ...prev, [qId]: { ...(prev[qId] || {}), ...data } }));
  }, []);

  const handleSubmit = useCallback(async (auto = false) => {
    if (submitting || !attempt) return;
    setSub(true);
    try {
      const payload = questions.map(q => {
        const a = answers[q.id] || {};
        return {
          question_id: q.id,
          choice_ids: a.choice_ids || [],
          text_response: a.text_response || '',
          numeric_response: a.numeric_response ?? null,
          ordering_response: a.ordering_response || [],
          matching_response: a.matching_response || {},
        };
      });
      const res = await elearningService.submitQuizAttempt(attempt.id, payload);
      setResult(res);
      setPhase('submitted');
    } catch (e) {
      setError('Erreur lors de la soumission. Réessayez.');
    }
    setSub(false);
  }, [attempt, answers, questions, submitting]);

  const handleRetry = async () => {
    setPhase('intro'); setResult(null); setAnswers({}); setCurrent(0); setAttempt(null);
  };

  const goBack = () => navigate(lessonId ? `/student/courses` : -1);

  if (phase === 'loading') return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (phase === 'error') return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <XCircle size={48} className="text-red-400 mx-auto mb-3" />
        <p className="text-gray-700">{error}</p>
        <button onClick={goBack} className="mt-4 text-indigo-600 hover:underline">Retour</button>
      </div>
    </div>
  );

  // ── Intro ──
  if (phase === 'intro') {
    const attempts = quiz?.attempts_used || 0;
    const maxAtt   = quiz?.max_attempts || 0;
    const canStart = !maxAtt || attempts < maxAtt;
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ListChecks size={32} className="text-purple-600" />
            </div>
            <h1 className="text-2xl font-black text-gray-900">{quiz?.title}</h1>
            {quiz?.description && <p className="text-gray-500 text-sm mt-2">{quiz.description}</p>}
          </div>

          <div className="space-y-2 text-sm">
            {[
              ['Questions', `${quiz?.question_count || 0}`],
              ['Durée', quiz?.time_limit_minutes > 0 ? `${quiz.time_limit_minutes} min` : 'Illimitée'],
              ['Tentatives', maxAtt > 0 ? `${attempts}/${maxAtt} utilisée(s)` : 'Illimitées'],
              ['Seuil de réussite', `${quiz?.pass_score_percent || 50}%`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">{k}</span>
                <span className="font-semibold text-gray-900">{v}</span>
              </div>
            ))}
          </div>

          {/* Sujet PDF */}
          {quiz?.subject_file && (
            <a href={quiz.subject_file} target="_blank" rel="noopener noreferrer"
               className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed"
               style={{ borderColor: '#7c3aed40', background: '#faf5ff', color: '#7c3aed', textDecoration: 'none' }}>
              <FileText size={16} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black">Télécharger le sujet</p>
                <p className="text-xs" style={{ color: '#9f7aea' }}>Lisez le PDF avant de commencer</p>
              </div>
              <Download size={14} />
            </a>
          )}

          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>}

          {canStart ? (
            <button onClick={startQuiz}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-2xl font-bold hover:opacity-95 flex items-center justify-center gap-2">
              <ChevronRight size={18} /> Commencer le quiz
            </button>
          ) : (
            <div className="text-center text-sm text-gray-500">
              Nombre maximum de tentatives atteint.
            </div>
          )}
          <button onClick={goBack} className="w-full text-sm text-gray-400 hover:text-gray-600">Retour</button>
        </div>
      </div>
    );
  }

  // ── Results ──
  if (phase === 'submitted') {
    const canRetry = (!quiz?.max_attempts || (quiz.attempts_used || 0) + 1 < quiz.max_attempts);
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <TimeExpiredModal open={showTimeExpiredModal} submitted={true} onClose={() => setShowTimeExpiredModal(false)} />
        <QuizResults
          attempt={result}
          questions={questions}
          answers={answers}
          onRetry={canRetry ? handleRetry : null}
          onBack={goBack}
        />
      </div>
    );
  }

  // ── Quiz ──
  const isAnswered = (a) => !!(a && (
    (a.choice_ids?.length > 0) || (a.text_response?.trim()) ||
    (a.numeric_response != null) || (a.ordering_response?.length > 0) ||
    (Object.keys(a.matching_response || {}).length > 0)
  ));

  const answered = questions.filter(q => isAnswered(answers[q.id])).length;
  const timerRed = timeLeft !== null && timeLeft < 120;
  const allDoneTop = answered === questions.length;

  const scrollTo = (qId) => {
    questionRefs.current[qId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f8fafc' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-2 sm:gap-4">
          <div className="min-w-0">
            <p className="font-black text-gray-900 truncate text-sm">{quiz?.title}</p>
            <p className="text-xs" style={{ color: '#94a3b8' }}>{answered}/{questions.length} répondues</p>
          </div>

          {timeLeft !== null && (
            <div className={`flex items-center gap-1.5 font-mono font-black text-sm sm:text-base px-2.5 sm:px-3 py-1.5 rounded-xl flex-shrink-0 ${timerRed ? 'animate-pulse' : ''}`}
                 style={{ background: timerRed ? '#fef2f2' : '#f5f3ff', color: timerRed ? '#dc2626' : '#7c3aed' }}>
              <Clock size={14} /> {formatTime(timeLeft)}
            </div>
          )}

          <button onClick={() => setShowSubmitModal(true)} disabled={submitting}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex-shrink-0"
            style={{ background: allDoneTop ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#7c3aed,#6366f1)', boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}>
            <Send size={14} /> {submitting ? 'Envoi…' : 'Terminer'}
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1" style={{ background: '#f1f5f9' }}>
          <div className="h-full transition-all duration-500"
               style={{ width: `${(answered / Math.max(questions.length, 1)) * 100}%`, background: allDoneTop ? '#10b981' : 'linear-gradient(90deg,#7c3aed,#6366f1)' }} />
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6 flex gap-5">

        {/* ── All questions ── */}
        <div className="flex-1 space-y-4 min-w-0">
          {questions.map((q, idx) => {
            const done = isAnswered(answers[q.id]);
            return (
              <div key={q.id}
                   ref={el => { questionRefs.current[q.id] = el; }}
                   className="rounded-2xl overflow-hidden transition-all"
                   style={{ background: 'white', border: `1.5px solid ${done ? '#bbf7d0' : '#e2e8f0'}`, boxShadow: done ? '0 2px 12px rgba(5,150,105,0.06)' : '0 1px 6px rgba(0,0,0,0.04)' }}>

                {/* Question header */}
                <div className="flex items-center justify-between px-5 py-3"
                     style={{ background: done ? '#f0fdf4' : '#fafbff', borderBottom: `1px solid ${done ? '#d1fae5' : '#f1f5f9'}` }}>
                  <div className="flex items-center gap-2.5">
                    <span className="h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0"
                          style={{ background: done ? '#059669' : '#7c3aed', color: 'white' }}>
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-widest"
                          style={{ color: done ? '#059669' : '#7c3aed' }}>
                      {done ? '✓ Répondue' : `Question ${idx + 1} / ${questions.length}`}
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                        style={{ background: done ? '#dcfce7' : '#ede9fe', color: done ? '#059669' : '#7c3aed' }}>
                    {q.points} pt{q.points > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Question body */}
                <div className="p-5 space-y-4">
                  <p className="text-gray-900 font-semibold leading-relaxed">{q.text}</p>
                  <QuestionRenderer question={q} answer={answers[q.id]} onAnswer={setAnswer} />
                </div>
              </div>
            );
          })}

          {/* Bottom submit button */}
          <button onClick={() => setShowSubmitModal(true)} disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-black text-white disabled:opacity-50 transition-all"
            style={{ background: allDoneTop ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#7c3aed,#6366f1)', boxShadow: '0 6px 24px rgba(124,58,237,0.25)' }}>
            <Send size={16} />
            {submitting ? 'Envoi en cours…' : `Soumettre le quiz · ${answered}/${questions.length} répondues`}
          </button>
        </div>

        {/* ── Side navigation ── */}
        <div className="w-40 flex-shrink-0 hidden sm:block">
          <div className="rounded-2xl p-4 sticky top-20 max-h-[82vh] overflow-y-auto"
               style={{ background: 'white', border: '1.5px solid #f1f5f9', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
            <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: '#94a3b8' }}>
              Questions
            </p>
            <div className="space-y-1">
              {questions.map((q2, i) => {
                const done = isAnswered(answers[q2.id]);
                return (
                  <button key={q2.id} onClick={() => scrollTo(q2.id)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all hover:bg-gray-50">
                    <span className="h-5 w-5 rounded-md flex items-center justify-center flex-shrink-0 text-[10px] font-black"
                          style={{ background: done ? '#059669' : '#e2e8f0', color: done ? 'white' : '#94a3b8' }}>
                      {i + 1}
                    </span>
                    <span className="text-[11px] font-bold truncate" style={{ color: done ? '#059669' : '#94a3b8' }}>
                      {done ? 'Répondue' : 'En attente'}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 pt-3" style={{ borderTop: '1px solid #f1f5f9' }}>
              <p className="text-center text-xs font-black" style={{ color: '#7c3aed' }}>{answered}/{questions.length}</p>
              <p className="text-center text-[10px]" style={{ color: '#94a3b8' }}>répondues</p>
              <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
                <div className="h-full rounded-full transition-all"
                     style={{ width: `${(answered / Math.max(questions.length, 1)) * 100}%`, background: allDoneTop ? '#10b981' : '#7c3aed' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Time expired modal ── */}
      <TimeExpiredModal open={showTimeExpiredModal} submitted={phase === 'submitted'} onClose={() => setShowTimeExpiredModal(false)} />

      {/* ── Submit confirmation modal ── */}
      {showSubmitModal && (() => {
        const unanswered = questions.filter(q => {
          const a = answers[q.id];
          return !a || (!(a.choice_ids?.length > 0) && !(a.text_response?.trim()) && a.numeric_response == null && !(a.ordering_response?.length > 0) && !(Object.keys(a.matching_response || {}).length > 0));
        });
        const answeredCount = questions.length - unanswered.length;
        const allDone = unanswered.length === 0;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(8px)' }}>
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
              style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.25)' }}>
              {/* Top gradient bar */}
              <div className="h-1.5" style={{ background: 'linear-gradient(90deg,#7c3aed,#6366f1,#06b6d4)' }} />

              {/* Icon + title */}
              <div className="px-7 pt-7 pb-5 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: allDone ? 'linear-gradient(135deg,#d1fae5,#a7f3d0)' : 'linear-gradient(135deg,#fef3c7,#fde68a)' }}>
                  <Send size={28} style={{ color: allDone ? '#059669' : '#d97706' }} />
                </div>
                <h2 className="text-lg font-black text-gray-900">Soumettre le quiz ?</h2>
                <p className="text-sm text-gray-500 mt-1">Cette action est irréversible.</p>
              </div>

              {/* Stats */}
              <div className="mx-7 mb-5 rounded-2xl overflow-hidden" style={{ border: '1.5px solid #f1f5f9' }}>
                <div className="grid grid-cols-2 divide-x divide-gray-100">
                  <div className="p-4 text-center">
                    <p className="text-2xl font-black text-indigo-600">{answeredCount}</p>
                    <p className="text-xs font-semibold text-gray-400 mt-0.5">Répondues</p>
                  </div>
                  <div className="p-4 text-center">
                    <p className={`text-2xl font-black ${unanswered.length > 0 ? 'text-amber-500' : 'text-green-500'}`}>
                      {unanswered.length}
                    </p>
                    <p className="text-xs font-semibold text-gray-400 mt-0.5">Sans réponse</p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-2 bg-gray-100">
                  <div className="h-full transition-all"
                    style={{
                      width: `${(answeredCount / Math.max(questions.length, 1)) * 100}%`,
                      background: allDone ? '#10b981' : 'linear-gradient(90deg,#7c3aed,#6366f1)',
                    }} />
                </div>
              </div>

              {/* Warning if unanswered */}
              {unanswered.length > 0 && (
                <div className="mx-7 mb-5 px-4 py-3 rounded-xl flex items-start gap-3"
                  style={{ background: '#fffbeb', border: '1.5px solid #fde68a' }}>
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#d97706' }} />
                  <p className="text-xs font-semibold" style={{ color: '#92400e' }}>
                    {unanswered.length} question{unanswered.length > 1 ? 's' : ''} sans réponse. Vous pouvez encore y répondre.
                  </p>
                </div>
              )}

              {/* Buttons */}
              <div className="px-7 pb-7 flex gap-3">
                <button onClick={() => setShowSubmitModal(false)}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                  Continuer
                </button>
                <button
                  onClick={() => { setShowSubmitModal(false); handleSubmit(false); }}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)', boxShadow: '0 4px 18px #7c3aed40' }}>
                  <Send size={14} />
                  {submitting ? 'Envoi…' : 'Soumettre'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
