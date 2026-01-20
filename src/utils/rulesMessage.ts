import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { getDb } from '../database/db';

const RULES_CHANNEL_ID = process.env.DISCORD_RULES_CHANNEL_ID!;

export const postRulesMessage = async (client: Client): Promise<void> => {
  const channel = await client.channels.fetch(RULES_CHANNEL_ID) as TextChannel;
  if (!channel || !channel.isTextBased()) {
    console.error('Could not find rules channel');
    return;
  }

  const db = await getDb();

  // Check if we already have a rules message
  const existing = await db.get('SELECT value FROM bot_config WHERE key = ?', ['rules_message_id']);

  const rulesEmbed = new EmbedBuilder()
    .setTitle('Server Rules')
    .setColor(0x5865F2) // Discord blurple
    .setDescription(
      `Welcome to **Hytale Toolkit**! We keep things casual here, but please follow these guidelines to keep the server enjoyable for everyone.`
    )
    .addFields(
      {
        name: '1. Be Cool',
        value: `Treat others how you'd want to be treated. No harassment, hate speech, or being a jerk. We're all here because we like the same stuff.`
      },
      {
        name: '2. Keep It SFW',
        value: `No NSFW content anywhere. This includes images, links, usernames, and profile pictures.`
      },
      {
        name: '3. No Spam',
        value: `Don't flood channels with repeated messages, excessive caps, or walls of emojis. Bot commands go in the appropriate channels.`
      },
      {
        name: '4. Use the Right Channels',
        value: `Support questions → Use \`/support\` in <#${process.env.DISCORD_SUPPORT_CHANNEL_ID}>\nGeneral chat → Keep it in the chat channels\nDon't post the same question in multiple channels.`
      },
      {
        name: '5. Search Before Asking',
        value: `Check <#${process.env.DISCORD_FAQ_CHANNEL_ID}> and use \`/faq\` before opening a support ticket. Your question might already be answered.`
      },
      {
        name: '6. No Self-Promo Without Permission',
        value: `Don't advertise your Discord server, YouTube, or projects without asking a mod first.`
      },
      {
        name: '7. Listen to Mods',
        value: `If a mod asks you to stop doing something, stop. We're pretty chill but decisions are final.`
      }
    )
    .setFooter({ text: 'Breaking rules = warnings first, then timeout/ban if needed' });

  const expectEmbed = new EmbedBuilder()
    .setTitle('What to Expect')
    .setColor(0x57F287) // Discord green
    .addFields(
      {
        name: 'Fast Support',
        value: `Use \`/support\` and include your log file — we'll help ASAP`,
        inline: true
      },
      {
        name: 'Friendly Community',
        value: `Ask questions, share projects, hang out`,
        inline: true
      },
      {
        name: 'Updates',
        value: `New releases announced in <#${process.env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID}>`,
        inline: true
      }
    )
    .setFooter({ text: 'We hope you enjoy your stay here!\n~ Hytale Modding Toolkit' });

  try {
    if (existing?.value) {
      // Try to edit existing message
      try {
        const message = await channel.messages.fetch(existing.value);
        await message.edit({ embeds: [rulesEmbed, expectEmbed] });
        console.log('✅ Updated existing rules message');
        return;
      } catch {
        // Message doesn't exist anymore, will create new one
      }
    }

    // Create new message
    const message = await channel.send({ embeds: [rulesEmbed, expectEmbed] });
    
    // Store message ID
    await db.run(
      'INSERT OR REPLACE INTO bot_config (key, value) VALUES (?, ?)',
      ['rules_message_id', message.id]
    );
    
    console.log('✅ Posted rules message');
  } catch (error) {
    console.error('Failed to post rules message:', error);
  }
};
