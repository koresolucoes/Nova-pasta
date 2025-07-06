


export enum CampaignStatus {
  CONCLUIDA = 'Concluída',
  ENVIANDO = 'Enviando',
  AGENDADA = 'Agendada',
  FALHA = 'Falha',
  RASCUNHO = 'Rascunho',
  PAUSADA = 'Pausada'
}

export type CampaignTarget = {
    type: 'all' | 'tag';
    value: string | null; // tag name if type is 'tag'
}

export type CampaignLog = {
    timestamp: string; // ISO string
    message: string;
    type: 'info' | 'error' | 'success';
}

export interface Campaign {
  id: number;
  name: string;
  status: CampaignStatus;
  sentCount: number;
  failedCount: number;
  totalCount: number;
  readRate: number;
  sentDate: string;
  templateId: string;
  target: CampaignTarget;
  logs: CampaignLog[];
}

export interface Contact {
  id: number;
  name: string;
  phone: string;
  tags: string[];
  lastInteraction: string;
  is24hWindowOpen: boolean;
  isOptedOutOfAutomations?: boolean;
  crmStageId?: string;
  // Permitir campos customizados
  [key: string]: any;
}

// --- Tipos para Modelos de Mensagem (Templates) ---

export type TemplateStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'DELETED' | 'DRAFT';
export type TemplateCategory = 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
export type HeaderFormat = 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
export type ButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';

export interface QuickReplyButton {
  type: 'QUICK_REPLY';
  text: string;
}

export interface UrlButton {
  type: 'URL';
  text: string;
  url: string; // The API wants a static URL here
  example?: string[]; // Example: ["https://www.website.com/dynamic-path"]
}

export interface PhoneNumberButton {
  type: 'PHONE_NUMBER';
  text: string;
  phone_number: string;
}

export type Button = QuickReplyButton | UrlButton | PhoneNumberButton;

// --- Template Components ---

interface BaseComponent {
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
}

export interface HeaderComponent extends BaseComponent {
    type: 'HEADER';
    format: HeaderFormat;
    text?: string; // for TEXT format
    example?: {
        header_handle?: [string]; // for IMAGE/VIDEO/DOCUMENT
        header_text?: string[]; // for TEXT with one variable
    };
}

export interface BodyComponent extends BaseComponent {
    type: 'BODY';
    text: string;
    example?: {
        body_text?: string[][]; // Example: [["John Doe", "Monday"]]
    };
}

export interface FooterComponent extends BaseComponent {
    type: 'FOOTER';
    text: string;
}

export interface ButtonsComponent extends BaseComponent {
    type: 'BUTTONS';
    buttons: Button[];
}

export type TemplateComponent = HeaderComponent | BodyComponent | FooterComponent | ButtonsComponent;


export interface MessageTemplate {
  id: string; // Local UUID for drafts, Meta's ID for synced
  metaId?: string; // Always Meta's ID if it exists
  name: string;
  category: TemplateCategory;
  language: string;
  status: TemplateStatus;
  components: TemplateComponent[];
  rejectionReason?: string;
}

// --- Fim dos Tipos de Modelos de Mensagem ---

export interface StatCardData {
  title: string;
  value: string;
  subValue?: string;
  change: string;
  changeType: 'increase' | 'decrease';
  icon: React.ReactNode;
}

export interface CrmStage {
  id: string;
  title: string;
  cards: Contact[];
  tagsToApply?: string[];
}

export interface CrmBoard {
  id: string;
  name: string;
  columns: Omit<CrmStage, 'cards'>[];
}

export interface SheetContact {
  name: string;
  phone: string;
  [key: string]: string;
}

export interface AnalyticsDataPoint {
  sent_count: number;
  delivered_count: number;
  read_count: number;
  start: string; // ISO Date string
}

export interface ChatMessage {
  id: string;
  text: string;
  timestamp: string; // ISO string
  sender: 'me' | 'contact';
  status: 'sent' | 'delivered' | 'read' | 'failed';
}

export interface Conversation {
  contactId: number;
  messages: ChatMessage[];
  unreadCount: number;
}


// --- Tipos para o Novo Construtor de Flows ---

export enum FlowStatus {
  DRAFT = 'Rascunho',
  PUBLISHED = 'Publicado',
  DEPRECATED = 'Obsoleto',
  BLOCKED = 'Bloqueado',
  THROTTLED = 'Limitado',
}

export type FlowComponentType =
    // Text
    | 'TextHeading'
    | 'TextSubheading'
    | 'TextBody'
    | 'TextCaption'
    | 'RichText'
    // Input
    | 'TextInput'
    | 'TextArea'
    | 'CheckboxGroup'
    | 'RadioButtonsGroup'
    | 'Dropdown'
    | 'DatePicker'
    | 'CalendarPicker'
    | 'OptIn'
    | 'ChipsSelector'
    // Media
    | 'Image'
    | 'PhotoPicker'
    | 'DocumentPicker'
    | 'ImageCarousel'
    // Action
    | 'Footer'
    | 'EmbeddedLink'
    | 'Button'
    // Layout
    | 'If'
    | 'Switch'
    | 'NavigationList';

export type FlowActionType = 'Navigate' | 'DataExchange' | 'Complete' | 'open_url' | 'update_data';

export interface FlowAction {
    type: FlowActionType;
    // For 'Navigate'
    targetScreenId?: string;
    payload?: Record<string, any>; // For passing data in navigation
    // For 'DataExchange' or 'update_data'
    data?: Record<string, any>;
    // For 'DataExchange'
    success_callback?: FlowAction;
    error_callback?: FlowAction;
    // For 'Complete'
    success?: boolean;
    // For 'open_url'
    url?: string;
}

export interface FlowDataSourceItem {
    id: string; // The value sent to the server
    title: string; // The text displayed to the user
    description?: string;
    enabled?: boolean;
    image?: string; // base64 for images
    'alt-text'?: string;
    'on-select-action'?: FlowAction;
    'on-unselect-action'?: FlowAction;
}

export interface CarouselImage {
    id: string; // Internal React ID
    src: string; // base64
    'alt-text': string;
}


export interface FlowComponent {
    id: string; // Internal React ID
    type: FlowComponentType;
    
    // --- Common properties ---
    name?: string; // Variable name for inputs
    visible?: string | boolean; // Conditional visibility, e.g., "${form.checkbox_1.value}" or boolean
    
    // --- Action properties ---
    'on-click-action'?: FlowAction; // For Footer, EmbeddedLink, OptIn
    'on-select-action'?: FlowAction; // For choice components
    'on-unselect-action'?: FlowAction; // For choice components
    
    // --- Text components ---
    text?: string | string[]; // For Text*, RichText
    'font-weight'?: 'bold' | 'italic' | 'bold_italic' | 'normal'; // For TextBody, TextCaption
    strikethrough?: boolean; // For TextBody, TextCaption
    markdown?: boolean; // For TextBody, TextCaption

    // --- Input components ---
    label?: string; // For inputs and some action components
    'label-variant'?: 'large'; // For TextInput, TextArea
    required?: boolean;
    enabled?: boolean | string;
    'helper-text'?: string;
    'error-message'?: string;
    'init-value'?: any; // string | boolean | string[]
    description?: string; // For CheckboxGroup, RadioButtonsGroup, ChipsSelector
    
    // --- TextInput specific ---
    'input-type'?: 'text' | 'number' | 'email' | 'password' | 'passcode' | 'phone';
    pattern?: string;
    'min-chars'?: number;
    'max-chars'?: number;
    
    // --- TextArea specific ---
    'max-length'?: number;
    
    // --- Choice components (CheckboxGroup, RadioButtonsGroup, Dropdown, ChipsSelector) ---
    'data-source'?: FlowDataSourceItem[];
    'min-selected-items'?: number;
    'max-selected-items'?: number;
    'media-size'?: 'regular' | 'large';

    // --- Footer specific ---
    'left-caption'?: string;
    'center-caption'?: string;
    'right-caption'?: string;

    // --- DatePicker specific ---
    'min-date'?: string; // "YYYY-MM-DD"
    'max-date'?: string;
    'unavailable-dates'?: string[];

    // --- CalendarPicker specific ---
    mode?: 'single' | 'range';
    title?: string; // For range mode
    'include-days'?: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun')[];
    'min-days'?: number;
    'max-days'?: number;
    
    // --- Image specific ---
    src?: string; // base64
    'alt-text'?: string;
    width?: number;
    height?: number;
    'scale-type'?: 'cover' | 'contain';
    'aspect-ratio'?: number | string;

    // --- ImageCarousel specific ---
    images?: CarouselImage[];

    // --- Media Upload ---
    'photo-source'?: 'camera_gallery' | 'camera' | 'gallery';
    'max-file-size-kb'?: number;
    'min-uploaded-photos'?: number;
    'max-uploaded-photos'?: number;
    'allowed-mime-types'?: string[];
    'min-uploaded-documents'?: number;
    'max-uploaded-documents'?: number;

    // --- Conditional Rendering ---
    condition?: string; // for If
    then?: FlowComponent[];
    'else'?: FlowComponent[];
    value?: string; // for Switch
    cases?: Record<string, FlowComponent[]>; // for Switch
    
    // NavigationList
    'list-items'?: any[]; // Simplified for now
}


export interface FlowLayout {
    type: 'SingleColumnLayout';
    children: FlowComponent[];
}

export interface FlowScreen {
    id: string; // Internal React ID
    screen_id: string; // User-defined screen ID for navigation
    title: string; // User-friendly title for the editor
    terminal?: boolean;
    success?: boolean;
    refresh_on_back?: boolean;
    data?: Record<string, any>;
    layout: FlowLayout;
    sensitive?: string[];
}

export interface WhatsAppFlow {
  id: string; // Internal UUID
  metaFlowId?: string; // ID from Meta API after publishing
  name: string;
  endpointUri?: string; // Flow-level endpoint URI, as per API docs
  status: FlowStatus;
  origin: 'meta' | 'local'; // Where the flow information comes from
  version: string; // Meta API version
  data_api_version: string;
  routing_model: Record<string, string[]>;
  screens: FlowScreen[];
}

// --- Automações ---

export enum AutomationStatus {
  ACTIVE = 'Ativa',
  PAUSED = 'Pausada',
  DRAFT = 'Rascunho',
}

export type AutomationTriggerType = 'contact_created' | 'tag_added' | 'crm_stage_changed' | 'context_message' | 'webhook';

export type AutomationActionType = 
    | 'send_message' 
    | 'wait'
    | 'add_tag'
    | 'remove_tag'
    | 'move_crm_stage'
    | 'conditional'
    | 'http_request'
    | 'opt_out'
    | 'randomizer'
    | 'forward_automation';

// --- Automation Data Payloads ---

export interface TriggerContactCreatedData { type: 'contact_created'; }
export interface TriggerTagAddedData { type: 'tag_added'; value?: string; }
export interface TriggerCrmStageChangedData { type: 'crm_stage_changed'; crmBoardId?: string; crmStageId?: string; }
export interface TriggerContextMessageData { type: 'context_message'; match?: 'any' | 'exact' | 'contains'; value?: string; }
export interface TriggerWebhookData { 
    type: 'webhook'; 
    webhookId: string; 
    isListening?: boolean; 
    lastSample?: any; 
}


export type AutomationTriggerData = 
    | TriggerContactCreatedData
    | TriggerTagAddedData
    | TriggerCrmStageChangedData
    | TriggerContextMessageData
    | TriggerWebhookData;


// --- Tipos de Ação Detalhados ---

export interface ActionSendMessageData { 
    type: 'send_message';
    subType: 'text' | 'flow' | 'template';
    text?: string;
    flowId?: string;
    templateId?: string;
    variables?: Record<string, string>;
}
export interface ActionWaitData { type: 'wait'; delay?: number; unit?: 'minutes' | 'hours' | 'days'; }
export interface ActionAddTagData { type: 'add_tag'; tagName?: string; }
export interface ActionRemoveTagData { type: 'remove_tag'; tagName?: string; }
export interface ActionMoveCrmStageData { type: 'move_crm_stage'; crmBoardId?: string; crmStageId?: string; }

// --- Tipos de Ação Condicional ---
export type ConditionSource = 'contact_tag' | 'contact_field' | 'conversation_window' | 'business_hours';
export type TagOperator = 'contains' | 'not_contains';
export type FieldOperator = 'is' | 'is_not' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'is_empty' | 'is_not_empty';
export type WindowOperator = 'is_open' | 'is_closed';
export type BusinessHoursOperator = 'is_within' | 'is_outside';

export interface BaseCondition { id: string; }
export interface TagCondition extends BaseCondition { source: 'contact_tag'; operator: TagOperator; value: string; }
export interface FieldCondition extends BaseCondition { source: 'contact_field'; field: string; operator: FieldOperator; value: string; }
export interface WindowCondition extends BaseCondition { source: 'conversation_window'; operator: WindowOperator; }
export interface BusinessHoursCondition extends BaseCondition {
    source: 'business_hours';
    operator: BusinessHoursOperator;
    days: ('sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat')[];
    startTime: string; // "HH:mm"
    endTime: string; // "HH:mm"
}
export type Condition = TagCondition | FieldCondition | WindowCondition | BusinessHoursCondition;
export interface ActionConditionalData { type: 'conditional'; logic: 'and' | 'or'; conditions: Condition[]; }

// --- Fim dos Tipos de Ação Condicional ---

export interface HttpHeader { id: string; key: string; value: string; }
export interface HttpResponseMapping { id: string; jsonPath: string; contactField: string; }
export interface ActionHttpRequestData {
    type: 'http_request';
    url?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: HttpHeader[];
    body?: string; // JSON string
    responseMapping?: HttpResponseMapping[];
}

export interface ActionOptOutData { type: 'opt_out'; }
export interface ActionRandomizerData { type: 'randomizer'; branches?: number; }
export interface ActionForwardAutomationData { type: 'forward_automation'; automationId?: string; }


export type AutomationActionData =
    | ActionSendMessageData
    | ActionWaitData
    | ActionAddTagData
    | ActionRemoveTagData
    | ActionMoveCrmStageData
    | ActionConditionalData
    | ActionHttpRequestData
    | ActionOptOutData
    | ActionRandomizerData
    | ActionForwardAutomationData;

export type AutomationData = AutomationTriggerData | AutomationActionData;


// --- Estruturas Principais da Automação ---

export interface AutomationNode {
    id: string;
    type: 'trigger' | 'action';
    subType: AutomationTriggerType | AutomationActionType;
    position: { x: number, y: number };
    data: AutomationData;
}

export interface AutomationEdge {
    id:string;
    source: string;
    target: string;
    sourceHandle?: string | null;
}

export interface Automation {
    id: string;
    name: string;
    status: AutomationStatus;
    nodes: AutomationNode[];
    edges: AutomationEdge[];
    createdAt: string; // ISO Date String
    allowReactivation: boolean;
    blockOnOpenChat: boolean;
    executionStats?: { [nodeId: string]: { total: number; success: number; error: number } };
}