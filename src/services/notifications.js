import api from './api';

const q = (params = {}) => {
  const s = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  return s ? `?${s}` : '';
};

export const notificationsService = {
  // ── In-app notifications ──────────────────────────────────────
  getAll:        (params = {}) => api.get(`/notifications/${q(params)}`),
  getUnread:     ()            => api.get('/notifications/unread/'),
  getUnreadCount:()            => api.get('/notifications/unread-count/'),
  markAsRead:    (id)          => api.post(`/notifications/${id}/read/`),
  markAllAsRead: ()            => api.post('/notifications/mark-all-read/'),

  // ── Send / broadcast ─────────────────────────────────────────
  send:          (data)        => api.post('/notifications/send/', data),

  // ── Delivery logs (H3) ────────────────────────────────────────
  getLogs:       (params = {}) => api.get(`/notification-logs/${q(params)}`),
  retryLog:      (logId)       => api.post(`/notification-logs/${logId}/retry/`),
  getStats:      (params = {}) => api.get(`/notifications/stats/${q(params)}`),

  // ── Templates ────────────────────────────────────────────────
  getTemplates:  (params = {}) => api.get(`/notification-templates/${q(params)}`),
  createTemplate:(data)        => api.post('/notification-templates/', data),
  updateTemplate:(id, data)    => api.patch(`/notification-templates/${id}/`, data),
  deleteTemplate:(id)          => api.delete(`/notification-templates/${id}/`),

  // ── Preferences ──────────────────────────────────────────────
  getPreferences:   ()         => api.get('/notification-preferences/'),
  updatePreferences:(data)     => api.patch('/notification-preferences/', data),
};

export default notificationsService;
