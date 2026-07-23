import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  Bold, Italic, Underline, List, ListOrdered, Superscript, Subscript, Eraser,
} from 'lucide-react';

// Basic arithmetic first (some students look for these on the toolbar even
// though they're on the keyboard — one less reason to go hunting for a key),
// then the symbols that actually aren't on a standard keyboard.
const SYMBOLS = [
  '+', '-', '=', '(', ')', '/',
  '√', '±', '×', '÷', '≤', '≥', '≠', '∞', 'π', 'Δ', '∑', '∫', '°', '½', '¼',
];

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
const RichTextEditor = forwardRef(function RichTextEditor({ initialValue = '', onChange, placeholder }, forwardedRef) {
  const ref = useRef(null);
  const initialized = useRef(false);
  const [empty, setEmpty] = useState(!initialValue || initialValue === '<br>');

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
          className="w-full px-4 py-3 text-sm outline-none"
          style={{ minHeight: 260, lineHeight: 1.7, color: '#374151' }}
        />
      </div>
    </div>
  );
});

export default RichTextEditor;
