import CourseManager from '../admin/CourseManager';
import { useTeacherClassSubjects } from '../../hooks/useTeacherClassSubjects';

export default function TeacherCourses() {
  const { classesList, subjectsList } = useTeacherClassSubjects();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-black" style={{ color: '#1e293b' }}>Mes cours</h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
          Créez et structurez vos cours autonomes (sections, chapitres, leçons)
        </p>
      </div>
      <CourseManager classesList={classesList} subjectsList={subjectsList} />
    </div>
  );
}
