import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit, Trash2, BookOpen, Download, Eye, Search, X, ExternalLink, FileText, BookMarked } from 'lucide-react';
import { elearningService, academicService, sitesService } from '../../services';
import { useApi } from '../../hooks/useApi';
import { useSite } from '../../contexts/SiteContext';
import { useNotifications } from '../../components/Notifications';
import { useConfirm } from '../../components/ConfirmDialog';
import { IconBtn, Pagination } from '../../components/ui/PageHeader';

const COLOR = '#7c3aed';
const ITEMS = 10;

const DOC_TYPES = [
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

function DocModal({ open, onClose, editing, subjectsList, sitesList, onSaved, notify }) {
  const [form, setForm] = useState({
    title: '', authors: '', doc_type: 'BOOK', year: '', isbn: '', doi: '',
    abstract: '', publisher: '', language: 'fr', pages: '', keywords: '',
    is_downloadable: true, is_online_readable: true, is_published: true,
    subjects: [], external_url: '', file: null, cover_image: null, site: '',
  });
  const [loading, setLoading] = useState(false);

  useState(() => {
    if (editing) {
      setForm({
        title: editing.title, authors: editing.authors || '', doc_type: editing.doc_type,
        year: editing.year || '', isbn: editing.isbn || '', doi: editing.doi || '',
        abstract: editing.abstract || '', publisher: editing.publisher || '',
        language: editing.language || 'fr', pages: editing.pages || '',
        keywords: editing.keywords || '',
        is_downloadable: editing.is_downloadable, is_online_readable: editing.is_online_readable,
        is_published: editing.is_published, subjects: editing.subjects || [],
        external_url: editing.external_url || '', file: null, cover_image: null,
        site: editing.site || '',
      });
    } else {
      setForm({
        title: '', authors: '', doc_type: 'BOOK', year: '', isbn: '', doi: '',
        abstract: '', publisher: '', language: 'fr', pages: '', keywords: '',
        is_downloadable: true, is_online_readable: true, is_published: true,
        subjects: [], external_url: '', file: null, cover_image: null, site: '',
      });
    }
  }, [editing, open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'file' || k === 'cover_image') { if (v) fd.append(k, v); }
        else if (k === 'subjects') { v.forEach(id => fd.append('subjects', id)); }
        else if (v !== '' && v !== null) fd.append(k, v);
      });
      if (editing) {
        const payload = Object.fromEntries(
          Object.entries(form).filter(([k]) => k !== 'file' && k !== 'cover_image')
        );
        payload.site = form.site || null;
        await elearningService.updateLibraryDocument(editing.id, payload);
        if (form.file || form.cover_image) {
          const fd2 = new FormData();
          if (form.file) fd2.append('file', form.file);
          if (form.cover_image) fd2.append('cover_image', form.cover_image);
        }
      } else {
        await elearningService.createLibraryDocumentWithFile(fd);
      }
      notify({ type: 'success', title: editing ? 'Document modifié' : 'Document ajouté', message: '' });
      onSaved();
      onClose();
    } catch (err) {
      notify({ type: 'error', title: 'Erreur', message: err.message || 'Erreur lors de l\'enregistrement' });
    } finally { setLoading(false); }
  };

  const F = ({ label, children }) => (
    <div>
      <label className="block mb-1" style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      {children}
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4" style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)', zIndex: 50 }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div className="h-1 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${COLOR}, #db2777)` }} />
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <h2 className="text-base font-extrabold min-w-0 truncate">{editing ? 'Modifier le document' : 'Ajouter un document'}</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ color: '#64748b' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-2"><F label="Titre *"><input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="input-field" /></F></div>
            <F label="Auteur(s)"><input value={form.authors} onChange={e => setForm(p => ({ ...p, authors: e.target.value }))} className="input-field" placeholder="Nom Prénom, Nom Prénom..." /></F>
            <F label="Type">
              <select value={form.doc_type} onChange={e => setForm(p => ({ ...p, doc_type: e.target.value }))} className="input-field cursor-pointer">
                {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </F>
            <F label="Année"><input type="number" min="1900" max="2099" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} className="input-field" /></F>
            <F label="Éditeur"><input value={form.publisher} onChange={e => setForm(p => ({ ...p, publisher: e.target.value }))} className="input-field" /></F>
            <F label="ISBN"><input value={form.isbn} onChange={e => setForm(p => ({ ...p, isbn: e.target.value }))} className="input-field" /></F>
            <F label="DOI"><input value={form.doi} onChange={e => setForm(p => ({ ...p, doi: e.target.value }))} className="input-field" /></F>
            <F label="Pages"><input type="number" value={form.pages} onChange={e => setForm(p => ({ ...p, pages: e.target.value }))} className="input-field" /></F>
            <F label="Langue">
              <select value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))} className="input-field cursor-pointer">
                <option value="fr">Français</option><option value="en">Anglais</option><option value="ar">Arabe</option><option value="es">Espagnol</option>
              </select>
            </F>
            <F label="Site">
              <select value={form.site} onChange={e => setForm(p => ({ ...p, site: e.target.value }))} className="input-field cursor-pointer">
                <option value="">Tous les sites</option>
                {sitesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </F>
          </div>
          <F label="Mots-clés"><input value={form.keywords} onChange={e => setForm(p => ({ ...p, keywords: e.target.value }))} className="input-field" placeholder="séparés par des virgules" /></F>
          <F label="Résumé"><textarea value={form.abstract} onChange={e => setForm(p => ({ ...p, abstract: e.target.value }))} rows={3} className="input-field resize-none" /></F>
          <F label="Lien externe (URL)"><input type="url" value={form.external_url} onChange={e => setForm(p => ({ ...p, external_url: e.target.value }))} className="input-field" placeholder="https://..." /></F>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="Fichier PDF / document"><input type="file" accept=".pdf,.doc,.docx,.epub" onChange={e => setForm(p => ({ ...p, file: e.target.files[0] }))} className="input-field" /></F>
            <F label="Image de couverture"><input type="file" accept="image/*" onChange={e => setForm(p => ({ ...p, cover_image: e.target.files[0] }))} className="input-field" /></F>
          </div>
          <div className="flex gap-4 flex-wrap">
            {[['is_downloadable', 'Téléchargeable'], ['is_online_readable', 'Lecture en ligne'], ['is_published', 'Publié']].map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 text-sm font-semibold cursor-pointer" style={{ color: '#475569' }}>
                <input type="checkbox" checked={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.checked }))} className="h-4 w-4 rounded" />
                {label}
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold border" style={{ color: '#64748b', borderColor: '#e2e8f0' }}>Annuler</button>
            <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${COLOR}, #9333ea)`, boxShadow: `0 4px 14px ${COLOR}40` }}>
              {loading ? 'Enregistrement…' : (editing ? 'Mettre à jour' : 'Ajouter')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default function LibraryManager({ subjectsList = [], notify }) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const confirm = useConfirm();

  const { selectedSite } = useSite();
  const { data: sitesData } = useApi(() => sitesService.getSites({ is_active: true }), [], true);
  const sitesList = sitesData?.results || sitesData || [];
  const siteFilter = selectedSite !== 'all' ? { site: selectedSite } : {};

  const { data, refetch } = useApi(() => elearningService.getLibraryDocuments({ doc_type: filterType || undefined, ...siteFilter }), [filterType, selectedSite], true);
  const all = data?.results || data || [];
  const filtered = search ? all.filter(d => `${d.title} ${d.authors} ${d.keywords}`.toLowerCase().includes(search.toLowerCase())) : all;
  const totalPages = Math.ceil(filtered.length / ITEMS);
  const paginated = filtered.slice((page - 1) * ITEMS, page * ITEMS);

  const handleDelete = async (doc) => {
    if (!await confirm({ title: `Supprimer "${doc.title}" ?`, message: 'Cette action est irréversible.', confirmLabel: 'Supprimer', destructive: true })) return;
    try { await elearningService.deleteLibraryDocument(doc.id); notify({ type: 'success', title: 'Supprimé', message: '' }); refetch(); }
    catch { notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la suppression' }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative w-full sm:flex-1 sm:min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#94a3b8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="input-field pl-9 w-full" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-field cursor-pointer w-full sm:w-auto sm:min-w-[140px]">
          <option value="">Tous les types</option>
          {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button onClick={() => { setEditing(null); setShowModal(true); }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white w-full sm:w-auto flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${COLOR}, #9333ea)`, boxShadow: `0 4px 14px ${COLOR}40` }}>
          <Plus className="h-4 w-4" /> Ajouter
        </button>
      </div>

      {paginated.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg,#ede9fe,#ddd6fe)' }}>
            <BookOpen className="h-8 w-8 opacity-40" style={{ color: COLOR }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>Aucun document</p>
          <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Ajoutez des livres, articles, thèses…</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {paginated.map(doc => {
              const color = DOC_COLORS[doc.doc_type] || '#64748b';
              const typeLabel = DOC_TYPES.find(t => t.value === doc.doc_type)?.label || doc.doc_type;
              return (
                <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-xl transition-all" style={{ border: '1.5px solid #f0f4f9' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f8faff'; e.currentTarget.style.borderColor = '#e0e7ff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#f0f4f9'; }}>
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${color}22, ${color}44)`, boxShadow: `0 3px 10px ${color}20` }}>
                      <BookMarked className="h-5 w-5" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-extrabold truncate" style={{ color: '#0f172a' }}>{doc.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}22`, color }}>{typeLabel}</span>
                        {!doc.is_published && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#fef9c3', color: '#92400e' }}>Brouillon</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: '#64748b' }}>
                        {doc.authors && <span>{doc.authors}</span>}
                        {doc.year && <span>{doc.year}</span>}
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{doc.view_count}</span>
                        <span className="flex items-center gap-1"><Download className="h-3 w-3" />{doc.download_count}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 self-end sm:self-auto">
                    {doc.file && <IconBtn onClick={() => window.open(doc.file, '_blank', 'noopener,noreferrer')} icon={ExternalLink} color="#059669" hoverBg="#d1fae5" title="Ouvrir" />}
                    <IconBtn onClick={() => { setEditing(doc); setShowModal(true); }} icon={Edit} color="#2563eb" hoverBg="#dbeafe" title="Modifier" />
                    <IconBtn onClick={() => handleDelete(doc)} icon={Trash2} color="#ef4444" hoverBg="#fee2e2" title="Supprimer" />
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage}
            accentColor={COLOR} totalItems={filtered.length} itemsPerPage={ITEMS} />
        </>
      )}

      <DocModal open={showModal} onClose={() => setShowModal(false)} editing={editing}
        subjectsList={subjectsList} sitesList={sitesList} notify={notify} onSaved={refetch} />
    </div>
  );
}
