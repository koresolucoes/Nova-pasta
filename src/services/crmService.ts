
import { v4 as uuidv4 } from 'uuid';
import type { CrmBoard, CrmStage } from '../types';
import { supabase } from './supabaseClient';

const DEFAULT_STAGES = [
    { title: 'Novo Lead' },
    { title: 'Contato Inicial' },
    { title: 'Proposta Enviada' },
    { title: 'Negociação' },
    { title: 'Vendido' },
];

/**
 * Fetches all CRM boards (from funnels table) from the database.
 * @returns A promise that resolves to an array of CrmBoard objects.
 */
export async function getBoards(): Promise<CrmBoard[]> {
    const { data, error } = await supabase.from('funnels').select('*').order('created_at', { ascending: true });
    if (error) {
        console.error("Error fetching funnels (as boards):", error);
        throw new Error(`Falha ao buscar boards (funnels): ${error.message}`);
    }
    return (data || []).map(f => ({
        id: f.id,
        name: f.name,
        columns: f.columns || [] // Ensure columns is always an array
    }));
}

/**
 * Fetches a single board (from funnels table) by its ID.
 * @param id The ID of the board to fetch.
 * @returns A promise that resolves to a CrmBoard object or null if not found.
 */
export async function getBoardById(id: string): Promise<CrmBoard | null> {
    const { data, error } = await supabase.from('funnels').select('*').eq('id', id).single();
    if (error) {
        if (error.code === 'PGRST116') return null; // Row not found
        console.error("Error fetching funnel by ID:", error);
        throw new Error(`Falha ao buscar board (funnel) por ID ${id}: ${error.message}`);
    }
    return data ? { id: data.id, name: data.name, columns: data.columns || [] } : null;
}

/**
 * Creates a new CRM board (in funnels table) with a default set of stages.
 * @param name The name for the new board.
 * @returns A promise that resolves to the newly created CrmBoard object.
 */
export async function createBoard(name: string): Promise<CrmBoard> {
    const newBoardData = {
        name: name || 'Novo Funil',
        columns: DEFAULT_STAGES.map(col => ({
            id: uuidv4(),
            title: col.title,
            tagsToApply: [],
        }))
    };
    const { data, error } = await supabase.from('funnels').insert([newBoardData] as any).select().single();
    if (error) {
        console.error("Error creating funnel (as board):", error);
        throw new Error(`Falha ao criar board (funnel): ${error.message}`);
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localDataChanged'));
    }
    return data as CrmBoard;
}

/**
 * Creates a new CRM board from a raw CrmBoard object, used for draft saving.
 * @param board The full board object to insert.
 * @returns A promise that resolves to the created board data from the DB.
 */
export async function createRawBoard(board: CrmBoard): Promise<CrmBoard> {
    const { data, error } = await supabase.from('funnels').insert([board] as any).select().single();
    if (error) {
        console.error("Error creating raw funnel (as board):", error);
        throw new Error(`Falha ao criar board (funnel): ${error.message}`);
    }
    // No event dispatch here; the calling function will handle it after all promises resolve.
    return data as CrmBoard;
}

/**
 * Updates an existing board's data (in funnels table).
 * @param board The complete CrmBoard object with updated data.
 */
export async function updateBoard(board: CrmBoard): Promise<void> {
    const { id, ...updateData } = board;
    const { error } = await supabase.from('funnels').update(updateData as any).eq('id', id);
    if (error) {
        console.error("Error updating funnel (as board):", error);
        throw new Error(`Falha ao atualizar board (funnel) ${id}: ${error.message}`);
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localDataChanged'));
    }
}

/**
 * Deletes a board (from funnels table) from the database.
 * @param boardId The ID of the board to delete.
 */
export async function deleteBoard(boardId: string): Promise<void> {
    const { error } = await supabase.from('funnels').delete().eq('id', boardId);
    if (error) {
        console.error("Error deleting funnel (as board):", error);
        throw new Error(`Falha ao apagar board (funnel) ${boardId}: ${error.message}`);
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localDataChanged'));
    }
}

/**
 * A helper function to get all stages from all boards.
 * This is useful for finding a stage's title by its ID across the entire system.
 * @returns A promise that resolves to an array of all CRM stage objects.
 */
export async function getAllStages(): Promise<Omit<CrmStage, 'cards'>[]> {
    const boards = await getBoards();
    return boards.flatMap(board => board.columns);
}
