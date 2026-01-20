import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../types';

const versionCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('version')
    .setDescription('Shows the current toolkit version information'),
  
  execute: async (interaction) => {
    // In a real scenario, we'd fetch this from GitHub API
    // For MVP, we'll fetch the latest tag or hardcode a fallback
    
    // Mocking fetch for MVP speed, can easily swap to real fetch later
    const latestVersion = 'v1.4.0';
    const releaseDate = 'January 18, 2024';
    
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('📦 Hytale Toolkit')
      .addFields(
        { name: 'Latest Version', value: latestVersion, inline: true },
        { name: 'Released', value: releaseDate, inline: true }
      )
      .setDescription(`
**What's New:**
- ✨ Improved Ollama error messages
- ✨ Auto-detect default Hytale path on Windows
- 📚 Added HytaleModding.dev documentation search

[View Release](https://github.com/logan-mcduffie/Hytale-Toolkit/releases) | [Download](https://github.com/logan-mcduffie/Hytale-Toolkit/archive/refs/tags/${latestVersion}.zip)

Need to update? Run \`git pull\` in your toolkit directory.
      `);

    await interaction.reply({ embeds: [embed] });
  }
};

export default versionCommand;
