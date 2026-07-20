import api from './api';

const q = (params = {}) => {
  const s = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  return s ? `?${s}` : '';
};

export const academicService = {
  // ── Programs ──────────────────────────────────────────────────
  getPrograms: (params = {}) => api.get(`/programs/${q(params)}`),
  getProgramById: (id) => api.get(`/programs/${id}/`),
  createProgram: (data) => api.post('/programs/', data),
  updateProgram: (id, data) => api.patch(`/programs/${id}/`, data),
  deleteProgram: (id) => api.delete(`/programs/${id}/`),

  // ── Levels ────────────────────────────────────────────────────
  getLevels: (params = {}) => api.get(`/levels/${q(params)}`),
  getLevelById: (id) => api.get(`/levels/${id}/`),
  createLevel: (data) => api.post('/levels/', data),
  updateLevel: (id, data) => api.patch(`/levels/${id}/`, data),
  deleteLevel: (id) => api.delete(`/levels/${id}/`),

  // ── Classes ───────────────────────────────────────────────────
  getClasses: (params = {}) => api.get(`/classes/${q(params)}`),
  getClassById: (id) => api.get(`/classes/${id}/`),
  createClass: (data) => api.post('/classes/', data),
  updateClass: (id, data) => api.patch(`/classes/${id}/`, data),
  deleteClass: (id) => api.delete(`/classes/${id}/`),
  getClassStudents: (classId) => api.get(`/classes/${classId}/students/`),
  getClassSchedule: (classId) => api.get(`/classes/${classId}/schedule/`),
  assignTeacherToClass: (classId, data) => api.post(`/classes/${classId}/assign-teacher/`, data),

  // ── Subjects ──────────────────────────────────────────────────
  getSubjects: (params = {}) => api.get(`/subjects/${q(params)}`),
  getSubjectById: (id) => api.get(`/subjects/${id}/`),
  createSubject: (data) => api.post('/subjects/', data),
  updateSubject: (id, data) => api.patch(`/subjects/${id}/`, data),
  deleteSubject: (id) => api.delete(`/subjects/${id}/`),

  // ── Level ↔ Subject assignments ───────────────────────────────
  getLevelSubjects: (params = {}) => api.get(`/level-subjects/${q(params)}`),
  createLevelSubject: (data) => api.post('/level-subjects/', data),
  deleteLevelSubject: (id) => api.delete(`/level-subjects/${id}/`),
  updateLevelSubject: (id, data) => api.patch(`/level-subjects/${id}/`, data),

  // ── Teacher ↔ Subject ↔ Class assignments ────────────────────
  getClassSubjectTeachers: (params = {}) => api.get(`/class-subject-teachers/${q(params)}`),
  createClassSubjectTeacher: (data) => api.post('/class-subject-teachers/', data),
  deleteClassSubjectTeacher: (id) => api.delete(`/class-subject-teachers/${id}/`),

  // ── Enrollments ───────────────────────────────────────────────
  getEnrollments: (params = {}) => api.get(`/enrollments/${q(params)}`),
  createEnrollment: (data) => api.post('/enrollments/', data),
  updateEnrollment: (id, data) => api.patch(`/enrollments/${id}/`, data),
  deleteEnrollment: (id) => api.delete(`/enrollments/${id}/`),

  // ── Rooms ─────────────────────────────────────────────────────
  getRooms: (params = {}) => api.get(`/rooms/${q(params)}`),
  createRoom: (data) => api.post('/rooms/', data),
  updateRoom: (id, data) => api.patch(`/rooms/${id}/`, data),
  deleteRoom: (id) => api.delete(`/rooms/${id}/`),

  // ── Sessions (Timetable) ──────────────────────────────────────
  getSessions: (params = {}) => api.get(`/sessions/${q(params)}`),
  getSessionById: (id) => api.get(`/sessions/${id}/`),
  createSession: (data) => api.post('/sessions/', data),
  updateSession: (id, data) => api.patch(`/sessions/${id}/`, data),
  deleteSession: (id) => api.delete(`/sessions/${id}/`),

  // ── Teachers ──────────────────────────────────────────────────
  getTeacherMe: () => api.get('/teachers/me/'),
  getTeachers: (params = {}) => api.get(`/teachers/${q(params)}`),
  getTeacherById: (id) => api.get(`/teachers/${id}/`),
  createTeacher: (data) => api.post('/teachers/', data),
  updateTeacher: (id, data) => api.patch(`/teachers/${id}/`, data),
  deleteTeacher: (id) => api.delete(`/teachers/${id}/`),
  getTeacherLoad: () => api.get('/teachers/load/'),
  getTeacherSessions: (id) => api.get(`/teachers/${id}/sessions/`),
  getTeacherProfil: (id) => api.get(`/teachers/${id}/profil/`),
  getTeacherFicheUrl: (id) => {
    const base = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1';
    const token = localStorage.getItem('access_token') || '';
    return `${base}/teachers/${id}/fiche/?token=${token}`;
  },

  // ── Teacher Experiences ───────────────────────────────────────
  getTeacherExperiences:    (id)        => api.get(`/teachers/${id}/experiences/`),
  addTeacherExperience:     (id, data)  => api.post(`/teachers/${id}/experiences/`, data),
  deleteTeacherExperience:  (id, expId) => api.delete(`/teachers/${id}/experiences/${expId}/`),

  // ── Teacher Documents ─────────────────────────────────────────
  getTeacherDocuments: (id) => api.get(`/teachers/${id}/documents/`),
  uploadTeacherDocument: (id, formData) => api.upload(`/teachers/${id}/documents/`, formData),
  deleteTeacherDocument: (teacherId, docId) =>
    api.delete(`/teachers/${teacherId}/documents/${docId}/`),

  // ── Academic Years ────────────────────────────────────────────
  getAcademicYears: (params = {}) => api.get(`/academic-years/${q(params)}`),
  getCurrentAcademicYear: () => api.get('/academic-years/current/'),
  createAcademicYear: (data) => api.post('/academic-years/', data),
  updateAcademicYear: (id, data) => api.patch(`/academic-years/${id}/`, data),
  setCurrentAcademicYear: (id) => api.post(`/academic-years/${id}/set_current/`),

  // ── Semesters ─────────────────────────────────────────────────
  getSemesters: (params = {}) => api.get(`/semesters/${q(params)}`),
  getSemesterById: (id) => api.get(`/semesters/${id}/`),
  createSemester: (data) => api.post('/semesters/', data),
  updateSemester: (id, data) => api.patch(`/semesters/${id}/`, data),
  deleteSemester: (id) => api.delete(`/semesters/${id}/`),
};

export default academicService;
