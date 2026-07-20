import api from './api';

export const classesService = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/classes/${query ? `?${query}` : ''}`);
  },

  getById: (id) => api.get(`/classes/${id}/`),

  create: (data) => api.post('/classes/', data),

  update: (id, data) => api.patch(`/classes/${id}/`, data),

  delete: (id) => api.delete(`/classes/${id}/`),

  getStudents: (classId) => api.get(`/classes/${classId}/students/`),
};

export default classesService;
