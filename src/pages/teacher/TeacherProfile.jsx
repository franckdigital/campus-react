import { useState, useEffect, useRef } from 'react';
import {
  User, Mail, Phone, Award, Briefcase, CalendarDays,
  BookOpen, Clock, MapPin, Save, Edit, X, Plus,
  FileText, Download, Trash, FolderOpen, Upload,
  AlertTriangle, Check,
} from 'lucide-react';
import { academicService } from '../../services';
import { useNotifications } from '../../components/Notifications';

/* ── constants ─────────────────────────────────────────────────── */
const CONTRACT_LABELS = {
  PERMANENT: { label: 'Permanent',   bg: '#d1fae5', color: '#059669' },
  CONTRACT:  { label: 'Contractuel', bg: '#fef3c7', color: '#d97706' },
  VISITING:  { label: 'Vacataire',   bg: '#e0e7ff', color: '#6366f1' },
};

const DOC_TYPE_LABELS = {
  IDENTITY:    { label: "Pièce d'identité", icon: '🪪', color: '#6366f1', bg: '#e0e7ff' },
  DIPLOMA:     { label: 'Diplôme',           icon: '🎓', color: '#0891b2', bg: '#ecfeff' },
  CERTIFICATE: { label: 'Certificat',        icon: '📜', color: '#059669', bg: '#d1fae5' },
  OTHER:       { label: 'Autre',             icon: '📄', color: '#64748b', bg: '#f1f5f9' },
};

const TC = '#0891b2'; // teal accent
const TB = '#ecfeff'; // teal background

const TEACHER_COLORS = ['#6366f1','#0891b2','#059669','#d97706','#db2777','#7c3aed'];
function teacherColor(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return TEACHER_COLORS[Math.abs(h) % TEACHER_COLORS.length];
}

const DAYS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];

/* ── sub-components ────────────────────────────────────────────── */
function Tab({ active, onClick, label }) {
  return (
    <button onClick={onClick}
      className="px-4 py-2 text-xs font-semibold rounded-xl transition-all"
      style={{ background: active ? TB : 'transparent', color: active ? TC : '#64748b' }}>
      {label}
    </button>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl"
         style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
      <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
           style={{ background: TB }}>
        <Icon className="h-4 w-4" style={{ color: TC }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#94a3b8' }}>{label}</p>
        <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>{value || '—'}</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
export default function TeacherProfile() {
  const { notify } = useNotifications();
  const fileRef = useRef(null);

  // ── state ──
  const [teacher,      setTeacher]      = useState(null);
  const [assignments,  setAssignments]  = useState([]);
  const [sessions,     setSessions]     = useState([]);
  const [stats,        setStats]        = useState({});
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState('info');

  // edit info
  const [editing,      setEditing]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [form,         setForm]         = useState({ bio: '', specialization: '', qualification: '' });

  // experiences
  const [exps,         setExps]         = useState(null);
  const [expsLoading,  setExpsLoading]  = useState(false);
  const [savingExp,    setSavingExp]    = useState(false);
  const [expForm,      setExpForm]      = useState({ position: '', company: '', start_date: '', end_date: '', is_current: false, description: '' });

  // documents
  const [docs,         setDocs]         = useState(null);
  const [docsLoading,  setDocsLoading]  = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [docForm,      setDocForm]      = useState({ document_type: 'DIPLOMA', title: '', file: null });

  /* ── load teacher profile on mount ── */
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const me = await academicService.getTeacherMe();
        if (!me?.id) return;
        setTeacher(me);
        setForm({ bio: me.bio || '', specialization: me.specialization || '', qualification: me.qualification || '' });

        const [profRes, sessRes] = await Promise.allSettled([
          academicService.getTeacherProfil(me.id),
          academicService.getTeacherSessions(me.id),
        ]);

        if (profRes.status === 'fulfilled') {
          const p = profRes.value;
          setAssignments(p.assignments || []);
          setSessions(p.sessions || []);
          setStats(p.stats || {});
        } else if (sessRes.status === 'fulfilled') {
          const arr = sessRes.value?.results || sessRes.value || [];
          setSessions(arr);
        }
      } catch (e) { console.log('Profile:', e.message); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  /* ── switch tab lazy-loading ── */
  function switchTab(key) {
    setTab(key);
    if (key === 'exp'  && exps  === null) loadExps();
    if (key === 'docs' && docs  === null) loadDocs();
  }

  /* ── edit profile ── */
  async function handleSave(e) {
    e.preventDefault();
    if (!teacher) return;
    setSaving(true);
    try {
      const updated = await academicService.updateTeacher(teacher.id, {
        bio: form.bio, specialization: form.specialization, qualification: form.qualification,
      });
      setTeacher(prev => ({ ...prev, ...updated }));
      notify('Profil mis à jour', 'success');
      setEditing(false);
    } catch { notify('Erreur lors de la mise à jour', 'error'); }
    finally { setSaving(false); }
  }

  /* ── experiences ── */
  async function loadExps() {
    if (!teacher) return;
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
      notify('Expérience ajoutée', 'success');
    } catch { notify('Erreur lors de la sauvegarde', 'error'); }
    setSavingExp(false);
  }

  async function deleteExp(exp) {
    if (!window.confirm(`Supprimer l'expérience "${exp.position}" ?`)) return;
    try {
      await academicService.deleteTeacherExperience(teacher.id, exp.id);
      setExps(prev => prev.filter(e => e.id !== exp.id));
      notify('Expérience supprimée', 'success');
    } catch { notify('Erreur', 'error'); }
  }

  /* ── documents ── */
  async function loadDocs() {
    if (!teacher) return;
    setDocsLoading(true);
    try {
      const res = await academicService.getTeacherDocuments(teacher.id);
      setDocs(Array.isArray(res) ? res : (res?.results || []));
    } catch { setDocs([]); }
    setDocsLoading(false);
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
      notify('Document téléversé', 'success');
    } catch { notify('Erreur lors du téléversement', 'error'); }
    setUploading(false);
  }

  async function deleteDoc(doc) {
    if (!window.confirm(`Supprimer "${doc.title}" ?`)) return;
    try {
      await academicService.deleteTeacherDocument(teacher.id, doc.id);
      setDocs(prev => prev.filter(d => d.id !== doc.id));
      notify('Document supprimé', 'success');
    } catch { notify('Erreur', 'error'); }
  }

  /* ── derived ── */
  const weeklyHours  = stats.weekly_hours ?? 0;
  const overloaded   = weeklyHours > 18;
  const barPct       = Math.min(100, Math.round((weeklyHours / 20) * 100));
  const barColor     = overloaded ? '#ef4444' : weeklyHours > 12 ? '#f59e0b' : '#059669';
  const ficheUrl     = teacher ? academicService.getTeacherFicheUrl(teacher.id) : null;

  /* ── loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
             style={{ borderColor: TC }} />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="card p-12 flex flex-col items-center gap-3">
        <User className="h-12 w-12 opacity-20" style={{ color: '#64748b' }} />
        <p className="text-sm font-semibold" style={{ color: '#94a3b8' }}>Profil introuvable</p>
      </div>
    );
  }

  const color     = teacherColor(teacher.user?.full_name || `${teacher.user?.first_name} ${teacher.user?.last_name}`);
  const fullName  = teacher.user?.full_name || `${teacher.user?.first_name || ''} ${teacher.user?.last_name || ''}`.trim();
  const initials  = `${teacher.user?.first_name?.[0] || ''}${teacher.user?.last_name?.[0] || ''}`.toUpperCase() || 'EN';
  const ct        = CONTRACT_LABELS[teacher.contract_type] || { label: teacher.contract_type, bg: '#f1f5f9', color: '#64748b' };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">

      {/* ── Page title ───────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: TB }}>
            <User className="h-3 w-3" style={{ color: TC }} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: TC }}>Profil</span>
        </div>
        <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a', letterSpacing: '-0.03em' }}>Mon profil</h1>
      </div>

      {/* ── Identity banner ──────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center gap-4 p-4 rounded-2xl mb-4"
             style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)`, border: `1.5px solid ${color}30` }}>
          {/* Avatar */}
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-white text-xl font-extrabold flex-shrink-0"
               style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-base leading-tight" style={{ color: '#0f172a' }}>{fullName}</p>
            <p className="text-xs font-mono font-bold mt-0.5" style={{ color: TC }}>{teacher.employee_id}</p>
            {teacher.specialization && (
              <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{teacher.specialization}</p>
            )}
            <span className="inline-block mt-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                  style={{ background: ct.bg, color: ct.color }}>{ct.label}</span>
          </div>

          {/* Quick stats */}
          <div className="hidden sm:flex gap-3">
            {[
              { value: assignments.length,   label: 'Affect.' },
              { value: stats.classes_count ?? new Set(sessions.map(s => s.class_obj)).size, label: 'Classes' },
              { value: `${weeklyHours}h`,    label: '/sem', color: barColor },
            ].map((s, i) => (
              <div key={i} className="text-center px-3 py-2 rounded-xl"
                   style={{ background: '#fff', border: '1px solid #f1f5f9' }}>
                <p className="text-lg font-extrabold" style={{ color: s.color || '#0f172a' }}>{s.value}</p>
                <p className="text-[10px]" style={{ color: '#94a3b8' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sites */}
        {teacher.sites?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {teacher.sites.map(ts => (
              <div key={ts.id} className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold"
                   style={{ background: ts.is_primary ? TB : '#f8fafc', color: ts.is_primary ? TC : '#64748b', border: `1px solid ${ts.is_primary ? '#a5f3fc' : '#e2e8f0'}` }}>
                <MapPin className="h-3 w-3" />
                {ts.site_name}
                {ts.is_primary && <span className="text-[9px] font-bold ml-0.5">(principal)</span>}
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {ficheUrl && (
            <a href={ficheUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #1e40af, #0891b2)' }}>
              <FileText className="h-3.5 w-3.5" />
              Fiche complète PDF
            </a>
          )}
          {!editing ? (
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: '#f1f5f9', color: '#64748b' }}>
              <Edit className="h-3.5 w-3.5" />
              Modifier
            </button>
          ) : (
            <button onClick={() => { setEditing(false); setForm({ bio: teacher.bio || '', specialization: teacher.specialization || '', qualification: teacher.qualification || '' }); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: '#fef2f2', color: '#ef4444' }}>
              <X className="h-3.5 w-3.5" />
              Annuler
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-2xl flex-wrap"
           style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <Tab active={tab === 'info'} onClick={() => switchTab('info')} label="Informations" />
        <Tab active={tab === 'aff'}  onClick={() => switchTab('aff')}  label={`Affectations (${assignments.length})`} />
        <Tab active={tab === 'edt'}  onClick={() => switchTab('edt')}  label={`Emploi du temps (${sessions.length})`} />
        <Tab active={tab === 'exp'}  onClick={() => switchTab('exp')}  label="Expériences" />
        <Tab active={tab === 'docs'} onClick={() => switchTab('docs')} label="Documents" />
      </div>

      {/* ══ TAB: Informations ══════════════════════════════════════ */}
      {tab === 'info' && (
        <div className="card p-5 space-y-3">
          {/* Read-only info rows */}
          {[
            { icon: Mail,         label: 'E-mail',           value: teacher.user?.email },
            { icon: Phone,        label: 'Téléphone',        value: teacher.user?.phone },
            { icon: CalendarDays, label: "Date d'embauche",  value: teacher.hire_date ? new Date(teacher.hire_date).toLocaleDateString('fr-FR') : null },
            { icon: Clock,        label: 'Taux horaire',     value: teacher.hourly_rate ? `${parseFloat(teacher.hourly_rate).toLocaleString('fr-FR')} FCFA/h` : null },
            { icon: CalendarDays, label: 'Année académique', value: teacher.academic_year_name },
          ].map((row, i) => (
            <InfoRow key={i} icon={row.icon} label={row.label} value={row.value} />
          ))}

          {/* Charge hebdo */}
          {teacher.contract_hours_per_week != null && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Charge contractuelle',  value: `${teacher.contract_hours_per_week}h / sem` },
                { label: 'Charge mensuelle',      value: `${teacher.contract_hours_per_week * 4}h / mois` },
              ].map((k, i) => (
                <div key={i} className="p-3 rounded-xl text-center"
                     style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd' }}>
                  <p className="text-base font-extrabold" style={{ color: TC }}>{k.value}</p>
                  <p className="text-[10px]" style={{ color: '#64748b' }}>{k.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Workload bar */}
          {weeklyHours > 0 && (
            <div className="p-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#94a3b8' }}>Charge effective (séances planifiées)</p>
                <span className="text-sm font-extrabold" style={{ color: barColor }}>{weeklyHours}h / sem</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, background: barColor }} />
              </div>
              {overloaded && (
                <div className="flex items-center gap-1.5 mt-2">
                  <AlertTriangle className="h-3.5 w-3.5" style={{ color: '#ef4444' }} />
                  <p className="text-xs font-bold" style={{ color: '#ef4444' }}>Surcharge horaire ({weeklyHours}h &gt; 18h)</p>
                </div>
              )}
            </div>
          )}

          {/* Editable fields */}
          {!editing ? (
            <>
              {(teacher.specialization || teacher.qualification || teacher.bio) && (
                <div className="pt-2 space-y-2">
                  {teacher.specialization && <InfoRow icon={Award} label="Spécialisation" value={teacher.specialization} />}
                  {teacher.qualification  && <InfoRow icon={Award} label="Qualification"  value={teacher.qualification} />}
                  {teacher.bio && (
                    <div className="p-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                      <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>Biographie</p>
                      <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>{teacher.bio}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleSave} className="pt-3 space-y-3"
                  style={{ borderTop: '2px dashed #e2e8f0' }}>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: TC }}>Modifier mes informations</p>
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: '#64748b' }}>Spécialisation</label>
                <input className="input-field w-full text-sm" placeholder="ex: Informatique, Réseaux…"
                  value={form.specialization}
                  onChange={e => setForm(p => ({ ...p, specialization: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: '#64748b' }}>Qualification</label>
                <input className="input-field w-full text-sm" placeholder="ex: Doctorat, Master 2…"
                  value={form.qualification}
                  onChange={e => setForm(p => ({ ...p, qualification: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: '#64748b' }}>Biographie</label>
                <textarea className="input-field w-full text-sm resize-none" rows={4}
                  placeholder="Décrivez votre parcours, domaines d'expertise…"
                  value={form.bio}
                  onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} />
              </div>
              <button type="submit" disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${TC}, #22d3ee)` }}>
                {saving
                  ? <div className="h-4 w-4 rounded-full border-2 animate-spin" style={{ borderColor: '#ffffff40', borderTopColor: '#fff' }} />
                  : <Save className="h-4 w-4" />}
                Enregistrer les modifications
              </button>
            </form>
          )}
        </div>
      )}

      {/* ══ TAB: Affectations ══════════════════════════════════════ */}
      {tab === 'aff' && (
        <div className="card p-5">
          <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#94a3b8' }}>
            {assignments.length} affectation{assignments.length !== 1 ? 's' : ''}
          </p>
          {assignments.length === 0 ? (
            <div className="flex flex-col items-center py-12 rounded-xl gap-2" style={{ background: '#f8fafc' }}>
              <Briefcase className="h-8 w-8 opacity-20" style={{ color: '#64748b' }} />
              <p className="text-xs" style={{ color: '#94a3b8' }}>Aucune affectation</p>
            </div>
          ) : (
            <div className="space-y-2">
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

      {/* ══ TAB: Emploi du temps ═══════════════════════════════════ */}
      {tab === 'edt' && (
        <div className="card p-5">
          <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#94a3b8' }}>
            {sessions.length} séance{sessions.length !== 1 ? 's' : ''} planifiée{sessions.length !== 1 ? 's' : ''}
          </p>
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center py-12 rounded-xl gap-2" style={{ background: '#f8fafc' }}>
              <CalendarDays className="h-8 w-8 opacity-20" style={{ color: '#64748b' }} />
              <p className="text-xs" style={{ color: '#94a3b8' }}>Aucune séance planifiée</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...sessions].sort((a, b) => (a.day_of_week ?? 0) - (b.day_of_week ?? 0)).map((s, i) => (
                <div key={s.id ?? i} className="flex items-center gap-3 p-3 rounded-xl"
                     style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                       style={{ background: '#fce7f3' }}>
                    <CalendarDays className="h-4 w-4" style={{ color: '#db2777' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold" style={{ color: '#0f172a' }}>
                        {typeof s.day_of_week === 'number' ? DAYS[s.day_of_week] : (s.day_name || s.day_of_week)}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                            style={{ background: TB, color: TC }}>
                        {s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}
                      </span>
                    </div>
                    <p className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>
                      {s.subject_name} · {s.class_name}{s.room_name ? ` · Salle ${s.room_name}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: Expériences ═══════════════════════════════════════ */}
      {tab === 'exp' && (
        <div className="card p-5 space-y-4">
          {/* Add experience form */}
          <form onSubmit={saveExp} className="p-4 rounded-2xl space-y-3"
                style={{ background: '#f0fdf4', border: '1.5px dashed #86efac' }}>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#059669' }}>
              Ajouter une expérience
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: '#64748b' }}>Poste / Titre</label>
                <input className="input-field text-xs" placeholder="ex: Professeur de Mathématiques"
                  value={expForm.position}
                  onChange={e => setExpForm(p => ({ ...p, position: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: '#64748b' }}>Établissement / Entreprise</label>
                <input className="input-field text-xs" placeholder="ex: Lycée National"
                  value={expForm.company}
                  onChange={e => setExpForm(p => ({ ...p, company: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: '#64748b' }}>Date de début</label>
                <input type="date" className="input-field text-xs"
                  value={expForm.start_date}
                  onChange={e => setExpForm(p => ({ ...p, start_date: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: '#64748b' }}>Date de fin</label>
                <input type="date" className="input-field text-xs" disabled={expForm.is_current}
                  value={expForm.end_date}
                  onChange={e => setExpForm(p => ({ ...p, end_date: e.target.value }))} />
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
                value={expForm.description}
                onChange={e => setExpForm(p => ({ ...p, description: e.target.value }))} />
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

          {/* Experience list */}
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
            <div className="space-y-2">
              {exps.map(exp => (
                <div key={exp.id} className="flex items-start gap-3 p-3 rounded-xl"
                     style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                       style={{ background: '#d1fae5' }}>
                    <Briefcase className="h-4 w-4" style={{ color: '#059669' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold" style={{ color: '#0f172a' }}>{exp.position}</p>
                    <p className="text-xs" style={{ color: TC }}>{exp.company}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>
                      {exp.start_date ? new Date(exp.start_date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : '—'}
                      {' – '}
                      {exp.is_current ? 'Présent' : (exp.end_date ? new Date(exp.end_date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : '—')}
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

      {/* ══ TAB: Documents ═════════════════════════════════════════ */}
      {tab === 'docs' && (
        <div className="card p-5 space-y-4">
          {/* Upload form */}
          <form onSubmit={uploadDoc} className="p-4 rounded-2xl space-y-3"
                style={{ background: '#f0f9ff', border: '1.5px dashed #7dd3fc' }}>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: TC }}>
              Ajouter un document
            </p>
            <div className="grid grid-cols-2 gap-2">
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
              <input type="file" ref={fileRef} className="input-field text-xs"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={e => setDocForm(p => ({ ...p, file: e.target.files[0] || null }))}
                required />
            </div>
            <button type="submit" disabled={uploading || !docForm.file || !docForm.title}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${TC}, #22d3ee)` }}>
              {uploading
                ? <div className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                : <Upload className="h-3.5 w-3.5" />}
              Téléverser
            </button>
          </form>

          {/* Document list */}
          {docsLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: TC }} />
            </div>
          ) : !docs || docs.length === 0 ? (
            <div className="flex flex-col items-center py-10 rounded-xl gap-2" style={{ background: '#f8fafc' }}>
              <FolderOpen className="h-8 w-8 opacity-20" style={{ color: '#64748b' }} />
              <p className="text-xs" style={{ color: '#94a3b8' }}>Aucun document enregistré</p>
            </div>
          ) : (
            <div className="space-y-2">
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
    </div>
  );
}
