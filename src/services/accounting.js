import api from './api';

const q = (params = {}) => {
  const s = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  return s ? `?${s}` : '';
};

export const accountingService = {
  // ── Accounts ─────────────────────────────────────────────────
  getAccounts: (params = {}) => api.get(`/accounting/accounts/${q(params)}`),
  createAccount: (data) => api.post('/accounting/accounts/', data),
  updateAccount: (id, data) => api.patch(`/accounting/accounts/${id}/`, data),
  deleteAccount: (id) => api.delete(`/accounting/accounts/${id}/`),

  // ── Journal Entries ───────────────────────────────────────────
  getJournalEntries: (params = {}) => api.get(`/accounting/journal-entries/${q(params)}`),
  getJournalEntryById: (id) => api.get(`/accounting/journal-entries/${id}/`),
  createJournalEntry: (data) => api.post('/accounting/journal-entries/', data),
  postJournalEntry: (id) => api.post(`/accounting/journal-entries/${id}/post/`),
  addJournalLine: (entryId, data) => api.post(`/accounting/journal-entries/${entryId}/add-line/`, data),

  // ── Trial Balance ─────────────────────────────────────────────
  getTrialBalance: (params = {}) => api.get(`/accounting/trial-balance/${q(params)}`),

  // ── Reports ───────────────────────────────────────────────────
  getRevenueReport: (params = {}) => api.get(`/accounting/reports/revenue/${q(params)}`),
  getUnpaidReport: (params = {}) => api.get(`/accounting/reports/unpaid/${q(params)}`),

  // ── Excel Export ──────────────────────────────────────────────
  exportExcel: async (params = {}) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${api.baseUrl}/accounting/exports/excel/${q(params)}`, {
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    if (!response.ok) throw new Error('Erreur export Excel');
    return response.blob();
  },

  // ── Init OHADA ────────────────────────────────────────────────
  initOHADA: (data) => api.post('/accounting/init-ohada/', data),

  // ── Replay journal entries for existing validated payments ────
  replayJournal: (data = {}) => api.post('/accounting/replay-journal/', data),
};

export default accountingService;
