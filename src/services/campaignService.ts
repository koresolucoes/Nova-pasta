
import type { Campaign, CampaignLog, CampaignStatus, CampaignTarget } from '../types';
import { supabase, type Json, type Database } from './supabaseClient';

function mapCampaignToDb(campaign: Partial<Campaign>): Partial<Database['public']['Tables']['campaigns']['Insert']> {
    return {
        name: campaign.name,
        status: campaign.status,
        sent_count: campaign.sentCount,
        failed_count: campaign.failedCount,
        total_count: campaign.totalCount,
        read_rate: campaign.readRate,
        sent_date: campaign.sentDate,
        template_id: campaign.templateId,
        target: campaign.target as unknown as Json,
        logs: campaign.logs as unknown as Json,
    };
}

function mapCampaignFromDb(dbCampaign: Database['public']['Tables']['campaigns']['Row']): Campaign {
    return {
        id: dbCampaign.id,
        name: dbCampaign.name,
        status: dbCampaign.status as CampaignStatus,
        sentCount: dbCampaign.sent_count,
        failedCount: dbCampaign.failed_count,
        totalCount: dbCampaign.total_count,
        readRate: dbCampaign.read_rate,
        sentDate: dbCampaign.sent_date,
        templateId: dbCampaign.template_id,
        target: dbCampaign.target as CampaignTarget,
        logs: (dbCampaign.logs as any as CampaignLog[] | null) || [],
    };
}


export async function getCampaigns(): Promise<Campaign[]> {
    const { data, error } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error("Error fetching campaigns:", error);
        throw new Error(error.message);
    }
    return (data || []).map(mapCampaignFromDb);
}

export async function getCampaignById(id: number): Promise<Campaign | undefined> {
    const { data, error } = await supabase.from('campaigns').select('*').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') return undefined; // Row not found
      console.error(`Error fetching campaign ${id}:`, error);
      throw new Error(error.message);
    }
    return data ? mapCampaignFromDb(data) : undefined;
}

export async function addCampaign(campaign: Omit<Campaign, 'id'>): Promise<Campaign> {
    const { data, error } = await supabase.from('campaigns').insert([mapCampaignToDb(campaign)] as any).select().single();
    if (error) {
        console.error("Error adding campaign:", error);
        throw new Error(error.message);
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localDataChanged'));
    }
    return mapCampaignFromDb(data);
}

export async function updateCampaign(updatedCampaign: Campaign): Promise<void> {
    const { id, ...campaignData } = updatedCampaign;
    const { error } = await supabase.from('campaigns').update(mapCampaignToDb(campaignData) as any).eq('id', id);
    if (error) {
        console.error("Error updating campaign:", error);
        throw new Error(error.message);
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localDataChanged'));
    }
}

export async function deleteCampaign(campaignId: number): Promise<void> {
    const { error } = await supabase.from('campaigns').delete().eq('id', campaignId);
    if (error) {
        console.error("Error deleting campaign:", error);
        throw new Error(error.message);
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localDataChanged'));
    }
}

export async function addCampaignLog(campaignId: number, log: Omit<CampaignLog, 'timestamp'>): Promise<void> {
    const campaign = await getCampaignById(campaignId);
    if (campaign) {
        const newLog: CampaignLog = {
            timestamp: new Date().toISOString(),
            ...log
        };
        const updatedLogs = [newLog, ...(campaign.logs || [])];
        
        const { error } = await supabase
            .from('campaigns')
            .update({ logs: updatedLogs as unknown as Json } as any)
            .eq('id', campaignId);

        if (error) {
            console.error("Error adding campaign log:", error);
            throw new Error(error.message);
        }
        // No need to dispatch event here as updateCampaign will be called right after
    }
}
