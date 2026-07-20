import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Landmark, Plus, Edit, Trash2, Power, DollarSign, CreditCard, X, AlertTriangle, Building2 } from 'lucide-react';
import { financeService } from '../../services';
import { useApi } from '../../hooks/useApi';
import { useNotifications } from '../../components/Notifications';
import { useSite } from '../../contexts/SiteContext';
import {
  PageHeader, FilterBar, SearchInput, PrimaryButton, IconBtn
} from '../../components/ui/PageHeader';

const COLOR = '#2563eb';

const ACCOUNT_TYPES = [
  { value: 'CHECKING',   label: 'Courant' },
  { value: 'SAVINGS',    label: 'Épargne' },
  { value: 'PAYROLL',    label: 'Salaires' },
  { value: 'INVESTMENT', label: 'Investissement' },
];

const TYPE_META = {
  CHECKING:   { label: 'Courant',        color: '#2563eb', bg: '#eff6ff' },
  SAVINGS:    { label: 'Épargne',        color: '#16a34a', bg: '#f0fdf4' },
  PAYROLL:    { label: 'Salaires',       color: '#d97706', bg: '#fffbeb' },
  INVESTMENT: { label: 'Investissement', color: '#7c3aed', bg: '#f5f3ff' },
};

const emptyForm = {
  name: '', bank: '', account_number: '', iban: '', swift: '',
  type: 'CHECKING', initial_balance: '0', currency: 'FCFA', is_active: true,
};

function maskAccount(num) {
  if (!num) return '—';
  if (num.length <= 4) return num;
  return '****' + num.slice(-4);
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

function AccountModal({ account, onClose, onSaved, notify }) {
  const [form, setForm] = useState(account ? {
    name: account.name || '',
    bank: account.bank || '',
    account_number: account.account_number || '',
    iban: account.iban || '',
    swift: account.swift || '',
    type: account.type || 'CHECKING',
    initial_balance: account.initial_balance ?? account.balance ?? '0',
    currency: account.currency || 'FCFA',
    is_active: account.is_active !== false,
  } : { ...emptyForm });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return notify({ type: 'error', title: 'Erreur', message: 'Le nom est requis.', time: 'À l\'instant' });
    if (!form.bank.trim()) return notify({ type: 'error', title: 'Erreur', message: 'Le nom de la banque est requis.', time: 'À l\'instant' });
    if (!form.account_number.trim()) return notify({ type: 'error', title: 'Erreur', message: 'Le numéro de compte est requis.', time: 'À l\'instant' });
    setSaving(true);
    try {
      if (account?.id) {
        await financeService.updateBankAccount(account.id, form);
        notify({ type: 'success', title: 'Succès', message: 'Compte mis à jour.', time: 'À l\'instant' });
      } else {
        await financeService.createBankAccount(form);
        notify({ type: 'success', title: 'Succès', message: 'Compte créé.', time: 'À l\'instant' });
      }
      onSaved();
    } catch {
      notify({ type: 'error', title: 'Erreur', message: 'Une erreur est survenue.', time: 'À l\'instant' });
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 9999 }}>
      <div className="rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" style={{ background: '#fff', border: '1.5px solid #f0f4f9' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #f0f4f9' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#eff6ff' }}>
              <Landmark size={18} color={COLOR} />
            </div>
            <h2 className="text-base font-bold text-slate-800">{account ? 'Modifier le compte' : 'Nouveau compte bancaire'}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors">
            <X size={16} color="#94a3b8" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Nom du compte</label>
              <input className="input-field" placeholder="Ex: Compte principal" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Banque</label>
              <input className="input-field" placeholder="Ex: BICICI" value={form.bank} onChange={e => set('bank', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Numéro de compte</label>
            <input className="input-field" placeholder="Ex: 0123456789" value={form.account_number} onChange={e => set('account_number', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">IBAN</label>
              <input className="input-field" placeholder="Ex: CI00..." value={form.iban} onChange={e => set('iban', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">SWIFT / BIC</label>
              <input className="input-field" placeholder="Ex: BICIABAB" value={form.swift} onChange={e => set('swift', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Type de compte</label>
              <select className="input-field" value={form.type} onChange={e => set('type', e.target.value)}>
                {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Devise</label>
              <input className="input-field" placeholder="FCFA" value={form.currency} onChange={e => set('currency', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Solde initial</label>
            <input className="input-field" type="number" min="0" placeholder="0" value={form.initial_balance} onChange={e => set('initial_balance', e.target.value)} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors" style={{ border: '1.5px solid #f0f4f9' }}>
              Annuler
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors" style={{ background: saving ? '#93c5fd' : COLOR }}>
              {saving ? 'Enregistrement...' : (account ? 'Mettre à jour' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function AccountCard({ account, onEdit, onToggle, onDelete }) {
  const balance = parseFloat(account.balance ?? account.initial_balance ?? 0);
  const typeMeta = TYPE_META[account.type] || TYPE_META.CHECKING;

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: '#fff', border: '1.5px solid #f0f4f9' }}>
      {/* Header gradient */}
      <div className="px-5 py-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
          <Building2 size={20} color="#fff" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{account.name}</p>
          <p className="text-[11px] text-blue-100">{account.bank}</p>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: account.is_active ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', color: '#fff' }}>
          {account.is_active ? 'Actif' : 'Inactif'}
        </span>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Solde</span>
          <span className="text-xl font-black" style={{ color: balance >= 0 ? '#16a34a' : '#ef4444' }}>
            {balance.toLocaleString('fr-FR')} {account.currency || 'FCFA'}
          </span>
        </div>
        <div className="space-y-2" style={{ borderTop: '1px solid #f0f4f9', paddingTop: '12px' }}>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 font-medium">N° compte</span>
            <span className="font-bold text-slate-700 font-mono">{maskAccount(account.account_number)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 font-medium">Type</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ color: typeMeta.color, background: typeMeta.bg }}>
              {typeMeta.label}
            </span>
          </div>
          {account.iban && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">IBAN</span>
              <span className="font-mono text-slate-600 text-[11px]">{account.iban}</span>
            </div>
          )}
          {account.swift && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">SWIFT</span>
              <span className="font-mono text-slate-600 text-[11px]">{account.swift}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 flex items-center gap-2" style={{ borderTop: '1px solid #f0f4f9' }}>
        <button onClick={() => onEdit(account)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          style={{ border: '1px solid #f0f4f9' }}>
          <Edit size={13} /> Modifier
        </button>
        <button onClick={() => onToggle(account)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            border: `1px solid ${account.is_active ? '#fef2f2' : '#f0fdf4'}`,
            color: account.is_active ? '#ef4444' : '#16a34a',
            background: account.is_active ? '#fef2f2' : '#f0fdf4',
          }}>
          <Power size={13} /> {account.is_active ? 'Désactiver' : 'Activer'}
        </button>
        <button onClick={() => onDelete(account)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ border: '1px solid #fef2f2', color: '#ef4444', background: '#fef2f2' }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

export default function BankAccounts() {
  const { selectedSite } = useSite();
  const { notify } = useNotifications();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  const siteFilter = selectedSite !== 'all' ? { site: selectedSite } : {};

  const { data: accountsData, loading, execute: reload } = useApi(
    () => financeService.getBankAccounts({ search: search || undefined, ...siteFilter }),
    [search, selectedSite],
    true
  );

  const accounts = accountsData?.results || accountsData || [];
  const activeCount = accounts.filter(a => a.is_active).length;
  const totalBalance = accounts.reduce((s, a) => s + parseFloat(a.balance ?? a.initial_balance ?? 0), 0);

  const handleToggle = (account) => {
    const action = account.is_active ? 'désactiver' : 'activer';
    setConfirmModal({
      message: `Voulez-vous ${action} le compte "${account.name}" ?`,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await financeService.updateBankAccount(account.id, { is_active: !account.is_active });
          notify({ type: 'success', title: 'Succès', message: `Compte ${account.is_active ? 'désactivé' : 'activé'}.`, time: 'À l\'instant' });
          reload();
        } catch {
          notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la mise à jour.', time: 'À l\'instant' });
        }
      },
    });
  };

  const handleDelete = (account) => {
    setConfirmModal({
      message: `Supprimer le compte "${account.name}" ? Cette action est irréversible.`,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await financeService.deleteBankAccount(account.id);
          notify({ type: 'success', title: 'Succès', message: 'Compte supprimé.', time: 'À l\'instant' });
          reload();
        } catch {
          notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la suppression.', time: 'À l\'instant' });
        }
      },
    });
  };

  const kpis = [
    { label: 'Comptes enregistrés', value: accounts.length, icon: <Landmark size={20} color={COLOR} />, bg: '#eff6ff' },
    { label: 'Solde total', value: totalBalance.toLocaleString('fr-FR') + ' FCFA', icon: <DollarSign size={20} color={COLOR} />, bg: '#eff6ff' },
    { label: 'Comptes actifs', value: activeCount, icon: <CreditCard size={20} color="#16a34a" />, bg: '#f0fdf4' },
  ];

  const filtered = search
    ? accounts.filter(a => a.name?.toLowerCase().includes(search.toLowerCase()) || a.bank?.toLowerCase().includes(search.toLowerCase()))
    : accounts;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Comptes Bancaires"
        subtitle="Gestion des comptes et soldes"
        icon={Landmark}
        iconColor={COLOR}
        iconBg="#eff6ff"
        action={<PrimaryButton icon={Plus} label="Nouveau compte" color={COLOR} onClick={() => { setEditing(null); setShowModal(true); }} />}
      />

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

      {/* Search */}
      <FilterBar>
        <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un compte ou une banque..." />
      </FilterBar>

      {/* Cards grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${COLOR} transparent transparent transparent` }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 rounded-2xl" style={{ background: '#fff', border: '1.5px solid #f0f4f9' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#eff6ff' }}>
            <Landmark size={28} color={COLOR} />
          </div>
          <p className="text-sm text-slate-400 font-medium">Aucun compte bancaire trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(account => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={a => { setEditing(a); setShowModal(true); }}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showModal && (
        <AccountModal
          account={editing}
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
