import React, { useState, useEffect, useRef } from 'react';
import type { Contact, Conversation } from '../../types';
import { getContactById } from '../../services/contactService';
import { getConversationByContactId, sendMessage, markAsRead } from '../../services/chatService';
import MessageBox from './MessageBox';
import { PaperAirplaneIcon } from '../icons';

interface ChatViewProps {
  contactId: number;
}

function ChatView({ contactId }: ChatViewProps): React.ReactNode {
  const [contact, setContact] = useState<Contact | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    setContact(await getContactById(contactId) || null);
    setConversation(await getConversationByContactId(contactId) || null);
    await markAsRead(contactId);
  };
  
  useEffect(() => {
    loadData();
    // Listen for general data changes (e.g., when a message is sent from this client)
    // The chat will now only update on manual actions or reloads, not in real-time.
    window.addEventListener('localDataChanged', loadData);

    return () => {
      window.removeEventListener('localDataChanged', loadData);
    };
  }, [contactId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !contact) return;

    setIsSending(true);
    setSendError(null);
    try {
      await sendMessage(contact.id, newMessage);
      setNewMessage('');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Falha desconhecida ao enviar a mensagem.";
        setSendError(errorMessage);
    } finally {
        setIsSending(false);
    }
  };

  if (!contact) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <p>Carregando dados do contato...</p>
      </div>
    );
  }

  const canSendMessage = contact.is24hWindowOpen;

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-100">
      {/* Header */}
      <header className="flex items-center p-4 bg-white border-b z-10">
        <img
          className="h-10 w-10 rounded-full object-cover mr-4"
          src={`https://i.pravatar.cc/100?u=${contact.id}`}
          alt={contact.name}
        />
        <div>
          <h2 className="font-semibold text-gray-800">{contact.name}</h2>
          <p className="text-sm text-gray-500">{contact.phone}</p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 p-6 overflow-y-auto bg-cover" style={{backgroundImage: "url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')"}}>
        {conversation && conversation.messages.length > 0 ? (
          conversation.messages.map(msg => <MessageBox key={msg.id} message={msg} />)
        ) : (
          <div className="text-center text-gray-500 p-4 bg-yellow-50 rounded-lg text-sm">
            Nenhuma mensagem nesta conversa ainda.
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <footer className="p-4 bg-white border-t">
         {sendError && (
            <div className="text-center text-sm text-red-700 bg-red-100 p-3 rounded-lg mb-3">
                <strong>Erro ao enviar:</strong> {sendError}
            </div>
        )}
        {canSendMessage ? (
          <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite uma mensagem..."
              className="flex-1 w-full px-4 py-2 text-gray-800 bg-gray-100 border-2 border-transparent rounded-full placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors duration-200"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              className="flex-shrink-0 w-12 h-12 bg-amber-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-amber-700 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PaperAirplaneIcon className="w-6 h-6" />
            </button>
          </form>
        ) : (
            <div className="text-center text-sm text-red-700 bg-red-100 p-3 rounded-lg">
                A janela de 24 horas para conversas de formato livre está fechada. Para iniciar uma nova conversa, use um <strong>Modelo de Mensagem</strong> na página "Disparar".
            </div>
        )}
      </footer>
    </div>
  );
}

export default ChatView;