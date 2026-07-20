import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, DollarSign, AlertCircle, FileText,
  Star, BookMarked, MessageSquare, ChevronLeft, ChevronRight,
  Calendar, Building, CheckCircle, Clock, TrendingUp,
  BookOpen, Award, XCircle, Bell, CreditCard, UserCheck,
} from 'lucide-react';
import { studentsService } from '../../services/students';
import { financeService } from '../../services/finance';
import { attendanceService } from '../../services/attendance';
import { gradesService } from '../../services/grades';
import { academicService } from '../../services/academic';
import notificationsService from '../../services/notifications';
import { useApi } from '../../hooks/useApi';
import { getInvoiceLabel } from '../../utils/feeBreakdown';

// ── helpers ──────────────────────────────────────────────────────────────────

function Spinner({ color = '#6366f1' }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 rounded-full border-[3px] animate-spin"
           style={{ borderColor: `${color}25`, borderTopColor: color }} />
    </div>
  );
}

function EmptyState({ icon: Icon, color, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="h-14 w-14 rounded-2xl flex items-center justify-center"
           style={{ background: `${color}15` }}>
        <Icon className="h-7 w-7" style={{ color }} />
      </div>
      <p className="text-sm font-semibold" style={{ color: '#475569' }}>{title}</p>
      {subtitle && <p className="text-xs" style={{ color: '#94a3b8' }}>{subtitle}</p>}
    </div>
  );
}

function Pagination({ currentPage, totalPages, onPageChange, color = '#6366f1' }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid #f1f5f9' }}>
      <p className="text-xs" style={{ color: '#94a3b8' }}>Page {currentPage}/{totalPages}</p>
      <div className="flex gap-1.5">
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
          className="h-7 w-7 rounded-lg flex items-center justify-center disabled:opacity-40"
          style={{ border: '1.5px solid #e2e8f0' }}>
          <ChevronLeft className="h-3.5 w-3.5" style={{ color: '#64748b' }} />
        </button>
        {[...Array(Math.min(5, totalPages))].map((_, i) => (
          <button key={i} onClick={() => onPageChange(i + 1)}
            className="h-7 w-7 rounded-lg text-xs font-bold"
            style={currentPage === i + 1
              ? { background: color, color: '#fff' }
              : { border: '1.5px solid #e2e8f0', color: '#64748b' }}>
            {i + 1}
          </button>
        ))}
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}
          className="h-7 w-7 rounded-lg flex items-center justify-center disabled:opacity-40"
          style={{ border: '1.5px solid #e2e8f0' }}>
          <ChevronRight className="h-3.5 w-3.5" style={{ color: '#64748b' }} />
        </button>
      </div>
    </div>
  );
}

// ── tab components ────────────────────────────────────────────────────────────

function TabResume({ student }) {
  const balance = parseFloat(student.remaining_balance || 0);
  const paid = parseFloat(student.total_paid || 0);
  const tuition = parseFloat(student.tuition_fee || 0);
  const pct = tuition > 0 ? Math.min(100, Math.round((paid / tuition) * 100)) : 0;
  const isEnrolled = student.registration_fee_paid;

  return (
    <div className="space-y-5">
      {/* Enrollment status */}
      <div className="flex items-center gap-3 p-4 rounded-2xl"
           style={isEnrolled
             ? { background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1.5px solid #bbf7d0' }
             : { background: 'linear-gradient(135deg,#fff7ed,#fef3c7)', border: '1.5px solid #fde68a' }}>
        <div className="h-9 w-9 rounded-xl flex items-center justify-center"
             style={{ background: isEnrolled ? '#059669' : '#d97706' }}>
          {isEnrolled
            ? <CheckCircle className="h-5 w-5 text-white" />
            : <AlertCircle className="h-5 w-5 text-white" />}
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: isEnrolled ? '#065f46' : '#92400e' }}>
            {isEnrolled ? 'Inscription validée' : 'Non inscrit — frais d\'inscription en attente'}
          </p>
          <p className="text-xs" style={{ color: isEnrolled ? '#047857' : '#b45309' }}>
            {isEnrolled
              ? 'Votre enfant est inscrit et suit les cours.'
              : 'Les frais d\'inscription doivent être réglés pour valider l\'inscription.'}
          </p>
        </div>
      </div>

      {/* Échéancier de scolarité */}
      {(student.has_payment_schedule || student.echeance_override) && (
        <div className="flex items-center gap-3 p-4 rounded-2xl"
             style={student.echeance_override
               ? { background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '1.5px solid #bfdbfe' }
               : student.tuition_up_to_date
                 ? { background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1.5px solid #bbf7d0' }
                 : { background: 'linear-gradient(135deg,#fef2f2,#fee2e2)', border: '1.5px solid #fecaca' }}>
          <div className="h-9 w-9 rounded-xl flex items-center justify-center"
               style={{ background: student.echeance_override ? '#2563eb' : (student.tuition_up_to_date ? '#059669' : '#dc2626') }}>
            {student.tuition_up_to_date || student.echeance_override
              ? <CheckCircle className="h-5 w-5 text-white" />
              : <AlertCircle className="h-5 w-5 text-white" />}
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: student.echeance_override ? '#1e40af' : (student.tuition_up_to_date ? '#065f46' : '#991b1b') }}>
              {student.echeance_override ? 'Admission autorisée' : (student.tuition_up_to_date ? 'À jour de l\'échéancier' : 'Non à jour de l\'échéancier')}
            </p>
            <p className="text-xs" style={{ color: student.echeance_override ? '#1d4ed8' : (student.tuition_up_to_date ? '#047857' : '#b91c1c') }}>
              {student.echeance_override
                ? 'Une autorisation spéciale a été accordée par l\'administration.'
                : student.tuition_up_to_date
                  ? 'Les échéances de scolarité sont réglées à ce jour.'
                  : 'Une échéance de scolarité est en retard — merci de régulariser la situation.'}
            </p>
          </div>
        </div>
      )}

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Scolarité totale', value: tuition, color: '#2563eb', bg: '#dbeafe', icon: DollarSign },
          { label: 'Payé', value: paid, color: '#059669', bg: '#d1fae5', icon: CheckCircle },
          { label: 'Reste à payer', value: balance, color: balance > 0 ? '#ef4444' : '#059669', bg: balance > 0 ? '#fee2e2' : '#d1fae5', icon: TrendingUp },
          { label: '% payé', value: `${pct}%`, color: '#7c3aed', bg: '#f5f3ff', icon: Award, isText: true },
        ].map((k, i) => (
          <div key={i} className="card p-4">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center mb-2"
                 style={{ background: `linear-gradient(135deg,${k.bg},${k.color}22)` }}>
              <k.icon className="h-4 w-4" style={{ color: k.color }} />
            </div>
            <p className="text-[11px] font-semibold mb-0.5" style={{ color: '#64748b' }}>{k.label}</p>
            <p className="text-sm font-extrabold" style={{ color: k.color }}>
              {k.isText ? k.value : `${(k.value || 0).toLocaleString('fr-FR')} F`}
            </p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold" style={{ color: '#0f172a' }}>Progression des paiements</p>
          <span className="text-sm font-extrabold" style={{ color: pct === 100 ? '#059669' : '#d97706' }}>
            {pct}%
          </span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
          <div className="h-full rounded-full transition-all duration-700"
               style={{
                 width: `${pct}%`,
                 background: pct === 100 ? 'linear-gradient(90deg,#059669,#34d399)' : 'linear-gradient(90deg,#d97706,#fbbf24)'
               }} />
        </div>
        <div className="flex justify-between mt-1.5 text-xs" style={{ color: '#94a3b8' }}>
          <span>{paid.toLocaleString('fr-FR')} F payé</span>
          <span>{tuition.toLocaleString('fr-FR')} F total</span>
        </div>
      </div>

      {/* Personal info */}
      <div className="card p-5">
        <h3 className="text-sm font-extrabold mb-4" style={{ color: '#0f172a' }}>Informations académiques</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Matricule', value: student.matricule },
            { label: 'Date d\'admission', value: student.admission_date ? new Date(student.admission_date).toLocaleDateString('fr-FR') : '—' },
            { label: 'Classe', value: student.current_class || '—' },
            { label: 'Année académique', value: student.current_academic_year || '—' },
            { label: 'Statut', value: student.status === 'ACTIVE' ? 'Actif' : student.status },
            { label: 'Site', value: student.site_name || '—' },
          ].map((item, i) => (
            <div key={i} className="p-3 rounded-xl" style={{ background: '#f8fafc' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#94a3b8' }}>{item.label}</p>
              <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabPaiements({ studentId }) {
  const [page, setPage] = useState(1);
  const PER = 8;
  const { data: invoices, loading } = useApi(
    () => financeService.getInvoices({ student: studentId }), [studentId], true
  );
  const invoicesList = invoices?.results || invoices || [];
  const total = Math.ceil(invoicesList.length / PER);
  const paginated = invoicesList.slice((page - 1) * PER, page * PER);

  const STATUS = {
    PAID: { label: 'Payé', color: '#059669', bg: '#d1fae5' },
    PARTIAL: { label: 'Partiel', color: '#d97706', bg: '#fef3c7' },
    PENDING: { label: 'En attente', color: '#6366f1', bg: '#eef2ff' },
    OVERDUE: { label: 'En retard', color: '#ef4444', bg: '#fee2e2' },
  };

  if (loading) return <Spinner color="#059669" />;
  if (!invoicesList.length) return <EmptyState icon={DollarSign} color="#059669" title="Aucune facture" subtitle="Les factures apparaîtront ici" />;

  return (
    <div className="space-y-3">
      {paginated.map(inv => {
        const st = STATUS[inv.status] || STATUS.PENDING;
        const total = parseFloat(inv.total || 0);
        const paid = parseFloat(inv.amount_paid || 0);
        const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
        return (
          <div key={inv.id} className="card p-4 overflow-hidden">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-sm font-bold" style={{ color: '#0f172a' }}>
                  {inv.invoice_number || `Facture #${inv.id?.slice(0, 8)}`}
                </p>
                <p className="text-xs" style={{ color: '#94a3b8' }}>
                  {getInvoiceLabel(inv)}
                  {inv.due_date && ` · Échéance: ${new Date(inv.due_date).toLocaleDateString('fr-FR')}`}
                </p>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: st.bg, color: st.color }}>{st.label}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mb-3">
              {[
                { l: 'Total', v: `${total.toLocaleString('fr-FR')} F`, c: '#2563eb' },
                { l: 'Payé', v: `${paid.toLocaleString('fr-FR')} F`, c: '#059669' },
                { l: 'Reste', v: `${(total - paid).toLocaleString('fr-FR')} F`, c: total - paid > 0 ? '#ef4444' : '#059669' },
              ].map((x, i) => (
                <div key={i} className="rounded-lg p-2" style={{ background: '#f8fafc' }}>
                  <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#94a3b8' }}>{x.l}</p>
                  <p className="text-xs font-extrabold" style={{ color: x.c }}>{x.v}</p>
                </div>
              ))}
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
              <div className="h-full rounded-full" style={{
                width: `${pct}%`,
                background: pct === 100 ? '#059669' : 'linear-gradient(90deg,#d97706,#fbbf24)'
              }} />
            </div>
          </div>
        );
      })}
      <Pagination currentPage={page} totalPages={total} onPageChange={setPage} color="#059669" />
    </div>
  );
}

function TabAbsences({ studentId }) {
  const [page, setPage] = useState(1);
  const PER = 10;
  const { data: absences, loading } = useApi(
    () => attendanceService.getAttendances?.({ student: studentId, status: 'ABSENT' }) || Promise.resolve([]),
    [studentId], true
  );
  const list = absences?.results || absences || [];
  const total = Math.ceil(list.length / PER);
  const paginated = list.slice((page - 1) * PER, page * PER);
  const justified = list.filter(a => a.justified).length;
  const unjustified = list.length - justified;

  if (loading) return <Spinner color="#d97706" />;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: list.length, color: '#d97706', bg: '#fef3c7', icon: AlertCircle },
          { label: 'Justifiées', value: justified, color: '#059669', bg: '#d1fae5', icon: CheckCircle },
          { label: 'Non justifiées', value: unjustified, color: '#ef4444', bg: '#fee2e2', icon: XCircle },
        ].map((k, i) => (
          <div key={i} className="card p-3 text-center">
            <div className="h-8 w-8 rounded-xl flex items-center justify-center mx-auto mb-1.5"
                 style={{ background: k.bg }}>
              <k.icon className="h-4 w-4" style={{ color: k.color }} />
            </div>
            <p className="text-base font-extrabold" style={{ color: k.color }}>{k.value}</p>
            <p className="text-[10px]" style={{ color: '#94a3b8' }}>{k.label}</p>
          </div>
        ))}
      </div>

      {!list.length ? (
        <EmptyState icon={CheckCircle} color="#059669" title="Aucune absence" subtitle="Aucune absence enregistrée" />
      ) : (
        <div className="space-y-2">
          {paginated.map((abs, i) => (
            <div key={abs.id || i} className="card p-3 flex items-center gap-3 overflow-hidden">
              <div className="w-1 self-stretch rounded-full flex-shrink-0"
                   style={{ background: abs.justified ? '#059669' : '#ef4444' }} />
              <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background: abs.justified ? '#d1fae5' : '#fee2e2' }}>
                <Calendar className="h-4 w-4" style={{ color: abs.justified ? '#059669' : '#ef4444' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: '#0f172a' }}>
                  {abs.date ? new Date(abs.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : '—'}
                </p>
                <p className="text-xs" style={{ color: '#94a3b8' }}>
                  {abs.subject_name || 'Matière inconnue'}
                  {abs.reason ? ` · ${abs.reason}` : ''}
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={abs.justified
                      ? { background: '#d1fae5', color: '#065f46' }
                      : { background: '#fee2e2', color: '#991b1b' }}>
                {abs.justified ? 'Justifiée' : 'Non justifiée'}
              </span>
            </div>
          ))}
          <Pagination currentPage={page} totalPages={total} onPageChange={setPage} color="#d97706" />
        </div>
      )}
    </div>
  );
}

function TabNotes({ studentId }) {
  const [semesterFilter, setSemesterFilter] = useState('');
  const [page, setPage] = useState(1);
  const PER = 12;

  const { data: grades, loading } = useApi(
    () => gradesService.getGrades({ student: studentId, ...(semesterFilter && { semester: semesterFilter }) }),
    [studentId, semesterFilter], true
  );
  const { data: semesters } = useApi(() => academicService.getSemesters(), [], true);
  const semestersList = semesters?.results || semesters || [];
  const gradesList = grades?.results || grades || [];

  // Group by subject
  const bySubject = gradesList.reduce((acc, g) => {
    const key = g.subject_name || 'Inconnue';
    if (!acc[key]) acc[key] = [];
    acc[key].push(g);
    return acc;
  }, {});

  const subjects = Object.entries(bySubject);
  const total = Math.ceil(subjects.length / PER);
  const paginated = subjects.slice((page - 1) * PER, page * PER);

  const avg = gradesList.length
    ? (gradesList.reduce((s, g) => s + (parseFloat(g.percentage) || 0), 0) / gradesList.length).toFixed(1)
    : null;

  if (loading) return <Spinner color="#7c3aed" />;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3">
        <select value={semesterFilter} onChange={e => { setSemesterFilter(e.target.value); setPage(1); }}
          className="input-field flex-1">
          <option value="">Tous les semestres</option>
          {semestersList.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {avg && (
          <div className="flex items-center gap-2 px-4 rounded-xl font-extrabold text-sm"
               style={{ background: parseFloat(avg) >= 50 ? '#d1fae5' : '#fee2e2', color: parseFloat(avg) >= 50 ? '#059669' : '#ef4444', border: '1.5px solid', borderColor: parseFloat(avg) >= 50 ? '#bbf7d0' : '#fecaca' }}>
            Moy. {avg}%
          </div>
        )}
      </div>

      {!gradesList.length ? (
        <EmptyState icon={Star} color="#7c3aed" title="Aucune note disponible"
          subtitle={semesterFilter ? 'Aucune note pour ce semestre' : 'Les notes apparaîtront ici'} />
      ) : (
        <div className="space-y-3">
          {paginated.map(([subject, gs]) => {
            const subAvg = gs.reduce((s, g) => s + (parseFloat(g.percentage) || 0), 0) / gs.length;
            const color = subAvg >= 70 ? '#059669' : subAvg >= 50 ? '#d97706' : '#ef4444';
            return (
              <div key={subject} className="card overflow-hidden">
                <div className="h-1" style={{ background: color }} />
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-extrabold" style={{ color: '#0f172a' }}>{subject}</p>
                    <span className="text-sm font-extrabold px-3 py-0.5 rounded-full"
                          style={{ background: `${color}15`, color }}>{subAvg.toFixed(1)}%</span>
                  </div>
                  <div className="space-y-1.5">
                    {gs.map((g, j) => (
                      <div key={j} className="flex items-center justify-between text-xs py-1"
                           style={{ borderBottom: j < gs.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <span style={{ color: '#64748b' }}>
                          {g.date ? new Date(g.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
                          {g.category_name ? ` · ${g.category_name}` : ''}
                        </span>
                        <span className="font-bold" style={{ color }}>
                          {g.score}/{g.max_score} ({parseFloat(g.percentage || 0).toFixed(1)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          <Pagination currentPage={page} totalPages={total} onPageChange={setPage} color="#7c3aed" />
        </div>
      )}
    </div>
  );
}

function TabBulletins({ studentId }) {
  const [yearFilter, setYearFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');

  const { data: reportCards, loading } = useApi(
    () => gradesService.getReportCards({ student: studentId, is_published: true, ...(semesterFilter && { semester: semesterFilter }) }),
    [studentId, semesterFilter], true
  );
  const { data: semesters } = useApi(() => academicService.getSemesters(), [], true);
  const { data: academicYears } = useApi(() => academicService.getAcademicYears?.() || Promise.resolve([]), [], true);

  const semestersList = semesters?.results || semesters || [];
  const yearsList = academicYears?.results || academicYears || [];
  const cards = reportCards?.results || reportCards || [];

  const filtered = yearFilter
    ? cards.filter(c => String(c.academic_year) === String(yearFilter))
    : cards;

  // Group by year label
  const grouped = filtered.reduce((acc, c) => {
    const yearLabel = c.academic_year_name || c.semester_academic_year_name || 'Année inconnue';
    if (!acc[yearLabel]) acc[yearLabel] = [];
    acc[yearLabel].push(c);
    return acc;
  }, {});

  const STATUS_MAP = {
    PASS: { label: 'Admis', color: '#059669', bg: '#d1fae5' },
    FAIL: { label: 'Ajourné', color: '#ef4444', bg: '#fee2e2' },
    CONDITIONAL: { label: 'Conditionnel', color: '#d97706', bg: '#fef3c7' },
    HONORS: { label: 'Mention', color: '#7c3aed', bg: '#f5f3ff' },
    PENDING: { label: 'En attente', color: '#64748b', bg: '#f1f5f9' },
  };

  if (loading) return <Spinner color="#059669" />;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-2 gap-3">
        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="input-field">
          <option value="">Toutes les années</option>
          {yearsList.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
        </select>
        <select value={semesterFilter} onChange={e => setSemesterFilter(e.target.value)} className="input-field">
          <option value="">Tous les semestres</option>
          {semestersList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {!filtered.length ? (
        <EmptyState icon={BookMarked} color="#059669" title="Aucun bulletin publié"
          subtitle="Les bulletins seront disponibles après publication par l'administration" />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([year, bulletins]) => (
            <div key={year}>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-5 w-1 rounded-full" style={{ background: '#6366f1' }} />
                <h3 className="text-sm font-extrabold" style={{ color: '#0f172a' }}>{year}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {bulletins.map(card => {
                  const st = STATUS_MAP[card.status] || STATUS_MAP.PENDING;
                  return (
                    <div key={card.id} className="card overflow-hidden">
                      <div className="h-1" style={{ background: st.color }} />
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-sm font-extrabold" style={{ color: '#0f172a' }}>
                              {card.semester_name || 'Bulletin'}
                            </p>
                            <p className="text-xs" style={{ color: '#94a3b8' }}>{card.class_name || '—'}</p>
                          </div>
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                                style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2 text-center mb-3">
                          {[
                            { l: 'Moyenne', v: card.average != null ? `${parseFloat(card.average).toFixed(2)}/20` : '—', c: '#6366f1' },
                            { l: 'Rang', v: card.rank ? `${card.rank}/${card.total_students}` : '—', c: '#0891b2' },
                            { l: 'Statut', v: st.label, c: st.color },
                          ].map((x, i) => (
                            <div key={i} className="rounded-xl p-2" style={{ background: '#f8fafc' }}>
                              <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>{x.l}</p>
                              <p className="text-xs font-extrabold mt-0.5" style={{ color: x.c }}>{x.v}</p>
                            </div>
                          ))}
                        </div>

                        {/* Comments */}
                        {card.teacher_comment && (
                          <div className="p-2.5 rounded-xl text-xs" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                            <p className="font-semibold mb-0.5" style={{ color: '#0284c7' }}>Appréciation :</p>
                            <p style={{ color: '#0369a1' }}>{card.teacher_comment}</p>
                          </div>
                        )}
                        {card.principal_comment && (
                          <div className="mt-2 p-2.5 rounded-xl text-xs" style={{ background: '#f5f3ff', border: '1px solid #ddd6fe' }}>
                            <p className="font-semibold mb-0.5" style={{ color: '#7c3aed' }}>Direction :</p>
                            <p style={{ color: '#6d28d9' }}>{card.principal_comment}</p>
                          </div>
                        )}

                        <p className="text-[10px] mt-2" style={{ color: '#cbd5e1' }}>
                          Publié le {card.generated_at ? new Date(card.generated_at).toLocaleDateString('fr-FR') : '—'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── notifications tab ─────────────────────────────────────────────────────────

const NOTIF_TYPE_META = {
  PAYMENT:    { label: 'Paiement',  color: '#d97706', bg: '#fffbeb', icon: CreditCard },
  ATTENDANCE: { label: 'Présence',  color: '#14b8a6', bg: '#f0fdfa', icon: UserCheck  },
  GRADE:      { label: 'Note',      color: '#7c3aed', bg: '#f5f3ff', icon: Star       },
  GENERAL:    { label: 'Général',   color: '#6366f1', bg: '#eef2ff', icon: Bell       },
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'À l\'instant';
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  return `Il y a ${Math.floor(h / 24)}j`;
}

function TabNotifications({ studentId }) {
  const { data, loading } = useApi(() => notificationsService.getAll({ limit: 30 }), [], true);
  const notifications = (data?.results || data || []);

  if (loading) return <Spinner color="#0ea5e9" />;

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        color="#0ea5e9"
        title="Aucune notification"
        subtitle="Les notifications liées à votre enfant apparaîtront ici"
      />
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map(notif => {
        const meta = NOTIF_TYPE_META[notif.notification_type] || NOTIF_TYPE_META.GENERAL;
        const IconComp = meta.icon;
        const isRead = notif.is_read;
        return (
          <div key={notif.id}
               className="flex items-start gap-4 p-4 rounded-2xl transition-all"
               style={{
                 background: isRead ? '#f8fafc' : '#f0f9ff',
                 border: `1.5px solid ${isRead ? '#f1f5f9' : '#bae6fd'}`,
               }}>
            <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: meta.bg }}>
              <IconComp className="h-4 w-4" style={{ color: meta.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <p className="text-sm font-bold" style={{ color: '#1e293b' }}>
                  {notif.title || notif.notification_type}
                </p>
                {!isRead && (
                  <span className="h-2 w-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#0ea5e9' }} />
                )}
              </div>
              {notif.body && (
                <p className="text-xs mt-1" style={{ color: '#64748b' }}>{notif.body}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md"
                      style={{ background: meta.bg, color: meta.color }}>
                  {meta.label}
                </span>
                <span className="text-[11px]" style={{ color: '#94a3b8' }}>
                  {timeAgo(notif.created_at)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

const TABS = [
  { id: 'resume',        label: 'Résumé',         icon: User,        color: '#6366f1' },
  { id: 'paiements',     label: 'Paiements',      icon: DollarSign,  color: '#059669' },
  { id: 'absences',      label: 'Absences',       icon: AlertCircle, color: '#d97706' },
  { id: 'notes',         label: 'Notes',          icon: Star,        color: '#7c3aed' },
  { id: 'bulletins',     label: 'Bulletins',      icon: BookMarked,  color: '#0891b2' },
  { id: 'notifications', label: 'Notifications',  icon: Bell,        color: '#0ea5e9' },
];

export default function ParentStudentView() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('resume');

  const { data: student, loading } = useApi(
    () => studentsService.getDossier(studentId), [studentId], true
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-12 w-12 rounded-full border-[3px] animate-spin"
             style={{ borderColor: '#e0e7ff', borderTopColor: '#6366f1' }} />
        <p className="text-sm font-semibold" style={{ color: '#64748b' }}>Chargement du dossier…</p>
      </div>
    );
  }

  if (!student) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <AlertCircle className="h-12 w-12" style={{ color: '#ef4444' }} />
      <p className="font-semibold" style={{ color: '#475569' }}>Dossier introuvable</p>
      <button onClick={() => navigate('/parent')}
        className="px-5 py-2 rounded-xl text-sm font-bold text-white"
        style={{ background: '#6366f1' }}>
        Retour
      </button>
    </div>
  );

  const balanceDue = parseFloat(student.remaining_balance || 0);
  const currentTab = TABS.find(t => t.id === activeTab);

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header banner */}
      <div className="rounded-2xl overflow-hidden"
           style={{ background: 'linear-gradient(135deg,#1d4ed8 0%,#4f46e5 60%,#7c3aed 100%)', boxShadow: '0 8px 32px rgba(79,70,229,0.25)' }}>
        <div className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-center gap-5">
            {/* Left */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button onClick={() => navigate('/parent')}
                className="p-2 rounded-xl flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.12)' }}>
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
              <div className="h-16 w-16 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                   style={{ background: 'rgba(255,255,255,0.15)', boxShadow: '0 0 0 3px rgba(255,255,255,0.3)' }}>
                {student.photo
                  ? <img src={student.photo} alt="" className="h-full w-full object-cover" />
                  : <User className="h-8 w-8" style={{ color: 'rgba(255,255,255,0.8)' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-extrabold text-white truncate">
                  {student.user?.full_name || 'Étudiant'}
                </h1>
                <p className="text-sm font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>#{student.matricule}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {student.site_name && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1"
                          style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)' }}>
                      <Building className="h-3 w-3" />{student.site_name}
                    </span>
                  )}
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                    student.status === 'ACTIVE' ? 'bg-emerald-400 text-emerald-900' : 'bg-slate-300 text-slate-700'
                  }`}>{student.status === 'ACTIVE' ? 'Actif' : student.status}</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                    student.registration_fee_paid ? 'bg-green-400 text-green-900' : 'bg-amber-400 text-amber-900'
                  }`}>{student.registration_fee_paid ? 'Inscrit' : 'Non inscrit'}</span>
                  {(student.has_payment_schedule || student.echeance_override) && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                      student.echeance_override
                        ? 'bg-blue-400 text-blue-900'
                        : student.tuition_up_to_date
                          ? 'bg-green-400 text-green-900'
                          : 'bg-red-400 text-red-900'
                    }`}>
                      {student.echeance_override ? 'Admission autorisée' : (student.tuition_up_to_date ? 'À jour' : 'Non à jour')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: KPIs */}
            <div className="grid grid-cols-3 gap-2 flex-shrink-0">
              {[
                { label: 'Scolarité', value: parseFloat(student.tuition_fee || 0), color: 'rgba(255,255,255,0.75)' },
                { label: 'Payé', value: parseFloat(student.total_paid || 0), color: '#86efac' },
                { label: 'Reste', value: balanceDue, color: balanceDue > 0 ? '#fca5a5' : '#86efac' },
              ].map((k, i) => (
                <div key={i} className="rounded-xl px-3 py-2.5 text-center"
                     style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.55)' }}>{k.label}</p>
                  <p className="text-sm font-extrabold mt-0.5" style={{ color: k.color }}>
                    {k.value.toLocaleString('fr-FR')}
                  </p>
                  <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>FCFA</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="p-2.5 rounded-xl flex flex-col items-center gap-1.5 transition-all"
              style={active
                ? { background: `${tab.color}15`, border: `2px solid ${tab.color}40` }
                : { background: '#fff', border: '1.5px solid #f1f5f9' }}>
              <div className="h-7 w-7 rounded-lg flex items-center justify-center"
                   style={{ background: active ? `${tab.color}20` : '#f8fafc' }}>
                <tab.icon className="h-3.5 w-3.5" style={{ color: active ? tab.color : '#94a3b8' }} />
              </div>
              <span className="text-[10px] font-bold hidden sm:block" style={{ color: active ? tab.color : '#94a3b8' }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-5" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
          <div className="h-7 w-7 rounded-lg flex items-center justify-center"
               style={{ background: `${currentTab.color}15` }}>
            <currentTab.icon className="h-4 w-4" style={{ color: currentTab.color }} />
          </div>
          <h2 className="text-sm font-extrabold" style={{ color: '#0f172a' }}>{currentTab.label}</h2>
        </div>

        {activeTab === 'resume'        && <TabResume student={student} />}
        {activeTab === 'paiements'     && <TabPaiements studentId={studentId} />}
        {activeTab === 'absences'      && <TabAbsences studentId={studentId} />}
        {activeTab === 'notes'         && <TabNotes studentId={studentId} />}
        {activeTab === 'bulletins'     && <TabBulletins studentId={studentId} />}
        {activeTab === 'notifications' && <TabNotifications studentId={studentId} />}
      </div>
    </div>
  );
}
