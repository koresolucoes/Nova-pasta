
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTemplateById, updateTemplate, deleteTemplate } from '../services/templateService';
import { createMessageTemplate, getActiveConnection } from '../services/metaService';
import { CheckCircleIcon, XCircleIcon, XMarkIcon, TrashIcon, PaperAirplaneIcon } from '../components/icons';
import type { MessageTemplate, TemplateComponent, HeaderComponent, BodyComponent, FooterComponent, ButtonsComponent, Button, UrlButton } from '../types';
import { v4 as uuidv4 } from 'uuid';

type Notification = {
    message: string;
    type: 'success' | 'error';
};

const formFieldClasses = "w-full px-3 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500 transition-colors duration-200";
const formSelectClasses = `${formFieldClasses} appearance-none`;


// --- Sub-components for each section of the builder ---

const HeaderEditor = ({ component, onChange }: { component: HeaderComponent | undefined, onChange: (newComponent: HeaderComponent | undefined) => void }) => {
    if (!component) return null;

    return (
        <div className="space-y-3">
            <select value={component.format} onChange={e => onChange({ ...component, format: e.target.value as HeaderComponent['format'] })} className={formSelectClasses}>
                <option value="TEXT">Texto</option>
                <option value="IMAGE">Imagem</option>
                <option value="VIDEO">Vídeo</option>
                <option value="DOCUMENT">Documento</option>
            </select>
            {component.format === 'TEXT' ? (
                <input
                    type="text"
                    value={component.text || ''}
                    onChange={e => onChange({ ...component, text: e.target.value })}
                    placeholder="Texto do cabeçalho (use {{1}} para uma variável)"
                    className={formFieldClasses}
                />
            ) : (
                <input
                    type="text"
                    value={component.example?.header_handle?.[0] || ''}
                    onChange={e => onChange({ ...component, example: { header_handle: [e.target.value] } })}
                    placeholder={`URL de exemplo do ${component.format.toLowerCase()}`}
                    className={formFieldClasses}
                />
            )}
        </div>
    );
};

const BodyEditor = ({ component, onChange }: { component: BodyComponent, onChange: (newComponent: BodyComponent) => void }) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const addVariable = () => {
        if (textareaRef.current) {
            const currentText = textareaRef.current.value;
            const selectionStart = textareaRef.current.selectionStart;
            const selectionEnd = textareaRef.current.selectionEnd;
            const variableRegex = /\{\{(\d+)\}\}/g;
            let maxVar = 0;
            let match;
            while ((match = variableRegex.exec(currentText)) !== null) {
                maxVar = Math.max(maxVar, parseInt(match[1]));
            }
            const newVar = `{{${maxVar + 1}}}`;
            const newText = currentText.substring(0, selectionStart) + newVar + currentText.substring(selectionEnd);
            onChange({ ...component, text: newText });
        }
    };
    
    return (
        <div className="relative">
            <textarea
                ref={textareaRef}
                value={component.text}
                onChange={e => onChange({ ...component, text: e.target.value })}
                className={`${formFieldClasses} h-48`}
                placeholder="Corpo da mensagem..."
            />
            <button onClick={addVariable} type="button" className="absolute bottom-3 right-3 text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-1 rounded-md hover:bg-amber-200">
                + Adicionar Variável
            </button>
        </div>
    );
};

const FooterEditor = ({ component, onChange }: { component: FooterComponent, onChange: (newComponent: FooterComponent) => void }) => (
    <input type="text" value={component.text} onChange={e => onChange({ ...component, text: e.target.value })} placeholder="Texto do rodapé" className={formFieldClasses} />
);

const ButtonsEditor = ({ component, onChange }: { component: ButtonsComponent, onChange: (newComponent: ButtonsComponent) => void }) => {
    const handleButtonChange = (index: number, updatedButton: Button) => {
        const newButtons = [...component.buttons];
        newButtons[index] = updatedButton;
        onChange({ ...component, buttons: newButtons });
    };

    const handleAddButton = () => {
        const buttonType = component.buttons[0]?.type || 'QUICK_REPLY';
        let newButton: Button;
        if (buttonType === 'QUICK_REPLY') {
            newButton = { type: 'QUICK_REPLY', text: 'Nova Resposta' };
        } else {
            newButton = { type: 'URL', text: 'Visitar Site', url: 'https://' };
        }
        onChange({ ...component, buttons: [...component.buttons, newButton] });
    };

    const handleRemoveButton = (index: number) => {
        const newButtons = component.buttons.filter((_, i) => i !== index);
        onChange({ ...component, buttons: newButtons });
    };

    const setButtonType = (type: 'QUICK_REPLY' | 'URL') => {
        if (type === 'QUICK_REPLY') {
            onChange({ ...component, buttons: [{ type: 'QUICK_REPLY', text: 'Resposta Rápida' }] });
        } else {
            onChange({ ...component, buttons: [{ type: 'URL', text: 'Visitar Site', url: 'https://' }] });
        }
    };
    
    const canAddButton = (component.buttons[0]?.type === 'QUICK_REPLY' && component.buttons.length < 10) ||
                         (component.buttons[0]?.type !== 'QUICK_REPLY' && component.buttons.length < 2);

    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-2">
                <button type="button" onClick={() => setButtonType('QUICK_REPLY')} className={`px-3 py-1 text-sm rounded-md ${component.buttons[0]?.type === 'QUICK_REPLY' ? 'bg-amber-600 text-white' : 'bg-gray-200'}`}>Respostas Rápidas</button>
                <button type="button" onClick={() => setButtonType('URL')} className={`px-3 py-1 text-sm rounded-md ${component.buttons[0]?.type !== 'QUICK_REPLY' ? 'bg-amber-600 text-white' : 'bg-gray-200'}`}>Chamada para Ação</button>
            </div>
            
            {component.buttons.map((btn, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg space-y-2 relative">
                    <button onClick={() => handleRemoveButton(index)} type="button" className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                    {btn.type === 'QUICK_REPLY' && (
                        <input type="text" value={btn.text} onChange={e => handleButtonChange(index, { ...btn, text: e.target.value })} placeholder="Texto da Resposta Rápida" className={formFieldClasses} />
                    )}
                    {btn.type === 'URL' && (
                        <div className="space-y-2">
                            <input type="text" value={btn.text} onChange={e => handleButtonChange(index, { ...btn, text: e.target.value })} placeholder="Texto do Botão" className={formFieldClasses} />
                            <input type="url" value={btn.url} onChange={e => handleButtonChange(index, { ...btn, url: e.target.value })} placeholder="https://exemplo.com" className={formFieldClasses} />
                        </div>
                    )}
                    {btn.type === 'PHONE_NUMBER' && (
                         <div className="space-y-2">
                            <input type="text" value={btn.text} onChange={e => handleButtonChange(index, { ...btn, text: e.target.value })} placeholder="Texto do Botão" className={formFieldClasses} />
                            <input type="tel" value={btn.phone_number} onChange={e => handleButtonChange(index, { ...btn, phone_number: e.target.value })} placeholder="+5511999999999" className={formFieldClasses} />
                        </div>
                    )}
                </div>
            ))}

            {canAddButton && <button type="button" onClick={handleAddButton} className="text-sm text-amber-600 hover:underline">+ Adicionar Botão</button>}
        </div>
    );
};

const TemplatePreview = ({ template }: { template: MessageTemplate | null }) => {
    if (!template) return null;

    const header = template.components.find(c => c.type === 'HEADER') as HeaderComponent | undefined;
    const body = template.components.find(c => c.type === 'BODY') as BodyComponent;
    const footer = template.components.find(c => c.type === 'FOOTER') as FooterComponent | undefined;
    const buttons = template.components.find(c => c.type === 'BUTTONS') as ButtonsComponent | undefined;

    return (
        <div className="w-full max-w-sm bg-gray-900 rounded-3xl p-2 shadow-2xl sticky top-8 mx-auto">
            <div className="bg-white rounded-2xl overflow-hidden">
                <div className="h-14 bg-teal-600 flex items-center p-3 text-white">
                    <div className="w-8 h-8 bg-gray-200 rounded-full mr-3 flex-shrink-0"></div>
                    <p className="font-semibold">Preview</p>
                </div>
                <div className="p-2 bg-cover" style={{ backgroundImage: "url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')" }}>
                    <div className="bg-white p-3 rounded-lg shadow-md max-w-full self-start mb-auto text-left w-full">
                        {header && (
                            <div className="mb-2">
                                {header.format === 'TEXT' && <p className="font-bold text-gray-800 break-words">{header.text || 'Cabeçalho'}</p>}
                                {header.format === 'IMAGE' && <div className="h-32 bg-gray-200 flex items-center justify-center text-gray-400 rounded-md">Imagem</div>}
                                {header.format === 'VIDEO' && <div className="h-32 bg-gray-200 flex items-center justify-center text-gray-400 rounded-md">Vídeo</div>}
                                {header.format === 'DOCUMENT' && <div className="h-16 bg-gray-200 flex items-center justify-center text-gray-400 rounded-md">Documento</div>}
                            </div>
                        )}
                        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{body.text}</p>
                        {footer && <p className="text-xs text-gray-500 mt-2">{footer.text}</p>}
                    </div>
                    {buttons && buttons.buttons.length > 0 && (
                        <div className="mt-2 space-y-1">
                            {buttons.buttons.map((btn, i) => (
                                <div key={i} className="bg-gray-100 text-center text-sm text-blue-600 p-2 rounded-lg cursor-pointer">
                                    {btn.text}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const NotificationToast = ({ notification, onClose }: { notification: Notification; onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const isSuccess = notification.type === 'success';
    return (
        <div className={`fixed top-5 right-5 max-w-sm w-full p-4 rounded-lg border-l-4 shadow-lg z-50 flex items-start transition-all animate-fade-in-right ${isSuccess ? 'bg-green-100 border-green-500 text-green-800' : 'bg-red-100 border-red-500 text-red-800'}`}>
            <div className="flex-shrink-0">{isSuccess ? <CheckCircleIcon className="h-5 w-5" /> : <XCircleIcon className="h-5 w-5" />}</div>
            <div className="ml-3 w-0 flex-1 pt-0.5"><p className="text-sm font-medium">{notification.message}</p></div>
            <button onClick={onClose} className="ml-4 flex-shrink-0 flex"><XMarkIcon className="h-5 w-5" /></button>
        </div>
    );
};


// --- Main Page Component ---

export default function TemplateBuilderPage() {
    const { templateId } = useParams<{ templateId: string }>();
    const navigate = useNavigate();
    const [template, setTemplate] = useState<MessageTemplate | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notification, setNotification] = useState<Notification | null>(null);

    useEffect(() => {
        const loadTemplate = async () => {
            if (templateId) {
                const loadedTemplate = await getTemplateById(templateId);
                if (loadedTemplate) {
                    setTemplate(loadedTemplate);
                } else {
                    navigate('/modelos');
                }
            }
        };
        loadTemplate();
    }, [templateId, navigate]);
    
    // Auto-save draft on change
    useEffect(() => {
        const handler = setTimeout(() => {
            if (template) {
                updateTemplate(template);
            }
        }, 1000);
        return () => clearTimeout(handler);
    }, [template]);

    const handleTemplateChange = (key: keyof MessageTemplate, value: any) => {
        setTemplate(prev => prev ? { ...prev, [key]: value } : null);
    };

    const handleComponentChange = (index: number, newComponent: TemplateComponent) => {
        setTemplate(prev => {
            if (!prev) return null;
            const newComponents = [...prev.components];
            newComponents[index] = newComponent;
            return { ...prev, components: newComponents };
        });
    };

    const toggleComponent = (type: 'HEADER' | 'FOOTER' | 'BUTTONS') => {
        setTemplate(prev => {
            if (!prev) return null;
            const hasComponent = prev.components.some(c => c.type === type);
            if (hasComponent) {
                return { ...prev, components: prev.components.filter(c => c.type !== type) };
            } else {
                let newComponent: TemplateComponent;
                switch (type) {
                    case 'HEADER': newComponent = { type: 'HEADER', format: 'TEXT', text: '' }; break;
                    case 'FOOTER': newComponent = { type: 'FOOTER', text: '' }; break;
                    case 'BUTTONS': newComponent = { type: 'BUTTONS', buttons: [] }; break;
                }
                // Maintain order: HEADER, BODY, FOOTER, BUTTONS
                const newComponents = [...prev.components, newComponent].sort((a, b) => {
                    const order = { HEADER: 1, BODY: 2, FOOTER: 3, BUTTONS: 4 };
                    return order[a.type] - order[b.type];
                });
                return { ...prev, components: newComponents };
            }
        });
    };

    const handleSubmit = async () => {
        if (!template) return;
        
        const connection = await getActiveConnection();
        if (!connection) {
            setNotification({ type: 'error', message: 'Nenhuma conexão ativa com a Meta. Configure em Configurações.' });
            return;
        }

        setIsSubmitting(true);
        setNotification(null);
        try {
            await createMessageTemplate(connection, template);
            await deleteTemplate(template.id); // Remove local draft on successful submission
            setNotification({ type: 'success', message: 'Modelo enviado para aprovação com sucesso!' });
            setTimeout(() => navigate('/modelos'), 2000);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
            setNotification({ type: 'error', message });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!template) return <div className="h-screen w-screen flex items-center justify-center">Carregando editor...</div>;

    const header = template.components.find(c => c.type === 'HEADER') as HeaderComponent | undefined;
    const body = template.components.find(c => c.type === 'BODY') as BodyComponent;
    const footer = template.components.find(c => c.type === 'FOOTER') as FooterComponent | undefined;
    const buttons = template.components.find(c => c.type === 'BUTTONS') as ButtonsComponent | undefined;

    return (
        <div className="min-h-screen bg-gray-50">
            {notification && <NotificationToast notification={notification} onClose={() => setNotification(null)} />}
            <header className="bg-white border-b p-3 flex justify-between items-center sticky top-0 z-10">
                 <div className="flex items-center">
                    <button onClick={() => navigate('/modelos')} className="text-gray-500 hover:text-gray-800 mr-3 p-2 rounded-full hover:bg-gray-100">
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <h1 className="font-bold text-lg text-gray-800">{template.name}</h1>
                    <span className="ml-3 text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">Rascunho</span>
                </div>
                <div className="flex items-center space-x-3">
                    <button onClick={handleSubmit} disabled={isSubmitting} className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition duration-300 disabled:opacity-50 font-semibold flex items-center">
                         <PaperAirplaneIcon className="w-5 h-5 mr-2"/>
                        {isSubmitting ? "Enviando..." : "Enviar para Aprovação"}
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
                <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <h2 className="text-lg font-bold mb-4">Informações Básicas</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <input type="text" value={template.name} onChange={e => handleTemplateChange('name', e.target.value)} placeholder="Nome do modelo" className={formFieldClasses} />
                             <select value={template.category} onChange={e => handleTemplateChange('category', e.target.value)} className={formSelectClasses}>
                                <option value="MARKETING">Marketing</option>
                                <option value="UTILITY">Utilidade</option>
                                <option value="AUTHENTICATION">Autenticação</option>
                            </select>
                            <input type="text" value={template.language} onChange={e => handleTemplateChange('language', e.target.value)} placeholder="Idioma (ex: pt_BR)" className={formFieldClasses} />
                        </div>
                    </div>
                    
                    {/* Component Editors */}
                     {[
                        { type: 'HEADER', title: 'Cabeçalho', component: header },
                        { type: 'BODY', title: 'Corpo', component: body },
                        { type: 'FOOTER', title: 'Rodapé', component: footer },
                        { type: 'BUTTONS', title: 'Botões', component: buttons },
                     ].map(({ type, title, component }) => (
                         <div key={type} className="bg-white p-6 rounded-lg shadow-sm border">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold">{title}</h2>
                                {type !== 'BODY' && (
                                    <label className="flex items-center cursor-pointer">
                                        <div className="relative">
                                            <input type="checkbox" className="sr-only" checked={!!component} onChange={() => toggleComponent(type as any)} />
                                            <div className={`block w-10 h-6 rounded-full transition-colors ${!!component ? 'bg-amber-500' : 'bg-gray-300'}`}></div>
                                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${!!component ? 'translate-x-full' : ''}`}></div>
                                        </div>
                                    </label>
                                )}
                            </div>
                            {type === 'HEADER' && !!component && <HeaderEditor component={header} onChange={c => handleComponentChange(template.components.findIndex(comp => comp.type === 'HEADER'), c!)} />}
                            {type === 'BODY' && <BodyEditor component={body} onChange={c => handleComponentChange(template.components.findIndex(comp => comp.type === 'BODY'), c)} />}
                            {type === 'FOOTER' && !!component && <FooterEditor component={footer!} onChange={c => handleComponentChange(template.components.findIndex(comp => comp.type === 'FOOTER'), c)} />}
                            {type === 'BUTTONS' && !!component && <ButtonsEditor component={buttons!} onChange={c => handleComponentChange(template.components.findIndex(comp => comp.type === 'BUTTONS'), c)} />}
                        </div>
                     ))}

                </div>
                <div>
                    <TemplatePreview template={template} />
                </div>
            </div>
        </div>
    );
}