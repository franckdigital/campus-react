import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import Header from '../components/dashboard/Header';
import { useAuth } from '../context/AuthContext';

const SIDEBAR_W = 260;

export default function DashboardLayout() {
  const [sidebarOpen,      setSidebarOpen]      = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const contentRef = useRef(null);
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      if (user.user_type === 'STUDENT') navigate('/student', { replace: true });
      else if (user.user_type === 'PARENT') navigate('/parent', { replace: true });
    }
    if (!loading && !user) navigate('/login', { replace: true });
  }, [user, loading, navigate]);

  // Update left padding on desktop whenever collapse state changes
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const update = () => {
      const lg = window.innerWidth >= 1024;
      el.style.paddingLeft = lg && !sidebarCollapsed ? `${SIDEBAR_W}px` : '0px';
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [sidebarCollapsed]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-alt)' }}>
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
      />

      <div
        ref={contentRef}
        className="flex flex-col min-h-screen"
        style={{ transition: 'padding-left 300ms cubic-bezier(0.4,0,0.2,1)' }}
      >
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(c => !c)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
