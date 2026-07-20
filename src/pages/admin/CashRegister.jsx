import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Wallet, Plus, ArrowDownCircle, ArrowUpCircle, Lock, Unlock,
  DollarSign, TrendingUp, TrendingDown, X, AlertTriangle, Clock,
  HelpCircle, ChevronDown, ChevronRight, ArrowRight
} from 'lucide-react';
import { financeService } from '../../services';
import { useApi } from '../../hooks/useApi';
import { useNotifications } from '../../components/Notifications';
import { useSite } from '../../contexts/SiteContext';
import {
  PageHeader, FilterBar, SearchInput, FilterSelect, PrimaryButton,
  IconBtn, Pagination, ExportMenu
} from '../../components/ui/PageHeader';
import { exportToExcel, exportToPDF, fmtPDF } from '../../utils/export';

const COLOR = '#d97706';
const ITEMS_PER_PAGE = 15;

function ConfirmModal({ message, onConfirm, onCancel }) {
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 9999 }}>
      <div className="rounded-2xl p-6 w-full max-w-sm shadow-2xl" style={{ background: '#fff', border: '1.5px solid #f0f4f9' }}>
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

const TX_CATEGORIES = {
  IN: [
    'Scolarité',
    "Frais d'inscription",
    "Frais d'examen",
    'Cotisation',
    'Don / Subvention',
    'Remboursement reçu',
    'Autres recettes',
  ],
  OUT: [
    'Fournitures de bureau',
    'Transport',
    'Entretien / Nettoyage',
    'Restauration',
    'Matériel pédagogique',
    'Petite caisse',
    'Salaires / Indemnités',
    'Autres dépenses',
  ],
};

function generateRef() {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const n = String(Math.floor(Math.random() * 9000) + 1000);
  return `TXN-${d}-${n}`;
}

function TransactionModal({ onClose, onSaved, notify, openSession, cashRegId }) {
  const [form, setForm] = useState({ transaction_type: 'IN', amount: '', description: '', reference: '' });
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => { set('reference', generateRef()); }, []);

  const handleTypeChange = (type) => {
    set('transaction_type', type);
    setCategory('');
    set('description', '');
  };

  const handleCategoryChange = (val) => {
    setCategory(val);
    if (val) set('description', val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || isNaN(form.amount) || parseFloat(form.amount) <= 0) return notify('Montant invalide.', 'error');
    if (!form.description.trim()) return notify('La description est requise.', 'error');
    if (!cashRegId) return notify('Aucune caisse sélectionnée.', 'error');
    setSaving(true);
    try {
      // Auto-open session if none is active (balance 0, transparent for the user)
      let session = openSession;
      if (!session) {
        session = await financeService.openCashSession({ cash_register_id: cashRegId, opening_balance: 0 });
      }
      await financeService.createCashTransaction({ ...form, session: session.id });
      notify('Transaction enregistrée.', 'success');
      onSaved();
    } catch (err) {
      notify(err?.message || 'Une erreur est survenue.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        style={{ background: '#fff', border: '1.5px solid #f0f4f9' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #f0f4f9' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#fffbeb' }}>
              <DollarSign size={18} color={COLOR} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Nouvelle transaction</h2>
              {openSession && (
                <p className="text-[11px] text-slate-400 mt-0.5">Session du {new Date(openSession.opened_at).toLocaleDateString('fr-FR')}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors">
            <X size={16} color="#94a3b8" />
          </button>
        </div>
        {!openSession && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs text-amber-700" style={{ background: '#fef3c7', border: '1px solid #fde68a' }}>
            <AlertTriangle size={13} color="#d97706" className="flex-shrink-0" />
            <span>Aucune session ouverte — une session sera créée automatiquement.</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Type</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[{ v: 'IN', label: 'Entrée', color: '#16a34a', bg: '#f0fdf4' }, { v: 'OUT', label: 'Sortie', color: '#ef4444', bg: '#fef2f2' }].map(t => (
                <button key={t.v} type="button"
                  onClick={() => handleTypeChange(t.v)}
                  className="py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                  style={{
                    background: form.transaction_type === t.v ? t.bg : '#f8fafc',
                    color: form.transaction_type === t.v ? t.color : '#94a3b8',
                    border: `1.5px solid ${form.transaction_type === t.v ? t.color + '40' : '#f0f4f9'}`,
                  }}>
                  {t.v === 'IN' ? <ArrowDownCircle size={15} /> : <ArrowUpCircle size={15} />}
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Catégorie</label>
            <div className="relative">
              <select
                className="input-field appearance-none pr-8"
                value={category}
                onChange={e => handleCategoryChange(e.target.value)}
              >
                <option value="">-- Choisir une catégorie --</option>
                {TX_CATEGORIES[form.transaction_type].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown size={14} color="#94a3b8" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Montant (FCFA)</label>
            <input className="input-field" type="number" min="0" placeholder="0" value={form.amount} onChange={e => set('amount', e.target.value)} />
          </div>
          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Description</label>
            <input className="input-field" placeholder="Ex: Règlement facture n°..." value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          {/* Reference (auto-generated) */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
              Référence
              <span className="ml-2 text-[10px] font-normal text-slate-400 normal-case tracking-normal">générée automatiquement</span>
            </label>
            <input className="input-field font-mono text-xs" value={form.reference} onChange={e => set('reference', e.target.value)} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors" style={{ border: '1.5px solid #f0f4f9' }}>
              Annuler
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
              style={{ background: saving ? '#fcd34d' : COLOR }}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function OpenSessionModal({ onClose, onSaved, notify, cashRegId }) {
  const [form, setForm] = useState({ opening_balance: '0', notes: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cashRegId) return notify('Aucune caisse disponible pour ce site.', 'error');
    const bal = parseFloat(form.opening_balance);
    if (isNaN(bal) || bal < 0) return notify('Solde d\'ouverture invalide.', 'error');
    setSaving(true);
    try {
      await financeService.openCashSession({ cash_register_id: cashRegId, opening_balance: bal, notes: form.notes });
      notify('Session ouverte avec succès.', 'success');
      onSaved();
    } catch (err) {
      notify(err?.response?.data?.detail || 'Une erreur est survenue.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 9999 }}>
      <div className="rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" style={{ background: '#fff', border: '1.5px solid #f0f4f9' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #f0f4f9' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#fffbeb' }}>
              <Unlock size={18} color={COLOR} />
            </div>
            <h2 className="text-base font-bold text-slate-800">Ouvrir une session</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors">
            <X size={16} color="#94a3b8" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Info banner */}
          <div className="rounded-xl p-3 text-xs text-amber-700 leading-relaxed"
               style={{ background: '#fef3c7', border: '1px solid #fde68a' }}>
            <p className="font-bold mb-1">À quoi sert le solde d'ouverture ?</p>
            <p>C'est l'argent physique <strong>déjà dans le tiroir</strong> avant que les recettes du jour n'arrivent (monnaie de rendu, fonds fixe). Si ta caisse démarre vide, laisse <strong>0</strong>.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
              Fond de caisse initial (FCFA)
              <span className="ml-2 text-[10px] font-normal normal-case text-slate-400">0 si pas de fonds fixe</span>
            </label>
            <input className="input-field" type="number" min="0" placeholder="0" value={form.opening_balance} onChange={e => set('opening_balance', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Notes (optionnel)</label>
            <textarea className="input-field resize-none" rows={2} placeholder="Ex: Ouverture du 24/06/2026..." value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors" style={{ border: '1.5px solid #f0f4f9' }}>
              Annuler
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
              style={{ background: saving ? '#fcd34d' : COLOR }}>
              {saving ? 'Ouverture...' : 'Ouvrir la session'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function pct(curr, prev) {
  if (!prev) return null;
  return ((curr - prev) / prev * 100).toFixed(1);
}

function YearCompare({ label, curr, prev, currYear, prevYear, colorPos = '#16a34a', colorNeg = '#ef4444' }) {
  const diff = curr - prev;
  const p = pct(curr, prev);
  const up = diff >= 0;
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="flex items-end gap-2 flex-wrap">
        <span className="text-base font-black text-slate-800">{curr.toLocaleString('fr-FR')} FCFA</span>
        {p !== null && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: up ? colorPos : colorNeg, background: up ? '#f0fdf4' : '#fef2f2' }}>
            {up ? '▲' : '▼'} {Math.abs(p)}%
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-400">{prevYear}: {prev.toLocaleString('fr-FR')} FCFA</p>
    </div>
  );
}

function NewRegisterModal({ onClose, onSaved, notify, siteId }) {
  const PRESETS = [
    { name: 'Caisse Espèces', code: 'ESPECES' },
    { name: 'Caisse Mobile Money', code: 'MOBILE_MONEY' },
    { name: 'Caisse Chèques', code: 'CHEQUES' },
  ];
  const [form, setForm] = useState({ name: '', code: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const applyPreset = (preset) => setForm({ name: preset.name, code: preset.code });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return notify('Le nom de la caisse est requis.', 'error');
    if (!form.code.trim()) return notify('Le code est requis.', 'error');
    if (!siteId) return notify('Sélectionnez un site avant de créer une caisse.', 'error');
    setSaving(true);
    try {
      await financeService.createCashRegister({ name: form.name.trim(), code: form.code.trim().toUpperCase(), site: siteId });
      notify(`Caisse "${form.name}" créée avec succès.`, 'success');
      onSaved();
    } catch (err) {
      notify(err?.response?.data?.detail || err?.response?.data?.code?.[0] || 'Une erreur est survenue.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 9999 }}>
      <div className="rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" style={{ background: '#fff', border: '1.5px solid #f0f4f9' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #f0f4f9' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#fffbeb' }}>
              <Wallet size={18} color={COLOR} />
            </div>
            <h2 className="text-base font-bold text-slate-800">Nouvelle caisse</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors">
            <X size={16} color="#94a3b8" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Modèles rapides</label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button key={p.code} type="button" onClick={() => applyPreset(p)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={{ background: form.code === p.code ? '#fffbeb' : '#f8fafc', color: form.code === p.code ? COLOR : '#64748b', border: `1.5px solid ${form.code === p.code ? '#fde68a' : '#f0f4f9'}` }}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Nom de la caisse *</label>
            <input className="input-field" placeholder="Ex: Caisse Mobile Money" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Code (unique par site) *</label>
            <input className="input-field font-mono" placeholder="Ex: MOBILE_MONEY" value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors" style={{ border: '1.5px solid #f0f4f9' }}>
              Annuler
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
              style={{ background: saving ? '#fcd34d' : COLOR }}>
              {saving ? 'Création...' : 'Créer la caisse'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default function CashRegister() {
  const { selectedSite } = useSite();
  const { notify } = useNotifications();
  const [activeTab, setActiveTab] = useState('transactions');
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [transPage, setTransPage] = useState(1);
  const [sessionPage, setSessionPage] = useState(1);
  const [showTransModal, setShowTransModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showNewRegisterModal, setShowNewRegisterModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterMonth, setFilterMonth] = useState('');
  const [selectedRegisterId, setSelectedRegisterId] = useState(null);

  const siteFilter = selectedSite !== 'all' ? { site: selectedSite } : {};
  const registerFilter = selectedRegisterId ? { cash_register: selectedRegisterId } : siteFilter;
  const currentYear = new Date().getFullYear();
  const prevYear = currentYear - 1;

  const transParams = {
    page: transPage,
    ...registerFilter,
    ...(filterType !== 'all' ? { transaction_type: filterType } : {}),
    ...(filterMonth ? { month: filterMonth } : {}),
  };

  const { data: cashData, loading: loadingCash, execute: reloadCash } = useApi(
    () => financeService.getCashRegisters({ ...siteFilter, page_size: 50 }),
    [selectedSite],
    true
  );

  const cashRegisters = cashData?.results || (Array.isArray(cashData) ? cashData : cashData ? [cashData] : []);

  // Auto-select the first register when list loads or site changes
  useEffect(() => {
    if (cashRegisters.length > 0 && !selectedRegisterId) {
      setSelectedRegisterId(cashRegisters[0].id);
    }
    if (cashRegisters.length > 0 && selectedRegisterId && !cashRegisters.find(r => r.id === selectedRegisterId)) {
      setSelectedRegisterId(cashRegisters[0].id);
    }
  }, [cashRegisters.length, selectedSite]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: transData, loading: loadingTrans, error: transError, execute: reloadTrans } = useApi(
    () => financeService.getCashTransactions(transParams),
    [transPage, selectedRegisterId, selectedSite, filterType, filterMonth],
    true
  );

  const { data: sessionData, loading: loadingSessions, execute: reloadSessions } = useApi(
    () => financeService.getCashSessions({ page: sessionPage, ...registerFilter }),
    [sessionPage, selectedRegisterId, selectedSite],
    true
  );

  // Dedicated query for open session — avoids pagination miss
  const { data: openSessionData, execute: reloadOpenSession } = useApi(
    () => financeService.getCashSessions({ status: 'OPEN', is_active: true, page_size: 5, ...registerFilter }),
    [selectedRegisterId, selectedSite],
    true
  );

  const { data: cyData } = useApi(
    () => financeService.getCashTransactions({ year: currentYear, page_size: 500, ...registerFilter }),
    [selectedRegisterId, selectedSite],
    true
  );
  const { data: pyData } = useApi(
    () => financeService.getCashTransactions({ year: prevYear, page_size: 500, ...registerFilter }),
    [selectedRegisterId, selectedSite],
    true
  );

  const cashInfo = cashRegisters.find(r => r.id === selectedRegisterId) || cashRegisters[0] || {};
  const transactions = transData?.results || transData || [];
  const sessions = sessionData?.results || sessionData || [];
  const transTotalPages = Math.ceil((transData?.count || transactions.length) / ITEMS_PER_PAGE);
  const sessionTotalPages = Math.ceil((sessionData?.count || sessions.length) / ITEMS_PER_PAGE);

  const today = new Date().toISOString().slice(0, 10);
  const todayTrans = transactions.filter(t => t.created_at?.startsWith(today));
  const todayIn  = todayTrans.filter(t => t.transaction_type === 'IN').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const todayOut = todayTrans.filter(t => t.transaction_type === 'OUT').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  // Use dedicated open-session query (reliable regardless of sessions pagination)
  const openSession = openSessionData?.results?.[0] || openSessionData?.[0] || null;
  const currentBalance = parseFloat(cashInfo.balance ?? cashInfo.current_balance ?? 0);

  const cyTx = cyData?.results || cyData || [];
  const pyTx = pyData?.results || pyData || [];
  const cyIn  = cyTx.filter(t => t.transaction_type === 'IN').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const cyOut = cyTx.filter(t => t.transaction_type === 'OUT').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const pyIn  = pyTx.filter(t => t.transaction_type === 'IN').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const pyOut = pyTx.filter(t => t.transaction_type === 'OUT').reduce((s, t) => s + parseFloat(t.amount || 0), 0);

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(currentYear, i, 1);
    return {
      value: `${currentYear}-${String(i + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    };
  });

  const handleExportTransExcel = () => {
    const rows = transactions.map(tx => ({
      'Date': tx.created_at ? new Date(tx.created_at).toLocaleString('fr-FR') : '',
      'Type': tx.transaction_type === 'IN' ? 'Entrée' : 'Sortie',
      'Montant (FCFA)': parseFloat(tx.amount || 0),
      'Description': tx.description || '',
      'Référence': tx.reference || '',
    }));
    exportToExcel(rows, ['Date', 'Type', 'Montant (FCFA)', 'Description', 'Référence'],
      `caisse-transactions-${today}`, 'Transactions');
  };

  const handleExportTransPDF = () => {
    const cols = ['Date / Heure', 'Type', 'Montant (FCFA)', 'Description', 'Reference'];
    const rows = transactions.map(tx => [
      tx.created_at ? new Date(tx.created_at).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '-',
      tx.transaction_type === 'IN' ? 'Entree' : 'Sortie',
      (tx.transaction_type === 'IN' ? '+' : '-') + fmtPDF(tx.amount) + ' FCFA',
      tx.description || '-',
      tx.reference || '-',
    ]);
    exportToPDF('Transactions de caisse', cols, rows, `caisse-transactions-${today}`, {
      'Export du': new Date().toLocaleDateString('fr-FR'),
      'Transactions': transactions.length,
      'Entrees du jour': fmtPDF(todayIn) + ' FCFA',
      'Sorties du jour': fmtPDF(todayOut) + ' FCFA',
    });
  };

  const handleExportSessionsExcel = () => {
    const rows = sessions.map(s => ({
      'Ouverture': s.opened_at ? new Date(s.opened_at).toLocaleString('fr-FR') : '',
      'Fermeture': s.closed_at ? new Date(s.closed_at).toLocaleString('fr-FR') : '',
      'Solde ouverture (FCFA)': parseFloat(s.opening_balance || 0),
      'Solde fermeture (FCFA)': s.closing_balance != null ? parseFloat(s.closing_balance) : '',
      'Statut': s.status === 'OPEN' ? 'Ouverte' : 'Fermée',
    }));
    exportToExcel(rows, ['Ouverture', 'Fermeture', 'Solde ouverture (FCFA)', 'Solde fermeture (FCFA)', 'Statut'],
      `caisse-sessions-${today}`, 'Sessions');
  };

  const handleExportSessionsPDF = () => {
    const cols = ['Ouverture', 'Fermeture', 'Solde ouverture', 'Solde fermeture', 'Statut'];
    const rows = sessions.map(s => [
      s.opened_at ? new Date(s.opened_at).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '-',
      s.closed_at ? new Date(s.closed_at).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '-',
      fmtPDF(s.opening_balance) + ' FCFA',
      s.closing_balance != null ? fmtPDF(s.closing_balance) + ' FCFA' : '-',
      s.status === 'OPEN' ? 'Ouverte' : 'Fermee',
    ]);
    exportToPDF('Sessions de caisse', cols, rows, `caisse-sessions-${today}`, {
      'Export du': new Date().toLocaleDateString('fr-FR'),
      'Sessions': sessions.length,
      'Solde actuel': fmtPDF(currentBalance) + ' FCFA',
    });
  };

  const handleCloseSession = (session) => {
    setConfirmModal({
      message: `Fermer la session ouverte le ${new Date(session.opened_at).toLocaleString('fr-FR')} ?`,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await financeService.closeCashSession(session.id, {});
          notify('Session fermée.', 'success');
          reloadSessions();
          reloadOpenSession();
          reloadCash();
        } catch {
          notify('Erreur lors de la fermeture.', 'error');
        }
      },
    });
  };

  const kpis = [
    {
      label: 'Solde caisse', value: currentBalance.toLocaleString('fr-FR') + ' FCFA',
      icon: <Wallet size={20} color={COLOR} />, bg: '#fffbeb',
    },
    {
      label: 'Entrées du jour', value: todayIn.toLocaleString('fr-FR') + ' FCFA',
      icon: <TrendingUp size={20} color="#16a34a" />, bg: '#f0fdf4',
    },
    {
      label: 'Sorties du jour', value: todayOut.toLocaleString('fr-FR') + ' FCFA',
      icon: <TrendingDown size={20} color="#ef4444" />, bg: '#fef2f2',
    },
  ];

  const tabs = [
    { key: 'transactions', label: 'Transactions' },
    { key: 'sessions',     label: 'Sessions de caisse' },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={cashInfo?.name || 'Caisse'}
        subtitle="Gestion des entrées et sorties de caisse"
        icon={Wallet}
        iconColor={COLOR}
        iconBg="#fffbeb"
        action={<PrimaryButton icon={Plus} label="Nouvelle transaction" color={COLOR} onClick={() => setShowTransModal(true)} />}
      />

      {/* ── Cash register selector ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-xl flex-wrap" style={{ background: '#f1f5f9' }}>
          {cashRegisters.map(reg => (
            <button
              key={reg.id}
              onClick={() => { setSelectedRegisterId(reg.id); setTransPage(1); setSessionPage(1); }}
              className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
              style={{
                background: selectedRegisterId === reg.id ? '#fff' : 'transparent',
                color: selectedRegisterId === reg.id ? COLOR : '#94a3b8',
                boxShadow: selectedRegisterId === reg.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}>
              {reg.name}
            </button>
          ))}
          {cashRegisters.length === 0 && !loadingCash && (
            <span className="px-4 py-2 text-sm text-slate-400">Aucune caisse configurée</span>
          )}
        </div>
        <button
          onClick={() => setShowNewRegisterModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
          style={{ color: COLOR, background: '#fffbeb', border: `1.5px solid #fde68a` }}>
          <Plus size={13} />
          Nouvelle caisse
        </button>
      </div>

      {/* ── Workflow Guide ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ borderColor: '#fed7aa', background: showWorkflow ? '#fffbeb' : 'transparent' }}>
        <button
          onClick={() => setShowWorkflow(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-orange-50/60"
          style={{ background: showWorkflow ? '#fef3c7' : '#fffdf5' }}>
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: '#fde68a' }}>
              <HelpCircle size={14} style={{ color: COLOR }} />
            </div>
            <span className="text-sm font-semibold" style={{ color: COLOR }}>
              Comment fonctionne la caisse ?
            </span>
            <span className="text-xs text-gray-400 font-normal hidden sm:inline">Sessions, transactions et clôture journalière</span>
          </div>
          <ChevronDown size={15} className="text-gray-400 transition-transform"
            style={{ transform: showWorkflow ? 'rotate(180deg)' : 'none' }} />
        </button>

        {showWorkflow && (
          <div className="p-5 flex flex-col gap-5 border-t" style={{ borderColor: '#fed7aa' }}>
            {/* Flux principal */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Cycle journalier de caisse</p>
              <div className="flex items-start gap-2 flex-wrap">
                {[
                  { icon: Unlock, color: '#16a34a', bg: '#dcfce7',
                    title: '1. Ouvrir la session',
                    desc: 'En début de journée, ouvrir une session avec le solde de départ (fonds de caisse).' },
                  { icon: ArrowDownCircle, color: '#2563eb', bg: '#dbeafe',
                    title: '2. Enregistrer',
                    desc: 'Saisir chaque entrée (scolarité encaissée) et chaque sortie (dépense, remboursement).' },
                  { icon: Lock, color: COLOR, bg: '#fef3c7',
                    title: '3. Clôturer',
                    desc: 'En fin de journée, compter la caisse physique et renseigner le solde de fermeture.' },
                  { icon: TrendingUp, color: '#7c3aed', bg: '#ede9fe',
                    title: '4. Consulter',
                    desc: 'L\'historique des sessions et le rapport journalier sont accessibles dans Finances → Trésorerie.' },
                ].map((s, i, arr) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="rounded-xl border p-3.5 flex flex-col gap-2" style={{ minWidth: 165, maxWidth: 195, borderColor: s.color + '30', background: s.bg + '80' }}>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: s.color + '20' }}>
                          <s.icon size={13} style={{ color: s.color }} />
                        </div>
                        <span className="text-xs font-bold" style={{ color: s.color }}>{s.title}</span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
                    </div>
                    {i < arr.length - 1 && <ArrowRight size={16} className="text-gray-300 mt-5 flex-shrink-0" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Détail par onglet */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  tab: 'Transactions', color: '#2563eb', bg: '#dbeafe',
                  items: [
                    'Type IN (Entrée) : encaissement scolarité, frais divers, dépôts',
                    'Type OUT (Sortie) : petites dépenses, avances, remboursements',
                    'Chaque transaction est liée à la session ouverte du jour',
                    'Les paiements validés depuis le module Finances créent aussi une entrée IN',
                  ],
                },
                {
                  tab: 'Sessions de caisse', color: COLOR, bg: '#fef3c7',
                  items: [
                    'Une session = une journée d\'opération sur une caisse physique',
                    'Solde d\'ouverture : fonds de départ (report de la veille ou fond de caisse fixe)',
                    'Solde de fermeture : montant compté physiquement en fin de journée',
                    'L\'écart (différence) entre attendu et compté est enregistré pour audit',
                  ],
                },
                {
                  tab: 'Rapport Trésorerie', color: '#7c3aed', bg: '#ede9fe',
                  items: [
                    'Accessible depuis Finances → Trésorerie (onglet dédié)',
                    'Sélectionner une date pour voir les entrées / sorties / net du jour',
                    'Le rapport agrège toutes les sessions ouvertes ce jour-là',
                    'Plusieurs caisses (ex: Caisse scolarité + Caisse inscription) sont cumulées',
                  ],
                },
                {
                  tab: 'Bonnes pratiques', color: '#16a34a', bg: '#dcfce7',
                  items: [
                    'Ouvrir la session en tout début de journée avant d\'encaisser',
                    'Ne pas laisser une session ouverte plusieurs jours sans clôture',
                    'Tout encaissement espèces doit avoir une transaction correspondante',
                    'En cas d\'écart, ajouter une note explicative lors de la clôture',
                  ],
                },
              ].map(section => (
                <div key={section.tab} className="rounded-xl border p-4" style={{ borderColor: section.color + '25', background: section.bg + '40' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-5 w-5 rounded flex items-center justify-center" style={{ background: section.color + '20' }}>
                      <ChevronRight size={11} style={{ color: section.color }} />
                    </div>
                    <span className="text-xs font-bold" style={{ color: section.color }}>{section.tab}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {section.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <span className="text-gray-300 mt-0.5 flex-shrink-0">•</span>
                        <span className="text-xs text-gray-500 leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map((k, i) => (
          <div key={i} className="rounded-2xl p-4 flex items-center gap-4" style={{ background: '#fff', border: '1.5px solid #f0f4f9' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: k.bg }}>
              {k.icon}
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{k.label}</p>
              <p className="text-lg font-black text-slate-800 leading-tight">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Year comparison */}
      {(cyTx.length > 0 || pyTx.length > 0) && (
        <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: '#fff', border: '1.5px solid #f0f4f9' }}>
          <div className="flex items-center gap-2">
            <TrendingUp size={15} color="#7c3aed" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Comparaison annuelle — {prevYear} vs {currentYear}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <YearCompare label="Entrées" curr={cyIn} prev={pyIn} currYear={currentYear} prevYear={prevYear} colorPos="#16a34a" colorNeg="#ef4444" />
            <YearCompare label="Sorties" curr={cyOut} prev={pyOut} currYear={currentYear} prevYear={prevYear} colorPos="#ef4444" colorNeg="#16a34a" />
          </div>
        </div>
      )}

      {/* Tabs + Export */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#f1f5f9', width: 'fit-content' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
              style={{
                background: activeTab === t.key ? '#fff' : 'transparent',
                color: activeTab === t.key ? COLOR : '#94a3b8',
                boxShadow: activeTab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}>
              {t.label}
            </button>
          ))}
        </div>
        <ExportMenu
          color={COLOR}
          onExcel={activeTab === 'transactions' ? handleExportTransExcel : handleExportSessionsExcel}
          onPDF={activeTab === 'transactions' ? handleExportTransPDF : handleExportSessionsPDF}
          disabled={activeTab === 'transactions' ? transactions.length === 0 : sessions.length === 0}
        />
      </div>

      {/* Filter bar (transactions only) */}
      {activeTab === 'transactions' && (
        <FilterBar>
          <FilterSelect value={filterType} onChange={e => { setFilterType(e.target.value); setTransPage(1); }}>
            <option value="all">Tous types</option>
            <option value="IN">Entrées uniquement</option>
            <option value="OUT">Sorties uniquement</option>
          </FilterSelect>
          <FilterSelect value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setTransPage(1); }}>
            <option value="">Tous les mois</option>
            {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </FilterSelect>
          {(filterType !== 'all' || filterMonth) && (
            <button
              onClick={() => { setFilterType('all'); setFilterMonth(''); setTransPage(1); }}
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: COLOR, background: '#fffbeb', border: '1px solid #fde68a' }}>
              Réinitialiser
            </button>
          )}
        </FilterBar>
      )}

      {/* Transactions tab */}
      {activeTab === 'transactions' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1.5px solid #f0f4f9' }}>
          {loadingTrans ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${COLOR} transparent transparent transparent` }} />
            </div>
          ) : transError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#fef2f2' }}>
                <AlertTriangle size={24} color="#ef4444" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Erreur de chargement</p>
              <p className="text-xs text-slate-400 max-w-xs text-center">{transError}</p>
              <button onClick={reloadTrans} className="mt-1 px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: COLOR }}>
                Réessayer
              </button>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#fffbeb' }}>
                <Wallet size={28} color={COLOR} />
              </div>
              <p className="text-sm text-slate-400 font-medium">Aucune transaction enregistrée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'linear-gradient(135deg,#fafbff,#f8fafc)', borderBottom: '1px solid #f0f4f9' }}>
                  {['Date / Heure', 'Type', 'Montant', 'Description', 'Référence'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, idx) => {
                  const isIn = tx.transaction_type === 'IN';
                  return (
                    <tr key={tx.id}
                      className="transition-colors"
                      style={{ background: idx % 2 === 0 ? '#fafbff' : 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fafbff' : 'transparent'}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Clock size={13} color="#94a3b8" />
                          <div>
                            <p className="text-xs font-medium text-slate-700">{tx.created_at ? new Date(tx.created_at).toLocaleDateString('fr-FR') : '—'}</p>
                            <p className="text-[11px] text-slate-400">{tx.created_at ? new Date(tx.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                          style={{ color: isIn ? '#16a34a' : '#ef4444', background: isIn ? '#f0fdf4' : '#fef2f2' }}>
                          {isIn ? <ArrowDownCircle size={11} /> : <ArrowUpCircle size={11} />}
                          {isIn ? 'Entrée' : 'Sortie'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-black" style={{ color: isIn ? '#16a34a' : '#ef4444' }}>
                          {isIn ? '+' : '-'}{parseFloat(tx.amount || 0).toLocaleString('fr-FR')} FCFA
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[220px] truncate">{tx.description || '—'}</td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-500">{tx.reference || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}

      {/* Sessions tab */}
      {activeTab === 'sessions' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1.5px solid #f0f4f9' }}>
          {loadingSessions ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${COLOR} transparent transparent transparent` }} />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#fffbeb' }}>
                <Unlock size={28} color={COLOR} />
              </div>
              <p className="text-sm text-slate-400 font-medium">Aucune session enregistrée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'linear-gradient(135deg,#fafbff,#f8fafc)', borderBottom: '1px solid #f0f4f9' }}>
                  {['Ouverture', 'Fermeture', 'Solde ouverture', 'Solde fermeture', 'Statut', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.map((sess, idx) => {
                  const isOpen = sess.status === 'OPEN' || !sess.closed_at;
                  return (
                    <tr key={sess.id}
                      className="transition-colors"
                      style={{ background: idx % 2 === 0 ? '#fafbff' : 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fafbff' : 'transparent'}
                    >
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {sess.opened_at ? new Date(sess.opened_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {sess.closed_at ? new Date(sess.closed_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-700">
                        {parseFloat(sess.opening_balance || 0).toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-700">
                        {sess.closing_balance != null ? parseFloat(sess.closing_balance).toLocaleString('fr-FR') + ' FCFA' : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                          style={{ color: isOpen ? '#16a34a' : '#64748b', background: isOpen ? '#f0fdf4' : '#f1f5f9' }}>
                          {isOpen ? <Unlock size={11} /> : <Lock size={11} />}
                          {isOpen ? 'Ouverte' : 'Fermée'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isOpen && (
                          <IconBtn icon={Lock} title="Fermer la session" onClick={() => handleCloseSession(sess)} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'transactions' && transTotalPages > 1 && (
        <Pagination currentPage={transPage} totalPages={transTotalPages} onPageChange={setTransPage} accentColor={COLOR} />
      )}
      {activeTab === 'sessions' && sessionTotalPages > 1 && (
        <Pagination currentPage={sessionPage} totalPages={sessionTotalPages} onPageChange={setSessionPage} accentColor={COLOR} />
      )}

      {showTransModal && (
        <TransactionModal
          onClose={() => setShowTransModal(false)}
          onSaved={() => { setShowTransModal(false); reloadTrans(); reloadCash(); reloadOpenSession(); reloadSessions(); }}
          notify={notify}
          openSession={openSession}
          cashRegId={cashInfo?.id}
        />
      )}

      {showSessionModal && (
        <OpenSessionModal
          onClose={() => setShowSessionModal(false)}
          onSaved={() => { setShowSessionModal(false); reloadSessions(); reloadOpenSession(); reloadCash(); }}
          notify={notify}
          cashRegId={cashInfo?.id}
        />
      )}

      {showNewRegisterModal && (
        <NewRegisterModal
          onClose={() => setShowNewRegisterModal(false)}
          onSaved={() => {
            setShowNewRegisterModal(false);
            reloadCash();
          }}
          notify={notify}
          siteId={selectedSite !== 'all' ? selectedSite : null}
        />
      )}

      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
