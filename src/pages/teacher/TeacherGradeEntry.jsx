import { useState, useEffect, Fragment } from 'react';
import { Star, Lock, Save, ChevronDown, AlertCircle, Plus, X } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { gradesService, academicService } from '../../services';
import { useNotifications } from '../../components/Notifications';

const EVAL_TYPES = {
  DEVOIR:     { label: 'Devoir',     color: '#6366f1', bg: '#eef2ff' },
  TP:         { label: 'TP',         color: '#0d9488', bg: '#f0fdfa' },
  EXAMEN:     { label: 'Examen',     color: '#ef4444', bg: '#fef2f2' },
  RATTRAPAGE: { label: 'Rattrapage', color: '#d97706', bg: '#fffbeb' },
};

function EvalBadge({ type }) {
  const meta = EVAL_TYPES[type] || { label: type, color: '#64748b', bg: '#f1f5f9' };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{ background: meta.bg, color: meta.color }}>
      {meta.label}
    </span>
  );
}

function scoreColor(score, max) {
  const pct = max > 0 ? score / max : 0;
  if (pct >= 0.8) return '#059669';
  if (pct >= 0.5) return '#d97706';
  return '#ef4444';
}

const EMPTY_EVAL_FORM = { title: '', eval_type: 'DEVOIR', max_score: '20', coefficient: '1', date: '', subject: '', semester: '' };

export default function TeacherGradeEntry() {
  const { notify } = useNotifications();

  // Teacher identity
  const [teacherId, setTeacherId]         = useState(null);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);

  // Selections
  const [selectedClass,  setSelectedClass]  = useState('');
  const [selectedEvalId, setSelectedEvalId] = useState('');

  // Grade entry
  const [scores,   setScores]   = useState({});
  const [comments, setComments] = useState({});
  const [saving,   setSaving]   = useState(false);
  const [locking,  setLocking]  = useState(false);

  // Create eval modal
  const [showCreate, setShowCreate] = useState(false);
  const [creating,   setCreating]   = useState(false);
  const [evalForm,   setEvalForm]   = useState(EMPTY_EVAL_FORM);
  const [semesters,  setSemesters]  = useState([]);

  // Load teacher profile + sessions → derive classes
  useEffect(() => {
    async function loadTeacher() {
      try {
        const me = await academicService.getTeacherMe();
        if (!me?.id) return;
        setTeacherId(me.id);

        const sessData = await academicService.getTeacherSessions(me.id);
        const sessArr = sessData?.results || sessData || [];

        const classMap = {};
        sessArr.forEach(s => {
          if (!s.class_obj) return;
          if (!classMap[s.class_obj]) {
            classMap[s.class_obj] = { id: s.class_obj, name: s.class_name || s.class_obj, subjects: [] };
          }
          if (s.subject && !classMap[s.class_obj].subjects.some(x => x.id === s.subject)) {
            classMap[s.class_obj].subjects.push({ id: s.subject, name: s.subject_name || '' });
          }
        });
        setTeacherClasses(Object.values(classMap));
      } catch (e) { console.log('Teacher load:', e.message); }
    }
    loadTeacher();
  }, []);

  // Load semesters on mount
  useEffect(() => {
    academicService.getSemesters({}).then(d => setSemesters(d?.results || d || [])).catch(() => {});
  }, []);

  // Update subjects list when class changes
  useEffect(() => {
    const cls = teacherClasses.find(c => String(c.id) === String(selectedClass));
    setClassSubjects(cls?.subjects || []);
    setSelectedEvalId('');
    setScores({});
    setComments({});
    setEvalForm(EMPTY_EVAL_FORM);
  }, [selectedClass, teacherClasses]);

  // Evaluations for selected class
  const { data: evalData, execute: refreshEvals } = useApi(
    () => selectedClass ? gradesService.getEvaluations({ class_group: selectedClass }) : Promise.resolve([]),
    [selectedClass], !!selectedClass
  );

  // Students + existing grades for selected eval
  const { data: studentsGradesData, execute: refreshGrades } = useApi(
    () => selectedEvalId ? gradesService.getStudentsGrades(selectedEvalId) : Promise.resolve([]),
    [selectedEvalId], !!selectedEvalId
  );

  const evaluations    = evalData?.results || evalData || [];
  const studentsGrades = studentsGradesData?.results || studentsGradesData || [];
  const selectedEval   = evaluations.find(e => String(e.id) === String(selectedEvalId));

  // Reset inputs when evaluation changes
  useEffect(() => {
    setScores({});
    setComments({});
  }, [selectedEvalId]);

  // Populate inputs from DB data when grades arrive
  useEffect(() => {
    if (!studentsGrades || studentsGrades.length === 0) return;
    const s = {}, c = {};
    studentsGrades.forEach(sg => {
      if (sg.score !== null && sg.score !== undefined) s[sg.student_id] = String(sg.score);
      if (sg.comment) c[sg.student_id] = sg.comment;
    });
    setScores(s);
    setComments(c);
  }, [studentsGrades]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!selectedEvalId) return;
    const grades = studentsGrades.map(sg => ({
      student_id: sg.student_id,
      score: scores[sg.student_id] !== undefined && scores[sg.student_id] !== ''
        ? parseFloat(scores[sg.student_id]) : null,
      comment: comments[sg.student_id] || '',
    })).filter(g => g.score !== null && !isNaN(g.score));
    if (grades.length === 0) {
      notify('Saisissez au moins une note avant d\'enregistrer', 'warning');
      return;
    }
    setSaving(true);
    try {
      await gradesService.enterGrades(selectedEvalId, grades);
      notify(`${grades.length} note(s) enregistrée(s)`, 'success');
      refreshGrades();
    } catch (err) {
      notify(err.message || 'Erreur lors de l\'enregistrement', 'error');
    } finally { setSaving(false); }
  };

  const handleLock = async () => {
    if (!selectedEvalId || !selectedEval) return;
    setLocking(true);
    try {
      if (selectedEval.is_locked) {
        await gradesService.unlockEvaluation(selectedEvalId);
        notify('Évaluation déverrouillée', 'success');
      } else {
        await gradesService.lockEvaluation(selectedEvalId);
        notify('Évaluation verrouillée', 'success');
      }
      refreshEvals();
      refreshGrades();
    } catch (err) { notify(err.message || 'Erreur', 'error'); }
    finally { setLocking(false); }
  };

  const handleCreateEval = async (e) => {
    e.preventDefault();
    if (!selectedClass) return;
    setCreating(true);
    try {
      const semesterId = evalForm.semester
        || semesters.find(s => s.is_current)?.id
        || semesters[0]?.id;
      await gradesService.createEvaluation({
        title: evalForm.title,
        eval_type: evalForm.eval_type,
        max_score: parseFloat(evalForm.max_score) || 20,
        coefficient: parseFloat(evalForm.coefficient) || 1,
        date: evalForm.date,
        subject: evalForm.subject || undefined,
        class_group: selectedClass,
        ...(semesterId ? { semester: semesterId } : {}),
      });
      notify('Évaluation créée', 'success');
      setShowCreate(false);
      setEvalForm(EMPTY_EVAL_FORM);
      refreshEvals();
    } catch (err) { notify(err.message || 'Erreur lors de la création', 'error'); }
    finally { setCreating(false); }
  };

  const filledCount = Object.values(scores).filter(v => v !== '' && v !== undefined).length;
  const maxScore    = selectedEval?.max_score || 20;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: '#fffbeb' }}>
              <Star className="h-3 w-3" style={{ color: '#d97706' }} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#d97706' }}>Notes</span>
          </div>
          <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a', letterSpacing: '-0.03em' }}>Saisie des notes</h1>
          <p className="text-sm mt-0.5 font-medium" style={{ color: '#94a3b8' }}>Sélectionnez une classe et une évaluation</p>
        </div>
        {selectedClass && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}>
            <Plus className="h-4 w-4" />
            Nouvelle évaluation
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold mb-1.5" style={{ color: '#64748b' }}>Classe *</label>
          <div className="relative">
            <select
              value={selectedClass}
              onChange={e => { setSelectedClass(e.target.value); setSelectedEvalId(''); setScores({}); setComments({}); }}
              className="input-field w-full appearance-none pr-8">
              <option value="">
                {teacherClasses.length === 0 ? 'Chargement…' : 'Sélectionner une classe'}
              </option>
              {teacherClasses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: '#94a3b8' }} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold mb-1.5" style={{ color: '#64748b' }}>Évaluation *</label>
          <div className="relative">
            <select
              value={selectedEvalId}
              onChange={e => { setSelectedEvalId(e.target.value); setScores({}); setComments({}); setLastEvalId(''); }}
              disabled={!selectedClass}
              className="input-field w-full appearance-none pr-8 disabled:opacity-50">
              <option value="">Sélectionner une évaluation</option>
              {evaluations.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} — {ev.subject_name || ''} ({ev.eval_type}){ev.is_locked ? ' 🔒' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: '#94a3b8' }} />
          </div>
        </div>
      </div>

      {/* Eval info bar */}
      {selectedEval && (
        <div className="card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <EvalBadge type={selectedEval.eval_type} />
            <span className="text-sm font-bold" style={{ color: '#1e293b' }}>{selectedEval.title}</span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-lg"
                  style={{ background: '#f1f5f9', color: '#64748b' }}>
              Sur {maxScore} pts · Coeff. {selectedEval.coefficient}
            </span>
            <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>
              {filledCount} / {studentsGrades.length} saisi{filledCount > 1 ? 's' : ''}
            </span>
            {selectedEval.is_locked && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                   style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                <Lock className="h-3 w-3" style={{ color: '#ef4444' }} />
                <span className="text-[11px] font-bold" style={{ color: '#ef4444' }}>Verrouillée</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!selectedEval.is_locked && (
              <button onClick={handleSave} disabled={saving}
                className="btn-primary px-4 py-2 text-sm flex items-center gap-2">
                {saving ? <div className="h-3.5 w-3.5 rounded-full border-2 animate-spin"
                               style={{ borderColor: '#ffffff40', borderTopColor: '#fff' }} />
                        : <Save className="h-3.5 w-3.5" />}
                Enregistrer
              </button>
            )}
            <button onClick={handleLock} disabled={locking}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={{
                background: selectedEval.is_locked ? '#ecfdf5' : '#fef2f2',
                color:      selectedEval.is_locked ? '#059669' : '#ef4444',
                border:     `1px solid ${selectedEval.is_locked ? '#d1fae5' : '#fecaca'}`,
              }}>
              <Lock className="h-3.5 w-3.5" />
              {selectedEval.is_locked ? 'Déverrouiller' : 'Verrouiller'}
            </button>
          </div>
        </div>
      )}

      {/* Grade table */}
      {selectedEvalId && studentsGrades.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between"
               style={{ background: '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>
              {studentsGrades.length} étudiant{studentsGrades.length > 1 ? 's' : ''}
            </span>
            <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>Note sur {maxScore}</span>
          </div>

          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Étudiant</th>
                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest w-36" style={{ color: '#94a3b8' }}>Note /{maxScore}</th>
                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Commentaire</th>
                <th className="text-right px-5 py-3 text-[11px] font-bold uppercase tracking-widest w-20" style={{ color: '#94a3b8' }}>/20</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: '#f8fafc' }}>
              {studentsGrades.map((sg) => {
                const score    = scores[sg.student_id];
                const numScore = parseFloat(score);
                const norm20   = (!isNaN(numScore) && maxScore > 0) ? ((numScore / maxScore) * 20).toFixed(2) : '—';
                const color    = !isNaN(numScore) ? scoreColor(numScore, maxScore) : '#94a3b8';
                return (
                  <Fragment key={sg.student_id}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                               style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                            {sg.student_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-bold" style={{ color: '#1e293b' }}>{sg.student_name}</p>
                            <p className="text-[11px]" style={{ color: '#94a3b8' }}>{sg.student_matricule}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="number" min="0" max={maxScore} step="0.5"
                          value={score ?? ''}
                          onChange={e => setScores(prev => ({ ...prev, [sg.student_id]: e.target.value }))}
                          disabled={selectedEval?.is_locked}
                          className="w-24 px-3 py-1.5 rounded-xl text-sm font-bold text-center transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            border:     `2px solid ${score !== undefined && score !== '' ? color + '60' : '#e2e8f0'}`,
                            color:      score !== undefined && score !== '' ? color : '#94a3b8',
                            background: score !== undefined && score !== '' ? color + '08' : '#f8fafc',
                          }}
                          placeholder="—"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input type="text"
                          value={comments[sg.student_id] || ''}
                          onChange={e => setComments(prev => ({ ...prev, [sg.student_id]: e.target.value }))}
                          disabled={selectedEval?.is_locked}
                          className="input-field w-full text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="Commentaire..." />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-sm font-bold" style={{ color }}>{norm20}</span>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>

          {!selectedEval?.is_locked && (
            <div className="px-5 py-4 flex justify-end gap-3"
                 style={{ borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
              <button onClick={handleSave} disabled={saving}
                className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
                {saving ? <div className="h-4 w-4 rounded-full border-2 animate-spin"
                               style={{ borderColor: '#ffffff40', borderTopColor: '#fff' }} />
                        : <Save className="h-4 w-4" />}
                Enregistrer les notes
              </button>
            </div>
          )}
        </div>
      )}

      {selectedEvalId && studentsGrades.length === 0 && (
        <div className="card p-10 flex flex-col items-center justify-center">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: '#f1f5f9' }}>
            <AlertCircle className="h-7 w-7 opacity-30" style={{ color: '#64748b' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: '#94a3b8' }}>Aucun étudiant inscrit à cette évaluation</p>
        </div>
      )}

      {!selectedEvalId && (
        <div className="card p-10 flex flex-col items-center justify-center">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: '#fffbeb' }}>
            <Star className="h-7 w-7 opacity-40" style={{ color: '#d97706' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: '#94a3b8' }}>Sélectionnez une classe et une évaluation</p>
        </div>
      )}

      {/* ── Create Evaluation Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5"
                 style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: '#fffbeb' }}>
                  <Star className="h-4 w-4" style={{ color: '#d97706' }} />
                </div>
                <h2 className="text-base font-extrabold" style={{ color: '#0f172a' }}>Nouvelle évaluation</h2>
              </div>
              <button onClick={() => setShowCreate(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateEval} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: '#64748b' }}>Titre *</label>
                <input className="input-field w-full text-sm" placeholder="ex: Examen S1 — Réseaux"
                  value={evalForm.title}
                  onChange={e => setEvalForm(p => ({ ...p, title: e.target.value }))}
                  required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#64748b' }}>Type *</label>
                  <select className="input-field w-full text-sm"
                    value={evalForm.eval_type}
                    onChange={e => setEvalForm(p => ({ ...p, eval_type: e.target.value }))}>
                    {Object.entries(EVAL_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#64748b' }}>Date *</label>
                  <input type="date" className="input-field w-full text-sm"
                    value={evalForm.date}
                    onChange={e => setEvalForm(p => ({ ...p, date: e.target.value }))}
                    required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#64748b' }}>Note max</label>
                  <input type="number" min="1" max="100" step="0.5" className="input-field w-full text-sm"
                    value={evalForm.max_score}
                    onChange={e => setEvalForm(p => ({ ...p, max_score: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#64748b' }}>Coefficient</label>
                  <input type="number" min="0.5" max="10" step="0.5" className="input-field w-full text-sm"
                    value={evalForm.coefficient}
                    onChange={e => setEvalForm(p => ({ ...p, coefficient: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: '#64748b' }}>Matière *</label>
                <select className="input-field w-full text-sm"
                  value={evalForm.subject}
                  onChange={e => setEvalForm(p => ({ ...p, subject: e.target.value }))}
                  required>
                  <option value="">— Sélectionner —</option>
                  {classSubjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: '#64748b' }}>Semestre</label>
                <select className="input-field w-full text-sm"
                  value={evalForm.semester}
                  onChange={e => setEvalForm(p => ({ ...p, semester: e.target.value }))}>
                  <option value="">— Aucun / Courant —</option>
                  {semesters.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.is_current ? ' (en cours)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: '#f1f5f9', color: '#64748b' }}>
                  Annuler
                </button>
                <button type="submit" disabled={creating || !evalForm.title || !evalForm.date || !evalForm.subject}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}>
                  {creating
                    ? <div className="h-4 w-4 rounded-full border-2 animate-spin"
                           style={{ borderColor: '#ffffff40', borderTopColor: '#fff' }} />
                    : <Plus className="h-4 w-4" />}
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
