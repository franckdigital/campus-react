import { useState, useRef, useEffect } from 'react';
import {
  GraduationCap, Plus, Edit, Trash2, Mail,
  BookOpen, Clock, X, Check, Briefcase,
  Users, UserCheck, Info, ArrowRight, Layers,
  CalendarDays, BarChart3, ChevronRight,
  Phone, FileText, Eye, Award, MapPin,
  TrendingUp, AlertTriangle, Download,
  Upload, FolderOpen, Trash, CheckCircle,
} from 'lucide-react';
import { academicService, sitesService } from '../../services';
import { useNotifications } from '../../components/Notifications';
import { useApi } from '../../hooks/useApi';
import {
  PageHeader, FilterBar, SearchInput, FilterSelect, PrimaryButton,
  Avatar, Modal, FormSection, FormField, FormInput, FormSelect,
  ModalFooter, IconBtn, Pagination, TableContainer, Table, TableRow,
} from '../../components/ui/PageHeader';

/* ── tokens ─────────────────────────────────────────────────── */
const CA = '#0891b2'; const CB = '#ecfeff'; const CI = '#a5f3fc';

/* ── helpers ─────────────────────────────────────────────────── */
const ITEMS = 10;
function list(d) { return Array.isArray(d) ? d : (d?.results || []); }

const CONTRACT_LABELS = {
  PERMANENT: { label: 'Permanent',   bg: '#d1fae5', color: '#059669' },
  CONTRACT:  { label: 'Contractuel', bg: '#fef3c7', color: '#d97706' },
  VISITING:  { label: 'Vacataire',   bg: '#e0e7ff', color: '#6366f1' },
};

const TEACHER_COLORS = ['#6366f1','#0891b2','#059669','#d97706','#db2777','#7c3aed'];
function teacherColor(str) {
  let h = 0; for (let i = 0; i < (str||'').length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return TEACHER_COLORS[Math.abs(h) % TEACHER_COLORS.length];
}

const DAY_ORDER = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];

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

/* ── Workflow steps data ─────────────────────────────────────── */
const WORKFLOW_STEPS = [
  { icon: Layers,      color: '#6366f1', bg: '#ede9fe', title: '1. Créer les filières, niveaux et classes', page: 'Classes',
    desc: 'Définissez la structure académique : filières, niveaux, et classes. Sans classes, aucune affectation n\'est possible.' },
  { icon: BookOpen,    color: '#0891b2', bg: '#ecfeff', title: '2. Créer les matières',                     page: 'Matières',
    desc: 'Ajoutez les matières enseignées et affectez-les aux niveaux concernés.' },
  { icon: GraduationCap, color: '#059669', bg: '#d1fae5', title: '3. Créer les enseignants',               page: 'Enseignants',
    desc: 'Créez le profil de chaque enseignant (données personnelles + professionnelles).' },
  { icon: Briefcase,   color: '#d97706', bg: '#fef3c7', title: '4. Affecter les enseignants',              page: 'Enseignants › Affectations',
    desc: 'Sélectionnez la classe et la matière → cliquez "Affecter". Un enseignant peut enseigner plusieurs matières.' },
  { icon: CalendarDays,color: '#db2777', bg: '#fce7f3', title: '5. Planifier les séances',                 page: 'Emploi du temps',
    desc: 'Créez des sessions (jour, heure, salle). Elles alimentent le calcul de charge horaire.' },
  { icon: BarChart3,   color: '#7c3aed', bg: '#ede9fe', title: '6. Suivre la charge horaire',              page: 'Enseignants › Charge horaire',
    desc: 'L\'onglet "Charge horaire" agrège les séances et affiche les heures/semaine.' },
];

/* ── document type labels ────────────────────────────────────── */
const DOC_TYPE_LABELS = {
  IDENTITY:    { label: "Pièce d'identité", icon: '🪪', color: '#6366f1', bg: '#e0e7ff' },
  DIPLOMA:     { label: 'Diplôme',           icon: '🎓', color: '#0891b2', bg: '#ecfeff' },
  CERTIFICATE: { label: 'Certificat',        icon: '📜', color: '#059669', bg: '#d1fae5' },
  OTHER:       { label: 'Autre',             icon: '📄', color: '#64748b', bg: '#f1f5f9' },
};

/* ── ProfileModal ────────────────────────────────────────────── */
function ProfileModal({ teacher, onClose, onEdit, onFiche, onAffectations }) {
  const [ptab, setPtab] = useState('info');
  const [docs, setDocs]         = useState(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docForm, setDocForm]   = useState({ document_type: 'DIPLOMA', title: '', file: null });
  const fileRef = useRef(null);
  const [exps, setExps]           = useState(null);
  const [expsLoading, setExpsLoading] = useState(false);
  const [savingExp, setSavingExp] = useState(false);
  const [expForm, setExpForm]     = useState({ position: '', company: '', start_date: '', end_date: '', is_current: false, description: '' });

  if (!teacher) return null;
  const color = teacherColor(teacher.full_name || '');
  const ct = CONTRACT_LABELS[teacher.contract_type] || { label: teacher.contract_type, bg: '#f1f5f9', color: '#64748b' };

  async function loadDocs() {
    if (docs !== null) return;
    setDocsLoading(true);
    try {
      const res = await academicService.getTeacherDocuments(teacher.id);
      setDocs(Array.isArray(res) ? res : (res?.results || []));
    } catch { setDocs([]); }
    setDocsLoading(false);
  }

  function switchTab(key) {
    setPtab(key);
    if (key === 'docs') loadDocs();
    if (key === 'exp') loadExps();
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
      const res = await academicService.uploadTeacherDocument(teacher.id, fd);
      setDocs(prev => [res, ...(prev || [])]);
      setDocForm({ document_type: 'DIPLOMA', title: '', file: null });
      if (fileRef.current) fileRef.current.value = '';
    } catch { alert('Erreur lors du téléversement'); }
    setUploading(false);
  }

  async function deleteDoc(doc) {
    if (!window.confirm(`Supprimer "${doc.title}" ?`)) return;
    try {
      await academicService.deleteTeacherDocument(teacher.id, doc.id);
      setDocs(prev => prev.filter(d => d.id !== doc.id));
    } catch { alert('Erreur lors de la suppression'); }
  }

  async function loadExps() {
    if (exps !== null) return;
    setExpsLoading(true);
    try {
      const res = await academicService.getTeacherExperiences(teacher.id);
      setExps(Array.isArray(res) ? res : (res?.results || []));
    } catch { setExps([]); }
    setExpsLoading(false);
  }

  async function saveExp(e) {
    e.preventDefault();
    setSavingExp(true);
    try {
      const payload = { ...expForm };
      if (payload.is_current) payload.end_date = null;
      const res = await academicService.addTeacherExperience(teacher.id, payload);
      setExps(prev => [res, ...(prev || [])]);
      setExpForm({ position: '', company: '', start_date: '', end_date: '', is_current: false, description: '' });
    } catch { alert('Erreur lors de la sauvegarde'); }
    setSavingExp(false);
  }

  async function deleteExp(exp) {
    if (!window.confirm(`Supprimer l'expérience "${exp.position}" ?`)) return;
    try {
      await academicService.deleteTeacherExperience(teacher.id, exp.id);
      setExps(prev => prev.filter(e => e.id !== exp.id));
    } catch { alert('Erreur suppression'); }
  }

  const assignments = teacher._assignments || [];
  const sessions    = teacher._sessions    || [];
  const stats       = teacher._stats       || {};
  const overloaded  = stats.overloaded;
  const barPct      = Math.min(100, Math.round(((stats.weekly_hours || 0) / 20) * 100));
  const barColor    = overloaded ? '#ef4444' : (stats.weekly_hours > 12) ? '#f59e0b' : '#059669';

  const DAYS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];

  return (
    <Modal open onClose={onClose} title="Profil enseignant" accentColor={CA} size="xl">
      {/* Identity banner */}
      <div className="flex items-center gap-4 p-4 rounded-2xl mb-4"
           style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)`, border: `1.5px solid ${color}30` }}>
        <Avatar name={teacher.full_name || '?'} color={color} size="xl" />
        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-base leading-tight" style={{ color: '#0f172a' }}>{teacher.full_name}</p>
          <p className="text-xs font-mono font-bold mt-0.5" style={{ color: CA }}>{teacher.employee_id}</p>
          {teacher.specialization && (
            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{teacher.specialization}</p>
          )}
          <span className="inline-block mt-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                style={{ background: ct.bg, color: ct.color }}>{ct.label}</span>
        </div>
        {/* Quick stats */}
        <div className="hidden sm:flex gap-3">
          {[
            { value: stats.assignments_count ?? assignments.length, label: 'Affect.' },
            { value: stats.classes_count ?? 0, label: 'Classes' },
            { value: `${stats.weekly_hours ?? 0}h`, label: '/sem', color: barColor },
          ].map((s, i) => (
            <div key={i} className="text-center px-3 py-2 rounded-xl" style={{ background: '#fff', border: '1px solid #f1f5f9' }}>
              <p className="text-lg font-extrabold" style={{ color: s.color || '#0f172a' }}>{s.value}</p>
              <p className="text-[10px]" style={{ color: '#94a3b8' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button onClick={onFiche}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
          style={{ background: `linear-gradient(135deg, #1e40af, ${CA})` }}>
          <FileText className="h-3.5 w-3.5" />
          Fiche complète PDF
        </button>
        <button onClick={onAffectations}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: '#f1f5f9', color: '#64748b' }}>
          <Briefcase className="h-3.5 w-3.5" />
          Gérer les affectations
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
          { key: 'aff',  label: `Affectations (${assignments.length})` },
          { key: 'edt',  label: `Emploi du temps (${sessions.length})` },
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
            { icon: Mail,  label: 'E-mail',          value: teacher.user?.email || teacher.email || '—' },
            { icon: Phone, label: 'Téléphone',        value: teacher.user?.phone || teacher.phone || '—' },
            { icon: Award, label: 'Qualification',    value: teacher.qualification || '—' },
            { icon: CalendarDays, label: 'Date d\'embauche', value: teacher.hire_date ? new Date(teacher.hire_date).toLocaleDateString('fr-FR') : '—' },
            { icon: Clock, label: 'Taux horaire',     value: teacher.hourly_rate ? `${parseFloat(teacher.hourly_rate).toLocaleString('fr-FR')} FCFA/h` : '—' },
            { icon: CalendarDays, label: 'Année académique', value: teacher.academic_year_name || '—' },
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

          {/* Charge contractuelle */}
          {(teacher.contract_hours_per_week != null || stats.contract_hours_per_week != null) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { label: 'Charge hebdo. contractuelle', value: `${teacher.contract_hours_per_week ?? stats.contract_hours_per_week ?? 0}h / sem` },
                { label: 'Charge mensuelle calculée',   value: `${(teacher.contract_hours_per_week ?? stats.contract_hours_per_week ?? 0) * 4}h / mois` },
              ].map((k, i) => (
                <div key={i} className="p-3 rounded-xl text-center"
                     style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd' }}>
                  <p className="text-base font-extrabold" style={{ color: CA }}>{k.value}</p>
                  <p className="text-[10px]" style={{ color: '#64748b' }}>{k.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Bio */}
          {(teacher.bio) && (
            <div className="p-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
              <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: '#94a3b8' }}>Biographie</p>
              <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>{teacher.bio}</p>
            </div>
          )}

          {/* Workload bar (sessions réelles) */}
          <div className="p-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#94a3b8' }}>Charge effective (séances planifiées)</p>
              <span className="text-sm font-extrabold" style={{ color: barColor }}>{stats.weekly_hours ?? 0}h / sem</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, background: barColor }} />
            </div>
            {overloaded && (
              <div className="flex items-center gap-1.5 mt-2">
                <AlertTriangle className="h-3.5 w-3.5" style={{ color: '#ef4444' }} />
                <p className="text-xs font-bold" style={{ color: '#ef4444' }}>Surcharge horaire ({stats.weekly_hours}h &gt; 18h)</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Affectations ── */}
      {ptab === 'aff' && (
        <div>
          {assignments.length === 0 ? (
            <div className="flex flex-col items-center py-10 rounded-xl gap-2" style={{ background: '#f8fafc' }}>
              <Briefcase className="h-8 w-8 opacity-20" style={{ color: '#64748b' }} />
              <p className="text-xs" style={{ color: '#94a3b8' }}>Aucune affectation pour cet enseignant</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {assignments.map((a, i) => (
                <div key={a.id ?? i} className="flex items-center gap-3 p-3 rounded-xl"
                     style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                       style={{ background: '#ede9fe' }}>
                    <BookOpen className="h-4 w-4" style={{ color: '#6366f1' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: '#0f172a' }}>
                      <span className="font-mono" style={{ color: '#6366f1' }}>{a.subject_code}</span>
                      {' — '}{a.subject_name}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>
                      {a.class_name} · {a.level_name} · {a.program_name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Emploi du temps ── */}
      {ptab === 'edt' && (
        <div>
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center py-10 rounded-xl gap-2" style={{ background: '#f8fafc' }}>
              <CalendarDays className="h-8 w-8 opacity-20" style={{ color: '#64748b' }} />
              <p className="text-xs" style={{ color: '#94a3b8' }}>Aucune séance planifiée</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {sessions.map((s, i) => (
                <div key={s.id ?? i} className="flex items-center gap-3 p-3 rounded-xl"
                     style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                       style={{ background: '#fce7f3' }}>
                    <CalendarDays className="h-4 w-4" style={{ color: '#db2777' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold" style={{ color: '#0f172a' }}>{s.day_name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                            style={{ background: CB, color: CA }}>{s.start_time} – {s.end_time}</span>
                    </div>
                    <p className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>
                      {s.subject_name} · {s.class_name}{s.room_name ? ` · ${s.room_name}` : ''}
                    </p>
                  </div>
                </div>
              ))}
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
                <input className="input-field text-xs" placeholder="ex: Professeur de Mathématiques"
                  value={expForm.position} onChange={e => setExpForm(p => ({ ...p, position: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: '#64748b' }}>Établissement / Entreprise</label>
                <input className="input-field text-xs" placeholder="ex: Lycée National"
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
          {/* Upload form */}
          <form onSubmit={uploadDoc}
            className="p-4 rounded-2xl space-y-3"
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
                  <option value="DIPLOMA">Diplôme</option>
                  <option value="CERTIFICATE">Certificat</option>
                  <option value="OTHER">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: '#64748b' }}>Intitulé</label>
                <input className="input-field text-xs" placeholder="ex: CNI, Master 2 Informatique…"
                  value={docForm.title}
                  onChange={e => setDocForm(p => ({ ...p, title: e.target.value }))}
                  required />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: '#64748b' }}>Fichier (PDF, image…)</label>
              <input type="file" ref={fileRef}
                className="input-field text-xs"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={e => setDocForm(p => ({ ...p, file: e.target.files[0] || null }))}
                required />
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

          {/* Document list */}
          {docsLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 rounded-full border-2 border-t-transparent animate-spin"
                   style={{ borderColor: CA }} />
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
                          className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors"
                          style={{ background: '#dbeafe' }} title="Télécharger">
                          <Download className="h-3.5 w-3.5" style={{ color: '#1e40af' }} />
                        </a>
                      )}
                      <button onClick={() => deleteDoc(doc)}
                        className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors"
                        style={{ background: '#fef2f2' }} title="Supprimer">
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
export default function Teachers() {
  const { notify } = useNotifications();
  const [tab, setTab]         = useState('list');
  const [search, setSearch]   = useState('');
  const [filterContract, setFilterContract] = useState('');
  const [page, setPage]       = useState(1);
  const [modal, setModal]     = useState(null); // 'teacher' | 'affectations' | 'workflow' | 'profile'
  const [editing, setEditing] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [affSuccess, setAffSuccess] = useState(null); // { teacherName, subjectName, className }
  const [selTeacher, setSelTeacher] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  /* ── data ── */
  const { data: teachersData, loading: ltch, execute: reloadTeachers } =
    useApi(() => academicService.getTeachers({ is_active: true }), [], true);
  const { data: loadData, loading: lloading, execute: reloadLoad } =
    useApi(() => academicService.getTeacherLoad(), [], true);
  const { data: classesData } = useApi(() => academicService.getClasses(), [], true);
  const { data: subjectsData } = useApi(() => academicService.getSubjects(), [], true);
  const { data: academicYearsData } = useApi(() => academicService.getAcademicYears(), [], true);
  const { data: sitesData }         = useApi(() => sitesService.getSites(), [], true);
  const { data: assignmentsData, execute: reloadAssignments } =
    useApi(() => academicService.getClassSubjectTeachers({ is_active: true }), [], true);

  const teachers      = list(teachersData);
  const loadList      = list(loadData);
  const classes       = list(classesData);
  const subjects      = list(subjectsData);
  const assignments   = list(assignmentsData);
  const academicYears = list(academicYearsData);
  const sites         = list(sitesData);

  const teacherAssignments = assignments.filter(a => a.teacher === selTeacher?.id);

  /* ── filters ── */
  const filtTeachers = teachers.filter(t =>
    (!filterContract || t.contract_type === filterContract) &&
    ((t.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
     (t.email || '').toLowerCase().includes(search.toLowerCase()) ||
     (t.employee_id || '').toLowerCase().includes(search.toLowerCase()) ||
     (t.specialization || '').toLowerCase().includes(search.toLowerCase()))
  );
  const filtLoad = loadList.filter(t =>
    (t.full_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalPages     = Math.ceil((tab === 'list' ? filtTeachers : filtLoad).length / ITEMS);
  const paginatedTeachers = filtTeachers.slice((page - 1) * ITEMS, page * ITEMS);
  const paginatedLoad     = filtLoad.slice((page - 1) * ITEMS, page * ITEMS);

  /* ── teacher form ── */
  const emptyForm = {
    first_name: '', last_name: '', email: '', phone: '',
    employee_id: '', specialization: '', qualification: '',
    hire_date: '', contract_type: 'PERMANENT', hourly_rate: '',
    bio: '', password: '', password_confirm: '',
    academic_year: '', contract_hours_per_week: '', site: '',
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

  function openCreate() { setEditing(null); setForm(emptyForm); setFormExps([]); setModal('teacher'); }
  function openEdit(t) {
    setEditing(t);
    setForm({
      first_name: t.user?.first_name || '', last_name: t.user?.last_name || '',
      email: t.user?.email || '',           phone: t.user?.phone || '',
      employee_id: t.employee_id,           specialization: t.specialization,
      qualification: t.qualification,       hire_date: t.hire_date,
      contract_type: t.contract_type,       hourly_rate: t.hourly_rate || '',
      bio: t.bio || '',                     password: '', password_confirm: '',
      academic_year: t.academic_year || '', contract_hours_per_week: t.contract_hours_per_week || '',
      site: t.teacher_sites?.[0]?.site || '',
    });
    setFormExps([]);
    setModal('teacher');
  }

  async function saveTeacher(e) {
    e.preventDefault(); setSaving(true);
    try {
      const profFields = {
        employee_id: form.employee_id, specialization: form.specialization,
        qualification: form.qualification, hire_date: form.hire_date,
        contract_type: form.contract_type, hourly_rate: form.hourly_rate || null,
        bio: form.bio,
        academic_year: form.academic_year || null,
        contract_hours_per_week: form.contract_hours_per_week ? parseInt(form.contract_hours_per_week) : null,
        ...(form.site && !editing ? { site: form.site } : {}),
      };
      if (editing) {
        await academicService.updateTeacher(editing.id, profFields);
      } else {
        await academicService.createTeacher({
          user_data: {
            first_name: form.first_name, last_name: form.last_name,
            email: form.email, phone: form.phone, user_type: 'TEACHER',
            password: form.password, password_confirm: form.password_confirm,
          },
          ...profFields,
        });
      }
      // Save experiences for new teachers (or new ones added in edit mode)
      const savedId = editing ? editing.id : null;
      if (!editing && formExps.length > 0) {
        // Need the created teacher id — refetch to get it
        const updated = await academicService.getTeachers({ is_active: true });
        const all = Array.isArray(updated) ? updated : (updated?.results || []);
        const created = all.find(t => t.employee_id === form.employee_id);
        if (created) {
          await Promise.all(
            formExps.filter(e => e.position && e.company && e.start_date).map(e =>
              academicService.addTeacherExperience(created.id, {
                position: e.position, company: e.company, start_date: e.start_date,
                end_date: e.is_current ? null : (e.end_date || null),
                is_current: e.is_current, description: e.description || '',
              })
            )
          );
        }
      } else if (editing && formExps.length > 0) {
        await Promise.all(
          formExps.filter(e => e.position && e.company && e.start_date).map(e =>
            academicService.addTeacherExperience(editing.id, {
              position: e.position, company: e.company, start_date: e.start_date,
              end_date: e.is_current ? null : (e.end_date || null),
              is_current: e.is_current, description: e.description || '',
            })
          )
        );
      }
      setFormExps([]);
      setModal(null); reloadTeachers(); reloadLoad();
    } catch { alert('Erreur lors de la sauvegarde'); }
    setSaving(false);
  }

  async function deleteTeacher(id) {
    if (!window.confirm('Désactiver cet enseignant ?')) return;
    try { await academicService.updateTeacher(id, { is_active: false }); reloadTeachers(); reloadLoad(); }
    catch { alert('Erreur'); }
  }

  /* ── profile modal ── */
  async function openProfile(t) {
    setSelTeacher(t);
    setProfileData(null);
    setModal('profile');
    setProfileLoading(true);
    try {
      const data = await academicService.getTeacherProfil(t.id);
      // Merge profil data into teacher-like shape for ProfileModal
      setProfileData({
        ...t,
        bio: data.bio,
        phone: data.phone,
        hire_date: data.hire_date,
        hourly_rate: data.hourly_rate,
        qualification: data.qualification,
        _assignments: data.assignments || [],
        _sessions: data.sessions || [],
        _stats: data.stats || {},
      });
    } catch {
      setProfileData({ ...t, _assignments: teacherAssignments, _sessions: [], _stats: {} });
    }
    setProfileLoading(false);
  }

  function openFiche(t) {
    const url = academicService.getTeacherFicheUrl(t.id);
    window.open(url, '_blank');
  }

  /* ── affectation form ── */
  const [affClass,         setAffClass]         = useState('');
  const [affSubject,       setAffSubject]        = useState('');
  const [addingAff,        setAddingAff]         = useState(false);
  const [levelSubjects,    setLevelSubjects]     = useState([]);
  const [loadingLevelSubs, setLoadingLevelSubs]  = useState(false);

  function openAffectations(t) { setSelTeacher(t); setAffClass(''); setAffSubject(''); setLevelSubjects([]); setModal('affectations'); }

  // When affClass changes, load valid subjects for that class's level
  useEffect(() => {
    if (!affClass) { setLevelSubjects([]); setAffSubject(''); return; }
    const cls = classes.find(c => String(c.id) === String(affClass));
    if (!cls?.level) { setLevelSubjects(subjects); setAffSubject(''); return; }
    setLoadingLevelSubs(true);
    setAffSubject('');
    academicService.getLevelSubjects({ level: cls.level, is_active: true })
      .then(d => {
        const ls = Array.isArray(d) ? d : (d?.results || []);
        // Map level-subject entries to subject objects
        const subjectIds = new Set(ls.map(ls => String(ls.subject)));
        setLevelSubjects(subjects.filter(s => subjectIds.has(String(s.id))));
      })
      .catch(() => setLevelSubjects(subjects))
      .finally(() => setLoadingLevelSubs(false));
  }, [affClass, classes, subjects]);

  async function addAffectation() {
    if (!affClass || !affSubject || !selTeacher) return;
    setAddingAff(true);
    try {
      await academicService.createClassSubjectTeacher({
        class_obj: affClass, subject: affSubject, teacher: selTeacher.id,
      });
      const className   = classes.find(c => String(c.id) === String(affClass))?.name || '';
      const subjectName = (levelSubjects.length ? levelSubjects : subjects).find(s => String(s.id) === String(affSubject))?.name || '';
      setAffSuccess({ teacherName: selTeacher.full_name, subjectName, className });
      setAffClass(''); setAffSubject(''); setLevelSubjects([]);
      reloadAssignments(); reloadTeachers();
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.non_field_errors?.[0] || 'Erreur (données manquantes ou conflit)';
      notify(msg, 'error');
    }
    setAddingAff(false);
  }

  async function removeAffectation(id) {
    if (!window.confirm('Retirer cette affectation ?')) return;
    try { await academicService.deleteClassSubjectTeacher(id); reloadAssignments(); reloadTeachers(); notify('Affectation retirée.', 'warning'); }
    catch { notify('Erreur lors de la suppression.', 'error'); }
  }

  /* ── KPIs ── */
  const activeCount    = teachers.length;
  const permanentCount = teachers.filter(t => t.contract_type === 'PERMANENT').length;
  const contractCount  = teachers.filter(t => t.contract_type === 'CONTRACT').length;
  const visitingCount  = teachers.filter(t => t.contract_type === 'VISITING').length;
  const totalHours     = loadList.reduce((s, t) => s + (t.weekly_hours || 0), 0);
  const assignedCount  = assignments.length;
  const overloadedCount = loadList.filter(t => t.weekly_hours > 18).length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={GraduationCap} iconColor={CA} iconBg={CI}
        title="Gestion des Enseignants"
        subtitle={`${activeCount} enseignant${activeCount > 1 ? 's' : ''} · affectations et charge horaire`}
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => setModal('workflow')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
              <Info className="h-3.5 w-3.5" />
              Comment ça marche ?
            </button>
            <PrimaryButton icon={Plus} label="Nouvel enseignant" color={CA} onClick={openCreate} />
          </div>
        }
      />

      {/* KPI strip — 4 cols main + overload warning */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        {[
          { icon: Users,     label: 'Enseignants',  value: activeCount,                  color: CA,        bg: CB },
          { icon: UserCheck, label: 'Permanents',   value: permanentCount,               color: '#059669', bg: '#d1fae5' },
          { icon: Briefcase, label: 'Affectations', value: assignedCount,                color: '#7c3aed', bg: '#ede9fe' },
          { icon: Clock,     label: 'H total/sem',  value: `${totalHours.toFixed(0)}h`,  color: '#d97706', bg: '#fef3c7' },
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

      {/* Secondary KPI — contrat breakdown + overload */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Contractuels', value: contractCount,  color: '#d97706', bg: '#fef3c7' },
          { label: 'Vacataires',   value: visitingCount,  color: '#6366f1', bg: '#e0e7ff' },
          { label: 'Surcharges',   value: overloadedCount, color: '#ef4444', bg: '#fef2f2',
            extra: overloadedCount > 0 ? <AlertTriangle className="h-3.5 w-3.5 ml-1" style={{ color: '#ef4444' }} /> : null },
          { label: 'Cours assignés', value: loadList.reduce((s, t) => s + (t.subjects_count || 0), 0),
            color: '#0891b2', bg: '#ecfeff' },
        ].map((k, i) => (
          <div key={i} className="card p-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <p className="text-lg font-extrabold" style={{ color: k.color }}>{k.value}</p>
                {k.extra}
              </div>
              <p className="text-[11px]" style={{ color: '#94a3b8' }}>{k.label}</p>
            </div>
            <div className="h-2 w-16 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
              <div className="h-full rounded-full" style={{
                width: `${activeCount > 0 ? Math.round((k.value / activeCount) * 100) : 0}%`,
                background: k.color,
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-2xl mb-6 w-fit"
           style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <Tab active={tab === 'list'} onClick={() => { setTab('list'); setPage(1); }}
             label="Enseignants" count={teachers.length} />
        <Tab active={tab === 'aff'}  onClick={() => { setTab('aff'); setPage(1); }}
             label="Affectations" count={assignments.length} />
        <Tab active={tab === 'load'} onClick={() => { setTab('load'); setPage(1); }}
             label="Charge horaire" count={null} />
      </div>

      <FilterBar>
        <SearchInput value={search} onChange={e => setSearch(e.target.value)}
          placeholder={tab === 'load' ? 'Filtrer un enseignant…' : 'Nom, e-mail, matricule…'} />
        {tab === 'list' && (
          <FilterSelect value={filterContract} onChange={e => setFilterContract(e.target.value)}>
            <option value="">Tous les contrats</option>
            <option value="PERMANENT">Permanent</option>
            <option value="CONTRACT">Contractuel</option>
            <option value="VISITING">Vacataire</option>
          </FilterSelect>
        )}
      </FilterBar>

      {/* ══ TAB: list ══════════════════════════════════════════════ */}
      {tab === 'list' && (
        <TableContainer loading={ltch} empty={filtTeachers.length === 0}
          emptyIcon={GraduationCap} emptyText="Aucun enseignant trouvé">
          <Table headers={['Enseignant', 'Matricule', 'Spécialité', 'Contrat', 'Charge', 'Actions']}>
            {paginatedTeachers.map(t => {
              const color = teacherColor(t.full_name || '');
              const ct = CONTRACT_LABELS[t.contract_type] || { label: t.contract_type, bg: '#f1f5f9', color: '#64748b' };
              const loadEntry = loadList.find(l => l.id === t.id);
              const wh = loadEntry?.weekly_hours ?? 0;
              const isOverloaded = wh > 18;
              const loadColor = isOverloaded ? '#ef4444' : wh > 12 ? '#f59e0b' : '#059669';
              return (
                <TableRow key={t.id} onClick={() => openProfile(t)}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={t.full_name || '?'} color={color} size="md" />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>{t.full_name}</p>
                        <p className="text-xs flex items-center gap-1" style={{ color: '#94a3b8' }}>
                          <Mail className="h-3 w-3" />{t.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="text-xs font-mono font-bold" style={{ color: CA }}>{t.employee_id}</span>
                  </td>
                  <td>
                    <span className="text-xs" style={{ color: '#64748b' }}>{t.specialization || '—'}</span>
                  </td>
                  <td>
                    <span className="text-[11px] font-bold px-2 py-1 rounded-full"
                          style={{ background: ct.bg, color: ct.color }}>{ct.label}</span>
                  </td>
                  <td>
                    {loadEntry ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={{ color: loadColor }}>{wh}h</span>
                        {isOverloaded && <AlertTriangle className="h-3.5 w-3.5" style={{ color: '#ef4444' }} />}
                      </div>
                    ) : <span className="text-xs" style={{ color: '#94a3b8' }}>—</span>}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <IconBtn icon={Eye}      color={CA}       hoverBg={CB}        title="Voir profil"    onClick={() => openProfile(t)} />
                      <IconBtn icon={FileText} color="#1e40af"  hoverBg="#dbeafe"   title="Fiche PDF"      onClick={() => openFiche(t)} />
                      <IconBtn icon={Briefcase}color={CA}       hoverBg={CB}        title="Affectations"   onClick={() => openAffectations(t)} />
                      <IconBtn icon={Edit}     color="#64748b"  hoverBg="#f1f5f9"   title="Modifier"       onClick={() => openEdit(t)} />
                      <IconBtn icon={Trash2}   color="#ef4444"  hoverBg="#fef2f2"   title="Désactiver"     onClick={() => deleteTeacher(t.id)} />
                    </div>
                  </td>
                </TableRow>
              );
            })}
          </Table>
          <div className="px-4">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage}
              accentColor={CA} totalItems={filtTeachers.length} itemsPerPage={ITEMS} />
          </div>
        </TableContainer>
      )}

      {/* ══ TAB: affectations ══════════════════════════════════════ */}
      {tab === 'aff' && (
        <TableContainer loading={false} empty={assignments.length === 0}
          emptyIcon={Briefcase} emptyText="Aucune affectation enregistrée">
          <Table headers={['Enseignant', 'Matière', 'Classe', 'Filière / Niveau', 'Actions']}>
            {assignments.map(a => {
              const color = teacherColor(a.teacher_name || '');
              return (
                <TableRow key={a.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar name={a.teacher_name || '?'} color={color} size="sm" />
                      <div>
                        <p className="text-xs font-semibold" style={{ color: '#0f172a' }}>{a.teacher_name}</p>
                        <p className="text-[10px]" style={{ color: '#94a3b8' }}>{a.teacher_employee_id}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="text-xs font-mono font-bold" style={{ color: '#7c3aed' }}>{a.subject_code}</span>
                    <p className="text-xs" style={{ color: '#1e293b' }}>{a.subject_name}</p>
                  </td>
                  <td>
                    <span className="text-xs font-semibold" style={{ color: CA }}>{a.class_name}</span>
                    <p className="text-[10px]" style={{ color: '#94a3b8' }}>{a.class_code}</p>
                  </td>
                  <td>
                    <p className="text-xs" style={{ color: '#1e293b' }}>{a.program_name}</p>
                    <p className="text-[10px]" style={{ color: '#94a3b8' }}>{a.level_name}</p>
                  </td>
                  <td>
                    <IconBtn icon={Trash2} color="#ef4444" hoverBg="#fef2f2"
                      onClick={() => removeAffectation(a.id)} />
                  </td>
                </TableRow>
              );
            })}
          </Table>
        </TableContainer>
      )}

      {/* ══ TAB: charge horaire ════════════════════════════════════ */}
      {tab === 'load' && (
        <TableContainer loading={lloading} empty={filtLoad.length === 0}
          emptyIcon={Clock} emptyText="Aucune donnée de charge">
          <Table headers={['Enseignant', 'Contrat', 'Classes', 'Matières', 'Séances/sem', 'H/semaine', 'Charge', 'Fiche']}>
            {paginatedLoad.map(t => {
              const pct = Math.min(100, Math.round((t.weekly_hours / 20) * 100));
              const overloaded = t.weekly_hours > 18;
              const barColor = overloaded ? '#ef4444' : t.weekly_hours > 12 ? '#f59e0b' : '#059669';
              const ct = CONTRACT_LABELS[t.contract_type] || { label: t.contract_type, bg: '#f1f5f9', color: '#64748b' };
              return (
                <TableRow key={t.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={t.full_name} color={teacherColor(t.full_name)} size="sm" />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>{t.full_name}</p>
                        <p className="text-xs" style={{ color: '#94a3b8' }}>{t.specialization || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="text-[11px] font-bold px-2 py-1 rounded-full"
                          style={{ background: ct.bg, color: ct.color }}>{ct.label}</span>
                  </td>
                  <td><span className="text-sm font-bold" style={{ color: '#1e293b' }}>{t.classes_count}</span></td>
                  <td><span className="text-sm font-bold" style={{ color: '#1e293b' }}>{t.subjects_count}</span></td>
                  <td><span className="text-sm font-bold" style={{ color: '#1e293b' }}>{t.sessions_count}</span></td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-extrabold" style={{ color: barColor }}>{t.weekly_hours}h</span>
                      {overloaded && <AlertTriangle className="h-3.5 w-3.5" style={{ color: '#ef4444' }} />}
                    </div>
                  </td>
                  <td style={{ minWidth: 110 }}>
                    <div className="space-y-1">
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: '#f1f5f9', width: 90 }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                      </div>
                      {overloaded && (
                        <p className="text-[10px] font-bold" style={{ color: '#ef4444' }}>Surcharge</p>
                      )}
                    </div>
                  </td>
                  <td>
                    <IconBtn icon={FileText} color="#1e40af" hoverBg="#dbeafe" title="Fiche PDF"
                      onClick={() => { const url = academicService.getTeacherFicheUrl(t.id); window.open(url, '_blank'); }} />
                  </td>
                </TableRow>
              );
            })}
          </Table>
          <div className="px-4">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage}
              accentColor={CA} totalItems={filtLoad.length} itemsPerPage={ITEMS} />
          </div>
        </TableContainer>
      )}

      {/* ══ Modal: Profile ════════════════════════════════════════ */}
      {modal === 'profile' && (
        profileLoading ? (
          <Modal open onClose={() => setModal(null)} title="Profil enseignant" accentColor={CA} size="xl">
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
                   style={{ borderColor: CA }} />
            </div>
          </Modal>
        ) : (
          <ProfileModal
            teacher={profileData || selTeacher}
            onClose={() => setModal(null)}
            onEdit={() => { setModal(null); openEdit(selTeacher); }}
            onFiche={() => openFiche(selTeacher)}
            onAffectations={() => { setModal(null); openAffectations(selTeacher); }}
          />
        )
      )}

      {/* ══ Modal: Affectations ════════════════════════════════════ */}
      <Modal open={modal === 'affectations'} onClose={() => setModal(null)}
             title="Affectations enseignant" accentColor={CA} size="md">
        {selTeacher && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 rounded-2xl" style={{ background: CB }}>
              <Avatar name={selTeacher.full_name || '?'} color={teacherColor(selTeacher.full_name || '')} size="lg" />
              <div>
                <p className="font-extrabold text-sm" style={{ color: '#0f172a' }}>{selTeacher.full_name}</p>
                <p className="text-xs font-mono font-bold" style={{ color: CA }}>{selTeacher.employee_id}</p>
                <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{selTeacher.specialization || 'Aucune spécialité'}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-2xl font-extrabold" style={{ color: CA }}>{teacherAssignments.length}</p>
                <p className="text-[10px]" style={{ color: '#94a3b8' }}>affectation{teacherAssignments.length > 1 ? 's' : ''}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold mb-2" style={{ color: '#64748b' }}>Affectations actuelles</p>
              {teacherAssignments.length === 0 ? (
                <div className="flex flex-col items-center py-8 rounded-xl gap-2" style={{ background: '#f8fafc' }}>
                  <Briefcase className="h-8 w-8 opacity-20" style={{ color: '#64748b' }} />
                  <p className="text-xs" style={{ color: '#94a3b8' }}>Aucune affectation pour cet enseignant</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {teacherAssignments.map(a => (
                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl"
                         style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: '#0f172a' }}>
                          <span className="font-mono" style={{ color: '#7c3aed' }}>{a.subject_code}</span>
                          {' '}{a.subject_name}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>
                          {a.class_name} · {a.level_name}
                        </p>
                      </div>
                      <IconBtn icon={Trash2} size="sm" color="#ef4444" hoverBg="#fef2f2"
                        onClick={() => removeAffectation(a.id)} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 pt-4" style={{ borderTop: '2px dashed #e2e8f0' }}>
              <p className="text-xs font-bold" style={{ color: '#64748b' }}>Nouvelle affectation</p>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: '#64748b' }}>Classe</label>
                  <select className="input-field text-xs" value={affClass} onChange={e => setAffClass(e.target.value)}>
                    <option value="">— Sélectionner une classe —</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: '#64748b' }}>
                    Matière
                    {affClass && (
                      <span className="ml-1 font-normal" style={{ color: '#94a3b8' }}>
                        {loadingLevelSubs ? '(chargement…)' : levelSubjects.length > 0 ? `(${levelSubjects.length} disponibles pour ce niveau)` : '(toutes)'}
                      </span>
                    )}
                  </label>
                  <select className="input-field text-xs" value={affSubject}
                    onChange={e => setAffSubject(e.target.value)}
                    disabled={loadingLevelSubs || !affClass}>
                    <option value="">— Sélectionner une matière —</option>
                    {(affClass && levelSubjects.length > 0 ? levelSubjects : subjects).map(s => (
                      <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button onClick={addAffectation} disabled={!affClass || !affSubject || addingAff}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                style={{ background: `linear-gradient(135deg, ${CA}, ${CA}cc)` }}>
                {addingAff
                  ? <div className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  : <Check className="h-4 w-4" />}
                Affecter à cette classe
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ══ Modal: Affectation succès ═════════════════════════════ */}
      {affSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(8,12,36,0.55)', backdropFilter: 'blur(8px)' }}
          onClick={() => setAffSuccess(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7 flex flex-col items-center gap-4"
            onClick={e => e.stopPropagation()}>
            <div className="h-16 w-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>
              <CheckCircle className="h-8 w-8" style={{ color: '#059669' }} />
            </div>
            <div className="text-center space-y-1">
              <p className="text-base font-extrabold" style={{ color: '#0f172a' }}>Affectation réussie !</p>
              <p className="text-sm" style={{ color: '#475569' }}>
                <span className="font-bold" style={{ color: CA }}>{affSuccess.teacherName}</span> a été affecté(e) à
              </p>
              <div className="mt-3 rounded-xl p-3 space-y-1.5" style={{ background: '#f0fdfa', border: '1px solid #99f6e4' }}>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 flex-shrink-0" style={{ color: CA }} />
                  <span className="text-sm font-semibold" style={{ color: '#0f172a' }}>{affSuccess.subjectName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 flex-shrink-0" style={{ color: CA }} />
                  <span className="text-sm font-semibold" style={{ color: '#0f172a' }}>{affSuccess.className}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setAffSuccess(null)}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${CA}, ${CA}cc)` }}>
              Parfait !
            </button>
          </div>
        </div>
      )}

      {/* ══ Modal: Workflow ════════════════════════════════════════ */}
      <Modal open={modal === 'workflow'} onClose={() => setModal(null)}
             title="Workflow — De la création au suivi de charge" accentColor={CA} size="lg">
        <div className="space-y-3">
          <p className="text-xs mb-4" style={{ color: '#64748b' }}>
            Suivez ces 6 étapes pour gérer complètement vos enseignants.
          </p>
          {WORKFLOW_STEPS.map((step, i) => (
            <div key={i} className="relative">
              <div className="flex gap-4 p-4 rounded-2xl"
                   style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: step.bg }}>
                  <step.icon className="h-5 w-5" style={{ color: step.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold mb-1" style={{ color: '#0f172a' }}>{step.title}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: step.bg, color: step.color }}>{step.page}</span>
                  <p className="text-xs leading-relaxed mt-1.5" style={{ color: '#64748b' }}>{step.desc}</p>
                </div>
              </div>
              {i < WORKFLOW_STEPS.length - 1 && (
                <div className="flex justify-center my-0.5">
                  <ChevronRight className="h-4 w-4 rotate-90" style={{ color: '#cbd5e1' }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </Modal>

      {/* ══ Modal: Teacher form ════════════════════════════════════ */}
      <Modal open={modal === 'teacher'} onClose={() => setModal(null)}
             title={editing ? "Modifier l'enseignant" : 'Nouvel enseignant'}
             accentColor={CA} size="lg">
        <form onSubmit={saveTeacher} className="space-y-5">
          {!editing && (
            <FormSection title="Informations personnelles" icon={GraduationCap}>
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
            <FormField label="Matricule employé" required>
              <FormInput {...f('employee_id')} placeholder="ENS-2026-0001" required />
            </FormField>
            <FormField label="Type de contrat" required>
              <FormSelect {...f('contract_type')} required>
                <option value="PERMANENT">Permanent</option>
                <option value="CONTRACT">Contractuel</option>
                <option value="VISITING">Vacataire</option>
              </FormSelect>
            </FormField>
            <FormField label="Spécialisation">
              <FormInput {...f('specialization')} placeholder="ex: Informatique, Mathématiques…" />
            </FormField>
            <FormField label="Qualification">
              <FormInput {...f('qualification')} placeholder="ex: Doctorat, Master…" />
            </FormField>
            <FormField label="Date d'embauche" required>
              <FormInput type="date" {...f('hire_date')} required />
            </FormField>
            <FormField label="Taux horaire (FCFA)">
              <FormInput type="number" {...f('hourly_rate')} placeholder="Optionnel" min="0" />
            </FormField>
            <FormField label="Année académique">
              <FormSelect {...f('academic_year')}>
                <option value="">— Sélectionner —</option>
                {academicYears.map(y => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </FormSelect>
            </FormField>
            <FormField label="Site / Campus">
              <FormSelect {...f('site')}>
                <option value="">— Sélectionner —</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </FormSelect>
            </FormField>
            <FormField label="Charge horaire hebdo. (h/sem)">
              <FormInput type="number" {...f('contract_hours_per_week')} placeholder="ex: 18" min="0" max="60" />
            </FormField>
            {form.contract_hours_per_week && (
              <FormField label="Charge mensuelle calculée">
                <div className="input-field text-sm font-bold" style={{ color: CA, background: '#f0f9ff', cursor: 'default' }}>
                  {parseInt(form.contract_hours_per_week || 0) * 4}h / mois
                </div>
              </FormField>
            )}
          </FormSection>
          {/* Bio — full width */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold" style={{ color: '#374151' }}>
              Biographie / Notes
            </label>
            <textarea
              className="input-field text-sm resize-none"
              rows={3}
              placeholder="Présentation courte de l'enseignant (optionnel)…"
              value={form.bio}
              onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
              style={{ minHeight: 72 }}
            />
          </div>

          {/* Expériences professionnelles — dynamic */}
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
                Cliquez sur "Ajouter" pour saisir une expérience passée.
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
                    <label className="block text-[10px] font-semibold mb-1" style={{ color: '#64748b' }}>Poste / Titre *</label>
                    <input className="input-field text-xs" placeholder="Professeur…" required
                      value={exp.position} onChange={e => updateFormExp(i, 'position', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold mb-1" style={{ color: '#64748b' }}>Établissement *</label>
                    <input className="input-field text-xs" placeholder="Lycée / Université…" required
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
            submitLabel={editing ? 'Mettre à jour' : "Créer l'enseignant"}
            loading={saving} color={CA} />
        </form>
      </Modal>
    </div>
  );
}
