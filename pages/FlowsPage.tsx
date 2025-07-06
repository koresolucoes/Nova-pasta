
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { WhatsAppFlow } from '../types';
import { FlowStatus } from '../types';
import { getFlows, syncFlowsWithMeta, deleteFlow, deprecateFlow, saveDraftFlow } from '../services/flowService';
import { searchService } from '../services/searchService';
import { PencilIcon, TrashIcon, PaperAirplaneIcon, PlusIcon } from '../components/icons';

const getStatusBadge = (status: FlowStatus) => {
    switch (status) {
        case FlowStatus.PUBLISHED: return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-100 text-green-800">Publicado</span>;
        case FlowStatus.DRAFT: return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">Rascunho</span>;
        case FlowStatus.DEPRECATED: return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800">Obsoleto</span>;
        case FlowStatus.BLOCKED: return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-red-100 text-red-800">Bloqueado</span>;
        case FlowStatus.THROTTLED: return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800">Limitado</span>;
        default: return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
};

function FlowsPage(): React.ReactNode {
    const [allFlows, setAllFlows] = useState<WhatsAppFlow[]>([]);
    const [filteredFlows, setFilteredFlows] = useState<WhatsAppFlow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Sync with meta on page load to get the latest data.
            await syncFlowsWithMeta();
            const flows = await getFlows();
            setAllFlows(flows);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Falha ao carregar ou sincronizar flows.";
            setError(errorMessage);
            // Attempt to load local flows even if sync fails, so the user isn't stuck.
            try {
                const localFlows = await getFlows();
                setAllFlows(localFlows);
            } catch (localErr) {
                 console.error("Failed to load local flows after sync error:", localErr);
            }
        } finally {
            setIsLoading(false);
            setIsSyncing(false); // Also reset sync state
        }
    }, []);
    
    useEffect(() => {
        loadData();
        const handleDataChange = () => loadData();
        window.addEventListener('localDataChanged', handleDataChange);
        window.addEventListener('metaConnectionChanged', handleDataChange);
        return () => {
             window.removeEventListener('localDataChanged', handleDataChange);
             window.removeEventListener('metaConnectionChanged', handleDataChange);
        };
    }, [loadData]);

    useEffect(() => {
        const handleSearch = (term: string) => {
            const lowercasedTerm = term.toLowerCase();
            setFilteredFlows(allFlows.filter(flow => flow.name.toLowerCase().includes(lowercasedTerm)));
        };
        handleSearch(searchService.getSearchTerm()); // Initial filter
        const unsubscribe = searchService.subscribe(handleSearch);
        return () => unsubscribe();
    }, [allFlows]);

    const handleSync = async () => {
        setIsSyncing(true);
        await loadData(); // Simply re-run the main data loading function
    };

    const handleSaveDraft = async (id: string) => {
        if (!confirm("Isso irá sincronizar e salvar o estado atual do flow como um rascunho na Meta. Deseja continuar?")) return;
        try {
            await saveDraftFlow(id);
            alert('Rascunho salvo com sucesso na Meta.');
        } catch (err) {
            alert(`Erro ao salvar rascunho: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
        }
    };
    
    const handleDeprecate = async (id: string) => {
        // The sandbox environment blocks confirm(). Removing it to fix functionality.
        try {
            await deprecateFlow(id);
        } catch(err) {
            alert(`Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
        }
    };
    
    const handleDelete = async (id: string) => {
        // The sandbox environment blocks confirm(). Removing it to fix functionality.
        try {
            await deleteFlow(id);
        } catch(err) {
            alert(`Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">WhatsApp Flows</h1>
                    <p className="text-gray-500 mt-1">Crie e gerencie experiências interativas para seus clientes.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button onClick={handleSync} disabled={isSyncing || isLoading} className="bg-white text-gray-700 border border-gray-300 font-semibold py-2 px-4 rounded-lg hover:bg-gray-50 transition duration-300 disabled:opacity-50">
                        {isSyncing ? 'Sincronizando...' : 'Sincronizar com Meta'}
                    </button>
                    <button onClick={() => navigate('/flows/new')} className="bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-amber-700 transition duration-300 flex items-center">
                        <PlusIcon className="w-5 h-5 mr-2" /> Criar Flow
                    </button>
                </div>
            </div>

            {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

             {isLoading ? (
                <div className="col-span-full text-center py-10 text-gray-500">
                    Sincronizando flows com a Meta...
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredFlows.length > 0 ? (
                        filteredFlows.map(flow => (
                            <div key={flow.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col justify-between group">
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-base font-bold text-gray-800 break-all pr-2">{flow.name}</h3>
                                        {getStatusBadge(flow.status)}
                                    </div>
                                    <div className="flex items-center space-x-2 mb-4">
                                        <span className={`text-xs font-medium capitalize px-2.5 py-0.5 rounded-full ${flow.origin === 'meta' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{flow.origin === 'meta' ? 'Meta' : 'Local'}</span>
                                        {flow.metaFlowId && <p className="text-xs text-gray-400">ID: ...{flow.metaFlowId.slice(-8)}</p>}
                                    </div>
                                </div>
                                <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-end space-x-2">
                                    {flow.status === FlowStatus.PUBLISHED && (
                                        <button onClick={() => handleDeprecate(flow.id)} className="text-xs font-semibold text-gray-600 hover:text-gray-900">Depreciar</button>
                                    )}
                                    {flow.status === FlowStatus.DRAFT && (
                                        <button onClick={() => handleSaveDraft(flow.id)} className="text-xs font-semibold text-green-600 hover:text-green-800 flex items-center"><PaperAirplaneIcon className="w-4 h-4 mr-1"/> Salvar Rascunho</button>
                                    )}
                                    <button onClick={() => navigate(`/flows/${flow.id}`)} className="text-xs font-semibold text-amber-600 hover:text-amber-800 flex items-center"><PencilIcon className="w-4 h-4 mr-1"/> Editar</button>
                                    <button onClick={() => handleDelete(flow.id)} className="text-xs font-semibold text-red-600 hover:text-red-800 flex items-center"><TrashIcon className="w-4 h-4 mr-1"/> Apagar</button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-10 text-gray-500">
                            {allFlows.length > 0 ? 'Nenhum resultado encontrado.' : 'Nenhum flow encontrado.'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default FlowsPage;