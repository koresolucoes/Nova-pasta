
import React, { useState, useEffect, useMemo } from 'react';
import type { Contact, Conversation } from '../../types';
import { getContacts } from '../../services/contactService';
import { getConversations } from '../../services/chatService';
import InboxTabs, { type InboxFilter } from './InboxTabs';
import { searchService } from '../../services/searchService';

interface ContactListProps {
  selectedContactId: number | null;
  onSelectContact: (contactId: number) => void;
}

function ContactList({ selectedContactId, onSelectContact }: ContactListProps): React.ReactNode {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [searchTerm, setSearchTerm] = useState(searchService.getSearchTerm());

  const loadData = async () => {
    setContacts(await getContacts());
    setConversations(await getConversations());
  };

  useEffect(() => {
    loadData();
    const unsubscribe = searchService.subscribe(setSearchTerm);
    window.addEventListener('localDataChanged', loadData);

    return () => {
        unsubscribe();
        window.removeEventListener('localDataChanged', loadData);
    };
  }, []);

  const conversationDetails = useMemo(() => {
    return conversations
      .map(convo => {
        const contact = contacts.find(c => c.id === convo.contactId);
        if (!contact) return null;
        const lastMessage = convo.messages[convo.messages.length - 1];
        return {
          contact,
          conversation: convo,
          lastMessage,
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b!.lastMessage.timestamp).getTime() - new Date(a!.lastMessage.timestamp).getTime());
  }, [conversations, contacts]);

  const filteredConversations = useMemo(() => {
    let convos = conversationDetails;

    if (filter === 'unread') {
      convos = convos.filter(c => c!.conversation.unreadCount > 0);
    }

    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      convos = convos.filter(c =>
        c!.contact.name.toLowerCase().includes(lowercasedTerm) ||
        c!.contact.phone.toLowerCase().includes(lowercasedTerm)
      );
    }
    
    return convos;
  }, [conversationDetails, filter, searchTerm]);
  
  const totalUnread = useMemo(() => {
      return conversations.reduce((acc, curr) => acc + (curr.unreadCount || 0), 0);
  }, [conversations]);

  return (
    <div className="flex flex-col h-full bg-white">
        <InboxTabs activeFilter={filter} onFilterChange={setFilter} unreadCount={totalUnread}/>
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.map(detail => {
          if (!detail) return null;
          const { contact, conversation, lastMessage } = detail;
          const isSelected = selectedContactId === contact.id;

          return (
            <button
              key={contact.id}
              onClick={() => onSelectContact(contact.id)}
              className={`w-full text-left p-4 border-b flex items-center transition-colors duration-150 ${isSelected ? 'bg-amber-50' : 'hover:bg-gray-50'}`}
            >
              <img
                className="h-12 w-12 rounded-full object-cover mr-4"
                src={`https://i.pravatar.cc/100?u=${contact.id}`}
                alt={contact.name}
              />
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center">
                  <div className="flex items-center min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate">{contact.name}</h3>
                    {contact.is24hWindowOpen && (
                      <span className="relative flex-shrink-0 ml-2 h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 flex-shrink-0">
                    {new Date(lastMessage.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex justify-between items-start mt-1">
                  <p className="text-sm text-gray-600 truncate pr-2">
                    {lastMessage.sender === 'me' && 'Você: '}
                    {lastMessage.text}
                  </p>
                  {conversation.unreadCount > 0 && (
                    <span className="bg-amber-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ContactList;