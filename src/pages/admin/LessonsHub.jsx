import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit, Trash2, CheckCircle, FileText, X, GraduationCap } from 'lucide-react';
import { elearningService } from '../../services/elearning';
import academicService from '../../services/academic';
import { useApi } from '../../hooks/useApi';
import { useNotifications } from '../../components/Notifications';
import { useConfirm } from '../../components/ConfirmDialog';

const P = '#db2777';
const P_BG = '#fdf2f8';

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4"
      style={{ background: 'rgba(8,12,36,0.6)', backdropFilter: 'blur(10px)', zIndex: 9999 }}
      onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}>
        <div className="h-1 rounded-t-2xl" style={{ background: `linear-gradient(90deg,${P},#6366f1)` }} />
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <h2 className="text-base font-extrabold truncate min-w-0" style={{ color: '#0f172a' }}>{title}</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ color: '#64748b' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 sm:p-6 space-y-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block mb-1.5" style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const EMPTY_FORM = { title: '', description: '', class_obj: '', subject: '', order: 1 };

export default function LessonsHub({ classesList: classesListProp, subjectsList: subjectsListProp } = {}) {
  const { notify } = useNotifications();
  const confirm = useConfirm();

  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editLesson, setEditLesson] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // A caller (e.g. the teacher-facing wrapper) can pass a pre-scoped
  // classes/subjects list — otherwise fetch the full school-wide lists, as
  // before, for admin use.
  const { data: classesData } = useApi(() => academicService.getClasses({ is_active: true }), [], !classesListProp);
  const classesList = classesListProp || classesData?.results || classesData || [];
  const { data: subjectsData } = useApi(() => academicService.getSubjects(), [], !subjectsListProp);
  const subjectsList = subjectsListProp || subjectsData?.results || subjectsData || [];

  const params = {
    ...(selectedClass !== 'all' ? { class_obj: selectedClass } : {}),
    ...(selectedSubject !== 'all' ? { subject: selectedSubject } : {}),
  };
  const { data: lessonsData, loading, refetch } = useApi(
    () => elearningService.getLessons(params),
    [selectedClass, selectedSubject], true
  );
  const lessons = lessonsData?.results || lessonsData || [];

  const openCreate = () => { setEditLesson(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (l) => {
    setEditLesson(l);
    setForm({ title: l.title || '', description: l.description || '', class_obj: String(l.class_obj || ''), subject: String(l.subject || ''), order: l.order || 1 });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditLesson(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editLesson) {
        await elearningService.updateLesson(editLesson.id, form);
        notify({ type: 'success', title: 'Leçon mise à jour' });
      } else {
        await elearningService.createLesson(form);
        notify({ type: 'success', title: 'Leçon créée' });
      }
      closeModal();
      refetch();
    } catch (err) {
      notify({ type: 'error', title: 'Erreur', message: err.message || 'Erreur lors de la sauvegarde' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (l) => {
    if (!await confirm({ title: `Supprimer "${l.title}" ?`, message: 'Cette action est irréversible.', confirmLabel: 'Supprimer', destructive: true })) return;
    try {
      await elearningService.deleteLesson(l.id);
      notify({ type: 'success', title: 'Leçon supprimée' });
      refetch();
    } catch { notify({ type: 'error', title: 'Erreur', message: 'Impossible de supprimer la leçon' }); }
  };

  const handlePublish = async (l) => {
    try {
      await elearningService.publishLesson(l.id);
      notify({ type: 'success', title: 'Leçon publiée' });
      refetch();
    } catch { notify({ type: 'error', title: 'Erreur', message: 'Impossible de publier la leçon' }); }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>Leçons & Parcours</h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>Gérez les leçons par classe et matière</p>
        </div>
        <button onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white flex-shrink-0"
          style={{ background: `linear-gradient(135deg,${P},#be185d)`, boxShadow: `0 4px 14px ${P}40` }}>
          <Plus className="h-4 w-4" /> Nouvelle leçon
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white" style={{ border: '1.5px solid #e2e8f0' }}>
          <GraduationCap className="h-4 w-4 flex-shrink-0" style={{ color: '#94a3b8' }} />
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
            className="text-sm bg-transparent outline-none cursor-pointer" style={{ color: '#374151' }}>
            <option value="all">Toutes les classes</option>
            {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white" style={{ border: '1.5px solid #e2e8f0' }}>
          <FileText className="h-4 w-4 flex-shrink-0" style={{ color: '#94a3b8' }} />
          <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
            className="text-sm bg-transparent outline-none cursor-pointer" style={{ color: '#374151' }}>
            <option value="all">Toutes les matières</option>
            {subjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
        </div>
      ) : lessons.length === 0 ? (
        <div className="flex flex-col items-center py-16 rounded-2xl" style={{ border: '1.5px dashed #e2e8f0' }}>
          <FileText className="h-12 w-12 mb-3 opacity-20" style={{ color: P }} />
          <p className="text-sm font-bold mb-1" style={{ color: '#64748b' }}>Aucune leçon trouvée</p>
          <p className="text-xs mb-4" style={{ color: '#94a3b8' }}>Créez votre première leçon</p>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: `linear-gradient(135deg,${P},#be185d)` }}>
            <Plus className="h-4 w-4" /> Créer une leçon
          </button>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden bg-white" style={{ border: '1.5px solid #f0f4f9' }}>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #f0f4f9' }}>
                {['Leçon', 'Classe', 'Matière', 'Statut', 'Actions'].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs font-extrabold uppercase tracking-wide ${h === 'Actions' ? 'text-right' : 'text-left'}`}
                    style={{ color: '#94a3b8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lessons.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f8fafc' }}
                  className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: P_BG }}>
                        <FileText className="h-4 w-4" style={{ color: P }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold truncate max-w-[180px] sm:max-w-xs" style={{ color: '#0f172a' }}>{l.title}</p>
                        {l.description && <p className="text-xs truncate max-w-[180px] sm:max-w-xs" style={{ color: '#64748b' }}>{l.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ background: '#ede9fe', color: '#7c3aed' }}>
                      {l.class_name || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ background: P_BG, color: P }}>
                      {l.subject_name || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: l.is_published ? '#d1fae5' : '#fef9c3', color: l.is_published ? '#065f46' : '#92400e' }}>
                      {l.is_published ? 'Publié' : 'Brouillon'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {!l.is_published && (
                        <button onClick={() => handlePublish(l)} title="Publier"
                          className="h-7 w-7 rounded-lg flex items-center justify-center transition-all"
                          style={{ color: '#94a3b8' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#d1fae5'; e.currentTarget.style.color = '#059669'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}>
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => openEdit(l)} title="Modifier"
                        className="h-7 w-7 rounded-lg flex items-center justify-center transition-all"
                        style={{ color: '#94a3b8' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.color = '#2563eb'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}>
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(l)} title="Supprimer"
                        className="h-7 w-7 rounded-lg flex items-center justify-center transition-all"
                        style={{ color: '#94a3b8' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal open={showModal} onClose={closeModal} title={editLesson ? 'Modifier la leçon' : 'Nouvelle leçon'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Titre" required>
            <input type="text" required value={form.title} onChange={set('title')}
              className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
              style={{ borderColor: '#e2e8f0' }} />
          </Field>
          <Field label="Description">
            <textarea value={form.description} onChange={set('description')} rows={2}
              className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none resize-none"
              style={{ borderColor: '#e2e8f0' }} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Classe" required>
              <select required value={form.class_obj} onChange={set('class_obj')}
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none bg-white cursor-pointer"
                style={{ borderColor: '#e2e8f0' }}>
                <option value="">Sélectionner…</option>
                {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Matière" required>
              <select required value={form.subject} onChange={set('subject')}
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none bg-white cursor-pointer"
                style={{ borderColor: '#e2e8f0' }}>
                <option value="">Sélectionner…</option>
                {subjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="flex justify-end gap-3 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
            <button type="button" onClick={closeModal}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border"
              style={{ color: '#64748b', borderColor: '#e2e8f0' }}>Annuler</button>
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: `linear-gradient(135deg,${P},#be185d)` }}>
              {saving ? 'Enregistrement…' : editLesson ? 'Mettre à jour' : 'Créer la leçon'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
