import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ClipboardCheck, Users, Check, X, Clock, ChevronDown,
  Save, AlertCircle, QrCode, RefreshCw, Search,
} from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { academicService, attendanceService } from '../../services';
import { useNotifications } from '../../components/Notifications';

const STATUS_OPTIONS = [
  { value: 'PRESENT',  label: 'Présent',  color: '#059669', bg: '#ecfdf5' },
  { value: 'ABSENT',   label: 'Absent',   color: '#ef4444', bg: '#fef2f2' },
  { value: 'LATE',     label: 'Retard',   color: '#d97706', bg: '#fffbeb' },
  { value: 'EXCUSED',  label: 'Excusé',   color: '#6366f1', bg: '#eef2ff' },
];

function StatusBadge({ status }) {
  const opt = STATUS_OPTIONS.find(o => o.value === status);
  if (!opt) return null;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold"
          style={{ background: opt.bg, color: opt.color }}>
      {opt.label}
    </span>
  );
}

const STATUS_NOTIFY = {
  PRESENT: { type: 'success', msg: (name) => `${name} — Présent(e) ✓` },
  ABSENT:  { type: 'error',   msg: (name) => `${name} — Absent(e)` },
  LATE:    { type: 'warning', msg: (name) => `${name} — En retard` },
  EXCUSED: { type: 'info',    msg: (name) => `${name} — Excusé(e)` },
};

export default function TeacherAttendance() {
  const { notify } = useNotifications();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [records, setRecords] = useState({});
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [attSessionId, setAttSessionId] = useState(null);

  /* ── QR modal state ── */
  const [qrModal, setQrModal]   = useState(null);  // {attSessionId, subject, time}
  const [qrBlobUrl, setQrBlobUrl] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError]   = useState(null);
  const [search, setSearch]     = useState('');

  const today = new Date().toLocaleDateString('en-CA');

  // Revoke blob URL on cleanup
  useEffect(() => () => { if (qrBlobUrl) URL.revokeObjectURL(qrBlobUrl); }, [qrBlobUrl]);

  // Pre-open attendance session as soon as teacher selects a session
  useEffect(() => {
    if (!selectedSession) { setAttSessionId(null); return; }
    attendanceService.openSession({ session_id: selectedSession, date: today })
      .then(att => setAttSessionId(att.id))
      .catch(() => setAttSessionId(null));
  }, [selectedSession]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: classesData } = useApi(() => academicService.getClasses({}), [], true);
  const { data: sessionsData } = useApi(
    () => selectedClass ? academicService.getSessions({ class_id: selectedClass }) : Promise.resolve([]),
    [selectedClass], !!selectedClass
  );
  const { data: studentsData } = useApi(
    () => selectedClass ? academicService.getClassStudents(selectedClass) : Promise.resolve([]),
    [selectedClass], !!selectedClass
  );

  const classes  = classesData?.results  || classesData  || [];
  const sessions = sessionsData?.results || sessionsData || [];
  // getClassStudents returns enrollment objects: {id: enrollment_uuid, student: student_uuid, student_name, ...}
  const students = (studentsData?.results || studentsData || []).map(s => ({
    id: s.student || s.id,
    name: s.student_name || s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Étudiant',
    matricule: s.student_matricule || s.matricule || '',
    is_up_to_date: s.is_up_to_date ?? true,
    has_payment_schedule: s.has_payment_schedule ?? false,
    echeance_override: s.echeance_override ?? false,
  }));

  const filteredStudents = search.trim()
    ? students.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.matricule.toLowerCase().includes(search.toLowerCase())
      )
    : students;

  const handleStatus = async (student, status) => {
    setRecords(prev => ({ ...prev, [student.id]: status }));
    const { type, msg } = STATUS_NOTIFY[status] || { type: 'info', msg: (n) => n };
    notify(msg(student.name), type);
    if (attSessionId) {
      try {
        await attendanceService.markRecord({ attendance_session: attSessionId, student: student.id, status });
      } catch {
        // silent — bulk save via Enregistrer will catch it
      }
    }
  };

  const markAll = async (status) => {
    const newRecs = {};
    students.forEach(s => { newRecs[s.id] = status; });
    setRecords(newRecs);
    const labels = { PRESENT: 'présents', ABSENT: 'absents', LATE: 'en retard', EXCUSED: 'excusés' };
    notify(`${students.length} étudiant(s) marqué(s) ${labels[status] || status}`, STATUS_NOTIFY[status]?.type || 'info');
    if (attSessionId) {
      try {
        await attendanceService.bulkMark({
          attendance_session: attSessionId,
          records: students.map(s => ({ student: s.id, status })),
        });
      } catch {
        // silent
      }
    }
  };

  const handleSave = async () => {
    if (!selectedClass) {
      notify('Sélectionnez une classe', 'error');
      return;
    }
    if (!selectedSession) {
      notify('Sélectionnez une session pour enregistrer les présences', 'error');
      return;
    }
    setSaving(true);
    try {
      // Re-open (or reuse) the attendance session
      const att = attSessionId
        ? { id: attSessionId }
        : await attendanceService.openSession({ session_id: selectedSession, date: today });
      const entries = students.map(s => ({
        student: s.id,
        status: records[s.id] || 'PRESENT',
      }));
      await attendanceService.bulkMark({ attendance_session: att.id, records: entries });
      const presentN = entries.filter(e => e.status === 'PRESENT').length;
      const absentN  = entries.filter(e => e.status === 'ABSENT').length;
      const lateN    = entries.filter(e => e.status === 'LATE').length;
      notify(
        `Présences enregistrées — ${presentN} présent(s), ${absentN} absent(s), ${lateN} en retard`,
        'success'
      );
      setShowConfirm(false);
    } catch (err) {
      notify(err.message || 'Erreur lors de l\'enregistrement', 'error');
    } finally {
      setSaving(false);
    }
  };

  async function fetchQRBlob(attSessionId) {
    setQrLoading(true);
    setQrError(null);
    try {
      const r = await attendanceService.getSessionQR(attSessionId);
      if (!r.ok) throw new Error('Erreur serveur');
      const blob = await r.blob();
      if (qrBlobUrl) URL.revokeObjectURL(qrBlobUrl);
      setQrBlobUrl(URL.createObjectURL(blob));
    } catch {
      setQrError('Impossible de générer le QR. Vérifiez la connexion.');
    }
    setQrLoading(false);
  }

  async function handleOpenQR() {
    if (!selectedSession) return;
    setQrLoading(true);
    setQrError(null);
    try {
      const att = await attendanceService.openSession({ session_id: selectedSession, date: today });
      const sess = sessions.find(s => String(s.id) === String(selectedSession));
      setQrModal({
        attSessionId: att.id,
        subject: att.subject_name || sess?.subject_name || 'Cours',
        time: sess ? `${sess.start_time?.slice(0, 5)} – ${sess.end_time?.slice(0, 5)}` : '',
      });
      await fetchQRBlob(att.id);
    } catch {
      setQrError('Impossible d\'ouvrir la session.');
      setQrLoading(false);
    }
  }

  const presentCount = Object.values(records).filter(v => v === 'PRESENT').length;
  const absentCount  = Object.values(records).filter(v => v === 'ABSENT').length;
  const lateCount    = Object.values(records).filter(v => v === 'LATE').length;
  const unmarked     = students.length - Object.keys(records).length;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: '#ecfdf5' }}>
            <ClipboardCheck className="h-3 w-3" style={{ color: '#059669' }} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#059669' }}>Présences</span>
        </div>
        <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a', letterSpacing: '-0.03em' }}>Marquer les présences</h1>
        <p className="text-sm mt-0.5 font-medium" style={{ color: '#94a3b8' }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Filters */}
      <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold mb-1.5" style={{ color: '#64748b' }}>Classe *</label>
          <div className="relative">
            <select
              value={selectedClass}
              onChange={e => { setSelectedClass(e.target.value); setSelectedSession(''); setRecords({}); setSearch(''); }}
              className="input-field w-full appearance-none pr-8">
              <option value="">Sélectionner une classe</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: '#94a3b8' }} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold mb-1.5" style={{ color: '#64748b' }}>Session <span style={{ color: '#ef4444' }}>*</span></label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <select
                value={selectedSession}
                onChange={e => setSelectedSession(e.target.value)}
                disabled={!selectedClass}
                className="input-field w-full appearance-none pr-8 disabled:opacity-50">
                <option value="">Toutes les sessions</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.subject_name || s.subject?.name || 'Session'} – {s.start_time?.slice(0, 5) || ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: '#94a3b8' }} />
            </div>
            <button
              onClick={handleOpenQR}
              disabled={!selectedSession || qrLoading}
              title="Générer QR de présence (valable 15 min)"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 flex-shrink-0"
              style={{ background: '#ecfdf5', color: '#059669', border: '1.5px solid #d1fae5' }}>
              {qrLoading
                ? <div className="h-4 w-4 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin" />
                : <QrCode className="h-4 w-4" />}
              <span className="hidden sm:inline">QR présence</span>
            </button>
          </div>
        </div>
      </div>

      {selectedClass && students.length > 0 && (
        <>
          {/* Stats + bulk actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              {[
                { label: 'Présents',  count: presentCount, color: '#059669', bg: '#ecfdf5' },
                { label: 'Absents',   count: absentCount,  color: '#ef4444', bg: '#fef2f2' },
                { label: 'Retards',   count: lateCount,    color: '#d97706', bg: '#fffbeb' },
                { label: 'Non saisi', count: unmarked,     color: '#94a3b8', bg: '#f1f5f9' },
              ].map(s => (
                <div key={s.label} className="text-center px-3 py-2 rounded-xl"
                     style={{ background: s.bg }}>
                  <p className="text-lg font-extrabold leading-none" style={{ color: s.color }}>{s.count}</p>
                  <p className="text-[10px] font-semibold mt-0.5" style={{ color: s.color }}>{s.label}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => markAll('PRESENT')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                style={{ background: '#ecfdf5', color: '#059669' }}>
                Tous présents
              </button>
              <button onClick={() => markAll('ABSENT')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                style={{ background: '#fef2f2', color: '#ef4444' }}>
                Tous absents
              </button>
              <button
                onClick={() => {
                  if (!selectedSession) {
                    notify('Sélectionnez une session avant d\'enregistrer', 'error');
                    return;
                  }
                  setShowConfirm(true);
                }}
                className="btn-primary px-4 py-2 text-sm flex items-center gap-2">
                <Save className="h-4 w-4" /> Enregistrer
              </button>
            </div>
          </div>

          {/* Student list */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3" style={{ borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>
                  {filteredStudents.length}{search ? ` / ${students.length}` : ''} étudiant{students.length > 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-4 text-[11px] font-bold">
                  {STATUS_OPTIONS.map(o => (
                    <span key={o.value} style={{ color: o.color }}>{o.label}</span>
                  ))}
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Rechercher par nom ou matricule…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-8 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  style={{ borderColor: '#e2e8f0', color: '#1e293b', background: '#fff' }}
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity">
                    <X className="h-3.5 w-3.5" style={{ color: '#64748b' }} />
                  </button>
                )}
              </div>
            </div>
            <div className="divide-y" style={{ borderColor: '#f1f5f9' }}>
              {filteredStudents.map((student, i) => {
                const current = records[student.id];
                return (
                  <div key={student.id}
                       className="flex items-center gap-4 px-5 py-3 transition-all hover:bg-slate-50">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                         style={{ background: `linear-gradient(135deg, #6366f1, #8b5cf6)` }}>
                      {student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold truncate" style={{ color: '#1e293b' }}>{student.name}</p>
                        {(student.has_payment_schedule || student.echeance_override) && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                style={student.echeance_override
                                  ? { background: '#dbeafe', color: '#1d4ed8' }
                                  : student.is_up_to_date
                                    ? { background: '#dcfce7', color: '#15803d' }
                                    : { background: '#fee2e2', color: '#b91c1c' }}
                                title={student.echeance_override
                                  ? 'Admission autorisée par l\'administration'
                                  : student.is_up_to_date
                                    ? 'À jour de l\'échéancier de scolarité'
                                    : 'Non à jour de l\'échéancier de scolarité'}>
                            {student.echeance_override ? 'Autorisé' : (student.is_up_to_date ? 'À jour' : 'Non à jour')}
                          </span>
                        )}
                      </div>
                      {student.matricule && (
                        <p className="text-[11px] truncate" style={{ color: '#94a3b8' }}>{student.matricule}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {STATUS_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => handleStatus(student, opt.value)}
                          className="h-8 w-8 rounded-lg flex items-center justify-center transition-all text-xs font-bold"
                          style={{
                            background: current === opt.value ? opt.bg : '#f8fafc',
                            color: current === opt.value ? opt.color : '#94a3b8',
                            border: current === opt.value ? `2px solid ${opt.color}40` : '1.5px solid #f1f5f9',
                            transform: current === opt.value ? 'scale(1.1)' : 'scale(1)',
                          }}
                          title={opt.label}
                        >
                          {opt.value === 'PRESENT' ? <Check size={13} /> :
                           opt.value === 'ABSENT'  ? <X size={13} /> :
                           opt.value === 'LATE'    ? <Clock size={13} /> :
                           <AlertCircle size={13} />}
                        </button>
                      ))}
                    </div>
                    {current && <StatusBadge status={current} />}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {selectedClass && students.length === 0 && (
        <div className="card p-10 flex flex-col items-center justify-center">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: '#f1f5f9' }}>
            <Users className="h-7 w-7 opacity-30" style={{ color: '#64748b' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: '#94a3b8' }}>Aucun étudiant dans cette classe</p>
        </div>
      )}

      {!selectedClass && (
        <div className="card p-10 flex flex-col items-center justify-center">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: '#ecfdf5' }}>
            <ClipboardCheck className="h-7 w-7 opacity-50" style={{ color: '#059669' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: '#94a3b8' }}>Sélectionnez une classe pour commencer</p>
        </div>
      )}

      {/* QR modal */}
      {qrModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}
             onClick={e => e.target === e.currentTarget && setQrModal(null)}>
          <div className="card p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-base font-extrabold" style={{ color: '#0f172a' }}>{qrModal.subject}</p>
                <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{qrModal.time}</p>
              </div>
              <button onClick={() => setQrModal(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="h-4 w-4" style={{ color: '#94a3b8' }} />
              </button>
            </div>

            {/* QR image */}
            <div className="rounded-2xl overflow-hidden flex items-center justify-center mb-4"
                 style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', minHeight: 220 }}>
              {qrLoading ? (
                <div className="h-10 w-10 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
              ) : qrError ? (
                <p className="text-xs text-center text-red-500 px-4">{qrError}</p>
              ) : qrBlobUrl ? (
                <img src={qrBlobUrl} alt="QR présence" className="w-52 h-52 object-contain" />
              ) : null}
            </div>

            <p className="text-xs text-center mb-4" style={{ color: '#94a3b8' }}>
              Projetez ce QR code sur votre écran ou tableau. Il est valable <strong>15 minutes</strong>.
              Les étudiants scannent avec leur téléphone et choisissent leur nom.
            </p>

            <div className="flex gap-3">
              <button onClick={() => fetchQRBlob(qrModal.attSessionId)} disabled={qrLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                style={{ background: '#ecfdf5', color: '#059669' }}>
                <RefreshCw className="h-3.5 w-3.5" /> Rafraîchir
              </button>
              <button onClick={() => setQrModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: '#f1f5f9', color: '#64748b' }}>
                Fermer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirm modal */}
      {showConfirm && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
             onClick={e => e.target === e.currentTarget && setShowConfirm(false)}>
          <div className="card p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: '#ecfdf5' }}>
                <ClipboardCheck className="h-5 w-5" style={{ color: '#059669' }} />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: '#0f172a' }}>Confirmer l'enregistrement</h3>
                <p className="text-xs" style={{ color: '#94a3b8' }}>
                  {students.length} étudiant{students.length > 1 ? 's' : ''} · {unmarked} non saisi{unmarked > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            {unmarked > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-xl mb-4"
                   style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: '#d97706' }} />
                <p className="text-xs font-semibold" style={{ color: '#92400e' }}>
                  {unmarked} étudiant{unmarked > 1 ? 's' : ''} sans statut — marqué{unmarked > 1 ? 's' : ''} Présent par défaut
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-slate-100"
                style={{ border: '1px solid #e2e8f0', color: '#64748b' }}>
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2">
                {saving ? <div className="h-4 w-4 rounded-full border-2 animate-spin" style={{ borderColor: '#ffffff40', borderTopColor: '#fff' }} /> : <Save className="h-4 w-4" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
