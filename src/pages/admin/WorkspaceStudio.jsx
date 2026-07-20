import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Zap, Type, Palette, SlidersHorizontal, Upload, RotateCcw,
  Check, LayoutDashboard, Users, GraduationCap,
  Wallet, FileText, Eye,
} from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useNotifications } from '../../components/Notifications';
import BackToParametres from '../../components/ui/BackToParametres';

const TABS = [
  { id: 'identity', label: 'Identité',       icon: Type },
  { id: 'theme',    label: 'Thème & Couleurs', icon: Palette },
  { id: 'interface',label: 'Interface',       icon: SlidersHorizontal },
];

const FONT_SIZES = [11, 12, 13, 14, 15, 16, 17, 18, 19];

const PREVIEW_NAV = [
  { name: 'Dashboard',   icon: LayoutDashboard },
  { name: 'Étudiants',   icon: Users },
  { name: 'Enseignants', icon: GraduationCap },
  { name: 'Finance',     icon: Wallet },
  { name: 'Documents',   icon: FileText },
];

export default function WorkspaceStudio() {
  const { workspace, updateWorkspace, resetWorkspace, PRESET_THEMES } = useWorkspace();
  const { notify } = useNotifications();

  const [activeTab, setActiveTab]       = useState('identity');
  const [draft, setDraft]               = useState({ ...workspace });
  const [customHex, setCustomHex]       = useState(workspace.primaryColor);
  const [logoPreview, setLogoPreview]   = useState(workspace.logoUrl);
  // undefined = logo untouched this session, File = new upload, null = removed
  const [logoFile, setLogoFile]         = useState(undefined);
  const [activeNav, setActiveNav]       = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [saving, setSaving]             = useState(false);
  const fileRef = useRef(null);

  const patch = useCallback((key, val) => {
    setDraft(prev => ({ ...prev, [key]: val }));
    if (key === 'primaryColor') setCustomHex(val);
  }, []);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      notify({ type: 'error', title: 'Fichier trop lourd', message: 'Max 2 Mo', time: 'À l\'instant' }); return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target.result;
      setLogoPreview(url);
      setDraft(prev => ({ ...prev, logoUrl: url }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setLogoFile(null);
    setDraft(prev => ({ ...prev, logoUrl: null }));
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleApply = async () => {
    setSaving(true);
    try {
      await updateWorkspace(draft, logoFile);
      setLogoFile(undefined);
      notify({ type: 'success', title: 'Workspace mis à jour', message: 'Les changements ont été appliqués', time: 'À l\'instant' });
    } catch (e) {
      notify({ type: 'error', title: 'Erreur', message: e.message || 'Impossible d\'enregistrer les changements', time: 'À l\'instant' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      const saved = await resetWorkspace();
      setDraft(saved);
      setLogoPreview(saved.logoUrl);
      setLogoFile(undefined);
      setCustomHex(saved.primaryColor);
      setConfirmReset(false);
      notify({ type: 'info', title: 'Réinitialisé', message: 'Paramètres par défaut restaurés', time: 'À l\'instant' });
    } catch (e) {
      notify({ type: 'error', title: 'Erreur', message: e.message || 'Impossible de réinitialiser', time: 'À l\'instant' });
    } finally {
      setSaving(false);
    }
  };

  const isDirty = JSON.stringify(draft) !== JSON.stringify(workspace);

  return (
    <div className="flex flex-col gap-6">
      <BackToParametres />
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center"
               style={{ background: `linear-gradient(135deg, ${draft.primaryColor}, ${draft.primaryColor}bb)` }}>
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#0f172a' }}>Workspace Studio</h1>
            <p className="text-xs" style={{ color: '#94a3b8' }}>Personnalisez l'identité visuelle et l'apparence de l'application</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setConfirmReset(true)} disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: '#f1f5f9', color: '#64748b' }}
            onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
            onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>
            <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
          </button>
          <button onClick={handleApply} disabled={!isDirty || saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: (isDirty && !saving) ? draft.primaryColor : '#cbd5e1', cursor: (isDirty && !saving) ? 'pointer' : 'not-allowed' }}
            onMouseEnter={e => { if (isDirty && !saving) e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            <Check className="h-3.5 w-3.5" /> {saving ? 'Enregistrement…' : 'Appliquer'}
          </button>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* Left — tabs + content */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Tab bar */}
          <div className="inline-flex items-center gap-1 p-1 rounded-2xl" style={{ background: '#f1f5f9' }}>
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: active ? draft.primaryColor : 'transparent',
                    color: active ? '#fff' : '#64748b',
                    boxShadow: active ? `0 2px 12px ${draft.primaryColor}44` : 'none',
                  }}>
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── IDENTITÉ ── */}
          {activeTab === 'identity' && (
            <div className="space-y-4">
              {/* App name */}
              <Section title="Nom de l'application" color={draft.primaryColor}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Titre principal">
                    <input type="text" value={draft.appName}
                      onChange={e => patch('appName', e.target.value)}
                      className="input-field"
                      style={{ borderColor: draft.primaryColor + '55' }}
                      placeholder="CampusLMS" />
                  </Field>
                  <Field label="Sous-titre">
                    <input type="text" value={draft.appSubtitle}
                      onChange={e => patch('appSubtitle', e.target.value)}
                      className="input-field" placeholder="Plateforme de gestion académique" />
                  </Field>
                </div>
              </Section>

              {/* Logo */}
              <Section title="Logo de l'application" color={draft.primaryColor}>
                <div className="flex items-start gap-6">
                  {/* Preview */}
                  <div className="flex-shrink-0">
                    <div className="h-20 w-20 rounded-2xl flex items-center justify-center overflow-hidden"
                         style={{ border: '2px dashed #e2e8f0', background: '#f8fafc' }}>
                      {logoPreview
                        ? <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
                        : (
                          <div className="h-full w-full flex items-center justify-center"
                               style={{ background: `linear-gradient(135deg, ${draft.primaryColor}, ${draft.primaryColor}bb)` }}>
                            <GraduationCap className="h-8 w-8 text-white" />
                          </div>
                        )}
                    </div>
                    <p className="text-[10px] text-center mt-1" style={{ color: '#94a3b8' }}>Aperçu</p>
                  </div>
                  {/* Upload */}
                  <div className="flex-1">
                    <label htmlFor="logo-upload"
                      className="flex flex-col items-center justify-center py-8 rounded-2xl cursor-pointer transition-all"
                      style={{ border: `2px dashed ${logoPreview ? draft.primaryColor : '#e2e8f0'}`, background: logoPreview ? draft.primaryColor + '08' : '#fafafa' }}>
                      <input id="logo-upload" ref={fileRef} type="file" accept="image/png,image/jpg,image/jpeg,image/svg+xml" onChange={handleLogoUpload} className="hidden" />
                      <Upload className="h-7 w-7 mb-2" style={{ color: logoPreview ? draft.primaryColor : '#94a3b8' }} />
                      <p className="text-sm font-medium" style={{ color: logoPreview ? draft.primaryColor : '#64748b' }}>
                        {logoPreview ? 'Changer le logo' : 'Téléverser un logo'}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>PNG, JPG, SVG — max 2 Mo. Recommandé : 192×192 px</p>
                    </label>
                    {logoPreview && (
                      <button onClick={handleRemoveLogo}
                        className="mt-2 text-xs font-medium transition-colors"
                        style={{ color: '#ef4444' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                        onMouseLeave={e => e.currentTarget.style.color = '#ef4444'}>
                        Supprimer le logo
                      </button>
                    )}
                  </div>
                </div>
              </Section>
            </div>
          )}

          {/* ── THÈME & COULEURS ── */}
          {activeTab === 'theme' && (
            <div className="space-y-4">
              {/* Preset themes */}
              <Section title="Thèmes prédéfinis" color={draft.primaryColor}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PRESET_THEMES.map(t => {
                    const selected = draft.primaryColor === t.color;
                    return (
                      <button key={t.color} onClick={() => patch('primaryColor', t.color)}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all"
                        style={{ border: `2px solid ${selected ? t.color : '#f1f5f9'}`, background: selected ? t.color + '10' : '#fafafa' }}>
                        <div className="h-10 w-10 rounded-xl relative flex items-center justify-center"
                             style={{ background: t.color }}>
                          {selected && <Check className="h-5 w-5 text-white" />}
                        </div>
                        <span className="text-[11px] font-semibold text-center" style={{ color: selected ? t.color : '#64748b' }}>{t.name}</span>
                      </button>
                    );
                  })}
                </div>
              </Section>

              {/* Custom color */}
              <Section title="Couleur personnalisée" color={draft.primaryColor}>
                <div className="flex flex-col items-center gap-4">
                  <p className="text-xs" style={{ color: '#64748b' }}>Code hexadécimal</p>
                  <div className="flex items-center gap-3 w-full max-w-sm">
                    <label htmlFor="color-pick" className="h-11 w-11 rounded-xl cursor-pointer flex-shrink-0 transition-transform hover:scale-105"
                           style={{ background: customHex, border: '2px solid #e2e8f0', boxShadow: `0 4px 14px ${customHex}50` }}>
                      <input id="color-pick" type="color" value={customHex} className="opacity-0 h-0 w-0"
                             onChange={e => { setCustomHex(e.target.value); patch('primaryColor', e.target.value); }} />
                    </label>
                    <input type="text" value={customHex}
                      onChange={e => { const v = e.target.value; setCustomHex(v); if (/^#[0-9a-fA-F]{6}$/.test(v)) patch('primaryColor', v); }}
                      className="flex-1 input-field font-mono"
                      style={{ borderColor: customHex + '55' }}
                      placeholder="#6366f1" maxLength={7} />
                    <button onClick={() => patch('primaryColor', customHex)}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all flex-shrink-0"
                      style={{ background: draft.primaryColor }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                      Appliquer
                    </button>
                  </div>
                  <p className="text-xs" style={{ color: '#94a3b8' }}>Cliquez sur le carré coloré pour ouvrir le sélecteur visuel</p>
                </div>

                {/* Component preview */}
                <div className="mt-5 p-4 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#94a3b8' }}>Aperçu des composants</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <button className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                            style={{ background: draft.primaryColor }}>Bouton principal</button>
                    <button className="px-4 py-2 rounded-xl text-sm font-semibold"
                            style={{ border: `1.5px solid ${draft.primaryColor}`, color: draft.primaryColor, background: 'transparent' }}>Bouton secondaire</button>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                          style={{ background: draft.primaryColor + '18', color: draft.primaryColor }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: draft.primaryColor }} /> Badge actif
                    </span>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
                         style={{ background: draft.primaryColor, color: '#fff' }}>
                      <LayoutDashboard className="h-3.5 w-3.5" /> Menu actif sidebar
                    </div>
                    <span className="text-sm font-semibold" style={{ color: draft.primaryColor }}>● Lien coloré</span>
                  </div>
                </div>
              </Section>

            </div>
          )}

          {/* ── INTERFACE ── */}
          {activeTab === 'interface' && (
            <div className="space-y-4">
              <Section title="Préférences d'affichage" color={draft.primaryColor}>
                <div className="divide-y" style={{ borderColor: '#f1f5f9' }}>
                  {/* Compact mode */}
                  <PreferenceRow label="Mode compact" desc="Réduit l'espacement des listes et tableaux">
                    <Toggle value={draft.compactMode} color={draft.primaryColor}
                            onChange={v => patch('compactMode', v)} />
                  </PreferenceRow>

                  {/* Language */}
                  <PreferenceRow label="Langue" desc="Langue d'affichage de l'interface">
                    <select value={draft.language} onChange={e => patch('language', e.target.value)}
                      className="input-field w-40 text-sm"
                      style={{ borderColor: draft.primaryColor + '44' }}>
                      <option value="fr">🇫🇷 Français</option>
                      <option value="en">🇬🇧 English</option>
                    </select>
                  </PreferenceRow>

                  {/* Date format */}
                  <PreferenceRow label="Format de date" desc="Affichage des dates dans l'application">
                    <select value={draft.dateFormat} onChange={e => patch('dateFormat', e.target.value)}
                      className="input-field w-44 text-sm"
                      style={{ borderColor: draft.primaryColor + '44' }}>
                      <option value="DD/MM/YYYY">07/05/2026</option>
                      <option value="MM/DD/YYYY">05/07/2026</option>
                      <option value="YYYY-MM-DD">2026-05-07</option>
                      <option value="D MMM YYYY">7 mai 2026</option>
                    </select>
                  </PreferenceRow>

                  {/* Items per page */}
                  <PreferenceRow label="Éléments par page" desc="Pagination par défaut des tableaux">
                    <select value={draft.itemsPerPage} onChange={e => patch('itemsPerPage', Number(e.target.value))}
                      className="input-field w-24 text-sm"
                      style={{ borderColor: draft.primaryColor + '44' }}>
                      {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </PreferenceRow>
                </div>
              </Section>

              {/* Font size */}
              <Section title="Taille de police" color={draft.primaryColor}>
                <p className="text-xs mb-4" style={{ color: '#64748b' }}>
                  Choisissez une taille prédéfinie ou saisissez une valeur personnalisée. La taille s'applique à tout le système.
                </p>
                {/* Size buttons grid */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {FONT_SIZES.map(size => {
                    const cur = typeof draft.fontSize === 'number' ? draft.fontSize : 14;
                    const sel = cur === size;
                    return (
                      <button key={size} onClick={() => patch('fontSize', size)}
                        className="h-10 w-10 rounded-xl text-xs font-bold transition-all"
                        style={sel
                          ? { background: draft.primaryColor, color: '#fff', boxShadow: `0 3px 10px ${draft.primaryColor}40` }
                          : { border: '1.5px solid #e2e8f0', color: '#64748b', background: '#fafafa' }}
                        onMouseEnter={e => { if (!sel) { e.currentTarget.style.borderColor = draft.primaryColor + '66'; e.currentTarget.style.color = draft.primaryColor; } }}
                        onMouseLeave={e => { if (!sel) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; } }}>
                        {size}
                      </button>
                    );
                  })}
                </div>

                {/* Custom size row */}
                <div className="flex items-end gap-4 pt-4" style={{ borderTop: '1px solid #f1f5f9' }}>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#475569' }}>
                      Taille personnalisée (px)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min={8} max={32} step={1}
                        value={typeof draft.fontSize === 'number' ? draft.fontSize : 14}
                        onChange={e => {
                          const val = parseInt(e.target.value, 10);
                          if (val >= 8 && val <= 32) patch('fontSize', val);
                        }}
                        className="input-field w-28"
                        style={{ borderColor: draft.primaryColor + '44' }}
                      />
                      <span className="text-xs font-semibold" style={{ color: '#94a3b8' }}>px</span>
                    </div>
                    <p className="text-[10px] mt-1" style={{ color: '#94a3b8' }}>Valeur entre 8 et 32px</p>
                  </div>

                  {/* Live preview */}
                  <div className="flex-shrink-0 p-4 rounded-2xl text-center min-w-[140px]"
                       style={{ background: `linear-gradient(135deg, ${draft.primaryColor}08, ${draft.primaryColor}04)`, border: `1.5px solid ${draft.primaryColor}20` }}>
                    <p style={{ fontSize: `${typeof draft.fontSize === 'number' ? draft.fontSize : 14}px`, fontWeight: 600, color: '#1e293b', lineHeight: 1.4 }}>
                      Aa — Aperçu texte
                    </p>
                    <p className="text-[10px] mt-1.5 font-semibold" style={{ color: draft.primaryColor }}>
                      {typeof draft.fontSize === 'number' ? draft.fontSize : 14}px
                    </p>
                  </div>
                </div>
              </Section>
            </div>
          )}
        </div>

        {/* Right — live preview */}
        <div className="hidden xl:flex flex-col gap-4 w-72 flex-shrink-0">
          <div className="rounded-2xl overflow-hidden sticky top-24" style={{ border: '1.5px solid #f0f4f9', background: '#fff' }}>
            {/* Preview header */}
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <Eye className="h-3.5 w-3.5" style={{ color: '#94a3b8' }} />
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Aperçu en-tête</p>
            </div>
            {/* Header preview */}
            <div className="px-4 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
                     style={{ background: `linear-gradient(135deg, ${draft.primaryColor}, ${draft.primaryColor}cc)` }}>
                  {logoPreview
                    ? <img src={logoPreview} alt="logo" className="h-full w-full object-contain" />
                    : <GraduationCap className="h-5 w-5 text-white" />}
                </div>
                <div>
                  <p className="text-sm font-bold truncate" style={{ color: '#0f172a', maxWidth: '160px' }}>{draft.appName || 'CampusLMS'}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#94a3b8' }}>
                    {draft.appSubtitle?.slice(0, 20) || 'Admin'}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu preview */}
            <div className="px-3 py-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <p className="text-[9px] font-bold uppercase tracking-widest px-1 mb-2" style={{ color: '#cbd5e1' }}>Aperçu menu</p>
              {PREVIEW_NAV.map((item, idx) => {
                const active = activeNav === idx;
                return (
                  <button key={idx} onClick={() => setActiveNav(idx)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl mb-0.5 text-left transition-all"
                    style={{ background: active ? draft.primaryColor + '18' : 'transparent', color: active ? draft.primaryColor : '#64748b' }}>
                    <div className="h-6 w-6 rounded-lg flex items-center justify-center"
                         style={{ background: active ? draft.primaryColor + '28' : '#f8fafc' }}>
                      <item.icon className="h-3.5 w-3.5" style={{ color: active ? draft.primaryColor : '#94a3b8' }} />
                    </div>
                    <span className="text-xs font-semibold">{item.name}</span>
                    {active && <div className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: draft.primaryColor }} />}
                  </button>
                );
              })}
            </div>

            {/* Buttons preview */}
            <div className="px-4 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-3" style={{ color: '#cbd5e1' }}>Aperçu boutons</p>
              <button className="w-full py-2 rounded-xl text-xs font-bold text-white mb-2"
                      style={{ background: draft.primaryColor }}>+ Nouveau</button>
              <div className="flex gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
                      style={{ background: draft.primaryColor + '18', color: draft.primaryColor }}>Actif</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
                      style={{ background: '#f1f5f9', color: '#64748b' }}>Inactif</span>
              </div>
            </div>

            {/* Current theme */}
            <div className="px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: '#cbd5e1' }}>Thème actuel</p>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg flex-shrink-0" style={{ background: draft.primaryColor }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: '#1e293b' }}>
                    {PRESET_THEMES.find(t => t.color === draft.primaryColor)?.name || 'Personnalisé'}
                  </p>
                  <p className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>{draft.primaryColor}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset confirmation */}
      {confirmReset && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4"
             style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', zIndex: 9999 }}
             onClick={() => setConfirmReset(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden"
               onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4"
                   style={{ background: '#fee2e2' }}>
                <RotateCcw className="h-7 w-7" style={{ color: '#ef4444' }} />
              </div>
              <p className="text-base font-bold mb-1" style={{ color: '#1e293b' }}>Réinitialiser le workspace ?</p>
              <p className="text-sm" style={{ color: '#94a3b8' }}>Tous les paramètres reviendront aux valeurs par défaut.</p>
            </div>
            <div className="px-4 pb-4 flex gap-3">
              <button type="button" onClick={() => setConfirmReset(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: '#f1f5f9', color: '#64748b' }}
                onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>
                Annuler
              </button>
              <button type="button" onClick={handleReset} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: '#ef4444' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                {saving ? 'Réinitialisation…' : 'Réinitialiser'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}

function Section({ title, color, children }) {
  return (
    <div className="rounded-2xl p-5" style={{ border: '1.5px solid #f0f4f9', background: '#fff' }}>
      <h2 className="flex items-center gap-2 text-sm font-bold mb-4" style={{ color }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: '#475569' }}>{label}</label>
      {children}
    </div>
  );
}

function PreferenceRow({ label, desc, children }) {
  return (
    <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
      <div>
        <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{desc}</p>
      </div>
      {children}
    </div>
  );
}

function Toggle({ value, onChange, color }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0"
      style={{ background: value ? color : '#e2e8f0' }}>
      <span className="inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform"
            style={{ transform: value ? 'translateX(24px)' : 'translateX(4px)' }} />
    </button>
  );
}

