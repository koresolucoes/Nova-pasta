// api/execute-automation-webhook.ts
import { getAutomations, runAutomations, updateAutomation } from '../services/automationService';
import { getContacts, addContact } from '../services/contactService';
import type { Automation, TriggerWebhookData } from '../types';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    const webhookId = req.query.id;
    if (!webhookId) {
        return res.status(400).json({ success: false, message: 'Webhook ID is missing in query parameter "id".' });
    }

    const body = req.body;
    
    try {
        const automations = await getAutomations();
        let targetAutomation: Automation | undefined;
        let triggerNodeRef: any = null;

        for (const automation of automations) {
            const triggerNode = automation.nodes.find(node => 
                node.type === 'trigger' && 
                node.subType === 'webhook' && 
                (node.data as TriggerWebhookData).webhookId === webhookId
            );
            if (triggerNode) {
                targetAutomation = automation;
                triggerNodeRef = triggerNode;
                break;
            }
        }

        if (!targetAutomation || !triggerNodeRef) {
            return res.status(404).json({ success: false, message: 'No active automation found for this webhook ID.' });
        }
        
        // --- Handle Listening Mode for Testing ---
        if ((triggerNodeRef.data as TriggerWebhookData).isListening) {
            const nodeIndex = targetAutomation.nodes.findIndex(n => n.id === triggerNodeRef.id);
            if (nodeIndex > -1) {
                const oldData = targetAutomation.nodes[nodeIndex].data as TriggerWebhookData;
                targetAutomation.nodes[nodeIndex].data = {
                    ...oldData,
                    lastSample: body,
                    isListening: false,
                };
                await updateAutomation(targetAutomation);
                console.log(`Webhook sample captured for automation: ${targetAutomation.name}`);
                return res.status(200).json({ success: true, message: 'Sample captured successfully.' });
            }
        }
        
        // --- Normal Execution Logic ---
        const phone = body.phone;
        if (!phone) {
            return res.status(400).json({ success: false, message: 'Request body must contain a "phone" property for execution.' });
        }
        
        // Find or create the contact
        const allContacts = await getContacts();
        let contact = allContacts.find(c => c.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''));
        let isNewContact = false;
        
        if (!contact) {
            isNewContact = true;
            const newContactData = {
                phone: phone,
                name: body.name || `Contato Webhook ${phone.slice(-4)}`,
                tags: body.tags || [],
                ...body // Spread the rest of the body as custom fields
            };
            contact = await addContact(newContactData);
        }

        // Run the primary 'webhook' trigger
        await runAutomations('webhook', { contactId: contact.id, webhook: body });
        
        // If a new contact was created, also run its associated triggers
        if (isNewContact) {
            await runAutomations('contact_created', { contactId: contact.id });
            if (contact.tags && contact.tags.length > 0) {
                for (const tag of contact.tags) {
                    await runAutomations('tag_added', { contactId: contact.id, tagName: tag });
                }
            }
        }
        
        return res.status(200).json({ success: true, message: 'Automation triggered successfully.' });

    } catch (error) {
        console.error(`Error processing webhook ${webhookId}:`, error);
        const message = error instanceof Error ? error.message : 'An internal server error occurred.';
        return res.status(500).json({ success: false, message });
    }
}
