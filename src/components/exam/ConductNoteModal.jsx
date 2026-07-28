import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageCircle, Send, CheckCircle } from 'lucide-react';
import elearningService from '../../services/elearning';

/**
 * Lets the student explain, in their own words, anything unusual about their
 * own behavior during the exam (had to stand up, a noise, a brief absence…)
 * — logged server-side as a plain `CONDUCT_NOTE` event on the exam session
 * (same generic `log-event` endpoint the anti-cheat itself uses, see
 * ExamSession.log_event on the backend), purely for the teacher's own
 * judgment during correction. Never auto-flags, never affects grading or
 * the anti-cheat pipeline on its own — just a note left for the record,
 * shown next to "Captures" in the teacher's correction screen.
 */
export default function ConductNoteModal({ examId, onClose }) {
  const [text, setText] = useState('');
  const [notes, setNotes] = useState([]); // sent this session: [{ text, at }]
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    const value = text.trim();
    if (!value) return;
    setSending(true);
    setError('');
    try {
      await elearningService.logExamEvent(examId, 'CONDUCT_NOTE', value);
      setNotes(n => [...n, { text: value, at: new Date() }]);
      setText('');
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch {
      setError('Erreur lors de l\'envoi — réessayez.');
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[9999] w-[26rem] max-w-[calc(100vw-3rem)] rounded-2xl overflow-hidden flex flex-col"
         style={{ background: '#fff', boxShadow: '0 12px 40px rgba(0,0,0,0.25)', border: '1.5px solid #e2e8f0', maxHeight: '75vh' }}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-white" />
          <span className="text-sm font-bold text-white">Conduite</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'rgba(255,255,255,0.8)' }}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-3 overflow-y-auto">
        <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
          Expliquez ici toute situation particulière pendant l'examen (par exemple : vous avez dû vous lever, un
          bruit, une coupure de connexion…). Votre enseignant pourra lire ce message lors de la correction.
        </p>

        {notes.length > 0 && (
          <div className="space-y-2">
            {notes.map((n, i) => (
              <div key={i} className="rounded-xl p-3 text-xs" style={{ background: '#fffbeb', color: '#78350f' }}>
                <p className="leading-relaxed">{n.text}</p>
                <p className="text-[10px] mt-1 opacity-60">Envoyé à {n.at.toLocaleTimeString('fr-FR')}</p>
              </div>
            ))}
          </div>
        )}

        <textarea value={text} onChange={e => setText(e.target.value)}
                  placeholder="Décrivez la situation…" rows={4}
                  className="w-full px-3 py-2 rounded-xl text-sm border outline-none resize-none"
                  style={{ borderColor: '#e2e8f0' }} />

        {error && <p className="text-xs font-semibold" style={{ color: '#dc2626' }}>{error}</p>}

        <button onClick={handleSend} disabled={!text.trim() || sending}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
                style={{ background: sent ? 'linear-gradient(135deg,#059669,#047857)' : 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
          {sending
            ? <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            : sent ? <CheckCircle className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          {sending ? 'Envoi…' : sent ? 'Envoyé ✓' : 'Envoyer à l\'enseignant'}
        </button>
      </div>
    </div>,
    document.body
  );
}
