import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Award, Clock, CheckCircle, ChevronLeft,
  FileText, Trophy, Video,
  BarChart2, Play, Shield, Eye, Camera, Smartphone,
  Users, Lock, AlertTriangle, XCircle, ChevronDown, X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { elearningService } from '../../services/elearning';
import PdfModal from '../../components/exam/PdfModal';

const P = '#db2777';
const P_LIGHT = '#fce7f3';

const EXAM_TYPES  = { MID: 'Partiel', FINAL: 'Examen final', SUPP: 'Rattrapage', TP: 'TP noté', CONCOURS: 'Concours' };
const EXAM_COLORS = { MID: '#d97706', FINAL: '#ef4444', SUPP: '#7c3aed', TP: '#059669', CONCOURS: '#0ea5e9' };

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
function fmtDT(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── Exam Ranking ──────────────────────────────────────────────────────────────
const MENTION_COLORS = {
  'Excellent':   { fg: '#059669', bg: '#f0fdf4' },
  'Très bien':   { fg: '#0d9488', bg: '#f0fdfa' },
  'Bien':        { fg: '#2563eb', bg: '#eff6ff' },
  'Assez bien':  { fg: '#d97706', bg: '#fffbeb' },
  'Passable':    { fg: '#ea580c', bg: '#fff7ed' },
  'Insuffisant': { fg: '#dc2626', bg: '#fef2f2' },
};

function ordinal(rank) {
  return rank === 1 ? '1er' : `${rank}e`;
}

function ExamRanking({ examId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  // Distinguish "the API call itself failed" from "it succeeded but nobody's
  // graded yet" — both used to render the exact same empty state, which
  // made a real backend error (500/404) indistinguishable from a genuinely
  // empty ranking and impossible to diagnose from the UI alone.
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    elearningService.getExamRanking(examId)
      .then(res => { setRows(res?.results || []); setFailed(false); })
      .catch(() => { setRows([]); setFailed(true); })
      .finally(() => setLoading(false));
  }, [examId]);

  if (loading) return <Spinner />;
  if (failed) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" style={{ color: '#ef4444' }} />
        <p className="text-sm font-bold" style={{ color: '#dc2626' }}>Impossible de charger le classement</p>
        <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Une erreur s'est produite — réessayez plus tard ou contactez l'administration.</p>
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart2 className="h-8 w-8 mx-auto mb-2 opacity-20" style={{ color: P }} />
        <p className="text-sm font-bold" style={{ color: '#64748b' }}>Aucun classement disponible</p>
        <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Les résultats apparaîtront ici après la correction</p>
      </div>
    );
  }

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div>
      {rows.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {rows.slice(0, 3).map((r, i) => {
            const mc = MENTION_COLORS[r.mention] || MENTION_COLORS.Passable;
            return (
              <div key={r.rank} className="rounded-2xl p-4 text-center"
                   style={{ background: r.is_me ? '#fdf2f8' : i === 0 ? '#fef3c7' : '#f8fafc',
                            border: r.is_me ? `2px solid ${P}` : i === 0 ? '2px solid #d97706' : '1.5px solid #e2e8f0' }}>
                <p className="text-2xl mb-1">{medals[i]}</p>
                <p className="text-sm font-black truncate" style={{ color: '#1e293b' }}>
                  {r.full_name}{r.is_me && ' (vous)'}
                </p>
                <p className="text-xs font-black mt-1.5 px-2 py-1 rounded-full inline-block"
                   style={{ color: mc.fg, background: mc.bg }}>{r.mention}</p>
              </div>
            );
          })}
        </div>
      )}
      <div className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 6px #0001' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th className="px-4 py-3 text-left text-xs font-black" style={{ color: '#64748b' }}>Rang</th>
              <th className="px-4 py-3 text-left text-xs font-black" style={{ color: '#64748b' }}>Étudiant</th>
              <th className="px-4 py-3 text-right text-xs font-black" style={{ color: '#64748b' }}>Mention</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const mc = MENTION_COLORS[r.mention] || MENTION_COLORS.Passable;
              return (
                <tr key={r.rank} style={{ borderTop: '1px solid #f1f5f9', background: r.is_me ? '#fdf2f8' : i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td className="px-4 py-3 text-xs font-black" style={{ color: '#94a3b8' }}>
                    {r.rank <= 3 ? medals[r.rank - 1] : ordinal(r.rank)}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold" style={{ color: '#374151' }}>
                    {r.full_name}{r.is_me && ' (vous)'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: mc.fg, background: mc.bg }}>
                      {r.mention}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Exam Security Rules Modal ──────────────────────────────────────────────────
// Shown once, right before entering the exam session (not before, not
// after) — gates access behind actually scrolling through the rules rather
// than a single "I agree" checkbox, since the whole point is making sure the
// student has actually seen what triggers a block before they trigger one.
function ExamSecurityModal({ exam, onContinue, onClose }) {
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const scrollRef = useRef(null);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    // 24px slack so rounding/sub-pixel scroll math doesn't strand the
    // button disabled when the content is visually fully scrolled.
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setScrolledToEnd(true);
  };

  // A short modal that already fits on screen shouldn't permanently block
  // the button just because there's nothing to scroll — a callback ref
  // checks as soon as the scrollable node actually mounts, rather than a
  // post-mount effect racing the layout.
  const attachScroll = useCallback((node) => {
    scrollRef.current = node;
    if (node && node.scrollHeight <= node.clientHeight + 24) setScrolledToEnd(true);
  }, []);

  const rules = [
    exam?.webcam_required && 'Webcam requise pendant toute la durée de l\'examen',
    exam?.fullscreen_required && 'Mode plein écran obligatoire',
    exam?.block_copy_paste && 'Copier-coller désactivé',
    exam?.max_tab_switches != null && `Changement d'onglet limité à ${exam.max_tab_switches} fois`,
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(6px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden"
           style={{ maxHeight: '90vh', animation: 'fadeInUp .25s ease' }}>
        <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* Header */}
        <div className="relative px-7 pt-7 pb-5 text-white flex-shrink-0"
             style={{ background: 'linear-gradient(135deg,#db2777,#7c3aed)' }}>
          <button onClick={onClose} className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.15)' }}>
            <X className="h-4 w-4" />
          </button>
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-black leading-snug">Avant de commencer : conditions de surveillance</h1>
          <p className="text-xs opacity-80 mt-1">Merci de lire attentivement — {exam?.title}</p>
        </div>

        {/* Scrollable body */}
        <div ref={attachScroll} onScroll={handleScroll} className="flex-1 overflow-y-auto px-7 py-5 space-y-4">
          {rules.length > 0 && (
            <div className="rounded-2xl p-4" style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }}>
              <p className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: '#64748b' }}>Cet examen impose</p>
              <div className="flex flex-wrap gap-1.5">
                {rules.map((r, i) => (
                  <span key={i} className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'white', color: '#475569', border: '1px solid #e2e8f0' }}>{r}</span>
                ))}
              </div>
            </div>
          )}

          {/* Surveillance */}
          <div className="rounded-2xl p-4" style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#dbeafe' }}>
                <Camera className="h-4 w-4" style={{ color: '#2563eb' }} />
              </div>
              <h2 className="text-sm font-black" style={{ color: '#1e40af' }}>Une surveillance active pendant tout l'examen</h2>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#1e3a8a' }}>
              Votre webcam reste activée en continu. Le système analyse en temps réel votre visage et vos mouvements,
              et enregistre régulièrement des captures. Chaque capture est décrite précisément par une intelligence
              artificielle (ex : « l'étudiant tient un téléphone », « une deuxième personne est visible »).
              <strong> Toutes ces captures et descriptions sont transmises à votre enseignant</strong>, qui les
              consultera lors de la correction de votre copie.
            </p>
          </div>

          {/* Prohibited behaviors */}
          <div className="rounded-2xl p-4" style={{ background: '#fef2f2', border: '1.5px solid #fecaca' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#fee2e2' }}>
                <XCircle className="h-4 w-4" style={{ color: '#dc2626' }} />
              </div>
              <h2 className="text-sm font-black" style={{ color: '#991b1b' }}>Comportements interdits</h2>
            </div>
            <div className="space-y-2.5">
              {[
                { icon: Eye, text: 'Ne détournez pas le regard de votre écran — évitez de regarder à gauche, à droite, en haut ou en bas de façon prolongée.' },
                { icon: Smartphone, text: 'Ne tenez et ne montrez aucun téléphone, papier ou objet suspect devant la caméra.' },
                { icon: Users, text: 'Ne parlez à personne — vous devez rester seul(e) devant votre écran pendant toute la durée de l\'examen.' },
                { icon: Camera, text: 'Ne quittez pas le champ de la webcam (se retourner, sortir du cadre, s\'absenter).' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <item.icon className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: '#dc2626' }} />
                  <p className="text-xs leading-relaxed" style={{ color: '#7f1d1d' }}>{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tab switching */}
          <div className="rounded-2xl p-4" style={{ background: '#fff7ed', border: '1.5px solid #fed7aa' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#ffedd5' }}>
                <AlertTriangle className="h-4 w-4" style={{ color: '#c2410c' }} />
              </div>
              <h2 className="text-sm font-black" style={{ color: '#9a3412' }}>L'examen s'ouvre en plein écran — n'en sortez pas</h2>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#7c2d12' }}>
              La composition se déroule en plein écran, seule à l'écran. <strong>Dès la première fois</strong> que
              vous réduisez la fenêtre, changez d'onglet ou d'application (ex : ouvrir l'explorateur de fichiers), ou
              quittez le plein écran, votre examen est <strong>immédiatement suspendu pendant 5 minutes</strong> —
              voir ci-dessous.
            </p>
          </div>

          {/* Blocking mechanism */}
          <div className="rounded-2xl p-4" style={{ background: '#fef2f2', border: '1.5px solid #fecaca' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#fee2e2' }}>
                <Lock className="h-4 w-4" style={{ color: '#dc2626' }} />
              </div>
              <h2 className="text-sm font-black" style={{ color: '#991b1b' }}>Que se passe-t-il en cas de comportement suspect ?</h2>
            </div>
            <p className="text-xs leading-relaxed mb-2" style={{ color: '#7f1d1d' }}>
              Quitter la fenêtre/le plein écran de l'examen déclenche une suspension dès la première fois. Les
              signaux détectés par la webcam (objet tenu près du visage, regard détourné de façon répétée, une autre
              personne dans le champ, absence prolongée) déclenchent une suspension s'ils se répètent
              <strong> plusieurs fois</strong>. Dans les deux cas, votre examen est{' '}
              <strong>automatiquement suspendu pendant 5 minutes</strong> : un écran de blocage affiche le motif
              exact avec un compte à rebours, et le chronomètre de votre examen est mis en pause pendant ce temps
              (les 5 minutes sont ensuite déduites de votre temps restant).
            </p>
            <p className="text-xs leading-relaxed" style={{ color: '#7f1d1d' }}>
              Si un nouveau comportement suspect est détecté après cette suspension,{' '}
              <strong>l'examen est immédiatement terminé</strong> et vos réponses sont automatiquement soumises pour
              correction.
            </p>
          </div>

          {/* Reassurance */}
          <div className="rounded-2xl p-4 flex items-start gap-2.5" style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0' }}>
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: '#059669' }} />
            <p className="text-xs leading-relaxed" style={{ color: '#065f46' }}>
              Installez-vous dans un endroit calme, seul(e), avec un bon éclairage face à votre webcam, et gardez les
              yeux sur votre écran pendant toute l'épreuve. C'est tout ce qu'il vous faut pour que l'examen se déroule
              sans accroc.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-5 flex-shrink-0" style={{ borderTop: '1px solid #f1f5f9' }}>
          {!scrolledToEnd && (
            <p className="flex items-center justify-center gap-1.5 text-xs font-semibold mb-3" style={{ color: '#94a3b8' }}>
              <ChevronDown className="h-3.5 w-3.5 animate-bounce" /> Faites défiler pour lire toutes les conditions
            </p>
          )}
          <button onClick={onContinue} disabled={!scrolledToEnd}
                  className="w-full py-3.5 rounded-2xl text-sm font-black text-white transition-all cursor-pointer hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:active:scale-100"
                  style={{
                    background: scrolledToEnd ? 'linear-gradient(135deg,#db2777,#7c3aed)' : '#cbd5e1',
                    boxShadow: scrolledToEnd ? '0 8px 20px rgba(219,39,119,0.35)' : 'none',
                  }}>
            {scrolledToEnd ? 'J\'ai compris, continuer' : 'Continuer (lisez les conditions ci-dessus)'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Exam Detail ───────────────────────────────────────────────────────────────
function ExamDetailView({ exam: examProp, onBack }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('detail');
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showPdf, setShowPdf] = useState(false);

  // The exam grid only fetches once on mount, so my_session (status/score)
  // goes stale as soon as a teacher grades after the student opened this list —
  // refetch this one exam fresh so a just-graded result/ranking shows up
  // without requiring a full page reload.
  const [exam, setExam] = useState(examProp);
  useEffect(() => {
    elearningService.getSecureExamById(examProp.id).then(setExam).catch(() => {});
  }, [examProp.id]);

  const tc = EXAM_COLORS[exam.exam_type] || '#6366f1';
  // FLAGGED (anti-cheat auto-submit) is also a closed session — not just SUBMITTED —
  // otherwise a flagged student sees their result in "Classement" yet the exam
  // still looks re-startable here.
  const isDone = ['SUBMITTED', 'FLAGGED'].includes(exam.my_session?.status);
  const isAvailable = isExamAvailable(exam);
  const hasQuiz = !!exam.quiz;
  const hasPdf = !!exam.exam_pdf;
  const hasClassroom = !!exam.virtual_classroom;

  const TABS = [
    { id: 'detail', label: 'Détails', icon: FileText },
    { id: 'answer', label: 'Passer l\'examen', icon: Play },
    { id: 'ranking', label: 'Classement', icon: Trophy },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold mb-6" style={{ color: P }}>
        <ChevronLeft className="h-4 w-4" /> Retour aux examens
      </button>

      {/* Header */}
      <div className="rounded-2xl p-6 mb-6" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', borderLeft: `4px solid ${tc}` }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{ background: `${tc}15`, color: tc }}>
                {EXAM_TYPES[exam.exam_type] || exam.exam_type}
              </span>
              {isDone && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: '#f0fdf4', color: '#059669' }}>
                  Complété
                </span>
              )}
              {isAvailable && !isDone && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold animate-pulse"
                      style={{ background: '#fee2e2', color: '#dc2626' }}>EN COURS</span>
              )}
              {exam.quiz && <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: '#eef2ff', color: '#6366f1' }}>En ligne</span>}
              {hasPdf && <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: '#f5f3ff', color: '#7c3aed' }}>📄 PDF</span>}
              {hasClassroom && <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: '#f0fdf4', color: '#059669' }}>Classe virtuelle</span>}
            </div>
            <h1 className="text-xl font-black mb-1" style={{ color: '#1e293b' }}>{exam.title}</h1>
            {exam.description && <p className="text-sm" style={{ color: '#64748b' }}>{exam.description}</p>}
          </div>
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${tc}15` }}>
            <Award className="h-6 w-6" style={{ color: tc }} />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4" style={{ borderTop: '1px solid #f1f5f9' }}>
          <div><p className="text-xs font-bold mb-0.5" style={{ color: '#94a3b8' }}>Matière</p><p className="text-sm font-black" style={{ color: '#1e293b' }}>{exam.subject_name || '—'}</p></div>
          <div><p className="text-xs font-bold mb-0.5" style={{ color: '#94a3b8' }}>Durée</p><p className="text-sm font-black" style={{ color: '#1e293b' }}>{exam.duration_minutes} min</p></div>
          {exam.start_date && <div><p className="text-xs font-bold mb-0.5" style={{ color: '#94a3b8' }}>Début</p><p className="text-sm font-black" style={{ color: '#1e293b' }}>{fmtDT(exam.start_date)}</p></div>}
          <div><p className="text-xs font-bold mb-0.5" style={{ color: '#94a3b8' }}>Seuil</p><p className="text-sm font-black" style={{ color: '#1e293b' }}>{exam.pass_score_percent || 50}%</p></div>
        </div>
        {isDone && exam.my_session?.score != null && (
          <div className="mt-4 px-4 py-3 rounded-xl flex items-center gap-2" style={{ background: '#f0fdf4' }}>
            <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: '#059669' }} />
            <p className="text-sm font-black" style={{ color: '#059669' }}>
              Copie corrigée — consultez votre mention dans l'onglet Classement
            </p>
          </div>
        )}
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
          {/* Security parameters */}
          {(exam.fullscreen_required || exam.webcam_required || exam.block_copy_paste) && (
            <div className="rounded-2xl p-5" style={{ background: '#fffbeb', border: '1.5px solid #fde68a' }}>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4" style={{ color: '#d97706' }} />
                <h2 className="text-sm font-black" style={{ color: '#d97706' }}>Paramètres de sécurité</h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {exam.fullscreen_required && <p className="text-xs flex items-center gap-1.5" style={{ color: '#92400e' }}><CheckCircle className="h-3.5 w-3.5" /> Plein écran requis</p>}
                {exam.webcam_required && <p className="text-xs flex items-center gap-1.5" style={{ color: '#92400e' }}><CheckCircle className="h-3.5 w-3.5" /> Webcam requise</p>}
                {exam.block_copy_paste && <p className="text-xs flex items-center gap-1.5" style={{ color: '#92400e' }}><CheckCircle className="h-3.5 w-3.5" /> Copier-coller bloqué</p>}
                {exam.max_tab_switches && <p className="text-xs" style={{ color: '#92400e' }}>Max {exam.max_tab_switches} changement(s) d'onglet</p>}
              </div>
            </div>
          )}

          {/* Subject PDF — opens in-page, never a new tab (see PdfModal) */}
          {hasPdf && (
            <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: 'white', boxShadow: '0 1px 6px #0001' }}>
              <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#f5f3ff' }}>
                <FileText className="h-6 w-6" style={{ color: '#7c3aed' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black" style={{ color: '#1e293b' }}>Sujet de l'examen</p>
                <p className="text-xs" style={{ color: '#94a3b8' }}>Fichier PDF</p>
              </div>
              <button onClick={() => setShowPdf(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
                      style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                <Eye className="h-4 w-4" /> Voir
              </button>
            </div>
          )}
          {showPdf && <PdfModal url={exam.exam_pdf} onClose={() => setShowPdf(false)} />}

          {/* Virtual classroom */}
          {hasClassroom && (
            <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: 'white', boxShadow: '0 1px 6px #0001' }}>
              <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#f0fdf4' }}>
                <Video className="h-6 w-6" style={{ color: '#059669' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black" style={{ color: '#1e293b' }}>Classe virtuelle</p>
                <p className="text-xs" style={{ color: '#94a3b8' }}>L'examen se déroule en direct</p>
              </div>
              {exam.virtual_classroom?.meeting_url && (
                <a href={exam.virtual_classroom.meeting_url} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
                   style={{ background: '#059669' }}>
                  <Video className="h-4 w-4" /> Rejoindre
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Passer l'examen */}
      {tab === 'answer' && (
        <div className="rounded-2xl p-6" style={{ background: 'white', boxShadow: '0 1px 6px #0001' }}>
          {isDone ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto mb-3" style={{ color: '#059669' }} />
              <h2 className="text-base font-black mb-1" style={{ color: '#1e293b' }}>Examen soumis</h2>
              <p className="text-sm" style={{ color: '#64748b' }}>
                Vous avez soumis cet examen{exam.my_session?.submitted_at ? ` le ${fmt(exam.my_session.submitted_at)}` : ''}.
              </p>
              {exam.my_session?.score != null && (
                <div className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-xl" style={{ background: '#f0fdf4' }}>
                  <CheckCircle className="h-5 w-5" style={{ color: '#059669' }} />
                  <p className="text-sm font-black" style={{ color: '#059669' }}>Copie corrigée — voir la mention dans l'onglet Classement</p>
                </div>
              )}
            </div>
          ) : !isAvailable ? (
            <div className="text-center py-8">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" style={{ color: '#64748b' }} />
              <p className="text-sm font-bold" style={{ color: '#64748b' }}>Cet examen n'est pas encore disponible</p>
              {exam.start_date && (
                <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                  Disponible à partir du {fmtDT(exam.start_date)}
                </p>
              )}
            </div>
          ) : hasQuiz || hasPdf ? (
            <div className="text-center py-8">
              <div className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                   style={{ background: `${tc}15` }}>
                <Award className="h-8 w-8" style={{ color: tc }} />
              </div>
              <h2 className="text-base font-black mb-2" style={{ color: '#1e293b' }}>
                {hasQuiz && hasPdf ? 'Examen en ligne + copie PDF' : hasQuiz ? 'Examen en ligne' : 'Examen à rendre'}
              </h2>
              <p className="text-sm mb-6" style={{ color: '#64748b' }}>
                {exam.duration_minutes} minutes
                {hasQuiz && ` · ${exam.quiz?.questions_count || '—'} questions`}
                {hasPdf && !hasQuiz && ' · consultez le sujet PDF et répondez dans l\'application'}
                {hasPdf && hasQuiz && ' · + réponse au sujet PDF'}
              </p>
              <button onClick={() => setShowSecurityModal(true)}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black text-white mx-auto cursor-pointer transition-all hover:brightness-110 active:scale-[0.98]"
                      style={{ background: `linear-gradient(135deg,${tc},${tc}cc)` }}>
                <Play className="h-4 w-4" /> Commencer l'examen
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: '#64748b' }}>Format d'examen non configuré. Contactez votre enseignant.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Classement */}
      {tab === 'ranking' && <ExamRanking examId={exam.id} />}

      {showSecurityModal && (
        <ExamSecurityModal
          exam={exam}
          onClose={() => setShowSecurityModal(false)}
          onContinue={() => navigate(`/student/exams/${exam.id}`)}
        />
      )}
    </div>
  );
}

// ─── Exams Grid ────────────────────────────────────────────────────────────────
// Trust the backend's own is_available() (models.py SecureExam.is_available) —
// it's computed against the server's timezone.now(), so re-deriving it here
// from raw start_date/end_date strings against the browser's clock could
// disagree with the server the API will actually enforce on start-session.
function isExamAvailable(e) {
  return !!e.is_available;
}

export default function StudentExamsHub() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    elearningService.getSecureExams({ page_size: 200, is_published: true })
      .then(res => {
        const list = Array.isArray(res) ? res : res?.results || [];
        // Trier : disponibles en premier, puis par start_date croissant (plus proche en premier)
        list.sort((a, b) => {
          const aAvail = isExamAvailable(a);
          const bAvail = isExamAvailable(b);
          if (aAvail !== bAvail) return aAvail ? -1 : 1;
          const aDate = a.start_date ? new Date(a.start_date) : new Date('9999-01-01');
          const bDate = b.start_date ? new Date(b.start_date) : new Date('9999-01-01');
          return aDate - bDate;
        });
        setExams(list);
      })
      .catch(() => setExams([]))
      .finally(() => setLoading(false));
  }, []);

  const available = exams.filter(e => isExamAvailable(e));
  const done      = exams.filter(e => e.my_session?.status === 'SUBMITTED');
  const pending   = exams.filter(e => !isExamAvailable(e) && e.my_session?.status !== 'SUBMITTED');

  const byFilter = filter === 'available' ? available
    : filter === 'done' ? done
    : filter === 'pending' ? pending
    : exams;

  const filtered = search.trim()
    ? byFilter.filter(e =>
        e.title?.toLowerCase().includes(search.toLowerCase()) ||
        e.subject_name?.toLowerCase().includes(search.toLowerCase())
      )
    : byFilter;

  if (selected) {
    return <ExamDetailView exam={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black" style={{ color: '#1e293b' }}>Examens</h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>Vos examens programmés</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Award,       v: exams.length,     l: 'Total',       c: '#6366f1', bg: '#eef2ff' },
          { icon: Play,        v: available.length, l: 'En cours',    c: '#ef4444', bg: '#fef2f2' },
          { icon: Clock,       v: pending.length,   l: 'À venir',     c: '#d97706', bg: '#fffbeb' },
          { icon: CheckCircle, v: done.length,      l: 'Complétés',   c: '#059669', bg: '#f0fdf4' },
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
          {[['all','Tous'],['available','En cours'],['pending','À venir'],['done','Complétés']].map(([k,l]) => (
            <button key={k} onClick={() => setFilter(k)}
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
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un examen…"
            className="flex-1 text-sm outline-none bg-transparent"
            style={{ color: '#1e293b' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>
      </div>

      {/* Grid */}
      {loading ? <Spinner /> : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Award className="h-10 w-10 mx-auto mb-3 opacity-20" style={{ color: P }} />
          <p className="text-sm font-bold" style={{ color: '#64748b' }}>Aucun examen</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(e => {
            const tc      = EXAM_COLORS[e.exam_type] || '#6366f1';
            const isDone  = e.my_session?.status === 'SUBMITTED';
            const isLive  = isExamAvailable(e) && !isDone;
            const score   = e.my_session?.score;
            return (
              <div key={e.id} onClick={() => setSelected(e)}
                   className="rounded-2xl overflow-hidden flex flex-col cursor-pointer"
                   style={{ background: 'white', boxShadow: '0 1px 8px #0001', transition: 'box-shadow .2s, transform .2s' }}
                   onMouseEnter={ex => { ex.currentTarget.style.boxShadow = '0 6px 24px rgba(219,39,119,0.12)'; ex.currentTarget.style.transform = 'translateY(-2px)'; }}
                   onMouseLeave={ex => { ex.currentTarget.style.boxShadow = '0 1px 8px #0001'; ex.currentTarget.style.transform = 'none'; }}>
                {/* Colored top stripe */}
                <div className="h-28 flex items-center justify-center relative"
                     style={{ background: `linear-gradient(135deg,${tc},${tc}aa)` }}>
                  <Award className="h-10 w-10 text-white opacity-80" />
                  {isLive && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                         style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                      <span className="text-xs font-bold text-white">EN COURS</span>
                    </div>
                  )}
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background: 'rgba(255,255,255,0.9)', color: tc }}>
                    {EXAM_TYPES[e.exam_type] || e.exam_type}
                  </span>
                  {(e.quiz || e.exam_pdf) && (
                    <div className="absolute bottom-3 left-3 flex gap-1.5">
                      {e.quiz && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(255,255,255,0.85)', color: '#6366f1' }}>En ligne</span>}
                      {e.exam_pdf && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(255,255,255,0.85)', color: '#7c3aed' }}>PDF</span>}
                    </div>
                  )}
                </div>
                {/* Card body */}
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <h3 className="text-sm font-black line-clamp-2" style={{ color: '#1e293b' }}>{e.title}</h3>
                  <p className="text-xs" style={{ color: '#64748b' }}>
                    {e.subject_name || '—'} · {e.duration_minutes} min
                  </p>
                  {e.start_date && (
                    <p className="text-xs flex items-center gap-1" style={{ color: '#94a3b8' }}>
                      <Clock className="h-3 w-3" /> {fmtDT(e.start_date)}
                    </p>
                  )}
                  {score != null && (
                    <div className="mt-1 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5" style={{ background: '#f0fdf4' }}>
                      <CheckCircle className="h-3 w-3" style={{ color: '#059669' }} />
                      <p className="text-xs font-black" style={{ color: '#059669' }}>Corrigé — voir la mention dans le Classement</p>
                    </div>
                  )}
                </div>
                {/* Footer */}
                <div className="px-4 pb-4">
                  <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold"
                       style={{
                         background: isDone ? '#f0fdf4' : isLive ? '#fef2f2' : '#f8fafc',
                         color: isDone ? '#059669' : isLive ? '#dc2626' : '#64748b',
                       }}>
                    {isDone ? <><CheckCircle className="h-3.5 w-3.5" /> Voir les résultats</>
                            : isLive ? <><Play className="h-3.5 w-3.5" /> Passer l'examen</>
                            : <><Clock className="h-3.5 w-3.5" /> Voir les détails</>}
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
