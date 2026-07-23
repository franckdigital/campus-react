import { useState, useEffect } from 'react';
import {
  User, Mail, Phone, Hash, Layers, MapPin, Save, Lock, Eye, EyeOff, KeyRound,
} from 'lucide-react';
import { studentsService, usersService } from '../../services';
import { useNotifications } from '../../components/Notifications';
import { useAuth } from '../../context/AuthContext';

const C = '#db2777';   // pink accent — matches the student portal's own color
const CB = '#fdf2f8';

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl"
         style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
      <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: CB }}>
        <Icon className="h-4 w-4" style={{ color: C }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#94a3b8' }}>{label}</p>
        <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>{value || '—'}</p>
      </div>
    </div>
  );
}

export default function StudentProfile() {
  const { notify } = useNotifications();
  const { checkAuth } = useAuth();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const [pwd, setPwd] = useState({ old_password: '', new_password: '', new_password_confirm: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const [pwdError, setPwdError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const me = await studentsService.getMe();
        setStudent(me);
        setForm({
          first_name: me.user?.first_name || '',
          last_name: me.user?.last_name || '',
          phone: me.user?.phone || '',
        });
      } catch { /* handled by the empty-state below */ }
      setLoading(false);
    })();
  }, []);

  async function saveInfo(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await usersService.updateMe(form);
      setStudent(prev => ({ ...prev, user: { ...prev.user, ...updated } }));
      await checkAuth(); // refresh the name shown in the topbar/sidebar
      notify('Profil mis à jour', 'success');
    } catch {
      notify('Erreur lors de la mise à jour', 'error');
    }
    setSaving(false);
  }

  async function savePassword(e) {
    e.preventDefault();
    setPwdError('');
    if (pwd.new_password.length < 8) {
      setPwdError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (pwd.new_password !== pwd.new_password_confirm) {
      setPwdError('Les mots de passe ne correspondent pas.');
      return;
    }
    setChangingPwd(true);
    try {
      await usersService.changeMyPassword(pwd.old_password, pwd.new_password, pwd.new_password_confirm);
      setPwd({ old_password: '', new_password: '', new_password_confirm: '' });
      notify('Mot de passe modifié avec succès', 'success');
    } catch (err) {
      setPwdError(err?.response?.data?.old_password || err?.message || 'Erreur lors du changement de mot de passe');
    }
    setChangingPwd(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: C }} />
      </div>
    );
  }

  const user = student?.user;
  const fullName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : 'Étudiant';
  const initials = fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">

      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: CB }}>
            <User className="h-3 w-3" style={{ color: C }} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: C }}>Profil</span>
        </div>
        <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a', letterSpacing: '-0.03em' }}>Mon profil</h1>
      </div>

      {/* Identity banner */}
      <div className="card p-5">
        <div className="flex items-center gap-4 p-4 rounded-2xl"
             style={{ background: `linear-gradient(135deg, ${C}18, ${C}08)`, border: `1.5px solid ${C}30` }}>
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-white text-xl font-extrabold flex-shrink-0"
               style={{ background: `linear-gradient(135deg, ${C}, ${C}cc)` }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-base leading-tight" style={{ color: '#0f172a' }}>{fullName}</p>
            {student?.matricule && <p className="text-xs font-mono font-bold mt-0.5" style={{ color: C }}>{student.matricule}</p>}
            {student?.current_class && <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{student.current_class}</p>}
          </div>
        </div>
        {student?.site_name && (
          <div className="flex flex-wrap gap-2 mt-4">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold"
                 style={{ background: CB, color: C, border: `1px solid ${C}30` }}>
              <MapPin className="h-3 w-3" /> {student.site_name}
            </div>
          </div>
        )}
      </div>

      {/* Read-only account info */}
      <div className="card p-5 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#94a3b8' }}>Compte</p>
        <InfoRow icon={Mail} label="E-mail" value={user?.email} />
        {student?.matricule && <InfoRow icon={Hash} label="Matricule" value={student.matricule} />}
        {student?.current_class && <InfoRow icon={Layers} label="Classe" value={student.current_class} />}
      </div>

      {/* Editable info */}
      <div className="card p-5">
        <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#94a3b8' }}>Modifier mes informations</p>
        <form onSubmit={saveInfo} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: '#64748b' }}>Prénom</label>
              <input className="input-field w-full text-sm" value={form.first_name}
                onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: '#64748b' }}>Nom</label>
              <input className="input-field w-full text-sm" value={form.last_name}
                onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: '#64748b' }}>Téléphone</label>
            <input className="input-field w-full text-sm" placeholder="Ex: 0777560842"
              value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <button type="submit" disabled={saving}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${C}, #f472b6)` }}>
            {saving
              ? <div className="h-4 w-4 rounded-full border-2 animate-spin" style={{ borderColor: '#ffffff40', borderTopColor: '#fff' }} />
              : <Save className="h-4 w-4" />}
            Enregistrer
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="card p-5">
        <p className="text-xs font-bold uppercase tracking-wide mb-3 flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
          <KeyRound className="h-3.5 w-3.5" /> Modifier mon mot de passe
        </p>
        <form onSubmit={savePassword} className="space-y-3">
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: '#64748b' }}>Mot de passe actuel</label>
            <input type="password" className="input-field w-full text-sm" value={pwd.old_password}
              onChange={e => setPwd(p => ({ ...p, old_password: e.target.value }))} required />
          </div>
          <div className="relative">
            <label className="block text-xs font-bold mb-1" style={{ color: '#64748b' }}>Nouveau mot de passe</label>
            <input type={showPwd ? 'text' : 'password'} className="input-field w-full text-sm pr-9"
              placeholder="Min. 8 caractères" minLength={8}
              value={pwd.new_password} onChange={e => setPwd(p => ({ ...p, new_password: e.target.value }))} required />
            <button type="button" onClick={() => setShowPwd(s => !s)}
              className="absolute right-2 bottom-2 p-1" style={{ color: '#94a3b8' }}>
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: '#64748b' }}>Confirmer le nouveau mot de passe</label>
            <input type={showPwd ? 'text' : 'password'} className="input-field w-full text-sm"
              value={pwd.new_password_confirm} onChange={e => setPwd(p => ({ ...p, new_password_confirm: e.target.value }))} required />
          </div>
          {pwdError && (
            <div className="px-3 py-2 rounded-xl text-xs font-medium" style={{ background: '#fef2f2', color: '#dc2626' }}>
              {pwdError}
            </div>
          )}
          <button type="submit" disabled={changingPwd}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}>
            {changingPwd
              ? <div className="h-4 w-4 rounded-full border-2 animate-spin" style={{ borderColor: '#ffffff40', borderTopColor: '#fff' }} />
              : <Lock className="h-4 w-4" />}
            Changer le mot de passe
          </button>
        </form>
      </div>
    </div>
  );
}
