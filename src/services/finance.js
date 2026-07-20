import api from './api';

const q = (params = {}) => {
  const s = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  return s ? `?${s}` : '';
};

export const financeService = {
  // ── Fee Types ────────────────────────────────────────────────
  getFeeTypes: (params = {}) => api.get(`/fee-types/${q(params)}`),
  createFeeType: (data) => api.post('/fee-types/', data),
  updateFeeType: (id, data) => api.patch(`/fee-types/${id}/`, data),
  deleteFeeType: (id) => api.delete(`/fee-types/${id}/`),

  // ── Payment Methods ──────────────────────────────────────────
  getPaymentMethods: (params = {}) => api.get(`/payment-methods/${q(params)}`),
  createPaymentMethod: (data) => api.post('/payment-methods/', data),

  // ── Invoices ─────────────────────────────────────────────────
  getInvoices: (params = {}) => api.get(`/invoices/${q(params)}`),
  getInvoiceById: (id) => api.get(`/invoices/${id}/`),
  createInvoice: (data) => api.post('/invoices/', data),
  updateInvoice: (id, data) => api.patch(`/invoices/${id}/`, data),
  deleteInvoice: (id) => api.delete(`/invoices/${id}/`),
  addInvoiceItem: (invoiceId, data) => api.post(`/invoices/${invoiceId}/add-item/`, data),
  sendInvoice: (id) => api.post(`/invoices/${id}/send/`),
  cancelInvoice: (id) => api.post(`/invoices/${id}/cancel/`),
  getInvoicePdfUrl: (id) => {
    const token = localStorage.getItem('access_token') || '';
    return `${api.baseUrl}/invoices/${id}/pdf/?token=${encodeURIComponent(token)}`;
  },
  downloadInvoicePdf: (id) => {
    const token = localStorage.getItem('access_token') || '';
    const url = `${api.baseUrl}/invoices/${id}/pdf/?token=${encodeURIComponent(token)}`;
    window.open(url, '_blank');
  },

  // ── Payments ─────────────────────────────────────────────────
  getPayments: (params = {}) => api.get(`/payments/${q(params)}`),
  createPayment: (data) => api.post('/payments/', data),
  updatePayment: (id, data) => api.patch(`/payments/${id}/`, data),
  deletePayment: (id) => api.delete(`/payments/${id}/`),
  validatePayment: (id) => api.post(`/payments/${id}/validate/`),

  createPaymentWithProof: async (formData) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${api.baseUrl}/payments/`, {
      method: 'POST',
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Erreur création paiement');
    }
    return response.json();
  },

  // cash payment (creates payment + cash transaction atomically)
  cashPayment: (data) => api.post('/payments/cash/', data),

  // E6: receipt PDF — uses ?token= to avoid CORS preflight
  getPaymentReceiptUrl: (paymentId) => {
    const token = localStorage.getItem('access_token') || '';
    return `${api.baseUrl}/payments/${paymentId}/receipt/?token=${encodeURIComponent(token)}`;
  },
  getPaymentReceipt: (paymentId) => {
    const token = localStorage.getItem('access_token') || '';
    const url = `${api.baseUrl}/payments/${paymentId}/receipt/?token=${encodeURIComponent(token)}`;
    window.open(url, '_blank');
  },

  // ── Cash Registers ────────────────────────────────────────────
  getCashRegisters: (params = {}) => api.get(`/cash-registers/${q(params)}`),
  createCashRegister: (data) => api.post('/cash-registers/', data),

  // ── Cash Sessions ─────────────────────────────────────────────
  getCashSessions: (params = {}) => api.get(`/cash-sessions/${q(params)}`),
  getCashSessionById: (id) => api.get(`/cash-sessions/${id}/`),
  openCashSession: (data) => api.post('/cash/sessions/open/', data),
  closeCashSession: (id, data) => api.post(`/cash-sessions/${id}/close/`, data),

  // ── Cash Transactions ─────────────────────────────────────────
  getCashTransactions: (params = {}) => api.get(`/cash-transactions/${q(params)}`),
  createCashTransaction: (data) => api.post('/cash-transactions/', data),

  // ── Cash Report (E7) ─────────────────────────────────────────
  getCashReport: (params = {}) => api.get(`/cash/reports/daily/${q(params)}`),

  // ── Bank Accounts ─────────────────────────────────────────────
  getBankAccounts: (params = {}) => api.get(`/bank-accounts/${q(params)}`),
  createBankAccount: (data) => api.post('/bank-accounts/', data),
  updateBankAccount: (id, data) => api.patch(`/bank-accounts/${id}/`, data),
  deleteBankAccount: (id) => api.delete(`/bank-accounts/${id}/`),

  // ── Expenses ──────────────────────────────────────────────────
  getExpenses: (params = {}) => api.get(`/expenses/${q(params)}`),
  createExpense: (data) => api.post('/expenses/', data),
  updateExpense: (id, data) => api.patch(`/expenses/${id}/`, data),
  deleteExpense: (id) => api.delete(`/expenses/${id}/`),
  createExpenseWithFile: async (formData) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${api.baseUrl}/expenses/`, {
      method: 'POST',
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Erreur création dépense');
    }
    return response.json();
  },

  // ── Student helpers ───────────────────────────────────────────
  getStudentFinancialSummary: (studentId) => api.get(`/students/${studentId}/financial-summary/`),

  // legacy kept for backward compat
  validateInvoicePayment: (id) => api.post(`/invoices/${id}/validate/`),
  uploadPaymentProof: async (invoiceId, formData) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${api.baseUrl}/invoices/${invoiceId}/upload-proof/`, {
      method: 'POST',
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Erreur upload');
    }
    return response.json();
  },
  getFinanceReport: (params = {}) => api.get(`/reports/finance/${q(params)}`),

  // ── Expenses ──────────────────────────────────────────────────
  approveExpense: (id) => api.post(`/expenses/${id}/approve/`),
  rejectExpense: (id) => api.post(`/expenses/${id}/reject/`),
  markExpensePaid: (id) => api.post(`/expenses/${id}/mark-paid/`),

  // ── Fee Configurations ────────────────────────────────────────
  getFeeConfigurations: (params = {}) => api.get(`/fee-configurations/${q(params)}`),
  getFeeConfiguration: (id) => api.get(`/fee-configurations/${id}/`),
  createFeeConfiguration: (data) => api.post('/fee-configurations/', data),
  updateFeeConfiguration: (id, data) => api.patch(`/fee-configurations/${id}/`, data),
  deleteFeeConfiguration: (id) => api.delete(`/fee-configurations/${id}/`),

  // ── Fee Installments (échéancier) ──────────────────────────────
  getFeeInstallments: (feeConfigurationId) =>
    api.get(`/fee-installments/${q({ fee_configuration: feeConfigurationId })}`),
  createFeeInstallment: (data) => api.post('/fee-installments/', data),
  updateFeeInstallment: (id, data) => api.patch(`/fee-installments/${id}/`, data),
  deleteFeeInstallment: (id) => api.delete(`/fee-installments/${id}/`),
};

export default financeService;
