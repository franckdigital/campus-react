// Single source of truth for splitting a student's invoices into
// "inscription" vs "scolarité" totals/paid/balance. Shared by the admin
// dossier header/Paiements tab and the student dashboard/finances pages so
// none of them can disagree with each other depending on which page/tab is
// visited.
export function computeFeeBreakdown(activeInvoicesList, { fallbackReg, fallbackTuition, registrationFeePaidFlag }) {
  const regInvList = activeInvoicesList.filter(inv => {
    const invText = `${inv.notes || ''} ${inv.description || ''}`.toLowerCase();
    if (invText.includes('inscription')) return true;
    if ((inv.fee_type_codes || []).some(c => /inscri|regist/i.test(c))) return true;
    return (inv.items || []).some(it => {
      const s = `${it.description || ''} ${it.fee_type_name || ''} ${it.fee_type_code || ''}`.toLowerCase();
      return s.includes('inscription') || s.includes('registration');
    });
  });
  const tuitionInvList = activeInvoicesList.filter(inv => {
    const invText = `${inv.notes || ''} ${inv.description || ''}`.toLowerCase();
    if (invText.includes('scolarité') || invText.includes('scolarite') || invText.includes('tuition')) return true;
    if ((inv.fee_type_codes || []).some(c => /tuition|scolarit/i.test(c))) return true;
    return (inv.items || []).some(it => {
      const s = `${it.description || ''} ${it.fee_type_name || ''} ${it.fee_type_code || ''}`.toLowerCase();
      return s.includes('tuition') || s.includes('scolarit');
    });
  });

  const isEnrolled = registrationFeePaidFlag || regInvList.some(inv => inv.status === 'PAID');

  const regPaidFromInv  = regInvList.reduce((s, inv) => s + parseFloat(inv.amount_paid || 0), 0);
  const regTotalFromInv = regInvList.reduce((s, inv) => s + parseFloat(inv.total || 0), 0);
  const regTotal        = regTotalFromInv > 0 ? regTotalFromInv : fallbackReg;
  const regPaid         = (isEnrolled && regPaidFromInv === 0 && regTotal > 0) ? regTotal : regPaidFromInv;
  const regBalance      = Math.max(0, regTotal - regPaid);

  const tuitionPaidFromInv  = tuitionInvList.reduce((s, inv) => s + parseFloat(inv.amount_paid || 0), 0);
  const tuitionTotalFromInv = tuitionInvList.reduce((s, inv) => s + parseFloat(inv.total || 0), 0);
  const tuitionTotal        = tuitionTotalFromInv > 0 ? tuitionTotalFromInv : fallbackTuition;
  const tuitionBalance      = Math.max(0, tuitionTotal - tuitionPaidFromInv);

  return {
    isEnrolled,
    regTotal, regPaid, regBalance,
    tuitionTotal, tuitionPaid: tuitionPaidFromInv, tuitionBalance,
  };
}

// The list endpoint (InvoiceListSerializer) doesn't even return `notes` —
// only the detail serializer does — so trusting `invoice.notes` for display
// always falls through to a hardcoded default, mislabeling every invoice
// (inscription included) as "Frais de scolarité" regardless of its real fee
// type. fee_type_codes (derived server-side from each item's real FeeType,
// always present on the list endpoint) is the reliable source instead.
export function getInvoiceLabel(invoice) {
  const codes = invoice.fee_type_codes || [];
  if (codes.some(c => /inscri|regist/i.test(c))) return "Frais d'inscription";
  if (codes.some(c => /tuition|scolarit/i.test(c))) return 'Frais de scolarité';
  return invoice.notes || invoice.description || 'Frais de scolarité';
}

export default computeFeeBreakdown;
