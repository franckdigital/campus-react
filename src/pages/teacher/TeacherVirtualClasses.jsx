import VirtualClassroomManager from '../admin/VirtualClassroomManager';
import { useTeacherClassSubjects } from '../../hooks/useTeacherClassSubjects';

export default function TeacherVirtualClasses() {
  const { classesList, subjectsList } = useTeacherClassSubjects();

  return (
    <div className="max-w-6xl mx-auto">
      <VirtualClassroomManager classesList={classesList} subjectsList={subjectsList} />
    </div>
  );
}
