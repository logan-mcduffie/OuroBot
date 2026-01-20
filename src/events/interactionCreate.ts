import { Events, Interaction, EmbedBuilder, TextChannel, ThreadAutoArchiveDuration, MessageFlags } from 'discord.js';
import { getDb } from '../database/db';
import { refreshSupportInstructions } from '../utils/supportInstructions';

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction, client: any) {
    // 1. Handle Chat Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
        }
      }
    } 
    
    // 2. Handle Autocomplete (for FAQ)
    else if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) return;

      if (interaction.commandName === 'faq' || interaction.commandName === 'rtfm') {
        const focusedValue = interaction.options.getFocused();
        const db = await getDb();
        const choices = await db.all('SELECT topic FROM faq_entries WHERE topic LIKE ? LIMIT 25', [`%${focusedValue}%`]);
        
        await interaction.respond(
          choices.map(choice => ({ name: choice.topic, value: choice.topic }))
        );
      }
    }

    // 3. Handle Modal Submissions (Support)
    else if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('supportModal_')) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // Retrieve OS from customId
        const os = interaction.customId.split('_')[1];
        
        const title = interaction.fields.getTextInputValue('supportTitle');
        const version = interaction.fields.getTextInputValue('supportVersion');
        const description = interaction.fields.getTextInputValue('supportDescription');

        const supportChannelId = process.env.DISCORD_SUPPORT_CHANNEL_ID;
        if (!supportChannelId) {
            await interaction.editReply('❌ Support channel ID not configured.');
            return;
        }

        const channel = interaction.guild?.channels.cache.get(supportChannelId) as TextChannel;
        if (!channel) {
             await interaction.editReply('❌ Could not find support channel.');
             return;
        }

        try {
            // Create summary embed for the channel
            const summaryEmbed = new EmbedBuilder()
                .setTitle(`🎫 ${title}`)
                .setColor(0xFFA500)
                .addFields(
                    { name: 'Reporter', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'OS', value: os, inline: true },
                    { name: 'Version', value: version, inline: true }
                )
                .setFooter({ text: 'Click the thread below to help!' })
                .setTimestamp();

            // Post the summary message to the support channel
            const summaryMessage = await channel.send({ embeds: [summaryEmbed] });

            // Create a PUBLIC thread from that message
            const thread = await summaryMessage.startThread({
                name: `📋 ${title}`,
                autoArchiveDuration: ThreadAutoArchiveDuration.ThreeDays,
                reason: `Support request by ${interaction.user.tag}`
            });

            // Post description inside the thread
            const descriptionEmbed = new EmbedBuilder()
                .setTitle('Issue Description')
                .setColor(0xFFA500)
                .setDescription(description);

            await thread.send({ content: `<@${interaction.user.id}>`, embeds: [descriptionEmbed] });

            // Ask for log file upload
            const logRequestEmbed = new EmbedBuilder()
                .setTitle('⚠️ Log File Required')
                .setColor(0xED4245)
                .setDescription('**A log file is REQUIRED for any support request involving the toolkit.** We cannot help diagnose issues without seeing the actual error output.')
                .addFields(
                    { name: '📁 Log File Location', value: 
`\`Hytale-Toolkit/logs/setup.log\`

(Located wherever you installed the toolkit)

Or copy the terminal output where you ran the MCP server.` 
                    },
                    { name: '📎 How to Upload', value: 'Drag and drop the file directly into this thread, or paste the relevant error messages.' },
                    { name: '❓ Don\'t have a log file?', value: 'If you haven\'t run the toolkit yet and need help with setup, use the `/setup` command instead for step-by-step instructions.' }
                )
                .setFooter({ text: 'Your ticket will not be reviewed until a log file is provided.' });

            await thread.send({ embeds: [logRequestEmbed] });

            // Store in DB
            const db = await getDb();
            await db.run(
                'INSERT INTO support_threads (thread_id, user_id, title, status, last_activity_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
                [thread.id, interaction.user.id, title, 'open']
            );

            // Refresh the support instructions message (keeps it at the bottom)
            await refreshSupportInstructions(client);

            // Delete the ephemeral confirmation after a short delay
            await interaction.deleteReply();

        } catch (error) {
            console.error('Error creating support thread:', error);
            await interaction.editReply('❌ Failed to create support thread. Please contact an admin.');
        }
      }
    }
  },
};
