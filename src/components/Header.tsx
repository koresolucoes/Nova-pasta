
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BellIcon, SettingsIcon, ArrowLeftOnRectangleIcon } from './icons';
import { getActiveConnection, getConnections, setActiveConnectionId, disconnectActiveConnection, type MetaConnection } from '../services/metaService';
import { searchService } from '../services/searchService';

function Header(): React.ReactNode {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeConnection, setActiveConnection] = useState<MetaConnection | null>(null);
  const [allConnections, setAllConnections] = useState<MetaConnection[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const profileRef = useRef<HTMLDivElement>(null);

  const updateConnectionState = async () => {
    const connections = await getConnections();
    const activeConn = await getActiveConnection();
    setActiveConnection(activeConn);
    setAllConnections(connections);
  };
  
  useEffect(() => {
    updateConnectionState();

    // Subscribe to connection changes
    const handleConnectionChange = () => updateConnectionState();
    window.addEventListener('metaConnectionChanged', handleConnectionChange);

    // Subscribe to search changes (e.g., if cleared elsewhere)
    const handleSearchChange = (term: string) => setSearchValue(term);
    const unsubscribeSearch = searchService.subscribe(handleSearchChange);

    // Handle clicks outside profile dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('metaConnectionChanged', handleConnectionChange);
      unsubscribeSearch();
    };
  }, []);
  
  const handleSwitchConnection = (id: string) => {
    setActiveConnectionId(id);
    updateConnectionState(); // Update state immediately
    window.dispatchEvent(new CustomEvent('metaConnectionChanged')); // Notify other components
    setIsProfileOpen(false);
  };
  
  const handleDisconnect = () => {
    disconnectActiveConnection();
    updateConnectionState();
    window.dispatchEvent(new CustomEvent('metaConnectionChanged'));
    setIsProfileOpen(false);
  };
  
  const onSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchValue(term);
    searchService.setSearchTerm(term);
  };

  const userName = activeConnection?.name || "Nenhuma Conexão";
  const userRole = activeConnection ? `Ativa` : "Desconectado";
  const avatarUrl = activeConnection ? `https://i.pravatar.cc/100?u=${activeConnection.id}` : "https://avatar.iran.liara.run/public/9";


  return (
    <header className="flex-shrink-0 bg-white border-b">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center w-full max-w-xs sm:max-w-sm md:max-w-md">
            <div className="relative text-gray-600 focus-within:text-gray-400 w-full">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg className="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path>
                    </svg>
                </span>
                <input
                    id="search"
                    className="w-full py-2 pl-10 pr-4 text-sm text-gray-800 bg-gray-100 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500 transition-all duration-200"
                    placeholder="Pesquisar..."
                    autoComplete="off"
                    value={searchValue}
                    onChange={onSearchInputChange}
                />
            </div>
        </div>

        <div className="flex items-center space-x-4">
          <button className="relative text-gray-500 hover:text-gray-700">
            <BellIcon className="h-6 w-6" />
            <span className="absolute top-0 right-0 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          </button>
          
          <div className="relative" ref={profileRef}>
            <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center focus:outline-none">
              <img 
                className="h-9 w-9 rounded-full object-cover" 
                src={avatarUrl} 
                alt="Avatar do usuário" 
              />
              <div className="ml-3 hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-800">{userName}</p>
                <p className="text-xs text-gray-500">{userRole}</p>
              </div>
            </button>
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-1 z-20 ring-1 ring-black ring-opacity-5">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-800">{userName}</p>
                  <p className="text-sm text-gray-500 truncate">{activeConnection ? `WABA: ${activeConnection.wabaId}` : 'Nenhuma conta ativa'}</p>
                </div>
                
                <div className="border-t border-gray-100">
                    <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-500 uppercase">Trocar Conexão</p>
                    <div className="max-h-40 overflow-y-auto">
                        {allConnections.map(conn => (
                           <button 
                                key={conn.id}
                                onClick={() => handleSwitchConnection(conn.id)}
                                className={`flex items-center w-full text-left px-4 py-2 text-sm ${activeConnection?.id === conn.id ? 'font-bold text-amber-600 bg-amber-50' : 'text-gray-700 hover:bg-gray-100'}`}
                           >
                               {conn.name}
                           </button>
                        ))}
                         {allConnections.length === 0 && (
                            <p className="px-4 py-2 text-sm text-gray-500">Nenhuma conexão salva.</p>
                        )}
                    </div>
                </div>

                <div className="border-t border-gray-100"></div>
                <Link to="/configuracoes" onClick={() => setIsProfileOpen(false)} className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  <SettingsIcon className="w-5 h-5 mr-3 text-gray-500"/>
                  Gerenciar Conexões
                </Link>
                <div className="border-t border-gray-100"></div>
                <button onClick={handleDisconnect} className="flex items-center w-full text-left px-4 py-2 text-sm text-amber-700 hover:bg-amber-50">
                    <ArrowLeftOnRectangleIcon className="w-5 h-5 mr-3 text-amber-500"/>
                    Desconectar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;