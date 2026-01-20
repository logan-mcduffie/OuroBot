import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { Command } from '../types';
import { getDb } from '../database/db';
import path from 'path';

const sassyResponses = [
  "I'm going to let you in on a little secret... the docs exist for a reason.",
  "Plot twist: the answer was in the documentation all along.",
  "Have you tried... reading?",
  "The FAQ channel is free, you know.",
  "I believe in you. You can read. I've seen you type.",
  "The ancient texts hold the answers you seek.",
  "Imagine if there was a place with all the answers written down... oh wait.",
  "The documentation is calling. It misses you.",
  "Fun fact: documentation is just pre-answered questions.",
  "This might shock you, but someone already wrote this down.",
  "Bold strategy, asking instead of reading. Let's see if it pays off.",
  "The docs are free. Reading them is also free. Just saying.",
  "Ah yes, the classic 'ask before reading' technique.",
  "What if I told you... the answer is one click away?",
  "Breaking news: Local user discovers documentation exists.",
  "Reading documentation: 5 minutes. Waiting for someone to answer: ???",
  "Instructions unclear? Have you tried reading the instructions?",
  "I don't always read the docs, but when I do... wait, yes I do. You should too.",
  "The FAQ was written with love. Please read it with love.",
  "Google is free. The FAQ is free. My patience is running low.",
];

const rtfmCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('rtfm')
    .setDescription('A gentle reminder to read the documentation')
    .addStringOption(option =>
      option.setName('topic')
        .setDescription('FAQ topic to link (e.g., mcp, ollama, rag)')
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addUserOption(option =>
      option.setName('target')
        .setDescription('User who needs to read the docs')
        .setRequired(false)
    ) as SlashCommandBuilder,

  execute: async (interaction) => {
    const topic = interaction.options.getString('topic');
    const target = interaction.options.getUser('target');
    
    const sassyResponse = sassyResponses[Math.floor(Math.random() * sassyResponses.length)];
    const attachment = new AttachmentBuilder(path.join(__dirname, '../../memes/readthedocs.jpeg'));
    
    let description = sassyResponse;
    
    // If a topic was provided, look it up and add info
    if (topic) {
      const db = await getDb();
      const faq = await db.get('SELECT * FROM faq_entries WHERE topic = ?', [topic]);
      
      if (faq) {
        description += `\n\n**Relevant reading:** Use \`/faq ${topic}\` or check <#${process.env.DISCORD_FAQ_CHANNEL_ID}>`;
      } else {
        description += `\n\n**Check:** <#${process.env.DISCORD_FAQ_CHANNEL_ID}>`;
      }
    } else {
      description += `\n\n**Start here:** <#${process.env.DISCORD_FAQ_CHANNEL_ID}>`;
    }

    const embed = new EmbedBuilder()
      .setTitle('📖 RTFM')
      .setColor(0xED4245)
      .setDescription(description)
      .setImage('attachment://readthedocs.jpeg');

    const content = target ? `<@${target.id}>` : undefined;

    await interaction.reply({ 
      content,
      embeds: [embed],
      files: [attachment]
    });
  }
};

export default rtfmCommand;
