import api from './api';

const q = (params = {}) => {
  const s = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  return s ? `?${s}` : '';
};

const attendanceService = {
  // ── Attendance sessions ──────────────────────────────────────────
  getSessions: (params = {}) => api.get(`/attendance-sessions/${q(params)}`),
  getSessionById: (id) => api.get(`/attendance-sessions/${id}/`),
  createSession: (data) => api.post('/attendance-sessions/', data),
  // get-or-create an attendance session for a recurring session + date
  openSession: (data) => api.post('/attendance/open/', data),
  closeSession: (id) => api.post(`/attendance-sessions/${id}/close/`),
  getSessionRecords: (id) => api.get(`/attendance-sessions/${id}/records/`),

  // ── Attendance records ──────────────────────────────────────────
  getRecords: (params = {}) => api.get(`/attendance-records/${q(params)}`),
  // upsert a single record + triggers parent notification on ABSENT
  markRecord: (data) => api.post('/attendance-records/mark/', data),
  // mark all students in a session with the same status
  bulkMark: (data) => api.post('/attendance-records/bulk-mark/', data),
  // per-student absence stats for D5
  getStudentStats: (params = {}) => api.get(`/attendance-records/student-stats/${q(params)}`),

  // ── Absence requests ────────────────────────────────────────────
  getAbsenceRequests: (params = {}) => api.get(`/absence-requests/${q(params)}`),
  createAbsenceRequest: (data) => {
    const form = new FormData();
    Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== null) form.append(k, v); });
    return api.post('/absence-requests/', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  approveAbsenceRequest: (id, notes = '') => api.post(`/absence-requests/${id}/approve/`, { notes }),
  rejectAbsenceRequest: (id, notes = '') => api.post(`/absence-requests/${id}/reject/`, { notes }),

  // ── QR per-class attendance ─────────────────────────────────────
  // Returns the raw API URL (to use as <img src=...> or download link)
  getClassQRUrl: (classId) => {
    const base = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1';
    return `${base}/attendance/class-qr/${classId}/`;
  },
  // List of enrolled students for the scan page (public, no auth)
  getClassStudents: (classId) => {
    const base = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1';
    return fetch(`${base}/attendance/class-students/${classId}/`).then(r => r.json());
  },
  // Today's academic sessions for a class (public, for scan page session picker)
  getClassSessionsToday: (classId) => {
    const base = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1';
    return fetch(`${base}/attendance/class-sessions-today/${classId}/`).then(r => r.json());
  },
  // Student scans own attendance (public) — body: {class_id, student_id, session_id} or {class_id, student_id, code}
  studentScan: (data) => {
    const base = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1';
    return fetch(`${base}/attendance/student-scan/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(async r => {
      const json = await r.json();
      if (!r.ok) throw json;
      return json;
    });
  },
  // Teacher: refresh & fetch QR image for an AttendanceSession (returns fetch Response for blob)
  getSessionQR: (attSessionId) => {
    const base = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1';
    const token = localStorage.getItem('access_token') || '';
    return fetch(`${base}/attendance/session-qr/${attSessionId}/`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
  // Admin triggers auto-mark-absent
  autoMarkAbsent: (data = {}) => api.post('/attendance/auto-mark-absent/', data),

  // legacy kept for backward compat
  markAttendance: (data) => api.post('/attendance-records/', data),
  getReport: (params = {}) => api.get(`/reports/attendance/${q(params)}`),
};

export { attendanceService };
export default attendanceService;
