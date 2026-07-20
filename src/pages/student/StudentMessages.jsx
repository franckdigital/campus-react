import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Send, Search, Plus, X, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import messagesService from '../../services/messages';

function Avatar({ name, color = '#6366f1', bg = '#eef2ff', size = 9 }) {
  const initials = (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className={`h-${size} w-${size} rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0`}
         style={{ background: bg, color }}>
      {initials}
    </div>
  );
}

const COLORS = ['#6366f1', '#0891b2', '#059669', '#d97706', '#db2777', '#7c3aed'];
function colorFor(str) {
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  const c = COLORS[Math.abs(h) % COLORS.length];
  return { color: c, bg: c + '22' };
}

function timeLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export default function StudentMessages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      setLoadingConvs(true);
      const res = await messagesService.getConversations();
      const data = Array.isArray(res) ? res : (res.results || []);
      setConversations(data);
      if (data.length > 0 && !activeConv) setActiveConv(data[0]);
    } catch {}
    finally { setLoadingConvs(false); }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!activeConv) return;
    let cancelled = false;
    (async () => {
      setLoadingMsgs(true);
      try {
        const res = await messagesService.getMessages(activeConv.id);
        if (!cancelled) {
          setMessages(Array.isArray(res) ? res : (res.results || []));
          await messagesService.markRead(activeConv.id);
          setConversations(prev =>
            prev.map(c => c.id === activeConv.id ? { ...c, unread_count: 0 } : c)
          );
        }
      } catch {}
      finally { if (!cancelled) setLoadingMsgs(false); }
    })();
    return () => { cancelled = true; };
  }, [activeConv?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !activeConv || sending) return;
    setSending(true);
    try {
      const msg = await messagesService.sendMessage(activeConv.id, text);
      setMessages(prev => [...prev, msg]);
      setDraft('');
      setConversations(prev =>
        prev.map(c => c.id === activeConv.id
          ? { ...c, last_message_preview: text, last_message_at: new Date().toISOString() }
          : c
        ).sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at))
      );
    } catch {}
    finally { setSending(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const openNewModal = async () => {
    setShowNewModal(true);
    setContactSearch('');
    try {
      const res = await messagesService.getContacts();
      setContacts(Array.isArray(res) ? res : (res.results || []));
    } catch { setContacts([]); }
  };

  const startWith = async (contact) => {
    setShowNewModal(false);
    try {
      const conv = await messagesService.startConversation(contact.id);
      setConversations(prev => {
        const exists = prev.find(c => c.id === conv.id);
        if (exists) return prev;
        return [conv, ...prev];
      });
      setActiveConv(conv);
    } catch {}
  };

  const filteredConvs = conversations.filter(c =>
    (c.other_user?.full_name || '').toLowerCase().includes(search.toLowerCase())
  );
  const filteredContacts = contacts.filter(c =>
    c.full_name.toLowerCase().includes(contactSearch.toLowerCase())
  );
  const otherUser = activeConv?.other_user;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold" style={{ color: '#0f172a' }}>Messages</h1>
          <p className="text-sm" style={{ color: '#64748b' }}>Messagerie interne</p>
        </div>
        <button onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: '#db2777' }}>
          <Plus className="h-4 w-4" />
          Nouveau message
        </button>
      </div>

      <div className="card overflow-hidden" style={{ height: '72vh', display: 'flex' }}>
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 flex flex-col" style={{ borderRight: '1px solid #f1f5f9' }}>
          <div className="p-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#f8fafc' }}>
              <Search className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#94a3b8' }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                     placeholder="Rechercher..." className="flex-1 bg-transparent text-xs outline-none"
                     style={{ color: '#1e293b' }} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="h-5 w-5 animate-spin" style={{ color: '#94a3b8' }} />
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <MessageSquare className="h-8 w-8" style={{ color: '#cbd5e1' }} />
                <p className="text-xs text-center px-4" style={{ color: '#94a3b8' }}>
                  {search ? 'Aucun résultat' : 'Aucune conversation.\nCliquez sur "Nouveau message".'}
                </p>
              </div>
            ) : filteredConvs.map(conv => {
              const other = conv.other_user;
              const { color, bg } = colorFor(other?.full_name);
              const isActive = activeConv?.id === conv.id;
              return (
                <button key={conv.id} onClick={() => setActiveConv(conv)}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
                  style={{ background: isActive ? '#f8fafc' : 'transparent', borderBottom: '1px solid #f8fafc' }}>
                  <Avatar name={other?.full_name} color={color} bg={bg} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-semibold truncate" style={{ color: '#1e293b' }}>
                        {other?.full_name || 'Inconnu'}
                      </p>
                      <span className="text-[10px] flex-shrink-0 ml-2" style={{ color: '#94a3b8' }}>
                        {timeLabel(conv.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs truncate" style={{ color: '#94a3b8' }}>
                        {conv.last_message_preview || 'Démarrer la conversation…'}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="h-4 w-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ml-2"
                              style={{ background: '#db2777' }}>
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat */}
        {activeConv && otherUser ? (
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
                 style={{ borderBottom: '1px solid #f1f5f9' }}>
              <Avatar name={otherUser.full_name} {...colorFor(otherUser.full_name)} size={8} />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>{otherUser.full_name}</p>
                <p className="text-xs capitalize" style={{ color: '#94a3b8' }}>
                  {otherUser.user_type === 'ADMIN' ? 'Administration' :
                   otherUser.user_type === 'TEACHER' ? 'Enseignant' : otherUser.user_type}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full">
                  <Loader className="h-5 w-5 animate-spin" style={{ color: '#94a3b8' }} />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <MessageSquare className="h-8 w-8" style={{ color: '#cbd5e1' }} />
                  <p className="text-sm" style={{ color: '#94a3b8' }}>Aucun message. Démarrez la conversation !</p>
                </div>
              ) : messages.map(msg => {
                const isMe = msg.sender_id === String(user?.id);
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-xs lg:max-w-sm">
                      <div className="px-3.5 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words"
                           style={isMe
                             ? { background: '#db2777', color: '#fff', borderBottomRightRadius: 4 }
                             : { background: '#f1f5f9', color: '#1e293b', borderBottomLeftRadius: 4 }}>
                        {msg.content}
                      </div>
                      <p className={`text-[10px] mt-1 ${isMe ? 'text-right' : ''}`} style={{ color: '#94a3b8' }}>
                        {timeLabel(msg.created_at)}
                        {isMe && msg.is_read && ' · Lu'}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: '1px solid #f1f5f9' }}>
              <div className="flex items-end gap-2 px-4 py-2.5 rounded-2xl"
                   style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <textarea value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder="Écrire un message… (Entrée pour envoyer)"
                  rows={1}
                  className="flex-1 bg-transparent text-sm outline-none resize-none"
                  style={{ color: '#1e293b', maxHeight: 120 }} />
                <button onClick={handleSend} disabled={!draft.trim() || sending}
                  className="h-7 w-7 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                  style={{ background: draft.trim() ? '#db2777' : '#e2e8f0' }}>
                  {sending
                    ? <Loader className="h-3.5 w-3.5 animate-spin text-white" />
                    : <Send className="h-3.5 w-3.5" style={{ color: draft.trim() ? '#fff' : '#94a3b8' }} />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="h-16 w-16 rounded-2xl flex items-center justify-center"
                 style={{ background: '#fdf2f8' }}>
              <MessageSquare className="h-8 w-8" style={{ color: '#db2777' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: '#475569' }}>Sélectionnez une conversation</p>
            <p className="text-xs" style={{ color: '#94a3b8' }}>ou démarrez-en une nouvelle</p>
          </div>
        )}
      </div>

      {/* New conversation modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
             onClick={() => setShowNewModal(false)}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4"
               style={{ background: '#fff' }}
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ color: '#0f172a' }}>Nouveau message</h2>
              <button onClick={() => setShowNewModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                 style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Search className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#94a3b8' }} />
              <input value={contactSearch} onChange={e => setContactSearch(e.target.value)}
                     placeholder="Rechercher un contact..."
                     className="flex-1 bg-transparent text-sm outline-none"
                     style={{ color: '#1e293b' }} autoFocus />
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {filteredContacts.length === 0 ? (
                <p className="text-xs text-center py-6" style={{ color: '#94a3b8' }}>
                  {contacts.length === 0 ? 'Chargement…' : 'Aucun contact trouvé'}
                </p>
              ) : filteredContacts.map(contact => {
                const { color, bg } = colorFor(contact.full_name);
                return (
                  <button key={contact.id} onClick={() => startWith(contact)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-slate-50 text-left">
                    <Avatar name={contact.full_name} color={color} bg={bg} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>{contact.full_name}</p>
                      <p className="text-xs" style={{ color: '#94a3b8' }}>
                        {contact.user_type === 'ADMIN' ? 'Administration' :
                         contact.user_type === 'TEACHER' ? 'Enseignant' : contact.user_type}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
