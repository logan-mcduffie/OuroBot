import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { Command } from '../types';

const supportCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('support')
    .setDescription('Open a support request thread')
    .addStringOption(option =>
      option.setName('os')
        .setDescription('Your operating system')
        .setRequired(true)
        .addChoices(
          { name: '🪟 Windows', value: 'Windows' },
          { name: '🍎 macOS', value: 'macOS' },
          { name: '🐧 Linux', value: 'Linux' }
        )
    ),

  execute: async (interaction) => {
    const os = interaction.options.getString('os', true);

    // Create the modal with encoded OS
    const modal = new ModalBuilder()
        .setCustomId(`supportModal_${os}`)
        .setTitle('New Support Request');

    // Title Input
    const titleInput = new TextInputBuilder()
        .setCustomId('supportTitle')
        .setLabel("Issue Title")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("e.g., Ollama connection refused")
        .setRequired(true);

    // Version Input
    const versionInput = new TextInputBuilder()
        .setCustomId('supportVersion')
        .setLabel("Toolkit Version")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("v1.4.0 (check /version)")
        .setRequired(true);

    // Description Input
    const descriptionInput = new TextInputBuilder()
        .setCustomId('supportDescription')
        .setLabel("Description & What you've tried")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Describe the error and what steps you've already taken...")
        .setRequired(true);

    const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput);
    const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(versionInput);
    const thirdActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput);

    modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

    await interaction.showModal(modal);
  }
};

export default supportCommand;
