import { useState, Fragment, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, LayoutList, Receipt, BarChart3, Plus, X, ChevronDown, ChevronRight,
  Download, Loader2, FileText, Building2, Edit2, Trash2, CheckCircle, XCircle,
  Search, TrendingUp, TrendingDown, Wallet, CreditCard, Filter, AlertCircle,
  DollarSign, ArrowUpRight, ArrowDownRight, Banknote, HelpCircle, ArrowRight,
  ExternalLink, Banknote as BanknoteIcon, RefreshCw,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { accountingService, financeService, api } from '../../services';
import { useApi } from '../../hooks/useApi';
import { useSite } from '../../contexts/SiteContext';
import { PageHeader, PrimaryButton } from '../../components/ui/PageHeader';
import { useNotifications } from '../../components/Notifications';

const COLOR      = '#4f46e5';
const COLOR_BG   = '#eef2ff';
const COLOR_ICON = '#a5b4fc';

const TABS = [
  { id: 'journal',  label: 'Journal',       icon: BookOpen   },
  { id: 'plan',     label: 'Plan comptable', icon: LayoutList },
  { id: 'depenses', label: 'Dépenses',       icon: Receipt    },
  { id: 'rapports', label: 'Rapports',       icon: BarChart3  },
];

const ENTRY_STATUS_CFG = {
  DRAFT:     { label: 'Brouillon', bg: '#fef3c7', color: '#92400e' },
  POSTED:    { label: 'Validé',    bg: '#dcfce7', color: '#166534' },
  CANCELLED: { label: 'Annulé',   bg: '#fee2e2', color: '#991b1b' },
};

const EXPENSE_STATUS_CFG = {
  PENDING:   { label: 'En attente', bg: '#fef3c7', color: '#92400e'  },
  APPROVED:  { label: 'Approuvé',   bg: '#dbeafe', color: '#1e40af'  },
  PAID:      { label: 'Payé',       bg: '#dcfce7', color: '#166534'  },
  CANCELLED: { label: 'Annulé',     bg: '#fee2e2', color: '#991b1b'  },
};

const ACCOUNT_TYPES = [
  { value: 'ASSET',     label: 'Actif'            },
  { value: 'LIABILITY', label: 'Passif'            },
  { value: 'EQUITY',    label: 'Capitaux propres'  },
  { value: 'REVENUE',   label: 'Produits'          },
  { value: 'EXPENSE',   label: 'Charges'           },
];

const EXPENSE_CATEGORIES = [
  { value: 'SALARY',         label: 'Salaires',         color: '#7c3aed' },
  { value: 'INFRASTRUCTURE', label: 'Infrastructure',   color: '#2563eb' },
  { value: 'SUPPLIES',       label: 'Fournitures',      color: '#059669' },
  { value: 'UTILITIES',      label: 'Services (eau/élec)', color: '#0891b2' },
  { value: 'MAINTENANCE',    label: 'Entretien',        color: '#d97706' },
  { value: 'MARKETING',      label: 'Marketing',        color: '#db2777' },
  { value: 'TRANSPORT',      label: 'Transport',        color: '#ea580c' },
  { value: 'OTHER',          label: 'Autre',            color: '#64748b' },
];

const PIE_COLORS = ['#7c3aed','#2563eb','#059669','#0891b2','#d97706','#db2777','#ea580c','#64748b'];

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));

function Badge({ cfg, value }) {
  const c = cfg[value] || { label: value, bg: '#f1f5f9', color: '#475569' };
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-lg text-xs" style={{ minWidth: 140 }}>
      <p className="font-bold mb-1 text-gray-600">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {fmt(p.value)} FCFA</p>
      ))}
    </div>
  );
}

function KpiCard({ label, value, sub, color, bg, icon: Icon, trend }) {
  return (
    <div className="rounded-2xl border p-4 flex flex-col gap-1"
      style={{ background: bg, borderColor: color + '30' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        {Icon && (
          <div className="h-8 w-8 rounded-xl flex items-center justify-center"
            style={{ background: color + '20' }}>
            <Icon size={15} style={{ color }} />
          </div>
        )}
      </div>
      <p className="text-lg font-bold mt-1" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium mt-0.5 ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

// ── CreateEntryModal ──────────────────────────────────────────────────────────
function CreateEntryModal({ accounts, selectedSite, onClose, onSaved }) {
  const { notify } = useNotifications();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ entry_date: today, description: '', reference: '' });
  const [lines, setLines] = useState([
    { account: '', debit_amount: '', credit_amount: '', description: '' },
    { account: '', debit_amount: '', credit_amount: '', description: '' },
  ]);
  const [loading, setLoading] = useState(false);

  const addLine  = () => setLines(l => [...l, { account: '', debit_amount: '', credit_amount: '', description: '' }]);
  const removeLine  = (i) => setLines(l => l.filter((_, idx) => idx !== i));
  const updateLine  = (i, field, val) => setLines(l => l.map((ln, idx) => idx === i ? { ...ln, [field]: val } : ln));

  const totalDebit  = lines.reduce((s, l) => s + parseFloat(l.debit_amount  || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + parseFloat(l.credit_amount || 0), 0);
  const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validLines = lines.filter(l => l.account);
    if (!isBalanced) { notify("L'écriture n'est pas équilibrée (débit ≠ crédit)", 'error'); return; }
    if (validLines.length < 2) { notify('Au moins 2 lignes sont requises', 'error'); return; }
    setLoading(true);
    try {
      const siteId = selectedSite !== 'all' ? selectedSite : accounts[0]?.site;
      await accountingService.createJournalEntry({
        site: siteId,
        entry_date: form.entry_date,
        description: form.description,
        reference: form.reference,
        lines: validLines.map(l => ({
          account: l.account,
          debit_amount:  parseFloat(l.debit_amount  || 0),
          credit_amount: parseFloat(l.credit_amount || 0),
          description: l.description,
        })),
      });
      notify('Écriture créée avec succès', 'success');
      onSaved();
    } catch (err) {
      notify(err?.response?.data?.lines?.[0] || err?.message || 'Erreur', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="h-1 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${COLOR}, #818cf8)` }} />
        <div className="p-5 border-b flex items-center justify-between">
          <p className="font-bold text-gray-800">Nouvelle écriture comptable</p>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" required
                value={form.entry_date} onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" required
                placeholder="Ex: Paiement scolarité"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Référence</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                placeholder="Référence optionnelle"
                value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Lignes comptables</p>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold ${isBalanced ? 'text-green-600' : 'text-red-500'}`}>
                  D: {fmt(totalDebit)} / C: {fmt(totalCredit)} FCFA
                  {isBalanced && ' ✓'}
                </span>
                <button type="button" onClick={addLine}
                  className="text-xs px-2.5 py-1 rounded-lg font-medium"
                  style={{ background: COLOR_BG, color: COLOR }}>
                  + Ligne
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-400 px-1">
                <div className="col-span-4">Compte</div>
                <div className="col-span-3">Débit</div>
                <div className="col-span-3">Crédit</div>
                <div className="col-span-2">Libellé</div>
              </div>
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <select className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                      value={line.account} onChange={e => updateLine(i, 'account', e.target.value)}>
                      <option value="">Compte…</option>
                      {ACCOUNT_TYPES.map(t => (
                        <optgroup key={t.value} label={t.label}>
                          {accounts.filter(a => a.account_type === t.value).map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.code} – {acc.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input type="number" className="w-full border rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none"
                      placeholder="0" min="0"
                      value={line.debit_amount} onChange={e => updateLine(i, 'debit_amount', e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <input type="number" className="w-full border rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none"
                      placeholder="0" min="0"
                      value={line.credit_amount} onChange={e => updateLine(i, 'credit_amount', e.target.value)} />
                  </div>
                  <div className="col-span-1">
                    <input className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                      placeholder="…"
                      value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {lines.length > 2 && (
                      <button type="button" onClick={() => removeLine(i)}
                        className="p-1 rounded hover:bg-red-50">
                        <X size={12} className="text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm border hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-50"
              style={{ background: COLOR }}>
              {loading && <Loader2 size={14} className="animate-spin" />}
              Créer l'écriture
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── AccountModal ─────────────────────────────────────────────────────────────
function AccountModal({ account, selectedSite, onClose, onSaved }) {
  const { notify } = useNotifications();
  const [form, setForm] = useState({
    code: account?.code || '',
    name: account?.name || '',
    account_type: account?.account_type || 'ASSET',
    description: account?.description || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, ...(selectedSite !== 'all' ? { site: selectedSite } : {}) };
      if (account) {
        await accountingService.updateAccount(account.id, payload);
      } else {
        await accountingService.createAccount(payload);
      }
      notify(account ? 'Compte modifié' : 'Compte créé', 'success');
      onSaved();
    } catch (err) {
      notify(err?.response?.data?.detail || err?.message || 'Erreur', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}>
        <div className="h-1 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${COLOR}, #818cf8)` }} />
        <div className="p-5 border-b flex items-center justify-between">
          <p className="font-bold text-gray-800">{account ? 'Modifier le compte' : 'Nouveau compte'}</p>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Code *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" required
                placeholder="Ex: 571" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none" required
                value={form.account_type} onChange={e => setForm(f => ({ ...f, account_type: e.target.value }))}>
                {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" required
              placeholder="Ex: Caisse principale" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
              placeholder="Description optionnelle" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm border hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-50"
              style={{ background: COLOR }}>
              {loading && <Loader2 size={14} className="animate-spin" />}
              {account ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── ExpenseModal ─────────────────────────────────────────────────────────────
function ExpenseModal({ selectedSite, editExpense, onClose, onSaved }) {
  const { notify } = useNotifications();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    label:       editExpense?.label       || '',
    amount:      editExpense?.amount      || '',
    category:    editExpense?.category    || 'OTHER',
    date:        editExpense?.date        || today,
    description: editExpense?.description || '',
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editExpense) {
        await financeService.updateExpense(editExpense.id, {
          label: form.label, amount: parseFloat(form.amount),
          category: form.category, date: form.date, description: form.description,
        });
        notify('Dépense modifiée', 'success');
      } else if (receiptFile) {
        const fd = new FormData();
        fd.append('label', form.label);
        fd.append('amount', form.amount);
        fd.append('category', form.category);
        fd.append('date', form.date);
        if (form.description) fd.append('description', form.description);
        if (selectedSite !== 'all') fd.append('site', selectedSite);
        fd.append('receipt_file', receiptFile);
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${api.baseUrl}/expenses/`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || 'Erreur');
        }
        notify('Dépense créée', 'success');
      } else {
        await financeService.createExpense({
          label: form.label, amount: parseFloat(form.amount),
          category: form.category, date: form.date, description: form.description,
          ...(selectedSite !== 'all' ? { site: selectedSite } : {}),
        });
        notify('Dépense créée', 'success');
      }
      onSaved();
    } catch (err) {
      notify(err.message || 'Erreur', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}>
        <div className="h-1 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${COLOR}, #818cf8)` }} />
        <div className="p-5 border-b flex items-center justify-between">
          <p className="font-bold text-gray-800">{editExpense ? 'Modifier la dépense' : 'Nouvelle dépense'}</p>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Libellé *</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" required
              placeholder="Ex: Achat fournitures de bureau"
              value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Montant (FCFA) *</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                required min="0" step="1" placeholder="0"
                value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Catégorie *</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none" required
                value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
            <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none" required
              value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" rows={2}
              placeholder="Détails optionnels…"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          {!editExpense && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Justificatif (optionnel)</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                className="block w-full text-xs text-gray-500 cursor-pointer
                  file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0
                  file:text-xs file:font-semibold file:text-white file:cursor-pointer"
                style={{ '--file-bg': COLOR }}
                onChange={e => setReceiptFile(e.target.files[0])} />
            </div>
          )}
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm border hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-50"
              style={{ background: COLOR }}>
              {loading && <Loader2 size={14} className="animate-spin" />}
              {editExpense ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── QuickPayModal — encaisser un impayé directement depuis la liste ───────────
function QuickPayModal({ invoice, onClose, onSaved, notify }) {
  const [amount, setAmount] = useState(String(parseFloat(invoice.balance || 0)));
  const [pmId, setPmId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [methods, setMethods] = useState([]);

  useEffect(() => {
    financeService.getPaymentMethods({ page_size: 50 })
      .then(d => setMethods(d?.results || d || []))
      .catch(() => {});
  }, []);

  const balance = parseFloat(invoice.balance || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return notify('Montant invalide.', 'error');
    if (amt > balance) return notify(`Le montant dépasse le solde restant (${balance.toLocaleString('fr-FR')} FCFA).`, 'error');
    if (!date) return notify('La date est requise.', 'error');
    setSaving(true);
    try {
      await financeService.createPayment({
        invoice: invoice.id,
        amount: amt,
        payment_method: pmId || undefined,
        payment_date: date,
        notes,
        status: 'SUCCESS',
      });
      notify(`${amt.toLocaleString('fr-FR')} FCFA encaissés pour ${invoice.student_name}.`, 'success');
      onSaved();
    } catch {
      notify('Impossible d\'enregistrer le paiement.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 9999 }}
      onClick={onClose}>
      <div className="rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        style={{ background: '#fff', border: '1.5px solid #f0f4f9' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ height: 4, background: 'linear-gradient(90deg,#4f46e5,#7c3aed)' }} />
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #f0f4f9' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#eef2ff' }}>
              <Wallet size={18} color="#4f46e5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Enregistrer un paiement</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">{invoice.invoice_number} — {invoice.student_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors">
            <X size={16} color="#94a3b8" />
          </button>
        </div>

        {/* Info bar */}
        <div className="flex items-center justify-between px-6 py-3" style={{ background: '#fef2f2', borderBottom: '1px solid #fee2e2' }}>
          <div>
            <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Solde restant dû</p>
            <p className="text-lg font-black text-red-600">{balance.toLocaleString('fr-FR')} FCFA</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total facture</p>
            <p className="text-sm font-bold text-slate-600">{parseFloat(invoice.total || 0).toLocaleString('fr-FR')} FCFA</p>
            <p className="text-[11px] text-green-600">Déjà payé : {parseFloat(invoice.amount_paid || 0).toLocaleString('fr-FR')} FCFA</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
              Montant à encaisser (FCFA)
              <button type="button" className="ml-2 text-indigo-500 normal-case tracking-normal font-medium text-[11px]"
                onClick={() => setAmount(String(balance))}>
                Tout encaisser
              </button>
            </label>
            <input className="input-field" type="number" min="1" max={balance} step="any"
              value={amount} onChange={e => setAmount(e.target.value)} />
          </div>

          {/* Payment method + date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Mode de paiement</label>
              <select className="input-field" value={pmId} onChange={e => setPmId(e.target.value)}>
                <option value="">-- Choisir --</option>
                {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Date</label>
              <input className="input-field" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Notes (optionnel)</label>
            <input className="input-field" placeholder="Ex: Paiement partiel mois de juin..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              style={{ border: '1.5px solid #f0f4f9' }}>
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
              style={{ background: saving ? '#a5b4fc' : '#4f46e5' }}>
              {saving ? 'Enregistrement...' : 'Valider le paiement'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Accounting() {
  const { selectedSite }   = useSite();
  const { notify } = useNotifications();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('journal');
  const [quickPayInvoice, setQuickPayInvoice] = useState(null);

  // Journal
  const [expandedEntry, setExpandedEntry]   = useState(null);
  const [expandedLines, setExpandedLines]   = useState(null);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [showCreateEntry, setShowCreateEntry] = useState(false);
  const [journalSearch, setJournalSearch]   = useState('');

  // Plan comptable
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editAccount, setEditAccount]           = useState(null);
  const [confirmDelete, setConfirmDelete]       = useState(null);
  const [confirmOHADA, setConfirmOHADA]         = useState(false);
  const [ohadaLoading, setOhadaLoading]         = useState(false);
  const [ohadaResult, setOhadaResult]           = useState(null);

  // Dépenses
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editExpense, setEditExpense]           = useState(null);
  const [confirmDeleteExp, setConfirmDeleteExp] = useState(null);
  const [expenseCategory, setExpenseCategory]   = useState('');
  const [expenseStatus, setExpenseStatus]       = useState('');
  const [expenseMonth, setExpenseMonth]         = useState('');

  // Workflow guide
  const [showWorkflow, setShowWorkflow]   = useState(false);

  // Rapports
  const [reportType, setReportType]       = useState('monthly');
  const [reportSubTab, setReportSubTab]   = useState('resume');

  const siteFilter = selectedSite !== 'all' ? { site: selectedSite } : {};

  const { data: entriesData,  loading: entriesLoading,  refetch: refetchEntries }  = useApi(
    () => accountingService.getJournalEntries({ ...siteFilter }),
    [selectedSite, activeTab === 'journal'],
    activeTab === 'journal'
  );
  const { data: accountsData, loading: accountsLoading, refetch: refetchAccounts } = useApi(
    () => accountingService.getAccounts({ ...siteFilter }),
    [selectedSite, activeTab === 'plan'],
    activeTab === 'plan'
  );

  const expenseParams = {
    ...siteFilter,
    ...(expenseCategory ? { category: expenseCategory } : {}),
    ...(expenseStatus   ? { status: expenseStatus }     : {}),
    ordering: '-date',
  };
  const shouldFetchExpenses = activeTab === 'depenses' || activeTab === 'rapports';
  const { data: expensesData, loading: expensesLoading, refetch: refetchExpenses } = useApi(
    () => financeService.getExpenses({ ...expenseParams, page_size: 500 }),
    [selectedSite, shouldFetchExpenses, expenseCategory, expenseStatus],
    shouldFetchExpenses
  );

  const revenueStartDate = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 3);
    return d.toISOString().split('T')[0];
  })();
  const { data: revenueReport, loading: revenueLoading } = useApi(
    () => accountingService.getRevenueReport({
      ...(selectedSite !== 'all' ? { site_id: selectedSite } : {}),
      type: reportType,
      start_date: revenueStartDate,
    }),
    [selectedSite, activeTab === 'rapports', reportType],
    activeTab === 'rapports'
  );
  const { data: unpaidReport, loading: unpaidLoading, execute: refetchUnpaid } = useApi(
    () => accountingService.getUnpaidReport({ ...(selectedSite !== 'all' ? { site_id: selectedSite } : {}) }),
    [selectedSite, activeTab === 'rapports'],
    activeTab === 'rapports'
  );
  const { data: trialBalance,  loading: trialLoading   } = useApi(
    () => accountingService.getTrialBalance({ ...(selectedSite !== 'all' ? { site_id: selectedSite } : {}) }),
    [selectedSite, activeTab === 'rapports'],
    activeTab === 'rapports'
  );
  const { data: cashData } = useApi(
    () => financeService.getCashRegisters(siteFilter),
    [selectedSite, activeTab === 'rapports'],
    activeTab === 'rapports'
  );

  const entries         = entriesData?.results  || entriesData  || [];
  const accounts        = accountsData?.results || accountsData || [];
  const expenses        = expensesData?.results || expensesData || [];
  const cashRegisters   = cashData?.results     || cashData     || [];
  const accountsByType  = ACCOUNT_TYPES.reduce((acc, t) => {
    acc[t.value] = accounts.filter(a => a.account_type === t.value);
    return acc;
  }, {});

  // Filtered journal by search
  const filteredEntries = journalSearch
    ? entries.filter(e =>
        e.description?.toLowerCase().includes(journalSearch.toLowerCase()) ||
        e.entry_number?.toLowerCase().includes(journalSearch.toLowerCase()) ||
        e.reference?.toLowerCase().includes(journalSearch.toLowerCase())
      )
    : entries;

  // Filter expenses by month client-side
  const filteredExpenses = expenseMonth
    ? expenses.filter(e => e.date?.startsWith(expenseMonth))
    : expenses;

  // Expense KPIs (computed on all expenses regardless of filters)
  const totalPending  = filteredExpenses.filter(e => e.status === 'PENDING') .reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const totalApproved = filteredExpenses.filter(e => e.status === 'APPROVED').reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const totalPaid     = filteredExpenses.filter(e => e.status === 'PAID')    .reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const totalAll      = filteredExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  // Expense breakdown by category for chart
  const expenseByCategory = EXPENSE_CATEGORIES.map(cat => ({
    name:  cat.label,
    value: filteredExpenses.filter(e => e.category === cat.value && e.status !== 'CANCELLED')
                           .reduce((s, e) => s + parseFloat(e.amount || 0), 0),
  })).filter(c => c.value > 0);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleExpandEntry = async (entryId) => {
    if (expandedEntry === entryId) { setExpandedEntry(null); setExpandedLines(null); return; }
    setExpandedEntry(entryId);
    setExpandedLines(null);
    setExpandedLoading(true);
    try {
      const detail = await accountingService.getJournalEntryById(entryId);
      setExpandedLines(detail?.lines || []);
    } catch { setExpandedLines([]); }
    finally { setExpandedLoading(false); }
  };

  const handlePostEntry = async (id) => {
    try {
      await accountingService.postJournalEntry(id);
      notify('Écriture validée', 'success');
      refetchEntries();
      if (expandedEntry === id) {
        const detail = await accountingService.getJournalEntryById(id);
        setExpandedLines(detail?.lines || []);
      }
    } catch (e) { notify(e.message || 'Erreur', 'error'); }
  };

  const handleExportExcel = async () => {
    try {
      const blob = await accountingService.exportExcel({ ...siteFilter });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'journal_comptable.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { notify('Erreur export', 'error'); }
  };

  const handleInitOHADA = async () => {
    setOhadaLoading(true);
    try {
      const sitePayload = selectedSite !== 'all' ? { site_id: selectedSite } : {};
      const res = await accountingService.initOHADA(sitePayload);
      // Auto-replay journal entries for existing validated payments
      try {
        const replay = await accountingService.replayJournal(sitePayload);
        const replayMsg = replay.created > 0
          ? ` ${replay.created} écriture(s) rétroactive(s) créée(s).`
          : '';
        setOhadaResult({ detail: res.detail + replayMsg });
      } catch {
        setOhadaResult(res);
      }
      refetchAccounts();
      refetchEntries();
    } catch { setOhadaResult({ detail: "Erreur lors de l'initialisation" }); }
    finally { setOhadaLoading(false); setConfirmOHADA(false); }
  };

  const handleReplayJournal = async () => {
    try {
      const sitePayload = selectedSite !== 'all' ? { site_id: selectedSite } : {};
      const res = await accountingService.replayJournal(sitePayload);
      notify(res.detail || 'Écritures recréées.', res.created > 0 ? 'success' : 'info');
      refetchEntries();
    } catch (e) { notify(e.message || 'Erreur', 'error'); }
  };

  const handleDeleteAccount = async () => {
    if (!confirmDelete) return;
    try {
      await accountingService.deleteAccount(confirmDelete.id);
      notify('Compte supprimé', 'success');
      refetchAccounts();
    } catch (e) { notify(e.message || 'Erreur', 'error'); }
    setConfirmDelete(null);
  };

  const handleApproveExpense = async (id) => {
    try { await financeService.approveExpense(id); notify('Dépense approuvée', 'success'); refetchExpenses(); }
    catch (e) { notify(e.message || 'Erreur', 'error'); }
  };
  const handleRejectExpense = async (id) => {
    try { await financeService.rejectExpense(id); notify('Dépense rejetée', 'success'); refetchExpenses(); }
    catch (e) { notify(e.message || 'Erreur', 'error'); }
  };
  const handleMarkPaidExpense = async (id) => {
    try { await financeService.markExpensePaid(id); notify('Dépense marquée payée', 'success'); refetchExpenses(); }
    catch (e) { notify(e.message || 'Erreur', 'error'); }
  };
  const handleDeleteExpense = async () => {
    if (!confirmDeleteExp) return;
    try { await financeService.deleteExpense(confirmDeleteExp.id); notify('Dépense supprimée', 'success'); refetchExpenses(); }
    catch (e) { notify(e.message || 'Erreur suppression', 'error'); }
    setConfirmDeleteExp(null);
  };

  const revenueData    = revenueReport?.data  || [];
  const unpaidList     = unpaidReport?.invoices || [];
  const balanceAccounts = trialBalance?.accounts || [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Comptabilité"
        subtitle="Journal, plan comptable, dépenses et rapports financiers"
        icon={BookOpen}
        color={COLOR}
        colorBg={COLOR_BG}
        colorIcon={COLOR_ICON}
      />

      {/* ── Workflow Guide ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ borderColor: '#e0e7ff', background: showWorkflow ? '#fafbff' : 'transparent' }}>
        <button
          onClick={() => setShowWorkflow(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-indigo-50/50 transition-colors"
          style={{ background: showWorkflow ? '#eef2ff' : '#f8faff' }}>
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: '#e0e7ff' }}>
              <HelpCircle size={14} style={{ color: COLOR }} />
            </div>
            <span className="text-sm font-semibold" style={{ color: COLOR }}>
              Comment fonctionne la comptabilité ?
            </span>
            <span className="text-xs text-gray-400 font-normal">Workflow et liens entre les modules</span>
          </div>
          <ChevronDown size={15} className="transition-transform text-gray-400"
            style={{ transform: showWorkflow ? 'rotate(180deg)' : 'none' }} />
        </button>

        {showWorkflow && (
          <div className="p-5 flex flex-col gap-5 border-t" style={{ borderColor: '#e0e7ff' }}>
            {/* Flux principal */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Flux de travail principal</p>
              <div className="flex items-start gap-2 flex-wrap">
                {[
                  { step: '1', icon: CreditCard, color: '#16a34a', bg: '#dcfce7',
                    title: 'Paiement validé',
                    desc: 'Un étudiant paie sa scolarité. Le caissier valide le paiement dans le module Caisse.' },
                  { step: '2', icon: BookOpen, color: COLOR, bg: COLOR_BG,
                    title: 'Écriture auto',
                    desc: 'Une écriture comptable est automatiquement créée dans le Journal (Débit 411 / Crédit 706).' },
                  { step: '3', icon: Receipt, color: '#d97706', bg: '#fef3c7',
                    title: 'Dépense soumise',
                    desc: 'Un responsable crée une dépense (ex: salaires). Elle passe PENDING → APPROUVÉE → PAYÉE.' },
                  { step: '4', icon: BarChart3, color: '#7c3aed', bg: '#ede9fe',
                    title: 'Rapports',
                    desc: 'Les rapports agrègent les recettes (factures payées), dépenses et balance comptable.' },
                ].map((s, i, arr) => (
                  <div key={s.step} className="flex items-start gap-2">
                    <div className="rounded-xl border p-3.5 flex flex-col gap-2" style={{ minWidth: 170, maxWidth: 200, borderColor: s.color + '30', background: s.bg + '80' }}>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: s.color + '20' }}>
                          <s.icon size={13} style={{ color: s.color }} />
                        </div>
                        <span className="text-xs font-bold" style={{ color: s.color }}>{s.title}</span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
                    </div>
                    {i < arr.length - 1 && (
                      <ArrowRight size={16} className="text-gray-300 mt-5 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Détail par onglet */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  tab: 'Journal', color: COLOR, bg: COLOR_BG,
                  items: [
                    'Les écritures sont générées automatiquement à chaque paiement validé',
                    'Vous pouvez aussi créer des écritures manuelles (OD, corrections)',
                    'Une écriture BROUILLON doit être validée pour impacter la balance',
                    'L\'export Excel inclut uniquement les écritures validées (POSTED)',
                  ]
                },
                {
                  tab: 'Plan comptable', color: '#2563eb', bg: '#dbeafe',
                  items: [
                    '"Initialiser OHADA" crée les comptes standards du SYSCOHADA révisé',
                    'Comptes clés : 571 (Caisse), 521 (Banque), 706 (Scolarité), 411 (Étudiants)',
                    'À configurer EN PREMIER avant de créer des écritures',
                    'Les comptes système (OHADA) ne peuvent pas être supprimés',
                  ]
                },
                {
                  tab: 'Dépenses', color: '#d97706', bg: '#fef3c7',
                  items: [
                    'Cycle : SOUMISE → APPROUVÉE (admin) → PAYÉE (comptable)',
                    'L\'approbation génère automatiquement une écriture dans le Journal',
                    'Joindre un justificatif (PDF/image) pour chaque dépense',
                    'Filtrer par catégorie, statut ou mois pour une vue ciblée',
                  ]
                },
                {
                  tab: 'Rapports', color: '#7c3aed', bg: '#ede9fe',
                  items: [
                    'Résumé : vue globale (recettes, dépenses, solde net, soldes caisse)',
                    'Recettes : basées sur Invoice.amount_paid (paiements réels)',
                    'Dépenses : répartition par catégorie avec graphiques',
                    'Balance : état débit/crédit de tous les comptes actifs',
                  ]
                },
              ].map(section => (
                <div key={section.tab} className="rounded-xl border p-4" style={{ borderColor: section.color + '25', background: section.bg + '40' }}>
                  <p className="text-xs font-bold mb-2.5" style={{ color: section.color }}>
                    {section.tab}
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle size={11} className="flex-shrink-0 mt-0.5" style={{ color: section.color }} />
                        <span className="text-xs text-gray-600">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Lien caisse */}
            <div className="rounded-xl border px-4 py-3 flex items-start gap-3"
              style={{ borderColor: '#bbf7d0', background: '#f0fdf4' }}>
              <Wallet size={16} className="flex-shrink-0 mt-0.5 text-green-600" />
              <div>
                <p className="text-xs font-bold text-green-800 mb-0.5">Lien avec le module Caisse</p>
                <p className="text-xs text-green-700">
                  Les paiements en espèces (via le module Caisse) alimentent directement le compte <strong>571 – Caisse</strong>.
                  Les soldes de caisse en temps réel sont visibles dans <strong>Rapports → Résumé</strong>.
                  Le journal comptable est ainsi toujours synchronisé avec la trésorerie physique.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Tab nav */}
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {TABS.map(tab => {
            const Icon   = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-all border-b-2"
                style={active
                  ? { color: COLOR, borderColor: COLOR, background: COLOR_BG }
                  : { color: '#64748b', borderColor: 'transparent' }}>
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Journal ─────────────────────────────────────────────── */}
        {activeTab === 'journal' && (
          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="pl-8 pr-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 w-64"
                  placeholder="Rechercher une écriture…"
                  value={journalSearch}
                  onChange={e => setJournalSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-400">{filteredEntries.length} écriture(s)</p>
                <button onClick={handleExportExcel}
                  className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border hover:bg-gray-50">
                  <Download size={14} /> Export Excel
                </button>
                <PrimaryButton onClick={() => setShowCreateEntry(true)} icon={Plus} color={COLOR}>
                  Nouvelle écriture
                </PrimaryButton>
              </div>
            </div>

            {entriesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={24} className="animate-spin" style={{ color: COLOR }} />
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="flex flex-col items-center py-14 gap-3">
                <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: COLOR_BG }}>
                  <BookOpen size={24} style={{ color: COLOR }} />
                </div>
                <p className="text-sm font-medium text-gray-500">
                  {journalSearch ? 'Aucune écriture correspondante' : 'Aucune écriture comptable'}
                </p>
                <p className="text-xs text-gray-400">Les écritures sont générées automatiquement lors des paiements validés</p>
                {!journalSearch && (
                  <button
                    onClick={handleReplayJournal}
                    className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                    style={{ background: COLOR }}>
                    <RefreshCw size={14} /> Recréer les écritures manquantes
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="w-6 px-3 py-3"></th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">N° Écriture</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Référence</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Débit total</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map(entry => (
                      <Fragment key={entry.id}>
                        <tr className="cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50"
                          onClick={() => handleExpandEntry(entry.id)}>
                          <td className="px-3 py-3">
                            {expandedEntry === entry.id
                              ? <ChevronDown size={13} style={{ color: COLOR }} />
                              : <ChevronRight size={13} className="text-gray-300" />}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">{entry.entry_number}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{entry.entry_date}</td>
                          <td className="px-4 py-3 text-xs max-w-xs">
                            <span className="block truncate text-gray-700">{entry.description}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400 font-mono">{entry.reference || '—'}</td>
                          <td className="px-4 py-3"><Badge cfg={ENTRY_STATUS_CFG} value={entry.status} /></td>
                          <td className="px-4 py-3 text-right text-xs font-semibold font-mono text-gray-700">
                            {fmt(entry.total_debit)} FCFA
                          </td>
                          <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                            {entry.status === 'DRAFT' && (
                              <button
                                className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                                style={{ background: COLOR_BG, color: COLOR }}
                                onClick={() => handlePostEntry(entry.id)}>
                                Valider
                              </button>
                            )}
                          </td>
                        </tr>
                        {expandedEntry === entry.id && (
                          <tr>
                            <td colSpan={8} className="bg-indigo-50/40 px-6 py-3">
                              {expandedLoading ? (
                                <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                                  <Loader2 size={12} className="animate-spin" /> Chargement…
                                </div>
                              ) : !expandedLines?.length ? (
                                <p className="text-xs text-gray-400 py-2">Aucune ligne enregistrée</p>
                              ) : (
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-gray-400">
                                      <th className="py-1 text-left font-semibold">Compte</th>
                                      <th className="py-1 text-left font-semibold">Libellé</th>
                                      <th className="py-1 text-right font-semibold">Débit</th>
                                      <th className="py-1 text-right font-semibold">Crédit</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {expandedLines.map(line => (
                                      <tr key={line.id} className="border-t border-indigo-100">
                                        <td className="py-1.5 font-mono">{line.account_code} – {line.account_name}</td>
                                        <td className="py-1.5 text-gray-500">{line.description || '—'}</td>
                                        <td className="py-1.5 text-right font-mono text-green-700">
                                          {parseFloat(line.debit_amount) > 0 ? fmt(line.debit_amount) : ''}
                                        </td>
                                        <td className="py-1.5 text-right font-mono text-red-600">
                                          {parseFloat(line.credit_amount) > 0 ? fmt(line.credit_amount) : ''}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Plan Comptable ───────────────────────────────────────── */}
        {activeTab === 'plan' && (
          <div className="p-5 flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-gray-500">{accounts.length} compte(s) configuré(s)</p>
              <div className="flex items-center gap-2">
                <button
                  className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border hover:bg-gray-50"
                  onClick={() => { setOhadaResult(null); setConfirmOHADA(true); }}>
                  <Building2 size={14} /> Initialiser OHADA
                </button>
                <PrimaryButton onClick={() => { setEditAccount(null); setShowAccountModal(true); }} icon={Plus} color={COLOR}>
                  Nouveau compte
                </PrimaryButton>
              </div>
            </div>

            {ohadaResult && (
              <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{ background: COLOR_BG, color: COLOR }}>
                {ohadaResult.detail}
              </div>
            )}

            {accountsLoading ? (
              <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin" style={{ color: COLOR }} /></div>
            ) : accounts.length === 0 ? (
              <div className="flex flex-col items-center py-14 gap-3">
                <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: COLOR_BG }}>
                  <LayoutList size={24} style={{ color: COLOR }} />
                </div>
                <p className="text-sm font-medium text-gray-500">Aucun plan comptable configuré</p>
                <p className="text-xs text-gray-400">Initialisez le plan OHADA ou créez vos comptes manuellement</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {ACCOUNT_TYPES.map(t => {
                  const list = accountsByType[t.value] || [];
                  if (!list.length) return null;
                  return (
                    <div key={t.value} className="rounded-xl border border-gray-100 overflow-hidden">
                      <div className="px-4 py-3 flex items-center gap-2"
                        style={{ background: COLOR_BG, borderBottom: '1px solid #e0e7ff' }}>
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: COLOR }}>{t.label}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: '#c7d2fe', color: COLOR }}>{list.length}</span>
                      </div>
                      <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-gray-100 bg-gray-50">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase">Code</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase">Nom</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase">Solde</th>
                            <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-400 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.map((acc, i) => (
                            <tr key={acc.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                              style={{ borderBottom: '1px solid #f9fafb' }}>
                              <td className="px-4 py-2.5 font-mono text-xs font-semibold text-gray-600">{acc.code}</td>
                              <td className="px-4 py-2.5 text-xs text-gray-700">{acc.name}</td>
                              <td className="px-4 py-2.5 text-right text-xs font-mono font-semibold text-gray-700">
                                {fmt(acc.balance)} FCFA
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => { setEditAccount(acc); setShowAccountModal(true); }}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                                    <Edit2 size={13} />
                                  </button>
                                  {!acc.is_system && (
                                    <button onClick={() => setConfirmDelete(acc)}
                                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Dépenses ────────────────────────────────────────────── */}
        {activeTab === 'depenses' && (
          <div className="p-5 flex flex-col gap-4">
            {/* KPIs — 4 cellules avec montants FCFA */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="En attente"   value={`${fmt(totalPending)} FCFA`}
                sub={`${filteredExpenses.filter(e=>e.status==='PENDING').length} dépense(s)`}
                color="#d97706" bg="#fef3c7" icon={AlertCircle} />
              <KpiCard label="Approuvées"   value={`${fmt(totalApproved)} FCFA`}
                sub={`${filteredExpenses.filter(e=>e.status==='APPROVED').length} dépense(s)`}
                color="#2563eb" bg="#dbeafe" icon={CheckCircle} />
              <KpiCard label="Payées"       value={`${fmt(totalPaid)} FCFA`}
                sub={`${filteredExpenses.filter(e=>e.status==='PAID').length} dépense(s)`}
                color="#16a34a" bg="#dcfce7" icon={Banknote} />
              <KpiCard label="Total général" value={`${fmt(totalAll)} FCFA`}
                sub={`${filteredExpenses.length} dépense(s) au total`}
                color={COLOR} bg={COLOR_BG} icon={TrendingDown} />
            </div>

            {/* Filtres + bouton */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Filter size={12} /> Filtres :
                </div>
                <select className="border rounded-xl px-3 py-2 text-sm focus:outline-none bg-white"
                  value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)}>
                  <option value="">Toutes catégories</option>
                  {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <select className="border rounded-xl px-3 py-2 text-sm focus:outline-none bg-white"
                  value={expenseStatus} onChange={e => setExpenseStatus(e.target.value)}>
                  <option value="">Tous statuts</option>
                  <option value="PENDING">En attente</option>
                  <option value="APPROVED">Approuvé</option>
                  <option value="PAID">Payé</option>
                  <option value="CANCELLED">Annulé</option>
                </select>
                <input type="month" className="border rounded-xl px-3 py-2 text-sm focus:outline-none bg-white"
                  value={expenseMonth} onChange={e => setExpenseMonth(e.target.value)}
                  title="Filtrer par mois" />
                {(expenseCategory || expenseStatus || expenseMonth) && (
                  <button onClick={() => { setExpenseCategory(''); setExpenseStatus(''); setExpenseMonth(''); }}
                    className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1">
                    <X size={12} /> Réinitialiser
                  </button>
                )}
              </div>
              <PrimaryButton onClick={() => { setEditExpense(null); setShowExpenseModal(true); }} icon={Plus} color={COLOR}>
                Nouvelle dépense
              </PrimaryButton>
            </div>

            {expensesLoading ? (
              <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin" style={{ color: COLOR }} /></div>
            ) : filteredExpenses.length === 0 ? (
              <div className="flex flex-col items-center py-14 gap-3">
                <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: COLOR_BG }}>
                  <Receipt size={24} style={{ color: COLOR }} />
                </div>
                <p className="text-sm font-medium text-gray-500">Aucune dépense enregistrée</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Libellé</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Catégorie</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Montant</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Statut</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((exp, i) => {
                      const cat = EXPENSE_CATEGORIES.find(c => c.value === exp.category);
                      return (
                        <tr key={exp.id}
                          className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                          style={exp.status === 'CANCELLED' ? { opacity: 0.5 } : {}}>
                          <td className="px-4 py-3 text-xs text-gray-500">{exp.date}</td>
                          <td className="px-4 py-3 max-w-xs">
                            <span className="block truncate text-xs font-medium text-gray-700">{exp.label}</span>
                            {exp.description && (
                              <span className="block truncate text-xs text-gray-400">{exp.description}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {cat && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                                style={{ background: cat.color + '18', color: cat.color }}>
                                {cat.label}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-bold font-mono text-gray-800">
                            {fmt(exp.amount)} FCFA
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge cfg={EXPENSE_STATUS_CFG} value={exp.status} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              {exp.status === 'PENDING' && (
                                <>
                                  <button onClick={() => handleApproveExpense(exp.id)}
                                    className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600"
                                    title="Approuver">
                                    <CheckCircle size={14} />
                                  </button>
                                  <button onClick={() => handleRejectExpense(exp.id)}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                                    title="Rejeter">
                                    <XCircle size={14} />
                                  </button>
                                </>
                              )}
                              {exp.status === 'APPROVED' && (
                                <button onClick={() => handleMarkPaidExpense(exp.id)}
                                  className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-700 text-xs font-semibold"
                                  title="Marquer payé">
                                  <Banknote size={14} />
                                </button>
                              )}
                              {exp.status !== 'PAID' && exp.status !== 'CANCELLED' && (
                                <button onClick={() => { setEditExpense(exp); setShowExpenseModal(true); }}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                                  title="Modifier">
                                  <Edit2 size={13} />
                                </button>
                              )}
                              {exp.receipt_file && (
                                <a href={exp.receipt_file} target="_blank" rel="noreferrer"
                                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 inline-flex"
                                  title="Justificatif">
                                  <FileText size={13} />
                                </a>
                              )}
                              <button onClick={() => setConfirmDeleteExp(exp)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500"
                                title="Supprimer">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td colSpan={3} className="px-4 py-3 text-xs font-bold text-gray-600">TOTAL</td>
                      <td className="px-4 py-3 text-right text-xs font-bold font-mono text-gray-800">{fmt(totalAll)} FCFA</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Rapports ────────────────────────────────────────────── */}
        {activeTab === 'rapports' && (
          <div className="p-5 flex flex-col gap-5">
            {/* Sub-tab selector */}
            <div className="flex gap-1 p-1 rounded-xl bg-gray-100" style={{ width: 'fit-content' }}>
              {[
                { id: 'resume',   label: 'Résumé'    },
                { id: 'revenue',  label: 'Recettes'  },
                { id: 'depenses', label: 'Dépenses'  },
                { id: 'unpaid',   label: 'Impayés'   },
                { id: 'balance',  label: 'Balance'   },
              ].map(st => (
                <button key={st.id} onClick={() => setReportSubTab(st.id)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={reportSubTab === st.id
                    ? { background: '#fff', color: COLOR, boxShadow: '0 1px 4px rgba(0,0,0,0.10)' }
                    : { color: '#64748b' }}>
                  {st.label}
                </button>
              ))}
            </div>

            {/* Résumé */}
            {reportSubTab === 'resume' && (
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <KpiCard label="Recettes totales"
                    value={`${fmt(revenueReport?.total)} FCFA`}
                    sub="Paiements validés"
                    color="#16a34a" bg="#dcfce7" icon={TrendingUp} />
                  <KpiCard label="Dépenses totales"
                    value={`${fmt(expenses.filter(e=>e.status!=='CANCELLED').reduce((s,e)=>s+parseFloat(e.amount||0),0))} FCFA`}
                    sub="Dépenses non annulées"
                    color="#dc2626" bg="#fee2e2" icon={TrendingDown} />
                  <KpiCard label="Solde net"
                    value={`${fmt((revenueReport?.total||0) - expenses.filter(e=>e.status!=='CANCELLED').reduce((s,e)=>s+parseFloat(e.amount||0),0))} FCFA`}
                    sub="Recettes − Dépenses"
                    color={COLOR} bg={COLOR_BG} icon={Wallet} />
                  <KpiCard label="Impayés"
                    value={`${fmt(unpaidReport?.total_balance)} FCFA`}
                    sub={`${unpaidReport?.count||0} facture(s)`}
                    color="#d97706" bg="#fef3c7" icon={AlertCircle} />
                </div>

                {/* Caisse registers */}
                {cashRegisters.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Soldes de caisse</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {cashRegisters.map(cr => (
                        <div key={cr.id} className="rounded-xl border p-3 flex items-center gap-3"
                          style={{ borderColor: cr.is_open ? '#bbf7d0' : '#e5e7eb',
                                   background: cr.is_open ? '#f0fdf4' : '#f9fafb' }}>
                          <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: cr.is_open ? '#dcfce7' : '#f3f4f6' }}>
                            <Wallet size={16} style={{ color: cr.is_open ? '#16a34a' : '#9ca3af' }} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-700">{cr.name}</p>
                            <p className="text-sm font-bold" style={{ color: cr.is_open ? '#16a34a' : '#6b7280' }}>
                              {fmt(cr.current_balance)} FCFA
                            </p>
                            <p className="text-xs text-gray-400">{cr.is_open ? 'Ouverte' : 'Fermée'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recettes sub-tab */}
            {reportSubTab === 'revenue' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex gap-1 p-1 rounded-xl bg-gray-100">
                    {[{ id: 'monthly', label: 'Par mois' }, { id: 'by_class', label: 'Par filière' }].map(rt => (
                      <button key={rt.id} onClick={() => setReportType(rt.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={reportType === rt.id
                          ? { background: '#fff', color: COLOR, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                          : { color: '#64748b' }}>
                        {rt.label}
                      </button>
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-gray-600 ml-auto">
                    Total: {fmt(revenueReport?.total)} FCFA
                  </span>
                </div>
                {revenueLoading ? (
                  <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin" style={{ color: COLOR }} /></div>
                ) : revenueData.length === 0 ? (
                  <div className="flex flex-col items-center py-12 gap-2 rounded-xl border">
                    <BarChart3 size={24} className="text-gray-300" />
                    <p className="text-sm text-gray-400">Aucune donnée de recettes pour cette période</p>
                  </div>
                ) : (
                  <div className="rounded-xl border p-4" style={{ height: 340 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey={reportType === 'monthly' ? 'month' : 'class_name'}
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          angle={revenueData.length > 6 ? -30 : 0}
                          textAnchor={revenueData.length > 6 ? 'end' : 'middle'}
                          height={revenueData.length > 6 ? 50 : 30} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }}
                          tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="total" name="Recettes" fill={COLOR} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* Dépenses sub-tab — graphique par catégorie */}
            {reportSubTab === 'depenses' && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {expenseByCategory.length === 0 ? (
                    <div className="col-span-2 flex flex-col items-center py-12 gap-2 rounded-xl border">
                      <Receipt size={24} className="text-gray-300" />
                      <p className="text-sm text-gray-400">Aucune dépense à afficher</p>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-xl border p-4" style={{ height: 300 }}>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Répartition par catégorie</p>
                        <ResponsiveContainer width="100%" height="85%">
                          <PieChart>
                            <Pie data={expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={false}>
                              {expenseByCategory.map((_, idx) => (
                                <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v) => `${fmt(v)} FCFA`} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="rounded-xl border p-4" style={{ height: 300 }}>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Montants par catégorie</p>
                        <ResponsiveContainer width="100%" height="85%">
                          <BarChart data={expenseByCategory} layout="vertical" margin={{ left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }}
                              tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : `${(v/1000).toFixed(0)}K`} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} width={90} />
                            <Tooltip formatter={(v) => `${fmt(v)} FCFA`} />
                            <Bar dataKey="value" name="Dépenses" fill="#ef4444" radius={[0, 4, 4, 0]}>
                              {expenseByCategory.map((_, idx) => (
                                <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  )}
                </div>
                {/* Table récap */}
                {expenseByCategory.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Catégorie</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Montant</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">% du total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenseByCategory.sort((a,b) => b.value - a.value).map((cat, i) => (
                          <tr key={cat.name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                            style={{ borderBottom: '1px solid #f9fafb' }}>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full flex-shrink-0"
                                  style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                <span className="text-xs text-gray-700">{cat.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right text-xs font-bold font-mono text-gray-700">
                              {fmt(cat.value)} FCFA
                            </td>
                            <td className="px-4 py-2.5 text-right text-xs text-gray-400">
                              {totalAll > 0 ? ((cat.value / totalAll) * 100).toFixed(1) : 0}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Impayés sub-tab */}
            {reportSubTab === 'unpaid' && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Montant total impayé', value: `${fmt(unpaidReport?.total_balance)} FCFA`, color: '#dc2626', bg: '#fee2e2', icon: AlertCircle },
                    { label: 'Factures impayées',   value: `${unpaidReport?.count||0} facture(s)`,     color: COLOR,     bg: COLOR_BG, icon: FileText   },
                    { label: 'En retard',            value: `${unpaidReport?.overdue_count||0} facture(s)`, color: '#d97706', bg: '#fef3c7', icon: AlertCircle },
                  ].map(k => (
                    <KpiCard key={k.label} label={k.label} value={k.value} color={k.color} bg={k.bg} icon={k.icon} />
                  ))}
                </div>
                {unpaidLoading ? (
                  <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin" style={{ color: COLOR }} /></div>
                ) : unpaidList.length === 0 ? (
                  <div className="flex flex-col items-center py-10 gap-2 rounded-xl border">
                    <CheckCircle size={24} className="text-green-500" />
                    <p className="text-sm text-gray-500">Aucune facture impayée</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">N° Facture</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Étudiant</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Total</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Payé</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Reste dû</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">Échéance</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unpaidList.map((inv, i) => (
                          <tr key={inv.id}
                            className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                            style={{ borderBottom: '1px solid #f9fafb', background: inv.is_overdue ? '#fff7f7' : undefined }}>
                            <td className="px-4 py-3 font-mono text-xs text-gray-600">{inv.invoice_number}</td>
                            <td className="px-4 py-3">
                              <p className="text-xs font-medium text-gray-700">{inv.student_name}</p>
                              <p className="text-xs text-gray-400">{inv.student_matricule}</p>
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-mono text-gray-600">{fmt(inv.total)} FCFA</td>
                            <td className="px-4 py-3 text-right text-xs font-mono text-green-600">{fmt(inv.amount_paid)} FCFA</td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-xs font-black font-mono text-red-600">{fmt(inv.balance)} FCFA</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {inv.is_overdue
                                ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">En retard</span>
                                : <span className="text-xs text-gray-400">{inv.due_date || '—'}</span>}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => setQuickPayInvoice(inv)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white transition-colors"
                                  style={{ background: '#4f46e5' }}
                                  title="Enregistrer un paiement">
                                  <Wallet size={11} />
                                  Encaisser
                                </button>
                                <button
                                  onClick={() => navigate('/admin/finance')}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-indigo-50"
                                  title="Voir dans Finance"
                                  style={{ border: '1px solid #e0e7ff' }}>
                                  <ExternalLink size={12} color="#6366f1" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Balance sub-tab */}
            {reportSubTab === 'balance' && (
              <div className="flex flex-col gap-4">
                {trialLoading ? (
                  <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin" style={{ color: COLOR }} /></div>
                ) : (
                  <>
                    {trialBalance && balanceAccounts.length > 0 && (
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-bold px-3 py-1.5 rounded-xl"
                          style={trialBalance.is_balanced
                            ? { background: '#dcfce7', color: '#166534' }
                            : { background: '#fee2e2', color: '#991b1b' }}>
                          {trialBalance.is_balanced ? 'Balance équilibrée ✓' : 'Balance déséquilibrée ✗'}
                        </span>
                        <span className="text-xs text-gray-500">
                          Total débit: {fmt(trialBalance.total_debit)} FCFA &nbsp;|&nbsp;
                          Total crédit: {fmt(trialBalance.total_credit)} FCFA
                        </span>
                      </div>
                    )}
                    {balanceAccounts.length === 0 ? (
                      <div className="flex flex-col items-center py-10 gap-2 rounded-xl border">
                        <LayoutList size={24} className="text-gray-300" />
                        <p className="text-sm text-gray-400">Aucun mouvement comptable</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-gray-100">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Code</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Compte</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Type</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Débit cumulé</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Crédit cumulé</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Solde</th>
                            </tr>
                          </thead>
                          <tbody>
                            {balanceAccounts.map((acc, i) => (
                              <tr key={acc.account_code}
                                className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                                style={{ borderBottom: '1px solid #f9fafb' }}>
                                <td className="px-4 py-2.5 font-mono text-xs font-semibold text-gray-600">{acc.account_code}</td>
                                <td className="px-4 py-2.5 text-xs text-gray-700">{acc.account_name}</td>
                                <td className="px-4 py-2.5 text-xs text-gray-500">
                                  {ACCOUNT_TYPES.find(t => t.value === acc.account_type)?.label}
                                </td>
                                <td className="px-4 py-2.5 text-right text-xs font-mono text-green-700">{fmt(acc.debit_total)}</td>
                                <td className="px-4 py-2.5 text-right text-xs font-mono text-red-600">{fmt(acc.credit_total)}</td>
                                <td className="px-4 py-2.5 text-right text-xs font-mono font-bold"
                                  style={{ color: acc.balance >= 0 ? '#166534' : '#dc2626' }}>
                                  {fmt(Math.abs(acc.balance))} {acc.balance < 0 ? '(C)' : '(D)'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-gray-200 bg-gray-50">
                              <td colSpan={3} className="px-4 py-3 text-xs font-bold text-gray-600">TOTAL</td>
                              <td className="px-4 py-3 text-right text-xs font-bold font-mono text-green-700">{fmt(trialBalance?.total_debit)}</td>
                              <td className="px-4 py-3 text-right text-xs font-bold font-mono text-red-600">{fmt(trialBalance?.total_credit)}</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Portals ────────────────────────────────────────────────── */}
      {showCreateEntry && createPortal(
        <CreateEntryModal accounts={accounts} selectedSite={selectedSite}
          onClose={() => setShowCreateEntry(false)}
          onSaved={() => { setShowCreateEntry(false); refetchEntries(); }} />,
        document.body
      )}

      {showAccountModal && createPortal(
        <AccountModal account={editAccount} selectedSite={selectedSite}
          onClose={() => { setShowAccountModal(false); setEditAccount(null); }}
          onSaved={() => { setShowAccountModal(false); setEditAccount(null); refetchAccounts(); }} />,
        document.body
      )}

      {showExpenseModal && createPortal(
        <ExpenseModal selectedSite={selectedSite} editExpense={editExpense}
          onClose={() => { setShowExpenseModal(false); setEditExpense(null); }}
          onSaved={() => { setShowExpenseModal(false); setEditExpense(null); refetchExpenses(); }} />,
        document.body
      )}

      {/* Quick pay modal — impayés */}
      {quickPayInvoice && (
        <QuickPayModal
          invoice={quickPayInvoice}
          onClose={() => setQuickPayInvoice(null)}
          notify={notify}
          onSaved={() => {
            setQuickPayInvoice(null);
            refetchUnpaid();
          }}
        />
      )}

      {/* Confirm delete compte */}
      {confirmDelete && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)' }}
          onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4"
            onClick={e => e.stopPropagation()}>
            <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-800 mb-1">Supprimer ce compte ?</p>
              <p className="text-sm text-gray-500">
                <span className="font-mono font-semibold">{confirmDelete.code}</span> – {confirmDelete.name}
              </p>
              <p className="text-xs text-red-500 mt-2">Cette action est irréversible.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 rounded-xl border text-sm font-medium hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={handleDeleteAccount}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600">
                Supprimer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirm delete dépense */}
      {confirmDeleteExp && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)' }}
          onClick={() => setConfirmDeleteExp(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4"
            onClick={e => e.stopPropagation()}>
            <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-800 mb-1">Supprimer cette dépense ?</p>
              <p className="text-sm text-gray-500">{confirmDeleteExp.label}</p>
              <p className="text-sm font-bold text-red-600 mt-1">{fmt(confirmDeleteExp.amount)} FCFA</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteExp(null)}
                className="flex-1 px-4 py-2 rounded-xl border text-sm font-medium hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={handleDeleteExpense}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600">
                Supprimer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirm OHADA */}
      {confirmOHADA && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)' }}
          onClick={() => setConfirmOHADA(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-4 p-6"
            onClick={e => e.stopPropagation()}>
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto" style={{ background: COLOR_BG }}>
              <Building2 size={20} style={{ color: COLOR }} />
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-800 mb-2">Initialiser le plan OHADA</p>
              <p className="text-sm text-gray-500">
                Cette action créera les comptes OHADA standards.
                Les comptes existants ne seront pas modifiés.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmOHADA(false)}
                className="flex-1 px-4 py-2 rounded-xl border text-sm font-medium hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={handleInitOHADA} disabled={ohadaLoading}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: COLOR }}>
                {ohadaLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                Initialiser
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
