import { SlashCommandBuilder, EmbedBuilder, ChannelType, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { Command } from '../types';
import { getDb } from '../database/db';

const resolveCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('resolve')
    .setDescription('Mark a support thread as resolved'),

  execute: async (interaction) => {
    // Must be used in a thread
    if (!interaction.channel?.isThread()) {
      await interaction.reply({ 
        content: '❌ This command can only be used inside a support thread.', 
        flags: MessageFlags.Ephemeral 
      });
      return;
    }

    const thread = interaction.channel;
    const supportChannelId = process.env.DISCORD_SUPPORT_CHANNEL_ID;

    // Must be in the support channel
    if (thread.parentId !== supportChannelId) {
      await interaction.reply({ 
        content: '❌ This command can only be used in support threads.', 
        flags: MessageFlags.Ephemeral 
      });
      return;
    }

    // Defer early to avoid timeout during DB queries
    await interaction.deferReply();

    // Check if user is thread owner or has mod permissions
    const db = await getDb();
    const threadData = await db.get(
      'SELECT * FROM support_threads WHERE thread_id = ?',
      [thread.id]
    );

    const isOwner = threadData?.user_id === interaction.user.id;
    const isMod = interaction.memberPermissions?.has(PermissionFlagsBits.ManageThreads);

    if (!isOwner && !isMod) {
      await interaction.editReply('❌ Only the thread creator or moderators can resolve this thread.');
      return;
    }

    // Check if already resolved
    if (threadData?.status === 'resolved') {
      await interaction.editReply('✅ This thread is already marked as resolved.');
      return;
    }

    try {
      // 1. Update the starter message (the embed in the support channel)
      const starterMessage = await thread.fetchStarterMessage();
      
      if (starterMessage && starterMessage.embeds.length > 0) {
        const oldEmbed = starterMessage.embeds[0];
        
        const resolvedEmbed = EmbedBuilder.from(oldEmbed)
          .setColor(0x57F287) // Discord green
          .setFooter({ text: 'This thread has been resolved!' });

        await starterMessage.edit({ embeds: [resolvedEmbed] });
      }

      // 2. Update thread name: replace clipboard emoji with checkmark
      const currentName = thread.name;
      let newName = currentName;
      
      if (currentName.startsWith('📋')) {
        newName = currentName.replace('📋', '✅');
      } else if (!currentName.startsWith('✅')) {
        newName = `✅ ${currentName}`;
      }
      
      await thread.setName(newName);

      // 3. Update database
      await db.run(
        'UPDATE support_threads SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE thread_id = ?',
        ['resolved', thread.id]
      );

      // 4. Send confirmation and archive
      const confirmEmbed = new EmbedBuilder()
        .setTitle('✅ Thread Resolved')
        .setColor(0x57F287)
        .setDescription('This support thread has been marked as resolved and will be archived.')
        .addFields(
          { name: 'Resolved by', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [confirmEmbed] });

      // 5. Archive the thread after a short delay
      setTimeout(async () => {
        try {
          await thread.setArchived(true);
        } catch (err) {
          console.error('Failed to archive thread:', err);
        }
      }, 5000);

    } catch (error) {
      console.error('Error resolving thread:', error);
      await interaction.editReply('❌ Failed to resolve thread. Please try again or contact an admin.');
    }
  }
};

export default resolveCommand;
