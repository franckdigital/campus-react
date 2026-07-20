import api from './api';

const q = (params = {}) => {
  const s = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  return s ? `?${s}` : '';
};

export const remindersService = {
  getAll:  (params = {}) => api.get(`/reminder-configs/${q(params)}`),
  create:  (data)        => api.post('/reminder-configs/', data),
  update:  (id, data)    => api.patch(`/reminder-configs/${id}/`, data),
  remove:  (id)          => api.delete(`/reminder-configs/${id}/`),
  sendNow: (id)          => api.post(`/reminder-configs/${id}/send-now/`),
};

export default remindersService;
