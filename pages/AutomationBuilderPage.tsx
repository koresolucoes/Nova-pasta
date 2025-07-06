

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
import { AutomationInspector } from '../components/AutomationInspector';
import { AutomationToolbox } from '../components/AutomationToolbox';
import { AutomationCustomNode } from '../components/AutomationCustomNode';
import { getAutomationById } from '../services/automationService';
import { useAutomationState } from '../services/useAutomationState';
import { useInspectorData } from '../services/useInspectorData';
import { XMarkIcon } from '../components/icons';

const nodeTypes = { custom: AutomationCustomNode };

const AutomationBuilder = () => {
    const { automationId } = useParams<{ automationId: string }>();
    const navigate = useNavigate();
    const { screenToFlowPosition } = useReactFlow();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);

    const [initialAutomation, setInitialAutomation] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedNode, setSelectedNode] = useState<ReactFlowNode | null>(null);

    // Fetch initial automation data once
    useEffect(() => {
        if (automationId) {
            const fetchData = async () => {
                const data = await getAutomationById(automationId);
                if (data) {
                    setInitialAutomation(data);
                } else {
                    navigate('/automacoes');
                }
                setIsLoading(false);
            };
            fetchData();
            
            const handleDataChange = () => fetchData();
            window.addEventListener('localDataChanged', handleDataChange);
            return () => window.removeEventListener('localDataChanged', handleDataChange);
        }
    }, [automationId, navigate]);

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
        return baseNodes.map(n => ({
            ...n,
            data: {
                ...n.data,
                inspectorData,
                stats: automation.executionStats?.[n.id],
            }
        }));
    }, [baseNodes, inspectorData, automation]);

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