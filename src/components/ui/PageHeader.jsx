/* ─────────────────────────────────────────────────────────────
   Shared UI components — used by every admin page
───────────────────────────────────────────────────────────── */
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/* ── PageHeader ────────────────────────────────────────────── */
export function PageHeader({ icon: Icon, iconColor, iconBg, title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="flex items-center gap-4">
        <div
          className="h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${iconBg} 0%, ${iconColor}22 100%)`,
            boxShadow: `0 4px 18px ${iconColor}28, inset 0 1px 0 rgba(255,255,255,0.6)`,
            border: `1px solid ${iconColor}18`,
          }}
        >
          <Icon className="h-5.5 w-5.5" style={{ color: iconColor, filter: `drop-shadow(0 1px 2px ${iconColor}40)` }} />
        </div>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: '#0f172a', letterSpacing: '-0.02em' }}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm mt-0.5 font-medium" style={{ color: '#94a3b8' }}>{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="flex items-center gap-3">{action}</div>}
    </div>
  );
}

/* ── FilterBar ─────────────────────────────────────────────── */
export function FilterBar({ children }) {
  return (
    <div
      className="rounded-2xl p-4 mb-6"
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
        border: '1px solid #e2e8f2',
        boxShadow: '0 2px 8px rgba(15,23,50,0.05)',
      }}
    >
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

/* ── SearchInput ───────────────────────────────────────────── */
export function SearchInput({ value, onChange, placeholder = 'Rechercher…', className = '' }) {
  return (
    <div className={`relative flex-1 min-w-[200px] ${className}`}>
      <svg
        className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
        style={{ color: '#94a3b8' }}
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      >
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="input-field"
        style={{ paddingLeft: '2.4rem' }}
      />
    </div>
  );
}

/* ── FilterSelect ──────────────────────────────────────────── */
export function FilterSelect({ value, onChange, children, className = '' }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={`input-field cursor-pointer ${className}`}
      style={{ minWidth: 155, maxWidth: 210, flex: '0 0 auto' }}
    >
      {children}
    </select>
  );
}

/* ── ActionButton ──────────────────────────────────────────── */
export function ActionButton({ onClick, icon: Icon, label, color = '#6366f1' }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 border"
      style={{ color, background: 'transparent', borderColor: `${color}28` }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}10`; e.currentTarget.style.borderColor = `${color}55`; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `${color}28`; }}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {label}
    </button>
  );
}

/* ── PrimaryButton ─────────────────────────────────────────── */
export function PrimaryButton({ onClick, icon: Icon, label, color = '#6366f1', type = 'button', disabled }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
        boxShadow: `0 3px 14px ${color}38`,
      }}
      onMouseEnter={e => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = `0 6px 22px ${color}50`;
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = `0 3px 14px ${color}38`;
      }}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {label}
    </button>
  );
}

/* ── IconBtn ───────────────────────────────────────────────── */
export function IconBtn({ onClick, icon: Icon, color = '#64748b', hoverBg = '#f1f5f9', title, size = 'md' }) {
  const dim = size === 'sm' ? '30px' : '34px';
  return (
    <button
      onClick={onClick}
      title={title}
      className="rounded-xl flex items-center justify-center transition-all duration-150 flex-shrink-0"
      style={{ color, width: dim, height: dim }}
      onMouseEnter={e => {
        e.currentTarget.style.background = hoverBg;
        e.currentTarget.style.transform = 'scale(1.08)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.transform = '';
      }}
    >
      <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
    </button>
  );
}

/* ── Avatar ────────────────────────────────────────────────── */
export function Avatar({ name = '', color = '#6366f1', size = 'md' }) {
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const sizes = {
    sm:  'h-8  w-8  text-[10px] rounded-xl',
    md:  'h-9  w-9  text-xs     rounded-xl',
    lg:  'h-11 w-11 text-sm     rounded-2xl',
    xl:  'h-14 w-14 text-base   rounded-2xl',
  };
  return (
    <div
      className={`${sizes[size] || sizes.md} flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{
        background: `linear-gradient(135deg, ${color} 0%, ${color}bb 100%)`,
        boxShadow: `0 2px 8px ${color}30`,
      }}
    >
      {initials}
    </div>
  );
}

/* ── StatusBadge ───────────────────────────────────────────── */
export function StatusBadge({ status }) {
  const map = {
    active:    { label: 'Actif',      cls: 'badge-success', pulse: true },
    ACTIVE:    { label: 'Actif',      cls: 'badge-success', pulse: true },
    inactive:  { label: 'Inactif',    cls: 'badge-neutral' },
    INACTIVE:  { label: 'Inactif',    cls: 'badge-neutral' },
    suspended: { label: 'Suspendu',   cls: 'badge-danger' },
    SUSPENDED: { label: 'Suspendu',   cls: 'badge-danger' },
    graduated: { label: 'Diplômé',    cls: 'badge-info' },
    GRADUATED: { label: 'Diplômé',    cls: 'badge-info' },
    pending:   { label: 'En attente', cls: 'badge-warning' },
    PENDING:   { label: 'En attente', cls: 'badge-warning' },
    paid:      { label: 'Payé',       cls: 'badge-success', pulse: true },
    PAID:      { label: 'Payé',       cls: 'badge-success', pulse: true },
    on_leave:  { label: 'En congé',   cls: 'badge-warning' },
  };
  const s = map[status] || { label: status, cls: 'badge-neutral' };
  return (
    <span className={`badge badge-dot ${s.cls}`}>
      {s.pulse && (
        <span style={{
          display: 'inline-block', width: 5.5, height: 5.5, borderRadius: '50%',
          background: 'currentColor', flexShrink: 0,
          animation: 'pulse-dot 2.2s ease-in-out infinite',
        }} />
      )}
      {!s.pulse && (
        <span style={{
          display: 'inline-block', width: 5.5, height: 5.5, borderRadius: '50%',
          background: 'currentColor', flexShrink: 0,
        }} />
      )}
      {s.label}
    </span>
  );
}

/* ── TableContainer ────────────────────────────────────────── */
export function TableContainer({ loading, empty, emptyIcon: EmptyIcon, emptyText = 'Aucune donnée', children }) {
  if (loading) {
    return (
      <div className="card flex flex-col items-center justify-center py-24">
        <div className="relative mb-4">
          <div className="h-12 w-12 rounded-full border-[3px] border-indigo-100 animate-spin" style={{ borderTopColor: '#6366f1' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-indigo-500 opacity-40" />
          </div>
        </div>
        <p className="text-sm font-medium" style={{ color: '#94a3b8' }}>Chargement en cours…</p>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="card flex flex-col items-center justify-center py-24">
        {EmptyIcon && (
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4"
               style={{ background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)' }}>
            <EmptyIcon className="h-8 w-8 opacity-40" style={{ color: '#64748b' }} />
          </div>
        )}
        <p className="text-sm font-semibold" style={{ color: '#64748b' }}>{emptyText}</p>
        <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Aucun élément à afficher pour l'instant</p>
      </div>
    );
  }
  return <div className="card overflow-hidden">{children}</div>;
}

/* ── Table ─────────────────────────────────────────────────── */
export function Table({ headers, children }) {
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/* ── TableRow ──────────────────────────────────────────────── */
export function TableRow({ children, onClick }) {
  return (
    <tr
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {children}
    </tr>
  );
}

/* ── Modal (used by Students, Teachers, etc.) ──────────────── */
export function Modal({ open, onClose, title, subtitle, size = 'lg', accentColor = '#6366f1', children }) {
  if (!open) return null;
  const widthMap = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-5xl' };
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(8,12,36,0.58)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl w-full ${widthMap[size]} max-h-[92vh] flex flex-col animate-scale-in overflow-hidden`}
        style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.2), 0 8px 32px rgba(0,0,0,0.1)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Colored accent stripe */}
        <div style={{ height: 4, background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)`, flexShrink: 0 }} />

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid #f0f4f9', background: 'linear-gradient(180deg, #fafbff 0%, #fff 100%)' }}
        >
          <div>
            <h2 className="text-base font-bold" style={{ color: '#0f172a', letterSpacing: '-0.01em' }}>{title}</h2>
            {subtitle && <p className="text-xs mt-0.5 font-medium" style={{ color: '#94a3b8' }}>{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl flex items-center justify-center transition-all hover:bg-slate-100 hover:scale-105"
          >
            <svg className="h-4 w-4" style={{ color: '#94a3b8' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}

/* ── InlineModal (for pages using inline modal JSX) ────────── */
export function InlineModal({ open, onClose, title, subtitle, zIndex = 9999, maxWidth = 'max-w-2xl', color = '#6366f1', children }) {
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex, background: 'rgba(8,12,36,0.58)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto animate-scale-in`}
        style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.2), 0 8px 32px rgba(0,0,0,0.1)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Accent stripe */}
        <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, ${color}80)`, borderRadius: '16px 16px 0 0' }} />
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
          style={{ borderBottom: '1px solid #f0f4f9', background: 'linear-gradient(180deg, #fafbff 0%, #fff 100%)' }}
        >
          <div>
            <h2 className="text-base font-bold" style={{ color: '#0f172a', letterSpacing: '-0.01em' }}>{title}</h2>
            {subtitle && <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl flex items-center justify-center transition-all hover:bg-slate-100"
          >
            <svg className="h-4 w-4" style={{ color: '#94a3b8' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Body */}
        {children}
      </div>
    </div>,
    document.body
  );
}

/* ── FormSection ───────────────────────────────────────────── */
export function FormSection({ title, icon: Icon, children }) {
  return (
    <div>
      <div
        className="flex items-center gap-2 mb-4 pb-3"
        style={{ borderBottom: '1.5px solid #f0f4f9' }}
      >
        {Icon && (
          <div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: '#eef2ff' }}>
            <Icon className="h-3.5 w-3.5" style={{ color: '#6366f1' }} />
          </div>
        )}
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#64748b' }}>{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

/* ── FormField ─────────────────────────────────────────────── */
export function FormField({ label, required, children, fullWidth }) {
  return (
    <div className={fullWidth ? 'md:col-span-2 min-w-0' : 'min-w-0'}>
      <label className="form-label">
        {label}
        {required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

/* ── FormInput ─────────────────────────────────────────────── */
export function FormInput({ type = 'text', ...props }) {
  return <input type={type} className="input-field" {...props} />;
}

/* ── FormSelect ────────────────────────────────────────────── */
export function FormSelect({ children, ...props }) {
  return <select className="input-field cursor-pointer" {...props}>{children}</select>;
}

/* ── ModalFooter ───────────────────────────────────────────── */
export function ModalFooter({ onCancel, onSubmit, submitLabel = 'Enregistrer', cancelLabel = 'Annuler', loading, color = '#6366f1', destructive }) {
  return (
    <div
      className="flex items-center justify-end gap-3 pt-4 mt-4"
      style={{ borderTop: '1px solid #f0f4f9' }}
    >
      <button
        type="button"
        onClick={onCancel}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-slate-50 border"
        style={{ color: '#64748b', borderColor: '#e2e8f2' }}
      >
        {cancelLabel}
      </button>
      <button
        type={onSubmit ? 'button' : 'submit'}
        onClick={onSubmit}
        disabled={loading}
        className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          background: destructive
            ? 'linear-gradient(135deg, #ef4444, #dc2626)'
            : `linear-gradient(135deg, ${color}, ${color}bb)`,
          boxShadow: destructive
            ? '0 3px 12px rgba(239,68,68,0.32)'
            : `0 3px 12px ${color}32`,
        }}
        onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; } }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            Enregistrement…
          </span>
        ) : submitLabel}
      </button>
    </div>
  );
}

/* ── Pagination ─────────────────────────────────────────────── */
export function Pagination({ currentPage, totalPages, onPageChange, accentColor = '#6366f1', totalItems, itemsPerPage }) {
  if (!totalPages || totalPages <= 1) return null;
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== '...') pages.push('...');
  }
  const start = itemsPerPage != null ? (currentPage - 1) * itemsPerPage + 1 : null;
  const end   = itemsPerPage != null ? Math.min(currentPage * itemsPerPage, totalItems) : null;
  return (
    <div className="flex items-center justify-between pt-4 mt-4" style={{ borderTop: '1px solid #f1f5f9' }}>
      <p className="text-xs font-semibold" style={{ color: '#94a3b8' }}>
        {start != null && totalItems != null
          ? `${start}–${end} sur ${totalItems}`
          : `Page ${currentPage} sur ${totalPages}`}
      </p>
      <div className="flex items-center gap-1">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors disabled:opacity-30"
          style={{ border: '1.5px solid #e2e8f0', color: '#64748b' }}
          onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#f8fafc'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
          ‹
        </button>
        {pages.map((page, i) =>
          page === '...' ? (
            <span key={`ellipsis-${i}`} className="h-8 w-8 flex items-center justify-center text-xs" style={{ color: '#94a3b8' }}>…</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all"
              style={currentPage === page
                ? { background: accentColor, color: '#fff', boxShadow: `0 2px 8px ${accentColor}40` }
                : { border: '1.5px solid #e2e8f0', color: '#64748b' }}
              onMouseEnter={e => { if (currentPage !== page) e.currentTarget.style.background = '#f8fafc'; }}
              onMouseLeave={e => { if (currentPage !== page) e.currentTarget.style.background = 'transparent'; }}>
              {page}
            </button>
          )
        )}
        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors disabled:opacity-30"
          style={{ border: '1.5px solid #e2e8f0', color: '#64748b' }}
          onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#f8fafc'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
          ›
        </button>
      </div>
    </div>
  );
}

/* ── ExportMenu ────────────────────────────────────────────── */
export function ExportMenu({ onExcel, onPDF, color = '#64748b', disabled = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all border disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          color,
          borderColor: `${color}30`,
          background: open ? `${color}10` : 'transparent',
        }}
      >
        {/* Download icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Exporter
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 w-48 rounded-xl shadow-xl z-50 overflow-hidden py-1"
          style={{ background: '#fff', border: '1px solid #f0f4f9', boxShadow: '0 10px 40px rgba(15,23,42,0.12)' }}
        >
          {onExcel && (
            <button
              type="button"
              onClick={() => { onExcel(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 transition-colors"
            >
              {/* FileSpreadsheet icon */}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="8" y1="9" x2="10" y2="9"/>
              </svg>
              <span>Export Excel <span className="text-slate-400 text-xs">.xlsx</span></span>
            </button>
          )}
          {onPDF && (
            <button
              type="button"
              onClick={() => { onPDF(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-red-50 transition-colors"
            >
              {/* FileText icon */}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
              </svg>
              <span>Export PDF <span className="text-slate-400 text-xs">.pdf</span></span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── SectionCard (card with title header) ──────────────────── */
export function SectionCard({ title, subtitle, action, children, className = '' }) {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold" style={{ color: '#0f172a', letterSpacing: '-0.01em' }}>{title}</h3>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
