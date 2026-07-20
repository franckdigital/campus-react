import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Minus, ChevronUp, Bot } from 'lucide-react';
import landingService from '../../services/landing';

// Floating FAQ chat widget for the public vitrines — plain keyword-matched
// answers (apps.landing.AIKeywordResponse), no real LLM, no persistence.
// Structural port of plateforme-travail/frontend's ChatbotWidget.tsx.
const SUGGESTIONS = [
  'Quelles sont les filières proposées ?',
  "Quels sont les frais d'inscription ?",
  'Comment puis-je vous contacter ?',
];

let messageId = 0;
const nextId = () => ++messageId;

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [messages, setMessages] = useState([
    { id: nextId(), role: 'bot', content: 'Bonjour ! Comment puis-je vous aider aujourd\'hui ?', time: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setIsOpen(true), 3000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, isOpen, isMinimized]);

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { id: nextId(), role: 'user', content: trimmed, time: new Date() }]);
    setInput('');
    setLoading(true);

    try {
      const res = await landingService.askAI(trimmed);
      const answer = res?.answer || "Merci pour votre question, je n'ai pas de réponse précise pour le moment.";
      setMessages((prev) => [...prev, { id: nextId(), role: 'bot', content: answer, time: new Date() }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: nextId(), role: 'bot',
        content: "Désolé, une erreur est survenue. Veuillez réessayer ou nous contacter directement.",
        time: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => { setIsOpen(true); setIsMinimized(false); }}
        className="fixed bottom-6 right-6 z-50 group"
        title="Besoin d'aide ? Discutez avec nous"
      >
        <div className="relative">
          <div className="h-14 w-14 rounded-full flex items-center justify-center text-white shadow-xl transition-transform group-hover:scale-110"
               style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 8px 24px rgba(249,115,22,0.4)' }}>
            <MessageCircle className="h-6 w-6" />
          </div>
          <span className="absolute top-0 right-0 h-3.5 w-3.5 rounded-full bg-green-400 border-2 border-white animate-pulse" />
        </div>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden flex flex-col"
         style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.25)', background: '#fff' }}>
      {/* Header — clickable to expand when minimized */}
      <div className={`flex items-center justify-between px-4 py-3 flex-shrink-0 ${isMinimized ? 'cursor-pointer' : ''}`}
           style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
           onClick={() => { if (isMinimized) setIsMinimized(false); }}>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Assistant</p>
            <p className="text-[11px] flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
              <span className="h-1.5 w-1.5 rounded-full bg-green-300" /> En ligne
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setIsMinimized((prev) => !prev); }}
            title={isMinimized ? 'Agrandir' : 'Réduire'}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            {isMinimized ? <ChevronUp className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
            title="Fermer"
            className="h-7 w-7 rounded-lg flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-h-72" style={{ background: '#f8fafc' }}>
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${m.role === 'user' ? 'text-white' : ''}`}
                     style={m.role === 'user'
                       ? { background: 'linear-gradient(135deg, #f97316, #ea580c)' }
                       : { background: '#fff', color: '#1e293b', border: '1px solid #f1f5f9' }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-3 flex gap-1" style={{ background: '#fff', border: '1px solid #f1f5f9' }}>
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-1.5 w-1.5 rounded-full animate-bounce"
                          style={{ background: '#cbd5e1', animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {messages.length === 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-2" style={{ background: '#f8fafc' }}>
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-1.5 rounded-full transition-colors"
                  style={{ background: '#fff', color: '#ea580c', border: '1px solid #fed7aa' }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 p-3 flex-shrink-0" style={{ borderTop: '1px solid #f1f5f9', background: '#fff' }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Écrivez votre question…"
              className="flex-1 text-sm rounded-xl px-3.5 py-2.5 outline-none disabled:opacity-60"
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="h-10 w-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40 transition-transform hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
              <Send className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
