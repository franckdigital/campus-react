import api from './api';

const q = (params = {}) => {
  const s = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  return s ? `?${s}` : '';
};

const landingService = {
  askAI: async (question) => {
    return await api.post('/landing/ai-assistant/', { question });
  },

  getAIResponses: (params = {}) => api.get(`/ai-responses/${q(params)}`),

  createAIResponse: async (data) => {
    return await api.post('/ai-responses/', data);
  },

  updateAIResponse: async (id, data) => {
    return await api.patch(`/ai-responses/${id}/`, data);
  },

  deleteAIResponse: async (id) => {
    return await api.delete(`/ai-responses/${id}/`);
  },
};

export default landingService;
