import { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, MapPin, BookOpen, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { academicService } from '../../services';
import { useNotifications } from '../../components/Notifications';
import { useTeacherClassSubjects } from '../../hooks/useTeacherClassSubjects';
import { Modal, FormField, FormSelect, FormInput, ModalFooter } from '../../components/ui/PageHeader';

const COLOR = '#0d9488';

const DAYS = [
  { idx: 0, label: 'Lundi',    short: 'Lun' },
  { idx: 1, label: 'Mardi',    short: 'Mar' },
  { idx: 2, label: 'Mercredi', short: 'Mer' },
  { idx: 3, label: 'Jeudi',    short: 'Jeu' },
  { idx: 4, label: 'Vendredi', short: 'Ven' },
  { idx: 5, label: 'Samedi',   short: 'Sam' },
];

const SESSION_COLORS = [
  { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
  { bg: '#fce7f3', color: '#be185d', border: '#fbcfe8' },
  { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
  { bg: '#fef9c3', color: '#a16207', border: '#fef08a' },
  { bg: '#ede9fe', color: '#6d28d9', border: '#ddd6fe' },
  { bg: '#ffedd5', color: '#c2410c', border: '#fed7aa' },
];

function getSessionColor(subjectName) {
  if (!subjectName) return SESSION_COLORS[0];
  let hash = 0;
  for (let i = 0; i < subjectName.length; i++) hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
  return SESSION_COLORS[Math.abs(hash) % SESSION_COLORS.length];
}

function getWeekDates(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function fmtDate(d) {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function timeToHour(timeStr) {
  if (!timeStr) return null;
  return Number(timeStr.split(':')[0]);
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  return `${h}h${m && m !== '00' ? m : ''}`;
}

function getSessionDuration(session) {
  const [sh, sm] = (session.start_time || '0:0').split(':').map(Number);
  const [eh, em] = (session.end_time   || '0:0').split(':').map(Number);
  return Math.max(1, Math.round(((eh * 60 + (em || 0)) - (sh * 60 + (sm || 0))) / 60));
}

const emptyForm = { class_obj: '', subject: '', room: '', day_of_week: 0, start_time: '08:00', end_time: '10:00' };

export default function TeacherTimetable() {
  const { notify } = useNotifications();
  const { assignments, teacherId } = useTeacherClassSubjects();

  const [weekOffset, setWeekOffset] = useState(0);
  const [sessions,   setSessions]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [rooms,      setRooms]      = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState(emptyForm);
  const [saving,    setSaving]    = useState(false);

  const weekDates = getWeekDates(weekOffset);
  const today     = new Date().getDay();
  const todayIdx  = today === 0 ? -1 : today - 1; // JS: 0=Sun,1=Mon → idx 0=Mon

  async function reload() {
    if (!teacherId) return;
    setLoading(true);
    try {
      const res = await academicService.getTeacherSessions(teacherId);
      setSessions(res?.results || res || []);
    } catch (e) { console.log('Timetable:', e.message); }
    finally { setLoading(false); }
  }

  // Load teacher's own sessions — recurring weekly schedule, not week-specific,
  // so it isn't re-fetched when navigating weeks.
  useEffect(() => { reload(); }, [teacherId]);

  useEffect(() => {
    academicService.getRooms({ is_active: true, page_size: 500 }).then(d => setRooms(d?.results || d || [])).catch(() => {});
  }, []);

  const sessionsByDay = useMemo(() => Array.from({ length: 6 }, (_, idx) =>
    sessions
      .filter(s => (s.day_of_week ?? -1) === idx)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
  ), [sessions]);

  // Hour range sized to the teacher's actual sessions (±1h margin) instead of
  // a fixed all-day range, so the grid stays compact when there are few slots.
  const HOURS = useMemo(() => {
    const hours = sessions.map(s => timeToHour(s.start_time)).filter(h => h != null);
    const minH = hours.length ? Math.max(6, Math.min(...hours) - 1) : 7;
    const maxH = hours.length ? Math.min(21, Math.max(...hours) + 2) : 18;
    return Array.from({ length: Math.max(1, maxH - minH) }, (_, i) => minH + i);
  }, [sessions]);

  function getSessionsForCell(dayIdx, hour) {
    return sessionsByDay[dayIdx].filter(s => timeToHour(s.start_time) === hour);
  }

  // Distinct classes/subjects the teacher is actually assigned to (ClassSubjectTeacher) —
  // the backend rejects any session for a class+subject pair not in this set anyway.
  const myClasses = useMemo(() => {
    const seen = new Map();
    assignments.forEach(a => { if (!seen.has(a.class_obj)) seen.set(a.class_obj, { id: a.class_obj, name: a.class_name }); });
    return [...seen.values()];
  }, [assignments]);
  const subjectsForClass = useMemo(() => {
    if (!form.class_obj) return [];
    return assignments
      .filter(a => String(a.class_obj) === String(form.class_obj))
      .map(a => ({ id: a.subject, name: a.subject_name, code: a.subject_code }));
  }, [assignments, form.class_obj]);

  function openCreate(dayIdx, hour) {
    setEditing(null);
    setForm({
      ...emptyForm,
      day_of_week: dayIdx,
      start_time: `${String(hour).padStart(2, '0')}:00`,
      end_time: `${String(hour + 1).padStart(2, '0')}:00`,
    });
    setModalOpen(true);
  }

  function openEdit(session) {
    setEditing(session);
    setForm({
      class_obj: session.class_obj || '',
      subject: session.subject || '',
      room: session.room || '',
      day_of_week: session.day_of_week ?? 0,
      start_time: session.start_time?.slice(0, 5) || '08:00',
      end_time: session.end_time?.slice(0, 5) || '10:00',
    });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.class_obj || !form.subject || !form.start_time || !form.end_time) {
      notify('Classe, matière et horaires sont requis.', 'error');
      return;
    }
    if (form.start_time >= form.end_time) {
      notify("L'heure de fin doit être après l'heure de début.", 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        class_obj: form.class_obj,
        subject: form.subject,
        room: form.room || null,
        day_of_week: Number(form.day_of_week),
        start_time: form.start_time,
        end_time: form.end_time,
      };
      if (editing) await academicService.updateSession(editing.id, payload);
      else await academicService.createSession(payload);
      notify(editing ? 'Créneau modifié.' : 'Créneau ajouté.', 'success');
      setModalOpen(false);
      reload();
    } catch (err) {
      notify(err?.response?.data?.detail || 'Erreur lors de l’enregistrement du créneau.', 'error');
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!editing || !window.confirm('Supprimer ce créneau ?')) return;
    setSaving(true);
    try {
      await academicService.deleteSession(editing.id);
      notify('Créneau supprimé.', 'warning');
      setModalOpen(false);
      reload();
    } catch {
      notify('Erreur lors de la suppression.', 'error');
    }
    setSaving(false);
  }

  const weekLabel = `${weekDates[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} – ${weekDates[5].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: '#f0fdfa' }}>
              <Calendar className="h-3 w-3" style={{ color: '#0d9488' }} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#0d9488' }}>Planning</span>
          </div>
          <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a', letterSpacing: '-0.03em' }}>Emploi du temps</h1>
          <p className="text-sm mt-0.5 font-medium" style={{ color: '#94a3b8' }}>{weekLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(o => o - 1)}
            className="h-9 w-9 rounded-xl flex items-center justify-center transition-all hover:bg-slate-100"
            style={{ border: '1px solid #e2e8f0' }}>
            <ChevronLeft className="h-4 w-4" style={{ color: '#64748b' }} />
          </button>
          <button onClick={() => setWeekOffset(0)}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:bg-teal-50"
            style={{ border: '1px solid #e2e8f0', color: '#0d9488' }}>
            Aujourd'hui
          </button>
          <button onClick={() => setWeekOffset(o => o + 1)}
            className="h-9 w-9 rounded-xl flex items-center justify-center transition-all hover:bg-slate-100"
            style={{ border: '1px solid #e2e8f0' }}>
            <ChevronRight className="h-4 w-4" style={{ color: '#64748b' }} />
          </button>
          <button onClick={() => openCreate(todayIdx >= 0 ? todayIdx : 0, 8)}
            disabled={myClasses.length === 0}
            title={myClasses.length === 0 ? 'Déclarez d’abord une matière dans "Mes matières"' : undefined}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, ${COLOR}, ${COLOR}cc)` }}>
            <Plus className="h-4 w-4" /> Ajouter un créneau
          </button>
        </div>
      </div>

      {/* ── Calendar grid ────────────────────────────────────────── */}
      {loading ? (
        <div className="card p-5 space-y-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: '#f1f5f9' }} />)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: '#f1f5f9' }}>
            <BookOpen className="h-6 w-6 opacity-30" style={{ color: '#64748b' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: '#94a3b8' }}>Aucun cours planifié</p>
          <p className="text-xs mt-1" style={{ color: '#cbd5e1' }}>Cliquez sur « Ajouter un créneau » pour commencer.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#f0f4f9] bg-white overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(15,23,50,0.05)' }}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 900 }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg,#fafbff,#f8fafc)', borderBottom: '1px solid #f0f4f9' }}>
                  <th className="w-16 px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 border-r border-[#f0f4f9]">
                    Heure
                  </th>
                  {DAYS.map(day => {
                    const isToday = weekOffset === 0 && day.idx === todayIdx;
                    return (
                      <th key={day.idx}
                          className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider border-r border-[#f0f4f9] last:border-r-0"
                          style={{ color: '#64748b', background: isToday ? `${COLOR}08` : undefined }}>
                        <span className="block text-xs font-bold" style={{ color: isToday ? COLOR : '#0f172a' }}>{day.label}</span>
                        <span className="block text-[11px] font-semibold mt-0.5" style={{ color: isToday ? COLOR : '#94a3b8' }}>
                          {fmtDate(weekDates[day.idx])}
                        </span>
                        <span className="block text-[10px] font-medium text-slate-400 mt-0.5">
                          {sessionsByDay[day.idx].length} cours
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour, hIdx) => (
                  <tr key={hour} style={{ background: hIdx % 2 === 0 ? '#fafbff' : 'transparent', borderBottom: '1px solid #f1f5f9' }}>
                    <td className="w-16 px-3 py-2 text-[11px] font-bold text-slate-400 border-r border-[#f0f4f9] align-top whitespace-nowrap">
                      {String(hour).padStart(2, '0')}:00
                    </td>
                    {DAYS.map(day => {
                      const cellSessions = getSessionsForCell(day.idx, hour);
                      return (
                        <td key={day.idx}
                            onClick={() => cellSessions.length === 0 && myClasses.length > 0 && openCreate(day.idx, hour)}
                            className="px-1.5 py-1.5 border-r border-[#f0f4f9] last:border-r-0 align-top group"
                            style={{ cursor: cellSessions.length === 0 && myClasses.length > 0 ? 'pointer' : 'default' }}>
                          <div className="space-y-1 min-h-[48px] relative">
                            {cellSessions.length === 0 && myClasses.length > 0 && (
                              <div className="h-full min-h-[48px] rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                   style={{ border: '1.5px dashed #cbd5e1' }}>
                                <Plus className="h-4 w-4" style={{ color: '#94a3b8' }} />
                              </div>
                            )}
                            {cellSessions.map(session => {
                              const col      = getSessionColor(session.subject_name);
                              const duration = getSessionDuration(session);
                              return (
                                <div key={session.id}
                                     onClick={(e) => { e.stopPropagation(); openEdit(session); }}
                                     className="rounded-xl p-2 border transition-all hover:shadow-md cursor-pointer"
                                     style={{ background: col.bg, borderColor: col.border, minHeight: 48 * duration }}>
                                  <p className="text-[11px] font-bold leading-tight truncate" style={{ color: col.color }}>
                                    {session.subject_name || 'Matière'}
                                  </p>
                                  {session.class_name && (
                                    <p className="text-[10px] font-medium mt-0.5 truncate" style={{ color: col.color, opacity: 0.8 }}>
                                      {session.class_name}
                                    </p>
                                  )}
                                  <p className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: col.color, opacity: 0.7 }}>
                                    <Clock className="h-2.5 w-2.5" />{formatTime(session.start_time)}–{formatTime(session.end_time)}
                                  </p>
                                  {(session.room_name || session.room) && (
                                    <p className="text-[10px] truncate flex items-center gap-1" style={{ color: col.color, opacity: 0.7 }}>
                                      <MapPin className="h-2.5 w-2.5" />{session.room_name || session.room}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal: create/edit session ─────────────────────────────── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
             title={editing ? 'Modifier le créneau' : 'Ajouter un créneau'} accentColor={COLOR} size="sm">
        <form onSubmit={handleSubmit} className="space-y-3">
          <FormField label="Classe" required>
            <FormSelect value={form.class_obj}
              onChange={e => setForm(p => ({ ...p, class_obj: e.target.value, subject: '' }))}>
              <option value="">— Sélectionner —</option>
              {myClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </FormSelect>
          </FormField>
          <FormField label="Matière" required>
            <FormSelect value={form.subject} disabled={!form.class_obj}
              onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}>
              <option value="">— Sélectionner —</option>
              {subjectsForClass.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
            </FormSelect>
          </FormField>
          <FormField label="Jour" required>
            <FormSelect value={form.day_of_week} onChange={e => setForm(p => ({ ...p, day_of_week: e.target.value }))}>
              {DAYS.map(d => <option key={d.idx} value={d.idx}>{d.label}</option>)}
            </FormSelect>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Début" required>
              <FormInput type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} />
            </FormField>
            <FormField label="Fin" required>
              <FormInput type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Salle">
            <FormSelect value={form.room} onChange={e => setForm(p => ({ ...p, room: e.target.value }))}>
              <option value="">— Aucune —</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </FormSelect>
          </FormField>

          {editing && (
            <button type="button" onClick={handleDelete} disabled={saving}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition-all hover:bg-red-50"
              style={{ color: '#ef4444' }}>
              <Trash2 className="h-3.5 w-3.5" /> Supprimer ce créneau
            </button>
          )}
          <ModalFooter onCancel={() => setModalOpen(false)} loading={saving} color={COLOR} />
        </form>
      </Modal>
    </div>
  );
}
