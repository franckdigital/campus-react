import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit, Trash2, FlaskConical, CheckCircle, Users, ExternalLink, X, Clock } from 'lucide-react';
import { elearningService } from '../../services';
import { useApi } from '../../hooks/useApi';
import { IconBtn, Pagination } from '../../components/ui/PageHeader';
import { useConfirm } from '../../components/ConfirmDialog';

const COLOR = '#059669';
const ITEMS = 8;

const LAB_TYPES = [
  { value: 'INFO', label: 'Informatique', color: '#0ea5e9' },
  { value: 'PHYSICS', label: 'Physique', color: '#7c3aed' },
  { value: 'CHEMISTRY', label: 'Chimie', color: '#d97706' },
  { value: 'NETWORK', label: 'Réseaux', color: '#059669' },
  { value: 'CLOUD', label: 'Cloud', color: '#0284c7' },
  { value: 'ELECTRONICS', label: 'Électronique', color: '#dc2626' },
  { value: 'AI', label: 'Intelligence Artificielle', color: '#db2777' },
  { value: 'PROGRAMMING', label: 'Programmation', color: '#2563eb' },
  { value: 'DOCKER', label: 'Docker', color: '#1d4ed8' },
  { value: 'LINUX', label: 'Linux', color: '#374151' },
  { value: 'VM', label: 'Machines virtuelles', color: '#6366f1' },
  { value: 'MATH', label: 'Mathématiques', color: '#8b5cf6' },
  { value: 'BIO', label: 'Biologie', color: '#16a34a' },
  { value: 'OTHER', label: 'Autre', color: '#64748b' },
];

function LabModal({ open, onClose, editing, classesList, subjectsList, lessonsList, onSaved, notify }) {
  const [form, setForm] = useState({ title: '', description: '', instructions: '', objectives: '', lab_type: 'INFO', class_obj: '', subject: '', lesson: '', access_url: '', embed_url: '', duration_minutes: 120, max_attempts: 3, max_score: 20, is_published: false, order: 0 });
  const [loading, setLoading] = useState(false);

  useState(() => {
    if (editing) setForm({ ...editing, lesson: editing.lesson || '' });
    else setForm({ title: '', description: '', instructions: '', objectives: '', lab_type: 'INFO', class_obj: '', subject: '', lesson: '', access_url: '', embed_url: '', duration_minutes: 120, max_attempts: 3, max_score: 20, is_published: false, order: 0 });
  }, [editing, open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const payload = { ...form, lesson: form.lesson || null };
      if (editing) await elearningService.updateVirtualLab(editing.id, payload);
      else await elearningService.createVirtualLab(payload);
      notify({ type: 'success', title: editing ? 'Labo modifié' : 'Labo créé', message: '' });
      onSaved(); onClose();
    } catch (err) { notify({ type: 'error', title: 'Erreur', message: err.message || 'Erreur' }); }
    finally { setLoading(false); }
  };

  const F = ({ label, children }) => (
    <div><label className="block mb-1" style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>{children}</div>
  );

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4" style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)', zIndex: 50 }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div className="h-1 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${COLOR}, #0ea5e9)` }} />
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <h2 className="text-base font-extrabold min-w-0 truncate">{editing ? 'Modifier le labo' : 'Nouveau laboratoire virtuel'}</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ color: '#64748b' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <F label="Titre *"><input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="input-field" /></F>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="Classe *">
              <select required value={form.class_obj} onChange={e => setForm(p => ({ ...p, class_obj: e.target.value }))} className="input-field cursor-pointer">
                <option value="">Sélectionner…</option>
                {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </F>
            <F label="Matière *">
              <select required value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} className="input-field cursor-pointer">
                <option value="">Sélectionner…</option>
                {subjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </F>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="Type de labo">
              <select value={form.lab_type} onChange={e => setForm(p => ({ ...p, lab_type: e.target.value }))} className="input-field cursor-pointer">
                {LAB_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </F>
            <F label="Leçon associée">
              <select value={form.lesson} onChange={e => setForm(p => ({ ...p, lesson: e.target.value }))} className="input-field cursor-pointer">
                <option value="">Aucune</option>
                {lessonsList.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
            </F>
          </div>
          <F label="Description"><textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className="input-field resize-none" /></F>
          <F label="Objectifs pédagogiques"><textarea value={form.objectives} onChange={e => setForm(p => ({ ...p, objectives: e.target.value }))} rows={2} className="input-field resize-none" /></F>
          <F label="Instructions / Consignes"><textarea value={form.instructions} onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))} rows={3} className="input-field resize-none" /></F>
          <F label="URL d'accès (lien externe)"><input type="url" value={form.access_url} onChange={e => setForm(p => ({ ...p, access_url: e.target.value }))} className="input-field" placeholder="https://..." /></F>
          <F label="URL d'embed (iframe)"><input type="url" value={form.embed_url} onChange={e => setForm(p => ({ ...p, embed_url: e.target.value }))} className="input-field" placeholder="https://..." /></F>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <F label="Durée (min)"><input type="number" min="10" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: parseInt(e.target.value) || 120 }))} className="input-field" /></F>
            <F label="Tentatives max"><input type="number" min="1" value={form.max_attempts} onChange={e => setForm(p => ({ ...p, max_attempts: parseInt(e.target.value) || 3 }))} className="input-field" /></F>
            <F label="Note max"><input type="number" min="0" value={form.max_score} onChange={e => setForm(p => ({ ...p, max_score: parseFloat(e.target.value) || 20 }))} className="input-field" /></F>
          </div>
          <div className="flex justify-end gap-3 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold border" style={{ color: '#64748b', borderColor: '#e2e8f0' }}>Annuler</button>
            <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${COLOR}, #10b981)`, boxShadow: `0 4px 14px ${COLOR}40` }}>
              {loading ? 'Enregistrement…' : (editing ? 'Mettre à jour' : 'Créer le labo')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default function VirtualLabManager({ classesList = [], subjectsList = [], lessons = [], selectedClass, notify }) {
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showSubs, setShowSubs] = useState(null);
  const confirm = useConfirm();

  const classFilter = selectedClass !== 'all' ? { class_obj: selectedClass } : {};
  const { data, refetch } = useApi(() => elearningService.getVirtualLabs({ ...classFilter, is_active: true }), [selectedClass], true);
  const labs = data?.results || data || [];
  const { data: subsData } = useApi(() => showSubs ? elearningService.getLabSubmissions(showSubs) : Promise.resolve([]), [showSubs], true);
  const subs = subsData || [];

  const totalPages = Math.ceil(labs.length / ITEMS);
  const paginated = labs.slice((page - 1) * ITEMS, page * ITEMS);

  const handleDelete = async (lab) => {
    if (!await confirm({ title: `Supprimer "${lab.title}" ?`, message: 'Cette action est irréversible.', confirmLabel: 'Supprimer', destructive: true })) return;
    try { await elearningService.deleteVirtualLab(lab.id); notify({ type: 'success', title: 'Supprimé', message: '' }); refetch(); }
    catch { notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la suppression' }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setEditing(null); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: `linear-gradient(135deg, ${COLOR}, #10b981)`, boxShadow: `0 4px 14px ${COLOR}40` }}>
          <Plus className="h-4 w-4" /> Nouveau labo
        </button>
      </div>

      {paginated.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#d1fae5' }}>
            <FlaskConical className="h-8 w-8 opacity-40" style={{ color: COLOR }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>Aucun laboratoire virtuel</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map(lab => {
              const lt = LAB_TYPES.find(t => t.value === lab.lab_type) || { label: lab.lab_type, color: '#64748b' };
              return (
                <div key={lab.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-xl transition-all" style={{ border: '1.5px solid #f0f4f9' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f8faff'; e.currentTarget.style.borderColor = '#a7f3d0'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#f0f4f9'; }}>
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${lt.color}22, ${lt.color}44)` }}>
                      <FlaskConical className="h-5 w-5" style={{ color: lt.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-extrabold" style={{ color: '#0f172a' }}>{lab.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${lt.color}22`, color: lt.color }}>{lt.label}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: lab.is_published ? '#d1fae5' : '#fef9c3', color: lab.is_published ? '#065f46' : '#92400e' }}>
                          {lab.is_published ? 'Publié' : 'Brouillon'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: '#64748b' }}>
                        <span>{lab.class_name} — {lab.subject_name}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{lab.duration_minutes} min</span>
                        <span>{lab.submission_count} soumission{lab.submission_count !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 self-end sm:self-auto">
                    {!lab.is_published && <IconBtn onClick={async () => { await elearningService.publishVirtualLab(lab.id); refetch(); }} icon={CheckCircle} color="#059669" hoverBg="#d1fae5" title="Publier" />}
                    {lab.access_url && <IconBtn onClick={() => window.open(lab.access_url, '_blank', 'noopener,noreferrer')} icon={ExternalLink} color="#0ea5e9" hoverBg="#e0f2fe" title="Ouvrir le labo" />}
                    <IconBtn onClick={() => setShowSubs(lab.id)} icon={Users} color="#7c3aed" hoverBg="#ede9fe" title="Soumissions" />
                    <IconBtn onClick={() => { setEditing(lab); setShowModal(true); }} icon={Edit} color="#2563eb" hoverBg="#dbeafe" title="Modifier" />
                    <IconBtn onClick={() => handleDelete(lab)} icon={Trash2} color="#ef4444" hoverBg="#fee2e2" title="Supprimer" />
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} accentColor={COLOR} totalItems={labs.length} itemsPerPage={ITEMS} />
        </>
      )}

      {showSubs && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4" style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)', zIndex: 50 }} onClick={() => setShowSubs(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div className="h-1 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${COLOR}, #0ea5e9)` }} />
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <h2 className="text-base font-extrabold min-w-0 truncate">Soumissions du laboratoire</h2>
              <button onClick={() => setShowSubs(null)} className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ color: '#64748b' }}><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 sm:p-6 space-y-2">
              {subs.length === 0 ? <p className="text-sm text-center" style={{ color: '#94a3b8' }}>Aucune soumission</p> :
                subs.map(s => (
                  <div key={s.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-xl" style={{ background: '#f8faff', border: '1.5px solid #f0f4f9' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold" style={{ color: '#0f172a' }}>{s.student_name} ({s.student_matricule})</p>
                      <p className="text-xs" style={{ color: '#64748b' }}>Statut : {s.status} {s.score !== null ? `— Note : ${s.score}` : ''}</p>
                    </div>
                    {s.status === 'SUBMITTED' && (
                      <button onClick={async () => {
                        const maxScore = subs[0]?.lab?.max_score || 20;
                        const result = await confirm({
                          title: 'Noter la soumission',
                          message: `${s.student_name} — note sur ${maxScore}`,
                          confirmLabel: 'Valider la note',
                          fields: [
                            { key: 'score', label: `Note (sur ${maxScore})`, type: 'number', min: 0, max: maxScore, step: 0.5, required: true, autoFocus: true },
                            { key: 'feedback', label: 'Commentaire (optionnel)', type: 'textarea' },
                          ],
                        });
                        if (!result) return;
                        await elearningService.gradeLabSubmission(s.id, { score: parseFloat(result.score), feedback: result.feedback || '' });
                        refetch();
                      }} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: COLOR }}>Corriger</button>
                    )}
                  </div>
                ))
              }
            </div>
          </div>
        </div>,
        document.body
      )}

      <LabModal open={showModal} onClose={() => setShowModal(false)} editing={editing}
        classesList={classesList} subjectsList={subjectsList} lessonsList={lessons}
        onSaved={refetch} notify={notify} />
    </div>
  );
}
