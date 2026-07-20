import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastCtx = createContext(null);

const CFG = {
  success: { border: '#10b981', bg: '#ecfdf5', text: '#065f46', Icon: CheckCircle },
  error:   { border: '#ef4444', bg: '#fef2f2', text: '#991b1b', Icon: AlertCircle },
  warning: { border: '#f59e0b', bg: '#fffbeb', text: '#92400e', Icon: AlertTriangle },
  info:    { border: '#6366f1', bg: '#eef2ff', text: '#3730a3', Icon: Info },
};

export function NotificationsProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const notify = useCallback((msgOrObj, typeArg = 'info') => {
    const id = ++counter.current;
    let message, type;
    if (msgOrObj && typeof msgOrObj === 'object') {
      type = msgOrObj.type || typeArg;
      const title = msgOrObj.title || '';
      const body = msgOrObj.message || '';
      message = title && body ? `${title} — ${body}` : title || body;
    } else {
      message = String(msgOrObj ?? '');
      type = typeArg;
    }
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  const dismiss = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  return (
    <ToastCtx.Provider value={{ notify }}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <div style={{
          position: 'fixed', top: 76, right: 20, zIndex: 999999,
          display: 'flex', flexDirection: 'column', gap: 8,
          maxWidth: 380, width: 'calc(100vw - 40px)', pointerEvents: 'none',
        }}>
          {toasts.map(({ id, message, type }) => {
            const c = CFG[type] || CFG.info;
            return (
              <div key={id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                background: c.bg, border: `1.5px solid ${c.border}`,
                borderRadius: 12, padding: '12px 14px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.13)',
                pointerEvents: 'auto',
              }}>
                <c.Icon size={16} style={{ color: c.border, flexShrink: 0, marginTop: 1 }} />
                <p style={{ flex: 1, fontSize: 13, fontWeight: 600, color: c.text, lineHeight: 1.45, margin: 0 }}>
                  {message}
                </p>
                <button
                  onClick={() => dismiss(id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0, flexShrink: 0 }}
                >
                  <X size={13} style={{ color: c.border, opacity: 0.6 }} />
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </ToastCtx.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    return { notify: (msg, type) => console.warn(`[toast/${type}]`, msg) };
  }
  return ctx;
}

export default NotificationsProvider;
