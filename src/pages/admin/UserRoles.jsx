import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Shield, Users, Key, Activity, Plus, Edit, Trash2, X, UserX,
  Search, CheckCircle, XCircle, Lock, UserCheck, KeyRound,
  UserPlus, RefreshCw, Globe, AlertTriangle, ChevronDown, ChevronRight
} from 'lucide-react';
import { usersService } from '../../services';
import { academicService, sitesService } from '../../services';
import { useApi } from '../../hooks/useApi';
import { PageHeader, FilterBar, SearchInput, FilterSelect, PrimaryButton, IconBtn, Pagination } from '../../components/ui/PageHeader';
import BackToParametres from '../../components/ui/BackToParametres';
import { useConfirm } from '../../components/ConfirmDialog';
import { MATRIX_LS, PERMISSION_GROUPS, MATRIX_ROLES, buildDefaultMatrix, loadMatrix } from '../../utils/permissionMatrix';

const COLOR    = '#7c3aed';
const COLOR_BG = '#f5f3ff';
const COLOR_IC = '#ede9fe';
const PER_PAGE = 12;
const LOG_PAGE = 20;

const USER_TYPES = {
  ADMIN:   { label: 'Administrateur',    short: 'Admin',  color: '#7c3aed', bg: '#ede9fe' },
  STAFF:   { label: 'Service scolarité', short: 'Staff',  color: '#2563eb', bg: '#dbeafe' },
  TEACHER: { label: 'Enseignant',        short: 'Enseignant', color: '#ea580c', bg: '#fed7aa' },
  STUDENT: { label: 'Étudiant',          short: 'Étudiant',color: '#059669', bg: '#d1fae5' },
  PARENT:  { label: 'Parent',            short: 'Parent', color: '#db2777', bg: '#fce7f3' },
};

const ACTION_CFG = {
  CREATE:     { label: 'Création',     color: '#059669', bg: '#d1fae5' },
  UPDATE:     { label: 'Modification', color: '#2563eb', bg: '#dbeafe' },
  DELETE:     { label: 'Suppression',  color: '#ef4444', bg: '#fee2e2' },
  LOGIN:      { label: 'Connexion',    color: '#7c3aed', bg: '#ede9fe' },
  LOGOUT:     { label: 'Déconnexion',  color: '#64748b', bg: '#f1f5f9' },
  PAYMENT:    { label: 'Paiement',     color: '#d97706', bg: '#fef3c7' },
  ATTENDANCE: { label: 'Présence',     color: '#0d9488', bg: '#ccfbf1' },
  EXPORT:     { label: 'Export',       color: '#6366f1', bg: '#e0e7ff' },
  OTHER:      { label: 'Autre',        color: '#94a3b8', bg: '#f1f5f9' },
};

const MODULE_LABELS = {
  students:   { label: 'Étudiants',    color: '#2563eb', bg: '#dbeafe' },
  academic:   { label: 'Académique',   color: '#7c3aed', bg: '#ede9fe' },
  finance:    { label: 'Finance',      color: '#d97706', bg: '#fef3c7' },
  attendance: { label: 'Présences',    color: '#059669', bg: '#d1fae5' },
  documents:  { label: 'Documents',   color: '#0284c7', bg: '#bae6fd' },
  elearning:  { label: 'E-Learning',  color: '#db2777', bg: '#fce7f3' },
  users:      { label: 'Utilisateurs', color: '#7c3aed', bg: '#ede9fe' },
  reports:    { label: 'Rapports',     color: '#65a30d', bg: '#ecfccb' },
};


// ── Tiny helpers ──────────────────────────────────────────────────────────────
const initials = (fn = '', ln = '') =>
  `${fn[0] || ''}${ln[0] || ''}`.toUpperCase() || '??';

const inp = 'input-field';

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block mb-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#475569' }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function Badge({ label, color, bg }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
          style={{ color, background: bg }}>
      {label}
    </span>
  );
}

// Deactivating immediately blocks that user's web AND mobile API access
// (JWTAuthentication re-checks is_active on every request) — reactivating
// simply lets their next login/refresh through again, no extra step needed.
function ActiveSwitch({ active, onChange, title }) {
  return (
    <button type="button" onClick={onChange} title={title}
      className="relative flex-shrink-0 transition-colors"
      style={{ width: 36, height: 20, borderRadius: 999, background: active ? '#059669' : '#cbd5e1' }}>
      <span className="absolute rounded-full bg-white shadow transition-transform"
        style={{ width: 16, height: 16, top: 2, left: 2, transform: active ? 'translateX(16px)' : 'translateX(0)' }} />
    </button>
  );
}

// ── Modal shell ───────────────────────────────────────────────────────────────
function ModalShell({ open, onClose, title, subtitle, size = 'md', children }) {
  if (!open) return null;
  const w = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-3xl', xl: 'max-w-4xl' };
  return createPortal(
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
         style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)' }}
         onClick={onClose}>
      <div className={`bg-white rounded-2xl w-full ${w[size]} max-h-[90vh] overflow-y-auto`}
           style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.2)' }}
           onClick={e => e.stopPropagation()}>
        <div className="h-1 rounded-t-2xl" style={{ background: `linear-gradient(90deg,${COLOR},#6366f1,#8b5cf6)` }} />
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <h2 className="text-base font-extrabold" style={{ color: '#0f172a' }}>{title}</h2>
            {subtitle && <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-xl flex items-center justify-center transition-all"
                  style={{ color: '#64748b' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}

function FooterBtns({ onCancel, submitLabel, loading, color = COLOR }) {
  return (
    <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid #f1f5f9' }}>
      <button type="button" onClick={onCancel}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:bg-slate-50"
              style={{ color: '#64748b', borderColor: '#e2e8f0' }}>Annuler</button>
      <button type="submit" disabled={loading}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
              style={{ background: `linear-gradient(135deg,${color},${color}cc)`, boxShadow: `0 4px 14px ${color}40` }}>
        {loading ? <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Enregistrement…</span> : submitLabel}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function UserRoles() {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState('matrix');

  // ── Pagination ────────────────────────────────────────────────────────────
  const [pageUsers, setPageUsers]   = useState(1);
  const [pageLog,   setPageLog]     = useState(1);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [searchUsers,  setSearchUsers]  = useState('');
  const [filterType,   setFilterType]   = useState('all');
  const [filterActive, setFilterActive] = useState('all');
  const [searchPerm,   setSearchPerm]   = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterLogDate,setFilterLogDate]= useState('');

  // ── Modals ────────────────────────────────────────────────────────────────
  const [userModal,   setUserModal]   = useState(false);
  const [roleModal,   setRoleModal]   = useState(false);
  const [permModal,   setPermModal]   = useState(false);
  const [assignModal, setAssignModal] = useState(null); // userId
  const [editingUser, setEditingUser] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [saving, setSaving] = useState(false);

  // ── Matrix state ──────────────────────────────────────────────────────────
  const [matrix, setMatrix] = useState(() => loadMatrix());
  const [matrixDirty, setMatrixDirty] = useState(false);
  const [matrixSaving, setMatrixSaving] = useState(false);

  const toggleCell = (roleKey, permKey) => {
    if (roleKey === 'ADMIN') return;
    setMatrix(prev => ({ ...prev, [roleKey]: { ...prev[roleKey], [permKey]: !prev[roleKey]?.[permKey] } }));
    setMatrixDirty(true);
  };
  const toggleAllForRole = (roleKey, value) => {
    if (roleKey === 'ADMIN') return;
    const perms = {};
    PERMISSION_GROUPS.forEach(g => g.permissions.forEach(p => { perms[p.key] = value; }));
    setMatrix(prev => ({ ...prev, [roleKey]: perms }));
    setMatrixDirty(true);
  };
  const toggleGroupForRole = (roleKey, groupPerms, value) => {
    if (roleKey === 'ADMIN') return;
    const updates = {};
    groupPerms.forEach(p => { updates[p.key] = value; });
    setMatrix(prev => ({ ...prev, [roleKey]: { ...prev[roleKey], ...updates } }));
    setMatrixDirty(true);
  };
  const saveMatrix = async () => {
    setMatrixSaving(true);
    try {
      localStorage.setItem(MATRIX_LS, JSON.stringify(matrix));
      setMatrixDirty(false);
    } finally { setMatrixSaving(false); }
  };
  const resetMatrix = () => { setMatrix(buildDefaultMatrix()); setMatrixDirty(true); };

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: usersData,  loading: loadU, execute: refetchUsers }  = useApi(
    () => usersService.getAll({
      search: searchUsers || undefined,
      user_type: filterType   !== 'all' ? filterType   : undefined,
      is_active: filterActive !== 'all' ? filterActive : undefined,
      page_size: 1000,
    }),
    [searchUsers, filterType, filterActive], true
  );
  const { data: rolesData,  loading: loadR, execute: refetchRoles }  = useApi(
    () => usersService.getRoles({ page_size: 500 }), [], true
  );
  const { data: permsData,  loading: loadP, execute: refetchPerms }  = useApi(
    () => usersService.getPermissions({ page_size: 1000 }), [], true
  );
  const { data: logsData,   loading: loadL }  = useApi(
    () => usersService.getAuditLogs({
      action:    filterAction  !== 'all' ? filterAction  : undefined,
      page_size: 500,
    }),
    [filterAction, filterLogDate], activeTab === 'journal'
  );
  const { data: sitesData, execute: refetchSites } = useApi(() => sitesService.getSites(), [], true);

  const usersList = usersData?.results  || usersData  || [];
  const rolesList = rolesData?.results  || rolesData  || [];
  const permsList = permsData?.results  || permsData  || [];
  const logsList  = logsData?.results   || logsData   || [];
  const sitesList = sitesData?.results  || sitesData  || [];

  // Reset page on filter change
  useEffect(() => setPageUsers(1), [searchUsers, filterType, filterActive]);
  useEffect(() => setPageLog(1),   [filterAction, filterLogDate]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredPerms = useMemo(() =>
    permsList.filter(p =>
      !searchPerm ||
      p.name.toLowerCase().includes(searchPerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchPerm.toLowerCase())
    ), [permsList, searchPerm]
  );

  const permsByModule = useMemo(() =>
    filteredPerms.reduce((acc, p) => {
      const m = p.module || 'other';
      if (!acc[m]) acc[m] = [];
      acc[m].push(p);
      return acc;
    }, {}), [filteredPerms]
  );

  const totalPagesUsers = Math.ceil(usersList.length / PER_PAGE);
  const paginatedUsers  = usersList.slice((pageUsers - 1) * PER_PAGE, pageUsers * PER_PAGE);

  const totalPagesLog = Math.ceil(logsList.length / LOG_PAGE);
  const paginatedLog  = logsList.slice((pageLog - 1) * LOG_PAGE, pageLog * LOG_PAGE);

  const kpi = [
    { label: 'Utilisateurs', value: usersList.length,                         color: COLOR,     bg: COLOR_IC, icon: Users },
    { label: 'Actifs',        value: usersList.filter(u => u.is_active).length,color: '#059669', bg: '#d1fae5',icon: CheckCircle },
    { label: 'Rôles',         value: rolesList.length,                         color: '#ea580c', bg: '#fed7aa',icon: Shield },
    { label: 'Permissions',   value: permsList.length,                         color: '#0284c7', bg: '#bae6fd',icon: Key },
  ];

  const tabs = [
    { id: 'matrix',      label: 'Matrice des droits', icon: Shield   },
    { id: 'users',       label: 'Utilisateurs',       icon: Users    },
    { id: 'roles',       label: 'Rôles',              icon: Shield   },
    { id: 'permissions', label: 'Permissions',        icon: Key      },
    { id: 'journal',     label: 'Journal',            icon: Activity },
  ];

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleToggleActive(user) {
    try {
      await usersService.update(user.id, { is_active: !user.is_active });
      refetchUsers();
    } catch { alert('Erreur'); }
  }

  async function handleDeactivateUser(user) {
    // Was previously wired to the same toggle as the Actif/Inactif switch —
    // clicking it on an already-inactive account silently REACTIVATED it
    // instead of doing nothing/confirming a deactivation. This action must
    // always deactivate, never flip based on current state.
    if (!user.is_active) return;
    const ok = await confirm({
      title: 'Désactiver ce compte ?',
      message: `${user.first_name} ${user.last_name} ne pourra plus se connecter tant que le compte reste inactif.`,
      confirmLabel: 'Désactiver',
      destructive: true,
    });
    if (!ok) return;
    try {
      await usersService.update(user.id, { is_active: false });
      refetchUsers();
    } catch { alert('Erreur'); }
  }

  // Permanent deletion — the backend cascades to the linked Student/Teacher/
  // Parent profile and everything under it (enrollments, grades,
  // attendance...) and refuses (400) if the user has any billing history
  // (Invoice.student is on_delete=PROTECT), suggesting deactivation instead.
  async function handleDeleteUser(user) {
    const ok = await confirm({
      title: 'Supprimer définitivement ce compte ?',
      message: `Cette action est irréversible : ${user.first_name} ${user.last_name} et toutes les données liées `
        + `(inscriptions, notes, présences...) seront supprimées. Si des factures existent, la suppression sera refusée — `
        + `désactivez le compte dans ce cas.`,
      confirmLabel: 'Supprimer définitivement',
      destructive: true,
    });
    if (!ok) return;
    try {
      await usersService.delete(user.id);
      refetchUsers();
    } catch (err) {
      alert(err?.response?.data?.detail || err?.message || 'Erreur lors de la suppression');
    }
  }

  // ── Reset password ───────────────────────────────────────────────────────
  const [resetTarget, setResetTarget] = useState(null); // user object
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetDone, setResetDone] = useState(false);

  function closeResetModal() {
    setResetTarget(null);
    setResetPasswordValue('');
    setResetError('');
    setResetDone(false);
  }

  async function handleResetUserPassword(e) {
    e.preventDefault();
    if (!resetTarget || resetPasswordValue.length < 6) return;
    setResetting(true);
    setResetError('');
    try {
      await usersService.resetPassword(resetTarget.id, resetPasswordValue);
      setResetDone(true);
    } catch (err) {
      setResetError(err?.response?.data?.detail || 'Erreur lors de la réinitialisation');
    } finally {
      setResetting(false);
    }
  }

  async function handleDeleteRole(role) {
    if (role.is_system) { alert('Impossible de supprimer un rôle système'); return; }
    const ok = await confirm({
      title: 'Supprimer ce rôle ?',
      message: `Le rôle "${role.name}" sera supprimé — les utilisateurs qui l'avaient ne l'auront plus.`,
      confirmLabel: 'Supprimer',
      destructive: true,
    });
    if (!ok) return;
    try { await usersService.deleteRole(role.id); refetchRoles(); } catch { alert('Erreur'); }
  }

  // ── User Form ─────────────────────────────────────────────────────────────
  const emptyUser = { email: '', password: '', password_confirm: '', first_name: '', last_name: '', phone: '', user_type: 'STUDENT', site: '', is_active: true, role_id: '' };
  const [userForm, setUserForm] = useState(emptyUser);
  const setUF = (k, v) => setUserForm(p => ({ ...p, [k]: v }));

  function openCreateUser() { setEditingUser(null); setUserForm(emptyUser); refetchRoles(); refetchSites(); setUserModal(true); }
  function openEditUser(u) {
    setEditingUser(u);
    setUserForm({ email: u.email, password: '', password_confirm: '', first_name: u.first_name, last_name: u.last_name, phone: u.phone || '', user_type: u.user_type, site: u.site || '', is_active: u.is_active, role_id: u.roles?.[0]?.role || '' });
    refetchRoles(); refetchSites();
    setUserModal(true);
  }

  async function handleUserSubmit(e) {
    e.preventDefault(); setSaving(true);
    try {
      const { role_id, ...payload } = userForm;
      if (editingUser) {
        delete payload.password; delete payload.password_confirm;
        if (!payload.site) delete payload.site;
        await usersService.update(editingUser.id, payload);
        if (role_id) await usersService.assignRole(editingUser.id, role_id).catch(() => {});
      } else {
        if (!payload.site) delete payload.site;
        const newUser = await usersService.create(payload);
        if (role_id && newUser?.id) await usersService.assignRole(newUser.id, role_id).catch(() => {});
      }
      setUserModal(false); refetchUsers();
    } catch (err) {
      const data = err?.response?.data || {};
      alert(Object.values(data).flat().join('\n') || 'Erreur lors de l\'enregistrement');
    } finally { setSaving(false); }
  }

  // ── Role Form ─────────────────────────────────────────────────────────────
  const emptyRole = { name: '', code: '', description: '', permission_ids: [] };
  const [roleForm, setRoleForm] = useState(emptyRole);
  const setRF = (k, v) => setRoleForm(p => ({ ...p, [k]: v }));
  const togglePerm = (id) => setRoleForm(p => ({
    ...p,
    permission_ids: p.permission_ids.includes(id)
      ? p.permission_ids.filter(x => x !== id)
      : [...p.permission_ids, id],
  }));

  function openCreateRole() { setEditingRole(null); setRoleForm(emptyRole); setRoleModal(true); }
  async function openEditRole(role) {
    const full = await usersService.getRoleById(role.id);
    setEditingRole(full);
    setRoleForm({ name: full.name, code: full.code, description: full.description || '', permission_ids: (full.permissions || []).map(p => p.id) });
    setRoleModal(true);
  }

  async function handleRoleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try {
      if (editingRole) await usersService.updateRole(editingRole.id, roleForm);
      else             await usersService.createRole(roleForm);
      setRoleModal(false); refetchRoles();
    } catch { alert('Erreur'); } finally { setSaving(false); }
  }

  // ── Permission Form ───────────────────────────────────────────────────────
  const emptyPerm = { code: '', name: '', description: '', module: '' };
  const [permForm, setPermForm] = useState(emptyPerm);
  const setPF = (k, v) => setPermForm(p => ({ ...p, [k]: v }));

  async function handlePermSubmit(e) {
    e.preventDefault(); setSaving(true);
    try {
      await usersService.createPermission(permForm);
      setPermModal(false); setPermForm(emptyPerm); refetchPerms();
    } catch { alert('Erreur'); } finally { setSaving(false); }
  }

  // ── Assign Role ───────────────────────────────────────────────────────────
  const [assignRoleId, setAssignRoleId] = useState('');
  const [assignSiteId, setAssignSiteId] = useState('');
  async function handleAssignRole(e) {
    e.preventDefault(); setSaving(true);
    try {
      await usersService.assignRole(assignModal, assignRoleId, assignSiteId || undefined);
      setAssignModal(null); setAssignRoleId(''); setAssignSiteId('');
      refetchUsers();
    } catch { alert('Erreur'); } finally { setSaving(false); }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in space-y-6">
      <BackToParametres />
      {/* Header */}
      <PageHeader icon={Shield} iconColor={COLOR} iconBg={COLOR_IC}
        title="Utilisateurs & Rôles"
        subtitle="Gestion complète des accès, permissions et journaux d'activité"
        action={
          <div className="flex items-center gap-2">
            <button onClick={openCreateRole}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:bg-slate-50"
                    style={{ color: COLOR, borderColor: COLOR_IC }}>
              <Shield className="h-4 w-4" /> Nouveau Rôle
            </button>
            <PrimaryButton icon={UserPlus} label="Nouvel Utilisateur" color={COLOR} onClick={openCreateUser} />
          </div>
        }
      />

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpi.map((k, i) => (
          <div key={i} className="card p-4 flex items-center gap-4 overflow-hidden relative">
            <div className="absolute -right-3 -top-3 h-14 w-14 rounded-full opacity-[0.07] blur-lg" style={{ background: k.color }} />
            <div className="h-11 w-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                 style={{ background: `linear-gradient(135deg,${k.bg},${k.color}22)`, boxShadow: `0 4px 14px ${k.color}20` }}>
              <k.icon className="h-5 w-5" style={{ color: k.color }} />
            </div>
            <div>
              <p className="kpi-number" style={{ fontSize: '1.4rem' }}>{k.value}</p>
              <p className="kpi-label">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tab card */}
      <div className="card overflow-hidden">
        {/* Tab bar */}
        <div className="flex overflow-x-auto" style={{ borderBottom: '1.5px solid #f0f4f9', background: 'linear-gradient(135deg,#fafbff,#fff)' }}>
          {tabs.map(t => {
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                      className="flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0"
                      style={{
                        borderBottom: active ? `2px solid ${COLOR}` : '2px solid transparent',
                        color: active ? COLOR : '#94a3b8',
                        background: active ? `linear-gradient(180deg,${COLOR_BG}80,transparent)` : 'transparent',
                      }}>
                <t.icon className="h-4 w-4" style={{ opacity: active ? 1 : 0.5 }} />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* ── TAB: MATRIX ─────────────────────────────────────────────── */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              {/* Info banner */}
              <div className="flex items-start gap-3 px-5 py-3 rounded-2xl"
                   style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#2563eb' }} />
                <p className="text-sm" style={{ color: '#1d4ed8' }}>
                  Cochez les cases pour accorder un droit à un rôle. Le rôle <strong>Administrateur</strong> possède tous les droits et ne peut pas être modifié.
                  Les modifications sont sauvegardées localement.
                </p>
                {matrixDirty && (
                  <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                    <button onClick={resetMatrix}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors hover:bg-white"
                            style={{ color: '#64748b', borderColor: '#e2e8f0' }}>
                      <RefreshCw className="h-3 w-3" /> Réinitialiser
                    </button>
                    <button onClick={saveMatrix} disabled={matrixSaving}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
                            style={{ background: `linear-gradient(135deg,${COLOR},#6366f1)`, boxShadow: `0 4px 14px ${COLOR}40` }}>
                      {matrixSaving
                        ? <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        : <CheckCircle className="h-3 w-3" />}
                      Enregistrer
                    </button>
                  </div>
                )}
              </div>

              {/* Matrix table */}
              <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #f0f4f9' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg,#fafbff,#f8fafc)', borderBottom: '1px solid #f0f4f9' }}>
                        <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider sticky left-0 z-10 bg-slate-50 min-w-[220px]"
                            style={{ color: '#94a3b8', borderRight: '1px solid #f0f4f9' }}>
                          Module / Fonctionnalité
                        </th>
                        {MATRIX_ROLES.map(role => (
                          <th key={role.key} className="px-3 py-3 text-center min-w-[110px]">
                            <div className="flex flex-col items-center gap-1.5">
                              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                                    style={{ background: role.bg, color: role.color }}>
                                {role.label}
                              </span>
                              {!role.locked && (
                                <div className="flex gap-1">
                                  <button onClick={() => toggleAllForRole(role.key, true)}
                                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-lg transition-colors"
                                          style={{ color: '#059669' }}
                                          onMouseEnter={e => e.currentTarget.style.background = '#d1fae5'}
                                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    ✓ tout
                                  </button>
                                  <button onClick={() => toggleAllForRole(role.key, false)}
                                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-lg transition-colors"
                                          style={{ color: '#ef4444' }}
                                          onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    ✗ tout
                                  </button>
                                </div>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PERMISSION_GROUPS.map(grp => (
                        <React.Fragment key={grp.group}>
                          {/* Group header row */}
                          <tr style={{ borderBottom: '1px solid #f0f4f9' }}>
                            <td colSpan={MATRIX_ROLES.length + 1} className="px-5 py-2 sticky left-0 z-10"
                                style={{ background: grp.bg + '30' }}>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-base">{grp.icon}</span>
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg"
                                      style={{ background: grp.bg, color: grp.color }}>
                                  {grp.group}
                                </span>
                                <div className="ml-auto flex items-center gap-1.5 flex-wrap">
                                  {MATRIX_ROLES.filter(r => !r.locked).map(role => {
                                    const allOn = grp.permissions.every(p => matrix[role.key]?.[p.key]);
                                    return (
                                      <button key={role.key}
                                              onClick={() => toggleGroupForRole(role.key, grp.permissions, !allOn)}
                                              className="text-[10px] font-semibold px-2 py-0.5 rounded-lg border transition-colors"
                                              style={{
                                                background: allOn ? role.bg : 'transparent',
                                                color: allOn ? role.color : '#94a3b8',
                                                borderColor: allOn ? role.bg : '#e2e8f0',
                                              }}>
                                        {allOn ? '−' : '+'} {role.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                          {/* Permission rows */}
                          {grp.permissions.map((perm, pIdx) => (
                            <tr key={perm.key}
                                style={{ borderBottom: '1px solid #f8fafc', background: pIdx % 2 !== 0 ? '#fafbff' : 'transparent' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff30'}
                                onMouseLeave={e => e.currentTarget.style.background = pIdx % 2 !== 0 ? '#fafbff' : 'transparent'}>
                              <td className="px-5 py-2.5 pl-12 text-xs sticky left-0"
                                  style={{ color: '#475569', background: 'inherit', borderRight: '1px solid #f0f4f9' }}>
                                {perm.label}
                              </td>
                              {MATRIX_ROLES.map(role => {
                                const checked = !!matrix[role.key]?.[perm.key];
                                return (
                                  <td key={role.key} className="px-3 py-2.5 text-center">
                                    <button
                                      onClick={() => !role.locked && toggleCell(role.key, perm.key)}
                                      disabled={role.locked}
                                      title={role.locked ? 'Non modifiable' : checked ? 'Retirer ce droit' : 'Accorder ce droit'}
                                      className="h-6 w-6 rounded-lg flex items-center justify-center mx-auto transition-all"
                                      style={{
                                        background: checked ? '#dcfce7' : '#f1f5f9',
                                        color: checked ? '#16a34a' : '#cbd5e1',
                                        border: `1px solid ${checked ? '#bbf7d0' : '#e2e8f0'}`,
                                        cursor: role.locked ? 'not-allowed' : 'pointer',
                                      }}
                                      onMouseEnter={e => {
                                        if (!role.locked) {
                                          e.currentTarget.style.background = checked ? '#bbf7d0' : '#e2e8f0';
                                        }
                                      }}
                                      onMouseLeave={e => {
                                        if (!role.locked) {
                                          e.currentTarget.style.background = checked ? '#dcfce7' : '#f1f5f9';
                                        }
                                      }}>
                                      {checked
                                        ? <CheckCircle className="h-3.5 w-3.5" />
                                        : <XCircle className="h-3 w-3" />}
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {matrixDirty && (
                  <div className="px-5 py-3 flex items-center justify-between flex-wrap gap-3"
                       style={{ background: '#fffbeb', borderTop: '1px solid #fde68a' }}>
                    <p className="text-sm font-semibold" style={{ color: '#92400e' }}>
                      Modifications non enregistrées
                    </p>
                    <div className="flex gap-2">
                      <button onClick={resetMatrix}
                              className="px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors hover:bg-amber-100"
                              style={{ color: '#92400e', borderColor: '#fde68a' }}>
                        Réinitialiser
                      </button>
                      <button onClick={saveMatrix} disabled={matrixSaving}
                              className="px-4 py-1.5 text-xs font-semibold rounded-xl text-white flex items-center gap-1.5 disabled:opacity-50"
                              style={{ background: '#d97706' }}>
                        {matrixSaving
                          ? <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          : <CheckCircle className="h-3 w-3" />}
                        Enregistrer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: USERS ──────────────────────────────────────────────── */}
          {activeTab === 'users' && (
            <div className="space-y-5">
              <FilterBar>
                <SearchInput value={searchUsers} onChange={e => setSearchUsers(e.target.value)} placeholder="Rechercher un utilisateur…" />
                <FilterSelect value={filterType} onChange={e => setFilterType(e.target.value)}>
                  <option value="all">Tous les types</option>
                  {Object.entries(USER_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </FilterSelect>
                <FilterSelect value={filterActive} onChange={e => setFilterActive(e.target.value)}>
                  <option value="all">Tous les statuts</option>
                  <option value="true">Actif</option>
                  <option value="false">Inactif</option>
                </FilterSelect>
              </FilterBar>

              {loadU ? (
                <Spinner color={COLOR} />
              ) : usersList.length === 0 ? (
                <Empty icon={Users} text="Aucun utilisateur trouvé" />
              ) : (
                <>
                  <div className="overflow-x-auto rounded-2xl" style={{ border: '1.5px solid #f0f4f9' }}>
                    <table className="w-full">
                      <thead>
                        <tr style={{ background: 'linear-gradient(135deg,#fafbff,#f8fafc)', borderBottom: '1px solid #f0f4f9' }}>
                          {['Utilisateur', 'Type', 'Rôles', 'Site', 'Statut', 'Actions'].map((h, i) => (
                            <th key={i} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedUsers.map(user => {
                          const ut = USER_TYPES[user.user_type] || USER_TYPES.STUDENT;
                          return (
                            <tr key={user.id} style={{ borderBottom: '1px solid #f8fafc' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#fafafe'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                       style={{ background: `linear-gradient(135deg,${ut.color},${ut.color}99)` }}>
                                    {initials(user.first_name, user.last_name)}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold" style={{ color: '#0f172a' }}>{user.first_name} {user.last_name}</p>
                                    <p className="text-xs" style={{ color: '#94a3b8' }}>{user.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Badge label={ut.short} color={ut.color} bg={ut.bg} />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {(user.roles || []).slice(0, 2).map(r => (
                                    <span key={r.id} className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
                                          style={{ background: COLOR_IC, color: COLOR }}>{r.role_name}</span>
                                  ))}
                                  {(user.roles || []).length > 2 && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ background: '#f1f5f9', color: '#64748b' }}>+{user.roles.length - 2}</span>
                                  )}
                                  {!(user.roles || []).length && <span className="text-xs" style={{ color: '#cbd5e1' }}>—</span>}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-xs font-medium" style={{ color: '#64748b' }}>{user.site_name || '—'}</span>
                              </td>
                              <td className="px-4 py-3">
                                {user.is_active ? (
                                  <Badge label="Actif" color="#059669" bg="#d1fae5" />
                                ) : (
                                  <Badge label="Inactif" color="#ef4444" bg="#fee2e2" />
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <ActiveSwitch active={user.is_active} onChange={() => handleToggleActive(user)}
                                    title={user.is_active ? 'Désactiver (bloque l\'accès web et mobile immédiatement)' : 'Activer'} />
                                  <IconBtn onClick={() => openEditUser(user)} icon={Edit} color="#2563eb" hoverBg="#dbeafe" title="Modifier" />
                                  <IconBtn onClick={() => { setAssignModal(user.id); setAssignRoleId(''); setAssignSiteId(''); }}
                                           icon={UserCheck} color={COLOR} hoverBg={COLOR_IC} title="Assigner un rôle" />
                                  <IconBtn onClick={() => { setResetTarget(user); setResetPasswordValue(''); setResetError(''); setResetDone(false); }}
                                           icon={KeyRound} color="#d97706" hoverBg="#fef3c7" title="Réinitialiser le mot de passe" />
                                  <IconBtn onClick={() => handleDeactivateUser(user)} icon={UserX} color="#ef4444" hoverBg="#fee2e2" title="Désactiver le compte" />
                                  <IconBtn onClick={() => handleDeleteUser(user)} icon={Trash2} color="#991b1b" hoverBg="#fee2e2" title="Supprimer définitivement" />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <Pagination currentPage={pageUsers} totalPages={totalPagesUsers} onPageChange={setPageUsers}
                    accentColor={COLOR} totalItems={usersList.length} itemsPerPage={PER_PAGE} />
                </>
              )}
            </div>
          )}

          {/* ── TAB: ROLES ──────────────────────────────────────────────── */}
          {activeTab === 'roles' && (
            loadR ? <Spinner color="#ea580c" /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {/* Create card */}
                <button onClick={openCreateRole}
                        className="card card-interactive flex flex-col items-center justify-center py-12 gap-3 border-2 border-dashed"
                        style={{ borderColor: '#e2e8f0' }}>
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ background: COLOR_IC }}>
                    <Plus className="h-6 w-6" style={{ color: COLOR }} />
                  </div>
                  <p className="text-sm font-bold" style={{ color: '#64748b' }}>Créer un rôle</p>
                </button>

                {rolesList.map(role => {
                  const pCount = role.permissions?.length || 0;
                  return (
                    <div key={role.id} className="card card-interactive overflow-hidden">
                      <div className="h-1.5" style={{ background: role.is_system ? `linear-gradient(90deg,#ea580c,#f59e0b)` : `linear-gradient(90deg,${COLOR},#6366f1)` }} />
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="h-11 w-11 rounded-2xl flex items-center justify-center"
                               style={{ background: role.is_system ? '#fff7ed' : COLOR_IC }}>
                            <Shield className="h-5 w-5" style={{ color: role.is_system ? '#ea580c' : COLOR }} />
                          </div>
                          <div className="flex items-center gap-1.5">
                            {role.is_system ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#fff7ed', color: '#ea580c' }}>
                                <Lock className="h-2.5 w-2.5" /> Système
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: COLOR_IC, color: COLOR }}>Personnalisé</span>
                            )}
                          </div>
                        </div>
                        <h3 className="text-sm font-extrabold mb-1" style={{ color: '#0f172a' }}>{role.name}</h3>
                        <p className="font-mono text-[11px] mb-3" style={{ color: '#94a3b8' }}>{role.code}</p>
                        {role.description && <p className="text-xs mb-3 line-clamp-2" style={{ color: '#64748b' }}>{role.description}</p>}
                        <div className="flex items-center justify-between text-xs pt-3" style={{ borderTop: '1px solid #f1f5f9' }}>
                          <span className="font-semibold" style={{ color: '#64748b' }}>
                            {pCount} permission{pCount !== 1 ? 's' : ''}
                          </span>
                          <div className="flex items-center gap-1">
                            <IconBtn onClick={() => openEditRole(role)} icon={Edit} color="#2563eb" hoverBg="#dbeafe" title="Modifier" />
                            {!role.is_system && <IconBtn onClick={() => handleDeleteRole(role)} icon={Trash2} color="#ef4444" hoverBg="#fee2e2" title="Supprimer" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* ── TAB: PERMISSIONS ────────────────────────────────────────── */}
          {activeTab === 'permissions' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#94a3b8' }} />
                  <input type="text" placeholder="Rechercher une permission…" value={searchPerm}
                         onChange={e => setSearchPerm(e.target.value)}
                         className={inp} style={{ paddingLeft: '2.25rem' }} />
                </div>
                <button onClick={() => setPermModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                        style={{ background: `linear-gradient(135deg,${COLOR},${COLOR}cc)`, boxShadow: `0 4px 14px ${COLOR}40` }}>
                  <Plus className="h-4 w-4" /> Nouvelle permission
                </button>
              </div>

              {loadP ? <Spinner color="#0284c7" /> : (
                Object.keys(permsByModule).length === 0 ? (
                  <Empty icon={Key} text="Aucune permission trouvée" />
                ) : (
                  Object.entries(permsByModule).map(([module, perms]) => {
                    const ml = MODULE_LABELS[module] || { label: module, color: '#64748b', bg: '#f1f5f9' };
                    return (
                      <ModulePermissionsGroup key={module} module={ml} perms={perms}
                        onRefetch={refetchPerms} />
                    );
                  })
                )
              )}
            </div>
          )}

          {/* ── TAB: JOURNAL ────────────────────────────────────────────── */}
          {activeTab === 'journal' && (
            <div className="space-y-5">
              <FilterBar>
                <FilterSelect value={filterAction} onChange={e => setFilterAction(e.target.value)}>
                  <option value="all">Toutes les actions</option>
                  {Object.entries(ACTION_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </FilterSelect>
                <div className="relative">
                  <input type="date" value={filterLogDate} onChange={e => setFilterLogDate(e.target.value)}
                         className={inp} style={{ width: 160 }} />
                  {filterLogDate && (
                    <button onClick={() => setFilterLogDate('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded flex items-center justify-center text-sm font-bold"
                            style={{ color: '#94a3b8' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>×</button>
                  )}
                </div>
                <button onClick={() => { setFilterAction('all'); setFilterLogDate(''); }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors hover:bg-slate-50"
                        style={{ color: '#64748b', borderColor: '#e2e8f0' }}>
                  <RefreshCw className="h-3.5 w-3.5" /> Réinitialiser
                </button>
              </FilterBar>

              {loadL ? <Spinner color="#6366f1" /> : logsList.length === 0 ? (
                <Empty icon={Activity} text="Aucune activité enregistrée" />
              ) : (
                <>
                  <div className="overflow-x-auto rounded-2xl" style={{ border: '1.5px solid #f0f4f9' }}>
                    <table className="w-full">
                      <thead>
                        <tr style={{ background: 'linear-gradient(135deg,#fafbff,#f8fafc)', borderBottom: '1px solid #f0f4f9' }}>
                          {['Date & Heure', 'Utilisateur', 'Action', 'Objet', 'Modèle', 'IP'].map((h, i) => (
                            <th key={i} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedLog.map(log => {
                          const ac = ACTION_CFG[log.action] || ACTION_CFG.OTHER;
                          const ts = new Date(log.timestamp);
                          return (
                            <tr key={log.id} style={{ borderBottom: '1px solid #f8fafc' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#fafafe'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <td className="px-4 py-3">
                                <div>
                                  <p className="text-xs font-semibold" style={{ color: '#1e293b' }}>{ts.toLocaleDateString('fr-FR')}</p>
                                  <p className="text-[11px]" style={{ color: '#94a3b8' }}>{ts.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-xs font-semibold" style={{ color: '#1e293b' }}>{log.user_email || '—'}</p>
                              </td>
                              <td className="px-4 py-3">
                                <Badge label={ac.label} color={ac.color} bg={ac.bg} />
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-xs font-medium max-w-[200px] truncate" style={{ color: '#475569' }}>{log.object_repr || '—'}</p>
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-mono text-[11px] px-2 py-0.5 rounded-lg" style={{ background: '#f1f5f9', color: '#64748b' }}>{log.model_name || '—'}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-mono text-[11px]" style={{ color: '#94a3b8' }}>{log.ip_address || '—'}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <Pagination currentPage={pageLog} totalPages={totalPagesLog} onPageChange={setPageLog}
                    accentColor="#6366f1" totalItems={logsList.length} itemsPerPage={LOG_PAGE} />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL: Create/Edit User ──────────────────────────────────────── */}
      <ModalShell open={userModal} onClose={() => setUserModal(false)} size="md"
        title={editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
        subtitle={editingUser ? `${editingUser.email}` : 'Créer un nouveau compte'}>
        <form onSubmit={handleUserSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Prénom" required><input className={inp} required value={userForm.first_name} onChange={e => setUF('first_name', e.target.value)} placeholder="Jean" /></Field>
            <Field label="Nom" required><input className={inp} required value={userForm.last_name} onChange={e => setUF('last_name', e.target.value)} placeholder="Dupont" /></Field>
          </div>
          <Field label="Email" required><input type="email" className={inp} required value={userForm.email} onChange={e => setUF('email', e.target.value)} placeholder="jean.dupont@campus.fr" /></Field>
          {!editingUser && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Mot de passe" required><input type="password" className={inp} required value={userForm.password} onChange={e => setUF('password', e.target.value)} placeholder="8 caractères min." /></Field>
              <Field label="Confirmer" required><input type="password" className={inp} required value={userForm.password_confirm} onChange={e => setUF('password_confirm', e.target.value)} placeholder="Même mot de passe" /></Field>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Téléphone"><input className={inp} value={userForm.phone} onChange={e => setUF('phone', e.target.value)} placeholder="+237 6XX XXX XXX" /></Field>
            <Field label="Type de compte" required>
              <select className={`${inp} cursor-pointer`} required value={userForm.user_type} onChange={e => setUF('user_type', e.target.value)}>
                {Object.entries(USER_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Site">
              <select className={`${inp} cursor-pointer`} value={userForm.site} onChange={e => setUF('site', e.target.value)}>
                <option value="">Aucun site</option>
                {sitesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Statut">
              <select className={`${inp} cursor-pointer`} value={userForm.is_active ? 'true' : 'false'} onChange={e => setUF('is_active', e.target.value === 'true')}>
                <option value="true">Actif</option>
                <option value="false">Inactif</option>
              </select>
            </Field>
          </div>
          <Field label="Rôle">
            <select className={`${inp} cursor-pointer`} value={userForm.role_id} onChange={e => setUF('role_id', e.target.value)}>
              <option value="">{loadR ? 'Chargement…' : 'Aucun rôle'}</option>
              {rolesList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            {!loadR && rolesList.length === 0 && (
              <button type="button" onClick={refetchRoles}
                className="mt-1 text-[11px] font-semibold flex items-center gap-1"
                style={{ color: COLOR }}>
                <RefreshCw className="h-3 w-3" /> Recharger les rôles
              </button>
            )}
          </Field>
          <FooterBtns onCancel={() => setUserModal(false)} submitLabel={editingUser ? 'Mettre à jour' : 'Créer le compte'} loading={saving} />
        </form>
      </ModalShell>

      {/* ── MODAL: Create/Edit Role ──────────────────────────────────────── */}
      <ModalShell open={roleModal} onClose={() => setRoleModal(false)} size="lg"
        title={editingRole ? `Modifier : ${editingRole.name}` : 'Nouveau rôle'}
        subtitle="Définissez le rôle et assignez des permissions">
        <form onSubmit={handleRoleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nom du rôle" required><input className={inp} required value={roleForm.name} onChange={e => setRF('name', e.target.value)} placeholder="Ex: Direction académique" /></Field>
            <Field label="Code" required>
              <input className={inp} required value={roleForm.code} onChange={e => setRF('code', e.target.value.toUpperCase().replace(/\s/g, '_'))} placeholder="Ex: ACADEMIC_DIRECTOR" />
            </Field>
          </div>
          <Field label="Description">
            <textarea className={`${inp} resize-none`} rows={2} value={roleForm.description} onChange={e => setRF('description', e.target.value)} placeholder="Description du rôle…" />
          </Field>

          {/* Permissions by module */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#475569' }}>
              Permissions <span className="font-normal normal-case" style={{ color: '#94a3b8' }}>— {roleForm.permission_ids.length} sélectionnée{roleForm.permission_ids.length !== 1 ? 's' : ''}</span>
            </p>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {Object.entries(permsByModule).map(([module, perms]) => {
                const ml = MODULE_LABELS[module] || { label: module, color: '#64748b', bg: '#f1f5f9' };
                const allSelected = perms.every(p => roleForm.permission_ids.includes(p.id));
                return (
                  <div key={module} className="rounded-xl overflow-hidden" style={{ border: '1.5px solid #f0f4f9' }}>
                    <div className="flex items-center justify-between px-4 py-2.5"
                         style={{ background: ml.bg + '60', borderBottom: '1px solid #f0f4f9' }}>
                      <span className="text-xs font-bold" style={{ color: ml.color }}>{ml.label}</span>
                      <button type="button" onClick={() => {
                        const ids = perms.map(p => p.id);
                        setRoleForm(prev => ({
                          ...prev,
                          permission_ids: allSelected
                            ? prev.permission_ids.filter(id => !ids.includes(id))
                            : [...new Set([...prev.permission_ids, ...ids])]
                        }));
                      }} className="text-[10px] font-bold px-2 py-0.5 rounded-lg transition-colors"
                         style={{ background: ml.bg, color: ml.color }}>
                        {allSelected ? 'Tout décocher' : 'Tout cocher'}
                      </button>
                    </div>
                    <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {perms.map(p => (
                        <label key={p.id} className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg transition-colors hover:bg-slate-50">
                          <input type="checkbox" checked={roleForm.permission_ids.includes(p.id)}
                                 onChange={() => togglePerm(p.id)}
                                 className="mt-0.5 flex-shrink-0 accent-purple-600" />
                          <div>
                            <p className="text-xs font-semibold" style={{ color: '#1e293b' }}>{p.name}</p>
                            <p className="font-mono text-[10px]" style={{ color: '#94a3b8' }}>{p.code}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              {permsList.length === 0 && (
                <div className="text-center py-6 text-sm" style={{ color: '#94a3b8' }}>Aucune permission disponible</div>
              )}
            </div>
          </div>
          <FooterBtns onCancel={() => setRoleModal(false)} submitLabel={editingRole ? 'Mettre à jour' : 'Créer le rôle'} loading={saving} />
        </form>
      </ModalShell>

      {/* ── MODAL: Assign Role ───────────────────────────────────────────── */}
      <ModalShell open={!!assignModal} onClose={() => setAssignModal(null)} size="sm"
        title="Assigner un rôle" subtitle="Attribuer un rôle à cet utilisateur">
        <form onSubmit={handleAssignRole} className="space-y-4">
          <Field label="Rôle" required>
            <select className={`${inp} cursor-pointer`} required value={assignRoleId} onChange={e => setAssignRoleId(e.target.value)}>
              <option value="">Sélectionner un rôle…</option>
              {rolesList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <Field label="Site (optionnel)">
            <select className={`${inp} cursor-pointer`} value={assignSiteId} onChange={e => setAssignSiteId(e.target.value)}>
              <option value="">Tous les sites</option>
              {sitesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <FooterBtns onCancel={() => setAssignModal(null)} submitLabel="Assigner" loading={saving} />
        </form>
      </ModalShell>

      {/* ── MODAL: Reset password ────────────────────────────────────────── */}
      <ModalShell open={!!resetTarget} onClose={closeResetModal} size="sm"
        title={resetDone ? 'Mot de passe réinitialisé' : 'Réinitialiser le mot de passe'}
        subtitle={resetTarget ? `${resetTarget.first_name} ${resetTarget.last_name} (${resetTarget.email})` : ''}>
        {resetDone ? (
          <div className="flex flex-col items-center text-center py-4 gap-3">
            <div className="h-14 w-14 rounded-full flex items-center justify-center" style={{ background: '#d1fae5' }}>
              <CheckCircle className="h-7 w-7" style={{ color: '#059669' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>
              Le mot de passe de {resetTarget?.first_name} {resetTarget?.last_name} a été réinitialisé avec succès.
            </p>
            <button onClick={closeResetModal}
              className="mt-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg,#059669,#047857)', boxShadow: '0 4px 14px rgba(5,150,105,0.3)' }}>
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleResetUserPassword} className="space-y-4">
            <Field label="Nouveau mot de passe" required>
              <input type="text" className={`${inp} font-mono`} placeholder="Min. 6 caractères"
                value={resetPasswordValue} onChange={e => setResetPasswordValue(e.target.value)}
                minLength={6} required />
            </Field>
            {resetError && (
              <div className="px-3 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2"
                style={{ background: '#fee2e2', color: '#dc2626' }}>
                <XCircle className="h-4 w-4 flex-shrink-0" />
                {resetError}
              </div>
            )}
            <FooterBtns onCancel={closeResetModal} submitLabel={resetting ? 'En cours…' : 'Réinitialiser'} loading={resetting} color="#d97706" />
          </form>
        )}
      </ModalShell>

      {/* ── MODAL: Create Permission ─────────────────────────────────────── */}
      <ModalShell open={permModal} onClose={() => setPermModal(false)} size="sm"
        title="Nouvelle permission" subtitle="Créer une permission personnalisée">
        <form onSubmit={handlePermSubmit} className="space-y-4">
          <Field label="Code" required>
            <input className={inp} required value={permForm.code}
                   onChange={e => setPF('code', e.target.value.toLowerCase().replace(/\s/g, '_'))}
                   placeholder="Ex: view_reports" />
          </Field>
          <Field label="Nom" required>
            <input className={inp} required value={permForm.name} onChange={e => setPF('name', e.target.value)} placeholder="Ex: Voir les rapports" />
          </Field>
          <Field label="Module" required>
            <select className={`${inp} cursor-pointer`} required value={permForm.module} onChange={e => setPF('module', e.target.value)}>
              <option value="">Sélectionner un module…</option>
              {Object.entries(MODULE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
          <Field label="Description">
            <textarea className={`${inp} resize-none`} rows={2} value={permForm.description} onChange={e => setPF('description', e.target.value)} />
          </Field>
          <FooterBtns onCancel={() => setPermModal(false)} submitLabel="Créer" loading={saving} />
        </form>
      </ModalShell>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ModulePermissionsGroup({ module, perms, onRefetch }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #f0f4f9' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
              className="w-full flex items-center justify-between px-5 py-3 transition-colors hover:bg-slate-50"
              style={{ background: module.bg + '40', borderBottom: open ? '1px solid #f0f4f9' : 'none' }}>
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: module.color }} />
          <span className="text-sm font-bold" style={{ color: module.color }}>{module.label}</span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: module.bg, color: module.color }}>
            {perms.length}
          </span>
        </div>
        {open ? <ChevronDown className="h-4 w-4" style={{ color: '#94a3b8' }} /> : <ChevronRight className="h-4 w-4" style={{ color: '#94a3b8' }} />}
      </button>
      {open && (
        <div className="divide-y" style={{ '--tw-divide-color': '#f8fafc' }}>
          {perms.map(p => (
            <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-0.5">
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-lg font-bold" style={{ background: '#f1f5f9', color: '#64748b' }}>{p.code}</span>
                  <span className="text-sm font-semibold" style={{ color: '#0f172a' }}>{p.name}</span>
                </div>
                {p.description && <p className="text-xs" style={{ color: '#94a3b8' }}>{p.description}</p>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                <span className={`h-2 w-2 rounded-full ${p.is_active ? 'bg-emerald-400' : 'bg-slate-300'}`} title={p.is_active ? 'Actif' : 'Inactif'} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Spinner({ color }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 rounded-full border-[3px] animate-spin"
           style={{ borderColor: `${color}30`, borderTopColor: color }} />
    </div>
  );
}

function Empty({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Icon className="h-12 w-12 mb-4 opacity-20" style={{ color: '#64748b' }} />
      <p className="text-sm" style={{ color: '#94a3b8' }}>{text}</p>
    </div>
  );
}
