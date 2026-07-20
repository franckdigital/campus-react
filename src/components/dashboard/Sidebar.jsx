import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen,
  ClipboardCheck, Wallet, FileText, MessageSquare,
  Settings, X, LogOut,
  BarChart3, Layers, BookCopy, PieChart,
  CalendarDays, Star, BookMarked, TrendingDown,
  Landmark, Archive, History, Bell, Briefcase, Bot,
} from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';

const navGroups = [
  {
    label: 'Général',
    items: [
      { name: 'Dashboard', href: '/admin', icon: LayoutDashboard,
        color: '#6366f1', bg: '#eef2ff', iconBg: '#e0e7ff' },
      { name: 'Statistiques', href: '/admin/statistics', icon: PieChart,
        color: '#0891b2', bg: '#ecfeff', iconBg: '#cffafe' },
    ]
  },
  {
    label: 'Académique',
    items: [
      { name: 'Étudiants',       href: '/admin/students',     icon: Users,          color: '#2563eb', bg: '#eff6ff',  iconBg: '#dbeafe' },
      { name: 'Enseignants',     href: '/admin/teachers',     icon: GraduationCap,  color: '#7c3aed', bg: '#f5f3ff',  iconBg: '#ede9fe' },
      { name: 'Personnel admin', href: '/admin/staff',        icon: Briefcase,      color: '#0f766e', bg: '#f0fdfa',  iconBg: '#99f6e4' },
      { name: 'Classes',         href: '/admin/classes',      icon: Layers,         color: '#0d9488', bg: '#f0fdfa',  iconBg: '#ccfbf1' },
      { name: 'Matières',        href: '/admin/courses',      icon: BookCopy,       color: '#ea580c', bg: '#fff7ed',  iconBg: '#fed7aa' },
      { name: 'Emploi du temps', href: '/admin/timetable',    icon: CalendarDays,   color: '#0d9488', bg: '#f0fdfa',  iconBg: '#99f6e4' },
      { name: 'Présences',       href: '/admin/attendance',   icon: ClipboardCheck, color: '#059669', bg: '#ecfdf5',  iconBg: '#d1fae5' },
      { name: 'Notes',           href: '/admin/grades',       icon: Star,           color: '#7c3aed', bg: '#f5f3ff',  iconBg: '#ede9fe' },
      { name: 'Bulletins',       href: '/admin/report-cards', icon: BookMarked,     color: '#059669', bg: '#ecfdf5',  iconBg: '#d1fae5' },
      { name: 'E-Learning',      href: '/admin/elearning',    icon: BookOpen,       color: '#db2777', bg: '#fdf2f8',  iconBg: '#fce7f3' },
    ]
  },
  {
    label: 'Finance & Admin',
    items: [
      { name: 'Finances',           href: '/admin/finance',        icon: Wallet,       color: '#d97706', bg: '#fffbeb', iconBg: '#fef3c7' },
      { name: 'Caisse',            href: '/admin/cash-register',  icon: Archive,      color: '#d97706', bg: '#fffbeb', iconBg: '#fde68a' },
      { name: 'Dépenses',          href: '/admin/expenses',       icon: TrendingDown, color: '#ef4444', bg: '#fef2f2', iconBg: '#fee2e2' },
      { name: 'Comptes bancaires', href: '/admin/bank-accounts',  icon: Landmark,     color: '#2563eb', bg: '#eff6ff', iconBg: '#dbeafe' },
      { name: 'Comptabilité',      href: '/admin/accounting',     icon: BarChart3,    color: '#65a30d', bg: '#f7fee7', iconBg: '#ecfccb' },
      { name: 'Documents',         href: '/admin/documents',      icon: FileText,     color: '#0284c7', bg: '#f0f9ff', iconBg: '#bae6fd' },
    ]
  },
  {
    label: 'Communication',
    items: [
      { name: 'Messages',         href: '/admin/messages',       icon: MessageSquare, color: '#7c3aed', bg: '#f5f3ff', iconBg: '#ede9fe' },
      { name: 'Notifications',    href: '/admin/notifications',  icon: Bell,          color: '#0ea5e9', bg: '#f0f9ff', iconBg: '#e0f2fe' },
      { name: 'Assistant IA',     href: '/admin/ai-responses',   icon: Bot,           color: '#ea580c', bg: '#fff7ed', iconBg: '#fed7aa' },
      { name: 'Historique',       href: '/admin/audit-logs',     icon: History,       color: '#475569', bg: '#f8fafc', iconBg: '#f1f5f9' },
    ]
  },
];

export default function Sidebar({ open, onClose, collapsed }) {
  const location  = useLocation();
  const navigate  = useNavigate();

  const isActive = (href) => {
    if (href === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden"
             style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
             onClick={onClose} />
      )}

      {/* Mobile sidebar — slides in from left */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[260px] lg:hidden`}
        style={{
          background: '#fff',
          boxShadow: '4px 0 24px rgba(0,0,0,0.08)',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 300ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <SidebarContent isActive={isActive} onClose={onClose} navigate={navigate} />
      </div>

      {/* Desktop sidebar — fixed, collapses via transform */}
      <div
        className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-[260px] flex-col"
        style={{
          background: '#fff',
          borderRight: '1px solid #f1f5f9',
          transform: collapsed ? 'translateX(-260px)' : 'translateX(0)',
          transition: 'transform 300ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <SidebarContent isActive={isActive} navigate={navigate} />
      </div>
    </>
  );
}

function SidebarContent({ isActive, onClose, navigate }) {
  const { workspace } = useWorkspace();
  const handleLogout = async () => {
    try { await api.logout(); } catch {}
    navigate('/login');
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto"
         style={{ scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}>

      {/* Logo */}
      <div className="flex h-[68px] shrink-0 items-center justify-between px-5"
           style={{ borderBottom: '1px solid #f1f5f9' }}>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center relative overflow-hidden flex-shrink-0"
               style={{ background: `linear-gradient(135deg, ${workspace.primaryColor}, ${workspace.primaryColor}bb)` }}>
            {workspace.logoUrl
              ? <img src={workspace.logoUrl} alt="logo" className="h-full w-full object-contain" />
              : <GraduationCap className="h-5 w-5 text-white relative z-10" />}
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: '#0f172a', letterSpacing: '-0.01em' }}>{workspace.appName}</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Admin</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-5 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#cbd5e1' }}>
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={onClose}
                    className="group flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium transition-all duration-150"
                    style={{
                      background: active ? item.bg : 'transparent',
                      color: active ? item.color : '#64748b',
                    }}
                    onMouseEnter={e => {
                      if (!active) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#1e293b'; }
                    }}
                    onMouseLeave={e => {
                      if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }
                    }}
                  >
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150"
                         style={{ background: active ? item.iconBg : '#f8fafc' }}>
                      <item.icon className="h-[15px] w-[15px] transition-colors"
                                 style={{ color: active ? item.color : '#94a3b8' }} />
                    </div>
                    <span className="flex-1 truncate font-medium" style={{ fontSize: '13px' }}>{item.name}</span>
                    {active && (
                      <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings */}
      <div className="px-3 py-2" style={{ borderTop: '1px solid #f1f5f9' }}>
        <Link
          to="/admin/settings"
          onClick={onClose}
          className="flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium transition-all duration-150"
          style={{ color: '#64748b' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#1e293b'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
        >
          <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: '#f8fafc' }}>
            <Settings className="h-[15px] w-[15px]" style={{ color: '#94a3b8' }} />
          </div>
          <span style={{ fontSize: '13px' }}>Paramètres</span>
        </Link>
      </div>

      {/* User */}
      <div className="p-3 pb-4" style={{ borderTop: '1px solid #f1f5f9' }}>
        <div className="flex items-center gap-3 p-2.5 rounded-xl mb-1" style={{ background: '#f8fafc' }}>
          <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
               style={{ background: `linear-gradient(135deg, ${workspace.primaryColor}, ${workspace.primaryColor}bb)` }}>
            AD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: '#1e293b', fontSize: '13px' }}>Administrateur</p>
            <p className="text-[11px] truncate" style={{ color: '#94a3b8' }}>Super Admin</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium transition-all duration-150"
          style={{ color: '#94a3b8' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
        >
          <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: '#f8fafc' }}>
            <LogOut className="h-[15px] w-[15px]" />
          </div>
          <span style={{ fontSize: '13px' }}>Déconnexion</span>
        </button>
      </div>
    </div>
  );
}
