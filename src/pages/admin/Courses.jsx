import { useState, useEffect } from 'react';
import {
  BookOpen, Plus, Edit, Trash2, Link2, X, Check,
  BarChart3, FolderOpen,
} from 'lucide-react';
import { academicService } from '../../services';
import { useApi } from '../../hooks/useApi';
import {
  PageHeader, FilterBar, SearchInput, PrimaryButton,
  FormSection, FormField, FormInput, ModalFooter, Modal, IconBtn,
  Pagination, TableContainer, Table, TableRow,
} from '../../components/ui/PageHeader';

/* ── tokens ─────────────────────────────────────────────────── */
const CA = '#7c3aed'; const CB = '#ede9fe'; const CI = '#ddd6fe';

/* ── helpers ─────────────────────────────────────────────────── */
const ITEMS = 10;
function list(d) { return Array.isArray(d) ? d : (d?.results || []); }

const STRIPS = ['#6366f1','#0891b2','#059669','#d97706','#db2777','#7c3aed','#0d9488','#dc2626'];
function stripColor(str) {
  let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return STRIPS[Math.abs(h) % STRIPS.length];
}

/* ══════════════════════════════════════════════════════════════ */
export default function Courses() {
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [modal, setModal]       = useState(null);
  const [editing, setEditing]   = useState(null);
  const [saving, setSaving]     = useState(false);
  const [selSubject, setSelSubject] = useState(null);

  /* ── data ── */
  const { data: subjectsData, loading, execute: reload } =
    useApi(() => academicService.getSubjects({ page_size: 500 }), [], true);
  const { data: levelsData } = useApi(() => academicService.getLevels({ page_size: 500 }), [], true);

  const subjects = list(subjectsData);
  const levels   = list(levelsData);

  /* ── level-subjects for selected subject ── */
  const { data: lsData, loading: lsLoading, execute: reloadLS } = useApi(
    () => selSubject ? academicService.getLevelSubjects({ subject: selSubject.id }) : Promise.resolve([]),
    [selSubject?.id],
    !!selSubject,
  );
  const levelSubjects = list(lsData);

  useEffect(() => setPage(1), [search]);

  const filtered   = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / ITEMS);
  const paginated  = filtered.slice((page - 1) * ITEMS, page * ITEMS);

  /* ── subject form ── */
  const empty = { name: '', code: '', description: '', coefficient: '1.00', hours_per_week: '2.00' };
  const [form, setForm] = useState(empty);
  const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) });

  function openEdit(item = null) {
    setEditing(item);
    setForm(item ? {
      name: item.name, code: item.code, description: item.description || '',
      coefficient: item.coefficient, hours_per_week: item.hours_per_week,
    } : empty);
    setModal('edit');
  }

  async function saveSubject(e) {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) await academicService.updateSubject(editing.id, form);
      else         await academicService.createSubject(form);
      setModal(null); reload();
    } catch { alert('Erreur lors de la sauvegarde'); }
    setSaving(false);
  }

  async function deleteSubject(id) {
    if (!window.confirm('Supprimer cette matière ?')) return;
    try { await academicService.deleteSubject(id); reload(); if (selSubject?.id === id) setSelSubject(null); }
    catch { alert('Erreur lors de la suppression'); }
  }

  /* ── level assignment ── */
  const [assignLevel, setAssignLevel]   = useState('');
  const [assignCoeff, setAssignCoeff]   = useState('');
  const [assignHours, setAssignHours]   = useState('');
  const [assignMand,  setAssignMand]    = useState(true);
  const [addingAssign, setAddingAssign] = useState(false);

  async function addLevelAssignment() {
    if (!assignLevel || !selSubject) return;
    setAddingAssign(true);
    try {
      await academicService.createLevelSubject({
        level: assignLevel, subject: selSubject.id,
        coefficient:    assignCoeff  || null,
        hours_per_week: assignHours  || null,
        is_mandatory:   assignMand,
      });
      setAssignLevel(''); setAssignCoeff(''); setAssignHours('');
      reloadLS();
    } catch { alert('Affectation échouée (déjà existante ?)'); }
    setAddingAssign(false);
  }

  async function removeLevelAssignment(id) {
    if (!window.confirm('Retirer cette affectation ?')) return;
    try { await academicService.deleteLevelSubject(id); reloadLS(); }
    catch { alert('Erreur lors de la suppression'); }
  }

  const assignedLevelIds = new Set(levelSubjects.map(ls => ls.level));
  const availableLevels  = levels.filter(l => !assignedLevelIds.has(l.id));

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={BookOpen} iconColor={CA} iconBg={CI}
        title="Gestion des Matières"
        subtitle={`${subjects.length} matière${subjects.length > 1 ? 's' : ''} · Unités d'Enseignement`}
        action={<PrimaryButton icon={Plus} label="Nouvelle matière" color={CA} onClick={() => openEdit()} />}
      />

      <FilterBar>
        <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par intitulé ou code UE…" />
      </FilterBar>

      <div className={selSubject ? 'grid grid-cols-1 xl:grid-cols-5 gap-6' : ''}>

        {/* ── Subject table ────────────────────────────────────── */}
        <div className={selSubject ? 'xl:col-span-3' : ''}>
          <TableContainer loading={loading} empty={filtered.length === 0} emptyIcon={BookOpen} emptyText="Aucune matière trouvée">
            <Table headers={['Matière', 'Code', 'Coeff.', 'H/sem', 'Niveaux', '']}>
              {paginated.map(s => {
                const color = stripColor(s.name);
                const isSel = selSubject?.id === s.id;
                return (
                  <TableRow key={s.id} onClick={() => setSelSubject(isSel ? null : s)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0"
                             style={{ background: `${color}18`, border: `1px solid ${color}25` }}>
                          <BookOpen className="h-3.5 w-3.5" style={{ color }} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>{s.name}</p>
                          {s.description && (
                            <p className="text-xs truncate max-w-[180px]" style={{ color: '#94a3b8' }}>{s.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs font-mono font-bold px-2 py-1 rounded-lg"
                            style={{ background: `${color}15`, color }}>{s.code}</span>
                    </td>
                    <td>
                      <span className="text-sm font-extrabold" style={{ color: '#1e293b' }}>{s.coefficient}</span>
                    </td>
                    <td>
                      <span className="text-sm" style={{ color: '#64748b' }}>{s.hours_per_week}h</span>
                    </td>
                    <td>
                      <span className="text-xs font-semibold px-2 py-1 rounded-full"
                            style={{ background: isSel ? CA : CB, color: isSel ? '#fff' : CA }}>
                        {s.levels_count ?? 0} niv.
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <IconBtn icon={Link2} color={CA} hoverBg={CB} title="Affecter aux niveaux"
                          onClick={() => setSelSubject(isSel ? null : s)} />
                        <IconBtn icon={Edit} color="#64748b" hoverBg="#f1f5f9" onClick={() => openEdit(s)} />
                        <IconBtn icon={Trash2} color="#ef4444" hoverBg="#fef2f2" onClick={() => deleteSubject(s.id)} />
                      </div>
                    </td>
                  </TableRow>
                );
              })}
            </Table>
            <div className="px-4">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage}
                accentColor={CA} totalItems={filtered.length} itemsPerPage={ITEMS} />
            </div>
          </TableContainer>
        </div>

        {/* ── Level assignment panel ───────────────────────────── */}
        {selSubject && (
          <div className="xl:col-span-2">
            <div className="card p-5 sticky top-24">

              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#94a3b8' }}>
                    Affectations aux niveaux
                  </p>
                  <h3 className="text-sm font-extrabold" style={{ color: '#0f172a' }}>{selSubject.name}</h3>
                  <p className="text-xs font-mono font-bold" style={{ color: CA }}>{selSubject.code}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: '#64748b' }}>
                    <span>Coeff. défaut: <b>{selSubject.coefficient}</b></span>
                    <span>{selSubject.hours_per_week}h/sem</span>
                  </div>
                </div>
                <IconBtn icon={X} color="#94a3b8" hoverBg="#f1f5f9" onClick={() => setSelSubject(null)} />
              </div>

              {/* Assigned levels list */}
              <div className="mb-4">
                <p className="text-xs font-bold mb-2" style={{ color: '#64748b' }}>
                  {levelSubjects.length} affectation{levelSubjects.length > 1 ? 's' : ''}
                </p>
                {lsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="h-5 w-5 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" />
                  </div>
                ) : levelSubjects.length === 0 ? (
                  <div className="flex flex-col items-center py-6 gap-2 rounded-xl" style={{ background: '#f8fafc' }}>
                    <Link2 className="h-7 w-7 opacity-20" style={{ color: '#64748b' }} />
                    <p className="text-xs" style={{ color: '#94a3b8' }}>Aucune affectation pour l'instant</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {levelSubjects.map(ls => (
                      <div key={ls.id} className="flex items-center gap-3 p-3 rounded-xl"
                           style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: '#0f172a' }}>
                            {ls.level_name}
                          </p>
                          <p className="text-[10px] truncate" style={{ color: '#94a3b8' }}>{ls.program_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {ls.coefficient && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                                    style={{ background: CB, color: CA }}>Coeff {ls.coefficient}</span>
                            )}
                            {ls.hours_per_week && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                                    style={{ background: '#f0f9ff', color: '#0891b2' }}>{ls.hours_per_week}h</span>
                            )}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ls.is_mandatory ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {ls.is_mandatory ? 'Oblig.' : 'Opt.'}
                            </span>
                          </div>
                        </div>
                        <IconBtn icon={Trash2} size="sm" color="#ef4444" hoverBg="#fef2f2"
                          onClick={() => removeLevelAssignment(ls.id)} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add new assignment */}
              <div className="pt-4 space-y-2" style={{ borderTop: '1px solid #f1f5f9' }}>
                <p className="text-xs font-bold" style={{ color: '#64748b' }}>Ajouter une affectation</p>
                <select className="input-field text-xs" value={assignLevel} onChange={e => setAssignLevel(e.target.value)}>
                  <option value="">— Sélectionner un niveau —</option>
                  {availableLevels.map(l => (
                    <option key={l.id} value={l.id}>{l.name} — {l.program_name}</option>
                  ))}
                </select>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input className="input-field text-xs" type="number" step="0.25" placeholder="Coeff. (optionnel)"
                    value={assignCoeff} onChange={e => setAssignCoeff(e.target.value)} />
                  <input className="input-field text-xs" type="number" step="0.5" placeholder="H/sem (optionnel)"
                    value={assignHours} onChange={e => setAssignHours(e.target.value)} />
                </div>
                <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                  <input type="checkbox" checked={assignMand} onChange={e => setAssignMand(e.target.checked)} />
                  <span style={{ color: '#64748b' }}>Matière obligatoire</span>
                </label>
                <button onClick={addLevelAssignment} disabled={!assignLevel || addingAssign || availableLevels.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${CA}, ${CA}bb)` }}>
                  {addingAssign
                    ? <div className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    : <Check className="h-3.5 w-3.5" />}
                  Affecter au niveau
                </button>
                {availableLevels.length === 0 && (
                  <p className="text-xs text-center" style={{ color: '#94a3b8' }}>Tous les niveaux sont déjà affectés</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Subject form ───────────────────────────────── */}
      <Modal open={modal === 'edit'} onClose={() => setModal(null)}
             title={editing ? 'Modifier la matière' : 'Nouvelle matière'}
             accentColor={CA} size="md">
        <form onSubmit={saveSubject} className="space-y-5">
          <FormSection title="Informations de la matière" icon={BookOpen}>
            <FormField label="Intitulé (libellé)" required>
              <FormInput {...f('name')} placeholder="ex: Mathématiques Avancées" required />
            </FormField>
            <FormField label="Code UE" required>
              <FormInput {...f('code')} placeholder="ex: MATH-101" required />
            </FormField>
            <FormField label="Coefficient" required>
              <FormInput type="number" step="0.25" {...f('coefficient')} min="0" required />
            </FormField>
            <FormField label="Volume horaire hebdomadaire (h)" required>
              <FormInput type="number" step="0.5" {...f('hours_per_week')} min="0" required />
            </FormField>
            <FormField label="Description" fullWidth>
              <textarea className="input-field" rows={3}
                value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Description optionnelle de la matière…" />
            </FormField>
          </FormSection>
          <ModalFooter onCancel={() => setModal(null)} submitLabel={editing ? 'Mettre à jour' : 'Créer la matière'} loading={saving} color={CA} />
        </form>
      </Modal>
    </div>
  );
}
