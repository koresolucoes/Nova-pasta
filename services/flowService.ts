
import { v4 as uuidv4 } from 'uuid';
import { supabase, type Json } from './supabaseClient';
import type { WhatsAppFlow, FlowScreen, FlowComponent } from '../types';
import { FlowStatus } from '../types';
import { 
    getActiveConnection,
    getWhatsAppFlows as getFlowsFromMeta, 
    getFlowJsonContent,
    createFlowOnMeta,
    updateFlowAsset,
    publishExistingFlow,
    deleteFlowFromMeta,
    deprecateFlowFromMeta,
    updateFlowMetadataOnMeta,
    getFlowPreviewUrl
} from './metaService';

const mapFlowFromDb = (dbFlow: any): WhatsAppFlow => ({
    id: dbFlow.id,
    metaFlowId: dbFlow.meta_flow_id,
    name: dbFlow.name,
    endpointUri: dbFlow.endpoint_uri,
    status: dbFlow.status,
    origin: dbFlow.origin,
    version: dbFlow.version,
    data_api_version: dbFlow.data_api_version,
    routing_model: dbFlow.routing_model || {},
    screens: dbFlow.screens || [],
});

const mapFlowToDb = (appFlow: Partial<WhatsAppFlow>) => ({
    // id is intentionally omitted. For inserts, the DB generates it.
    // For updates, the ID is used in the .eq() filter, not in the payload.
    meta_flow_id: appFlow.metaFlowId,
    name: appFlow.name,
    endpoint_uri: appFlow.endpointUri,
    status: appFlow.status,
    origin: appFlow.origin,
    version: appFlow.version,
    data_api_version: appFlow.data_api_version,
    routing_model: (appFlow.routing_model || {}) as unknown as Json,
    screens: (appFlow.screens || []) as unknown as Json,
});

export async function getFlows(): Promise<WhatsAppFlow[]> {
    const { data, error } = await supabase.from('whatsapp_flows').select('*').order('name');
    if (error) {
        console.error("Error fetching flows:", error);
        throw error;
    }
    return data.map(mapFlowFromDb);
}

export async function getFlowById(id: string): Promise<WhatsAppFlow | null> {
    const { data, error } = await supabase.from('whatsapp_flows').select('*').eq('id', id).single();
    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
    }
    return mapFlowFromDb(data);
}

export async function addFlow(): Promise<WhatsAppFlow> {
    const newScreen: FlowScreen = {
        id: uuidv4(),
        screen_id: 'SCHEDULE_TEST_DRIVE',
        title: 'Agendar Test-Drive',
        layout: {
            type: 'SingleColumnLayout',
            children: [
                { id: uuidv4(), type: 'TextHeading', text: 'Agende seu Test-Drive Exclusivo 🚗', name: 'headline_test_drive' },
                { id: uuidv4(), type: 'TextBody', text: 'Experimente a emoção de dirigir nosso novo modelo. Selecione uma data e horário convenientes para você.', name: 'body_text_intro' },
                { id: uuidv4(), type: 'TextInput', label: 'Nome Completo', name: 'customer_full_name', required: true },
                { id: uuidv4(), type: 'TextInput', label: 'Email para Contato', 'input-type': 'email', name: 'customer_email', required: true },
                { id: uuidv4(), type: 'DatePicker', label: 'Data Preferida para o Test-Drive', name: 'preferred_date', required: true },
                { id: uuidv4(), type: 'Footer', label: 'Confirmar Agendamento', 'on-click-action': { type: 'Complete' }, name: 'submit_schedule_button' }
            ]
        }
    };

    const newFlow: Omit<WhatsAppFlow, 'id'> = {
        name: 'Agendamento de Test-Drive',
        status: FlowStatus.DRAFT,
        origin: 'local',
        version: "7.1",
        data_api_version: "3.0",
        routing_model: {},
        screens: [newScreen],
    };

    const { data, error } = await supabase.from('whatsapp_flows').insert([mapFlowToDb(newFlow)] as any).select().single();
    if (error) throw error;
    
    window.dispatchEvent(new CustomEvent('localDataChanged'));
    return mapFlowFromDb(data);
}

export async function updateFlow(flow: WhatsAppFlow): Promise<WhatsAppFlow> {
    const { id, ...updateData } = flow;
    const { data, error } = await supabase
        .from('whatsapp_flows')
        .update(mapFlowToDb(updateData) as any)
        .eq('id', id)
        .select()
        .single();
        
    if (error) throw error;
    window.dispatchEvent(new CustomEvent('localDataChanged'));
    return mapFlowFromDb(data);
}

export async function deleteFlow(id: string): Promise<void> {
    const flowToDelete = await getFlowById(id);
    if (!flowToDelete) return;

    if (flowToDelete.metaFlowId && flowToDelete.status === FlowStatus.DRAFT) {
        const connection = await getActiveConnection();
        if (connection) {
            await deleteFlowFromMeta(connection, flowToDelete.metaFlowId).catch(err => {
                console.warn(`Could not delete flow from Meta (ID: ${flowToDelete.metaFlowId}), but deleting locally. Error:`, err.message);
            });
        }
    }

    const { error } = await supabase.from('whatsapp_flows').delete().eq('id', id);
    if (error) throw error;
    window.dispatchEvent(new CustomEvent('localDataChanged'));
}

export async function syncFlowsWithMeta(): Promise<void> {
    const connection = await getActiveConnection();
    if (!connection) {
        console.warn("Sync skipped: No active Meta connection.");
        return;
    }

    const [metaFlows, localFlows] = await Promise.all([
        getFlowsFromMeta(connection),
        getFlows()
    ]);
    
    const upsertPromises = metaFlows.map(metaFlow => {
        const existingLocal = localFlows.find(lf => lf.metaFlowId === metaFlow.metaFlowId);
        
        if (existingLocal) {
            // Update existing flow with Meta's status and metadata, but preserve local content
            const updateData = {
                name: metaFlow.name,
                status: metaFlow.status,
                version: metaFlow.version || existingLocal.version,
                data_api_version: metaFlow.data_api_version || existingLocal.data_api_version,
                endpoint_uri: metaFlow.endpointUri,
                origin: 'meta',
            };
            return supabase.from('whatsapp_flows').update(updateData as any).eq('id', existingLocal.id);
        } else {
            // Create new local representation of Meta flow
            const newFlowData = {
                meta_flow_id: metaFlow.metaFlowId,
                name: metaFlow.name,
                status: metaFlow.status,
                version: metaFlow.version || "7.1", // Default value to prevent insert error
                data_api_version: metaFlow.data_api_version || "3.0", // Default value to prevent insert error
                endpoint_uri: metaFlow.endpointUri,
                origin: 'meta',
                routing_model: {},
                screens: [],
            };
            return supabase.from('whatsapp_flows').insert([newFlowData] as any);
        }
    });

    const results = await Promise.allSettled(upsertPromises);
    results.forEach(result => {
        if(result.status === 'rejected') {
            console.error("Failed to upsert a flow during sync:", result.reason);
        }
    });

    // This event was causing an infinite loop on the FlowsPage.
    // The page will refetch the data after sync anyway, so this is not needed.
    // window.dispatchEvent(new CustomEvent('localDataChanged'));
}

export async function fetchAndStoreFlowContent(id: string): Promise<WhatsAppFlow> {
    const connection = await getActiveConnection();
    const flow = await getFlowById(id);
    if (!connection || !flow || !flow.metaFlowId) throw new Error("Conexão ou flow inválido para buscar conteúdo.");

    const jsonContent = await getFlowJsonContent(connection, flow.metaFlowId);
    
    // Map API screens to local FlowScreen format
    const localScreens: FlowScreen[] = (jsonContent.screens || []).map((apiScreen: any) => {
        const layoutChildren: FlowComponent[] = (apiScreen.layout?.children || []).map((apiComp: any) => ({
            ...apiComp,
            id: uuidv4() // Add local React key
        }));

        return {
            id: uuidv4(), // Add local React key for the screen itself
            screen_id: apiScreen.id, // Map API id to our screen_id
            title: apiScreen.id, // Use API id as title for editor by default
            terminal: apiScreen.terminal,
            success: apiScreen.success,
            refresh_on_back: apiScreen.refresh_on_back,
            data: apiScreen.data,
            sensitive: apiScreen.sensitive,
            layout: {
                type: 'SingleColumnLayout',
                children: layoutChildren
            }
        };
    });
    
    flow.screens = localScreens;
    flow.routing_model = jsonContent.routing_model || {};
    flow.version = jsonContent.version || flow.version;
    flow.data_api_version = jsonContent.data_api_version || flow.data_api_version;

    return updateFlow(flow);
}

export async function publishFlow(id: string): Promise<{success: boolean, errors?: any[]}> {
    const connection = await getActiveConnection();
    const flow = await getFlowById(id);
    if (!connection || !flow) throw new Error("Conexão ou flow inválido para publicação.");

    let finalFlow = flow;

    if (flow.metaFlowId) {
        // Existing flow: update assets first, then publish
        await updateFlowAsset(connection, flow);
        await publishExistingFlow(connection, flow.metaFlowId);
        finalFlow.status = FlowStatus.PUBLISHED;
    } else {
        // New flow: create and publish in one go
        const result = await createFlowOnMeta(connection, flow, true);
        if (result.validation_errors) {
            return { success: false, errors: result.validation_errors };
        }
        finalFlow.metaFlowId = result.id;
        finalFlow.status = FlowStatus.PUBLISHED;
        finalFlow.origin = 'meta';
    }
    
    await updateFlow(finalFlow);
    return { success: true };
}

export async function saveDraftFlow(id: string): Promise<{success: boolean, errors?: any[]}> {
    const connection = await getActiveConnection();
    const flow = await getFlowById(id);
    if (!connection || !flow) throw new Error("Conexão ou flow inválido para salvar o rascunho.");

    let finalFlow = flow;

    if (flow.metaFlowId) {
        // Existing flow: just update its assets. This keeps it as a draft.
        await updateFlowAsset(connection, flow);
        finalFlow.status = FlowStatus.DRAFT; // Ensure status is draft
    } else {
        // New flow: create it as a draft on Meta
        const result = await createFlowOnMeta(connection, flow, false);
        if (result.validation_errors) {
            return { success: false, errors: result.validation_errors };
        }
        finalFlow.metaFlowId = result.id;
        finalFlow.status = FlowStatus.DRAFT;
        finalFlow.origin = 'meta';
    }
    
    await updateFlow(finalFlow);
    return { success: true };
}


export async function generateFlowPreview(id: string): Promise<string> {
    const connection = await getActiveConnection();
    let flow = await getFlowById(id);
    if (!connection || !flow) throw new Error("Conexão ou flow inválido para gerar a pré-visualização.");

    // Ensure the flow exists on Meta's side before requesting a preview
    if (!flow.metaFlowId) {
        const result = await createFlowOnMeta(connection, flow, false);
        flow.metaFlowId = result.id;
        flow.status = FlowStatus.DRAFT;
        flow.origin = 'meta';
        flow = await updateFlow(flow); // Save the new metaFlowId locally
    } else {
        // If it exists, make sure its content is up-to-date
        await updateFlowAsset(connection, flow);
    }
    
    // Now that we're sure it exists on Meta, get the preview URL
    const previewUrl = await getFlowPreviewUrl(connection, flow.metaFlowId);
    return previewUrl;
}

export async function deprecateFlow(id: string): Promise<void> {
    const connection = await getActiveConnection();
    const flow = await getFlowById(id);
    if (!connection || !flow || !flow.metaFlowId) throw new Error("Flow inválido ou não sincronizado para ser depreciado.");
    
    await deprecateFlowFromMeta(connection, flow.metaFlowId);
    flow.status = FlowStatus.DEPRECATED;
    await updateFlow(flow);
}

export async function updateFlowMetadata(id: string, metadata: { name?: string; endpoint_uri?: string; }): Promise<void> {
    const connection = await getActiveConnection();
    const flow = await getFlowById(id);
    if (!connection || !flow) throw new Error("Flow ou conexão inválidos.");

    // Update locally first for responsiveness
    Object.assign(flow, metadata);
    const updatedFlow = await updateFlow(flow);

    // If synced with Meta, push changes
    if (updatedFlow.metaFlowId) {
        await updateFlowMetadataOnMeta(connection, updatedFlow.metaFlowId, metadata);
    }
}
