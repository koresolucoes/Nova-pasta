

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
    ReactFlowProvider,
    useReactFlow,
    Controls,
    Background,
    BackgroundVariant,
    Node as ReactFlowNode,
} from 'reactflow';
import { AutomationInspector } from '@components/AutomationInspector';
import { AutomationToolbox } from '@components/AutomationToolbox';
import { AutomationCustomNode } from '@components/AutomationCustomNode';
import { getAutomationById } from '@services/automationService';
import { useAutomationState } from '@services/useAutomationState';
import { useInspectorData } from '@services/useInspectorData';
import { XMarkIcon } from '@components/icons';
import type { Automation } from '../types';
import { AutomationStatus } from '../types';

type AutomationWithStats = Omit<Automation, 'executionStats'> & {
    executionStats: {
        totalRuns: number;
        successfulRuns: number;
        failedRuns: number;
        lastRun?: Date;
        nodeStats: { [nodeId: string]: { total: number; success: number; error: number } };
    };
    isActive: boolean;
};

// Função auxiliar para converter Automation para AutomationWithStats
const toAutomationWithStats = (automation: Automation): AutomationWithStats => {
  // Inicializa nodeStats vazio para evitar erros
  const nodeStats = automation.executionStats || {};
  
  // Converte os valores para os tipos corretos e calcula os totais
  const typedNodeStats: { [key: string]: { total: number; success: number; error: number } } = {};
  
  Object.entries(nodeStats).forEach(([key, stat]) => {
    typedNodeStats[key] = {
      total: Number(stat?.total) || 0,
      success: Number(stat?.success) || 0,
      error: Number(stat?.error) || 0
    };
  });
  
  // Calcula os totais
  const totalRuns = Object.values(typedNodeStats).reduce((sum, stat) => sum + (stat?.total || 0), 0);
  const successfulRuns = Object.values(typedNodeStats).reduce((sum, stat) => sum + (stat?.success || 0), 0);
  const failedRuns = Object.values(typedNodeStats).reduce((sum, stat) => sum + (stat?.error || 0), 0);
  
  // Verifica se a automação está ativa
  const statusStr = String(automation.status).toLowerCase();
  const isActive = statusStr === AutomationStatus.ACTIVE.toLowerCase() || 
                  statusStr === 'ativa' || 
                  statusStr === 'active';
  
  return {
    ...automation,
    executionStats: {
      totalRuns,
      successfulRuns,
      failedRuns,
      nodeStats: typedNodeStats,
      lastRun: undefined // Será preenchido quando disponível
    },
    isActive
  };
};

const nodeTypes = { custom: AutomationCustomNode };

const AutomationBuilder = () => {
    const { automationId } = useParams<{ automationId: string }>();
    const navigate = useNavigate();
    const { screenToFlowPosition } = useReactFlow();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);

    const [initialAutomation, setInitialAutomation] = useState<Automation | null>(null);
    const [automationWithStats, setAutomationWithStats] = useState<AutomationWithStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedNode, setSelectedNode] = useState<ReactFlowNode | null>(null);

    // Fetch initial automation data once
    useEffect(() => {
        if (automationId) {
            const fetchData = async () => {
                const automation = await getAutomationById(automationId);
                if (!automation) {
                    navigate('/automacoes');
                    return;
                }
                setInitialAutomation(automation);
                setIsLoading(false);
            };
            fetchData();
            
            const handleDataChange = () => fetchData();
            window.addEventListener('localDataChanged', handleDataChange);
            return () => window.removeEventListener('localDataChanged', handleDataChange);
        }
    }, [automationId, navigate]);
    
    // Update automationWithStats when initialAutomation changes
    useEffect(() => {
        if (initialAutomation) {
            setAutomationWithStats(toAutomationWithStats(initialAutomation));
        } else {
            setAutomationWithStats(null);
        }
    }, [initialAutomation]);

    // Custom hooks for state management and data fetching
    const {
        automation,
        setAutomation: updateAutomationState,
        nodes: baseNodes,
        edges,
        onNodesChange,
        onEdgesChange,
        addNode,
        updateNodeData,
        deleteNode,
        onConnect,
        onNodeDragStop,
        onNodesDelete,
        changeNodeSubType,
    } = useAutomationState(initialAutomation);
    
    const { inspectorData } = useInspectorData();
    
    // Map over baseNodes to inject extra data for rendering
    const nodes = useMemo(() => {
        if (!baseNodes || !inspectorData || !automation) return [];
        const nodeStats = automationWithStats?.executionStats?.nodeStats || {};
        return baseNodes.map(n => ({
            ...n,
            data: {
                ...n.data,
                inspectorData,
                stats: nodeStats[n.id] || { total: 0, success: 0, error: 0 },
            }
        }));
    }, [baseNodes, inspectorData, automation, automationWithStats]);

    // This effect ensures that the `selectedNode` state is always in sync with the
    // master `automation` state. This fixes the bug where the inspector panel
    // doesn't update dynamically after a property change.
    useEffect(() => {
        if (selectedNode && baseNodes.length > 0) {
            const currentNodeInState = baseNodes.find(n => n.id === selectedNode.id);

            if (currentNodeInState) {
                // Only update the state if the data is actually different to prevent re-render loops.
                if (JSON.stringify(selectedNode.data) !== JSON.stringify(currentNodeInState.data)) {
                    setSelectedNode(currentNodeInState);
                }
            } else {
                // If the node was deleted from the master state, deselect it here.
                setSelectedNode(null);
            }
        }
    }, [baseNodes, selectedNode]);


    // React Flow handlers
    const onNodeClick = useCallback((_: React.MouseEvent, node: ReactFlowNode) => setSelectedNode(node), []);
    const onPaneClick = useCallback(() => setSelectedNode(null), []);
    
    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);
    
    const onDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
        if (!reactFlowBounds) return;

        const type = event.dataTransfer.getData('application/reactflow-type') as 'trigger' | 'action';
        const subType = event.dataTransfer.getData('application/reactflow-subtype');
        if (!type || !subType) return;
        
        const position = screenToFlowPosition({ x: event.clientX - reactFlowBounds.left, y: event.clientY - reactFlowBounds.top });
        addNode(type, subType, position);
    }, [screenToFlowPosition, addNode]);
    
    const onToolboxDragStart = (event: React.DragEvent, nodeType: 'trigger' | 'action', subType: string) => {
        event.dataTransfer.setData('application/reactflow-type', nodeType);
        event.dataTransfer.setData('application/reactflow-subtype', subType);
        event.dataTransfer.effectAllowed = 'move';
    };

    if (isLoading || !automation) {
        return <div className="h-screen w-screen flex items-center justify-center">Carregando automação...</div>;
    }

    return (
        <div className="h-screen w-screen flex flex-col bg-gray-50">
            <header className="bg-white border-b p-3 flex justify-between items-center z-10">
                {automation && automationWithStats && (
                    <div className="flex justify-between items-center p-4 border-b">
                        <div>
                            <h2 className="text-xl font-semibold">{automation.name}</h2>
                            <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                    String(automation.status).toLowerCase() === AutomationStatus.ACTIVE.toLowerCase() || 
                                    String(automation.status).toLowerCase() === 'ativa' || 
                                    String(automation.status).toLowerCase() === 'active'
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-gray-100 text-gray-800'
                                }`}>
                                    {automation.status}
                                </span>
                                {automationWithStats?.executionStats && (
                                    <span className="text-xs">
                                        Execuções: {automationWithStats.executionStats.successfulRuns} de {automationWithStats.executionStats.totalRuns} bem-sucedidas
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button 
                                onClick={() => navigate('/automacoes')}
                                className="p-1 text-gray-500 hover:text-gray-700"
                                aria-label="Fechar"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
                <div className="flex items-center">
                    <button onClick={() => navigate('/automacoes')} className="p-2 rounded-full hover:bg-gray-100 mr-2">
                        <XMarkIcon className="w-5 h-5 text-gray-600" />
                    </button>
                    <input 
                        value={automation.name} 
                        onChange={(e) => updateAutomationState(prev => ({...prev, name: e.target.value}))} 
                        className="font-bold text-lg bg-transparent focus:outline-none focus:bg-gray-100 p-1 rounded-md" 
                    />
                </div>
            </header>
            <div className="flex-1 flex overflow-hidden">
                <AutomationToolbox onDragStart={onToolboxDragStart} />
                <main className="flex-1" ref={reactFlowWrapper}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        onPaneClick={onPaneClick}
                        nodeTypes={nodeTypes}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        onNodeDragStop={onNodeDragStop}
                        onNodesDelete={onNodesDelete}
                        fitView
                    >
                        <Controls />
                        <Background variant={BackgroundVariant.Dots} gap={15} size={1} />
                    </ReactFlow>
                </main>
                <AutomationInspector 
                    selectedNode={selectedNode} 
                    automation={automation} 
                    inspectorData={inspectorData} 
                    updateNode={updateNodeData} 
                    deleteNode={deleteNode} 
                    changeNodeSubType={changeNodeSubType} 
                />
            </div>
        </div>
    );
};

const AutomationBuilderPage = () => (
    <ReactFlowProvider>
        <AutomationBuilder />
    </ReactFlowProvider>
);

export default AutomationBuilderPage;