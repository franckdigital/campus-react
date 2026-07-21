import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, DollarSign, CheckCircle, AlertCircle,
  BookOpen, CheckSquare, Calendar, FileText, ChevronRight,
  RefreshCw, User, MapPin, Clock
} from 'lucide-react';
import { studentsService } from '../../services/students';
import { academicService } from '../../services/academic';
import { financeService } from '../../services/finance';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';

const STATUS_LABELS = {
  ACTIVE: { label: 'Actif', color: '#059669', bg: '#f0fdf4' },
  GRADUATED: { label: 'Diplômé', color: '#7c3aed', bg: '#f5f3ff' },
  SUSPENDED: { label: 'Suspendu', color: '#dc2626', bg: '#fef2f2' },
  WITHDRAWN: { label: 'Retiré', color: '#64748b', bg: '#f8fafc' },
  TRANSFERRED: { label: 'Transféré', color: '#d97706', bg: '#fffbeb' },
};

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="h-10 w-10 rounded-full border-[3px] animate-spin"
           style={{ borderColor: '#e0e7ff', borderTopColor: '#6366f1' }} />
      <p className="text-sm font-semibold" style={{ color: '#64748b' }}>Chargement…</p>
    </div>
  );
}

function QuickLink({ icon: Icon, label, href, color, bg }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(href)}
      className="flex items-center gap-3 p-4 rounded-2xl transition-all hover:-translate-y-0.5 w-full text-left"
      style={{ background: bg, border: `1.5px solid ${color}20` }}
    >
      <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
           style={{ background: `${color}20` }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <p className="flex-1 text-sm font-bold" style={{ color: '#1e293b' }}>{label}</p>
      <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: '#94a3b8' }} />
    </button>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();

  const { data: student, loading, execute: refresh } = useApi(
    () => studentsService.getMe(), [], true
  );

  const studentId = student?.id;

  const { data: enrollmentsData } = useApi(
    () => studentId
      ? academicService.getEnrollments({ student: studentId, page_size: 10 })
      : Promise.resolve([]),
    [studentId], !!studentId
  );

  const enrollments = Array.isArray(enrollmentsData) ? enrollmentsData : (enrollmentsData?.results || []);
  const activeEnrollment = enrollments.find(e => e.status === 'ENROLLED' || e.status === 'ACTIVE') || enrollments[0];

  // Live totals derived from actual invoices (same endpoint the admin dossier
  // and mobile app use) instead of student.total_paid/tuition_fee/remaining_balance,
  // which are static snapshot columns never reconciled with real invoice data.
  const { data: summary } = useApi(
    () => studentId ? financeService.getStudentFinancialSummary(studentId) : Promise.resolve(null),
    [studentId], !!studentId
  );

  // Fetch the student's invoices for a plain scolarité total/paid — there's
  // only one fee concept now (inscription merged into scolarité), so no more
  // regex-based splitting is needed here.
  const { data: invoicesData } = useApi(
    () => studentId ? financeService.getInvoices({ student: studentId }) : Promise.resolve([]),
    [studentId], !!studentId
  );
  const invoicesList = (invoicesData?.results || invoicesData || []).filter(inv => inv.status !== 'CANCELLED');

  // Derive display name from student profile, then auth user, then email
  const studentUser = student?.user;
  const fullName = studentUser?.full_name
    || (studentUser?.first_name || studentUser?.last_name
        ? `${studentUser?.first_name || ''} ${studentUser?.last_name || ''}`.trim()
        : null)
    || user?.full_name
    || user?.email
    || 'Étudiant';

  const tuition = parseFloat(summary?.configured_tuition_fee ?? summary?.tuition_fee ?? 0);
  const statusInfo = STATUS_LABELS[student?.status] || STATUS_LABELS.ACTIVE;

  // is_enrolled is the backend's single computed flag (cumulative payments
  // vs the configurable threshold) — no more client-side derivation.
  const isEnrolled = summary?.is_enrolled ?? student?.is_enrolled ?? false;
  const minEnrollmentPayment = parseFloat(summary?.min_enrollment_payment ?? 0);

  const tuitionPaidFromInv  = invoicesList.reduce((s, inv) => s + parseFloat(inv.amount_paid || 0), 0);
  const tuitionTotalFromInv = invoicesList.reduce((s, inv) => s + parseFloat(inv.total || 0), 0);
  const tuitionTotal   = tuitionTotalFromInv > 0 ? tuitionTotalFromInv : tuition;
  const tuitionPaid    = tuitionPaidFromInv;
  const tuitionBalance = Math.max(0, tuitionTotal - tuitionPaid);
  const enrollRemaining = Math.max(0, minEnrollmentPayment - tuitionPaid);
  const tuitionPct = tuitionTotal > 0 ? Math.min(100, Math.round((tuitionPaid / tuitionTotal) * 100)) : 0;

  const currentClass = activeEnrollment?.class_name || '—';
  const currentYear = activeEnrollment?.academic_year_name || '—';
  const siteName = student?.site_name || '—';
  const phone = studentUser?.phone || user?.phone || '—';
  const email = studentUser?.email || user?.email || '—';
  const admissionDate = student?.admission_date
    ? new Date(student.admission_date).toLocaleDateString('fr-FR')
    : '—';

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Welcome banner */}
      <div className="rounded-2xl p-6 overflow-hidden relative"
           style={{
             background: `linear-gradient(135deg, ${workspace.primaryColor} 0%, ${workspace.primaryColor}cc 100%)`,
             boxShadow: `0 8px 32px ${workspace.primaryColor}40`
           }}>
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full opacity-10"
             style={{ background: 'radial-gradient(circle, #fff, transparent)' }} />
        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Bienvenue,</p>
            <h1 className="text-2xl font-extrabold text-white mb-1" style={{ letterSpacing: '-0.02em' }}>
              {fullName}
            </h1>
            {student?.matricule && (
              <p className="text-sm font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>
                #{student.matricule}
              </p>
            )}
            {activeEnrollment && (
              <p className="text-xs mt-1 font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {currentClass} · {currentYear}
              </p>
            )}
          </div>
          <button onClick={() => refresh()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-105"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)' }}>
            <RefreshCw className="h-3.5 w-3.5" /> Actualiser
          </button>
        </div>

        {/* KPIs */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          {[
            {
              label: 'Statut',
              value: statusInfo.label,
              icon: CheckCircle,
              color: student?.status === 'ACTIVE' ? '#86efac' : '#fca5a5'
            },
            {
              label: 'Classe',
              value: currentClass,
              icon: GraduationCap,
              color: 'rgba(255,255,255,0.9)'
            },
          ].map((k, i) => (
            <div key={i} className="rounded-xl p-3 text-center"
                 style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
              <k.icon className="h-4 w-4 mx-auto mb-1" style={{ color: k.color }} />
              <p className="text-sm font-extrabold truncate" style={{ color: k.color }}>{k.value}</p>
              <p className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>{k.label}</p>
            </div>
          ))}
        </div>

        {/* Financial breakdown — single scolarité concept now (inscription
            merged into it), same figures the admin dossier header shows for
            this student, so the two never disagree. */}
        {tuition > 0 && (
          <div className="mt-3">
            <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(147,197,253,0.9)' }}>Scolarité</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Total', value: tuitionTotal, color: 'rgba(255,255,255,0.85)' },
                { label: 'Payé',  value: tuitionPaid,   color: '#86efac' },
                { label: 'Reste', value: tuitionBalance, color: tuitionBalance > 0 ? '#fca5a5' : '#86efac' },
              ].map((item, i) => (
                <div key={i} className="rounded-xl px-3 py-2 text-center"
                     style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)' }}>
                  <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: 'rgba(147,197,253,0.85)' }}>{item.label}</p>
                  <p className="text-sm font-extrabold" style={{ color: item.color, letterSpacing: '-0.01em' }}>
                    {item.value.toLocaleString('fr-FR')}
                  </p>
                  <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>FCFA</p>
                </div>
              ))}
            </div>
            {!isEnrolled && minEnrollmentPayment > 0 && (
              <p className="text-[10px] mt-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Seuil d'inscription : {minEnrollmentPayment.toLocaleString('fr-FR')} FCFA — reste {enrollRemaining.toLocaleString('fr-FR')} FCFA
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column */}
        <div className="lg:col-span-1 space-y-4">

          {/* Profile card */}
          <div className="card p-5">
            <h2 className="text-sm font-extrabold mb-4" style={{ color: '#0f172a' }}>Mon profil</h2>
            <div className="flex items-center gap-4 mb-4">
              <div className="h-16 w-16 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0"
                   style={{ background: 'linear-gradient(135deg,#e0e7ff,#c7d2fe)' }}>
                {student?.photo
                  ? <img src={student.photo} alt="" className="h-full w-full object-cover" />
                  : <User className="h-8 w-8" style={{ color: '#6366f1' }} />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-extrabold truncate" style={{ color: '#0f172a' }}>{fullName}</p>
                {student?.matricule && (
                  <p className="text-xs font-mono mt-0.5" style={{ color: '#94a3b8' }}>#{student.matricule}</p>
                )}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: statusInfo.bg, color: statusInfo.color }}>
                    {statusInfo.label}
                  </span>
                  {isEnrolled && (
                    <span className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: '#f0fdf4', color: '#059669' }}>
                      Inscrit
                    </span>
                  )}
                  {(student?.has_payment_schedule || student?.echeance_override) && (
                    <span className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={student?.echeance_override
                            ? { background: '#eff6ff', color: '#2563eb' }
                            : student?.tuition_up_to_date
                              ? { background: '#f0fdf4', color: '#059669' }
                              : { background: '#fef2f2', color: '#dc2626' }}>
                      {student?.echeance_override
                        ? 'Admission autorisée'
                        : (student?.tuition_up_to_date ? 'À jour' : 'Non à jour')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-0">
              {[
                { label: 'Email', value: email },
                { label: 'Téléphone', value: phone },
                { label: 'Site', value: siteName },
                { label: 'Admission', value: admissionDate },
                { label: 'Classe', value: currentClass },
                { label: 'Année', value: currentYear },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2"
                     style={{ borderBottom: '1px solid #f8fafc' }}>
                  <span className="text-xs font-semibold flex-shrink-0" style={{ color: '#94a3b8' }}>{item.label}</span>
                  <span className="text-xs font-semibold text-right ml-3 truncate max-w-[60%]"
                        style={{ color: item.value === '—' ? '#cbd5e1' : '#1e293b' }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Financial summary — single scolarité section (inscription
              merged into it) plus the enrollment threshold status. */}
          {tuition > 0 && (
            <div className="card p-5 space-y-4">
              <h2 className="text-sm font-extrabold" style={{ color: '#0f172a' }}>Situation financière</h2>

              <div>
                <div className="flex items-center gap-3 p-3 rounded-xl mb-3"
                     style={isEnrolled
                       ? { background: '#f0fdf4', border: '1.5px solid #bbf7d0' }
                       : { background: '#fffbeb', border: '1.5px solid #fde68a' }}>
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                       style={{ background: isEnrolled ? '#059669' : '#d97706' }}>
                    {isEnrolled
                      ? <CheckCircle className="h-4 w-4 text-white" />
                      : <AlertCircle className="h-4 w-4 text-white" />}
                  </div>
                  <p className="text-xs font-bold" style={{ color: isEnrolled ? '#065f46' : '#92400e' }}>
                    {isEnrolled
                      ? 'Inscription validée'
                      : `Inscription non validée — reste ${enrollRemaining.toLocaleString('fr-FR')} F`}
                  </p>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#2563eb' }}>Scolarité</p>
                <div className="space-y-1">
                  {[
                    { label: 'Total', value: tuitionTotal, color: '#1e293b' },
                    { label: 'Payé',  value: tuitionPaid,   color: '#059669' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-0.5">
                      <span className="text-xs font-semibold" style={{ color: '#64748b' }}>{item.label}</span>
                      <span className="text-xs font-extrabold" style={{ color: item.color }}>{item.value.toLocaleString('fr-FR')} F</span>
                    </div>
                  ))}
                  <div className="h-2 rounded-full overflow-hidden my-1" style={{ background: '#f1f5f9' }}>
                    <div className="h-full rounded-full"
                         style={{
                           width: `${tuitionPct}%`,
                           background: tuitionPct === 100 ? 'linear-gradient(90deg,#059669,#34d399)' : 'linear-gradient(90deg,#d97706,#fbbf24)'
                         }} />
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-xs font-semibold" style={{ color: '#64748b' }}>
                      {tuitionBalance > 0 ? 'Reste' : 'Solde'}
                    </span>
                    <span className="text-xs font-extrabold"
                          style={{ color: tuitionBalance > 0 ? '#ef4444' : '#059669' }}>
                      {tuitionBalance > 0 ? `${tuitionBalance.toLocaleString('fr-FR')} F` : 'Soldé ✓'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Placeholder when no financial data */}
          {tuition === 0 && (
            <div className="card p-5">
              <h2 className="text-sm font-extrabold mb-3" style={{ color: '#0f172a' }}>Situation financière</h2>
              <div className="flex flex-col items-center justify-center py-8 gap-3"
                   style={{ background: '#f8fafc', borderRadius: '12px' }}>
                <DollarSign className="h-8 w-8" style={{ color: '#cbd5e1' }} />
                <p className="text-xs font-semibold text-center" style={{ color: '#94a3b8' }}>
                  Aucune donnée financière disponible
                </p>
                <p className="text-[10px] text-center" style={{ color: '#cbd5e1' }}>
                  Contactez l'administration
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">

          {/* Enrollment info banner */}
          {activeEnrollment && (
            <div className="card p-5">
              <h2 className="text-sm font-extrabold mb-4" style={{ color: '#0f172a' }}>Inscription en cours</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: GraduationCap, label: 'Classe', value: currentClass, color: '#6366f1', bg: '#eef2ff' },
                  { icon: Calendar, label: 'Année académique', value: currentYear, color: '#7c3aed', bg: '#f5f3ff' },
                  { icon: MapPin, label: 'Site', value: siteName, color: '#0891b2', bg: '#ecfeff' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
                       style={{ background: item.bg }}>
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                         style={{ background: `${item.color}20` }}>
                      <item.icon className="h-4 w-4" style={{ color: item.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: item.color }}>{item.label}</p>
                      <p className="text-sm font-extrabold truncate" style={{ color: '#1e293b' }}>{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="card p-5">
            <h2 className="text-sm font-extrabold mb-4" style={{ color: '#0f172a' }}>Accès rapide</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <QuickLink icon={BookOpen} label="Mes notes" href="/student/notes" color="#059669" bg="#f0fdf4" />
              <QuickLink icon={CheckSquare} label="Mes présences" href="/student/presences" color="#0891b2" bg="#ecfeff" />
              <QuickLink icon={Calendar} label="Emploi du temps" href="/student/planning" color="#7c3aed" bg="#f5f3ff" />
              <QuickLink icon={DollarSign} label="Mes finances" href="/student/finances" color="#d97706" bg="#fffbeb" />
              <QuickLink icon={FileText} label="Mes documents" href="/student/documents" color="#0284c7" bg="#f0f9ff" />
            </div>
          </div>

          {/* Recent files */}
          {student?.files && student.files.length > 0 && (
            <div className="card p-5">
              <h2 className="text-sm font-extrabold mb-4" style={{ color: '#0f172a' }}>Documents récents</h2>
              <div className="space-y-2">
                {student.files.slice(0, 5).map(f => (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl"
                       style={{ background: '#f8fafc' }}>
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                         style={{ background: '#e0e7ff' }}>
                      <FileText className="h-4 w-4" style={{ color: '#6366f1' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: '#1e293b' }}>{f.title}</p>
                      <p className="text-[10px]" style={{ color: '#94a3b8' }}>
                        {f.academic_year_name} · {new Date(f.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: '#e0e7ff', color: '#4f46e5' }}>
                      {f.file_type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
