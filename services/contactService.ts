
import { supabase } from './supabaseClient';
import type { Contact, SheetContact, CrmStage } from '../types';

/**
 * Maps a contact object from the database (snake_case) to the application's format (camelCase).
 * @param dbContact The raw contact object from Supabase.
 * @returns A contact object conforming to the `Contact` type.
 */
function mapContactFromDb(dbContact: any): Contact {
  const contact: Contact = {
    id: dbContact.id,
    name: dbContact.name,
    phone: dbContact.phone,
    tags: dbContact.tags || [],
    lastInteraction: dbContact.last_interaction,
    is24hWindowOpen: dbContact.is_24h_window_open,
    isOptedOutOfAutomations: dbContact.is_opted_out_of_automations,
    crmStageId: dbContact.funnel_column_id,
  };

  // Add custom fields to the top level of the contact object
  if (dbContact.custom_fields && typeof dbContact.custom_fields === 'object') {
    Object.assign(contact, dbContact.custom_fields);
  }
  
  return contact;
}

/**
 * Maps a partial contact object from the application (camelCase) to the database's format (snake_case),
 * intelligently separating standard columns from custom fields.
 * @param appContact The partial contact object from the app, which may include custom fields.
 * @returns An object with snake_case keys and a `custom_fields` JSONB object, suitable for Supabase.
 */
function mapContactToDb(appContact: Partial<Contact>): any {
    const dbData: { [key: string]: any } = {};
    const customFields: { [key: string]: any } = {};

    const standardFields = new Set([
        'id', 'name', 'phone', 'tags', 
        'lastInteraction', 'is24hWindowOpen', 'isOptedOutOfAutomations', 'crmStageId'
    ]);

    for (const key in appContact) {
        if (key === 'id') continue;

        const value = (appContact as any)[key];

        if (standardFields.has(key)) {
            switch (key) {
                case 'crmStageId':
                    dbData.funnel_column_id = value;
                    break;
                case 'isOptedOutOfAutomations':
                    dbData.is_opted_out_of_automations = value;
                    break;
                case 'lastInteraction':
                    dbData.last_interaction = value;
                    break;
                case 'is24hWindowOpen':
                    dbData.is_24h_window_open = value;
                    break;
                default:
                    dbData[key] = value;
                    break;
            }
        } else {
            customFields[key] = value;
        }
    }

    if (Object.keys(customFields).length > 0) {
        dbData.custom_fields = customFields;
    }

    return dbData;
}


/**
 * A robust CSV parser that handles commas within quoted fields.
 * It also handles empty lines and normalizes headers.
 * @param csvText The raw CSV string.
 * @returns An array of objects.
 */
export function parseCsv(csvText: string): Record<string, string>[] {
    const lines = csvText.trim().replace(/\r/g, '').split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) {
        return [];
    }
    const splitRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
    const headers = lines[0]
        .split(splitRegex)
        .map(h => h.trim().replace(/^"|"$/g, '').trim().toLowerCase())
        .filter(h => h);

    if (headers.length === 0) {
        return [];
    }
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(splitRegex).map(v => v.trim().replace(/^"|"$/g, ''));
        if (values.every(v => v === '')) {
            continue;
        }
        const entry: Record<string, string> = {};
        headers.forEach((header, index) => {
            entry[header] = values[index] || '';
        });
        data.push(entry);
    }
    return data;
}

export async function getContacts(): Promise<Contact[]> {
  const { data, error } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching contacts:', error);
    throw new Error(error.message);
  }
  return (data || []).map(mapContactFromDb);
}

export async function getContactById(contactId: number): Promise<Contact | undefined> {
  const { data, error } = await supabase.from('contacts').select('*').eq('id', contactId).single();
  if (error) {
    if (error.code === 'PGRST116') return undefined;
    console.error(`Error fetching contact ${contactId}:`, error);
    throw new Error(error.message);
  }
  return data ? mapContactFromDb(data) : undefined;
}

export async function addContact(contact: Partial<Omit<Contact, 'id'>>): Promise<Contact> {
    const { data: allBoards, error: boardError } = await supabase.from('funnels').select('id, columns').order('created_at', { ascending: true });
    if (boardError) console.error("Could not fetch boards for default stage");

    const firstBoard = allBoards?.[0];
    const firstStageId = firstBoard?.columns?.[0]?.id;

    const contactWithDefaults = { ...contact, crmStageId: contact.crmStageId || firstStageId };
    const contactToInsert = mapContactToDb(contactWithDefaults);

    const { data: newContactData, error } = await supabase.from('contacts').insert([contactToInsert] as any).select().single();

    if (error) {
        console.error('Error adding contact:', error);
        throw new Error(error.message);
    }
    
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localDataChanged'));
    }
    
    return mapContactFromDb(newContactData);
}

export async function updateContact(updatedContact: Partial<Contact> & { id: number }): Promise<void> {
    const { id, ...contactData } = updatedContact;
    const dbUpdateData = mapContactToDb(contactData);
    
    const { error } = await supabase.from('contacts').update(dbUpdateData as any).eq('id', id);
    if (error) {
        console.error('Error updating contact:', error);
        throw new Error(error.message);
    }

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localDataChanged'));
    }
}

export async function deleteContact(contactId: number): Promise<void> {
    const { error } = await supabase.from('contacts').delete().eq('id', contactId);
    if (error) {
        console.error('Error deleting contact:', error);
        throw new Error(error.message);
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localDataChanged'));
    }
}

export async function addMultipleContacts(newContacts: SheetContact[], tagsToApply: string[] = []): Promise<Contact[]> {
    const { data: existingContactsData, error: fetchError } = await supabase.from('contacts').select('phone');
    if (fetchError) {
        console.error('Erro ao buscar contatos existentes:', fetchError);
        throw new Error(fetchError.message);
    }

    const existingPhones = new Set((existingContactsData || []).map(c => c.phone?.replace(/\D/g, '')));
    const phonesInThisBatch = new Set<string>();

    const contactsToCreate = newContacts.filter(c => {
        const normalizedPhone = c.phone?.replace(/\D/g, '');
        if (!normalizedPhone || existingPhones.has(normalizedPhone) || phonesInThisBatch.has(normalizedPhone)) {
            return false;
        }
        phonesInThisBatch.add(normalizedPhone);
        return true;
    });

    if (contactsToCreate.length === 0) {
        console.log("Nenhum contato novo e único para adicionar.");
        return [];
    }
    
    const { data: allBoards, error: boardError } = await supabase.from('funnels').select('id, columns').order('created_at', { ascending: true });
    if (boardError) console.error("Could not fetch boards for default stage");
    const firstStageId = allBoards?.[0]?.columns?.[0]?.id;

    const formattedContacts = contactsToCreate.map(c => {
        const custom_fields = Object.fromEntries(Object.entries(c).filter(([key]) => !['name', 'phone', 'tags'].includes(key)));
        const fileTags = (typeof c.tags === 'string' && c.tags) ? c.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
        return {
            name: c.name,
            phone: c.phone,
            tags: [...new Set([...fileTags, ...tagsToApply])],
            funnel_column_id: firstStageId,
            custom_fields: Object.keys(custom_fields).length > 0 ? custom_fields : undefined,
        };
    });

    const { data: insertedData, error: insertError } = await supabase.from('contacts').insert(formattedContacts as any).select();
    if (insertError) {
        console.error('Erro ao inserir múltiplos contatos:', insertError);
        throw new Error(insertError.message);
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localDataChanged'));
    }
    
    return (insertedData || []).map(mapContactFromDb);
}

export async function moveContactToCrmStage(contactId: number, destinationStage: Pick<CrmStage, 'id' | 'tagsToApply'>): Promise<void> {
    const contact = await getContactById(contactId);
    if (!contact) {
        console.error(`Contact ${contactId} not found for CRM move.`);
        return;
    }

    const updatePayload: Partial<Contact> = { crmStageId: destinationStage.id };
    const newTags = new Set(contact.tags || []);
    let tagsChanged = false;

    if (destinationStage.tagsToApply?.length) {
        destinationStage.tagsToApply.forEach(tag => {
            if (!newTags.has(tag)) {
                newTags.add(tag);
                tagsChanged = true;
            }
        });
    }

    if (tagsChanged) {
        updatePayload.tags = Array.from(newTags);
    }

    await updateContact({ id: contactId, ...updatePayload });
}

export async function getAllTags(): Promise<string[]> {
    const contacts = await getContacts();
    const allTags = new Set<string>();
    contacts.forEach(c => {
        (c.tags || []).forEach(tag => allTags.add(tag));
    });
    return Array.from(allTags).sort();
}

export async function setContactOptOutStatus(contactId: number, isOptedOut: boolean): Promise<void> {
    await updateContact({ id: contactId, isOptedOutOfAutomations: isOptedOut });
}
