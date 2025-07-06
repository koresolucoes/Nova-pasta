# WA Hub - Marketing e Campanhas

Esta é uma plataforma completa para gerenciar todos os aspectos do marketing e comunicação via WhatsApp Business API (Meta). Ela permite o gerenciamento de campanhas, contatos, modelos de mensagem, fluxos interativos (WhatsApp Flows) e automações complexas.

## Funcionalidades

- **Dashboard:** Visão geral com métricas de envio e leitura de mensagens.
- **Disparo de Mensagens:** Envie mensagens baseadas em templates para contatos individuais, segmentos (tags) ou a partir de uma Planilha Google.
- **Chat:** Converse em tempo real com seus contatos dentro da janela de 24 horas.
- **Campanhas:** Crie, gerencie e acompanhe o progresso de disparos em massa.
- **Contatos:** Importe (via CSV) e gerencie sua base de contatos com tags e campos personalizados.
- **CRM:** Organize seus contatos em um funil de vendas visual (Kanban).
- **Flows:** Crie experiências interativas e ricas com o construtor de WhatsApp Flows.
- **Automações:** Desenhe fluxos de trabalho automatizados com um construtor visual para engajar contatos com base em gatilhos (ex: tag adicionada, mensagem recebida, etc.).
- **Modelos:** Crie e envie modelos de mensagem (HSM) para aprovação da Meta.
- **Configurações:** Gerencie múltiplas conexões com a API da Meta.

## Stack Tecnológica

- **Frontend:** React, TypeScript, Tailwind CSS, React Flow
- **Backend:** Vercel Serverless Functions (Node.js)
- **Banco de Dados:** Supabase (PostgreSQL)
- **IA:** Google Gemini API para otimização de texto

---

## Configuração e Implantação na Vercel

Este projeto é otimizado para implantação na Vercel.

### 1. Fork e Clone o Repositório

Faça um fork deste repositório para sua conta do GitHub e clone-o para sua máquina local.

### 2. Crie um Projeto na Vercel

- Conecte-se à sua conta Vercel.
- Crie um novo projeto e importe o repositório que você forçou no passo anterior.
- A Vercel detectará automaticamente que é um projeto React e configurará o build.

### 3. Configure as Variáveis de Ambiente

Esta é a etapa mais importante. No painel do seu projeto na Vercel, vá para **Settings > Environment Variables** e adicione as seguintes variáveis:

| Variável                 | Descrição                                                                                                  | Exemplo                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `API_KEY`                | Sua chave de API do **Google AI Studio** para usar as funcionalidades do Gemini.                               | `AIzaSy...`                                                            |
| `SUPABASE_URL`           | A URL do seu projeto Supabase. Encontre em **Project Settings > API > Project URL**.                        | `https://xyz.supabase.co`                                              |
| `SUPABASE_ANON_KEY`      | A chave anônima (public) do seu projeto Supabase. Encontre em **Project Settings > API > Project API Keys**. | `eyJhbGciOiJIUzI1Ni...`                                                 |
| `META_VERIFY_TOKEN`      | Uma string secreta de sua escolha para verificar o webhook da Meta. Deve ser a mesma informada na Meta.      | `MEU_TOKEN_SECRETO_123`                                                |
| `CRON_SECRET`            | Uma string secreta de sua escolha para proteger o endpoint do cron job contra acesso não autorizado.         | `UM_SEGREDO_PARA_O_CRON`                                               |

### 4. Implante

Após configurar as variáveis, acione um novo deploy na Vercel (geralmente na aba **Deployments**).

### 5. Configure o Webhook da Meta

- Após o deploy, a Vercel fornecerá uma URL para sua aplicação (ex: `https://seu-app.vercel.app`).
- No painel de desenvolvedores da Meta, na configuração do seu aplicativo do WhatsApp, vá para a seção de Webhooks.
- Configure o webhook de `messages` para apontar para `https://seu-app.vercel.app/api/webhook`.
- No campo "Verify Token", insira o mesmo valor que você colocou na variável de ambiente `META_VERIFY_TOKEN`.

Sua aplicação agora está pronta e funcional!
