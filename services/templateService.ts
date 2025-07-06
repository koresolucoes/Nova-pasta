
import { v4 as uuidv4 } from 'uuid';
import type { MessageTemplate, TemplateComponent } from '../types';
import { supabase, type Json, type Database } from './supabaseClient';

export async function getTemplates(): Promise<MessageTemplate[]> {
  const { data, error } = await supabase
    .from('message_templates')
    .select('*')
    .eq('status', 'DRAFT');

  if (error) {
    console.error("Error fetching template drafts:", error);
    throw error;
  }
  return (data || []).map(t => ({
      id: t.id,
      name: t.name,
      category: t.category as any,
      language: t.language,
      status: t.status as any,
      components: t.components as TemplateComponent[],
      metaId: t.meta_id,
      rejectionReason: t.rejection_reason,
  }));
}

export async function getTemplateById(id: string): Promise<MessageTemplate | undefined> {
    const { data, error } = await supabase.from('message_templates').select('*').eq('id', id).single();
    if (error) {
        if (error.code === 'PGRST116') return undefined; // Not found
        console.error("Error fetching template by ID:", error);
        throw error;
    }
    return data ? {
        id: data.id,
        name: data.name,
        category: data.category as any,
        language: data.language,
        status: data.status as any,
        components: data.components as TemplateComponent[],
        metaId: data.meta_id,
        rejectionReason: data.rejection_reason,
    } : undefined;
}

export async function addTemplate(): Promise<MessageTemplate> {
  const newTemplateDataForDb = {
    name: 'novo_modelo_sem_titulo',
    category: 'MARKETING',
    language: 'pt_BR',
    status: 'DRAFT',
    components: [
        { type: 'BODY', text: 'Corpo da sua mensagem aqui. Use {{1}} para variáveis.' }
    ] as unknown as Json,
  };

  const { data, error } = await supabase.from('message_templates').insert([newTemplateDataForDb] as any).select().single();

  if (error) {
    console.error("Error adding template draft:", error);
    throw error;
  }
  
  window.dispatchEvent(new CustomEvent('localDataChanged'));
  return {
    ...(data as any),
    components: data.components as TemplateComponent[],
    metaId: data.meta_id,
    rejectionReason: data.rejection_reason,
  };
}

export async function updateTemplate(updatedTemplate: MessageTemplate): Promise<void> {
  const { id, metaId, rejectionReason, ...updateData } = updatedTemplate;

  const dbUpdateData = {
      ...updateData,
      meta_id: metaId,
      rejection_reason: rejectionReason,
      components: updatedTemplate.components as unknown as Json,
  };

  const { error } = await supabase
    .from('message_templates')
    .update(dbUpdateData as any)
    .eq('id', id);
  
  if (error) {
    console.error("Error updating template draft:", error);
    throw error;
  }
  // No need to dispatch event as builder page handles its own state.
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('message_templates').delete().eq('id', id);
  if (error) {
    console.error("Error deleting template draft:", error);
    throw error;
  }
  window.dispatchEvent(new CustomEvent('localDataChanged'));
}
