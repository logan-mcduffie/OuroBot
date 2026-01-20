import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { Command } from '../types';
import path from 'path';

const cavemanCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('caveman')
    .setDescription('Why use many word when few word do trick')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('User to enlighten')
        .setRequired(false)
    ) as SlashCommandBuilder,

  execute: async (interaction) => {
    const target = interaction.options.getUser('target');
    const attachment = new AttachmentBuilder(path.join(__dirname, '../../memes/caveman.mp4'));
    
    const content = target 
      ? `<@${target.id}>`
      : undefined;

    await interaction.reply({ 
      content,
      files: [attachment] 
    });
  }
};

export default cavemanCommand;
