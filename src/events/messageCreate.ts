import { Events, Message, TextChannel } from 'discord.js';
import { processMessageForErrors } from '../utils/errorDetection';
import { updateThreadActivity } from '../utils/staleThreadManager';

module.exports = {
  name: Events.MessageCreate,
  async execute(message: Message, client: any) {
    // Ignore bots
    if (message.author.bot) return;

    // Check if message is in the support channel (not a thread)
    if (message.channelId === process.env.DISCORD_SUPPORT_CHANNEL_ID) {
      // Keep the channel clean - users should use /support
      try {
        await message.delete();
        
        const channel = message.channel as TextChannel;
        const response = await channel.send({ 
            content: `👋 Hey <@${message.author.id}>, this channel is for support tickets only.\nPlease use the \`/support\` command to open a thread!` 
        });
        
        // Delete the warning after 5 seconds to keep channel clean
        setTimeout(() => response.delete().catch(() => {}), 5000);
        
      } catch (error) {
        console.error('Failed to delete support channel message:', error);
      }
      return;
    }

    // Track activity in support threads (for stale thread management)
    if (message.channel.isThread() && message.channel.parentId === process.env.DISCORD_SUPPORT_CHANNEL_ID) {
      try {
        await updateThreadActivity(message.channel.id);
      } catch (error) {
        console.error('Failed to update thread activity:', error);
      }
    }

    // Auto-error detection in support threads
    try {
      await processMessageForErrors(message);
    } catch (error) {
      console.error('Error in auto-error detection:', error);
    }
  },
};
