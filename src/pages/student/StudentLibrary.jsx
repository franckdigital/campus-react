import { useState, useEffect } from 'react';
import {
  BookOpen, BookMarked, Search, X, Heart, Download, Eye,
  ExternalLink, ArrowLeft, Star, FileText,
} from 'lucide-react';
import useApi from '../../hooks/useApi';
import elearningService from '../../services/elearning';

const DOC_TYPES = [
  { value: '', label: 'Tous les types' },
  { value: 'BOOK', label: 'Livre' },
  { value: 'ARTICLE', label: 'Article' },
  { value: 'JOURNAL', label: 'Revue' },
  { value: 'THESIS', label: 'Thèse' },
  { value: 'MEMOIR', label: 'Mémoire' },
  { value: 'REPORT', label: 'Rapport' },
  { value: 'ARCHIVE', label: 'Archive' },
  { value: 'COURSE', label: 'Support de cours' },
  { value: 'OTHER', label: 'Autre' },
];

const DOC_COLORS = {
  BOOK: '#7c3aed', ARTICLE: '#059669', JOURNAL: '#db2777', THESIS: '#d97706',
  MEMOIR: '#0ea5e9', REPORT: '#ef4444', ARCHIVE: '#64748b', COURSE: '#10b981', OTHER: '#94a3b8',
};

function DocCard({ doc, onOpen, onToggleFavorite }) {
  const color = DOC_COLORS[doc.doc_type] || '#64748b';
  const typeLabel = DOC_TYPES.find(t => t.value === doc.doc_type)?.label || doc.doc_type;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer"
      onClick={() => onOpen(doc)}>
      <div className="relative aspect-[3/4] bg-gray-50 flex items-center justify-center">
        {doc.cover_image ? (
          <img src={doc.cover_image} alt={doc.title} className="w-full h-full object-cover" />
        ) : (
          <BookMarked size={36} style={{ color: `${color}55` }} />
        )}
        <button onClick={e => { e.stopPropagation(); onToggleFavorite(doc); }}
          className="absolute top-2 right-2 h-7 w-7 rounded-full flex items-center justify-center bg-white/90 shadow-sm">
          <Heart size={14} className={doc.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-gray-300'} />
        </button>
      </div>
      <div className="p-3 space-y-1">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}1a`, color }}>{typeLabel}</span>
        <h3 className="font-semibold text-gray-900 text-sm truncate" title={doc.title}>{doc.title}</h3>
        {doc.authors && <p className="text-xs text-gray-400 truncate">{doc.authors}</p>}
        <div className="flex items-center gap-3 text-[11px] text-gray-400 pt-0.5">
          {doc.year && <span>{doc.year}</span>}
          <span className="flex items-center gap-1"><Eye size={11} />{doc.view_count}</span>
          <span className="flex items-center gap-1"><Download size={11} />{doc.download_count}</span>
        </div>
      </div>
    </div>
  );
}

function DocDetail({ doc, onBack, onToggleFavorite }) {
  const [reading, setReading] = useState(false);
  const [page, setPage] = useState(doc.my_progress?.current_page || 1);
  const [saving, setSaving] = useState(false);
  const color = DOC_COLORS[doc.doc_type] || '#64748b';
  const typeLabel = DOC_TYPES.find(t => t.value === doc.doc_type)?.label || doc.doc_type;

  useEffect(() => {
    elearningService.trackDocumentView(doc.id).catch(() => {});
  }, [doc.id]);

  const handleDownload = async () => {
    try { await elearningService.trackDocumentDownload(doc.id); } catch {}
    if (doc.file) window.open(doc.file, '_blank', 'noopener,noreferrer');
  };

  const handleSaveProgress = async () => {
    setSaving(true);
    try { await elearningService.saveReadingProgress(doc.id, parseInt(page) || 1); }
    catch {} finally { setSaving(false); }
  };

  if (reading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setReading(false)} className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800">
            <ArrowLeft size={16} /> Retour
          </button>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Page actuelle</label>
            <input type="number" min={1} value={page} onChange={e => setPage(e.target.value)}
              className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-xs" />
            <button onClick={handleSaveProgress} disabled={saving}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50" style={{ background: color }}>
              {saving ? 'Enregistrement…' : 'Enregistrer la progression'}
            </button>
          </div>
        </div>
        <iframe src={doc.file} title={doc.title} className="w-full rounded-2xl border border-gray-200" style={{ height: '80vh' }} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800">
        <ArrowLeft size={16} /> Retour à la bibliothèque
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${color}, #9333ea)` }} />
        <div className="p-6 flex flex-col sm:flex-row gap-6">
          <div className="w-32 h-44 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden mx-auto sm:mx-0">
            {doc.cover_image ? (
              <img src={doc.cover_image} alt={doc.title} className="w-full h-full object-cover" />
            ) : (
              <BookMarked size={36} style={{ color: `${color}55` }} />
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}1a`, color }}>{typeLabel}</span>
              {doc.my_progress && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">Page {doc.my_progress.current_page}</span>}
            </div>
            <h1 className="text-lg font-bold text-gray-900">{doc.title}</h1>
            {doc.authors && <p className="text-sm text-gray-500">{doc.authors}</p>}
            <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
              {doc.year && <span>{doc.year}</span>}
              {doc.publisher && <span>{doc.publisher}</span>}
              {doc.pages && <span>{doc.pages} pages</span>}
              {doc.language && <span className="uppercase">{doc.language}</span>}
            </div>
            {doc.subject_names?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {doc.subject_names.map(s => (
                  <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{s}</span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 pt-2 flex-wrap">
              {doc.is_online_readable && doc.file && (
                <button onClick={() => setReading(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: `linear-gradient(135deg, ${color}, #9333ea)` }}>
                  <BookOpen size={15} /> Lire en ligne
                </button>
              )}
              {doc.is_downloadable && doc.file && (
                <button onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700">
                  <Download size={15} /> Télécharger
                </button>
              )}
              {doc.external_url && (
                <a href={doc.external_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700">
                  <ExternalLink size={15} /> Lien externe
                </a>
              )}
              <button onClick={() => onToggleFavorite(doc)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700">
                <Heart size={15} className={doc.is_favorite ? 'fill-rose-500 text-rose-500' : ''} />
                {doc.is_favorite ? 'Retiré des favoris' : 'Ajouter aux favoris'}
              </button>
            </div>
          </div>
        </div>
        {doc.abstract && (
          <div className="px-6 pb-6">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1.5">Résumé</p>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{doc.abstract}</p>
          </div>
        )}
        {doc.keywords && (
          <div className="px-6 pb-6 flex flex-wrap gap-1.5">
            {doc.keywords.split(',').map(k => (
              <span key={k} className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-500">{k.trim()}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentLibrary() {
  const [search, setSearch] = useState('');
  const [docType, setDocType] = useState('');
  const [tab, setTab] = useState('all');
  const [selected, setSelected] = useState(null);

  const { data: docsData, loading, refetch } = useApi(
    () => elearningService.getLibraryDocuments({ doc_type: docType || undefined, search: search || undefined, is_published: true }),
    [docType, search], tab === 'all'
  );
  const { data: favData, refetch: refetchFav } = useApi(
    () => elearningService.getMyFavoriteDocuments(), [], tab === 'favorites'
  );

  const docs = tab === 'all' ? (docsData?.results ?? docsData ?? []) : (favData ?? []);

  const handleToggleFavorite = async (doc) => {
    try {
      const res = await elearningService.toggleFavoriteDocument(doc.id);
      if (selected?.id === doc.id) setSelected(prev => ({ ...prev, is_favorite: res.is_favorite }));
      refetch(); refetchFav();
    } catch {}
  };

  if (selected) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <DocDetail doc={selected} onBack={() => setSelected(null)} onToggleFavorite={handleToggleFavorite} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="text-violet-600" size={22} /> Bibliothèque numérique
        </h1>
        <p className="text-sm text-gray-500 mt-1">Livres, articles, thèses et ressources documentaires</p>
      </div>

      <div className="flex items-center gap-2">
        {[{ id: 'all', label: 'Tous les documents' }, { id: 'favorites', label: 'Mes favoris', icon: Star }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t.id ? 'bg-violet-50 text-violet-600 border border-violet-200' : 'text-gray-500 border border-transparent hover:bg-gray-50'}`}>
            {t.icon && <t.icon size={14} />} {t.label}
          </button>
        ))}
      </div>

      {tab === 'all' && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un titre, auteur, mot-clé..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm" />
          </div>
          <select value={docType} onChange={e => setDocType(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm cursor-pointer">
            {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      )}

      {(tab === 'all' && loading) ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p>{tab === 'favorites' ? 'Aucun document favori' : 'Aucun document trouvé'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {docs.map(doc => (
            <DocCard key={doc.id} doc={doc} onOpen={setSelected} onToggleFavorite={handleToggleFavorite} />
          ))}
        </div>
      )}
    </div>
  );
}
