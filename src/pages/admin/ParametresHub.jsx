import { useNavigate } from 'react-router-dom';
import { Zap, Globe, Layers, Shield, Settings as SettingsIcon, DollarSign, BellRing } from 'lucide-react';

// Same structure/presentation as e-diligence's Paramètres hub
// (ediligence/frontend/src/pages/ParametresPage.js): gradient top strip,
// gradient icon box, title, description, "Accéder" with arrow, optional
// badge, plus a bottom info banner.
const MODULES = [
  {
    id: 'workspace-studio',
    title: 'Workspace Studio',
    description: "Logo, nom de l'application, couleurs et thème visuel",
    icon: Zap,
    gradient: 'linear-gradient(135deg, #fb923c, #f59e0b)',
    badge: 'Nouveau',
    path: '/admin/workspace',
  },
  {
    id: 'sites-management',
    title: 'Gestion des Sites',
    description: 'Gérer les sites, campus et antennes de votre établissement',
    icon: Globe,
    gradient: 'linear-gradient(135deg, #a855f7, #4f46e5)',
    path: '/admin/sites',
  },
  {
    id: 'academic-structure',
    title: 'Filières, Niveaux & Classes',
    description: "Gérer les programmes, niveaux d'études et classes",
    icon: Layers,
    gradient: 'linear-gradient(135deg, #14b8a6, #0d9488)',
    path: '/admin/classes',
  },
  {
    id: 'fee-config',
    title: 'Barème des frais',
    description: "Configurer les frais de scolarité par site, filière et niveau",
    icon: DollarSign,
    gradient: 'linear-gradient(135deg, #22d3ee, #0891b2)',
    path: '/admin/fee-config',
  },
  {
    id: 'reminder-settings',
    title: 'Alertes & Rappels',
    description: "Configurer les rappels automatiques et manuels d'échéancier et d'examens",
    icon: BellRing,
    gradient: 'linear-gradient(135deg, #fb7185, #e11d48)',
    path: '/admin/reminder-settings',
  },
  {
    id: 'rights-permissions',
    title: 'Droits & Permissions',
    description: "Configurer les droits d'accès et permissions système",
    icon: Shield,
    gradient: 'linear-gradient(135deg, #ef4444, #e11d48)',
    path: '/admin/user-roles',
  },
  {
    id: 'general-settings',
    title: 'Paramètres généraux',
    description: 'Informations établissement, académique, finance, notifications, sécurité, apparence',
    icon: SettingsIcon,
    gradient: 'linear-gradient(135deg, #6366f1, #4338ca)',
    path: '/admin/settings/general',
  },
];

export default function ParametresHub() {
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: '#1e293b' }}>
          <SettingsIcon className="h-5 w-5" style={{ color: '#6366f1' }} /> Paramètres
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>
          Configuration et administration du système
        </p>
      </div>

      {/* Modules grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          return (
            <button
              key={mod.id}
              onClick={() => navigate(mod.path)}
              className="group relative rounded-2xl p-6 text-left transition-all hover:shadow-md hover:-translate-y-0.5 overflow-hidden"
              style={{ background: '#fff', border: '1px solid #f1f5f9', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
            >
              {/* Gradient accent strip */}
              <div className="absolute inset-x-0 top-0 h-1" style={{ background: mod.gradient }} />

              {mod.badge && (
                <span className="absolute top-3 right-4 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: '#ffedd5', color: '#ea580c' }}>
                  {mod.badge}
                </span>
              )}

              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-4"
                style={{ background: mod.gradient, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <Icon className="h-6 w-6" />
              </div>

              <h3 className="font-bold text-base mb-1.5 transition-colors" style={{ color: '#1e293b' }}>
                {mod.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
                {mod.description}
              </p>

              <div className="mt-4 flex items-center gap-1 text-xs font-medium transition-colors" style={{ color: '#94a3b8' }}>
                Accéder
                <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>

      {/* Info banner */}
      <div className="rounded-2xl p-5 flex items-start gap-4" style={{ background: '#fff', border: '1px solid #f1f5f9', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#eff6ff' }}>
          <Shield className="h-4.5 w-4.5" style={{ color: '#3b82f6' }} />
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-1" style={{ color: '#334155' }}>Administration Système</h3>
          <div className="text-xs space-y-1" style={{ color: '#94a3b8' }}>
            <p>• <span className="font-medium" style={{ color: '#64748b' }}>Workspace Studio</span> — Personnalisez logo, nom et couleurs de l'interface</p>
            <p>• <span className="font-medium" style={{ color: '#64748b' }}>Gestion des Sites</span> — Configurez les sites et campus de l'établissement</p>
            <p>• <span className="font-medium" style={{ color: '#64748b' }}>Filières, Niveaux & Classes</span> — Structurez l'offre pédagogique par site</p>
            <p>• <span className="font-medium" style={{ color: '#64748b' }}>Barème des frais</span> — Fixez les montants de scolarité par site, filière et niveau</p>
            <p>• <span className="font-medium" style={{ color: '#64748b' }}>Alertes & Rappels</span> — Rappels automatiques et manuels d'échéancier et d'examens</p>
            <p>• <span className="font-medium" style={{ color: '#64748b' }}>Droits & Permissions</span> — Configurez les niveaux d'accès par rôle</p>
            <p>• <span className="font-medium" style={{ color: '#64748b' }}>Paramètres généraux</span> — Établissement, académique, finance, sécurité...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
