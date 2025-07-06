import type { WhatsAppFlow, FlowComponent, FlowAction } from '../types';

export const generateFlowJsonForApi = (flow: WhatsAppFlow): string => {
    // This function strips out any local-only properties from the flow and screens/components
    // before generating the final JSON string for the Meta API.
    
    // Build routing model dynamically, including all screens.
    const routing_model: Record<string, string[]> = {};
    flow.screens.forEach(screen => {
        const targets: string[] = [];
        // Look for Navigate actions in components to build routing paths
        screen.layout.children.forEach(component => {
            const action = component['on-click-action'];
            if (action?.type === 'Navigate' && action.targetScreenId) {
                targets.push(action.targetScreenId);
            }
        });
        // Every screen must be a key in the model, even if it's terminal (empty array)
        routing_model[screen.screen_id] = [...new Set(targets)];
    });

    const apiScreens = flow.screens.map(screen => {
        const { id: localId, title, screen_id, layout, terminal: isTerminalLocally, ...restOfScreen } = screen;

        // A screen is terminal if it's explicitly marked or contains a 'Complete' action.
        const isTerminalByAction = layout.children.some(
            c => c['on-click-action']?.type === 'Complete'
        );
        const isTerminal = isTerminalLocally || isTerminalByAction;

        const apiChildren = layout.children.map((child: FlowComponent) => {
            const { id, ...apiChildData } = child;
            const apiChild: any = { ...apiChildData };

            // Remove 'name' property from components where it's not allowed by the API.
            if (['TextHeading', 'TextBody', 'TextCaption', 'RichText', 'Image', 'Footer'].includes(child.type)) {
                delete apiChild.name;
            }
            
            // Convert the internal action object to the API-expected format.
            if (apiChild['on-click-action']) {
                const internalAction = apiChild['on-click-action'] as FlowAction;
                const apiAction: any = {};
                apiAction.name = internalAction.type.toLowerCase(); // Use 'name' instead of 'type'
                
                if (internalAction.type === 'Navigate' && internalAction.targetScreenId) {
                    apiAction.payload = { screen: internalAction.targetScreenId };
                } else if (internalAction.type === 'open_url' && internalAction.url) {
                    apiAction.url = internalAction.url;
                } else if (internalAction.type === 'DataExchange' && internalAction.data) {
                    apiAction.payload = internalAction.data;
                }
                
                apiChild['on-click-action'] = apiAction;
            }

            // Strip local-only 'id' from carousel images
            if ('images' in apiChild && Array.isArray(apiChild.images)) {
                apiChild.images = apiChild.images.map((img: any) => {
                    const { id: imgId, ...apiImg } = img;
                    return apiImg;
                });
            }

            return apiChild;
        });

        const finalApiScreen: any = {
            ...restOfScreen,
            title: title, // Ensure 'title' is always present.
            id: screen_id,
            layout: { ...layout, children: apiChildren },
        };
        
        // Add 'terminal: true' if the screen is terminal.
        if (isTerminal) {
            finalApiScreen.terminal = true;
        }

        return finalApiScreen;
    });

    const flowJsonPayload = {
        version: flow.version,
        data_api_version: flow.data_api_version,
        routing_model: routing_model, // Use the dynamically generated routing model
        screens: apiScreens,
    };

    return JSON.stringify(flowJsonPayload, null, 2);
};
