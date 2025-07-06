import React from 'react';

export type InboxFilter = 'all' | 'unread';

interface InboxTabsProps {
  activeFilter: InboxFilter;
  onFilterChange: (filter: InboxFilter) => void;
  unreadCount: number;
}

function InboxTabs({ activeFilter, onFilterChange, unreadCount }: InboxTabsProps): React.ReactNode {
  const getButtonClasses = (filter: InboxFilter) => {
    const base = 'px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none';
    if (filter === activeFilter) {
      return `${base} bg-amber-100 text-amber-700`;
    }
    return `${base} text-gray-600 hover:bg-gray-100`;
  };

  return (
    <div className="p-2 bg-gray-50 border-b">
      <div className="flex items-center space-x-2">
        <button onClick={() => onFilterChange('all')} className={getButtonClasses('all')}>
          Todas
        </button>
        <button onClick={() => onFilterChange('unread')} className={getButtonClasses('unread')}>
          <div className="flex items-center">
            <span>Não Lidas</span>
            {unreadCount > 0 && (
              <span className="ml-2 bg-amber-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}

export default InboxTabs;
