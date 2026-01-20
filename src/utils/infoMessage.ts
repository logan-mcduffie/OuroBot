import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { getDb } from '../database/db';

const INFO_CHANNEL_ID = process.env.DISCORD_INFO_CHANNEL_ID!;

export const postInfoMessage = async (client: Client): Promise<void> => {
  const channel = await client.channels.fetch(INFO_CHANNEL_ID) as TextChannel;
  if (!channel || !channel.isTextBased()) {
    console.error('Could not find info channel');
    return;
  }

  const db = await getDb();
  const existing = await db.get('SELECT value FROM bot_config WHERE key = ?', ['info_message_id']);

  // Embed 1: What is it?
  const whatEmbed = new EmbedBuilder()
    .setTitle('What is Hytale Modding Toolkit?')
    .setColor(0x5865F2)
    .setDescription(
      `> *"Give me six hours to chop down a tree and I will spend the first four sharpening the axe."*\n> — Abraham Lincoln\n\n` +
      `The Hytale Modding Toolkit is your axe. It gives AI assistants the knowledge they need to actually help you build Hytale mods.`
    )
    .addFields(
      {
        name: 'The Problem',
        value: 
          `Hytale's modding API is powerful but undocumented. The server JAR has thousands of classes with no guides on how to use them.\n\n` +
          `AI assistants like Claude and Copilot are great at coding, but they don't know anything about Hytale's codebase - they weren't trained on it. So they can't help you.`
      },
      {
        name: 'The Solution',
        value:
          `This toolkit decompiles the Hytale server, generates Javadocs, and gives your AI assistant the tools to quickly find relevant documentation on the Hytale source code. It can even generate a fully functional mod template to get you up and running instantly.\n\n` +
          `Ask *"how does player inventory work?"* and your AI gets the actual source code to reference - not hallucinated guesses.`
      }
    );

  // Embed 2: Prerequisites
  const prereqEmbed = new EmbedBuilder()
    .setTitle('Before You Start')
    .setColor(0xFEE75C) // Yellow/warning
    .setDescription(`This toolkit requires some technical knowledge and setup. Make sure you understand what you're getting into.`)
    .addFields(
      {
        name: 'You Need an AI Assistant',
        value:
          `This toolkit doesn't answer questions itself - it makes your AI assistant smarter.\n\n` +
          `**You need one of these:**\n` +
          `• Claude Desktop (free)\n` +
          `• VS Code + GitHub Copilot\n` +
          `• Cursor, Windsurf, or similar\n\n` +
          `If you don't have an LLM to talk to, this toolkit won't do anything for you.`
      },
      {
        name: 'You Need to Know What an MCP Server Is',
        value:
          `The toolkit connects to your AI via MCP (Model Context Protocol). You'll need to edit config files and understand the basics of how this works.\n\n` +
          `Check out \`/faq mcp\` for an overview.`
      },
      {
        name: 'Some Technical Setup Required',
        value:
          `You'll need Python, Node.js, and Java installed. The setup wizard handles most things, but this isn't a "click once and it works" solution.`
      }
    );

  // Embed 3: Expectations
  const expectEmbed = new EmbedBuilder()
    .setTitle('Set Your Expectations')
    .setColor(0xED4245) // Red
    .addFields(
      {
        name: 'This CAN Help Write Code',
        value:
          `Yes, you can use this with an LLM to write mod code. But remember:\n\n` +
          `**Ignorant inputs = ignorant outputs.**\n\n` +
          `The AI needs YOU to know what you want to build and how. Use this tool to *learn the codebase first* - don't expect to vibecode your way to a working mod on the first try.`
      },
      {
        name: 'AI Can Still Make Mistakes',
        value:
          `Even with perfect documentation, AI assistants can misunderstand, hallucinate, or give outdated advice. Always verify what it tells you.`
      },
      {
        name: 'Not Affiliated with Hypixel',
        value:
          `This is an independent community project. It's not official Hypixel tooling and isn't endorsed by them.`
      }
    );

  // Embed 4: Quick Links
  const linksEmbed = new EmbedBuilder()
    .setTitle('Get Started')
    .setColor(0x57F287) // Green
    .addFields(
      {
        name: 'Installation',
        value: `[GitHub Repository](https://github.com/logan-mcduffie/Hytale-Toolkit)\nClone it, run \`python hytale-rag/setup.py\`, follow the wizard.`
      },
      {
        name: 'Learn the Basics',
        value: `<#${process.env.DISCORD_FAQ_CHANNEL_ID}> - Start with \`/faq rag\` and \`/faq notllm\``
      },
      {
        name: 'Need Help?',
        value: `<#${process.env.DISCORD_SUPPORT_CHANNEL_ID}> - Use \`/support\` to open a ticket\nHave your \`setup.log\` ready!`
      }
    )
    .setFooter({ text: 'Hytale Modding Toolkit • Sharpen your axe.' });

  const embeds = [whatEmbed, prereqEmbed, expectEmbed, linksEmbed];

  try {
    if (existing?.value) {
      try {
        const message = await channel.messages.fetch(existing.value);
        await message.edit({ embeds });
        console.log('✅ Updated existing info message');
        return;
      } catch {
        // Message doesn't exist anymore
      }
    }

    const message = await channel.send({ embeds });
    await db.run(
      'INSERT OR REPLACE INTO bot_config (key, value) VALUES (?, ?)',
      ['info_message_id', message.id]
    );
    console.log('✅ Posted info message');
  } catch (error) {
    console.error('Failed to post info message:', error);
  }
};
