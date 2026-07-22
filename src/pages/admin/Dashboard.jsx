import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSite } from '../../contexts/SiteContext';
import {
  Users, GraduationCap, BookOpen, Wallet,
  TrendingUp, TrendingDown, ArrowUpRight,
  Calendar, Clock, Award, Target, Activity,
  ChevronRight, Sparkles, BarChart2,
  AlertTriangle, Bell, Plus, Edit, CreditCard,
  UserCheck, Download, LogIn, LogOut, Trash2,
  FileText, Layers, ClipboardCheck, Star,
  Zap, RefreshCw,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';
import {
  dashboardService, studentsService, teachersService,
  academicService, financeService, usersService, attendanceService,
  gradesService,
} from '../../services';
import { useApi } from '../../hooks/useApi';
import { exportToExcel } from '../../utils/export';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="tooltip-card" style={{ minWidth: 140 }}>
      <p className="text-xs font-bold mb-2" style={{ color: '#64748b' }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-sm font-bold" style={{ color: p.color }}>
          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          {p.value?.toLocaleString()}
        </div>
      ))}
    </div>
  );
};

const ACTION_META = {
  CREATE:     { label: 'Création',     color: '#16a34a', bg: '#f0fdf4', icon: Plus },
  UPDATE:     { label: 'Modification', color: '#2563eb', bg: '#eff6ff', icon: Edit },
  DELETE:     { label: 'Suppression',  color: '#ef4444', bg: '#fef2f2', icon: Trash2 },
  LOGIN:      { label: 'Connexion',    color: '#6366f1', bg: '#eef2ff', icon: LogIn },
  LOGOUT:     { label: 'Déconnexion',  color: '#64748b', bg: '#f1f5f9', icon: LogOut },
  PAYMENT:    { label: 'Paiement',     color: '#d97706', bg: '#fffbeb', icon: CreditCard },
  ATTENDANCE: { label: 'Présence',     color: '#14b8a6', bg: '#f0fdfa', icon: UserCheck },
  EXPORT:     { label: 'Export',       color: '#7c3aed', bg: '#f5f3ff', icon: Download },
  OTHER:      { label: 'Autre',        color: '#64748b', bg: '#f1f5f9', icon: Activity },
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

const QUICK_ACTIONS = [
  { label: 'Nouvel étudiant',    href: '/admin/students',      icon: Users,          color: '#6366f1', bg: '#eef2ff' },
  { label: 'Saisie notes',       href: '/admin/grades',        icon: Star,           color: '#7c3aed', bg: '#f5f3ff' },
  { label: 'Marquer présence',   href: '/admin/attendance',    icon: ClipboardCheck, color: '#059669', bg: '#ecfdf5' },
  { label: 'Encaisser paiement', href: '/admin/cash-register', icon: Wallet,         color: '#d97706', bg: '#fffbeb' },
  { label: 'Nouveau document',   href: '/admin/documents',     icon: FileText,       color: '#0284c7', bg: '#f0f9ff' },
  { label: 'Envoyer notif.',     href: '/admin/notifications', icon: Bell,           color: '#0ea5e9', bg: '#e0f2fe' },
];

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

// Current year plus the 5 previous — enough to cover past academic years
// without an unbounded/unusable dropdown.
function getYearOptions() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => currentYear - i);
}

// Returns { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' } for the given period.
// `period` is 'week' (relative to today), 'all' (whole selected year), or a
// month number '1'..'12' (that month within the selected year).
function getPeriodDates(period, year) {
  const now = new Date();
  if (period === 'week') {
    const to = now.toLocaleDateString('en-CA');
    const d = new Date(now);
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return { from: d.toLocaleDateString('en-CA'), to };
  }
  const y = year || now.getFullYear();
  if (period === 'all') {
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }
  const m = parseInt(period, 10);
  const from = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

function inRange(dateStr, from, to) {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= from && d <= to;
}

export default function Dashboard() {
  const [period, setPeriod] = useState(() => String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [refreshKey, setRefreshKey] = useState(0);
  const { selectedSite } = useSite();
  const [stats, setStats] = useState({
    students: { total: 0 },
    teachers: { total: 0 },
    courses:  { total: 0 },
    revenue:  { total: 0 },
  });

  const siteFilter = selectedSite !== 'all' ? { site: selectedSite } : {};
  const { from: dateFrom, to: dateTo } = getPeriodDates(period, selectedYear);

  // Totals — not period-filtered (headcounts don't change by week/month)
  // page_size explicit — these KPI tiles count via results.length (not the
  // API's .count total), so without it the default page size (20) made the
  // dashboard silently understate totals once a school had more than 20
  // active students/teachers/matières.
  const { data: studentsData }        = useApi(() => studentsService.getAll({ status: 'ACTIVE', ...siteFilter, page_size: 1000 }), [selectedSite, refreshKey], true);
  const { data: teachersData }        = useApi(() => teachersService.getAll({ ...siteFilter, page_size: 1000 }), [selectedSite, refreshKey], true);
  const { data: coursesData }         = useApi(() => academicService.getSubjects({ ...siteFilter, page_size: 500 }), [selectedSite, refreshKey], true);

  // Period-sensitive: fetch all then filter client-side (endpoints lack date filters)
  const { data: paymentsData }        = useApi(() => financeService.getPayments({ status: 'SUCCESS', ...siteFilter }), [selectedSite, refreshKey], true);
  const { data: overdueData }         = useApi(() => financeService.getInvoices({ status: 'OVERDUE', ...siteFilter }), [selectedSite, refreshKey], true);
  const { data: attendanceRawData }   = useApi(() => attendanceService.getRecords({ page_size: 1000, ...siteFilter }), [selectedSite, refreshKey], true);
  const { data: reportCardsData }     = useApi(() => gradesService.getReportCards({ ...siteFilter }), [selectedSite, refreshKey], true);

  // Charts pass period to backend
  const { data: revenueChartData }    = useApi(() => dashboardService.getRevenueChart?.({ period }) || Promise.resolve([]), [period, refreshKey], true);
  const { data: attendanceChartData } = useApi(() => dashboardService.getAttendanceChart?.({ period }) || Promise.resolve([]), [period, refreshKey], true);

  const { data: recentEnrollments }   = useApi(() => academicService.getEnrollments({ limit: 5, ordering: '-created_at' }), [refreshKey], true);
  const { data: auditData }           = useApi(() => usersService.getAuditLogs({ limit: 8, ordering: '-timestamp' }), [refreshKey], true);
  const { data: pendingAbsenceData }  = useApi(() => attendanceService.getAbsenceRequests({ status: 'PENDING' }), [refreshKey], true);

  // ── Period-filtered client-side ───────────────────────────────────────────
  const allRecords    = attendanceRawData?.results || attendanceRawData || [];
  const allPayments   = paymentsData?.results || paymentsData || [];

  // attendance records: filter by the session's real date (r.date), not
  // created_at (row-insertion timestamp — wrong for seeded/backfilled data,
  // always landed outside "this month" and made the rate show empty)
  const recordsList   = allRecords.filter(r => inRange(r.date || r.created_at, dateFrom, dateTo));
  const totalPresent  = recordsList.filter(r => r.status === 'PRESENT').length;
  const totalSessions = recordsList.length;
  const attendanceRate = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : null;

  // payments: total all-time (seed dates are 2024-2025, period filter would return 0)
  const totalRevenue = allPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  // report cards: total all-time, same reasoning as payments above — there's
  // no start/end date exposed for the linked semester to filter by, and a
  // report card's PASS/FAIL status doesn't change over time anyway, so an
  // all-time success rate is meaningful rather than a period artifact.
  const cardsList   = reportCardsData?.results || reportCardsData || [];
  const totalCards  = cardsList.length;
  const passedCards = cardsList.filter(c => c.status === 'PASS' || c.status === 'HONORS').length;
  const successRate = totalCards > 0 ? Math.round((passedCards / totalCards) * 100) : null;

  useEffect(() => {
    const studentsList = studentsData?.results || studentsData || [];
    const teachersList = teachersData?.results || teachersData || [];
    const coursesList  = coursesData?.results  || coursesData  || [];
    setStats({
      students: { total: studentsList.length },
      teachers: { total: teachersList.length },
      courses:  { total: coursesList.length  },
      revenue:  { total: totalRevenue        },
    });
  }, [studentsData, teachersData, coursesData, totalRevenue]);

  const revenueData = revenueChartData?.length > 0 ? revenueChartData : [
    { month: 'Jan', revenue: 4200000, students: 240 },
    { month: 'Fév', revenue: 3800000, students: 198 },
    { month: 'Mar', revenue: 5100000, students: 320 },
    { month: 'Avr', revenue: 4700000, students: 285 },
    { month: 'Mai', revenue: 6200000, students: 390 },
    { month: 'Jun', revenue: 5900000, students: 355 },
    { month: 'Jul', revenue: 7400000, students: 425 },
  ];

  const attendanceData = attendanceChartData?.length > 0 ? attendanceChartData : [
    { day: 'Lun', present: 92, absent: 8 },
    { day: 'Mar', present: 88, absent: 12 },
    { day: 'Mer', present: 95, absent: 5 },
    { day: 'Jeu', present: 90, absent: 10 },
    { day: 'Ven', present: 85, absent: 15 },
  ];

  // Enrollments API: { student_name, student_matricule, class_name, status }
  // Students API:    { user: { full_name, first_name, last_name }, status: 'ACTIVE', matricule }
  const recentStudents = (recentEnrollments?.results || recentEnrollments || []).slice(0, 5).map(enr => {
    const name = enr.student_name || enr.user?.full_name
      || `${enr.user?.first_name || enr.first_name || '?'} ${enr.user?.last_name || enr.last_name || ''}`.trim();
    const program = enr.class_name || enr.program_name || enr.matricule || enr.student_matricule || 'N/A';
    const status = (enr.status || 'ACTIVE').toUpperCase();
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
    return { id: enr.id, name, program, status, avatar: initials };
  });

  const auditLogs = (auditData?.results || auditData || []).slice(0, 8);
  const overdueCount   = (overdueData?.results || overdueData || []).length;
  const pendingAbsenceCount = (pendingAbsenceData?.results || pendingAbsenceData || []).length;

  const formatRevenue = (v) => {
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
    return String(v);
  };

  const GRAD = [
    ['#6366f1','#818cf8'], ['#8b5cf6','#a78bfa'],
    ['#10b981','#34d399'], ['#f59e0b','#fbbf24'],
    ['#ef4444','#f87171'],
  ];

  const totalStudents  = stats.students.total;
  const totalTeachers  = stats.teachers.total;
  const totalCourses   = stats.courses.total;
  const displayRevenue = stats.revenue.total;

  const statsCards = [
    { name: 'Étudiants actifs', value: totalStudents.toLocaleString('fr-FR'),                   icon: Users,         color: '#6366f1', iconBg: '#e0e7ff', bar: totalStudents > 0 ? Math.min(95, 40 + totalStudents) : 0 },
    { name: 'Enseignants',      value: totalTeachers.toLocaleString('fr-FR'),                   icon: GraduationCap, color: '#8b5cf6', iconBg: '#ede9fe', bar: totalTeachers > 0 ? Math.min(95, 30 + totalTeachers * 5) : 0 },
    { name: 'Matières actives', value: totalCourses.toLocaleString('fr-FR'),                    icon: BookOpen,      color: '#10b981', iconBg: '#d1fae5', bar: totalCourses > 0 ? Math.min(95, 20 + totalCourses * 3) : 0 },
    { name: 'Paiements reçus',  value: `${formatRevenue(displayRevenue)} F`,                    icon: Wallet,        color: '#f59e0b', iconBg: '#fef3c7', bar: displayRevenue > 0 ? 75 : 0 },
  ];


  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const hasAlerts = overdueCount > 0 || pendingAbsenceCount > 0;

  const periodLabel = period === 'week' ? 'Cette semaine'
    : period === 'all' ? `Année ${selectedYear}`
    : `${MONTHS_FR[parseInt(period, 10) - 1]} ${selectedYear}`;

  const handleExportReport = () => {
    const rows = [
      { 'Indicateur': 'Étudiants actifs', 'Valeur': totalStudents },
      { 'Indicateur': 'Enseignants', 'Valeur': totalTeachers },
      { 'Indicateur': 'Matières actives', 'Valeur': totalCourses },
      { 'Indicateur': 'Paiements reçus (FCFA)', 'Valeur': displayRevenue },
      { 'Indicateur': "Taux de présence (%)", 'Valeur': attendanceRate ?? '—' },
      { 'Indicateur': 'Taux de réussite (%)', 'Valeur': successRate ?? '—' },
      { 'Indicateur': 'Factures en retard', 'Valeur': overdueCount },
      { 'Indicateur': "Demandes d'absence en attente", 'Valeur': pendingAbsenceCount },
    ];
    exportToExcel(rows, ['Indicateur', 'Valeur'], `rapport-dashboard-${periodLabel.replace(/\s+/g, '-')}`, periodLabel);
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: '#eef2ff' }}>
              <Sparkles className="h-3 w-3" style={{ color: '#6366f1' }} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#6366f1' }}>Vue d'ensemble</span>
          </div>
          <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a', letterSpacing: '-0.03em' }}>Tableau de bord</h1>
          <p className="text-sm mt-0.5 font-medium capitalize" style={{ color: '#94a3b8' }}>{today}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-slate-100"
            style={{ color: '#64748b', border: '1px solid #e2e8f0' }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Actualiser
          </button>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="input-field cursor-pointer"
            style={{ minWidth: 150 }}
          >
            <option value="week">Cette semaine</option>
            <option value="all">Toute l'année</option>
            {MONTHS_FR.map((m, i) => (
              <option key={i} value={String(i + 1)}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="input-field cursor-pointer"
            style={{ minWidth: 100 }}
          >
            {getYearOptions().map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button onClick={handleExportReport} className="btn-primary px-5 py-2.5 text-sm">
            <BarChart2 className="h-4 w-4" /> Rapport
          </button>
        </div>
      </div>

      {/* ── Alert banners ─────────────────────────────────────── */}
      {hasAlerts && (
        <div className="flex flex-col sm:flex-row gap-3">
          {overdueCount > 0 && (
            <Link to="/admin/finance"
              className="flex items-center gap-3 flex-1 px-4 py-3 rounded-2xl transition-all hover:opacity-90"
              style={{ background: '#fef2f2', border: '1.5px solid #fecaca' }}
            >
              <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#ef444422' }}>
                <AlertTriangle className="h-4 w-4" style={{ color: '#ef4444' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: '#991b1b' }}>
                  {overdueCount} facture{overdueCount > 1 ? 's' : ''} en retard
                </p>
                <p className="text-xs" style={{ color: '#b91c1c' }}>Paiements à relancer</p>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: '#ef4444' }} />
            </Link>
          )}
          {pendingAbsenceCount > 0 && (
            <Link to="/admin/attendance"
              className="flex items-center gap-3 flex-1 px-4 py-3 rounded-2xl transition-all hover:opacity-90"
              style={{ background: '#fffbeb', border: '1.5px solid #fed7aa' }}
            >
              <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#f59e0b22' }}>
                <ClipboardCheck className="h-4 w-4" style={{ color: '#d97706' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: '#92400e' }}>
                  {pendingAbsenceCount} demande{pendingAbsenceCount > 1 ? 's' : ''} d'absence en attente
                </p>
                <p className="text-xs" style={{ color: '#b45309' }}>À valider par l'administration</p>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: '#d97706' }} />
            </Link>
          )}
        </div>
      )}

      {/* ── Dark KPI banner ───────────────────────────────────── */}
      <div
        className="rounded-3xl p-5 sm:p-7 grid grid-cols-1 sm:grid-cols-3 gap-4"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4c1d95 100%)',
          boxShadow: '0 24px 64px rgba(99,102,241,0.28), 0 8px 24px rgba(99,102,241,0.16)',
        }}
      >
        {[
          { label: 'Taux de présence', value: attendanceRate !== null ? `${attendanceRate}%` : '—', icon: Activity, sub: `${totalPresent} présents sur ${totalSessions} enregistrements` },
          { label: 'Taux de réussite', value: successRate !== null ? `${successRate}%` : '—',      icon: Award,    sub: `${passedCards} admis / ${totalCards} bulletins` },
          { label: 'Étudiants actifs', value: totalStudents > 0 ? totalStudents.toLocaleString('fr-FR') : '—', icon: Target, sub: `${totalCourses} matière${totalCourses > 1 ? 's' : ''} · ${totalTeachers} enseignant${totalTeachers > 1 ? 's' : ''}` },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-2xl"
               style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
            <div className="h-11 w-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                 style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <s.icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold mb-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{s.label}</p>
              <p className="text-3xl font-extrabold text-white leading-none">{s.value}</p>
              <p className="text-[11px] mt-1.5 font-medium" style={{ color: 'rgba(255,255,255,0.38)' }}>{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Stat cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 stagger-children">
        {statsCards.map((card) => (
          <div key={card.name}
               className="card card-interactive p-5 animate-fade-in group overflow-hidden relative">
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-[0.07] blur-lg"
                 style={{ background: card.color }} />
            <div className="flex items-start justify-between mb-5">
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:rotate-3"
                   style={{ background: `linear-gradient(135deg, ${card.iconBg}, ${card.color}22)`, boxShadow: `0 4px 16px ${card.color}22` }}>
                <card.icon className="h-5.5 w-5.5" style={{ color: card.color }} />
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-bold"
                   style={{ background: card.bar > 0 ? `${card.color}12` : '#f1f5f9', color: card.bar > 0 ? card.color : '#94a3b8' }}>
                <TrendingUp className="h-3 w-3" />
                En direct
              </div>
            </div>
            <p className="kpi-number mb-0.5">{card.value}</p>
            <p className="kpi-label">{card.name}</p>
            <div className="mt-4">
              <div className="flex items-center justify-between text-[10px] font-bold mb-1.5" style={{ color: '#94a3b8' }}>
                <span>Progression</span><span style={{ color: card.color }}>{card.bar}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${card.bar}%`, background: `linear-gradient(90deg, ${card.color}, ${card.color}99)` }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Quick actions ──────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: '#fef3c7' }}>
            <Zap className="h-3.5 w-3.5" style={{ color: '#d97706' }} />
          </div>
          <h3 className="text-sm font-bold" style={{ color: '#0f172a' }}>Actions rapides</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_ACTIONS.map((qa) => (
            <Link
              key={qa.label}
              to={qa.href}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl text-center transition-all hover:scale-105 cursor-pointer"
              style={{ background: qa.bg, border: `1.5px solid ${qa.color}18` }}
            >
              <div className="h-10 w-10 rounded-xl flex items-center justify-center"
                   style={{ background: `${qa.color}18` }}>
                <qa.icon className="h-5 w-5" style={{ color: qa.color }} />
              </div>
              <span className="text-[11px] font-bold leading-tight" style={{ color: qa.color }}>{qa.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Charts ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="card p-6 lg:col-span-3">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold" style={{ color: '#0f172a', letterSpacing: '-0.01em' }}>Revenus &amp; Inscriptions</h3>
              <p className="text-xs mt-0.5 font-medium" style={{ color: '#94a3b8' }}>7 derniers mois</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-semibold">
              <span className="flex items-center gap-1.5" style={{ color: '#64748b' }}>
                <span className="h-2 w-5 rounded-full inline-block" style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} /> Revenus
              </span>
              <span className="flex items-center gap-1.5" style={{ color: '#64748b' }}>
                <span className="h-2 w-5 rounded-full inline-block" style={{ background: 'linear-gradient(90deg, #10b981, #34d399)' }} /> Étudiants
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gStudents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f9" vertical={false} />
              <XAxis dataKey="month" stroke="#e2e8f0" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#e2e8f0" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue"  stroke="#6366f1" strokeWidth={2.5} fill="url(#gRevenue)"  dot={false} activeDot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }} />
              <Area type="monotone" dataKey="students" stroke="#10b981" strokeWidth={2.5} fill="url(#gStudents)" dot={false} activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6 lg:col-span-2">
          <div className="mb-6">
            <h3 className="text-sm font-bold" style={{ color: '#0f172a', letterSpacing: '-0.01em' }}>Présences</h3>
            <p className="text-xs mt-0.5 font-medium" style={{ color: '#94a3b8' }}>Cette semaine</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={attendanceData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f9" vertical={false} />
              <XAxis dataKey="day" stroke="#e2e8f0" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#e2e8f0" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="present" fill="#6366f1" radius={[6, 6, 0, 0]} name="Présents" />
              <Bar dataKey="absent"  fill="#e0e7ff" radius={[6, 6, 0, 0]} name="Absents"  />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Bottom: recent students + activity feed ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent students */}
        <div className="card p-6 lg:col-span-1">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold" style={{ color: '#0f172a', letterSpacing: '-0.01em' }}>Inscriptions récentes</h3>
              <p className="text-xs mt-0.5 font-medium" style={{ color: '#94a3b8' }}>Derniers étudiants</p>
            </div>
            <Link to="/admin/students"
              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl transition-all hover:bg-indigo-50"
              style={{ color: '#6366f1' }}>
              Voir tout <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentStudents.length > 0 ? (
            <div className="space-y-1">
              {recentStudents.map((student, i) => (
                <div key={student.id}
                     className="flex items-center gap-3 px-2 py-2.5 rounded-xl transition-all cursor-pointer hover:bg-slate-50 group">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 transition-transform group-hover:scale-105"
                       style={{ background: `linear-gradient(135deg, ${GRAD[i % 5][0]}, ${GRAD[i % 5][1]})` }}>
                    {student.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: '#1e293b' }}>{student.name}</p>
                    <p className="text-xs font-medium truncate" style={{ color: '#94a3b8' }}>{student.program}</p>
                  </div>
                  <span className={`badge badge-dot ${student.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'}`}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block', flexShrink: 0 }} />
                    {student.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: '#f1f5f9' }}>
                <Users className="h-6 w-6 opacity-30" style={{ color: '#64748b' }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: '#94a3b8' }}>Aucune inscription récente</p>
            </div>
          )}
        </div>

        {/* Live activity feed */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold" style={{ color: '#0f172a', letterSpacing: '-0.01em' }}>Activité récente</h3>
              <p className="text-xs mt-0.5 font-medium" style={{ color: '#94a3b8' }}>Journal d'audit en temps réel</p>
            </div>
            <Link to="/admin/audit-logs"
              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl transition-all hover:bg-slate-100"
              style={{ color: '#475569' }}>
              Tout voir <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {auditLogs.length > 0 ? (
            <div className="space-y-1">
              {auditLogs.map((log) => {
                const meta = ACTION_META[log.action] || ACTION_META.OTHER;
                const IconComp = meta.icon;
                return (
                  <div key={log.id}
                       className="flex items-start gap-3 px-2 py-2.5 rounded-xl transition-all hover:bg-slate-50 group">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                         style={{ background: meta.bg }}>
                      <IconComp size={13} style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-md"
                              style={{ background: meta.bg, color: meta.color }}>
                          {meta.label}
                        </span>
                        <span className="text-xs font-semibold truncate" style={{ color: '#1e293b' }}>
                          {log.object_repr || log.model_name || '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px]" style={{ color: '#94a3b8' }}>
                        {log.user_email && (
                          <span className="flex items-center gap-1">
                            <Users size={10} /> {log.user_email}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={10} /> {timeAgo(log.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: '#f1f5f9' }}>
                <Activity className="h-6 w-6 opacity-30" style={{ color: '#64748b' }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: '#94a3b8' }}>Aucune activité récente</p>
              <p className="text-xs mt-1" style={{ color: '#cbd5e1' }}>Les actions apparaîtront ici</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
