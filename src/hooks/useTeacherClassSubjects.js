import { useMemo } from 'react';
import { academicService } from '../services';
import { useApi } from './useApi';

// Classes/subjects the logged-in teacher is actually assigned to teach
// (ClassSubjectTeacher) — used to scope the teacher-facing e-learning content
// pages (Leçons, Devoirs, Quiz) so a teacher only ever sees/creates content
// for their own classes, never the whole school's.
export function useTeacherClassSubjects() {
  const { data: me } = useApi(() => academicService.getTeacherMe(), [], true);
  const teacherId = me?.id;

  const { data: assignmentsData, loading, refetch } = useApi(
    () => teacherId
      ? academicService.getClassSubjectTeachers({ teacher: teacherId, is_active: true, page_size: 200 })
      : Promise.resolve([]),
    [teacherId], true
  );
  const assignments = assignmentsData?.results || assignmentsData || [];

  const classesList = useMemo(() => {
    const seen = new Map();
    assignments.forEach(a => { if (!seen.has(a.class_obj)) seen.set(a.class_obj, { id: a.class_obj, name: a.class_name }); });
    return [...seen.values()];
  }, [assignments]);

  const subjectsList = useMemo(() => {
    const seen = new Map();
    assignments.forEach(a => { if (!seen.has(a.subject)) seen.set(a.subject, { id: a.subject, name: a.subject_name }); });
    return [...seen.values()];
  }, [assignments]);

  return { classesList, subjectsList, assignments, loading, teacherId, refetch };
}

export default useTeacherClassSubjects;
