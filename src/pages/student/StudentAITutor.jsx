import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Plus, Trash2, Sparkles, X, MessageSquare } from 'lucide-react';
import useApi from '../../hooks/useApi';
import elearningService from '../../services/elearning';
import academicService from '../../services/academic';
import studentsService from '../../services/students';

const COLOR = '#6366f1';

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="h-7 w-7 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5"
          style={{ background: `linear-gradient(135deg, ${COLOR}, #8b5cf6)` }}>
          <Bot className="h-3.5 w-3.5 text-white" />
        </div>
      )}
      <div className="max-w-[80%] px-4 py-2.5 rounded-2xl text-sm"
        style={{
          background: isUser ? `linear-gradient(135deg, ${COLOR}, #8b5cf6)` : '#f8faff',
          color: isUser ? '#fff' : '#1e293b',
          border: isUser ? 'none' : '1.5px solid #e0e7ff',
          borderBottomRightRadius: isUser ? 4 : undefined,
          borderBottomLeftRadius: !isUser ? 4 : undefined,
        }}>
        <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{message.content}</p>
      </div>
    </div>
  );
}

function ChatWindow({ conversationId, onClose, onChanged }) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);

  const { data } = useApi(() => elearningService.getAIConversationById(conversationId), [conversationId], true);

  useEffect(() => {
    if (data?.messages) setMessages(data.messages);
  }, [data]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const content = input;
    const userMsg = { role: 'user', content, id: 'tmp-' + Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);
    try {
      const aiMsg = await elearningService.sendAIMessage(conversationId, content);
      setMessages(prev => [...prev, aiMsg]);
      onChanged?.();
    } catch {
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
    } finally { setSending(false); }
  };

  const handleClear = async () => {
    if (!confirm('Effacer tous les messages de cette conversation ?')) return;
    await elearningService.clearAIConversation(conversationId);
    setMessages([]);
  };

  if (!data) return <div className="flex items-center justify-center h-full text-sm text-gray-400">Chargement…</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="h-4 w-4 flex-shrink-0" style={{ color: COLOR }} />
          <span className="text-sm font-bold text-gray-900 truncate">{data.title || 'Assistant IA'}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={handleClear} className="text-xs font-semibold text-gray-400 hover:text-red-500 px-2 py-1">Effacer</button>
          <button onClick={onClose} className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 lg:hidden">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center py-10 text-gray-400">
            <Bot className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm font-semibold">Posez votre première question</p>
            <p className="text-xs mt-1">Votre tuteur IA vous répond instantanément</p>
          </div>
        )}
        {messages.map((m, i) => <MessageBubble key={m.id || i} message={m} />)}
        {sending && (
          <div className="flex justify-start mb-3">
            <div className="h-7 w-7 rounded-full flex items-center justify-center mr-2" style={{ background: `linear-gradient(135deg, ${COLOR}, #8b5cf6)` }}>
              <Bot className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-[#f8faff] border border-indigo-100">
              <span className="flex gap-1">{[0, 1, 2].map(i => <span key={i} className="h-2 w-2 rounded-full animate-bounce" style={{ background: COLOR, animationDelay: `${i * 0.15}s` }} />)}</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Posez votre question…"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            rows={2} className="flex-1 resize-none px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          <button onClick={handleSend} disabled={!input.trim() || sending}
            className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, ${COLOR}, #8b5cf6)` }}>
            <Send className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StudentAITutor() {
  const [activeConvId, setActiveConvId] = useState(null);
  const [newSubject, setNewSubject] = useState('');
  const [creating, setCreating] = useState(false);

  const { data: profile } = useApi(() => studentsService.getMe(), [], true);
  const classId = profile?.current_class?.id;
  const { data: cstData } = useApi(
    () => classId ? academicService.getClassSubjectTeachers({ class_obj: classId }) : Promise.resolve([]),
    [classId], !!classId
  );
  const cstList = cstData?.results ?? cstData ?? [];
  const subjects = Array.from(
    new Map(cstList.map(c => [c.subject, { id: c.subject, name: c.subject_name }])).values()
  );

  const { data, refetch } = useApi(() => elearningService.getAIConversations({ conv_type: 'TUTOR' }), [], true);
  const convs = data?.results ?? data ?? [];

  const handleNewConv = async () => {
    setCreating(true);
    try {
      const conv = await elearningService.createAIConversation({ conv_type: 'TUTOR', subject: newSubject || null });
      refetch();
      setActiveConvId(conv.id);
    } catch {} finally { setCreating(false); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Supprimer cette conversation ?')) return;
    await elearningService.deleteAIConversation(id);
    if (activeConvId === id) setActiveConvId(null);
    refetch();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles style={{ color: COLOR }} size={22} /> Tuteur IA
        </h1>
        <p className="text-sm text-gray-500 mt-1">Posez vos questions, demandez des explications, révisez vos cours</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ height: 600 }}>
        <div className="space-y-3 flex flex-col h-full">
          <div className="rounded-2xl p-3 space-y-2 bg-white border border-gray-100 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: COLOR }}>Nouvelle conversation</p>
            <select value={newSubject} onChange={e => setNewSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs cursor-pointer">
              <option value="">Matière (optionnel)</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button onClick={handleNewConv} disabled={creating}
              className="w-full py-2 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${COLOR}, #8b5cf6)` }}>
              <Plus className="h-3.5 w-3.5" />{creating ? 'Création…' : 'Démarrer'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 bg-white border border-gray-100 rounded-2xl shadow-sm p-2">
            {convs.length === 0 && <p className="text-xs text-center py-6 text-gray-400">Aucune conversation</p>}
            {convs.map(c => (
              <button key={c.id} onClick={() => setActiveConvId(c.id)}
                className="w-full flex items-center gap-2 p-2.5 rounded-xl text-left transition-all group"
                style={{ background: activeConvId === c.id ? `${COLOR}11` : 'transparent', border: `1.5px solid ${activeConvId === c.id ? COLOR : 'transparent'}` }}>
                <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${COLOR}22` }}>
                  <MessageSquare className="h-3.5 w-3.5" style={{ color: COLOR }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate text-gray-900">{c.title || 'Nouvelle conversation'}</p>
                  <p className="text-[10px] text-gray-400">{c.message_count} message{c.message_count !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={e => handleDelete(c.id, e)} className="h-5 w-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-red-500">
                  <Trash2 className="h-3 w-3" />
                </button>
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm h-full">
          {activeConvId ? (
            <ChatWindow conversationId={activeConvId} onClose={() => setActiveConvId(null)} onChanged={refetch} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <Bot className="h-12 w-12 mb-3 opacity-20" style={{ color: COLOR }} />
              <p className="text-sm font-semibold text-gray-400">Sélectionnez ou créez une conversation</p>
              <p className="text-xs mt-1 text-gray-300">Votre tuteur IA vous aide à comprendre vos cours</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
