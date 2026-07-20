import { useState, useCallback, useEffect, Fragment } from 'react';
import { createPortal } from 'react-dom';
import {
  ClipboardList, Plus, Lock, Unlock, FileText, BookOpen,
  ChevronDown, ChevronUp, Download, Eye, EyeOff, X,
  CheckCircle, AlertCircle, Save, Loader2, Award
} from 'lucide-react';
import { gradesService, academicService, sitesService } from '../../services';
import { useApi } from '../../hooks/useApi';
import { useNotifications } from '../../components/Notifications';
import { useSite } from '../../contexts/SiteContext';

const COLOR      = '#7c3aed';
const COLOR_BG   = '#f5f3ff';
const COLOR_ICON = '#ede9fe';

const EVAL_TYPES = [
  { value: 'DEVOIR',     label: 'Devoir',              color: '#3b82f6', bg: '#dbeafe' },
  { value: 'TP',         label: 'TP',                  color: '#10b981', bg: '#d1fae5' },
  { value: 'EXAMEN',     label: 'Examen',              color: '#f59e0b', bg: '#fef3c7' },
  { value: 'RATTRAPAGE', label: 'Rattrapage',          color: '#ef4444', bg: '#fee2e2' },
];

const STATUS_LABELS = {
  HONORS:      { label: 'Mention TB',   color: '#7c3aed', bg: '#f5f3ff' },
  PASS:        { label: 'Admis',        color: '#16a34a', bg: '#dcfce7' },
  CONDITIONAL: { label: 'Conditionnel', color: '#d97706', bg: '#fef3c7' },
  FAIL:        { label: 'Ajourné',      color: '#dc2626', bg: '#fee2e2' },
  PENDING:     { label: 'En cours',     color: '#6b7280', bg: '#f3f4f6' },
};

function EvalTypeBadge({ type }) {
  const t = EVAL_TYPES.find(e => e.value === type) || EVAL_TYPES[0];
  return (
    <span style={{ background: t.bg, color: t.color }}
      className="px-2 py-0.5 rounded-full text-xs font-semibold">
      {t.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_LABELS[status] || STATUS_LABELS.PENDING;
  return (
    <span style={{ background: s.bg, color: s.color }}
      className="px-2 py-0.5 rounded-full text-xs font-semibold">
      {s.label}
    </span>
  );
}

function avgColor(avg) {
  const n = parseFloat(avg);
  if (n >= 14) return { color: '#7c3aed', bg: '#f5f3ff' };
  if (n >= 10) return { color: '#16a34a', bg: '#dcfce7' };
  if (n >= 8)  return { color: '#d97706', bg: '#fef3c7' };
  return { color: '#dc2626', bg: '#fee2e2' };
}

// ────────────────────────────────────────────────────────────────
// EvaluationModal — Create / Edit
// ────────────────────────────────────────────────────────────────
function EvaluationModal({ onClose, onSaved, editingEval, classes, semesters }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    title:       editingEval?.title       || '',
    eval_type:   editingEval?.eval_type   || 'DEVOIR',
    subject:     editingEval?.subject     || '',
    class_group: editingEval?.class_group || '',
    semester:    editingEval?.semester    || '',
    date:        editingEval?.date        || today,
    max_score:   editingEval?.max_score   || '20',
    coefficient: editingEval?.coefficient || '1',
    description: editingEval?.description || '',
  });
  const [subjects, setSubjects] = useState([]);
  const [saving, setSaving] = useState(false);
  const { notify } = useNotifications();

  const loadSubjects = useCallback(async (classId) => {
    if (!classId) return;
    try {
      const cls = (classes || []).find(c => String(c.id) === String(classId));
      if (cls?.level) {
        const res = await academicService.getLevelSubjects({ level: cls.level });
        const ls = res.results || res || [];
        if (ls.length > 0) {
          setSubjects(ls.map(l => ({ id: l.subject, name: l.subject_name || l.subject_display || String(l.subject) })));
          return;
        }
      }
      const res = await academicService.getSubjects();
      setSubjects(res.results || res || []);
    } catch {
      try {
        const res = await academicService.getSubjects();
        setSubjects(res.results || res || []);
      } catch { setSubjects([]); }
    }
  }, [classes]);

  const f = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    if (k === 'class_group') loadSubjects(v);
  };

  const save = async () => {
    if (!form.title || !form.subject || !form.class_group || !form.date) {
      notify('Remplissez tous les champs obligatoires', 'error'); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        subject: form.subject,
        class_group: form.class_group,
        semester: form.semester || null,
      };
      if (editingEval) {
        await gradesService.updateEvaluation(editingEval.id, payload);
      } else {
        await gradesService.createEvaluation(payload);
      }
      notify(editingEval ? 'Évaluation modifiée' : 'Évaluation créée', 'success');
      onSaved();
    } catch (e) {
      notify(e.message || 'Erreur', 'error');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-lg text-gray-800">
            {editingEval ? 'Modifier l\'évaluation' : 'Nouvelle évaluation'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
            <input value={form.title} onChange={e => f('title', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': COLOR }} placeholder="Ex: Devoir n°1 Maths" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select value={form.eval_type} onChange={e => f('eval_type', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none">
                {EVAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input type="date" value={form.date} onChange={e => f('date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Classe *</label>
            <select value={form.class_group} onChange={e => f('class_group', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">-- Choisir une classe --</option>
              {(classes || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Matière *</label>
            <select value={form.subject} onChange={e => f('subject', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">-- Choisir une matière --</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Semestre</label>
            <select value={form.semester} onChange={e => f('semester', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">-- Aucun --</option>
              {(semesters || []).map(s => <option key={s.id} value={s.id}>{s.label || s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note max</label>
              <input type="number" value={form.max_score} onChange={e => f('max_score', e.target.value)}
                min="1" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coefficient</label>
              <input type="number" value={form.coefficient} onChange={e => f('coefficient', e.target.value)}
                min="0.5" step="0.5" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => f('description', e.target.value)}
              rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
              placeholder="Instructions, chapitres couverts…" />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
            Annuler
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2"
            style={{ background: COLOR }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ────────────────────────────────────────────────────────────────
// Tab 1 — Évaluations (G1)
// ────────────────────────────────────────────────────────────────
function EvaluationsTab({ selectedSite }) {
  const { notify } = useNotifications();
  const [filterClass, setFilterClass]       = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterType, setFilterType]         = useState('');
  const [showModal, setShowModal]           = useState(false);
  const [editingEval, setEditingEval]       = useState(null);

  const siteFilter = selectedSite !== 'all' ? { site: selectedSite } : {};

  const { data: classesData } = useApi(() => academicService.getClasses(siteFilter), [selectedSite]);
  const { data: semestersData } = useApi(() => academicService.getSemesters({}), []);

  const classes   = classesData?.results || classesData || [];
  const semesters = semestersData?.results || semestersData || [];

  const evalParams = {
    ...(filterClass    ? { class_group: filterClass }    : {}),
    ...(filterSemester ? { semester: filterSemester }    : {}),
    ...(filterType     ? { eval_type: filterType }       : {}),
  };

  const { data: evalsData, loading, execute: fetchEvals } = useApi(
    () => gradesService.getEvaluations(evalParams),
    [filterClass, filterSemester, filterType]
  );
  const evaluations = evalsData?.results || evalsData || [];

  const handleDelete = async (ev) => {
    if (!window.confirm(`Supprimer "${ev.title}" ?`)) return;
    try {
      await gradesService.deleteEvaluation(ev.id);
      notify('Évaluation supprimée', 'success');
      fetchEvals();
    } catch { notify('Erreur suppression', 'error'); }
  };

  const handleLockToggle = async (ev) => {
    try {
      if (ev.is_locked) {
        await gradesService.unlockEvaluation(ev.id);
        notify('Déverrouillée', 'success');
      } else {
        await gradesService.lockEvaluation(ev.id);
        notify('Verrouillée — les notes ne peuvent plus être modifiées', 'success');
      }
      fetchEvals();
    } catch (e) { notify(e.message || 'Erreur', 'error'); }
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white min-w-[180px]">
            <option value="">Toutes les classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white min-w-[160px]">
            <option value="">Tous les semestres</option>
            {semesters.map(s => <option key={s.id} value={s.id}>{s.label || s.name}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
            <option value="">Tous les types</option>
            {EVAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <button onClick={() => { setEditingEval(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: COLOR }}>
          <Plus size={16} /> Nouvelle évaluation
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : evaluations.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Aucune évaluation trouvée</p>
          <p className="text-xs mt-1">Sélectionnez une classe ou créez une nouvelle évaluation</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: COLOR_BG }}>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Titre</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Matière</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Classe</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Coeff</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Notes</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Statut</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map((ev, i) => (
                <tr key={ev.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                  style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td className="px-4 py-3 font-medium text-gray-800">{ev.title}</td>
                  <td className="px-4 py-3"><EvalTypeBadge type={ev.eval_type} /></td>
                  <td className="px-4 py-3 text-gray-600">{ev.subject_name || ev.subject_code || '–'}</td>
                  <td className="px-4 py-3 text-gray-600">{ev.class_name || ev.class_code || '–'}</td>
                  <td className="px-4 py-3 text-gray-500">{ev.date}</td>
                  <td className="px-4 py-3 text-center text-gray-700 font-mono">{ev.coefficient}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: '#f0fdf4', color: '#16a34a' }}>
                      {ev.grades_count || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {ev.is_locked ? (
                      <span className="flex items-center justify-center gap-1 text-xs font-semibold text-orange-600">
                        <Lock size={12} /> Verrouillée
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1 text-xs font-semibold text-green-600">
                        <Unlock size={12} /> Ouverte
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {!ev.is_locked && (
                        <button onClick={() => { setEditingEval(ev); setShowModal(true); }}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700"
                          title="Modifier">
                          <BookOpen size={15} />
                        </button>
                      )}
                      <button onClick={() => handleLockToggle(ev)}
                        className="p-1.5 hover:bg-orange-50 rounded-lg text-gray-500 hover:text-orange-600"
                        title={ev.is_locked ? 'Déverrouiller' : 'Verrouiller'}>
                        {ev.is_locked ? <Unlock size={15} /> : <Lock size={15} />}
                      </button>
                      <button onClick={() => handleDelete(ev)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"
                        title="Supprimer">
                        <X size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <EvaluationModal
          editingEval={editingEval}
          classes={classes}
          semesters={semesters}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchEvals(); }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// E-Learning Grade Entry sub-component
// ────────────────────────────────────────────────────────────────
const EL_TYPE_LABELS = { ASSIGNMENT: 'Devoir', QUIZ: 'Quiz', EXAM: 'Examen' };
const EL_TYPE_COLORS = {
  ASSIGNMENT: { color: '#3b82f6', bg: '#dbeafe' },
  QUIZ:       { color: '#7c3aed', bg: '#ede9fe' },
  EXAM:       { color: '#dc2626', bg: '#fee2e2' },
};

function ElearningGradeEntry({ filterClass, semesters, onImported }) {
  const { notify } = useNotifications();
  const [selectedItem, setSelectedItem]       = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [overrides, setOverrides]             = useState({});
  const [importing, setImporting]             = useState(false);

  const { data: elEvalsRaw, loading: loadEvals } = useApi(
    () => filterClass ? gradesService.getElearningEvaluations({ class_group: filterClass }) : Promise.resolve([]),
    [filterClass], !!filterClass
  );
  const elEvals = Array.isArray(elEvalsRaw) ? elEvalsRaw : [];

  const parsedItem = selectedItem ? JSON.parse(selectedItem) : null;

  const { data: scoresRaw, loading: loadScores } = useApi(
    () => parsedItem ? gradesService.getElearningStudentScores(parsedItem.type, parsedItem.id) : Promise.resolve(null),
    [selectedItem], !!parsedItem
  );

  const students = scoresRaw?.students || [];
  const itemInfo = scoresRaw?.item || parsedItem;

  // Reset overrides when item changes
  const handleItemChange = (val) => {
    setSelectedItem(val);
    setOverrides({});
  };

  const getScore = (st) => {
    if (overrides[st.student_id] !== undefined) return overrides[st.student_id];
    if (st.score !== null && st.score !== undefined) return String(st.score);
    if (st.imported_score !== null && st.imported_score !== undefined) return String(st.imported_score);
    return '';
  };

  const handleImport = async () => {
    if (!parsedItem) return;
    const grades = students
      .map(st => ({
        student_id: st.student_id,
        score: parseFloat(getScore(st) || ''),
        comment: st.comment || '',
      }))
      .filter(g => !isNaN(g.score));

    if (grades.length === 0) {
      notify('Aucune note à importer', 'error'); return;
    }
    setImporting(true);
    try {
      const res = await gradesService.importElearningGrades({
        type: parsedItem.type,
        item_id: parsedItem.id,
        semester_id: selectedSemester || null,
        grades,
      });
      notify(`${res.created} créée(s), ${res.updated} mise(s) à jour`, 'success');
      onImported?.();
    } catch (e) {
      notify(e.message || 'Erreur import', 'error');
    } finally { setImporting(false); }
  };

  const gradedCount  = students.filter(st => st.graded).length;
  const hasScoreCount = students.filter(st => getScore(st) !== '').length;
  const maxScore = itemInfo?.max_score || 20;

  if (!filterClass) return (
    <div className="text-center py-10 text-gray-400 text-sm">
      Sélectionnez une classe pour voir les évaluations E-Learning
    </div>
  );

  if (loadEvals) return <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-4">
      {/* Selectors */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[260px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Évaluation E-Learning *</label>
          <select value={selectedItem} onChange={e => handleItemChange(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white"
            style={{ borderColor: selectedItem ? COLOR + '60' : undefined }}>
            <option value="">-- Choisir un devoir / quiz / examen --</option>
            {elEvals.map(ev => {
              const key = JSON.stringify({ type: ev.type, id: ev.id });
              const typeLabel = EL_TYPE_LABELS[ev.type] || ev.type;
              return (
                <option key={key} value={key}>
                  [{typeLabel}] {ev.title} — {ev.subject_name}
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Semestre (pour import)</label>
          <select value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white min-w-[160px]">
            <option value="">-- Aucun --</option>
            {(semesters || []).map(s => <option key={s.id} value={s.id}>{s.label || s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Item info */}
      {itemInfo && (
        <div className="p-3 rounded-xl border flex items-center gap-3 flex-wrap text-sm"
          style={{ background: EL_TYPE_COLORS[itemInfo.type]?.bg || COLOR_BG, borderColor: (EL_TYPE_COLORS[itemInfo.type]?.color || COLOR) + '40' }}>
          <span className="font-bold px-2 py-0.5 rounded-full text-xs"
            style={{ background: EL_TYPE_COLORS[itemInfo.type]?.bg, color: EL_TYPE_COLORS[itemInfo.type]?.color }}>
            {EL_TYPE_LABELS[itemInfo.type] || itemInfo.type}
          </span>
          <span className="font-bold text-gray-800">{itemInfo.title}</span>
          <span className="text-gray-500">Matière : <b>{itemInfo.subject_name}</b></span>
          <span className="text-gray-500">Sur : <b>{maxScore}</b></span>
          <span className="ml-auto text-xs font-bold px-2 py-1 rounded-full"
            style={{ background: '#f0fdf4', color: '#16a34a' }}>
            {gradedCount}/{students.length} notés dans E-Learning
          </span>
        </div>
      )}

      {!parsedItem ? null : loadScores ? (
        <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-gray-400" /></div>
      ) : students.length === 0 ? (
        <p className="text-center py-8 text-gray-400 text-sm">Aucun étudiant inscrit dans cette classe</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: COLOR_BG }}>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 w-8">#</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Étudiant</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Matricule</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Statut E-Learning</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700" style={{ minWidth: 120 }}>
                    Score E-Learning / {maxScore}
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Note /20</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700" style={{ minWidth: 130 }}>Ajuster note</th>
                </tr>
              </thead>
              <tbody>
                {students.map((st, i) => {
                  const rawScore = getScore(st);
                  const scoreNum = rawScore !== '' ? parseFloat(rawScore) : NaN;
                  const on20 = !isNaN(scoreNum) && maxScore > 0
                    ? Math.round((scoreNum / maxScore) * 20 * 100) / 100
                    : null;
                  const c = on20 !== null ? avgColor(on20) : null;
                  return (
                    <tr key={st.student_id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                      style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td className="px-4 py-2 text-gray-400 text-xs font-mono">{i + 1}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                            style={{ background: `linear-gradient(135deg,${COLOR},${COLOR}bb)` }}>
                            {(st.student_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-800">{st.student_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-gray-400 text-xs font-mono">{st.student_matricule}</td>
                      <td className="px-4 py-2 text-center">
                        {!st.submitted ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Non soumis</span>
                        ) : st.graded ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-600">✓ Noté</span>
                        ) : (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-600">Soumis</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {st.score !== null && st.score !== undefined ? (
                          <span className="font-bold text-sm">{st.score}/{maxScore}</span>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                        {st.percent !== undefined && st.percent !== null && (
                          <span className="block text-[10px] text-gray-400">{st.percent.toFixed(0)}%</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {on20 !== null ? (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ background: c.bg, color: c.color }}>{on20}/20</span>
                        ) : st.imported_score !== null && st.imported_score !== undefined ? (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ background: '#f0fdf4', color: '#16a34a' }}>{st.imported_score}/20 ✓</span>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" min="0" max={maxScore} step="0.25"
                          value={overrides[st.student_id] ?? (st.score !== null && st.score !== undefined ? String(st.score) : st.imported_score !== null && st.imported_score !== undefined ? String(st.imported_score) : '')}
                          onChange={e => setOverrides(p => ({ ...p, [st.student_id]: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-1.5 text-sm text-center font-bold focus:outline-none focus:ring-2"
                          style={{
                            borderColor: on20 !== null ? (c?.color || COLOR) + '50' : '#e5e7eb',
                            background: on20 !== null ? c?.bg : 'white',
                            color: on20 !== null ? c?.color : '#374151',
                          }}
                          placeholder="–"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-gray-400">
              Les scores E-Learning sont pré-remplis. Modifiez si nécessaire avant d'importer.
            </p>
            <button onClick={handleImport} disabled={importing || hasScoreCount === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: '#059669' }}>
              {importing ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
              {importing ? 'Import en cours…' : `Importer vers Notes (${hasScoreCount})`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Tab 2 — Saisie des notes (G2)
// ────────────────────────────────────────────────────────────────
function GradeEntryTab({ selectedSite }) {
  const { notify } = useNotifications();
  const [mode, setMode]                     = useState('classic'); // 'classic' | 'elearning'
  const [selectedEvalId, setSelectedEvalId] = useState('');
  const [filterSite, setFilterSite]         = useState(selectedSite !== 'all' ? selectedSite : '');
  const [filterClass, setFilterClass]       = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterType, setFilterType]         = useState('');
  const [scores, setScores]                 = useState({});
  const [comments, setComments]             = useState({});
  const [saving, setSaving]                 = useState(false);

  const { data: sitesData } = useApi(() => sitesService.getSites(), []);
  const sites = sitesData?.results || sitesData || [];

  const effectiveSite = filterSite || (selectedSite !== 'all' ? selectedSite : '');
  const siteFilter = effectiveSite ? { site: effectiveSite } : {};
  const { data: classesData }   = useApi(() => academicService.getClasses(siteFilter), [filterSite, selectedSite]);
  const { data: semestersData } = useApi(() => academicService.getSemesters({}), []);
  const classes   = classesData?.results   || classesData   || [];
  const semesters = semestersData?.results || semestersData || [];

  const evalParams = {
    ...(filterClass    ? { class_group: filterClass }    : {}),
    ...(filterSemester ? { semester: filterSemester }    : {}),
    ...(filterType     ? { eval_type: filterType }       : {}),
  };
  const { data: evalsData, execute: fetchEvals } = useApi(
    () => gradesService.getEvaluations(evalParams),
    [filterClass, filterSemester, filterType]
  );
  const evaluations = evalsData?.results || evalsData || [];
  const selectedEval = evaluations.find(e => String(e.id) === String(selectedEvalId));

  const { data: studentsGrades, loading: loadingStudents, execute: fetchStudentsGrades } = useApi(
    () => selectedEvalId ? gradesService.getStudentsGrades(selectedEvalId) : Promise.resolve([]),
    [selectedEvalId],
    !!selectedEvalId
  );
  const studentsList = studentsGrades || [];

  // FIX: useEffect instead of render-time call — avoids infinite loop when students have no existing grades
  useEffect(() => {
    const s = {}, c = {};
    (studentsGrades || []).forEach(st => {
      if (st.score !== null && st.score !== undefined) s[st.student_id] = String(st.score);
      if (st.comment) c[st.student_id] = st.comment;
    });
    setScores(s);
    setComments(c);
  }, [studentsGrades]);

  const handleEvalChange = (id) => {
    setSelectedEvalId(id);
    // scores/comments reset automatically via the useEffect above when studentsGrades changes
  };

  const handleSave = async () => {
    if (!selectedEvalId) return;
    setSaving(true);
    try {
      const grades = studentsList
        .map(st => ({
          student_id: st.student_id,
          score: scores[st.student_id] !== undefined && scores[st.student_id] !== ''
            ? parseFloat(scores[st.student_id])
            : null,
          comment: comments[st.student_id] || '',
        }))
        .filter(g => g.score !== null && !isNaN(g.score));

      if (grades.length === 0) {
        notify('Aucune note à enregistrer', 'error');
        return;
      }
      await gradesService.enterGrades(selectedEvalId, grades);
      notify(`${grades.length} note(s) enregistrée(s) avec succès`, 'success');
      fetchStudentsGrades();
    } catch (e) {
      notify(e.message || 'Erreur sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLockToggle = async () => {
    if (!selectedEvalId) return;
    const isLocked = selectedEval?.is_locked;
    const msg = isLocked
      ? 'Déverrouiller cette évaluation pour permettre la modification des notes ?'
      : 'Verrouiller cette évaluation ? Les notes ne pourront plus être modifiées.';
    if (!window.confirm(msg)) return;
    try {
      if (isLocked) {
        await gradesService.unlockEvaluation(selectedEvalId);
        notify('Évaluation déverrouillée', 'success');
      } else {
        await gradesService.lockEvaluation(selectedEvalId);
        notify('Évaluation verrouillée', 'success');
      }
      await fetchEvals();
      fetchStudentsGrades();
    } catch (e) { notify(e.message || 'Erreur', 'error'); }
  };

  const maxScore = selectedEval ? parseFloat(selectedEval.max_score) : 20;

  const filledCount = studentsList.filter(st =>
    scores[st.student_id] !== undefined && scores[st.student_id] !== ''
  ).length;

  // Compute running class average from currently entered scores
  const enteredNums = Object.values(scores)
    .filter(v => v !== '' && !isNaN(parseFloat(v)))
    .map(v => maxScore > 0 ? (parseFloat(v) / maxScore) * 20 : parseFloat(v));
  const classAvg = enteredNums.length > 0
    ? (enteredNums.reduce((a, b) => a + b, 0) / enteredNums.length).toFixed(2)
    : null;

  // Keyboard: Enter → move to next student's score input
  const handleKeyDown = (e, idx) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.querySelector(`[data-score-idx="${idx + 1}"]`)?.focus();
    }
  };

  return (
    <div>
      {/* Mode toggle + shared class filter */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          {[
            { id: 'classic',   label: 'Évaluations classiques' },
            { id: 'elearning', label: 'E-Learning' },
          ].map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={mode === m.id
                ? { background: 'white', color: COLOR, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                : { color: '#6b7280' }}>
              {m.label}
            </button>
          ))}
        </div>
        {mode === 'elearning' && (
          <>
            <div>
              <select value={filterSite} onChange={e => { setFilterSite(e.target.value); setFilterClass(''); }}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white min-w-[160px]">
                <option value="">Tous les sites</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white min-w-[200px]"
                style={{ borderColor: filterClass ? COLOR + '60' : undefined }}>
                <option value="">-- Choisir une classe --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </>
        )}
      </div>

      {mode === 'elearning' && (
        <ElearningGradeEntry
          filterClass={filterClass}
          semesters={semesters}
          onImported={() => notify('Import terminé — vous pouvez générer les bulletins', 'success')}
        />
      )}

      {mode === 'classic' && (
      <>
      {/* Filters + type selector + eval selector */}
      <div className="flex flex-wrap gap-3 mb-5 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Site</label>
          <select value={filterSite} onChange={e => { setFilterSite(e.target.value); setFilterClass(''); setSelectedEvalId(''); }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white min-w-[180px]">
            <option value="">Tous les sites</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Classe</label>
          <select value={filterClass} onChange={e => { setFilterClass(e.target.value); setSelectedEvalId(''); }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white min-w-[180px]">
            <option value="">Toutes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Semestre</label>
          <select value={filterSemester} onChange={e => { setFilterSemester(e.target.value); setSelectedEvalId(''); }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white min-w-[150px]">
            <option value="">Tous</option>
            {semesters.map(s => <option key={s.id} value={s.id}>{s.label || s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
          <select value={filterType} onChange={e => { setFilterType(e.target.value); setSelectedEvalId(''); }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white min-w-[130px]">
            <option value="">Tous les types</option>
            {EVAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Évaluation *</label>
          <select value={selectedEvalId} onChange={e => handleEvalChange(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white"
            style={{ borderColor: selectedEvalId ? COLOR + '60' : undefined }}>
            <option value="">-- Choisir une évaluation --</option>
            {evaluations.map(ev => {
              const typeLabel = EVAL_TYPES.find(t => t.value === ev.eval_type)?.label || ev.eval_type;
              return (
                <option key={ev.id} value={ev.id}>
                  [{typeLabel}] {ev.title} — {ev.class_name || ev.class_code || ''}
                  {ev.is_locked ? ' 🔒' : ''}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Evaluation info card */}
      {selectedEval && (
        <div className="mb-4 p-3 rounded-xl border flex items-center gap-4 flex-wrap"
          style={{ background: COLOR_BG, borderColor: '#ddd6fe' }}>
          <EvalTypeBadge type={selectedEval.eval_type} />
          <span className="text-sm font-bold text-gray-800">{selectedEval.title}</span>
          <span className="text-sm text-gray-500">Matière : <b>{selectedEval.subject_name || '–'}</b></span>
          <span className="text-sm text-gray-500">Classe : <b>{selectedEval.class_name || '–'}</b></span>
          <span className="text-sm text-gray-500">Sur : <b>{selectedEval.max_score}</b></span>
          <span className="text-sm text-gray-500">Coeff : <b>{selectedEval.coefficient}</b></span>
          {selectedEval.date && <span className="text-sm text-gray-500">Date : <b>{selectedEval.date}</b></span>}
          {classAvg !== null && (
            <span className="text-xs font-bold px-2 py-1 rounded-full"
              style={{ background: '#dbeafe', color: '#1d4ed8' }}>
              Moy. classe : {classAvg}/20
            </span>
          )}
          {selectedEval.is_locked && (
            <span className="flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
              <Lock size={12} /> Verrouillée
            </span>
          )}
          <span className="ml-auto text-xs font-bold px-2 py-1 rounded-full"
            style={{
              background: filledCount === studentsList.length && studentsList.length > 0 ? '#dcfce7' : '#f3f4f6',
              color:      filledCount === studentsList.length && studentsList.length > 0 ? '#16a34a' : '#6b7280',
            }}>
            {filledCount}/{studentsList.length} notes saisies
          </span>
        </div>
      )}

      {!selectedEvalId ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">Sélectionnez une évaluation pour saisir les notes</p>
          <p className="text-xs mt-1 opacity-70">Filtrez par Classe → Semestre → Type pour trouver rapidement</p>
        </div>
      ) : loadingStudents ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : studentsList.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Aucun étudiant inscrit dans cette classe</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-100 mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: COLOR_BG }}>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 w-8">#</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Étudiant</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Matricule</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700" style={{ minWidth: 130 }}>
                    Note / {maxScore}
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">/20</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Commentaire</th>
                </tr>
              </thead>
              <tbody>
                {studentsList.map((st, i) => {
                  const rawScore = scores[st.student_id];
                  const scoreVal = rawScore !== undefined && rawScore !== '' ? parseFloat(rawScore) : NaN;
                  const on20 = !isNaN(scoreVal) && maxScore > 0
                    ? Math.round((scoreVal / maxScore) * 20 * 100) / 100
                    : null;
                  const c = on20 !== null ? avgColor(on20) : null;
                  const hasExisting = st.score !== null && st.score !== undefined;

                  return (
                    <tr key={st.student_id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                      style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td className="px-4 py-2 text-gray-400 text-xs font-mono">{i + 1}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                            style={{ background: `linear-gradient(135deg,${COLOR},${COLOR}bb)` }}>
                            {(st.student_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-800">{st.student_name}</span>
                          {hasExisting && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold hidden sm:inline"
                              style={{ background: '#dbeafe', color: '#1d4ed8' }}>✓ existant</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-gray-400 text-xs font-mono">{st.student_matricule}</td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          max={maxScore}
                          step="0.25"
                          data-score-idx={i}
                          disabled={selectedEval?.is_locked}
                          value={scores[st.student_id] ?? ''}
                          onChange={e => setScores(p => ({ ...p, [st.student_id]: e.target.value }))}
                          onKeyDown={e => handleKeyDown(e, i)}
                          className="w-full border rounded-lg px-3 py-1.5 text-sm text-center font-bold focus:outline-none focus:ring-2 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                          style={{
                            borderColor: on20 !== null ? c.color + '50' : '#e5e7eb',
                            background:  on20 !== null ? c.bg : 'white',
                            color:       on20 !== null ? c.color : '#374151',
                          }}
                          placeholder="–"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        {on20 !== null ? (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ background: c.bg, color: c.color }}>
                            {on20}/20
                          </span>
                        ) : <span className="text-gray-300 text-xs">–</span>}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          disabled={selectedEval?.is_locked}
                          value={comments[st.student_id] ?? ''}
                          onChange={e => setComments(p => ({ ...p, [st.student_id]: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="Appréciation…"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!selectedEval?.is_locked && (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-xs text-gray-400">
                Appuyez sur <kbd className="px-1 py-0.5 bg-gray-100 border rounded text-xs">Entrée</kbd> pour passer à l'étudiant suivant
              </p>
              <div className="flex gap-3">
                <button onClick={handleLockToggle}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-orange-300 text-orange-600 hover:bg-orange-50">
                  <Lock size={15} /> Verrouiller
                </button>
                <button onClick={handleSave} disabled={saving || filledCount === 0}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: COLOR }}>
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {saving ? 'Enregistrement…' : `Enregistrer (${filledCount} note${filledCount > 1 ? 's' : ''})`}
                </button>
              </div>
            </div>
          )}
          {selectedEval?.is_locked && (
            <div className="flex justify-end">
              <button onClick={handleLockToggle}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-blue-300 text-blue-600 hover:bg-blue-50">
                <Unlock size={15} /> Déverrouiller pour modifier
              </button>
            </div>
          )}
        </>
      )}
      </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// BulletinDetailModal
// ────────────────────────────────────────────────────────────────
function BulletinDetailModal({ card, onClose, onCommentSaved }) {
  const { notify } = useNotifications();
  const [teacherComment, setTeacherComment]       = useState(card.teacher_comment || '');
  const [principalComment, setPrincipalComment]   = useState(card.principal_comment || '');
  const [saving, setSaving]   = useState(false);
  const [downloading, setDownloading] = useState(false);

  const subjectAverages = card.subject_averages || {};
  const subjects = Object.values(subjectAverages);

  const handleSaveComments = async () => {
    setSaving(true);
    try {
      await gradesService.updateReportCard(card.id, {
        teacher_comment: teacherComment,
        principal_comment: principalComment,
      });
      notify('Commentaires enregistrés', 'success');
      onCommentSaved?.();
    } catch { notify('Erreur', 'error'); }
    finally { setSaving(false); }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const blob = await gradesService.getBulletinPdf(card.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulletin_${card.student_matricule || card.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { notify(e.message || 'Erreur PDF', 'error'); }
    finally { setDownloading(false); }
  };

  const avg = card.average ? parseFloat(card.average) : null;
  const c = avg !== null ? avgColor(avg) : null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="font-bold text-lg text-gray-800">{card.student_name}</h3>
            <p className="text-sm text-gray-500">{card.class_name} · {card.semester_name}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleDownloadPdf} disabled={downloading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
              style={{ background: COLOR }}>
              {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              PDF
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
          </div>
        </div>
        <div className="overflow-y-auto p-6 space-y-5">
          {/* Summary */}
          <div className="flex gap-4">
            <div className="flex-1 text-center p-3 rounded-xl border"
              style={{ background: c?.bg, borderColor: c?.color + '33' }}>
              <p className="text-xs text-gray-500 mb-1">Moyenne générale</p>
              <p className="text-2xl font-bold" style={{ color: c?.color }}>
                {avg !== null ? avg.toFixed(2) : '--'}/20
              </p>
            </div>
            <div className="flex-1 text-center p-3 rounded-xl border bg-gray-50">
              <p className="text-xs text-gray-500 mb-1">Rang</p>
              <p className="text-2xl font-bold text-gray-700">
                {card.rank ? `${card.rank}/${card.total_students}` : '--'}
              </p>
            </div>
            <div className="flex-1 text-center p-3 rounded-xl border bg-gray-50 flex flex-col items-center justify-center">
              <p className="text-xs text-gray-500 mb-1">Mention</p>
              <StatusBadge status={card.academic_mention || card.status} />
            </div>
          </div>

          {/* Subjects table */}
          {subjects.length > 0 && (
            <div className="rounded-xl overflow-hidden border border-gray-100">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: COLOR_BG }}>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Matière</th>
                    <th className="px-4 py-2 text-center font-semibold text-gray-700">Coeff</th>
                    <th className="px-4 py-2 text-center font-semibold text-gray-700">Moy./20</th>
                    <th className="px-4 py-2 text-center font-semibold text-gray-700">Pondérée</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s, i) => {
                    const sc = avgColor(s.average || 0);
                    return (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                        style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td className="px-4 py-2 font-medium text-gray-800">{s.subject_name}</td>
                        <td className="px-4 py-2 text-center text-gray-600">{s.coefficient}</td>
                        <td className="px-4 py-2 text-center">
                          <span className="font-bold text-sm px-2 py-0.5 rounded-full"
                            style={{ background: sc.bg, color: sc.color }}>
                            {(s.average || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center text-gray-500 font-mono text-xs">
                          {((s.average || 0) * s.coefficient).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Appréciation du professeur</label>
              <textarea value={teacherComment} onChange={e => setTeacherComment(e.target.value)}
                rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                placeholder="Appréciation du professeur principal…" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Appréciation du directeur</label>
              <textarea value={principalComment} onChange={e => setPrincipalComment(e.target.value)}
                rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                placeholder="Appréciation du directeur…" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
            Fermer
          </button>
          <button onClick={handleSaveComments} disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2"
            style={{ background: COLOR }}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ────────────────────────────────────────────────────────────────
// Tab 3 — Bulletins (G3)
// ────────────────────────────────────────────────────────────────
function BulletinsTab({ selectedSite }) {
  const { notify } = useNotifications();
  const [filterClass, setFilterClass]       = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [generating, setGenerating]         = useState(false);
  const [viewingCard, setViewingCard]       = useState(null);

  const siteFilter = selectedSite !== 'all' ? { site: selectedSite } : {};
  const { data: classesData }   = useApi(() => academicService.getClasses(siteFilter), [selectedSite]);
  const { data: semestersData } = useApi(() => academicService.getSemesters({}), []);
  const classes   = classesData?.results   || classesData   || [];
  const semesters = semestersData?.results || semestersData || [];

  const cardParams = {
    ...(filterClass    ? { class_group: filterClass }    : {}),
    ...(filterSemester ? { semester: filterSemester }    : {}),
  };
  const { data: cardsData, loading, execute: fetchCards } = useApi(
    () => (filterClass || filterSemester)
      ? gradesService.getReportCards(cardParams)
      : Promise.resolve([]),
    [filterClass, filterSemester],
    !!(filterClass || filterSemester)
  );
  const cards = cardsData?.results || cardsData || [];

  const handleGenerate = async () => {
    if (!filterClass || !filterSemester) {
      notify('Sélectionnez une classe et un semestre', 'error'); return;
    }
    setGenerating(true);
    try {
      const result = await gradesService.generateBulletins({
        class_group_id: filterClass,
        semester_id: filterSemester,
      });
      notify(`${(result || []).length} bulletin(s) généré(s)`, 'success');
      fetchCards();
    } catch (e) { notify(e.message || 'Erreur génération', 'error'); }
    finally { setGenerating(false); }
  };

  const handlePublishToggle = async (card) => {
    try {
      await gradesService.publishReportCard(card.id);
      notify(card.is_published ? 'Bulletin dépublié' : 'Bulletin publié', 'success');
      fetchCards();
    } catch { notify('Erreur', 'error'); }
  };

  const [publishingAll, setPublishingAll] = useState(false);
  const handlePublishAll = async () => {
    const unpublished = cards.filter(c => !c.is_published);
    if (unpublished.length === 0) { notify('Tous les bulletins sont déjà publiés', 'info'); return; }
    setPublishingAll(true);
    try {
      await Promise.all(unpublished.map(c => gradesService.publishReportCard(c.id)));
      notify(`${unpublished.length} bulletin(s) publié(s)`, 'success');
      fetchCards();
    } catch { notify('Erreur lors de la publication', 'error'); }
    finally { setPublishingAll(false); }
  };

  const handleDownloadPdf = async (card) => {
    try {
      const blob = await gradesService.getBulletinPdf(card.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulletin_${card.student_matricule || card.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      notify('PDF téléchargé', 'success');
    } catch (e) { notify(e.message || 'Erreur PDF', 'error'); }
  };

  const getMention = (c) => c.academic_mention || c.status;
  const passCount = cards.filter(c => ['PASS', 'HONORS'].includes(getMention(c))).length;
  const failCount = cards.filter(c => getMention(c) === 'FAIL').length;
  const avgGlobal = cards.length > 0
    ? (cards.reduce((s, c) => s + (parseFloat(c.average) || 0), 0) / cards.length).toFixed(2)
    : null;

  return (
    <div>
      {/* Filters + Generate */}
      <div className="flex flex-wrap gap-3 mb-5 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Classe</label>
          <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white min-w-[180px]">
            <option value="">Toutes les classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Semestre</label>
          <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white min-w-[160px]">
            <option value="">Tous les semestres</option>
            {semesters.map(s => <option key={s.id} value={s.id}>{s.label || s.name}</option>)}
          </select>
        </div>
        <button onClick={handleGenerate} disabled={generating || !filterClass || !filterSemester}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: COLOR }}>
          {generating ? <Loader2 size={16} className="animate-spin" /> : <Award size={16} />}
          {generating ? 'Génération…' : 'Générer / Recalculer bulletins'}
        </button>
        {cards.length > 0 && cards.some(c => !c.is_published) && (
          <button onClick={handlePublishAll} disabled={publishingAll}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: '#059669' }}>
            {publishingAll ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
            {publishingAll ? 'Publication…' : `Tout publier (${cards.filter(c => !c.is_published).length})`}
          </button>
        )}
      </div>

      {/* KPI cards */}
      {cards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          {[
            { label: 'Total', value: cards.length, color: COLOR, bg: COLOR_BG },
            { label: 'Admis', value: passCount, color: '#16a34a', bg: '#dcfce7' },
            { label: 'Ajourné', value: failCount, color: '#dc2626', bg: '#fee2e2' },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-xl p-4 border"
              style={{ background: kpi.bg, borderColor: kpi.color + '33' }}>
              <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
              <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
              {kpi.label === 'Total' && avgGlobal && (
                <p className="text-xs text-gray-500 mt-1">Moy. classe: {avgGlobal}/20</p>
              )}
            </div>
          ))}
        </div>
      )}

      {!filterClass && !filterSemester ? (
        <div className="text-center py-16 text-gray-400">
          <Award size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Sélectionnez une classe et/ou un semestre</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Aucun bulletin trouvé — cliquez sur «&nbsp;Générer&nbsp;»</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: COLOR_BG }}>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Étudiant</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Matricule</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Moyenne</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Rang</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Mention</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Publié</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card, i) => {
                const avg = card.average ? parseFloat(card.average) : null;
                const c = avg !== null ? avgColor(avg) : null;
                return (
                  <tr key={card.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                    style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td className="px-4 py-3 font-medium text-gray-800">{card.student_name}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{card.student_matricule}</td>
                    <td className="px-4 py-3 text-center">
                      {avg !== null ? (
                        <span className="font-bold text-sm px-2 py-0.5 rounded-full"
                          style={{ background: c.bg, color: c.color }}>
                          {avg.toFixed(2)}/20
                        </span>
                      ) : <span className="text-gray-300">–</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 font-mono text-sm">
                      {card.rank ? `${card.rank}` : '–'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={card.academic_mention || card.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handlePublishToggle(card)}
                        className="p-1.5 rounded-lg transition"
                        style={card.is_published
                          ? { color: '#16a34a', background: '#dcfce7' }
                          : { color: '#9ca3af', background: '#f9fafb' }}
                        title={card.is_published ? 'Dépublier' : 'Publier'}>
                        {card.is_published ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setViewingCard(card)}
                          className="p-1.5 hover:bg-indigo-50 rounded-lg text-gray-500 hover:text-indigo-600"
                          title="Voir détail">
                          <ChevronDown size={15} />
                        </button>
                        <button onClick={() => handleDownloadPdf(card)}
                          className="p-1.5 hover:bg-purple-50 rounded-lg text-gray-500 hover:text-purple-600"
                          title="Télécharger PDF">
                          <Download size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewingCard && (
        <BulletinDetailModal
          card={viewingCard}
          onClose={() => setViewingCard(null)}
          onCommentSaved={() => { fetchCards(); setViewingCard(null); }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Main Grades Page
// ────────────────────────────────────────────────────────────────
export default function Grades() {
  const { selectedSite } = useSite();
  const [activeTab, setActiveTab] = useState('evaluations');

  const tabs = [
    { id: 'evaluations', label: 'Évaluations',    icon: ClipboardList },
    { id: 'entry',       label: 'Saisie des notes', icon: BookOpen },
    { id: 'bulletins',   label: 'Bulletins',        icon: Award },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm"
          style={{ background: COLOR_ICON }}>
          <ClipboardList size={22} style={{ color: COLOR }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notes & Bulletins</h1>
          <p className="text-sm text-gray-500">Gestion des évaluations, saisie des notes et génération des bulletins</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-gray-100 rounded-xl w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={active
                ? { background: 'white', color: COLOR, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                : { color: '#6b7280' }}>
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {activeTab === 'evaluations' && <EvaluationsTab selectedSite={selectedSite} />}
        {activeTab === 'entry'       && <GradeEntryTab selectedSite={selectedSite} />}
        {activeTab === 'bulletins'   && <BulletinsTab selectedSite={selectedSite} />}
      </div>
    </div>
  );
}
