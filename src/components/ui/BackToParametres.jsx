import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// Small back-link shown at the top of every page reachable from the
// Paramètres hub (ParametresHub.jsx) — lets the admin return to the module
// grid without hitting the browser back button.
export default function BackToParametres() {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate('/admin/settings')}
      className="inline-flex items-center gap-1.5 text-xs font-semibold mb-3 transition-colors"
      style={{ color: '#94a3b8' }}
      onMouseEnter={e => e.currentTarget.style.color = '#6366f1'}
      onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Retour aux Paramètres
    </button>
  );
}
