import { Events, MessageReaction, User, EmbedBuilder, ThreadChannel, PermissionFlagsBits } from 'discord.js';
import { getDb } from '../database/db';

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction: MessageReaction, user: User) {
    // Ignore bot reactions
    if (user.bot) return;
    
    // Only handle ✅ and ❌ reactions
    if (reaction.emoji.name !== '✅' && reaction.emoji.name !== '❌') return;
    
    // Fetch partial message if needed
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (err) {
        console.error('Failed to fetch reaction:', err);
        return;
      }
    }
    
    const message = reaction.message;
    
    // Only process reactions on bot messages
    if (message.author?.id !== message.client.user?.id) return;
    
    // Only process in threads
    if (!message.channel.isThread()) return;
    
    // Only process in support threads
    const thread = message.channel as ThreadChannel;
    const supportChannelId = process.env.DISCORD_SUPPORT_CHANNEL_ID;
    if (thread.parentId !== supportChannelId) return;
    
    // Check if this is an error detection message (has the specific footer)
    const embed = message.embeds[0];
    if (!embed?.footer?.text?.includes('Did this resolve your issue? React with')) return;
    
    if (reaction.emoji.name === '✅') {
      // User says issue is resolved - auto-resolve the thread
      try {
        // Update the embed to show resolved
        const resolvedEmbed = EmbedBuilder.from(embed)
          .setColor(0x57F287) // Green
          .setFooter({ text: 'Issue resolved by auto-detection!' });
        
        await message.edit({ embeds: [resolvedEmbed] });
        
        // Remove reactions
        await message.reactions.removeAll();
        
        // Update the starter message (the embed in the support channel)
        const starterMessage = await thread.fetchStarterMessage();
        if (starterMessage && starterMessage.embeds.length > 0) {
          const oldEmbed = starterMessage.embeds[0];
          const updatedEmbed = EmbedBuilder.from(oldEmbed)
            .setColor(0x57F287) // Discord green
            .setFooter({ text: 'This thread has been resolved!' });
          await starterMessage.edit({ embeds: [updatedEmbed] });
        }
        
        // Update thread name
        const currentName = thread.name;
        let newName = currentName;
        if (currentName.startsWith('📋')) {
          newName = currentName.replace('📋', '✅');
        } else if (!currentName.startsWith('✅')) {
          newName = `✅ ${currentName}`;
        }
        await thread.setName(newName);
        
        // Update database
        const db = await getDb();
        await db.run(
          'UPDATE support_threads SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE thread_id = ?',
          ['resolved', thread.id]
        );
        
        // Send confirmation
        const confirmEmbed = new EmbedBuilder()
          .setTitle('✅ Thread Resolved')
          .setColor(0x57F287)
          .setDescription('Glad the auto-detection helped! This thread has been marked as resolved.')
          .setTimestamp();
        
        await thread.send({ embeds: [confirmEmbed] });
        
        // Archive after delay
        setTimeout(async () => {
          try {
            await thread.setArchived(true);
          } catch (err) {
            console.error('Failed to archive thread:', err);
          }
        }, 5000);
        
      } catch (err) {
        console.error('Failed to resolve thread via reaction:', err);
      }
      
    } else if (reaction.emoji.name === '❌') {
      // User says issue is not resolved
      try {
        // Update the embed
        const notResolvedEmbed = EmbedBuilder.from(embed)
          .setColor(0x5865F2) // Blurple
          .setFooter({ text: 'A human will help you shortly.' });
        
        await message.edit({ embeds: [notResolvedEmbed] });
        
        // Remove reactions
        await message.reactions.removeAll();
        
        // Send follow-up
        await thread.send({
          content: `Got it, <@${user.id}>. The auto-detection didn't resolve your issue. Someone will be with you shortly!`
        });
        
      } catch (err) {
        console.error('Failed to handle negative reaction:', err);
      }
    }
  },
};
