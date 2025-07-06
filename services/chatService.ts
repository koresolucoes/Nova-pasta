
import { v4 as uuidv4 } from 'uuid';
import type { Conversation, ChatMessage, Contact, ActionSendMessageData } from '../types';
import { getActiveConnection, sendTextMessage, sendFlowMessage as sendFlowMessageApi, type MetaConnection } from './metaService';
import { getContactById, getContacts } from './contactService';
import { supabase, type Json } from './supabaseClient';

export async function getConversations(): Promise<Conversation[]> {
    const { data, error } = await supabase.from('conversations').select('*').order('updated_at', { ascending: false });
    if (error) {
        console.error("Error fetching conversations:", error);
        throw new Error(error.message);
    }
    return (data || []).map(c => ({
        contactId: c.contact_id,
        messages: c.messages as ChatMessage[],
        unreadCount: c.unread_count,
    }));
}

export async function getConversationByContactId(contactId: number): Promise<Conversation | undefined> {
    const { data, error } = await supabase.from('conversations').select('*').eq('contact_id', contactId).single();
    if (error) {
        if (error.code === 'PGRST116') return undefined; // No conversation yet
        console.error("Error fetching conversation:", error);
        throw new Error(error.message);
    }
    return data ? {
        contactId: data.contact_id,
        messages: data.messages as ChatMessage[],
        unreadCount: data.unread_count,
    } : undefined;
}

async function updateMessageStatus(messageId: string, contactId: number, status: ChatMessage['status']) {
    const convo = await getConversationByContactId(contactId);
    if (convo) {
        const messageIndex = convo.messages.findIndex(m => m.id === messageId);
        if (messageIndex > -1) {
            convo.messages[messageIndex].status = status;
            const { error } = await supabase
                .from('conversations')
                .update({ messages: convo.messages as Json, updated_at: new Date().toISOString() } as any)
                .eq('contact_id', contactId);
            if (error) throw new Error(error.message);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('localDataChanged'));
            }
        }
    }
}

export async function addMessage(contactId: number, message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> {
    let convo = await getConversationByContactId(contactId);

    const newMessage: ChatMessage = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        ...message
    };

    if (convo) {
        convo.messages.push(newMessage);
        if (message.sender === 'contact') {
            convo.unreadCount = (convo.unreadCount || 0) + 1;
        }
        const { error } = await supabase
            .from('conversations')
            .update({ messages: convo.messages as Json, unread_count: convo.unreadCount, updated_at: new Date().toISOString() } as any)
            .eq('contact_id', contactId);
        if (error) throw new Error(error.message);
    } else {
        const newConvo = {
            contact_id: contactId,
            messages: [newMessage] as unknown as Json,
            unread_count: message.sender === 'contact' ? 1 : 0,
            updated_at: new Date().toISOString()
        };
        const { error } = await supabase.from('conversations').insert([newConvo] as any);
        if (error) throw new Error(error.message);
    }
    
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localDataChanged'));
    }
    return newMessage;
}

export async function markAsRead(contactId: number) {
    const convo = await getConversationByContactId(contactId);
    if (convo && convo.unreadCount > 0) {
        const { error } = await supabase
            .from('conversations')
            .update({ unread_count: 0, updated_at: new Date().toISOString() } as any)
            .eq('contact_id', contactId);
        if (error) throw new Error(error.message);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('localDataChanged'));
        }
    }
}

export async function sendMessage(contactId: number, text: string): Promise<void> {
    const connection = await getActiveConnection();
    const contact = await getContactById(contactId);

    if (!connection) throw new Error("Nenhuma conexão com a Meta está ativa.");
    if (!contact) throw new Error("Contato não encontrado.");
    if (!contact.is24hWindowOpen) throw new Error("A janela de 24 horas para conversas de formato livre está fechada.");

    const optimisticMessage = await addMessage(contactId, {
        text: text,
        sender: 'me',
        status: 'sent',
    });

    try {
        await sendTextMessage(connection, contact.phone, text);
    } catch (error) {
        await updateMessageStatus(optimisticMessage.id, contactId, 'failed');
        console.error("Failed to send message via API:", error);
        throw error;
    }
}

export async function sendAutomatedMessage(contactId: number, text: string, contact?: Contact, connection?: MetaConnection): Promise<void> {
    const activeConnection = connection || await getActiveConnection();
    const currentContact = contact || await getContactById(contactId);

    if (!activeConnection) {
        console.warn(`Cannot send automated message to ${contactId}: No active Meta connection provided.`);
        return;
    }
    if (!currentContact) {
        console.warn(`Cannot send automated message to contact ${contactId}: Contact not found.`);
        return;
    }
    if (!currentContact.is24hWindowOpen) {
        console.warn(`Cannot send automated message to ${contactId}: 24-hour window is closed.`);
        return;
    }

    const interpolatedText = text.replace(/\{\{contact\.name\}\}/g, currentContact.name);

    const optimisticMessage = await addMessage(contactId, {
        text: interpolatedText,
        sender: 'me',
        status: 'sent',
    });

    try {
        await sendTextMessage(activeConnection, currentContact.phone, interpolatedText);
    } catch (error) {
        await updateMessageStatus(optimisticMessage.id, contactId, 'failed');
        console.error("Failed to send automated message via API:", error);
        throw error;
    }
}

export async function sendFlowMessage(connection: MetaConnection, recipient: string, flowData: ActionSendMessageData): Promise<void> {
    const contact = (await getContacts()).find(c => c.phone.replace(/\D/g, '') === recipient.replace(/\D/g, ''));
    
    if (!contact) {
        console.warn(`Contact for phone ${recipient} not found in DB. Sending Flow message without creating local chat entry.`);
        await sendFlowMessageApi(connection, recipient, flowData);
        return;
    }

    const contactId = contact.id;

    const optimisticMessage = await addMessage(
        contactId,
        {
            text: `[Flow Enviado]`,
            sender: 'me',
            status: 'sent',
        }
    );

    try {
        await sendFlowMessageApi(connection, recipient, flowData);
    } catch (error) {
        await updateMessageStatus(optimisticMessage.id, contactId, 'failed');
        console.error("Failed to send flow message via API:", error);
        throw error;
    }
}
