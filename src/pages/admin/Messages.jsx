import { useState } from 'react';
import { MessageSquare, Plus, Send, Paperclip, Trash2, Star, Archive, X, Users, User } from 'lucide-react';
import { messagesService } from '../../services';
import { useApi } from '../../hooks/useApi';
import { PageHeader, SearchInput, PrimaryButton } from '../../components/ui/PageHeader';

const COLOR = '#7c3aed'; const COLOR_BG = '#f5f3ff'; const COLOR_ICON = '#ede9fe';

export default function Messages() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newMessageData, setNewMessageData] = useState({ recipient: '', subject: '', message: '' });

  const { data: conversations, loading, execute: fetchConversations } = useApi(
    () => messagesService.getConversations?.({ search: searchTerm }) || Promise.resolve([]),
    [searchTerm], true
  );

  const { data: messages } = useApi(
    () => selectedConversation ? messagesService.getMessages?.(selectedConversation.id) || Promise.resolve([]) : Promise.resolve([]),
    [selectedConversation], !!selectedConversation
  );

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConversation) return;
    try {
      await messagesService.sendMessage?.({ conversation_id: selectedConversation.id, message: messageText });
      setMessageText(''); fetchConversations();
    } catch (err) { alert('Erreur lors de l\'envoi'); }
  };

  const handleNewMessage = async (e) => {
    e.preventDefault();
    try {
      await messagesService.createConversation?.(newMessageData);
      setShowNewMessage(false); setNewMessageData({ recipient: '', subject: '', message: '' }); fetchConversations();
    } catch (err) { alert('Erreur lors de la création'); }
  };

  const handleDeleteConversation = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette conversation ?')) return;
    try {
      await messagesService.deleteConversation?.(id);
      if (selectedConversation?.id === id) setSelectedConversation(null);
      fetchConversations();
    } catch (err) { alert('Erreur lors de la suppression'); }
  };

  const conversationsList = conversations?.results || conversations || [];
  const messagesList = messages?.results || messages || [];

  return (
    <div className="animate-fade-in flex flex-col" style={{ height: 'calc(100vh - 100px)' }}>
      <div className="mb-5">
        <PageHeader icon={MessageSquare} iconColor={COLOR} iconBg={COLOR_ICON}
          title="Messages" subtitle="Communiquez avec les étudiants et enseignants"
          action={<PrimaryButton icon={Plus} label="Nouveau message" color={COLOR} onClick={() => setShowNewMessage(true)} />} />
      </div>

      <div className="card overflow-hidden flex-1 flex min-h-0" style={{ boxShadow: 'var(--shadow-lg)' }}>
        {/* Conversations list */}
        <div className="w-full md:w-80 flex-shrink-0 flex flex-col" style={{ borderRight: '1.5px solid #f0f4f9', background: 'linear-gradient(180deg,#fafbff,#fff)' }}>
          <div className="p-4" style={{ borderBottom: '1px solid #f0f4f9' }}>
            <SearchInput value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Rechercher une conversation…" />
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center py-12">
                <div className="h-8 w-8 rounded-full border-[3px] border-violet-100 animate-spin mb-3" style={{ borderTopColor: COLOR }} />
                <p className="text-xs font-medium" style={{ color: '#94a3b8' }}>Chargement…</p>
              </div>
            ) : conversationsList.length === 0 ? (
              <div className="flex flex-col items-center py-14">
                <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg,#f1f5f9,#e2e8f0)' }}>
                  <Users className="h-7 w-7 opacity-30" style={{ color: '#64748b' }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: '#94a3b8' }}>Aucune conversation</p>
              </div>
            ) : (
              conversationsList.map((conv) => {
                const active = selectedConversation?.id === conv.id;
                return (
                  <button key={conv.id} onClick={() => setSelectedConversation(conv)}
                    className="w-full text-left p-3.5 transition-all"
                    style={{
                      borderBottom: '1px solid #f0f4f9',
                      background: active ? `linear-gradient(90deg, ${COLOR_BG}, #fdf8ff)` : 'transparent',
                      borderLeft: active ? `3px solid ${COLOR}` : '3px solid transparent',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#fafbff'; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-2xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${COLOR}, #8b5cf6)`, boxShadow: `0 3px 10px ${COLOR}35` }}>
                        {conv.participant_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-bold truncate" style={{ color: active ? COLOR : '#1e293b' }}>{conv.participant_name || 'Utilisateur'}</span>
                          <span className="text-[10px] flex-shrink-0 ml-2 font-semibold" style={{ color: '#94a3b8' }}>{conv.last_message_time || ''}</span>
                        </div>
                        <p className="text-xs font-semibold truncate" style={{ color: '#64748b' }}>{conv.subject || 'Sans sujet'}</p>
                        <p className="text-xs truncate mt-0.5 font-medium" style={{ color: '#94a3b8' }}>{conv.last_message || 'Aucun message'}</p>
                      </div>
                      {conv.unread_count > 0 && (
                        <span className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                              style={{ background: COLOR, boxShadow: `0 2px 8px ${COLOR}50` }}>
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedConversation ? (
            <>
              {/* Chat header */}
              <div className="px-5 py-3.5 flex items-center justify-between flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${COLOR_BG}, #fdf8ff)`, borderBottom: '1.5px solid #f0f4f9' }}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl flex items-center justify-center text-white text-sm font-extrabold flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${COLOR}, #6366f1)`, boxShadow: `0 4px 12px ${COLOR}40` }}>
                    {selectedConversation.participant_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-extrabold" style={{ color: '#0f172a' }}>{selectedConversation.participant_name || 'Utilisateur'}</p>
                    <p className="text-[11px] font-semibold" style={{ color: '#94a3b8' }}>{selectedConversation.subject || 'Sans sujet'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {[
                    { icon: Star, hoverBg: '#fef9c3', color: '#ca8a04' },
                    { icon: Archive, hoverBg: '#f1f5f9', color: '#64748b' },
                  ].map(({ icon: Icon, hoverBg, color }, i) => (
                    <button key={i} className="h-8 w-8 rounded-xl flex items-center justify-center transition-all"
                      style={{ color }}
                      onMouseEnter={e => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.transform = 'scale(1.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}>
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                  <button onClick={() => handleDeleteConversation(selectedConversation.id)}
                    className="h-8 w-8 rounded-xl flex items-center justify-center transition-all" style={{ color: '#ef4444' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.transform = 'scale(1.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ background: 'linear-gradient(180deg, #f8faff, #ffffff)' }}>
                {messagesList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-10">
                    <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-3"
                      style={{ background: `linear-gradient(135deg, ${COLOR_BG}, ${COLOR}18)`, boxShadow: `0 4px 14px ${COLOR}15` }}>
                      <MessageSquare className="h-7 w-7 opacity-50" style={{ color: COLOR }} />
                    </div>
                    <p className="text-sm font-semibold" style={{ color: '#94a3b8' }}>Aucun message dans cette conversation</p>
                  </div>
                ) : messagesList.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.is_sender ? 'justify-end' : 'justify-start'} gap-2`}>
                    {!msg.is_sender && (
                      <div className="h-7 w-7 rounded-xl flex items-center justify-center text-white text-[10px] font-extrabold flex-shrink-0 self-end mb-5"
                        style={{ background: `linear-gradient(135deg, ${COLOR}, #6366f1)` }}>
                        {selectedConversation.participant_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="max-w-[68%]">
                      <div className="px-4 py-2.5 text-sm font-medium leading-relaxed"
                        style={{
                          background: msg.is_sender ? `linear-gradient(135deg, ${COLOR}, #6366f1)` : '#ffffff',
                          color: msg.is_sender ? '#fff' : '#1e293b',
                          borderRadius: msg.is_sender ? '1.1rem 1.1rem 0.3rem 1.1rem' : '1.1rem 1.1rem 1.1rem 0.3rem',
                          boxShadow: msg.is_sender ? `0 4px 16px ${COLOR}35` : '0 2px 8px rgba(15,23,50,0.08)',
                          border: msg.is_sender ? 'none' : '1.5px solid #f0f4f9',
                        }}>
                        {msg.message}
                      </div>
                      <p className={`text-[10px] mt-1.5 font-semibold ${msg.is_sender ? 'text-right' : 'text-left'}`} style={{ color: '#b0bec5' }}>
                        {msg.created_at ? new Date(msg.created_at).toLocaleString('fr-FR') : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message input */}
              <form onSubmit={handleSendMessage} className="flex items-end gap-2.5 p-4 flex-shrink-0"
                style={{ borderTop: '1.5px solid #f0f4f9', background: 'linear-gradient(135deg, #ffffff, #fafbff)' }}>
                <button type="button" className="h-10 w-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                  style={{ color: '#94a3b8', background: '#f1f5f9' }}
                  onMouseEnter={e => { e.currentTarget.style.background = COLOR_BG; e.currentTarget.style.color = COLOR; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#94a3b8'; }}>
                  <Paperclip className="h-4 w-4" />
                </button>
                <textarea value={messageText} onChange={e => setMessageText(e.target.value)}
                  placeholder="Écrivez votre message…" rows={2} className="input-field flex-1 resize-none"
                  style={{ borderRadius: '0.875rem', fontSize: '0.875rem' }} />
                <button type="submit" disabled={!messageText.trim()}
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-all flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${COLOR}, #6366f1)`, boxShadow: `0 4px 14px ${COLOR}40` }}
                  onMouseEnter={e => { if (messageText.trim()) { e.currentTarget.style.transform = 'translateY(-1px) scale(1.05)'; e.currentTarget.style.boxShadow = `0 6px 20px ${COLOR}55`; } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 14px ${COLOR}40`; }}>
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center" style={{ background: 'linear-gradient(180deg, #f8faff, #ffffff)' }}>
              <div className="h-20 w-20 rounded-3xl flex items-center justify-center mb-4"
                style={{ background: `linear-gradient(135deg, ${COLOR_BG}, ${COLOR}18)`, boxShadow: `0 8px 24px ${COLOR}18` }}>
                <MessageSquare className="h-10 w-10 opacity-40" style={{ color: COLOR }} />
              </div>
              <p className="text-base font-bold mb-1.5" style={{ color: '#1e293b' }}>Vos messages</p>
              <p className="text-sm" style={{ color: '#94a3b8' }}>Sélectionnez une conversation pour commencer</p>
            </div>
          )}
        </div>
      </div>

      {/* New Message Modal */}
      {showNewMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(8,12,36,0.62)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden" style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.2), 0 8px 32px rgba(0,0,0,0.1)' }}>
            {/* Accent stripe */}
            <div className="h-1" style={{ background: `linear-gradient(90deg, ${COLOR}, #6366f1, #8b5cf6)` }} />
            <div className="flex items-center justify-between px-6 py-5" style={{ background: `linear-gradient(135deg, ${COLOR_BG}, #fdf8ff)`, borderBottom: '1px solid #f1f5f9' }}>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${COLOR}, #6366f1)`, boxShadow: `0 4px 12px ${COLOR}40` }}>
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold" style={{ color: '#0f172a' }}>Nouveau message</h2>
                  <p className="text-xs font-semibold" style={{ color: '#94a3b8' }}>Envoyer un message à un utilisateur</p>
                </div>
              </div>
              <button onClick={() => setShowNewMessage(false)}
                className="h-8 w-8 rounded-xl flex items-center justify-center transition-all"
                style={{ color: '#64748b' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleNewMessage} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: '#475569' }}>Destinataire *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#94a3b8' }} />
                  <input type="text" required value={newMessageData.recipient}
                    onChange={e => setNewMessageData(p => ({ ...p, recipient: e.target.value }))}
                    placeholder="Nom ou email du destinataire" className="input-field" style={{ paddingLeft: '2.25rem' }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: '#475569' }}>Sujet *</label>
                <input type="text" required value={newMessageData.subject}
                  onChange={e => setNewMessageData(p => ({ ...p, subject: e.target.value }))}
                  placeholder="Sujet du message" className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: '#475569' }}>Message *</label>
                <textarea required value={newMessageData.message}
                  onChange={e => setNewMessageData(p => ({ ...p, message: e.target.value }))}
                  placeholder="Écrivez votre message…" rows={6} className="input-field resize-none" />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
                <button type="button" onClick={() => setShowNewMessage(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:bg-slate-50"
                  style={{ color: '#64748b', borderColor: '#e2e8f0' }}>Annuler</button>
                <button type="submit" className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{ background: `linear-gradient(135deg, ${COLOR}, #6366f1)`, boxShadow: `0 4px 14px ${COLOR}40` }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${COLOR}55`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 14px ${COLOR}40`; }}>
                  <span className="flex items-center gap-2"><Send className="h-4 w-4" /> Envoyer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
