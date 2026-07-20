import AssignmentManager from '../admin/AssignmentManager';
import { useNotifications } from '../../components/Notifications';
import { useTeacherClassSubjects } from '../../hooks/useTeacherClassSubjects';

export default function TeacherAssignments() {
  const { notify } = useNotifications();
  const { classesList, subjectsList } = useTeacherClassSubjects();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-black" style={{ color: '#1e293b' }}>Devoirs & Exercices</h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
          Créez et gérez les devoirs e-learning de vos classes
        </p>
      </div>
      <AssignmentManager classesList={classesList} subjectsList={subjectsList} notify={notify} />
    </div>
  );
}
