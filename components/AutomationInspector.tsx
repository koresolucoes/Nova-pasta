

import React, { useState, useEffect, useRef } from 'react';
import { Node as ReactFlowNode } from 'reactflow';
import type { Automation, AutomationNode, AutomationData, MessageTemplate, WhatsAppFlow, ActionSendMessageData, ActionWaitData, ActionAddTagData, TriggerTagAddedData, ActionConditionalData, Condition, TagCondition, FieldCondition, WindowCondition, BusinessHoursCondition, ActionRandomizerData, ActionMoveCrmStageData, ActionHttpRequestData, HttpHeader, ActionForwardAutomationData, TriggerCrmStageChangedData, TriggerContextMessageData, AutomationTriggerType, AutomationActionType, CrmBoard, TriggerWebhookData } from '../types';
import { TRIGGER_OPTIONS, ACTION_OPTIONS } from '../services/automationUtils';
import { getAutomationById } from '../services/automationService';
import { SparklesIcon, TrashIcon, PlusIcon } from '../components/icons';
import { v4 as uuidv4 } from 'uuid';
import { FlowStatus } from '../types';

const formFieldClasses = "w-full px-3 py-2 text-sm text-gray-700 bg-gray-100 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500 transition-colors duration-200";
const formSelectClasses = `${formFieldClasses} appearance-none`;

const InspectorField = ({ label, children, helpText }: { label: string, children: React.ReactNode, helpText?: string }) => (
    <div>
        <label className="font-semibold text-sm text-gray-700">{label}</label>
        <div className="mt-1">{children}</div>
        {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
    </div>
);

interface AutomationInspectorProps {
    selectedNode: ReactFlowNode<any> | null;
    automation: Automation;
    inspectorData: {
        templates: MessageTemplate[];
        flows: WhatsAppFlow[];
        boards: CrmBoard[];
        crmStages: {id: string, title: string}[];
        allTags: string[];
        allAutomations: Automation[];
    };
    updateNode: (nodeId: string, data: Partial<AutomationData>, replace?: boolean) => void;
    deleteNode: (nodeId: string) => void;
    changeNodeSubType: (nodeId: string, newSubType: AutomationTriggerType | AutomationActionType) => void;
}

export const AutomationInspector = ({ selectedNode, automation, inspectorData, updateNode, deleteNode, changeNodeSubType }: AutomationInspectorProps) => {
    if (!selectedNode) {
        return (
            <aside className="w-96 bg-white border-l p-4 overflow-y-auto">
                <div className="text-center text-gray-500 mt-10">
                    <span className="inline-block p-3 bg-gray-100 rounded-full mb-3">
                        <SparklesIcon className="w-8 h-8 text-gray-500" />
                    </span>
                    <h3 className="font-bold">Editor de Automação</h3>
                    <p>Selecione um nó no canvas para editar suas propriedades aqui.</p>
                </div>
            </aside>
        );
    }

    const node = selectedNode.data.node as AutomationNode;
    const isTrigger = node.type === 'trigger';
    const update = (data: Partial<AutomationData>, replace = false) => updateNode(node.id, data, replace);
    const title = [...TRIGGER_OPTIONS, ...ACTION_OPTIONS].find(opt => opt.value === node.subType)?.label || 'Nó Desconhecido';
    
    // Hardcoded contact fields for now. In a real app, this could be dynamic.
    const contactFields = ['name', 'phone'];

    const renderInspectorContent = () => {
        switch(node.subType) {
            case 'webhook': {
                const webhookData = node.data as TriggerWebhookData;
                const webhookUrl = `${window.location.origin}/api/automations/execute-webhook?id=${webhookData.webhookId}`;
                
                const [countdown, setCountdown] = useState(0);
                const isMounted = useRef(true);

                useEffect(() => {
                    isMounted.current = true;
                    return () => { isMounted.current = false; };
                }, []);
                
                // Polling and Countdown Effect
                useEffect(() => {
                    if (!webhookData.isListening) {
                        setCountdown(0);
                        return; // Stop if not listening
                    }
                
                    // Set initial countdown
                    setCountdown(60);
                
                    const pollInterval = setInterval(async () => {
                        try {
                            const freshAutomation = await getAutomationById(automation.id);
                            if (!isMounted.current || !freshAutomation) return;
                            const freshWebhookNode = freshAutomation.nodes.find(n => n.id === node.id);
                            // Check if the sample has been captured by the backend
                            if (freshWebhookNode && (freshWebhookNode.data as TriggerWebhookData).lastSample) {
                                update((freshWebhookNode.data as TriggerWebhookData), true); // Replace data, which includes isListening: false
                            }
                        } catch (error) {
                            console.error("Polling for webhook sample failed:", error);
                        }
                    }, 3000); // Poll every 3 seconds
                
                    const countdownInterval = setInterval(() => {
                        setCountdown(prev => {
                            if (prev <= 1) {
                                // Time's up
                                clearInterval(pollInterval);
                                clearInterval(countdownInterval);
                                if (isMounted.current) {
                                    // Check one last time before timing out
                                    getAutomationById(automation.id).then(freshAutomation => {
                                        if (!isMounted.current || !freshAutomation) return;
                                        const freshWebhookNode = freshAutomation.nodes.find(n => n.id === node.id);
                                        if (!freshWebhookNode || !(freshWebhookNode.data as TriggerWebhookData).lastSample) {
                                           // if still no sample, then timeout
                                           if (isMounted.current) update({ isListening: false });
                                        } else {
                                           // if sample arrived at last second
                                           if (isMounted.current) update((freshWebhookNode.data as TriggerWebhookData), true);
                                        }
                                    });
                                }
                                return 0;
                            }
                            return prev - 1;
                        });
                    }, 1000);
                
                    // Cleanup function
                    return () => {
                        clearInterval(pollInterval);
                        clearInterval(countdownInterval);
                    };
                
                }, [webhookData.isListening, automation.id, node.id, update]);
                
                const handleListen = () => {
                    update({ isListening: true, lastSample: null });
                };
                const clearSample = () => update({ lastSample: null });

                const copyToClipboard = () => {
                    navigator.clipboard.writeText(webhookUrl);
                    alert('URL copiada para a área de transferência!');
                };
                
                const parseVariables = (obj: any, prefix = 'webhook'): string[] => {
                    let vars: string[] = [];
                    for (const key in obj) {
                        if (obj.hasOwnProperty(key)) {
                            const newPrefix = `${prefix}.${key}`;
                            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                                vars = vars.concat(parseVariables(obj[key], newPrefix));
                            } else {
                                vars.push(`{{${newPrefix}}}`);
                            }
                        }
                    }
                    return vars;
                };

                const availableVariables = webhookData.lastSample ? parseVariables(webhookData.lastSample) : [];

                return (
                    <div className="space-y-4">
                        <InspectorField label="URL do Webhook (POST)">
                             <div className="flex items-center space-x-2">
                                <input type="text" value={webhookUrl} readOnly className={`${formFieldClasses} font-mono`} />
                                <button onClick={copyToClipboard} className="bg-gray-200 hover:bg-gray-300 p-2 rounded-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                </button>
                            </div>
                        </InspectorField>
                        
                        <div className="p-3 bg-gray-50 border rounded-lg">
                            <h4 className="font-semibold text-sm">Testar Gatilho</h4>
                            <p className="text-xs text-gray-500 mb-3">Envie uma requisição POST para a URL acima para capturar uma amostra dos dados.</p>
                            <button onClick={handleListen} disabled={webhookData.isListening} className="w-full bg-amber-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-amber-600 transition disabled:opacity-50">
                                {webhookData.isListening ? `Ouvindo... (${countdown}s)` : 'Ouvir para capturar dados'}
                            </button>
                        </div>

                        {webhookData.lastSample && (
                            <div className="space-y-3">
                                <InspectorField label="Última Amostra Recebida">
                                    <pre className="text-xs bg-gray-900 text-white p-3 rounded-md max-h-48 overflow-auto font-mono">{JSON.stringify(webhookData.lastSample, null, 2)}</pre>
                                     <button onClick={clearSample} className="text-xs text-red-500 hover:underline mt-1">Limpar amostra</button>
                                </InspectorField>
                                <InspectorField label="Variáveis Disponíveis">
                                    <div className="p-2 border rounded-md bg-gray-50 max-h-40 overflow-y-auto">
                                        {availableVariables.map(v => <p key={v} className="text-xs font-mono">{v}</p>)}
                                    </div>
                                </InspectorField>
                            </div>
                        )}
                    </div>
                );
            }
            case 'tag_added': {
                const tagData = node.data as TriggerTagAddedData;
                return <InspectorField label="Gatilho de Tag"><select value={tagData.value || ''} onChange={e => update({ value: e.target.value })} className={formSelectClasses}><option value="">Qualquer Tag</option>{inspectorData.allTags.map((tag: string) => <option key={tag} value={tag}>{tag}</option>)}</select></InspectorField>;
            }
            case 'crm_stage_changed': {
                const crmData = node.data as TriggerCrmStageChangedData;
                
                const handleBoardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
                    update({ crmBoardId: e.target.value, crmStageId: '' });
                };

                const stageOptions = crmData.crmBoardId
                    ? inspectorData.boards.find(b => b.id === crmData.crmBoardId)?.columns || []
                    : inspectorData.boards.flatMap(b => b.columns.map(c => ({ ...c, title: `${b.name} (${c.title})` })));

                return (
                    <div className="space-y-4">
                        <InspectorField label="Board do CRM">
                            <select value={crmData.crmBoardId || ''} onChange={handleBoardChange} className={formSelectClasses}>
                                <option value="">Qualquer Board</option>
                                {inspectorData.boards.map((board: CrmBoard) => <option key={board.id} value={board.id}>{board.name}</option>)}
                            </select>
                        </InspectorField>
                        <InspectorField label="Etapa do CRM">
                            <select value={crmData.crmStageId || ''} onChange={e => update({ crmStageId: e.target.value })} className={formSelectClasses}>
                                <option value="">Qualquer Etapa</option>
                                {stageOptions.map((stage: any) => <option key={stage.id} value={stage.id}>{stage.title}</option>)}
                            </select>
                        </InspectorField>
                    </div>
                );
            }
             case 'context_message': {
                const msgData = node.data as TriggerContextMessageData;
                return (
                    <div className="space-y-4">
                        <InspectorField label="Condição de Correspondência">
                             <select value={msgData.match || 'any'} onChange={e => update({ match: e.target.value as any })} className={formSelectClasses}>
                                <option value="any">Qualquer mensagem</option>
                                <option value="contains">Contém</option>
                                <option value="exact">É exatamente</option>
                            </select>
                        </InspectorField>
                        {msgData.match !== 'any' && (
                            <InspectorField label="Texto da Mensagem">
                                <input type="text" value={msgData.value || ''} onChange={e => update({ value: e.target.value })} className={formFieldClasses} />
                            </InspectorField>
                        )}
                    </div>
                );
            }
            case 'send_message': {
                const smData = node.data as ActionSendMessageData;
                const publishedFlows = inspectorData.flows.filter(f => f.status === FlowStatus.PUBLISHED);
                const handleSubTypeChange = (newSubType: 'text' | 'flow' | 'template') => {
                    let newData: ActionSendMessageData;
                    if (newSubType === 'text') {
                        newData = { type: 'send_message', subType: 'text', text: '' };
                    } else if (newSubType === 'flow') {
                        newData = { type: 'send_message', subType: 'flow', flowId: '' };
                    } else { // template
                        newData = { type: 'send_message', subType: 'template', templateId: '' };
                    }
                    update(newData, true); 
                };
                return (
                    <div className="space-y-4">
                        <div className="flex items-center rounded-lg bg-gray-100 p-1 text-xs">
                            <button onClick={() => handleSubTypeChange('text')} className={`flex-1 p-1.5 rounded-md ${smData.subType === 'text' ? 'bg-white shadow font-semibold' : ''}`}>Texto</button>
                            <button onClick={() => handleSubTypeChange('flow')} className={`flex-1 p-1.5 rounded-md ${smData.subType === 'flow' ? 'bg-white shadow font-semibold' : ''}`}>Flow</button>
                            <button onClick={() => handleSubTypeChange('template')} className={`flex-1 p-1.5 rounded-md ${smData.subType === 'template' ? 'bg-white shadow font-semibold' : ''}`}>Template</button>
                        </div>
                        {smData.subType === 'text' && <InspectorField label="Mensagem"><textarea value={smData.text || ''} onChange={e => update({ text: e.target.value })} placeholder="Sua mensagem... Use {{contact.name}} para personalizar." className={`${formFieldClasses} h-28`}></textarea></InspectorField>}
                        {smData.subType === 'flow' && <InspectorField label="Flow Publicado"><select value={smData.flowId || ''} onChange={e => update({ flowId: e.target.value })} className={formSelectClasses}><option value="">Selecione um Flow...</option>{publishedFlows.map((f: WhatsAppFlow) => <option key={f.id} value={f.metaFlowId}>{f.name}</option>)}</select></InspectorField>}
                        {smData.subType === 'template' && <InspectorField label="Template Aprovado"><select value={smData.templateId || ''} onChange={e => update({ templateId: e.target.value })} className={formSelectClasses}><option value="">Selecione um Template...</option>{inspectorData.templates.map((t: MessageTemplate) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></InspectorField>}
                    </div>
                );
            }
            case 'wait': {
                 const wData = node.data as ActionWaitData;
                 return (
                    <InspectorField label="Período de Atraso">
                        <div className="flex items-center space-x-2">
                            <input type="number" min="1" value={wData.delay || 1} onChange={e => update({ delay: parseInt(e.target.value) || 1 })} className={formFieldClasses} />
                            <select value={wData.unit || 'minutes'} onChange={e => update({ unit: e.target.value as 'minutes' | 'hours' | 'days' })} className={formSelectClasses}>
                                <option value="minutes">Minutos</option><option value="hours">Horas</option><option value="days">Dias</option>
                            </select>
                        </div>
                    </InspectorField>
                 );
            }
            case 'add_tag':
            case 'remove_tag': {
                 const aData = node.data as ActionAddTagData;
                 return <InspectorField label="Nome da Tag"><input type="text" value={aData.tagName || ''} onChange={e => update({ tagName: e.target.value })} placeholder="Ex: cliente-vip" className={formFieldClasses}/></InspectorField>
            }
             case 'move_crm_stage': {
                const moveData = node.data as ActionMoveCrmStageData;
                const selectedBoard = inspectorData.boards.find(b => b.id === moveData.crmBoardId);

                const handleBoardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
                    const newBoardId = e.target.value;
                    update({ crmBoardId: newBoardId, crmStageId: '' });
                };

                return (
                    <div className="space-y-4">
                        <InspectorField label="Board do CRM">
                            <select 
                                value={moveData.crmBoardId || ''} 
                                onChange={handleBoardChange} 
                                className={formSelectClasses}
                            >
                                <option value="">Selecione um board...</option>
                                {inspectorData.boards.map((board: CrmBoard) => (
                                    <option key={board.id} value={board.id}>{board.name}</option>
                                ))}
                            </select>
                        </InspectorField>
                        <InspectorField label="Mover Para a Etapa">
                            <select 
                                value={moveData.crmStageId || ''} 
                                onChange={e => update({ crmStageId: e.target.value })} 
                                className={formSelectClasses}
                                disabled={!selectedBoard}
                            >
                                <option value="">Selecione a etapa de destino...</option>
                                {selectedBoard?.columns.map((col: any) => (
                                    <option key={col.id} value={col.id}>{col.title}</option>
                                ))}
                            </select>
                        </InspectorField>
                    </div>
                );
            }
            case 'randomizer': {
                const rData = node.data as ActionRandomizerData;
                return <InspectorField label="Número de Caminhos"><input type="number" min="2" max="5" value={rData.branches || 2} onChange={e => update({ branches: parseInt(e.target.value) || 2 })} className={formFieldClasses} /></InspectorField>
            }
            case 'forward_automation': {
                const fData = node.data as ActionForwardAutomationData;
                return <InspectorField label="Encaminhar Para"><select value={fData.automationId || ''} onChange={e => update({ automationId: e.target.value })} className={formSelectClasses}><option value="">Selecione a automação...</option>{inspectorData.allAutomations.filter(a => a.id !== automation.id).map((a: Automation) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></InspectorField>
            }
            case 'http_request': {
                const hData = node.data as ActionHttpRequestData;
                const updateHeader = (index: number, key: string, value: string) => {
                    const newHeaders = [...(hData.headers || [])];
                    newHeaders[index] = { ...newHeaders[index], [key]: value };
                    update({ headers: newHeaders });
                };
                const addHeader = () => update({ headers: [...(hData.headers || []), { id: uuidv4(), key: '', value: '' }] });
                const removeHeader = (id: string) => update({ headers: hData.headers?.filter(h => h.id !== id) });

                return (
                    <div className="space-y-4">
                        <InspectorField label="URL"><input type="url" value={hData.url || ''} onChange={e => update({ url: e.target.value })} placeholder="https://api.example.com/data" className={formFieldClasses} /></InspectorField>
                        <InspectorField label="Método"><select value={hData.method || 'GET'} onChange={e => update({ method: e.target.value as any })} className={formSelectClasses}><option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option></select></InspectorField>
                        <div>
                            <label className="font-semibold text-sm text-gray-700">Cabeçalhos (Headers)</label>
                            <div className="space-y-2 mt-1">
                                {hData.headers?.map((header, index) => (
                                    <div key={header.id} className="flex items-center space-x-2">
                                        <input type="text" value={header.key} onChange={e => updateHeader(index, 'key', e.target.value)} placeholder="Key" className={formFieldClasses} />
                                        <input type="text" value={header.value} onChange={e => updateHeader(index, 'value', e.target.value)} placeholder="Value" className={formFieldClasses} />
                                        <button onClick={() => removeHeader(header.id)} className="p-1 text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                    </div>
                                ))}
                                <button onClick={addHeader} className="text-sm font-semibold text-amber-600 hover:underline">+ Adicionar Cabeçalho</button>
                            </div>
                        </div>
                        <InspectorField label="Corpo (JSON)"><textarea value={hData.body || ''} onChange={e => update({ body: e.target.value })} placeholder='{ "key": "value" }' className={`${formFieldClasses} h-24 font-mono`}></textarea></InspectorField>
                    </div>
                );
            }
            case 'conditional': {
                const cData = node.data as ActionConditionalData;
                
                const handleConditionChange = (index: number, updatedData: Partial<Condition>) => {
                    const newConditions = [...cData.conditions];
                    const oldCondition = newConditions[index];
                    let newConditionData: Condition;
                    
                    if (updatedData.source && updatedData.source !== oldCondition.source) {
                        const base = { id: oldCondition.id };
                        switch(updatedData.source) {
                            case 'contact_tag': newConditionData = { ...base, source: 'contact_tag', operator: 'contains', value: '' }; break;
                            case 'contact_field': newConditionData = { ...base, source: 'contact_field', field: 'name', operator: 'is', value: '' }; break;
                            case 'conversation_window': newConditionData = { ...base, source: 'conversation_window', operator: 'is_open' }; break;
                            case 'business_hours': newConditionData = { ...base, source: 'business_hours', operator: 'is_within', days: ['mon', 'tue', 'wed', 'thu', 'fri'], startTime: '09:00', endTime: '18:00' }; break;
                            default: newConditionData = oldCondition;
                        }
                    } else {
                        switch (oldCondition.source) {
                            case 'contact_tag': newConditionData = { ...oldCondition, ...(updatedData as Partial<TagCondition>) }; break;
                            case 'contact_field': newConditionData = { ...oldCondition, ...(updatedData as Partial<FieldCondition>) }; break;
                            case 'conversation_window': newConditionData = { ...oldCondition, ...(updatedData as Partial<WindowCondition>) }; break;
                            case 'business_hours': newConditionData = { ...oldCondition, ...(updatedData as Partial<BusinessHoursCondition>) }; break;
                            default: const _exhaustiveCheck: never = oldCondition; newConditionData = oldCondition;
                        }
                    }
                    newConditions[index] = newConditionData;
                    update({ conditions: newConditions });
                };

                const addCondition = () => {
                    const newCondition: TagCondition = { id: uuidv4(), source: 'contact_tag', operator: 'contains', value: '' };
                    update({ conditions: [...cData.conditions, newCondition] });
                };

                const removeCondition = (index: number) => update({ conditions: cData.conditions.filter((_, i) => i !== index) });

                return (
                    <div className="space-y-4">
                         <InspectorField label="Lógica">
                            <div className="flex items-center rounded-lg bg-gray-100 p-1 text-xs">
                                <button onClick={() => update({ logic: 'and' })} className={`flex-1 p-1.5 rounded-md ${cData.logic === 'and' ? 'bg-white shadow font-semibold' : ''}`}>E (Todas)</button>
                                <button onClick={() => update({ logic: 'or' })} className={`flex-1 p-1.5 rounded-md ${cData.logic === 'or' ? 'bg-white shadow font-semibold' : ''}`}>OU (Qualquer)</button>
                            </div>
                        </InspectorField>
                        <div className="space-y-3">
                            {cData.conditions.map((cond, index) => (
                                <div key={cond.id} className="p-3 bg-gray-50 rounded-lg space-y-2 border relative">
                                    <button onClick={() => removeCondition(index)} type="button" className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                    <select value={cond.source} onChange={e => handleConditionChange(index, { source: e.target.value as Condition['source']})} className={formSelectClasses}>
                                        <option value="contact_tag">Tag do Contato</option><option value="contact_field">Campo do Contato</option><option value="conversation_window">Janela de 24h</option><option value="business_hours">Horário Comercial</option>
                                    </select>
                                     {cond.source === 'contact_tag' && (<><select value={cond.operator} onChange={e => handleConditionChange(index, { operator: e.target.value as any })} className={formSelectClasses}><option value="contains">Contém a tag</option><option value="not_contains">Não contém a tag</option></select><input type="text" value={cond.value} onChange={e => handleConditionChange(index, { value: e.target.value })} placeholder="Nome da tag" className={formFieldClasses} /></>)}
                                     {cond.source === 'contact_field' && (<><select value={cond.field} onChange={e => handleConditionChange(index, { field: e.target.value as any })} className={formSelectClasses}>{contactFields.map(f => <option key={f} value={f}>{f}</option>)}</select><select value={cond.operator} onChange={e => handleConditionChange(index, { operator: e.target.value as any })} className={formSelectClasses}><option value="is">É</option><option value="is_not">Não é</option><option value="contains">Contém</option></select><input type="text" value={cond.value} onChange={e => handleConditionChange(index, { value: e.target.value })} placeholder="Valor a comparar" className={formFieldClasses} /></>)}
                                     {cond.source === 'conversation_window' && (<select value={cond.operator} onChange={e => handleConditionChange(index, { operator: e.target.value as any })} className={formSelectClasses}><option value="is_open">Está aberta</option><option value="is_closed">Está fechada</option></select>)}
                                     {cond.source === 'business_hours' && (<><select value={cond.operator} onChange={e => handleConditionChange(index, { operator: e.target.value as any })} className={formSelectClasses}><option value="is_within">Está dentro</option><option value="is_outside">Está fora</option></select><div className="flex items-center space-x-2"><input type="time" value={cond.startTime} onChange={e => handleConditionChange(index, { startTime: e.target.value })} className={formFieldClasses}/><input type="time" value={cond.endTime} onChange={e => handleConditionChange(index, { endTime: e.target.value })} className={formFieldClasses}/></div></>)}
                                </div>
                            ))}
                        </div>
                        <button onClick={addCondition} className="flex items-center text-sm font-semibold text-amber-600 hover:underline"><PlusIcon className="w-4 h-4 mr-1"/> Adicionar Condição</button>
                    </div>
                );
            }
            default:
                return <p className="text-sm text-gray-500">Este nó não possui configurações.</p>;
        }
    };
    
    return (
        <aside className="w-96 bg-white border-l p-4 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-gray-800">{title}</h3>
                <button onClick={() => deleteNode(node.id)} className="p-1 text-gray-400 hover:text-red-500"><TrashIcon className="w-5 h-5"/></button>
            </div>
            
            {isTrigger && (
                <div className="mb-4">
                    <InspectorField label="Tipo de Gatilho">
                        <select 
                            value={node.subType} 
                            onChange={e => changeNodeSubType(node.id, e.target.value as AutomationTriggerType)} 
                            className={formSelectClasses}
                        >
                            {TRIGGER_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </InspectorField>
                </div>
            )}
            
            <div className="space-y-4">
                {renderInspectorContent()}
            </div>
        </aside>
    );
};