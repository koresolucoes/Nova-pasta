// O webhook não precisa mais do Pusher, mas agora interage diretamente com o banco de dados.
// Ele irá lidar com as mensagens recebidas, encontrar o contato correspondente, adicionar a mensagem à conversa,
// e acionar quaisquer automações relevantes.

import { supabase } from '../services/supabaseClient';
import { getContacts } from '../services/contactService';
import { addMessage } from '../services/chatService';
import { runAutomations } from '../services/automationService';

// --- Environment Variables ---
const { META_VERIFY_TOKEN } = process.env;

if (!META_VERIFY_TOKEN) {
    console.error("META_VERIFY_TOKEN is not set in environment variables.");
}

export default async function handler(req: any, res: any) {
  // --- 1. Handle Meta's Webhook Verification (GET request) ---
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
      console.log('Webhook verified successfully!');
      return res.status(200).send(challenge);
    } else {
      console.error('Webhook verification failed.');
      return res.status(403).send('Forbidden');
    }
  }

  // --- 2. Handle Incoming Messages (POST request) ---
  if (req.method === 'POST') {
    const body = req.body;

    // Check if it's a valid WhatsApp message update
    if (body.object === 'whatsapp_business_account' && body.entry) {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages' && change.value.messages) {
            for (const message of change.value.messages) {
              // We only care about incoming text messages for now.
              if (message.type === 'text') {
                const contactPhone = message.from;
                const text = message.text.body;

                try {
                  // This logic was previously in chatService.receiveMessage
                  const allContacts = await getContacts();
                  const contact = allContacts.find(c => c.phone.replace(/\D/g, '') === contactPhone.replace(/\D/g, ''));
                  
                  if (contact) {
                      // Add message to the conversation in the database
                      await addMessage(contact.id, {
                          text,
                          sender: 'contact',
                          status: 'delivered',
                      });
                      // Trigger any automations based on the message content
                      await runAutomations('context_message', { contactId: contact.id, messageText: text });
                      console.log(`Successfully processed message from ${contactPhone}`);
                  } else {
                      console.warn(`Received message from unknown number: ${contactPhone}. Contact not found in DB.`);
                  }
                } catch (error) {
                   console.error(`Failed to process incoming message from ${contactPhone}:`, error);
                   // Still return 200 to Meta, as we've received it. The issue is internal processing.
                }
              }
            }
          }
        }
      }
    }
    // Acknowledge receipt to Meta immediately
    return res.status(200).send('OK');
  }

  // --- 3. Handle other HTTP methods ---
  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end('Method Not Allowed');
}
