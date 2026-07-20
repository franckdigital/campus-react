const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/auth/login/`,
  REGISTER: `${API_BASE_URL}/auth/register/`,
  LOGOUT: `${API_BASE_URL}/auth/logout/`,
  REFRESH: `${API_BASE_URL}/auth/token/refresh/`,
  PROFILE: `${API_BASE_URL}/auth/profile/`,
  
  // Users
  USERS: `${API_BASE_URL}/auth/users/`,
  
  // Core
  SITES: `${API_BASE_URL}/sites/`,
  ACADEMIC_YEARS: `${API_BASE_URL}/academic-years/`,
  
  // Students
  STUDENTS: `${API_BASE_URL}/students/`,
  PARENTS: `${API_BASE_URL}/parents/`,
  
  // Academic
  PROGRAMS: `${API_BASE_URL}/programs/`,
  LEVELS: `${API_BASE_URL}/levels/`,
  CLASSES: `${API_BASE_URL}/classes/`,
  SUBJECTS: `${API_BASE_URL}/subjects/`,
  TEACHERS: `${API_BASE_URL}/teachers/`,
  ENROLLMENTS: `${API_BASE_URL}/enrollments/`,
  
  // Attendance
  ATTENDANCE_SESSIONS: `${API_BASE_URL}/attendance-sessions/`,
  ATTENDANCE_RECORDS: `${API_BASE_URL}/attendance-records/`,
  
  // Finance
  INVOICES: `${API_BASE_URL}/invoices/`,
  PAYMENTS: `${API_BASE_URL}/payments/`,
  FEE_TYPES: `${API_BASE_URL}/fee-types/`,
  
  // Documents
  DOCUMENTS: `${API_BASE_URL}/documents/`,
  DOCUMENT_CATEGORIES: `${API_BASE_URL}/document-categories/`,
  
  // E-Learning
  LESSONS: `${API_BASE_URL}/lessons/`,
  ASSIGNMENTS: `${API_BASE_URL}/assignments/`,
  ZOOM_MEETINGS: `${API_BASE_URL}/zoom-meetings/`,
  
  // Chat
  CHATS: `${API_BASE_URL}/chats/`,
  
  // Notifications
  NOTIFICATIONS: `${API_BASE_URL}/notifications/`,
  
  // Reports
  DASHBOARD: `${API_BASE_URL}/reports/dashboard/`,
  FINANCE_REPORT: `${API_BASE_URL}/reports/finance/`,
  ATTENDANCE_REPORT: `${API_BASE_URL}/reports/attendance/`,
};

export default API_BASE_URL;
