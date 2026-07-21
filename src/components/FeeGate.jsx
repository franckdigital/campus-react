import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, CreditCard, CalendarClock, MonitorOff } from 'lucide-react';
import { useRegistrationFeeGate } from '../hooks/useRegistrationFeeGate';

// Wraps student-only content: if the student's registration fee isn't paid,
// shows a "pay to continue" screen instead of children — except when the
// student is already on /student/finances (where they can actually pay).
//
// Pass `elearningGate` on the routes that ARE e-learning resources (the
// e-learning hub, exam-taking page) to additionally enforce the payment
// échéancier for ELEARNING-modality students: behind schedule + no admin
// override = full lockout of e-learning, with a distinct explanatory message.
// This must NOT be applied to the blanket StudentLayout wrap, since the
// user's requirement only locks "ressources ... du elearning", not the
// whole student dashboard.
export default function FeeGate({ children, elearningGate = false }) {
  const { loading, isEnrolled, modality, tuitionUpToDate, echeanceOverride } = useRegistrationFeeGate();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) return null;

  const onFinances = location.pathname.startsWith('/student/finances');
  if (onFinances) return children;

  // E-learning resources are only for students actually following the
  // program that way — a présentiel student has no business here regardless
  // of payment status.
  const modalityLocked = elearningGate && modality != null && modality !== 'ELEARNING' && modality !== 'HYBRIDE';
  const elearningLocked = elearningGate && modality === 'ELEARNING' && !tuitionUpToDate && !echeanceOverride;

  if (isEnrolled && !elearningLocked && !modalityLocked) return children;

  if (modalityLocked) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center rounded-2xl p-8"
             style={{ background: '#fff', border: '1.5px solid #f1f5f9', boxShadow: '0 8px 32px rgba(15,23,42,0.06)' }}>
          <div className="mx-auto mb-4 h-16 w-16 rounded-2xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)' }}>
            <MonitorOff className="h-7 w-7" style={{ color: '#64748b' }} />
          </div>
          <h2 className="text-lg font-extrabold mb-2" style={{ color: '#0f172a' }}>
            Non disponible pour votre modalité
          </h2>
          <p className="text-sm mb-6" style={{ color: '#64748b' }}>
            Les ressources e-learning sont réservées aux étudiants suivis en e-learning
            ou en hybride. Votre modalité de suivi est présentielle.
          </p>
          <button
            onClick={() => navigate('/student')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  if (elearningLocked) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center rounded-2xl p-8"
             style={{ background: '#fff', border: '1.5px solid #f1f5f9', boxShadow: '0 8px 32px rgba(15,23,42,0.06)' }}>
          <div className="mx-auto mb-4 h-16 w-16 rounded-2xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #fee2e2, #fecaca)' }}>
            <CalendarClock className="h-7 w-7" style={{ color: '#dc2626' }} />
          </div>
          <h2 className="text-lg font-extrabold mb-2" style={{ color: '#0f172a' }}>
            Accès e-learning verrouillé
          </h2>
          <p className="text-sm mb-6" style={{ color: '#64748b' }}>
            Vous n'êtes pas à jour de votre échéancier de scolarité. L'accès aux ressources
            e-learning (cours, évaluations, examens) est suspendu jusqu'à régularisation de
            votre situation auprès de l'administration.
          </p>
          <button
            onClick={() => navigate('/student/finances')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 4px 16px rgba(220,38,38,0.3)' }}
          >
            <CreditCard className="h-4 w-4" />
            Voir ma situation financière
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center rounded-2xl p-8"
           style={{ background: '#fff', border: '1.5px solid #f1f5f9', boxShadow: '0 8px 32px rgba(15,23,42,0.06)' }}>
        <div className="mx-auto mb-4 h-16 w-16 rounded-2xl flex items-center justify-center"
             style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>
          <Lock className="h-7 w-7" style={{ color: '#d97706' }} />
        </div>
        <h2 className="text-lg font-extrabold mb-2" style={{ color: '#0f172a' }}>
          Accès restreint
        </h2>
        <p className="text-sm mb-6" style={{ color: '#64748b' }}>
          Cette fonctionnalité est verrouillée tant que le seuil minimum de scolarité
          n'est pas atteint. Rendez-vous dans <strong>Mes finances</strong> pour effectuer le paiement.
        </p>
        <button
          onClick={() => navigate('/student/finances')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', boxShadow: '0 4px 16px rgba(217,119,6,0.3)' }}
        >
          <CreditCard className="h-4 w-4" />
          Aller à Mes finances
        </button>
      </div>
    </div>
  );
}
