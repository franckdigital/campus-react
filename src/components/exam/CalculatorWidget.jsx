import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calculator as CalculatorIcon, CornerDownLeft } from 'lucide-react';
import { evaluateExpression } from '../../utils/safeCalculator';

const KEYS = [
  ['7', '8', '9', '÷'],
  ['4', '5', '6', '×'],
  ['1', '2', '3', '-'],
  ['0', '.', '(', ')'],
  ['%', '^', 'sqrt(', '+'],
];

/**
 * A real, built-in calculator rendered inside the exam page itself — never a
 * separate window/app. This is deliberate: the proctoring system (webcam
 * object detection + focus/blur tab-switch tracking, see useAntiCheat and
 * examProctoring.js) can't tell a physical calculator apart from a phone
 * held up to the camera, and alt-tabbing to an OS calculator app is itself
 * flagged as a tab switch. Giving students a calculator that lives in the
 * same DOM/tab sidesteps both false-positive paths entirely instead of
 * trying to make the AI "recognize" a calculator, which isn't reliable.
 */
export default function CalculatorWidget({ onClose, onInsert }) {
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const press = (key) => {
    setError('');
    setResult(null);
    setExpr(prev => prev + key);
  };

  const clear = () => { setExpr(''); setResult(null); setError(''); };
  const backspace = () => { setExpr(prev => prev.slice(0, -1)); setResult(null); setError(''); };

  const compute = () => {
    try {
      const value = evaluateExpression(expr);
      const rounded = Math.round(value * 1e10) / 1e10; // trim float noise
      setResult(rounded);
      setError('');
    } catch (e) {
      setError(e.message || 'Expression invalide');
      setResult(null);
    }
  };

  const insert = () => {
    if (result === null) return;
    onInsert?.(`${expr} = ${result}`);
  };

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[9999] w-72 rounded-2xl overflow-hidden"
         style={{ background: '#fff', boxShadow: '0 12px 40px rgba(0,0,0,0.25)', border: '1.5px solid #e2e8f0' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
        <div className="flex items-center gap-2">
          <CalculatorIcon className="h-4 w-4 text-white" />
          <span className="text-sm font-bold text-white">Calculatrice</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'rgba(255,255,255,0.8)' }}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3 space-y-2">
        <div className="rounded-xl px-3 py-2.5" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', minHeight: 56 }}>
          <p className="text-sm font-mono break-all" style={{ color: '#1e293b' }}>{expr || <span style={{ color: '#cbd5e1' }}>0</span>}</p>
          {result !== null && <p className="text-lg font-black mt-1" style={{ color: '#059669' }}>= {result}</p>}
          {error && <p className="text-xs font-semibold mt-1" style={{ color: '#dc2626' }}>{error}</p>}
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {KEYS.flat().map(k => (
            <button key={k} onClick={() => press(k)}
              className="h-10 rounded-lg text-sm font-bold transition-colors"
              style={{ background: '#f1f5f9', color: '#334155' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; }}>
              {k}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button onClick={backspace} className="h-9 rounded-lg text-xs font-bold" style={{ background: '#fef3c7', color: '#92400e' }}>⌫ Effacer 1</button>
          <button onClick={clear} className="h-9 rounded-lg text-xs font-bold" style={{ background: '#fee2e2', color: '#991b1b' }}>C Tout effacer</button>
        </div>

        <button onClick={compute}
          className="w-full h-10 rounded-xl text-sm font-black text-white"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
          = Calculer
        </button>

        {onInsert && (
          <button onClick={insert} disabled={result === null}
            className="w-full h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40"
            style={{ background: '#d1fae5', color: '#047857' }}>
            <CornerDownLeft className="h-3.5 w-3.5" /> Insérer dans ma réponse
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}
