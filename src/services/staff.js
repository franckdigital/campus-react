import api from './api';

const q = (params = {}) => {
  const s = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  return s ? `?${s}` : '';
};

export const staffService = {
  getStaff:      (params = {}) => api.get(`/staff/${q(params)}`),
  getStaffById:  (id)          => api.get(`/staff/${id}/`),
  createStaff:   (data)        => api.post('/staff/', data),
  updateStaff:   (id, data)    => api.patch(`/staff/${id}/`, data),
  deleteStaff:   (id)          => api.delete(`/staff/${id}/`),
  getStaffProfil:(id)          => api.get(`/staff/${id}/profil/`),
  getStaffFicheUrl: (id) => {
    const base  = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1';
    const token = localStorage.getItem('access_token') || '';
    return `${base}/staff/${id}/fiche/?token=${token}`;
  },

  // Experiences
  getStaffExperiences:   (id)       => api.get(`/staff/${id}/experiences/`),
  addStaffExperience:    (id, data)  => api.post(`/staff/${id}/experiences/`, data),
  deleteStaffExperience: (id, expId) => api.delete(`/staff/${id}/experiences/${expId}/`),

  // Documents
  getStaffDocuments:    (id)                => api.get(`/staff/${id}/documents/`),
  uploadStaffDocument:  (id, formData)      => api.upload(`/staff/${id}/documents/`, formData),
  deleteStaffDocument:  (id, docId)         => api.delete(`/staff/${id}/documents/${docId}/`),
};

export default staffService;
