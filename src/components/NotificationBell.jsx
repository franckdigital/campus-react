import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCircle, AlertCircle, DollarSign, BookOpen, MessageSquare, Calendar, Info } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';

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

export default function NotificationBell({ accentColor = '#6366f1' }) {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = (e, id, isRead) => {
    e.stopPropagation();
    if (!isRead) markRead(id);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-xl transition-colors"
        style={{ background: open ? `${accentColor}15` : 'transparent' }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = '#f8fafc'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        <Bell className="h-5 w-5" style={{ color: '#64748b' }} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                style={{ background: '#ef4444', boxShadow: '0 0 0 2px #fff' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl shadow-xl overflow-hidden animate-scale-in z-50"
             style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 12px 40px rgba(0,0,0,0.12)' }}>

          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>Notifications</p>
              {unreadCount > 0 && (
                <p className="text-xs mt-0.5" style={{ color: accentColor }}>{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead}
                      className="text-xs font-medium px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                      style={{ color: accentColor }}>
                Tout lire
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-5 w-5 rounded-full border-2 animate-spin"
                     style={{ borderColor: '#e2e8f0', borderTopColor: accentColor }} />
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
                     onClick={(e) => handleMarkRead(e, n.id, n.is_read)}
                     className="flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer"
                     style={{ background: n.is_read ? 'transparent' : '#fafaf9' }}
                     onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                     onMouseLeave={e => e.currentTarget.style.background = n.is_read ? 'transparent' : '#fafaf9'}>
                  <div className="mt-0.5 h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0"
                       style={{ background: meta.bg }}>
                    <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: '#1e293b' }}>{n.title}</p>
                    <p className="text-xs truncate" style={{ color: '#64748b' }}>{n.message}</p>
                    <p className="text-[11px] mt-1" style={{ color: '#94a3b8' }}>{timeLabel(n.created_at)}</p>
                  </div>
                  {!n.is_read && <div className="h-2 w-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: accentColor }} />}
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
  );
}
