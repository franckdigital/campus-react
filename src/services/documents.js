import api from './api';

export const documentsService = {
  getAll: (params = {}) => {
    const cleanParams = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    const query = new URLSearchParams(cleanParams).toString();
    return api.get(`/documents/${query ? `?${query}` : ''}`);
  },

  getById: (id) => api.get(`/documents/${id}/`),

  upload: async (file, data) => {
    const formData = new FormData();
    formData.append('file', file);
    Object.keys(data).forEach(key => formData.append(key, data[key]));
    
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${api.baseUrl}/documents/`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erreur upload');
    }
    return response.json();
  },

  delete: (id) => api.delete(`/documents/${id}/`),

  download: async (id) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${api.baseUrl}/documents/${id}/download/`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (!response.ok) throw new Error('Download failed');
    return response.blob();
  },

  validate: (id, notes = '') => api.post(`/documents/${id}/validate/`, { notes }),

  reject: (id, notes = '') => api.post(`/documents/${id}/reject/`, { notes }),

  getCategories: () => api.get('/document-categories/'),

  createCategory: (data) => api.post('/document-categories/', data),
};

// Service pour les archives
export const archivesService = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/archives/${query ? `?${query}` : ''}`);
  },

  getById: (id) => api.get(`/archives/${id}/`),

  create: (data) => api.post('/archives/', data),

  update: (id, data) => api.patch(`/archives/${id}/`, data),

  delete: (id) => api.delete(`/archives/${id}/`),

  addDocument: (archiveId, documentId) => 
    api.post(`/archives/${archiveId}/add-document/`, { document_id: documentId }),

  removeDocument: (archiveId, documentId) => 
    api.post(`/archives/${archiveId}/remove-document/`, { document_id: documentId }),
};

export default documentsService;
