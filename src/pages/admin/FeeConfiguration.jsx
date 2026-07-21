import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Layers, Plus, Edit, Trash2, X, AlertTriangle, Settings2, CalendarClock, GripVertical } from 'lucide-react';
import { financeService, academicService, sitesService } from '../../services';
import { useApi } from '../../hooks/useApi';
import { useNotifications } from '../../components/Notifications';
import { useSite } from '../../contexts/SiteContext';
import {
  PageHeader, FilterBar, FilterSelect, PrimaryButton, IconBtn
} from '../../components/ui/PageHeader';
import BackToParametres from '../../components/ui/BackToParametres';

const COLOR = '#0891b2';

const MODALITIES = [
  { value: 'PRESENTIEL', label: 'Présentiel' },
  { value: 'ELEARNING',  label: 'E-learning' },
  { value: 'HYBRIDE',    label: 'Hybride' },
];

const AFFECTATIONS = [
  { value: 'AFFECTE',     label: 'Affecté (État)' },
  { value: 'NON_AFFECTE', label: 'Non affecté (Privé)' },
];

// Legacy: a handful of fee_category='INSCRIPTION' rows may still exist in
// the DB from before the merge, always deactivated (is_active=false). They
// are shown read-only, for history only — never created or edited anymore.
// Going forward every barème is implicitly SCOLARITE; the API ignores/
// rejects any fee_category sent in create/update payloads.
const CATEGORIES = [
  { value: 'INSCRIPTION', label: 'Inscription (historique)' },
  { value: 'SCOLARITE',   label: 'Scolarité' },
];

const emptyForm = {
  site: '',
  program: '',
  level: '',
  academic_year: '',
  modality: '',
  affectation_status: '',
  amount: '',
  label: '',
  is_active: true,
};

function fmt(n) {
  if (n == null || n === '') return '—';
  return Number(n).toLocaleString('fr-FR') + ' FCFA';
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 9999 }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        style={{ background: '#fff', border: '1.5px solid #f0f4f9' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#fef2f2' }}>
            <AlertTriangle size={20} color="#ef4444" />
          </div>
          <p className="text-sm font-medium text-slate-700">{message}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Annuler</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors" style={{ background: '#ef4444' }}>Confirmer</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function FeeModal({ editing, defaultSite, sites, programs, levels, academicYears, onClose, onSaved }) {
  const { notify } = useNotifications();
  const [form, setForm] = useState(editing ? {
    site: editing.site ?? '',
    program: editing.program ?? '',
    level: editing.level ?? '',
    academic_year: editing.academic_year ?? '',
    modality: editing.modality ?? '',
    affectation_status: editing.affectation_status ?? '',
    amount: editing.amount ?? '',
    label: editing.label ?? '',
    is_active: editing.is_active ?? true,
  } : { ...emptyForm, site: defaultSite || '' });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        site: form.site || null,
        program: form.program || null,
        level: form.level || null,
        academic_year: form.academic_year || null,
        modality: form.modality || null,
        affectation_status: form.affectation_status || null,
        amount: parseFloat(form.amount) || 0,
        label: form.label,
        is_active: form.is_active,
      };
      if (editing) {
        const res = await financeService.updateFeeConfiguration(editing.id, payload);
        const updatedCount = res?.data?.invoices_updated ?? res?.invoices_updated ?? 0;
        notify(
          updatedCount > 0
            ? `Barème mis à jour — ${updatedCount} facture(s) recalculée(s)`
            : 'Barème mis à jour',
          'success'
        );
      } else {
        await financeService.createFeeConfiguration(payload);
        notify('Barème créé', 'success');
      }
      onSaved();
    } catch (err) {
      notify(err?.response?.data?.detail || 'Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 9999 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        style={{ background: '#fff', border: '1.5px solid #e2e8f0' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ background: `linear-gradient(135deg, ${COLOR}, #0e7490)` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <Settings2 size={18} color="#fff" />
            </div>
            <h2 className="text-base font-bold text-white">
              {editing ? 'Modifier le barème' : 'Nouveau barème'}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Label optionnel */}
          <div>
            <label className="block text-xs font-bold mb-1.5 text-slate-500">Libellé (optionnel)</label>
            <input className="input-field" placeholder="ex: Licence Informatique – Site A"
              value={form.label} onChange={e => set('label', e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Site */}
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-500">Site</label>
              <select className="input-field" value={form.site} onChange={e => set('site', e.target.value)}>
                <option value="">Tous les sites</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {/* Année académique */}
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-500">Année académique</label>
              <select className="input-field" value={form.academic_year} onChange={e => set('academic_year', e.target.value)}>
                <option value="">Toutes les années</option>
                {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
            </div>
            {/* Niveau */}
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-500">Niveau</label>
              <select className="input-field" value={form.level} onChange={e => set('level', e.target.value)}>
                <option value="">Tous les niveaux</option>
                {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            {/* Filière */}
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-500">Filière / Programme</label>
              <select className="input-field" value={form.program} onChange={e => set('program', e.target.value)}>
                <option value="">Tous les programmes</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {/* Modalité */}
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-500">Modalité</label>
              <select className="input-field" value={form.modality} onChange={e => set('modality', e.target.value)}>
                <option value="">Toutes les modalités</option>
                {MODALITIES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            {/* Affectation */}
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-500">Affectation</label>
              <select className="input-field" value={form.affectation_status} onChange={e => set('affectation_status', e.target.value)}>
                <option value="">Toutes affectations</option>
                {AFFECTATIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
          </div>

          {/* Montant */}
          <div>
            <label className="block text-xs font-bold mb-1.5 text-slate-500">Montant (FCFA) *</label>
            <input type="number" min="0" step="1" className="input-field"
              placeholder="ex: 150000" required
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              onWheel={e => e.target.blur()} />
          </div>

          {/* Actif */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)}
              className="w-4 h-4 rounded" style={{ accentColor: COLOR }} />
            <span className="text-sm text-slate-600 font-medium">Barème actif</span>
          </label>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${COLOR}, #0e7490)`, boxShadow: '0 3px 10px rgba(8,145,178,0.3)' }}>
              {saving ? 'Enregistrement…' : (editing ? 'Mettre à jour' : 'Créer le barème')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

const emptyInstallment = { label: '', due_date: '', amount: '' };

function InstallmentsModal({ feeConfig, onClose }) {
  const { notify } = useNotifications();
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyInstallment);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const feeTotal = Number(feeConfig.amount || 0);
  const installmentsTotal = installments.reduce((sum, it) => sum + Number(it.amount || 0), 0);

  const load = async () => {
    setLoading(true);
    try {
      const res = await financeService.getFeeInstallments(feeConfig.id);
      const list = res?.data?.results || res?.data || res?.results || res || [];
      setInstallments([...list].sort((a, b) => (a.order - b.order) || (a.due_date || '').localeCompare(b.due_date || '')));
    } catch {
      notify('Erreur lors du chargement de l\'échéancier', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [feeConfig.id]);

  const resetForm = () => { setForm(emptyInstallment); setEditingId(null); };

  const startEdit = (it) => {
    setEditingId(it.id);
    setForm({ label: it.label, due_date: it.due_date, amount: it.amount });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.label || !form.due_date || form.amount === '') return;
    setSaving(true);
    try {
      const payload = {
        fee_configuration: feeConfig.id,
        label: form.label,
        due_date: form.due_date,
        amount: parseFloat(form.amount) || 0,
        order: editingId ? undefined : installments.length,
      };
      if (editingId) {
        await financeService.updateFeeInstallment(editingId, payload);
        notify('Échéance mise à jour', 'success');
        resetForm();
        load();
      } else {
        await financeService.createFeeInstallment(payload);
        notify('Échéance ajoutée', 'success');
        resetForm();
        onClose();
      }
    } catch {
      notify('Erreur lors de la sauvegarde de l\'échéance', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await financeService.deleteFeeInstallment(id);
      notify('Échéance supprimée', 'success');
      if (editingId === id) resetForm();
      load();
    } catch {
      notify('Erreur lors de la suppression', 'error');
    }
  };

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 9999 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{ background: '#fff', border: '1.5px solid #e2e8f0' }}>
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${COLOR}, #0e7490)` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <CalendarClock size={18} color="#fff" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Échéancier de scolarité</h2>
              <p className="text-xs text-white/80 mt-0.5">
                {feeConfig.label || [feeConfig.site_name, feeConfig.level_name, feeConfig.program_name].filter(Boolean).join(' · ') || 'Barème global'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Running total vs barème total */}
          <div className="rounded-xl p-3 flex items-center justify-between"
            style={{ background: installmentsTotal === feeTotal ? '#f0fdf4' : '#fffbeb', border: `1px solid ${installmentsTotal === feeTotal ? '#bbf7d0' : '#fde68a'}` }}>
            <span className="text-xs font-bold text-slate-500">Total échéancier</span>
            <span className="text-sm font-bold" style={{ color: installmentsTotal === feeTotal ? '#16a34a' : '#b45309' }}>
              {fmt(installmentsTotal)} / {fmt(feeTotal)}
            </span>
          </div>

          {/* List */}
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-6">Chargement…</p>
          ) : installments.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Aucune échéance configurée pour ce barème.</p>
          ) : (
            <div className="space-y-2">
              {installments.map((it) => (
                <div key={it.id} className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ border: '1px solid #e2e8f0' }}>
                  <GripVertical size={14} className="text-slate-300 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-700 truncate">{it.label}</div>
                    <div className="text-xs text-slate-400">Échéance : {it.due_date}</div>
                  </div>
                  <div className="text-sm font-bold flex-shrink-0" style={{ color: COLOR }}>{fmt(it.amount)}</div>
                  <div className="flex gap-1 flex-shrink-0">
                    <IconBtn icon={Edit} onClick={() => startEdit(it)} color={COLOR} title="Modifier" />
                    <IconBtn icon={Trash2} onClick={() => handleDelete(it.id)} color="#ef4444" title="Supprimer" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add / edit form */}
          <form onSubmit={handleSubmit} className="rounded-xl p-3 space-y-2" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <p className="text-xs font-bold text-slate-500">{editingId ? 'Modifier l\'échéance' : 'Ajouter une échéance'}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-bold mb-1 text-slate-400">Libellé</label>
                <input className="input-field" placeholder="ex: Octobre"
                  value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[10px] font-bold mb-1 text-slate-400">Date d'échéance</label>
                <input type="date" className="input-field"
                  value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[10px] font-bold mb-1 text-slate-400">Montant (FCFA)</label>
                <input type="number" min="0" step="1" className="input-field" placeholder="ex: 350000"
                  value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  onWheel={e => e.target.blur()} />
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              L'étudiant est considéré à jour s'il a soldé cette tranche au plus tard 5 jours après la date d'échéance.
            </p>
            <div className="flex gap-2">
              {editingId && (
                <button type="button" onClick={resetForm}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
                  Annuler
                </button>
              )}
              <button type="submit" disabled={saving}
                className="flex-1 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${COLOR}, #0e7490)` }}>
                {saving ? 'Enregistrement…' : (editingId ? 'Mettre à jour' : 'Ajouter l\'échéance')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function FeeConfigurationPage() {
  const { notify } = useNotifications();
  const { selectedSite } = useSite();
  const [filterSite, setFilterSite] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [filterModality, setFilterModality] = useState('');
  const [filterAffectation, setFilterAffectation] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [installmentsFor, setInstallmentsFor] = useState(null);

  const { data: feesData, loading, error: feesError, execute: reload } = useApi(
    () => financeService.getFeeConfigurations({
      ...(filterSite ? { site: filterSite } : {}),
      ...(filterYear ? { academic_year: filterYear } : {}),
      ...(filterLevel ? { level: filterLevel } : {}),
      ...(filterProgram ? { program: filterProgram } : {}),
      ...(filterModality ? { modality: filterModality } : {}),
      ...(filterAffectation ? { affectation_status: filterAffectation } : {}),
      ...(filterCategory ? { fee_category: filterCategory } : {}),
      page_size: 100,
    }),
    [filterSite, filterYear, filterLevel, filterProgram, filterModality, filterAffectation, filterCategory],
    true
  );

  const { data: sitesData }   = useApi(() => sitesService.getSites({ is_active: true, page_size: 100 }), [], true);
  const { data: levelsData }  = useApi(() => academicService.getLevels({ is_active: true, page_size: 100 }), [], true);
  const { data: programsData }= useApi(() => academicService.getPrograms({ is_active: true, page_size: 100 }), [], true);
  const { data: yearsData }   = useApi(() => academicService.getAcademicYears({ page_size: 50 }), [], true);

  // Deduplicate by name (same name can appear with different IDs per program/site)
  const dedupByName = (arr) => {
    const seen = new Set();
    return (arr || []).filter(x => { if (seen.has(x.name)) return false; seen.add(x.name); return true; });
  };

  const fees     = feesData?.results    || feesData    || [];
  const sites    = dedupByName(sitesData?.results    || sitesData);
  const levels   = dedupByName(levelsData?.results   || levelsData);
  const programs = dedupByName(programsData?.results || programsData);
  const years    = dedupByName(yearsData?.results    || yearsData);

  const handleDelete = async () => {
    try {
      await financeService.deleteFeeConfiguration(confirmDelete.id);
      notify('Barème supprimé', 'success');
      reload();
    } catch {
      notify('Erreur lors de la suppression', 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <BackToParametres />
      <PageHeader
        icon={Layers}
        iconColor={COLOR}
        iconBg="#ecfeff"
        title="Barème des frais"
        subtitle="Paramétrez les frais de scolarité par site, niveau et filière"
        action={
          <PrimaryButton icon={Plus} label="Nouveau barème" onClick={() => { setEditItem(null); setShowModal(true); }} color={COLOR} />
        }
      />

      <FilterBar>
        <FilterSelect value={filterCategory} onChange={e => setFilterCategory(e.target.value)} title="Les barèmes d'inscription sont historiques et toujours inactifs">
          <option value="">Toutes catégories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </FilterSelect>
        <FilterSelect value={filterSite} onChange={e => setFilterSite(e.target.value)}>
          <option value="">Tous les sites</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </FilterSelect>
        <FilterSelect value={filterYear} onChange={e => setFilterYear(e.target.value)}>
          <option value="">Toutes les années</option>
          {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
        </FilterSelect>
        <FilterSelect value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
          <option value="">Tous les niveaux</option>
          {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </FilterSelect>
        <FilterSelect value={filterProgram} onChange={e => setFilterProgram(e.target.value)}>
          <option value="">Tous les programmes</option>
          {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </FilterSelect>
        <FilterSelect value={filterModality} onChange={e => setFilterModality(e.target.value)}>
          <option value="">Toutes les modalités</option>
          {MODALITIES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </FilterSelect>
        <FilterSelect value={filterAffectation} onChange={e => setFilterAffectation(e.target.value)}>
          <option value="">Toutes affectations</option>
          {AFFECTATIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </FilterSelect>
      </FilterBar>

      {/* Info banner */}
      <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: '#ecfeff', border: '1px solid #a5f3fc' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#0891b2' }}>
          <Settings2 size={16} color="#fff" />
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: '#0e7490' }}>Priorité des barèmes</p>
          <p className="text-xs mt-0.5" style={{ color: '#0e7490', opacity: 0.8 }}>
            Lors de l'inscription d'un étudiant, le système applique le barème le plus précis :
            <strong> Site + Niveau + Année</strong> &gt; Site + Niveau &gt; Site &gt; Général (sans restriction).
            Un seul barème par niveau : il n'y a plus de distinction inscription / scolarité — le seuil d'inscription
            (montant minimum à payer pour être considéré « inscrit ») se configure dans Paramètres → Réglages généraux.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden shadow-sm" style={{ border: '1px solid #e2e8f0' }}>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
              {['Libellé / Portée', 'Catégorie', 'Site', 'Niveau', 'Filière', 'Modalité', 'Affectation', 'Année', 'Montant', 'Statut', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={11} className="py-12 text-center text-slate-400 text-sm">Chargement…</td></tr>
            )}
            {!loading && feesError && (
              <tr>
                <td colSpan={11} className="py-8 text-center">
                  <p className="text-sm font-medium text-red-500">Erreur : {feesError}</p>
                  <button onClick={reload} className="mt-2 text-xs text-cyan-600 underline">Réessayer</button>
                </td>
              </tr>
            )}
            {!loading && !feesError && fees.length === 0 && (
              <tr>
                <td colSpan={11} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#ecfeff' }}>
                      <Layers size={24} color={COLOR} />
                    </div>
                    <p className="text-sm font-medium text-slate-500">Aucun barème configuré</p>
                    <p className="text-xs text-slate-400">Cliquez sur "Nouveau barème" pour commencer</p>
                  </div>
                </td>
              </tr>
            )}
            {fees.map((fee, i) => (
              <tr key={fee.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors"
                style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-800 truncate w-[220px]" title={fee.label || ''}>{fee.label || '—'}</div>
                  <div className="text-xs text-slate-400 mt-0.5 truncate w-[220px]"
                       title={[fee.site_name, fee.level_name, fee.program_name, fee.modality_name, fee.affectation_status_name, fee.academic_year_name].filter(Boolean).join(' · ')}>
                    {[fee.site_name, fee.level_name, fee.program_name, fee.modality_name, fee.affectation_status_name, fee.academic_year_name].filter(Boolean).join(' · ') || 'Configuration globale'}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap"
                    style={fee.fee_category === 'SCOLARITE'
                      ? { background: '#dbeafe', color: '#1d4ed8' }
                      : { background: '#f1f5f9', color: '#94a3b8' }}
                    title={fee.fee_category === 'SCOLARITE' ? undefined : 'Ligne historique, désactivée — la catégorie Inscription n\'existe plus'}>
                    {fee.fee_category === 'SCOLARITE' ? 'Scolarité' : 'Inscription (historique)'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600"><div className="truncate w-[140px]" title={fee.site_name || ''}>{fee.site_name || <span className="text-slate-300 italic">Tous</span>}</div></td>
                <td className="px-4 py-3 text-slate-600"><div className="truncate w-[140px]" title={fee.level_name || ''}>{fee.level_name || <span className="text-slate-300 italic">Tous</span>}</div></td>
                <td className="px-4 py-3 text-slate-600"><div className="truncate w-[140px]" title={fee.program_name || ''}>{fee.program_name || <span className="text-slate-300 italic">Tous</span>}</div></td>
                <td className="px-4 py-3 text-slate-600"><div className="truncate w-[110px]" title={fee.modality_name || ''}>{fee.modality_name || <span className="text-slate-300 italic">Toutes</span>}</div></td>
                <td className="px-4 py-3 text-slate-600"><div className="truncate w-[110px]" title={fee.affectation_status_name || ''}>{fee.affectation_status_name || <span className="text-slate-300 italic">Toutes</span>}</div></td>
                <td className="px-4 py-3 text-slate-600"><div className="truncate w-[110px]" title={fee.academic_year_name || ''}>{fee.academic_year_name || <span className="text-slate-300 italic">Toutes</span>}</div></td>
                <td className="px-4 py-3 font-bold" style={{ color: fee.fee_category === 'SCOLARITE' ? '#059669' : '#0891b2' }}>{fmt(fee.amount)}</td>
                <td className="px-4 py-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                    style={fee.is_active
                      ? { background: '#f0fdf4', color: '#16a34a' }
                      : { background: '#f8fafc', color: '#94a3b8' }}>
                    {fee.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex gap-1.5">
                    {fee.fee_category === 'SCOLARITE' && (
                      <IconBtn icon={CalendarClock} onClick={() => setInstallmentsFor(fee)} color="#7c3aed" title="Échéancier" />
                    )}
                    <IconBtn icon={Edit} onClick={() => { setEditItem(fee); setShowModal(true); }} color={COLOR} title="Modifier" />
                    <IconBtn icon={Trash2} onClick={() => setConfirmDelete(fee)} color="#ef4444" title="Supprimer" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {showModal && (
        <FeeModal
          editing={editItem}
          defaultSite={!editItem && selectedSite !== 'all' ? selectedSite : undefined}
          sites={sites}
          programs={programs}
          levels={levels}
          academicYears={years}
          onClose={() => { setShowModal(false); setEditItem(null); }}
          onSaved={() => {
            setShowModal(false); setEditItem(null);
            setFilterSite(''); setFilterYear(''); setFilterLevel(''); setFilterProgram(''); setFilterModality(''); setFilterAffectation(''); setFilterCategory('');
            // Resetting the filters above only refetches when a filter's value
            // actually changes — if they were already all unset (as here),
            // useApi's dependency array doesn't change and the table keeps
            // showing stale data. Force the refetch explicitly.
            reload();
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          message={`Supprimer le barème "${confirmDelete.label || [confirmDelete.site_name, confirmDelete.level_name, confirmDelete.program_name].filter(Boolean).join(' / ') || 'global'}" ?`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {installmentsFor && (
        <InstallmentsModal
          feeConfig={installmentsFor}
          onClose={() => setInstallmentsFor(null)}
        />
      )}
    </div>
  );
}
