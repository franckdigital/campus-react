import { useState, useEffect } from 'react';
import {
  Layers, Plus, Edit, Trash2, BookOpen, GraduationCap,
  BarChart3, FolderOpen,
} from 'lucide-react';
import { academicService, sitesService } from '../../services';
import { useApi } from '../../hooks/useApi';
import { useSite } from '../../contexts/SiteContext';
import { useConfirm } from '../ConfirmDialog';
import { useNotifications } from '../Notifications';
import {
  PageHeader, FilterBar, SearchInput, FilterSelect, PrimaryButton,
  FormSection, FormField, FormInput, FormSelect, ModalFooter, Modal, IconBtn,
  Pagination,
} from '../ui/PageHeader';

/* ── colour tokens ──────────────────────────────────────────── */
const C = {
  program : { accent: '#6366f1', bg: '#eef2ff', icon: '#c7d2fe' },
  level   : { accent: '#0891b2', bg: '#ecfeff', icon: '#a5f3fc' },
  class   : { accent: '#0d9488', bg: '#f0fdfa', icon: '#99f6e4' },
};

/* ── small helpers ───────────────────────────────────────────── */
const ITEMS = 9;
function list(d) { return Array.isArray(d) ? d : (d?.results || []); }
function pct(used, max) { return max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0; }

/* ── Tab button ──────────────────────────────────────────────── */
function Tab({ active, onClick, icon: Icon, label, count, color }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
      style={{
        background: active ? color.bg : 'transparent',
        color: active ? color.accent : '#64748b',
        borderBottom: active ? `2px solid ${color.accent}` : '2px solid transparent',
      }}
    >
      <Icon className="h-4 w-4" />
      {label}
      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
            style={{ background: active ? color.accent : '#f1f5f9', color: active ? '#fff' : '#64748b' }}>
        {count}
      </span>
    </button>
  );
}

/* ── confirm delete helper ───────────────────────────────────── */
async function softDelete(fn, id, refresh, confirm, notify) {
  if (!await confirm({ title: 'Supprimer cet élément ?', message: 'Cette action est irréversible.', confirmLabel: 'Supprimer', destructive: true })) return;
  try {
    await fn(id);
    refresh();
  } catch (err) {
    // The backend's real reason (e.g. a FK constraint from students/classes/
    // fee configs still attached) was being silently dropped here — surface
    // it instead of a generic message so it's actually diagnosable.
    console.error('softDelete failed:', err);
    const detail = err?.response?.data?.detail
      || (typeof err?.response?.data === 'string' ? err.response.data : null)
      || err?.message;
    notify({ type: 'error', title: 'Erreur', message: detail || 'Erreur lors de la suppression' });
  }
}

/**
 * Filière / Niveau / Classe CRUD. Shared between the standalone "Classes"
 * admin page and the "Gestion Pédagogique" tab inside E-Learning so both
 * surfaces manage the exact same data through the same endpoints.
 */
export default function PedagogicalManager({ showHeader = true }) {
  const [tab, setTab] = useState('programs');
  const { selectedSite } = useSite();
  const confirm = useConfirm();
  const { notify } = useNotifications();
  const siteFilter = selectedSite !== 'all' ? { site: selectedSite } : {};

  /* ── data ── */
  const { data: programsData, loading: lprog, execute: reloadPrograms } =
    useApi(() => academicService.getPrograms({ ...siteFilter }), [selectedSite], true);
  const { data: levelsData,   loading: llev,  execute: reloadLevels } =
    useApi(() => academicService.getLevels(
      selectedSite !== 'all' ? { program__site: selectedSite } : {}
    ), [selectedSite], true);
  const { data: classesData,  loading: lcls,  execute: reloadClasses } =
    useApi(() => academicService.getClasses({ ...siteFilter }), [selectedSite], true);
  const { data: sitesData }   = useApi(() => sitesService.getSites({ is_active: true }), [], true);
  const { data: yearsData }   = useApi(() => academicService.getAcademicYears(), [], true);
  const { data: teachersData } = useApi(() => academicService.getTeachers({ is_active: true }), [], true);
  const { data: subjectsData } = useApi(() => academicService.getSubjects({ is_active: true }), [], true);

  const programs = list(programsData);
  const levels   = list(levelsData);
  const classes  = list(classesData);
  const sites    = list(sitesData);
  const years    = list(yearsData);
  const teachers = list(teachersData);
  const subjects = list(subjectsData);

  /* ── search / filters ── */
  const [search, setSearch] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [tab, search, filterProgram, filterLevel]);

  /* filtered lists */
  const filtPrograms = programs.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase())
  );
  const filtLevels = levels.filter(l =>
    (!filterProgram || l.program === filterProgram) &&
    (l.name.toLowerCase().includes(search.toLowerCase()) || l.code.toLowerCase().includes(search.toLowerCase()))
  );
  const filtClasses = classes.filter(c =>
    (!filterLevel || c.level === filterLevel) &&
    (c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()))
  );

  const current = tab === 'programs' ? filtPrograms : tab === 'levels' ? filtLevels : filtClasses;
  const totalPages = Math.ceil(current.length / ITEMS);
  const paginated = current.slice((page - 1) * ITEMS, page * ITEMS);

  /* ── modal state ── */
  const [modal, setModal] = useState(null); // null | 'program' | 'level' | 'class'
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  /* program form */
  const emptyProgram = { name: '', code: '', description: '', duration_years: 3, site: '' };
  const [pForm, setPForm] = useState(emptyProgram);
  const pf = k => ({ value: pForm[k], onChange: e => setPForm(p => ({ ...p, [k]: e.target.value })) });

  /* level form */
  const emptyLevel = { name: '', code: '', order: 1, program: '' };
  const [lForm, setLForm] = useState(emptyLevel);
  const lf = k => ({ value: lForm[k], onChange: e => setLForm(p => ({ ...p, [k]: e.target.value })) });

  /* class form */
  const emptyCls = { name: '', code: '', level: '', academic_year: '', site: '', max_students: 50, main_teacher: '' };
  const [cForm, setCForm] = useState(emptyCls);
  const cf = k => ({ value: cForm[k], onChange: e => setCForm(p => ({ ...p, [k]: e.target.value })) });

  /* open helpers */
  function openProgram(item = null) {
    setEditing(item);
    setPForm(item ? { name: item.name, code: item.code, description: item.description || '', duration_years: item.duration_years, site: item.site } : emptyProgram);
    setModal('program');
  }
  function openLevel(item = null) {
    setEditing(item);
    setLForm(item ? { name: item.name, code: item.code, order: item.order, program: item.program } : emptyLevel);
    setModal('level');
  }
  function openClass(item = null) {
    setEditing(item);
    setCForm(item ? { name: item.name, code: item.code, level: item.level, academic_year: item.academic_year, site: item.site, max_students: item.max_students || 50, main_teacher: item.main_teacher || '' } : emptyCls);
    setModal('class');
  }

  /* level ↔ subjects management */
  const [subjLevel, setSubjLevel] = useState(null);
  const [levelSubjects, setLevelSubjects] = useState([]);
  const [lsLoading, setLsLoading] = useState(false);
  const [newSubjectId, setNewSubjectId] = useState('');
  const [addingSubject, setAddingSubject] = useState(false);

  async function loadLevelSubjects(levelId) {
    setLsLoading(true);
    try {
      const res = await academicService.getLevelSubjects({ level: levelId });
      setLevelSubjects(list(res));
    } catch {
      notify({ type: 'error', title: 'Erreur', message: 'Erreur lors du chargement des matières' });
    }
    setLsLoading(false);
  }
  function openLevelSubjects(item) {
    setSubjLevel(item);
    setNewSubjectId('');
    setModal('levelSubjects');
    loadLevelSubjects(item.id);
  }
  async function addSubjectToLevel() {
    if (!newSubjectId || !subjLevel) return;
    setAddingSubject(true);
    try {
      await academicService.createLevelSubject({ level: subjLevel.id, subject: newSubjectId, is_mandatory: true });
      setNewSubjectId('');
      await loadLevelSubjects(subjLevel.id);
      reloadLevels();
    } catch {
      notify({ type: 'error', title: 'Erreur', message: 'Cette matière est peut-être déjà affectée à ce niveau' });
    }
    setAddingSubject(false);
  }
  async function removeSubjectFromLevel(id) {
    if (!await confirm({ title: 'Retirer cette matière ?', message: 'Cette matière ne sera plus affectée à ce niveau.', confirmLabel: 'Retirer', destructive: true })) return;
    try {
      await academicService.deleteLevelSubject(id);
      await loadLevelSubjects(subjLevel.id);
      reloadLevels();
    } catch {
      notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la suppression' });
    }
  }
  const availableSubjects = subjects.filter(s => !levelSubjects.some(ls => ls.subject === s.id));

  /* submit handlers */
  async function saveProgram(e) {
    e.preventDefault(); setSaving(true);
    try {
      const d = { ...pForm };
      if (!d.site && selectedSite !== 'all') d.site = selectedSite;
      if (editing) await academicService.updateProgram(editing.id, d);
      else await academicService.createProgram(d);
      setModal(null); reloadPrograms();
    } catch { notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la sauvegarde' }); }
    setSaving(false);
  }
  async function saveLevel(e) {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) await academicService.updateLevel(editing.id, lForm);
      else await academicService.createLevel(lForm);
      setModal(null); reloadLevels();
    } catch { notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la sauvegarde' }); }
    setSaving(false);
  }
  async function saveClass(e) {
    e.preventDefault(); setSaving(true);
    try {
      const d = { ...cForm };
      if (!d.site && selectedSite !== 'all') d.site = selectedSite;
      if (editing) await academicService.updateClass(editing.id, d);
      else await academicService.createClass(d);
      setModal(null); reloadClasses();
    } catch { notify({ type: 'error', title: 'Erreur', message: 'Erreur lors de la sauvegarde' }); }
    setSaving(false);
  }

  const loading = lprog || llev || lcls;

  return (
    <div>
      {showHeader && (
        <PageHeader
          icon={GraduationCap} iconColor="#6366f1" iconBg="#c7d2fe"
          title="Gestion Pédagogique"
          subtitle={`${programs.length} filière${programs.length > 1 ? 's' : ''} · ${levels.length} niveaux · ${classes.length} classes`}
          action={
            tab === 'programs' ? <PrimaryButton icon={Plus} label="Nouvelle filière" color={C.program.accent} onClick={() => openProgram()} /> :
            tab === 'levels'   ? <PrimaryButton icon={Plus} label="Nouveau niveau"   color={C.level.accent}   onClick={() => openLevel()} /> :
                                 <PrimaryButton icon={Plus} label="Nouvelle classe"  color={C.class.accent}   onClick={() => openClass()} />
          }
        />
      )}

      {!showHeader && (
        <div className="flex items-center justify-end mb-4">
          {tab === 'programs' ? <PrimaryButton icon={Plus} label="Nouvelle filière" color={C.program.accent} onClick={() => openProgram()} /> :
           tab === 'levels'   ? <PrimaryButton icon={Plus} label="Nouveau niveau"   color={C.level.accent}   onClick={() => openLevel()} /> :
                                <PrimaryButton icon={Plus} label="Nouvelle classe"  color={C.class.accent}   onClick={() => openClass()} />}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6 p-1 rounded-2xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <Tab active={tab === 'programs'} onClick={() => setTab('programs')} icon={FolderOpen}   label="Filières" count={programs.length} color={C.program} />
        <Tab active={tab === 'levels'}   onClick={() => setTab('levels')}   icon={BarChart3}    label="Niveaux"  count={levels.length}   color={C.level}   />
        <Tab active={tab === 'classes'}  onClick={() => setTab('classes')}  icon={Layers}       label="Classes"  count={classes.length}  color={C.class}   />
      </div>

      {/* Filter bar */}
      <FilterBar>
        <SearchInput value={search} onChange={e => setSearch(e.target.value)}
                     placeholder={tab === 'programs' ? 'Rechercher une filière…' : tab === 'levels' ? 'Rechercher un niveau…' : 'Rechercher une classe…'} />
        {tab === 'levels' && (
          <FilterSelect value={filterProgram} onChange={e => setFilterProgram(e.target.value)}>
            <option value="">Toutes les filières</option>
            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </FilterSelect>
        )}
        {tab === 'classes' && (
          <FilterSelect value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
            <option value="">Tous les niveaux</option>
            {levels.map(l => <option key={l.id} value={l.id}>{l.name} ({l.program_name})</option>)}
          </FilterSelect>
        )}
      </FilterBar>

      {/* Content */}
      {loading ? (
        <div className="card flex items-center justify-center py-20">
          <div className="h-8 w-8 rounded-full border-[3px] border-indigo-200 border-t-indigo-600 animate-spin" />
        </div>
      ) : paginated.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 gap-3">
          <GraduationCap className="h-12 w-12 opacity-20" style={{ color: '#64748b' }} />
          <p className="text-sm font-semibold" style={{ color: '#94a3b8' }}>Aucun élément trouvé</p>
        </div>
      ) : (
        <>
          {/* PROGRAMS grid */}
          {tab === 'programs' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {paginated.map(p => (
                <div key={p.id} className="card p-5 hover:-translate-y-1 transition-transform duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-11 w-11 rounded-2xl flex items-center justify-center" style={{ background: C.program.icon }}>
                      <FolderOpen className="h-5 w-5" style={{ color: C.program.accent }} />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: C.program.bg, color: C.program.accent }}>
                      {p.duration_years} an{p.duration_years > 1 ? 's' : ''}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold mb-0.5" style={{ color: '#0f172a' }}>{p.name}</h3>
                  <p className="text-xs font-mono font-bold mb-2" style={{ color: C.program.accent }}>{p.code}</p>
                  {p.description && <p className="text-xs mb-3 line-clamp-2" style={{ color: '#64748b' }}>{p.description}</p>}
                  <div className="flex items-center gap-4 text-xs py-3 mb-3" style={{ borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                    <div className="flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5" style={{ color: C.level.accent }} />
                      <span style={{ color: '#64748b' }}>{p.levels_count ?? 0} niveau{(p.levels_count ?? 0) > 1 ? 'x' : ''}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openProgram(p)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors"
                      style={{ background: C.program.bg, color: C.program.accent }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                      <Edit className="h-3.5 w-3.5" /> Modifier
                    </button>
                    <IconBtn icon={Trash2} color="#ef4444" hoverBg="#fef2f2"
                      onClick={() => softDelete(academicService.deleteProgram, p.id, reloadPrograms, confirm, notify)} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* LEVELS grid */}
          {tab === 'levels' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {paginated.map(l => (
                <div key={l.id} className="card p-5 hover:-translate-y-1 transition-transform duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-11 w-11 rounded-2xl flex items-center justify-center" style={{ background: C.level.icon }}>
                      <BarChart3 className="h-5 w-5" style={{ color: C.level.accent }} />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: C.level.bg, color: C.level.accent }}>
                      Ordre {l.order}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold mb-0.5" style={{ color: '#0f172a' }}>{l.name}</h3>
                  <p className="text-xs font-mono font-bold mb-1" style={{ color: C.level.accent }}>{l.code}</p>
                  <div className="flex items-center gap-1.5 mb-4">
                    <FolderOpen className="h-3.5 w-3.5" style={{ color: '#94a3b8' }} />
                    <span className="text-xs" style={{ color: '#64748b' }}>{l.program_name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs py-3 mb-3" style={{ borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                    <div className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" style={{ color: C.class.accent }} />
                      <span style={{ color: '#64748b' }}>{l.classes_count ?? 0} classe{(l.classes_count ?? 0) > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" style={{ color: '#7c3aed' }} />
                      <span style={{ color: '#64748b' }}>{l.subjects_count ?? 0} matière{(l.subjects_count ?? 0) > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <button onClick={() => openLevelSubjects(l)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors"
                      style={{ background: '#f5f3ff', color: '#7c3aed' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                      <BookOpen className="h-3.5 w-3.5" /> Matières
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openLevel(l)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors"
                      style={{ background: C.level.bg, color: C.level.accent }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                      <Edit className="h-3.5 w-3.5" /> Modifier
                    </button>
                    <IconBtn icon={Trash2} color="#ef4444" hoverBg="#fef2f2"
                      onClick={() => softDelete(academicService.deleteLevel, l.id, reloadLevels, confirm, notify)} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CLASSES grid */}
          {tab === 'classes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {paginated.map(c => {
                const p = pct(c.student_count || 0, c.max_students);
                const full = p >= 100;
                const warn = p >= 80 && !full;
                const barColor = full ? '#ef4444' : warn ? '#f59e0b' : C.class.accent;
                return (
                  <div key={c.id} className="card p-5 hover:-translate-y-1 transition-transform duration-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-11 w-11 rounded-2xl flex items-center justify-center" style={{ background: C.class.icon }}>
                        <Layers className="h-5 w-5" style={{ color: C.class.accent }} />
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${c.is_active ? '' : 'opacity-60'}`}
                            style={{ background: c.is_active ? C.class.bg : '#f1f5f9', color: c.is_active ? C.class.accent : '#94a3b8' }}>
                        {c.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold mb-0.5" style={{ color: '#0f172a' }}>{c.name}</h3>
                    <p className="text-xs font-mono font-bold mb-1" style={{ color: C.class.accent }}>{c.code}</p>
                    <div className="flex items-center gap-1.5 mb-4">
                      <BarChart3 className="h-3.5 w-3.5" style={{ color: '#94a3b8' }} />
                      <span className="text-xs" style={{ color: '#64748b' }}>{c.level_name}</span>
                    </div>

                    {/* Capacity progress */}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span style={{ color: '#64748b' }}>Occupation</span>
                        <span className="font-bold" style={{ color: barColor }}>{c.student_count ?? 0}/{c.max_students}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, background: barColor }} />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3" style={{ borderTop: '1px solid #f1f5f9' }}>
                      <button onClick={() => openClass(c)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors"
                        style={{ background: C.class.bg, color: C.class.accent }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                        <Edit className="h-3.5 w-3.5" /> Modifier
                      </button>
                      <IconBtn icon={Trash2} color="#ef4444" hoverBg="#fef2f2"
                        onClick={() => softDelete(id => academicService.updateClass(id, { is_active: false }), c.id, reloadClasses, confirm, notify)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage}
            accentColor={tab === 'programs' ? C.program.accent : tab === 'levels' ? C.level.accent : C.class.accent}
            totalItems={current.length} itemsPerPage={ITEMS} />
        </>
      )}

      {/* ── Modal: Program ────────────────────────────────────── */}
      <Modal open={modal === 'program'} onClose={() => setModal(null)}
             title={editing ? 'Modifier la filière' : 'Nouvelle filière'}
             accentColor={C.program.accent} size="md">
        <form onSubmit={saveProgram} className="space-y-5">
          <FormSection title="Informations de la filière" icon={FolderOpen}>
            <FormField label="Nom" required>
              <FormInput {...pf('name')} placeholder="ex: Licence Informatique" required />
            </FormField>
            <FormField label="Code" required>
              <FormInput {...pf('code')} placeholder="ex: LIC-INFO" required />
            </FormField>
            <FormField label="Durée (années)" required>
              <FormInput type="number" {...pf('duration_years')} min="1" max="10" required />
            </FormField>
            <FormField label="Site">
              <FormSelect {...pf('site')}>
                <option value="">Sélectionner un site</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </FormSelect>
            </FormField>
            <FormField label="Description" fullWidth>
              <textarea className="input-field" rows={3}
                value={pForm.description} onChange={e => setPForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Description optionnelle…" />
            </FormField>
          </FormSection>
          <ModalFooter onCancel={() => setModal(null)} submitLabel={editing ? 'Mettre à jour' : 'Créer'} loading={saving} color={C.program.accent} />
        </form>
      </Modal>

      {/* ── Modal: Level ─────────────────────────────────────── */}
      <Modal open={modal === 'level'} onClose={() => setModal(null)}
             title={editing ? 'Modifier le niveau' : 'Nouveau niveau'}
             accentColor={C.level.accent} size="md">
        <form onSubmit={saveLevel} className="space-y-5">
          <FormSection title="Informations du niveau" icon={BarChart3}>
            <FormField label="Nom" required>
              <FormInput {...lf('name')} placeholder="ex: Licence 1" required />
            </FormField>
            <FormField label="Code" required>
              <FormInput {...lf('code')} placeholder="ex: L1" required />
            </FormField>
            <FormField label="Filière" required>
              <FormSelect {...lf('program')} required>
                <option value="">Sélectionner une filière</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </FormSelect>
            </FormField>
            <FormField label="Ordre d'affichage">
              <FormInput type="number" {...lf('order')} min="1" />
            </FormField>
          </FormSection>
          <ModalFooter onCancel={() => setModal(null)} submitLabel={editing ? 'Mettre à jour' : 'Créer'} loading={saving} color={C.level.accent} />
        </form>
      </Modal>

      {/* ── Modal: Level subjects ────────────────────────────── */}
      <Modal open={modal === 'levelSubjects'} onClose={() => setModal(null)}
             title={subjLevel ? `Matières — ${subjLevel.name}` : 'Matières'}
             accentColor="#7c3aed" size="md">
        <div className="space-y-5">
          <div className="flex gap-2">
            <div className="flex-1">
              <FormSelect value={newSubjectId} onChange={e => setNewSubjectId(e.target.value)}>
                <option value="">Sélectionner une matière à ajouter…</option>
                {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </FormSelect>
            </div>
            <button type="button" onClick={addSubjectToLevel} disabled={!newSubjectId || addingSubject}
              className="px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
              style={{ background: '#7c3aed', color: '#fff' }}>
              <Plus className="h-3.5 w-3.5" /> Ajouter
            </button>
          </div>

          {lsLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 rounded-full border-[3px] border-violet-200 border-t-violet-600 animate-spin" />
            </div>
          ) : levelSubjects.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: '#94a3b8' }}>Aucune matière affectée à ce niveau pour le moment.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {levelSubjects.map(ls => (
                <div key={ls.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: '#f8fafc' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>{ls.subject_name}</p>
                    <p className="text-[11px] font-mono" style={{ color: '#94a3b8' }}>{ls.subject_code}</p>
                  </div>
                  <IconBtn icon={Trash2} color="#ef4444" hoverBg="#fef2f2" onClick={() => removeSubjectFromLevel(ls.id)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* ── Modal: Class ─────────────────────────────────────── */}
      <Modal open={modal === 'class'} onClose={() => setModal(null)}
             title={editing ? 'Modifier la classe' : 'Nouvelle classe'}
             accentColor={C.class.accent} size="md">
        <form onSubmit={saveClass} className="space-y-5">
          <FormSection title="Informations de la classe" icon={Layers}>
            <FormField label="Nom" required>
              <FormInput {...cf('name')} placeholder="ex: Licence 1 Informatique A" required />
            </FormField>
            <FormField label="Code" required>
              <FormInput {...cf('code')} placeholder="ex: L1-INFO-A" required />
            </FormField>
            <FormField label="Niveau" required>
              <FormSelect {...cf('level')} required>
                <option value="">Sélectionner un niveau</option>
                {levels.map(l => <option key={l.id} value={l.id}>{l.name} — {l.program_name}</option>)}
              </FormSelect>
            </FormField>
            <FormField label="Année académique" required>
              <FormSelect {...cf('academic_year')} required>
                <option value="">Sélectionner une année</option>
                {years.map(y => <option key={y.id} value={y.id}>{y.name}{y.is_current ? ' (en cours)' : ''}</option>)}
              </FormSelect>
            </FormField>
            <FormField label="Site">
              <FormSelect {...cf('site')}>
                <option value="">Sélectionner un site</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </FormSelect>
            </FormField>
            <FormField label="Effectif maximum">
              <FormInput type="number" {...cf('max_students')} min="1" max="500" />
            </FormField>
            <FormField label="Enseignant principal" fullWidth>
              <FormSelect {...cf('main_teacher')}>
                <option value="">Aucun (optionnel)</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name} ({t.employee_id})</option>)}
              </FormSelect>
            </FormField>
          </FormSection>
          <ModalFooter onCancel={() => setModal(null)} submitLabel={editing ? 'Mettre à jour' : 'Créer'} loading={saving} color={C.class.accent} />
        </form>
      </Modal>
    </div>
  );
}
