// There's only one fee concept now ("frais de scolarité" — the former
// "frais d'inscription" was merged into it), so every invoice is a
// scolarité invoice and there's nothing left to classify.
export function getInvoiceLabel(invoice) {
  return invoice.notes || invoice.description || 'Frais de scolarité';
}
