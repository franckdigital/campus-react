import { useState, useEffect } from 'react';
import { BookMarked, Trash2, Check, Layers } from 'lucide-react';
import { academicService } from '../../services';
import { useNotifications } from '../../components/Notifications';
import { useTeacherClassSubjects } from '../../hooks/useTeacherClassSubjects';

const COLOR = '#0d9488';

export default function TeacherMySubjects() {
  const { notify } = useNotifications();
  const { assignments, loading, refetch } = useTeacherClassSubjects();

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [affClass, setAffClass] = useState('');
  const [affSubject, setAffSubject] = useState('');
  const [levelSubjects, setLevelSubjects] = useState([]);
  const [loadingLevelSubs, setLoadingLevelSubs] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    academicService.getClasses({ page_size: 500 }).then(d => setClasses(d?.results || d || [])).catch(() => {});
    academicService.getSubjects({ page_size: 500 }).then(d => setSubjects(d?.results || d || [])).catch(() => {});
  }, []);

  // Only offer classes on the same site(s) as the teacher's existing assignments —
  // mirrors the backend's own restriction, avoids picking a class from another school.
  const knownClassIds = new Set(assignments.map(a => String(a.class_obj)));
  const knownSiteIds = new Set(
    classes.filter(c => knownClassIds.has(String(c.id))).map(c => c.site)
  );
  const availableClasses = knownSiteIds.size > 0
    ? classes.filter(c => knownSiteIds.has(c.site))
    : classes;

  useEffect(() => {
    if (!affClass) { setLevelSubjects([]); setAffSubject(''); return; }
    const cls = classes.find(c => String(c.id) === String(affClass));
    if (!cls?.level) { setLevelSubjects(subjects); setAffSubject(''); return; }
    setLoadingLevelSubs(true);
    setAffSubject('');
    academicService.getLevelSubjects({ level: cls.level, is_active: true })
      .then(d => {
        const ls = Array.isArray(d) ? d : (d?.results || []);
        const subjectIds = new Set(ls.map(x => String(x.subject)));
        setLevelSubjects(subjects.filter(s => subjectIds.has(String(s.id))));
      })
      .catch(() => setLevelSubjects(subjects))
      .finally(() => setLoadingLevelSubs(false));
  }, [affClass, classes, subjects]);

  async function addAssignment() {
    if (!affClass || !affSubject) return;
    setAdding(true);
    try {
      await academicService.createClassSubjectTeacher({ class_obj: affClass, subject: affSubject });
      notify('Matière ajoutée à vos affectations.', 'success');
      setAffClass(''); setAffSubject(''); setLevelSubjects([]);
      refetch();
    } catch (err) {
      notify(err?.response?.data?.detail || 'Erreur (déjà assignée ou données invalides).', 'error');
    }
    setAdding(false);
  }

  async function removeAssignment(id) {
    if (!window.confirm('Retirer cette matière de vos affectations ?')) return;
    try {
      await academicService.deleteClassSubjectTeacher(id);
      notify('Affectation retirée.', 'warning');
      refetch();
    } catch {
      notify('Erreur lors de la suppression.', 'error');
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: '#f0fdfa' }}>
            <BookMarked className="h-3 w-3" style={{ color: COLOR }} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: COLOR }}>Emploi du temps</span>
        </div>
        <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a', letterSpacing: '-0.03em' }}>Mes matières</h1>
        <p className="text-sm mt-0.5 font-medium" style={{ color: '#94a3b8' }}>
          Déclarez les classes et matières que vous enseignez — nécessaire pour que vos cours, devoirs, quiz et examens vous soient bien attribués.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <p className="text-xs font-bold mb-3" style={{ color: '#64748b' }}>Mes affectations actuelles</p>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: '#f1f5f9' }} />)}
            </div>
          ) : assignments.length === 0 ? (
            <div className="flex flex-col items-center py-10 rounded-xl gap-2" style={{ background: '#f8fafc' }}>
              <Layers className="h-8 w-8 opacity-20" style={{ color: '#64748b' }} />
              <p className="text-xs" style={{ color: '#94a3b8' }}>Aucune matière déclarée pour l'instant</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {assignments.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl"
                     style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: '#0f172a' }}>
                      <span className="font-mono" style={{ color: COLOR }}>{a.subject_code}</span>{' '}{a.subject_name}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>{a.class_name}</p>
                  </div>
                  <button onClick={() => removeAssignment(a.id)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center transition-all hover:bg-red-50">
                    <Trash2 className="h-4 w-4" style={{ color: '#ef4444' }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <p className="text-xs font-bold mb-3" style={{ color: '#64748b' }}>Ajouter une matière</p>
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: '#64748b' }}>Classe</label>
              <select className="input-field text-xs" value={affClass} onChange={e => setAffClass(e.target.value)}>
                <option value="">— Sélectionner une classe —</option>
                {availableClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: '#64748b' }}>
                Matière
                {affClass && (
                  <span className="ml-1 font-normal" style={{ color: '#94a3b8' }}>
                    {loadingLevelSubs ? '(chargement…)' : levelSubjects.length > 0 ? `(${levelSubjects.length} disponibles)` : '(toutes)'}
                  </span>
                )}
              </label>
              <select className="input-field text-xs" value={affSubject}
                onChange={e => setAffSubject(e.target.value)}
                disabled={loadingLevelSubs || !affClass}>
                <option value="">— Sélectionner une matière —</option>
                {(affClass && levelSubjects.length > 0 ? levelSubjects : subjects).map(s => (
                  <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
                ))}
              </select>
            </div>
            <button onClick={addAssignment} disabled={!affClass || !affSubject || adding}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${COLOR}, ${COLOR}cc)` }}>
              {adding
                ? <div className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                : <Check className="h-4 w-4" />}
              Ajouter cette matière
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
