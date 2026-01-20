import { Events, Message, TextChannel } from 'discord.js';

module.exports = {
  name: Events.MessageCreate,
  async execute(message: Message, client: any) {
    // Ignore bots
    if (message.author.bot) return;

    // Check if message is in the support channel
    if (message.channelId === process.env.DISCORD_SUPPORT_CHANNEL_ID) {
      // If it's not a thread (it's the parent channel) and not a bot interaction
      // (though slash commands don't trigger messageCreate, the interaction reply might)
      
      // Actually, we just want to keep the channel clean.
      // Users shouldn't be typing here. They should use /support.
      
      try {
        await message.delete();
        
        // Optional: DM the user telling them why
        const channel = message.channel as TextChannel;
        const response = await channel.send({ 
            content: `👋 Hey <@${message.author.id}>, this channel is for support tickets only.\nPlease use the \`/support\` command to open a thread!` 
        });
        
        // Delete the warning after 5 seconds to keep channel clean
        setTimeout(() => response.delete().catch(() => {}), 5000);
        
      } catch (error) {
        console.error('Failed to delete support channel message:', error);
      }
    }
  },
};
