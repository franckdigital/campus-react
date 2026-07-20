import api from './api';

export const teachersService = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/teachers/${query ? `?${query}` : ''}`);
  },

  getById: (id) => api.get(`/teachers/${id}/`),

  create: (data) => api.post('/teachers/', data),

  update: (id, data) => api.patch(`/teachers/${id}/`, data),

  delete: (id) => api.delete(`/teachers/${id}/`),
};

export default teachersService;
