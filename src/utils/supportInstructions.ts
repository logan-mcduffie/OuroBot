import { EmbedBuilder, TextChannel, Client } from 'discord.js';
import { getDb } from '../database/db';

const INSTRUCTION_MESSAGE_KEY = 'support_instruction_message_id';

export async function refreshSupportInstructions(client: Client): Promise<void> {
  const supportChannelId = process.env.DISCORD_SUPPORT_CHANNEL_ID;
  if (!supportChannelId) {
    console.error('❌ DISCORD_SUPPORT_CHANNEL_ID not configured');
    return;
  }

  const channel = client.channels.cache.get(supportChannelId) as TextChannel;
  if (!channel) {
    console.error('❌ Could not find support channel');
    return;
  }

  const db = await getDb();

  // Try to delete old instruction message
  const oldMessageId = await db.get('SELECT value FROM bot_config WHERE key = ?', [INSTRUCTION_MESSAGE_KEY]);
  
  if (oldMessageId?.value) {
    try {
      const oldMessage = await channel.messages.fetch(oldMessageId.value);
      await oldMessage.delete();
    } catch (err) {
      // Message might already be deleted, that's fine
    }
  }

  // Create the instruction embed
  const instructionEmbed = new EmbedBuilder()
    .setTitle('Need Help?')
    .setColor(0x5865F2) // Discord blurple
    .setDescription('Before opening a support thread, make sure you\'ve completed the setup process and have a log file ready.')
    .addFields(
      {
        name: '\u200B',
        value: '**Step 1: Complete Setup**',
      },
      {
        name: '\u200B',
        value: `If you haven't set up the toolkit yet, run \`/setup\` for step-by-step instructions.\n\nThis ensures you have all prerequisites installed (Git, Python 3.10+, Java 24+).`
      },
      {
        name: '\u200B',
        value: '**Step 2: Run the Toolkit**',
      },
      {
        name: '\u200B',
        value: `Run the setup script to generate a log file:\n\`\`\`bash\npython hytale_toolkit/setup.py\n\`\`\`\nThis creates \`logs/setup.log\` which is **required** for support.`
      },
      {
        name: '\u200B',
        value: `**Step 3: Check the [FAQ](https://discord.com/channels/1462988917560053935/1463208771496050710)**`,
      },
      {
        name: '\u200B',
        value: '**Step 4: Open a Support Thread**',
      },
      {
        name: '\u200B',
        value: `If you still need help, use the \`/support\` command below.\n\nYou'll need:\n- Your operating system\n- Toolkit version\n- Description of the issue\n- **Your log file** (required)`
      }
    )
    .setFooter({ text: 'Use /support to open a thread' });

  // Post new message
  const newMessage = await channel.send({ embeds: [instructionEmbed] });

  // Store new message ID
  await db.run(
    'INSERT OR REPLACE INTO bot_config (key, value) VALUES (?, ?)',
    [INSTRUCTION_MESSAGE_KEY, newMessage.id]
  );

  console.log('✅ Support instructions message refreshed');
}
