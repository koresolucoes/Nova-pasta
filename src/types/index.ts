// Enums
export enum CampaignStatus {
  CONCLUIDA = 'Concluída',
  ENVIANDO = 'Enviando',
  AGENDADA = 'Agendada',
  FALHA = 'Falha',
  RASCUNHO = 'Rascunho',
  PAUSADA = 'Pausada'
}

export enum AutomationStatus {
  ACTIVE = 'Ativa',
  INACTIVE = 'Inativa',
  DRAFT = 'Rascunho',
  PAUSED = 'Pausada',
  ERROR = 'Erro'
}

// Interfaces de Dados

export interface CampaignTarget {
  type: 'all' | 'tag';
  value: string | null;
}

export interface CampaignLog {
  timestamp: string;
  message: string;
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
  id: number | string;
  name: string;
  phone: string;
  tags: string[];
  lastInteraction: string;
  is24hWindowOpen: boolean;
  isOptedOutOfAutomations?: boolean;
  crmStageId?: string;
}

export interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: string | Date;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
}

// Tipos básicos de automação que podem ser usados em outros lugares
export interface AutomationNode {
  id: string;
  type: 'trigger' | 'action';
  subType: string; // Será mais específico em automation.ts
  position: { x: number; y: number };
  data: Record<string, any>; // Será mais específico em automation.ts
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

export interface StatCardData {
  title: string;
  value: string | number;
  subValue?: string;
  change?: string;
  changeType?: 'increase' | 'decrease';
  icon?: React.ReactNode;
}

export interface AnalyticsDataPoint {
  date: string;
  value: number;
  label: string;
}
