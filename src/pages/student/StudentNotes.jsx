import { useState } from 'react';
import { BookOpen, Award, TrendingUp, RefreshCw, Star } from 'lucide-react';
import { studentsService } from '../../services/students';
import { gradesService } from '../../services/grades';
import { useApi } from '../../hooks/useApi';

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="h-10 w-10 rounded-full border-[3px] animate-spin"
           style={{ borderColor: '#dcfce7', borderTopColor: '#059669' }} />
      <p className="text-sm font-semibold" style={{ color: '#64748b' }}>Chargement…</p>
    </div>
  );
}

const STATUS_COLORS = {
  DRAFT: { label: 'Brouillon', color: '#64748b', bg: '#f8fafc' },
  GENERATED: { label: 'Généré', color: '#0891b2', bg: '#ecfeff' },
  PUBLISHED: { label: 'Publié', color: '#059669', bg: '#f0fdf4' },
};

export default function StudentNotes() {
  const [tab, setTab] = useState('bulletins');

  const { data: profile, loading: loadProfile } = useApi(
    () => studentsService.getMe(), [], true
  );

  const studentId = profile?.id;

  const { data: gradesData, loading: loadGrades } = useApi(
    () => studentId ? gradesService.getGrades({ student: studentId, page_size: 100 }) : Promise.resolve([]),
    [studentId], !!studentId
  );

  const { data: cardsData, loading: loadCards } = useApi(
    () => studentId ? gradesService.getReportCards({ student: studentId, page_size: 50 }) : Promise.resolve([]),
    [studentId], !!studentId
  );

  const grades = Array.isArray(gradesData) ? gradesData : (gradesData?.results || []);
  const cards = Array.isArray(cardsData) ? cardsData : (cardsData?.results || []);

  const avg = grades.length > 0
    ? (grades.reduce((s, g) => s + parseFloat(g.score || 0), 0) / grades.length).toFixed(2)
    : null;

  const publishedCards = cards.filter(c => c.status === 'PUBLISHED');

  if (loadProfile) return <Spinner />;

  const TABS = [
    { id: 'bulletins', label: 'Bulletins', count: publishedCards.length },
    { id: 'notes', label: 'Notes détaillées', count: grades.length },
  ];

  return (
    <div className="space-y-6 animate-fade-in">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold" style={{ color: '#0f172a' }}>Mes notes</h1>
          <p className="text-sm" style={{ color: '#64748b' }}>Bulletins et résultats académiques</p>
        </div>
        {avg && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
               style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0' }}>
            <TrendingUp className="h-4 w-4" style={{ color: '#059669' }} />
            <span className="text-sm font-extrabold" style={{ color: '#059669' }}>
              Moyenne générale : {avg}/20
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#f8fafc', width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
            style={tab === t.id
              ? { background: '#fff', color: '#1e293b', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
              : { color: '#64748b' }}>
            {t.label}
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: tab === t.id ? '#e0e7ff' : '#f1f5f9', color: tab === t.id ? '#4f46e5' : '#94a3b8' }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Bulletins */}
      {tab === 'bulletins' && (
        loadCards ? <Spinner /> :
        publishedCards.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-16 w-16 rounded-2xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)' }}>
              <Award className="h-8 w-8" style={{ color: '#059669' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: '#475569' }}>Aucun bulletin disponible</p>
            <p className="text-xs" style={{ color: '#94a3b8' }}>Vos bulletins apparaîtront ici une fois publiés.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {publishedCards.map(card => {
              const avg = card.average ? parseFloat(card.average) : null;
              const statusInfo = STATUS_COLORS[card.status] || STATUS_COLORS.DRAFT;
              return (
                <div key={card.id} className="card overflow-hidden">
                  <div className="h-1.5" style={{ background: avg >= 10 ? 'linear-gradient(90deg,#059669,#34d399)' : 'linear-gradient(90deg,#dc2626,#f87171)' }} />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-extrabold" style={{ color: '#0f172a' }}>
                          {card.semester_name || `Semestre ${card.semester}`}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                          {card.academic_year_name || ''}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: statusInfo.bg, color: statusInfo.color }}>
                        {statusInfo.label}
                      </span>
                    </div>
                    {avg !== null && (
                      <div className="flex items-center gap-2 mt-4">
                        <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
                             style={{ background: avg >= 10 ? '#f0fdf4' : '#fef2f2' }}>
                          <Star className="h-5 w-5" style={{ color: avg >= 10 ? '#059669' : '#dc2626' }} />
                        </div>
                        <div>
                          <p className="text-2xl font-extrabold" style={{ color: avg >= 10 ? '#059669' : '#dc2626' }}>
                            {avg.toFixed(2)}/20
                          </p>
                          <p className="text-[10px] font-semibold" style={{ color: '#94a3b8' }}>Moyenne générale</p>
                        </div>
                      </div>
                    )}
                    {card.class_name && (
                      <p className="text-xs mt-3 font-semibold" style={{ color: '#64748b' }}>
                        Classe : {card.class_name}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Notes */}
      {tab === 'notes' && (
        loadGrades ? <Spinner /> :
        grades.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-16 w-16 rounded-2xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)' }}>
              <BookOpen className="h-8 w-8" style={{ color: '#059669' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: '#475569' }}>Aucune note disponible</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    {['Matière', 'Catégorie', 'Note', 'Sur', 'Date'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider"
                          style={{ color: '#94a3b8' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grades.map((g, i) => {
                    const score = parseFloat(g.score || 0);
                    const maxScore = parseFloat(g.max_score || 20);
                    const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
                    const color = pct >= 50 ? '#059669' : '#dc2626';
                    return (
                      <tr key={g.id} style={{ borderBottom: '1px solid #f8fafc', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td className="px-4 py-3 text-sm font-semibold" style={{ color: '#1e293b' }}>
                          {g.subject_name || g.subject || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: '#e0e7ff', color: '#4f46e5' }}>
                            {g.category_name || g.category || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-extrabold" style={{ color }}>{g.score}</span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold" style={{ color: '#94a3b8' }}>{g.max_score || 20}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: '#94a3b8' }}>
                          {g.date ? new Date(g.date).toLocaleDateString('fr-FR') : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
