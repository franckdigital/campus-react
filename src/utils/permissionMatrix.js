export const MATRIX_LS = 'campus_role_matrix';

export const PERMISSION_GROUPS = [
  { group: 'Étudiants', icon: '🎓', color: '#2563eb', bg: '#dbeafe', permissions: [
    { key: 'view_students',      label: 'Voir les étudiants' },
    { key: 'create_student',     label: 'Inscrire un étudiant' },
    { key: 'edit_student',       label: 'Modifier un dossier' },
    { key: 'delete_student',     label: 'Supprimer un étudiant' },
    { key: 'view_student_docs',  label: 'Voir les documents étudiants' },
    { key: 'manage_student_docs',label: 'Gérer les documents étudiants' },
  ]},
  { group: 'Académique', icon: '📚', color: '#7c3aed', bg: '#ede9fe', permissions: [
    { key: 'view_classes',   label: 'Voir les classes' },
    { key: 'manage_classes', label: 'Gérer les classes' },
    { key: 'view_subjects',  label: 'Voir les cours' },
    { key: 'manage_subjects',label: 'Gérer les cours' },
    { key: 'view_schedule',  label: 'Voir le planning' },
    { key: 'manage_schedule',label: 'Gérer le planning' },
    { key: 'view_grades',    label: 'Voir les notes' },
    { key: 'manage_grades',  label: 'Saisir les notes' },
  ]},
  { group: 'Finance', icon: '💰', color: '#d97706', bg: '#fef3c7', permissions: [
    { key: 'view_payments',    label: 'Voir les paiements' },
    { key: 'create_payment',   label: 'Enregistrer un paiement' },
    { key: 'delete_payment',   label: 'Supprimer un paiement' },
    { key: 'view_accounting',  label: 'Voir la comptabilité' },
    { key: 'manage_accounting',label: 'Gérer la comptabilité' },
    { key: 'export_finance',   label: 'Exporter les données financières' },
  ]},
  { group: 'Présences', icon: '✅', color: '#059669', bg: '#d1fae5', permissions: [
    { key: 'view_attendance',  label: 'Voir les présences' },
    { key: 'mark_attendance',  label: 'Marquer les présences' },
    { key: 'edit_attendance',  label: 'Modifier les présences' },
    { key: 'export_attendance',label: 'Exporter les présences' },
  ]},
  { group: 'Documents', icon: '📄', color: '#0284c7', bg: '#bae6fd', permissions: [
    { key: 'view_documents', label: 'Voir les documents' },
    { key: 'upload_document',label: 'Téléverser des documents' },
    { key: 'delete_document',label: 'Supprimer des documents' },
    { key: 'manage_archives',label: 'Gérer les archives' },
  ]},
  { group: 'E-Learning', icon: '💻', color: '#db2777', bg: '#fce7f3', permissions: [
    { key: 'view_elearning',   label: 'Voir le contenu e-learning' },
    { key: 'create_lesson',    label: 'Créer des leçons' },
    { key: 'manage_elearning', label: 'Gérer le e-learning' },
    { key: 'view_assignments', label: 'Voir les devoirs' },
    { key: 'grade_assignments',label: 'Corriger les devoirs' },
  ]},
  { group: 'Administration', icon: '⚙️', color: '#7c3aed', bg: '#ede9fe', permissions: [
    { key: 'manage_users',   label: 'Gérer les utilisateurs' },
    { key: 'manage_roles',   label: 'Gérer les rôles' },
    { key: 'view_logs',      label: 'Voir les journaux' },
    { key: 'manage_settings',label: 'Accéder aux paramètres' },
    { key: 'manage_sites',   label: 'Gérer les sites' },
  ]},
  { group: 'Rapports', icon: '📊', color: '#65a30d', bg: '#ecfccb', permissions: [
    { key: 'view_stats',    label: 'Voir les statistiques' },
    { key: 'view_reports',  label: 'Voir les rapports' },
    { key: 'export_reports',label: 'Exporter les rapports' },
  ]},
];

export const MATRIX_ROLES = [
  { key: 'ADMIN',        label: 'Administrateur', color: '#7c3aed', bg: '#ede9fe', locked: true },
  { key: 'DIRECTION',    label: 'Direction',       color: '#2563eb', bg: '#dbeafe', locked: false },
  { key: 'SCOLARITE',    label: 'Scolarité',       color: '#0d9488', bg: '#ccfbf1', locked: false },
  { key: 'COMPTABILITE', label: 'Comptabilité',    color: '#d97706', bg: '#fef3c7', locked: false },
  { key: 'ENSEIGNANT',   label: 'Enseignant',      color: '#ea580c', bg: '#fed7aa', locked: false },
  { key: 'ETUDIANT',     label: 'Étudiant',        color: '#059669', bg: '#d1fae5', locked: false },
  { key: 'PARENT',       label: 'Parent',          color: '#db2777', bg: '#fce7f3', locked: false },
];

export function buildDefaultMatrix() {
  const allTrue = {};
  PERMISSION_GROUPS.forEach(g => g.permissions.forEach(p => { allTrue[p.key] = true; }));
  const off = (keys) => { const o = {}; keys.forEach(k => { o[k] = false; }); return o; };
  return {
    ADMIN: { ...allTrue },
    DIRECTION: { ...allTrue, ...off(['delete_student','manage_accounting','delete_payment','manage_users','manage_roles','manage_settings','manage_sites']) },
    SCOLARITE: { ...allTrue, ...off(['delete_student','delete_payment','manage_accounting','manage_users','manage_roles','manage_settings','export_finance']) },
    COMPTABILITE: { ...allTrue, ...off(['delete_student','manage_classes','manage_subjects','manage_schedule','manage_grades','manage_users','manage_roles','manage_settings']) },
    ENSEIGNANT: {
      view_students: true,  create_student: false, edit_student: false,    delete_student: false,
      view_student_docs: true, manage_student_docs: false,
      view_classes: true,   manage_classes: false, view_subjects: true,    manage_subjects: false,
      view_schedule: true,  manage_schedule: false, view_grades: true,     manage_grades: true,
      view_payments: false, create_payment: false, delete_payment: false,  view_accounting: false,
      manage_accounting: false, export_finance: false,
      view_attendance: true, mark_attendance: true, edit_attendance: false, export_attendance: false,
      view_documents: true, upload_document: true,  delete_document: false, manage_archives: false,
      view_elearning: true, create_lesson: true,   manage_elearning: true, view_assignments: true,
      grade_assignments: true,
      manage_users: false, manage_roles: false, view_logs: false, manage_settings: false, manage_sites: false,
      view_stats: true, view_reports: false, export_reports: false,
    },
    ETUDIANT: {
      view_students: false, create_student: false, edit_student: false,   delete_student: false,
      view_student_docs: true, manage_student_docs: false,
      view_classes: true,  manage_classes: false, view_subjects: true,    manage_subjects: false,
      view_schedule: true, manage_schedule: false, view_grades: true,     manage_grades: false,
      view_payments: true, create_payment: false, delete_payment: false,  view_accounting: false,
      manage_accounting: false, export_finance: false,
      view_attendance: true, mark_attendance: false, edit_attendance: false, export_attendance: false,
      view_documents: true, upload_document: false, delete_document: false, manage_archives: false,
      view_elearning: true, create_lesson: false,  manage_elearning: false, view_assignments: true,
      grade_assignments: false,
      manage_users: false, manage_roles: false, view_logs: false, manage_settings: false, manage_sites: false,
      view_stats: false, view_reports: false, export_reports: false,
    },
    PARENT: {
      view_students: false, create_student: false, edit_student: false,   delete_student: false,
      view_student_docs: true, manage_student_docs: false,
      view_classes: true,  manage_classes: false, view_subjects: true,    manage_subjects: false,
      view_schedule: true, manage_schedule: false, view_grades: true,     manage_grades: false,
      view_payments: true, create_payment: false, delete_payment: false,  view_accounting: false,
      manage_accounting: false, export_finance: false,
      view_attendance: true, mark_attendance: false, edit_attendance: false, export_attendance: false,
      view_documents: false, upload_document: false, delete_document: false, manage_archives: false,
      view_elearning: true, create_lesson: false,  manage_elearning: false, view_assignments: true,
      grade_assignments: false,
      manage_users: false, manage_roles: false, view_logs: false, manage_settings: false, manage_sites: false,
      view_stats: false, view_reports: false, export_reports: false,
    },
  };
}

export function loadMatrix() {
  try {
    const saved = localStorage.getItem(MATRIX_LS);
    if (saved) {
      const parsed = JSON.parse(saved);
      const defaults = buildDefaultMatrix();
      Object.keys(defaults).forEach(role => {
        if (!parsed[role]) {
          parsed[role] = defaults[role];
        } else {
          Object.keys(defaults[role]).forEach(k => {
            if (parsed[role][k] === undefined) parsed[role][k] = defaults[role][k];
          });
        }
      });
      return parsed;
    }
  } catch {}
  return buildDefaultMatrix();
}
