// Enums
export enum AutomationStatus {
  ACTIVE = 'Ativa',
  INACTIVE = 'Inativa',
  DRAFT = 'Rascunho',
  PAUSED = 'Pausada',
  ERROR = 'Erro'
}

// Tipos básicos de automação
export interface AutomationNode {
  id: string;
  type: 'trigger' | 'action';
  subType: AutomationTriggerType | AutomationActionType;
  position: { x: number; y: number };
  data: AutomationData;
}

export interface AutomationEdge {
  id: string;
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
  createdAt: string;
  allowReactivation: boolean;
  blockOnOpenChat: boolean;
  executionStats?: { [nodeId: string]: { total: number; success: number; error: number } };
  isActive?: boolean;
}

// Tipos de Trigger
export type AutomationTriggerType = 
  | 'contact_created' 
  | 'tag_added' 
  | 'crm_stage_changed' 
  | 'context_message' 
  | 'webhook';

// Tipos de Action
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

// Payloads de Dados

export interface TriggerContactCreatedData {
  type: 'contact_created';
}

export interface TriggerTagAddedData {
  type: 'tag_added';
  value?: string;
}

export interface TriggerCrmStageChangedData {
  type: 'crm_stage_changed';
  crmBoardId?: string;
  crmStageId?: string;
}

export interface TriggerContextMessageData {
  type: 'context_message';
  match?: 'any' | 'exact' | 'contains';
  value?: string;
}

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

// Tipos de Ação
export interface ActionSendMessageData {
  type: 'send_message';
  subType: 'text' | 'flow' | 'template';
  text?: string;
  flowId?: string;
  templateId?: string;
  variables?: Record<string, string>;
}

export interface ActionWaitData {
  type: 'wait';
  delay?: number;
  unit?: 'minutes' | 'hours' | 'days';
}

export interface ActionAddTagData {
  type: 'add_tag';
  tagName?: string;
}

export interface ActionRemoveTagData {
  type: 'remove_tag';
  tagName?: string;
}

export interface ActionMoveCrmStageData {
  type: 'move_crm_stage';
  crmBoardId?: string;
  crmStageId?: string;
}

export interface ActionConditionalData {
  type: 'conditional';
  logic: 'and' | 'or';
  conditions: any[]; // Simplificado para o exemplo
}

export interface ActionHttpRequestData {
  type: 'http_request';
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Array<{ id: string; key: string; value: string }>;
  body?: string;
  responseMapping?: Array<{ id: string; jsonPath: string; contactField: string }>;
}

export interface ActionOptOutData {
  type: 'opt_out';
}

export interface ActionRandomizerData {
  type: 'randomizer';
  branches?: number;
}

export interface ActionForwardAutomationData {
  type: 'forward_automation';
  automationId?: string;
}

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

export interface AutomationWithStats extends Omit<Automation, 'executionStats'> {
  executionStats: {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    lastRun?: Date;
    nodeStats: { [nodeId: string]: { total: number; success: number; error: number } };
  };
  isActive: boolean;
}

export type AutomationState = AutomationWithStats | null;
