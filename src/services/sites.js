import api from './api';

const q = (params = {}) => {
  const s = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  return s ? `?${s}` : '';
};

const sitesService = {
  getAll: (params = {}) => api.get(`/sites/${q(params)}`),
  getSites: (params = {}) => api.get(`/sites/${q(params)}`),

  getSite: async (id) => {
    return await api.get(`/sites/${id}/`);
  },

  createSite: async (data) => {
    return await api.post('/sites/', data);
  },

  updateSite: async (id, data) => {
    return await api.patch(`/sites/${id}/`, data);
  },

  deleteSite: async (id) => {
    return await api.delete(`/sites/${id}/`);
  },

  uploadLogo: async (id, file) => {
    const formData = new FormData();
    formData.append('logo', file);
    return await api.patch(`/sites/${id}/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default sitesService;
