import { Events, Client } from 'discord.js';
import { seedFaqs } from '../database/seed';
import { refreshSupportInstructions } from '../utils/supportInstructions';
import { syncFaqChannel } from '../utils/faqSync';
import { startStaleThreadManager } from '../utils/staleThreadManager';
import { postRulesMessage } from '../utils/rulesMessage';
import { postInfoMessage } from '../utils/infoMessage';

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client) {
    console.log(`✅ Ready! Logged in as ${client.user?.tag}`);
    
    // Seed DB on startup
    try {
        await seedFaqs();
    } catch (error) {
        console.error('Failed to seed FAQs:', error);
    }

    // Sync FAQ channel with database
    try {
        await syncFaqChannel(client);
    } catch (error) {
        console.error('Failed to sync FAQ channel:', error);
    }

    // Post/refresh support instructions message
    try {
        await refreshSupportInstructions(client);
    } catch (error) {
        console.error('Failed to refresh support instructions:', error);
    }

    // Start stale thread manager (checks for inactive threads hourly)
    try {
        startStaleThreadManager(client);
    } catch (error) {
        console.error('Failed to start stale thread manager:', error);
    }

    // Post/update rules message
    try {
        await postRulesMessage(client);
    } catch (error) {
        console.error('Failed to post rules message:', error);
    }

    // Post/update info message
    try {
        await postInfoMessage(client);
    } catch (error) {
        console.error('Failed to post info message:', error);
    }
  },
};
