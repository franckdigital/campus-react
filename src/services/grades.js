import api from './api';

const q = (params = {}) => {
  const s = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  return s ? `?${s}` : '';
};

export const gradesService = {
  // ── Grade Categories ──────────────────────────────────────────
  getCategories: (params = {}) => api.get(`/grade-categories/${q(params)}`),
  createCategory: (data) => api.post('/grade-categories/', data),
  updateCategory: (id, data) => api.patch(`/grade-categories/${id}/`, data),
  deleteCategory: (id) => api.delete(`/grade-categories/${id}/`),

  // ── Evaluations (G1) ─────────────────────────────────────────
  getEvaluations: (params = {}) => api.get(`/evaluations/${q(params)}`),
  getEvaluationById: (id) => api.get(`/evaluations/${id}/`),
  createEvaluation: (data) => api.post('/evaluations/', data),
  updateEvaluation: (id, data) => api.patch(`/evaluations/${id}/`, data),
  deleteEvaluation: (id) => api.delete(`/evaluations/${id}/`),
  lockEvaluation: (id) => api.post(`/evaluations/${id}/lock/`),
  unlockEvaluation: (id) => api.post(`/evaluations/${id}/unlock/`),

  // ── Grade entry (G2) ─────────────────────────────────────────
  getStudentsGrades: (evaluationId) => api.get(`/evaluations/${evaluationId}/students-grades/`),
  enterGrades: (evaluationId, grades) => api.post(`/evaluations/${evaluationId}/enter-grades/`, { grades }),

  // ── Individual grades ────────────────────────────────────────
  getGrades: (params = {}) => api.get(`/grades/${q(params)}`),
  createGrade: (data) => api.post('/grades/', data),
  updateGrade: (id, data) => api.patch(`/grades/${id}/`, data),
  deleteGrade: (id) => api.delete(`/grades/${id}/`),

  // ── Report Cards / Bulletins (G3) ────────────────────────────
  getReportCards: (params = {}) => api.get(`/report-cards/${q(params)}`),
  getReportCardById: (id) => api.get(`/report-cards/${id}/`),
  createReportCard: (data) => api.post('/report-cards/', data),
  updateReportCard: (id, data) => api.patch(`/report-cards/${id}/`, data),
  deleteReportCard: (id) => api.delete(`/report-cards/${id}/`),
  generateBulletins: (data) => api.post('/report-cards/generate/', data),
  repairRanks: () => api.post('/report-cards/repair-ranks/', {}),
  publishReportCard: (id) => api.post(`/report-cards/${id}/publish/`),

  getBulletinHtmlUrl: (id) => {
    const base = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1';
    const token = localStorage.getItem('access_token') || '';
    return `${base}/report-cards/${id}/html/?token=${token}`;
  },

  // ── E-Learning ↔ Grades sync ─────────────────────────────────────────────
  getElearningEvaluations: (params = {}) => api.get(`/elearning-evaluations/${q(params)}`),
  getElearningStudentScores: (type, id) => api.get(`/elearning-student-scores/${type}/${id}/`),
  importElearningGrades: (data) => api.post('/elearning-import-grades/', data),

  getBulletinPdf: async (reportCardId) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${api.baseUrl}/report-cards/${reportCardId}/pdf/`, {
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    if (!response.ok) throw new Error('Erreur génération PDF');
    return response.blob();
  },
};

export default gradesService;
