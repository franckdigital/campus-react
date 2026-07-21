import { useState } from 'react';
import { DollarSign, CheckCircle, AlertCircle, Clock, RefreshCw, CreditCard, Smartphone } from 'lucide-react';
import { studentsService } from '../../services/students';
import { financeService } from '../../services/finance';
import configService from '../../services/configs';
import { useApi } from '../../hooks/useApi';

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="h-10 w-10 rounded-full border-[3px] animate-spin"
           style={{ borderColor: '#fffbeb', borderTopColor: '#d97706' }} />
      <p className="text-sm font-semibold" style={{ color: '#64748b' }}>Chargement…</p>
    </div>
  );
}

const INVOICE_STATUS = {
  PENDING: { label: 'En attente', color: '#d97706', bg: '#fffbeb' },
  PARTIAL: { label: 'Partiel', color: '#0891b2', bg: '#ecfeff' },
  PAID: { label: 'Payé', color: '#059669', bg: '#f0fdf4' },
  OVERDUE: { label: 'En retard', color: '#dc2626', bg: '#fef2f2' },
  CANCELLED: { label: 'Annulé', color: '#64748b', bg: '#f8fafc' },
};

const PAYMENT_STATUS = {
  PENDING: { label: 'En attente', color: '#d97706', bg: '#fffbeb' },
  VALIDATED: { label: 'Validé', color: '#059669', bg: '#f0fdf4' },
  REJECTED: { label: 'Rejeté', color: '#dc2626', bg: '#fef2f2' },
};

export default function StudentFinances() {
  const [tab, setTab] = useState('resume');

  const { data: profile, loading: loadProfile } = useApi(
    () => studentsService.getMe(), [], true
  );
  const studentId = profile?.id;

  // Live totals derived from actual invoices (same endpoint the admin dossier
  // and mobile app use) instead of profile.total_paid/tuition_fee/remaining_balance,
  // which are static snapshot columns never reconciled with real invoice data
  // and silently drift out of sync (e.g. after a payment is validated).
  const { data: summary, loading: loadSummary } = useApi(
    () => studentId ? financeService.getStudentFinancialSummary(studentId) : Promise.resolve(null),
    [studentId], !!studentId
  );

  const { data: invoicesData, loading: loadInvoices, execute: refresh } = useApi(
    () => studentId ? financeService.getInvoices({ student: studentId, page_size: 50 }) : Promise.resolve([]),
    [studentId], !!studentId
  );

  const { data: paymentsData, loading: loadPayments } = useApi(
    () => studentId ? financeService.getPayments({ student: studentId, page_size: 50 }) : Promise.resolve([]),
    [studentId], !!studentId
  );

  // Admin-configured Mobile Money receiving number (Settings > Finance) —
  // shown read-only here so students know where to send their payment
  // instead of guessing/asking around.
  const { data: publicConfigs } = useApi(() => configService.getPublic(), [], true);
  const defaultPaymentMethod = publicConfigs?.find(c => c.key === 'default_payment_method')?.value;
  const mobileMoneyNumber    = publicConfigs?.find(c => c.key === 'mobile_money_number')?.value;

  const invoices = Array.isArray(invoicesData) ? invoicesData : (invoicesData?.results || []);
  const payments = Array.isArray(paymentsData) ? paymentsData : (paymentsData?.results || []);

  const paid = parseFloat(summary?.total_paid || 0);
  const tuition = parseFloat(summary?.configured_tuition_fee ?? summary?.tuition_fee ?? 0);
  const balance = parseFloat(summary?.remaining_balance || 0);
  const pct = tuition > 0 ? Math.min(100, Math.round((paid / tuition) * 100)) : 0;
  const isEnrolled = summary?.is_enrolled ?? profile?.is_enrolled;
  const minEnrollmentPayment = parseFloat(summary?.min_enrollment_payment ?? 0);
  const enrollRemaining = Math.max(0, minEnrollmentPayment - paid);

  if (loadProfile || loadSummary) return <Spinner />;

  const TABS = [
    { id: 'resume', label: 'Résumé' },
    { id: 'invoices', label: `Factures (${invoices.length})` },
    { id: 'payments', label: `Paiements (${payments.length})` },
  ];

  return (
    <div className="space-y-6 animate-fade-in">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold" style={{ color: '#0f172a' }}>Mes finances</h1>
          <p className="text-sm" style={{ color: '#64748b' }}>Scolarité et paiements</p>
        </div>
        <button onClick={() => refresh()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
          style={{ background: '#f1f5f9', color: '#64748b' }}>
          <RefreshCw className="h-3.5 w-3.5" /> Actualiser
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#f8fafc', width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={tab === t.id
              ? { background: '#fff', color: '#1e293b', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
              : { color: '#64748b' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'resume' && (
        <div className="space-y-4">
          {/* Inscription status */}
          <div className="flex items-center gap-3 p-4 rounded-2xl"
               style={isEnrolled
                 ? { background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1.5px solid #bbf7d0' }
                 : { background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: '1.5px solid #fde68a' }}>
            <div className="h-10 w-10 rounded-xl flex items-center justify-center"
                 style={{ background: isEnrolled ? '#059669' : '#d97706' }}>
              {isEnrolled
                ? <CheckCircle className="h-5 w-5 text-white" />
                : <AlertCircle className="h-5 w-5 text-white" />}
            </div>
            <div>
              <p className="text-sm font-extrabold" style={{ color: isEnrolled ? '#065f46' : '#92400e' }}>
                {isEnrolled ? 'Inscription validée' : 'Inscription en attente'}
              </p>
              <p className="text-xs" style={{ color: isEnrolled ? '#047857' : '#b45309' }}>
                {isEnrolled
                  ? `Scolarité : ${paid.toLocaleString('fr-FR')} F CFA payés`
                  : `Seuil d'inscription : ${minEnrollmentPayment.toLocaleString('fr-FR')} F CFA — reste ${enrollRemaining.toLocaleString('fr-FR')} F CFA`}
              </p>
            </div>
          </div>

          {/* Financial progress */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-extrabold" style={{ color: '#0f172a' }}>Scolarité</h2>
              <span className="text-sm font-extrabold" style={{ color: pct === 100 ? '#059669' : '#d97706' }}>
                {pct}% réglé
              </span>
            </div>
            <div className="h-3 rounded-full overflow-hidden mb-4" style={{ background: '#f1f5f9' }}>
              <div className="h-full rounded-full transition-all"
                   style={{
                     width: `${pct}%`,
                     background: pct === 100 ? 'linear-gradient(90deg,#059669,#34d399)' : 'linear-gradient(90deg,#d97706,#fbbf24)'
                   }} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total', value: `${tuition.toLocaleString('fr-FR')} F`, color: '#1e293b', bg: '#f8fafc' },
                { label: 'Payé', value: `${paid.toLocaleString('fr-FR')} F`, color: '#059669', bg: '#f0fdf4' },
                { label: 'Reste', value: balance > 0 ? `${balance.toLocaleString('fr-FR')} F` : 'Soldé', color: balance > 0 ? '#ef4444' : '#059669', bg: balance > 0 ? '#fef2f2' : '#f0fdf4' },
              ].map((item, i) => (
                <div key={i} className="text-center p-3 rounded-xl" style={{ background: item.bg }}>
                  <p className="text-lg font-extrabold" style={{ color: item.color }}>{item.value}</p>
                  <p className="text-[10px] font-semibold mt-0.5" style={{ color: '#94a3b8' }}>{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Money payment instructions — only relevant while a
              balance is due and the school has configured this as its
              default payment method (Settings > Finance, admin). */}
          {balance > 0 && defaultPaymentMethod === 'Mobile Money' && mobileMoneyNumber && (
            <div className="card p-6" style={{ background: 'linear-gradient(135deg,#eff6ff,#f5f3ff)', border: '1.5px solid #bfdbfe' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#dbeafe' }}>
                  <Smartphone className="h-4 w-4" style={{ color: '#2563eb' }} />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold" style={{ color: '#1e3a8a' }}>Paiement par Mobile Money</h2>
                  <p className="text-xs" style={{ color: '#3b82f6' }}>Envoyez votre paiement au numéro ci-dessous</p>
                </div>
              </div>
              <label className="block text-[11px] font-bold mb-1.5" style={{ color: '#64748b' }}>Numéro destinataire</label>
              <input type="text" value={mobileMoneyNumber} readOnly
                     className="w-full px-4 py-3 rounded-xl text-base font-black tracking-wide"
                     style={{ background: 'white', border: '1.5px solid #bfdbfe', color: '#1e3a8a', cursor: 'default' }} />
            </div>
          )}
        </div>
      )}

      {tab === 'invoices' && (
        loadInvoices ? <Spinner /> :
        invoices.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-16 w-16 rounded-2xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg,#fffbeb,#fef3c7)' }}>
              <DollarSign className="h-8 w-8" style={{ color: '#d97706' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: '#475569' }}>Aucune facture</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map(inv => {
              const s = INVOICE_STATUS[inv.status] || INVOICE_STATUS.PENDING;
              return (
                <div key={inv.id} className="card p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                       style={{ background: s.bg }}>
                    <DollarSign className="h-5 w-5" style={{ color: s.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold truncate" style={{ color: '#1e293b' }}>
                      {inv.reference || `Facture #${inv.id?.toString().slice(0, 8)}`}
                    </p>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>
                      {inv.due_date ? `Échéance : ${new Date(inv.due_date).toLocaleDateString('fr-FR')}` : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-extrabold" style={{ color: '#1e293b' }}>
                      {parseFloat(inv.total_amount || inv.amount || 0).toLocaleString('fr-FR')} F
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: s.bg, color: s.color }}>
                      {s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {tab === 'payments' && (
        loadPayments ? <Spinner /> :
        payments.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-16 w-16 rounded-2xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg,#fffbeb,#fef3c7)' }}>
              <CreditCard className="h-8 w-8" style={{ color: '#d97706' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: '#475569' }}>Aucun paiement enregistré</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map(p => {
              const s = PAYMENT_STATUS[p.status] || PAYMENT_STATUS.PENDING;
              return (
                <div key={p.id} className="card p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                       style={{ background: s.bg }}>
                    <CreditCard className="h-5 w-5" style={{ color: s.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold" style={{ color: '#1e293b' }}>
                      {p.payment_method_name || p.payment_method || 'Paiement'}
                    </p>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>
                      {p.payment_date ? new Date(p.payment_date).toLocaleDateString('fr-FR') : '—'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-extrabold" style={{ color: '#059669' }}>
                      +{parseFloat(p.amount || 0).toLocaleString('fr-FR')} F
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: s.bg, color: s.color }}>
                      {s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
