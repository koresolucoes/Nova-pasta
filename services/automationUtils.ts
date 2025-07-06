


import React from 'react';
import type { AutomationData, AutomationTriggerType, AutomationActionType } from '../types';
import {
    ContactsIcon, TagIcon, TableCellsIcon, PaperAirplaneIcon, ClockIcon, ConditionalIcon,
    HttpRequestIcon, RandomizerIcon, ForwardIcon, XCircleIcon, ChatBubbleOvalLeftEllipsisIcon, ArrowTrendingUpIcon
} from '../components/icons';
import { v4 as uuidv4 } from 'uuid';

// --- Static Data & Configuration ---
export const TRIGGER_OPTIONS: { value: AutomationTriggerType; label: string; icon: React.ReactNode; description: string; }[] = [
    { value: 'contact_created', label: 'Contato Criado', icon: React.createElement(ContactsIcon, { className: "w-5 h-5" }), description: "Inicia quando um novo contato é adicionado." },
    { value: 'tag_added', label: 'Tag Adicionada', icon: React.createElement(TagIcon, { className: "w-5 h-5" }), description: "Inicia quando uma tag específica é adicionada a um contato." },
    { value: 'crm_stage_changed', label: 'Etapa do CRM Alterada', icon: React.createElement(TableCellsIcon, { className: "w-5 h-5" }), description: "Inicia quando um contato é movido para uma etapa do CRM." },
    { value: 'context_message', label: 'Mensagem de Contato', icon: React.createElement(ChatBubbleOvalLeftEllipsisIcon, { className: "w-5 h-5" }), description: "Inicia quando uma mensagem específica é recebida." },
    { value: 'webhook', label: 'Webhook Recebido', icon: React.createElement(HttpRequestIcon, { className: "w-5 h-5" }), description: "Inicia a partir de uma chamada HTTP externa." },
];

export const ACTION_OPTIONS: { value: AutomationActionType; label: string; icon: React.ReactNode; description: string }[] = [
    { value: 'send_message', label: 'Enviar Mensagem', icon: React.createElement(PaperAirplaneIcon, { className: "w-5 h-5" }), description: "Envia uma mensagem de texto, template ou flow." },
    { value: 'wait', label: 'Atraso Inteligente', icon: React.createElement(ClockIcon, { className: "w-5 h-5" }), description: "Pausa a automação por um período definido." },
    { value: 'add_tag', label: 'Adicionar Tag', icon: React.createElement(TagIcon, { className: "w-5 h-5" }), description: "Adiciona uma ou mais tags ao contato." },
    { value: 'remove_tag', label: 'Remover Tag', icon: React.createElement(TagIcon, { className: "w-5 h-5" }), description: "Remove uma ou mais tags do contato." },
    { value: 'move_crm_stage', label: 'Mover no CRM', icon: React.createElement(ArrowTrendingUpIcon, { className: "w-5 h-5" }), description: "Move o contato para outra etapa do CRM." },
    { value: 'conditional', label: 'Condicional', icon: React.createElement(ConditionalIcon, { className: "w-5 h-5" }), description: "Divide o fluxo com base em condições (Sim/Não)." },
    { value: 'http_request', label: 'Requisição HTTP', icon: React.createElement(HttpRequestIcon, { className: "w-5 h-5" }), description: "Envia dados para um serviço externo." },
    { value: 'opt_out', label: 'Opt-Out', icon: React.createElement(XCircleIcon, { className: "w-5 h-5" }), description: "Marca o contato para não receber mais automações." },
    { value: 'randomizer', label: 'Randomizador', icon: React.createElement(RandomizerIcon, { className: "w-5 h-5" }), description: "Divide o fluxo aleatoriamente em vários caminhos." },
    { value: 'forward_automation', label: 'Encaminhar Automação', icon: React.createElement(ForwardIcon, { className: "w-5 h-5" }), description: "Envia o contato para outra automação." },
];

export const NODE_ICONS = Object.fromEntries(
    [...TRIGGER_OPTIONS, ...ACTION_OPTIONS].map(opt => [opt.value, opt.icon])
) as Record<AutomationTriggerType | AutomationActionType, React.ReactNode>;

export const getDefaultNodeData = (subType: AutomationTriggerType | AutomationActionType): AutomationData => {
    switch (subType) {
        // Triggers
        case 'contact_created': return { type: 'contact_created' };
        case 'tag_added': return { type: 'tag_added', value: '' };
        case 'crm_stage_changed': return { type: 'crm_stage_changed', crmBoardId: '', crmStageId: '' };
        case 'context_message': return { type: 'context_message', match: 'any', value: '' };
        case 'webhook': return { type: 'webhook', webhookId: uuidv4(), isListening: false, lastSample: null };
        // Actions
        case 'send_message': return { type: 'send_message', subType: 'text', text: 'Olá {{contact.name}}!' };
        case 'wait': return { type: 'wait', delay: 5, unit: 'minutes' };
        case 'add_tag': return { type: 'add_tag', tagName: '' };
        case 'remove_tag': return { type: 'remove_tag', tagName: '' };
        case 'move_crm_stage': return { type: 'move_crm_stage', crmBoardId: '', crmStageId: '' };
        case 'conditional': return { type: 'conditional', logic: 'and', conditions: [] };
        case 'http_request': return { type: 'http_request', url: '', method: 'GET', headers: [], body: '', responseMapping: [] };
        case 'opt_out': return { type: 'opt_out' };
        case 'randomizer': return { type: 'randomizer', branches: 2 };
        case 'forward_automation': return { type: 'forward_automation', automationId: '' };
    }
    // This part should be unreachable if the subType is always valid.
    // Throwing an error for runtime safety in case of an invalid subType.
    throw new Error(`Invalid automation node subType: ${subType}`);
};