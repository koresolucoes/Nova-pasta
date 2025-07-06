


import type { Campaign, Contact, WhatsAppFlow, FlowScreen, Conversation, Automation } from './types';
import { CampaignStatus, FlowStatus, AutomationStatus } from './types';

// ----- Initial Campaigns Data -----
export const initialCampaigns: Campaign[] = [
  {
    id: 1,
    name: 'Lançamento Produto X',
    status: CampaignStatus.CONCLUIDA,
    sentCount: 12540,
    failedCount: 0,
    totalCount: 12540,
    readRate: 92.5,
    sentDate: '2024-05-10',
    templateId: '',
    target: { type: 'all', value: null },
    logs: [],
  },
  {
    id: 2,
    name: 'Promoção Dia das Mães',
    status: CampaignStatus.ENVIANDO,
    sentCount: 4500,
    failedCount: 0,
    totalCount: 15000,
    readRate: 0,
    sentDate: '2024-05-28',
    templateId: '',
    target: { type: 'all', value: null },
    logs: [],
  },
  {
    id: 3,
    name: 'Newsletter Semanal',
    status: CampaignStatus.AGENDADA,
    sentCount: 0,
    failedCount: 0,
    totalCount: 25000,
    readRate: 0,
    sentDate: '2024-06-05',
    templateId: '',
    target: { type: 'all', value: null },
    logs: [],
  },
   {
    id: 4,
    name: 'Update de Sistema',
    status: CampaignStatus.FALHA,
    sentCount: 100,
    failedCount: 0,
    totalCount: 5000,
    readRate: 0,
    sentDate: '2024-05-15',
    templateId: '',
    target: { type: 'all', value: null },
    logs: [],
  },
   {
    id: 5,
    name: 'Boas-vindas Novos Usuários',
    status: CampaignStatus.RASCUNHO,
    sentCount: 0,
    failedCount: 0,
    totalCount: 0,
    readRate: 0,
    sentDate: 'N/A',
    templateId: '',
    target: { type: 'all', value: null },
    logs: [],
  },
];

// ----- Initial Contacts Data -----
export const initialContacts: Contact[] = [
  {
    id: 1,
    name: 'Ana Silva',
    phone: '+55 11 98765-4321',
    tags: ['cliente-vip', 'sp'],
    lastInteraction: '2024-05-20',
    is24hWindowOpen: true,
  },
  {
    id: 2,
    name: 'Bruno Costa',
    phone: '+55 21 99887-6543',
    tags: ['desenvolvedor', 'rj'],
    lastInteraction: '2024-05-22',
    is24hWindowOpen: false,
  },
  {
    id: 3,
    name: 'Carla Dias',
    phone: '+55 31 98877-1234',
    tags: ['lead', 'mg'],
    lastInteraction: '2024-05-27',
    is24hWindowOpen: true,
  },
   {
    id: 4,
    name: 'Daniel Rocha',
    phone: '+55 81 99999-0000',
    tags: ['lead'],
    lastInteraction: '2024-05-28',
    is24hWindowOpen: true,
  },
  {
    id: 5,
    name: 'Eduardo Martins',
    phone: '+55 71 98765-1111',
    tags: ['parceiro'],
    lastInteraction: '2024-04-10',
    is24hWindowOpen: false,
  },
];


const welcomeScreen: FlowScreen = {
    id: 's1',
    screen_id: 'WELCOME',
    title: 'Tela de Boas-Vindas',
    layout: {
        type: 'SingleColumnLayout',
        children: [
            { id: 'c1', type: 'TextHeading', text: 'Bem-vindo(a) à nossa Loja! 🛍️' },
            { id: 'c2', type: 'TextBody', text: 'Olá {{nome_do_cliente}}! É um prazer ter você aqui. Como podemos ajudar?' },
            { id: 'c3', type: 'Button', label: 'Ver Produtos', 'on-click-action': { type: 'Navigate', targetScreenId: 'PRODUCT_CATEGORIES' } },
        ]
    }
};

const categoriesScreen: FlowScreen = {
    id: 's2',
    screen_id: 'PRODUCT_CATEGORIES',
    title: 'Categorias de Produtos',
    layout: {
        type: 'SingleColumnLayout',
        children: [
            { id: 'c5', type: 'TextSubheading', text: 'Selecione uma categoria:' },
            { 
                id: 'c6', 
                type: 'Dropdown',
                name: 'categoria_selecionada',
                label: 'Categorias',
                'data-source': [
                    { id: 'electronics', title: 'Eletrônicos' },
                    { id: 'clothing', title: 'Vestuário' },
                    { id: 'home', title: 'Casa e Cozinha' },
                ]
            },
            { id: 'c7', type: 'Footer', label: 'Continuar', 'on-click-action': { type: 'DataExchange' } }
        ]
    }
};


// ----- Initial Flows Data -----
export const initialFlows: WhatsAppFlow[] = [
    {
        id: "flow_12345",
        name: 'Boas-vindas e Categorias (Exemplo)',
        status: FlowStatus.DRAFT,
        origin: 'local',
        version: "7.1",
        data_api_version: "3.0",
        routing_model: { "WELCOME": ["PRODUCT_CATEGORIES"] }, // Corrected key
        screens: [welcomeScreen, categoriesScreen]
    },
    {
        id: "flow_67890",
        name: 'Agendamento de Consulta (Rascunho)',
        status: FlowStatus.DRAFT,
        origin: 'local',
        version: "7.1",
        data_api_version: "3.0",
        routing_model: {},
        screens: []
    }
];

// ----- Initial Chat Data -----
export const initialConversations: Conversation[] = [
  {
    contactId: 1, // Ana Silva
    unreadCount: 2,
    messages: [
      { id: 'msg1', text: 'Olá! Tenho interesse no Produto X. Pode me dar mais detalhes?', sender: 'contact', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), status: 'read' },
      { id: 'msg2', text: 'Claro, Ana! O Produto X é ótimo para [benefício]. Ele custa R$ 199,90 e estamos com frete grátis esta semana. ✨', sender: 'me', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), status: 'read' },
      { id: 'msg3', text: 'Que ótimo! E quais são as formas de pagamento?', sender: 'contact', timestamp: new Date(Date.now() - 1 * 60 * 1000).toISOString(), status: 'read' },
      { id: 'msg4', text: 'Aceitamos cartão de crédito, PIX e boleto.', sender: 'contact', timestamp: new Date(Date.now() - 30 * 1000).toISOString(), status: 'delivered' },
    ],
  },
  {
    contactId: 3, // Carla Dias
    unreadCount: 0,
    messages: [
      { id: 'msg5', text: 'Oi, recebi a proposta. Vou analisar e retorno em breve.', sender: 'contact', timestamp: new Date('2024-05-27T14:30:00Z').toISOString(), status: 'read' },
      { id: 'msg6', text: 'Combinado, Carla! Se tiver qualquer dúvida, é só chamar. 😊', sender: 'me', timestamp: new Date('2024-05-27T14:32:00Z').toISOString(), status: 'read' },
    ],
  },
  {
    contactId: 4, // Daniel Rocha
    unreadCount: 1,
    messages: [
       { id: 'msg7', text: 'Bom dia, gostaria de agendar uma demonstração.', sender: 'contact', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), status: 'delivered' },
    ]
  }
];

// ----- Initial Automations Data -----
export const initialAutomations: Automation[] = [
    {
        id: 'automation_1',
        name: 'Boas-vindas para Novos Contatos',
        status: AutomationStatus.ACTIVE,
        createdAt: new Date('2024-05-20T10:00:00Z').toISOString(),
        allowReactivation: true,
        blockOnOpenChat: false,
        nodes: [
            {
                id: 'trigger_1',
                type: 'trigger',
                subType: 'contact_created',
                position: { x: 150, y: 50 },
                data: { type: 'contact_created' },
            },
            {
                id: 'action_1',
                type: 'action',
                subType: 'wait',
                position: { x: 150, y: 200 },
                data: { type: 'wait', delay: 5, unit: 'minutes' },
            },
            {
                id: 'action_2',
                type: 'action',
                subType: 'send_message',
                position: { x: 150, y: 350 },
                data: { type: 'send_message', subType: 'template', templateId: 'sample_template_1' }, // Updated
            },
        ],
        edges: [
            { id: 'edge_1', source: 'trigger_1', target: 'action_1', sourceHandle: null },
            { id: 'edge_2', source: 'action_1', target: 'action_2', sourceHandle: null },
        ],
    },
     {
        id: 'automation_2',
        name: 'Recuperação de Carrinho Abandonado',
        status: AutomationStatus.PAUSED,
        createdAt: new Date('2024-05-15T15:30:00Z').toISOString(),
        allowReactivation: false,
        blockOnOpenChat: true,
        nodes: [
             {
                id: 'trigger_2_1',
                type: 'trigger',
                subType: 'tag_added',
                position: { x: 150, y: 50 },
                data: { type: 'tag_added', value: 'carrinho-abandonado' },
            },
        ],
        edges: [],
    },
];