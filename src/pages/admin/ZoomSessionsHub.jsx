import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Video, Trash2, ExternalLink, Calendar, Clock, X, Link2 } from 'lucide-react';
import { elearningService } from '../../services/elearning';
import { useApi } from '../../hooks/useApi';
import { useNotifications } from '../../components/Notifications';
import { useConfirm } from '../../components/ConfirmDialog';

const P = '#7c3aed';
const P_BG = '#f5f3ff';

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4"
      style={{ background: 'rgba(8,12,36,0.6)', backdropFilter: 'blur(10px)', zIndex: 9999 }}
      onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}>
        <div className="h-1 rounded-t-2xl" style={{ background: 'linear-gradient(90deg,#7c3aed,#6366f1)' }} />
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <h2 className="text-base font-extrabold min-w-0 truncate" style={{ color: '#0f172a' }}>{title}</h2>
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

const EMPTY = { topic: '', start_time: '', duration: 60, meeting_id: '', join_url: '', password: '' };

function isLive(m) {
  const now = new Date();
  const start = new Date(m.start_time);
  const end = new Date(start.getTime() + (m.duration || 60) * 60000);
  return now >= start && now <= end;
}

function isUpcoming(m) {
  return new Date(m.start_time) > new Date();
}

export default function ZoomSessionsHub() {
  const { notify } = useNotifications();
  const confirm = useConfirm();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const { data, loading, refetch } = useApi(() => elearningService.getZoomMeetings({}), [], true);
  const meetings = data?.results || data || [];

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await elearningService.createZoomMeetingManual(form);
      notify({ type: 'success', title: 'Session créée' });
      setShowModal(false);
      setForm(EMPTY);
      refetch();
    } catch (err) {
      notify({ type: 'error', title: 'Erreur', message: err.message || 'Impossible de créer la session' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (m) => {
    if (!await confirm({ title: `Supprimer "${m.topic}" ?`, destructive: true })) return;
    try {
      await elearningService.deleteZoomMeeting(m.id);
      notify({ type: 'success', title: 'Session supprimée' });
      refetch();
    } catch { notify({ type: 'error', title: 'Erreur', message: 'Impossible de supprimer la session' }); }
  };

  const liveMeetings = meetings.filter(isLive);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>Sessions Zoom</h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>Planifiez et gérez vos réunions Zoom pédagogiques</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)', boxShadow: '0 4px 14px #7c3aed40' }}>
          <Plus className="h-4 w-4" /> Nouvelle session
        </button>
      </div>

      {/* Live sessions banner */}
      {liveMeetings.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg,#fff1f2,#fff5f5)', border: '1.5px solid #fecdd3' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-xl flex items-center justify-center animate-pulse"
              style={{ background: 'linear-gradient(135deg,#ef4444,#db2777)' }}>
              <Video className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-extrabold" style={{ color: '#b91c1c' }}>Sessions en direct</p>
              <p className="text-xs" style={{ color: '#f87171' }}>{liveMeetings.length} session{liveMeetings.length > 1 ? 's' : ''} active{liveMeetings.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {liveMeetings.map(m => (
              <a key={m.id} href={m.join_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#ef4444,#db2777)' }}>
                <ExternalLink className="h-3.5 w-3.5" /> Rejoindre — {m.topic}
              </a>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="flex flex-col items-center py-16 rounded-2xl" style={{ border: '1.5px dashed #e2e8f0' }}>
          <Video className="h-12 w-12 mb-3 opacity-20" style={{ color: P }} />
          <p className="text-sm font-bold mb-1" style={{ color: '#64748b' }}>Aucune session Zoom</p>
          <p className="text-xs mb-4" style={{ color: '#94a3b8' }}>Planifiez votre première session en ligne</p>
          <button onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
            <Plus className="h-4 w-4" /> Créer une session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {meetings.map(m => {
            const live = isLive(m);
            const upcoming = isUpcoming(m);
            return (
              <div key={m.id} className="bg-white rounded-2xl overflow-hidden transition-all hover:shadow-md"
                style={{ border: live ? '2px solid #fca5a5' : '1.5px solid #f0f4f9' }}>
                <div className="h-1.5" style={{ background: live ? 'linear-gradient(90deg,#ef4444,#db2777)' : upcoming ? 'linear-gradient(90deg,#6366f1,#7c3aed)' : 'linear-gradient(90deg,#7c3aed,#6366f1)' }} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${live ? 'animate-pulse' : ''}`}
                      style={{ background: live ? 'linear-gradient(135deg,#ef4444,#db2777)' : P_BG }}>
                      <Video className="h-5 w-5" style={{ color: live ? '#fff' : P }} />
                    </div>
                    {live && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full animate-pulse"
                        style={{ background: '#fee2e2', color: '#ef4444' }}>
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />EN DIRECT
                      </span>
                    )}
                    {upcoming && !live && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                        style={{ background: '#e0e7ff', color: '#4338ca' }}>Bientôt</span>
                    )}
                    {!live && !upcoming && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                        style={{ background: '#f1f5f9', color: '#64748b' }}>Terminée</span>
                    )}
                  </div>
                  <h3 className="text-sm font-extrabold mb-2" style={{ color: '#0f172a' }}>{m.topic}</h3>
                  <div className="space-y-1.5 mb-3 text-xs">
                    <p className="flex items-center gap-1.5 font-medium" style={{ color: '#64748b' }}>
                      <Calendar className="h-3 w-3" />{new Date(m.start_time).toLocaleDateString('fr-FR')}
                    </p>
                    <p className="flex items-center gap-1.5 font-medium" style={{ color: '#64748b' }}>
                      <Clock className="h-3 w-3" />{new Date(m.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: '#f1f5f9', color: '#94a3b8' }}>{m.duration} min</span>
                    </p>
                    {m.meeting_id && (
                      <p className="font-mono text-xs font-bold" style={{ color: P }}>ID: {m.meeting_id}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {m.join_url && (
                      <a href={m.join_url} target="_blank" rel="noopener noreferrer"
                        className="flex-1 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5"
                        style={{ background: live ? 'linear-gradient(135deg,#ef4444,#db2777)' : 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                        <ExternalLink className="h-3.5 w-3.5" />{live ? 'Rejoindre' : 'Ouvrir'}
                      </a>
                    )}
                    {m.join_url && (
                      <button onClick={() => { navigator.clipboard.writeText(m.join_url); notify({ type: 'success', title: 'Lien copié' }); }}
                        title="Copier le lien"
                        className="h-8 w-8 rounded-xl flex items-center justify-center transition-all"
                        style={{ color: P }}
                        onMouseEnter={e => { e.currentTarget.style.background = P_BG; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                        <Link2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(m)} title="Supprimer"
                      className="h-8 w-8 rounded-xl flex items-center justify-center transition-all"
                      style={{ color: '#94a3b8' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouvelle session Zoom">
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="Sujet / Titre" required>
            <input type="text" required value={form.topic} onChange={set('topic')}
              className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
              style={{ borderColor: '#e2e8f0' }} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Date & heure" required>
              <input type="datetime-local" required value={form.start_time} onChange={set('start_time')}
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                style={{ borderColor: '#e2e8f0' }} />
            </Field>
            <Field label="Durée (min)">
              <input type="number" min={15} max={480} value={form.duration} onChange={set('duration')}
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                style={{ borderColor: '#e2e8f0' }} />
            </Field>
          </div>
          <Field label="ID de réunion Zoom">
            <input type="text" value={form.meeting_id} onChange={set('meeting_id')} placeholder="123 456 7890"
              className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
              style={{ borderColor: '#e2e8f0' }} />
          </Field>
          <Field label="Lien de participation">
            <input type="url" value={form.join_url} onChange={set('join_url')} placeholder="https://zoom.us/j/..."
              className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
              style={{ borderColor: '#e2e8f0' }} />
          </Field>
          <Field label="Mot de passe">
            <input type="text" value={form.password} onChange={set('password')}
              className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
              style={{ borderColor: '#e2e8f0' }} />
          </Field>
          <div className="flex justify-end gap-3 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
            <button type="button" onClick={() => setShowModal(false)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border"
              style={{ color: '#64748b', borderColor: '#e2e8f0' }}>Annuler</button>
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              {saving ? 'Création…' : 'Créer la session'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
