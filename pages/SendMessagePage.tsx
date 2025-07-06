import React, { useState, useMemo, useEffect } from 'react';
import { getContacts, addMultipleContacts } from '../services/contactService';
import { getActiveConnection, getMessageTemplates, sendMessage, type MetaConnection } from '../services/metaService';
import { fetchAndParseSheet } from '../services/googleSheetService';
import type { MessageTemplate, SheetContact, BodyComponent, Contact } from '../types';
import { TableCellsIcon } from '../components/icons';
import { runAutomations } from '../services/automationService';

const formFieldClasses = "w-full px-3 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500 transition-colors duration-200";

type Notification = {
    type: 'success' | 'error' | 'info';
    message: string;
    details?: string[];
};

type ImportStatus = {
    isLoading: boolean;
    error: string | null;
    successMessage: string | null;
};

type SendProgress = {
    total: number;
    sent: number;
    success: number;
    failed: number;
};

const getBodyTextFromTemplate = (template: MessageTemplate | undefined): string => {
    if (!template) return '';
    const bodyComponent = template.components.find(c => c.type === 'BODY') as BodyComponent | undefined;
    return bodyComponent?.text || '';
};

const SendMessagePage: React.FC = () => {
    const [activeConnection, setActiveConnection] = useState<MetaConnection | null>(null);
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [recipientType, setRecipientType] = useState<'single' | 'segment' | 'googleSheet'>('single');
    const [recipient, setRecipient] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [variables, setVariables] = useState<string[]>([]);
    const [preview, setPreview] = useState<string>('Selecione uma conexão e um modelo para começar.');
    
    const [isSending, setIsSending] = useState(false);
    const [notification, setNotification] = useState<Notification | null>(null);

    // New states for Google Sheets
    const [sheetUrl, setSheetUrl] = useState('');
    const [sheetContacts, setSheetContacts] = useState<SheetContact[]>([]);
    const [importStatus, setImportStatus] = useState<ImportStatus>({ isLoading: false, error: null, successMessage: null });
    const [sendProgress, setSendProgress] = useState<SendProgress>({ total: 0, sent: 0, success: 0, failed: 0 });

    const approvedTemplates = useMemo(() => templates.filter(t => t.status === 'APPROVED'), [templates]);
    
    const [allTags, setAllTags] = useState<string[]>([]);

    const selectedTemplate = useMemo(() => {
        return templates.find(t => t.id === selectedTemplateId);
    }, [selectedTemplateId, templates]);

    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            // Fetch tags
            const contacts = await getContacts();
            const tags = new Set<string>();
            contacts.forEach(contact => {
                contact.tags.forEach(tag => tags.add(tag));
            });
            setAllTags(Array.from(tags));
            
            // Fetch templates
            const connection = await getActiveConnection();
            setActiveConnection(connection);

            if (!connection) {
                setError('Nenhuma conexão com a Meta está ativa. Configure em Configurações.');
                setIsLoading(false);
                setTemplates([]);
                return;
            }

            setError(null);
            try {
                const fetchedTemplates = await getMessageTemplates(connection);
                setTemplates(fetchedTemplates);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchInitialData();
        window.addEventListener('metaConnectionChanged', fetchInitialData);
        window.addEventListener('localDataChanged', fetchInitialData);

        return () => {
            window.removeEventListener('metaConnectionChanged', fetchInitialData);
            window.removeEventListener('localDataChanged', fetchInitialData);
        };
    }, []);

    useEffect(() => {
        const templateBody = getBodyTextFromTemplate(selectedTemplate);
        if (selectedTemplate && templateBody) {
            const variableMatches = templateBody.match(/\{\{\d+\}\}/g) || [];
            const numVars = new Set(variableMatches).size;
            const newVars = new Array(numVars).fill('');
            setVariables(newVars);
            updatePreview(templateBody, newVars);
        } else {
            setVariables([]);
            setPreview('Selecione um modelo para começar.');
        }
    }, [selectedTemplate]);
    
    const updatePreview = (templateBody: string, currentVars: string[]) => {
        let newPreview = templateBody;
        currentVars.forEach((val, i) => {
            const placeholder = `{{${i + 1}}}`;
            newPreview = newPreview.replace(new RegExp(placeholder.replace(/\{/g, '\\{').replace(/\}/g, '\\}'), 'g'), val || `[${placeholder}]`);
        });
        setPreview(newPreview);
    };

    const handleVariableChange = (index: number, value: string) => {
        const newVariables = [...variables];
        newVariables[index] = value;
        setVariables(newVariables);
        const templateBody = getBodyTextFromTemplate(selectedTemplate);
        if (selectedTemplate && templateBody) {
            updatePreview(templateBody, newVariables);
        }
    };
    
    const handleRecipientTypeChange = (newType: 'single' | 'segment' | 'googleSheet') => {
        setRecipientType(newType);
        setRecipient('');
        setSheetUrl('');
        setSheetContacts([]);
        setNotification(null);
        setImportStatus({ isLoading: false, error: null, successMessage: null });
    };

    const handleImportSheet = async () => {
        if (!sheetUrl) {
            setImportStatus({ isLoading: false, error: "Por favor, insira a URL da planilha.", successMessage: null });
            return;
        }
        setImportStatus({ isLoading: true, error: null, successMessage: null });
        setNotification(null);
        setSheetContacts([]);
        
        try {
            const contactsFromSheet = await fetchAndParseSheet(sheetUrl);
            const newDbContacts = await addMultipleContacts(contactsFromSheet);

            // Trigger automations for the newly created contacts
            for (const contact of newDbContacts) {
                await runAutomations('contact_created', { contactId: contact.id });
                if (contact.tags && contact.tags.length > 0) {
                    for (const tag of contact.tags) {
                        await runAutomations('tag_added', { contactId: contact.id, tagName: tag });
                    }
                }
            }

            setSheetContacts(contactsFromSheet);
            const successMsg = `${contactsFromSheet.length} contatos da planilha processados. ${newDbContacts.length} contatos novos foram adicionados.`;
            setImportStatus({ isLoading: false, error: null, successMessage: successMsg });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Falha na importação.';
            setImportStatus({ isLoading: false, error: errorMessage, successMessage: null });
        }
    };
    
    const sendBulkMessages = async (contacts: (SheetContact | Contact)[]) => {
        if (!selectedTemplate || !activeConnection) return;

        const total = contacts.length;
        let progress: SendProgress = { total, sent: 0, success: 0, failed: 0 };
        setSendProgress(progress);
        const failedSends: string[] = [];

        for (const contact of contacts) {
            try {
                const templateBody = getBodyTextFromTemplate(selectedTemplate);
                // The template variable {{1}} is usually the name.
                const dynamicVariables = [contact.name]; 
                const components = (templateBody.match(/\{\{1\}\}/) && dynamicVariables.length > 0) ? [{
                    type: 'body',
                    parameters: dynamicVariables.map(v => ({ type: 'text', text: v }))
                }] : [];

                await sendMessage(activeConnection, {
                    recipient: contact.phone,
                    templateName: selectedTemplate.name,
                    languageCode: selectedTemplate.language,
                    components: components
                });
                
                progress.success++;
            } catch (err) {
                progress.failed++;
                const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
                failedSends.push(`Falha para ${contact.name} (${contact.phone}): ${errorMessage}`);
            }
            
            progress.sent++;
            setSendProgress({...progress});
            await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
        }

        setNotification({
            type: progress.failed > 0 ? 'error' : 'success',
            message: `Disparo concluído! ${progress.success} de ${progress.total} mensagens enviadas com sucesso.`,
            details: failedSends.length > 0 ? failedSends : undefined
        });
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setNotification(null);

        if (!selectedTemplate || !activeConnection) {
            setNotification({ type: 'error', message: 'Por favor, selecione uma conexão e um modelo.' });
            return;
        }
        
        setIsSending(true);
        
        if (recipientType === 'single') {
            if (!recipient) {
                setNotification({ type: 'error', message: 'Por favor, preencha o destinatário.' });
                setIsSending(false);
                return;
            }
            if (variables.length > 0 && variables.some(v => v === '')) {
                setNotification({ type: 'error', message: 'Por favor, preencha todas as variáveis do modelo.' });
                setIsSending(false);
                return;
            }
            
            try {
                const components = variables.length > 0 ? [{
                    type: 'body',
                    parameters: variables.map(v => ({ type: 'text', text: v }))
                }] : [];

                await sendMessage(activeConnection, {
                    recipient: recipient,
                    templateName: selectedTemplate.name,
                    languageCode: selectedTemplate.language,
                    components: components
                });

                setNotification({ type: 'success', message: `Mensagem enviada para ${recipient} com sucesso!`});
            } catch(err) {
                const errorMessage = err instanceof Error ? err.message : 'Ocorreu uma falha no envio.';
                setNotification({ type: 'error', message: `Erro ao enviar: ${errorMessage}`});
            }
        } else if (recipientType === 'segment') {
            const selectedTag = recipient;
            if (!selectedTag) {
                setNotification({ type: 'error', message: 'Por favor, selecione uma tag.' });
                setIsSending(false);
                return;
            }
            
            const allContacts = await getContacts();
            const targetContacts = allContacts.filter(c => c.tags.includes(selectedTag));
            
            if (targetContacts.length === 0) {
                setNotification({ type: 'error', message: `Nenhum contato encontrado com a tag "${selectedTag}".` });
                setIsSending(false);
                return;
            }
            
            await sendBulkMessages(targetContacts);
        } else if (recipientType === 'googleSheet') {
            if (sheetContacts.length === 0) {
                setNotification({ type: 'error', message: 'Nenhum contato importado da planilha para enviar.' });
                setIsSending(false);
                return;
            }
            await sendBulkMessages(sheetContacts);
        }

        setIsSending(false);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Disparar Mensagem</h1>
                <p className="text-gray-500 mt-1">Envie uma mensagem de modelo para um contato ou segmento.</p>
            </div>
            
            {notification && (
                <div className={`p-4 rounded-lg text-sm ${
                    notification.type === 'success' ? 'bg-green-100 text-green-800' : 
                    notification.type === 'error' ? 'bg-red-100 text-red-800' : 
                    'bg-amber-100 text-amber-800'
                }`}>
                    <p className="font-bold">{notification.message}</p>
                    {notification.details && notification.details.length > 0 && (
                        <ul className="list-disc list-inside mt-2 text-xs max-h-40 overflow-y-auto">
                            {notification.details.map((detail, index) => <li key={index}>{detail}</li>)}
                        </ul>
                    )}
                </div>
            )}


            <form onSubmit={handleSend} className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Coluna do Formulário */}
                <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-6 space-y-6 self-start">
                    
                    {error && <div className="p-4 rounded-lg text-sm bg-red-100 text-red-800">{error}</div>}

                    <div>
                        <h3 className="font-semibold text-gray-800">1. Destinatário</h3>
                        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                            <label className="flex items-center cursor-pointer">
                                <input type="radio" name="recipientType" value="single" checked={recipientType === 'single'} onChange={() => handleRecipientTypeChange('single')} className="h-4 w-4 text-amber-600 border-gray-300 focus:ring-amber-500"/>
                                <span className="ml-2 text-sm text-gray-700">Número Único</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input type="radio" name="recipientType" value="segment" checked={recipientType === 'segment'} onChange={() => handleRecipientTypeChange('segment')} className="h-4 w-4 text-amber-600 border-gray-300 focus:ring-amber-500"/>
                                <span className="ml-2 text-sm text-gray-700">Segmento (Tag)</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input type="radio" name="recipientType" value="googleSheet" checked={recipientType === 'googleSheet'} onChange={() => handleRecipientTypeChange('googleSheet')} className="h-4 w-4 text-amber-600 border-gray-300 focus:ring-amber-500"/>
                                <span className="ml-2 text-sm text-gray-700 flex items-center"><TableCellsIcon className="w-4 h-4 mr-1" /> Planilha Google</span>
                            </label>
                        </div>
                        <div className="mt-4">
                             {recipientType === 'single' && (
                                <input
                                    type="tel"
                                    value={recipient}
                                    onChange={e => setRecipient(e.target.value)}
                                    placeholder="+55 11 98765-4321"
                                    required
                                    disabled={!activeConnection}
                                    className={formFieldClasses}
                                />
                            )}
                            {recipientType === 'segment' && (
                                <select
                                    value={recipient}
                                    onChange={e => setRecipient(e.target.value)}
                                    required
                                    disabled={!activeConnection}
                                    className={formFieldClasses}
                                >
                                    <option value="">Selecione uma tag...</option>
                                    {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                                </select>
                            )}
                            {recipientType === 'googleSheet' && (
                                <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
                                    <p className="text-sm text-gray-600">
                                        Cole a URL da sua planilha publicada como CSV (Arquivo &gt; Compartilhar &gt; Publicar na web).
                                    </p>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="url"
                                            value={sheetUrl}
                                            onChange={e => setSheetUrl(e.target.value)}
                                            placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                                            required
                                            disabled={!activeConnection || importStatus.isLoading}
                                            className={formFieldClasses}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleImportSheet}
                                            disabled={!activeConnection || importStatus.isLoading || !sheetUrl}
                                            className="flex-shrink-0 bg-amber-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {importStatus.isLoading ? 'Importando...' : 'Importar'}
                                        </button>
                                    </div>
                                    {importStatus.error && <p className="text-red-500 text-sm mt-2">{importStatus.error}</p>}
                                    {importStatus.successMessage && <p className="text-green-600 text-sm mt-2">{importStatus.successMessage}</p>}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold text-gray-800">2. Modelo da Mensagem</h3>
                         {isLoading ? <div className="mt-4 text-sm text-gray-500">Carregando modelos...</div> : (
                             <select
                                value={selectedTemplateId}
                                onChange={e => setSelectedTemplateId(e.target.value)}
                                required
                                disabled={!activeConnection || approvedTemplates.length === 0}
                                className={`mt-4 ${formFieldClasses}`}
                            >
                                <option value="">Selecione um modelo...</option>
                                {approvedTemplates.map(template => (
                                    <option key={template.id} value={template.id}>{template.name}</option>
                                ))}
                            </select>
                         )}
                    </div>

                    {selectedTemplate && variables.length > 0 && recipientType !== 'googleSheet' && (
                        <div>
                            <h3 className="font-semibold text-gray-800">3. Personalizar Variáveis</h3>
                            <div className="mt-4 space-y-3">
                                {variables.map((_, index) => (
                                    <div key={index}>
                                        <label className="block text-sm font-medium text-gray-700">Variável <code>{`{{${index + 1}}}`}</code></label>
                                        <input
                                            type="text"
                                            value={variables[index]}
                                            onChange={e => handleVariableChange(index, e.target.value)}
                                            required
                                            className={`mt-1 ${formFieldClasses}`}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="pt-4 border-t mt-auto">
                        {isSending && (recipientType === 'googleSheet' || recipientType === 'segment') && sendProgress.total > 0 && (
                            <div className="mb-4">
                                <p className="text-sm text-center text-gray-600 mb-2">
                                    Enviando {sendProgress.sent} de {sendProgress.total}...
                                    (Sucesso: {sendProgress.success}, Falha: {sendProgress.failed})
                                </p>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div 
                                        className="bg-amber-600 h-2.5 rounded-full transition-all duration-300"
                                        style={{ width: `${(sendProgress.sent / sendProgress.total) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                         <button type="submit" className="w-full bg-amber-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-amber-700 transition duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed" disabled={isSending || !selectedTemplateId || (recipientType !== 'googleSheet' && !recipient) || (recipientType === 'googleSheet' && sheetContacts.length === 0)}>
                            {isSending ? 'Enviando...' : (recipientType === 'googleSheet' ? (sheetContacts.length > 0 ? `Enviar para ${sheetContacts.length} Contatos` : 'Enviar Mensagem') : 'Enviar Mensagem')}
                        </button>
                    </div>

                </div>

                {/* Coluna da Pré-visualização */}
                <div className="lg:col-span-2 flex justify-center items-start">
                    <div className="w-full max-w-sm bg-gray-800 rounded-3xl p-4 shadow-2xl sticky top-8">
                        <div className="w-full bg-white rounded-2xl overflow-hidden">
                            <div className="h-16 bg-teal-600 flex items-center p-3 text-white">
                                 <div className="w-10 h-10 bg-gray-200 rounded-full mr-3 flex-shrink-0"></div>
                                 <div>
                                    <p className="font-semibold">Destinatário</p>
                                    <p className="text-xs">online</p>
                                 </div>
                            </div>
                            <div className="p-4 bg-cover" style={{backgroundImage: "url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')"}}>
                                <div className="min-h-[300px] flex flex-col justify-end">
                                    <div className="bg-[#DCF8C6] p-3 rounded-lg max-w-xs self-start shadow ml-auto">
                                        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{preview}</p>
                                        <p className="text-right text-xs text-gray-500 mt-1">10:30 AM ✓✓</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default SendMessagePage;