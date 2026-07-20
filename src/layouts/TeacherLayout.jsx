import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  GraduationCap, LayoutDashboard, Calendar,
  ClipboardCheck, Star, MessageSquare,
  LogOut, Menu, X, ChevronDown, UserCircle, BookOpen,
  FileText, GanttChartSquare, ClipboardList,
  Library, Shield, FlaskConical, BookMarked, Video,
} from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import NotificationBell from '../components/NotificationBell';
import api from '../services/api';
import { academicService } from '../services';
import { usePermissions } from '../hooks/usePermissions';

// perm: null  → toujours visible (Dashboard, Profil, etc.)
// perm: 'key' → visible uniquement si la matrice le permet pour l'Enseignant
const NAV = [
  { name: 'Tableau de bord', href: '/teacher',            icon: LayoutDashboard, color: '#7c3aed', bg: '#f5f3ff', perm: null },
  { name: 'Emploi du temps', href: '/teacher/timetable',  icon: Calendar,        color: '#0d9488', bg: '#f0fdfa', perm: 'view_schedule' },
  { name: 'Mes matières',    href: '/teacher/my-subjects', icon: BookMarked,     color: '#0d9488', bg: '#f0fdfa', perm: 'view_schedule' },
  { name: 'Présences',       href: '/teacher/attendance', icon: ClipboardCheck,  color: '#059669', bg: '#ecfdf5', perm: 'mark_attendance' },
  { name: 'Saisie notes',    href: '/teacher/grades',       icon: Star,        color: '#d97706', bg: '#fffbeb', perm: 'manage_grades' },
  { name: 'Mes cours',       href: '/teacher/courses',    icon: Library,         color: '#0891b2', bg: '#ecfeff', perm: 'manage_elearning' },
  { name: 'Mes leçons',      href: '/teacher/lessons',     icon: FileText,        color: '#db2777', bg: '#fdf2f8', perm: 'create_lesson' },
  { name: 'Devoirs & Exercices', href: '/teacher/assignments', icon: GanttChartSquare, color: '#3b82f6', bg: '#eff6ff', perm: 'manage_elearning' },
  { name: 'Quiz',            href: '/teacher/quizzes',     icon: ClipboardList,   color: '#7c3aed', bg: '#f5f3ff', perm: 'manage_elearning' },
  { name: 'Examens sécurisés', href: '/teacher/exams',     icon: Shield,          color: '#dc2626', bg: '#fef2f2', perm: 'manage_elearning' },
  { name: 'Laboratoires virtuels', href: '/teacher/virtual-labs', icon: FlaskConical, color: '#059669', bg: '#ecfdf5', perm: 'manage_elearning' },
  { name: 'Classes virtuelles', href: '/teacher/virtual-classes', icon: Video, color: '#4f46e5', bg: '#eef2ff', perm: 'manage_elearning' },
  { name: 'Corrections eLearning', href: '/teacher/corrections', icon: BookOpen, color: '#7c3aed', bg: '#f5f3ff', perm: null },
  { name: 'Mon profil',      href: '/teacher/profile',    icon: UserCircle,      color: '#0891b2', bg: '#ecfeff', perm: null },
  { name: 'Messages',        href: '/teacher/messages',   icon: MessageSquare,   color: '#db2777', bg: '#fdf2f8', perm: null },
];

export default function TeacherLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [initials,    setInitials]    = useState('EN');
  const location = useLocation();
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const { can } = usePermissions();
  const visibleNav = NAV.filter(item => can(item.perm));

  useEffect(() => {
    academicService.getTeacherMe().then(me => {
      if (!me) return;
      const fn = me.user?.first_name || '';
      const ln = me.user?.last_name  || '';
      setTeacherName(`${fn} ${ln}`.trim() || 'Enseignant');
      setInitials(`${fn[0] || ''}${ln[0] || ''}`.toUpperCase() || 'EN');
    }).catch(() => {});
  }, []);

  const isActive = (href) =>
    href === '/teacher' ? location.pathname === '/teacher' : location.pathname.startsWith(href);

  const handleLogout = async () => {
    try { await api.logout(); } catch {}
    navigate('/login');
  };

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden"
             style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
             onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        transition-transform duration-300`}
           style={{ background: '#fff', borderRight: '1px solid #f1f5f9', boxShadow: '4px 0 24px rgba(0,0,0,0.06)' }}>

        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5"
             style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center overflow-hidden"
                 style={{ background: `linear-gradient(135deg, ${workspace.primaryColor}, ${workspace.primaryColor}bb)` }}>
              {workspace.logoUrl
                ? <img src={workspace.logoUrl} alt="" className="h-full w-full object-contain" />
                : <GraduationCap className="h-5 w-5 text-white" />}
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: '#0f172a' }}>{workspace.appName}</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Espace Enseignant</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleNav.map(item => {
            const active = isActive(item.href);
            return (
              <Link key={item.name} to={item.href} onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: active ? item.bg : 'transparent', color: active ? item.color : '#64748b' }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#1e293b'; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; } }}>
                <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
                     style={{ background: active ? `${item.color}20` : '#f8fafc' }}>
                  <item.icon className="h-[15px] w-[15px]" style={{ color: active ? item.color : '#94a3b8' }} />
                </div>
                <span style={{ fontSize: '13px' }}>{item.name}</span>
                {active && <div className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: item.color }} />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3 pb-4" style={{ borderTop: '1px solid #f1f5f9' }}>
          <div className="flex items-center gap-3 p-2.5 rounded-xl mb-1" style={{ background: '#f8fafc' }}>
            <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                 style={{ background: `linear-gradient(135deg, ${workspace.primaryColor}, ${workspace.primaryColor}bb)` }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate" style={{ color: '#1e293b' }}>{teacherName || 'Enseignant'}</p>
              <p className="text-[11px] truncate" style={{ color: '#94a3b8' }}>Portail enseignant</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ color: '#94a3b8' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}>
            <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: '#f8fafc' }}>
              <LogOut className="h-[15px] w-[15px]" />
            </div>
            <span style={{ fontSize: '13px' }}>Déconnexion</span>
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 h-16 flex items-center gap-4 px-4 sm:px-6"
                style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #f1f5f9' }}>
          <button onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <Menu className="h-5 w-5 text-slate-600" />
          </button>
          <div className="flex-1" />
          <NotificationBell accentColor="#7c3aed" />
          <div className="relative">
            <button onClick={() => setUserMenuOpen(o => !o)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
              <div className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                   style={{ background: `linear-gradient(135deg, ${workspace.primaryColor}, ${workspace.primaryColor}bb)` }}>
                {initials}
              </div>
              <span className="hidden sm:block text-sm font-semibold" style={{ color: '#1e293b' }}>{teacherName || 'Enseignant'}</span>
              <ChevronDown className="h-3.5 w-3.5" style={{ color: '#94a3b8' }} />
            </button>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl overflow-hidden z-50"
                     style={{ background: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #f1f5f9' }}>
                  <button onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-colors"
                    style={{ color: '#ef4444' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                    <LogOut className="h-4 w-4" /> Déconnexion
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
