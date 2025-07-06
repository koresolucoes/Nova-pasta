
// This serverless function is intended to be run on a schedule (e.g., every minute via Vercel Cron Jobs).
// It queries for pending automation tasks and executes them.
// To secure this endpoint, set a CRON_SECRET environment variable in your Vercel project.

import { supabase } from '../../src/services/supabaseClient';
import { executeAutomation, getAutomationById } from '../../src/services/automationService';
import { getContactById } from '../../src/services/contactService';
import { getConnectionById } from '../../src/services/metaService';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    // Simple bearer token authentication
    const AUTH_TOKEN = process.env.CRON_SECRET;
    const { authorization } = req.headers;

    if (!AUTH_TOKEN || authorization !== `Bearer ${AUTH_TOKEN}`) {
        return res.status(401).send('Unauthorized');
    }

    try {
        const now = new Date().toISOString();
        const { data: tasks, error: fetchError } = await supabase
            .from('scheduled_automation_tasks')
            .select('*')
            .eq('status', 'pending')
            .lte('execute_at', now);

        if (fetchError) {
            console.error("Cron job failed to fetch tasks:", fetchError);
            throw fetchError;
        }
        
        if (!tasks || tasks.length === 0) {
            return res.status(200).json({ success: true, message: "No pending tasks to process." });
        }

        let processed = 0;
        let failed = 0;

        for (const task of tasks) {
            try {
                // Mark task as 'processing' to prevent duplicate runs
                await supabase.from('scheduled_automation_tasks').update({ status: 'processing' } as any).eq('id', task.id);
                
                const [automation, contact, connection] = await Promise.all([
                    getAutomationById(task.automation_id),
                    getContactById(task.contact_id),
                    getConnectionById(task.meta_connection_id)
                ]);

                if (automation && contact && connection) {
                    await executeAutomation(
                        automation,
                        contact,
                        task.context,
                        connection,
                        task.resume_from_node_id
                    );
                    // Mark as processed upon successful completion
                    await supabase.from('scheduled_automation_tasks').update({ status: 'processed' } as any).eq('id', task.id);
                    processed++;
                } else {
                    throw new Error(`Could not find required data for task ${task.id}. Automation: ${!!automation}, Contact: ${!!contact}, Connection: ${!!connection}`);
                }
            } catch (taskError) {
                console.error(`Error processing task ${task.id}:`, taskError);
                await supabase.from('scheduled_automation_tasks').update({ status: 'failed', error_message: (taskError as Error).message } as any).eq('id', task.id);
                failed++;
            }
        }
        
        console.log(`Cron job finished. Processed: ${processed}, Failed: ${failed}.`);
        return res.status(200).json({ success: true, message: `Processed ${processed} tasks, ${failed} failed.` });

    } catch (error) {
        console.error("Cron job failed unexpectedly:", error);
        return res.status(500).json({ success: false, message: 'Cron job execution failed.' });
    }
}
