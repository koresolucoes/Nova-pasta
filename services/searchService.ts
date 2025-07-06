
type Listener = (searchTerm: string) => void;

let searchTerm = '';
const listeners: Listener[] = [];

const notify = () => {
    for (const listener of listeners) {
        listener(searchTerm);
    }
};

const subscribe = (listener: Listener): (() => void) => {
    listeners.push(listener);
    // Provide the initial term immediately
    listener(searchTerm); 
    
    // Return an unsubscribe function
    return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    };
};

const setSearchTerm = (term: string) => {
    if (searchTerm !== term) {
        searchTerm = term;
        notify();
    }
};

const getSearchTerm = (): string => {
    return searchTerm;
};

export const searchService = {
    subscribe,
    getSearchTerm,
    setSearchTerm,
};