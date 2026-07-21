import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Users, GraduationCap, Plus, Edit, Trash2, FolderOpen, UserPlus, ChevronDown, RefreshCw, Upload, User, Phone, ShieldAlert, Camera } from 'lucide-react';
import { studentsService, academicService } from '../../services';
import { useApi } from '../../hooks/useApi';
import { useSite } from '../../contexts/SiteContext';
import SelectWithCreate from '../../components/forms/SelectWithCreate';
import { generateSiteMatricule } from '../../utils/matriculeGenerator';
import StudentDossier from '../../components/students/StudentDossier';
import EnrollmentModal from '../../components/students/EnrollmentModal';
import {
  PageHeader, FilterBar, SearchInput, FilterSelect, PrimaryButton,
  Avatar, Modal, FormSection, FormField, FormInput, FormSelect, ModalFooter, IconBtn,
  Pagination, ExportMenu
} from '../../components/ui/PageHeader';
import { exportToExcel, exportToPDF } from '../../utils/export';
import { useNotifications } from '../../components/Notifications';

const COLOR = '#2563eb';
const COLOR_BG = '#eff6ff';
const COLOR_ICON = '#dbeafe';

const ITEMS_PER_PAGE = 10;

export default function Students() {
  const navigate = useNavigate();
  const { notify } = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const { selectedSite, sites } = useSite();
  const [filterProgram, setFilterProgram] = useState('all');
  const [filterScolarite, setFilterScolarite] = useState('all');
  const [filterInscription, setFilterInscription] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [showDossier, setShowDossier] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [actionModal, setActionModal] = useState(null);
  const [togglingOverrideId, setTogglingOverrideId] = useState(null);

  const [confirmModal, setConfirmModal] = useState(null); // { message, onConfirm }

  const emptyForm = {
    matricule: '', first_name: '', last_name: '', email: '', phone: '',
    date_of_birth: '', place_of_birth: '', gender: 'M',
    address: '', city: '', country: "Côte d'Ivoire",
    emergency_contact_name: '', emergency_contact_phone: '',
    // "Tous les sites" leaves nothing to default to — fall back to the first
    // known site so the matricule can still auto-generate immediately;
    // the admin can still change it via the Site selector.
    site_id: selectedSite !== 'all' ? selectedSite : (sites[0]?.id || ''),
    academic_year_id: '',
    program_id: '', level_id: '', class_id: '',
    enrollment_date: new Date().toISOString().split('T')[0],
    status: 'active', modality: 'PRESENTIEL', affectation_status: 'NON_AFFECTE', photo: null, photoPreview: null,
    is_former_student: false,
  };

  const [formData, setFormData] = useState(emptyForm);

  // Cascading filters: site → programs → levels → classes
  const [sitePrograms, setSitePrograms] = useState([]);
  const [siteLevels, setSiteLevels] = useState([]);
  const [siteClasses, setSiteClasses] = useState([]);

  useEffect(() => {
    if (!formData.site_id) { setSitePrograms([]); return; }
    academicService.getPrograms({ site: formData.site_id })
      .then(d => setSitePrograms(d?.results || d || []))
      .catch(() => setSitePrograms([]));
  }, [formData.site_id]);

  useEffect(() => {
    if (!formData.program_id) { setSiteLevels([]); return; }
    academicService.getLevels({ program: formData.program_id })
      .then(d => setSiteLevels(d?.results || d || []))
      .catch(() => setSiteLevels([]));
  }, [formData.program_id]);

  useEffect(() => {
    if (!formData.level_id || !formData.site_id) { setSiteClasses([]); return; }
    academicService.getClasses({ level: formData.level_id, site: formData.site_id })
      .then(d => setSiteClasses(d?.results || d || []))
      .catch(() => setSiteClasses([]));
  }, [formData.level_id, formData.site_id]);

  const siteFilter = selectedSite !== 'all' ? { site: selectedSite } : {};
  const { data: students, loading, execute: fetchStudents } = useApi(
    () => studentsService.getAll({
      search: searchTerm, status: filterStatus !== 'all' ? filterStatus : undefined,
      program: filterProgram !== 'all' ? filterProgram : undefined, ...siteFilter,
      // Unpaginated — the scolarité/inscription filters and KPI counts below
      // are computed client-side from this list, so it must contain every
      // matching student, not just the server's default first page.
      page_size: 1000,
    }),
    [searchTerm, filterStatus, filterProgram, selectedSite], true
  );
  const { data: programs, execute: fetchPrograms } = useApi(() => academicService.getPrograms(), [], true);
  const { data: levels, execute: fetchLevels } = useApi(() => academicService.getLevels(), [], true);
  const { data: classes, execute: fetchClasses } = useApi(() => academicService.getClasses(), [], true);
  const { data: academicYears } = useApi(() => academicService.getAcademicYears(), [], true);

  const set = (key, val) => setFormData(p => ({ ...p, [key]: val }));
  const f = (key) => ({ value: formData[key], onChange: (e) => set(key, e.target.value) });

  // Affecté (État) students and "ancien étudiant" (re-registering) ones often
  // arrive with their own external/prior matricule — the field always starts
  // auto-generated (below) but stays freely editable so the admin can
  // overwrite it with that real number. It used to be force-cleared to
  // empty the moment "Affecté" was selected, several fields further down —
  // invisible if the admin had already scrolled past the matricule field,
  // making "Le matricule est requis" fire on submit with no obvious cause
  // ("generation is broken"). Never clearing it removes that failure mode
  // entirely: the field is never silently blank-and-required.
  const regenerateMatricule = useCallback(async () => {
    const site = sites.find(s => s.id === formData.site_id);
    if (!site) return;
    // The page's `students` list is scoped to whatever search/status/program
    // filter is currently active (and paginated to PAGE_SIZE=20) — using it
    // to compute "next available number" silently ignores students outside
    // that filtered page, producing a number that's already taken. Fetch a
    // clean, site-only, unfiltered roster instead so this always reflects
    // the true next number regardless of the list's current filter/page.
    let existing = [];
    try {
      const res = await studentsService.getAll({ site: site.id, page_size: 500 });
      existing = (res?.results || res || []).map(s => s.matricule).filter(Boolean);
    } catch {
      existing = (students?.results || students || []).map(s => s.matricule).filter(Boolean);
    }
    set('matricule', generateSiteMatricule(site.code, existing));
  }, [sites, formData.site_id, students]);

  useEffect(() => {
    if (!editingStudent && showModal && !formData.matricule) {
      regenerateMatricule();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, editingStudent, formData.site_id]);

  // The "Année académique" field has no visual "required" marker, so it's
  // easy to leave blank — but without it, handleSubmit's `class_id &&
  // academic_year_id` guard silently skips creating the enrollment, leaving
  // the student with no class/program (shows as "N/A" in the list) even
  // when Programme/Niveau/Classe were filled in. Default it to the current
  // year as soon as it's known, same as the class-creation fallback below.
  useEffect(() => {
    if (!editingStudent && showModal && !formData.academic_year_id) {
      const yearsList = academicYears?.results || academicYears || [];
      const current = yearsList.find(y => y.is_current) || yearsList[0];
      if (current) set('academic_year_id', current.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, editingStudent, academicYears]);

  // `photo` is stored server-side as a plain text field (data URI), not an
  // uploaded file — so the picked File must be inlined as base64 before it's
  // sent in the JSON payload.
  const photoToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingStudent) {
      // Validation uniquement lors de la création — le format généré
      // (MAT-SITE-ANNÉE-00001) est produit par le système lui-même, pas
      // besoin de le re-vérifier ; un matricule saisi manuellement (affecté
      // État / ancien étudiant) peut suivre un tout autre format externe, on
      // exige juste qu'il ne soit pas vide.
      if (!formData.matricule?.trim()) { notify('Le matricule est requis', 'error'); return; }
      if (!formData.first_name?.trim()) { notify('Le prénom est requis', 'error'); return; }
      if (!formData.last_name?.trim())  { notify('Le nom est requis', 'error'); return; }
      if (!formData.email?.trim())      { notify('L\'email est requis', 'error'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { notify('Email invalide', 'error'); return; }
    }
    const effectiveSite = formData.site_id || (selectedSite !== 'all' ? selectedSite : null);
    if (!editingStudent && !effectiveSite) { notify('Sélectionnez un site', 'error'); return; }
    const photoDataUrl = formData.photo instanceof File ? await photoToDataUrl(formData.photo) : undefined;
    try {
      if (editingStudent) {
        const payload = {
          gender: formData.gender,
          birth_date: formData.date_of_birth || undefined,
          birth_place: formData.place_of_birth || undefined,
          address: formData.address || undefined,
          city: formData.city || undefined,
          nationality: formData.country || undefined,
          status: formData.status?.toUpperCase() || 'ACTIVE',
          modality: formData.modality || 'PRESENTIEL',
          affectation_status: formData.affectation_status || 'NON_AFFECTE',
          emergency_contact_name: formData.emergency_contact_name || undefined,
          emergency_contact_phone: formData.emergency_contact_phone || undefined,
          ...(photoDataUrl && { photo: photoDataUrl }),
          user_data: {
            first_name: formData.first_name || undefined,
            last_name: formData.last_name || undefined,
            phone: formData.phone || undefined,
          },
        };
        await studentsService.update(editingStudent.id, payload);

        // Save enrollment if class is selected
        if (formData.class_id && formData.academic_year_id) {
          try {
            if (editingStudent._enrollmentId) {
              await academicService.updateEnrollment(editingStudent._enrollmentId, {
                class_obj: formData.class_id,
                academic_year: formData.academic_year_id,
                status: 'ENROLLED',
              });
            } else {
              await academicService.createEnrollment({
                student: editingStudent.id,
                class_obj: formData.class_id,
                academic_year: formData.academic_year_id,
                status: 'ENROLLED',
              });
            }
          } catch (enrollErr) {
            console.warn('Enrollment update failed:', enrollErr);
          }
        }
      } else {
        const tmp = 'Campus2026!';
        const newStudent = await studentsService.create({
          user_data: { first_name: formData.first_name, last_name: formData.last_name, email: formData.email, phone: formData.phone || '', password: tmp, password_confirm: tmp },
          matricule: formData.matricule,
          gender: formData.gender, birth_date: formData.date_of_birth, birth_place: formData.place_of_birth || '',
          address: formData.address || '', city: formData.city || '', nationality: formData.country || 'Ivoirienne',
          site: effectiveSite, admission_date: formData.enrollment_date,
          emergency_contact_name: formData.emergency_contact_name || '',
          emergency_contact_phone: formData.emergency_contact_phone || '',
          status: formData.status?.toUpperCase() || 'ACTIVE',
          modality: formData.modality || 'PRESENTIEL',
          affectation_status: formData.affectation_status || 'NON_AFFECTE',
          ...(photoDataUrl && { photo: photoDataUrl }),
        });
        // Create enrollment if class + academic year selected
        if (newStudent?.id && formData.class_id && formData.academic_year_id) {
          try {
            await academicService.createEnrollment({
              student: newStudent.id,
              class_obj: formData.class_id,
              academic_year: formData.academic_year_id,
              status: 'ENROLLED',
            });
          } catch (enrollErr) {
            // Must NOT fail silently — the student record was already
            // created successfully above, so swallowing this left the admin
            // believing the chosen classe/filière was applied when the
            // student actually has ZERO enrollments. That silent gap is
            // exactly what let a later, unrelated invoice-creation signal
            // (create_enrollment_on_registration_invoice) auto-enroll the
            // student into an arbitrary, unrelated class instead — the
            // admin's real choice was silently discarded and never known.
            console.error('Enrollment creation failed:', enrollErr);
            notify(
              `Étudiant créé, mais l'inscription dans la classe a échoué (${enrollErr?.message || 'erreur inconnue'}). `
              + 'Corrigez la classe manuellement dans l\'onglet Parcours du dossier.',
              'error'
            );
          }
        }
      }
      setShowModal(false); setEditingStudent(null); setFormData(emptyForm); fetchStudents();
    } catch (err) {
      console.error('Student save error:', err);
      notify(err.message || 'Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleEdit = async (s) => {
    try {
      const [full, enrollmentsData] = await Promise.all([
        studentsService.getById(s.id),
        academicService.getEnrollments({ student: s.id, status: 'ENROLLED' }).catch(() => null),
      ]);
      const enrollmentsList = enrollmentsData?.results || enrollmentsData || [];
      const activeEnrollment = enrollmentsList.find(e => e.status === 'ENROLLED') || enrollmentsList[0] || null;

      let programId = '';
      let levelId = '';
      if (activeEnrollment?.class_obj) {
        try {
          const classDetails = await academicService.getClassById(activeEnrollment.class_obj);
          levelId = classDetails?.level || '';
          if (levelId) {
            const levelDetails = await academicService.getLevelById(levelId);
            programId = levelDetails?.program || '';
          }
        } catch {}
      }

      setEditingStudent({ ...full, _enrollmentId: activeEnrollment?.id || null });
      setFormData({
        matricule: full.matricule || '',
        first_name: full.user?.first_name || '',
        last_name: full.user?.last_name || '',
        email: full.user?.email || '',
        phone: full.user?.phone || '',
        date_of_birth: full.birth_date || '',
        place_of_birth: full.birth_place || '',
        gender: full.gender || 'M',
        address: full.address || '',
        city: full.city || '',
        country: full.nationality || "Côte d'Ivoire",
        emergency_contact_name: full.emergency_contact_name || '',
        emergency_contact_phone: full.emergency_contact_phone || '',
        site_id: full.site || full.site_id || '',
        program_id: programId,
        level_id: levelId,
        class_id: activeEnrollment?.class_obj || '',
        academic_year_id: activeEnrollment?.academic_year || '',
        enrollment_date: full.admission_date || new Date().toISOString().split('T')[0],
        status: (full.status || 'active').toLowerCase(),
        modality: full.modality || 'PRESENTIEL',
        affectation_status: full.affectation_status || 'NON_AFFECTE',
        photo: null,
        photoPreview: null,
      });
      setShowModal(true);
    } catch { notify('Erreur lors du chargement', 'error'); }
  };

  const handleDelete = (id) => {
    setConfirmModal({
      message: 'Supprimer cet étudiant ?',
      onConfirm: async () => {
        try {
          await studentsService.delete(id);
          fetchStudents();
        } catch (err) {
          notify(err?.message || 'Erreur lors de la suppression', 'error');
        }
        finally { setConfirmModal(null); }
      }
    });
  };

  // Admin-only exemption: lets a student access e-learning content/exams
  // even while behind on their échéancier de scolarité, so the school can
  // let them compose now and settle the remaining tuition later. Mirrors
  // the same échéance_override toggle already available inside the student
  // dossier page, exposed here directly per-row for quick access.
  const handleToggleEcheanceOverride = async (student) => {
    const next = !student.echeance_override;
    setTogglingOverrideId(student.id);
    try {
      await studentsService.update(student.id, { echeance_override: next });
      notify(
        next
          ? "Accès e-learning autorisé malgré le retard de paiement."
          : "Autorisation spéciale révoquée — l'étudiant redevient soumis à l'échéancier.",
        'success'
      );
      fetchStudents();
    } catch (err) {
      notify(err?.message || "Erreur lors de la mise à jour de l'autorisation", 'error');
    } finally {
      setTogglingOverrideId(null);
    }
  };

  const handleCreateProgram = async (name) => {
    const siteId = formData.site_id || (selectedSite !== 'all' ? selectedSite : null);
    if (!siteId) { notify('Sélectionnez un site', 'error'); throw new Error(); }
    return academicService.createProgram({ name, code: name.slice(0,3).toUpperCase()+'-'+Date.now().toString().slice(-4), site: siteId });
  };
  const handleCreateLevel = async (name) => {
    if (!formData.program_id) { notify('Sélectionnez un programme', 'error'); throw new Error(); }
    return academicService.createLevel({ name, code: name.slice(0,3).toUpperCase(), order: 1, program: formData.program_id });
  };
  const handleCreateClass = async (name) => {
    if (!formData.level_id) { notify('Sélectionnez un niveau', 'error'); throw new Error(); }
    const siteId = formData.site_id || (selectedSite !== 'all' ? selectedSite : null);
    if (!siteId) { notify('Sélectionnez un site', 'error'); throw new Error(); }
    const yearsList = academicYears?.results || academicYears || [];
    const yr = yearsList.find(y => y.is_current) || yearsList[0];
    if (!yr) { notify('Aucune année académique', 'error'); throw new Error(); }
    return academicService.createClass({ name, code: name.slice(0,3).toUpperCase()+'-'+Date.now().toString().slice(-4), level: formData.level_id, site: siteId, academic_year: yr.id });
  };

  const studentsListAll = students?.results || students || [];
  const programsList = programs?.results || programs || [];
  const levelsList = levels?.results || levels || [];
  const classesList = classes?.results || classes || [];

  // Scolarité/inscription filters are client-side — tuition status is
  // computed on the fly (not a stored/filterable DB column), and inscription
  // status is filtered here too for consistency rather than mixing a
  // backend filter for one and a client filter for the other.
  const studentsList = studentsListAll.filter(s => {
    if (filterScolarite === 'ok' && !(s.tuition_up_to_date || s.echeance_override)) return false;
    if (filterScolarite === 'late' && (s.tuition_up_to_date || s.echeance_override)) return false;
    if (filterInscription === 'yes' && !s.is_enrolled) return false;
    if (filterInscription === 'no' && s.is_enrolled) return false;
    return true;
  });

  const totalPages = Math.ceil(studentsList.length / ITEMS_PER_PAGE);
  const paginated = studentsList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => setCurrentPage(1), [searchTerm, filterStatus, filterProgram, filterScolarite, filterInscription, selectedSite]);

  const avatarColors = ['#2563eb','#7c3aed','#059669','#ea580c','#db2777'];

  const activeCount   = studentsList.filter(s => s.status === 'active'   || s.status === 'ACTIVE').length;
  const pendingCount  = studentsList.filter(s => !s.is_enrolled).length;
  const graduateCount = studentsList.filter(s => s.status === 'graduated' || s.status === 'GRADUATED').length;

  // Exports reflect the currently filtered list (studentsList), not just the
  // current page — search/statut/programme/scolarité/inscription filters all
  // apply before either export runs.
  const scolariteLabel = (s) => !(s.has_payment_schedule || s.echeance_override)
    ? '—'
    : s.echeance_override ? 'Admission autorisée' : s.tuition_up_to_date ? 'À jour' : 'Non à jour';

  const handleExportExcel = () => {
    const headers = ['Matricule', 'Étudiant', 'Email', 'Programme', 'Inscription', 'Scolarité', 'Statut'];
    const rows = studentsList.map(s => ({
      'Matricule': s.matricule || '—',
      'Étudiant': s.full_name || '—',
      'Email': s.email || '—',
      'Programme': s.program_name || '—',
      'Inscription': s.is_enrolled ? 'Inscrit' : 'Non inscrit',
      'Scolarité': scolariteLabel(s),
      'Statut': s.status || '—',
    }));
    exportToExcel(rows, headers, `etudiants-${new Date().toISOString().slice(0, 10)}`, 'Étudiants');
  };

  const handleExportPDF = () => {
    const columns = ['Matricule', 'Étudiant', 'Programme', 'Inscription', 'Scolarité', 'Statut'];
    const rows = studentsList.map(s => [
      s.matricule || '—',
      s.full_name || '—',
      s.program_name || '—',
      s.is_enrolled ? 'Inscrit' : 'Non inscrit',
      scolariteLabel(s),
      s.status || '—',
    ]);
    exportToPDF(
      'Liste des étudiants', columns, rows,
      `etudiants-${new Date().toISOString().slice(0, 10)}`,
      { 'Total': studentsList.length }
    );
  };

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        icon={Users} iconColor={COLOR} iconBg={COLOR_ICON}
        title="Gestion des Étudiants"
        subtitle={`${studentsList.length} étudiant${studentsList.length > 1 ? 's' : ''} au total`}
        action={
          <PrimaryButton icon={Plus} label="Nouvel Étudiant" color={COLOR}
            onClick={() => { setEditingStudent(null); setFormData(emptyForm); setShowModal(true); }} />
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total étudiants',  value: studentsList.length, color: COLOR,     bg: COLOR_ICON,  icon: Users },
          { label: 'Actifs',           value: activeCount,          color: '#059669', bg: '#d1fae5',   icon: Users },
          { label: 'Non inscrit',      value: pendingCount,         color: '#d97706', bg: '#fef3c7',   icon: Users },
          { label: 'Diplômés',         value: graduateCount,        color: '#7c3aed', bg: '#ede9fe',   icon: GraduationCap },
        ].map((s, i) => (
          <div key={i} className="card p-4 flex items-center gap-4">
            <div className="h-11 w-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                 style={{ background: `linear-gradient(135deg, ${s.bg}, ${s.color}18)`, boxShadow: `0 4px 14px ${s.color}20` }}>
              <s.icon className="h-5 w-5" style={{ color: s.color }} />
            </div>
            <div>
              <p className="kpi-number" style={{ fontSize: '1.4rem' }}>{s.value}</p>
              <p className="kpi-label">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <FilterBar>
        <SearchInput value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Rechercher un étudiant…" />
        <FilterSelect value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="inactive">Inactif</option>
          <option value="suspended">Suspendu</option>
          <option value="graduated">Diplômé</option>
        </FilterSelect>
        <FilterSelect value={filterProgram} onChange={e => setFilterProgram(e.target.value)}>
          <option value="all">Tous les programmes</option>
          {programsList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </FilterSelect>
        <FilterSelect value={filterScolarite} onChange={e => setFilterScolarite(e.target.value)}>
          <option value="all">Toute scolarité</option>
          <option value="ok">Scolarité à jour</option>
          <option value="late">Scolarité non à jour</option>
        </FilterSelect>
        <FilterSelect value={filterInscription} onChange={e => setFilterInscription(e.target.value)}>
          <option value="all">Inscrit/Non inscrit</option>
          <option value="yes">Inscrit</option>
          <option value="no">Non inscrit</option>
        </FilterSelect>
        <ExportMenu color={COLOR} onExcel={handleExportExcel} onPDF={handleExportPDF} />
      </FilterBar>

      <div className="rounded-2xl" style={{ border: '1.5px solid #f0f4f9' }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 rounded-full border-[3px] animate-spin"
                 style={{ borderColor: COLOR_BG, borderTopColor: COLOR }} />
          </div>
        ) : studentsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Users className="h-12 w-12 mb-4 opacity-20" style={{ color: '#64748b' }} />
            <p className="text-sm" style={{ color: '#94a3b8' }}>Aucun étudiant trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'linear-gradient(135deg,#fafbff,#f8fafc)', borderBottom: '1px solid #f0f4f9' }}>
                  {['Matricule','Étudiant','Email','Programme','Inscription','Scolarité','Statut',''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
                        style={{ color: '#94a3b8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((student, i) => {
                  const s = student.status?.toUpperCase();
                  const statusCfg = s === 'ACTIVE' ? { label: 'Actif', color: '#059669', bg: '#d1fae5' }
                    : s === 'INACTIVE' ? { label: 'Inactif', color: '#64748b', bg: '#f1f5f9' }
                    : s === 'SUSPENDED' ? { label: 'Suspendu', color: '#d97706', bg: '#fef3c7' }
                    : s === 'GRADUATED' ? { label: 'Diplômé', color: '#7c3aed', bg: '#ede9fe' }
                    : { label: s || '—', color: '#64748b', bg: '#f1f5f9' };
                  const enrolled = student.is_enrolled;
                  return (
                    <tr key={student.id}
                        style={{ borderBottom: '1px solid #f8fafc', background: i % 2 !== 0 ? '#fafbff' : 'transparent' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#eff6ff40'}
                        onMouseLeave={e => e.currentTarget.style.background = i % 2 !== 0 ? '#fafbff' : 'transparent'}>

                      <td className="px-4 py-2.5">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg"
                              style={{ background: COLOR_BG, color: COLOR }}>
                          {student.matricule || 'N/A'}
                        </span>
                      </td>

                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={student.full_name || ''} color={avatarColors[i % 5]} />
                          <div>
                            <p className="text-xs font-semibold" style={{ color: '#1e293b' }}>{student.full_name || '—'}</p>
                            <p className="text-[11px]" style={{ color: '#94a3b8' }}>{student.gender === 'M' ? 'Masculin' : 'Féminin'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: '#64748b' }}>{student.email || '—'}</td>

                      <td className="px-4 py-2.5 text-xs" style={{ color: '#64748b' }}>{student.program_name || 'N/A'}</td>

                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap"
                              style={{ color: enrolled ? '#059669' : '#d97706', background: enrolled ? '#d1fae5' : '#fef3c7' }}>
                          <span className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                                style={{ background: enrolled ? '#059669' : '#d97706' }} />
                          {enrolled ? 'Inscrit' : 'En attente'}
                        </span>
                        {student.balance_due > 0 && (
                          <p className="text-[11px] mt-0.5" style={{ color: '#ef4444' }}>Dû: {student.balance_due?.toLocaleString()} F</p>
                        )}
                      </td>

                      <td className="px-4 py-2.5">
                        {student.has_payment_schedule || student.echeance_override ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap"
                                  style={student.echeance_override
                                    ? { color: '#1d4ed8', background: '#dbeafe' }
                                    : student.tuition_up_to_date
                                      ? { color: '#059669', background: '#d1fae5' }
                                      : { color: '#dc2626', background: '#fee2e2' }}>
                              <span className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                                    style={{ background: student.echeance_override ? '#1d4ed8' : student.tuition_up_to_date ? '#059669' : '#dc2626' }} />
                              {student.echeance_override ? 'Admission autorisée' : student.tuition_up_to_date ? 'À jour' : 'Non à jour'}
                            </span>
                            <button
                              type="button"
                              disabled={togglingOverrideId === student.id}
                              onClick={() => handleToggleEcheanceOverride(student)}
                              title={student.echeance_override
                                ? "Révoquer l'autorisation spéciale — l'étudiant redevient soumis à l'échéancier"
                                : "Autoriser l'accès e-learning malgré le retard de paiement (à régulariser plus tard)"}
                              className="relative inline-flex h-4 w-8 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50"
                              style={{ background: student.echeance_override ? '#1d4ed8' : '#cbd5e1' }}>
                              <span className="inline-block h-3 w-3 rounded-full bg-white shadow transition-transform"
                                    style={{ transform: student.echeance_override ? 'translateX(17px)' : 'translateX(2px)' }} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px]" style={{ color: '#cbd5e1' }}>—</span>
                        )}
                      </td>

                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap"
                              style={{ color: statusCfg.color, background: statusCfg.bg }}>
                          <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: statusCfg.color }} />
                          {statusCfg.label}
                        </span>
                      </td>

                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => setActionModal(student)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                            style={{ color: '#64748b' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}>
                            Actions <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage}
        accentColor={COLOR} totalItems={studentsList.length} itemsPerPage={ITEMS_PER_PAGE} />

      {/* Actions modal */}
      {actionModal && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4"
             style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 9999 }}
             onClick={() => setActionModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
               onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-5 pt-5 pb-4" style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)' }}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-base truncate">
                    {actionModal.full_name || '—'}
                  </p>
                  <p className="text-blue-100 text-xs mt-0.5">{actionModal.matricule || '—'}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                  {actionModal.gender === 'F' ? 'F' : 'M'}
                </span>
              </div>
            </div>
            {/* Actions */}
            <div className="p-3 space-y-2">
              {[
                { label: 'Dossier étudiant',  desc: 'Consulter le dossier complet', icon: FolderOpen, color: COLOR,     bg: '#eff6ff', action: () => { navigate(`/admin/students/${actionModal.id}/dossier`); setActionModal(null); } },
                { label: 'Inscription',        desc: 'Inscrire à une classe',         icon: UserPlus,   color: '#059669', bg: '#ecfdf5', action: () => { setSelectedStudent(actionModal); setShowEnrollmentModal(true); setActionModal(null); } },
                { label: 'Modifier',           desc: 'Éditer les informations',       icon: Edit,       color: '#7c3aed', bg: '#f5f3ff', action: async () => { await handleEdit(actionModal); setActionModal(null); } },
                { label: 'Supprimer',          desc: 'Retirer cet étudiant',          icon: Trash2,     color: '#ef4444', bg: '#fef2f2', action: () => { handleDelete(actionModal.id); setActionModal(null); } },
              ].map((item, idx) => (
                <button key={idx} type="button" onClick={item.action}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all"
                  style={{ border: '1.5px solid #f1f5f9' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = item.color + '55'; e.currentTarget.style.background = item.bg + '55'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.background = 'transparent'; }}>
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                       style={{ background: item.bg }}>
                    <item.icon className="h-4 w-4" style={{ color: item.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>{item.label}</p>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>{item.desc}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 -rotate-90 flex-shrink-0" style={{ color: '#cbd5e1' }} />
                </button>
              ))}
            </div>
            {/* Footer */}
            <div className="px-3 pb-3">
              <button type="button" onClick={() => setActionModal(null)}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: '#f8fafc', color: '#64748b' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)}
             title={editingStudent ? 'Modifier l\'étudiant' : 'Nouvel étudiant'}
             subtitle={editingStudent ? `Modification de ${editingStudent?.user?.full_name || editingStudent?.full_name || '...'}` : 'Remplissez les informations du nouvel étudiant'}>
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Matricule */}
          <div className="p-4 rounded-2xl" style={{ background: COLOR_BG }}>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold" style={{ color: COLOR }}>Matricule *</label>
              {!editingStudent && (
                <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer select-none" style={{ color: '#475569' }}>
                  <input type="checkbox" checked={formData.is_former_student}
                    onChange={e => setFormData(p => ({ ...p, is_former_student: e.target.checked }))}
                    className="w-3.5 h-3.5 rounded" style={{ accentColor: COLOR }} />
                  Ancien étudiant
                </label>
              )}
            </div>
            <div className="flex gap-2">
              <input {...f('matricule')} required placeholder="MAT-SITE-2026-00001"
                className="input-field font-mono flex-1" />
              {!editingStudent && (
                <button type="button" onClick={regenerateMatricule}
                        className="h-11 w-11 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                        style={{ background: COLOR }}>
                  <RefreshCw className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="text-xs mt-1" style={{ color: '#64748b' }}>
              Généré automatiquement (MAT-SITE-ANNÉE-NUMÉRO) — modifiable si l'étudiant a déjà un matricule
              (affecté par l'État, ancien étudiant).
            </p>
          </div>

          {/* Photo upload */}
          <div className="flex justify-center">
            <label className="relative cursor-pointer group">
              <div className="h-24 w-24 rounded-full flex items-center justify-center overflow-hidden"
                   style={{ background: formData.photoPreview ? 'transparent' : `linear-gradient(135deg, ${COLOR}, #818cf8)`, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                {formData.photoPreview
                  ? <img src={formData.photoPreview} alt="" className="h-full w-full object-cover" />
                  : <Users className="h-9 w-9 text-white" />}
              </div>
              <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                   style={{ background: 'rgba(0,0,0,0.5)' }}>
                <Camera className="h-6 w-6 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-lg flex items-center justify-center text-white shadow-md"
                   style={{ background: COLOR }}>
                <Upload className="h-3.5 w-3.5" />
              </div>
              <input type="file" accept="image/*" className="hidden"
                onChange={e => {
                  const file = e.target.files[0];
                  if (file) {
                    set('photo', file);
                    set('photoPreview', URL.createObjectURL(file));
                  }
                }} />
            </label>
          </div>
          <p className="text-center text-[11px] -mt-4" style={{ color: '#94a3b8' }}>JPG, PNG — max 2MB</p>

          <FormSection title="Informations personnelles" icon={User}>
            <FormField label="Prénom" required><FormInput {...f('first_name')} required /></FormField>
            <FormField label="Nom" required><FormInput {...f('last_name')} required /></FormField>
            <FormField label="Genre"><FormSelect {...f('gender')}><option value="M">Masculin</option><option value="F">Féminin</option></FormSelect></FormField>
            <FormField label="Date de naissance"><FormInput type="date" {...f('date_of_birth')} /></FormField>
            <FormField label="Lieu de naissance"><FormInput {...f('place_of_birth')} /></FormField>
          </FormSection>

          <FormSection title="Contact" icon={Phone}>
            <FormField label="Email" required><FormInput type="email" {...f('email')} required /></FormField>
            <FormField label="Téléphone"><FormInput type="tel" {...f('phone')} /></FormField>
            <FormField label="Adresse"><FormInput {...f('address')} /></FormField>
            <FormField label="Ville"><FormInput {...f('city')} /></FormField>
            <FormField label="Pays" fullWidth><FormInput {...f('country')} /></FormField>
          </FormSection>

          <FormSection title="Contact d'urgence" icon={ShieldAlert}>
            <FormField label="Nom du contact"><FormInput {...f('emergency_contact_name')} /></FormField>
            <FormField label="Téléphone du contact"><FormInput type="tel" {...f('emergency_contact_phone')} /></FormField>
          </FormSection>

          <FormSection title="Informations académiques" icon={GraduationCap}>
            {/* Site selector — resets downstream when changed */}
            <FormField label="Site" required>
              <FormSelect
                value={formData.site_id}
                onChange={e => setFormData(p => ({ ...p, site_id: e.target.value, program_id: '', level_id: '', class_id: '' }))}>
                <option value="">Sélectionner un site…</option>
                {(sites || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </FormSelect>
            </FormField>

            <FormField label="Année académique">
              <FormSelect value={formData.academic_year_id} onChange={e => set('academic_year_id', e.target.value)}>
                <option value="">Sélectionner…</option>
                {(academicYears?.results || academicYears || []).map(y => (
                  <option key={y.id} value={y.id}>{y.name}{y.is_current ? ' (En cours)' : ''}</option>
                ))}
              </FormSelect>
            </FormField>

            <FormField label="Programme">
              <SelectWithCreate
                label="" value={formData.program_id}
                onChange={e => setFormData(p => ({ ...p, program_id: e.target.value, level_id: '', class_id: '' }))}
                options={sitePrograms.map(p => ({
                  value: p.id,
                  label: p.code ? `${p.name} (${p.code})` : p.name,
                }))}
                onCreateNew={handleCreateProgram} onRefresh={() => {}}
                createLabel="Créer un programme"
                disabled={!formData.site_id} />
            </FormField>

            <FormField label="Niveau">
              <SelectWithCreate
                label="" value={formData.level_id}
                onChange={e => setFormData(p => ({ ...p, level_id: e.target.value, class_id: '' }))}
                options={siteLevels.map(l => ({ value: l.id, label: l.code ? `${l.name} (${l.code})` : l.name }))}
                onCreateNew={handleCreateLevel} onRefresh={() => {}}
                createLabel="Créer un niveau"
                disabled={!formData.program_id} />
            </FormField>

            <FormField label="Classe">
              <SelectWithCreate
                label="" value={formData.class_id}
                onChange={e => set('class_id', e.target.value)}
                options={siteClasses.map(c => ({ value: c.id, label: c.code ? `${c.name} (${c.code})` : c.name }))}
                onCreateNew={handleCreateClass} onRefresh={() => {}}
                createLabel="Créer une classe"
                disabled={!formData.level_id} />
            </FormField>

            <FormField label="Date d'inscription"><FormInput type="date" {...f('enrollment_date')} /></FormField>
            <FormField label="Statut"><FormSelect {...f('status')}><option value="active">Actif</option><option value="inactive">Inactif</option><option value="suspended">Suspendu</option><option value="graduated">Diplômé</option></FormSelect></FormField>
            <FormField label="Modalité de suivi">
              <FormSelect {...f('modality')}>
                <option value="PRESENTIEL">Présentiel</option>
                <option value="ELEARNING">E-learning</option>
                <option value="HYBRIDE">Hybride</option>
              </FormSelect>
            </FormField>
            <FormField label="Affectation">
              <FormSelect value={formData.affectation_status}
                onChange={e => set('affectation_status', e.target.value)}>
                <option value="NON_AFFECTE">Non affecté (Privé)</option>
                <option value="AFFECTE">Affecté (État)</option>
              </FormSelect>
            </FormField>
          </FormSection>

          <ModalFooter onCancel={() => setShowModal(false)} submitLabel={editingStudent ? 'Mettre à jour' : 'Créer'} color={COLOR} />
        </form>
      </Modal>

      {showDossier && selectedStudent && (
        <StudentDossier student={selectedStudent} onClose={() => { setShowDossier(false); setSelectedStudent(null); }} />
      )}
      {showEnrollmentModal && selectedStudent && (
        <EnrollmentModal student={selectedStudent} onClose={() => { setShowEnrollmentModal(false); setSelectedStudent(null); }} onSuccess={fetchStudents} />
      )}

      {confirmModal && createPortal(
        <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 9999 }}
             onClick={() => setConfirmModal(null)}>
          <div className="rounded-2xl p-6 w-full max-w-sm shadow-2xl" style={{ background: '#fff', border: '1.5px solid #f0f4f9' }}
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#fef2f2' }}>
                <Trash2 className="h-5 w-5" style={{ color: '#ef4444' }} />
              </div>
              <p className="text-sm font-medium text-slate-700">{confirmModal.message}</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmModal(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Annuler</button>
              <button onClick={confirmModal.onConfirm} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: '#ef4444' }}>Supprimer</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
