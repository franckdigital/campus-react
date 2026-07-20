import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Image as ImageIcon, FileText, User } from 'lucide-react';

export default function Chat({ userType = 'student' }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size <= 5 * 1024 * 1024) {
      setSelectedFile(file);
    } else {
      alert('Fichier trop volumineux (max 5MB)');
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() || selectedFile) {
      const message = {
        id: Date.now(),
        text: newMessage,
        file: selectedFile,
        sender: userType,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([...messages, message]);
      setNewMessage('');
      setSelectedFile(null);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
        <h3 className="text-lg font-bold text-white">Chat</h3>
        <p className="text-sm text-blue-100">Discutez avec vos {userType === 'student' ? 'enseignants' : 'étudiants'}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Aucun message</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === userType ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                msg.sender === userType 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}>
                {msg.text && <p className="text-sm">{msg.text}</p>}
                {msg.file && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    {msg.file.type.startsWith('image/') ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    <span>{msg.file.name}</span>
                  </div>
                )}
                <p className="text-xs mt-1 opacity-70">{msg.timestamp}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
        {selectedFile && (
          <div className="mb-2 flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
            <FileText className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-900 flex-1">{selectedFile.name}</span>
            <button type="button" onClick={() => setSelectedFile(null)} className="text-blue-600 hover:text-blue-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="file"
            onChange={handleFileChange}
            className="hidden"
            id="chat-file-upload"
            accept="image/*,.pdf,.doc,.docx"
          />
          <label htmlFor="chat-file-upload" className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
            <Paperclip className="h-5 w-5 text-gray-600" />
          </label>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Écrivez un message..."
            className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
