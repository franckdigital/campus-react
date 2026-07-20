import { useState, useEffect, useRef } from 'react';
import {
  ClipboardList, Clock, CheckCircle, ChevronLeft, Upload,
  Download, FileText, Trophy, Star, AlertCircle, Send,
  BookOpen, BarChart2, Award, ChevronDown, ChevronUp, Eye,
} from 'lucide-react';
import { elearningService } from '../../services/elearning';

const P = '#db2777';
const P_LIGHT = '#fce7f3';
const P_BG = '#fdf2f8';

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 rounded-full border-[3px] animate-spin"
           style={{ borderColor: P_LIGHT, borderTopColor: P }} />
    </div>
  );
}

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCountdown(secs) {
  if (secs <= 0) return null;
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
  return `${Math.floor(secs / 86400)}j ${Math.floor((secs % 86400) / 3600)}h`;
}

function DeadlineModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center space-y-5">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
             style={{ background: '#fef2f2', border: '3px solid #fca5a5' }}>
          <Clock className="h-10 w-10" style={{ color: '#ef4444' }} />
        </div>
        <div>
          <h2 className="text-2xl font-black" style={{ color: '#1e293b' }}>Délai dépassé !</h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: '#64748b' }}>
            La date limite de remise est dépassée. Vous ne pouvez plus soumettre ce devoir, sauf si une remise tardive est autorisée.
          </p>
        </div>
        <button onClick={onClose}
                className="w-full py-3 rounded-2xl text-sm font-black text-white"
                style={{ background: 'linear-gradient(135deg,#db2777,#be185d)' }}>
          J'ai compris
        </button>
      </div>
    </div>
  );
}

// ─── Assignment Ranking Tab ────────────────────────────────────────────────────
function AssignmentRanking({ assignmentId }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    elearningService.getSubmissions(assignmentId)
      .then(res => {
        const all = Array.isArray(res) ? res : res?.results || [];
        const graded = all.filter(s => s.correction?.score != null)
          .sort((a, b) => (b.correction?.score || 0) - (a.correction?.score || 0));
        setSubmissions(graded);
      })
      .catch(() => setSubmissions([]))
      .finally(() => setLoading(false));
  }, [assignmentId]);

  if (loading) return <Spinner />;
  if (submissions.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart2 className="h-8 w-8 mx-auto mb-2 opacity-20" style={{ color: P }} />
        <p className="text-sm font-bold" style={{ color: '#64748b' }}>Aucun classement disponible</p>
        <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Les notes apparaîtront ici une fois les copies corrigées</p>
      </div>
    );
  }

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {submissions.slice(0, 3).map((s, i) => (
          <div key={s.id} className="rounded-2xl p-4 text-center"
               style={{ background: i === 0 ? '#fef3c7' : i === 1 ? '#f1f5f9' : '#fef3c7', border: i === 0 ? '2px solid #d97706' : '1.5px solid #e2e8f0' }}>
            <p className="text-2xl mb-1">{medals[i]}</p>
            <p className="text-sm font-black" style={{ color: '#1e293b' }}>
              {s.student_name || s.student?.user?.full_name || `Étudiant ${i + 1}`}
            </p>
            <p className="text-lg font-black mt-1" style={{ color: i === 0 ? '#d97706' : '#374151' }}>
              {s.correction.score}/{s.assignment_max_score || 20}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 6px #0001' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th className="px-4 py-3 text-left text-xs font-black" style={{ color: '#64748b' }}>#</th>
              <th className="px-4 py-3 text-left text-xs font-black" style={{ color: '#64748b' }}>Étudiant</th>
              <th className="px-4 py-3 text-right text-xs font-black" style={{ color: '#64748b' }}>Note</th>
              <th className="px-4 py-3 text-right text-xs font-black" style={{ color: '#64748b' }}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s, i) => (
              <tr key={s.id} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                <td className="px-4 py-3 text-xs font-black" style={{ color: '#94a3b8' }}>
                  {i < 3 ? medals[i] : `#${i + 1}`}
                </td>
                <td className="px-4 py-3 text-sm font-semibold" style={{ color: '#374151' }}>
                  {s.student_name || s.student?.user?.full_name || '—'}
                </td>
                <td className="px-4 py-3 text-sm font-black text-right" style={{ color: P }}>
                  {s.correction.score}/{s.assignment_max_score || 20}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: '#f0fdf4', color: '#059669' }}>Corrigé</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Assignment Detail ─────────────────────────────────────────────────────────
function AssignmentDetailView({ assignment: initialAssignment, onBack }) {
  const [tab, setTab] = useState('detail'); // detail | submit | ranking
  const [submitMode, setSubmitMode] = useState('text'); // text | file
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [submitting, setSub] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [fullData, setFullData] = useState(null);
  const [submission, setSubmission] = useState(initialAssignment.submission || null);
  const [pdfOpen, setPdfOpen] = useState(true);
  const [pdfOpenInSubmit, setPdfOpenInSubmit] = useState(false);
  const [dueSecondsLeft, setDueSecondsLeft] = useState(null);
  const [deadlineJustExpired, setDeadlineJustExpired] = useState(false);
  const fileRef = useRef(null);
  const prevDueLeft = useRef(null);

  // Fetch full assignment data (list serializer is minimal)
  useEffect(() => {
    elearningService.getAssignmentById(initialAssignment.id)
      .then(res => {
        setFullData(res);
        // Sync student's own submission if present in full data
        if (res.submissions?.length) setSubmission(res.submissions[0]);
      })
      .catch(() => {});
  }, [initialAssignment.id]);

  const assignment = fullData || initialAssignment;

  // Live countdown
  useEffect(() => {
    if (!assignment.due_date || submission) return;
    const tick = () => {
      const s = Math.round((new Date(assignment.due_date) - Date.now()) / 1000);
      setDueSecondsLeft(s);
      if (prevDueLeft.current > 0 && s <= 0) setDeadlineJustExpired(true);
      prevDueLeft.current = s;
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [assignment.due_date, submission]);

  const isPastDue = assignment.due_date && new Date(assignment.due_date) < new Date();
  const correction = submission?.correction;
  const isGraded = correction?.score != null;

  const handleSubmit = async () => {
    if (!content.trim() && !file) { setError('Veuillez rédiger une réponse ou joindre un fichier.'); return; }
    setSub(true); setError('');
    try {
      const fd = new FormData();
      if (content.trim()) fd.append('content', content.trim());
      if (file) fd.append('file', file);
      const res = await elearningService.submitAssignment(assignment.id, fd);
      setSubmission(res);
      setSuccess(true);
      setCompleting(false);
      setTab('detail');
    } catch (e) {
      setError(e.message || 'Erreur lors de la soumission');
    } finally {
      setSub(false);
    }
  };

  const TABS = [
    { id: 'detail', label: 'Détails', icon: FileText },
    { id: 'submit', label: submission ? 'Ma soumission' : 'Rendre le devoir', icon: Send },
    { id: 'ranking', label: 'Classement', icon: Trophy },
  ];

  const borderClr = submission ? '#059669' : isPastDue ? '#dc2626' : '#d97706';

  return (
    <div className="p-8 max-w-4xl">
      <DeadlineModal open={deadlineJustExpired} onClose={() => setDeadlineJustExpired(false)} />
      <button onClick={() => onBack(submission)} className="flex items-center gap-1.5 text-sm font-semibold mb-6" style={{ color: P }}>
        <ChevronLeft className="h-4 w-4" /> Retour aux devoirs
      </button>

      {/* Header */}
      <div className="rounded-2xl p-6 mb-6" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', borderLeft: `4px solid ${borderClr}` }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {assignment.subject_name && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: P_LIGHT, color: P }}>
                  {assignment.subject_name}
                </span>
              )}
              {isGraded && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: '#f0fdf4', color: '#059669' }}>
                  Noté : {correction.score}/{assignment.max_score || 20}
                </span>
              )}
              {isPastDue && !submission && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: '#fef2f2', color: '#dc2626' }}>
                  Délai dépassé
                </span>
              )}
            </div>
            <h1 className="text-xl font-black mb-1" style={{ color: '#1e293b' }}>{assignment.title}</h1>
            {assignment.description && (
              <p className="text-sm" style={{ color: '#64748b' }}>{assignment.description}</p>
            )}
          </div>
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0"
               style={{ background: submission ? '#f0fdf4' : '#fffbeb' }}>
            {submission
              ? <CheckCircle className="h-6 w-6" style={{ color: '#059669' }} />
              : <ClipboardList className="h-6 w-6" style={{ color: '#d97706' }} />
            }
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4" style={{ borderTop: '1px solid #f1f5f9' }}>
          <div>
            <p className="text-xs font-bold mb-0.5" style={{ color: '#94a3b8' }}>Date limite</p>
            <p className="text-sm font-black" style={{ color: isPastDue ? '#dc2626' : '#1e293b' }}>{fmt(assignment.due_date)}</p>
            {!submission && dueSecondsLeft !== null && dueSecondsLeft > 0 && dueSecondsLeft < 86400 && (
              <p className="text-xs font-black mt-0.5 font-mono"
                 style={{ color: dueSecondsLeft < 1800 ? '#ef4444' : dueSecondsLeft < 7200 ? '#d97706' : '#059669' }}>
                ⏱ {formatCountdown(dueSecondsLeft)}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-bold mb-0.5" style={{ color: '#94a3b8' }}>Note max</p>
            <p className="text-sm font-black" style={{ color: '#1e293b' }}>{assignment.max_score || 20} pts</p>
          </div>
          {assignment.teacher_name && (
            <div>
              <p className="text-xs font-bold mb-0.5" style={{ color: '#94a3b8' }}>Enseignant</p>
              <p className="text-sm font-black" style={{ color: '#1e293b' }}>{assignment.teacher_name}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-bold mb-0.5" style={{ color: '#94a3b8' }}>Statut</p>
            <p className="text-sm font-black" style={{ color: borderClr }}>
              {submission ? (isGraded ? 'Corrigé' : 'Rendu') : isPastDue ? 'En retard' : 'À rendre'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  style={tab === t.id ? { background: P, color: 'white' } : { background: 'white', color: '#64748b', boxShadow: '0 1px 4px #0001' }}>
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Détails */}
      {tab === 'detail' && (
        <div className="space-y-4">
          {success && (
            <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0' }}>
              <CheckCircle className="h-5 w-5" style={{ color: '#059669' }} />
              <p className="text-sm font-bold" style={{ color: '#059669' }}>Devoir soumis avec succès !</p>
            </div>
          )}

          {/* Description */}
          {assignment.description && (
            <div className="rounded-2xl p-5" style={{ background: 'white', boxShadow: '0 1px 6px #0001' }}>
              <h2 className="text-sm font-black mb-3" style={{ color: '#1e293b' }}>Description</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#475569' }}>{assignment.description}</p>
            </div>
          )}

          {/* Instructions */}
          {assignment.instructions && (
            <div className="rounded-2xl p-5" style={{ background: 'white', boxShadow: '0 1px 6px #0001' }}>
              <h2 className="text-sm font-black mb-3" style={{ color: '#1e293b' }}>Instructions</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#475569' }}>{assignment.instructions}</p>
            </div>
          )}

          {/* Info cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {assignment.class_name && (
              <div className="rounded-2xl p-4" style={{ background: 'white', boxShadow: '0 1px 6px #0001' }}>
                <p className="text-xs font-bold mb-1" style={{ color: '#94a3b8' }}>Classe</p>
                <p className="text-sm font-black" style={{ color: '#1e293b' }}>{assignment.class_name}</p>
              </div>
            )}
            {assignment.teacher_name && (
              <div className="rounded-2xl p-4" style={{ background: 'white', boxShadow: '0 1px 6px #0001' }}>
                <p className="text-xs font-bold mb-1" style={{ color: '#94a3b8' }}>Enseignant</p>
                <p className="text-sm font-black" style={{ color: '#1e293b' }}>{assignment.teacher_name}</p>
              </div>
            )}
            <div className="rounded-2xl p-4" style={{ background: 'white', boxShadow: '0 1px 6px #0001' }}>
              <p className="text-xs font-bold mb-1" style={{ color: '#94a3b8' }}>Date limite</p>
              <p className="text-sm font-black" style={{ color: isPastDue ? '#dc2626' : '#1e293b' }}>{fmt(assignment.due_date)}</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: 'white', boxShadow: '0 1px 6px #0001' }}>
              <p className="text-xs font-bold mb-1" style={{ color: '#94a3b8' }}>Note maximale</p>
              <p className="text-sm font-black" style={{ color: '#1e293b' }}>{assignment.max_score || 20} pts</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: 'white', boxShadow: '0 1px 6px #0001' }}>
              <p className="text-xs font-bold mb-1" style={{ color: '#94a3b8' }}>Soumission tardive</p>
              <p className="text-sm font-black" style={{ color: assignment.allow_late_submission ? '#059669' : '#dc2626' }}>
                {assignment.allow_late_submission
                  ? `Autorisée${assignment.late_penalty_percent > 0 ? ` (−${assignment.late_penalty_percent}%)` : ''}`
                  : 'Non autorisée'}
              </p>
            </div>
          </div>

          {/* Sujet PDF — viewer inline */}
          {assignment.attachment && (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: '0 2px 12px rgba(124,58,237,0.08)', border: '1.5px solid #ede9fe' }}>
              {/* Barre de titre */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: '#f5f3ff' }}>
                  <FileText className="h-5 w-5" style={{ color: '#7c3aed' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black" style={{ color: '#1e293b' }}>Sujet du devoir</p>
                  <p className="text-xs" style={{ color: '#94a3b8' }}>
                    {pdfOpen ? 'Lecture du PDF en cours — faites défiler pour tout lire' : 'Cliquez sur "Voir le sujet" pour lire le PDF'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a href={assignment.attachment} target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                     style={{ background: '#f1f5f9', color: '#64748b' }}>
                    <Download className="h-3.5 w-3.5" /> Télécharger
                  </a>
                  <button onClick={() => setPdfOpen(v => !v)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                          style={pdfOpen
                            ? { background: '#7c3aed', color: 'white' }
                            : { background: '#f5f3ff', color: '#7c3aed' }}>
                    {pdfOpen
                      ? <><ChevronUp className="h-4 w-4" /> Réduire</>
                      : <><Eye className="h-4 w-4" /> Voir le sujet</>}
                  </button>
                </div>
              </div>

              {/* Viewer PDF */}
              {pdfOpen && (
                <div style={{ borderTop: '1px solid #ede9fe' }}>
                  <iframe
                    src={`${assignment.attachment}#toolbar=1&navpanes=0`}
                    title="Sujet du devoir"
                    style={{ width: '100%', height: '720px', border: 'none', display: 'block', background: '#f8fafc' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Correction display */}
          {correction && (
            <div className="rounded-2xl p-5" style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0' }}>
              <h2 className="text-sm font-black mb-4" style={{ color: '#059669' }}>Correction du professeur</h2>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-center">
                  <p className="text-3xl font-black" style={{ color: '#059669' }}>{correction.score}</p>
                  <p className="text-xs font-bold" style={{ color: '#6b7280' }}>/ {assignment.max_score || 20}</p>
                </div>
                <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: '#dcfce7' }}>
                  <div className="h-full rounded-full" style={{ width: `${(correction.score / (assignment.max_score || 20)) * 100}%`, background: '#059669' }} />
                </div>
              </div>
              {correction.feedback && (
                <div className="rounded-xl p-4" style={{ background: 'white' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: '#64748b' }}>Commentaire</p>
                  <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>{correction.feedback}</p>
                </div>
              )}
              {correction.corrected_file && (
                <a href={correction.corrected_file} target="_blank" rel="noopener noreferrer"
                   className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold w-fit"
                   style={{ background: '#059669', color: 'white' }}>
                  <Download className="h-4 w-4" /> Copie corrigée
                </a>
              )}
            </div>
          )}

          {/* No content placeholder */}
          {!assignment.description && !assignment.instructions && !assignment.attachment && !correction && !fullData && (
            <div className="text-center py-8">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" style={{ color: P }} />
              <p className="text-sm font-bold" style={{ color: '#64748b' }}>Chargement des détails…</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Soumettre */}
      {tab === 'submit' && (
        <div className="rounded-2xl p-6" style={{ background: 'white', boxShadow: '0 1px 6px #0001' }}>
          {submission && !completing ? (
            <div className="space-y-4">
              {/* ─── Note du professeur ─── */}
              {isGraded ? (
                <div className="rounded-2xl p-5 space-y-3"
                     style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1.5px solid #86efac' }}>
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5" style={{ color: '#059669' }} />
                    <p className="text-sm font-black" style={{ color: '#059669' }}>Votre note</p>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="text-center flex-shrink-0">
                      <p className="text-5xl font-black leading-none" style={{ color: '#059669' }}>{correction.score}</p>
                      <p className="text-sm font-bold mt-1" style={{ color: '#6b7280' }}>/ {assignment.max_score || 20}</p>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between text-xs font-bold" style={{ color: '#6b7280' }}>
                        <span>Score</span>
                        <span>{Math.round(correction.score / (assignment.max_score || 20) * 100)}%</span>
                      </div>
                      <div className="h-3 rounded-full overflow-hidden" style={{ background: '#dcfce7' }}>
                        <div className="h-full rounded-full transition-all"
                             style={{ width: `${Math.min(100, (correction.score / (assignment.max_score || 20)) * 100)}%`, background: '#059669' }} />
                      </div>
                      <p className="text-xs font-bold" style={{ color: correction.score / (assignment.max_score || 20) >= 0.5 ? '#059669' : '#dc2626' }}>
                        {correction.score / (assignment.max_score || 20) >= 0.5 ? '✓ Validé' : '✗ Insuffisant'}
                      </p>
                    </div>
                  </div>
                  {correction.feedback && (
                    <div className="rounded-xl p-4" style={{ background: 'white' }}>
                      <p className="text-xs font-bold mb-1.5" style={{ color: '#94a3b8' }}>Commentaire du professeur</p>
                      <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>{correction.feedback}</p>
                    </div>
                  )}
                  {correction.corrected_file && (
                    <a href={correction.corrected_file} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold w-fit"
                       style={{ background: '#059669', color: 'white' }}>
                      <Download className="h-4 w-4" /> Télécharger la correction du prof
                    </a>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl p-4"
                     style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: '#059669' }} />
                  <div>
                    <p className="text-sm font-black" style={{ color: '#059669' }}>Devoir soumis</p>
                    <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                      {fmt(submission.submitted_at)}
                      {submission.is_late && <span className="ml-2 font-bold" style={{ color: '#dc2626' }}>· En retard</span>}
                      <span className="ml-2" style={{ color: '#94a3b8' }}>· En attente de correction</span>
                    </p>
                  </div>
                </div>
              )}

              {/* ─── Contenu de la soumission ─── */}
              {submission.content && (
                <div className="rounded-xl p-4" style={{ background: '#f8fafc' }}>
                  <p className="text-xs font-bold mb-2" style={{ color: '#64748b' }}>Votre réponse</p>
                  <p className="text-sm whitespace-pre-line leading-relaxed" style={{ color: '#374151' }}>{submission.content}</p>
                </div>
              )}
              {submission.file && (
                <a href={submission.file} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold w-fit"
                   style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                  <Download className="h-4 w-4" /> Votre fichier soumis
                </a>
              )}

              {/* Not graded yet and something's missing (e.g. only text was sent
                  and the PDF was never attached) — let the student complete it. */}
              {!isGraded && (!submission.file || !submission.content) && (
                <button onClick={() => { setContent(submission.content || ''); setSubmitMode(!submission.file ? 'file' : 'text'); setCompleting(true); }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold w-fit"
                        style={{ background: '#fffbeb', color: '#d97706', border: '1.5px solid #fde68a' }}>
                  <Upload className="h-4 w-4" />
                  {!submission.file ? 'Ajouter le fichier de ma copie' : 'Ajouter une réponse texte'}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black" style={{ color: '#1e293b' }}>
                  {completing ? 'Compléter ma soumission' : 'Rendre le devoir'}
                </h2>
                {completing && (
                  <button onClick={() => setCompleting(false)} className="text-xs font-bold" style={{ color: '#94a3b8' }}>
                    Annuler
                  </button>
                )}
                {!submission && dueSecondsLeft !== null && dueSecondsLeft > 0 && (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black font-mono ${dueSecondsLeft < 1800 ? 'animate-pulse' : ''}`}
                       style={{
                         background: dueSecondsLeft < 1800 ? '#fef2f2' : dueSecondsLeft < 7200 ? '#fffbeb' : '#f0fdf4',
                         color: dueSecondsLeft < 1800 ? '#ef4444' : dueSecondsLeft < 7200 ? '#d97706' : '#059669',
                       }}>
                    <Clock className="h-3 w-3" />
                    {formatCountdown(dueSecondsLeft)}
                  </div>
                )}
              </div>

              {/* Sujet PDF compact dans la vue soumission */}
              {assignment.attachment && (
                <div className="rounded-xl overflow-hidden" style={{ border: '1.5px solid #ede9fe' }}>
                  <button onClick={() => setPdfOpenInSubmit(v => !v)}
                          className="w-full flex items-center gap-3 px-4 py-3"
                          style={{ background: '#faf5ff' }}>
                    <FileText className="h-4 w-4 flex-shrink-0" style={{ color: '#7c3aed' }} />
                    <span className="flex-1 text-sm font-bold text-left" style={{ color: '#7c3aed' }}>
                      Consulter le sujet du devoir
                    </span>
                    {pdfOpenInSubmit
                      ? <ChevronUp className="h-4 w-4" style={{ color: '#7c3aed' }} />
                      : <ChevronDown className="h-4 w-4" style={{ color: '#7c3aed' }} />}
                  </button>
                  {pdfOpenInSubmit && (
                    <iframe
                      src={`${assignment.attachment}#toolbar=1&navpanes=0`}
                      title="Sujet du devoir"
                      style={{ width: '100%', height: '480px', border: 'none', display: 'block', borderTop: '1px solid #ede9fe' }}
                    />
                  )}
                </div>
              )}

              {/* Mode selector */}
              <div className="flex gap-2">
                <button onClick={() => setSubmitMode('text')}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                        style={submitMode === 'text' ? { background: P, color: 'white' } : { background: '#f8fafc', color: '#64748b' }}>
                  <Send className="h-4 w-4" /> Répondre dans le système
                </button>
                <button onClick={() => setSubmitMode('file')}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                        style={submitMode === 'file' ? { background: P, color: 'white' } : { background: '#f8fafc', color: '#64748b' }}>
                  <Upload className="h-4 w-4" /> Uploader ma copie
                </button>
              </div>

              {submitMode === 'text' && (
                <div>
                  <label className="block text-xs font-bold mb-2" style={{ color: '#64748b' }}>Votre réponse</label>
                  <textarea value={content} onChange={e => setContent(e.target.value)} rows={10}
                            placeholder="Rédigez votre réponse ici..."
                            className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                            style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#374151', lineHeight: '1.6' }} />
                </div>
              )}

              {submitMode === 'file' && (
                <div>
                  <input type="file" ref={fileRef} className="hidden"
                         accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
                         onChange={e => setFile(e.target.files[0])} />
                  <button onClick={() => fileRef.current?.click()}
                          className="w-full py-12 rounded-2xl border-2 border-dashed flex flex-col items-center gap-3 transition-colors"
                          style={{ borderColor: file ? P : '#e2e8f0', background: file ? P_BG : '#fafafa' }}>
                    <Upload className="h-8 w-8" style={{ color: file ? P : '#94a3b8' }} />
                    {file
                      ? <><p className="text-sm font-black" style={{ color: P }}>{file.name}</p>
                           <p className="text-xs" style={{ color: '#94a3b8' }}>{(file.size / 1024).toFixed(1)} Ko</p></>
                      : <><p className="text-sm font-bold" style={{ color: '#64748b' }}>Cliquez pour sélectionner un fichier</p>
                           <p className="text-xs" style={{ color: '#94a3b8' }}>PDF, Word, Image, ZIP — max 50 Mo</p></>
                    }
                  </button>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: '#fef2f2' }}>
                  <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: '#dc2626' }} />
                  <p className="text-xs font-semibold" style={{ color: '#dc2626' }}>{error}</p>
                </div>
              )}

              <button onClick={handleSubmit} disabled={submitting}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black text-white disabled:opacity-50"
                      style={{ background: `linear-gradient(135deg,${P},#be185d)` }}>
                {submitting ? <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Send className="h-4 w-4" />}
                Soumettre le devoir
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab: Classement */}
      {tab === 'ranking' && <AssignmentRanking assignmentId={assignment.id} />}
    </div>
  );
}

// ─── Assignments Grid ──────────────────────────────────────────────────────────
const PAGE_SIZE = 9;

export default function StudentAssignmentsHub() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    elearningService.getAssignments({ page_size: 100, ordering: '-created_at' })
      .then(res => setAssignments(Array.isArray(res) ? res : res?.results || []))
      .catch(() => setAssignments([]))
      .finally(() => setLoading(false));
  }, []);

  const pending   = assignments.filter(a => !a.submission);
  const submitted = assignments.filter(a => !!a.submission);
  const graded    = assignments.filter(a => a.submission?.correction?.score != null);

  const filtered = filter === 'pending' ? pending
    : filter === 'submitted' ? submitted
    : filter === 'graded' ? graded
    : assignments;

  const searched = search.trim()
    ? filtered.filter(a =>
        a.title?.toLowerCase().includes(search.toLowerCase()) ||
        a.subject_name?.toLowerCase().includes(search.toLowerCase()) ||
        a.class_name?.toLowerCase().includes(search.toLowerCase())
      )
    : filtered;

  const totalPages = Math.max(1, Math.ceil(searched.length / PAGE_SIZE));
  const paged = searched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (selected) {
    return (
      <AssignmentDetailView
        assignment={selected}
        onBack={(updatedSubmission) => {
          if (updatedSubmission) {
            setAssignments(prev => prev.map(a =>
              a.id === selected.id ? { ...a, submission: updatedSubmission } : a
            ));
          }
          setSelected(null);
        }}
      />
    );
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black" style={{ color: '#1e293b' }}>Devoirs & Exercices</h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>Vos devoirs à rendre</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: ClipboardList, v: assignments.length, l: 'Total',    c: '#6366f1', bg: '#eef2ff' },
          { icon: Clock,         v: pending.length,     l: 'À rendre', c: '#d97706', bg: '#fffbeb' },
          { icon: CheckCircle,   v: submitted.length,   l: 'Rendus',   c: '#059669', bg: '#f0fdf4' },
          { icon: Award,         v: graded.length,      l: 'Notés',    c: P,         bg: P_LIGHT   },
        ].map(({ icon: Icon, v, l, c, bg }) => (
          <div key={l} className="flex items-center gap-4 rounded-2xl p-4"
               style={{ background: 'white', boxShadow: '0 1px 6px #0001' }}>
            <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
              <Icon className="h-5 w-5" style={{ color: c }} />
            </div>
            <div><p className="text-xl font-black" style={{ color: '#1e293b' }}>{v}</p><p className="text-xs" style={{ color: '#64748b' }}>{l}</p></div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="flex gap-2 flex-wrap">
          {[['all','Tous'],['pending','À rendre'],['submitted','Rendus'],['graded','Notés']].map(([k,l]) => (
            <button key={k} onClick={() => { setFilter(k); setPage(1); }}
                    className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                    style={filter === k ? { background: P, color: 'white' } : { background: 'white', color: '#64748b', boxShadow: '0 1px 4px #0001' }}>
              {l}
            </button>
          ))}
        </div>
        <div className="w-full sm:w-auto sm:ml-auto sm:min-w-[220px] flex items-center gap-2 px-3 py-2 rounded-xl"
             style={{ background: 'white', boxShadow: '0 1px 4px #0001' }}>
          <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher un devoir…"
            className="flex-1 text-sm outline-none bg-transparent"
            style={{ color: '#1e293b' }}
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1); }} className="text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>
      </div>

      {/* Grid */}
      {loading ? <Spinner /> : searched.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-20" style={{ color: P }} />
          <p className="text-sm font-bold" style={{ color: '#64748b' }}>Aucun devoir</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {paged.map(a => {
            const isPastDue = a.due_date && new Date(a.due_date) < new Date() && !a.submission;
            const isGraded  = a.submission?.correction?.score != null;
            const hasFile   = !!a.attachment;
            const borderClr = a.submission ? '#059669' : isPastDue ? '#dc2626' : '#d97706';
            const score     = a.submission?.correction?.score;
            return (
              <div key={a.id} onClick={() => setSelected(a)}
                   className="rounded-2xl overflow-hidden flex flex-col cursor-pointer"
                   style={{ background: 'white', boxShadow: '0 1px 8px #0001', transition: 'box-shadow .2s, transform .2s' }}
                   onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(219,39,119,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                   onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 8px #0001'; e.currentTarget.style.transform = 'none'; }}>
                {/* Card header */}
                <div className="h-3 flex-shrink-0" style={{ background: borderClr }} />
                <div className="p-5 flex-1 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                         style={{ background: a.submission ? '#f0fdf4' : '#fffbeb' }}>
                      {isGraded
                        ? <Star className="h-5 w-5" style={{ color: '#d97706' }} />
                        : a.submission
                        ? <CheckCircle className="h-5 w-5" style={{ color: '#059669' }} />
                        : <ClipboardList className="h-5 w-5" style={{ color: '#d97706' }} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-black line-clamp-2" style={{ color: '#1e293b' }}>{a.title}</h3>
                      {a.subject_name && <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{a.subject_name}</p>}
                    </div>
                  </div>
                  {a.description && (
                    <p className="text-xs line-clamp-2" style={{ color: '#64748b' }}>{a.description}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap mt-auto">
                    {hasFile && (
                      <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                        <FileText className="h-3 w-3" /> PDF
                      </span>
                    )}
                    {a.due_date && (
                      <span className="text-xs flex items-center gap-1" style={{ color: isPastDue ? '#dc2626' : '#64748b' }}>
                        <Clock className="h-3 w-3" />{fmt(a.due_date)}
                      </span>
                    )}
                  </div>
                </div>
                {/* Footer */}
                <div className="px-5 pb-4">
                  {isGraded ? (
                    <div className="rounded-xl p-3 space-y-1.5"
                         style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold" style={{ color: '#059669' }}>✓ Corrigé</span>
                        <span className="text-sm font-black" style={{ color: '#059669' }}>
                          {score} / {a.max_score || 20} pts
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#dcfce7' }}>
                        <div className="h-full rounded-full"
                             style={{ width: `${Math.min(100, (score / (a.max_score || 20)) * 100)}%`, background: '#059669' }} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between py-2.5 px-3 rounded-xl"
                         style={{ background: a.submission ? '#f0fdf4' : isPastDue ? '#fef2f2' : '#fffbeb' }}>
                      <span className="text-xs font-bold" style={{ color: borderClr }}>
                        {a.submission ? '✓ Rendu' : isPastDue ? '⚠ Délai dépassé' : '⏳ En attente'}
                      </span>
                      {a.max_score && (
                        <span className="text-xs font-bold" style={{ color: '#94a3b8' }}>/{a.max_score} pts</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && searched.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="h-9 w-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                  style={{ background: 'white', boxShadow: '0 1px 4px #0001' }}>
            <ChevronLeft className="h-4 w-4" style={{ color: '#64748b' }} />
          </button>
          <span className="text-xs font-bold px-3" style={{ color: '#64748b' }}>
            Page {page} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="h-9 w-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                  style={{ background: 'white', boxShadow: '0 1px 4px #0001' }}>
            <ChevronLeft className="h-4 w-4 rotate-180" style={{ color: '#64748b' }} />
          </button>
        </div>
      )}
    </div>
  );
}
