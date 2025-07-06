
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { DashboardIcon, CampaignIcon, ContactsIcon, TemplatesIcon, SettingsIcon, PaperAirplaneIcon, TableCellsIcon, FlowsIcon, ChatBubbleOvalLeftEllipsisIcon, SparklesIcon } from './icons';

const navLinks = [
  { to: '/', text: 'Dashboard', icon: DashboardIcon },
  { to: '/disparar', text: 'Disparar Mensagem', icon: PaperAirplaneIcon },
  { to: '/chat', text: 'Chat', icon: ChatBubbleOvalLeftEllipsisIcon },
  { to: '/campanhas', text: 'Campanhas', icon: CampaignIcon },
  { to: '/contatos', text: 'Contatos', icon: ContactsIcon },
  { to: '/crm', text: 'CRM', icon: TableCellsIcon },
  { to: '/flows', text: 'Flows', icon: FlowsIcon },
  { to: '/automacoes', text: 'Automações', icon: SparklesIcon },
  { to: '/modelos', text: 'Modelos', icon: TemplatesIcon },
  { to: '/configuracoes', text: 'Configurações', icon: SettingsIcon },
];

function Sidebar(): React.ReactNode {
  const [isOpen, setIsOpen] = useState(false);

  const baseLinkClasses = "flex items-center px-4 py-3 text-gray-600 transition-colors duration-200 transform rounded-lg";
  const activeLinkClasses = "bg-amber-100 text-amber-600";
  const inactiveLinkClasses = "hover:bg-gray-200";

  return (
    <>
      {/* Mobile Menu Button */}
      <button onClick={() => setIsOpen(!isOpen)} className="text-gray-500 lg:hidden fixed top-4 left-4 z-20">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
      </button>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-10 w-64 px-6 py-4 overflow-y-auto bg-white border-r transform lg:translate-x-0 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
             <img src="https://pratiquefitness.com.br/wp-content/uploads/2022/02/Pratique-Fitness-logo.png" alt="Pratique Fitness Logo" className="h-10 w-auto" />

          </div>
           <button onClick={() => setIsOpen(false)} className="text-gray-500 lg:hidden">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <nav className="mt-8 space-y-2">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={['/', '/flows', '/automacoes'].includes(link.to)}
              className={({ isActive }) =>
                `${baseLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`
              }
              onClick={() => setIsOpen(false)}
            >
              <link.icon className="w-5 h-5" />
              <span className="mx-4 font-medium">{link.text}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
       {/* Overlay for mobile */}
       {isOpen && <div className="fixed inset-0 bg-black opacity-50 z-0 lg:hidden" onClick={() => setIsOpen(false)}></div>}
    </>
  );
}

export default Sidebar;
