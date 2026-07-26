import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  Bold, Italic, Underline, List, ListOrdered, Superscript, Subscript, Eraser, Table,
} from 'lucide-react';

// Basic arithmetic first (some students look for these on the toolbar even
// though they're on the keyboard — one less reason to go hunting for a key),
// then the symbols that actually aren't on a standard keyboard.
const SYMBOLS = [
  '+', '-', '=', '(', ')', '/',
  '√', '±', '×', '÷', '≤', '≥', '≠', '∞', 'π', 'Δ', '∑', '∫', '°', '½', '¼',
];

const FONT_SIZES = [
  { label: 'Petit', px: 12 },
  { label: 'Normal', px: 14 },
  { label: 'Moyen', px: 16 },
  { label: 'Grand', px: 20 },
  { label: 'Très grand', px: 28 },
];

function buildTableHtml(rows = 3, cols = 3) {
  const cellStyle = 'border:1px solid #94a3b8;padding:6px 10px;min-width:60px;';
  const row = `<tr>${Array.from({ length: cols }).map(() => `<td style="${cellStyle}">&nbsp;</td>`).join('')}</tr>`;
  return `<table style="border-collapse:collapse;margin:8px 0;">${Array.from({ length: rows }).map(() => row).join('')}</table><p><br></p>`;
}

function ToolButton({ onClick, title, active, children }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={e => e.preventDefault()} // keep the editor's text selection intact
      onClick={onClick}
      className="flex items-center justify-center h-8 w-8 rounded-lg transition-colors"
      style={{ background: active ? '#ede9fe' : 'transparent', color: active ? '#6d28d9' : '#64748b' }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f1f5f9'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

/**
 * Lightweight WYSIWYG for exam PDF-answer text — bold/italic/underline,
 * lists, sub/superscript (exponents) and a math-symbol palette, so a student
 * can actually format a worked formula instead of a flat wall of text.
 * Uncontrolled contentEditable (DOM owns the content, we just read it out on
 * change) — a controlled `value` prop here would fight the browser's own
 * caret/selection handling on every keystroke.
 */
const RichTextEditor = forwardRef(function RichTextEditor({ initialValue = '', onChange, placeholder, minHeight = 260, onFocus }, forwardedRef) {
  const ref = useRef(null);
  const initialized = useRef(false);
  const savedRangeRef = useRef(null);
  const [empty, setEmpty] = useState(!initialValue || initialValue === '<br>');

  // The native <select> for font size steals focus/selection from the
  // contentEditable the moment it opens, so by the time onChange fires the
  // browser's own selection no longer points at what the user had
  // highlighted — keep tracking it independently while typing/clicking
  // inside the editor so it can be restored right before applying a size.
  const trackSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && ref.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  useEffect(() => {
    if (!initialized.current && ref.current) {
      ref.current.innerHTML = initialValue || '';
      initialized.current = true;
    }
  }, [initialValue]);

  const emitChange = useCallback(() => {
    const html = ref.current?.innerHTML || '';
    setEmpty(!html || html === '<br>');
    onChange?.(html);
  }, [onChange]);

  useImperativeHandle(forwardedRef, () => ({
    insertText(text) {
      const el = ref.current;
      if (!el) return;
      el.focus();
      // Move the caret to the very end first — the student typically clicked
      // away to open the calculator, so there's no reliable "last known
      // caret" position to resume at; appending is the only sane default.
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      const needsBreak = !!el.innerHTML && !el.innerHTML.endsWith('<br>');
      document.execCommand('insertText', false, (needsBreak ? '\n' : '') + text);
      emitChange();
    },
  }), [emitChange]);

  const exec = (command, value) => {
    ref.current?.focus();
    document.execCommand(command, false, value);
    emitChange();
  };

  const insertSymbol = (symbol) => {
    ref.current?.focus();
    document.execCommand('insertText', false, symbol);
    emitChange();
  };

  const applyFontSize = (px) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
    // execCommand('fontSize') only understands the legacy 1–7 scale and
    // produces <font size="N"> — use 7 as a throwaway marker, then rewrite
    // whatever it wrapped into a real `style="font-size:Npx"` span so the
    // size is an exact pixel value, not one of seven browser presets.
    document.execCommand('fontSize', false, '7');
    el.querySelectorAll('font[size="7"]').forEach(node => {
      node.removeAttribute('size');
      node.style.fontSize = `${px}px`;
    });
    emitChange();
  };

  const insertTable = () => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    document.execCommand('insertHTML', false, buildTableHtml());
    emitChange();
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1.5px solid #e2e8f0', background: '#f8fafc' }}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5" style={{ borderBottom: '1.5px solid #e2e8f0', background: '#fff' }}>
        <ToolButton title="Gras" onClick={() => exec('bold')}><Bold className="h-3.5 w-3.5" /></ToolButton>
        <ToolButton title="Italique" onClick={() => exec('italic')}><Italic className="h-3.5 w-3.5" /></ToolButton>
        <ToolButton title="Souligné" onClick={() => exec('underline')}><Underline className="h-3.5 w-3.5" /></ToolButton>
        <div className="w-px h-5 mx-1" style={{ background: '#e2e8f0' }} />
        <ToolButton title="Liste à puces" onClick={() => exec('insertUnorderedList')}><List className="h-3.5 w-3.5" /></ToolButton>
        <ToolButton title="Liste numérotée" onClick={() => exec('insertOrderedList')}><ListOrdered className="h-3.5 w-3.5" /></ToolButton>
        <div className="w-px h-5 mx-1" style={{ background: '#e2e8f0' }} />
        <ToolButton title="Exposant (ex: x²)" onClick={() => exec('superscript')}><Superscript className="h-3.5 w-3.5" /></ToolButton>
        <ToolButton title="Indice (ex: H₂O)" onClick={() => exec('subscript')}><Subscript className="h-3.5 w-3.5" /></ToolButton>
        <div className="w-px h-5 mx-1" style={{ background: '#e2e8f0' }} />
        <ToolButton title="Effacer la mise en forme" onClick={() => exec('removeFormat')}><Eraser className="h-3.5 w-3.5" /></ToolButton>
        <div className="w-px h-5 mx-1" style={{ background: '#e2e8f0' }} />
        <select
          title="Taille de police"
          defaultValue=""
          onMouseDown={e => e.stopPropagation()}
          onChange={e => { if (e.target.value) applyFontSize(Number(e.target.value)); e.target.value = ''; }}
          className="h-8 rounded-lg text-xs font-semibold px-1.5 outline-none cursor-pointer"
          style={{ border: '1.5px solid #e2e8f0', color: '#64748b', background: '#fff' }}
        >
          <option value="" disabled>Taille</option>
          {FONT_SIZES.map(f => <option key={f.px} value={f.px}>{f.label} ({f.px}px)</option>)}
        </select>
        <ToolButton title="Insérer un tableau (3×3)" onClick={insertTable}><Table className="h-3.5 w-3.5" /></ToolButton>
        <div className="w-px h-5 mx-1" style={{ background: '#e2e8f0' }} />
        {SYMBOLS.map(s => (
          <button key={s} type="button" title={`Insérer ${s}`}
            onMouseDown={e => e.preventDefault()}
            onClick={() => insertSymbol(s)}
            className="h-8 min-w-8 px-1.5 rounded-lg text-sm font-semibold transition-colors"
            style={{ color: '#374151' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            {s}
          </button>
        ))}
      </div>

      {/* Editable area */}
      <div className="relative">
        {empty && placeholder && (
          <p className="absolute top-3 left-4 text-sm pointer-events-none" style={{ color: '#94a3b8' }}>{placeholder}</p>
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={emitChange}
          onBlur={emitChange}
          onFocus={onFocus}
          onMouseUp={trackSelection}
          onKeyUp={trackSelection}
          className="w-full px-4 py-3 text-sm outline-none"
          style={{ minHeight, lineHeight: 1.7, color: '#374151' }}
        />
      </div>
    </div>
  );
});

export default RichTextEditor;
