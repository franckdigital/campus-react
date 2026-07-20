import { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, HelpCircle } from 'lucide-react';

const ConfirmCtx = createContext(null);

export function ConfirmDialogProvider({ children }) {
  const [state, setState] = useState(null);
  const [values, setValues] = useState({});
  const [error, setError] = useState('');

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      setValues(Object.fromEntries((opts.fields || []).map(f => [f.key, f.defaultValue ?? ''])));
      setError('');
      setState({ ...opts, resolve });
    });
  }, []);

  const finish = (result) => {
    state?.resolve(result);
    setState(null);
  };

  const handleConfirm = () => {
    if (state.fields?.length) {
      for (const f of state.fields) {
        if (f.required && !String(values[f.key] ?? '').trim()) {
          setError(`${f.label} est requis.`);
          return;
        }
      }
      finish(values);
    } else {
      finish(true);
    }
  };

  const handleCancel = () => finish(state.fields?.length ? null : false);

  return (
    <ConfirmCtx.Provider value={{ confirm }}>
      {children}
      {state && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', zIndex: 100000 }}
          onClick={handleCancel}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm animate-scale-in"
            style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.25), 0 8px 32px rgba(0,0,0,0.12)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="h-1 rounded-t-2xl" style={{ background: state.destructive ? 'linear-gradient(90deg, #ef4444, #f97316)' : 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: state.destructive ? '#fee2e2' : '#eef2ff', color: state.destructive ? '#ef4444' : '#6366f1' }}>
                  {state.destructive ? <AlertTriangle className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <h2 className="text-base font-extrabold" style={{ color: '#0f172a' }}>{state.title}</h2>
                  {state.message && <p className="text-sm mt-1" style={{ color: '#64748b' }}>{state.message}</p>}
                </div>
              </div>

              {state.fields?.length > 0 && (
                <div className="space-y-3">
                  {state.fields.map(f => (
                    <div key={f.key}>
                      <label className="block mb-1" style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {f.label}{f.required && ' *'}
                      </label>
                      {f.type === 'textarea' ? (
                        <textarea
                          autoFocus={f.autoFocus}
                          rows={3}
                          value={values[f.key] ?? ''}
                          onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                          className="input-field resize-none"
                        />
                      ) : (
                        <input
                          autoFocus={f.autoFocus}
                          type={f.type || 'text'}
                          min={f.min}
                          max={f.max}
                          step={f.step}
                          value={values[f.key] ?? ''}
                          onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                          className="input-field"
                        />
                      )}
                    </div>
                  ))}
                  {error && <p className="text-xs font-semibold" style={{ color: '#ef4444' }}>{error}</p>}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button onClick={handleCancel}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold border" style={{ color: '#64748b', borderColor: '#e2e8f0' }}>
                  {state.cancelLabel || 'Annuler'}
                </button>
                <button onClick={handleConfirm}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{
                    background: state.destructive ? 'linear-gradient(135deg, #ef4444, #f97316)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    boxShadow: state.destructive ? '0 4px 14px #ef444440' : '0 4px 14px #6366f140',
                  }}>
                  {state.confirmLabel || 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </ConfirmCtx.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) {
    return async (opts) => (typeof window !== 'undefined' ? window.confirm(opts?.title || opts?.message || '') : false);
  }
  return ctx.confirm;
}

export default ConfirmDialogProvider;
