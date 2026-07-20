import { FileText, Download, RefreshCw, Paperclip } from 'lucide-react';
import { studentsService } from '../../services/students';
import { useApi } from '../../hooks/useApi';

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="h-10 w-10 rounded-full border-[3px] animate-spin"
           style={{ borderColor: '#f0f9ff', borderTopColor: '#0284c7' }} />
      <p className="text-sm font-semibold" style={{ color: '#64748b' }}>Chargement…</p>
    </div>
  );
}

const FILE_TYPE_COLORS = {
  INSCRIPTION: { color: '#059669', bg: '#f0fdf4' },
  REINSCRIPTION: { color: '#0891b2', bg: '#ecfeff' },
  PAYMENT: { color: '#d97706', bg: '#fffbeb' },
  ABSENCE: { color: '#dc2626', bg: '#fef2f2' },
  DISCIPLINE: { color: '#7c3aed', bg: '#f5f3ff' },
  ACADEMIC: { color: '#6366f1', bg: '#eef2ff' },
  MEDICAL: { color: '#0284c7', bg: '#f0f9ff' },
  DOCUMENT: { color: '#64748b', bg: '#f8fafc' },
  OTHER: { color: '#94a3b8', bg: '#f8fafc' },
};

const FILE_TYPE_LABELS = {
  INSCRIPTION: 'Inscription',
  REINSCRIPTION: 'Réinscription',
  PAYMENT: 'Paiement',
  ABSENCE: 'Absence',
  DISCIPLINE: 'Discipline',
  ACADEMIC: 'Académique',
  MEDICAL: 'Médical',
  DOCUMENT: 'Document',
  OTHER: 'Autre',
};

export default function StudentDocuments() {
  const { data: profile, loading: loadProfile } = useApi(
    () => studentsService.getMe(), [], true
  );
  const studentId = profile?.id;

  const { data: filesData, loading: loadFiles, execute: refresh } = useApi(
    () => studentId ? studentsService.getFiles(studentId) : Promise.resolve([]),
    [studentId], !!studentId
  );

  const files = Array.isArray(filesData) ? filesData : (filesData?.results || []);

  const loading = loadProfile || loadFiles;
  if (loading) return <Spinner />;

  const grouped = {};
  files.forEach(f => {
    const type = f.file_type || 'OTHER';
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(f);
  });

  return (
    <div className="space-y-6 animate-fade-in">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold" style={{ color: '#0f172a' }}>Mes documents</h1>
          <p className="text-sm" style={{ color: '#64748b' }}>
            {files.length} document{files.length !== 1 ? 's' : ''} dans votre dossier
          </p>
        </div>
        <button onClick={() => refresh()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
          style={{ background: '#f1f5f9', color: '#64748b' }}>
          <RefreshCw className="h-3.5 w-3.5" /> Actualiser
        </button>
      </div>

      {files.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)' }}>
            <FileText className="h-8 w-8" style={{ color: '#0284c7' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: '#475569' }}>Aucun document dans votre dossier</p>
          <p className="text-xs" style={{ color: '#94a3b8' }}>Vos documents administratifs apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([type, docs]) => {
            const c = FILE_TYPE_COLORS[type] || FILE_TYPE_COLORS.OTHER;
            const label = FILE_TYPE_LABELS[type] || type;
            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-6 w-6 rounded-lg flex items-center justify-center"
                       style={{ background: c.bg }}>
                    <FileText className="h-3.5 w-3.5" style={{ color: c.color }} />
                  </div>
                  <h2 className="text-sm font-extrabold" style={{ color: '#0f172a' }}>{label}</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: c.bg, color: c.color }}>
                    {docs.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {docs.map(f => (
                    <div key={f.id} className="card p-4 flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                           style={{ background: c.bg }}>
                        <FileText className="h-5 w-5" style={{ color: c.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-extrabold truncate" style={{ color: '#1e293b' }}>{f.title}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {f.academic_year_name && (
                            <span className="text-[10px] font-semibold" style={{ color: '#94a3b8' }}>
                              {f.academic_year_name}
                            </span>
                          )}
                          <span className="text-[10px]" style={{ color: '#94a3b8' }}>
                            {new Date(f.created_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        {f.description && (
                          <p className="text-xs mt-1 truncate" style={{ color: '#64748b' }}>{f.description}</p>
                        )}
                      </div>
                      {f.attachment && (
                        <a href={f.attachment} target="_blank" rel="noopener noreferrer"
                          className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors hover:scale-105"
                          style={{ background: c.bg, color: c.color }}>
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                      {!f.attachment && f.data && Object.keys(f.data).length > 0 && (
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                             style={{ background: '#f1f5f9' }}>
                          <Paperclip className="h-4 w-4" style={{ color: '#94a3b8' }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
