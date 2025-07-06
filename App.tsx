
import React from 'react';
import { HashRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardPage from './pages/DashboardPage';
import CampaignsPage from './pages/CampaignsPage';
import ContactsPage from './pages/ContactsPage';
import TemplatesPage from './pages/TemplatesPage';
import SettingsPage from './pages/SettingsPage';
import SendMessagePage from './pages/SendMessagePage';
import CRMPage from './pages/CRMPage';
import FlowsPage from './pages/FlowsPage';
import FlowBuilderPage from './pages/FlowBuilderPage';
import ChatPage from './pages/ChatPage';
import AutomationsPage from './pages/AutomationsPage';
import AutomationBuilderPage from './pages/AutomationBuilderPage';
import TemplateBuilderPage from './pages/TemplateBuilderPage';
import { addFlow } from './services/flowService';
import { addTemplate } from './services/templateService';

const MainLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-screen bg-gray-50">
    <Sidebar />
    <div className="flex-1 flex flex-col overflow-hidden lg:pl-64">
      <Header />
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6 md:p-8">
        {children}
      </main>
    </div>
  </div>
);

// This component handles the redirection for a new flow.
const NewFlowRedirector: React.FC = () => {
    const navigate = useNavigate();
    React.useEffect(() => {
        const createAndRedirect = async () => {
            try {
                const newFlow = await addFlow(); // addFlow is now async
                navigate(`/flows/${newFlow.id}`, { replace: true });
            } catch (error) {
                console.error("Failed to create new flow:", error);
                alert(`Não foi possível criar o novo flow: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
                navigate('/flows', { replace: true }); // Redirect back to the list on failure
            }
        };
        createAndRedirect();
    }, [navigate]);
    return <div className="h-screen w-screen flex items-center justify-center">Criando novo flow...</div>;
};

const NewTemplateRedirector: React.FC = () => {
    const navigate = useNavigate();
    React.useEffect(() => {
        const createAndRedirect = async () => {
            try {
                const newTemplate = await addTemplate();
                navigate(`/modelos/${newTemplate.id}`, { replace: true });
            } catch (error) {
                console.error("Failed to create new template:", error);
                alert(`Não foi possível criar o novo modelo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
                navigate('/modelos', { replace: true });
            }
        };
        createAndRedirect();
    }, [navigate]);
    return <div className="h-screen w-screen flex items-center justify-center">Criando novo modelo...</div>;
};


function App(): React.ReactNode {
  return (
    <HashRouter>
      <Routes>
        {/* Full-screen builder pages */}
        <Route path="/flows/new" element={<NewFlowRedirector />} />
        <Route path="/flows/:flowId" element={<FlowBuilderPage />} />
        <Route path="/automacoes/:automationId" element={<AutomationBuilderPage />} />
        <Route path="/modelos/new" element={<NewTemplateRedirector />} />
        <Route path="/modelos/:templateId" element={<TemplateBuilderPage />} />

        {/* The Chat Page has its own custom layout handled internally */}
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/chat/:contactId" element={<ChatPage />} />
        
        {/* Main routes with the standard layout */}
        <Route path="/*" element={
          <MainLayout>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/disparar" element={<SendMessagePage />} />
              <Route path="/campanhas" element={<CampaignsPage />} />
              <Route path="/contatos" element={<ContactsPage />} />
              <Route path="/crm" element={<CRMPage />} />
              <Route path="/flows" element={<FlowsPage />} />
              <Route path="/automacoes" element={<AutomationsPage />} />
              <Route path="/modelos" element={<TemplatesPage />} />
              <Route path="/configuracoes" element={<SettingsPage />} />
            </Routes>
          </MainLayout>
        } />
      </Routes>
    </HashRouter>
  );
}

export default App;
