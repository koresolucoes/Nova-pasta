
import React, { useState, useEffect, useCallback } from 'react';
import { 
    getConnections, 
    saveConnection, 
    deleteConnection,
    getActiveConnectionId,
    setActiveConnectionId,
    disconnectActiveConnection,
    testConnection,
    type MetaConnection 
} from '../services/metaService';

type TestResult = {
    id: string;
    isLoading: boolean;
    message: string;
    success: boolean | null;
}

const emptyConnection: Omit<MetaConnection, 'id'> = { name: '', wabaId: '', phoneNumberId: '', apiToken: '' };
const formFieldClasses = "w-full px-3 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500 transition-colors duration-200";

function SettingsPage(): React.ReactNode {
  const [connections, setConnections] = useState<MetaConnection[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<Omit<MetaConnection, 'id'> | MetaConnection>(emptyConnection);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
        setConnections(await getConnections());
        setActiveId(getActiveConnectionId());
    } catch (error) {
        console.error("Failed to load connections:", error);
        alert("Falha ao carregar conexões do banco de dados.");
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const notifyConnectionChange = () => {
    window.dispatchEvent(new CustomEvent('metaConnectionChanged'));
  };

  const handleOpenModal = (conn?: MetaConnection) => {
    setEditingConnection(conn || emptyConnection);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingConnection(emptyConnection);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const originalConnectionsCount = connections.length;
    await saveConnection(editingConnection);
    await loadData();
    handleCloseModal();
    
    // Se esta for a primeira conexão, torna-a ativa
    const currentConnections = await getConnections();
    if (originalConnectionsCount === 0 && currentConnections.length > 0) {
        handleConnect(currentConnections[0].id);
    } else {
       notifyConnectionChange();
    }
  };
  
  const handleDelete = async (id: string) => {
    // The sandbox environment blocks confirm(). Removing it to fix functionality.
    try {
        await deleteConnection(id);
        await loadData();
        notifyConnectionChange();
    } catch (error) {
        const message = error instanceof Error ? error.message : "Ocorreu um erro desconhecido ao remover a conexão.";
        alert(message);
        console.error("Failed to delete connection:", error);
    }
  };

  const handleConnect = (id: string) => {
    setActiveConnectionId(id);
    loadData();
    notifyConnectionChange();
  };

  const handleDisconnect = () => {
    disconnectActiveConnection();
    loadData();
    notifyConnectionChange();
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditingConnection(prev => ({...prev, [name]: value }));
  };

  const handleTestConnection = async (conn: MetaConnection) => {
    setTestResults(prev => ({...prev, [conn.id]: {id: conn.id, isLoading: true, message: '', success: null}}));
    const result = await testConnection(conn);
    setTestResults(prev => ({...prev, [conn.id]: {id: conn.id, isLoading: false, message: result.message, success: result.success}}));
  };


  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gerenciador de Conexões</h1>
          <p className="text-gray-500 mt-1">Adicione e gerencie suas contas do WhatsApp Business.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()} 
          className="bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-amber-700 transition duration-300"
        >
          Adicionar Nova Conexão
        </button>
      </div>
      
      {isLoading ? (
        <div className="text-center p-8">Carregando...</div>
      ) : connections.length === 0 ? (
        <div className="text-center bg-white border border-gray-200 rounded-xl p-8">
            <h3 className="text-lg font-medium text-gray-700">Nenhuma conexão encontrada</h3>
            <p className="text-gray-500 mt-2">Clique em "Adicionar Nova Conexão" para configurar sua primeira conta.</p>
        </div>
      ) : (
        <div className="space-y-4">
            {connections.map(conn => {
                const testResult = testResults[conn.id];
                const isConnected = activeId === conn.id;
                return (
                    <div key={conn.id} className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center sm:justify-between transition-all ${isConnected ? 'bg-amber-50 border-amber-300' : 'bg-white border-gray-200'}`}>
                        <div className="flex-grow">
                            <h3 className={`font-bold ${isConnected ? 'text-amber-800' : 'text-gray-800'}`}>
                              {conn.name}
                              {isConnected && <span className="ml-2 text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full align-middle">Conectado</span>}
                            </h3>
                            <p className="text-sm text-gray-500">WABA ID: {conn.wabaId}</p>
                             {testResult && !testResult.isLoading && (
                                <p className={`mt-2 text-xs font-medium ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>{testResult.message}</p>
                            )}
                        </div>
                        <div className="flex items-center space-x-2 mt-3 sm:mt-0">
                            {isConnected ? (
                                <button onClick={handleDisconnect} className="text-sm font-medium text-amber-600 hover:text-amber-800 px-2 py-1">Desconectar</button>
                            ) : (
                                <button onClick={() => handleConnect(conn.id)} className="text-sm font-medium text-amber-600 hover:text-amber-800 px-2 py-1">Conectar</button>
                            )}
                            <button onClick={() => handleTestConnection(conn)} disabled={testResult?.isLoading} className="text-sm font-medium text-gray-600 hover:text-gray-900 px-2 py-1 disabled:opacity-50">
                                {testResult?.isLoading ? 'Testando...' : 'Testar'}
                            </button>
                            <button onClick={() => handleOpenModal(conn)} className="text-sm font-medium text-gray-600 hover:text-gray-900 px-2 py-1">Editar</button>
                            <button onClick={() => handleDelete(conn.id)} className="text-sm font-medium text-red-600 hover:text-red-800 px-2 py-1">Remover</button>
                        </div>
                    </div>
                )
            })}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center">
          <div className="bg-white rounded-lg p-8 w-full max-w-lg transform transition-all shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-gray-800">
                {'id' in editingConnection ? 'Editar Conexão' : 'Adicionar Nova Conexão'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
                <input name="name" value={editingConnection.name} onChange={handleInputChange} placeholder="Nome da Conexão (ex: Marketing)" required className={formFieldClasses} />
                <input name="wabaId" value={editingConnection.wabaId} onChange={handleInputChange} placeholder="ID da Conta do WhatsApp Business (WABA ID)" required className={formFieldClasses} />
                <input name="phoneNumberId" value={editingConnection.phoneNumberId} onChange={handleInputChange} placeholder="ID do Número de Telefone" required className={formFieldClasses} />
                <input type="password" name="apiToken" value={editingConnection.apiToken} onChange={handleInputChange} placeholder="Token de Acesso Permanente" required className={formFieldClasses} />

                <div className="flex justify-end space-x-4 pt-4">
                    <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">Cancelar</button>
                    <button type="submit" className="px-4 py-2 text-white bg-amber-600 rounded-lg hover:bg-amber-700">Salvar Conexão</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
