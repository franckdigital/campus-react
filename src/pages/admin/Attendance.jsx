import { useState, useRef } from 'react';
import {
  ClipboardCheck, Calendar, Users, CheckCircle, XCircle, Clock,
  X, Check, AlertTriangle, FileText, ChevronDown, ChevronUp,
  Download, BookOpen, Bell, BarChart3, Filter, Upload, UserCheck,
  QrCode, Zap,
} from 'lucide-react';
import { attendanceService, academicService, sitesService } from '../../services';
import { useApi } from '../../hooks/useApi';
import { useNotifications } from '../../components/Notifications';
import {
  PageHeader, FilterBar, FilterSelect, SearchInput, Avatar, Modal, ModalFooter, IconBtn,
  Pagination, TableContainer, Table, TableRow, ExportMenu,
} from '../../components/ui/PageHeader';
import { exportToExcel, exportToPDF, fmtPDF } from '../../utils/export';

/* ── tokens ──────────────────────────────────────────────────────── */
const C = '#059669'; const CB = '#ecfdf5'; const CI = '#d1fae5';
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const today = () => new Date().toISOString().split('T')[0];
const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

/* ── Status config (uppercase = backend values) ──────────────────── */
const SC = {
  PRESENT: { label: 'Présent', color: '#059669', bg: '#d1fae5', icon: CheckCircle },
  ABSENT:  { label: 'Absent',  color: '#ef4444', bg: '#fee2e2', icon: XCircle    },
  LATE:    { label: 'Retard',  color: '#d97706', bg: '#fef3c7', icon: Clock      },
  EXCUSED: { label: 'Excusé', color: '#6366f1', bg: '#e0e7ff', icon: Check      },
};

/* ── Request status badges ───────────────────────────────────────── */
const RS = {
  PENDING:  { label: 'En attente', color: '#d97706', bg: '#fef3c7' },
  APPROVED: { label: 'Approuvée',  color: '#059669', bg: '#d1fae5' },
  REJECTED: { label: 'Refusée',    color: '#ef4444', bg: '#fee2e2' },
};

function list(d) { return Array.isArray(d) ? d : (d?.results || []); }

/* ── Tab ─────────────────────────────────────────────────────────── */
function Tab({ active, label, count, onClick }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all rounded-xl"
      style={{ background: active ? CB : 'transparent', color: active ? C : '#64748b' }}>
      {label}
      {count != null && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: active ? C : '#f1f5f9', color: active ? '#fff' : '#94a3b8' }}>
          {count}
        </span>
      )}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
export default function Attendance() {
  /* ── tabs & filters ── */
  const [tab, setTab]               = useState('marking');
  const [filterDate, setFilterDate] = useState(today());
  const [filterClass, setFilterClass] = useState('all');
  const [filterAbsStatus, setFilterAbsStatus] = useState('');
  const [statsClass, setStatsClass] = useState('');
  const [absPage, setAbsPage]       = useState(1);

  /* ── marking modal state ── */
  const [markModal, setMarkModal]     = useState(null);  // session obj
  const [attSession, setAttSession]   = useState(null);  // AttendanceSession
  const [records, setRecords]         = useState({});    // {studentId: {status}}
  const [markLoading, setMarkLoading] = useState(false);
  const [pending, setPending]         = useState({});    // {studentId: bool}

  /* ── review modal state ── */
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);

  /* ── calendar modal state ── */
  const [calendarStudent, setCalendarStudent] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [calendarRecords, setCalendarRecords] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  /* ── marking filter state ── */
  const [showUnmarkedOnly, setShowUnmarkedOnly] = useState(false);

  /* ── new absence request modal ── */
  const [newReqModal, setNewReqModal] = useState(false);
  const [newReqForm, setNewReqForm] = useState({ student: '', start_date: '', end_date: '', reason: '', attachment: null });
  const [newReqSaving, setNewReqSaving] = useState(false);
  const fileRef = useRef(null);

  /* ── QR tab state ── */
  const [autoMarking, setAutoMarking] = useState(false);

  const { notify } = useNotifications();

  /* ── data ── */
  const dayOfWeek = filterDate
    ? (new Date(filterDate + 'T12:00:00').getDay() + 6) % 7
    : undefined;

  const { data: sessRaw, loading: sessLoading } = useApi(
    () => academicService.getSessions({
      is_active: true,
      ...(filterClass !== 'all' ? { class_obj: filterClass } : {}),
      ...(filterDate ? { day_of_week: dayOfWeek } : {}),
    }),
    [filterDate, filterClass], true
  );

  const { data: classRaw }        = useApi(() => academicService.getClasses({ page_size: 500 }), [], true);
  const { data: enrollRaw }       = useApi(
    () => academicService.getEnrollments({ is_active: true, status: 'ENROLLED', page_size: 1000 }),
    [], true
  );
  const { data: absRaw, loading: absLoading, execute: reloadAbs } = useApi(
    () => attendanceService.getAbsenceRequests({
      is_active: true,
      ...(filterAbsStatus ? { status: filterAbsStatus } : {}),
    }),
    [filterAbsStatus], true
  );
  const { data: statsRaw, loading: statsLoading } = useApi(
    () => attendanceService.getStudentStats(statsClass ? { class_obj: statsClass } : {}),
    [statsClass], true
  );

  /* attendance sessions for today — used to detect unmarked sessions */
  const { data: attSessionsRaw } = useApi(
    () => filterDate ? attendanceService.getSessions({ date: filterDate, page_size: 100 }) : Promise.resolve([]),
    [filterDate], true
  );

  const sessions    = list(sessRaw);
  const classes     = list(classRaw);
  const enrollments = list(enrollRaw);
  const absRequests = list(absRaw);
  const stats       = list(statsRaw);
  const attSessions = list(attSessionsRaw);

  /* set of academic session IDs that already have an AttendanceSession today */
  const markedSessionIds = new Set(attSessions.map(a => String(a.session)));
  const filteredSessions = showUnmarkedOnly
    ? sessions.filter(s => !markedSessionIds.has(String(s.id)))
    : sessions;
  const unmarkedCount = sessions.filter(s => !markedSessionIds.has(String(s.id))).length;

  const enrollByClass = enrollments.reduce((acc, e) => {
    const k = String(e.class_obj);
    if (!acc[k]) acc[k] = [];
    acc[k].push(e);
    return acc;
  }, {});

  /* ── KPIs ── */
  const pendingCount = absRequests.filter(r => r.status === 'PENDING').length;
  const alertCount   = stats.filter(s => s.alert).length;
  const avgAbsenceRate  = stats.length > 0
    ? stats.reduce((sum, s) => sum + s.absence_rate, 0) / stats.length
    : null;
  const avgPresenceRate = avgAbsenceRate !== null
    ? (100 - avgAbsenceRate).toFixed(1)
    : '—';

  /* ── Marking handlers ── */
  async function openMarkModal(session) {
    setMarkModal(session);
    setAttSession(null);
    setRecords({});
    setMarkLoading(true);
    try {
      const date = filterDate || today();
      const att = await attendanceService.openSession({ session_id: session.id, date });
      setAttSession(att);
      const recs = await attendanceService.getSessionRecords(att.id);
      const recList = Array.isArray(recs) ? recs : (recs?.results || []);
      const map = {};
      recList.forEach(r => { map[r.student] = { status: r.status, id: r.id }; });
      /* 6 — pré-remplir PRESENT pour les étudiants sans enregistrement */
      const classStudents = enrollByClass[String(session.class_obj)] || [];
      classStudents.forEach(e => {
        if (!map[e.student]) map[e.student] = { status: 'PRESENT' };
      });
      setRecords(map);
    } catch (e) { console.error('openMarkModal', e); }
    setMarkLoading(false);
  }

  async function markStudent(studentId, newStatus) {
    if (!attSession || pending[studentId]) return;
    const prev = records[studentId]?.status;
    setRecords(p => ({ ...p, [studentId]: { ...p[studentId], status: newStatus } }));
    setPending(p => ({ ...p, [studentId]: true }));
    try {
      const result = await attendanceService.markRecord({
        attendance_session: attSession.id,
        student: studentId,
        status: newStatus,
      });
      setRecords(p => ({ ...p, [studentId]: { status: result.status, id: result.id } }));
    } catch {
      setRecords(p => ({ ...p, [studentId]: { ...p[studentId], status: prev } }));
    }
    setPending(p => { const n = { ...p }; delete n[studentId]; return n; });
    /* 3 — alerte si étudiant franchit un seuil d'absences */
    if (newStatus === 'ABSENT') {
      const stuStats = stats.find(s => String(s.student_id) === String(studentId));
      if (stuStats) {
        const totalAbsent = stuStats.absent + 1;
        if (totalAbsent >= 3 || stuStats.absence_rate >= 15) {
          notify({
            type: 'error',
            title: 'Seuil d\'absence atteint',
            message: `${stuStats.student_name} : ${totalAbsent} absence(s) · taux ${stuStats.absence_rate}%`,
            time: 'À l\'instant',
          });
        }
      }
    }
  }

  async function bulkMarkAll(newStatus) {
    if (!attSession || !markModal) return;
    const students = enrollByClass[String(markModal.class_obj)] || [];
    const ids = students.map(e => e.student);
    const updates = {};
    ids.forEach(sid => { updates[sid] = { ...records[sid], status: newStatus }; });
    setRecords(p => ({ ...p, ...updates }));
    try {
      await attendanceService.bulkMark({
        attendance_session: attSession.id,
        status: newStatus,
        student_ids: ids,
      });
    } catch { alert('Erreur lors du marquage groupé'); }
  }

  /* ── Review handlers ── */
  async function submitReview(action) {
    if (!reviewModal) return;
    setReviewSaving(true);
    try {
      if (action === 'approve') {
        await attendanceService.approveAbsenceRequest(reviewModal.id, reviewNotes);
      } else {
        await attendanceService.rejectAbsenceRequest(reviewModal.id, reviewNotes);
      }
      setReviewModal(null);
      setReviewNotes('');
      reloadAbs();
    } catch { alert('Erreur lors de la validation'); }
    setReviewSaving(false);
  }

  /* ── 4 — Calendrier d'assiduité par étudiant ── */
  async function openCalendar(student) {
    setCalendarStudent(student);
    setCalendarRecords([]);
    setCalendarLoading(true);
    try {
      const recs = await attendanceService.getRecords({ student: student.student_id, page_size: 500 });
      setCalendarRecords(list(recs));
    } catch {}
    setCalendarLoading(false);
  }

  /* ── 1 — Export statistiques ── */
  const handleExportStatsExcel = () => {
    const rows = stats.map(s => ({
      'Étudiant': s.student_name,
      'Matricule': s.student_matricule,
      'Classe': s.class_name,
      'Total séances': s.total,
      'Présent': s.present,
      'Absent': s.absent,
      'Retard': s.late,
      'Excusé': s.excused,
      "Taux d'absence (%)": s.absence_rate,
      'Alerte': s.alert ? 'Oui' : 'Non',
    }));
    exportToExcel(rows,
      ['Étudiant','Matricule','Classe','Total séances','Présent','Absent','Retard','Excusé',"Taux d'absence (%)","Alerte"],
      `presences-${new Date().toISOString().slice(0, 10)}`, 'Statistiques');
  };

  const handleExportStatsPDF = () => {
    const cols = ['Étudiant', 'Classe', 'Présent', 'Absent', 'Retard', 'Excusé', 'Taux abs.', 'Alerte'];
    const rows = stats.map(s => [
      `${s.student_name} (${s.student_matricule})`,
      s.class_name,
      String(s.present), String(s.absent), String(s.late), String(s.excused),
      `${s.absence_rate}%`,
      s.alert ? 'OUI' : '',
    ]);
    exportToPDF('Rapport d\'assiduite', cols, rows, `presences-${new Date().toISOString().slice(0, 10)}`, {
      'Etudiants': stats.length,
      'Alertes (> 20%)': stats.filter(s => s.alert).length,
      'Export du': new Date().toLocaleDateString('fr-FR'),
    });
  };

  /* ── 5 — Nouvelle demande d'absence (admin side) ── */
  async function handleCreateRequest(e) {
    e.preventDefault();
    if (!newReqForm.student || !newReqForm.start_date || !newReqForm.end_date || !newReqForm.reason) {
      notify({ type: 'error', title: 'Champs requis', message: 'Étudiant, dates et motif sont obligatoires.', time: 'À l\'instant' });
      return;
    }
    setNewReqSaving(true);
    try {
      await attendanceService.createAbsenceRequest(newReqForm);
      notify({ type: 'success', title: 'Demande créée', message: 'La demande d\'absence a été enregistrée.', time: 'À l\'instant' });
      setNewReqModal(false);
      setNewReqForm({ student: '', start_date: '', end_date: '', reason: '', attachment: null });
      reloadAbs();
    } catch {
      notify({ type: 'error', title: 'Erreur', message: 'Impossible de créer la demande.', time: 'À l\'instant' });
    }
    setNewReqSaving(false);
  }

  /* ── Auto-mark-absent trigger ── */
  async function handleAutoMarkAbsent(slot = 'ALL') {
    setAutoMarking(true);
    try {
      const res = await attendanceService.autoMarkAbsent({ slot });
      notify({
        type: 'success',
        title: 'Absences marquées',
        message: `${res.students_marked_absent} étudiant(s) marqués absents sur ${res.sessions_processed} séances (${slot})`,
        time: 'À l\'instant',
      });
    } catch {
      notify({ type: 'error', title: 'Erreur', message: 'Impossible de déclencher le marquage automatique.', time: 'À l\'instant' });
    }
    setAutoMarking(false);
  }

  /* ── Absence stats (per-session summary, shown per tab in marking) ── */
  const markStudents = markModal ? (enrollByClass[String(markModal.class_obj)] || []) : [];
  const markPresent  = markStudents.filter(e => records[e.student]?.status === 'PRESENT').length;
  const markAbsent   = markStudents.filter(e => records[e.student]?.status === 'ABSENT').length;

  const ABS_PP = 8;
  const absTotalPages = Math.ceil(absRequests.length / ABS_PP);
  const paginatedAbs  = absRequests.slice((absPage - 1) * ABS_PP, absPage * ABS_PP);

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={ClipboardCheck} iconColor={C} iconBg={CI}
        title="Présences & Absences"
        subtitle="Marquage, déclarations d'absences et statistiques d'assiduité"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { icon: CheckCircle,   label: 'Taux de présence', value: avgPresenceRate !== '—' ? `${avgPresenceRate}%` : '—', color: C, bg: CB },
          { icon: Bell,          label: 'En attente',       value: pendingCount, color: '#d97706', bg: '#fef3c7' },
          { icon: AlertTriangle, label: 'Alertes > 20%',   value: alertCount,   color: '#ef4444', bg: '#fee2e2' },
          { icon: Users,         label: 'Étudiants suivis', value: stats.length, color: '#6366f1', bg: '#e0e7ff' },
        ].map((k, i) => (
          <div key={i} className="card p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: k.bg }}>
              <k.icon className="h-5 w-5" style={{ color: k.color }} />
            </div>
            <div>
              <p className="text-xl font-extrabold leading-tight" style={{ color: '#0f172a' }}>{k.value}</p>
              <p className="text-xs" style={{ color: '#94a3b8' }}>{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-2xl mb-6 w-fit"
           style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <Tab active={tab === 'marking'}  label="Marquage de présence" count={sessions.length}
             onClick={() => setTab('marking')} />
        <Tab active={tab === 'requests'} label="Demandes d'absence" count={pendingCount || null}
             onClick={() => setTab('requests')} />
        <Tab active={tab === 'stats'}    label="Statistiques" count={alertCount || null}
             onClick={() => setTab('stats')} />
        <Tab active={tab === 'qr'}       label="Codes QR"
             onClick={() => setTab('qr')} />
        <Tab active={tab === 'liste'}    label="Liste de présence"
             onClick={() => setTab('liste')} />
      </div>

      {/* ══ TAB: Marquage (D1) ═══════════════════════════════════════ */}
      {tab === 'marking' && (
        <>
          <FilterBar>
            <div className="relative flex-shrink-0">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#94a3b8' }} />
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                     className="input-field" style={{ paddingLeft: '2.25rem', width: 180 }} />
            </div>
            <FilterSelect value={filterClass} onChange={e => setFilterClass(e.target.value)}>
              <option value="all">Toutes les classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </FilterSelect>
          </FilterBar>

          {/* 7 — Filtre cours non marqués */}
          {sessions.length > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setShowUnmarkedOnly(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: showUnmarkedOnly ? '#fee2e2' : '#f1f5f9',
                  color: showUnmarkedOnly ? '#ef4444' : '#64748b',
                  border: `1.5px solid ${showUnmarkedOnly ? '#fecaca' : '#e2e8f0'}`,
                }}>
                <Filter className="h-3.5 w-3.5" />
                Non marqués seulement
                {unmarkedCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: '#ef4444', color: '#fff' }}>{unmarkedCount}</span>
                )}
              </button>
              <span className="text-xs" style={{ color: '#94a3b8' }}>
                {unmarkedCount} non marqué{unmarkedCount !== 1 ? 's' : ''} sur {sessions.length} cours
              </span>
            </div>
          )}

          {sessLoading ? (
            <div className="card flex items-center justify-center py-20">
              <div className="h-8 w-8 rounded-full border-[3px] border-emerald-200 border-t-emerald-600 animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-20 gap-3">
              <Calendar className="h-12 w-12 opacity-20" style={{ color: '#64748b' }} />
              <p className="text-sm font-semibold" style={{ color: '#94a3b8' }}>
                {filterDate ? `Aucune séance ce ${DAYS[dayOfWeek] || 'jour'}` : 'Aucune séance dans le planning'}
              </p>
              <p className="text-xs" style={{ color: '#cbd5e1' }}>
                Créez des séances dans la page Emploi du temps
              </p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-16 gap-3">
              <CheckCircle className="h-12 w-12 opacity-30" style={{ color: C }} />
              <p className="text-sm font-semibold" style={{ color: '#94a3b8' }}>Tous les cours ont été marqués</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSessions.map(session => {
                const studs = enrollByClass[String(session.class_obj)] || [];
                const isMarked = markedSessionIds.has(String(session.id));
                return (
                  <div key={session.id} className="card overflow-hidden">
                    {/* Session header */}
                    <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3"
                         style={{ background: CB, borderBottom: `1px solid ${CI}` }}>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <BookOpen className="h-4 w-4" style={{ color: C }} />
                          <h3 className="text-sm font-extrabold" style={{ color: '#065f46' }}>
                            {session.subject_name || 'Cours'}
                          </h3>
                        </div>
                        <p className="text-xs" style={{ color: '#059669' }}>
                          {session.class_name} · {DAYS[session.day_of_week] || '—'}
                          · {session.start_time?.slice(0, 5)} – {session.end_time?.slice(0, 5)}
                          {session.teacher_name && ` · ${session.teacher_name}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* 2 — badge marqué / non marqué */}
                        {isMarked ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                            style={{ background: '#d1fae5', color: '#059669' }}>
                            <Check className="h-3 w-3" /> Marqué
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse"
                            style={{ background: '#fee2e2', color: '#ef4444' }}>
                            <AlertTriangle className="h-3 w-3" /> Non marqué
                          </span>
                        )}
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                              style={{ background: CI, color: '#065f46' }}>
                          {studs.length} étudiant{studs.length !== 1 ? 's' : ''}
                        </span>
                        <button onClick={() => openMarkModal(session)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                          style={{ background: C }}>
                          <ClipboardCheck className="h-3.5 w-3.5" />
                          Marquer les présences
                        </button>
                      </div>
                    </div>

                    {/* Quick preview: last few students */}
                    {studs.length > 0 && (
                      <div className="px-5 py-3 flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {studs.slice(0, 5).map((e, i) => (
                            <div key={i} className="h-7 w-7 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white"
                                 style={{ background: `hsl(${(i * 60) % 360}, 65%, 50%)` }}>
                              {(e.student_name || '?').slice(0, 2).toUpperCase()}
                            </div>
                          ))}
                          {studs.length > 5 && (
                            <div className="h-7 w-7 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold"
                                 style={{ background: '#f1f5f9', color: '#64748b' }}>
                              +{studs.length - 5}
                            </div>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: '#94a3b8' }}>
                          Cliquez "Marquer les présences" pour ouvrir la feuille de présence
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══ TAB: Demandes (D3 + D4) ══════════════════════════════════ */}
      {tab === 'requests' && (
        <>
          <FilterBar>
            <FilterSelect value={filterAbsStatus} onChange={e => { setFilterAbsStatus(e.target.value); setAbsPage(1); }}>
              <option value="">Toutes les demandes</option>
              <option value="PENDING">En attente</option>
              <option value="APPROVED">Approuvées</option>
              <option value="REJECTED">Refusées</option>
            </FilterSelect>
            <div className="ml-auto">
              <button onClick={() => setNewReqModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-white transition-colors"
                style={{ background: C }}>
                <Upload className="h-3.5 w-3.5" />
                Nouvelle demande
              </button>
            </div>
          </FilterBar>

          {/* Status mini-stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            {Object.entries(RS).map(([k, v]) => {
              const n = absRequests.filter(r => r.status === k).length;
              return (
                <div key={k} className="card p-3 text-center cursor-pointer transition-all"
                     style={{ border: filterAbsStatus === k ? `2px solid ${v.color}` : '1.5px solid transparent' }}
                     onClick={() => setFilterAbsStatus(filterAbsStatus === k ? '' : k)}>
                  <p className="text-xl font-extrabold" style={{ color: v.color }}>{n}</p>
                  <p className="text-[11px] font-semibold" style={{ color: '#94a3b8' }}>{v.label}</p>
                </div>
              );
            })}
          </div>

          {absLoading ? (
            <div className="card flex items-center justify-center py-12">
              <div className="h-8 w-8 rounded-full border-[3px] border-emerald-200 border-t-emerald-600 animate-spin" />
            </div>
          ) : absRequests.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-20 gap-3">
              <FileText className="h-12 w-12 opacity-20" style={{ color: '#64748b' }} />
              <p className="text-sm font-semibold" style={{ color: '#94a3b8' }}>Aucune demande d'absence</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {paginatedAbs.map(req => {
                  const rs = RS[req.status] || RS.PENDING;
                  return (
                    <div key={req.id} className="card p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={req.student_name || '?'} color="#0891b2" size="md" />
                          <div>
                            <p className="text-sm font-extrabold" style={{ color: '#0f172a' }}>{req.student_name}</p>
                            <p className="text-xs" style={{ color: '#94a3b8' }}>
                              {req.student_matricule}
                              {req.student_class && ` · ${req.student_class}`}
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                              style={{ background: rs.bg, color: rs.color }}>{rs.label}</span>
                      </div>

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-2.5 rounded-xl" style={{ background: '#f8fafc' }}>
                          <p className="font-semibold mb-0.5" style={{ color: '#94a3b8' }}>Période</p>
                          <p style={{ color: '#1e293b' }}>{fmtDate(req.start_date)} → {fmtDate(req.end_date)}</p>
                        </div>
                        <div className="p-2.5 rounded-xl sm:col-span-2" style={{ background: '#f8fafc' }}>
                          <p className="font-semibold mb-0.5" style={{ color: '#94a3b8' }}>Motif</p>
                          <p style={{ color: '#1e293b' }} className="line-clamp-2">{req.reason}</p>
                        </div>
                      </div>

                      {req.status === 'REJECTED' && req.review_notes && (
                        <div className="mt-2 p-2.5 rounded-xl text-xs" style={{ background: '#fff1f2', border: '1px solid #fecdd3' }}>
                          <span className="font-semibold" style={{ color: '#ef4444' }}>Motif du refus : </span>
                          <span style={{ color: '#1e293b' }}>{req.review_notes}</span>
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 text-xs" style={{ color: '#94a3b8' }}>
                          <span>Soumis le {fmtDate(req.submitted_at)}</span>
                          {req.attachment_url && (
                            <a href={req.attachment_url} target="_blank" rel="noopener noreferrer"
                               className="flex items-center gap-1 font-semibold hover:underline"
                               style={{ color: C }}>
                              <FileText className="h-3 w-3" /> Justificatif
                            </a>
                          )}
                        </div>
                        {req.status === 'PENDING' && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => { setReviewModal(req); setReviewNotes(''); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                              style={{ background: '#ef4444' }}>
                              <X className="h-3.5 w-3.5" /> Refuser
                            </button>
                            <button onClick={() => { setReviewModal({ ...req, _action: 'approve' }); setReviewNotes(''); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                              style={{ background: C }}>
                              <Check className="h-3.5 w-3.5" /> Approuver
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4">
                <Pagination currentPage={absPage} totalPages={absTotalPages}
                  onPageChange={setAbsPage} accentColor={C}
                  totalItems={absRequests.length} itemsPerPage={ABS_PP} />
              </div>
            </>
          )}
        </>
      )}

      {/* ══ TAB: Statistiques (D5) ════════════════════════════════════ */}
      {tab === 'stats' && (
        <>
          <FilterBar>
            <FilterSelect value={statsClass} onChange={e => setStatsClass(e.target.value)}>
              <option value="">Toutes les classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </FilterSelect>
            <div className="ml-auto">
              <ExportMenu color={C} onExcel={handleExportStatsExcel} onPDF={handleExportStatsPDF} disabled={stats.length === 0} />
            </div>
          </FilterBar>

          {alertCount > 0 && (
            <div className="flex items-center gap-3 p-4 rounded-2xl mb-5"
                 style={{ background: '#fef2f2', border: '1px solid #fecdd3' }}>
              <AlertTriangle className="h-5 w-5 flex-shrink-0" style={{ color: '#ef4444' }} />
              <div>
                <p className="text-sm font-extrabold" style={{ color: '#ef4444' }}>
                  {alertCount} étudiant{alertCount > 1 ? 's' : ''} dépasse{alertCount > 1 ? 'nt' : ''} le seuil de 20% d'absences
                </p>
                <p className="text-xs" style={{ color: '#f87171' }}>
                  Une convocation ou contact parental est recommandé.
                </p>
              </div>
            </div>
          )}

          <TableContainer loading={statsLoading} empty={stats.length === 0}
            emptyIcon={BarChart3} emptyText="Aucune donnée d'assiduité disponible">
            <Table headers={['Étudiant', 'Classe', 'Séances', 'Présent', 'Absent', 'Retard', 'Excusé', 'Taux abs.', '']}>
              {stats.map(s => {
                const pct = Math.min(100, s.absence_rate);
                const barColor = s.alert ? '#ef4444' : pct > 10 ? '#f59e0b' : C;
                return (
                  <TableRow key={s.student_id}
                    onClick={() => openCalendar(s)}
                    style={{ cursor: 'pointer' }}
                    title="Cliquer pour voir le calendrier d'assiduité">
                    <td>
                      <div className="flex items-center gap-2">
                        <Avatar name={s.student_name} color="#0891b2" size="sm" />
                        <div>
                          <p className="text-xs font-semibold" style={{ color: '#0f172a' }}>{s.student_name}</p>
                          <p className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>{s.student_matricule}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="text-xs" style={{ color: '#64748b' }}>{s.class_name}</span></td>
                    <td><span className="text-sm font-bold" style={{ color: '#1e293b' }}>{s.total}</span></td>
                    <td><span className="text-sm font-bold" style={{ color: '#059669' }}>{s.present}</span></td>
                    <td><span className="text-sm font-bold" style={{ color: '#ef4444' }}>{s.absent}</span></td>
                    <td><span className="text-sm font-bold" style={{ color: '#d97706' }}>{s.late}</span></td>
                    <td><span className="text-sm font-bold" style={{ color: '#6366f1' }}>{s.excused}</span></td>
                    <td style={{ minWidth: 120 }}>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="h-2 rounded-full overflow-hidden flex-1 mr-2" style={{ background: '#f1f5f9' }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                          </div>
                          <span className="text-xs font-extrabold" style={{ color: barColor }}>
                            {s.absence_rate}%
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {s.alert && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: '#fee2e2', color: '#ef4444' }}>
                          Alerte
                        </span>
                      )}
                    </td>
                  </TableRow>
                );
              })}
            </Table>
          </TableContainer>
        </>
      )}

      {/* ══ TAB: Codes QR ════════════════════════════════════════════ */}
      {tab === 'qr' && (
        <>
          {/* Auto-mark-absent controls */}
          <div className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-2xl"
               style={{ background: '#fff', border: '1.5px solid #e2e8f0' }}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold" style={{ color: '#0f172a' }}>Marquage automatique des absences</p>
              <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                Déclenche le marquage AUTO pour tous les étudiants non pointés du jour.
                À appeler à 18h30 (cours) et 22h00 (soirées).
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {[
                { slot: 'DAY',     label: 'Cours (07h30–18h30)' },
                { slot: 'EVENING', label: 'Soirées (18h30–22h00)' },
                { slot: 'ALL',     label: 'Tout le jour' },
              ].map(({ slot: s, label }) => (
                <button key={s} disabled={autoMarking}
                  onClick={() => handleAutoMarkAbsent(s)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-60"
                  style={{ background: '#f1f5f9', color: '#334155' }}>
                  {autoMarking
                    ? <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
                    : <Zap className="h-3.5 w-3.5" />}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* QR grid */}
          {classes.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-20 gap-3">
              <QrCode className="h-12 w-12 opacity-20" style={{ color: '#64748b' }} />
              <p className="text-sm font-semibold" style={{ color: '#94a3b8' }}>Aucune classe trouvée</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {classes.map(cls => {
                const qrUrl = attendanceService.getClassQRUrl(cls.id);
                const scanUrl = `${window.location.origin}/scan/${cls.id}`;
                return (
                  <div key={cls.id} className="card p-5 flex flex-col items-center gap-4">
                    <div className="flex flex-col items-center gap-1 text-center">
                      <p className="text-sm font-extrabold" style={{ color: '#0f172a' }}>{cls.name}</p>
                      {cls.code && <p className="text-xs font-mono" style={{ color: '#94a3b8' }}>{cls.code}</p>}
                    </div>

                    {/* QR image from backend */}
                    <div className="p-3 rounded-2xl" style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }}>
                      <img
                        src={qrUrl}
                        alt={`QR code ${cls.name}`}
                        className="w-36 h-36 object-contain"
                      />
                    </div>

                    <p className="text-[10px] text-center break-all" style={{ color: '#94a3b8' }}>
                      {scanUrl}
                    </p>

                    <div className="flex items-center gap-2 w-full">
                      <a href={qrUrl} download={`qr-${cls.name}.png`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white transition-all"
                        style={{ background: '#059669' }}>
                        <Download className="h-3.5 w-3.5" /> Télécharger
                      </a>
                      <a href={scanUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                        style={{ background: '#f1f5f9', color: '#334155' }}>
                        <QrCode className="h-3.5 w-3.5" /> Tester
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══ TAB: Liste de présence ═══════════════════════════════════ */}
      {tab === 'liste' && <AttendanceListTab />}

      {/* ══ Modal: Feuille de présence (D1) ══════════════════════════ */}
      <Modal open={!!markModal} onClose={() => setMarkModal(null)}
             title={markModal ? `${markModal.subject_name} — ${markModal.class_name}` : ''}
             accentColor={C} size="lg">
        {markModal && (
          <div className="space-y-4">
            {/* Session info */}
            <div className="flex items-center justify-between p-3 rounded-xl"
                 style={{ background: CB }}>
              <div className="text-xs" style={{ color: '#065f46' }}>
                <span className="font-bold">{DAYS[markModal.day_of_week]}</span>
                {' '}·{' '}{markModal.start_time?.slice(0, 5)} – {markModal.end_time?.slice(0, 5)}
                {markModal.teacher_name && ` · ${markModal.teacher_name}`}
              </div>
              <div className="flex items-center gap-2 text-xs font-bold">
                <span style={{ color: '#059669' }}>✓ {markPresent} présents</span>
                <span style={{ color: '#ef4444' }}>✗ {markAbsent} absents</span>
              </div>
            </div>

            {/* Bulk actions */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold" style={{ color: '#64748b' }}>Tous :</span>
              {Object.entries(SC).map(([k, v]) => (
                <button key={k} onClick={() => bulkMarkAll(k)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
                  style={{ background: v.bg, color: v.color }}>
                  <v.icon className="h-3 w-3" /> {v.label}
                </button>
              ))}
            </div>

            {/* Students list */}
            {markLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-8 w-8 rounded-full border-[3px] border-emerald-200 border-t-emerald-600 animate-spin" />
              </div>
            ) : markStudents.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2" style={{ background: '#f8fafc', borderRadius: 12 }}>
                <Users className="h-8 w-8 opacity-20" style={{ color: '#64748b' }} />
                <p className="text-xs" style={{ color: '#94a3b8' }}>Aucun étudiant inscrit dans cette classe</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {markStudents.map((enrollment) => {
                  const status = records[enrollment.student]?.status || 'PRESENT';
                  const sc = SC[status] || SC.ABSENT;
                  const isPending = !!pending[enrollment.student];
                  const initials = (enrollment.student_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <div key={enrollment.id}
                         className="flex items-center gap-3 p-3 rounded-xl"
                         style={{ background: '#f8fafc', border: `1.5px solid ${sc.bg}` }}>
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                           style={{ background: `linear-gradient(135deg, ${C}, ${C}99)` }}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold truncate" style={{ color: '#0f172a' }}>
                            {enrollment.student_name}
                          </p>
                          {(enrollment.has_payment_schedule || enrollment.echeance_override) && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                  style={enrollment.echeance_override
                                    ? { background: '#dbeafe', color: '#1d4ed8' }
                                    : enrollment.is_up_to_date
                                      ? { background: '#dcfce7', color: '#15803d' }
                                      : { background: '#fee2e2', color: '#b91c1c' }}
                                  title={enrollment.echeance_override
                                    ? 'Admission autorisée par l\'administration'
                                    : enrollment.is_up_to_date
                                      ? 'À jour de l\'échéancier de scolarité'
                                      : 'Non à jour de l\'échéancier de scolarité'}>
                              {enrollment.echeance_override ? 'Autorisé' : (enrollment.is_up_to_date ? 'À jour' : 'Non à jour')}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>
                          {enrollment.student_matricule}
                        </p>
                      </div>
                      {/* Current status badge */}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                      {/* Mark buttons */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {Object.entries(SC).map(([k, v]) => (
                          <button key={k} title={v.label}
                                  disabled={isPending}
                                  onClick={() => markStudent(enrollment.student, k)}
                                  className="h-7 w-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-50"
                                  style={{
                                    background: status === k ? v.bg : 'transparent',
                                    color: status === k ? v.color : '#cbd5e1',
                                    outline: status === k ? `2px solid ${v.color}40` : 'none',
                                  }}>
                            {isPending && status === k
                              ? <div className="h-3 w-3 rounded-full border border-current border-t-transparent animate-spin" />
                              : <v.icon className="h-3.5 w-3.5" />
                            }
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
              <button onClick={() => setMarkModal(null)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: C }}>
                Fermer
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ══ Modal: Calendrier d'assiduité (4) ══════════════════════════ */}
      <Modal open={!!calendarStudent} onClose={() => setCalendarStudent(null)}
        title={calendarStudent ? `Assiduité — ${calendarStudent.student_name}` : ''}
        accentColor={C} size="lg">
        {calendarStudent && (() => {
          const [y, m] = calendarMonth.split('-').map(Number);
          const monthRecords = calendarRecords.filter(r => r.date?.startsWith(calendarMonth));
          const byDate = {};
          monthRecords.forEach(r => {
            if (!byDate[r.date]) byDate[r.date] = [];
            byDate[r.date].push(r);
          });
          const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7;
          const daysInMonth = new Date(y, m, 0).getDate();
          const dayStatus = (dateStr) => {
            const recs = byDate[dateStr] || [];
            if (!recs.length) return null;
            if (recs.some(r => r.status === 'ABSENT')) return 'ABSENT';
            if (recs.some(r => r.status === 'LATE')) return 'LATE';
            if (recs.some(r => r.status === 'EXCUSED')) return 'EXCUSED';
            return 'PRESENT';
          };
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <p className="text-xs text-slate-400">{calendarStudent.student_matricule} · {calendarStudent.class_name}</p>
                <div className="ml-auto">
                  <input type="month" value={calendarMonth}
                    onChange={e => { setCalendarMonth(e.target.value); openCalendar(calendarStudent); }}
                    className="input-field" style={{ width: 160, fontSize: 12 }} />
                </div>
              </div>
              {calendarLoading ? (
                <div className="flex justify-center py-10">
                  <div className="h-8 w-8 rounded-full border-[3px] border-emerald-200 border-t-emerald-600 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-7 gap-1">
                    {['Lu','Ma','Me','Je','Ve','Sa','Di'].map(d => (
                      <div key={d} className="text-center text-[10px] font-bold py-1" style={{ color: '#94a3b8' }}>{d}</div>
                    ))}
                    {Array.from({ length: firstDow }, (_, i) => <div key={`e${i}`} />)}
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1;
                      const ds = `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                      const st = dayStatus(ds);
                      const sc = st ? SC[st] : null;
                      const isTod = ds === today();
                      return (
                        <div key={day}
                          className="aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5"
                          title={byDate[ds]?.map(r => `${r.subject_name}: ${SC[r.status]?.label}`).join('\n') || ''}
                          style={{
                            background: sc ? sc.bg : '#f8fafc',
                            border: isTod ? `2px solid ${C}` : '1.5px solid transparent',
                          }}>
                          <span className="text-xs font-bold" style={{ color: sc ? sc.color : '#94a3b8' }}>{day}</span>
                          {sc && <div className="h-1.5 w-1.5 rounded-full" style={{ background: sc.color }} />}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-4 pt-2 flex-wrap" style={{ borderTop: '1px solid #f1f5f9' }}>
                    {Object.entries(SC).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-full" style={{ background: v.color }} />
                        <span className="text-[11px] text-slate-500">{v.label}</span>
                      </div>
                    ))}
                  </div>
                  {monthRecords.length > 0 && (
                    <div className="space-y-1.5 max-h-52 overflow-y-auto">
                      {[...monthRecords].sort((a, b) => (a.date || '').localeCompare(b.date || '')).map(r => {
                        const sc = SC[r.status] || SC.ABSENT;
                        return (
                          <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg"
                            style={{ background: '#f8fafc', border: `1px solid ${sc.bg}` }}>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[11px] font-mono text-slate-400 flex-shrink-0">{fmtDate(r.date)}</span>
                              <span className="text-xs font-semibold text-slate-700 truncate">{r.subject_name || '—'}</span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ color: sc.color, background: sc.bg }}>{sc.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {monthRecords.length === 0 && (
                    <p className="text-xs text-center py-4" style={{ color: '#94a3b8' }}>Aucun enregistrement ce mois</p>
                  )}
                </>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* ══ Modal: Nouvelle demande d'absence (5) ════════════════════════ */}
      <Modal open={newReqModal} onClose={() => setNewReqModal(false)}
        title="Nouvelle demande d'absence" accentColor={C} size="md">
        <form onSubmit={handleCreateRequest} className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: '#64748b' }}>
              Étudiant <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select className="input-field w-full" value={newReqForm.student}
              onChange={e => setNewReqForm(f => ({ ...f, student: e.target.value }))}>
              <option value="">— Choisir un étudiant —</option>
              {Object.values(enrollByClass).flat()
                .filter((e, i, arr) => arr.findIndex(x => x.student === e.student) === i)
                .sort((a, b) => (a.student_name || '').localeCompare(b.student_name || ''))
                .map(e => (
                  <option key={e.student} value={e.student}>
                    {e.student_name} · {e.student_matricule}
                  </option>
                ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: '#64748b' }}>
                Date début <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input type="date" className="input-field w-full"
                value={newReqForm.start_date}
                onChange={e => setNewReqForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: '#64748b' }}>
                Date fin <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input type="date" className="input-field w-full"
                value={newReqForm.end_date}
                onChange={e => setNewReqForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: '#64748b' }}>
              Motif <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea className="input-field w-full resize-none" rows={3}
              placeholder="Décrivez le motif de l'absence..."
              value={newReqForm.reason}
              onChange={e => setNewReqForm(f => ({ ...f, reason: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: '#64748b' }}>
              Justificatif (optionnel — PDF, image)
            </label>
            <input type="file" ref={fileRef} className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => setNewReqForm(f => ({ ...f, attachment: e.target.files[0] || null }))} />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-xs font-semibold transition-all border-2 border-dashed"
              style={{
                borderColor: newReqForm.attachment ? C : '#e2e8f0',
                color: newReqForm.attachment ? C : '#94a3b8',
                background: newReqForm.attachment ? '#ecfdf5' : '#fafbff',
              }}>
              <Upload className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 text-left truncate">
                {newReqForm.attachment ? newReqForm.attachment.name : 'Cliquer pour joindre un document'}
              </span>
              {newReqForm.attachment && (
                <span onClick={e => { e.stopPropagation(); setNewReqForm(f => ({ ...f, attachment: null })); if (fileRef.current) fileRef.current.value = ''; }}
                  className="flex-shrink-0 text-slate-400 hover:text-red-500 cursor-pointer">
                  <X className="h-4 w-4" />
                </span>
              )}
            </button>
          </div>
          <div className="flex gap-3 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
            <button type="button" onClick={() => setNewReqModal(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              style={{ border: '1.5px solid #e2e8f0' }}>
              Annuler
            </button>
            <button type="submit" disabled={newReqSaving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50"
              style={{ background: C }}>
              {newReqSaving ? 'Enregistrement...' : 'Créer la demande'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ══ Modal: Révision demande absence (D4) ══════════════════════ */}
      <Modal open={!!reviewModal} onClose={() => setReviewModal(null)}
             title="Traiter la demande d'absence" accentColor={C} size="md">
        {reviewModal && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl" style={{ background: '#f8fafc' }}>
              <p className="text-sm font-extrabold mb-1" style={{ color: '#0f172a' }}>{reviewModal.student_name}</p>
              <p className="text-xs" style={{ color: '#94a3b8' }}>
                {reviewModal.student_matricule}
                {reviewModal.student_class && ` · ${reviewModal.student_class}`}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="font-semibold" style={{ color: '#94a3b8' }}>Début : </span>
                  <span style={{ color: '#1e293b' }}>{fmtDate(reviewModal.start_date)}</span>
                </div>
                <div>
                  <span className="font-semibold" style={{ color: '#94a3b8' }}>Fin : </span>
                  <span style={{ color: '#1e293b' }}>{fmtDate(reviewModal.end_date)}</span>
                </div>
              </div>
              <div className="mt-2 text-xs">
                <span className="font-semibold" style={{ color: '#94a3b8' }}>Motif : </span>
                <span style={{ color: '#1e293b' }}>{reviewModal.reason}</span>
              </div>
              {reviewModal.attachment_url && (
                <a href={reviewModal.attachment_url} target="_blank" rel="noopener noreferrer"
                   className="mt-2 flex items-center gap-1 text-xs font-semibold hover:underline"
                   style={{ color: C }}>
                  <FileText className="h-3.5 w-3.5" /> Voir le justificatif
                </a>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: '#64748b' }}>
                Note de révision (optionnel)
              </label>
              <textarea
                value={reviewNotes} onChange={e => setReviewNotes(e.target.value)}
                rows={3} placeholder="Commentaire sur la décision…"
                className="input-field text-xs w-full resize-none" />
            </div>

            <div className="flex items-center gap-3 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
              <button onClick={() => submitReview('reject')} disabled={reviewSaving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: '#ef4444' }}>
                {reviewSaving ? <div className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : <X className="h-4 w-4" />}
                Refuser
              </button>
              <button onClick={() => submitReview('approve')} disabled={reviewSaving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: C }}>
                {reviewSaving ? <div className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : <Check className="h-4 w-4" />}
                Approuver
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Liste de présence — global, filtrable par site/filière/niveau/statut,
   recherche + pagination.
   ══════════════════════════════════════════════════════════════════ */
const PAGE_SIZE = 20;

function AttendanceListTab() {
  const [search, setSearch]         = useState('');
  const [filterSite, setFilterSite] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [filterLevel, setFilterLevel]     = useState('');
  const [filterStatus, setFilterStatus]   = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [page, setPage]         = useState(1);

  const { data: sitesRaw }    = useApi(() => sitesService.getAll({ page_size: 500 }), [], true);
  const { data: programsRaw } = useApi(() => academicService.getPrograms({ page_size: 500 }), [], true);
  const { data: levelsRaw }   = useApi(
    () => academicService.getLevels({ ...(filterProgram ? { program: filterProgram } : {}), page_size: 500 }),
    [filterProgram], true
  );

  const { data: recordsRaw, loading } = useApi(
    () => attendanceService.getRecords({
      search: search || undefined,
      site: filterSite || undefined,
      program: filterProgram || undefined,
      level: filterLevel || undefined,
      status: filterStatus || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page,
      page_size: PAGE_SIZE,
    }),
    [search, filterSite, filterProgram, filterLevel, filterStatus, dateFrom, dateTo, page],
    true
  );

  const sites    = list(sitesRaw);
  const programs = list(programsRaw);
  const levels   = list(levelsRaw);
  const records  = list(recordsRaw);
  const count    = recordsRaw?.count ?? records.length;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const resetFilters = () => {
    setSearch(''); setFilterSite(''); setFilterProgram(''); setFilterLevel('');
    setFilterStatus(''); setDateFrom(''); setDateTo(''); setPage(1);
  };

  const handleExportExcel = () => {
    const headers = ['Étudiant', 'Matricule', 'Classe', 'Niveau', 'Filière', 'Matière', 'Enseignant', 'Date', 'Heure', 'Statut'];
    const rows = records.map(r => ({
      'Étudiant': r.student_name, 'Matricule': r.student_matricule, 'Classe': r.class_name,
      'Niveau': r.level_name, 'Filière': r.program_name, 'Matière': r.subject_name,
      'Enseignant': r.teacher_name, 'Date': fmtDate(r.date), 'Heure': r.start_time,
      'Statut': SC[r.status]?.label || r.status,
    }));
    exportToExcel(rows, headers, `liste-presence-${new Date().toISOString().slice(0, 10)}`, 'Liste de présence');
  };

  return (
    <>
      <FilterBar>
        <SearchInput value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Rechercher un étudiant, une matière, un enseignant…" />
        <FilterSelect value={filterSite} onChange={e => { setFilterSite(e.target.value); setPage(1); }}>
          <option value="">Tous les sites</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </FilterSelect>
        <FilterSelect value={filterProgram} onChange={e => { setFilterProgram(e.target.value); setFilterLevel(''); setPage(1); }}>
          <option value="">Toutes les filières</option>
          {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </FilterSelect>
        <FilterSelect value={filterLevel} onChange={e => { setFilterLevel(e.target.value); setPage(1); }}>
          <option value="">Tous les niveaux</option>
          {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </FilterSelect>
        <FilterSelect value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">Tous les statuts</option>
          {Object.entries(SC).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </FilterSelect>
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                 className="input-field" style={{ width: 145 }} title="Du" />
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
                 className="input-field" style={{ width: 145 }} title="Au" />
        </div>
        <IconBtn icon={X} onClick={resetFilters} title="Réinitialiser les filtres" />
        <div className="ml-auto">
          <ExportMenu color={C} onExcel={handleExportExcel} disabled={records.length === 0} />
        </div>
      </FilterBar>

      <TableContainer loading={loading} empty={records.length === 0}
        emptyIcon={ClipboardCheck} emptyText="Aucune présence trouvée">
        <Table headers={['Étudiant', 'Matricule', 'Classe', 'Niveau', 'Filière', 'Matière', 'Enseignant', 'Date', 'Heure', 'Statut']}>
          {records.map(r => {
            const s = SC[r.status] || {};
            const Icon = s.icon;
            return (
              <TableRow key={r.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <Avatar name={r.student_name} color="#0891b2" size="sm" />
                    <span className="text-xs font-semibold" style={{ color: '#0f172a' }}>{r.student_name}</span>
                  </div>
                </td>
                <td><span className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>{r.student_matricule}</span></td>
                <td><span className="text-xs" style={{ color: '#64748b' }}>{r.class_name || '—'}</span></td>
                <td><span className="text-xs" style={{ color: '#64748b' }}>{r.level_name || '—'}</span></td>
                <td><span className="text-xs" style={{ color: '#64748b' }}>{r.program_name || '—'}</span></td>
                <td><span className="text-xs" style={{ color: '#64748b' }}>{r.subject_name || '—'}</span></td>
                <td><span className="text-xs" style={{ color: '#64748b' }}>{r.teacher_name || '—'}</span></td>
                <td><span className="text-xs" style={{ color: '#64748b' }}>{fmtDate(r.date)}</span></td>
                <td><span className="text-xs" style={{ color: '#64748b' }}>{r.start_time || '—'}</span></td>
                <td>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: s.bg, color: s.color }}>
                    {Icon && <Icon className="h-3 w-3" />}
                    {s.label || r.status}
                  </span>
                </td>
              </TableRow>
            );
          })}
        </Table>
      </TableContainer>

      {count > 0 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage}
          accentColor={C} totalItems={count} itemsPerPage={PAGE_SIZE} />
      )}
    </>
  );
}
