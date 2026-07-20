import { useState } from 'react';
import {
  BarChart3, Users, ClipboardCheck, GraduationCap, Wallet, BookOpen,
} from 'lucide-react';
import { dashboardService } from '../../services';
import { useApi } from '../../hooks/useApi';
import { useSite } from '../../contexts/SiteContext';
import { PageHeader, FilterSelect, ExportMenu } from '../../components/ui/PageHeader';
import { exportToExcel } from '../../utils/export';

const COLOR = '#0891b2';
const COLOR_BG = '#ecfeff';
const COLOR_ICON = '#cffafe';

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function getYearOptions() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => currentYear - i);
}

// month: 'all' or '1'..'12'
function getPeriodDates(month, year) {
  if (month === 'all') return { from: `${year}-01-01`, to: `${year}-12-31` };
  const m = parseInt(month, 10);
  const from = `${year}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(year, m, 0).getDate();
  const to = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

function StatCard({ label, value, color, bg, icon: Icon }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: '#94a3b8' }}>{label}</p>
          <p className="text-lg font-extrabold" style={{ color: '#0f172a' }}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function BreakdownTable({ title, columns, rows }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-2xl p-6 text-center text-sm" style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
        Aucune donnée pour {title}
      </div>
    );
  }
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
      <p className="px-4 pt-4 pb-2 text-sm font-bold" style={{ color: '#0f172a' }}>{title}</p>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {columns.map((c) => (
              <th key={c} className="text-left px-4 py-2 font-medium" style={{ color: '#64748b' }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
              {r.map((cell, j) => (
                <td key={j} className="px-4 py-2" style={{ color: '#334155' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TABS = [
  { id: 'students', label: 'Étudiants', icon: Users },
  { id: 'attendance', label: 'Présences', icon: ClipboardCheck },
  { id: 'grades', label: 'Notes', icon: GraduationCap },
  { id: 'finance', label: 'Finance', icon: Wallet },
  { id: 'elearning', label: 'E-learning', icon: BookOpen },
];

export default function Statistics() {
  const [activeTab, setActiveTab] = useState('students');
  const { selectedSite } = useSite();
  const [month, setMonth] = useState('all');
  const [year, setYear] = useState(new Date().getFullYear());

  const siteFilter = selectedSite !== 'all' ? { site_id: selectedSite } : {};
  const { from, to } = getPeriodDates(month, year);
  const periodLabel = month === 'all' ? `Année ${year}` : `${MONTHS_FR[parseInt(month, 10) - 1]} ${year}`;

  const { data: studentsReport }   = useApi(() => dashboardService.getStudentReport({ ...siteFilter }), [selectedSite], true);
  const { data: attendanceReport } = useApi(() => dashboardService.getAttendanceReport({ ...siteFilter, start_date: from, end_date: to }), [selectedSite, from, to], true);
  const { data: gradesReport }     = useApi(() => dashboardService.getGradesReport({ ...siteFilter }), [selectedSite], true);
  const { data: financeReport }    = useApi(() => dashboardService.getFinanceReport({ ...siteFilter, period: month === 'all' ? 'year' : 'month' }), [selectedSite, month], true);
  const { data: elearningReport }  = useApi(() => dashboardService.getElearningReport({ ...siteFilter, start_date: from, end_date: to }), [selectedSite, from, to], true);

  const fmtN = (v) => (v || 0).toLocaleString('fr-FR');

  const handleExportStudents = () => {
    const s = studentsReport || {};
    const rows = [
      { 'Statistique': 'Total étudiants', 'Valeur': s.total_students || 0 },
      ...(s.by_status || []).map(r => ({ 'Statistique': `Statut: ${r.status}`, 'Valeur': r.count })),
      ...(s.by_gender || []).map(r => ({ 'Statistique': `Genre: ${r.gender}`, 'Valeur': r.count })),
      ...(s.by_class || []).map(r => ({ 'Statistique': `Classe: ${r.class_obj__name || r.class_obj__code}`, 'Valeur': r.count })),
    ];
    exportToExcel(rows, ['Statistique', 'Valeur'], `statistiques-etudiants-${new Date().toISOString().slice(0, 10)}`, 'Étudiants');
  };

  const handleExportAttendance = () => {
    const a = attendanceReport || {};
    const rows = [
      { 'Statistique': 'Total enregistrements', 'Valeur': a.total_records || 0 },
      { 'Statistique': 'Taux de présence (%)', 'Valeur': a.attendance_rate ?? 0 },
      ...(a.by_status || []).map(r => ({ 'Statistique': `Statut: ${r.status}`, 'Valeur': r.count })),
    ];
    exportToExcel(rows, ['Statistique', 'Valeur'], `statistiques-presences-${periodLabel.replace(/\s+/g, '-')}`, 'Présences');
  };

  const handleExportGrades = () => {
    const g = gradesReport || {};
    const rows = [
      { 'Statistique': 'Total bulletins', 'Valeur': g.total_report_cards || 0 },
      { 'Statistique': 'Admis', 'Valeur': g.passed || 0 },
      { 'Statistique': 'Taux de réussite (%)', 'Valeur': g.success_rate ?? 0 },
      { 'Statistique': 'Moyenne générale', 'Valeur': g.average_score ?? 0 },
      ...(g.by_status || []).map(r => ({ 'Statistique': `Statut: ${r.status}`, 'Valeur': r.count })),
      ...(g.by_class || []).map(r => ({ 'Statistique': `Classe: ${r.class_group__name || r.class_group__code}`, 'Valeur': r.count })),
    ];
    exportToExcel(rows, ['Statistique', 'Valeur'], `statistiques-notes-${new Date().toISOString().slice(0, 10)}`, 'Notes');
  };

  const handleExportFinance = () => {
    const f = financeReport || {};
    const rows = [
      { 'Statistique': 'Factures (nombre)', 'Valeur': f.invoices?.count || 0 },
      { 'Statistique': 'Factures (total FCFA)', 'Valeur': f.invoices?.total || 0 },
      { 'Statistique': 'Paiements (nombre)', 'Valeur': f.payments?.count || 0 },
      { 'Statistique': 'Paiements (total FCFA)', 'Valeur': f.payments?.total || 0 },
      ...(f.invoices?.by_status || []).map(r => ({ 'Statistique': `Facture ${r.status}`, 'Valeur': `${r.count} (${fmtN(r.total)} F)` })),
      ...(f.payments?.by_method || []).map(r => ({ 'Statistique': `Paiement ${r.payment_method__name || '—'}`, 'Valeur': `${r.count} (${fmtN(r.total)} F)` })),
    ];
    exportToExcel(rows, ['Statistique', 'Valeur'], `statistiques-finance-${periodLabel.replace(/\s+/g, '-')}`, 'Finance');
  };

  const handleExportElearning = () => {
    const e = elearningReport || {};
    const rows = [
      { 'Statistique': 'Quiz actifs', 'Valeur': e.quizzes?.total_quizzes || 0 },
      { 'Statistique': 'Tentatives', 'Valeur': e.quizzes?.total_attempts || 0 },
      { 'Statistique': 'Réussies', 'Valeur': e.quizzes?.passed || 0 },
      { 'Statistique': 'Taux de réussite (%)', 'Valeur': e.quizzes?.pass_rate ?? 0 },
      { 'Statistique': 'Score moyen (%)', 'Valeur': e.quizzes?.average_score ?? 0 },
      { 'Statistique': 'Leçons actives', 'Valeur': e.lessons?.total_lessons || 0 },
      { 'Statistique': 'Leçons terminées', 'Valeur': e.lessons?.completed || 0 },
      { 'Statistique': 'Taux de complétion (%)', 'Valeur': e.lessons?.completion_rate ?? 0 },
    ];
    exportToExcel(rows, ['Statistique', 'Valeur'], `statistiques-elearning-${periodLabel.replace(/\s+/g, '-')}`, 'E-learning');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={BarChart3} iconColor={COLOR} iconBg={COLOR_ICON}
        title="Statistiques"
        subtitle="Vue d'ensemble complète de tous les modules"
      />

      <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-all border-b-2"
                style={active ? { color: COLOR, borderColor: COLOR, background: COLOR_BG } : { color: '#64748b', borderColor: 'transparent' }}
              >
                <Icon size={15} />{tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-5 space-y-5">
          {(activeTab === 'attendance' || activeTab === 'finance' || activeTab === 'elearning') && (
            <div className="flex flex-wrap items-center gap-3">
              <FilterSelect value={month} onChange={e => setMonth(e.target.value)}>
                <option value="all">Toute l'année</option>
                {MONTHS_FR.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
              </FilterSelect>
              <FilterSelect value={year} onChange={e => setYear(Number(e.target.value))}>
                {getYearOptions().map(y => <option key={y} value={y}>{y}</option>)}
              </FilterSelect>
            </div>
          )}

          {activeTab === 'students' && (
            <>
              <div className="flex justify-end">
                <ExportMenu color={COLOR} onExcel={handleExportStudents} />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total étudiants" value={fmtN(studentsReport?.total_students)} color={COLOR} bg={COLOR_ICON} icon={Users} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <BreakdownTable title="Par statut" columns={['Statut', 'Effectif']}
                  rows={(studentsReport?.by_status || []).map(r => [r.status || '—', fmtN(r.count)])} />
                <BreakdownTable title="Par genre" columns={['Genre', 'Effectif']}
                  rows={(studentsReport?.by_gender || []).map(r => [r.gender || '—', fmtN(r.count)])} />
                <BreakdownTable title="Par classe" columns={['Classe', 'Effectif']}
                  rows={(studentsReport?.by_class || []).map(r => [r.class_obj__name || r.class_obj__code || '—', fmtN(r.count)])} />
              </div>
            </>
          )}

          {activeTab === 'attendance' && (
            <>
              <div className="flex justify-end">
                <ExportMenu color={COLOR} onExcel={handleExportAttendance} />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Enregistrements" value={fmtN(attendanceReport?.total_records)} color={COLOR} bg={COLOR_ICON} icon={ClipboardCheck} />
                <StatCard label="Taux de présence" value={`${attendanceReport?.attendance_rate ?? 0}%`} color="#059669" bg="#d1fae5" icon={ClipboardCheck} />
              </div>
              <BreakdownTable title="Par statut" columns={['Statut', 'Effectif']}
                rows={(attendanceReport?.by_status || []).map(r => [r.status || '—', fmtN(r.count)])} />
            </>
          )}

          {activeTab === 'grades' && (
            <>
              <div className="flex justify-end">
                <ExportMenu color={COLOR} onExcel={handleExportGrades} />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Bulletins" value={fmtN(gradesReport?.total_report_cards)} color={COLOR} bg={COLOR_ICON} icon={GraduationCap} />
                <StatCard label="Admis" value={fmtN(gradesReport?.passed)} color="#059669" bg="#d1fae5" icon={GraduationCap} />
                <StatCard label="Taux de réussite" value={`${gradesReport?.success_rate ?? 0}%`} color="#f59e0b" bg="#fef3c7" icon={GraduationCap} />
                <StatCard label="Moyenne générale" value={gradesReport?.average_score ?? 0} color="#8b5cf6" bg="#ede9fe" icon={GraduationCap} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <BreakdownTable title="Par statut" columns={['Statut', 'Effectif']}
                  rows={(gradesReport?.by_status || []).map(r => [r.status || '—', fmtN(r.count)])} />
                <BreakdownTable title="Par classe" columns={['Classe', 'Effectif', 'Moyenne']}
                  rows={(gradesReport?.by_class || []).map(r => [r.class_group__name || r.class_group__code || '—', fmtN(r.count), (r.avg_score ?? 0).toFixed ? r.avg_score.toFixed(2) : r.avg_score])} />
              </div>
            </>
          )}

          {activeTab === 'finance' && (
            <>
              <div className="flex justify-end">
                <ExportMenu color={COLOR} onExcel={handleExportFinance} />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Factures" value={fmtN(financeReport?.invoices?.count)} color={COLOR} bg={COLOR_ICON} icon={Wallet} />
                <StatCard label="Total facturé" value={`${fmtN(financeReport?.invoices?.total)} F`} color="#64748b" bg="#f1f5f9" icon={Wallet} />
                <StatCard label="Paiements" value={fmtN(financeReport?.payments?.count)} color="#059669" bg="#d1fae5" icon={Wallet} />
                <StatCard label="Total encaissé" value={`${fmtN(financeReport?.payments?.total)} F`} color="#f59e0b" bg="#fef3c7" icon={Wallet} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <BreakdownTable title="Factures par statut" columns={['Statut', 'Nombre', 'Total (F)']}
                  rows={(financeReport?.invoices?.by_status || []).map(r => [r.status || '—', fmtN(r.count), fmtN(r.total)])} />
                <BreakdownTable title="Paiements par méthode" columns={['Méthode', 'Nombre', 'Total (F)']}
                  rows={(financeReport?.payments?.by_method || []).map(r => [r.payment_method__name || '—', fmtN(r.count), fmtN(r.total)])} />
              </div>
            </>
          )}

          {activeTab === 'elearning' && (
            <>
              <div className="flex justify-end">
                <ExportMenu color={COLOR} onExcel={handleExportElearning} />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Quiz actifs" value={fmtN(elearningReport?.quizzes?.total_quizzes)} color={COLOR} bg={COLOR_ICON} icon={BookOpen} />
                <StatCard label="Tentatives" value={fmtN(elearningReport?.quizzes?.total_attempts)} color="#8b5cf6" bg="#ede9fe" icon={BookOpen} />
                <StatCard label="Taux de réussite" value={`${elearningReport?.quizzes?.pass_rate ?? 0}%`} color="#059669" bg="#d1fae5" icon={BookOpen} />
                <StatCard label="Score moyen" value={`${elearningReport?.quizzes?.average_score ?? 0}%`} color="#f59e0b" bg="#fef3c7" icon={BookOpen} />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Leçons actives" value={fmtN(elearningReport?.lessons?.total_lessons)} color={COLOR} bg={COLOR_ICON} icon={BookOpen} />
                <StatCard label="Leçons terminées" value={fmtN(elearningReport?.lessons?.completed)} color="#059669" bg="#d1fae5" icon={BookOpen} />
                <StatCard label="Taux de complétion" value={`${elearningReport?.lessons?.completion_rate ?? 0}%`} color="#f59e0b" bg="#fef3c7" icon={BookOpen} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
