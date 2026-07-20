import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Wallet, Plus, Edit, Trash2, DollarSign, CreditCard, TrendingUp, Download,
  X, CheckCircle, Upload, FileText, Image as ImageIcon, User, History,
  Receipt, ArrowRight, Paperclip, Search, ChevronDown, ChevronRight,
  Tag, Landmark, ArrowUpRight, ArrowDownLeft, Lock, Unlock,
  RotateCcw, AlertCircle, HelpCircle, Eye, Phone, Smartphone, Hash, Calendar
} from 'lucide-react';
import { financeService, studentsService, academicService } from '../../services';
import { useApi } from '../../hooks/useApi';
import { useNotifications } from '../../components/Notifications';
import { useSite } from '../../contexts/SiteContext';
import {
  PageHeader, FilterBar, SearchInput, FilterSelect, PrimaryButton,
  IconBtn, Pagination
} from '../../components/ui/PageHeader';

const COLOR = '#d97706';
const COLOR_BG = '#fffbeb';
const COLOR_ICON = '#fef3c7';
const ITEMS_PER_PAGE = 10;

const TABS = [
  { id: 'factures',   label: 'Factures',        icon: Receipt },
  { id: 'paiements',  label: 'Paiements',        icon: CreditCard },
  { id: 'frais',      label: 'Types de frais',   icon: Tag },
  { id: 'tresorerie', label: 'Trésorerie',        icon: Landmark },
];

const INV_STATUS = {
  DRAFT:     { label: 'Brouillon',   color: '#64748b', bg: '#f1f5f9' },
  SENT:      { label: 'Envoyée',     color: '#2563eb', bg: '#dbeafe' },
  PARTIAL:   { label: 'Partiel',     color: '#7c3aed', bg: '#f5f3ff' },
  PAID:      { label: 'Payée',       color: '#059669', bg: '#d1fae5' },
  OVERDUE:   { label: 'En retard',   color: '#ef4444', bg: '#fee2e2' },
  CANCELLED: { label: 'Annulée',     color: '#94a3b8', bg: '#f8fafc' },
  PENDING:   { label: 'En attente',  color: '#d97706', bg: '#fef3c7' },
  SUCCESS:   { label: 'Validé',      color: '#059669', bg: '#d1fae5' },
};

function Badge({ status }) {
  const s = status?.toUpperCase();
  const cfg = INV_STATUS[s] || { label: status || '—', color: '#64748b', bg: '#f1f5f9' };
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap"
          style={{ color: cfg.color, background: cfg.bg }}>
      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

export default function Finance() {
  const { selectedSite } = useSite();
  const { notify } = useNotifications();

  // ── Tab ─────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('factures');
  const [showWorkflow, setShowWorkflow] = useState(false);

  // ── Shared ──────────────────────────────────────────────────────
  const [confirmModal, setConfirmModal] = useState(null);
  const siteFilter = selectedSite !== 'all' ? { site: selectedSite } : {};

  // ── Invoice tab state ────────────────────────────────────────────
  const [searchTerm, setSearchTerm]         = useState('');
  const [filterStatus, setFilterStatus]     = useState('all');
  const [currentPage, setCurrentPage]       = useState(1);
  const [actionModal, setActionModal]       = useState(null);
  const [showInvModal, setShowInvModal]     = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [showPayModal, setShowPayModal]     = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoicePayments, setInvoicePayments] = useState([]);
  const [loadingInvPays, setLoadingInvPays] = useState(false);
  const [newPayAmt, setNewPayAmt]           = useState('');
  const [newPayMethod, setNewPayMethod]     = useState('cash');
  const [newPayProof, setNewPayProof]       = useState(null);
  const [editingPay, setEditingPay]         = useState(null);
  const [editPayAmt, setEditPayAmt]         = useState('');
  const [editPayMethod, setEditPayMethod]   = useState('');
  const [paymentProof, setPaymentProof]     = useState(null);
  const [studentSearch, setStudentSearch]   = useState('');
  const [showStudentDrop, setShowStudentDrop] = useState(false);
  const studentDropRef = useRef(null);
  const invModalRef    = useRef(null);
  const [invForm, setInvForm] = useState({
    student_id: '', tuition_fee: '', amount: '', registration_fee: '',
    is_registration: false, description: '', payment_date: '', payment_method: 'cash',
  });

  // ── Payments tab state ────────────────────────────────────────────
  const [pSearch, setPSearch]   = useState('');
  const [pStatus, setPStatus]   = useState('');
  const [pPage, setPPage]       = useState(1);
  const [payDetailModal, setPayDetailModal] = useState(null); // Payment being inspected (proof + submitted details) before validation

  // ── Fee types tab state ───────────────────────────────────────────
  const [showFtModal, setShowFtModal]   = useState(false);
  const [editingFt, setEditingFt]       = useState(null);
  const [ftForm, setFtForm] = useState({ name: '', code: '', description: '', default_amount: '', is_recurring: false });

  // ── Treasury tab state ────────────────────────────────────────────
  const [selectedReg, setSelectedReg]   = useState(null);
  const [tSessionModal, setTSessionModal] = useState(null); // 'open' | 'close'
  const [openingBal, setOpeningBal]     = useState('');
  const [closingBal, setClosingBal]     = useState('');
  const [closeNotes, setCloseNotes]     = useState('');
  const [reportDate, setReportDate]     = useState(new Date().toISOString().split('T')[0]);

  // ── Data fetches ──────────────────────────────────────────────────
  const { data: academicYears } = useApi(() => academicService.getAcademicYears(), [], true);
  const currentAY = academicYears?.results?.find(y => y.is_current) || academicYears?.find?.(y => y.is_current) || academicYears?.[0];

  const { data: paymentMethodsData, execute: fetchPaymentMethods } = useApi(() => financeService.getPaymentMethods(), [], true);
  const paymentMethodsList = paymentMethodsData?.results || paymentMethodsData || [];

  // Maps the payment-method select value (used in the invoice/payment forms) to the
  // canonical PaymentMethod record. Methods are auto-created on first use since the
  // backend only seeds a subset (or none) of these codes.
  const PAYMENT_METHOD_DEFS = {
    cash: { code: 'CASH', name: 'Espèces', is_online: false },
    check: { code: 'CHECK', name: 'Chèque', is_online: false },
    bank_transfer: { code: 'VIREMENT', name: 'Virement bancaire', is_online: false },
    mobile_money: { code: 'MOBILE_MONEY', name: 'Mobile Money', is_online: true },
    card: { code: 'CARD', name: 'Carte bancaire', is_online: true },
  };

  const getOrCreatePaymentMethod = async (value) => {
    const def = PAYMENT_METHOD_DEFS[value] || PAYMENT_METHOD_DEFS.cash;
    let method = paymentMethodsList.find(m => m.code?.toUpperCase() === def.code);
    if (!method) {
      method = await financeService.createPaymentMethod(def);
      fetchPaymentMethods();
    }
    return method;
  };

  const { data: students } = useApi(
    () => studentsService.getAll({ status: 'ACTIVE', ...siteFilter }),
    [selectedSite], true
  );
  const studentsList = students?.results || students || [];

  // The UI displays invoice numbers as "#INV-..." — a user copy-pasting that
  // label into the search box would otherwise search for a literal "#" that
  // doesn't exist in the stored invoice_number, always returning nothing.
  const cleanSearch = (s) => (s || '').trim().replace(/^#/, '');

  // Invoices — server-side paginated (there can be far more than one page's
  // worth), so the table only ever fetches the current page's rows.
  const { data: invoicesData, loading: loadingInvoices, execute: fetchInvoices } = useApi(
    () => financeService.getInvoices({
      search: cleanSearch(searchTerm),
      status: filterStatus !== 'all' ? filterStatus.toUpperCase() : undefined,
      ...siteFilter,
      page: currentPage,
      page_size: ITEMS_PER_PAGE,
    }),
    [searchTerm, filterStatus, selectedSite, currentPage], true
  );
  const invoicesList = invoicesData?.results || (Array.isArray(invoicesData) ? invoicesData : []);
  const invoicesCount = invoicesData?.count ?? invoicesList.length;

  // Unpaginated (same filters, no page cap) — used only for the KPI totals
  // below, which must reflect every matching invoice, not just the current
  // page's 10 rows.
  const { data: invoicesAllData } = useApi(
    () => financeService.getInvoices({
      search: cleanSearch(searchTerm),
      status: filterStatus !== 'all' ? filterStatus.toUpperCase() : undefined,
      ...siteFilter,
      page_size: 5000,
    }),
    [searchTerm, filterStatus, selectedSite], true
  );
  const invoicesAllList = invoicesAllData?.results || (Array.isArray(invoicesAllData) ? invoicesAllData : []);

  // Fee types
  const { data: feeTypesData, execute: fetchFeeTypes } = useApi(
    () => financeService.getFeeTypes(),
    [], true
  );
  const feeTypesList = feeTypesData?.results || feeTypesData || [];

  // Payments list — server-side paginated, same reasoning as invoices above.
  // Also scoped to the selected site (siteFilter), like invoices — without
  // it, this tab silently summed every site's payments while Factures only
  // ever showed the current site's, making the two tabs' totals disagree.
  const { data: paymentsData, loading: loadingPays, execute: fetchPayments } = useApi(
    () => financeService.getPayments({
      search: cleanSearch(pSearch), status: pStatus || undefined,
      ...siteFilter,
      page: pPage, page_size: ITEMS_PER_PAGE,
    }),
    [pSearch, pStatus, selectedSite, pPage], activeTab === 'paiements'
  );
  const paymentsList = paymentsData?.results || (Array.isArray(paymentsData) ? paymentsData : []);
  const paymentsCount = paymentsData?.count ?? paymentsList.length;

  // Unpaginated (same filters, no page cap) — used only for the KPI cards
  // below, which must reflect every matching payment, not just the current
  // page's 10 rows.
  const { data: paymentsAllData } = useApi(
    () => financeService.getPayments({ search: cleanSearch(pSearch), status: pStatus || undefined, ...siteFilter, page_size: 5000 }),
    [pSearch, pStatus, selectedSite], activeTab === 'paiements'
  );
  const paymentsAllList = paymentsAllData?.results || (Array.isArray(paymentsAllData) ? paymentsAllData : []);

  // Treasury
  const { data: registersData, execute: fetchRegisters } = useApi(
    () => financeService.getCashRegisters(siteFilter),
    [selectedSite], activeTab === 'tresorerie'
  );
  const registersList = registersData?.results || registersData || [];

  const { data: openSessionsData, execute: fetchOpenSessions } = useApi(
    () => financeService.getCashSessions({ ...siteFilter, status: 'OPEN' }),
    [selectedSite], activeTab === 'tresorerie'
  );
  const openSessions = openSessionsData?.results || openSessionsData || [];

  const { data: cashReport, execute: fetchCashReport } = useApi(
    () => financeService.getCashReport({
      date: reportDate,
      ...(selectedSite !== 'all' ? { site_id: selectedSite } : {}),
    }),
    [reportDate, selectedSite], activeTab === 'tresorerie'
  );

  // ── KPI computed (from the unpaginated set — must reflect every matching
  // invoice, not just the current page's 10 rows) ────────────────────
  const totalInvoiced = invoicesAllList.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
  const totalPaid     = invoicesAllList.reduce((s, i) => s + (parseFloat(i.amount_paid) || 0), 0);
  const totalBalance  = invoicesAllList.reduce((s, i) => s + (parseFloat(i.balance) || 0), 0);

  // ── Invoice helpers ───────────────────────────────────────────────
  const getStudentFullName = (s) => s.user?.full_name || s.full_name || `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.trim() || s.matricule || 'Étudiant';
  const getStudentInitials = (s) => { const n = getStudentFullName(s); const p = n.split(' '); return p.length > 1 ? `${p[0][0]}${p[1][0]}` : n.substring(0, 2); };

  const filteredStudents = studentSearch.trim() === ''
    ? studentsList.slice(0, 20)
    : studentsList.filter(s => {
        const q = studentSearch.toLowerCase();
        return getStudentFullName(s).toLowerCase().includes(q) || s.matricule?.toLowerCase().includes(q);
      });

  // close student dropdown on outside click
  useEffect(() => {
    if (!showStudentDrop) return;
    const h = (e) => { if (studentDropRef.current && !studentDropRef.current.contains(e.target)) { setShowStudentDrop(false); setStudentSearch(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showStudentDrop]);

  // pagination reset on filter change
  useEffect(() => setCurrentPage(1), [searchTerm, filterStatus, selectedSite]);

  // ── Invoice CRUD handlers ──────────────────────────────────────────
  const openCreateInvoice = () => {
    setEditingInvoice(null); setPaymentProof(null); setStudentSearch(''); setShowStudentDrop(false);
    setInvForm({ student_id: '', tuition_fee: '', amount: '', registration_fee: '', is_registration: false, description: '', payment_date: '', payment_method: 'cash' });
    setShowInvModal(true);
  };

  const openEditInvoice = (inv) => {
    setEditingInvoice(inv);
    setInvForm({ student_id: inv.student || '', tuition_fee: inv.total || '', amount: inv.amount_paid || '', description: inv.notes || '', payment_date: '', payment_method: 'cash', is_registration: false, registration_fee: '' });
    setShowInvModal(true);
  };

  const handleInvoiceSubmit = async (e) => {
    e.preventDefault();
    if (!editingInvoice && selectedSite === 'all') { notify('Sélectionnez un site avant de créer une facture.', 'error'); return; }
    try {
      const tuitionFee = parseFloat(invForm.tuition_fee) || 0;
      const paidAmount = parseFloat(invForm.amount) || 0;
      const paymentDate = invForm.payment_date || new Date().toISOString().split('T')[0];
      const dueDate = new Date(new Date(paymentDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      if (editingInvoice) {
        await financeService.updateInvoice(editingInvoice.id, { notes: invForm.description });
        notify(`Facture ${editingInvoice.invoice_number} modifiée.`, 'success');
      } else {
        let feeType = feeTypesList.find(ft => ft.code?.toLowerCase().includes('tuition') || ft.name?.toLowerCase().includes('scolarité')) || feeTypesList[0];
        if (!feeType) {
          feeType = await financeService.createFeeType({ name: 'Frais de scolarité', code: 'TUITION', default_amount: tuitionFee, is_recurring: false });
          fetchFeeTypes();
        }
        const method = await getOrCreatePaymentMethod(invForm.payment_method);
        const inv = await financeService.createInvoice({
          student: invForm.student_id, site: selectedSite !== 'all' ? selectedSite : null,
          academic_year: currentAY?.id, due_date: dueDate, notes: invForm.description || 'Frais de scolarité',
        });
        if (feeType && tuitionFee > 0) {
          await financeService.addInvoiceItem(inv.id, { fee_type: feeType.id, description: invForm.description || 'Frais de scolarité', quantity: 1, unit_price: tuitionFee });
        }
        if (paidAmount > 0 && method) {
          const fd = new FormData();
          fd.append('invoice', inv.id); fd.append('payment_method', method.id);
          fd.append('amount', paidAmount); fd.append('status', 'PENDING');
          fd.append('notes', `Paiement ${invForm.payment_method}`);
          if (paymentProof) fd.append('proof', paymentProof);
          const pay = await financeService.createPaymentWithProof(fd);
          if (pay?.id) await financeService.validatePayment(pay.id);
        }
        notify(`Facture de ${tuitionFee.toLocaleString('fr-FR')} FCFA créée.`, 'success');
      }
      setShowInvModal(false); setEditingInvoice(null); setPaymentProof(null);
      fetchInvoices();
    } catch (err) {
      notify(err.message || 'Erreur lors de l\'enregistrement.', 'error');
    }
  };

  const handleDeleteInvoice = (id) => {
    setConfirmModal({
      icon: 'trash', message: 'Supprimer cette facture définitivement ?',
      onConfirm: async () => {
        await financeService.deleteInvoice(id);
        fetchInvoices();
        notify('Facture supprimée.', 'warning');
      }
    });
  };

  const handleSendInvoice = (inv) => {
    setConfirmModal({
      icon: 'check', message: `Envoyer la facture ${inv.invoice_number} à l'étudiant ?`,
      onConfirm: async () => {
        await financeService.sendInvoice(inv.id);
        fetchInvoices();
        notify('Facture envoyée à l\'étudiant.', 'success');
      }
    });
  };

  const handleCancelInvoice = (inv) => {
    setConfirmModal({
      icon: 'trash', message: `Annuler la facture ${inv.invoice_number} ?`,
      onConfirm: async () => {
        await financeService.cancelInvoice(inv.id);
        fetchInvoices();
        notify('Facture annulée.', 'warning');
      }
    });
  };

  // ── Payment detail modal handlers ─────────────────────────────────
  const openPaymentDetail = async (inv) => {
    setSelectedInvoice(inv); setShowPayModal(true); setLoadingInvPays(true);
    setNewPayAmt(''); setNewPayMethod('cash'); setNewPayProof(null);
    try {
      const res = await financeService.getPayments({ invoice: inv.id });
      setInvoicePayments(res?.results || res || []);
    } catch { setInvoicePayments([]); }
    finally { setLoadingInvPays(false); }
  };

  const handleAddPayment = async () => {
    const amount = parseFloat(newPayAmt);
    if (!amount || amount <= 0) { notify('Montant invalide.', 'error'); return; }
    try {
      const method = await getOrCreatePaymentMethod(newPayMethod);
      const fd = new FormData();
      fd.append('invoice', selectedInvoice.id); fd.append('amount', amount);
      fd.append('payment_method', method?.id || ''); fd.append('status', 'SUCCESS');
      fd.append('notes', `Versement du ${new Date().toLocaleDateString('fr-FR')}`);
      if (newPayProof) fd.append('proof', newPayProof);
      await financeService.createPaymentWithProof(fd);
      const updated = await financeService.getInvoiceById(selectedInvoice.id);
      setSelectedInvoice(updated);
      const res = await financeService.getPayments({ invoice: selectedInvoice.id });
      setInvoicePayments(res?.results || res || []);
      fetchInvoices();
      notify(`Versement de ${amount.toLocaleString('fr-FR')} FCFA enregistré.`, 'success');
      setNewPayAmt(''); setNewPayProof(null);
    } catch (err) {
      notify(err.message || 'Une erreur est survenue.', 'error');
    }
  };

  const handleDownloadReceipt = (pay) => {
    financeService.getPaymentReceipt(pay.id);
    notify('Reçu ouvert.', 'success');
  };

  const handleDeletePayment = (pay) => {
    setConfirmModal({
      icon: 'trash', message: `Supprimer le versement de ${parseFloat(pay.amount).toLocaleString('fr-FR')} FCFA ?`,
      onConfirm: async () => {
        await financeService.deletePayment(pay.id);
        const updated = await financeService.getInvoiceById(selectedInvoice.id);
        setSelectedInvoice(updated);
        const res = await financeService.getPayments({ invoice: selectedInvoice.id });
        setInvoicePayments(res?.results || res || []);
        fetchInvoices();
      }
    });
  };

  const handleSaveEditPayment = async () => {
    const amount = parseFloat(editPayAmt);
    if (!amount || amount <= 0) { notify('Montant invalide.', 'error'); return; }
    try {
      await financeService.updatePayment(editingPay.id, { amount, ...(editPayMethod && { payment_method: editPayMethod }) });
      const updated = await financeService.getInvoiceById(selectedInvoice.id);
      setSelectedInvoice(updated);
      const res = await financeService.getPayments({ invoice: selectedInvoice.id });
      setInvoicePayments(res?.results || res || []);
      fetchInvoices(); setEditingPay(null);
      notify('Paiement modifié.', 'success');
    } catch (err) {
      notify(err.message || 'Une erreur est survenue.', 'error');
    }
  };

  // ── Payments tab handlers ─────────────────────────────────────────
  const handleValidatePayment = (pay) => {
    setConfirmModal({
      icon: 'check', message: `Valider le paiement de ${parseFloat(pay.amount).toLocaleString('fr-FR')} FCFA ?`,
      onConfirm: async () => {
        await financeService.validatePayment(pay.id);
        fetchPayments();
        notify('Paiement validé.', 'success');
      }
    });
  };

  // ── Fee types handlers ────────────────────────────────────────────
  const openCreateFt = () => {
    setEditingFt(null);
    setFtForm({ name: '', code: '', description: '', default_amount: '', is_recurring: false });
    setShowFtModal(true);
  };

  const openEditFt = (ft) => {
    setEditingFt(ft);
    setFtForm({ name: ft.name, code: ft.code, description: ft.description || '', default_amount: ft.default_amount || '', is_recurring: ft.is_recurring });
    setShowFtModal(true);
  };

  const handleFtSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...ftForm, default_amount: parseFloat(ftForm.default_amount) || 0 };
      if (editingFt) {
        await financeService.updateFeeType(editingFt.id, payload);
        notify('Type de frais mis à jour.', 'success');
      } else {
        await financeService.createFeeType(payload);
        notify(`Type de frais "${ftForm.name}" créé.`, 'success');
      }
      setShowFtModal(false); fetchFeeTypes();
    } catch (err) {
      notify(err.message || 'Une erreur est survenue.', 'error');
    }
  };

  const handleDeleteFt = (ft) => {
    setConfirmModal({
      icon: 'trash', message: `Supprimer le type de frais "${ft.name}" ?`,
      onConfirm: async () => {
        await financeService.deleteFeeType(ft.id);
        fetchFeeTypes();
        notify('Type de frais supprimé.', 'warning');
      }
    });
  };

  // ── Treasury handlers ─────────────────────────────────────────────
  const activeSessionForReg = (regId) => openSessions.find(s => s.cash_register === regId || s.cash_register?.id === regId);

  const handleOpenSession = async () => {
    if (!selectedReg) return;
    try {
      await financeService.openCashSession({ cash_register_id: selectedReg.id, opening_balance: parseFloat(openingBal) || 0 });
      setTSessionModal(null); setOpeningBal('');
      fetchRegisters(); fetchOpenSessions();
      notify(`Session ouverte — ${selectedReg.name}.`, 'success');
    } catch (err) {
      notify(err.response?.data?.detail || err.message || 'Erreur lors de l\'ouverture.', 'error');
    }
  };

  const handleCloseSession = async () => {
    const session = activeSessionForReg(selectedReg?.id);
    if (!session) return;
    try {
      await financeService.closeCashSession(session.id, { closing_balance: parseFloat(closingBal) || 0, notes: closeNotes });
      setTSessionModal(null); setClosingBal(''); setCloseNotes('');
      fetchRegisters(); fetchOpenSessions();
      notify('Session clôturée.', 'success');
    } catch (err) {
      notify(err.response?.data?.detail || err.message || 'Erreur lors de la clôture.', 'error');
    }
  };

  // pagination — invoicesList/paymentsList are now exactly one server page
  // each (see the paginated fetches above), so no further client slicing.
  const paginated = invoicesList;
  const totalPages = Math.max(1, Math.ceil(invoicesCount / ITEMS_PER_PAGE));
  const pPaginated = paymentsList;
  const pTotalPages = Math.max(1, Math.ceil(paymentsCount / ITEMS_PER_PAGE));

  // ── RENDER ────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader icon={Wallet} iconColor={COLOR} iconBg={COLOR_ICON}
        title="Finances" subtitle="Facturation, paiements et trésorerie"
        action={
          activeTab === 'factures'   ? <PrimaryButton icon={Plus} label="Nouvelle facture" color={COLOR} onClick={openCreateInvoice} /> :
          activeTab === 'frais'      ? <PrimaryButton icon={Plus} label="Nouveau type de frais" color={COLOR} onClick={openCreateFt} /> :
          null
        } />

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
              Comment fonctionne la gestion financière ?
            </span>
            <span className="text-xs text-gray-400 font-normal hidden sm:inline">Facturation, paiements et trésorerie</span>
          </div>
          <ChevronDown size={15} className="text-gray-400 transition-transform"
            style={{ transform: showWorkflow ? 'rotate(180deg)' : 'none' }} />
        </button>

        {showWorkflow && (
          <div className="p-5 flex flex-col gap-5 border-t" style={{ borderColor: '#fed7aa' }}>
            {/* Flux principal */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Flux de travail principal</p>
              <div className="flex items-start gap-2 flex-wrap">
                {[
                  { icon: FileText, color: '#2563eb', bg: '#dbeafe',
                    title: 'Facture créée',
                    desc: 'Générée automatiquement à l\'inscription ou manuellement. Elle fixe le montant dû par l\'étudiant.' },
                  { icon: CreditCard, color: '#16a34a', bg: '#dcfce7',
                    title: 'Paiement reçu',
                    desc: 'L\'étudiant règle en espèces (caisse), virement ou mobile money. Le paiement est enregistré.' },
                  { icon: CheckCircle, color: COLOR, bg: '#fef3c7',
                    title: 'Paiement validé',
                    desc: 'Le caissier ou un admin valide le paiement. La facture passe à PARTIEL ou PAYÉE.' },
                  { icon: Landmark, color: '#7c3aed', bg: '#ede9fe',
                    title: 'Trésorerie à jour',
                    desc: 'Le rapport journalier (onglet Trésorerie) reflète entrées/sorties/net de la journée.' },
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
                  tab: 'Factures', color: '#2563eb', bg: '#dbeafe',
                  items: [
                    'Créer manuellement ou lier à un type de frais (scolarité, inscription…)',
                    'Statuts : BROUILLON → ENVOYÉE → PARTIEL → PAYÉE / EN RETARD',
                    'Télécharger le PDF pour l\'envoyer à l\'étudiant',
                    'La balance = total facturé − total payé par l\'étudiant',
                  ],
                },
                {
                  tab: 'Paiements', color: '#16a34a', bg: '#dcfce7',
                  items: [
                    'Enregistrer un paiement depuis la fiche facture (bouton "Paiement")',
                    'Modes : Espèces (caisse), Virement bancaire, Mobile Money, Chèque',
                    'Joindre un justificatif (reçu, capture) pour chaque paiement',
                    'Un paiement VALIDÉ met automatiquement à jour le solde de la facture',
                  ],
                },
                {
                  tab: 'Types de frais', color: COLOR, bg: '#fef3c7',
                  items: [
                    'Définir les catégories : scolarité annuelle, inscription, examens…',
                    'Le montant par défaut pré-remplit la facture à la création',
                    'Frais récurrents : s\'appliquent à chaque année académique',
                    'À configurer avant de créer les premières factures',
                  ],
                },
                {
                  tab: 'Trésorerie', color: '#7c3aed', bg: '#ede9fe',
                  items: [
                    'Rapport journalier : sélectionner une date pour voir entrées/sorties/net',
                    'Les données viennent des sessions Caisse (module Caisse → Sessions)',
                    'Ouvrir/fermer une session depuis ce module ou depuis la page Caisse',
                    'Solde caisse = solde d\'ouverture + entrées − sorties sur la session',
                  ],
                },
              ].map(section => (
                <div key={section.tab} className="rounded-xl border p-4" style={{ borderColor: section.color + '25', background: section.bg + '40' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-5 w-5 rounded flex items-center justify-center" style={{ background: section.color + '20' }}>
                      <ChevronRight size={11} style={{ color: section.color }} />
                    </div>
                    <span className="text-xs font-bold" style={{ color: section.color }}>Onglet {section.tab}</span>
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

      {/* Tab nav */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: '#f1f5f9' }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: active ? '#fff' : 'transparent',
                color: active ? COLOR : '#64748b',
                boxShadow: active ? '0 1px 6px rgba(0,0,0,0.08)' : 'none',
              }}>
              <tab.icon className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ──────────────────── TAB: FACTURES ──────────────────────── */}
      {activeTab === 'factures' && (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Scolarité totale',  value: totalInvoiced, icon: DollarSign, color: '#2563eb', bg: '#dbeafe' },
              { label: 'Total payé',        value: totalPaid,     icon: TrendingUp, color: '#059669', bg: '#d1fae5' },
              { label: 'Reste à percevoir', value: totalBalance,  icon: CreditCard, color: COLOR,    bg: COLOR_ICON },
            ].map((s, i) => (
              <div key={i} className="card p-5 flex items-center gap-4 overflow-hidden relative">
                <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full opacity-10 blur-lg" style={{ background: s.color }} />
                <div className="h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                     style={{ background: s.bg, boxShadow: `0 4px 16px ${s.color}25` }}>
                  <s.icon className="h-6 w-6" style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-xl font-black" style={{ color: '#0f172a' }}>{s.value.toLocaleString('fr-FR')}<span className="text-sm font-semibold ml-1" style={{ color: '#94a3b8' }}>FCFA</span></p>
                  <p className="text-xs font-medium mt-0.5" style={{ color: '#64748b' }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          <FilterBar>
            <SearchInput value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Rechercher par N° facture, étudiant…" />
            <FilterSelect value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">Tous les statuts</option>
              <option value="draft">Brouillon</option>
              <option value="sent">Envoyée</option>
              <option value="partial">Partiel</option>
              <option value="paid">Payée</option>
              <option value="overdue">En retard</option>
              <option value="cancelled">Annulée</option>
            </FilterSelect>
          </FilterBar>

          <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #f0f4f9' }}>
            {loadingInvoices ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 rounded-full border-[3px] animate-spin" style={{ borderColor: COLOR_ICON, borderTopColor: COLOR }} />
              </div>
            ) : invoicesList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Receipt className="h-12 w-12 mb-4 opacity-20" style={{ color: '#64748b' }} />
                <p className="text-sm" style={{ color: '#94a3b8' }}>Aucune facture trouvée</p>
                <button onClick={openCreateInvoice} className="mt-3 text-xs font-semibold" style={{ color: COLOR }}>Créer la première facture →</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg,#fafbff,#f8fafc)', borderBottom: '1px solid #f0f4f9' }}>
                      {['Facture', 'Étudiant', 'Total', 'Payé', 'Reste', 'Mode', 'Progression', 'Statut', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: '#94a3b8' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((inv, idx) => {
                      const total = parseFloat(inv.total) || 0;
                      const paid  = parseFloat(inv.amount_paid) || 0;
                      const bal   = parseFloat(inv.balance) || 0;
                      const pct   = total > 0 ? Math.min(100, Math.round(paid / total * 100)) : 0;
                      const barC  = pct === 100 ? '#059669' : pct >= 50 ? COLOR : '#ef4444';
                      return (
                        <tr key={inv.id}
                          style={{ borderBottom: '1px solid #f8fafc', background: idx % 2 !== 0 ? '#fafbff' : 'transparent' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fffbeb50'}
                          onMouseLeave={e => e.currentTarget.style.background = idx % 2 !== 0 ? '#fafbff' : 'transparent'}>
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg" style={{ background: COLOR_BG, color: COLOR }}>#{inv.invoice_number || inv.id?.slice(0, 8)}</span>
                            <p className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>{inv.issue_date || '—'}</p>
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="text-xs font-semibold" style={{ color: '#1e293b' }}>{inv.student_name || '—'}</p>
                            <p className="text-[10px]" style={{ color: '#94a3b8' }}>{inv.student_matricule || ''}</p>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-xs font-bold" style={{ color: '#2563eb' }}>{total.toLocaleString('fr-FR')}<span className="text-[10px] ml-0.5 font-normal" style={{ color: '#94a3b8' }}>F</span></td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-xs font-bold" style={{ color: '#059669' }}>{paid.toLocaleString('fr-FR')}<span className="text-[10px] ml-0.5 font-normal" style={{ color: '#94a3b8' }}>F</span></td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-xs font-bold" style={{ color: bal > 0 ? '#ef4444' : '#059669' }}>{Math.max(0, bal).toLocaleString('fr-FR')}<span className="text-[10px] ml-0.5 font-normal" style={{ color: '#94a3b8' }}>F</span></td>
                          <td className="px-4 py-2.5 text-[11px] whitespace-nowrap" style={{ color: '#475569' }}>{inv.last_payment_method || '—'}</td>
                          <td className="px-4 py-2.5" style={{ minWidth: 100 }}>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barC }} />
                              </div>
                              <span className="text-[10px] font-bold flex-shrink-0" style={{ color: barC, minWidth: 26 }}>{pct}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5"><Badge status={inv.status} /></td>
                          <td className="px-4 py-2.5">
                            <button onClick={() => setActionModal(inv)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                              style={{ color: '#64748b' }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                              Actions <ChevronDown className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} accentColor={COLOR} totalItems={invoicesCount} itemsPerPage={ITEMS_PER_PAGE} />
        </div>
      )}

      {/* ──────────────────── TAB: PAIEMENTS ─────────────────────── */}
      {activeTab === 'paiements' && (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total paiements', value: paymentsAllList.length, icon: Receipt,      color: '#64748b', bg: '#f1f5f9', isCount: true },
              { label: 'Validés',         value: paymentsAllList.filter(p => p.status === 'SUCCESS').length, icon: CheckCircle, color: '#059669', bg: '#d1fae5', isCount: true },
              { label: 'En attente',      value: paymentsAllList.filter(p => p.status === 'PENDING').length, icon: AlertCircle, color: COLOR, bg: COLOR_ICON, isCount: true },
              { label: 'Montant total',   value: paymentsAllList.filter(p => p.status === 'SUCCESS').reduce((s, p) => s + (parseFloat(p.amount) || 0), 0), icon: TrendingUp, color: '#2563eb', bg: '#dbeafe', isCount: false },
            ].map((s, i) => (
              <div key={i} className="card p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                  <s.icon className="h-5 w-5" style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-lg font-black" style={{ color: '#0f172a' }}>
                    {s.isCount ? s.value : s.value.toLocaleString('fr-FR')}
                    {!s.isCount && <span className="text-xs font-semibold ml-1" style={{ color: '#94a3b8' }}>F</span>}
                  </p>
                  <p className="text-[10px] font-medium" style={{ color: '#64748b' }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          <FilterBar>
            <SearchInput value={pSearch} onChange={e => { setPSearch(e.target.value); setPPage(1); }} placeholder="Rechercher par N°, étudiant, référence…" />
            <FilterSelect value={pStatus} onChange={e => { setPStatus(e.target.value); setPPage(1); }}>
              <option value="">Tous les statuts</option>
              <option value="SUCCESS">Validés</option>
              <option value="PENDING">En attente</option>
              <option value="FAILED">Échoués</option>
              <option value="CANCELLED">Annulés</option>
            </FilterSelect>
            <button onClick={fetchPayments} className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:bg-slate-50" style={{ color: '#64748b', borderColor: '#e2e8f0' }}>
              <RotateCcw className="h-3.5 w-3.5" /> Actualiser
            </button>
          </FilterBar>

          <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #f0f4f9' }}>
            {loadingPays ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-7 w-7 rounded-full border-[3px] animate-spin" style={{ borderColor: COLOR_ICON, borderTopColor: COLOR }} />
              </div>
            ) : paymentsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <CreditCard className="h-10 w-10 mb-3 opacity-20" style={{ color: '#64748b' }} />
                <p className="text-sm" style={{ color: '#94a3b8' }}>Aucun paiement enregistré</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg,#fafbff,#f8fafc)', borderBottom: '1px solid #f0f4f9' }}>
                      {['N° Paiement', 'Étudiant', 'Facture', 'Montant', 'Mode', 'Date', 'Statut', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: '#94a3b8' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pPaginated.map((pay, idx) => (
                      <tr key={pay.id}
                        style={{ borderBottom: '1px solid #f8fafc', background: idx % 2 !== 0 ? '#fafbff' : 'transparent' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fffbeb50'}
                        onMouseLeave={e => e.currentTarget.style.background = idx % 2 !== 0 ? '#fafbff' : 'transparent'}>
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-[11px] font-bold" style={{ color: '#475569' }}>{pay.payment_number || pay.id?.slice(0, 8)}</span>
                        </td>
                        <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: '#1e293b' }}>{pay.student_name || '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-[11px] px-2 py-0.5 rounded-lg" style={{ background: COLOR_BG, color: COLOR }}>#{pay.invoice_number || '—'}</span>
                        </td>
                        <td className="px-4 py-2.5 text-xs font-bold whitespace-nowrap" style={{ color: '#059669' }}>
                          {parseFloat(pay.amount || 0).toLocaleString('fr-FR')}<span className="text-[10px] ml-0.5 font-normal" style={{ color: '#94a3b8' }}>F</span>
                        </td>
                        <td className="px-4 py-2.5 text-[11px]" style={{ color: '#475569' }}>{pay.payment_method_name || '—'}</td>
                        <td className="px-4 py-2.5 text-[11px] whitespace-nowrap" style={{ color: '#64748b' }}>
                          {pay.payment_date ? new Date(pay.payment_date).toLocaleDateString('fr-FR') : '—'}
                        </td>
                        <td className="px-4 py-2.5"><Badge status={pay.status} /></td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1">
                            {(pay.proof_url || pay.payer_phone || pay.recipient_phone) && (
                              <IconBtn onClick={() => setPayDetailModal(pay)} icon={Eye} color="#2563eb" hoverBg="#eff6ff" title="Voir la preuve et les détails soumis" />
                            )}
                            {pay.status === 'PENDING' && (
                              <button onClick={() => handleValidatePayment(pay)}
                                className="h-7 px-2 rounded-lg text-[11px] font-semibold text-white transition-all"
                                style={{ background: '#059669' }}
                                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                                Valider
                              </button>
                            )}
                            <IconBtn onClick={() => handleDownloadReceipt(pay)} icon={Download} color="#7c3aed" hoverBg="#f5f3ff" title="Télécharger reçu" />
                            <IconBtn onClick={() => { setConfirmModal({ icon: 'trash', message: `Supprimer ce paiement de ${parseFloat(pay.amount).toLocaleString('fr-FR')} FCFA ?`, onConfirm: async () => { await financeService.deletePayment(pay.id); fetchPayments(); } }); }} icon={Trash2} color="#ef4444" hoverBg="#fee2e2" title="Supprimer" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <Pagination currentPage={pPage} totalPages={pTotalPages} onPageChange={setPPage} accentColor={COLOR} totalItems={paymentsCount} itemsPerPage={ITEMS_PER_PAGE} />
        </div>
      )}

      {/* ──────────────────── TAB: TYPES DE FRAIS ────────────────── */}
      {activeTab === 'frais' && (
        <div className="space-y-5">
          {/* Workflow explanation */}
          <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: '1.5px solid #fde68a' }}>
            <p className="text-xs font-bold mb-2" style={{ color: '#d97706' }}>Comment ça marche ?</p>
            <p className="text-xs" style={{ color: '#92400e' }}>Les types de frais définissent les lignes qui apparaissent sur vos factures (ex: Inscription, Scolarité, Frais de dossier). Chaque facture est composée d'une ou plusieurs lignes basées sur ces types.</p>
          </div>

          {feeTypesList.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-16">
              <Tag className="h-12 w-12 mb-4 opacity-20" style={{ color: '#64748b' }} />
              <p className="text-sm font-semibold mb-1" style={{ color: '#475569' }}>Aucun type de frais défini</p>
              <p className="text-xs mb-4" style={{ color: '#94a3b8' }}>Créez des types de frais pour générer des factures</p>
              <button onClick={openCreateFt} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: COLOR }}>
                <Plus className="h-4 w-4" /> Créer le premier type
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {feeTypesList.map(ft => (
                <div key={ft.id} className="card p-5 group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: COLOR_ICON }}>
                        <Tag className="h-5 w-5" style={{ color: COLOR }} />
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: '#1e293b' }}>{ft.name}</p>
                        <code className="text-[11px] font-mono px-1.5 py-0.5 rounded" style={{ background: '#f1f5f9', color: '#64748b' }}>{ft.code}</code>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <IconBtn onClick={() => openEditFt(ft)} icon={Edit} color="#2563eb" hoverBg="#dbeafe" title="Modifier" />
                      <IconBtn onClick={() => handleDeleteFt(ft)} icon={Trash2} color="#ef4444" hoverBg="#fee2e2" title="Supprimer" />
                    </div>
                  </div>
                  {ft.description && <p className="text-xs mb-3 leading-relaxed" style={{ color: '#64748b' }}>{ft.description}</p>}
                  <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #f1f5f9' }}>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#94a3b8' }}>Montant par défaut</p>
                      <p className="text-base font-black" style={{ color: '#0f172a' }}>{parseFloat(ft.default_amount || 0).toLocaleString('fr-FR')}<span className="text-xs font-semibold ml-1" style={{ color: '#94a3b8' }}>FCFA</span></p>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: ft.is_recurring ? '#dbeafe' : '#f1f5f9', color: ft.is_recurring ? '#2563eb' : '#64748b' }}>
                      {ft.is_recurring ? 'Récurrent' : 'Ponctuel'}
                    </span>
                  </div>
                </div>
              ))}
              {/* Add card */}
              <button onClick={openCreateFt} className="card p-5 flex flex-col items-center justify-center gap-2 border-2 border-dashed transition-colors hover:border-amber-300 hover:bg-amber-50/50 min-h-[140px]" style={{ borderColor: '#e2e8f0' }}>
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: COLOR_ICON }}>
                  <Plus className="h-5 w-5" style={{ color: COLOR }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: '#64748b' }}>Nouveau type</p>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────── TAB: TRÉSORERIE ────────────────────── */}
      {activeTab === 'tresorerie' && (
        <div className="space-y-5">
          {/* Cash report */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: '#1e293b' }}>Rapport journalier</h3>
              <div className="flex items-center gap-2">
                <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)}
                  className="px-3 py-2 rounded-xl text-sm border outline-none" style={{ borderColor: '#e2e8f0', color: '#475569' }} />
                <button onClick={fetchCashReport} className="px-3 py-2 rounded-xl text-sm font-semibold border transition-colors hover:bg-slate-50" style={{ color: '#64748b', borderColor: '#e2e8f0' }}>
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Entrées', value: cashReport?.total_cash_in || 0, icon: ArrowDownLeft, color: '#059669', bg: '#d1fae5' },
                { label: 'Sorties', value: cashReport?.total_cash_out || 0, icon: ArrowUpRight, color: '#ef4444', bg: '#fee2e2' },
                { label: 'Net',     value: cashReport?.net || 0, icon: TrendingUp, color: '#2563eb', bg: '#dbeafe' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-xl" style={{ background: s.bg }}>
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}22` }}>
                    <s.icon className="h-4 w-4" style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className="text-lg font-black" style={{ color: s.color }}>{parseFloat(s.value).toLocaleString('fr-FR')}<span className="text-xs ml-1 font-semibold">F</span></p>
                    <p className="text-[10px] font-semibold" style={{ color: s.color }}>{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cash registers */}
          <div>
            <h3 className="text-sm font-bold mb-3" style={{ color: '#1e293b' }}>Caisses</h3>
            {registersList.length === 0 ? (
              <div className="card flex flex-col items-center justify-center py-12">
                <Landmark className="h-10 w-10 mb-3 opacity-20" style={{ color: '#64748b' }} />
                <p className="text-sm" style={{ color: '#94a3b8' }}>Aucune caisse configurée</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {registersList.map(reg => {
                  const session = activeSessionForReg(reg.id);
                  const isOpen  = reg.is_open;
                  return (
                    <div key={reg.id} className="card p-5 cursor-pointer transition-all"
                      style={{ outline: selectedReg?.id === reg.id ? `2px solid ${COLOR}` : 'none', outlineOffset: 2 }}
                      onClick={() => setSelectedReg(reg)}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: isOpen ? '#d1fae5' : '#f1f5f9' }}>
                            {isOpen ? <Unlock className="h-5 w-5" style={{ color: '#059669' }} /> : <Lock className="h-5 w-5" style={{ color: '#64748b' }} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold" style={{ color: '#1e293b' }}>{reg.name}</p>
                            <code className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>{reg.code}</code>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: isOpen ? '#d1fae5' : '#f1f5f9', color: isOpen ? '#059669' : '#64748b' }}>
                          {isOpen ? 'Ouverte' : 'Fermée'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #f1f5f9' }}>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Solde actuel</p>
                          <p className="text-base font-black" style={{ color: '#0f172a' }}>{parseFloat(reg.current_balance || 0).toLocaleString('fr-FR')}<span className="text-xs ml-1 font-semibold" style={{ color: '#94a3b8' }}>F</span></p>
                        </div>
                        {isOpen ? (
                          <button onClick={e => { e.stopPropagation(); setSelectedReg(reg); setTSessionModal('close'); }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                            style={{ background: '#ef4444' }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                            Clôturer
                          </button>
                        ) : (
                          <button onClick={e => { e.stopPropagation(); setSelectedReg(reg); setTSessionModal('open'); }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                            style={{ background: '#059669' }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                            Ouvrir
                          </button>
                        )}
                      </div>
                      {session && (
                        <div className="mt-3 pt-3 text-[11px]" style={{ borderTop: '1px solid #f1f5f9', color: '#64748b' }}>
                          Session ouverte par <strong>{session.opened_by_name}</strong> · {session.opened_at ? new Date(session.opened_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Open sessions detail */}
          {openSessions.length > 0 && (
            <div>
              <h3 className="text-sm font-bold mb-3" style={{ color: '#1e293b' }}>Sessions en cours</h3>
              <div className="space-y-3">
                {openSessions.map(session => (
                  <div key={session.id} className="card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-bold" style={{ color: '#1e293b' }}>{session.cash_register_name}</p>
                        <p className="text-xs" style={{ color: '#64748b' }}>
                          Ouverte par {session.opened_by_name} à {session.opened_at ? new Date(session.opened_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Solde ouverture</p>
                        <p className="text-sm font-bold" style={{ color: '#059669' }}>{parseFloat(session.opening_balance || 0).toLocaleString('fr-FR')} F</p>
                      </div>
                    </div>
                    {/* Transactions preview */}
                    {session.transactions && session.transactions.length > 0 && (
                      <div className="space-y-1.5">
                        {session.transactions.slice(0, 5).map(tx => (
                          <div key={tx.id} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: '#f8fafc' }}>
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: tx.transaction_type === 'IN' ? '#d1fae5' : '#fee2e2' }}>
                                {tx.transaction_type === 'IN'
                                  ? <ArrowDownLeft className="h-3.5 w-3.5" style={{ color: '#059669' }} />
                                  : <ArrowUpRight className="h-3.5 w-3.5" style={{ color: '#ef4444' }} />}
                              </div>
                              <p className="text-xs font-medium" style={{ color: '#475569' }}>{tx.description}</p>
                            </div>
                            <p className="text-xs font-bold" style={{ color: tx.transaction_type === 'IN' ? '#059669' : '#ef4444' }}>
                              {tx.transaction_type === 'IN' ? '+' : '-'}{parseFloat(tx.amount).toLocaleString('fr-FR')} F
                            </p>
                          </div>
                        ))}
                        {session.transactions.length > 5 && (
                          <p className="text-[11px] text-center" style={{ color: '#94a3b8' }}>+{session.transactions.length - 5} autres transactions</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════ MODALS ═══════════════════════════════ */}

      {/* Actions modal (Factures tab) */}
      {actionModal && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4"
             style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 9999 }}
             onClick={() => setActionModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-4" style={{ background: `linear-gradient(135deg, ${COLOR}, #f59e0b)` }}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.22)' }}>
                    <Receipt className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Facture #{actionModal.invoice_number || actionModal.id?.slice(0, 8)}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>{actionModal.student_name || '—'}</p>
                  </div>
                </div>
                <button onClick={() => setActionModal(null)} className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Badge status={actionModal.status} />
            </div>
            <div className="p-3 space-y-2">
              {[
                { label: 'Historique des paiements', desc: 'Voir et ajouter des versements', icon: Receipt, color: '#7c3aed', bg: '#f5f3ff', action: () => { openPaymentDetail(actionModal); setActionModal(null); } },
                ...(actionModal.status?.toUpperCase() === 'DRAFT' ? [{ label: 'Envoyer la facture', desc: 'Marquer comme envoyée', icon: ArrowRight, color: '#2563eb', bg: '#dbeafe', action: () => { handleSendInvoice(actionModal); setActionModal(null); } }] : []),
                { label: 'Modifier la facture', desc: 'Éditer les informations', icon: Edit, color: '#059669', bg: '#d1fae5', action: () => { openEditInvoice(actionModal); setActionModal(null); } },
                ...(['DRAFT', 'SENT', 'PARTIAL', 'OVERDUE'].includes(actionModal.status?.toUpperCase()) ? [{ label: 'Annuler la facture', desc: 'Marquer comme annulée', icon: X, color: '#ef4444', bg: '#fee2e2', action: () => { handleCancelInvoice(actionModal); setActionModal(null); } }] : []),
                { label: 'Supprimer', desc: 'Suppression définitive', icon: Trash2, color: '#ef4444', bg: '#fee2e2', action: () => { handleDeleteInvoice(actionModal.id); setActionModal(null); } },
              ].map((item, idx) => (
                <button key={idx} onClick={item.action}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                  style={{ border: '1.5px solid #f1f5f9' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = item.color + '55'; e.currentTarget.style.background = item.bg + '55'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.background = 'transparent'; }}>
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: item.bg }}>
                    <item.icon className="h-4 w-4" style={{ color: item.color }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>{item.label}</p>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>{item.desc}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 -rotate-90" style={{ color: '#cbd5e1' }} />
                </button>
              ))}
            </div>
            <div className="px-3 pb-3">
              <button onClick={() => setActionModal(null)} className="w-full py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#f8fafc', color: '#64748b' }}>Fermer</button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Create/edit invoice modal */}
      {showInvModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)' }}
             onClick={() => setShowInvModal(false)}>
          <div ref={invModalRef} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <h2 className="text-lg font-bold" style={{ color: '#0f172a' }}>{editingInvoice ? 'Modifier la facture' : 'Nouvelle facture'}</h2>
              <button onClick={() => setShowInvModal(false)} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100">
                <X className="h-4 w-4" style={{ color: '#64748b' }} />
              </button>
            </div>
            <form onSubmit={handleInvoiceSubmit} className="p-6 space-y-5">
              {/* Student picker */}
              {!editingInvoice && (
                <div ref={studentDropRef} className="relative">
                  <label className="block text-xs font-bold mb-2" style={{ color: '#475569' }}>Étudiant *</label>
                  <button type="button" onClick={() => setShowStudentDrop(v => !v)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left"
                    style={{ border: `1.5px solid ${showStudentDrop ? COLOR : '#e2e8f0'}`, background: showStudentDrop ? COLOR_BG : '#fafafa' }}>
                    {invForm.student_id ? (() => { const s = studentsList.find(x => x.id === invForm.student_id); return s ? (
                      <><div className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ background: `linear-gradient(135deg, ${COLOR}, #f59e0b)` }}>{getStudentInitials(s)}</div>
                      <div className="flex-1"><p className="text-sm font-semibold" style={{ color: '#1e293b' }}>{getStudentFullName(s)}</p><p className="text-[11px]" style={{ color: '#94a3b8' }}>{s.matricule}</p></div></>
                    ) : null; })() : (
                      <><User className="h-4 w-4" style={{ color: '#94a3b8' }} /><span className="text-sm flex-1" style={{ color: '#94a3b8' }}>Sélectionner un étudiant…</span></>
                    )}
                    <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${showStudentDrop ? 'rotate-180' : ''}`} style={{ color: '#94a3b8' }} />
                  </button>
                  {showStudentDrop && (
                    <div className="absolute left-0 right-0 mt-1 rounded-xl shadow-xl overflow-hidden" style={{ border: '1.5px solid #e2e8f0', background: '#fff', zIndex: 100 }}>
                      <div className="p-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: '#94a3b8' }} />
                          <input autoFocus type="text" placeholder="Rechercher…" value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                            className="w-full rounded-lg text-sm outline-none" style={{ paddingLeft: '2rem', paddingRight: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', border: '1px solid #e2e8f0', background: '#f8fafc' }} />
                        </div>
                      </div>
                      <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
                        {filteredStudents.map(s => (
                          <button key={s.id} type="button"
                            onClick={() => { setInvForm(p => ({ ...p, student_id: s.id })); setStudentSearch(''); setShowStudentDrop(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                            style={{ background: invForm.student_id === s.id ? COLOR_BG : 'transparent', borderBottom: '1px solid #f8fafc' }}
                            onMouseEnter={e => { if (invForm.student_id !== s.id) e.currentTarget.style.background = '#fafafe'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = invForm.student_id === s.id ? COLOR_BG : 'transparent'; }}>
                            <div className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style={{ background: `linear-gradient(135deg, ${COLOR}, #f59e0b)` }}>{getStudentInitials(s)}</div>
                            <div><p className="text-sm font-semibold" style={{ color: '#1e293b' }}>{getStudentFullName(s)}</p><p className="text-xs" style={{ color: '#94a3b8' }}>{s.matricule}</p></div>
                          </button>
                        ))}
                        {filteredStudents.length === 0 && <p className="px-4 py-5 text-sm text-center" style={{ color: '#94a3b8' }}>Aucun résultat</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-2" style={{ color: '#475569' }}>Montant scolarité (FCFA) *</label>
                  <input type="number" required value={invForm.tuition_fee} onChange={e => setInvForm(p => ({ ...p, tuition_fee: e.target.value }))} className="input-field" placeholder="Ex: 500000" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-2" style={{ color: '#475569' }}>Montant payé (FCFA)</label>
                  <input type="number" value={invForm.amount} onChange={e => setInvForm(p => ({ ...p, amount: e.target.value }))} className="input-field" placeholder="0" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: '#475569' }}>Description / Notes</label>
                <textarea value={invForm.description} onChange={e => setInvForm(p => ({ ...p, description: e.target.value }))} rows={2} className="input-field resize-none" placeholder="Frais de scolarité 2025-2026" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-2" style={{ color: '#475569' }}>Mode de paiement</label>
                  <select value={invForm.payment_method} onChange={e => setInvForm(p => ({ ...p, payment_method: e.target.value }))} className="input-field">
                    <option value="cash">Espèces</option>
                    <option value="bank_transfer">Virement bancaire</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="card">Carte bancaire</option>
                    <option value="check">Chèque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-2" style={{ color: '#475569' }}>Date de paiement</label>
                  <input type="date" value={invForm.payment_date} onChange={e => setInvForm(p => ({ ...p, payment_date: e.target.value }))} className="input-field" />
                </div>
              </div>

              {/* File upload */}
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: '#475569' }}>Preuve de paiement</label>
                <label htmlFor="inv-proof-upload" className="flex flex-col items-center justify-center py-6 rounded-xl cursor-pointer transition-colors"
                  style={{ border: `2px dashed ${paymentProof ? COLOR : '#e2e8f0'}`, background: paymentProof ? COLOR_BG : '#fafafa' }}>
                  <input id="inv-proof-upload" type="file" accept="image/jpeg,image/png,image/jpg,application/pdf" onChange={e => setPaymentProof(e.target.files[0] || null)} className="hidden" />
                  {paymentProof ? (
                    <div className="flex items-center gap-3" style={{ color: COLOR }}>
                      {paymentProof.type.startsWith('image/') ? <ImageIcon className="h-7 w-7" /> : <FileText className="h-7 w-7" />}
                      <div><p className="text-sm font-semibold">{paymentProof.name}</p><p className="text-xs" style={{ color: '#94a3b8' }}>{(paymentProof.size / 1024).toFixed(1)} KB</p></div>
                    </div>
                  ) : (
                    <><Upload className="h-8 w-8 mb-2 opacity-30" style={{ color: '#64748b' }} /><p className="text-sm" style={{ color: '#64748b' }}>Cliquez pour joindre un fichier</p><p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>JPG, PNG ou PDF · Max 5 MB</p></>
                  )}
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
                <button type="button" onClick={() => setShowInvModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold border" style={{ color: '#64748b', borderColor: '#e2e8f0' }}>Annuler</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: COLOR }}>{editingInvoice ? 'Mettre à jour' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* Payment detail modal */}
      {showPayModal && selectedInvoice && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)' }}
             onClick={() => setShowPayModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h2 className="text-lg font-bold" style={{ color: '#0f172a' }}>Détails des paiements</h2>
                <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Facture #{selectedInvoice.invoice_number} · {selectedInvoice.student_name}</p>
              </div>
              <button onClick={() => setShowPayModal(false)} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100">
                <X className="h-4 w-4" style={{ color: '#64748b' }} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Montant total', value: parseFloat(selectedInvoice.total || 0), color: '#2563eb', bg: '#dbeafe' },
                  { label: 'Total payé',    value: parseFloat(selectedInvoice.amount_paid || 0), color: '#059669', bg: '#d1fae5' },
                  { label: 'Reste à payer', value: parseFloat(selectedInvoice.balance || 0), color: parseFloat(selectedInvoice.balance) > 0 ? '#ef4444' : '#059669', bg: parseFloat(selectedInvoice.balance) > 0 ? '#fee2e2' : '#f1f5f9' },
                ].map((s, i) => (
                  <div key={i} className="rounded-xl p-4" style={{ background: s.bg }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: s.color }}>{s.label}</p>
                    <p className="text-xl font-bold" style={{ color: s.color }}>{s.value.toLocaleString('fr-FR')}<span className="text-xs ml-1">FCFA</span></p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl p-4" style={{ background: '#fafafa', border: '1px solid #f1f5f9' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold" style={{ color: '#475569' }}>Progression</span>
                  <span className="text-xs font-bold" style={{ color: '#7c3aed' }}>
                    {Math.min(100, Math.round(parseFloat(selectedInvoice.amount_paid || 0) / parseFloat(selectedInvoice.total || 1) * 100))}%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full" style={{ background: '#e2e8f0' }}>
                  <div className="h-2.5 rounded-full transition-all" style={{ width: `${Math.min(100, Math.round(parseFloat(selectedInvoice.amount_paid || 0) / parseFloat(selectedInvoice.total || 1) * 100))}%`, background: 'linear-gradient(90deg,#7c3aed,#6366f1)' }} />
                </div>
              </div>

              {parseFloat(selectedInvoice.balance) > 0 && (
                <div className="rounded-xl p-4" style={{ background: '#f5f3ff', border: '1px solid #ede9fe' }}>
                  <h3 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: '#7c3aed' }}>
                    <Plus className="h-3.5 w-3.5" /> Ajouter un versement
                  </h3>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Montant (FCFA)</label>
                      <input type="number" value={newPayAmt} onChange={e => setNewPayAmt(e.target.value)} placeholder="Ex: 100000" className="input-field" />
                    </div>
                    <div className="w-36">
                      <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Mode</label>
                      <select value={newPayMethod} onChange={e => setNewPayMethod(e.target.value)} className="input-field">
                        <option value="cash">Espèces</option>
                        <option value="check">Chèque</option>
                        <option value="bank_transfer">Virement</option>
                        <option value="mobile_money">Mobile Money</option>
                        <option value="card">Carte</option>
                      </select>
                    </div>
                    <div className="w-40">
                      <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Preuve (opt.)</label>
                      <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-white" style={{ border: '1px solid #e2e8f0', background: '#fafafa' }}>
                        <Paperclip className="h-3.5 w-3.5" style={{ color: '#64748b' }} />
                        <span className="text-xs truncate" style={{ color: '#64748b' }}>{newPayProof ? newPayProof.name : 'Joindre fichier'}</span>
                        <input type="file" accept="image/*,.pdf" onChange={e => setNewPayProof(e.target.files[0] || null)} className="hidden" />
                      </label>
                    </div>
                    <button onClick={handleAddPayment} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2" style={{ background: '#7c3aed' }}>
                      <Plus className="h-3.5 w-3.5" /> Ajouter
                    </button>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: '#475569' }}>
                  <History className="h-3.5 w-3.5" /> Historique des paiements
                </h3>
                {loadingInvPays ? (
                  <div className="py-8 flex justify-center"><div className="h-6 w-6 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" /></div>
                ) : invoicePayments.length === 0 ? (
                  <div className="py-8 rounded-xl flex flex-col items-center" style={{ background: '#fafafa' }}>
                    <Receipt className="h-10 w-10 mb-2 opacity-20" style={{ color: '#64748b' }} />
                    <p className="text-sm" style={{ color: '#94a3b8' }}>Aucun paiement enregistré</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {invoicePayments.map((pay, idx) => (
                      <div key={pay.id || idx} className="rounded-xl p-4" style={{ background: '#fafafa', border: '1px solid #f1f5f9' }}>
                        {editingPay?.id === pay.id ? (
                          <div className="flex items-end gap-3">
                            <div className="flex-1">
                              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Montant (FCFA)</label>
                              <input type="number" value={editPayAmt} onChange={e => setEditPayAmt(e.target.value)} className="input-field" />
                            </div>
                            <div className="w-40">
                              <label className="block text-xs font-medium mb-1" style={{ color: '#64748b' }}>Mode</label>
                              <select value={editPayMethod} onChange={e => setEditPayMethod(e.target.value)} className="input-field">
                                {paymentMethodsList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                              </select>
                            </div>
                            <button onClick={handleSaveEditPayment} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#2563eb' }}>Enregistrer</button>
                            <button onClick={() => setEditingPay(null)} className="px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#f1f5f9', color: '#64748b' }}>Annuler</button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: pay.status === 'SUCCESS' ? '#d1fae5' : '#fef3c7' }}>
                                <ArrowRight className="h-4 w-4" style={{ color: pay.status === 'SUCCESS' ? '#059669' : '#d97706' }} />
                              </div>
                              <div>
                                <p className="text-sm font-bold" style={{ color: '#1e293b' }}>{parseFloat(pay.amount || 0).toLocaleString('fr-FR')} FCFA</p>
                                <p className="text-xs" style={{ color: '#94a3b8' }}>{pay.payment_method_name || '—'}{pay.reference && ` · Réf: ${pay.reference}`}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <p className="text-xs font-medium" style={{ color: '#475569' }}>{pay.payment_date ? new Date(pay.payment_date).toLocaleDateString('fr-FR') : '—'}</p>
                                <Badge status={pay.status} />
                              </div>
                              <div className="flex items-center gap-1">
                                <IconBtn onClick={() => handleDownloadReceipt(pay)} icon={Download} color="#7c3aed" hoverBg="#f5f3ff" title="Télécharger reçu" />
                                <IconBtn onClick={() => { setEditingPay(pay); setEditPayAmt(String(pay.amount)); setEditPayMethod(pay.payment_method || paymentMethodsList[0]?.id || ''); }} icon={Edit} color="#2563eb" hoverBg="#dbeafe" title="Modifier" />
                                <IconBtn onClick={() => handleDeletePayment(pay)} icon={Trash2} color="#ef4444" hoverBg="#fee2e2" title="Supprimer" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end px-6 py-4" style={{ borderTop: '1px solid #f1f5f9' }}>
              <button onClick={() => setShowPayModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#f1f5f9', color: '#64748b' }}>Fermer</button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Fee type modal */}
      {showFtModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)' }}
             onClick={() => setShowFtModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <h2 className="text-lg font-bold" style={{ color: '#0f172a' }}>{editingFt ? 'Modifier le type de frais' : 'Nouveau type de frais'}</h2>
              <button onClick={() => setShowFtModal(false)} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100">
                <X className="h-4 w-4" style={{ color: '#64748b' }} />
              </button>
            </div>
            <form onSubmit={handleFtSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-2" style={{ color: '#475569' }}>Nom *</label>
                  <input required type="text" value={ftForm.name} onChange={e => setFtForm(p => ({ ...p, name: e.target.value }))} className="input-field" placeholder="Ex: Frais de scolarité" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-2" style={{ color: '#475569' }}>Code *</label>
                  <input required type="text" value={ftForm.code} onChange={e => setFtForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} className="input-field font-mono" placeholder="Ex: TUITION" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: '#475569' }}>Description</label>
                <textarea value={ftForm.description} onChange={e => setFtForm(p => ({ ...p, description: e.target.value }))} rows={2} className="input-field resize-none" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: '#475569' }}>Montant par défaut (FCFA)</label>
                <input type="number" value={ftForm.default_amount} onChange={e => setFtForm(p => ({ ...p, default_amount: e.target.value }))} className="input-field" placeholder="0" />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={ftForm.is_recurring} onChange={e => setFtForm(p => ({ ...p, is_recurring: e.target.checked }))} className="h-4 w-4 rounded" style={{ accentColor: COLOR }} />
                <span className="text-sm font-medium" style={{ color: '#475569' }}>Frais récurrent (chaque période)</span>
              </label>
              <div className="flex justify-end gap-3 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
                <button type="button" onClick={() => setShowFtModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold border" style={{ color: '#64748b', borderColor: '#e2e8f0' }}>Annuler</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: COLOR }}>{editingFt ? 'Mettre à jour' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* Treasury: open session modal */}
      {tSessionModal === 'open' && selectedReg && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)' }}
             onClick={() => setTSessionModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h2 className="text-base font-bold" style={{ color: '#0f172a' }}>Ouvrir la session</h2>
                <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{selectedReg.name}</p>
              </div>
              <button onClick={() => setTSessionModal(null)} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100">
                <X className="h-4 w-4" style={{ color: '#64748b' }} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: '#475569' }}>Solde d'ouverture (FCFA)</label>
                <input type="number" value={openingBal} onChange={e => setOpeningBal(e.target.value)} className="input-field" placeholder="Ex: 50000" autoFocus />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setTSessionModal(null)} className="px-5 py-2.5 rounded-xl text-sm font-semibold border" style={{ color: '#64748b', borderColor: '#e2e8f0' }}>Annuler</button>
                <button onClick={handleOpenSession} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2" style={{ background: '#059669' }}>
                  <Unlock className="h-4 w-4" /> Ouvrir
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Treasury: close session modal */}
      {tSessionModal === 'close' && selectedReg && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)' }}
             onClick={() => setTSessionModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h2 className="text-base font-bold" style={{ color: '#0f172a' }}>Clôturer la session</h2>
                <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{selectedReg.name}</p>
              </div>
              <button onClick={() => setTSessionModal(null)} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100">
                <X className="h-4 w-4" style={{ color: '#64748b' }} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: '#475569' }}>Solde de clôture (FCFA) *</label>
                <input type="number" value={closingBal} onChange={e => setClosingBal(e.target.value)} className="input-field" placeholder="Montant compté en caisse" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: '#475569' }}>Notes</label>
                <textarea value={closeNotes} onChange={e => setCloseNotes(e.target.value)} rows={2} className="input-field resize-none" placeholder="Observations de clôture…" />
              </div>
              <div className="p-3 rounded-xl" style={{ background: '#fef3c7', border: '1px solid #fde68a' }}>
                <p className="text-xs" style={{ color: '#92400e' }}>La différence entre le solde attendu et le solde compté sera calculée automatiquement.</p>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setTSessionModal(null)} className="px-5 py-2.5 rounded-xl text-sm font-semibold border" style={{ color: '#64748b', borderColor: '#e2e8f0' }}>Annuler</button>
                <button onClick={handleCloseSession} disabled={!closingBal} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-50" style={{ background: '#ef4444' }}>
                  <Lock className="h-4 w-4" /> Clôturer
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Payment proof/details modal — lets the admin actually check what was
          submitted (proof, phone numbers, transaction id, declared date)
          before clicking "Valider" instead of validating blind. */}
      {payDetailModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)' }}
             onClick={() => setPayDetailModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h2 className="text-lg font-bold" style={{ color: '#0f172a' }}>Détails du paiement</h2>
                <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                  {payDetailModal.payment_number || payDetailModal.id?.slice(0, 8)} · {payDetailModal.student_name}
                </p>
              </div>
              <button onClick={() => setPayDetailModal(null)} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100">
                <X className="h-4 w-4" style={{ color: '#64748b' }} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-xl p-4 text-center" style={{ background: COLOR_BG }}>
                <p className="text-xs font-semibold mb-1" style={{ color: COLOR }}>Montant déclaré</p>
                <p className="text-2xl font-bold" style={{ color: COLOR }}>
                  {parseFloat(payDetailModal.amount || 0).toLocaleString('fr-FR')}<span className="text-xs ml-1">FCFA</span>
                </p>
              </div>

              {payDetailModal.proof_url ? (
                /\.(jpe?g|png|gif|webp)$/i.test(payDetailModal.proof_url) ? (
                  <a href={payDetailModal.proof_url} target="_blank" rel="noreferrer">
                    <img src={payDetailModal.proof_url} alt="Preuve de paiement"
                         className="w-full rounded-xl object-contain max-h-72" style={{ border: '1px solid #e2e8f0' }} />
                  </a>
                ) : (
                  <a href={payDetailModal.proof_url} target="_blank" rel="noreferrer"
                     className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
                     style={{ background: '#eff6ff', color: '#2563eb' }}>
                    <FileText className="h-4 w-4" /> Ouvrir la preuve jointe (PDF)
                  </a>
                )
              ) : (
                <p className="text-xs italic" style={{ color: '#94a3b8' }}>Aucune preuve jointe.</p>
              )}

              <div className="space-y-2.5">
                {[
                  { icon: Smartphone, label: 'Numéro payeur', value: payDetailModal.payer_phone },
                  { icon: Phone,      label: 'Numéro destinataire', value: payDetailModal.recipient_phone },
                  { icon: Hash,       label: 'ID de transaction', value: payDetailModal.reference },
                  { icon: Calendar,   label: 'Date de paiement déclarée', value: payDetailModal.declared_payment_date ? new Date(payDetailModal.declared_payment_date).toLocaleDateString('fr-FR') : null },
                ].filter(row => row.value).map((row, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: '#fafafa', border: '1px solid #f1f5f9' }}>
                    <row.icon className="h-4 w-4 flex-shrink-0" style={{ color: '#94a3b8' }} />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>{row.label}</p>
                      <p className="text-sm font-semibold truncate" style={{ color: '#1e293b' }}>{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid #f1f5f9' }}>
              <button onClick={() => setPayDetailModal(null)} className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#f1f5f9', color: '#64748b' }}>Fermer</button>
              {payDetailModal.status === 'PENDING' && (
                <button onClick={() => { handleValidatePayment(payDetailModal); setPayDetailModal(null); }}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2" style={{ background: '#059669' }}>
                  <CheckCircle className="h-4 w-4" /> Valider ce paiement
                </button>
              )}
            </div>
          </div>
        </div>
      , document.body)}

      {/* Confirm modal */}
      {confirmModal && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4"
             style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', zIndex: 10000 }}
             onClick={() => setConfirmModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4"
                   style={{ background: confirmModal.icon === 'trash' ? '#fee2e2' : '#d1fae5' }}>
                {confirmModal.icon === 'trash'
                  ? <Trash2 className="h-7 w-7" style={{ color: '#ef4444' }} />
                  : <CheckCircle className="h-7 w-7" style={{ color: '#059669' }} />}
              </div>
              <p className="text-sm font-semibold leading-relaxed" style={{ color: '#1e293b' }}>{confirmModal.message}</p>
            </div>
            <div className="px-4 pb-4 flex gap-3">
              <button onClick={() => setConfirmModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#f1f5f9', color: '#64748b' }}>Annuler</button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: confirmModal.icon === 'trash' ? '#ef4444' : '#059669' }}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
