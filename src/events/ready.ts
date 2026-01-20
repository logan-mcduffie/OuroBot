import { Events, Client } from 'discord.js';
import { seedFaqs } from '../database/seed';

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
  },
};
