



import React, { memo, useMemo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import type { AutomationNode, ActionRandomizerData, TriggerTagAddedData, ActionSendMessageData, ActionWaitData, ActionAddTagData, ActionRemoveTagData, TriggerCrmStageChangedData, TriggerContextMessageData, ActionMoveCrmStageData, ActionForwardAutomationData, CrmBoard, TriggerWebhookData } from '../types';
import { TRIGGER_OPTIONS, ACTION_OPTIONS, NODE_ICONS } from '../services/automationUtils';
import { CheckCircleIcon, XCircleIcon } from '../components/icons';


export const AutomationCustomNode = memo(({ id, data, selected }: NodeProps<{ node: AutomationNode, inspectorData: any, stats: { total: number, success: number, error: number } }>) => {
    const { node, inspectorData, stats } = data;
    const isTrigger = node.type === 'trigger';
    const title = [...TRIGGER_OPTIONS, ...ACTION_OPTIONS].find(opt => opt.value === node.subType)?.label || 'Nó Desconhecido';
    const icon = NODE_ICONS[node.subType];

    const getNodeDescription = (node: AutomationNode) => {
        const data = node.data;
        switch(data.type) {
            case 'webhook': return `ID: ...${(data as TriggerWebhookData).webhookId.slice(-12)}`;
            case 'tag_added': return `Tag: ${(data as TriggerTagAddedData).value || 'Qualquer'}`;
            case 'crm_stage_changed': {
                const triggerData = data as TriggerCrmStageChangedData;
                const boardName = inspectorData?.boards?.find((b: any) => b.id === triggerData.crmBoardId)?.name;
                const stageName = inspectorData?.crmStages?.find((s: any) => s.id === triggerData.crmStageId)?.title;

                if (boardName && stageName) return `${boardName} -> ${stageName}`;
                if (boardName) return `${boardName} -> Qualquer Etapa`;
                if (stageName) return `Etapa: ${stageName}`;
                return 'Qualquer etapa';
            }
             case 'context_message': {
                const msgData = data as TriggerContextMessageData;
                if (!msgData.value || msgData.match === 'any') return `Mensagem: Qualquer`;
                const matchText = msgData.match === 'exact' ? 'exata' : 'contém';
                return `Mensagem ${matchText} "${msgData.value}"`;
            }
            case 'send_message': return `Tipo: ${(data as ActionSendMessageData).subType}`;
            case 'wait': return `Aguardar ${(data as ActionWaitData).delay || 1} ${(data as ActionWaitData).unit || 'minutos'}`;
            case 'add_tag': return `Adicionar: ${(data as ActionAddTagData).tagName || 'N/A'}`;
            case 'remove_tag': return `Remover: ${(data as ActionRemoveTagData).tagName || 'N/A'}`;
            case 'move_crm_stage': {
                const moveData = data as ActionMoveCrmStageData;
                const boardName = inspectorData?.boards?.find((b: CrmBoard) => b.id === moveData.crmBoardId)?.name;
                const stageName = inspectorData?.crmStages?.find((s: any) => s.id === moveData.crmStageId)?.title;
                
                if (boardName && stageName) {
                    return `${boardName} -> ${stageName}`;
                }
                return `Mover para: ${stageName || 'Não configurado'}`;
            }
            case 'forward_automation': {
                const fData = data as ActionForwardAutomationData;
                const automationName = inspectorData?.allAutomations?.find((a: any) => a.id === fData.automationId)?.name;
                return `Encaminhar para: ${automationName || 'N/A'}`;
            }
            default: return null;
        }
    }

    const customSourceHandles = useMemo(() => {
        if (node.subType === 'conditional') {
            return (
                <>
                    <Handle type="source" position={Position.Bottom} id="true" style={{ left: '25%' }} className="!bg-green-500 !w-3 !h-3"><div className="absolute -top-6 text-xs font-bold text-green-600">SIM</div></Handle>
                    <Handle type="source" position={Position.Bottom} id="false" style={{ left: '75%' }} className="!bg-red-500 !w-3 !h-3"><div className="absolute -top-6 text-xs font-bold text-red-600">NÃO</div></Handle>
                </>
            );
        }
        if (node.subType === 'randomizer') {
             const branches = (node.data as ActionRandomizerData).branches || 2;
             return Array.from({ length: branches }).map((_, i) => (
                <Handle key={`branch-${i}`} type="source" position={Position.Bottom} id={`branch-${i}`}
                    style={{ left: `${(100 / (branches + 1)) * (i + 1)}%` }}
                    className="!w-3 !h-3 !bg-purple-500" />
            ));
        }
        return <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-amber-500" />;
    }, [node.subType, node.data]);

    return (
        <div className={`bg-white rounded-lg shadow-md border-2 min-w-[240px] max-w-xs ${selected ? 'border-amber-500 shadow-amber-200' : 'border-gray-200'}`}>
            {!isTrigger && <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-amber-500" />}
            <div className="p-3 flex items-start space-x-3">
                <div className="flex-shrink-0 pt-1">{icon}</div>
                <div className="flex-grow min-w-0">
                    <p className="font-bold text-gray-800">{title}</p>
                    <p className="text-xs text-gray-500 break-words">{getNodeDescription(node)}</p>
                </div>
            </div>

            {stats && stats.total > 0 && (
                <div className="bg-gray-50 border-t text-xs text-gray-600 p-2 flex justify-around items-center font-medium">
                    <span>Exec: {stats.total}</span>
                    <span className="flex items-center text-green-600">
                        <CheckCircleIcon className="w-4 h-4 mr-1" /> {stats.success || 0}
                    </span>
                    <span className="flex items-center text-red-600">
                        <XCircleIcon className="w-4 h-4 mr-1" /> {stats.error || 0}
                    </span>
                </div>
            )}
            
            {customSourceHandles}
        </div>
    );
});