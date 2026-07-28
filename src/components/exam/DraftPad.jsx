import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, NotebookPen, Sigma } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

// Reference sheet only — not exhaustive by subject, but covers the formulas
// students most often need to work out a numeric answer by hand (business/
// general exams): percentages, algebra, geometry, statistics, and the
// finance/commerce formulas specific to this school's programs.
const FORMULA_GROUPS = [
  {
    title: 'Pourcentages',
    items: [
      'Taux (%) = (Valeur partielle ÷ Valeur totale) × 100',
      'Valeur partielle = Total × (Taux ÷ 100)',
      'Variation (%) = ((Nouvelle valeur − Ancienne valeur) ÷ Ancienne valeur) × 100',
    ],
  },
  {
    title: 'Algèbre',
    items: [
      '(a + b)² = a² + 2ab + b²',
      '(a − b)² = a² − 2ab + b²',
      '(a + b)(a − b) = a² − b²',
      'ax² + bx + c = 0  →  Δ = b² − 4ac  ;  x = (−b ± √Δ) ÷ 2a',
    ],
  },
  {
    title: 'Géométrie',
    items: [
      'Rectangle — Aire = L × l  ;  Périmètre = 2(L + l)',
      'Carré — Aire = c²  ;  Périmètre = 4c',
      'Triangle — Aire = (base × hauteur) ÷ 2',
      'Cercle — Aire = πr²  ;  Circonférence = 2πr',
      'Pavé droit — Volume = L × l × h',
      'Cube — Volume = c³',
      'Pythagore — a² + b² = c² (c = hypoténuse)',
    ],
  },
  {
    title: 'Statistiques',
    items: [
      'Moyenne = Somme des valeurs ÷ Effectif total',
      'Médiane = valeur centrale d\'une série ordonnée',
      'Variance = Σ(xi − moyenne)² ÷ n',
      'Écart-type = √Variance',
    ],
  },
  {
    title: 'Finance & Commerce',
    items: [
      'Intérêts simples — I = C × t × n ÷ 100 (C = capital, t = taux annuel %, n = durée en années)',
      'Intérêts composés — Cn = C0 × (1 + t)ⁿ',
      'Prix TTC = Prix HT × (1 + taux de TVA)',
      'Prix HT = Prix TTC ÷ (1 + taux de TVA)',
      'Marge brute = Prix de vente HT − Coût d\'achat HT',
      'Taux de marge (%) = (Marge ÷ Coût d\'achat) × 100',
      'Taux de marque (%) = (Marge ÷ Prix de vente) × 100',
      'Coefficient multiplicateur = Prix de vente TTC ÷ Prix d\'achat HT',
    ],
  },
  {
    title: 'Trigonométrie',
    items: [
      'sin(θ) = côté opposé ÷ hypoténuse',
      'cos(θ) = côté adjacent ÷ hypoténuse',
      'tan(θ) = côté opposé ÷ côté adjacent = sin(θ) ÷ cos(θ)',
    ],
  },
];

/**
 * A scratch pad shown next to the calculator — a WYSIWYG area for working out
 * an answer (rough notes, intermediate steps) plus a formula reference sheet,
 * both purely local: never part of the graded submission, never sent to the
 * server. Persisted to localStorage per exam session so it survives an
 * accidental reload the same way the real answer draft does.
 */
export default function DraftPad({ examId, onClose }) {
  const storageKey = `examDraftPad_${examId || 'session'}`;
  const [tab, setTab] = useState('notes');
  const [initialNotes] = useState(() => {
    try { return localStorage.getItem(storageKey) || ''; } catch { return ''; }
  });
  const editorRef = useRef(null);

  const handleChange = (html) => {
    try { localStorage.setItem(storageKey, html); } catch { /* storage unavailable — draft just won't survive a reload */ }
  };

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[9999] w-[26rem] max-w-[calc(100vw-3rem)] rounded-2xl overflow-hidden flex flex-col"
         style={{ background: '#fff', boxShadow: '0 12px 40px rgba(0,0,0,0.25)', border: '1.5px solid #e2e8f0', maxHeight: '75vh' }}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ background: 'linear-gradient(135deg,#0891b2,#0e7490)' }}>
        <div className="flex items-center gap-2">
          <NotebookPen className="h-4 w-4 text-white" />
          <span className="text-sm font-bold text-white">Brouillon</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'rgba(255,255,255,0.8)' }}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-1 px-3 pt-2 flex-shrink-0" style={{ borderBottom: '1.5px solid #f1f5f9' }}>
        {[
          { id: 'notes', label: 'Mes notes', icon: NotebookPen },
          { id: 'formulas', label: 'Formules', icon: Sigma },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-lg transition-colors"
            style={{
              color: tab === t.id ? '#0e7490' : '#94a3b8',
              background: tab === t.id ? '#ecfeff' : 'transparent',
              borderBottom: tab === t.id ? '2px solid #0891b2' : '2px solid transparent',
            }}>
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      <div className="p-3 overflow-y-auto">
        {tab === 'notes' ? (
          <>
            <p className="text-[11px] mb-2" style={{ color: '#94a3b8' }}>
              Espace personnel pour poser vos calculs ou organiser vos idées — jamais transmis ni noté,
              uniquement visible par vous.
            </p>
            <RichTextEditor
              ref={editorRef}
              initialValue={initialNotes}
              onChange={handleChange}
              placeholder="Notez vos calculs, votre plan de réponse..."
              minHeight={220}
            />
          </>
        ) : (
          <div className="space-y-4">
            {FORMULA_GROUPS.map(group => (
              <div key={group.title}>
                <p className="text-[11px] font-black uppercase tracking-wide mb-1.5" style={{ color: '#0e7490' }}>{group.title}</p>
                <ul className="space-y-1">
                  {group.items.map(item => (
                    <li key={item} className="text-xs leading-relaxed rounded-lg px-2.5 py-1.5"
                        style={{ background: '#f8fafc', color: '#334155' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
