import VirtualLabManager from '../admin/VirtualLabManager';
import { useNotifications } from '../../components/Notifications';
import { useApi } from '../../hooks/useApi';
import { useTeacherClassSubjects } from '../../hooks/useTeacherClassSubjects';
import { elearningService } from '../../services';

export default function TeacherVirtualLabs() {
  const { notify } = useNotifications();
  const { classesList, subjectsList } = useTeacherClassSubjects();

  // Backend already scopes this to the teacher's own classes/subjects.
  const { data: lessonsData } = useApi(() => elearningService.getLessons({ is_active: true, page_size: 200 }), [], true);
  const lessons = lessonsData?.results || lessonsData || [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-black" style={{ color: '#1e293b' }}>Laboratoires virtuels</h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
          Créez et gérez les laboratoires pratiques de vos classes
        </p>
      </div>
      <VirtualLabManager classesList={classesList} subjectsList={subjectsList} lessons={lessons} selectedClass="all" notify={notify} />
    </div>
  );
}
