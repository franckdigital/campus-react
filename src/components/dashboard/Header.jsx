import {
  Menu, Bell, Search, MapPin, ChevronDown,
  CheckCircle, AlertCircle, DollarSign, BookOpen, MessageSquare, Calendar, Info,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useSite } from '../../contexts/SiteContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useNotifications } from '../../contexts/NotificationContext';

const TYPE_META = {
  PAYMENT:    { icon: DollarSign,    bg: '#d1fae5', color: '#059669' },
  GRADE:      { icon: BookOpen,      bg: '#e0e7ff', color: '#6366f1' },
  ABSENCE:    { icon: AlertCircle,   bg: '#fef3c7', color: '#d97706' },
  ATTENDANCE: { icon: CheckCircle,   bg: '#d1fae5', color: '#059669' },
  MESSAGE:    { icon: MessageSquare, bg: '#fdf2f8', color: '#db2777' },
  REMINDER:   { icon: Calendar,      bg: '#ede9fe', color: '#7c3aed' },
  ALERT:      { icon: AlertCircle,   bg: '#fee2e2', color: '#ef4444' },
  SYSTEM:     { icon: Info,          bg: '#f0f9ff', color: '#0891b2' },
  ASSIGNMENT: { icon: BookOpen,      bg: '#ede9fe', color: '#7c3aed' },
};

function timeLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 60000);
  if (diff < 1) return 'À l\'instant';
  if (diff < 60) return `Il y a ${diff} min`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `Il y a ${h}h`;
  if (h < 48) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export default function Header({ onMenuClick, sidebarCollapsed, onToggleSidebar }) {
  const [showNotif, setShowNotif] = useState(false);
  const [showSite,  setShowSite]  = useState(false);
  const { selectedSite, selectSite, sites, getSelectedSiteName } = useSite();
  const { workspace } = useWorkspace();
  const { notifications, unreadCount, loading: loadingNotifs, markRead, markAllRead } = useNotifications();
  const notifRef = useRef(null);
  const siteRef  = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (siteRef.current  && !siteRef.current.contains(e.target))  setShowSite(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const ToggleIcon = sidebarCollapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <header className="sticky top-0 z-40 glass"
            style={{ borderBottom: '1px solid rgba(226,232,240,0.8)', boxShadow: '0 1px 24px rgba(0,0,0,0.05)' }}>
      <div className="flex h-[68px] items-center justify-between px-4 sm:px-6">

        {/* Left — mobile menu + desktop sidebar toggle + search */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Mobile hamburger */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl transition-colors hover:bg-slate-100"
            title="Ouvrir le menu"
          >
            <Menu className="h-5 w-5 text-slate-600" />
          </button>

          {/* Desktop sidebar toggle */}
          <button
            onClick={onToggleSidebar}
            className="hidden lg:flex items-center justify-center p-2 rounded-xl transition-all duration-150"
            title={sidebarCollapsed ? 'Afficher la barre latérale' : 'Masquer la barre latérale'}
            style={{ color: '#64748b' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#6366f1'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
          >
            <ToggleIcon className="h-5 w-5" />
          </button>

          {/* Search bar */}
          <div
            className="hidden sm:flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all duration-200 cursor-text group"
            style={{ background: '#f8fafc', borderColor: '#e2e8f0', width: 'clamp(200px, 30vw, 380px)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#c7d2fe'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
          >
            <Search className="h-4 w-4 flex-shrink-0" style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Rechercher étudiants, cours, documents…"
              className="flex-1 bg-transparent border-none outline-none text-sm min-w-0"
              style={{ color: '#1e293b' }}
            />
            <kbd className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium flex-shrink-0"
                 style={{ background: '#e2e8f0', color: '#64748b' }}>
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1 sm:gap-2">

          {/* Mobile search icon */}
          <button className="sm:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <Search className="h-5 w-5 text-slate-500" />
          </button>

          {/* Site selector */}
          <div className="relative" ref={siteRef}>
            <button
              onClick={() => { setShowSite(!showSite); setShowNotif(false); }}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-xl border text-sm font-medium transition-all duration-200"
              style={{
                borderColor: showSite ? '#6366f1' : '#e2e8f0',
                color: '#475569',
                background: showSite ? '#eef2ff' : '#f8fafc',
              }}
            >
              <MapPin className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
              <span className="hidden md:inline max-w-[100px] lg:max-w-[130px] truncate text-xs sm:text-sm">
                {getSelectedSiteName()}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showSite ? 'rotate-180' : ''}`}
                           style={{ color: '#94a3b8' }} />
            </button>

            {showSite && (
              <div className="absolute right-0 mt-2 w-56 sm:w-64 rounded-2xl shadow-lg overflow-hidden animate-scale-in"
                   style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 12px 40px rgba(0,0,0,0.12)' }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Site actif</p>
                </div>
                {[{ id: 'all', name: 'Tous les sites', code: 'ALL' }, ...sites].map((site) => (
                  <button
                    key={site.id}
                    onClick={() => { selectSite(site.id); setShowSite(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={{
                      background: selectedSite === site.id ? '#eef2ff' : 'transparent',
                      color:      selectedSite === site.id ? '#4f46e5' : '#374151',
                    }}
                    onMouseEnter={e => { if (selectedSite !== site.id) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={e => { if (selectedSite !== site.id) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                         style={{
                           background: selectedSite === site.id ? '#c7d2fe' : '#f1f5f9',
                           color:      selectedSite === site.id ? '#4f46e5' : '#64748b',
                         }}>
                      {(site.code || site.name?.slice(0, 2) || 'AL').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{site.name}</p>
                    </div>
                    {selectedSite === site.id && (
                      <div className="h-2 w-2 rounded-full bg-indigo-500 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setShowNotif(!showNotif); setShowSite(false); }}
              className="relative p-2 rounded-xl transition-colors"
              style={{ background: showNotif ? '#eef2ff' : 'transparent' }}
              onMouseEnter={e => { if (!showNotif) e.currentTarget.style.background = '#f8fafc'; }}
              onMouseLeave={e => { if (!showNotif) e.currentTarget.style.background = 'transparent'; }}
            >
              <Bell className="h-5 w-5" style={{ color: '#475569' }} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ background: '#ef4444', boxShadow: '0 0 0 2px #fff' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotif && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl shadow-xl overflow-hidden animate-scale-in"
                   style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 12px 40px rgba(0,0,0,0.12)' }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>Notifications</p>
                    {unreadCount > 0 && <p className="text-xs mt-0.5" style={{ color: '#6366f1' }}>{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>}
                  </div>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead}
                            className="text-xs font-medium px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                            style={{ color: '#6366f1' }}>
                      Tout lire
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {loadingNotifs ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="h-5 w-5 rounded-full border-2 animate-spin"
                           style={{ borderColor: '#e2e8f0', borderTopColor: '#6366f1' }} />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <Bell className="h-8 w-8" style={{ color: '#cbd5e1' }} />
                      <p className="text-xs" style={{ color: '#94a3b8' }}>Aucune notification</p>
                    </div>
                  ) : notifications.map(n => {
                    const meta = TYPE_META[n.notification_type] || TYPE_META.SYSTEM;
                    const Icon = meta.icon;
                    return (
                      <div key={n.id}
                           onClick={() => { if (!n.is_read) markRead(n.id); }}
                           className="flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer"
                           style={{ background: n.is_read ? 'transparent' : '#fafaf9' }}
                           onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                           onMouseLeave={e => e.currentTarget.style.background = n.is_read ? 'transparent' : '#fafaf9'}>
                        <div className="mt-0.5 h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0"
                             style={{ background: meta.bg }}>
                          <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: '#1e293b' }}>{n.title}</p>
                          <p className="text-xs truncate" style={{ color: '#64748b' }}>{n.message}</p>
                          <p className="text-[11px] mt-1" style={{ color: '#94a3b8' }}>{timeLabel(n.created_at)}</p>
                        </div>
                        {!n.is_read && <div className="h-2 w-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#6366f1' }} />}
                      </div>
                    );
                  })}
                </div>
                <div className="px-4 py-2.5" style={{ borderTop: '1px solid #f1f5f9' }}>
                  <p className="w-full text-center text-xs py-1" style={{ color: '#94a3b8' }}>
                    {notifications.length > 0 ? `${notifications.length} notification${notifications.length > 1 ? 's' : ''}` : 'Aucune notification'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="hidden sm:block h-7 w-px mx-1" style={{ background: '#e2e8f0' }} />

          {/* User avatar */}
          <button className="flex items-center gap-2 sm:gap-3 p-1.5 sm:pr-3 rounded-xl transition-all hover:bg-slate-50">
            <div className="h-8 w-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                 style={{ background: `linear-gradient(135deg, ${workspace.primaryColor}, ${workspace.primaryColor}bb)` }}>
              AD
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold leading-tight" style={{ color: '#1e293b' }}>Administrateur</p>
              <p className="text-[11px] leading-tight" style={{ color: '#94a3b8' }}>Super Admin</p>
            </div>
            <ChevronDown className="hidden sm:block h-3.5 w-3.5" style={{ color: '#94a3b8' }} />
          </button>

        </div>
      </div>
    </header>
  );
}
