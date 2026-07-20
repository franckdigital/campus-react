import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  GraduationCap, LayoutDashboard, MessageSquare,
  LogOut, Menu, X, ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import NotificationBell from '../components/NotificationBell';

const NAV = [
  { name: 'Tableau de bord', href: '/parent',          icon: LayoutDashboard, color: '#6366f1', bg: '#eef2ff' },
  { name: 'Messages',        href: '/parent/messages', icon: MessageSquare,   color: '#0891b2', bg: '#ecfeff' },
];

export default function ParentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, logout, loading } = useAuth();
  const { workspace } = useWorkspace();

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate('/login', { replace: true }); return; }
    if (user.user_type === 'STUDENT') navigate('/student', { replace: true });
    else if (user.user_type !== 'PARENT') navigate('/admin', { replace: true });
  }, [user, loading, navigate]);

  const isActive = (href) =>
    href === '/parent' ? location.pathname === '/parent' : location.pathname.startsWith(href);

  const handleLogout = async () => {
    try { await logout(); } catch {}
    navigate('/login');
  };

  // Don't render layout while auth resolves — avoids flicker with null user
  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8fafc' }}>
      <div className="h-10 w-10 rounded-full border-[3px] animate-spin"
           style={{ borderColor: '#e0e7ff', borderTopColor: '#6366f1' }} />
    </div>
  );

  const fullName = user.full_name || user.email || 'Parent';
  const initials = fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>

      {/* Mobile overlay */}
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
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Espace Parent</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(item => {
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

        {/* User + logout */}
        <div className="p-3 pb-4" style={{ borderTop: '1px solid #f1f5f9' }}>
          <div className="flex items-center gap-3 p-2.5 rounded-xl mb-1" style={{ background: '#f8fafc' }}>
            <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                 style={{ background: `linear-gradient(135deg, ${workspace.primaryColor}, ${workspace.primaryColor}bb)` }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate" style={{ color: '#1e293b' }}>{fullName}</p>
              <p className="text-[11px] truncate" style={{ color: '#94a3b8' }}>Parent</p>
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

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top header bar */}
        <header className="sticky top-0 z-30 h-16 flex items-center gap-4 px-4 sm:px-6"
                style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #f1f5f9' }}>
          <button onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <Menu className="h-5 w-5 text-slate-600" />
          </button>
          <div className="flex-1" />
          <NotificationBell accentColor="#6366f1" />
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                 style={{ background: `linear-gradient(135deg, ${workspace.primaryColor}, ${workspace.primaryColor}bb)` }}>
              {initials}
            </div>
            <span className="hidden sm:block text-sm font-semibold" style={{ color: '#1e293b' }}>{fullName}</span>
            <ChevronDown className="h-3.5 w-3.5" style={{ color: '#94a3b8' }} />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
