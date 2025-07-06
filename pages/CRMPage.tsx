
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getBoards, createBoard, updateBoard, deleteBoard, createRawBoard } from '../services/crmService';
import { getContacts, moveContactToCrmStage } from '../services/contactService';
import { runAutomations } from '../services/automationService';
import type { CrmBoard, CrmStage, Contact, Automation } from '../types';
import { Cog6ToothIcon, XMarkIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon, PlusIcon, TagIcon } from '../components/icons';
import { searchService } from '../services/searchService';
import { v4 as uuidv4 } from 'uuid';

// --- Reusable Components ---
const formFieldClasses = "w-full px-3 py-2 text-sm text-gray-700 bg-gray-100 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500 transition-colors duration-200";

const ContactCardComponent: React.FC<{ contact: Contact, onDragStart: (e: React.DragEvent<HTMLDivElement>, contactId: string) => void }> = React.memo(({ contact, onDragStart }) => (
    <div
        draggable
        onDragStart={(e) => onDragStart(e, contact.id.toString())}
        className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm mb-3 group cursor-grab active:cursor-grabbing"
    >
        <h4 className="font-bold text-gray-800">{contact.name}</h4>
        <p className="text-sm text-gray-600 my-1">{contact.phone}</p>
        <div className="flex flex-wrap gap-1 mt-2">
            {contact.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{tag}</span>
            ))}
            {contact.tags.length > 3 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">+{contact.tags.length - 3}</span>
            )}
        </div>
    </div>
));

const CrmStageComponent: React.FC<{
    stage: CrmStage;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, cardId: string, sourceStageId: string) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>, destinationStageId: string) => void;
}> = React.memo(({ stage, onDragStart, onDrop }) => {
    const [isDragOver, setIsDragOver] = useState(false);

    return (
        <div
            className="flex-shrink-0 w-80 bg-gray-100 rounded-xl p-1"
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => { onDrop(e, stage.id); setIsDragOver(false); }}
        >
            <div className={`p-3 transition-colors duration-300 rounded-lg ${isDragOver ? 'bg-amber-100' : ''}`}>
                <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="font-bold text-gray-800">{stage.title}</h3>
                    <span className="text-sm font-semibold text-gray-500 bg-gray-200 px-2 py-1 rounded-md">{stage.cards.length}</span>
                </div>
                <div className="h-[calc(100vh-22rem)] overflow-y-auto px-1">
                    {stage.cards.map(contact => (
                        <ContactCardComponent
                            key={contact.id}
                            contact={contact}
                            onDragStart={(e, contactId) => onDragStart(e, contactId, stage.id)}
                        />
                    ))}
                    {isDragOver && (
                        <div className="h-20 border-2 border-dashed border-amber-400 bg-amber-50 rounded-lg mt-2"></div>
                    )}
                </div>
            </div>
        </div>
    );
});

const ManageBoardsModal = ({ boards, onClose, onCommitChanges }: { boards: CrmBoard[], onClose: () => void, onCommitChanges: (finalBoards: CrmBoard[]) => void }) => {
    const [draftBoards, setDraftBoards] = useState<CrmBoard[]>([]);
    const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
    const [newBoardName, setNewBoardName] = useState('');
    const [newStageName, setNewStageName] = useState('');

    useEffect(() => {
        // Deep copy to create a mutable draft
        const initialDrafts = JSON.parse(JSON.stringify(boards));
        setDraftBoards(initialDrafts);
        if (initialDrafts.length > 0) {
            setSelectedBoardId(initialDrafts[0].id);
        }
    }, [boards]);

    const selectedBoard = useMemo(() => draftBoards.find(b => b.id === selectedBoardId), [draftBoards, selectedBoardId]);

    const handleStageChange = (index: number, data: Partial<Omit<CrmStage, 'id' | 'cards'>>) => {
        if (!selectedBoard) return;
        setDraftBoards(prevDrafts => prevDrafts.map(b => {
            if (b.id !== selectedBoard.id) return b;
            const updatedStages = [...b.columns];
            updatedStages[index] = { ...updatedStages[index], ...data };
            return { ...b, columns: updatedStages };
        }));
    };

    const handleAddStage = () => {
        if (!newStageName.trim() || !selectedBoard) return;
        const newStage = { id: uuidv4(), title: newStageName.trim(), tagsToApply: [] };
        setDraftBoards(prevDrafts => prevDrafts.map(b => 
            b.id === selectedBoard.id ? { ...b, columns: [...b.columns, newStage] } : b
        ));
        setNewStageName('');
    };

    const handleRemoveStage = (index: number) => {
        if (!selectedBoard) return;
        setDraftBoards(prevDrafts => prevDrafts.map(b => 
            b.id === selectedBoard.id ? { ...b, columns: b.columns.filter((_, i) => i !== index) } : b
        ));
    };

    const handleMoveStage = (index: number, direction: 'up' | 'down') => {
        if (!selectedBoard) return;
        const newStages = [...selectedBoard.columns];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= newStages.length) return;
        [newStages[index], newStages[newIndex]] = [newStages[newIndex], newStages[index]];
        setDraftBoards(prevDrafts => prevDrafts.map(b => 
            b.id === selectedBoard.id ? { ...b, columns: newStages } : b
        ));
    };

    const handleAddBoard = () => {
        if (!newBoardName.trim()) return;
        const newBoard = { id: uuidv4(), name: newBoardName.trim(), columns: [] };
        setDraftBoards(prev => [...prev, newBoard]);
        setSelectedBoardId(newBoard.id);
        setNewBoardName('');
    };
    
    const handleDeleteBoard = () => {
        if (!selectedBoard || !window.confirm(`Tem certeza que deseja apagar o board "${selectedBoard.name}"? As alterações só serão salvas ao confirmar no final.`)) return;
        
        setDraftBoards(prev => prev.filter(b => b.id !== selectedBoard.id));
        setSelectedBoardId(draftBoards[0]?.id || null);
    };


    if (!selectedBoard) {
         return (
            <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
                <div className="bg-white rounded-xl p-6 w-full max-w-2xl transform transition-all shadow-2xl relative">
                     <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100">
                        <XMarkIcon className="w-6 h-6 text-gray-500" />
                    </button>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Gerenciar Boards do CRM</h2>
                    <p>Nenhum board criado ainda. Crie o primeiro para começar.</p>
                     <div className="flex items-center space-x-2 mt-4">
                        <input type="text" value={newBoardName} onChange={e => setNewBoardName(e.target.value)} placeholder="Nome do Novo Board" className={formFieldClasses} />
                        <button onClick={handleAddBoard} className="bg-amber-600 text-white p-2 rounded-lg hover:bg-amber-700 flex-shrink-0"><PlusIcon className="w-5 h-5"/></button>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-3xl transform transition-all shadow-2xl relative max-h-[90vh] flex flex-col">
                <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100">
                    <XMarkIcon className="w-6 h-6 text-gray-500" />
                </button>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Gerenciar Boards do CRM</h2>
                
                <div className="flex-grow flex space-x-6 overflow-hidden">
                    {/* Left: Board List */}
                    <div className="w-1/3 border-r pr-6 flex flex-col">
                        <div className="flex-grow space-y-2 overflow-y-auto">
                        {draftBoards.map(board => (
                            <button key={board.id} onClick={() => setSelectedBoardId(board.id)} className={`w-full text-left p-2 rounded-md text-sm font-medium ${selectedBoard.id === board.id ? 'bg-amber-100 text-amber-700' : 'hover:bg-gray-100'}`}>
                                {board.name}
                            </button>
                        ))}
                        </div>
                         <div className="flex items-center space-x-2 mt-4 pt-4 border-t">
                            <input type="text" value={newBoardName} onChange={e => setNewBoardName(e.target.value)} placeholder="Nome do Novo Board" className={`${formFieldClasses} text-sm`} />
                            <button onClick={handleAddBoard} className="bg-amber-600 text-white p-2 rounded-lg hover:bg-amber-700 flex-shrink-0"><PlusIcon className="w-5 h-5"/></button>
                        </div>
                    </div>
                    {/* Right: Stage Editor */}
                    <div className="w-2/3 flex flex-col">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Editando: {selectedBoard.name}</h3>
                         <div className="flex-grow space-y-3 overflow-y-auto pr-2">
                            {selectedBoard.columns.map((col, index) => (
                                <div key={col.id} className="flex items-start space-x-2 bg-gray-50 p-3 rounded-md">
                                    <div className="flex flex-col space-y-1 pt-2">
                                        <button onClick={() => handleMoveStage(index, 'up')} disabled={index === 0} className="disabled:opacity-30"><ArrowUpIcon className="w-4 h-4"/></button>
                                        <button onClick={() => handleMoveStage(index, 'down')} disabled={index === selectedBoard.columns.length - 1} className="disabled:opacity-30"><ArrowDownIcon className="w-4 h-4"/></button>
                                    </div>
                                    <div className="w-full space-y-2">
                                        <input type="text" value={col.title} onChange={e => handleStageChange(index, { title: e.target.value })} className={formFieldClasses} />
                                        <div className="relative">
                                             <TagIcon className="w-4 h-4 absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                                             <input
                                                type="text"
                                                value={(col.tagsToApply || []).join(', ')}
                                                onChange={e => handleStageChange(index, { tagsToApply: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                                                placeholder="Tags para aplicar (ex: lead, vip)"
                                                className={`${formFieldClasses} pl-9`}
                                            />
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemoveStage(index)} className="p-2 text-gray-400 hover:text-red-500 self-start"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center space-x-2 mt-4 pt-4 border-t">
                             <input type="text" value={newStageName} onChange={e => setNewStageName(e.target.value)} placeholder="Nome da Nova Etapa" className={formFieldClasses} />
                             <button onClick={handleAddStage} className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 flex-shrink-0"><PlusIcon className="w-5 h-5"/></button>
                        </div>
                        <div className="mt-4 text-right">
                             <button onClick={handleDeleteBoard} className="text-sm font-semibold text-red-600 hover:text-red-800">Excluir Board</button>
                        </div>
                    </div>
                </div>
                 <div className="flex items-center justify-end space-x-4 mt-8 pt-4 border-t flex-shrink-0">
                    <button onClick={onClose} className="font-semibold text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100">Cancelar</button>
                    <button onClick={() => onCommitChanges(draftBoards)} className="font-semibold text-white bg-amber-600 px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors">Salvar Alterações</button>
                </div>
            </div>
        </div>
    );
};

// --- Main Page Component ---

function CRMPage(): React.ReactNode {
    const [boards, setBoards] = useState<CrmBoard[]>([]);
    const [allContacts, setAllContacts] = useState<Contact[]>([]);
    const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
    const [populatedBoard, setPopulatedBoard] = useState<{ id: string; name: string; columns: CrmStage[] } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Effect for initial data loading and setup.
    useEffect(() => {
        const initialLoad = async () => {
            setIsLoading(true);
            setError(null);
            try {
                let boardsData = await getBoards();
                if (boardsData.length === 0) {
                    boardsData = [await createBoard("CRM Principal")];
                }
                const contactsData = await getContacts();
                
                setBoards(boardsData);
                setAllContacts(contactsData);
                setActiveBoardId(boardsData[0]?.id || null);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Falha ao carregar dados do CRM. Verifique sua conexão ou as configurações do Supabase.';
                setError(message);
            } finally {
                setIsLoading(false);
            }
        };

        initialLoad();
    }, []);

    // Effect for handling subsequent data changes from other parts of the app.
    useEffect(() => {
        const handleDataRefresh = async () => {
            setError(null);
            try {
                const [boardsData, contactsData] = await Promise.all([
                    getBoards(),
                    getContacts(),
                ]);
                setBoards(boardsData);
                setAllContacts(contactsData);

                setActiveBoardId(currentId => {
                    if (currentId && boardsData.some(f => f.id === currentId)) {
                        return currentId;
                    }
                    return boardsData.length > 0 ? boardsData[0].id : null;
                });

            } catch (err) {
                 console.error("Error reloading CRM data:", err);
                 setError(err instanceof Error ? err.message : 'Falha ao recarregar dados do CRM.');
            }
        };
    
        window.addEventListener('localDataChanged', handleDataRefresh);
        return () => window.removeEventListener('localDataChanged', handleDataRefresh);
    }, []);
    
    const populateActiveBoard = useCallback(() => {
        if (!activeBoardId) {
            setPopulatedBoard(null);
            return;
        }
    
        const activeBoardData = boards.find(f => f.id === activeBoardId);
        if (!activeBoardData) return;
    
        const firstStageId = activeBoardData.columns.length > 0 ? activeBoardData.columns[0].id : null;
        const searchTerm = searchService.getSearchTerm().toLowerCase();
    
        const populatedStages = activeBoardData.columns.map(stageDef => {
            let stageContacts = allContacts.filter(contact => {
                const contactStageId = contact.crmStageId || firstStageId;
                return contactStageId === stageDef.id;
            });
    
            if (searchTerm) {
                stageContacts = stageContacts.filter(contact =>
                    contact.name.toLowerCase().includes(searchTerm) ||
                    contact.phone.toLowerCase().includes(searchTerm)
                );
            }
    
            return { ...stageDef, cards: stageContacts };
        });
    
        setPopulatedBoard({ ...activeBoardData, columns: populatedStages });
    }, [activeBoardId, boards, allContacts]);
    
    useEffect(() => {
        populateActiveBoard();
        const unsubscribe = searchService.subscribe(() => populateActiveBoard());
        return () => unsubscribe();
    }, [populateActiveBoard]);


    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, contactId: string, sourceStageId: string) => {
        e.dataTransfer.setData("contactId", contactId);
        e.dataTransfer.setData("sourceStageId", sourceStageId);
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>, destinationStageId: string) => {
        e.preventDefault();
        const contactIdStr = e.dataTransfer.getData("contactId");
        const sourceStageId = e.dataTransfer.getData("sourceStageId");

        if (sourceStageId === destinationStageId || !contactIdStr) return;
        
        const contactId = parseInt(contactIdStr, 10);
        const destinationStage = populatedBoard?.columns.find(c => c.id === destinationStageId);

        if (destinationStage) {
            await moveContactToCrmStage(contactId, destinationStage);
            
            const boardContainingStage = boards.find(b => b.id === activeBoardId);
            await runAutomations('crm_stage_changed', {
                contactId: contactId,
                stage: destinationStage,
                board: boardContainingStage ? { id: boardContainingStage.id, name: boardContainingStage.name } : undefined,
            });
        }
    };
    
    const handleCommitChanges = async (finalBoards: CrmBoard[]) => {
        const originalBoards = boards;
        
        const originalBoardIds = new Set(originalBoards.map(b => b.id));
        const finalBoardIds = new Set(finalBoards.map(b => b.id));
    
        const boardsToDelete = originalBoards.filter(b => !finalBoardIds.has(b.id));
        const boardsToAdd = finalBoards.filter(b => !originalBoardIds.has(b.id));
        const boardsToUpdate = finalBoards.filter(b => originalBoardIds.has(b.id));
    
        const promises: Promise<any>[] = [];
    
        boardsToDelete.forEach(board => promises.push(deleteBoard(board.id)));
        boardsToAdd.forEach(board => promises.push(createRawBoard(board)));
        boardsToUpdate.forEach(board => {
            const originalBoard = originalBoards.find(b => b.id === board.id);
            if (JSON.stringify(originalBoard) !== JSON.stringify(board)) {
                promises.push(updateBoard(board));
            }
        });
        
        try {
            await Promise.all(promises);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao salvar as alterações do board.');
        } finally {
            setIsModalOpen(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">CRM</h1>
                    <p className="text-gray-500 mt-1">Arraste e solte os contatos e configure automações para cada etapa.</p>
                </div>
                 <div className="flex items-center space-x-3">
                    <select
                        value={activeBoardId || ''}
                        onChange={e => setActiveBoardId(e.target.value)}
                        className="w-full max-w-xs p-2 border-gray-300 rounded-lg shadow-sm focus:border-amber-500 focus:ring-amber-500"
                        disabled={isLoading}
                    >
                        {boards.map(board => (
                            <option key={board.id} value={board.id}>{board.name}</option>
                        ))}
                    </select>
                    <button onClick={() => setIsModalOpen(true)} className="bg-white text-gray-700 border border-gray-300 font-semibold py-2 px-4 rounded-lg hover:bg-gray-50 transition duration-300 flex items-center">
                        <Cog6ToothIcon className="w-5 h-5 mr-2" />
                        Gerenciar Boards
                    </button>
                </div>
            </div>

            <div className="flex-grow mt-6">
                {isLoading ? (
                    <div className="text-center text-gray-500">Carregando CRM...</div>
                ) : error ? (
                    <div className="m-auto p-6 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg max-w-xl">
                        <p className="font-bold">Ocorreu um erro ao carregar o CRM</p>
                        <p className="mt-2">{error}</p>
                        <p className="text-xs mt-4 text-gray-600">Isso pode acontecer se a tabela 'funnels' não existir no banco de dados ou se as políticas de acesso (RLS) não permitirem a leitura. Verifique o console do navegador para mais detalhes.</p>
                    </div>
                ) : populatedBoard && populatedBoard.columns.length > 0 ? (
                    <div className="flex space-x-6 overflow-x-auto pb-4 h-full">
                        {populatedBoard.columns.map(stage => (
                            <CrmStageComponent
                                key={stage.id}
                                stage={stage}
                                onDragStart={handleDragStart}
                                onDrop={handleDrop}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-gray-500 pt-10">
                        <p className="font-bold">Nenhuma etapa neste board.</p>
                        <p>Use o botão "Gerenciar Boards" para adicionar etapas.</p>
                    </div>
                )}
            </div>
            
            {isModalOpen && (
                <ManageBoardsModal
                    boards={boards}
                    onClose={() => setIsModalOpen(false)}
                    onCommitChanges={handleCommitChanges}
                />
            )}
        </div>
    );
}

export default CRMPage;
