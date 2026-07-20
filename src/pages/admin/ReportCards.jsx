import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Plus, Edit, Trash2, Eye, CheckCircle, Clock, Award, BarChart2, BookOpen, X, RefreshCw, Search, Download, ExternalLink, Info, ChevronRight } from 'lucide-react';
import { gradesService, academicService, studentsService } from '../../services';
import { useApi } from '../../hooks/useApi';
import { useNotifications } from '../../components/Notifications';
import { useSite } from '../../contexts/SiteContext';
import {
  PageHeader, FilterBar, SearchInput, FilterSelect, PrimaryButton,
  IconBtn, Pagination
} from '../../components/ui/PageHeader';

const COLOR = '#059669';
const COLOR_BG = '#f0fdf4';
const COLOR_ICON = '#d1fae5';
const ITEMS_PER_PAGE = 15;

const STATUS_MAP = {
  PASS:    { label: 'Admis',      bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
  FAIL:    { label: 'Échoué',     bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
  PENDING: { label: 'En attente', bg: '#fef9c3', color: '#ca8a04', border: '#fef08a' },
  HONORS:  { label: 'Mention',    bg: '#ede9fe', color: '#7c3aed', border: '#ddd6fe' },
};

function StatusPill({ status }) {
  const s = STATUS_MAP[status] || { label: status || '—', bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' };
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full"
          style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

const EVAL_LABELS = { DEVOIR: 'CC', EXAMEN: 'Exam', TP: 'TP', RATTRAPAGE: 'Rattr.' };

function BulletinDetailModal({ card, onClose, onDownloadPdf }) {
  const subjects = Object.values(card.subject_averages || {});
  const totalCoeff    = subjects.reduce((s, sub) => s + parseFloat(sub.coefficient || 0), 0);
  const totalWeighted = subjects.reduce((s, sub) => s + parseFloat(sub.average || 0) * parseFloat(sub.coefficient || 0), 0);
  const globalAvg     = totalCoeff > 0 ? totalWeighted / totalCoeff : 0;

  const { label: stLabel, color: stColor, bg: stBg } = {
    PASS:        { label: 'Admis',        color: '#16a34a', bg: '#dcfce7' },
    FAIL:        { label: 'Ajourné',      color: '#dc2626', bg: '#fee2e2' },
    CONDITIONAL: { label: 'Conditionnel', color: '#ca8a04', bg: '#fef9c3' },
    HONORS:      { label: 'Mention TB',   color: '#7c3aed', bg: '#ede9fe' },
    PENDING:     { label: 'En attente',   color: '#64748b', bg: '#f1f5f9' },
  }[card.status] || { label: card.status || '—', color: '#64748b', bg: '#f1f5f9' };

  const htmlUrl = gradesService.getBulletinHtmlUrl(card.id);

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4"
         style={{ background: 'rgba(8,12,36,0.65)', backdropFilter: 'blur(12px)', zIndex: 9500 }}
         onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col"
           style={{ boxShadow: '0 40px 100px rgba(0,0,0,0.25)' }}
           onClick={e => e.stopPropagation()}>

        {/* Header gradient */}
        <div style={{ background: 'linear-gradient(135deg,#1e40af,#0891b2)', padding: '22px 28px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: -50, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.55)' }}>Bulletin de Notes</p>
              <h2 className="text-xl font-extrabold text-white mt-1">{card.student_name || '—'}</h2>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)' }}>
                  {card.class_name || '—'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)' }}>
                  {card.semester_name || '—'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)' }}>
                  {card.academic_year_name || '—'}
                </span>
              </div>
            </div>
            <button onClick={onClose}
                    className="h-8 w-8 rounded-xl flex items-center justify-center transition-all relative z-10"
                    style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-4 flex-shrink-0" style={{ borderBottom: '2px solid #f0f4f9' }}>
          {[
            { label: 'Moyenne', value: card.average != null ? `${Number(card.average).toFixed(2)}/20` : '—', accent: '#1e40af' },
            { label: 'Rang', value: card.rank ? `${card.rank}/${card.total_students}` : '—', accent: '#0891b2' },
            { label: 'Matières', value: subjects.length, accent: '#059669' },
          ].map((k, i) => (
            <div key={i} className="flex flex-col items-center gap-1 py-4" style={{ borderRight: '1px solid #f0f4f9' }}>
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>{k.label}</span>
              <span className="text-xl font-extrabold" style={{ color: k.accent }}>{k.value}</span>
            </div>
          ))}
          <div className="flex flex-col items-center gap-1 py-4">
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Décision</span>
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: stBg, color: stColor }}>{stLabel}</span>
          </div>
        </div>

        {/* Subjects table */}
        <div className="overflow-y-auto flex-1" style={{ minHeight: 0 }}>
          {subjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FileText className="h-10 w-10 mb-3" style={{ color: '#cbd5e1' }} />
              <p className="text-sm font-semibold" style={{ color: '#94a3b8' }}>Aucune note pour ce semestre</p>
              <p className="text-xs mt-1" style={{ color: '#cbd5e1' }}>Les notes seront disponibles après saisie des évaluations</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr style={{ background: 'linear-gradient(135deg,#1e40af,#0891b2)' }}>
                  {['Matière / Évaluation', 'Type', 'Coeff.', 'Moy./20', 'Pond.'].map((h, i) => (
                    <th key={i} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white"
                        style={{ textAlign: i === 0 ? 'left' : 'center', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subjects.map((s, si) => {
                  const avg    = parseFloat(s.average || 0);
                  const coeff  = parseFloat(s.coefficient || 1);
                  const avgCol = avg >= 10 ? '#16a34a' : '#dc2626';
                  return (
                    <>
                      {/* Subject row */}
                      <tr key={`subj-${si}`} style={{ background: si % 2 === 0 ? '#f8faff' : '#fafbff', borderBottom: '1px solid #e8f0ff' }}>
                        <td className="px-4 py-2.5 font-bold text-sm" style={{ color: '#0f172a' }}>{s.subject_name || '—'}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#eff6ff', color: '#1e40af' }}>
                            {s.subject_code || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold text-sm" style={{ color: '#374151' }}>{coeff}</td>
                        <td className="px-4 py-2.5 text-center font-extrabold text-sm" style={{ color: avgCol, fontFamily: 'monospace' }}>{avg.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-center font-bold text-xs" style={{ color: '#64748b', fontFamily: 'monospace' }}>{(avg * coeff).toFixed(2)}</td>
                      </tr>
                      {/* Evaluation sub-rows */}
                      {(s.grades || []).map((g, gi) => {
                        const sc     = parseFloat(g.score_on_20 || 0);
                        const scCol  = sc >= 10 ? '#16a34a' : '#dc2626';
                        const etLbl  = EVAL_LABELS[g.eval_type] || g.eval_type || '—';
                        return (
                          <tr key={`eval-${si}-${gi}`} style={{ background: '#fff', borderBottom: '1px solid #f0f4f9' }}>
                            <td className="py-1.5 pl-8 pr-4 text-xs italic" style={{ color: '#64748b' }}>
                              <span style={{ color: '#94a3b8', marginRight: 4 }}>↳</span>{g.evaluation_title || '—'}
                            </td>
                            <td className="px-4 py-1.5 text-center">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#f5f3ff', color: '#7c3aed' }}>{etLbl}</span>
                            </td>
                            <td className="px-4 py-1.5 text-center text-[11px]" style={{ color: '#94a3b8', fontFamily: 'monospace' }}>×{g.eval_coefficient}</td>
                            <td className="px-4 py-1.5 text-center text-xs font-bold" style={{ color: scCol, fontFamily: 'monospace' }}>{sc.toFixed(2)}</td>
                            <td className="px-4 py-1.5 text-center text-[11px]" style={{ color: '#94a3b8' }}>—</td>
                          </tr>
                        );
                      })}
                    </>
                  );
                })}
                {/* Total row */}
                <tr style={{ background: 'linear-gradient(90deg,#eff6ff,#f0fdf4)', borderTop: '2px solid #bfdbfe' }}>
                  <td className="px-4 py-3 font-extrabold text-sm" style={{ color: '#1e40af' }}>MOYENNE GÉNÉRALE</td>
                  <td />
                  <td className="px-4 py-3 text-center font-extrabold text-sm" style={{ color: '#1e40af', fontFamily: 'monospace' }}>{totalCoeff.toFixed(0)}</td>
                  <td className="px-4 py-3 text-center font-extrabold text-base" style={{ color: globalAvg >= 10 ? '#16a34a' : '#dc2626', fontFamily: 'monospace' }}>
                    {globalAvg.toFixed(2)}/20
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-sm" style={{ color: '#1e40af', fontFamily: 'monospace' }}>{totalWeighted.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
             style={{ borderTop: '1px solid #f0f4f9', background: '#fafbff' }}>
          <button onClick={onClose}
                  className="px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: '#f1f5f9', color: '#64748b' }}>
            Fermer
          </button>
          <div className="flex gap-2">
            <a href={htmlUrl} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
               style={{ background: '#f0fdf4', color: '#059669', border: '1.5px solid #bbf7d0' }}>
              <ExternalLink className="h-3.5 w-3.5" />
              Aperçu / Imprimer
            </a>
            <button onClick={() => onDownloadPdf(card)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)', boxShadow: '0 3px 10px #6366f128' }}>
              <Download className="h-3.5 w-3.5" />
              Télécharger PDF
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function ReportCards() {
  const { selectedSite } = useSite();
  const { notify } = useNotifications();

  const [searchTerm, setSearchTerm]         = useState('');
  const [filterYear, setFilterYear]         = useState('all');
  const [filterSemester, setFilterSemester] = useState('all');
  const [filterClass, setFilterClass]       = useState('all');
  const [filterStatus, setFilterStatus]     = useState('all');
  const [currentPage, setCurrentPage]       = useState(1);
  const [showModal, setShowModal]           = useState(false);
  const [editingCard, setEditingCard]       = useState(null);
  const [showBulkModal, setShowBulkModal]   = useState(false);
  const [confirmModal, setConfirmModal]     = useState(null);
  const [saving, setSaving]                 = useState(false);
  const [detailCard, setDetailCard]         = useState(null);
  const [autoFilling, setAutoFilling]       = useState(false);

  const [studentSearch, setStudentSearch]     = useState('');
  const [showStudentDrop, setShowStudentDrop] = useState(false);
  const [bulkClass, setBulkClass]             = useState('');
  const [bulkSemester, setBulkSemester]       = useState('');
  const [generatingBulk, setGeneratingBulk]   = useState(false);
  const [repairingRanks, setRepairingRanks]   = useState(false);

  const [formData, setFormData] = useState({
    student_id: '', student_label: '',
    class_id: '', semester_id: '',
    average: '', rank: '', status: 'PENDING',
    is_published: false, comment: ''
  });

  const siteFilter = selectedSite !== 'all' ? { site: selectedSite } : {};

  const { data: cardsData, loading, execute: fetchCards } = useApi(
    () => gradesService.getReportCards({
      search:                   searchTerm,
      'semester__academic_year': filterYear     !== 'all' ? filterYear     : undefined,
      semester:                  filterSemester !== 'all' ? filterSemester : undefined,
      class_group:               filterClass    !== 'all' ? filterClass    : undefined,
      status:                    filterStatus   !== 'all' ? filterStatus   : undefined,
      ...siteFilter
    }),
    [searchTerm, filterYear, filterSemester, filterClass, filterStatus, selectedSite], true
  );

  const { data: classesData }       = useApi(() => academicService.getClasses(siteFilter),       [selectedSite], true);
  const { data: semestersData }     = useApi(() => academicService.getSemesters(siteFilter),     [selectedSite], true);
  const { data: academicYearsData } = useApi(() => academicService.getAcademicYears(siteFilter), [selectedSite], true);
  const { data: studentsData }      = useApi(() => studentsService.getAll({ status: 'ACTIVE', ...siteFilter }), [selectedSite], true);

  const cards         = cardsData?.results         || cardsData         || [];
  const classes       = classesData?.results       || classesData       || [];
  const semesters     = semestersData?.results     || semestersData     || [];
  const academicYears = academicYearsData?.results || academicYearsData || [];
  const students      = studentsData?.results      || studentsData      || [];

  const filtered = cards.filter(c => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (c.student_name || '').toLowerCase().includes(q) ||
      (c.class_name   || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const totalCards     = cards.length;
  const publishedCount = cards.filter(c => c.is_published).length;
  const pendingCount   = cards.filter(c => !c.is_published).length;

  const filteredStudents = students.filter(s => {
    const name = (s.full_name || '').toLowerCase();
    return name.includes(studentSearch.toLowerCase());
  });

  async function handleStudentSelect(s) {
    const label = s.full_name || '';
    setFormData(f => ({ ...f, student_id: s.id, student_label: label, class_id: '', semester_id: '' }));
    setStudentSearch(label);
    setShowStudentDrop(false);
    setAutoFilling(true);
    try {
      const res = await academicService.getEnrollments({ student: s.id });
      const list = (res?.results || res || []).filter(e => e.is_active !== false && e.status === 'ENROLLED');
      const enr  = list[0];
      if (enr) {
        const cid = enr.class_obj || '';
        // Pick best semester: prefer one matching class academic year
        const bestSem = semesters[0]?.id || '';
        setFormData(f => ({ ...f, class_id: cid, semester_id: bestSem }));
      } else if (semesters.length > 0) {
        setFormData(f => ({ ...f, semester_id: semesters[0].id }));
      }
    } catch {
      // silent — user can fill manually
    } finally {
      setAutoFilling(false);
    }
  }

  function resetForm() {
    setFormData({ student_id: '', student_label: '', class_id: '', semester_id: '', average: '', rank: '', status: 'PENDING', is_published: false, comment: '' });
    setStudentSearch('');
    setShowStudentDrop(false);
  }

  function openCreate() {
    setEditingCard(null);
    resetForm();
    setShowModal(true);
  }

  function openEdit(card) {
    setEditingCard(card);
    setFormData({
      student_id:    card.student_id   || card.student   || '',
      student_label: card.student_name || '',
      class_id:      card.class_id     || card.class_group || '',
      semester_id:   card.semester_id  || card.semester  || '',
      average:       card.average      != null ? String(card.average) : '',
      rank:          card.rank         != null ? String(card.rank)    : '',
      status:        card.status       || 'PENDING',
      is_published:  card.is_published || false,
      comment:       card.comment      || ''
    });
    setStudentSearch(card.student_name || '');
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.student_id || !formData.semester_id) {
      notify('Étudiant et semestre sont obligatoires', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        student:          formData.student_id,
        class_group:      formData.class_id    || undefined,
        semester:         formData.semester_id,
        average:          formData.average      ? parseFloat(formData.average) : undefined,
        rank:             formData.rank         ? parseInt(formData.rank)      : undefined,
        status:           formData.status,
        is_published:     formData.is_published,
        teacher_comment:  formData.comment,
      };
      if (editingCard) {
        await gradesService.updateReportCard(editingCard.id, payload);
        notify('Le bulletin a été modifié avec succès', 'success');
      } else {
        await gradesService.createReportCard(payload);
        notify('Le bulletin a été enregistré avec succès', 'success');
      }
      setShowModal(false);
      resetForm();
      fetchCards();
    } catch (err) {
      console.error(err);
      notify('Impossible d\'enregistrer le bulletin', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublish(card) {
    try {
      if (!card.is_published) {
        await gradesService.publishReportCard(card.id);
        notify(`Bulletin de ${card.student_name || 'l\'étudiant'} publié`, 'success');
      } else {
        await gradesService.updateReportCard(card.id, { is_published: false });
        notify(`Bulletin de ${card.student_name || 'l\'étudiant'} dépublié`, 'info');
      }
      fetchCards();
    } catch (err) {
      console.error(err);
      notify('Impossible de modifier le statut de publication', 'error');
    }
  }

  function handleDelete(id) {
    setConfirmModal({
      message: 'Êtes-vous sûr de vouloir supprimer ce bulletin ?',
      onConfirm: async () => {
        try {
          await gradesService.deleteReportCard(id);
          notify('Le bulletin a été supprimé', 'success');
          fetchCards();
        } catch (err) {
          console.error(err);
          notify('Impossible de supprimer le bulletin', 'error');
        }
      }
    });
  }

  async function handleBulkGenerate() {
    if (!bulkClass || !bulkSemester) {
      notify('Veuillez choisir une classe et un semestre', 'error');
      return;
    }
    setGeneratingBulk(true);
    try {
      const result = await gradesService.generateBulletins({ class_group_id: bulkClass, semester_id: bulkSemester });
      const count = Array.isArray(result) ? result.length : (result?.count ?? '');
      notify(`${count} bulletin(s) généré(s) avec succès`, 'success');
      setShowBulkModal(false);
      setBulkClass('');
      setBulkSemester('');
      fetchCards();
    } catch (err) {
      console.error(err);
      notify(err.message || 'Erreur lors de la génération des bulletins', 'error');
    } finally {
      setGeneratingBulk(false);
    }
  }

  async function handleRepairRanks() {
    setRepairingRanks(true);
    try {
      const res = await gradesService.repairRanks();
      notify(res?.detail || 'Rangs corrigés avec succès', 'success');
      fetchCards();
    } catch (err) {
      console.error(err);
      notify('Erreur lors de la correction des rangs', 'error');
    } finally {
      setRepairingRanks(false);
    }
  }

  async function handleDownloadPdf(card) {
    try {
      const blob = await gradesService.getBulletinPdf(card.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulletin_${(card.student_name || 'etudiant').replace(/\s+/g, '_')}_${card.semester_name || ''}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      notify('Impossible de télécharger le bulletin PDF', 'error');
    }
  }

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterYear, filterSemester, filterClass, filterStatus]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <PageHeader
        icon={FileText}
        iconColor={COLOR}
        iconBg={COLOR_ICON}
        title="Bulletins & Relevés de Notes"
        subtitle="Gestion et publication des bulletins scolaires"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleRepairRanks}
              disabled={repairingRanks}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-60"
              style={{ color: '#d97706', borderColor: '#fde68a', background: 'transparent' }}
              onMouseEnter={e => { if (!repairingRanks) { e.currentTarget.style.background = '#fef9c3'; e.currentTarget.style.borderColor = '#d97706'; }}}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#fde68a'; }}>
              {repairingRanks
                ? <><span className="h-3.5 w-3.5 rounded-full border-2 border-amber-300 border-t-amber-600 animate-spin" />Correction…</>
                : <><Award className="h-4 w-4" />Réparer les rangs</>}
            </button>
            <button
              onClick={() => setShowBulkModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all"
              style={{ color: COLOR, borderColor: `${COLOR}28`, background: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.background = `${COLOR}10`; e.currentTarget.style.borderColor = `${COLOR}55`; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `${COLOR}28`; }}>
              <RefreshCw className="h-4 w-4" />
              Générer bulletins
            </button>
            <PrimaryButton icon={Plus} label="Nouveau bulletin" color={COLOR} onClick={openCreate} />
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Bulletins générés', value: totalCards,     icon: FileText,    iconBg: COLOR_ICON, color: COLOR },
          { label: 'Publiés',           value: publishedCount, icon: CheckCircle, iconBg: '#dcfce7',  color: '#16a34a' },
          { label: 'En attente',        value: pendingCount,   icon: Clock,       iconBg: '#fef9c3',  color: '#ca8a04' },
        ].map((kpi, i) => (
          <div key={i} className="rounded-2xl p-5 border border-[#f0f4f9] bg-white flex items-center gap-4"
               style={{ boxShadow: '0 2px 12px rgba(15,23,50,0.05)' }}>
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                 style={{ background: kpi.iconBg }}>
              <kpi.icon className="h-5 w-5" style={{ color: kpi.color }} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{kpi.label}</p>
              <p className="text-2xl font-extrabold mt-0.5" style={{ color: '#0f172a' }}>{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <FilterBar>
        <SearchInput
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Rechercher étudiant, classe…"
        />
        <FilterSelect value={filterYear} onChange={e => setFilterYear(e.target.value)}>
          <option value="all">Toutes les années</option>
          {academicYears.map(y => <option key={y.id} value={y.id}>{y.name || y.label || y.year}</option>)}
        </FilterSelect>
        <FilterSelect value={filterSemester} onChange={e => setFilterSemester(e.target.value)}>
          <option value="all">Tous les semestres</option>
          {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </FilterSelect>
        <FilterSelect value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="all">Toutes les classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </FilterSelect>
        <FilterSelect value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Tous les statuts</option>
          <option value="PASS">Admis</option>
          <option value="FAIL">Échoué</option>
          <option value="PENDING">En attente</option>
          <option value="HONORS">Mention</option>
        </FilterSelect>
      </FilterBar>

      {/* Table */}
      <div className="rounded-2xl border border-[#f0f4f9] bg-white overflow-hidden"
           style={{ boxShadow: '0 2px 12px rgba(15,23,50,0.05)' }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="h-6 w-6 rounded-full border-2 border-t-emerald-600 border-emerald-200 animate-spin mx-auto" />
            <p className="text-sm font-medium mt-3" style={{ color: '#94a3b8' }}>Chargement…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4"
                 style={{ background: 'linear-gradient(135deg,#f1f5f9,#e2e8f0)' }}>
              <FileText className="h-7 w-7 opacity-30" style={{ color: '#64748b' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: '#64748b' }}>Aucun bulletin trouvé</p>
            <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Générez des bulletins ou modifiez vos filtres</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg,#fafbff,#f8fafc)', borderBottom: '1px solid #f0f4f9' }}>
                    {['Étudiant', 'Classe', 'Année', 'Semestre', 'Moyenne', 'Rang', 'Statut', 'Détails', 'Publié', 'PDF', 'Actions'].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((card, idx) => (
                    <tr key={card.id}
                        style={{ background: idx % 2 === 0 ? '#fafbff' : 'transparent', borderBottom: '1px solid #f1f5f9' }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                               style={{ background: `linear-gradient(135deg,${COLOR},${COLOR}bb)` }}>
                            {(card.student_name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                          </div>
                          <span className="font-semibold" style={{ color: '#0f172a' }}>{card.student_name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{card.class_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">{card.academic_year_name || card.year_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{card.semester_name || '—'}</td>
                      <td className="px-4 py-3">
                        {card.average != null ? (
                          <span className="font-bold" style={{ color: '#0f172a' }}>{Number(card.average).toFixed(2)}/20</span>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {card.rank != null ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                                style={{ background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd' }}>
                            #{card.rank}
                          </span>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3"><StatusPill status={card.status} /></td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDetailCard(card)}
                          title="Voir le détail du bulletin"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all hover:scale-105 active:scale-95"
                          style={{ background: 'linear-gradient(135deg,#0ea5e9,#0891b2)', color: 'white', boxShadow: '0 2px 8px #0891b220' }}>
                          <Info className="h-3 w-3" />
                          Voir
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleTogglePublish(card)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full transition-all"
                          style={card.is_published
                            ? { background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }
                            : { background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0' }}>
                          <span className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                                style={{ background: card.is_published ? '#16a34a' : '#94a3b8' }} />
                          {card.is_published ? 'Publié' : 'Privé'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDownloadPdf(card)}
                          title="Télécharger bulletin PDF"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all hover:scale-105 active:scale-95"
                          style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)', color: 'white', boxShadow: '0 2px 8px #6366f130' }}>
                          <Download className="h-3.5 w-3.5" />
                          PDF
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <IconBtn icon={Eye}    color="#059669" hoverBg="#f0fdf4" title="Voir"      onClick={() => openEdit(card)} />
                          <IconBtn icon={Edit}   color="#7c3aed" hoverBg="#f5f3ff" title="Modifier"  onClick={() => openEdit(card)} />
                          <IconBtn icon={Trash2} color="#ef4444" hoverBg="#fee2e2" title="Supprimer" onClick={() => handleDelete(card.id)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                accentColor={COLOR}
                totalItems={filtered.length}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            </div>
          </>
        )}
      </div>

      {/* Bulk Generate Modal */}
      {showBulkModal && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4"
             style={{ background: 'rgba(8,12,36,0.58)', backdropFilter: 'blur(10px)', zIndex: 9000 }}
             onClick={() => setShowBulkModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden"
               style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.2)' }}
               onClick={e => e.stopPropagation()}>
            <div style={{ height: 4, background: `linear-gradient(90deg,${COLOR},${COLOR}80)`, borderRadius: '16px 16px 0 0' }} />
            <div className="flex items-center justify-between px-6 py-4"
                 style={{ borderBottom: '1px solid #f0f4f9', background: 'linear-gradient(180deg,#fafbff 0%,#fff 100%)' }}>
              <div>
                <h2 className="text-base font-bold" style={{ color: '#0f172a' }}>Générer des bulletins</h2>
                <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Génération en lot pour une classe entière</p>
              </div>
              <button onClick={() => setShowBulkModal(false)}
                      className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-all">
                <X className="h-4 w-4" style={{ color: '#94a3b8' }} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Classe <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select className="input-field cursor-pointer w-full"
                        value={bulkClass}
                        onChange={e => setBulkClass(e.target.value)}>
                  <option value="">— Choisir une classe —</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Semestre <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select className="input-field cursor-pointer w-full"
                        value={bulkSemester}
                        onChange={e => setBulkSemester(e.target.value)}>
                  <option value="">— Choisir un semestre —</option>
                  {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2" style={{ borderTop: '1px solid #f0f4f9' }}>
                <button onClick={() => setShowBulkModal(false)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                        style={{ background: '#f1f5f9', color: '#64748b' }}>
                  Annuler
                </button>
                <button onClick={handleBulkGenerate}
                        disabled={generatingBulk}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white inline-flex items-center justify-center gap-2 disabled:opacity-60"
                        style={{ background: `linear-gradient(135deg,${COLOR},${COLOR}bb)` }}>
                  {generatingBulk ? (
                    <><span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />Génération…</>
                  ) : 'Générer'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Create / Edit Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4"
             style={{ background: 'rgba(8,12,36,0.58)', backdropFilter: 'blur(10px)', zIndex: 9000 }}
             onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
               style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.2)' }}
               onClick={e => e.stopPropagation()}>
            <div style={{ height: 4, background: `linear-gradient(90deg,${COLOR},${COLOR}80)`, borderRadius: '16px 16px 0 0' }} />
            <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
                 style={{ borderBottom: '1px solid #f0f4f9', background: 'linear-gradient(180deg,#fafbff 0%,#fff 100%)' }}>
              <div>
                <h2 className="text-base font-bold" style={{ color: '#0f172a' }}>
                  {editingCard ? 'Modifier le bulletin' : 'Nouveau bulletin'}
                </h2>
                <p className="text-xs mt-0.5 font-medium" style={{ color: '#94a3b8' }}>
                  {editingCard ? 'Mettre à jour le relevé de notes' : 'Créer un nouveau bulletin individuel'}
                </p>
              </div>
              <button onClick={() => { setShowModal(false); resetForm(); }}
                      className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-all">
                <X className="h-4 w-4" style={{ color: '#94a3b8' }} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Student search */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Étudiant <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: '#94a3b8' }} />
                  <input type="text"
                         value={studentSearch}
                         onChange={e => { setStudentSearch(e.target.value); setShowStudentDrop(true); setFormData(f => ({ ...f, student_id: '' })); }}
                         onFocus={() => setShowStudentDrop(true)}
                         placeholder="Rechercher un étudiant…"
                         className="input-field w-full"
                         style={{ paddingLeft: '2.4rem' }} />
                  {formData.student_id && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-green-500" />
                  )}
                  {showStudentDrop && filteredStudents.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white rounded-xl border border-[#e2e8f2] shadow-xl max-h-52 overflow-y-auto">
                      {filteredStudents.slice(0, 20).map(s => (
                        <button key={s.id} type="button"
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-emerald-50 transition-colors text-left"
                                onClick={() => handleStudentSelect(s)}>
                          <div className="h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                               style={{ background: `linear-gradient(135deg,${COLOR},${COLOR}bb)` }}>
                            {(s.full_name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium" style={{ color: '#0f172a' }}>
                            {s.full_name || '—'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Auto-fill indicator */}
              {autoFilling && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
                     style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af' }}>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin flex-shrink-0" />
                  Récupération des informations de l'étudiant…
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    <span>Classe</span>
                    {formData.class_id && !autoFilling && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full normal-case"
                            style={{ background: '#dcfce7', color: '#16a34a' }}>
                        ✓ auto-rempli
                      </span>
                    )}
                  </label>
                  <select className="input-field cursor-pointer w-full"
                          value={formData.class_id}
                          disabled={autoFilling}
                          onChange={e => setFormData(f => ({ ...f, class_id: e.target.value }))}>
                    <option value="">— Choisir une classe —</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    <span>Semestre <span style={{ color: '#ef4444' }}>*</span></span>
                    {formData.semester_id && !autoFilling && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full normal-case"
                            style={{ background: '#dcfce7', color: '#16a34a' }}>
                        ✓ auto-rempli
                      </span>
                    )}
                  </label>
                  <select className="input-field cursor-pointer w-full"
                          value={formData.semester_id}
                          disabled={autoFilling}
                          onChange={e => setFormData(f => ({ ...f, semester_id: e.target.value }))}>
                    <option value="">— Choisir un semestre —</option>
                    {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Moyenne générale</label>
                  <input type="number" step="0.01" min="0" max="20"
                         className="input-field w-full"
                         placeholder="Ex: 14.50"
                         value={formData.average}
                         onChange={e => setFormData(f => ({ ...f, average: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Rang</label>
                  <input type="number" min="1"
                         className="input-field w-full"
                         placeholder="Ex: 3"
                         value={formData.rank}
                         onChange={e => setFormData(f => ({ ...f, rank: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Statut</label>
                  <select className="input-field cursor-pointer w-full"
                          value={formData.status}
                          onChange={e => setFormData(f => ({ ...f, status: e.target.value }))}>
                    <option value="PENDING">En attente</option>
                    <option value="PASS">Admis</option>
                    <option value="FAIL">Échoué</option>
                    <option value="HONORS">Mention</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div className="relative">
                      <input type="checkbox" className="sr-only"
                             checked={formData.is_published}
                             onChange={e => setFormData(f => ({ ...f, is_published: e.target.checked }))} />
                      <div className="w-10 h-5 rounded-full transition-all"
                           style={{ background: formData.is_published ? COLOR : '#e2e8f0' }} />
                      <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                           style={{ transform: formData.is_published ? 'translateX(20px)' : 'translateX(0)' }} />
                    </div>
                    <span className="text-sm font-semibold" style={{ color: '#374151' }}>Publier le bulletin</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Commentaire</label>
                <textarea rows={3} className="input-field w-full resize-none"
                          placeholder="Appréciation générale…"
                          value={formData.comment}
                          onChange={e => setFormData(f => ({ ...f, comment: e.target.value }))} />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2" style={{ borderTop: '1px solid #f0f4f9' }}>
                <button type="button"
                        onClick={() => { setShowModal(false); resetForm(); }}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold border"
                        style={{ color: '#64748b', borderColor: '#e2e8f2', background: 'transparent' }}>
                  Annuler
                </button>
                <button type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                        style={{ background: `linear-gradient(135deg,${COLOR},${COLOR}bb)`, boxShadow: `0 3px 12px ${COLOR}32` }}>
                  {saving ? (
                    <><span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />Enregistrement…</>
                  ) : (editingCard ? 'Modifier' : 'Enregistrer')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Bulletin Detail Modal */}
      {detailCard && (
        <BulletinDetailModal
          card={detailCard}
          onClose={() => setDetailCard(null)}
          onDownloadPdf={handleDownloadPdf}
        />
      )}

      {/* Confirm Modal */}
      {confirmModal && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4"
             style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', zIndex: 9999 }}
             onClick={() => setConfirmModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-xs overflow-hidden"
               onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4"
                   style={{ background: '#fee2e2' }}>
                <Trash2 className="h-7 w-7" style={{ color: '#ef4444' }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>{confirmModal.message}</p>
            </div>
            <div className="px-4 pb-4 flex gap-3">
              <button onClick={() => setConfirmModal(null)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                      style={{ background: '#f1f5f9', color: '#64748b' }}>
                Annuler
              </button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                      style={{ background: '#ef4444' }}>
                Confirmer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
