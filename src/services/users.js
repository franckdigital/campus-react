import api from './api';

const clean = (params) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});

const qs = (params) => {
  const q = new URLSearchParams(clean(params)).toString();
  return q ? `?${q}` : '';
};

export const usersService = {
  // ── Self-service (own account) ────────────────────────
  getMe: () => api.get('/auth/me/'),
  updateMe: (data) => api.patch('/auth/me/', data),
  changeMyPassword: (oldPassword, newPassword, newPasswordConfirm) =>
    api.post('/auth/change-password/', {
      old_password: oldPassword,
      new_password: newPassword,
      new_password_confirm: newPasswordConfirm,
    }),

  // ── Users ─────────────────────────────────────────────
  getAll: (params = {}) => api.get(`/auth/users/${qs(params)}`),
  getById: (id) => api.get(`/auth/users/${id}/`),
  create: (data) => api.post('/auth/users/', data),
  update: (id, data) => api.patch(`/auth/users/${id}/`, data),
  delete: (id) => api.delete(`/auth/users/${id}/`),
  assignRole: (userId, roleId, siteId) =>
    api.post(`/auth/users/${userId}/assign_role/`, { role_id: roleId, ...(siteId ? { site_id: siteId } : {}) }),
  removeRole: (userId, roleId, siteId) =>
    api.post(`/auth/users/${userId}/remove_role/`, { role_id: roleId, ...(siteId ? { site_id: siteId } : {}) }),
  resetPassword: (userId, password) => api.post(`/auth/users/${userId}/reset-password/`, { password }),

  // ── Roles ─────────────────────────────────────────────
  getRoles: (params = {}) => api.get(`/auth/roles/${qs(params)}`),
  getRoleById: (id) => api.get(`/auth/roles/${id}/`),
  createRole: (data) => api.post('/auth/roles/', data),
  updateRole: (id, data) => api.patch(`/auth/roles/${id}/`, data),
  deleteRole: (id) => api.delete(`/auth/roles/${id}/`),

  // ── Permissions ───────────────────────────────────────
  getPermissions: (params = {}) => api.get(`/auth/permissions/${qs(params)}`),
  createPermission: (data) => api.post('/auth/permissions/', data),
  updatePermission: (id, data) => api.patch(`/auth/permissions/${id}/`, data),
  deletePermission: (id) => api.delete(`/auth/permissions/${id}/`),

  // ── Audit Logs ────────────────────────────────────────
  getAuditLogs: (params = {}) => api.get(`/audit-logs/${qs(params)}`),
};

export default usersService;
