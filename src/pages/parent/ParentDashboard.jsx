import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, GraduationCap, DollarSign, AlertCircle,
  ChevronRight, User, BookOpen, CheckCircle, Clock,
  RefreshCw, TrendingDown
} from 'lucide-react';
import { parentsService } from '../../services/students';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';

const RELATION_LABELS = {
  FATHER: 'Père',
  MOTHER: 'Mère',
  GUARDIAN: 'Tuteur légal',
  OTHER: 'Autre',
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

function StudentCard({ student }) {
  const navigate = useNavigate();
  const balance = parseFloat(student.remaining_balance || 0);
  const paid = parseFloat(student.total_paid || 0);
  const tuition = parseFloat(student.tuition_fee || 0);
  const pct = tuition > 0 ? Math.min(100, Math.round((paid / tuition) * 100)) : 0;
  const isEnrolled = student.registration_fee_paid;

  return (
    <div
      className="card overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1"
      style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
      onClick={() => navigate(`/parent/enfant/${student.id}`)}
    >
      {/* Top colour bar */}
      <div className="h-1.5" style={{ background: isEnrolled ? 'linear-gradient(90deg,#059669,#34d399)' : 'linear-gradient(90deg,#d97706,#fbbf24)' }} />

      <div className="p-5">
        {/* Header: avatar + name */}
        <div className="flex items-center gap-4 mb-4">
          <div className="h-16 w-16 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0"
               style={{ background: 'linear-gradient(135deg,#e0e7ff,#c7d2fe)' }}>
            {student.photo
              ? <img src={student.photo} alt="" className="h-full w-full object-cover" />
              : <User className="h-8 w-8" style={{ color: '#6366f1' }} />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-base truncate" style={{ color: '#0f172a' }}>
              {student.user?.full_name || 'Étudiant'}
            </h3>
            <p className="text-xs font-mono mt-0.5" style={{ color: '#94a3b8' }}>#{student.matricule}</p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isEnrolled ? 'text-emerald-700 bg-emerald-100' : 'text-amber-700 bg-amber-100'
              }`}>
                {isEnrolled ? '✓ Inscrit' : '⏳ Non inscrit'}
              </span>
              {student.current_class && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: '#eef2ff', color: '#6366f1' }}>
                  {student.current_class}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 flex-shrink-0" style={{ color: '#cbd5e1' }} />
        </div>

        {/* Financial progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold" style={{ color: '#64748b' }}>Scolarité payée</p>
            <p className="text-[11px] font-bold" style={{ color: pct === 100 ? '#059669' : '#d97706' }}>
              {pct}%
            </p>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
            <div className="h-full rounded-full transition-all"
                 style={{
                   width: `${pct}%`,
                   background: pct === 100 ? 'linear-gradient(90deg,#059669,#34d399)' : 'linear-gradient(90deg,#d97706,#fbbf24)'
                 }} />
          </div>
          <div className="flex items-center justify-between text-[10px] font-medium" style={{ color: '#94a3b8' }}>
            <span>Payé: {paid.toLocaleString('fr-FR')} F</span>
            {balance > 0 && <span style={{ color: '#ef4444' }}>Reste: {balance.toLocaleString('fr-FR')} F</span>}
            {balance === 0 && tuition > 0 && <span style={{ color: '#059669' }}>✓ Soldé</span>}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-3 grid grid-cols-2 gap-2" style={{ borderTop: '1px solid #f1f5f9' }}>
          {[
            { icon: GraduationCap, label: 'Classe', value: student.current_class || '—', color: '#7c3aed' },
            { icon: BookOpen, label: 'Année', value: student.current_academic_year || '—', color: '#0891b2' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0"
                   style={{ background: `${item.color}15` }}>
                <item.icon className="h-3 w-3" style={{ color: item.color }} />
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>{item.label}</p>
                <p className="text-[11px] font-bold" style={{ color: '#334155' }}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ParentDashboard() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();

  const { data: students, loading, execute: refresh } = useApi(
    () => parentsService.getMyStudents(), [], true
  );

  const studentsList = Array.isArray(students) ? students : (students?.results || []);
  const fullName = user?.full_name || user?.email || 'Parent';

  const totalBalance = studentsList.reduce((s, st) => s + parseFloat(st.remaining_balance || 0), 0);
  const enrolledCount = studentsList.filter(s => s.registration_fee_paid).length;

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Welcome banner */}
      <div className="rounded-2xl p-6 overflow-hidden relative"
           style={{ background: `linear-gradient(135deg, ${workspace.primaryColor} 0%, ${workspace.primaryColor}cc 100%)`, boxShadow: `0 8px 32px ${workspace.primaryColor}40` }}>
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full opacity-10"
             style={{ background: 'radial-gradient(circle, #fff, transparent)' }} />
        <div className="relative z-10">
          <p className="text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Bonjour,</p>
          <h1 className="text-2xl font-extrabold text-white mb-1" style={{ letterSpacing: '-0.02em' }}>
            {fullName}
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Votre espace parent — suivi de {studentsList.length} enfant{studentsList.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* KPIs */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { label: 'Enfants', value: studentsList.length, icon: Users, color: 'rgba(255,255,255,0.9)' },
            { label: 'Inscrits', value: `${enrolledCount}/${studentsList.length}`, icon: CheckCircle, color: '#86efac' },
            { label: 'Reste à payer', value: totalBalance > 0 ? `${totalBalance.toLocaleString('fr-FR')} F` : '—', icon: totalBalance > 0 ? TrendingDown : CheckCircle, color: totalBalance > 0 ? '#fca5a5' : '#86efac' },
          ].map((k, i) => (
            <div key={i} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
              <k.icon className="h-4 w-4 mx-auto mb-1" style={{ color: k.color }} />
              <p className="text-base font-extrabold" style={{ color: k.color }}>{k.value}</p>
              <p className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>{k.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold" style={{ color: '#0f172a' }}>Mes enfants</h2>
          <p className="text-xs" style={{ color: '#94a3b8' }}>Cliquez sur un enfant pour voir son dossier</p>
        </div>
        <button onClick={() => refresh()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
          style={{ background: '#f1f5f9', color: '#64748b' }}>
          <RefreshCw className="h-3.5 w-3.5" /> Actualiser
        </button>
      </div>

      {/* Children grid */}
      {studentsList.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg,#e0e7ff,#c7d2fe)' }}>
            <Users className="h-8 w-8" style={{ color: '#6366f1' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: '#475569' }}>Aucun enfant associé</p>
          <p className="text-xs text-center max-w-xs" style={{ color: '#94a3b8' }}>
            Contactez l'administration pour lier votre compte aux dossiers de vos enfants.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {studentsList.map(student => (
            <StudentCard key={student.id} student={student} />
          ))}
        </div>
      )}
    </div>
  );
}
