
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNodesState, useEdgesState, Connection, Node, MarkerType } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import type { Automation, AutomationNode, AutomationData, AutomationTriggerType, AutomationActionType } from '../types';
import { updateAutomation } from './automationService';
import { getDefaultNodeData } from './automationUtils';

export const useAutomationState = (initialAutomation: Automation | null) => {
    const [automation, setAutomation] = useState<Automation | null>(initialAutomation);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const automationRef = useRef<Automation | null>(automation);

    // Sync state when the asynchronously loaded initialAutomation prop changes
    useEffect(() => {
        setAutomation(initialAutomation);
    }, [initialAutomation]);

    // Keep ref in sync with state for debouncing
    useEffect(() => {
        automationRef.current = automation;
    }, [automation]);
    
    // Debounced save effect
    useEffect(() => {
        if (!automation) return;
        const handler = setTimeout(() => {
            if (automationRef.current) {
                updateAutomation(automationRef.current);
            }
        }, 1000); // 1 second debounce
        return () => clearTimeout(handler);
    }, [automation]);

    // Sync automation state to React Flow state
    useEffect(() => {
        if (automation) {
            setNodes(automation.nodes.map(node => ({
                id: node.id,
                type: 'custom',
                position: node.position,
                data: { node }
            })));
            setEdges(automation.edges.map(edge => ({
                ...edge,
                type: 'smoothstep',
                markerEnd: { type: MarkerType.ArrowClosed }
            })));
        } else {
            setNodes([]);
            setEdges([]);
        }
    }, [automation, setNodes, setEdges]);
    
    const updateAutomationState = useCallback((updater: (prev: Automation) => Automation) => {
        setAutomation(prev => prev ? updater(prev) : null);
    }, []);

    const addNode = useCallback((type: 'trigger' | 'action', subType: string, position: { x: number; y: number }) => {
        if (type === 'trigger' && automationRef.current?.nodes.some(n => n.type === 'trigger')) {
            alert('Uma automação pode ter apenas um gatilho.');
            return;
        }
        const newNode: AutomationNode = {
            id: uuidv4(),
            type,
            subType: subType as any,
            position,
            data: getDefaultNodeData(subType as AutomationTriggerType | AutomationActionType)
        };
        updateAutomationState(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }));
    }, [updateAutomationState]);

    const updateNodeData = useCallback((nodeId: string, data: Partial<AutomationData>, replace = false) => {
        updateAutomationState(prev => ({
            ...prev,
            nodes: prev.nodes.map(n => {
                if (n.id !== nodeId) {
                    return n;
                }
                const newData = replace ? data : { ...n.data, ...data };
                // The cast here fixes the type inference issue with the discriminated union.
                return { ...n, data: newData as AutomationData };
            })
        }));
    }, [updateAutomationState]);

    const deleteNode = useCallback((nodeId: string) => {
        updateAutomationState(prev => ({
            ...prev,
            nodes: prev.nodes.filter(n => n.id !== nodeId),
            edges: prev.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
        }));
    }, [updateAutomationState]);

    const onConnect = useCallback((params: Connection) => {
        const newEdgeData = { id: uuidv4(), source: params.source!, target: params.target!, sourceHandle: params.sourceHandle || null };
        updateAutomationState(prev => ({ ...prev, edges: [...prev.edges, newEdgeData] }));
    }, [updateAutomationState]);

    const onNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
        updateAutomationState(prev => ({
            ...prev,
            nodes: prev.nodes.map(n => 
                n.id === node.id ? { ...n, position: node.position } : n
            )
        }));
    }, [updateAutomationState]);

    const onNodesDelete = useCallback((deletedNodes: Node[]) => {
        const deletedNodeIds = new Set(deletedNodes.map(n => n.id));
        updateAutomationState(prev => ({
            ...prev,
            nodes: prev.nodes.filter(n => !deletedNodeIds.has(n.id)),
            edges: prev.edges.filter(e => !deletedNodeIds.has(e.source) && !deletedNodeIds.has(e.target)),
        }));
    }, [updateAutomationState]);

    const changeNodeSubType = useCallback((nodeId: string, newSubType: AutomationTriggerType | AutomationActionType) => {
        const newDefaultData = getDefaultNodeData(newSubType);
        updateAutomationState(prev => ({
            ...prev,
            nodes: prev.nodes.map(n => 
                n.id === nodeId ? { ...n, subType: newSubType, data: newDefaultData } : n
            )
        }));
    }, [updateAutomationState]);

    return {
        automation,
        setAutomation: updateAutomationState,
        nodes,
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
    };
};