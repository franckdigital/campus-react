import api from './api';

export const messagesService = {
  // ── Direct messaging ──────────────────────────────────────────────────────
  getConversations: () => api.get('/conversations/'),

  // Start a new conversation or return existing one
  startConversation: (participantId, initialMessage = '') =>
    api.post('/conversations/', { participant_id: participantId, initial_message: initialMessage }),

  getMessages: (conversationId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/conversations/${conversationId}/messages/${query ? `?${query}` : ''}`);
  },

  sendMessage: (conversationId, content) =>
    api.post(`/conversations/${conversationId}/send/`, { content }),

  markRead: (conversationId) =>
    api.post(`/conversations/${conversationId}/mark-read/`),

  getContacts: () => api.get('/conversations/contacts/'),

  // ── Group chat (classe) ───────────────────────────────────────────────────
  getChats: () => api.get('/chats/'),
  getChatById: (id) => api.get(`/chats/${id}/`),
  getChatMessages: (chatId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/chats/${chatId}/messages/${query ? `?${query}` : ''}`);
  },
  getMembers: (chatId) => api.get(`/chats/${chatId}/members/`),
};

export default messagesService;
