
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFlowById, updateFlow, saveDraftFlow, generateFlowPreview } from '../services/flowService';
import type { WhatsAppFlow, FlowScreen, FlowComponent, FlowAction, FlowComponentType, FlowActionType, FlowDataSourceItem, CarouselImage } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import {
    CheckCircleIcon, XCircleIcon, XMarkIcon, TrashIcon, PaperAirplaneIcon, PlusIcon,
    PencilIcon, EyeIcon, ArrowUpIcon, ArrowDownIcon, Cog6ToothIcon, ArrowDownIcon as ArrowDownTrayIcon
} from '../components/icons';
import { FlowStatus } from '../../types';

// --- Shared Styles & Types ---
const formFieldClasses = "w-full px-3 py-2 text-sm text-gray-700 bg-gray-100 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500 transition-colors duration-200";

type Notification = {
    message: string;
    type: 'success' | 'error' | 'info';
    details?: string[];
};

type InspectorView = 'component' | 'screen' | 'flow';


// --- Helper Functions ---
const slugify = (text: string): string => {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD') // split an accented letter in the base letter and the acent
        .replace(/[\u0300-\u036f]/g, '') // remove all previously split accents
        .replace(/\s+/g, '_')
        .replace(/[^\w_]+/g, '')
        .replace(/__+/g, '_')
        .replace(/^_+/, '')
        .replace(/_+$/, '');
};


// --- Sub-Components ---

const InspectorField = ({ label, children, helpText }: { label: string, children: React.ReactNode, helpText?: string }) => (
    <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
        {children}
        {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
    </div>
);

const ActionEditor = ({ action, onChange, screens, title = "Ação ao Clicar" }: { action: FlowAction | undefined, onChange: (newAction: FlowAction | undefined) => void, screens: FlowScreen[], title?: string }) => {
    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newType = e.target.value as FlowActionType | '';
        if (newType === '') {
            onChange(undefined);
        } else {
            onChange({ type: newType });
        }
    };
    
    const updateActionProp = (key: keyof FlowAction, value: any) => {
        if (!action) return;
        onChange({ ...action, [key]: value });
    };

    return (
        <div className="space-y-2 p-3 bg-gray-50 border rounded-md">
            <InspectorField label={title}>
                <select value={action?.type || ''} onChange={handleTypeChange} className={formFieldClasses}>
                    <option value="">Nenhuma</option>
                    <option value="Navigate">Navegar para Tela</option>
                    <option value="Complete">Finalizar Flow</option>
                    <option value="DataExchange">Trocar Dados (API)</option>
                    <option value="open_url">Abrir URL</option>
                    <option value="update_data">Atualizar Dados na Tela</option>
                </select>
            </InspectorField>
            {action?.type === 'Navigate' && (
                <InspectorField label="Tela de Destino">
                    <select value={action.targetScreenId || ''} onChange={e => updateActionProp('targetScreenId', e.target.value)} className={formFieldClasses}>
                        <option value="">Selecione a tela...</option>
                        {screens.map(s => <option key={s.id} value={s.screen_id}>{s.title}</option>)}
                    </select>
                </InspectorField>
            )}
            {action?.type === 'open_url' && (
                <InspectorField label="URL">
                    <input type="url" value={action.url || ''} onChange={e => updateActionProp('url', e.target.value)} className={formFieldClasses} placeholder="https://example.com" />
                </InspectorField>
            )}
        </div>
    );
}

const DataSourceEditor = ({ dataSource = [], onChange }: { dataSource: FlowDataSourceItem[], onChange: (newDataSource: FlowDataSourceItem[]) => void }) => {
    const updateItem = (index: number, prop: keyof FlowDataSourceItem, value: string) => {
        const newItems = [...dataSource];
        newItems[index] = { ...newItems[index], [prop]: value };
        onChange(newItems);
    };
    const addItem = () => {
        const newItem: FlowDataSourceItem = { id: `opcao_${dataSource.length + 1}`, title: 'Nova Opção' };
        onChange([...dataSource, newItem]);
    };
    const removeItem = (index: number) => {
        onChange(dataSource.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-2">
            {dataSource.map((item, index) => (
                <div key={item.id} className="flex items-start space-x-2 bg-gray-50 p-2 rounded-md border">
                    <div className="space-y-2 flex-grow">
                        <input type="text" placeholder="ID da Opção" value={item.id} onChange={e => updateItem(index, 'id', e.target.value)} className={formFieldClasses} />
                        <input type="text" placeholder="Título Visível" value={item.title} onChange={e => updateItem(index, 'title', e.target.value)} className={formFieldClasses} />
                        <input type="text" placeholder="Descrição (opcional)" value={item.description || ''} onChange={e => updateItem(index, 'description', e.target.value)} className={formFieldClasses} />
                    </div>
                    <button onClick={() => removeItem(index)} className="p-2 text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                </div>
            ))}
            <button onClick={addItem} className="text-sm font-semibold text-amber-600 hover:underline">+ Adicionar Opção</button>
        </div>
    );
};

const ImageCarouselEditor = ({ images = [], onChange }: { images: CarouselImage[], onChange: (newImages: CarouselImage[]) => void }) => {
    const updateItem = (id: string, prop: keyof CarouselImage, value: string) => {
        onChange(images.map(img => img.id === id ? { ...img, [prop]: value } : img));
    };
    const addItem = () => {
        const newItem: CarouselImage = { id: uuidv4(), src: '', 'alt-text': 'Nova Imagem' };
        onChange([...images, newItem]);
    };
    const removeItem = (id: string) => {
        onChange(images.filter(img => img.id !== id));
    };

    return (
        <div className="space-y-2">
            {images.map((item) => (
                <div key={item.id} className="flex items-start space-x-2 bg-gray-50 p-2 rounded-md border">
                    <div className="space-y-2 flex-grow">
                        <textarea placeholder="URL da Imagem (Base64)" value={item.src} onChange={e => updateItem(item.id, 'src', e.target.value)} className={`${formFieldClasses} h-16`} />
                        <input type="text" placeholder="Texto Alternativo" value={item['alt-text']} onChange={e => updateItem(item.id, 'alt-text', e.target.value)} className={formFieldClasses} />
                    </div>
                    <button onClick={() => removeItem(item.id)} className="p-2 text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                </div>
            ))}
            <button onClick={addItem} className="text-sm font-semibold text-amber-600 hover:underline">+ Adicionar Imagem</button>
        </div>
    );
};


const ComponentInspector = ({ component, onChange, onDelete, screens }: { component: FlowComponent; onChange: (id: string, prop: keyof FlowComponent, value: any) => void; onDelete: (id: string) => void; screens: FlowScreen[]; }) => {
    const update = (prop: keyof FlowComponent, value: any) => onChange(component.id, prop, value);
    const isConditionalVisibility = typeof component.visible === 'string';

    const [isNameLocked, setIsNameLocked] = useState(true);

    useEffect(() => {
        // When label changes, if the name is "locked" (meaning, it's auto-generated), update it.
        const labelOrText = component.label || component.text;
        if (isNameLocked && typeof labelOrText === 'string' && labelOrText) {
            const newName = slugify(labelOrText);
            if (newName && newName !== component.name) {
                update('name', newName);
            }
        }
    }, [component.label, component.text, isNameLocked]);
    
    // Check on component change if the name looks like it was auto-generated from the label.
     useEffect(() => {
        const labelOrText = component.label || component.text;
        const potentialSlug = typeof labelOrText === 'string' ? slugify(labelOrText) : '';
        setIsNameLocked(!component.name || component.name === potentialSlug);
    }, [component.id]);


    const renderCommonFields = () => {
        const showNameField = !['TextHeading', 'TextSubheading', 'TextBody', 'TextCaption', 'RichText', 'Image', 'Footer'].includes(component.type);
        return (
            <>
                {showNameField && (
                    <InspectorField label="Nome da Variável (API)" helpText="O nome único usado para referenciar este campo.">
                         <div className="relative">
                            <input
                                type="text"
                                value={component.name || ''}
                                onChange={e => {
                                    setIsNameLocked(false);
                                    update('name', e.target.value);
                                }}
                                className={`${formFieldClasses} pr-8`}
                                placeholder="ex: user_name"
                            />
                             <button
                                onClick={() => setIsNameLocked(!isNameLocked)}
                                title={isNameLocked ? "Desbloquear para editar manualmente" : "Bloquear para sincronizar com o rótulo"}
                                className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                            >
                               {isNameLocked ? 
                                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-600"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>
                                 :
                                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5a4.5 4.5 0 00-4.5-4.5zm-2 8V5.5a3 3 0 116 0V9h-6z" /></svg>
                               }
                             </button>
                        </div>
                    </InspectorField>
                )}
                <InspectorField label="Visibilidade do Componente">
                    {isConditionalVisibility ? (
                        <div className="space-y-1">
                            <input type="text" value={component.visible as string} onChange={e => update('visible', e.target.value)} className={formFieldClasses} placeholder="${form.nome_do_campo.valor}"/>
                            <p className="text-xs text-gray-500 mt-1">Exemplo: <code>{`${'${form.checkbox.valor}'} == true`}</code></p>
                            <button onClick={() => update('visible', true)} className="text-xs text-red-600 hover:underline">Remover condição</button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <label className="flex items-center cursor-pointer">
                                <div className="relative">
                                    <input type="checkbox" className="sr-only" checked={component.visible !== false} onChange={e => update('visible', e.target.checked)}/>
                                    <div className={`block w-10 h-6 rounded-full transition-colors ${component.visible !== false ? 'bg-amber-500' : 'bg-gray-300'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${component.visible !== false ? 'translate-x-full' : ''}`}></div>
                                </div>
                                <span className="ml-3 text-sm font-medium text-gray-700">{component.visible !== false ? 'Visível' : 'Oculto'}</span>
                            </label>
                            <button onClick={() => update('visible', '')} className="text-xs text-amber-600 hover:underline font-semibold">Usar Condição</button>
                        </div>
                    )}
                </InspectorField>
            </>
        );
    };

    const renderSpecificEditor = () => {
        switch (component.type) {
            case 'TextHeading':
            case 'TextSubheading':
            case 'TextBody':
            case 'TextCaption':
                return (
                    <InspectorField label="Texto">
                        <textarea value={Array.isArray(component.text) ? component.text.join('\n') : component.text || ''} onChange={e => update('text', e.target.value)} className={`${formFieldClasses} h-24`} />
                    </InspectorField>
                );

            case 'RichText':
                return (
                    <InspectorField label="Conteúdo (Markdown)" helpText="Use a sintaxe Markdown para formatar o texto.">
                        <textarea value={Array.isArray(component.text) ? component.text.join('\n') : component.text || ''} onChange={e => update('text', e.target.value)} className={`${formFieldClasses} h-48`} />
                    </InspectorField>
                );

            case 'TextInput':
            case 'TextArea':
                return (
                    <div className="space-y-4">
                        <InspectorField label="Rótulo (Label)"><input type="text" value={component.label || ''} onChange={e => update('label', e.target.value)} className={formFieldClasses} /></InspectorField>
                        <InspectorField label="Texto de Ajuda"><input type="text" value={component['helper-text'] || ''} onChange={e => update('helper-text', e.target.value)} className={formFieldClasses} /></InspectorField>
                        {component.type === 'TextInput' && (
                             <InspectorField label="Tipo de Entrada">
                                <select value={component['input-type'] || 'text'} onChange={e => update('input-type', e.target.value)} className={formFieldClasses}>
                                    <option value="text">Texto</option><option value="number">Número</option><option value="email">Email</option><option value="password">Senha</option><option value="passcode">Código de Acesso</option><option value="phone">Telefone</option>
                                </select>
                            </InspectorField>
                        )}
                        <InspectorField label="Obrigatório?"><input type="checkbox" checked={component.required || false} onChange={e => update('required', e.target.checked)} className="h-5 w-5 rounded text-amber-600 focus:ring-amber-500" /></InspectorField>
                    </div>
                );

            case 'CheckboxGroup':
            case 'RadioButtonsGroup':
            case 'Dropdown':
            case 'ChipsSelector':
                 return (
                    <div className="space-y-4">
                        <InspectorField label="Rótulo (Label)"><input type="text" value={component.label || ''} onChange={e => update('label', e.target.value)} className={formFieldClasses} /></InspectorField>
                        <InspectorField label="Opções do Componente">
                           <DataSourceEditor dataSource={component['data-source']} onChange={ds => update('data-source', ds)} />
                        </InspectorField>
                         {component.type === 'CheckboxGroup' && (
                            <InspectorField label="Seleção de Itens">
                                <div className="flex items-center space-x-2">
                                     <input type="number" placeholder="Mín" value={component['min-selected-items'] || ''} onChange={e => update('min-selected-items', e.target.value ? parseInt(e.target.value) : undefined)} className={formFieldClasses} />
                                      <input type="number" placeholder="Máx" value={component['max-selected-items'] || ''} onChange={e => update('max-selected-items', e.target.value ? parseInt(e.target.value) : undefined)} className={formFieldClasses} />
                                </div>
                            </InspectorField>
                         )}
                    </div>
                 );

            case 'Footer':
                return (
                    <div className="space-y-4">
                        <InspectorField label="Rótulo do Botão"><input type="text" value={component.label || ''} onChange={e => update('label', e.target.value)} className={formFieldClasses} /></InspectorField>
                        <InspectorField label="Legendas (Opcional)">
                             <div className="space-y-2">
                                <input type="text" placeholder="Legenda Esquerda" value={component['left-caption'] || ''} onChange={e => update('left-caption', e.target.value)} className={formFieldClasses} />
                                <input type="text" placeholder="Legenda Direita" value={component['right-caption'] || ''} onChange={e => update('right-caption', e.target.value)} className={formFieldClasses} />
                            </div>
                        </InspectorField>
                        <ActionEditor action={component['on-click-action']} onChange={(newAction) => update('on-click-action', newAction)} screens={screens}/>
                    </div>
                );
            
            case 'ImageCarousel':
                return (
                    <div className="space-y-4">
                        <InspectorField label="Imagens do Carrossel">
                            <ImageCarouselEditor images={component.images} onChange={imgs => update('images', imgs)} />
                        </InspectorField>
                        <InspectorField label="Proporção da Imagem">
                            <select value={component['aspect-ratio']?.toString() || '1.91'} onChange={e => update('aspect-ratio', e.target.value)} className={formFieldClasses}>
                                <option value="1.91">Horizontal (1.91:1)</option>
                                <option value="1">Quadrado (1:1)</option>
                            </select>
                        </InspectorField>
                    </div>
                );
            
            case 'DatePicker':
                 return (
                     <div className="space-y-4">
                         <InspectorField label="Rótulo (Label)"><input type="text" value={component.label || ''} onChange={e => update('label', e.target.value)} className={formFieldClasses} /></InspectorField>
                         <InspectorField label="Data Mínima"><input type="date" value={component['min-date'] || ''} onChange={e => update('min-date', e.target.value)} className={formFieldClasses} /></InspectorField>
                         <InspectorField label="Data Máxima"><input type="date" value={component['max-date'] || ''} onChange={e => update('max-date', e.target.value)} className={formFieldClasses} /></InspectorField>
                    </div>
                 );

            default:
                return <p className="text-sm text-gray-500">Editor para '{component.type}' ainda não implementado.</p>
        }
    };
    
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg">{component.type.replace(/([A-Z])/g, ' $1').trim()}</h2>
                <button onClick={() => onDelete(component.id)} className="p-1 text-gray-400 hover:text-red-500"><TrashIcon className="w-5 h-5"/></button>
            </div>
            <div className="space-y-4">
                {renderCommonFields()}
                {renderSpecificEditor()}
            </div>
        </div>
    );
};

const ComponentToolbox = ({ onAddComponent }: { onAddComponent: (type: FlowComponentType) => void }) => {
    const componentGroups = [
        { name: "Texto", components: [
            { id: "TextHeading", label: "Título" }, { id: "TextSubheading", label: "Subtítulo" },
            { id: "TextBody", label: "Corpo" }, { id: "TextCaption", label: "Legenda" }, { id: "RichText", label: "Texto Rico" },
        ]},
        { name: "Entradas", components: [
            { id: "TextInput", label: "Campo de Texto" }, { id: "TextArea", label: "Área de Texto" },
            { id: "CheckboxGroup", label: "Grupo de Checkbox" }, { id: "RadioButtonsGroup", label: "Botões de Rádio" },
            { id: "Dropdown", label: "Dropdown" }, { id: "DatePicker", label: "Seletor de Data" },
            { id: "CalendarPicker", label: "Calendário" }, { id: "ChipsSelector", label: "Chips" }, { id: "OptIn", label: "Opt-In" },
        ]},
         { name: "Mídia", components: [
            { id: "Image", label: "Imagem" }, { id: "ImageCarousel", label: "Carrossel" },
            { id: "PhotoPicker", label: "Upload de Foto" }, { id: "DocumentPicker", label: "Upload de Doc" },
        ]},
        { name: "Ações", components: [
            { id: "Footer", label: "Rodapé com Botão" }, { id: "EmbeddedLink", label: "Link Incorporado" },
        ]}
    ];

    return (
        <div className="space-y-4">
            {componentGroups.map(group => (
                <div key={group.name}>
                    <h3 className="font-semibold text-sm text-gray-600 mb-2">{group.name}</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {group.components.map(comp => (
                            <button key={comp.id} onClick={() => onAddComponent(comp.id as FlowComponentType)} className="text-left p-2 rounded-md border bg-white hover:border-amber-500 hover:bg-amber-50 transition-all">
                                <span className="font-medium text-sm">{comp.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};


const FlowPreview = ({ screen, flowName }: { screen: FlowScreen | undefined, flowName: string }) => {
    if (!screen) {
        return (
            <div className="w-full max-w-sm bg-gray-900 rounded-3xl p-2 shadow-2xl sticky top-8 mx-auto flex items-center justify-center">
                <p className="text-white">Selecione uma tela para ver a pré-visualização.</p>
            </div>
        );
    }
    return (
        <div className="w-full max-w-sm bg-gray-900 rounded-3xl p-2 shadow-2xl sticky top-8 mx-auto">
            <div className="bg-white rounded-2xl overflow-hidden">
                <div className="h-14 bg-teal-600 flex items-center p-3 text-white">
                    <div className="w-8 h-8 bg-gray-200 rounded-full mr-3 flex-shrink-0"></div>
                    <p className="font-semibold">{flowName}</p>
                </div>
                <div className="p-2 bg-cover" style={{ backgroundImage: "url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')" }}>
                    <div className="bg-white p-3 rounded-lg shadow-md max-w-full self-start mb-auto text-left w-full min-h-[400px]">
                        {screen.layout.children.map(comp => {
                           if(comp.visible === false) return null;
                           return (
                            <div key={comp.id} className="mb-3 text-sm">
                                {comp.type === 'TextHeading' && <h3 className="font-bold text-lg">{comp.text || `[Título]`}</h3>}
                                {comp.type === 'TextSubheading' && <h4 className="font-semibold text-base">{comp.text || `[Subtítulo]`}</h4>}
                                {comp.type === 'TextBody' && <p>{comp.text || `[Corpo]`}</p>}
                                {comp.type === 'TextCaption' && <p className="text-xs text-gray-500">{comp.text || `[Legenda]`}</p>}
                                {comp.type === 'TextInput' && <div className="p-2 border rounded bg-gray-50">{comp.label || '[Campo de Texto]'}</div>}
                                {comp.type === 'TextArea' && <div className="p-2 h-16 border rounded bg-gray-50">{comp.label || '[Área de Texto]'}</div>}
                                {comp.type === 'Dropdown' && <div className="p-2 border rounded bg-gray-50">{comp.label || '[Dropdown]'}</div>}
                                {comp.type === 'Footer' && <div className="p-2 bg-gray-200 text-center rounded mt-4">{comp.label || '[Botão de Rodapé]'}</div>}
                                {comp.type === 'Image' && <div className="h-24 bg-gray-200 flex items-center justify-center text-gray-400 rounded-md">Imagem</div>}
                            </div>
                           )}
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const NotificationToast = ({ notification, onClose }: { notification: Notification; onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 8000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const isSuccess = notification.type === 'success';
    const isError = notification.type === 'error';
    const Icon = isSuccess ? CheckCircleIcon : isError ? XCircleIcon : CheckCircleIcon;
    const colors = isSuccess ? 'bg-green-100 border-green-500 text-green-800' : isError ? 'bg-red-100 border-red-500 text-red-800' : 'bg-blue-100 border-blue-500 text-blue-800';

    return (
        <div className={`fixed top-5 right-5 max-w-sm w-full p-4 rounded-lg border-l-4 shadow-lg z-50 flex items-start transition-all animate-fade-in-right ${colors}`}>
            <div className="flex-shrink-0"><Icon className="h-5 w-5" /></div>
            <div className="ml-3 w-0 flex-1 pt-0.5">
                <p className="text-sm font-medium">{notification.message}</p>
                {notification.details && (
                    <ul className="mt-2 list-disc list-inside text-xs">
                        {notification.details.map((detail, i) => <li key={i}>{detail}</li>)}
                    </ul>
                )}
            </div>
            <button onClick={onClose} className="ml-4 flex-shrink-0 flex"><XMarkIcon className="h-5 w-5" /></button>
        </div>
    );
};

// --- Main Page Component ---

export default function FlowBuilderPage() {
    const { flowId } = useParams<{ flowId: string }>();
    const navigate = useNavigate();
    const [flow, setFlow] = useState<WhatsAppFlow | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null);
    const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
    const [inspectorView, setInspectorView] = useState<InspectorView>('screen');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [notification, setNotification] = useState<Notification | null>(null);
    
    const debouncedSave = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Initial Load and screen selection logic
    useEffect(() => {
        if (!flowId) {
            navigate('/flows');
            return;
        }

        const loadInitialData = async () => {
            try {
                const data = await getFlowById(flowId);
                if (!data) {
                    navigate('/flows');
                    return;
                }
                
                // If a Meta-synced flow has no local content, create a default screen.
                // This makes the flow editable immediately without a network call to Meta that might fail.
                if (data.origin === 'meta' && data.screens.length === 0) {
                    const newScreen: FlowScreen = {
                        id: uuidv4(),
                        screen_id: 'WELCOME_SCREEN',
                        title: 'Tela de Boas-Vindas',
                        layout: { type: 'SingleColumnLayout', children: [] },
                    };
                    const updatedFlowData = { ...data, screens: [newScreen] };
                    
                    // Save it back to prevent re-running this logic on subsequent loads.
                    const savedFlow = await updateFlow(updatedFlowData); 
                    
                    setFlow(savedFlow);
                    setSelectedScreenId(savedFlow.screens[0]?.id || null);
                } else {
                    setFlow(data);
                    if (data.screens.length > 0 && !selectedScreenId) {
                        setSelectedScreenId(data.screens[0].id);
                    }
                }
            } catch (err) {
                 setError(err instanceof Error ? err.message : "Falha ao carregar o flow.");
            }
        };

        loadInitialData();
        
    }, [flowId, navigate, selectedScreenId]);

    // Auto-save with error handling
    useEffect(() => {
        if (flow) {
            if (debouncedSave.current) clearTimeout(debouncedSave.current);
            debouncedSave.current = setTimeout(() => {
                if (flow.status !== FlowStatus.PUBLISHED) { // Avoid saving published flows automatically
                    updateFlow(flow).catch(err => {
                        console.error("Auto-save failed:", err);
                        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                        setNotification({ type: 'error', message: `Falha ao salvar rascunho.` });
                    });
                }
            }, 1500);
        }
        return () => {
            if (debouncedSave.current) clearTimeout(debouncedSave.current);
        };
    }, [flow]);

    const updateFlowState = useCallback((updater: (prev: WhatsAppFlow) => WhatsAppFlow) => {
        setFlow(prev => prev ? updater(prev) : null);
    }, []);

    const addScreen = () => {
        const newScreenId = uuidv4();
        const newScreen: FlowScreen = {
            id: newScreenId,
            screen_id: `SCREEN_${flow ? flow.screens.length + 1 : 1}`,
            title: 'Nova Tela',
            layout: { type: 'SingleColumnLayout', children: [] }
        };
        updateFlowState(prev => ({ ...prev, screens: [...prev.screens, newScreen] }));
        setSelectedScreenId(newScreenId);
    };

    const deleteScreen = (screenId: string) => {
        if (flow && flow.screens.length <= 1) {
            alert("Um flow deve ter pelo menos uma tela.");
            return;
        }
        updateFlowState(prev => ({
            ...prev,
            screens: prev.screens.filter(s => s.id !== screenId)
        }));
        if(selectedScreenId === screenId) {
             setSelectedScreenId(flow?.screens[0]?.id || null);
        }
    };
    
    const addComponent = (type: FlowComponentType) => {
        const baseId = slugify(`${type}_${uuidv4().substring(0,4)}`);
        let baseComponent: FlowComponent = { id: uuidv4(), type, name: baseId };
        
        const defaultText = (label: string) => { baseComponent.text = label; baseComponent.name = slugify(label); };
        const defaultLabel = (label: string) => { baseComponent.label = label; baseComponent.name = slugify(label); };
        
        switch(type) {
            case 'TextHeading': defaultText("Confira os Detalhes do Pedido"); break;
            case 'TextSubheading': defaultText("Resumo da sua compra"); break;
            case 'TextBody': defaultText("Seu pedido #12345 foi confirmado e será enviado em breve. Agradecemos a sua preferência!"); break;
            case 'RichText': defaultText("# Termos de Serviço\n\nAo continuar, você concorda com nossos termos. Leia mais em nosso [site](https://example.com)."); break;
            case 'TextInput': defaultLabel("Digite seu nome completo"); baseComponent.name = "customer_name"; break;
            case 'TextArea': defaultLabel("Deixe um comentário (opcional)"); baseComponent.name = "customer_comment"; break;
            case 'CheckboxGroup': defaultLabel("Quais produtos você tem interesse?"); baseComponent.name = 'product_interest'; baseComponent['data-source'] = [{id: 'eletronicos', title: 'Eletrônicos'}, {id: 'vestuario', title: 'Vestuário'}]; break;
            case 'RadioButtonsGroup': defaultLabel("Tipo de Atendimento"); baseComponent.name = 'service_type'; baseComponent['data-source'] = [{id: 'suporte_tecnico', title: 'Suporte Técnico'}, {id: 'informacoes_produto', title: 'Informações do Produto'}]; break;
            case 'Dropdown': defaultLabel("Selecione o Estado"); baseComponent.name = 'state_selection'; baseComponent['data-source'] = [{id: 'sp', title: 'São Paulo'}, {id: 'rj', title: 'Rio de Janeiro'}]; break;
            case 'ChipsSelector': defaultLabel("Selecione seus interesses"); baseComponent.name = 'user_interests'; baseComponent['data-source'] = [{id: 'esportes', title: 'Esportes'}, {id: 'tecnologia', title: 'Tecnologia'}]; break;
            case 'DatePicker': defaultLabel("Selecione a data de nascimento"); baseComponent.name = "date_of_birth"; break;
            case 'CalendarPicker': defaultLabel("Selecione as datas da sua estadia"); baseComponent.name = "hotel_stay_dates"; break;
            case 'OptIn': defaultLabel("Sim, quero receber novidades por WhatsApp"); baseComponent.name = "whatsapp_opt_in"; break;
            case 'Image': baseComponent.src = ""; baseComponent['alt-text'] = "Logotipo da empresa"; baseComponent.name = "company_logo"; break;
            case 'ImageCarousel': baseComponent.images = [{id: uuidv4(), src: '', 'alt-text': 'Produto em destaque 1'}]; baseComponent.name = "product_carousel"; break;
            case 'PhotoPicker': defaultLabel("Envie uma foto do seu RG"); baseComponent.name = "id_photo_upload"; break;
            case 'DocumentPicker': defaultLabel("Anexe o comprovante de residência"); baseComponent.name = "proof_of_address_upload"; break;
            case 'Footer': defaultLabel("Confirmar e Enviar"); baseComponent.name = "submit_button"; baseComponent['on-click-action'] = {type: "Complete"}; break;
            case 'EmbeddedLink': defaultText("Saiba mais sobre a oferta"); baseComponent.name = "offer_details_link"; baseComponent['on-click-action'] = {type: "open_url", url: 'https://www.example.com/oferta'}; break;
            default: defaultLabel("Novo Componente");
        }

        updateFlowState(prev => ({
            ...prev,
            screens: prev.screens.map(s => 
                s.id === selectedScreenId 
                    ? { ...s, layout: { ...s.layout, children: [...s.layout.children, baseComponent] } }
                    : s
            )
        }));
    };
    
    const deleteComponent = (componentId: string) => {
        updateFlowState(prev => ({
            ...prev,
            screens: prev.screens.map(s => 
                s.id === selectedScreenId 
                    ? { ...s, layout: { ...s.layout, children: s.layout.children.filter(c => c.id !== componentId) } }
                    : s
            )
        }));
        if(selectedComponentId === componentId) {
            setSelectedComponentId(null);
            setInspectorView('screen');
        }
    };

    const updateComponentProp = useCallback((componentId: string, prop: keyof FlowComponent, value: any) => {
         updateFlowState(prev => ({
            ...prev,
            screens: prev.screens.map(s => 
                s.id === selectedScreenId 
                    ? { ...s, layout: { ...s.layout, children: s.layout.children.map(c => c.id === componentId ? {...c, [prop]: value} : c) } }
                    : s
            )
        }));
    }, [selectedScreenId, updateFlowState]);

    const handleSubmit = async () => {
        if (!flow) return;
        
        setIsSubmitting(true);
        setNotification(null);
        try {
            const result = await saveDraftFlow(flow.id);

            if (result.success) {
                 setNotification({ type: 'success', message: 'Rascunho do flow salvo com sucesso!' });
                 setTimeout(() => navigate('/flows'), 2000);
            } else if (result.errors) {
                 const errorDetails = result.errors.map(e => e.error_user_msg || e.message);
                 setNotification({ type: 'error', message: "Falha ao salvar rascunho devido a erros de validação da Meta:", details: errorDetails });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
            setNotification({ type: 'error', message: `Falha ao salvar rascunho: ${message}` });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTestFlow = async () => {
        if (!flow) return;
    
        setIsTesting(true);
        setNotification(null);
        try {
            // First, ensure the latest changes are saved to the backend
            await updateFlow(flow);
            // Then, generate the preview URL
            const previewUrl = await generateFlowPreview(flow.id);
            window.open(previewUrl, '_blank');
            setNotification({ type: 'info', message: 'URL de pré-visualização gerada e aberta em uma nova aba.' });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Ocorreu um erro desconhecido.";
            setNotification({ type: 'error', message: `Falha ao gerar pré-visualização: ${message}` });
        } finally {
            setIsTesting(false);
        }
    };
    
    const handleSelectComponent = (componentId: string) => {
        setSelectedComponentId(componentId);
        setInspectorView('component');
    };

    const selectedScreen = useMemo(() => flow?.screens.find(s => s.id === selectedScreenId), [flow, selectedScreenId]);
    const selectedComponent = useMemo(() => selectedScreen?.layout.children.find(c => c.id === selectedComponentId), [selectedScreen, selectedComponentId]);
    
    if (error) {
         return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-red-50 text-red-700">
                <XCircleIcon className="w-12 h-12" />
                <p className="text-lg font-semibold mt-4">Erro ao Carregar o Flow</p>
                <p className="max-w-md text-center">{error}</p>
                 <button onClick={() => navigate('/flows')} className="mt-6 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    Voltar para a Lista de Flows
                </button>
            </div>
        );
    }

    if (!flow) return <div className="h-screen w-screen flex items-center justify-center">Carregando editor de flow...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {notification && <NotificationToast notification={notification} onClose={() => setNotification(null)} />}
            <header className="bg-white border-b p-3 flex justify-between items-center sticky top-0 z-20 shrink-0">
                <div className="flex items-center">
                    <button onClick={() => navigate('/flows')} className="p-2 rounded-full hover:bg-gray-100 mr-2">
                        <XMarkIcon className="w-5 h-5 text-gray-600" />
                    </button>
                    <input
                        value={flow.name}
                        onChange={e => updateFlowState(p => ({...p, name: e.target.value}))}
                        className="font-bold text-lg bg-transparent focus:outline-none focus:bg-gray-100 p-1 rounded-md"
                    />
                </div>
                <div className="flex items-center space-x-3">
                    <button onClick={handleTestFlow} disabled={isTesting || isSubmitting} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold flex items-center disabled:opacity-50">
                        <EyeIcon className="w-5 h-5 mr-2" />
                        {isTesting ? 'Gerando...' : 'Testar Flow'}
                    </button>
                    <button onClick={handleSubmit} disabled={isSubmitting || isTesting} className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition duration-300 disabled:opacity-50 font-semibold flex items-center">
                        <PaperAirplaneIcon className="w-5 h-5 mr-2" />
                        {isSubmitting ? "Salvando..." : "Salvar Rascunho"}
                    </button>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-hidden">
                <aside className="lg:col-span-3 bg-white p-4 rounded-lg border shadow-sm flex flex-col overflow-y-auto">
                    <div className="pb-4 border-b">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="font-bold text-gray-800">Telas</h2>
                            <button onClick={addScreen} className="p-1 rounded-md bg-amber-100 text-amber-600 hover:bg-amber-200"><PlusIcon className="w-5 h-5"/></button>
                        </div>
                        <div className="space-y-1">
                            {flow.screens.map(screen => (
                                <div key={screen.id} onClick={() => { setSelectedScreenId(screen.id); setSelectedComponentId(null); setInspectorView('screen'); }} className={`p-2 rounded-md cursor-pointer flex justify-between items-center group ${selectedScreenId === screen.id ? 'bg-amber-100' : 'hover:bg-gray-100'}`}>
                                    <span className="font-medium text-sm">{screen.title}</span>
                                    <button onClick={(e) => { e.stopPropagation(); deleteScreen(screen.id); }} className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                    {selectedScreen && (
                        <div className="py-4 flex-grow flex flex-col">
                             <h2 className="font-bold text-gray-800 mb-2">Componentes em "{selectedScreen.title}"</h2>
                            <div className="space-y-1 mb-4 overflow-y-auto">
                               {selectedScreen.layout.children.map(comp => (
                                   <div key={comp.id} onClick={() => handleSelectComponent(comp.id)} className={`p-2 rounded-md cursor-pointer flex justify-between items-center group ${selectedComponentId === comp.id ? 'bg-blue-100' : 'hover:bg-gray-100'}`}>
                                       <span className="font-medium text-sm">{comp.label || comp.text || comp.name || comp.type}</span>
                                   </div>
                               ))}
                            </div>
                            <div className="mt-auto pt-4 border-t">
                                <ComponentToolbox onAddComponent={addComponent} />
                            </div>
                        </div>
                    )}
                </aside>

                <main className="lg:col-span-5 bg-white p-6 rounded-lg border shadow-sm overflow-y-auto">
                    <div className="flex items-center border-b mb-4">
                        { selectedComponent && (
                            <button onClick={() => setInspectorView('component')} className={`px-4 py-2 font-semibold ${inspectorView === 'component' ? 'border-b-2 border-amber-500 text-amber-600' : 'text-gray-500'}`}>Componente</button>
                        )}
                        <button onClick={() => setInspectorView('screen')} className={`px-4 py-2 font-semibold ${inspectorView === 'screen' ? 'border-b-2 border-amber-500 text-amber-600' : 'text-gray-500'}`}>Tela</button>
                        <button onClick={() => setInspectorView('flow')} className={`px-4 py-2 font-semibold ${inspectorView === 'flow' ? 'border-b-2 border-amber-500 text-amber-600' : 'text-gray-500'}`}>Flow</button>
                    </div>

                    {inspectorView === 'component' && selectedComponent ? (
                        <ComponentInspector component={selectedComponent} onChange={updateComponentProp} onDelete={deleteComponent} screens={flow.screens}/>
                    ) : inspectorView === 'screen' && selectedScreen ? (
                        <div>
                            <h2 className="font-bold text-lg mb-4">Propriedades da Tela "{selectedScreen.title}"</h2>
                             <div className="space-y-4">
                                <InspectorField label="Título da Tela"><input type="text" value={selectedScreen.title} onChange={e => updateFlowState(p => ({...p, screens: p.screens.map(s => s.id === selectedScreenId ? {...s, title: e.target.value} : s)}))} className={formFieldClasses}/></InspectorField>
                                <InspectorField label="ID da Tela (API)"><input type="text" value={selectedScreen.screen_id} onChange={e => updateFlowState(p => ({...p, screens: p.screens.map(s => s.id === selectedScreenId ? {...s, screen_id: e.target.value.toUpperCase().replace(/ /g, '_')} : s)}))} className={`${formFieldClasses} font-mono`} placeholder="WELCOME_SCREEN"/></InspectorField>
                                <InspectorField label="É uma tela terminal?"><input type="checkbox" checked={!!selectedScreen.terminal} onChange={e => updateFlowState(p => ({...p, screens: p.screens.map(s => s.id === selectedScreenId ? {...s, terminal: e.target.checked} : s)}))} className="h-5 w-5 rounded text-amber-600 focus:ring-amber-500" /></InspectorField>
                            </div>
                        </div>
                    ) : inspectorView === 'flow' ? (
                        <div>
                             <h2 className="font-bold text-lg mb-4">Configurações do Flow</h2>
                             <div className="space-y-4">
                                <InspectorField label="Nome do Flow"><input type="text" value={flow.name} onChange={e => updateFlowState(p => ({...p, name: e.target.value}))} className={formFieldClasses}/></InspectorField>
                                <InspectorField label="Endpoint URI (Opcional)" helpText="URL do seu backend para flows dinâmicos."><input type="url" value={flow.endpointUri || ''} onChange={e => updateFlowState(p => ({...p, endpointUri: e.target.value}))} className={formFieldClasses} placeholder="https://seu-backend.com/api/flow" /></InspectorField>
                             </div>
                        </div>
                    ) : (
                        <p>Selecione uma tela ou componente para editar.</p>
                    )}
                </main>

                <aside className="lg:col-span-4">
                    <FlowPreview screen={selectedScreen} flowName={flow.name} />
                </aside>
            </div>
        </div>
    );
}