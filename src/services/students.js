import api from './api';

export const studentsService = {
  // Current student (self-service portal)
  getMe: () => api.get('/students/me/'),

  // Basic CRUD
  getAll: (params = {}) => {
    const cleanParams = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    
    const query = new URLSearchParams(cleanParams).toString();
    return api.get(`/students/${query ? `?${query}` : ''}`);
  },

  getById: (id) => api.get(`/students/${id}/`),

  create: (data) => api.post('/students/', data),

  update: (id, data) => api.patch(`/students/${id}/`, data),

  delete: (id) => api.delete(`/students/${id}/`),

  // Dossier étudiant complet
  getDossier: (id) => api.get(`/students/${id}/dossier/`),

  // Analyse KPI / IA des performances académiques
  getKpiAnalysis: (id, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/students/${id}/kpi-analysis/${query ? `?${query}` : ''}`);
  },

  // Gestion des fichiers/dossiers
  getFiles: (studentId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/students/${studentId}/files/${query ? `?${query}` : ''}`);
  },

  addFile: (studentId, data) => api.post(`/students/${studentId}/add-file/`, data),

  // Gestion des parents
  linkParent: (studentId, data) => api.post(`/students/${studentId}/link-parent/`, data),

  unlinkParent: (studentId, parentId) => 
    api.post(`/students/${studentId}/unlink-parent/`, { parent_id: parentId }),

  // Carte étudiant
  getCard: (studentId, academicYearId = null) => {
    const params = academicYearId ? `?academic_year_id=${academicYearId}` : '';
    return api.get(`/students/${studentId}/card/${params}`);
  },

  generateCard: (studentId, data) => api.post(`/students/${studentId}/generate-card/`, data),

  // Inscriptions
  getEnrollments: (studentId) => api.get(`/students/${studentId}/enrollments/`),

  // Échéancier de scolarité (per-installment payment schedule breakdown)
  getEcheancier: (studentId) => api.get(`/students/${studentId}/echeancier/`),
};

// Service pour les fichiers étudiants
export const studentFilesService = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/student-files/${query ? `?${query}` : ''}`);
  },

  getById: (id) => api.get(`/student-files/${id}/`),

  create: (data) => api.post('/student-files/', data),

  update: (id, data) => api.patch(`/student-files/${id}/`, data),

  delete: (id) => api.delete(`/student-files/${id}/`),
};

// Service pour les cartes étudiants
export const studentCardsService = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/student-cards/${query ? `?${query}` : ''}`);
  },

  getById: (id) => api.get(`/student-cards/${id}/`),

  update: (id, data) => api.patch(`/student-cards/${id}/`, data),
};

// Service pour les parents
export const parentsService = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/parents/${query ? `?${query}` : ''}`);
  },

  getById: (id) => api.get(`/parents/${id}/`),

  create: (data) => api.post('/parents/', data),

  update: (id, data) => api.patch(`/parents/${id}/`, data),

  delete: (id) => api.delete(`/parents/${id}/`),

  getStudents: (parentId) => api.get(`/parents/${parentId}/students/`),

  resetPassword: (parentId, password) => api.post(`/parents/${parentId}/reset-password/`, { password }),

  // Parent portal: current user's profile and children
  getMe: () => api.get('/parents/me/'),
  getMyStudents: () => api.get('/parents/me/students/'),
};

export default studentsService;
