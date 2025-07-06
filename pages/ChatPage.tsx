
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import ContactList from '../components/Chat/ContactList';
import ChatView from '../components/Chat/ChatView';
import { getContacts } from '../services/contactService';
import { getConversations } from '../services/chatService';

function ChatPage(): React.ReactNode {
  const { contactId } = useParams<{ contactId?: string }>();
  const navigate = useNavigate();
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);

  // Set selected contact from URL param on initial load or URL change
  useEffect(() => {
    const findFirstContact = async () => {
        if (contactId) {
          setSelectedContactId(parseInt(contactId, 10));
        } else {
            // If no contactId in URL, select the first conversation available
            const conversations = await getConversations();
            if (conversations.length > 0) {
                const firstContactId = conversations[0].contactId;
                // Use replace to avoid polluting browser history
                navigate(`/chat/${firstContactId}`, { replace: true });
            }
        }
    };
    findFirstContact();
  }, [contactId, navigate]);

  const handleSelectContact = (id: number) => {
    setSelectedContactId(id);
    navigate(`/chat/${id}`);
  };

  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:pl-64">
        {/* The main content area for the chat page */}
        <div className="flex h-full border-t">
          {/* Left Column: Contact List */}
          <div className="w-full md:w-2/5 lg:w-1/3 xl:w-1/4 h-full border-r flex flex-col">
            <Header />
            <ContactList
              selectedContactId={selectedContactId}
              onSelectContact={handleSelectContact}
            />
          </div>

          {/* Right Column: Chat View */}
          <div className="flex-1 h-full flex flex-col">
            {selectedContactId ? (
              <ChatView key={selectedContactId} contactId={selectedContactId} />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-500">
                <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium">Selecione uma conversa</h3>
                    <p className="mt-1 text-sm">Comece selecionando uma conversa da lista à esquerda.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
