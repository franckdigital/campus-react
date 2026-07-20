import { useState, useRef } from 'react';
import {
  Users, Plus, Edit, Trash2, Mail, Clock, X, Check,
  Briefcase, UserCheck, Info, FileText, Eye, Award,
  CalendarDays, ChevronRight, Phone, Download,
  Upload, FolderOpen, Trash, Building2, AlertTriangle,
} from 'lucide-react';
import { staffService } from '../../services/staff';
import { academicService, sitesService } from '../../services';
import { useApi } from '../../hooks/useApi';
import {
  PageHeader, FilterBar, SearchInput, FilterSelect, PrimaryButton,
  Avatar, Modal, FormSection, FormField, FormInput, FormSelect,
  ModalFooter, IconBtn, Pagination, TableContainer, Table, TableRow,
} from '../../components/ui/PageHeader';

/* ── tokens ─────────────────────────────────────────────────── */
const CA = '#0f766e'; const CB = '#f0fdfa'; const CI = '#99f6e4';

/* ── helpers ─────────────────────────────────────────────────── */
const ITEMS = 10;
function list(d) { return Array.isArray(d) ? d : (d?.results || []); }

const DEPT_LABELS = {
  DIRECTION:    { label: 'Direction',     bg: '#ede9fe', color: '#7c3aed' },
  SCOLARITE:    { label: 'Scolarité',     bg: '#ecfeff', color: '#0891b2' },
  COMPTABILITE: { label: 'Comptabilité',  bg: '#fef3c7', color: '#d97706' },
  INFORMATIQUE: { label: 'Informatique',  bg: '#f0fdf4', color: '#059669' },
  SECRETARIAT:  { label: 'Secrétariat',   bg: '#fce7f3', color: '#db2777' },
  BIBLIOTHEQUE: { label: 'Bibliothèque',  bg: '#fff7ed', color: '#ea580c' },
  MAINTENANCE:  { label: 'Maintenance',   bg: '#f8fafc', color: '#64748b' },
  AUTRE:        { label: 'Autre',         bg: '#f1f5f9', color: '#64748b' },
};

const CONTRACT_LABELS = {
  PERMANENT: { label: 'Permanent',   bg: '#d1fae5', color: '#059669' },
  CONTRACT:  { label: 'Contractuel', bg: '#fef3c7', color: '#d97706' },
  INTERN:    { label: 'Stagiaire',   bg: '#e0e7ff', color: '#6366f1' },
};

const DOC_TYPE_LABELS = {
  IDENTITY:    { label: "Pièce d'identité", icon: '🪪', color: '#6366f1', bg: '#e0e7ff' },
  CONTRACT:    { label: 'Contrat',          icon: '📋', color: '#d97706', bg: '#fef3c7' },
  DIPLOMA:     { label: 'Diplôme',          icon: '🎓', color: '#0891b2', bg: '#ecfeff' },
  CERTIFICATE: { label: 'Certificat',       icon: '📜', color: '#059669', bg: '#d1fae5' },
  OTHER:       { label: 'Autre',            icon: '📄', color: '#64748b', bg: '#f1f5f9' },
};

const STAFF_COLORS = ['#0f766e','#7c3aed','#0891b2','#059669','#d97706','#db2777'];
function staffColor(str) {
  let h = 0; for (let i = 0; i < (str||'').length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return STAFF_COLORS[Math.abs(h) % STAFF_COLORS.length];
}

/* ── Tab ─────────────────────────────────────────────────────── */
function Tab({ active, onClick, label, count }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all rounded-xl"
      style={{ background: active ? CB : 'transparent', color: active ? CA : '#64748b' }}>
      {label}
      {count != null && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: active ? CA : '#f1f5f9', color: active ? '#fff' : '#94a3b8' }}>
          {count}
        </span>
      )}
    </button>
  );
}

/* ── ProfileModal ────────────────────────────────────────────── */
function ProfileModal({ staff, onClose, onEdit, onFiche }) {
  const [ptab, setPtab] = useState('info');
  const [docs, setDocs]             = useState(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [docForm, setDocForm]       = useState({ document_type: 'DIPLOMA', title: '', file: null });
  const fileRef = useRef(null);
  const [exps, setExps]             = useState(null);
  const [expsLoading, setExpsLoading] = useState(false);
  const [savingExp, setSavingExp]   = useState(false);
  const [expForm, setExpForm]       = useState({ position: '', company: '', start_date: '', end_date: '', is_current: false, description: '' });

  if (!staff) return null;
  const color = staffColor(staff.full_name || '');
  const dept = DEPT_LABELS[staff.department] || DEPT_LABELS.AUTRE;
  const ct   = CONTRACT_LABELS[staff.contract_type] || { label: staff.contract_type, bg: '#f1f5f9', color: '#64748b' };
  const monthlyHours = staff.contract_hours_per_week ? staff.contract_hours_per_week * 4 : null;

  async function loadDocs() {
    if (docs !== null) return;
    setDocsLoading(true);
    try {
      const res = await staffService.getStaffDocuments(staff.id);
      setDocs(Array.isArray(res) ? res : (res?.results || []));
    } catch { setDocs([]); }
    setDocsLoading(false);
  }

  async function loadExps() {
    if (exps !== null) return;
    setExpsLoading(true);
    try {
      const res = await staffService.getStaffExperiences(staff.id);
      setExps(Array.isArray(res) ? res : (res?.results || []));
    } catch { setExps([]); }
    setExpsLoading(false);
  }

  function switchTab(key) {
    setPtab(key);
    if (key === 'docs') loadDocs();
    if (key === 'exp')  loadExps();
  }

  async function uploadDoc(e) {
    e.preventDefault();
    if (!docForm.file || !docForm.title) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('document_type', docForm.document_type);
      fd.append('title', docForm.title);
      fd.append('file', docForm.file);
      const res = await staffService.uploadStaffDocument(staff.id, fd);
      setDocs(prev => [res, ...(prev || [])]);
      setDocForm({ document_type: 'DIPLOMA', title: '', file: null });
      if (fileRef.current) fileRef.current.value = '';
    } catch { alert('Erreur lors du téléversement'); }
    setUploading(false);
  }

  async function deleteDoc(doc) {
    if (!window.confirm(`Supprimer "${doc.title}" ?`)) return;
    try {
      await staffService.deleteStaffDocument(staff.id, doc.id);
      setDocs(prev => prev.filter(d => d.id !== doc.id));
    } catch { alert('Erreur'); }
  }

  async function saveExp(e) {
    e.preventDefault();
    setSavingExp(true);
    try {
      const payload = { ...expForm };
      if (payload.is_current) payload.end_date = null;
      const res = await staffService.addStaffExperience(staff.id, payload);
      setExps(prev => [res, ...(prev || [])]);
      setExpForm({ position: '', company: '', start_date: '', end_date: '', is_current: false, description: '' });
    } catch { alert('Erreur lors de la sauvegarde'); }
    setSavingExp(false);
  }

  async function deleteExp(exp) {
    if (!window.confirm(`Supprimer "${exp.position}" ?`)) return;
    try {
      await staffService.deleteStaffExperience(staff.id, exp.id);
      setExps(prev => prev.filter(e => e.id !== exp.id));
    } catch { alert('Erreur suppression'); }
  }

  return (
    <Modal open onClose={onClose} title="Profil personnel" accentColor={CA} size="xl">
      {/* Identity banner */}
      <div className="flex items-center gap-4 p-4 rounded-2xl mb-4"
           style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)`, border: `1.5px solid ${color}30` }}>
        <Avatar name={staff.full_name || '?'} color={color} size="xl" />
        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-base leading-tight" style={{ color: '#0f172a' }}>{staff.full_name}</p>
          <p className="text-xs font-mono font-bold mt-0.5" style={{ color: CA }}>{staff.employee_id}</p>
          <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{staff.position}</p>
          <div className="flex gap-2 mt-1.5 flex-wrap">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                  style={{ background: dept.bg, color: dept.color }}>{dept.label}</span>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                  style={{ background: ct.bg, color: ct.color }}>{ct.label}</span>
          </div>
        </div>
        {staff.contract_hours_per_week && (
          <div className="hidden sm:flex gap-3">
            {[
              { value: `${staff.contract_hours_per_week}h`, label: '/sem' },
              { value: `${monthlyHours}h`, label: '/mois', color: CA },
            ].map((s, i) => (
              <div key={i} className="text-center px-3 py-2 rounded-xl" style={{ background: '#fff', border: '1px solid #f1f5f9' }}>
                <p className="text-lg font-extrabold" style={{ color: s.color || '#0f172a' }}>{s.value}</p>
                <p className="text-[10px]" style={{ color: '#94a3b8' }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button onClick={onFiche}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
          style={{ background: `linear-gradient(135deg, #134e4a, ${CA})` }}>
          <FileText className="h-3.5 w-3.5" />
          Fiche complète PDF
        </button>
        <button onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: '#f1f5f9', color: '#64748b' }}>
          <Edit className="h-3.5 w-3.5" />
          Modifier
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-4 flex-wrap"
           style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        {[
          { key: 'info', label: 'Informations' },
          { key: 'exp',  label: 'Expériences' },
          { key: 'docs', label: 'Documents' },
        ].map(t => (
          <button key={t.key} onClick={() => switchTab(t.key)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
            style={{ background: ptab === t.key ? CB : 'transparent', color: ptab === t.key ? CA : '#64748b' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Informations ── */}
      {ptab === 'info' && (
        <div className="space-y-3">
          {[
            { icon: Mail,         label: 'E-mail',               value: staff.email || '—' },
            { icon: Phone,        label: 'Téléphone',             value: staff.phone || '—' },
            { icon: Building2,    label: 'Département',           value: dept.label },
            { icon: Award,        label: 'Poste',                 value: staff.position || '—' },
            { icon: CalendarDays, label: 'Date d\'embauche',      value: staff.hire_date ? new Date(staff.hire_date).toLocaleDateString('fr-FR') : '—' },
            { icon: CalendarDays, label: 'Année académique',      value: staff.academic_year_name || '—' },
          ].map((row, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
                 style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
              <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                   style={{ background: CB }}>
                <row.icon className="h-4 w-4" style={{ color: CA }} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#94a3b8' }}>{row.label}</p>
                <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>{row.value}</p>
              </div>
            </div>
          ))}

          {(staff.contract_hours_per_week != null) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { label: 'Charge hebdo. contractuelle', value: `${staff.contract_hours_per_week}h / sem` },
                { label: 'Charge mensuelle calculée',   value: `${monthlyHours}h / mois` },
              ].map((k, i) => (
                <div key={i} className="p-3 rounded-xl text-center"
                     style={{ background: CB, border: `1.5px solid ${CI}` }}>
                  <p className="text-base font-extrabold" style={{ color: CA }}>{k.value}</p>
                  <p className="text-[10px]" style={{ color: '#64748b' }}>{k.label}</p>
                </div>
              ))}
            </div>
          )}

          {staff.bio && (
            <div className="p-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
              <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: '#94a3b8' }}>Biographie</p>
              <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>{staff.bio}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Expériences ── */}
      {ptab === 'exp' && (
        <div className="space-y-4">
          <form onSubmit={saveExp} className="p-4 rounded-2xl space-y-3"
            style={{ background: '#f0fdf4', border: '1.5px dashed #86efac' }}>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#059669' }}>
              Ajouter une expérience
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: '#64748b' }}>Poste / Titre</label>
                <input className="input-field text-xs" placeholder="ex: Secrétaire de direction"
                  value={expForm.position} onChange={e => setExpForm(p => ({ ...p, position: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: '#64748b' }}>Établissement / Entreprise</label>
                <input className="input-field text-xs" placeholder="ex: Ministère de l'éducation"
                  value={expForm.company} onChange={e => setExpForm(p => ({ ...p, company: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: '#64748b' }}>Date de début</label>
                <input type="date" className="input-field text-xs"
                  value={expForm.start_date} onChange={e => setExpForm(p => ({ ...p, start_date: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: '#64748b' }}>Date de fin</label>
                <input type="date" className="input-field text-xs" disabled={expForm.is_current}
                  value={expForm.end_date} onChange={e => setExpForm(p => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer" style={{ color: '#64748b' }}>
              <input type="checkbox" checked={expForm.is_current}
                onChange={e => setExpForm(p => ({ ...p, is_current: e.target.checked, end_date: e.target.checked ? '' : p.end_date }))} />
              Poste actuel
            </label>
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: '#64748b' }}>Description (optionnel)</label>
              <textarea className="input-field text-xs resize-none" rows={2}
                value={expForm.description} onChange={e => setExpForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <button type="submit" disabled={savingExp}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
              {savingExp
                ? <div className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                : <Plus className="h-3.5 w-3.5" />}
              Ajouter
            </button>
          </form>

          {expsLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#059669' }} />
            </div>
          ) : !exps || exps.length === 0 ? (
            <div className="flex flex-col items-center py-10 rounded-xl gap-2" style={{ background: '#f8fafc' }}>
              <Briefcase className="h-8 w-8 opacity-20" style={{ color: '#64748b' }} />
              <p className="text-xs" style={{ color: '#94a3b8' }}>Aucune expérience enregistrée</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {exps.map(exp => (
                <div key={exp.id} className="flex items-start gap-3 p-3 rounded-xl"
                     style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                       style={{ background: '#d1fae5' }}>
                    <Briefcase className="h-4 w-4" style={{ color: '#059669' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold" style={{ color: '#0f172a' }}>{exp.position}</p>
                    <p className="text-xs" style={{ color: CA }}>{exp.company}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>
                      {exp.start_date ? new Date(exp.start_date).toLocaleDateString('fr-FR', { month:'short', year:'numeric' }) : '—'}
                      {' – '}
                      {exp.is_current ? 'Présent' : (exp.end_date ? new Date(exp.end_date).toLocaleDateString('fr-FR', { month:'short', year:'numeric' }) : '—')}
                    </p>
                    {exp.description && <p className="text-[10px] mt-1 italic" style={{ color: '#64748b' }}>{exp.description}</p>}
                  </div>
                  <button onClick={() => deleteExp(exp)}
                    className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: '#fef2f2' }}>
                    <Trash className="h-3.5 w-3.5" style={{ color: '#ef4444' }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Documents ── */}
      {ptab === 'docs' && (
        <div className="space-y-4">
          <form onSubmit={uploadDoc} className="p-4 rounded-2xl space-y-3"
            style={{ background: '#f0f9ff', border: '1.5px dashed #7dd3fc' }}>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: CA }}>
              Ajouter un document
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: '#64748b' }}>Type</label>
                <select className="input-field text-xs"
                  value={docForm.document_type}
                  onChange={e => setDocForm(p => ({ ...p, document_type: e.target.value }))}>
                  <option value="IDENTITY">Pièce d'identité</option>
                  <option value="CONTRACT">Contrat</option>
                  <option value="DIPLOMA">Diplôme</option>
                  <option value="CERTIFICATE">Certificat</option>
                  <option value="OTHER">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: '#64748b' }}>Intitulé</label>
                <input className="input-field text-xs" placeholder="ex: CNI, Contrat de travail…"
                  value={docForm.title}
                  onChange={e => setDocForm(p => ({ ...p, title: e.target.value }))} required />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: '#64748b' }}>Fichier</label>
              <input type="file" ref={fileRef} className="input-field text-xs"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={e => setDocForm(p => ({ ...p, file: e.target.files[0] || null }))} required />
            </div>
            <button type="submit" disabled={uploading || !docForm.file || !docForm.title}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${CA}, ${CA}cc)` }}>
              {uploading
                ? <div className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                : <Upload className="h-3.5 w-3.5" />}
              Téléverser
            </button>
          </form>

          {docsLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: CA }} />
            </div>
          ) : !docs || docs.length === 0 ? (
            <div className="flex flex-col items-center py-10 rounded-xl gap-2" style={{ background: '#f8fafc' }}>
              <FolderOpen className="h-8 w-8 opacity-20" style={{ color: '#64748b' }} />
              <p className="text-xs" style={{ color: '#94a3b8' }}>Aucun document enregistré</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {docs.map(doc => {
                const dt = DOC_TYPE_LABELS[doc.document_type] || DOC_TYPE_LABELS.OTHER;
                return (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl"
                       style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
                         style={{ background: dt.bg }}>{dt.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: '#0f172a' }}>{doc.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: dt.bg, color: dt.color }}>{dt.label}</span>
                        <span className="text-[10px]" style={{ color: '#94a3b8' }}>
                          {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {doc.file_url && (
                        <a href={doc.file_url} target="_blank" rel="noreferrer"
                          className="h-7 w-7 rounded-lg flex items-center justify-center"
                          style={{ background: '#dbeafe' }} title="Télécharger">
                          <Download className="h-3.5 w-3.5" style={{ color: '#1e40af' }} />
                        </a>
                      )}
                      <button onClick={() => deleteDoc(doc)}
                        className="h-7 w-7 rounded-lg flex items-center justify-center"
                        style={{ background: '#fef2f2' }}>
                        <Trash className="h-3.5 w-3.5" style={{ color: '#ef4444' }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════ */
export default function Staff() {
  const [tab, setTab]         = useState('list');
  const [search, setSearch]   = useState('');
  const [filterDept, setFilterDept]       = useState('');
  const [filterContract, setFilterContract] = useState('');
  const [page, setPage]       = useState(1);
  const [modal, setModal]     = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [selStaff, setSelStaff] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  /* ── data ── */
  const { data: staffData, loading: lstaff, execute: reloadStaff } =
    useApi(() => staffService.getStaff({ is_active: true }), [], true);
  const { data: academicYearsData } = useApi(() => academicService.getAcademicYears(), [], true);
  const { data: sitesData }         = useApi(() => sitesService.getSites(), [], true);

  const staffList    = list(staffData);
  const academicYears = list(academicYearsData);
  const sites         = list(sitesData);

  /* ── filters ── */
  const filtStaff = staffList.filter(s =>
    (!filterDept     || s.department    === filterDept) &&
    (!filterContract || s.contract_type === filterContract) &&
    ((s.full_name    || '').toLowerCase().includes(search.toLowerCase()) ||
     (s.email        || '').toLowerCase().includes(search.toLowerCase()) ||
     (s.employee_id  || '').toLowerCase().includes(search.toLowerCase()) ||
     (s.position     || '').toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.ceil(filtStaff.length / ITEMS);
  const paginated  = filtStaff.slice((page - 1) * ITEMS, page * ITEMS);

  /* ── form ── */
  const emptyForm = {
    first_name: '', last_name: '', email: '', phone: '',
    employee_id: '', department: 'AUTRE', position: '', hire_date: '',
    contract_type: 'PERMANENT', bio: '',
    academic_year: '', contract_hours_per_week: '', site: '',
    password: '', password_confirm: '',
  };
  const [form, setForm] = useState(emptyForm);
  const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) });

  const emptyExp = { position: '', company: '', start_date: '', end_date: '', is_current: false, description: '' };
  const [formExps, setFormExps] = useState([]);
  function addFormExp() { setFormExps(p => [...p, { ...emptyExp, _key: Date.now() }]); }
  function removeFormExp(i) { setFormExps(p => p.filter((_, idx) => idx !== i)); }
  function updateFormExp(i, field, val) {
    setFormExps(p => p.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
  }

  function openCreate() { setEditing(null); setForm(emptyForm); setFormExps([]); setModal('staff'); }
  function openEdit(s) {
    setEditing(s);
    setForm({
      first_name: s.user?.first_name || s.full_name?.split(' ')[0] || '',
      last_name:  s.user?.last_name  || s.full_name?.split(' ').slice(1).join(' ') || '',
      email: s.email || s.user?.email || '',
      phone: s.phone || s.user?.phone || '',
      employee_id: s.employee_id || '',
      department:  s.department  || 'AUTRE',
      position:    s.position    || '',
      hire_date:   s.hire_date   || '',
      contract_type: s.contract_type || 'PERMANENT',
      bio: s.bio || '',
      academic_year: s.academic_year || '',
      contract_hours_per_week: s.contract_hours_per_week || '',
      site: s.site || '',
      password: '', password_confirm: '',
    });
    setFormExps([]);
    setModal('staff');
  }

  async function saveStaff(e) {
    e.preventDefault(); setSaving(true);
    try {
      const profFields = {
        employee_id: form.employee_id, department: form.department,
        position: form.position, hire_date: form.hire_date || null,
        contract_type: form.contract_type, bio: form.bio,
        academic_year: form.academic_year || null,
        contract_hours_per_week: form.contract_hours_per_week ? parseInt(form.contract_hours_per_week) : null,
        site: form.site || null,
      };
      let savedId = editing?.id;
      if (editing) {
        await staffService.updateStaff(editing.id, profFields);
      } else {
        const created = await staffService.createStaff({
          user_data: {
            first_name: form.first_name, last_name: form.last_name,
            email: form.email, phone: form.phone, user_type: 'STAFF',
            password: form.password, password_confirm: form.password_confirm,
          },
          ...profFields,
        });
        savedId = created?.id;
      }
      // Save new experiences
      if (savedId && formExps.length > 0) {
        await Promise.all(
          formExps.filter(e => e.position && e.company && e.start_date).map(e =>
            staffService.addStaffExperience(savedId, {
              position: e.position, company: e.company, start_date: e.start_date,
              end_date: e.is_current ? null : (e.end_date || null),
              is_current: e.is_current, description: e.description || '',
            })
          )
        );
      }
      setFormExps([]);
      setModal(null); reloadStaff();
    } catch { alert('Erreur lors de la sauvegarde'); }
    setSaving(false);
  }

  async function deactivateStaff(id) {
    if (!window.confirm('Désactiver ce membre du personnel ?')) return;
    try { await staffService.updateStaff(id, { is_active: false }); reloadStaff(); }
    catch { alert('Erreur'); }
  }

  /* ── profile modal ── */
  async function openProfile(s) {
    setSelStaff(s); setProfileData(null); setModal('profile'); setProfileLoading(true);
    try {
      const data = await staffService.getStaffProfil(s.id);
      setProfileData({ ...s, ...data });
    } catch { setProfileData(s); }
    setProfileLoading(false);
  }

  function openFiche(s) {
    window.open(staffService.getStaffFicheUrl(s.id), '_blank');
  }

  /* ── KPIs ── */
  const activeCount    = staffList.length;
  const permCount      = staffList.filter(s => s.contract_type === 'PERMANENT').length;
  const contractCount  = staffList.filter(s => s.contract_type === 'CONTRACT').length;
  const deptCounts     = Object.keys(DEPT_LABELS).reduce((acc, k) => {
    acc[k] = staffList.filter(s => s.department === k).length;
    return acc;
  }, {});

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Users} iconColor={CA} iconBg={CI}
        title="Personnel Administratif"
        subtitle={`${activeCount} membre${activeCount > 1 ? 's' : ''} du personnel`}
        action={<PrimaryButton icon={Plus} label="Nouveau membre" color={CA} onClick={openCreate} />}
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        {[
          { icon: Users,     label: 'Personnel',   value: activeCount,   color: CA,        bg: CB },
          { icon: UserCheck, label: 'Permanents',  value: permCount,     color: '#059669', bg: '#d1fae5' },
          { icon: Briefcase, label: 'Contractuels',value: contractCount, color: '#d97706', bg: '#fef3c7' },
          { icon: Building2, label: 'Départements',value: Object.values(deptCounts).filter(v=>v>0).length, color: '#7c3aed', bg: '#ede9fe' },
        ].map((k, i) => (
          <div key={i} className="card p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: k.bg }}>
              <k.icon className="h-5 w-5" style={{ color: k.color }} />
            </div>
            <div>
              <p className="text-xl font-extrabold leading-tight" style={{ color: '#0f172a' }}>{k.value}</p>
              <p className="text-xs" style={{ color: '#94a3b8' }}>{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-2xl mb-6 w-fit"
           style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <Tab active={tab === 'list'} onClick={() => { setTab('list'); setPage(1); }}
             label="Personnel" count={staffList.length} />
      </div>

      <FilterBar>
        <SearchInput value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Nom, e-mail, matricule, poste…" />
        <FilterSelect value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">Tous les départements</option>
          {Object.entries(DEPT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </FilterSelect>
        <FilterSelect value={filterContract} onChange={e => setFilterContract(e.target.value)}>
          <option value="">Tous les contrats</option>
          <option value="PERMANENT">Permanent</option>
          <option value="CONTRACT">Contractuel</option>
          <option value="INTERN">Stagiaire</option>
        </FilterSelect>
      </FilterBar>

      {/* ══ Table ══════════════════════════════════════════════════ */}
      <TableContainer loading={lstaff} empty={filtStaff.length === 0}
        emptyIcon={Users} emptyText="Aucun membre du personnel trouvé">
        <Table headers={['Membre', 'Matricule', 'Département', 'Poste', 'Contrat', 'Charge', 'Actions']}>
          {paginated.map(s => {
            const color = staffColor(s.full_name || '');
            const dept  = DEPT_LABELS[s.department] || DEPT_LABELS.AUTRE;
            const ct    = CONTRACT_LABELS[s.contract_type] || { label: s.contract_type, bg: '#f1f5f9', color: '#64748b' };
            return (
              <TableRow key={s.id} onClick={() => openProfile(s)}>
                <td>
                  <div className="flex items-center gap-3">
                    <Avatar name={s.full_name || '?'} color={color} size="md" />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>{s.full_name}</p>
                      <p className="text-xs flex items-center gap-1" style={{ color: '#94a3b8' }}>
                        <Mail className="h-3 w-3" />{s.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td><span className="text-xs font-mono font-bold" style={{ color: CA }}>{s.employee_id}</span></td>
                <td>
                  <span className="text-[11px] font-bold px-2 py-1 rounded-full"
                        style={{ background: dept.bg, color: dept.color }}>{dept.label}</span>
                </td>
                <td><span className="text-xs" style={{ color: '#64748b' }}>{s.position || '—'}</span></td>
                <td>
                  <span className="text-[11px] font-bold px-2 py-1 rounded-full"
                        style={{ background: ct.bg, color: ct.color }}>{ct.label}</span>
                </td>
                <td>
                  {s.contract_hours_per_week
                    ? <span className="text-sm font-bold" style={{ color: CA }}>{s.contract_hours_per_week}h/sem</span>
                    : <span className="text-xs" style={{ color: '#94a3b8' }}>—</span>}
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <IconBtn icon={Eye}      color={CA}       hoverBg={CB}      title="Voir profil" onClick={() => openProfile(s)} />
                    <IconBtn icon={FileText} color="#134e4a"  hoverBg="#ccfbf1" title="Fiche PDF"   onClick={() => openFiche(s)} />
                    <IconBtn icon={Edit}     color="#64748b"  hoverBg="#f1f5f9" title="Modifier"    onClick={() => openEdit(s)} />
                    <IconBtn icon={Trash2}   color="#ef4444"  hoverBg="#fef2f2" title="Désactiver"  onClick={() => deactivateStaff(s.id)} />
                  </div>
                </td>
              </TableRow>
            );
          })}
        </Table>
        <div className="px-4">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage}
            accentColor={CA} totalItems={filtStaff.length} itemsPerPage={ITEMS} />
        </div>
      </TableContainer>

      {/* ══ Modal: Profile ════════════════════════════════════════ */}
      {modal === 'profile' && (
        profileLoading ? (
          <Modal open onClose={() => setModal(null)} title="Profil personnel" accentColor={CA} size="xl">
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
                   style={{ borderColor: CA }} />
            </div>
          </Modal>
        ) : (
          <ProfileModal
            staff={profileData || selStaff}
            onClose={() => setModal(null)}
            onEdit={() => { setModal(null); openEdit(selStaff); }}
            onFiche={() => openFiche(selStaff)}
          />
        )
      )}

      {/* ══ Modal: Staff form ═════════════════════════════════════ */}
      <Modal open={modal === 'staff'} onClose={() => setModal(null)}
             title={editing ? 'Modifier le membre' : 'Nouveau membre du personnel'}
             accentColor={CA} size="lg">
        <form onSubmit={saveStaff} className="space-y-5">
          {!editing && (
            <FormSection title="Informations personnelles" icon={Users}>
              <FormField label="Prénom" required>
                <FormInput {...f('first_name')} placeholder="Prénom" required />
              </FormField>
              <FormField label="Nom" required>
                <FormInput {...f('last_name')} placeholder="Nom de famille" required />
              </FormField>
              <FormField label="Email" required>
                <FormInput type="email" {...f('email')} placeholder="email@exemple.com" required />
              </FormField>
              <FormField label="Téléphone">
                <FormInput type="tel" {...f('phone')} placeholder="+225 00 00 00 00" />
              </FormField>
              <FormField label="Mot de passe" required>
                <FormInput type="password" {...f('password')} required />
              </FormField>
              <FormField label="Confirmer le mot de passe" required>
                <FormInput type="password" {...f('password_confirm')} required />
              </FormField>
            </FormSection>
          )}

          <FormSection title="Informations professionnelles" icon={Briefcase}>
            <FormField label="Matricule" required>
              <FormInput {...f('employee_id')} placeholder="ADM-2026-0001" required />
            </FormField>
            <FormField label="Département" required>
              <FormSelect {...f('department')} required>
                {Object.entries(DEPT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </FormSelect>
            </FormField>
            <FormField label="Poste / Titre" required>
              <FormInput {...f('position')} placeholder="ex: Secrétaire de direction" required />
            </FormField>
            <FormField label="Type de contrat" required>
              <FormSelect {...f('contract_type')} required>
                <option value="PERMANENT">Permanent</option>
                <option value="CONTRACT">Contractuel</option>
                <option value="INTERN">Stagiaire</option>
              </FormSelect>
            </FormField>
            <FormField label="Date d'embauche">
              <FormInput type="date" {...f('hire_date')} />
            </FormField>
            <FormField label="Site / Campus">
              <FormSelect {...f('site')}>
                <option value="">— Sélectionner —</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </FormSelect>
            </FormField>
            <FormField label="Année académique">
              <FormSelect {...f('academic_year')}>
                <option value="">— Sélectionner —</option>
                {academicYears.map(y => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </FormSelect>
            </FormField>
            <FormField label="Charge hebdo. (h/sem)">
              <FormInput type="number" {...f('contract_hours_per_week')} placeholder="ex: 40" min="0" max="60" />
            </FormField>
            {form.contract_hours_per_week && (
              <FormField label="Charge mensuelle calculée">
                <div className="input-field text-sm font-bold"
                     style={{ color: CA, background: CB, cursor: 'default' }}>
                  {parseInt(form.contract_hours_per_week || 0) * 4}h / mois
                </div>
              </FormField>
            )}
          </FormSection>

          {/* Bio */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold" style={{ color: '#374151' }}>
              Biographie / Notes
            </label>
            <textarea className="input-field text-sm resize-none" rows={3}
              placeholder="Présentation courte (optionnel)…"
              value={form.bio}
              onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
              style={{ minHeight: 72 }} />
          </div>

          {/* Expériences dynamiques */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#64748b' }}>
                Expériences professionnelles
              </p>
              <button type="button" onClick={addFormExp}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: '#d1fae5', color: '#059669' }}>
                <Plus className="h-3.5 w-3.5" /> Ajouter
              </button>
            </div>
            {formExps.length === 0 && (
              <p className="text-xs italic" style={{ color: '#94a3b8' }}>
                Cliquez sur "Ajouter" pour saisir une expérience.
              </p>
            )}
            {formExps.map((exp, i) => (
              <div key={exp._key ?? i} className="p-3 rounded-xl space-y-2 relative"
                   style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <button type="button" onClick={() => removeFormExp(i)}
                  className="absolute top-2 right-2 h-6 w-6 rounded-lg flex items-center justify-center"
                  style={{ background: '#fef2f2' }}>
                  <X className="h-3.5 w-3.5" style={{ color: '#ef4444' }} />
                </button>
                <p className="text-[11px] font-bold uppercase" style={{ color: '#059669' }}>
                  Expérience #{i + 1}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold mb-1" style={{ color: '#64748b' }}>Poste *</label>
                    <input className="input-field text-xs" placeholder="Secrétaire…" required
                      value={exp.position} onChange={e => updateFormExp(i, 'position', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold mb-1" style={{ color: '#64748b' }}>Établissement *</label>
                    <input className="input-field text-xs" placeholder="Ministère…" required
                      value={exp.company} onChange={e => updateFormExp(i, 'company', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold mb-1" style={{ color: '#64748b' }}>Début *</label>
                    <input type="date" className="input-field text-xs" required
                      value={exp.start_date} onChange={e => updateFormExp(i, 'start_date', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold mb-1" style={{ color: '#64748b' }}>Fin</label>
                    <input type="date" className="input-field text-xs" disabled={exp.is_current}
                      value={exp.end_date} onChange={e => updateFormExp(i, 'end_date', e.target.value)} />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-[11px] font-semibold cursor-pointer" style={{ color: '#64748b' }}>
                  <input type="checkbox" checked={exp.is_current}
                    onChange={e => updateFormExp(i, 'is_current', e.target.checked)} />
                  Poste actuel
                </label>
                <div>
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: '#64748b' }}>Description</label>
                  <textarea className="input-field text-xs resize-none" rows={2}
                    value={exp.description} onChange={e => updateFormExp(i, 'description', e.target.value)} />
                </div>
              </div>
            ))}
          </div>

          <ModalFooter onCancel={() => setModal(null)}
            submitLabel={editing ? 'Mettre à jour' : 'Créer le membre'}
            loading={saving} color={CA} />
        </form>
      </Modal>
    </div>
  );
}
