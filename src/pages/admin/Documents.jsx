import { useState, useEffect } from 'react';
import { FolderOpen, Upload, Download, Eye, Trash2, FileText, File, Image as ImageIcon, Video, X, Filter } from 'lucide-react';
import { documentsService } from '../../services';
import { useApi } from '../../hooks/useApi';
import { useSite } from '../../contexts/SiteContext';
import { PageHeader, FilterBar, SearchInput, FilterSelect, PrimaryButton, IconBtn, Pagination } from '../../components/ui/PageHeader';

const COLOR = '#0284c7'; const COLOR_BG = '#f0f9ff'; const COLOR_ICON = '#bae6fd';
const ITEMS_PER_PAGE = 12;

const typeConfig = {
  image: { icon: ImageIcon, color: '#db2777', bg: '#fce7f3' },
  video: { icon: Video,    color: '#ef4444', bg: '#fee2e2' },
  pdf:   { icon: FileText, color: '#dc2626', bg: '#fee2e2' },
  document: { icon: FileText, color: COLOR, bg: COLOR_ICON },
};

export default function Documents() {
  const { selectedSite } = useSite();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [formData, setFormData] = useState({ title: '', description: '', category: '', type: 'document', visibility: 'public' });

  const siteFilter = selectedSite !== 'all' ? { site: selectedSite } : {};
  const { data: documents, loading, execute: fetchDocuments } = useApi(
    () => documentsService.getAll?.({ search: searchTerm, type: filterType !== 'all' ? filterType : undefined, category: filterCategory !== 'all' ? filterCategory : undefined, ...siteFilter }) || Promise.resolve([]),
    [searchTerm, filterType, filterCategory, selectedSite], true
  );

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) { setUploadFile(file); setFormData(p => ({ ...p, title: file.name })); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedSite === 'all') { alert('Veuillez sélectionner un site avant de télécharger un document'); return; }
    try {
      const data = new FormData();
      data.append('file', uploadFile); data.append('title', formData.title);
      data.append('description', formData.description); data.append('category', formData.category);
      data.append('type', formData.type); data.append('visibility', formData.visibility);
      data.append('site', selectedSite);
      await documentsService.upload?.(data);
      setShowModal(false); setUploadFile(null);
      setFormData({ title: '', description: '', category: '', type: 'document', visibility: 'public' });
      fetchDocuments();
    } catch (err) { console.error('Error uploading document:', err); alert('Erreur lors du téléchargement'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;
    try { await documentsService.delete?.(id); fetchDocuments(); }
    catch (err) { console.error('Error deleting document:', err); alert('Erreur lors de la suppression'); }
  };

  const handleDownload = async (id, filename) => {
    try {
      const blob = await documentsService.download?.(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch (err) { console.error('Error downloading document:', err); alert('Erreur lors du téléchargement'); }
  };

  const documentsList = documents?.results || documents || [];

  const totalPages = Math.ceil(documentsList.length / ITEMS_PER_PAGE);
  const paginated = documentsList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => setCurrentPage(1), [searchTerm, filterType, filterCategory, selectedSite]);

  const kpiStats = [
    { label: 'Total documents', value: documentsList.length, color: COLOR, bg: COLOR_ICON },
    { label: 'Documents publics', value: documentsList.filter(d => d.visibility === 'public').length, color: '#059669', bg: '#d1fae5' },
    { label: 'Documents privés', value: documentsList.filter(d => d.visibility === 'private').length, color: '#d97706', bg: '#fef3c7' },
    { label: 'Taille totale', value: '2.5 GB', color: '#7c3aed', bg: '#ede9fe' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader icon={FolderOpen} iconColor={COLOR} iconBg={COLOR_ICON}
        title="Gestion des Documents" subtitle="Gérez tous les documents de votre établissement"
        action={<PrimaryButton icon={Upload} label="Télécharger un document" color={COLOR} onClick={() => setShowModal(true)} />} />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiStats.map((s, i) => (
          <div key={i} className="card p-4 flex items-center gap-4 overflow-hidden relative">
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-[0.06] blur-lg" style={{ background: s.color }} />
            <div className="h-11 w-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                 style={{ background: `linear-gradient(135deg, ${s.bg}, ${s.color}22)`, boxShadow: `0 4px 14px ${s.color}20` }}>
              <FileText className="h-5 w-5" style={{ color: s.color }} />
            </div>
            <div>
              <p className="kpi-number" style={{ fontSize: '1.4rem' }}>{s.value}</p>
              <p className="kpi-label">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <FilterBar>
        <SearchInput value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Rechercher un document…" />
        <FilterSelect value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">Tous les types</option>
          <option value="document">Documents</option>
          <option value="pdf">PDF</option>
          <option value="image">Images</option>
          <option value="video">Vidéos</option>
        </FilterSelect>
        <FilterSelect value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="all">Toutes les catégories</option>
          <option value="cours">Cours</option>
          <option value="examens">Examens</option>
          <option value="administratif">Administratif</option>
          <option value="autre">Autre</option>
        </FilterSelect>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:bg-slate-50 ml-auto"
          style={{ color: '#64748b', borderColor: '#e2e8f0' }}>
          <Filter className="h-4 w-4" /> Plus de filtres
        </button>
      </FilterBar>

      {loading ? (
        <div className="card flex items-center justify-center py-20">
          <div className="h-8 w-8 rounded-full border-[3px] border-sky-200 border-t-sky-600 animate-spin" />
        </div>
      ) : documentsList.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20">
          <FolderOpen className="h-12 w-12 mb-4 opacity-20" style={{ color: '#64748b' }} />
          <p className="text-sm" style={{ color: '#94a3b8' }}>Aucun document trouvé</p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {paginated.map((doc) => {
            const tc = typeConfig[doc.type] || typeConfig.document;
            const Icon = tc.icon;
            return (
              <div key={doc.id} className="card card-interactive overflow-hidden group">
                {/* Colored top band */}
                <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${tc.color}, ${tc.color}80)` }} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                         style={{ background: `linear-gradient(135deg, ${tc.bg}, ${tc.color}18)`, boxShadow: `0 4px 14px ${tc.color}20` }}>
                      <Icon className="h-6 w-6" style={{ color: tc.color }} />
                    </div>
                    <span className="badge badge-dot"
                          style={{ background: doc.visibility === 'public' ? 'linear-gradient(135deg,#d1fae5,#a7f3d0)' : 'linear-gradient(135deg,#fef3c7,#fde68a)', color: doc.visibility === 'public' ? '#065f46' : '#92400e' }}>
                      <span style={{ width: 5.5, height: 5.5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                      {doc.visibility === 'public' ? 'Public' : 'Privé'}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold mb-1.5 line-clamp-2" style={{ color: '#1e293b', letterSpacing: '-0.01em' }}>{doc.title}</h3>
                  <p className="text-xs mb-4 line-clamp-2 font-medium" style={{ color: '#94a3b8' }}>{doc.description || 'Aucune description'}</p>
                  <div className="flex items-center justify-between text-[11px] font-bold mb-4" style={{ color: '#94a3b8' }}>
                    <span className="flex items-center gap-1.5">
                      <span className="h-4 w-4 rounded flex items-center justify-center" style={{ background: '#f1f5f9' }}>
                        <FileText className="h-2.5 w-2.5" />
                      </span>
                      {doc.size || '—'}
                    </span>
                    <span>{doc.created_at ? new Date(doc.created_at).toLocaleDateString('fr-FR') : 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-3" style={{ borderTop: '1px solid #f0f4f9' }}>
                    <button onClick={() => handleDownload(doc.id, doc.title)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all"
                      style={{ background: COLOR_BG, color: COLOR }}
                      onMouseEnter={e => e.currentTarget.style.background = '#bae6fd'} onMouseLeave={e => e.currentTarget.style.background = COLOR_BG}>
                      <Download className="h-3.5 w-3.5" /> Télécharger
                    </button>
                    <IconBtn onClick={() => {}} icon={Eye} color="#7c3aed" hoverBg="#ede9fe" title="Aperçu" />
                    <IconBtn onClick={() => handleDelete(doc.id)} icon={Trash2} color="#ef4444" hoverBg="#fee2e2" title="Supprimer" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage}
          accentColor={COLOR} totalItems={documentsList.length} itemsPerPage={ITEMS_PER_PAGE} />
        </>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <h2 className="text-lg font-bold" style={{ color: '#0f172a' }}>Télécharger un document</h2>
              <button onClick={() => setShowModal(false)} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors">
                <X className="h-4 w-4" style={{ color: '#64748b' }} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* File drop zone */}
              <label htmlFor="file-upload" className="flex flex-col items-center justify-center py-8 rounded-xl cursor-pointer transition-colors"
                style={{ border: `2px dashed ${uploadFile ? COLOR : '#e2e8f0'}`, background: uploadFile ? COLOR_BG : '#fafafa' }}>
                <input id="file-upload" type="file" onChange={handleFileChange} className="hidden" required />
                {uploadFile ? (
                  <div className="flex items-center gap-3" style={{ color: COLOR }}>
                    <FileText className="h-8 w-8" />
                    <div>
                      <p className="text-sm font-semibold">{uploadFile.name}</p>
                      <p className="text-xs" style={{ color: '#94a3b8' }}>{(uploadFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 mb-3 opacity-30" style={{ color: '#64748b' }} />
                    <p className="text-sm font-medium" style={{ color: '#64748b' }}>Cliquez pour sélectionner un fichier</p>
                    <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>PDF, DOC, DOCX, XLS, JPG, PNG · Max 10MB</p>
                  </>
                )}
              </label>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Titre *</label>
                <input type="text" required value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} className="input-field" />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Description</label>
                <textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={2} className="input-field resize-none" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Catégorie</label>
                  <select value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))} className="input-field cursor-pointer">
                    <option value="">Sélectionner…</option>
                    <option value="cours">Cours</option>
                    <option value="examens">Examens</option>
                    <option value="administratif">Administratif</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: '#475569' }}>Visibilité</label>
                  <select value={formData.visibility} onChange={e => setFormData(p => ({ ...p, visibility: e.target.value }))} className="input-field cursor-pointer">
                    <option value="public">Public</option>
                    <option value="private">Privé</option>
                    <option value="restricted">Restreint</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:bg-slate-50"
                  style={{ color: '#64748b', borderColor: '#e2e8f0' }}>Annuler</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: COLOR }}
                  onMouseEnter={e => e.currentTarget.style.opacity='0.9'} onMouseLeave={e => e.currentTarget.style.opacity='1'}>
                  Télécharger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
