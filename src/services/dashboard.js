import api from './api';

export const dashboardService = {
  // Statistiques globales
  getStats: () => api.get('/dashboard/stats/'),

  // Données pour les graphiques
  getRevenueChart: (params = {}) => {
    const cleanParams = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    const query = new URLSearchParams(cleanParams).toString();
    return api.get(`/dashboard/revenue-chart/${query ? `?${query}` : ''}`);
  },

  getAttendanceChart: (params = {}) => {
    const cleanParams = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    const query = new URLSearchParams(cleanParams).toString();
    return api.get(`/dashboard/attendance-chart/${query ? `?${query}` : ''}`);
  },

  // Inscriptions récentes
  getRecentEnrollments: (limit = 5) => api.get(`/dashboard/recent-enrollments/?limit=${limit}`),

  // Événements à venir
  getUpcomingEvents: (limit = 3) => api.get(`/dashboard/upcoming-events/?limit=${limit}`),

  // Rapports
  getFinanceReport: (params = {}) => {
    const cleanParams = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    const query = new URLSearchParams(cleanParams).toString();
    return api.get(`/reports/finance/${query ? `?${query}` : ''}`);
  },

  getAttendanceReport: (params = {}) => {
    const cleanParams = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    const query = new URLSearchParams(cleanParams).toString();
    return api.get(`/reports/attendance/${query ? `?${query}` : ''}`);
  },

  getStudentReport: (params = {}) => {
    const cleanParams = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    const query = new URLSearchParams(cleanParams).toString();
    return api.get(`/reports/students/${query ? `?${query}` : ''}`);
  },

  getGradesReport: (params = {}) => {
    const cleanParams = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    const query = new URLSearchParams(cleanParams).toString();
    return api.get(`/reports/grades/${query ? `?${query}` : ''}`);
  },

  getElearningReport: (params = {}) => {
    const cleanParams = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    const query = new URLSearchParams(cleanParams).toString();
    return api.get(`/reports/elearning/${query ? `?${query}` : ''}`);
  },
};

export default dashboardService;
