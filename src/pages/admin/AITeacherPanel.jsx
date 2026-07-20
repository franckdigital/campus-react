import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Plus, Trash2, Sparkles, FileText, ClipboardList, BookOpen, X, ChevronDown } from 'lucide-react';
import { elearningService } from '../../services';
import { useApi } from '../../hooks/useApi';
import { useNotifications } from '../../components/Notifications';
import { useConfirm } from '../../components/ConfirmDialog';

const COLOR = '#7c3aed';

const CONV_TYPES = [
  { value: 'TEACHER', label: 'Assistant enseignant', icon: Bot, color: '#7c3aed', desc: 'Aide à la création de cours, explications, réponses pédagogiques' },
  { value: 'CONTENT', label: 'Génération de contenu', icon: FileText, color: '#059669', desc: 'Créer des cours structurés, plans, diapositives' },
  { value: 'QUIZ_GEN', label: 'Générer un quiz', icon: ClipboardList, color: '#d97706', desc: 'Générer des questions à partir d\'un thème ou d\'un cours' },
  { value: 'SUMMARY', label: 'Résumer un cours', icon: BookOpen, color: '#0ea5e9', desc: 'Résumé automatique, fiches, flashcards' },
];

const GENERATE_TYPES = [
  { value: 'quiz', label: 'Quiz (JSON)', desc: 'Questions prêtes à importer' },
  { value: 'summary', label: 'Résumé de cours', desc: 'Synthèse structurée' },
  { value: 'flashcards', label: 'Flashcards', desc: 'Cartes mémo recto/verso' },
  { value: 'plan', label: 'Plan de cours', desc: 'Structure pédagogique' },
  { value: 'slides', label: 'Plan de slides', desc: 'Structure de présentation' },
  { value: 'exam', label: 'Examen complet', desc: 'Questions + barème' },
  { value: 'rubric', label: 'Barème de correction', desc: 'Critères détaillés' },
  { value: 'feedback', label: 'Commentaire de correction', desc: 'Feedback pédagogique' },
];

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="h-7 w-7 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5" style={{ background: `linear-gradient(135deg, ${COLOR}, #9333ea)` }}>
          <Bot className="h-3.5 w-3.5 text-white" />
        </div>
      )}
      <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm`}
        style={{
          background: isUser ? `linear-gradient(135deg, ${COLOR}, #9333ea)` : '#f8faff',
          color: isUser ? '#fff' : '#1e293b',
          border: isUser ? 'none' : '1.5px solid #e0e7ff',
          borderBottomRightRadius: isUser ? 4 : undefined,
          borderBottomLeftRadius: !isUser ? 4 : undefined,
        }}>
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{message.content}</pre>
        {message.tokens_used > 0 && <p className="text-[10px] mt-1 opacity-60">{message.tokens_used} tokens</p>}
      </div>
    </div>
  );
}

function ConversationWindow({ conversationId, onClose }) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);
  const { notify } = useNotifications();

  const { data } = useApi(() => elearningService.getAIConversationById(conversationId), [conversationId], true);

  useEffect(() => {
    if (data?.messages) setMessages(data.messages);
  }, [data]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const userMsg = { role: 'user', content: input, id: 'tmp-' + Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);
    try {
      const aiMsg = await elearningService.sendAIMessage(conversationId, input);
      setMessages(prev => [...prev.filter(m => m.id !== userMsg.id), { role: 'user', content: input, id: userMsg.id }, aiMsg]);
    } catch (err) {
      notify({ type: 'error', title: 'Erreur IA', message: err.message || 'Erreur de communication' });
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
    } finally { setSending(false); }
  };

  if (!data) return <div className="flex items-center justify-center h-64 text-sm" style={{ color: '#94a3b8' }}>Chargement…</div>;

  return (
    <div className="flex flex-col h-[500px]">
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid #f1f5f9' }}>
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4" style={{ color: COLOR }} />
          <span className="text-sm font-bold" style={{ color: '#0f172a' }}>{data.title || data.conv_type_label}</span>
        </div>
        <button onClick={onClose} className="h-6 w-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"><X className="h-3.5 w-3.5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center py-8" style={{ color: '#94a3b8' }}>
            <Bot className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm font-semibold">Posez votre première question</p>
            <p className="text-xs mt-1">L'IA vous répondra instantanément</p>
          </div>
        )}
        {messages.map((m, i) => <MessageBubble key={m.id || i} message={m} />)}
        {sending && (
          <div className="flex justify-start mb-3">
            <div className="h-7 w-7 rounded-full flex items-center justify-center mr-2" style={{ background: `linear-gradient(135deg, ${COLOR}, #9333ea)` }}>
              <Bot className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="px-4 py-2.5 rounded-2xl" style={{ background: '#f8faff', border: '1.5px solid #e0e7ff' }}>
              <span className="flex gap-1">{[0,1,2].map(i => <span key={i} className="h-2 w-2 rounded-full animate-bounce" style={{ background: COLOR, animationDelay: `${i * 0.15}s` }} />)}</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Posez votre question…"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            rows={2} className="input-field resize-none flex-1" style={{ fontSize: '0.875rem' }} />
          <button onClick={handleSend} disabled={!input.trim() || sending}
            className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-all"
            style={{ background: `linear-gradient(135deg, ${COLOR}, #9333ea)`, boxShadow: `0 4px 14px ${COLOR}40` }}>
            <Send className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

function GeneratePanel() {
  const [genType, setGenType] = useState('quiz');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const { notify } = useNotifications();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true); setResult('');
    try {
      const res = await elearningService.aiGenerate({ generate_type: genType, prompt });
      setResult(res.result || '');
    } catch (err) { notify({ type: 'error', title: 'Erreur IA', message: err.message || 'Erreur de génération' }); }
    finally { setLoading(false); }
  };

  const selected = GENERATE_TYPES.find(g => g.value === genType);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {GENERATE_TYPES.map(g => (
          <button key={g.value} onClick={() => setGenType(g.value)}
            className="p-3 rounded-xl text-left transition-all"
            style={{ background: genType === g.value ? `linear-gradient(135deg, ${COLOR}22, ${COLOR}11)` : '#f8faff', border: `1.5px solid ${genType === g.value ? COLOR : '#e2e8f0'}`, color: genType === g.value ? COLOR : '#475569' }}>
            <p className="text-xs font-bold">{g.label}</p>
            <p className="text-[10px] mt-0.5 opacity-70">{g.desc}</p>
          </button>
        ))}
      </div>
      <div>
        <label className="block mb-1.5 text-xs font-bold uppercase tracking-wide" style={{ color: '#475569' }}>
          Instructions pour "{selected?.label}"
        </label>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} className="input-field resize-none"
          placeholder={`Ex: Génère un quiz de 10 questions sur les algorithmes de tri en Python, niveau L2...`} />
      </div>
      <button onClick={handleGenerate} disabled={!prompt.trim() || loading}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40"
        style={{ background: `linear-gradient(135deg, ${COLOR}, #9333ea)`, boxShadow: `0 4px 14px ${COLOR}40` }}>
        {loading ? <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Génération en cours…</> : <><Sparkles className="h-4 w-4" />Générer</>}
      </button>
      {result && (
        <div className="rounded-xl p-4" style={{ background: '#f8faff', border: '1.5px solid #e0e7ff' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: COLOR }}>Résultat généré</p>
            <button onClick={() => navigator.clipboard.writeText(result)} className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: '#ede9fe', color: COLOR }}>Copier</button>
          </div>
          <pre className="text-xs whitespace-pre-wrap" style={{ color: '#1e293b', maxHeight: 400, overflowY: 'auto' }}>{result}</pre>
        </div>
      )}
    </div>
  );
}

export default function AITeacherPanel({ subjectsList = [], lessons = [], notify }) {
  const [activeMode, setActiveMode] = useState('chat');
  const [activeConvId, setActiveConvId] = useState(null);
  const [newConvType, setNewConvType] = useState('TEACHER');
  const [newConvSubject, setNewConvSubject] = useState('');
  const [creating, setCreating] = useState(false);
  const confirm = useConfirm();

  const { data, refetch } = useApi(() => elearningService.getAIConversations(), [], true);
  const convs = data?.results || data || [];

  const handleNewConv = async () => {
    setCreating(true);
    try {
      const conv = await elearningService.createAIConversation({
        conv_type: newConvType,
        subject: newConvSubject || null,
      });
      refetch();
      setActiveConvId(conv.id);
    } catch (err) { notify({ type: 'error', title: 'Erreur', message: err.message || 'Erreur' }); }
    finally { setCreating(false); }
  };

  const handleDeleteConv = async (id, e) => {
    e.stopPropagation();
    if (!await confirm({ title: 'Supprimer cette conversation ?', message: 'Cette action est irréversible.', confirmLabel: 'Supprimer', destructive: true })) return;
    await elearningService.deleteAIConversation(id);
    if (activeConvId === id) setActiveConvId(null);
    refetch();
  };

  return (
    <div className="space-y-4">
      {/* Mode tabs */}
      <div className="flex gap-2 flex-wrap">
        {[{ id: 'chat', label: 'Chat IA', icon: Bot }, { id: 'generate', label: 'Génération rapide', icon: Sparkles }].map(m => (
          <button key={m.id} onClick={() => setActiveMode(m.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: activeMode === m.id ? `linear-gradient(135deg, ${COLOR}22, ${COLOR}11)` : '#f8faff', border: `1.5px solid ${activeMode === m.id ? COLOR : '#e2e8f0'}`, color: activeMode === m.id ? COLOR : '#64748b' }}>
            <m.icon className="h-4 w-4" />{m.label}
          </button>
        ))}
      </div>

      {activeMode === 'generate' ? <GeneratePanel /> : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sidebar: conversation list */}
          <div className="space-y-3">
            <div className="rounded-xl p-3 space-y-2" style={{ background: '#f8faff', border: '1.5px solid #e0e7ff' }}>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: COLOR }}>Nouvelle conversation</p>
              <select value={newConvType} onChange={e => setNewConvType(e.target.value)} className="input-field cursor-pointer text-xs">
                {CONV_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <select value={newConvSubject} onChange={e => setNewConvSubject(e.target.value)} className="input-field cursor-pointer text-xs">
                <option value="">Matière (optionnel)</option>
                {subjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button onClick={handleNewConv} disabled={creating}
                className="w-full py-2 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${COLOR}, #9333ea)` }}>
                <Plus className="h-3.5 w-3.5" />{creating ? 'Création…' : 'Démarrer'}
              </button>
            </div>

            <div className="space-y-1">
              {convs.length === 0 && <p className="text-xs text-center py-4" style={{ color: '#94a3b8' }}>Aucune conversation</p>}
              {convs.map(c => (
                <button key={c.id} onClick={() => setActiveConvId(c.id)}
                  className="w-full flex items-center gap-2 p-2.5 rounded-xl text-left transition-all"
                  style={{ background: activeConvId === c.id ? `${COLOR}11` : 'transparent', border: `1.5px solid ${activeConvId === c.id ? COLOR : 'transparent'}` }}>
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${COLOR}22` }}>
                    <Bot className="h-3.5 w-3.5" style={{ color: COLOR }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: '#0f172a' }}>{c.title || c.conv_type_label}</p>
                    <p className="text-[10px]" style={{ color: '#94a3b8' }}>{c.message_count} message{c.message_count !== 1 ? 's' : ''}</p>
                  </div>
                  <button onClick={e => handleDeleteConv(c.id, e)} className="h-5 w-5 rounded flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity flex-shrink-0" style={{ color: '#ef4444' }}>
                    <Trash2 className="h-3 w-3" />
                  </button>
                </button>
              ))}
            </div>
          </div>

          {/* Chat window */}
          <div className="lg:col-span-2 rounded-xl overflow-hidden" style={{ border: '1.5px solid #e0e7ff', background: '#fff' }}>
            {activeConvId ? (
              <ConversationWindow conversationId={activeConvId} onClose={() => setActiveConvId(null)} />
            ) : (
              <div className="flex flex-col items-center justify-center h-64">
                <Bot className="h-12 w-12 mb-3 opacity-20" style={{ color: COLOR }} />
                <p className="text-sm font-semibold" style={{ color: '#94a3b8' }}>Sélectionnez ou créez une conversation</p>
                <p className="text-xs mt-1" style={{ color: '#cbd5e1' }}>L'IA vous aide à créer des cours, quiz, examens…</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
