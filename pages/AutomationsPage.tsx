import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Automation, AutomationNode, CrmBoard, TriggerCrmStageChangedData, TriggerContextMessageData } from '../types';
import { AutomationStatus } from '../types';
import { getAutomations, addAutomation, deleteAutomation, updateAutomation } from '../services/automationService';
import { getAllStages, getBoards } from '../services/crmService';
import { PencilIcon, TrashIcon, PlayIcon, PauseIcon, SparklesIcon, XMarkIcon } from '../components/icons';

const getStatusClass = (status: AutomationStatus) => {
  switch (status) {
    case AutomationStatus.ACTIVE: return 'bg-green-100 text-green-800';
    case AutomationStatus.PAUSED: return 'bg-yellow-100 text-yellow-800';
    case AutomationStatus.DRAFT:
    default: return 'bg-gray-100 text-gray-800';
  }
};

const formatTrigger = (nodes: AutomationNode[], crmStages: { id: string, title: string }[], boards: CrmBoard[]): string => {
    const triggerNode = nodes.find(n => n.type === 'trigger');
    if (!triggerNode) return 'Nenhum gatilho definido';
    
    const data = triggerNode.data;
    switch (data.type) {
        case 'contact_created':
            return 'Quando um novo contato é criado';
        case 'webhook':
            return 'Quando um Webhook é recebido';
        case 'tag_added':
            return `Quando a tag "${(data as any).value || 'qualquer'}" é adicionada`;
        case 'crm_stage_changed': {
            const triggerData = data as TriggerCrmStageChangedData;
            const boardName = triggerData.crmBoardId ? boards.find(b => b.id === triggerData.crmBoardId)?.name : null;
            const stageName = triggerData.crmStageId ? crmStages.find(s => s.id === triggerData.crmStageId)?.title : null;

            if (boardName && stageName) return `${boardName} → ${stageName}`;
            if (boardName) return `${boardName} → Qualquer Etapa`;
            if (stageName) return `Qualquer Board → ${stageName}`;
            return 'Quando entra em qualquer etapa';
        }
        case 'context_message': {
            const msgData = data as TriggerContextMessageData;
            if (!msgData.value || msgData.match === 'any') return "Quando uma mensagem é recebida";
            const matchText = msgData.match === 'exact' ? 'exata' : 'contém';
            return `Quando mensagem ${matchText} "${msgData.value}"`;
        }
        default:
            return 'Gatilho desconhecido';
    }
};

const CreateAutomationModal = ({ onClose, onNavigate }: { onClose: () => void; onNavigate: (id: string) => void }) => {
    const [step, setStep] = useState<'choice' | 'details'>('choice');
    
    const [name, setName] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [allowReactivation, setAllowReactivation] = useState(true);
    const [blockOnOpenChat, setBlockOnOpenChat] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) {
            alert('O nome da automação é obrigatório.');
            return;
        }
        const newAutomation = await addAutomation({
            name,
            status: isActive ? AutomationStatus.ACTIVE : AutomationStatus.PAUSED,
            allowReactivation,
            blockOnOpenChat,
        });
        onNavigate(newAutomation.id);
    };
    
    const ToggleSwitch = ({ checked, onChange, label }: { checked: boolean, onChange: (checked: boolean) => void, label: string }) => (
         <div className="flex items-center justify-between w-full">
            <span className="text-gray-700">{label}</span>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
                checked ? 'bg-amber-600' : 'bg-gray-300'
                }`}
            >
                <span
                className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                    checked ? 'translate-x-6' : 'translate-x-1'
                }`}
                />
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl p-8 w-full max-w-md transform transition-all shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100">
                    <XMarkIcon className="w-6 h-6 text-gray-500" />
                </button>

                {step === 'choice' && (
                    <>
                        <div className="text-center mb-6">
                            <span className="inline-block p-3 bg-amber-100 rounded-full mb-3">
                                <SparklesIcon className="w-8 h-8 text-amber-600" />
                            </span>
                            <h2 className="text-2xl font-bold text-gray-900">Cadastrar Automação</h2>
                            <p className="text-gray-500 mt-1">Selecione uma das opções abaixo para iniciar a configuração da sua automação.</p>
                        </div>
                        <div className="space-y-3">
                            <button onClick={() => setStep('details')} className="w-full text-left p-4 border rounded-lg hover:bg-gray-50 hover:border-amber-500 transition-all">
                                <h3 className="font-bold text-gray-800">✨ Começar do zero</h3>
                                <p className="text-sm text-gray-600">Crie sua automação do zero, personalize cada detalhe e alcance seus clientes com mais eficiência!</p>
                            </button>
                             <button className="w-full text-left p-4 border rounded-lg hover:bg-gray-50 hover:border-amber-500 transition-all disabled:opacity-50 cursor-not-allowed">
                                <h3 className="font-bold text-gray-800">📋 Escolher um template pronto</h3>
                                <p className="text-sm text-gray-600">Nossos templates prontos são feitos para impulsionar seus resultados.</p>
                            </button>
                             <button className="w-full text-left p-4 border rounded-lg hover:bg-gray-50 hover:border-amber-500 transition-all disabled:opacity-50 cursor-not-allowed">
                                <h3 className="font-bold text-gray-800">🔗 Importar de outra conexão</h3>
                                <p className="text-sm text-gray-600">Importe automações de outras contas da sua empresa.</p>
                            </button>
                             <button className="w-full text-left p-4 border rounded-lg hover:bg-gray-50 hover:border-amber-500 transition-all disabled:opacity-50 cursor-not-allowed">
                                <h3 className="font-bold text-gray-800">📄 Importar Template (JSON)</h3>
                                <p className="text-sm text-gray-600">Importe automações diretamente de arquivos JSON.</p>
                            </button>
                        </div>
                    </>
                )}

                {step === 'details' && (
                    <>
                         <h2 className="text-2xl font-bold text-gray-900 mb-2">Cadastrar Automação</h2>
                         <p className="text-gray-500 mb-6">Escolha um nome para sua automação.</p>
                        <div className="space-y-6">
                            <input 
                                type="text"
                                placeholder="Nome da sua automação"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-4 py-3 text-gray-800 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-amber-500"
                            />
                            <div className="space-y-4">
                                <ToggleSwitch checked={isActive} onChange={setIsActive} label="Ativo"/>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-3">Configurações</h3>
                                <div className="space-y-4">
                                    <ToggleSwitch checked={allowReactivation} onChange={setAllowReactivation} label="Permitir reativação de fluxo?"/>
                                    <ToggleSwitch checked={blockOnOpenChat} onChange={setBlockOnOpenChat} label="Bloquear contato com chat aberto?"/>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end space-x-4 mt-8">
                            <button onClick={() => setStep('choice')} className="font-semibold text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100">Voltar</button>
                            <button onClick={handleSave} className="font-semibold text-white bg-amber-600 px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors">Salvar</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function AutomationsPage(): React.ReactNode {
    const [automations, setAutomations] = useState<Automation[]>([]);
    const [crmStages, setCrmStages] = useState<{ id: string; title: string }[]>([]);
    const [boards, setBoards] = useState<CrmBoard[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();

    const loadData = async () => {
        const [automationsData, stagesData, boardsData] = await Promise.all([
            getAutomations(),
            getAllStages(),
            getBoards(),
        ]);
        setAutomations(automationsData);
        setCrmStages(stagesData);
        setBoards(boardsData);
    };

    useEffect(() => {
        loadData();
        const handleLocalDataChange = () => loadData();
        window.addEventListener('localDataChanged', handleLocalDataChange);
        return () => {
            window.removeEventListener('localDataChanged', handleLocalDataChange);
        };
    }, []);
    
    const handleDelete = async (automationId: string) => {
        if (window.confirm('Tem certeza que deseja remover esta automação?')) {
            await deleteAutomation(automationId);
            await loadData();
        }
    };

    const toggleStatus = async (automation: Automation) => {
        const newStatus = automation.status === AutomationStatus.ACTIVE ? AutomationStatus.PAUSED : AutomationStatus.ACTIVE;
        await updateAutomation({ ...automation, status: newStatus });
        await loadData();
    };


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Automações</h1>
                    <p className="text-gray-500 mt-1">Crie fluxos automatizados de mensagens para se comunicar com seus contatos de forma eficiente e personalizada.</p>
                </div>
                 <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-amber-700 transition duration-300 flex items-center"
                    >
                        Adicionar Automação
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Nome</th>
                            <th scope="col" className="px-6 py-3">Gatilho</th>
                            <th scope="col" className="px-6 py-3">Status</th>
                            <th scope="col" className="px-6 py-3">Criada em</th>
                            <th scope="col" className="px-6 py-3"><span className="sr-only">Ações</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {automations.map(automation => (
                            <tr key={automation.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{automation.name}</td>
                                <td className="px-6 py-4 text-gray-600">{formatTrigger(automation.nodes, crmStages, boards)}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(automation.status)}`}>
                                        {automation.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">{new Date(automation.createdAt).toLocaleDateString('pt-BR')}</td>
                                <td className="px-6 py-4 flex items-center justify-end space-x-3">
                                    <button
                                        onClick={() => toggleStatus(automation)}
                                        className={`p-1 rounded-full transition-colors ${automation.status === AutomationStatus.DRAFT ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-amber-600'}`}
                                        title={automation.status === AutomationStatus.ACTIVE ? "Pausar" : "Ativar"}
                                        disabled={automation.status === AutomationStatus.DRAFT}
                                    >
                                        {automation.status === AutomationStatus.ACTIVE ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                                    </button>
                                    <button onClick={() => navigate(`/automacoes/${automation.id}`)} className="text-gray-500 hover:text-amber-600 p-1 rounded-full transition-colors" title="Editar">
                                        <PencilIcon className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => handleDelete(automation.id)} className="text-gray-500 hover:text-red-600 p-1 rounded-full transition-colors" title="Remover">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {automations.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-gray-500">
                                    Nenhuma automação criada ainda.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {isModalOpen && (
                <CreateAutomationModal 
                    onClose={() => setIsModalOpen(false)}
                    onNavigate={(id) => {
                        setIsModalOpen(false);
                        navigate(`/automacoes/${id}`);
                    }}
                />
            )}
        </div>
    );
}

export default AutomationsPage;