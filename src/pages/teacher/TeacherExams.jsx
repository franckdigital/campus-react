import ExamManager from '../admin/ExamManager';
import { useNotifications } from '../../components/Notifications';
import { useTeacherClassSubjects } from '../../hooks/useTeacherClassSubjects';

export default function TeacherExams() {
  const { notify } = useNotifications();
  const { classesList, subjectsList } = useTeacherClassSubjects();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-black" style={{ color: '#1e293b' }}>Examens sécurisés</h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
          Créez et gérez les examens sécurisés de vos classes
        </p>
      </div>
      <ExamManager classesList={classesList} subjectsList={subjectsList} notify={notify} />
    </div>
  );
}
