import api from './api';

export const elearningService = {
  // Leçons
  getLessons: (params = {}) => {
    const cleanParams = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    const query = new URLSearchParams(cleanParams).toString();
    return api.get(`/elearning/lessons/${query ? `?${query}` : ''}`);
  },

  getLessonById: (id) => api.get(`/elearning/lessons/${id}/`),

  createLesson: (data) => api.post('/elearning/lessons/', data),

  // Create lesson with file upload (PDF, Word)
  createLessonWithFile: async (formData) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${api.baseUrl}/elearning/lessons/`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erreur création leçon');
    }
    return response.json();
  },

  updateLesson: (id, data) => api.patch(`/elearning/lessons/${id}/`, data),

  deleteLesson: (id) => api.delete(`/elearning/lessons/${id}/`),

  publishLesson: (id) => api.post(`/elearning/lessons/${id}/publish/`),

  // Pièces jointes de leçons
  getLessonAttachments: (lessonId) => api.get(`/elearning/lesson-attachments/?lesson=${lessonId}`),

  uploadAttachment: async (lessonId, formData) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${api.baseUrl}/elearning/lessons/${lessonId}/add-attachment/`, {
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

  deleteAttachment: (id) => api.delete(`/elearning/lesson-attachments/${id}/`),

  // Blocs de contenu (créateur de cours) — texte/HTML/iframe/youtube/vimeo
  createContentBlock: (data) => api.post('/elearning/lesson-attachments/', data),

  // Blocs de contenu avec fichier (vidéo/pdf/image/audio/fichier)
  createContentBlockWithFile: (formData) => api.upload('/elearning/lesson-attachments/', formData),

  updateContentBlock: (id, data) => api.patch(`/elearning/lesson-attachments/${id}/`, data),

  reorderContentBlocks: (blocks) => api.post('/elearning/lesson-attachments/reorder/', { blocks }),

  // Devoirs/Exercices
  getAssignments: (params = {}) => {
    const cleanParams = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    const query = new URLSearchParams(cleanParams).toString();
    return api.get(`/elearning/assignments/${query ? `?${query}` : ''}`);
  },

  getAssignmentById: (id) => api.get(`/elearning/assignments/${id}/`),

  createAssignment: (data) => api.post('/elearning/assignments/', data),

  updateAssignment: (id, data) => api.patch(`/elearning/assignments/${id}/`, data),

  // FormData (contains a File) must go through patchUpload — api.patch()
  // JSON.stringify()s the body, and JSON.stringify(FormData) is "{}", so
  // the file silently never reaches the server via a plain updateAssignment().
  updateAssignmentWithFile: (id, formData) => api.patchUpload(`/elearning/assignments/${id}/`, formData),

  deleteAssignment: (id) => api.delete(`/elearning/assignments/${id}/`),

  publishAssignment: (id) => api.post(`/elearning/assignments/${id}/publish/`),

  // Upload assignment with file
  createAssignmentWithFile: async (formData) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${api.baseUrl}/elearning/assignments/`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erreur création devoir');
    }
    return response.json();
  },

  // Soumissions
  getSubmissions: (assignmentId) => api.get(`/elearning/assignments/${assignmentId}/submissions/`),

  submitAssignment: async (assignmentId, formData) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${api.baseUrl}/elearning/assignments/${assignmentId}/submit/`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erreur soumission');
    }
    return response.json();
  },

  gradeSubmission: (submissionId, data) => api.post(`/elearning/submissions/${submissionId}/correct/`, data),
  gradeSubmissionWithFile: (submissionId, formData) => api.upload(`/elearning/submissions/${submissionId}/correct/`, formData),

  // Réunions Zoom
  getZoomMeetings: (params = {}) => {
    const cleanParams = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    const query = new URLSearchParams(cleanParams).toString();
    return api.get(`/elearning/zoom-meetings/${query ? `?${query}` : ''}`);
  },

  getZoomMeetingById: (id) => api.get(`/elearning/zoom-meetings/${id}/`),

  createZoomMeeting: (data) => api.post('/elearning/zoom/create-meeting/', data),

  // Manual Zoom meeting creation (without Zoom API)
  createZoomMeetingManual: (data) => api.post('/elearning/zoom-meetings/', data),

  updateZoomMeeting: (id, data) => api.patch(`/elearning/zoom-meetings/${id}/`, data),

  deleteZoomMeeting: (id) => api.delete(`/elearning/zoom-meetings/${id}/`),

  // Chapitres (parcours pédagogique)
  getChapters: (params = {}) => {
    const cleanParams = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    const query = new URLSearchParams(cleanParams).toString();
    return api.get(`/elearning/chapters/${query ? `?${query}` : ''}`);
  },

  createChapter: (data) => api.post('/elearning/chapters/', data),

  updateChapter: (id, data) => api.patch(`/elearning/chapters/${id}/`, data),

  deleteChapter: (id) => api.delete(`/elearning/chapters/${id}/`),

  // Parcours pédagogique (vue structurée pour un étudiant)
  getLearningPath: (classObjId, subjectId) =>
    api.get(`/elearning/learning-path/?class_obj=${classObjId}&subject=${subjectId}`),

  trackLessonProgress: (lessonId, data) => api.post(`/elearning/lessons/${lessonId}/track-progress/`, data),
  markLessonComplete: (lessonId) => api.post(`/elearning/lessons/${lessonId}/mark-complete/`),
  getMyCompletedLessons: () => api.get('/elearning/lessons/my-completed/'),

  // Quiz intelligents — édition (admin)
  getQuizzes: (params = {}) => {
    const cleanParams = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    const query = new URLSearchParams(cleanParams).toString();
    return api.get(`/elearning/quizzes/${query ? `?${query}` : ''}`);
  },
  getQuizById: (id) => api.get(`/elearning/quizzes/${id}/`),
  createQuiz: (data) => api.post('/elearning/quizzes/', data),
  updateQuiz: (id, data) => api.patch(`/elearning/quizzes/${id}/`, data),
  deleteQuiz: (id) => api.delete(`/elearning/quizzes/${id}/`),

  getQuestions: (quizId) => api.get(`/elearning/quiz-questions/?quiz=${quizId}`),
  createQuestion: (data) => api.post('/elearning/quiz-questions/', data),
  createQuestionWithImage: (formData) => api.upload('/elearning/quiz-questions/', formData),
  updateQuestion: (id, data) => api.patch(`/elearning/quiz-questions/${id}/`, data),
  deleteQuestion: (id) => api.delete(`/elearning/quiz-questions/${id}/`),

  createChoice: (data) => api.post('/elearning/quiz-choices/', data),
  updateChoice: (id, data) => api.patch(`/elearning/quiz-choices/${id}/`, data),
  deleteChoice: (id) => api.delete(`/elearning/quiz-choices/${id}/`),

  // Quiz intelligents — passage (étudiant)
  takeQuiz: (quizId) => api.get(`/elearning/quizzes/${quizId}/take/`),
  startQuizAttempt: (quizId) => api.post(`/elearning/quizzes/${quizId}/start-attempt/`),
  getQuizAnalytics: (quizId) => api.get(`/elearning/quizzes/${quizId}/analytics/`),
  aiGenerateQuestions: (quizId, data) => api.post(`/elearning/quizzes/${quizId}/ai-generate/`, data),
  gradeTextAnswer: (attemptId, data) => api.post(`/elearning/quiz-attempts/${attemptId}/grade-text/`, data),
  getLessonProgressOverview: (classId, subjectId) => api.get(`/elearning/lessons/progress-overview/?class_obj=${classId}&subject=${subjectId}`),
  getMyQuizAttempts: (quizId) => api.get(`/elearning/quizzes/${quizId}/my-attempts/`),
  getQuizAttempts: (quizId) => api.get(`/elearning/quiz-attempts/?quiz=${quizId}&page_size=100`),
  getQuizAttemptById: (id) => api.get(`/elearning/quiz-attempts/${id}/`),
  submitQuizAttempt: (attemptId, answers) => api.post(`/elearning/quiz-attempts/${attemptId}/submit/`, { answers }),

  // LOT 14 — Bibliothèque numérique
  getLibraryDocuments: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();
    return api.get(`/elearning/library/${q ? `?${q}` : ''}`);
  },
  getLibraryDocumentById: (id) => api.get(`/elearning/library/${id}/`),
  createLibraryDocument: (data) => api.post('/elearning/library/', data),
  createLibraryDocumentWithFile: (formData) => api.upload('/elearning/library/', formData),
  updateLibraryDocument: (id, data) => api.patch(`/elearning/library/${id}/`, data),
  deleteLibraryDocument: (id) => api.delete(`/elearning/library/${id}/`),
  toggleFavoriteDocument: (id) => api.post(`/elearning/library/${id}/toggle_favorite/`),
  trackDocumentView: (id) => api.post(`/elearning/library/${id}/track-view/`),
  trackDocumentDownload: (id) => api.post(`/elearning/library/${id}/track-download/`),
  saveReadingProgress: (id, currentPage) => api.post(`/elearning/library/${id}/save-progress/`, { current_page: currentPage }),
  getMyFavoriteDocuments: () => api.get('/elearning/library/my-favorites/'),

  // LOT 12 — Examens sécurisés
  getSecureExams: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();
    return api.get(`/elearning/exams/${q ? `?${q}` : ''}`);
  },
  getSecureExamById: (id) => api.get(`/elearning/exams/${id}/`),
  createSecureExam: (data) => api.post('/elearning/exams/', data),
  updateSecureExam: (id, data) => api.patch(`/elearning/exams/${id}/`, data),
  uploadSecureExamPdf: (id, formData) => api.patchUpload(`/elearning/exams/${id}/`, formData),
  deleteSecureExam: (id) => api.delete(`/elearning/exams/${id}/`),
  publishSecureExam: (id) => api.post(`/elearning/exams/${id}/publish/`),
  startExamSession: (examId) => api.post(`/elearning/exams/${examId}/start-session/`),
  logExamEvent: (examId, eventType, details = {}) => api.post(`/elearning/exams/${examId}/log-event/`, { event_type: eventType, details }),
  getExamSessions: (examId) => api.get(`/elearning/exams/${examId}/sessions/`),
  getExamRanking: (examId) => api.get(`/elearning/exams/${examId}/ranking/`),
  getMyExamSession: (examId) => api.get(`/elearning/exams/${examId}/my-session/`),
  getExamById: (id) => api.get(`/elearning/exams/${id}/`),
  gradeExamSession: (sessionId, data) => api.post(`/elearning/exam-sessions/${sessionId}/grade/`, data),
  gradeExamSessionWithFile: (sessionId, formData) => api.upload(`/elearning/exam-sessions/${sessionId}/grade/`, formData),
  submitExamFile: (sessionId, formData) => api.upload(`/elearning/exam-sessions/${sessionId}/submit-file/`, formData),
  uploadExamSnapshot: (sessionId, formData) =>
    api.upload(`/elearning/exams/sessions/${sessionId}/snapshot/`, formData),
  getExamSessionSnapshots: (sessionId) =>
    api.get(`/elearning/exams/sessions/${sessionId}/snapshot/`),

  // LOT 13 — Laboratoires virtuels
  getVirtualLabs: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();
    return api.get(`/elearning/labs/${q ? `?${q}` : ''}`);
  },
  getVirtualLabById: (id) => api.get(`/elearning/labs/${id}/`),
  createVirtualLab: (data) => api.post('/elearning/labs/', data),
  updateVirtualLab: (id, data) => api.patch(`/elearning/labs/${id}/`, data),
  deleteVirtualLab: (id) => api.delete(`/elearning/labs/${id}/`),
  publishVirtualLab: (id) => api.post(`/elearning/labs/${id}/publish/`),
  startLabSession: (labId) => api.post(`/elearning/labs/${labId}/start/`),
  getLabSubmissions: (labId) => api.get(`/elearning/labs/${labId}/submissions/`),
  getMyLabSubmission: (labId) => api.get(`/elearning/labs/${labId}/my-submission/`),
  submitLabWork: (submissionId, formData) => api.upload(`/elearning/lab-submissions/${submissionId}/submit/`, formData),
  gradeLabSubmission: (submissionId, data) => api.post(`/elearning/lab-submissions/${submissionId}/grade/`, data),

  // LOTS 15/16/17 — IA pédagogique / IA Enseignant / Correction automatique
  getAIConversations: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();
    return api.get(`/elearning/ai-conversations/${q ? `?${q}` : ''}`);
  },
  getAIConversationById: (id) => api.get(`/elearning/ai-conversations/${id}/`),
  createAIConversation: (data) => api.post('/elearning/ai-conversations/', data),
  deleteAIConversation: (id) => api.delete(`/elearning/ai-conversations/${id}/`),
  sendAIMessage: (conversationId, content) => api.post(`/elearning/ai-conversations/${conversationId}/send/`, { content }),
  clearAIConversation: (conversationId) => api.delete(`/elearning/ai-conversations/${conversationId}/clear/`),
  aiGenerate: (data) => api.post('/elearning/ai/generate/', data),
  aiGradeSubmission: (data) => api.post('/elearning/ai/grade/', data),

  // LOT 9 — Vidéothèque
  getVideos: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();
    return api.get(`/elearning/videos/${q ? `?${q}` : ''}`);
  },
  getVideoById: (id) => api.get(`/elearning/videos/${id}/`),
  createVideo: (data) => api.upload('/elearning/videos/', data),
  updateVideo: (id, data) => api.upload(`/elearning/videos/${id}/`, data, 'PATCH'),
  deleteVideo: (id) => api.delete(`/elearning/videos/${id}/`),
  trackVideoProgress: (id, position, completed = false) =>
    api.post(`/elearning/videos/${id}/track-progress/`, { position_seconds: position, is_completed: completed }),
  getVideoDownloadToken: (id) => api.post(`/elearning/videos/${id}/download-token/`),
  getVideoRecommendations: () => api.get('/elearning/videos/recommendations/'),
  getMyVideoProgress: () => api.get('/elearning/videos/my-progress/'),
  uploadVideoSubtitle: (id, data) => api.upload(`/elearning/videos/${id}/upload-subtitle/`, data),

  // Cours autonomes (Course module)
  getCourses: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();
    return api.get(`/elearning/courses/${q ? `?${q}` : ''}`);
  },
  getCourseById: (id) => api.get(`/elearning/courses/${id}/`),
  findCourseQuiz: (courseId) => api.get(`/elearning/courses/${courseId}/find-quiz/`),
  createCourse: (data) => api.post('/elearning/courses/', data),
  createCourseWithFile: (formData) => api.upload('/elearning/courses/', formData),
  updateCourse: (id, data) => api.patch(`/elearning/courses/${id}/`, data),
  updateCourseWithFile: (id, formData) => api.upload(`/elearning/courses/${id}/`, formData, 'PATCH'),
  deleteCourse: (id) => api.delete(`/elearning/courses/${id}/`),

  // Course sections
  getCourseSections: (courseId) => api.get(`/elearning/course-sections/?course=${courseId}`),
  createCourseSection: (data) => api.post('/elearning/course-sections/', data),
  updateCourseSection: (id, data) => api.patch(`/elearning/course-sections/${id}/`, data),
  deleteCourseSection: (id) => api.delete(`/elearning/course-sections/${id}/`),

  // Course chapters
  getCourseChapters: (sectionId) => api.get(`/elearning/course-chapters/?section=${sectionId}`),
  createCourseChapter: (data) => api.post('/elearning/course-chapters/', data),
  updateCourseChapter: (id, data) => api.patch(`/elearning/course-chapters/${id}/`, data),
  deleteCourseChapter: (id) => api.delete(`/elearning/course-chapters/${id}/`),

  // Course lessons
  getCourseLessons: (chapterId) => api.get(`/elearning/course-lessons/?chapter=${chapterId}`),
  createCourseLesson: (data) => api.post('/elearning/course-lessons/', data),
  createCourseLessonWithFile: (formData) => api.upload('/elearning/course-lessons/', formData),
  updateCourseLesson: (id, data) => api.patch(`/elearning/course-lessons/${id}/`, data),
  updateCourseLessonWithFile: (id, formData) => api.patchUpload(`/elearning/course-lessons/${id}/`, formData),
  deleteCourseLesson: (id) => api.delete(`/elearning/course-lessons/${id}/`),
  markCourseLessonComplete: (lessonId) => api.post(`/elearning/course-lessons/${lessonId}/mark-complete/`),
  getMyCompletedCourseLessons: () => api.get('/elearning/course-lessons/my-completed/'),

  // LOT 8 — Classes virtuelles
  getClassrooms: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();
    return api.get(`/elearning/classrooms/${q ? `?${q}` : ''}`);
  },
  getClassroomById: (id) => api.get(`/elearning/classrooms/${id}/`),
  createClassroom: (data) => api.post('/elearning/classrooms/', data),
  updateClassroom: (id, data) => api.patch(`/elearning/classrooms/${id}/`, data),
  deleteClassroom: (id) => api.delete(`/elearning/classrooms/${id}/`),
  endClassroom: (id) => api.post(`/elearning/classrooms/${id}/end/`),
  getClassroomPolls: (id) => api.get(`/elearning/classrooms/${id}/polls/`),
  createClassroomPoll: (id, data) => api.post(`/elearning/classrooms/${id}/polls/create/`, data),
  voteClassroomPoll: (classroomId, pollId, option) =>
    api.post(`/elearning/classrooms/${classroomId}/polls/${pollId}/vote/`, { option }),
  revealClassroomPoll: (classroomId, pollId) =>
    api.post(`/elearning/classrooms/${classroomId}/polls/${pollId}/reveal/`),
  getClassroomChat: (id) => api.get(`/elearning/classrooms/${id}/chat/`),
  sendClassroomChat: (id, message) => api.post(`/elearning/classrooms/${id}/chat/send/`, { message }),
  getClassroomHandRaises: (id) => api.get(`/elearning/classrooms/${id}/hand-raises/`),
  raiseHand: (id) => api.post(`/elearning/classrooms/${id}/raise-hand/`),
  lowerHand: (id) => api.post(`/elearning/classrooms/${id}/lower-hand/`),
  aiSummarizeClassroom: (id, transcript) =>
    api.post(`/elearning/classrooms/${id}/ai-summarize/`, { transcript }),

  // Segments de réunion
  getClassroomSegments: (id) => api.get(`/elearning/classrooms/${id}/segments/`),
  generateSegments: (id, data) => api.post(`/elearning/classrooms/${id}/generate-segments/`, data),
  scheduleClassroomTasks: (id) => api.post(`/elearning/classrooms/${id}/schedule-tasks/`),
  getClassroomLogs: (id) => api.get(`/elearning/classrooms/${id}/logs/`),
  getAttendanceSummary: (id) => api.get(`/elearning/classrooms/${id}/attendance-summary/`),

  // Actions sur segments
  startSegment: (segId) => api.post(`/elearning/meeting-segments/${segId}/start/`),
  endSegment: (segId) => api.post(`/elearning/meeting-segments/${segId}/end/`),
  joinSegment: (segId) => api.post(`/elearning/meeting-segments/${segId}/join/`),
  leaveSegment: (segId) => api.post(`/elearning/meeting-segments/${segId}/leave/`),
  getSegmentParticipants: (segId) => api.get(`/elearning/meeting-segments/${segId}/participants/`),
};

export default elearningService;
