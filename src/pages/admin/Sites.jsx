import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Building, Globe, Plus, Edit, Trash2, X, MapPin, Phone, Mail,
  Upload, Check, AlertTriangle, IdCard, MapPinned
} from 'lucide-react';
import { sitesService } from '../../services';
import { useApi } from '../../hooks/useApi';
import { useSite } from '../../contexts/SiteContext';
import { PageHeader, IconBtn, PrimaryButton } from '../../components/ui/PageHeader';
import BackToParametres from '../../components/ui/BackToParametres';

const COLOR = '#6366f1'; const COLOR_BG = '#eef2ff'; const COLOR_ICON = '#e0e7ff';

const emptySiteForm = {
  name: '', code: '', address: '', city: '', country: "Côte d'Ivoire", phone: '', email: '', is_main: false
};

function FieldLabel({ icon: Icon, children }) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-bold mb-1.5" style={{ color: '#475569' }}>
      {Icon && <Icon className="h-3.5 w-3.5" style={{ color: '#94a3b8' }} />}
      {children}
    </label>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="h-5 w-1 rounded-full" style={{ background: COLOR }} />
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#64748b' }}>{children}</p>
    </div>
  );
}

function SiteModal({ editing, onClose, onSaved }) {
  const [form, setForm] = useState(editing ? {
    name: editing.name, code: editing.code, address: editing.address || '',
    city: editing.city || '', country: editing.country || "Côte d'Ivoire",
    phone: editing.phone || '', email: editing.email || '', is_main: editing.is_main || false,
  } : emptySiteForm);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(editing?.logo || null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const siteData = editing
        ? await sitesService.updateSite(editing.id, form)
        : await sitesService.createSite(form);
      if (logoFile && siteData.id) await sitesService.uploadLogo(siteData.id, logoFile);
      onSaved();
    } catch (err) {
      alert(err?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Gradient header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ background: `linear-gradient(135deg, ${COLOR}, #4338ca)` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <Building size={18} color="#fff" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{editing ? 'Modifier le site' : 'Nouveau site'}</h2>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {editing ? editing.name : "Ajoutez un campus ou une antenne"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Identité */}
          <div>
            <SectionTitle>Identité</SectionTitle>
            <div className="flex justify-center mb-4">
              <div className="relative">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="h-20 w-20 rounded-xl object-cover" style={{ border: '2px solid #e2e8f0' }} />
                ) : (
                  <div className="h-20 w-20 rounded-xl flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${COLOR}, #818cf8)` }}>
                    <Building className="h-10 w-10 text-white" />
                  </div>
                )}
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 h-7 w-7 rounded-lg flex items-center justify-center text-white shadow-md transition-transform hover:scale-110"
                  style={{ background: COLOR }}>
                  <Upload className="h-3.5 w-3.5" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel icon={Building}>Nom du site *</FieldLabel>
                <input type="text" required value={form.name} placeholder="ex : Campus Abidjan Plateau"
                  onChange={e => set('name', e.target.value)} className="input-field" />
              </div>
              <div>
                <FieldLabel icon={IdCard}>Code *</FieldLabel>
                <input type="text" required value={form.code} placeholder="ex : ABJ-PLT"
                  onChange={e => set('code', e.target.value)} className="input-field" />
              </div>
            </div>
          </div>

          {/* Coordonnées */}
          <div>
            <SectionTitle>Coordonnées</SectionTitle>
            <div className="space-y-4">
              <div>
                <FieldLabel icon={MapPinned}>Adresse</FieldLabel>
                <textarea rows={2} value={form.address}
                  onChange={e => set('address', e.target.value)} className="input-field resize-none" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldLabel icon={MapPin}>Ville</FieldLabel>
                  <input type="text" value={form.city} onChange={e => set('city', e.target.value)} className="input-field" />
                </div>
                <div>
                  <FieldLabel icon={Globe}>Pays</FieldLabel>
                  <input type="text" value={form.country} onChange={e => set('country', e.target.value)} className="input-field" />
                </div>
                <div>
                  <FieldLabel icon={Phone}>Téléphone</FieldLabel>
                  <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className="input-field" />
                </div>
                <div>
                  <FieldLabel icon={Mail}>Email</FieldLabel>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="input-field" />
                </div>
              </div>
            </div>
          </div>

          {/* Options */}
          <div>
            <SectionTitle>Options</SectionTitle>
            <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer" style={{ background: COLOR_BG }}>
              <input type="checkbox" checked={form.is_main}
                onChange={e => set('is_main', e.target.checked)}
                className="h-4 w-4 rounded cursor-pointer" style={{ accentColor: COLOR }} />
              <span className="text-sm font-semibold" style={{ color: '#1e293b' }}>Définir comme site principal</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border hover:bg-slate-50 transition-colors"
              style={{ color: '#64748b', borderColor: '#e2e8f0' }}>Annuler</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${COLOR}, #4338ca)`, boxShadow: `0 3px 10px ${COLOR}40` }}>
              {saving ? 'Enregistrement…' : (editing ? 'Mettre à jour' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function ConfirmModal({ message, error, loading, onConfirm, onCancel }) {
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(10px)', zIndex: 9999 }}
      onClick={onCancel}>
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden" style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.22)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ height: 4, background: 'linear-gradient(90deg,#ef4444,#f97316)' }} />
        <div className="px-6 pt-7 pb-5 flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: '#fff1f2', border: '1.5px solid #fecdd3' }}>
            <AlertTriangle className="h-8 w-8" style={{ color: '#ef4444' }} />
          </div>
          <h3 className="text-base font-bold mb-1" style={{ color: '#0f172a' }}>{message}</h3>
          <p className="text-xs mt-3" style={{ color: '#94a3b8' }}>Cette action est irréversible.</p>
          {error && (
            <p className="text-xs mt-3 px-3 py-2 rounded-lg w-full text-left"
              style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>{error}</p>
          )}
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:bg-slate-50"
            style={{ color: '#64748b', borderColor: '#e2e8f0', background: '#f8fafc' }}>Annuler</button>
          <button disabled={loading} onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 4px 14px rgba(239,68,68,0.35)' }}>
            {loading ? 'Suppression…' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function SitesPage() {
  const { refreshSites: refreshGlobalSites } = useSite();
  const [showModal, setShowModal] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const { data: sites, loading: sitesLoading, execute: fetchSites } = useApi(() => sitesService.getSites(), [], true);
  const sitesList = sites?.results || sites || [];

  const handleSaved = () => {
    setShowModal(false);
    setEditingSite(null);
    fetchSites();
    refreshGlobalSites();
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await sitesService.deleteSite(confirmDelete.id);
      setConfirmDelete(null);
      fetchSites();
      refreshGlobalSites();
    } catch (err) {
      setDeleteError(err?.response?.data?.detail || err?.response?.data?.[0] || 'Impossible de supprimer ce site.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <BackToParametres />
      <PageHeader icon={Globe} iconColor={COLOR} iconBg={COLOR_ICON}
        title="Gestion des Sites"
        subtitle="Gérez les sites, campus et antennes de votre établissement"
        action={
          <PrimaryButton icon={Plus} label="Ajouter un site" onClick={() => { setEditingSite(null); setShowModal(true); }} color={COLOR} />
        }
      />

      {sitesLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 rounded-full border-[3px] border-indigo-200 border-t-indigo-600 animate-spin" />
        </div>
      ) : sitesList.length === 0 ? (
        <div className="card flex flex-col items-center py-16">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: COLOR_BG }}>
            <Globe className="h-7 w-7" style={{ color: COLOR }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: '#475569' }}>Aucun site configuré</p>
          <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Cliquez sur "Ajouter un site" pour commencer</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sitesList.map((site) => (
            <div key={site.id} className="card card-interactive p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {site.logo ? (
                    <img src={site.logo} alt={site.name} className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${COLOR}, #818cf8)` }}>
                      <Building className="h-6 w-6 text-white" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#1e293b' }}>{site.name}</p>
                    <p className="text-xs font-semibold" style={{ color: COLOR }}>{site.code}</p>
                  </div>
                </div>
                {site.is_main && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: '#d1fae5', color: '#059669' }}>
                    <Check className="h-3 w-3" /> Principal
                  </span>
                )}
              </div>
              <div className="space-y-1.5 mb-4">
                {site.city && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: '#64748b' }}>
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#94a3b8' }} />
                    {site.city}{site.country ? `, ${site.country}` : ''}
                  </div>
                )}
                {site.phone && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: '#64748b' }}>
                    <Phone className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#94a3b8' }} />
                    {site.phone}
                  </div>
                )}
                {site.email && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: '#64748b' }}>
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#94a3b8' }} />
                    {site.email}
                  </div>
                )}
                {site.address && (
                  <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>{site.address}</p>
                )}
              </div>
              <div className="flex items-center gap-2 pt-3" style={{ borderTop: '1px solid #f1f5f9' }}>
                <button onClick={() => { setEditingSite(site); setShowModal(true); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors"
                  style={{ background: COLOR_BG, color: COLOR }}
                  onMouseEnter={e => e.currentTarget.style.background = COLOR_ICON}
                  onMouseLeave={e => e.currentTarget.style.background = COLOR_BG}>
                  <Edit className="h-3.5 w-3.5" /> Modifier
                </button>
                {!site.is_main && (
                  <IconBtn onClick={() => setConfirmDelete(site)} icon={Trash2} color="#ef4444" hoverBg="#fee2e2" title="Supprimer" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <SiteModal editing={editingSite} onClose={() => { setShowModal(false); setEditingSite(null); }} onSaved={handleSaved} />
      )}

      {confirmDelete && (
        <ConfirmModal
          message={`Supprimer le site "${confirmDelete.name}" ?`}
          error={deleteError}
          loading={deleteLoading}
          onConfirm={handleDelete}
          onCancel={() => { setConfirmDelete(null); setDeleteError(''); }}
        />
      )}
    </div>
  );
}
