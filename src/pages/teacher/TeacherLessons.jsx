import LessonsHub from '../admin/LessonsHub';
import { useTeacherClassSubjects } from '../../hooks/useTeacherClassSubjects';

export default function TeacherLessons() {
  const { classesList, subjectsList } = useTeacherClassSubjects();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-black" style={{ color: '#1e293b' }}>Mes leçons</h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
          Créez et gérez les leçons de vos classes et matières
        </p>
      </div>
      <LessonsHub classesList={classesList} subjectsList={subjectsList} />
    </div>
  );
}
