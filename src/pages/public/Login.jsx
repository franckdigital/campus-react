import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const features = [
  'Gestion complète des étudiants et enseignants',
  'Suivi des présences en temps réel',
  'Module finance et comptabilité intégré',
  'Plateforme e-learning intégrée',
];

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const DEMO_ACCOUNTS = [
    { label: 'Admin',      email: 'admin@ita-abidjan.ci',           password: 'campus2025', color: '#6366f1', bg: '#eef2ff' },
    { label: 'Enseignant', email: 'k.mensah@ita-abidjan.ci',        password: 'campus2025', color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'Etudiant',   email: 'yao.konan.01@ita-abidjan.ci',    password: 'campus2025', color: '#059669', bg: '#ecfdf5' },
    { label: 'Parent',     email: 'parent.konan.yao@ita-abidjan.ci',password: 'campus2025', color: '#d97706', bg: '#fffbeb' },
  ];

  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      const userType = data.user?.user_type;
      if (userType === 'PARENT') {
        navigate('/parent');
      } else if (userType === 'STUDENT') {
        navigate('/student');
      } else if (userType === 'TEACHER') {
        navigate('/teacher');
      } else {
        navigate('/admin');
      }
    } catch (err) {
      setError(err.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#f8fafc' }}>

      {/* Left — form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md animate-fade-in">

          {/* Logo mobile */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="h-10 w-10 rounded-2xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold" style={{ color: '#0f172a' }}>CampusLMS</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#0f172a' }}>Bon retour !</h1>
            <p className="text-base" style={{ color: '#64748b' }}>
              Connectez-vous à votre espace de gestion.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 rounded-2xl mb-6"
                 style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
              <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background: '#fee2e2' }}>
                <AlertCircle className="h-4 w-4" style={{ color: '#ef4444' }} />
              </div>
              <p className="text-sm font-medium" style={{ color: '#b91c1c' }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email or phone */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
                Email ou téléphone
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center"
                     style={{ background: '#f1f5f9' }}>
                  <Mail className="h-4 w-4" style={{ color: '#6366f1' }} />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="vous@campus.edu ou 0777560842"
                  className="input-field"
                  style={{ paddingLeft: '3.5rem' }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold" style={{ color: '#374151' }}>
                  Mot de passe
                </label>
                <button type="button" className="text-sm font-medium hover:underline" style={{ color: '#6366f1' }}>
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center"
                     style={{ background: '#f1f5f9' }}>
                  <Lock className="h-4 w-4" style={{ color: '#6366f1' }} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••"
                  className="input-field"
                  style={{ paddingLeft: '3.5rem', paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
                  style={{ color: '#94a3b8' }}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Demo accounts */}
            <div className="rounded-2xl p-3.5" style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: '#94a3b8' }}>
                Comptes démo — cliquez pour remplir
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map(acc => (
                  <button
                    key={acc.label}
                    type="button"
                    onClick={() => fillDemo(acc)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all hover:scale-[1.02]"
                    style={{ background: acc.bg, border: `1.5px solid ${acc.color}20` }}
                  >
                    <div className="h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold"
                         style={{ background: acc.color }}>
                      {acc.label[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold leading-none" style={{ color: acc.color }}>{acc.label}</p>
                      <p className="text-[10px] truncate mt-0.5" style={{ color: '#94a3b8' }}>{acc.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input type="checkbox" className="sr-only peer" />
                <div className="h-5 w-5 rounded-md border-2 transition-all peer-checked:bg-indigo-500 peer-checked:border-indigo-500"
                     style={{ borderColor: '#d1d5db' }} />
              </div>
              <span className="text-sm" style={{ color: '#64748b' }}>Se souvenir de moi pendant 7 jours</span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full h-12 text-base mt-2"
              style={{ background: loading ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #7c3aed)' }}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Connexion en cours…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Se connecter
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs mt-8" style={{ color: '#94a3b8' }}>
            © 2025 CampusLMS — Tous droits réservés
          </p>
        </div>
      </div>

      {/* Right — brand panel */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden"
           style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)' }}>

        {/* Geometric decoration */}
        <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 600 800" fill="none">
          <circle cx="500" cy="100" r="300" stroke="white" strokeWidth="1" />
          <circle cx="500" cy="100" r="200" stroke="white" strokeWidth="1" />
          <circle cx="500" cy="100" r="100" stroke="white" strokeWidth="1" />
          <circle cx="100" cy="700" r="250" stroke="white" strokeWidth="1" />
          <line x1="0" y1="400" x2="600" y2="200" stroke="white" strokeWidth="0.5" />
          <line x1="0" y1="500" x2="600" y2="300" stroke="white" strokeWidth="0.5" />
          <line x1="0" y1="600" x2="600" y2="400" stroke="white" strokeWidth="0.5" />
          <rect x="50" y="50" width="80" height="80" rx="12" stroke="white" strokeWidth="0.8" transform="rotate(15 90 90)" />
          <rect x="400" y="600" width="120" height="120" rx="16" stroke="white" strokeWidth="0.8" transform="rotate(-10 460 660)" />
        </svg>

        {/* Floating orbs */}
        <div className="absolute top-20 right-20 h-48 w-48 rounded-full opacity-20 animate-float"
             style={{ background: 'radial-gradient(circle, #818cf8, transparent)', animationDelay: '0s' }} />
        <div className="absolute bottom-32 left-20 h-64 w-64 rounded-full opacity-15 animate-float"
             style={{ background: 'radial-gradient(circle, #c4b5fd, transparent)', animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 right-10 h-32 w-32 rounded-full opacity-20 animate-float"
             style={{ background: 'radial-gradient(circle, #a78bfa, transparent)', animationDelay: '3s' }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl flex items-center justify-center"
                 style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight">CampusLMS</span>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em' }}>MANAGEMENT SYSTEM</p>
            </div>
          </div>

          {/* Main content */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
                 style={{ background: 'rgba(99,102,241,0.3)', color: '#c7d2fe', border: '1px solid rgba(99,102,241,0.4)' }}>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Plateforme active — Côte d'Ivoire
            </div>

            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              La gestion universitaire,
              <br />
              <span style={{ color: '#a5b4fc' }}>réinventée.</span>
            </h2>
            <p className="text-base leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '380px' }}>
              Pilotez votre établissement avec une plateforme tout-en-un, conçue pour les universités modernes d'Afrique de l'Ouest.
            </p>

            {/* Features */}
            <div className="space-y-3 mb-10">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0"
                       style={{ background: 'rgba(99,102,241,0.3)' }}>
                    <CheckCircle className="h-3 w-3" style={{ color: '#a5b4fc' }} />
                  </div>
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{f}</span>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: '2,500+', label: 'Étudiants' },
                { value: '150+', label: 'Enseignants' },
                { value: '95%', label: 'Satisfaction' },
              ].map((s, i) => (
                <div key={i} className="text-center p-4 rounded-2xl"
                     style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Sécurisé · Conforme RGPD · Support 24/7
          </p>
        </div>
      </div>
    </div>
  );
}
