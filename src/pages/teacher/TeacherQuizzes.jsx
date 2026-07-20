import QuizManager from '../admin/quiz/QuizManager';
import { useNotifications } from '../../components/Notifications';
import { useApi } from '../../hooks/useApi';
import { useTeacherClassSubjects } from '../../hooks/useTeacherClassSubjects';
import { elearningService } from '../../services';

export default function TeacherQuizzes() {
  const { notify } = useNotifications();
  const { classesList, subjectsList } = useTeacherClassSubjects();

  // The backend already scopes this to the teacher's own classes/subjects
  // (see TeacherScopedContentMixin on LessonViewSet) — no client-side
  // filtering needed here.
  const { data: lessonsData } = useApi(() => elearningService.getLessons({ is_active: true, page_size: 200 }), [], true);
  const lessons = lessonsData?.results || lessonsData || [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-black" style={{ color: '#1e293b' }}>Quiz</h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
          Créez et gérez les quiz de vos classes et matières
        </p>
      </div>
      <QuizManager classesList={classesList} subjectsList={subjectsList} lessons={lessons} notify={notify} />
    </div>
  );
}
