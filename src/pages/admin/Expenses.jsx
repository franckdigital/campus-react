import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Receipt, Plus, Edit, Trash2, CheckCircle, DollarSign, MoreHorizontal,
  X, AlertTriangle, Users, Upload, Paperclip, Search, ChevronDown, Calendar, TrendingUp
} from 'lucide-react';
import { financeService, teachersService, usersService } from '../../services';
import { useApi } from '../../hooks/useApi';
import { useNotifications } from '../../components/Notifications';
import { useSite } from '../../contexts/SiteContext';
import {
  PageHeader, FilterBar, SearchInput, FilterSelect, PrimaryButton,
  IconBtn, Pagination, ExportMenu
} from '../../components/ui/PageHeader';
import { exportToExcel, exportToPDF, fmtPDF } from '../../utils/export';

const COLOR = '#ef4444';
const ITEMS_PER_PAGE = 12;

const CATEGORY_META = {
  SALARY:         { label: 'Salaire',         color: '#6366f1', bg: '#eef2ff' },
  INFRASTRUCTURE: { label: 'Infrastructure',  color: '#64748b', bg: '#f1f5f9' },
  SUPPLIES:       { label: 'Fournitures',     color: '#f59e0b', bg: '#fffbeb' },
  UTILITIES:      { label: 'Services',        color: '#14b8a6', bg: '#f0fdfa' },
  MAINTENANCE:    { label: 'Maintenance',     color: '#f97316', bg: '#fff7ed' },
  MARKETING:      { label: 'Marketing',       color: '#ec4899', bg: '#fdf2f8' },
  TRANSPORT:      { label: 'Transport',       color: '#3b82f6', bg: '#eff6ff' },
  OTHER:          { label: 'Autre',           color: '#6b7280', bg: '#f9fafb' },
};

const STATUS_META = {
  PENDING:   { label: 'En attente', color: '#d97706', bg: '#fffbeb' },
  APPROVED:  { label: 'Approuvée',  color: '#2563eb', bg: '#eff6ff' },
  PAID:      { label: 'Payée',      color: '#16a34a', bg: '#f0fdf4' },
  CANCELLED: { label: 'Annulée',    color: '#64748b', bg: '#f1f5f9' },
};

const PAYMENT_METHODS = [
  { value: 'CASH',         label: 'Espèces' },
  { value: 'BANK_TRANSFER',label: 'Virement' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
];

const emptyForm = {
  label: '', category: 'OTHER', amount: '', date: '', description: '',
  payment_method: 'CASH', bank_account: '', status: 'PENDING',
};

function getPersonName(person, type) {
  if (type === 'TEACHER') {
    // TeacherListSerializer flattens full_name at root level
    return person?.full_name
      || `${person?.user?.first_name || ''} ${person?.user?.last_name || ''}`.trim()
      || person?.user?.full_name
      || 'Enseignant';
  }
  return person?.full_name || `${person?.first_name || ''} ${person?.last_name || ''}`.trim() || 'Personnel';
}

function formatPeriod(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function CategoryBadge({ value }) {
  const m = CATEGORY_META[value] || CATEGORY_META.OTHER;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full"
      style={{ color: m.color, background: m.bg }}>
      {m.label}
    </span>
  );
}

function StatusBadge({ value }) {
  const m = STATUS_META[value] || STATUS_META.PENDING;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full"
      style={{ color: m.color, background: m.bg }}>
      {m.label}
    </span>
  );
}

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

function ExpenseModal({ expense, onClose, onSaved, notify }) {
  const [form, setForm] = useState(expense ? {
    label: expense.label || '',
    category: expense.category || 'OTHER',
    amount: expense.amount || '',
    date: expense.date ? expense.date.slice(0, 10) : '',
    description: expense.description || '',
    payment_method: expense.payment_method || 'CASH',
    bank_account: expense.bank_account || '',
    status: expense.status || 'PENDING',
  } : { ...emptyForm });

  const [saving, setSaving] = useState(false);
  // Salary beneficiary
  const [staffType, setStaffType] = useState('TEACHER');
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [salaryPeriod, setSalaryPeriod] = useState('');
  // Bank accounts
  const [bankAccounts, setBankAccounts] = useState([]);
  // Receipt
  const [receiptFile, setReceiptFile] = useState(null);
  const fileRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Fetch staff list when SALARY category
  useEffect(() => {
    if (form.category !== 'SALARY') { setStaffList([]); return; }
    setLoadingStaff(true);
    const promise = staffType === 'TEACHER'
      ? teachersService.getAll({ page_size: 200 })
      : usersService.getAll({ user_type: 'STAFF', page_size: 200 });
    promise
      .then(d => setStaffList(d?.results || d || []))
      .catch(() => setStaffList([]))
      .finally(() => setLoadingStaff(false));
  }, [form.category, staffType]);

  // Fetch bank accounts when BANK_TRANSFER
  useEffect(() => {
    if (form.payment_method !== 'BANK_TRANSFER') return;
    financeService.getBankAccounts({ page_size: 50 })
      .then(d => setBankAccounts(d?.results || d || []))
      .catch(() => {});
  }, [form.payment_method]);

  // Auto-fill label when staff or period changes
  useEffect(() => {
    if (form.category !== 'SALARY' || !selectedStaff) return;
    const name = getPersonName(selectedStaff, staffType);
    const period = salaryPeriod ? ` – ${formatPeriod(salaryPeriod)}` : '';
    set('label', `Salaire${period} – ${name}`);
    if (salaryPeriod && !form.description) {
      set('description', `Paiement salaire ${formatPeriod(salaryPeriod)} – ${name}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStaff, salaryPeriod]);

  const handleCategoryChange = (cat) => {
    set('category', cat);
    if (cat !== 'SALARY') { setSelectedStaff(null); setSalaryPeriod(''); set('label', ''); }
  };

  const filteredStaff = staffList.filter(p =>
    !staffSearch || getPersonName(p, staffType).toLowerCase().includes(staffSearch.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.label.trim()) return notify('Le libellé est requis.', 'error');
    if (!form.amount || isNaN(form.amount) || parseFloat(form.amount) <= 0) return notify('Montant invalide.', 'error');
    if (!form.date) return notify('La date est requise.', 'error');
    if (form.category === 'SALARY' && !selectedStaff) return notify('Veuillez sélectionner un bénéficiaire.', 'error');
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.bank_account) delete payload.bank_account;

      if (receiptFile) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => { if (v !== '' && v != null) fd.append(k, v); });
        fd.append('receipt_file', receiptFile);
        await financeService.createExpenseWithFile(fd);
      } else if (expense?.id) {
        await financeService.updateExpense(expense.id, payload);
      } else {
        await financeService.createExpense(payload);
      }
      notify(expense?.id ? 'Dépense mise à jour.' : 'Dépense créée.', 'success');
      onSaved();
    } catch {
      notify('Une erreur est survenue.', 'error');
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
        className="rounded-2xl w-full max-w-lg shadow-2xl flex flex-col"
        style={{ background: '#fff', border: '1.5px solid #f0f4f9', maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #f0f4f9' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#fef2f2' }}>
              <Receipt size={18} color={COLOR} />
            </div>
            <h2 className="text-base font-bold text-slate-800">{expense ? 'Modifier la dépense' : 'Nouvelle dépense'}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors">
            <X size={16} color="#94a3b8" />
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1">

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Catégorie</label>
            <div className="relative">
              <select className="input-field appearance-none pr-8" value={form.category} onChange={e => handleCategoryChange(e.target.value)}>
                {Object.entries(CATEGORY_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
              </select>
              <ChevronDown size={14} color="#94a3b8" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* ── SALARY section ─────────────────────────────────────── */}
          {form.category === 'SALARY' && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: '#f5f3ff', border: '1.5px solid #ddd6fe' }}>
              <div className="flex items-center gap-2">
                <Users size={14} color="#7c3aed" />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7c3aed' }}>Bénéficiaire</span>
              </div>

              {/* Type tabs */}
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#ede9fe' }}>
                {[{ key: 'TEACHER', label: 'Enseignants' }, { key: 'STAFF', label: 'Personnel admin' }].map(t => (
                  <button key={t.key} type="button"
                    onClick={() => { setStaffType(t.key); setSelectedStaff(null); setStaffSearch(''); }}
                    className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: staffType === t.key ? '#fff' : 'transparent',
                      color: staffType === t.key ? '#7c3aed' : '#a78bfa',
                      boxShadow: staffType === t.key ? '0 1px 4px rgba(124,58,237,0.15)' : 'none',
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Selected person chip */}
              {selectedStaff ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#ede9fe', border: '1px solid #c4b5fd' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: '#7c3aed' }}>
                    {getPersonName(selectedStaff, staffType)[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{getPersonName(selectedStaff, staffType)}</p>
                    <p className="text-[11px] text-slate-500">{staffType === 'TEACHER' ? 'Enseignant' : 'Personnel admin'}</p>
                  </div>
                  <button type="button" onClick={() => { setSelectedStaff(null); set('label', ''); }}
                    className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/50 transition-colors">
                    <X size={13} color="#7c3aed" />
                  </button>
                </div>
              ) : (
                <>
                  {/* Search */}
                  <div className="relative">
                    <Search size={13} color="#a78bfa" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      className="input-field pl-8 text-sm"
                      placeholder={staffType === 'TEACHER' ? 'Rechercher un enseignant...' : 'Rechercher un membre du personnel...'}
                      value={staffSearch}
                      onChange={e => setStaffSearch(e.target.value)}
                    />
                  </div>
                  {/* List */}
                  <div className="max-h-40 overflow-y-auto rounded-xl" style={{ border: '1px solid #ddd6fe', background: '#fff' }}>
                    {loadingStaff ? (
                      <div className="flex justify-center py-5">
                        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#7c3aed transparent transparent transparent' }} />
                      </div>
                    ) : filteredStaff.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-5">Aucun résultat</p>
                    ) : (
                      filteredStaff.slice(0, 25).map((p, i) => (
                        <button key={p.id || i} type="button"
                          onClick={() => { setSelectedStaff(p); setStaffSearch(''); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-violet-50 transition-colors"
                          style={{ borderBottom: '1px solid #f5f3ff' }}>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ background: '#7c3aed' }}>
                            {getPersonName(p, staffType)[0]?.toUpperCase()}
                          </div>
                          <span className="text-sm text-slate-700">{getPersonName(p, staffType)}</span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}

              {/* Salary period */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: '#7c3aed' }}>
                  <Calendar size={11} />
                  Période de paiement
                </label>
                <input className="input-field" type="month" value={salaryPeriod} onChange={e => setSalaryPeriod(e.target.value)} />
              </div>
            </div>
          )}

          {/* Label */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Libellé</label>
            <input
              className="input-field"
              placeholder={form.category === 'SALARY' ? 'Auto-rempli après sélection du bénéficiaire' : 'Ex: Achat fournitures bureau'}
              value={form.label}
              onChange={e => set('label', e.target.value)}
            />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Montant (FCFA)</label>
              <input className="input-field" type="number" min="0" placeholder="0" value={form.amount} onChange={e => set('amount', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Date</label>
              <input className="input-field" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
          </div>

          {/* Payment method + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Mode de paiement</label>
              <div className="relative">
                <select className="input-field appearance-none pr-8" value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <ChevronDown size={14} color="#94a3b8" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Statut</label>
              <div className="relative">
                <select className="input-field appearance-none pr-8" value={form.status} onChange={e => set('status', e.target.value)}>
                  {Object.entries(STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
                </select>
                <ChevronDown size={14} color="#94a3b8" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Bank account (only for BANK_TRANSFER) */}
          {form.payment_method === 'BANK_TRANSFER' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Compte bancaire</label>
              <div className="relative">
                <select className="input-field appearance-none pr-8" value={form.bank_account} onChange={e => set('bank_account', e.target.value)}>
                  <option value="">-- Sélectionner un compte --</option>
                  {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.name} — {b.bank_name}</option>)}
                </select>
                <ChevronDown size={14} color="#94a3b8" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Receipt file */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Pièce justificative</label>
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors hover:bg-slate-50"
              style={{ border: '1.5px dashed #cbd5e1' }}
              onClick={() => fileRef.current?.click()}
            >
              {receiptFile ? (
                <>
                  <Paperclip size={16} color="#16a34a" />
                  <span className="text-sm text-slate-700 flex-1 truncate">{receiptFile.name}</span>
                  <button type="button" onClick={e => { e.stopPropagation(); setReceiptFile(null); }}
                    className="text-slate-400 hover:text-red-400">
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <Upload size={16} color="#94a3b8" />
                  <span className="text-sm text-slate-400">Cliquer pour joindre un fichier (PDF, image)</span>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
              onChange={e => setReceiptFile(e.target.files?.[0] || null)} />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Notes / Description</label>
            <textarea className="input-field resize-none" rows={3} placeholder="Détails supplémentaires..." value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors" style={{ border: '1.5px solid #f0f4f9' }}>
              Annuler
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors" style={{ background: saving ? '#fca5a5' : COLOR }}>
              {saving ? 'Enregistrement...' : (expense ? 'Mettre à jour' : 'Créer')}
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

function YearCompare({ label, curr, prev, currYear, prevYear }) {
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
            style={{ color: up ? '#ef4444' : '#16a34a', background: up ? '#fef2f2' : '#f0fdf4' }}>
            {up ? '▲' : '▼'} {Math.abs(p)}%
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-400">{prevYear}: {prev.toLocaleString('fr-FR')} FCFA</p>
    </div>
  );
}

export default function Expenses() {
  const { selectedSite } = useSite();
  const { notify } = useNotifications();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  const siteFilter = selectedSite !== 'all' ? { site: selectedSite } : {};
  const currentYear = new Date().getFullYear();
  const prevYear = currentYear - 1;

  const params = {
    search: search || undefined,
    category: filterCategory !== 'all' ? filterCategory : undefined,
    status: filterStatus !== 'all' ? filterStatus : undefined,
    month: filterMonth || undefined,
    page,
    ...siteFilter,
  };

  const { data: expensesData, loading, execute: reload } = useApi(
    () => financeService.getExpenses(params),
    [search, filterCategory, filterStatus, filterMonth, page, selectedSite],
    true
  );

  const { data: cyData } = useApi(
    () => financeService.getExpenses({ year: currentYear, page_size: 500, ...siteFilter }),
    [selectedSite],
    true
  );
  const { data: pyData } = useApi(
    () => financeService.getExpenses({ year: prevYear, page_size: 500, ...siteFilter }),
    [selectedSite],
    true
  );

  const expenses = expensesData?.results || expensesData || [];
  const total = expensesData?.count || expenses.length;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const cyExpenses = cyData?.results || cyData || [];
  const pyExpenses = pyData?.results || pyData || [];
  const cyTotal = cyExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const pyTotal = pyExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  const now = new Date();
  const thisYear = now.getFullYear();
  const yearExpenses = cyExpenses; // already fetched for current year
  const yearAmount = cyTotal;
  const totalAmount = expensesData?.count !== undefined
    ? parseFloat(expensesData.total_amount ?? 0) || expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0)
    : expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const approvedCount = expenses.filter(e => e.status === 'APPROVED' || e.status === 'PAID').length;
  const pendingCount = expenses.filter(e => e.status === 'PENDING').length;

  const handleExportExcel = () => {
    const rows = expenses.map(e => ({
      'Libellé': e.label || '',
      'Catégorie': CATEGORY_META[e.category]?.label || e.category || '',
      'Montant (FCFA)': parseFloat(e.amount || 0),
      'Date': e.date ? new Date(e.date).toLocaleDateString('fr-FR') : '',
      'Mode de paiement': PAYMENT_METHODS.find(m => m.value === e.payment_method)?.label || e.payment_method || '',
      'Statut': STATUS_META[e.status]?.label || e.status || '',
      'Description': e.description || '',
    }));
    const now = new Date().toISOString().slice(0, 10);
    exportToExcel(
      rows,
      ['Libellé', 'Catégorie', 'Montant (FCFA)', 'Date', 'Mode de paiement', 'Statut', 'Description'],
      `depenses-${now}`,
      'Dépenses'
    );
  };

  const handleExportPDF = () => {
    const cols = ['Libelle', 'Categorie', 'Montant (FCFA)', 'Date', 'Paiement', 'Statut'];
    const rows = expenses.map(e => [
      e.label || '-',
      CATEGORY_META[e.category]?.label || e.category || '-',
      fmtPDF(e.amount) + ' FCFA',
      e.date ? new Date(e.date).toLocaleDateString('fr-FR') : '-',
      PAYMENT_METHODS.find(m => m.value === e.payment_method)?.label || e.payment_method || '-',
      STATUS_META[e.status]?.label || e.status || '-',
    ]);
    const now = new Date().toISOString().slice(0, 10);
    exportToPDF('Rapport des depenses', cols, rows, `depenses-${now}`, {
      'Export du': new Date().toLocaleDateString('fr-FR'),
      'Depenses': expenses.length,
      'Montant total': fmtPDF(totalAmount) + ' FCFA',
      'Approuvees / Payees': approvedCount,
      'En attente': pendingCount,
    });
  };

  const handleApprove = async (id) => {
    try {
      await financeService.approveExpense(id);
      notify('Dépense approuvée.', 'success');
      reload();
    } catch {
      notify('Erreur lors de l\'approbation.', 'error');
    }
  };

  const handleDelete = (expense) => {
    setConfirmModal({
      message: `Supprimer la dépense "${expense.label}" ?`,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await financeService.deleteExpense(expense.id);
          notify('Dépense supprimée.', 'success');
          reload();
        } catch {
          notify('Erreur lors de la suppression.', 'error');
        }
      },
    });
  };

  const kpis = [
    { label: `Dépenses ${thisYear}`, value: yearExpenses.length, icon: <Receipt size={20} color={COLOR} />, bg: '#fef2f2' },
    { label: 'Montant total', value: parseFloat(totalAmount).toLocaleString('fr-FR') + ' FCFA', icon: <DollarSign size={20} color={COLOR} />, bg: '#fef2f2' },
    { label: 'Approuvées / Payées', value: approvedCount, icon: <CheckCircle size={20} color="#16a34a" />, bg: '#f0fdf4' },
    { label: 'En attente', value: pendingCount, icon: <MoreHorizontal size={20} color="#d97706" />, bg: '#fffbeb' },
  ];

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(thisYear, i, 1);
    return { value: `${thisYear}-${String(i + 1).padStart(2, '0')}`, label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) };
  });

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Dépenses"
        subtitle="Gestion des dépenses et charges"
        icon={Receipt}
        iconColor={COLOR}
        iconBg="#fef2f2"
        action={
          <div className="flex items-center gap-2">
            <ExportMenu color={COLOR} onExcel={handleExportExcel} onPDF={handleExportPDF} disabled={expenses.length === 0} />
            <PrimaryButton icon={Plus} label="Nouvelle dépense" color={COLOR} onClick={() => { setEditing(null); setShowModal(true); }} />
          </div>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
      {(cyExpenses.length > 0 || pyExpenses.length > 0) && (
        <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: '#fff', border: '1.5px solid #f0f4f9' }}>
          <div className="flex items-center gap-2">
            <TrendingUp size={15} color="#7c3aed" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Comparaison annuelle — {prevYear} vs {currentYear}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <YearCompare label={`Dépenses ${currentYear}`} curr={cyTotal} prev={pyTotal} currYear={currentYear} prevYear={prevYear} />
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Évolution</p>
              <div className="flex items-end gap-2 flex-wrap">
                {pyTotal > 0 ? (
                  <>
                    <span className="text-base font-black" style={{ color: cyTotal >= pyTotal ? '#ef4444' : '#16a34a' }}>
                      {cyTotal >= pyTotal ? '+' : '-'}{Math.abs(cyTotal - pyTotal).toLocaleString('fr-FR')} FCFA
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ color: cyTotal >= pyTotal ? '#ef4444' : '#16a34a', background: cyTotal >= pyTotal ? '#fef2f2' : '#f0fdf4' }}>
                      {cyTotal >= pyTotal ? '▲' : '▼'} {Math.abs(pct(cyTotal, pyTotal))}%
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-slate-400">Pas de données {prevYear}</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">{cyExpenses.length} dépenses en {currentYear} · {pyExpenses.length} en {prevYear}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <FilterBar>
        <SearchInput value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Rechercher une dépense..." />
        <FilterSelect value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }}>
          <option value="all">Toutes catégories</option>
          {Object.entries(CATEGORY_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
        </FilterSelect>
        <FilterSelect value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="all">Tous statuts</option>
          {Object.entries(STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
        </FilterSelect>
        <FilterSelect value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setPage(1); }}>
          <option value="">Tous les mois</option>
          {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </FilterSelect>
      </FilterBar>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1.5px solid #f0f4f9' }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${COLOR} transparent transparent transparent` }} />
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#fef2f2' }}>
              <Receipt size={28} color={COLOR} />
            </div>
            <p className="text-sm text-slate-400 font-medium">Aucune dépense trouvée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'linear-gradient(135deg,#fafbff,#f8fafc)', borderBottom: '1px solid #f0f4f9' }}>
                {['Libellé', 'Catégorie', 'Montant', 'Date', 'Mode paiement', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp, idx) => (
                <tr key={exp.id}
                  className="transition-colors cursor-default"
                  style={{ background: idx % 2 === 0 ? '#fafbff' : 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fafbff' : 'transparent'}
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-slate-800">{exp.label}</span>
                    {exp.description && <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[180px]">{exp.description}</p>}
                  </td>
                  <td className="px-4 py-3"><CategoryBadge value={exp.category} /></td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-black" style={{ color: COLOR }}>{parseFloat(exp.amount || 0).toLocaleString('fr-FR')} FCFA</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{exp.date ? new Date(exp.date).toLocaleDateString('fr-FR') : '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {PAYMENT_METHODS.find(m => m.value === exp.payment_method)?.label || exp.payment_method || '—'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge value={exp.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {exp.status === 'PENDING' && (
                        <IconBtn icon={CheckCircle} color="#16a34a" hoverBg="#f0fdf4" title="Approuver" onClick={() => handleApprove(exp.id)} />
                      )}
                      <IconBtn icon={Edit} color="#64748b" hoverBg="#f8fafc" title="Modifier" onClick={() => { setEditing(exp); setShowModal(true); }} />
                      <IconBtn icon={Trash2} color="#ef4444" hoverBg="#fef2f2" title="Supprimer" onClick={() => handleDelete(exp)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} color={COLOR} />
      )}

      {showModal && (
        <ExpenseModal
          expense={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); reload(); }}
          notify={notify}
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
