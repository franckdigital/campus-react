import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, BookOpen, CreditCard, AlertCircle,
  FileText, Folder, Award, Search, ChevronLeft, ChevronRight,
  GraduationCap, Calendar, MapPin, Phone, Mail, Building,
  Download, Upload, Eye, Trash2, Plus, Printer, RefreshCw,
  X, DollarSign, TrendingUp, CheckCircle, Clock, XCircle,
  Image as ImageIcon, File, Users, Edit, KeyRound, CalendarClock
} from 'lucide-react';
import { studentFilesService, studentCardsService, parentsService } from '../../services/students';
import { studentsService } from '../../services/students';
import EnrollmentModal from '../../components/students/EnrollmentModal';
import { academicService } from '../../services/academic';
import { financeService } from '../../services/finance';
import api from '../../services/api';
import API_BASE_URL from '../../config/api';
import { attendanceService } from '../../services/attendance';
import { documentsService } from '../../services/documents';
import { useApi } from '../../hooks/useApi';
import { useNotifications } from '../../components/Notifications';
import { getInvoiceLabel } from '../../utils/feeBreakdown';

const SECTION_COLORS = {
  info:      { color: '#2563eb', bg: '#eff6ff', iconBg: '#bfdbfe' },
  parcours:  { color: '#7c3aed', bg: '#f5f3ff', iconBg: '#ede9fe' },
  paiements: { color: '#059669', bg: '#f0fdf4', iconBg: '#bbf7d0' },
  absences:  { color: '#d97706', bg: '#fffbeb', iconBg: '#fde68a' },
  documents: { color: '#0891b2', bg: '#ecfeff', iconBg: '#a5f3fc' },
  fichiers:  { color: '#db2777', bg: '#fdf2f8', iconBg: '#fce7f3' },
  carte:     { color: '#4f46e5', bg: '#eef2ff', iconBg: '#c7d2fe' },
  parents:   { color: '#db2777', bg: '#fdf2f8', iconBg: '#fce7f3' },
  analyse:   { color: '#0d9488', bg: '#f0fdfa', iconBg: '#99f6e4' },
};

function Spinner({ color = '#2563eb' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="h-9 w-9 rounded-full border-[3px] animate-spin"
           style={{ borderColor: `${color}22`, borderTopColor: color }} />
    </div>
  );
}

function EmptyState({ icon: Icon, color, bg, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="h-16 w-16 rounded-2xl flex items-center justify-center"
           style={{ background: `linear-gradient(135deg, ${bg}, ${color}22)`, boxShadow: `0 4px 20px ${color}18` }}>
        <Icon className="h-8 w-8" style={{ color }} />
      </div>
      <p className="text-sm font-semibold" style={{ color: '#475569' }}>{title}</p>
      {subtitle && <p className="text-xs" style={{ color: '#94a3b8' }}>{subtitle}</p>}
    </div>
  );
}

function Pagination({ currentPage, totalPages, onPageChange, accentColor = '#2563eb' }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: '1px solid #f1f5f9' }}>
      <p className="text-xs font-semibold" style={{ color: '#94a3b8' }}>
        Page {currentPage} / {totalPages}
      </p>
      <div className="flex items-center gap-1.5">
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
          className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
          style={{ border: '1.5px solid #e2e8f0' }}>
          <ChevronLeft className="h-4 w-4" style={{ color: '#64748b' }} />
        </button>
        {[...Array(Math.min(5, totalPages))].map((_, i) => {
          const page = i + 1;
          return (
            <button key={page} onClick={() => onPageChange(page)}
              className="h-8 w-8 rounded-lg text-xs font-bold transition-all"
              style={currentPage === page
                ? { background: accentColor, color: '#fff', boxShadow: `0 2px 8px ${accentColor}30` }
                : { border: '1.5px solid #e2e8f0', color: '#64748b' }}>
              {page}
            </button>
          );
        })}
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}
          className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
          style={{ border: '1.5px solid #e2e8f0' }}>
          <ChevronRight className="h-4 w-4" style={{ color: '#64748b' }} />
        </button>
      </div>
    </div>
  );
}

function SearchBar({ value, onChange, placeholder = "Rechercher...", color = '#2563eb' }) {
  return (
    <div className="relative mb-5">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#94a3b8' }} />
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} className="input-field pl-9" />
    </div>
  );
}

function SectionHeader({ icon: Icon, title, color, children }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className="h-8 w-1 rounded-full" style={{ background: color }} />
        <div className="h-9 w-9 rounded-xl flex items-center justify-center"
             style={{ background: `${color}15` }}>
          <Icon className="h-4.5 w-4.5" style={{ color }} />
        </div>
        <h2 className="text-base font-bold" style={{ color: '#0f172a' }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ModalBackdrop({ children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
      {children}
    </div>
  );
}

export default function StudentDossierPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('info');
  const [showHeaderWorkflow, setShowHeaderWorkflow] = useState(false);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [financialInfo, setFinancialInfo] = useState(null);
  const [configuredFees, setConfiguredFees] = useState({ tuition: 0 });

  const applyStudentResponse = (response, finSummary = null) => {
    setStudent({ ...response, tuition_config_label: finSummary?.tuition_config_label ?? null });
    // Prefer finSummary's live, invoice-derived figures over the Student
    // model's stale snapshot columns (response.tuition_fee/total_paid/...),
    // which are never reconciled with actual invoices.
    const configTuition = parseFloat(finSummary?.configured_tuition_fee ?? response?.tuition_fee ?? 0);
    setConfiguredFees({ tuition: configTuition });
    const isEnrolled = finSummary?.is_enrolled ?? response?.is_enrolled ?? false;
    const totalPaid  = parseFloat(finSummary?.total_paid ?? response?.total_paid ?? 0);
    setFinancialInfo({
      total_tuition:          configTuition,
      total_paid:             totalPaid,
      total_pending:          parseFloat(finSummary?.remaining_balance ?? response?.remaining_balance ?? 0),
      is_enrolled:            isEnrolled,
      min_enrollment_payment: parseFloat(finSummary?.min_enrollment_payment ?? 0),
      tuition_total:          configTuition,
      tuition_paid:           totalPaid,
      tuition_balance:        Math.max(0, configTuition - totalPaid),
      has_payment_schedule:   finSummary?.has_payment_schedule ?? response?.has_payment_schedule ?? false,
      tuition_up_to_date:     finSummary?.tuition_up_to_date ?? response?.tuition_up_to_date ?? true,
      echeance_override:      response?.echeance_override ?? finSummary?.echeance_override ?? false,
    });
  };

  const reloadStudent = async () => {
    try {
      const [response, finSummary] = await Promise.all([
        studentsService.getDossier(studentId),
        financeService.getStudentFinancialSummary(studentId).catch(() => null),
      ]);
      applyStudentResponse(response, finSummary);
    } catch {}
  };

  const toggleEcheanceOverride = async () => {
    try {
      await studentsService.update(studentId, { echeance_override: !financialInfo?.echeance_override });
      reloadStudent();
    } catch {}
  };

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        setLoading(true);
        const [response, finSummary] = await Promise.all([
          studentsService.getDossier(studentId),
          financeService.getStudentFinancialSummary(studentId).catch(() => null),
        ]);
        applyStudentResponse(response, finSummary);
      } catch (error) {
        console.error('Error fetching student:', error);
      } finally {
        setLoading(false);
      }
    };
    if (studentId) fetchStudent();
  }, [studentId]);

  const sections = [
    { id: 'info',      label: 'Informations', icon: User,          ...SECTION_COLORS.info },
    { id: 'parents',   label: 'Parents',       icon: Users,         ...SECTION_COLORS.parents },
    { id: 'parcours',  label: 'Parcours',      icon: GraduationCap, ...SECTION_COLORS.parcours },
    { id: 'paiements', label: 'Paiements',     icon: DollarSign,    ...SECTION_COLORS.paiements },
    { id: 'absences',  label: 'Absences',      icon: AlertCircle,   ...SECTION_COLORS.absences },
    { id: 'documents', label: 'Documents',     icon: FileText,      ...SECTION_COLORS.documents },
    { id: 'carte',     label: 'Carte',         icon: CreditCard,    ...SECTION_COLORS.carte },
    { id: 'analyse',   label: 'Analyse IA',    icon: TrendingUp,    ...SECTION_COLORS.analyse },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-12 w-12 rounded-full border-[3px] animate-spin"
             style={{ borderColor: '#bfdbfe', borderTopColor: '#2563eb' }} />
        <p className="text-sm font-semibold" style={{ color: '#64748b' }}>Chargement du dossier…</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-16 w-16 rounded-2xl flex items-center justify-center"
             style={{ background: 'linear-gradient(135deg, #fee2e2, #fca5a510)' }}>
          <AlertCircle className="h-8 w-8" style={{ color: '#ef4444' }} />
        </div>
        <p className="text-sm font-semibold" style={{ color: '#475569' }}>Étudiant non trouvé</p>
        <button onClick={() => navigate('/admin/students')}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: '#2563eb' }}>
          Retour à la liste
        </button>
      </div>
    );
  }

  const balanceDue = (financialInfo?.total_tuition || 0) - (financialInfo?.total_paid || 0);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header banner */}
      <div className="rounded-2xl overflow-hidden"
           style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #4f46e5 60%, #7c3aed 100%)', boxShadow: '0 8px 32px rgba(79,70,229,0.25)' }}>
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            {/* Left: back + avatar + identity */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button onClick={() => navigate('/admin/students')}
                className="p-2 rounded-xl transition-colors flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.12)' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.12)'}>
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>

              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="h-20 w-20 rounded-2xl overflow-hidden flex items-center justify-center"
                     style={{ background: 'rgba(255,255,255,0.15)', boxShadow: '0 0 0 3px rgba(255,255,255,0.3), 0 8px 20px rgba(0,0,0,0.2)' }}>
                  {student.photo
                    ? <img src={student.photo} alt="" className="h-full w-full object-cover" />
                    : <User className="h-10 w-10" style={{ color: 'rgba(255,255,255,0.8)' }} />
                  }
                </div>
                <label className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                       style={{ background: 'rgba(0,0,0,0.5)' }}>
                  <Upload className="h-5 w-5 text-white" />
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const canvas = document.createElement('canvas');
                      const img = new Image();
                      const url = URL.createObjectURL(file);
                      img.onload = async () => {
                        const MAX = 400;
                        let { width, height } = img;
                        if (width > MAX || height > MAX) {
                          const ratio = Math.min(MAX / width, MAX / height);
                          width = Math.round(width * ratio);
                          height = Math.round(height * ratio);
                        }
                        canvas.width = width; canvas.height = height;
                        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                        URL.revokeObjectURL(url);
                        const b64 = canvas.toDataURL('image/jpeg', 0.82);
                        try {
                          await studentsService.update(studentId, { photo: b64 });
                          reloadStudent();
                        } catch { alert('Erreur lors de l\'upload de la photo'); }
                      };
                      img.src = url;
                    }}
                  />
                </label>
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-extrabold text-white truncate" style={{ letterSpacing: '-0.02em' }}>
                  {student.user?.full_name || 'Étudiant'}
                </h1>
                <p className="text-sm font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  #{student.matricule}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {student.site_name && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)' }}>
                      <Building className="h-3 w-3" />
                      {student.site_name}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)' }}>
                    <Calendar className="h-3 w-3" />
                    {student.admission_date ? new Date(student.admission_date).toLocaleDateString('fr-FR') : '-'}
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                    student.status === 'ACTIVE' ? 'bg-emerald-400 text-emerald-900' : 'bg-slate-300 text-slate-700'
                  }`}>
                    {student.status === 'ACTIVE' ? 'Actif' : student.status}
                  </span>
                  {financialInfo && (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                      financialInfo.is_enrolled ? 'bg-green-400 text-green-900' : 'bg-amber-400 text-amber-900'
                    }`}>
                      {financialInfo.is_enrolled
                        ? 'Inscrit'
                        : `Non inscrit — reste ${Math.max(0, (financialInfo.min_enrollment_payment || 0) - (financialInfo.total_paid || 0)).toLocaleString()} FCFA`}
                    </span>
                  )}
                  {financialInfo && (financialInfo.has_payment_schedule || financialInfo.echeance_override) && (
                    <button
                      onClick={toggleEcheanceOverride}
                      title={financialInfo.echeance_override
                        ? 'Cliquer pour retirer l\'autorisation spéciale'
                        : (financialInfo.tuition_up_to_date ? '' : 'Cliquer pour autoriser malgré le retard')}
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                        financialInfo.echeance_override
                          ? 'bg-blue-400 text-blue-900'
                          : financialInfo.tuition_up_to_date
                            ? 'bg-green-400 text-green-900 cursor-default'
                            : 'bg-red-400 text-red-900'
                      }`}>
                      {financialInfo.echeance_override
                        ? 'Admission autorisée'
                        : (financialInfo.tuition_up_to_date ? 'À jour' : 'Non à jour')}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right: financial mini-KPIs — scolarité */}
            {financialInfo && (
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(147,197,253,0.9)' }}>Scolarité</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Total',  value: financialInfo.tuition_total   ?? configuredFees.tuition, color: 'rgba(255,255,255,0.85)' },
                    { label: 'Payé',   value: financialInfo.tuition_paid    ?? 0, color: '#86efac' },
                    { label: 'Reste',  value: financialInfo.tuition_balance ?? configuredFees.tuition, color: (financialInfo.tuition_balance ?? configuredFees.tuition) > 0 ? '#fca5a5' : '#86efac' },
                  ].map((item, i) => (
                    <div key={i} className="rounded-xl px-3 py-2 text-center"
                         style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)' }}>
                      <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: 'rgba(147,197,253,0.85)' }}>{item.label}</p>
                      <p className="text-sm font-extrabold" style={{ color: item.color, letterSpacing: '-0.01em' }}>
                        {(item.value || 0).toLocaleString()}
                      </p>
                      <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>FCFA</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Workflow toggle */}
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
            <button onClick={() => setShowHeaderWorkflow(v => !v)}
              className="flex items-center gap-2 text-xs font-bold transition-all"
              style={{ color: 'rgba(255,255,255,0.85)' }}>
              <FileText className="h-3.5 w-3.5" />
              Guide d'inscription étape par étape
              <ChevronRight className="h-3.5 w-3.5"
                style={{ transform: showHeaderWorkflow ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 200ms' }} />
            </button>
            {showHeaderWorkflow && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {[
                  {
                    step: 1, done: true,
                    label: 'Créer l\'étudiant',
                    where: 'Menu Étudiants → Ajouter',
                    desc: 'Renseigner les données personnelles, contacts, documents et photo.',
                    accent: '#6366f1',
                  },
                  {
                    step: 2, done: financialInfo?.is_enrolled,
                    label: `Régler au moins ${(financialInfo?.min_enrollment_payment || 0).toLocaleString()} FCFA de la scolarité`,
                    where: 'Paiements → Nouvelle facture → Scolarité',
                    desc: 'Une fois ce seuil atteint, l\'étudiant est considéré inscrit et débloque l\'inscription en classe.',
                    accent: '#d97706',
                  },
                  {
                    step: 3, done: financialInfo?.is_enrolled,
                    label: 'Inscrire en classe',
                    where: 'Onglet Parcours → Inscrire',
                    desc: 'Choisir la classe et l\'année académique. Disponible après avoir atteint le seuil d\'inscription.',
                    accent: '#059669',
                  },
                  {
                    step: 4, done: balanceDue <= 0 && (financialInfo?.total_tuition || 0) > 0,
                    label: 'Solder la scolarité',
                    where: 'Paiements → Nouvelle facture → Scolarité',
                    desc: 'Régler le reste en une ou plusieurs tranches. Chaque versement est tracé.',
                    accent: '#2563eb',
                  },
                ].map((s) => (
                  <div key={s.step} className="rounded-xl overflow-hidden"
                       style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
                    <div className="h-1" style={{ background: s.done ? '#059669' : s.accent }} />
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-extrabold flex-shrink-0 text-white"
                             style={{ background: s.done ? '#059669' : s.accent }}>
                          {s.done ? '✓' : s.step}
                        </div>
                        <p className="text-[11px] font-extrabold" style={{ color: s.done ? '#059669' : '#0f172a' }}>{s.label}</p>
                      </div>
                      <p className="text-[10px] leading-relaxed mb-1.5" style={{ color: '#475569' }}>{s.desc}</p>
                      <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: s.accent }}>
                        📍 {s.where}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {sections.map((section) => {
          const active = activeSection === section.id;
          return (
            <button key={section.id} onClick={() => setActiveSection(section.id)}
              className="p-3.5 rounded-2xl transition-all duration-200 flex flex-col items-center gap-2"
              style={active
                ? { background: `linear-gradient(135deg, ${section.bg}, ${section.color}15)`,
                    border: `2px solid ${section.color}40`,
                    boxShadow: `0 4px 16px ${section.color}20`,
                    transform: 'translateY(-1px)' }
                : { background: 'var(--surface)', border: '1.5px solid #f1f5f9' }}>
              <div className="h-10 w-10 rounded-xl flex items-center justify-center transition-all"
                   style={active
                     ? { background: `linear-gradient(135deg, ${section.iconBg}, ${section.color}22)`, boxShadow: `0 2px 10px ${section.color}25` }
                     : { background: '#f8fafc' }}>
                <section.icon className="h-5 w-5" style={{ color: active ? section.color : '#94a3b8' }} />
              </div>
              <span className="text-xs font-bold" style={{ color: active ? section.color : '#64748b' }}>
                {section.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Section content */}
      <div className="card p-6">
        {activeSection === 'info'      && <InfoSection student={student} studentId={studentId} onUpdated={reloadStudent} />}
        {activeSection === 'parents'   && <ParentsSection studentId={studentId} initialParents={student.parents || []} />}
        {activeSection === 'parcours'  && <ParcoursSection studentId={studentId} student={student} />}
        {activeSection === 'paiements' && <PaiementsSection studentId={studentId} student={student} configuredFees={configuredFees} minEnrollmentPayment={financialInfo?.min_enrollment_payment} onSummaryUpdate={(data) => setFinancialInfo(prev => ({ ...prev, ...data }))} onDataChanged={reloadStudent} />}
        {activeSection === 'absences'  && <AbsencesSection studentId={studentId} />}
        {activeSection === 'documents' && <DocumentsSection studentId={studentId} />}
        {activeSection === 'carte'     && <CarteSection studentId={studentId} cards={student.cards || []} student={student} />}
        {activeSection === 'analyse'   && <KpiSection studentId={studentId} />}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// InfoSection
// ──────────────────────────────────────────────────────────────────────────────
function InfoCard({ title, color, children }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${color}20` }}>
      <div className="px-4 py-3 flex items-center gap-2"
           style={{ background: `linear-gradient(135deg, ${color}10, ${color}05)`, borderBottom: `1px solid ${color}15` }}>
        <div className="h-1.5 w-4 rounded-full" style={{ background: color }} />
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{title}</p>
      </div>
      <div className="p-4 space-y-0">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid #f8fafc' }}>
      <span className="text-xs font-semibold" style={{ color: '#94a3b8' }}>{label}</span>
      <span className="text-xs font-bold text-right max-w-[60%]" style={{ color: '#1e293b' }}>{value || '—'}</span>
    </div>
  );
}

function InfoSection({ student, studentId, onUpdated }) {
  const C = SECTION_COLORS.info;
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState('');
  const [form, setForm] = useState({});
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const [sitePrograms, setSitePrograms] = useState([]);
  const [siteLevels, setSiteLevels] = useState([]);
  const [siteClasses, setSiteClasses] = useState([]);
  const { data: academicYearsData } = useApi(() => academicService.getAcademicYears({ page_size: 50 }), [], true);
  const academicYears = academicYearsData?.results || academicYearsData || [];

  // Cascade mirrors Students.jsx's create/edit modal: site (fixed, already
  // known here) → programme → niveau → classe.
  useEffect(() => {
    if (!showEdit || !student?.site) { setSitePrograms([]); return; }
    academicService.getPrograms({ site: student.site, page_size: 200 })
      .then(d => setSitePrograms(d?.results || d || []))
      .catch(() => setSitePrograms([]));
  }, [showEdit, student?.site]);

  useEffect(() => {
    if (!form.program_id) { setSiteLevels([]); return; }
    academicService.getLevels({ program: form.program_id, page_size: 200 })
      .then(d => setSiteLevels(d?.results || d || []))
      .catch(() => setSiteLevels([]));
  }, [form.program_id]);

  useEffect(() => {
    if (!form.level_id || !student?.site) { setSiteClasses([]); return; }
    academicService.getClasses({ level: form.level_id, site: student.site, page_size: 200 })
      .then(d => setSiteClasses(d?.results || d || []))
      .catch(() => setSiteClasses([]));
  }, [form.level_id, student?.site]);

  const openEdit = () => {
    setForm({
      matricule:                  student.matricule                    || '',
      first_name:                 student.user?.first_name             || '',
      last_name:                  student.user?.last_name              || '',
      email:                      student.user?.email                  || '',
      phone:                      student.user?.phone                  || '',
      gender:                     student.gender                       || 'M',
      birth_date:                 student.birth_date                   || '',
      birth_place:                student.birth_place                  || '',
      nationality:                student.nationality                  || '',
      address:                    student.address                      || '',
      city:                       student.city                         || '',
      emergency_contact_name:     student.emergency_contact_name       || '',
      emergency_contact_phone:    student.emergency_contact_phone      || '',
      emergency_contact_relation: student.emergency_contact_relation   || '',
      is_enrolled:                student.is_enrolled                  || false,
      program_id:                 student.current_class?.program_id    || '',
      level_id:                   student.current_class?.level_id      || '',
      class_id:                   student.current_class?.id            || '',
      academic_year_id:           student.current_class?.academic_year_id || '',
      admission_date:             student.admission_date               || '',
      status:                     student.status                       || 'ACTIVE',
      modality:                   student.modality                     || 'PRESENTIEL',
      affectation_status:         student.affectation_status           || 'NON_AFFECTE',
      photo: '',
    });
    setPhotoPreview(student.photo || '');
    setShowEdit(true);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const canvas = document.createElement('canvas');
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 400;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      const b64 = canvas.toDataURL('image/jpeg', 0.82);
      setPhotoPreview(b64);
      setF('photo', b64);
    };
    img.src = url;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        matricule:  form.matricule,
        user_data: { first_name: form.first_name, last_name: form.last_name, email: form.email, phone: form.phone },
        gender:     form.gender,
        birth_date: form.birth_date || null,
        birth_place: form.birth_place,
        nationality: form.nationality,
        address:     form.address,
        city:        form.city,
        emergency_contact_name:     form.emergency_contact_name,
        emergency_contact_phone:    form.emergency_contact_phone,
        emergency_contact_relation: form.emergency_contact_relation,
        is_enrolled:                form.is_enrolled,
        admission_date:             form.admission_date || null,
        status:                     form.status,
        modality:                   form.modality,
        affectation_status:         form.affectation_status,
      };
      if (form.photo) payload.photo = form.photo;
      await studentsService.update(studentId, payload);

      // Update enrollment if class + academic year are selected
      if (form.class_id && form.academic_year_id) {
        const existingEnrollmentId = student.current_class?.enrollment_id;
        if (existingEnrollmentId) {
          await academicService.updateEnrollment(existingEnrollmentId, {
            class_obj: form.class_id,
            academic_year: form.academic_year_id,
            status: 'ENROLLED',
          }).catch(() => {});
        } else {
          await academicService.createEnrollment({
            student: studentId,
            class_obj: form.class_id,
            academic_year: form.academic_year_id,
            status: 'ENROLLED',
          }).catch(() => {});
        }
      }

      setShowEdit(false);
      onUpdated?.();
    } catch (err) {
      alert(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader icon={User} title="Informations personnelles" color={C.color}>
        <button onClick={openEdit}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all"
          style={{ background: C.color }}
          onMouseEnter={e => { e.currentTarget.style.opacity='0.88'; e.currentTarget.style.transform='translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity='1'; e.currentTarget.style.transform='none'; }}>
          <Edit className="h-3.5 w-3.5" /> Modifier
        </button>
      </SectionHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoCard title="Identité" color={C.color}>
          <InfoRow label="Nom complet"        value={student.user?.full_name} />
          <InfoRow label="Email"              value={student.user?.email} />
          <InfoRow label="Téléphone"          value={student.user?.phone} />
          <InfoRow label="Genre"              value={student.gender === 'M' ? 'Masculin' : student.gender === 'F' ? 'Féminin' : '-'} />
          <InfoRow label="Date de naissance"  value={student.birth_date ? new Date(student.birth_date).toLocaleDateString('fr-FR') : null} />
          <InfoRow label="Lieu de naissance"  value={student.birth_place} />
          <InfoRow label="Nationalité"        value={student.nationality} />
        </InfoCard>

        <InfoCard title="Académique" color="#7c3aed">
          <InfoRow label="Matricule"          value={student.matricule} />
          <InfoRow label="École"              value={student.site_name} />
          <InfoRow label="Statut"             value={student.status} />
          <InfoRow label="Date d'admission"   value={student.admission_date ? new Date(student.admission_date).toLocaleDateString('fr-FR') : null} />
          {student.current_class ? (
            <>
              <InfoRow label="Classe actuelle"    value={student.current_class.name} />
              {student.current_class.level_name && <InfoRow label="Niveau" value={student.current_class.level_name} />}
              {student.current_class.program_name && <InfoRow label="Filière" value={student.current_class.program_name} />}
              {student.current_class.academic_year && <InfoRow label="Année académique" value={student.current_class.academic_year} />}
            </>
          ) : (
            <InfoRow label="Classe actuelle" value={null} />
          )}
          {/* Barème résolu automatiquement (niveau précis ou cycle entier,
              ex: "tous les Licence 3") — informatif, non modifiable ici. */}
          <InfoRow label="Barème appliqué" value={student.tuition_config_label} />
        </InfoCard>

        <InfoCard title="Adresse" color="#0891b2">
          <InfoRow label="Adresse" value={student.address} />
          <InfoRow label="Ville"   value={student.city} />
        </InfoCard>

        <InfoCard title="Contact d'urgence" color="#d97706">
          <InfoRow label="Nom"      value={student.emergency_contact_name} />
          <InfoRow label="Téléphone" value={student.emergency_contact_phone} />
          <InfoRow label="Relation" value={student.emergency_contact_relation} />
        </InfoCard>
      </div>

      {/* Edit modal */}
      {showEdit && (
        <ModalBackdrop>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl"
               style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
               onClick={e => e.stopPropagation()}>
            {/* Fixed header */}
            <div style={{ height: 4, flexShrink: 0, background: `linear-gradient(90deg, ${C.color}, ${C.color}80)` }} />
            <div className="flex items-center justify-between px-6 py-4" style={{ flexShrink: 0, borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: '#0f172a' }}>Modifier les informations</h3>
                <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{student.user?.full_name}</p>
              </div>
              <button type="button" onClick={() => setShowEdit(false)}
                className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors">
                <X className="h-4 w-4" style={{ color: '#94a3b8' }} />
              </button>
            </div>

            {/* Scrollable body + sticky footer inside form */}
            <form onSubmit={handleSave} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
              <div className="space-y-4" style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '24px' }}>
                {/* Photo */}
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="h-24 w-24 rounded-2xl overflow-hidden flex items-center justify-center"
                       style={{ background: '#f1f5f9', border: '2px solid #e2e8f0' }}>
                    {photoPreview
                      ? <img src={photoPreview} alt="" className="h-full w-full object-cover" />
                      : <User className="h-10 w-10" style={{ color: '#cbd5e1' }} />
                    }
                  </div>
                  <label className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors hover:bg-blue-50"
                         style={{ border: `1.5px solid ${C.color}50`, color: C.color }}>
                    <Upload className="h-3.5 w-3.5" />
                    Changer la photo
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  </label>
                  <p className="text-[10px]" style={{ color: '#94a3b8' }}>JPG, PNG — redimensionnée à 400×400 px max</p>
                </div>

                <div className="border-t" style={{ borderColor: '#f1f5f9' }} />
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: C.color }}>Identité</p>

                <div>
                  <label className="form-label">Matricule</label>
                  <input className="input-field font-mono" value={form.matricule} onChange={e => setF('matricule', e.target.value)} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Prénom *</label>
                    <input required className="input-field" value={form.first_name} onChange={e => setF('first_name', e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Nom *</label>
                    <input required className="input-field" value={form.last_name} onChange={e => setF('last_name', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Email *</label>
                    <input required type="email" className="input-field" value={form.email} onChange={e => setF('email', e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Téléphone</label>
                    <input type="tel" className="input-field" placeholder="+225 XX XX XX XX" value={form.phone} onChange={e => setF('phone', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Genre</label>
                    <select className="input-field cursor-pointer" value={form.gender} onChange={e => setF('gender', e.target.value)}>
                      <option value="M">Masculin</option>
                      <option value="F">Féminin</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Date de naissance</label>
                    <input type="date" className="input-field" value={form.birth_date} onChange={e => setF('birth_date', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Lieu de naissance</label>
                    <input className="input-field" value={form.birth_place} onChange={e => setF('birth_place', e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Nationalité</label>
                    <input className="input-field" value={form.nationality} onChange={e => setF('nationality', e.target.value)} />
                  </div>
                </div>

                <div className="border-t" style={{ borderColor: '#f1f5f9' }} />
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#0891b2' }}>Adresse</p>

                <div>
                  <label className="form-label">Adresse</label>
                  <input className="input-field" value={form.address} onChange={e => setF('address', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Ville</label>
                  <input className="input-field" value={form.city} onChange={e => setF('city', e.target.value)} />
                </div>

                <div className="border-t" style={{ borderColor: '#f1f5f9' }} />
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#d97706' }}>Contact d'urgence</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Nom</label>
                    <input className="input-field" value={form.emergency_contact_name} onChange={e => setF('emergency_contact_name', e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Téléphone</label>
                    <input type="tel" className="input-field" value={form.emergency_contact_phone} onChange={e => setF('emergency_contact_phone', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Relation</label>
                  <input className="input-field" placeholder="Ex: Mère, Frère…" value={form.emergency_contact_relation} onChange={e => setF('emergency_contact_relation', e.target.value)} />
                </div>

                <div className="border-t" style={{ borderColor: '#f1f5f9' }} />
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#7c3aed' }}>Académique</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Année académique</label>
                    <select className="input-field cursor-pointer"
                      value={form.academic_year_id}
                      onChange={e => setF('academic_year_id', e.target.value)}>
                      <option value="">— Sélectionner —</option>
                      {academicYears.map(y => (
                        <option key={y.id} value={y.id}>{y.name}{y.is_current ? ' (En cours)' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Date d'inscription</label>
                    <input type="date" className="input-field" value={form.admission_date} onChange={e => setF('admission_date', e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Programme</label>
                    <select className="input-field cursor-pointer"
                      value={form.program_id}
                      onChange={e => setForm(f => ({ ...f, program_id: e.target.value, level_id: '', class_id: '' }))}>
                      <option value="">— Sélectionner —</option>
                      {sitePrograms.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Niveau</label>
                    <select className="input-field cursor-pointer"
                      value={form.level_id}
                      onChange={e => setForm(f => ({ ...f, level_id: e.target.value, class_id: '' }))}
                      disabled={!form.program_id}>
                      <option value="">— Sélectionner —</option>
                      {siteLevels.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Classe</label>
                    <select className="input-field cursor-pointer"
                      value={form.class_id}
                      onChange={e => setF('class_id', e.target.value)}
                      disabled={!form.level_id}>
                      <option value="">— Sélectionner —</option>
                      {siteClasses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Statut</label>
                    <select className="input-field cursor-pointer" value={form.status} onChange={e => setF('status', e.target.value)}>
                      <option value="ACTIVE">Actif</option>
                      <option value="GRADUATED">Diplômé</option>
                      <option value="SUSPENDED">Suspendu</option>
                      <option value="WITHDRAWN">Retiré</option>
                      <option value="TRANSFERRED">Transféré</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Modalité de suivi</label>
                    <select className="input-field cursor-pointer" value={form.modality} onChange={e => setF('modality', e.target.value)}>
                      <option value="PRESENTIEL">Présentiel</option>
                      <option value="ELEARNING">E-learning</option>
                      <option value="HYBRIDE">Hybride</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Affectation</label>
                    <select className="input-field cursor-pointer" value={form.affectation_status} onChange={e => setF('affectation_status', e.target.value)}>
                      <option value="NON_AFFECTE">Non affecté (Privé)</option>
                      <option value="AFFECTE">Affecté (État)</option>
                    </select>
                  </div>
                </div>

                <div className="border-t" style={{ borderColor: '#f1f5f9' }} />
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#059669' }}>Inscription</p>
                <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-xl hover:bg-green-50 transition-colors" style={{ border: '1.5px solid #d1fae5' }}>
                  <div className="relative flex-shrink-0">
                    <input type="checkbox" className="sr-only" checked={!!form.is_enrolled} onChange={e => setF('is_enrolled', e.target.checked)} />
                    <div className="h-5 w-9 rounded-full transition-colors" style={{ background: form.is_enrolled ? '#059669' : '#cbd5e1' }}>
                      <div className="h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ml-0.5" style={{ transform: form.is_enrolled ? 'translateX(16px)' : 'translateX(0)' }} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#1e293b' }}>Inscrit (seuil de scolarité atteint)</p>
                    <p className="text-[10px]" style={{ color: '#94a3b8' }}>
                      Active le badge "Inscrit" et autorise l'inscription en classe. Normalement recalculé automatiquement
                      depuis les paiements — ne modifier manuellement qu'en cas de correction exceptionnelle.
                    </p>
                  </div>
                </label>
              </div>

              {/* Sticky footer */}
              <div className="flex gap-3 px-6 py-4" style={{ flexShrink: 0, borderTop: '1px solid #f1f5f9' }}>
                <button type="button" onClick={() => setShowEdit(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                  style={{ border: '1.5px solid #e2e8f0', color: '#64748b' }}>Annuler</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                  style={{ background: `linear-gradient(135deg, ${C.color}, ${C.color}cc)` }}>
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </ModalBackdrop>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// ParcoursSection
// ──────────────────────────────────────────────────────────────────────────────
function ParcoursSection({ studentId, student }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const itemsPerPage = 10;
  const C = SECTION_COLORS.parcours;
  const { notify } = useNotifications();

  const { data: enrollments, loading, execute: refetch } = useApi(
    () => academicService.getEnrollments({ student: studentId }),
    [studentId], true
  );

  const handleDelete = async (enrollment) => {
    if (!window.confirm(`Supprimer l'inscription "${enrollment.class_name || 'cette classe'}" (${enrollment.academic_year_name || ''}) ?`)) return;
    setDeletingId(enrollment.id);
    try {
      await academicService.deleteEnrollment(enrollment.id);
      notify('Inscription supprimée', 'success');
      refetch();
    } catch (err) {
      notify(err.response?.data?.detail || err.message || 'Erreur lors de la suppression', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => { console.log('Enrollments:', enrollments); }, [enrollments]);

  const enrollmentsList = enrollments?.results || enrollments || [];
  const filtered = enrollmentsList.filter(e =>
    e.class_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.academic_year_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.level_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.program_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const statusMap = {
    'ACTIVE':      { label: 'En cours',   color: '#059669', bg: '#d1fae5' },
    'COMPLETED':   { label: 'Terminé',    color: '#2563eb', bg: '#dbeafe' },
    'DROPPED':     { label: 'Abandonné',  color: '#ef4444', bg: '#fee2e2' },
    'TRANSFERRED': { label: 'Transféré',  color: '#d97706', bg: '#fef3c7' },
  };

  if (loading) return <Spinner color={C.color} />;

  return (
    <div>
      <SectionHeader icon={GraduationCap} title="Parcours académique" color={C.color}>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowEnrollment(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all"
            style={{ background: `linear-gradient(135deg, ${C.color}, ${C.color}cc)`, boxShadow: `0 2px 8px ${C.color}30` }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none'; }}>
            <Plus className="h-3.5 w-3.5" /> Inscrire
          </button>
          <button onClick={refetch} className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ border: '1.5px solid #e2e8f0' }}
            onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}>
            <RefreshCw className="h-3.5 w-3.5" style={{ color: '#64748b' }} />
          </button>
        </div>
      </SectionHeader>

      <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher une inscription…" color={C.color} />

      {paginated.length === 0 ? (
        <EmptyState icon={GraduationCap} color={C.color} bg={C.iconBg}
          title="Aucune inscription trouvée"
          subtitle="L'étudiant n'a pas encore d'inscription académique" />
      ) : (
        <div className="space-y-3">
          {paginated.map((enrollment) => {
            const st = statusMap[enrollment.status] || { label: enrollment.status, color: '#64748b', bg: '#f1f5f9' };
            return (
              <div key={enrollment.id} className="rounded-2xl overflow-hidden transition-all"
                   style={{ border: `1.5px solid #f1f5f9` }}
                   onMouseEnter={e => e.currentTarget.style.borderColor = `${C.color}40`}
                   onMouseLeave={e => e.currentTarget.style.borderColor = '#f1f5f9'}>
                <div className="h-1" style={{ background: `linear-gradient(90deg, ${C.color}, ${C.color}60)` }} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm font-bold" style={{ color: '#1e293b' }}>
                          {enrollment.class_name || 'Classe non définie'}
                        </p>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                              style={{ background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: '#64748b' }}>
                        {enrollment.academic_year_name && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            {enrollment.academic_year_name}
                          </span>
                        )}
                        {enrollment.level_name && (
                          <span className="flex items-center gap-1.5">
                            <BookOpen className="h-3 w-3" />
                            {enrollment.level_name}
                          </span>
                        )}
                        {enrollment.program_name && (
                          <span className="flex items-center gap-1.5">
                            <GraduationCap className="h-3 w-3" />
                            {enrollment.program_name}
                          </span>
                        )}
                        {enrollment.enrollment_date && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            Inscrit le {new Date(enrollment.enrollment_date).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => setEditingEnrollment(enrollment)} title="Modifier"
                        className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
                        style={{ background: '#eff6ff' }}>
                        <Edit className="h-3.5 w-3.5" style={{ color: '#2563eb' }} />
                      </button>
                      <button onClick={() => handleDelete(enrollment)} title="Supprimer" disabled={deletingId === enrollment.id}
                        className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
                        style={{ background: '#fef2f2' }}>
                        <Trash2 className="h-3.5 w-3.5" style={{ color: '#ef4444' }} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} accentColor={C.color} />

      {showEnrollment && student && (
        <EnrollmentModal
          student={student}
          onClose={() => setShowEnrollment(false)}
          onSuccess={() => { refetch(); setShowEnrollment(false); }}
        />
      )}

      {editingEnrollment && student && (
        <EnrollmentModal
          student={student}
          editing={editingEnrollment}
          onClose={() => setEditingEnrollment(null)}
          onSuccess={() => { refetch(); setEditingEnrollment(null); }}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// PaiementsSection
// ──────────────────────────────────────────────────────────────────────────────
const STANDARD_METHODS = [
  { code: 'cash',          name: 'Espèces' },
  { code: 'bank_transfer', name: 'Virement bancaire' },
  { code: 'mobile_money',  name: 'Mobile Money' },
  { code: 'card',          name: 'Carte bancaire' },
  { code: 'check',         name: 'Chèque' },
];

function PaiementsSection({ studentId, student, configuredFees, minEnrollmentPayment, onSummaryUpdate, onDataChanged }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('summary');
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ invoice_id: '', amount: '', method_id: 'cash' });
  const [paying, setPaying] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ amount: '', amountMode: 'bareme', paid_now: '', method: 'cash', notes: '' });
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');
  const itemsPerPage = 10;
  const C = SECTION_COLORS.paiements;

  const { data: invoices, loading: loadingInvoices, execute: refetchInvoices } = useApi(
    () => financeService.getInvoices({ student: studentId }), [studentId], true
  );
  const { data: payments, loading: loadingPayments, execute: refetchPayments } = useApi(
    // PaymentViewSet.get_queryset only recognizes the literal `student` param
    // (not the `invoice__student` lookup syntax django-filter would need a
    // dedicated FilterSet to support) — with the wrong key this silently
    // returned EVERY payment in the system instead of just this student's,
    // which is why "En attente" showed a site-wide pending total that never
    // reacted to this student's own payments.
    () => financeService.getPayments({ student: studentId }), [studentId], true
  );
  const { data: paymentMethods } = useApi(() => financeService.getPaymentMethods(), [], true);
  const { data: echeancierData } = useApi(
    () => studentsService.getEcheancier(studentId), [studentId, invoices], true
  );
  // All active barèmes at this student's site — the
  // invoice form lets the admin pick explicitly from this list instead of
  // either trusting a single auto-resolved amount or typing one blind, which
  // is exactly the kind of manual entry that can drift from whatever barème
  // is actually configured (see FeeConfiguration.get_for_enrollment).
  const { data: feeConfigsData } = useApi(
    () => financeService.getFeeConfigurations({ site: student?.site, is_active: true, page_size: 200 }),
    [student?.site], !!student?.site
  );
  const allFeeConfigs = feeConfigsData?.results || feeConfigsData || [];
  const studentLevelId = student?.current_class?.level_id;
  const studentProgramId = student?.current_class?.program_id;
  // Lower rank = shown first: exact level match, then program-level match
  // (level left blank), then any other program, unscoped "global" rows last
  // (still shown — just not assumed relevant).
  const _rankFeeConfig = (cfg) => {
    if (cfg.level_id && cfg.level_id === studentLevelId) return 0;
    if (!cfg.level_id && cfg.program_id && cfg.program_id === studentProgramId) return 1;
    if (!cfg.level_id && !cfg.program_id) return 3;
    return 2;
  };
  const _feeConfigLabel = (cfg) => {
    const scope = cfg.level_name || cfg.program_name || 'Toutes filières';
    const parts = [scope, cfg.modality_name, cfg.affectation_status_name].filter(Boolean);
    return `${parts.join(' · ')} — ${Number(cfg.amount).toLocaleString('fr-FR')} F`;
  };
  // Legacy fee_category='INSCRIPTION' rows are always inactive (deactivated
  // by the merge migration) and already excluded by the is_active filter
  // above; the extra guard here is defensive.
  const tuitionConfigs = allFeeConfigs
    .filter(c => c.fee_category !== 'INSCRIPTION')
    .sort((a, b) => _rankFeeConfig(a) - _rankFeeConfig(b) || Number(b.amount) - Number(a.amount));

  // Auto-select the best-matching barème as soon as the list loads, if the
  // form is still in "bareme" mode with nothing chosen yet (covers the
  // modal's default open state).
  useEffect(() => {
    if (!showInvoiceModal || invoiceForm.amountMode !== 'bareme' || invoiceForm.selectedConfigId) return;
    if (tuitionConfigs.length === 0) return;
    const best = tuitionConfigs[0];
    setInvoiceForm(f => ({
      ...f,
      selectedConfigId: best.id,
      amount: String(best.amount),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInvoiceModal, invoiceForm.amountMode, invoiceForm.selectedConfigId, tuitionConfigs.length]);

  const loading = loadingInvoices || loadingPayments;
  const invoicesList = invoices?.results || invoices || [];
  const paymentsList = payments?.results || payments || [];
  const methodsList = paymentMethods?.results || paymentMethods || [];
  // Cancelled invoices stay visible in the invoice list/history but must not
  // contribute to any total/paid/balance aggregation.
  const activeInvoicesList = invoicesList.filter(inv => inv.status !== 'CANCELLED');

  // Must come from activeInvoicesList (excludes CANCELLED), not the raw list —
  // otherwise a cancelled duplicate invoice (balance never cleared to 0)
  // shows up as a selectable payment target in "Enregistrer un paiement".
  const unpaidInvoices = activeInvoicesList.filter(inv => inv.status !== 'PAID');

  // Sync computed totals to header banner whenever invoices/payments load or
  // refresh. is_enrolled is intentionally NOT sent here — it's the backend's
  // computed, self-healing figure and is refreshed via onDataChanged (which
  // re-fetches the financial-summary, the actual source of truth).
  useEffect(() => {
    if (loadingInvoices || loadingPayments || !onSummaryUpdate) return;
    const tPaid    = activeInvoicesList.reduce((s, inv) => s + parseFloat(inv.amount_paid || 0), 0);
    const tPending = paymentsList
      .filter(p => p.status === 'PENDING')
      .reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const fallbackTuition = configuredFees?.tuition || parseFloat(student?.tuition_fee || 0);
    const tTuition = activeInvoicesList.reduce((s, inv) => s + parseFloat(inv.total || 0), 0);
    const total = tTuition || fallbackTuition;

    onSummaryUpdate({
      total_tuition:   total,
      total_paid:      tPaid,
      total_pending:   tPending,
      tuition_total:   total,
      tuition_paid:    tPaid,
      tuition_balance: Math.max(0, total - tPaid),
    });
  }, [invoices, payments, loadingInvoices, loadingPayments]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePay = async (e) => {
    e.preventDefault();
    if (!payForm.invoice_id || !payForm.amount || !payForm.method_id) return;
    setPaying(true);
    try {
      // Resolve API payment method by code or name (same approach as Finance.jsx)
      const selectedStd = STANDARD_METHODS.find(s => s.code === payForm.method_id);
      let resolvedMethod = methodsList.find(pm =>
        pm.code?.toLowerCase() === payForm.method_id?.toLowerCase() ||
        (selectedStd && pm.name?.toLowerCase().includes(selectedStd.name.toLowerCase()))
      ) || methodsList[0];
      if (!resolvedMethod) {
        try {
          resolvedMethod = await financeService.createPaymentMethod({
            name: selectedStd?.name || 'Espèces',
            code: (payForm.method_id || 'CASH').toUpperCase(),
            is_online: false,
            requires_verification: false,
          });
        } catch (err) { console.log('createPaymentMethod failed', err); }
      }
      const payment = await financeService.createPayment({
        invoice: payForm.invoice_id,
        payment_method: resolvedMethod?.id,
        amount: parseFloat(payForm.amount),
        status: 'PENDING',
        notes: `Paiement ${selectedStd?.name || 'Espèces'} via dossier étudiant`,
      });
      await financeService.validatePayment(payment.id);
      setShowPayModal(false);
      setPayForm({ invoice_id: '', amount: '', method_id: 'cash' });
      refetchInvoices();
      refetchPayments();
      onDataChanged?.();
    } catch (err) {
      alert(err.message || 'Erreur lors du paiement');
    } finally {
      setPaying(false);
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    setInvoiceError('');
    setCreatingInvoice(true);
    // Always trust invoiceForm.amount — it's already kept in sync with
    // whichever barème the admin explicitly picked from the list (or typed
    // manually), by the select's own onChange handler. This used to
    // recompute its own amount from configuredFees.tuition (the single
    // auto-resolved value from financial_summary) instead, silently
    // discarding whatever barème the admin actually selected in the list —
    // if that single auto-resolution happened to be wrong (e.g. the
    // student's current enrollment itself was wrong), the invoice got priced
    // off THAT wrong amount regardless of the admin's explicit choice.
    const totalAmount = parseFloat(invoiceForm.amount) || 0;
    const paidNow = parseFloat(invoiceForm.paid_now) || 0;
    try {
      // Get or create fee type — single "scolarité" type now (no more
      // separate "inscription" fee type).
      let feeTypesList = [];
      try { const ft = await financeService.getFeeTypes(); feeTypesList = ft?.results || ft || []; } catch {}
      let feeType = feeTypesList.find(ft => ft.code?.toLowerCase().includes('tuition') || ft.name?.toLowerCase().includes('scolarité') || ft.code?.toLowerCase().includes('scolarite'));
      if (!feeType) {
        try {
          feeType = await financeService.createFeeType({
            name: 'Frais de scolarité',
            code: 'TUITION',
            description: 'Frais de scolarité annuels',
            default_amount: totalAmount, is_recurring: false,
          });
        } catch (err) { console.log('createFeeType failed', err); }
      }
      // Resolve site, academic_year and due_date required by the backend
      const siteId = student?.site;
      let academicYearId = student?.current_class?.academic_year_id;
      if (!academicYearId) {
        try {
          const currentYear = await academicService.getCurrentAcademicYear();
          academicYearId = currentYear?.id;
        } catch {}
      }
      if (!siteId) throw new Error('Impossible de déterminer le site de l\'étudiant.');
      if (!academicYearId) throw new Error('Aucune année académique active trouvée. Veuillez en créer une dans Paramètres → Années académiques.');
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      // Create invoice
      const invoice = await financeService.createInvoice({
        student: studentId,
        site: siteId,
        academic_year: academicYearId,
        due_date: dueDateStr,
        notes: invoiceForm.notes || 'Frais de scolarité',
      });
      if (!invoice?.id) throw new Error('La facture n\'a pas été créée');
      // Add item
      if (feeType && totalAmount > 0) {
        await financeService.addInvoiceItem(invoice.id, {
          fee_type: feeType.id,
          description: 'Frais de scolarité',
          quantity: 1, unit_price: totalAmount,
        });
      }
      // Pay immediately if amount provided
      if (paidNow > 0) {
        const selectedStd = STANDARD_METHODS.find(s => s.code === invoiceForm.method);
        let method = methodsList.find(pm =>
          pm.code?.toLowerCase() === invoiceForm.method?.toLowerCase() ||
          (selectedStd && pm.name?.toLowerCase().includes(selectedStd.name.toLowerCase()))
        ) || methodsList[0];
        if (!method) {
          try {
            method = await financeService.createPaymentMethod({
              name: selectedStd?.name || 'Espèces',
              code: (invoiceForm.method || 'CASH').toUpperCase(),
              is_online: false, requires_verification: false,
            });
          } catch (err) { console.log('createPaymentMethod failed', err); }
        }
        const payment = await financeService.createPayment({
          invoice: invoice.id, payment_method: method?.id,
          amount: paidNow, status: 'PENDING',
          notes: `Paiement ${selectedStd?.name || 'Espèces'} via dossier étudiant`,
        });
        try {
          await financeService.validatePayment(payment.id);
        } catch {
          try { await financeService.deletePayment(payment.id); } catch {}
          throw new Error('Validation du paiement échouée. Vérifiez la configuration comptable du site.');
        }
        // is_enrolled is recomputed server-side (self-healing signal) from
        // cumulative payments vs the configurable threshold — no manual
        // student update needed here anymore.
      }
      setShowInvoiceModal(false);
      setInvoiceForm({ amount: '', amountMode: 'bareme', paid_now: '', method: 'cash', notes: '' });
      refetchInvoices();
      refetchPayments();
      onDataChanged?.();
    } catch (err) {
      setInvoiceError(err.message || 'Erreur lors de la création de la facture');
    } finally {
      setCreatingInvoice(false);
    }
  };

  // Helper: open invoice modal with amount pre-filled from barème.
  const openInvoiceModal = () => {
    const best = tuitionConfigs[0];
    setInvoiceForm({
      amount: best ? String(best.amount) : '',
      amountMode: best ? 'bareme' : 'custom',
      selectedConfigId: best?.id || '',
      paid_now: '',
      method: 'cash', notes: '',
    });
    setInvoiceError('');
    setShowInvoiceModal(true);
  };

  // Compute from actual invoices and payments (source of truth) — cancelled
  // invoices are excluded so they no longer contribute to any total. There's
  // only one fee concept now (scolarité), so no more inscription/tuition
  // invoice-splitting by regex.
  const _fallbackTuition = configuredFees?.tuition || parseFloat(student?.tuition_fee || 0);
  const tuitionTotal   = activeInvoicesList.length > 0
    ? activeInvoicesList.reduce((s, inv) => s + parseFloat(inv.total || 0), 0)
    : _fallbackTuition;
  const tuitionPaid    = activeInvoicesList.reduce((s, inv) => s + parseFloat(inv.amount_paid || 0), 0);
  const tuitionBalance = Math.max(0, tuitionTotal - tuitionPaid);
  const _tPending = paymentsList
    .filter(p => p.status === 'PENDING')
    .reduce((s, p) => s + parseFloat(p.amount || 0), 0);

  // is_enrolled comes straight from the Student record (self-healing,
  // recomputed server-side from cumulative payments vs the configurable
  // threshold) — no more client-side derivation from invoice text.
  const isEnrolled = student?.is_enrolled || false;
  const minEnroll = minEnrollmentPayment || 0;
  const enrollRemaining = Math.max(0, minEnroll - tuitionPaid);

  const summary = {
    total_tuition:          tuitionTotal,
    total_paid:             tuitionPaid,
    total_pending:          _tPending,
    balance_due:            tuitionBalance,
    is_enrolled:            isEnrolled,
    min_enrollment_payment: minEnroll,
    enroll_remaining:       enrollRemaining,
  };

  const filteredInvoices = invoicesList.filter(inv => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return inv.invoice_number?.toLowerCase().includes(s) || inv.notes?.toLowerCase().includes(s);
  });
  const filteredPayments = paymentsList.filter(p => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return p.payment_number?.toLowerCase().includes(s) || p.payment_method?.name?.toLowerCase().includes(s) || p.payment_method?.toLowerCase().includes(s);
  });

  const totalInvoicePages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const totalPaymentPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const totalSummaryPages = Math.ceil(invoicesList.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginatedPayments = filteredPayments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginatedSummary  = invoicesList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return <Spinner color={C.color} />;

  const kpis = [
    { label: 'Total scolarité', value: tuitionTotal,   color: '#2563eb', bg: '#dbeafe', icon: DollarSign },
    { label: 'Payé',            value: tuitionPaid,    color: '#059669', bg: '#d1fae5', icon: CheckCircle },
    { label: 'En attente',      value: _tPending,      color: '#f59e0b', bg: '#fef3c7', icon: Clock },
    { label: 'Reste',           value: tuitionBalance, color: tuitionBalance > 0 ? '#ef4444' : '#059669', bg: tuitionBalance > 0 ? '#fee2e2' : '#d1fae5', icon: TrendingUp },
  ];

  const tabs = [
    { id: 'summary',  label: 'Résumé' },
    { id: 'invoices', label: `Factures (${invoicesList.length})` },
    { id: 'payments', label: `Versements (${paymentsList.length})` },
  ];

  return (
    <div className="space-y-5">
      <SectionHeader icon={DollarSign} title="Paiements & Finances" color={C.color}>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowWorkflow(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all"
            style={{ background: showWorkflow ? '#e0f2fe' : '#f1f5f9', color: showWorkflow ? '#0284c7' : '#64748b' }}
            title="Comprendre le workflow">
            <FileText className="h-3 w-3" /> Guide
          </button>
          <button onClick={() => openInvoiceModal()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 2px 8px rgba(124,58,237,0.30)' }}>
            <FileText className="h-3.5 w-3.5" /> Nouvelle facture
          </button>
          <button onClick={() => { setPayForm({ invoice_id: unpaidInvoices[0]?.id || '', amount: '', method_id: 'cash' }); setShowPayModal(true); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all"
            style={{ background: `linear-gradient(135deg, ${C.color}, ${C.color}cc)`, boxShadow: `0 2px 8px ${C.color}30` }}>
            <Plus className="h-3.5 w-3.5" /> Nouveau paiement
          </button>
        </div>
      </SectionHeader>

      {/* Workflow explanation */}
      {showWorkflow && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #e0f2fe', background: '#f8fafc' }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ background: '#f0f9ff', borderBottom: '1px solid #e0f2fe' }}>
            <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: '#0284c7' }}>
              Guide complet — Processus d'inscription & paiement
            </p>
            <button onClick={() => setShowWorkflow(false)} className="h-6 w-6 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors">
              <X className="h-3.5 w-3.5" style={{ color: '#64748b' }} />
            </button>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                step: 1, done: true, accent: '#6366f1',
                label: 'Créer l\'étudiant',
                comment: 'Fait ✓',
                desc: 'Renseigner les données personnelles, académiques, contacts d\'urgence et photo d\'identité.',
                where: 'Menu Étudiants → Ajouter un étudiant',
                action: null,
              },
              {
                step: 2, done: summary.is_enrolled, accent: '#d97706',
                label: `Régler au moins ${minEnroll.toLocaleString()} F de la scolarité`,
                comment: summary.is_enrolled ? 'Inscrit ✓' : `Reste ${summary.enroll_remaining.toLocaleString()} F`,
                desc: 'Créer une facture de scolarité, puis payer jusqu\'à atteindre le seuil d\'inscription. Débloque l\'inscription en classe.',
                where: 'Cliquer "Nouvelle facture"',
                action: !summary.is_enrolled ? () => openInvoiceModal() : null,
                actionLabel: 'Créer facture de scolarité',
              },
              {
                step: 3, done: summary.is_enrolled, accent: '#059669',
                label: 'Inscrire en classe',
                comment: summary.is_enrolled ? 'Inscrit ✓' : 'Bloqué — atteindre le seuil d\'abord',
                desc: 'Une fois le seuil d\'inscription atteint, aller dans l\'onglet Parcours pour choisir la classe et l\'année académique.',
                where: 'Onglet Parcours → Inscrire',
                action: null,
              },
              {
                step: 4, done: summary.balance_due <= 0 && summary.total_tuition > 0, accent: '#2563eb',
                label: 'Solder la scolarité',
                comment: summary.balance_due > 0 ? `Reste ${summary.balance_due.toLocaleString()} F` : (summary.total_tuition > 0 ? 'Soldé ✓' : 'À configurer'),
                desc: 'Régler le reste en une ou plusieurs tranches. Utiliser "Nouveau paiement" pour chaque versement.',
                where: 'Nouvelle facture → Nouveau paiement',
                action: summary.balance_due > 0 ? () => openInvoiceModal() : null,
                actionLabel: 'Créer facture de scolarité',
              },
            ].map((s) => (
              <div key={s.step} className="rounded-xl overflow-hidden" style={{ border: `1.5px solid ${s.accent}22`, background: '#fff' }}>
                <div className="h-1" style={{ background: s.done ? s.accent : '#e2e8f0' }} />
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white flex-shrink-0"
                           style={{ background: s.done ? s.accent : '#cbd5e1' }}>
                        {s.done ? '✓' : s.step}
                      </div>
                      <p className="text-xs font-extrabold" style={{ color: '#0f172a' }}>{s.label}</p>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: s.done ? `${s.accent}15` : '#fff7ed', color: s.done ? s.accent : '#d97706' }}>
                      {s.comment}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed mb-2" style={{ color: '#475569' }}>{s.desc}</p>
                  <div className="flex items-center gap-1 mb-2" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                    <span className="text-[9px]">📍</span>
                    <p className="text-[10px] font-bold" style={{ color: s.accent }}>{s.where}</p>
                  </div>
                  {s.action && (
                    <button onClick={s.action}
                      className="w-full py-1.5 rounded-lg text-[11px] font-bold text-white transition-all mt-1"
                      style={{ background: `linear-gradient(135deg, ${s.accent}, ${s.accent}cc)` }}>
                      → {s.actionLabel}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <div key={i} className="card p-4 overflow-hidden relative">
            <div className="absolute -right-3 -top-3 h-14 w-14 rounded-full opacity-[0.07] blur-lg" style={{ background: k.color }} />
            <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-3"
                 style={{ background: `linear-gradient(135deg, ${k.bg}, ${k.color}22)`, boxShadow: `0 4px 12px ${k.color}20` }}>
              <k.icon className="h-4.5 w-4.5" style={{ color: k.color }} />
            </div>
            <p className="kpi-label mb-1">{k.label}</p>
            <p className="text-base font-extrabold" style={{ color: k.color, letterSpacing: '-0.02em' }}>
              {(k.value || 0).toLocaleString()} F
            </p>
          </div>
        ))}
      </div>

      {/* Frais de scolarité card — merges what used to be separate
          "inscription" and "scolarité" cards, plus the enrollment threshold
          status (is_enrolled is a single computed flag now, no more split). */}
      {(() => {
        const isPartial = tuitionPaid > 0 && tuitionBalance > 0;
        const color      = summary.is_enrolled ? '#059669' : isPartial ? '#d97706' : '#7c3aed';
        const bg         = summary.is_enrolled ? '#d1fae5' : isPartial ? '#fef3c7' : '#ede9fe';
        const pct        = tuitionTotal > 0 ? Math.min(100, Math.round((tuitionPaid / tuitionTotal) * 100)) : 0;

        // Facture non soldée (pour le bouton Acompte)
        const openInvoiceId = unpaidInvoices[0]?.id || null;

        return (
          <div className="card p-5 overflow-hidden relative" style={{ border: `1.5px solid ${color}30` }}>
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-[0.06] blur-xl" style={{ background: color }} />

            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: `linear-gradient(135deg, ${bg}, ${color}22)`, boxShadow: `0 4px 12px ${color}20` }}>
                  <Award className="h-4.5 w-4.5" style={{ color }} />
                </div>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide" style={{ color: '#475569' }}>Frais de scolarité</p>
                  <p className="text-lg font-extrabold mt-0.5" style={{ color, letterSpacing: '-0.02em' }}>
                    {tuitionTotal > 0 ? `${tuitionTotal.toLocaleString()} F` : 'Non configuré'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                      style={{ background: summary.is_enrolled ? '#d1fae5' : '#fef3c7', color: summary.is_enrolled ? '#059669' : '#d97706' }}>
                  {summary.is_enrolled ? 'Inscrit ✓' : `Non inscrit — reste ${summary.enroll_remaining.toLocaleString()} F pour le seuil`}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            {tuitionTotal > 0 && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[11px] font-semibold" style={{ color: '#64748b' }}>
                    Payé : <strong style={{ color }}>{tuitionPaid.toLocaleString()} F</strong>
                  </span>
                  <span className="text-[11px] font-bold" style={{ color }}>{pct}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                       style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }} />
                </div>
                {!summary.is_enrolled && summary.min_enrollment_payment > 0 && (
                  <p className="text-[11px] mt-1.5 font-semibold" style={{ color: '#d97706' }}>
                    Seuil d&apos;inscription : {summary.min_enrollment_payment.toLocaleString()} F
                  </p>
                )}
                {tuitionBalance > 0 ? (
                  <p className="text-[11px] mt-1.5 font-semibold" style={{ color: '#94a3b8' }}>
                    Reste à payer : <span style={{ color: '#ef4444', fontWeight: 700 }}>{tuitionBalance.toLocaleString()} F</span>
                  </p>
                ) : (
                  <p className="text-[11px] mt-1.5 font-semibold" style={{ color: '#059669' }}>
                    Soldé ✓ — aucun reste à payer
                  </p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              {/* Créer facture + payer (quand aucune facture n'existe encore) */}
              {activeInvoicesList.length === 0 && (
                <button
                  onClick={() => {
                    setInvoiceForm({
                      amount: tuitionTotal > 0 ? String(tuitionTotal) : '',
                      amountMode: tuitionTotal > 0 ? 'bareme' : 'custom',
                      paid_now: '',
                      method: 'cash',
                      notes: 'Frais de scolarité',
                    });
                    setInvoiceError('');
                    setShowInvoiceModal(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white transition-all"
                  style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, boxShadow: `0 2px 8px ${color}30` }}>
                  <Plus className="h-3.5 w-3.5" /> Créer &amp; Payer
                </button>
              )}

              {/* Acompte : paiement partiel sur facture existante */}
              {tuitionBalance > 0 && openInvoiceId && (
                <button
                  onClick={() => {
                    setPayForm({ invoice_id: openInvoiceId, amount: '', method_id: 'cash' });
                    setShowPayModal(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', boxShadow: '0 2px 8px rgba(217,119,6,0.3)' }}>
                  <CreditCard className="h-3.5 w-3.5" /> Payer un acompte
                </button>
              )}

              {/* Nouvelle facture (facture existe mais tout est soldé et il reste un solde à couvrir) */}
              {activeInvoicesList.length > 0 && tuitionBalance > 0 && !openInvoiceId && (
                <button
                  onClick={() => {
                    setInvoiceForm({
                      amount: String(tuitionBalance),
                      amountMode: 'custom',
                      paid_now: '',
                      method: 'cash',
                      notes: 'Frais de scolarité (complément)',
                    });
                    setInvoiceError('');
                    setShowInvoiceModal(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white transition-all"
                  style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
                  <Plus className="h-3.5 w-3.5" /> Payer le reste
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Échéancier de scolarité — per-installment breakdown, only shown when
          a schedule is actually configured for this student's site/niveau */}
      {echeancierData?.has_schedule && (() => {
        const STATUS_META = {
          PAYE:      { label: 'Payé',       color: '#059669', bg: '#d1fae5', icon: CheckCircle },
          PARTIEL:   { label: 'Partiel',    color: '#d97706', bg: '#fef3c7', icon: Clock },
          EN_RETARD: { label: 'En retard',  color: '#dc2626', bg: '#fee2e2', icon: AlertCircle },
          A_VENIR:   { label: 'À venir',    color: '#64748b', bg: '#f1f5f9', icon: Calendar },
        };
        return (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#ede9fe' }}>
                  <CalendarClock className="h-4.5 w-4.5" style={{ color: '#7c3aed' }} />
                </div>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide" style={{ color: '#475569' }}>Échéancier de scolarité</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#94a3b8' }}>
                    {(echeancierData.cumulative_paid || 0).toLocaleString('fr-FR')} F payé sur {(echeancierData.total || 0).toLocaleString('fr-FR')} F
                  </p>
                </div>
              </div>
              {echeancierData.echeance_override && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
                  Admission autorisée
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {echeancierData.installments.map((inst) => {
                const meta = STATUS_META[inst.status] || STATUS_META.A_VENIR;
                return (
                  <div key={inst.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl flex-wrap"
                       style={{ border: '1px solid #f1f5f9' }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: meta.bg }}>
                        <meta.icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: '#1e293b' }}>{inst.label}</p>
                        <p className="text-[10px]" style={{ color: '#94a3b8' }}>
                          Échéance : {new Date(inst.due_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <p className="text-xs font-extrabold" style={{ color: '#1e293b' }}>{(inst.amount || 0).toLocaleString('fr-FR')} F</p>
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap" style={{ background: meta.bg, color: meta.color }}>
                        {meta.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Enrollment status banner */}
      <div className="flex items-center gap-3 p-4 rounded-2xl"
           style={summary.is_enrolled
             ? { background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1.5px solid #bbf7d0' }
             : { background: 'linear-gradient(135deg, #fff7ed, #fef3c7)', border: '1.5px solid #fde68a' }}>
        <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
             style={{ background: summary.is_enrolled ? '#059669' : '#d97706' }}>
          {summary.is_enrolled
            ? <CheckCircle className="h-4.5 w-4.5 text-white" />
            : <AlertCircle className="h-4.5 w-4.5 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: summary.is_enrolled ? '#065f46' : '#92400e' }}>
            {summary.is_enrolled ? 'Inscription validée — seuil de scolarité atteint' : 'Non inscrit — seuil de scolarité non atteint'}
          </p>
          <p className="text-xs" style={{ color: summary.is_enrolled ? '#047857' : '#b45309' }}>
            {summary.is_enrolled
              ? 'L\'étudiant peut être inscrit en classe (onglet Parcours) et le reste de la scolarité peut être réglé.'
              : `Régler au moins ${summary.min_enrollment_payment.toLocaleString()} F de la scolarité (reste ${summary.enroll_remaining.toLocaleString()} F) pour débloquer l'inscription en classe.`}
          </p>
        </div>
        {!summary.is_enrolled && (
          <button onClick={() => openInvoiceModal()}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', boxShadow: '0 2px 8px rgba(217,119,6,0.3)' }}>
            <Plus className="h-3.5 w-3.5" /> Créer facture de scolarité
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#f8fafc' }}>
        {tabs.map(tab => (
          <button key={tab.id}
            onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
            className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
            style={activeTab === tab.id
              ? { background: '#fff', color: C.color, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }
              : { color: '#94a3b8' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Summary */}
      {activeTab === 'summary' && (
        <div className="space-y-2">
          {invoicesList.length === 0 ? (
            <EmptyState icon={FileText} color={C.color} bg={C.iconBg} title="Aucun frais enregistré" />
          ) : paginatedSummary.map((invoice) => {
            const isPaid = invoice.status === 'PAID';
            const isPartial = invoice.status === 'PARTIAL';
            const paidAmt = parseFloat(invoice.amount_paid || 0);
            const totalAmt = parseFloat(invoice.total || 0);
            const pct = totalAmt > 0 ? Math.min(100, Math.round((paidAmt / totalAmt) * 100)) : 0;
            return (
              <div key={invoice.id} className="rounded-xl overflow-hidden transition-all"
                   style={{ border: '1.5px solid #f1f5f9' }}
                   onMouseEnter={e => e.currentTarget.style.borderColor = `${C.color}30`}
                   onMouseLeave={e => e.currentTarget.style.borderColor = '#f1f5f9'}>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                         style={{ background: isPaid ? '#d1fae5' : isPartial ? '#fef3c7' : '#fee2e2' }}>
                      <FileText className="h-3.5 w-3.5" style={{ color: isPaid ? '#059669' : isPartial ? '#d97706' : '#ef4444' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: '#1e293b' }}>
                        {getInvoiceLabel(invoice)}
                      </p>
                      <p className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>
                        {invoice.invoice_number || invoice.id}
                        {invoice.issue_date && <span className="ml-2">{new Date(invoice.issue_date).toLocaleDateString('fr-FR')}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <div className="text-right">
                      <p className="text-xs font-extrabold" style={{ color: '#1e293b' }}>
                        {totalAmt.toLocaleString('fr-FR')} F
                      </p>
                      {!isPaid && <p className="text-[10px]" style={{ color: '#94a3b8' }}>
                        payé: {paidAmt.toLocaleString('fr-FR')} F
                      </p>}
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
                          style={isPaid
                            ? { background: '#d1fae5', color: '#065f46' }
                            : isPartial
                            ? { background: '#fef3c7', color: '#92400e' }
                            : { background: '#fee2e2', color: '#991b1b' }}>
                      {isPaid ? 'Payé' : isPartial ? 'Partiel' : 'Impayé'}
                    </span>
                  </div>
                </div>
                {!isPaid && (
                  <div className="px-4 pb-2.5">
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
                      <div className="h-full rounded-full transition-all"
                           style={{ width: `${pct}%`, background: isPartial ? '#d97706' : '#e2e8f0' }} />
                    </div>
                    <p className="text-[10px] mt-1" style={{ color: '#94a3b8' }}>{pct}% payé</p>
                  </div>
                )}
              </div>
            );
          })}
          <Pagination currentPage={currentPage} totalPages={totalSummaryPages} onPageChange={setCurrentPage} accentColor={C.color} totalItems={invoicesList.length} itemsPerPage={itemsPerPage} />
        </div>
      )}

      {/* Tab: Invoices */}
      {activeTab === 'invoices' && (
        <div>
          <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher une facture…" color={C.color} />
          {paginatedInvoices.length === 0 ? (
            <EmptyState icon={FileText} color={C.color} bg={C.iconBg} title="Aucune facture trouvée" />
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th className="text-right">Montant</th>
                    <th className="text-right">Payé</th>
                    <th className="text-center">Statut</th>
                    <th className="text-center">Date</th>
                    <th className="text-center">PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="font-mono text-xs">{invoice.invoice_number || invoice.id}</td>
                      <td>
                        <span className="badge" style={{ background: '#dbeafe', color: '#1d4ed8' }}>Scolarité</span>
                      </td>
                      <td style={{ color: '#64748b' }}>{getInvoiceLabel(invoice)}</td>
                      <td className="text-right font-bold">{parseFloat(invoice.total || 0).toLocaleString('fr-FR')} F</td>
                      <td className="text-right" style={{ color: '#059669' }}>{parseFloat(invoice.amount_paid || 0).toLocaleString('fr-FR')} F</td>
                      <td className="text-center">
                        <span className="badge"
                              style={invoice.status === 'PAID'
                                ? { background: '#d1fae5', color: '#065f46' }
                                : invoice.status === 'PARTIAL'
                                ? { background: '#fef3c7', color: '#92400e' }
                                : { background: '#fee2e2', color: '#991b1b' }}>
                          {invoice.status === 'PAID' ? 'Payé' : invoice.status === 'PARTIAL' ? 'Partiel' : 'Impayé'}
                        </span>
                      </td>
                      <td className="text-center text-xs" style={{ color: '#94a3b8' }}>
                        {invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="text-center">
                        <button
                          onClick={() => {
                            const token = localStorage.getItem('access_token') || '';
                            const url = `${API_BASE_URL}/invoices/${invoice.id}/pdf/?token=${encodeURIComponent(token)}`;
                            window.open(url, '_blank');
                          }}
                          className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors mx-auto"
                          style={{ color: '#2563eb' }}
                          onMouseEnter={e => e.currentTarget.style.background='#dbeafe'}
                          onMouseLeave={e => e.currentTarget.style.background='transparent'}
                          title="Télécharger PDF">
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination currentPage={currentPage} totalPages={totalInvoicePages} onPageChange={setCurrentPage} accentColor={C.color} />
        </div>
      )}

      {/* Tab: Payments */}
      {activeTab === 'payments' && (
        <div>
          <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher un versement…" color={C.color} />
          {paginatedPayments.length === 0 ? (
            <EmptyState icon={DollarSign} color={C.color} bg={C.iconBg} title="Aucun versement trouvé" />
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Mode</th>
                    <th className="text-right">Montant</th>
                    <th className="text-center">Statut</th>
                    <th className="text-center">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPayments.map((payment) => {
                    const ok = payment.status === 'VALIDATED' || payment.status === 'SUCCESS';
                    return (
                      <tr key={payment.id}>
                        <td className="font-mono text-xs">{payment.payment_number || payment.id}</td>
                        <td>
                          <span className="badge" style={{ background: '#ede9fe', color: '#6d28d9' }}>
                            {payment.payment_method_name || 'Espèces'}
                          </span>
                        </td>
                        <td className="text-right font-bold" style={{ color: '#059669' }}>
                          +{parseFloat(payment.amount || 0).toLocaleString('fr-FR')} F
                        </td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="badge"
                                  style={ok
                                    ? { background: '#d1fae5', color: '#065f46' }
                                    : payment.status === 'PENDING'
                                    ? { background: '#fef3c7', color: '#92400e' }
                                    : { background: '#fee2e2', color: '#991b1b' }}>
                              {ok ? 'Validé' : payment.status === 'PENDING' ? 'En attente' : 'Rejeté'}
                            </span>
                            {payment.status === 'PENDING' && (
                              <button
                                type="button"
                                title="Annuler ce paiement en attente"
                                onClick={async () => {
                                  if (!window.confirm('Annuler ce paiement en attente ?')) return;
                                  try {
                                    await financeService.deletePayment(payment.id);
                                    refetchPayments();
                                    onDataChanged?.();
                                  } catch { alert('Erreur lors de l\'annulation'); }
                                }}
                                className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold transition-colors hover:bg-red-100"
                                style={{ color: '#dc2626', border: '1px solid #fca5a5' }}>
                                ✕
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="text-center text-xs" style={{ color: '#94a3b8' }}>
                          {payment.payment_date
                            ? new Date(payment.payment_date).toLocaleDateString('fr-FR')
                            : payment.created_at
                            ? new Date(payment.created_at).toLocaleDateString('fr-FR')
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Pagination currentPage={currentPage} totalPages={totalPaymentPages} onPageChange={setCurrentPage} accentColor={C.color} />
        </div>
      )}

      {/* Payment modal */}
      {showPayModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
             style={{ background: 'rgba(8,12,36,0.58)', backdropFilter: 'blur(10px)' }}
             onClick={() => setShowPayModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-scale-in"
               style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.2)' }}
               onClick={e => e.stopPropagation()}>
            <div className="h-1" style={{ background: `linear-gradient(90deg, ${C.color}, ${C.color}80)` }} />
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: `${C.color}18` }}>
                  <DollarSign className="h-4.5 w-4.5" style={{ color: C.color }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: '#0f172a' }}>Enregistrer un paiement</h3>
                  <p className="text-[11px]" style={{ color: '#94a3b8' }}>
                    {student?.full_name || student?.user?.full_name || 'Étudiant'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowPayModal(false)}
                className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors">
                <X className="h-4 w-4" style={{ color: '#94a3b8' }} />
              </button>
            </div>

            {/* Workflow hint */}
            <div className="mx-6 mt-4 p-3 rounded-xl text-[11px]"
                 style={{ background: summary.is_enrolled ? '#f0fdf4' : '#fffbeb', border: `1px solid ${summary.is_enrolled ? '#bbf7d0' : '#fde68a'}` }}>
              {summary.is_enrolled ? (
                <p style={{ color: '#065f46' }}>
                  <span className="font-bold">✓ Inscription validée.</span> Les paiements enregistrés ici couvrent les frais de scolarité.
                </p>
              ) : (
                <p style={{ color: '#92400e' }}>
                  <span className="font-bold">⚠ Seuil d'inscription non atteint.</span> Reste {summary.enroll_remaining.toLocaleString()} F à payer pour débloquer l'inscription en classe.
                </p>
              )}
            </div>

            <form onSubmit={handlePay} className="px-6 py-5 space-y-4">
              {/* Invoice selector */}
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Facture *</label>
                {unpaidInvoices.length === 0 ? (
                  <div className="p-3 rounded-xl text-xs text-center" style={{ background: '#f0fdf4', color: '#059669', border: '1px solid #bbf7d0' }}>
                    Toutes les factures sont réglées ✓
                  </div>
                ) : (
                  <select required value={payForm.invoice_id}
                    onChange={e => {
                      const inv = invoicesList.find(i => i.id === e.target.value);
                      const remaining = inv ? parseFloat(inv.total || 0) - parseFloat(inv.amount_paid || 0) : '';
                      setPayForm(f => ({ ...f, invoice_id: e.target.value, amount: remaining > 0 ? remaining.toString() : '' }));
                    }}
                    className="input-field" style={{ borderColor: C.color + '44' }}>
                    <option value="">Sélectionner une facture…</option>
                    {unpaidInvoices.map(inv => {
                      const remaining = parseFloat(inv.total || 0) - parseFloat(inv.amount_paid || 0);
                      return (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoice_number || inv.id} — Reste: {remaining.toLocaleString('fr-FR')} F
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Montant (FCFA) *</label>
                <input type="number" min="1" step="1" required
                  value={payForm.amount}
                  onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                  className="input-field" placeholder="0"
                  style={{ borderColor: C.color + '44' }} />
              </div>

              {/* Payment method */}
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Mode de paiement *</label>
                <select required value={payForm.method_id}
                  onChange={e => setPayForm(f => ({ ...f, method_id: e.target.value }))}
                  className="input-field" style={{ borderColor: C.color + '44' }}>
                  <option value="">Sélectionner…</option>
                  <option value="cash">Espèces</option>
                  <option value="bank_transfer">Virement bancaire</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="card">Carte bancaire</option>
                  <option value="check">Chèque</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
                <button type="button" onClick={() => setShowPayModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={{ background: '#f1f5f9', color: '#64748b' }}>
                  Annuler
                </button>
                <button type="submit" disabled={paying || unpaidInvoices.length === 0}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${C.color}, ${C.color}cc)`, boxShadow: `0 3px 10px ${C.color}30` }}>
                  {paying ? 'Enregistrement…' : 'Valider le paiement'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Invoice creation modal */}
      {showInvoiceModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
             style={{ background: 'rgba(8,12,36,0.58)', backdropFilter: 'blur(10px)' }}
             onClick={() => setShowInvoiceModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg flex flex-col animate-scale-in"
               style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.2)', maxHeight: '90vh' }}
               onClick={e => e.stopPropagation()}>
            <div className="h-1 flex-shrink-0" style={{ background: 'linear-gradient(90deg, #7c3aed, #6d28d9)' }} />
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: '#f5f3ff' }}>
                  <FileText className="h-4.5 w-4.5" style={{ color: '#7c3aed' }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: '#0f172a' }}>Nouvelle facture</h3>
                  <p className="text-[11px]" style={{ color: '#94a3b8' }}>{student?.full_name || student?.user?.full_name || 'Étudiant'}</p>
                </div>
              </div>
              <button onClick={() => setShowInvoiceModal(false)}
                className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors">
                <X className="h-4 w-4" style={{ color: '#94a3b8' }} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
            <form onSubmit={handleCreateInvoice} className="px-6 pt-5 pb-5 space-y-4">
              {/* Context info */}
              <div className="p-3 rounded-xl text-[11px]" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <p style={{ color: '#1e40af' }}>
                  <strong>Frais de scolarité :</strong> Créer la facture totale, puis régler en plusieurs versements via "Nouveau paiement".
                  L'étudiant est considéré inscrit dès que le cumul payé atteint le seuil d'inscription configuré.
                  Chaque versement est tracé dans l'onglet Versements.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>
                  Montant total (FCFA) *
                </label>
                {tuitionConfigs.length > 0 ? (
                    <div className="space-y-2">
                      <select
                        className="input-field cursor-pointer"
                        value={invoiceForm.amountMode === 'custom' ? 'custom' : (invoiceForm.selectedConfigId || '')}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === 'custom') {
                            setInvoiceForm(f => ({ ...f, amountMode: 'custom', selectedConfigId: '', amount: '' }));
                            return;
                          }
                          const cfg = tuitionConfigs.find(c => c.id === val);
                          const newAmount = cfg ? String(cfg.amount) : '';
                          setInvoiceForm(f => ({
                            ...f,
                            amountMode: 'bareme',
                            selectedConfigId: val,
                            amount: newAmount,
                          }));
                        }}
                        style={{ borderColor: '#c4b5fd' }}>
                        <option value="" disabled>Choisir un barème…</option>
                        {tuitionConfigs.map(cfg => <option key={cfg.id} value={cfg.id}>{_feeConfigLabel(cfg)}</option>)}
                        <option value="custom">Montant personnalisé…</option>
                      </select>
                      {invoiceForm.amountMode === 'custom' && (
                        <input type="number" min="1" step="1" required
                          value={invoiceForm.amount}
                          onChange={e => setInvoiceForm(f => ({ ...f, amount: e.target.value }))}
                          onWheel={e => e.target.blur()}
                          className="input-field" placeholder="Saisir le montant"
                          style={{ borderColor: '#c4b5fd' }} />
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl text-[11px]" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>
                        Aucun barème configuré pour ce site — configurez-en un dans Paramètres &gt; Configuration des
                        frais, ou saisissez un montant ponctuel ci-dessous.
                      </div>
                      <input type="number" min="1" step="1" required
                        value={invoiceForm.amount}
                        onChange={e => setInvoiceForm(f => ({ ...f, amount: e.target.value }))}
                        onWheel={e => e.target.blur()}
                        className="input-field" placeholder="ex: 150000"
                        style={{ borderColor: '#c4b5fd' }} />
                    </div>
                  )}
              </div>

              <div className="rounded-xl overflow-hidden" style={{ border: '1.5px solid #e2e8f0' }}>
                <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <p className="text-xs font-bold" style={{ color: '#475569' }}>Payer maintenant (optionnel)</p>
                  <p className="text-[10px]" style={{ color: '#94a3b8' }}>Laisser vide pour créer la facture sans paiement</p>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Montant versé maintenant (FCFA)</label>
                    <input type="number" min="0" step="1"
                      value={invoiceForm.paid_now}
                      onChange={e => setInvoiceForm(f => ({ ...f, paid_now: e.target.value }))}
                      onWheel={e => e.target.blur()}
                      className="input-field" placeholder="0 = créer sans payer"
                      style={{ borderColor: '#bbf7d0' }} />
                    {invoiceForm.amount && invoiceForm.paid_now && parseFloat(invoiceForm.paid_now) >= parseFloat(invoiceForm.amount) && (
                      <p className="text-[11px] mt-1 font-semibold" style={{ color: '#059669' }}>✓ Paiement intégral — facture soldée immédiatement</p>
                    )}
                  </div>
                  {invoiceForm.paid_now && parseFloat(invoiceForm.paid_now) > 0 && (
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Mode de paiement</label>
                      <select value={invoiceForm.method}
                        onChange={e => setInvoiceForm(f => ({ ...f, method: e.target.value }))}
                        className="input-field" style={{ borderColor: '#bbf7d0' }}>
                        <option value="cash">Espèces</option>
                        <option value="bank_transfer">Virement bancaire</option>
                        <option value="mobile_money">Mobile Money</option>
                        <option value="card">Carte bancaire</option>
                        <option value="check">Chèque</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Notes (optionnel)</label>
                <input type="text"
                  value={invoiceForm.notes}
                  onChange={e => setInvoiceForm(f => ({ ...f, notes: e.target.value }))}
                  className="input-field" placeholder="Observation, référence..."
                  style={{ borderColor: '#c4b5fd' }} />
              </div>

              {invoiceError && (
                <div className="p-3 rounded-xl text-xs" style={{ background: '#fee2e2', color: '#dc2626' }}>
                  {invoiceError}
                </div>
              )}

              <div className="flex gap-3 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
                <button type="button" onClick={() => setShowInvoiceModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={{ background: '#f1f5f9', color: '#64748b' }}>
                  Annuler
                </button>
                <button type="submit" disabled={creatingInvoice}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 3px 10px rgba(124,58,237,0.3)' }}>
                  {creatingInvoice ? 'Création…' : (invoiceForm.paid_now && parseFloat(invoiceForm.paid_now) > 0 ? 'Créer & payer' : 'Créer la facture')}
                </button>
              </div>
            </form>
            </div>{/* end scrollable body */}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// AbsencesSection
// ──────────────────────────────────────────────────────────────────────────────
function AbsencesSection({ studentId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const C = SECTION_COLORS.absences;

  const { data: absences, loading } = useApi(
    () => attendanceService.getAttendances?.({ student: studentId, status: 'ABSENT' }) || Promise.resolve([]),
    [studentId], true
  );

  const absencesList = absences?.results || absences || [];
  const filtered = absencesList.filter(abs =>
    abs.date?.includes(searchTerm) ||
    abs.subject_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return <Spinner color={C.color} />;

  const total = absencesList.length;
  const justified = absencesList.filter(a => a.justified).length;
  const unjustified = total - justified;

  const justifiedPct = total > 0 ? Math.round((justified / total) * 100) : 0;

  return (
    <div>
      <SectionHeader icon={AlertCircle} title="Absences" color={C.color} />

      {/* Stats KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total absences', value: total,       color: C.color,    bg: C.iconBg,   icon: AlertCircle },
          { label: 'Justifiées',     value: justified,   color: '#2563eb',  bg: '#bfdbfe',  icon: CheckCircle },
          { label: 'Non justifiées', value: unjustified, color: '#ef4444',  bg: '#fca5a5',  icon: XCircle },
        ].map((s, i) => (
          <div key={i} className="card p-4 overflow-hidden relative" style={{ border: `1.5px solid ${s.color}18` }}>
            <div className="absolute -right-2 -top-2 h-14 w-14 rounded-full opacity-[0.07] blur-xl" style={{ background: s.color }} />
            <div className="h-9 w-9 rounded-xl flex items-center justify-center mb-2.5"
                 style={{ background: `linear-gradient(135deg, ${s.bg}, ${s.color}22)`, boxShadow: `0 3px 10px ${s.color}20` }}>
              <s.icon className="h-4 w-4" style={{ color: s.color }} />
            </div>
            <p className="text-2xl font-black" style={{ color: s.color, letterSpacing: '-0.02em' }}>{s.value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: '#94a3b8' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-5 p-4 rounded-2xl" style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold" style={{ color: '#475569' }}>Taux de justification</p>
            <p className="text-xs font-bold" style={{ color: justifiedPct >= 50 ? '#059669' : '#ef4444' }}>{justifiedPct}%</p>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
            <div className="h-full rounded-full transition-all"
                 style={{ width: `${justifiedPct}%`, background: justifiedPct >= 50 ? '#059669' : '#ef4444' }} />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px]" style={{ color: '#94a3b8' }}>{justified} justifiée{justified > 1 ? 's' : ''}</span>
            <span className="text-[10px]" style={{ color: '#94a3b8' }}>{unjustified} non justifiée{unjustified > 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher par date ou matière…" color={C.color} />

      {paginated.length === 0 ? (
        <EmptyState icon={AlertCircle} color={C.color} bg={C.iconBg}
          title="Aucune absence enregistrée"
          subtitle="Aucune absence n'a été enregistrée pour cet étudiant" />
      ) : (
        <div className="space-y-2">
          {paginated.map((absence) => {
            const isJustified = absence.justified;
            const absColor = isJustified ? '#2563eb' : '#ef4444';
            const absBg    = isJustified ? '#dbeafe' : '#fee2e2';
            return (
              <div key={absence.id} className="rounded-2xl overflow-hidden transition-all"
                   style={{ border: `1.5px solid ${absBg}` }}
                   onMouseEnter={e => e.currentTarget.style.borderColor=`${absColor}40`}
                   onMouseLeave={e => e.currentTarget.style.borderColor=absBg}>
                <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${absColor}, ${absColor}50)` }} />
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                         style={{ background: `linear-gradient(135deg, ${absBg}, ${absColor}15)`, boxShadow: `0 2px 8px ${absColor}18` }}>
                      <AlertCircle className="h-4.5 w-4.5" style={{ color: absColor }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>
                        {absence.subject_name || absence.class_name || 'Cours non défini'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: '#64748b' }}>
                          <Calendar className="h-3 w-3" />
                          {absence.date ? new Date(absence.date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </span>
                        {absence.session && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                                style={{ background: '#f1f5f9', color: '#64748b' }}>
                            {absence.session}
                          </span>
                        )}
                      </div>
                      {absence.reason && (
                        <p className="text-[11px] mt-0.5 italic" style={{ color: '#94a3b8' }}>{absence.reason}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-3 py-1.5 rounded-xl flex-shrink-0 ml-3"
                        style={{ background: absBg, color: absColor }}>
                    {isJustified ? 'Justifiée' : 'Non justifiée'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} accentColor={C.color}
        totalItems={filtered.length} itemsPerPage={itemsPerPage} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// KpiSection — analyse IA des performances académiques (notes/assiduité/
// ponctualité/tendance/comparaison classe/risque d'échec)
// ──────────────────────────────────────────────────────────────────────────────
const RISK_LABELS = {
  LOW:    { label: 'Faible', color: '#059669', bg: '#d1fae5' },
  MEDIUM: { label: 'Moyen',  color: '#d97706', bg: '#fef3c7' },
  HIGH:   { label: 'Élevé',  color: '#ef4444', bg: '#fee2e2' },
};

const RISK_COMPONENT_LABELS = {
  academic: 'Académique', attendance: 'Assiduité',
  punctuality: 'Ponctualité', trend: 'Tendance',
};

function KpiSection({ studentId }) {
  const C = SECTION_COLORS.analyse;
  const [refreshing, setRefreshing] = useState(false);

  const { data, loading, execute: refetch } = useApi(
    () => studentsService.getKpiAnalysis(studentId), [studentId], true
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await studentsService.getKpiAnalysis(studentId, { refresh: 'true' });
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return <Spinner color={C.color} />;

  if (!data?.kpis) {
    return (
      <div>
        <SectionHeader icon={TrendingUp} title="Analyse IA" color={C.color} />
        <EmptyState icon={TrendingUp} color={C.color} bg={C.iconBg}
          title="Analyse indisponible"
          subtitle="Aucun semestre courant n'est configuré pour calculer les KPI de cet étudiant." />
      </div>
    );
  }

  const { kpis, trend, risk, ai_summary, ai_generated_at, semester } = data;
  const risk_info = RISK_LABELS[risk?.level] || RISK_LABELS.LOW;
  const avg = kpis.grade_global_average;

  return (
    <div>
      <SectionHeader icon={TrendingUp} title="Analyse IA" color={C.color}>
        <button onClick={handleRefresh} disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
          style={{ background: C.color }}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Génération…' : 'Régénérer'}
        </button>
      </SectionHeader>

      {semester && (
        <p className="text-xs font-semibold mb-4" style={{ color: '#94a3b8' }}>
          {semester.label} — {semester.academic_year}
        </p>
      )}

      {/* Score cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Moyenne générale', value: avg != null ? `${avg.toFixed(2)}/20` : '—', color: avg != null && avg >= 10 ? '#059669' : '#ef4444', bg: '#d1fae5' },
          { label: 'Taux de présence', value: kpis.attendance_rate != null ? `${kpis.attendance_rate}%` : '—', color: '#2563eb', bg: '#bfdbfe' },
          { label: 'Taux de ponctualité', value: kpis.late_rate != null ? `${(100 - kpis.late_rate).toFixed(1)}%` : '—', color: '#7c3aed', bg: '#ede9fe' },
        ].map((s, i) => (
          <div key={i} className="card p-4" style={{ border: `1.5px solid ${s.color}18` }}>
            <p className="text-2xl font-black" style={{ color: s.color, letterSpacing: '-0.02em' }}>{s.value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: '#94a3b8' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Risk gauge */}
      {risk && (
        <div className="mb-5 p-4 rounded-2xl" style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold" style={{ color: '#475569' }}>Risque d'échec</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: risk_info.bg, color: risk_info.color }}>
              {risk_info.label} — {risk.score}/100
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${risk.score}%`, background: risk_info.color }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            {Object.entries(risk.components || {}).map(([k, v]) => (
              <div key={k} className="text-center">
                <p className="text-xs font-bold" style={{ color: '#334155' }}>{v}</p>
                <p className="text-[9px]" style={{ color: '#94a3b8' }}>{RISK_COMPONENT_LABELS[k] || k}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trend history */}
      {trend?.history?.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>Progression par semestre</p>
          <div className="space-y-2">
            {trend.history.map(h => (
              <div key={h.semester_id} className="flex items-center gap-3">
                <span className="text-xs w-32 flex-shrink-0 truncate" style={{ color: '#64748b' }}>{h.semester_label}</span>
                <div className="h-2 rounded-full overflow-hidden flex-1" style={{ background: '#e2e8f0' }}>
                  <div className="h-full rounded-full" style={{ width: `${h.average != null ? (h.average / 20) * 100 : 0}%`, background: C.color }} />
                </div>
                <span className="text-xs font-bold w-20 flex-shrink-0 text-right" style={{ color: '#334155' }}>
                  {h.average != null ? `${h.average.toFixed(2)}/20` : '—'}{h.rank ? ` (${h.rank}${trend.class_total_students ? `/${trend.class_total_students}` : ''}e)` : ''}
                </span>
              </div>
            ))}
          </div>
          {trend.class_average != null && (
            <p className="text-[11px] mt-2" style={{ color: '#94a3b8' }}>
              Moyenne de la classe ce semestre : {trend.class_average.toFixed(2)}/20
              {trend.class_rank ? ` — rang ${trend.class_rank}/${trend.class_total_students}` : ''}
            </p>
          )}
        </div>
      )}

      {/* Weak subjects */}
      {kpis.weak_subjects?.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>Matières à renforcer</p>
          <div className="flex flex-wrap gap-2">
            {kpis.weak_subjects.map((s, i) => (
              <span key={i} className="text-xs font-semibold px-3 py-1.5 rounded-xl" style={{ background: '#fee2e2', color: '#ef4444' }}>
                {s.subject_name} — {s.average}/20
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI narrative */}
      <div className="p-4 rounded-2xl" style={{ background: C.bg, border: `1.5px solid ${C.color}30` }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.color }}>Synthèse et recommandations IA</p>
        {ai_summary ? (
          <p className="text-sm whitespace-pre-wrap" style={{ color: '#334155', lineHeight: 1.7 }}>{ai_summary}</p>
        ) : (
          <p className="text-sm" style={{ color: '#94a3b8' }}>Aucune analyse générée pour le moment.</p>
        )}
        <p className="text-[10px] mt-3" style={{ color: '#94a3b8' }}>
          {ai_generated_at ? `Généré le ${new Date(ai_generated_at).toLocaleString('fr-FR')}` : 'Pas encore généré'}
        </p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// DocumentsSection — unified GED docs + student files
// ──────────────────────────────────────────────────────────────────────────────
function DocumentsSection({ studentId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState('ged');
  const [uploadGed, setUploadGed] = useState({ title: '', document_type: 'OTHER', file: null });
  const [uploadFichier, setUploadFichier] = useState({ title: '', file_type: 'OTHER', file: null });
  const itemsPerPage = 12;
  const C = SECTION_COLORS.documents;
  const Cf = SECTION_COLORS.fichiers;

  const { data: docsData, loading: loadingDocs, execute: refetchDocs } = useApi(
    () => documentsService.getAll?.({ student: studentId }) || Promise.resolve([]),
    [studentId], true
  );
  const { data: filesData, loading: loadingFiles, execute: refetchFiles } = useApi(
    () => studentsService.getFiles(studentId).catch(() => Promise.resolve([])),
    [studentId], true
  );

  const loading = loadingDocs || loadingFiles;
  const docsList = (docsData?.results || docsData || []).map(d => ({ ...d, _source: 'ged' }));
  const filesList = (filesData?.results || filesData || []).map(f => ({ ...f, _source: 'fichier' }));
  const allItems = [...docsList, ...filesList].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  const filtered = allItems.filter(item => {
    const t = searchTerm.toLowerCase();
    return item.title?.toLowerCase().includes(t) || item.name?.toLowerCase().includes(t) ||
           item.document_type?.toLowerCase().includes(t) || item.file_type?.toLowerCase().includes(t);
  });
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const refetch = () => { refetchDocs(); refetchFiles(); };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      if (uploadType === 'ged') {
        if (!uploadGed.file) return;
        await documentsService.upload(uploadGed.file, {
          title: uploadGed.title || uploadGed.file.name,
          document_type: uploadGed.document_type,
          student: studentId,
        });
        setUploadGed({ title: '', document_type: 'OTHER', file: null });
      } else {
        if (!uploadFichier.file) return;
        const formData = new FormData();
        formData.append('file', uploadFichier.file);
        formData.append('title', uploadFichier.title || uploadFichier.file.name);
        formData.append('file_type', uploadFichier.file_type);
        await studentsService.addFile(studentId, formData);
        setUploadFichier({ title: '', file_type: 'OTHER', file: null });
      }
      setShowUploadModal(false);
      refetch();
    } catch { alert('Erreur lors du téléchargement'); }
    finally { setUploading(false); }
  };

  const handleDownload = async (item) => {
    if (item._source === 'ged') {
      try {
        const blob = await documentsService.download(item.id);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = item.title || 'document';
        document.body.appendChild(a); a.click();
        window.URL.revokeObjectURL(url); document.body.removeChild(a);
      } catch { alert('Erreur lors du téléchargement'); }
    } else {
      if (item.file_url || item.file) window.open(item.file_url || item.file, '_blank');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Supprimer ce document ?')) return;
    try {
      if (item._source === 'ged') { await documentsService.delete(item.id); refetchDocs(); }
      else { await studentFilesService.delete(item.id); refetchFiles(); }
    } catch {}
  };

  const docTypeLabels = {
    'ID_CARD': "Carte d'identité", 'PASSPORT': 'Passeport', 'BIRTH_CERTIFICATE': 'Acte de naissance',
    'DIPLOMA': 'Diplôme', 'TRANSCRIPT': 'Relevé de notes', 'REPORT_CARD': 'Bulletin',
    'CERTIFICATE': 'Certificat', 'ATTESTATION': 'Attestation', 'PHOTO': 'Photo',
    'MEDICAL': 'Document médical', 'OTHER': 'Autre',
  };
  const fileTypeLabels = {
    'PHOTO': 'Photo', 'PROFILE_PHOTO': 'Photo de profil', 'ID_DOCUMENT': "Pièce d'identité",
    'CERTIFICATE': 'Certificat', 'REPORT': 'Rapport', 'BULLETIN': 'Bulletin',
    'NOTE': 'Note', 'MEDICAL': 'Document médical', 'OTHER': 'Autre',
  };
  const statusStyle = {
    'VALIDATED': { background: '#d1fae5', color: '#065f46', label: 'Validé' },
    'REJECTED':  { background: '#fee2e2', color: '#991b1b', label: 'Rejeté' },
    'PENDING':   { background: '#fef3c7', color: '#92400e', label: 'En attente' },
  };
  const getFileIconAndColor = (item) => {
    const ext = (item.file || '').split('.').pop()?.toLowerCase();
    if (['jpg','jpeg','png','gif'].includes(ext)) return { Icon: ImageIcon, color: '#db2777', bg: '#fce7f3' };
    if (ext === 'pdf') return { Icon: FileText, color: '#ef4444', bg: '#fee2e2' };
    if (['doc','docx'].includes(ext)) return { Icon: FileText, color: '#2563eb', bg: '#dbeafe' };
    if (['xls','xlsx'].includes(ext)) return { Icon: FileText, color: '#059669', bg: '#d1fae5' };
    return { Icon: File, color: Cf.color, bg: Cf.iconBg };
  };

  const currentFile = uploadType === 'ged' ? uploadGed.file : uploadFichier.file;

  if (loading) return <Spinner color={C.color} />;

  return (
    <div>
      <SectionHeader icon={FileText} title="Documents & Fichiers" color={C.color}>
        <div className="flex items-center gap-2">
          <button onClick={refetch}
            className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ border: '1.5px solid #e2e8f0' }}
            onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}>
            <RefreshCw className="h-3.5 w-3.5" style={{ color: '#64748b' }} />
          </button>
          <button onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all"
            style={{ background: C.color }}
            onMouseEnter={e => { e.currentTarget.style.opacity='0.88'; e.currentTarget.style.transform='translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity='1'; e.currentTarget.style.transform='none'; }}>
            <Upload className="h-3.5 w-3.5" /> Ajouter
          </button>
        </div>
      </SectionHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: C.bg, border: `1.5px solid ${C.color}20` }}>
          <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: C.iconBg }}>
            <FileText className="h-4 w-4" style={{ color: C.color }} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: C.color }}>Documents GED</p>
            <p className="text-lg font-black" style={{ color: '#0f172a' }}>{docsList.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: Cf.bg, border: `1.5px solid ${Cf.color}20` }}>
          <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: Cf.iconBg }}>
            <Folder className="h-4 w-4" style={{ color: Cf.color }} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: Cf.color }}>Fichiers dossier</p>
            <p className="text-lg font-black" style={{ color: '#0f172a' }}>{filesList.length}</p>
          </div>
        </div>
      </div>

      <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher un document ou fichier…" color={C.color} />

      {paginated.length === 0 ? (
        <EmptyState icon={FileText} color={C.color} bg={C.iconBg}
          title="Aucun document trouvé"
          subtitle="Cliquez sur «Ajouter» pour télécharger un document ou fichier" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {paginated.map((item) => {
            const isGed = item._source === 'ged';
            const accentColor = isGed ? C.color : Cf.color;
            const accentBg    = isGed ? C.bg    : Cf.bg;
            const { Icon, color: fileColor, bg: fileBg } = isGed
              ? { Icon: FileText, color: C.color, bg: C.iconBg }
              : getFileIconAndColor(item);
            const label = isGed
              ? (docTypeLabels[item.document_type] || item.document_type)
              : (fileTypeLabels[item.file_type] || item.file_type);
            const st = isGed ? (statusStyle[item.status] || statusStyle['PENDING']) : null;
            return (
              <div key={`${item._source}-${item.id}`}
                className="rounded-2xl overflow-hidden group transition-all"
                style={{ border: '1.5px solid #f1f5f9' }}
                onMouseEnter={e => e.currentTarget.style.borderColor=`${accentColor}35`}
                onMouseLeave={e => e.currentTarget.style.borderColor='#f1f5f9'}>
                {/* Color stripe */}
                <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}44)` }} />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0"
                         style={{ background: `linear-gradient(135deg, ${fileBg}, ${fileColor}18)`, boxShadow: `0 3px 10px ${fileColor}20` }}>
                      <Icon className="h-5 w-5" style={{ color: fileColor }} />
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#1e293b' }}>{item.title || item.name}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: accentBg, color: accentColor }}>
                          {isGed ? 'GED' : 'Fichier'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full"
                              style={{ background: '#f1f5f9', color: '#64748b' }}>{label}</span>
                        {isGed && st && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={st}>{st.label}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        {item.created_at && (
                          <span className="text-[10px] flex items-center gap-1" style={{ color: '#94a3b8' }}>
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(item.created_at).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                        {!isGed && item.size && (
                          <span className="text-[10px]" style={{ color: '#94a3b8' }}>{(item.size/1024).toFixed(1)} KB</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Actions — always visible */}
                  <div className="flex items-center justify-end gap-1.5 mt-3 pt-3" style={{ borderTop: '1px solid #f8fafc' }}>
                    <button onClick={() => handleDownload(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                      style={{ color: accentColor, background: accentBg }}
                      onMouseEnter={e => { e.currentTarget.style.opacity='0.8'; e.currentTarget.style.transform='translateY(-1px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity='1'; e.currentTarget.style.transform='none'; }}>
                      <Download className="h-3 w-3" /> Télécharger
                    </button>
                    <button onClick={() => handleDelete(item)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
                      style={{ color: '#ef4444' }}
                      onMouseEnter={e => e.currentTarget.style.background='#fee2e2'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}
                      title="Supprimer">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} accentColor={C.color}
        totalItems={filtered.length} itemsPerPage={itemsPerPage} />

      {showUploadModal && (
        <ModalBackdrop>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
               style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.2)' }}>
            <div className="h-1" style={{ background: `linear-gradient(90deg, ${C.color}, ${Cf.color})` }} />
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center"
                     style={{ background: `linear-gradient(135deg, ${C.iconBg}, ${C.color}22)` }}>
                  <Upload className="h-4 w-4" style={{ color: C.color }} />
                </div>
                <h3 className="text-base font-bold" style={{ color: '#0f172a' }}>Ajouter un document</h3>
              </div>
              <button onClick={() => setShowUploadModal(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
                onMouseEnter={e => e.currentTarget.style.background='#fee2e2'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <X className="h-4 w-4" style={{ color: '#64748b' }} />
              </button>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              {/* Upload type toggle */}
              <div className="flex rounded-xl overflow-hidden" style={{ border: '1.5px solid #e2e8f0' }}>
                <button type="button" onClick={() => setUploadType('ged')}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold transition-all"
                  style={uploadType === 'ged'
                    ? { background: C.color, color: '#fff' }
                    : { background: 'transparent', color: '#64748b' }}>
                  <FileText className="h-3.5 w-3.5" /> Document GED
                </button>
                <button type="button" onClick={() => setUploadType('fichier')}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold transition-all"
                  style={uploadType === 'fichier'
                    ? { background: Cf.color, color: '#fff' }
                    : { background: 'transparent', color: '#64748b' }}>
                  <Folder className="h-3.5 w-3.5" /> Fichier dossier
                </button>
              </div>

              <div>
                <label className="form-label">Titre</label>
                <input type="text"
                  value={uploadType === 'ged' ? uploadGed.title : uploadFichier.title}
                  onChange={e => uploadType === 'ged'
                    ? setUploadGed({ ...uploadGed, title: e.target.value })
                    : setUploadFichier({ ...uploadFichier, title: e.target.value })}
                  className="input-field" placeholder="Nom du document" />
              </div>

              <div>
                <label className="form-label">Type</label>
                {uploadType === 'ged' ? (
                  <select value={uploadGed.document_type}
                    onChange={e => setUploadGed({ ...uploadGed, document_type: e.target.value })}
                    className="input-field cursor-pointer">
                    <optgroup label="Documents académiques">
                      <option value="TRANSCRIPT">Relevé de notes</option>
                      <option value="REPORT_CARD">Bulletin</option>
                      <option value="DIPLOMA">Diplôme</option>
                      <option value="CERTIFICATE">Certificat</option>
                      <option value="ATTESTATION">Attestation</option>
                    </optgroup>
                    <optgroup label="Documents d'identité">
                      <option value="ID_CARD">Carte d'identité</option>
                      <option value="PASSPORT">Passeport</option>
                      <option value="BIRTH_CERTIFICATE">Acte de naissance</option>
                    </optgroup>
                    <optgroup label="Autres">
                      <option value="PHOTO">Photo</option>
                      <option value="MEDICAL">Document médical</option>
                      <option value="OTHER">Autre</option>
                    </optgroup>
                  </select>
                ) : (
                  <select value={uploadFichier.file_type}
                    onChange={e => setUploadFichier({ ...uploadFichier, file_type: e.target.value })}
                    className="input-field cursor-pointer">
                    <optgroup label="Photos">
                      <option value="PHOTO">Photo</option>
                      <option value="PROFILE_PHOTO">Photo de profil</option>
                    </optgroup>
                    <optgroup label="Documents académiques">
                      <option value="BULLETIN">Bulletin</option>
                      <option value="NOTE">Note</option>
                      <option value="CERTIFICATE">Certificat</option>
                      <option value="REPORT">Rapport</option>
                    </optgroup>
                    <optgroup label="Autres">
                      <option value="ID_DOCUMENT">Pièce d'identité</option>
                      <option value="MEDICAL">Document médical</option>
                      <option value="OTHER">Autre</option>
                    </optgroup>
                  </select>
                )}
              </div>

              <div>
                <label className="form-label">Fichier *</label>
                <label className="flex flex-col items-center justify-center py-6 rounded-xl cursor-pointer transition-colors"
                  style={{
                    border: `2px dashed ${currentFile ? (uploadType === 'ged' ? C.color : Cf.color) : '#e2e8f0'}`,
                    background: currentFile ? (uploadType === 'ged' ? C.bg : Cf.bg) : '#fafafa',
                  }}>
                  <input type="file"
                    onChange={e => uploadType === 'ged'
                      ? setUploadGed({ ...uploadGed, file: e.target.files[0] })
                      : setUploadFichier({ ...uploadFichier, file: e.target.files[0] })}
                    className="hidden" required />
                  {currentFile ? (
                    <div className="flex items-center gap-2.5"
                         style={{ color: uploadType === 'ged' ? C.color : Cf.color }}>
                      <FileText className="h-7 w-7" />
                      <div>
                        <p className="text-sm font-semibold">{currentFile.name}</p>
                        <p className="text-xs" style={{ color: '#94a3b8' }}>{(currentFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mb-2 opacity-30" style={{ color: '#64748b' }} />
                      <p className="text-xs font-medium" style={{ color: '#64748b' }}>Cliquez pour sélectionner un fichier</p>
                    </>
                  )}
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
                <button type="button" onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold border transition-colors hover:bg-slate-50"
                  style={{ color: '#64748b', borderColor: '#e2e8f0' }}>Annuler</button>
                <button type="submit" disabled={uploading || !currentFile}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                  style={{ background: uploadType === 'ged' ? C.color : Cf.color }}
                  onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.opacity='0.88'; e.currentTarget.style.transform='translateY(-1px)'; }}}
                  onMouseLeave={e => { e.currentTarget.style.opacity='1'; e.currentTarget.style.transform='none'; }}>
                  {uploading ? 'Envoi…' : 'Télécharger'}
                </button>
              </div>
            </form>
          </div>
        </ModalBackdrop>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// CarteSection
// ──────────────────────────────────────────────────────────────────────────────
function GenerateCardModal({ studentName, onConfirm, onClose, generating }) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
         style={{ background: 'rgba(8,12,36,0.60)', backdropFilter: 'blur(12px)' }}
         onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in"
           onClick={e => e.stopPropagation()}>
        {/* Header gradient */}
        <div className="h-1" style={{ background: 'linear-gradient(90deg,#4f46e5,#7c3aed,#4f46e5)' }} />

        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-2xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg,#eef2ff,#c7d2fe)', boxShadow: '0 8px 24px rgba(79,70,229,0.18)' }}>
              <CreditCard className="h-8 w-8" style={{ color: '#4f46e5' }} />
            </div>
          </div>

          {/* Text */}
          <h3 className="text-lg font-extrabold text-center" style={{ color: '#0f172a' }}>
            Générer une carte étudiant
          </h3>
          <p className="text-sm text-center mt-1.5" style={{ color: '#64748b' }}>
            Une nouvelle carte académique sera créée pour
          </p>
          <p className="text-sm font-bold text-center mt-0.5" style={{ color: '#4f46e5' }}>
            {studentName}
          </p>

          {/* Info box */}
          <div className="mt-5 p-4 rounded-xl flex items-start gap-3"
               style={{ background: '#eef2ff', border: '1.5px solid #c7d2fe' }}>
            <div className="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                 style={{ background: '#c7d2fe' }}>
              <span style={{ color: '#4f46e5', fontSize: '11px', fontWeight: 800 }}>i</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#4338ca' }}>
              La carte sera valable pour l'année académique en cours. Un QR code unique sera généré et peut être imprimé.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button onClick={onClose} disabled={generating}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: '#f8fafc', color: '#64748b', border: '1.5px solid #e2e8f0' }}
              onMouseEnter={e => e.currentTarget.style.background='#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.background='#f8fafc'}>
              Annuler
            </button>
            <button onClick={onConfirm} disabled={generating}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 4px 14px rgba(79,70,229,0.35)' }}
              onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.opacity='0.9'; }}
              onMouseLeave={e => e.currentTarget.style.opacity='1'}>
              {generating ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Génération…</>
              ) : (
                <><CreditCard className="h-4 w-4" /> Générer la carte</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function CarteSection({ studentId, cards: initialCards, student }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const itemsPerPage = 5;
  const C = SECTION_COLORS.carte;

  const { data: cardsData, loading, execute: refetch } = useApi(
    () => studentCardsService.getAll({ student: studentId }).catch(() => Promise.resolve(initialCards || [])),
    [studentId], true
  );

  const cardsList = cardsData?.results || cardsData || initialCards || [];
  const filtered = cardsList.filter(card =>
    card.card_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.academic_year_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleGenerateCard = async () => {
    setGenerating(true);
    try { await studentsService.generateCard(studentId, {}); refetch(); setShowGenerateModal(false); }
    catch { alert('Erreur lors de la génération de la carte'); }
    finally { setGenerating(false); }
  };

  const handlePrintCard = (card) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head>
        <title>Carte Étudiant - ${card.card_number}</title>
        <style>
          body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f3f4f6; }
          .card { width: 340px; height: 215px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 16px; padding: 20px; color: white; box-shadow: 0 10px 40px rgba(79,70,229,0.35); }
          .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px; }
          .logo { font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; opacity: 0.8; }
          .badge { background: ${card.is_valid ? '#4ade80' : '#f87171'}; color: ${card.is_valid ? '#166534' : '#991b1b'}; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; }
          .number { font-family: monospace; font-size: 17px; letter-spacing: 3px; margin-bottom: 14px; opacity: 0.85; }
          .name { font-size: 16px; font-weight: 800; margin-bottom: 3px; }
          .matricule { font-family: monospace; font-size: 11px; opacity: 0.7; }
          .footer { display: flex; justify-content: space-between; margin-top: 14px; }
          .footer-item { font-size: 10px; opacity: 0.75; }
          .footer-label { text-transform: uppercase; font-size: 9px; opacity: 0.55; margin-bottom: 2px; }
          @media print { body { background: white; } }
        </style>
      </head><body>
        <div class="card">
          <div class="header">
            <div class="logo">Carte Étudiant</div>
            <span class="badge">${card.is_valid ? 'VALIDE' : 'EXPIRÉE'}</span>
          </div>
          <div class="number">${card.card_number}</div>
          <div class="name">${student?.user?.full_name || 'Étudiant'}</div>
          <div class="matricule">${student?.matricule || ''}</div>
          ${student?.current_class?.name ? `<div class="matricule" style="margin-top:3px;opacity:0.8">${student.current_class.name}${student.current_class.level_name ? ' · ' + student.current_class.level_name : ''}${student.current_class.program_name ? ' · ' + student.current_class.program_name : ''}</div>` : ''}
          <div class="footer">
            <div><div class="footer-label">Année académique</div><div class="footer-item">${card.academic_year_name || '-'}</div></div>
            <div><div class="footer-label">Expire le</div><div class="footer-item">${card.expiry_date ? new Date(card.expiry_date).toLocaleDateString('fr-FR') : '-'}</div></div>
          </div>
          ${student?.user?.phone || student?.user?.email ? `<div class="footer" style="margin-top:6px;opacity:0.65;font-size:8px">${student?.user?.phone ? '<div>☏ ' + student.user.phone + '</div>' : ''}${student?.user?.email ? '<div>@ ' + student.user.email + '</div>' : ''}</div>` : ''}
        </div>
        <script>setTimeout(() => window.print(), 500);</script>
      </body></html>
    `);
  };

  if (loading) return <Spinner color={C.color} />;

  return (
    <div>
      <SectionHeader icon={CreditCard} title="Cartes étudiant" color={C.color}>
        <div className="flex items-center gap-2">
          <button onClick={refetch}
            className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ border: '1.5px solid #e2e8f0' }}
            onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}>
            <RefreshCw className="h-3.5 w-3.5" style={{ color: '#64748b' }} />
          </button>
          <button onClick={() => setShowGenerateModal(true)} disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50"
            style={{ background: C.color }}
            onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.opacity='0.88'; e.currentTarget.style.transform='translateY(-1px)'; }}}
            onMouseLeave={e => { e.currentTarget.style.opacity='1'; e.currentTarget.style.transform='none'; }}>
            <Plus className="h-3.5 w-3.5" /> Générer
          </button>
          {showGenerateModal && (
            <GenerateCardModal
              studentName={student?.user?.full_name || 'cet étudiant'}
              generating={generating}
              onConfirm={handleGenerateCard}
              onClose={() => setShowGenerateModal(false)}
            />
          )}
        </div>
      </SectionHeader>

      <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Rechercher une carte…" color={C.color} />

      {paginated.length === 0 ? (
        <EmptyState icon={CreditCard} color={C.color} bg={C.iconBg}
          title="Aucune carte émise"
          subtitle="Cliquez sur «Générer» pour créer une carte étudiant" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {paginated.map((card) => (
            <div key={card.id} className="relative group">
              {/* Card visual */}
              <div className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 8px 30px rgba(79,70,229,0.25)' }}>
                <div className="p-5" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}>
                  {/* Top row: label + number + badge */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em]"
                         style={{ color: 'rgba(255,255,255,0.6)' }}>Carte Étudiant</p>
                      {student?.site_name && (
                        <p className="text-[9px] mt-0.5 font-medium truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {student.site_name}
                        </p>
                      )}
                      <p className="font-mono text-sm mt-1 font-bold" style={{ color: 'rgba(255,255,255,0.9)', letterSpacing: '0.06em' }}>
                        {card.card_number}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-3 py-1 rounded-full flex-shrink-0"
                          style={card.is_valid
                            ? { background: '#4ade80', color: '#166534' }
                            : { background: '#f87171', color: '#991b1b' }}>
                      {card.is_valid ? 'Valide' : 'Expirée'}
                    </span>
                  </div>

                  {/* Photo + name */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-14 w-11 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-sm"
                         style={{ background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.9)' }}>
                      {student?.photo
                        ? <img src={student.photo} alt="" className="h-full w-full object-cover" />
                        : <span>{(student?.user?.full_name || 'ET').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold text-white leading-tight">
                        {student?.user?.full_name || 'Étudiant'}
                      </p>
                      <p className="font-mono text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        {student?.matricule}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 10 }}>
                    {/* Classe + Niveau row */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5"
                           style={{ color: 'rgba(255,255,255,0.5)' }}>Classe</p>
                        <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                          {student?.current_class?.name || '—'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5"
                           style={{ color: 'rgba(255,255,255,0.5)' }}>Niveau</p>
                        <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                          {student?.current_class?.level_name || '—'}
                        </p>
                      </div>
                    </div>
                    {/* Année + Expiry row */}
                    <div className="flex justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5"
                           style={{ color: 'rgba(255,255,255,0.5)' }}>Année</p>
                        <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                          {card.academic_year_name || '—'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5"
                           style={{ color: 'rgba(255,255,255,0.5)' }}>Expire le</p>
                        <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                          {card.expiry_date ? new Date(card.expiry_date).toLocaleDateString('fr-FR') : '—'}
                        </p>
                      </div>
                    </div>
                    {(student?.user?.phone || student?.user?.email) && (
                      <div className="flex flex-wrap gap-3 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 7 }}>
                        {student.user?.phone && (
                          <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.65)' }}>
                            ☏ {student.user.phone}
                          </p>
                        )}
                        {student.user?.email && (
                          <p className="text-[9px] truncate" style={{ color: 'rgba(255,255,255,0.65)' }}>
                            @ {student.user.email}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 rounded-2xl flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all"
                   style={{ background: 'rgba(8,12,36,0.55)', backdropFilter: 'blur(4px)' }}>
                <button onClick={() => handlePrintCard(card)}
                  className="h-11 w-11 rounded-xl flex items-center justify-center bg-white transition-colors"
                  style={{ color: C.color }}
                  onMouseEnter={e => e.currentTarget.style.background=C.bg}
                  onMouseLeave={e => e.currentTarget.style.background='#fff'}
                  title="Imprimer">
                  <Printer className="h-5 w-5" />
                </button>
                {card.qr_code_url && (
                  <button onClick={() => window.open(card.qr_code_url, '_blank')}
                    className="h-11 w-11 rounded-xl flex items-center justify-center bg-white transition-colors"
                    style={{ color: C.color }}
                    onMouseEnter={e => e.currentTarget.style.background=C.bg}
                    onMouseLeave={e => e.currentTarget.style.background='#fff'}
                    title="Voir QR Code">
                    <Eye className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} accentColor={C.color} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// ParentsSection
// ──────────────────────────────────────────────────────────────────────────────
function ParentsSection({ studentId, initialParents }) {
  const { notify } = useNotifications();
  const [parents, setParents] = useState(initialParents || []);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    relationship: 'GUARDIAN', profession: '',
  });

  // Edit state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '', phone: '', relationship: 'GUARDIAN' });
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [editing, setEditing] = useState(false);

  // Reset password state
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const C = SECTION_COLORS.parents;

  const RELATION_LABELS = {
    FATHER:      'Père',
    MOTHER:      'Mère',
    GUARDIAN:    'Tuteur légal',
    UNCLE:       'Oncle',
    AUNT:        'Tante',
    GRANDPARENT: 'Grand-parent',
    SIBLING:     'Frère / Sœur',
    OTHER:       'Autre',
  };

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const tmp = 'Campus2026!';
      const parent = await parentsService.create({
        user_data: {
          first_name: form.first_name, last_name: form.last_name,
          email: form.email, phone: form.phone || '',
          password: tmp, password_confirm: tmp, user_type: 'PARENT',
        },
        relationship: form.relationship,
        profession: form.profession || '',
      });
      await studentsService.linkParent(studentId, { parent_id: parent.id });
      const updated = await studentsService.getDossier(studentId);
      setParents(updated.parents || []);
      setShowAddModal(false);
      setForm({ first_name: '', last_name: '', email: '', phone: '', relationship: 'GUARDIAN', profession: '' });
    } catch (err) {
      notify(err.message || 'Erreur lors de la création', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async (sp) => {
    if (!window.confirm(`Dissocier ${sp.parent_name} ?`)) return;
    try {
      await studentsService.unlinkParent(studentId, sp.parent);
      setParents(p => p.filter(x => x.id !== sp.id));
    } catch { notify('Erreur lors de la dissociation', 'error'); }
  };

  const handleOpenEdit = async (sp) => {
    setEditTarget(sp);
    setShowEditModal(true);
    setLoadingEdit(true);
    try {
      const details = await parentsService.getById(sp.parent);
      setEditForm({
        first_name: details.user?.first_name || details.first_name || '',
        last_name:  details.user?.last_name  || details.last_name  || '',
        email:      sp.parent_email || details.user?.email || '',
        phone:      sp.parent_phone || details.user?.phone || '',
        relationship: sp.relationship || 'GUARDIAN',
      });
    } catch {
      const parts = (sp.parent_name || '').split(' ');
      setEditForm({
        first_name:   parts[0] || '',
        last_name:    parts.slice(1).join(' ') || '',
        email:        sp.parent_email || '',
        phone:        sp.parent_phone || '',
        relationship: sp.relationship || 'GUARDIAN',
      });
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditing(true);
    try {
      await parentsService.update(editTarget.parent, {
        user_data: {
          first_name: editForm.first_name,
          last_name:  editForm.last_name,
          email:      editForm.email,
          phone:      editForm.phone,
        },
        relationship: editForm.relationship,
      });
      const updated = await studentsService.getDossier(studentId);
      setParents(updated.parents || []);
      setShowEditModal(false);
    } catch (err) {
      const raw = err?.message || err?.detail || '';
      let msg = 'Erreur lors de la modification';
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const lines = Object.entries(parsed).map(([k, v]) =>
          `${k}: ${Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? Object.values(v).flat().join(', ') : v}`
        );
        if (lines.length) msg = lines.join('\n');
      } catch { if (raw) msg = raw; }
      notify(msg, 'error');
    } finally {
      setEditing(false);
    }
  };

  const setEF = (k, v) => setEditForm(f => ({ ...f, [k]: v }));

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetTarget || resetPassword.length < 6) return;
    setResetting(true);
    try {
      await parentsService.resetPassword(resetTarget.parent, resetPassword);
      notify(`Mot de passe de ${resetTarget.parent_name} réinitialisé avec succès.`, 'success');
      setResetTarget(null);
      setResetPassword('');
    } catch (err) {
      notify(err?.response?.data?.detail || 'Erreur lors de la réinitialisation', 'error');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div>
      <SectionHeader icon={Users} title="Parents & Responsables" color={C.color}>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all"
          style={{ background: C.color }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none'; }}>
          <Plus className="h-3.5 w-3.5" /> Ajouter un parent
        </button>
      </SectionHeader>

      {parents.length === 0 ? (
        <EmptyState icon={Users} color={C.color} bg={C.iconBg}
          title="Aucun parent enregistré"
          subtitle="Ajoutez les parents ou tuteurs de cet étudiant" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {parents.map((sp) => (
            <div key={sp.id} className="rounded-2xl overflow-hidden transition-all"
                 style={{ border: '1.5px solid #f1f5f9' }}
                 onMouseEnter={e => e.currentTarget.style.borderColor = `${C.color}40`}
                 onMouseLeave={e => e.currentTarget.style.borderColor = '#f1f5f9'}>
              {/* Header strip */}
              <div className="h-1" style={{ background: `linear-gradient(90deg, ${C.color}, ${C.color}60)` }} />
              <div className="px-4 py-3 flex items-center gap-3"
                   style={{ background: `linear-gradient(135deg, ${C.bg}, ${C.color}06)` }}>
                <div className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                     style={{ background: `linear-gradient(135deg, ${C.color}, ${C.color}bb)`, boxShadow: `0 4px 12px ${C.color}30` }}>
                  {(sp.parent_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: '#0f172a' }}>{sp.parent_name || '—'}</p>
                  <span className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: C.color + '18', color: C.color }}>
                    {RELATION_LABELS[sp.relationship] || sp.relationship || 'Parent'}
                  </span>
                </div>
                <button onClick={() => handleOpenEdit(sp)}
                  className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
                  style={{ color: '#2563eb' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  title="Modifier">
                  <Edit className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => { setResetTarget(sp); setResetPassword(''); }}
                  className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
                  style={{ color: '#d97706' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fef3c7'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  title="Réinitialiser le mot de passe">
                  <KeyRound className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleUnlink(sp)}
                  className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
                  style={{ color: '#ef4444' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  title="Dissocier">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {/* Contact details */}
              <div className="p-4 space-y-2.5">
                {sp.parent_phone && (
                  <div className="flex items-center gap-2.5 text-xs">
                    <div className="h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#f1f5f9' }}>
                      <Phone className="h-3 w-3" style={{ color: '#64748b' }} />
                    </div>
                    <span style={{ color: '#475569' }}>{sp.parent_phone}</span>
                  </div>
                )}
                {sp.parent_email && (
                  <div className="flex items-center gap-2.5 text-xs">
                    <div className="h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#f1f5f9' }}>
                      <Mail className="h-3 w-3" style={{ color: '#64748b' }} />
                    </div>
                    <span className="truncate" style={{ color: '#475569' }}>{sp.parent_email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {sp.is_primary && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: '#dbeafe', color: '#1d4ed8' }}>
                      Contact principal
                    </span>
                  )}
                  {sp.can_pickup && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: '#d1fae5', color: '#065f46' }}>
                      Peut récupérer
                    </span>
                  )}
                  {sp.receives_notifications && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: '#ede9fe', color: '#5b21b6' }}>
                      Reçoit notifications
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add parent modal */}
      {showAddModal && (
        <ModalBackdrop>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
               onClick={e => e.stopPropagation()}>
            <div className="h-1" style={{ background: `linear-gradient(90deg, ${C.color}, ${C.color}80)`, borderRadius: '16px 16px 0 0' }} />
            <div className="flex items-center justify-between px-6 py-4"
                 style={{ borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(180deg,#fafbff,#fff)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: '#0f172a' }}>Nouveau parent / tuteur</h3>
                <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Créer un compte parent et l'associer à cet étudiant</p>
              </div>
              <button onClick={() => setShowAddModal(false)}
                className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors">
                <X className="h-4 w-4" style={{ color: '#94a3b8' }} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Prénom <span style={{ color: '#ef4444' }}>*</span></label>
                  <input required className="input-field" placeholder="Jean" value={form.first_name} onChange={e => setF('first_name', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Nom <span style={{ color: '#ef4444' }}>*</span></label>
                  <input required className="input-field" placeholder="Kouassi" value={form.last_name} onChange={e => setF('last_name', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="form-label">Email <span style={{ color: '#ef4444' }}>*</span></label>
                <input required type="email" className="input-field" placeholder="parent@email.com" value={form.email} onChange={e => setF('email', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Téléphone</label>
                <input type="tel" className="input-field" placeholder="+225 XX XX XX XX" value={form.phone} onChange={e => setF('phone', e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Relation</label>
                  <select className="input-field cursor-pointer" value={form.relationship} onChange={e => setF('relationship', e.target.value)}>
                    {Object.entries(RELATION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Profession</label>
                  <input className="input-field" placeholder="Ex: Commerçant" value={form.profession} onChange={e => setF('profession', e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                  style={{ border: '1.5px solid #e2e8f0', color: '#64748b' }}>Annuler</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                  style={{ background: `linear-gradient(135deg, ${C.color}, ${C.color}cc)` }}>
                  {saving ? 'Création…' : 'Créer & Associer'}
                </button>
              </div>
            </form>
          </div>
        </ModalBackdrop>
      )}

      {/* Edit parent modal */}
      {showEditModal && (
        <ModalBackdrop>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
               onClick={e => e.stopPropagation()}>
            <div className="h-1" style={{ background: `linear-gradient(90deg, #2563eb, #2563eb80)`, borderRadius: '16px 16px 0 0' }} />
            <div className="flex items-center justify-between px-6 py-4"
                 style={{ borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(180deg,#fafbff,#fff)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: '#0f172a' }}>Modifier le parent</h3>
                <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{editTarget?.parent_name}</p>
              </div>
              <button onClick={() => setShowEditModal(false)}
                className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors">
                <X className="h-4 w-4" style={{ color: '#94a3b8' }} />
              </button>
            </div>

            {loadingEdit ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 rounded-full border-[3px] animate-spin"
                     style={{ borderColor: '#bfdbfe', borderTopColor: '#2563eb' }} />
              </div>
            ) : (
              <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Prénom <span style={{ color: '#ef4444' }}>*</span></label>
                    <input required className="input-field" placeholder="Jean"
                      value={editForm.first_name} onChange={e => setEF('first_name', e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Nom <span style={{ color: '#ef4444' }}>*</span></label>
                    <input required className="input-field" placeholder="Kouassi"
                      value={editForm.last_name} onChange={e => setEF('last_name', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Email <span style={{ color: '#ef4444' }}>*</span></label>
                  <input required type="email" className="input-field" placeholder="parent@email.com"
                    value={editForm.email} onChange={e => setEF('email', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Téléphone</label>
                  <input type="tel" className="input-field" placeholder="+225 XX XX XX XX"
                    value={editForm.phone} onChange={e => setEF('phone', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Relation</label>
                  <select className="input-field cursor-pointer"
                    value={editForm.relationship} onChange={e => setEF('relationship', e.target.value)}>
                    {Object.entries(RELATION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
                  <button type="button" onClick={() => setShowEditModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                    style={{ border: '1.5px solid #e2e8f0', color: '#64748b' }}>Annuler</button>
                  <button type="submit" disabled={editing}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                    {editing ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </ModalBackdrop>
      )}

      {/* Reset password modal */}
      {resetTarget && (
        <ModalBackdrop>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="h-1" style={{ background: 'linear-gradient(90deg,#d97706,#f59e0b)', borderRadius: '16px 16px 0 0' }} />
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" style={{ color: '#d97706' }} />
                <h3 className="text-sm font-bold" style={{ color: '#0f172a' }}>Réinitialiser le mot de passe</h3>
              </div>
              <button onClick={() => setResetTarget(null)} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors">
                <X className="h-4 w-4" style={{ color: '#94a3b8' }} />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-5 space-y-4">
              <p className="text-xs" style={{ color: '#64748b' }}>
                Nouveau mot de passe pour <strong>{resetTarget.parent_name}</strong> ({resetTarget.parent_email})
              </p>
              <div>
                <label className="form-label">Nouveau mot de passe</label>
                <input
                  type="text"
                  className="input-field font-mono"
                  placeholder="Min. 6 caractères"
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setResetTarget(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                  style={{ border: '1.5px solid #e2e8f0', color: '#64748b' }}>Annuler</button>
                <button type="submit" disabled={resetting || resetPassword.length < 6}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#d97706,#b45309)' }}>
                  {resetting ? 'En cours…' : 'Réinitialiser'}
                </button>
              </div>
            </form>
          </div>
        </ModalBackdrop>
      )}
    </div>
  );
}
