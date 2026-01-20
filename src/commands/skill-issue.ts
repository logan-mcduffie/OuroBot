import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { Command } from '../types';
import path from 'path';

const skillIssueCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('skill-issue')
    .setDescription('Diagnose the real problem')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('User with the skill issue')
        .setRequired(false)
    ) as SlashCommandBuilder,

  execute: async (interaction) => {
    const target = interaction.options.getUser('target');
    const attachment = new AttachmentBuilder(path.join(__dirname, '../../memes/jarvis-skill-issue.gif'));
    
    const content = target 
      ? `<@${target.id}>`
      : undefined;

    await interaction.reply({ 
      content,
      files: [attachment] 
    });
  }
};

export default skillIssueCommand;
