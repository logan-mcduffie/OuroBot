import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { Command } from '../types';
import { getDb } from '../database/db';

const faqCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('faq')
    .setDescription('Get answers to common questions')
    .addStringOption(option =>
      option.setName('topic')
        .setDescription('The topic to search for')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  execute: async (interaction) => {
    const topic = interaction.options.getString('topic');
    const db = await getDb();
    
    const faq = await db.get('SELECT * FROM faq_entries WHERE topic = ?', topic);

    if (!faq) {
      await interaction.reply({ 
        content: `❌ I couldn't find an FAQ entry for "${topic}". Try checking the list of available topics.`,
        flags: MessageFlags.Ephemeral 
      });
      return;
    }

    const sassIntro = [
      "Here is the info you requested:", 
      "I can tell you didn't read the documentation, but here:",
      "😏 Let me Google that for you... oh wait, I have it right here.",
      "Requires reading comprehension, but here goes:"
    ];
    
    // Simple logic to pick sass based on level (1-4)
    const intro = sassIntro[Math.min(faq.sass_level, sassIntro.length) - 1] || sassIntro[0];

    const embed = new EmbedBuilder()
      .setColor(0x00FF99)
      .setDescription(`${intro}\n\n${faq.answer}`);

    await interaction.reply({ embeds: [embed] });
  }
};

export default faqCommand;
