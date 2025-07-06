
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MessageTemplate, BodyComponent } from '../types';
import { getMessageTemplates, getActiveConnection } from '../services/metaService';
import { getTemplates as getLocalTemplates } from '../services/templateService';
import { searchService } from '../services/searchService';
import { PencilIcon } from '../components/icons';

const getStatusBadge = (status: MessageTemplate['status']) => {
  switch (status) {
    case 'APPROVED': return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-100 text-green-800">Aprovado</span>;
    case 'PENDING': return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800">Pendente</span>;
    case 'REJECTED': return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-red-100 text-red-800">Rejeitado</span>;
    case 'PAUSED': return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800">Pausado</span>;
    case 'DELETED': return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800">Deletado</span>;
    case 'DRAFT': return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">Rascunho</span>;
    default: return <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800">{status}</span>;
  }
};

const getCategoryBadge = (category: string) => {
    return <span className="text-xs font-medium capitalize px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">{category.toLowerCase()}</span>;
}

function TemplatesPage(): React.ReactNode {
  const [allTemplates, setAllTemplates] = useState<MessageTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const fetchAndCombineTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    const localDrafts = await getLocalTemplates();
    const activeConnection = await getActiveConnection();

    if (!activeConnection) {
        setAllTemplates(localDrafts);
        setFilteredTemplates(localDrafts);
        setIsLoading(false);
        setError('Nenhuma conexão com a Meta está ativa. Mostrando apenas rascunhos locais.');
        return;
    }
    
    try {
        const metaTemplates = await getMessageTemplates(activeConnection);
        
        // Combine local and Meta templates, preventing duplicates
        const combined = [...metaTemplates];
        const metaNames = new Set(metaTemplates.map(t => t.name));
        
        localDrafts.forEach(draft => {
            // Only add local draft if no template with the same name exists on Meta
            if (!metaNames.has(draft.name)) {
                combined.unshift(draft); // Show drafts first
            }
        });
        
        setAllTemplates(combined);
        setFilteredTemplates(combined);
    } catch (err) {
        setAllTemplates(localDrafts);
        setFilteredTemplates(localDrafts);
        setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
      fetchAndCombineTemplates();
      const handleDataChange = () => fetchAndCombineTemplates();
      window.addEventListener('metaConnectionChanged', handleDataChange);
      window.addEventListener('localDataChanged', handleDataChange);

      return () => {
        window.removeEventListener('metaConnectionChanged', handleDataChange);
        window.removeEventListener('localDataChanged', handleDataChange);
      };
  }, [fetchAndCombineTemplates]);

  useEffect(() => {
    const handleSearch = (searchTerm: string) => {
      const lowercasedTerm = searchTerm.toLowerCase();
      const filtered = allTemplates.filter(template => {
        const bodyComponent = template.components.find(c => c.type === 'BODY') as BodyComponent | undefined;
        const bodyText = bodyComponent?.text || '';
        return template.name.toLowerCase().includes(lowercasedTerm) || bodyText.toLowerCase().includes(lowercasedTerm)
      });
      setFilteredTemplates(filtered);
    };

    const unsubscribe = searchService.subscribe(handleSearch);
    setFilteredTemplates(allTemplates);
    
    return () => unsubscribe();
  }, [allTemplates]);

  const getBodyText = (template: MessageTemplate): string => {
      const bodyComp = template.components.find(c => c.type === 'BODY') as BodyComponent | undefined;
      return bodyComp?.text || 'Corpo do modelo não disponível.';
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Modelos de Mensagem (HSM)</h1>
          <p className="text-gray-500 mt-1">Gerencie seus rascunhos locais e templates sincronizados com a Meta.</p>
        </div>
        <button 
            onClick={() => navigate('/modelos/new')}
            className="bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-amber-700 transition duration-300"
        >
          Solicitar Novo Modelo
        </button>
      </div>

      {isLoading && <div className="text-center py-10">Sincronizando modelos com a Meta...</div>}
      {error && <div className="text-center py-4 bg-red-50 text-red-700 rounded-lg">{error}</div>}

      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.length > 0 ? filteredTemplates.map((template) => (
            <div key={template.id} className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col justify-between group">
              <div>
                  <div className="flex justify-between items-start mb-2">
                      <h3 className="text-base font-bold text-gray-800 break-all pr-2">{template.name}</h3>
                      {getStatusBadge(template.status)}
                  </div>
                  <div className="flex items-center space-x-2 mb-4">
                      {getCategoryBadge(template.category)}
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800">{template.language}</span>
                  </div>
                  <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-md whitespace-pre-wrap">{getBodyText(template)}</p>
                  {template.rejectionReason && (
                     <div className="mt-3 p-2 bg-red-50 text-red-800 text-xs rounded-md">
                        <strong>Motivo da Rejeição:</strong> {template.rejectionReason}
                    </div>
                  )}
              </div>
              {template.status === 'DRAFT' && (
                <div className="pt-4 mt-4 border-t border-gray-100 text-right">
                    <button onClick={() => navigate(`/modelos/${template.id}`)} className="text-sm font-semibold text-amber-600 hover:text-amber-800 flex items-center justify-end ml-auto">
                        <PencilIcon className="w-4 h-4 mr-1"/>
                        Editar Rascunho
                    </button>
                </div>
              )}
            </div>
          )) : (
            <div className="col-span-full text-center py-10 text-gray-500">
                {allTemplates.length > 0 ? 'Nenhum resultado encontrado.' : 'Nenhum modelo de mensagem encontrado.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TemplatesPage;