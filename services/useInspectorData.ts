



import { useState, useEffect } from 'react';
import { getMessageTemplates, getActiveConnection } from './metaService';
import { getFlows } from './flowService';
import { getBoards, getAllStages } from './crmService';
import { getAllTags } from './contactService';
import { getAutomations } from './automationService';
import { MessageTemplate, WhatsAppFlow, Automation, CrmBoard } from '../types';

export const useInspectorData = () => {
    const [inspectorData, setInspectorData] = useState<{
        templates: MessageTemplate[];
        flows: WhatsAppFlow[];
        boards: CrmBoard[];
        crmStages: any[];
        allTags: string[];
        allAutomations: Automation[];
    }>({
        templates: [],
        flows: [],
        boards: [],
        crmStages: [],
        allTags: [],
        allAutomations: [],
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoading(true);
            try {
                const [flows, boards, crmStages, allTags, allAutomations, activeConnection] = await Promise.all([
                    getFlows().catch(() => []),
                    getBoards().catch(() => []),
                    getAllStages().catch(() => []),
                    getAllTags().catch(() => []),
                    getAutomations().catch(() => []),
                    getActiveConnection(),
                ]);

                const templates = activeConnection ? await getMessageTemplates(activeConnection).catch(() => []) : [];

                setInspectorData({
                    templates: templates.filter(t => t.status === 'APPROVED'),
                    flows,
                    boards,
                    crmStages,
                    allTags,
                    allAutomations,
                });
            } catch (error) {
                console.error("Failed to load inspector data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllData();
    }, []);

    return { inspectorData, isLoading };
};