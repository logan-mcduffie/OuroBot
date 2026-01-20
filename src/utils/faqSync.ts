import { EmbedBuilder, TextChannel, Client, ThreadAutoArchiveDuration, ChannelType } from 'discord.js';
import { getDb } from '../database/db';

// Define FAQ categories and their topics
const FAQ_CATEGORIES = [
  {
    id: 'concepts',
    name: 'How It Works',
    description: 'Understand what the toolkit does and how it all fits together.',
    emoji: '💡',
    topics: ['rag', 'notllm']
  },
  {
    id: 'prerequisites',
    name: 'Prerequisites',
    description: 'Required software and tools you need before setting up the toolkit.',
    emoji: '📋',
    topics: ['python', 'node', 'java']
  },
  {
    id: 'embeddings',
    name: 'Embedding Providers',
    description: 'Configure your AI embedding provider for documentation search.',
    emoji: '🤖',
    topics: ['embeddings', 'ollama', 'voyageai']
  },
  {
    id: 'ide',
    name: 'IDE Setup',
    description: 'Connect the toolkit to your code editor or AI assistant.',
    emoji: '💻',
    topics: ['mcp', 'vscode', 'claude']
  },
  {
    id: 'hytale',
    name: 'Hytale Configuration',
    description: 'Configure paths and settings for your Hytale installation.',
    emoji: '🎮',
    topics: ['path']
  }
];

export async function syncFaqChannel(client: Client): Promise<void> {
  const faqChannelId = process.env.DISCORD_FAQ_CHANNEL_ID;
  console.log(`  FAQ Channel ID: ${faqChannelId}`);
  
  if (!faqChannelId) {
    console.error('❌ DISCORD_FAQ_CHANNEL_ID not configured');
    return;
  }

  const channel = client.channels.cache.get(faqChannelId) as TextChannel;
  console.log(`  Channel found: ${channel?.name || 'NOT FOUND'}`);
  
  if (!channel) {
    console.error('❌ Could not find FAQ channel');
    return;
  }

  const db = await getDb();
  
  // Get all FAQ entries
  const faqs = await db.all('SELECT * FROM faq_entries');
  const faqsByTopic = new Map(faqs.map(f => [f.topic, f]));

  let totalSynced = 0;

  for (const category of FAQ_CATEGORIES) {
    // Get or create category thread info from bot_config
    const configKey = `faq_category_${category.id}`;
    const existingConfig = await db.get('SELECT value FROM bot_config WHERE key = ?', [configKey]);
    
    let threadId: string | null = null;
    let messageId: string | null = null;
    
    if (existingConfig?.value) {
      const config = JSON.parse(existingConfig.value);
      threadId = config.threadId;
      messageId = config.messageId;
    }

    // Create category embed for the main channel
    const categoryEmbed = new EmbedBuilder()
      .setTitle(`${category.emoji} ${category.name}`)
      .setColor(0x5865F2)
      .setDescription(category.description + '\n\n**Click the thread below to view FAQs.**');

    // Try to find existing thread
    let thread;
    if (threadId) {
      try {
        const fetchedThread = await client.channels.fetch(threadId);
        if (fetchedThread?.isThread()) {
          thread = fetchedThread;
          if (thread.archived) {
            await thread.setArchived(false);
          }
        }
      } catch (err) {
        thread = null;
      }
    }

    // Verify the category message still exists
    let categoryMessageExists = false;
    if (messageId) {
      try {
        await channel.messages.fetch(messageId);
        categoryMessageExists = true;
      } catch (err) {
        categoryMessageExists = false;
      }
    }

    console.log(`  Category ${category.name}: thread=${!!thread}, messageExists=${categoryMessageExists}`);

    // If thread AND message both exist, just update the message
    if (thread && categoryMessageExists) {
      console.log(`  -> Updating existing category: ${category.name}`);
      try {
        const categoryMessage = await channel.messages.fetch(messageId!);
        await categoryMessage.edit({ embeds: [categoryEmbed] });
      } catch (err) {
        console.error(`  Failed to update message for ${category.name}:`, err);
      }
    } 
    // Otherwise, clean up and create fresh
    else {
      // Delete orphaned thread if it exists but message is gone
      if (thread && !categoryMessageExists) {
        console.log(`  -> Deleting orphaned thread: ${category.name}`);
        try {
          await thread.delete();
        } catch (err) {
          console.error(`  Failed to delete orphaned thread:`, err);
        }
        thread = null;
      }
      
      // Clear stale message_ids for topics in this category since we're recreating
      for (const topic of category.topics) {
        await db.run('UPDATE faq_entries SET message_id = NULL WHERE topic = ?', [topic]);
      }
      console.log(`  Creating new category: ${category.name} (cleared stale message IDs)`);
      
      // Delete old message if it exists
      if (messageId) {
        try {
          const oldMessage = await channel.messages.fetch(messageId);
          await oldMessage.delete();
          console.log(`  Deleted old message for ${category.name}`);
        } catch (err) {
          // Already deleted, fine
        }
      }

      // Create new message
      try {
        const categoryMessage = await channel.send({ embeds: [categoryEmbed] });
        messageId = categoryMessage.id;
        console.log(`  Posted category message: ${category.name} (${messageId})`);

        // Create thread from new message
        thread = await categoryMessage.startThread({
          name: `${category.emoji} ${category.name}`,
          autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek
        });
        threadId = thread.id;
        console.log(`  Created thread: ${category.name} (${threadId})`);
      } catch (err) {
        console.error(`  Failed to create category/thread for ${category.name}:`, err);
        continue;
      }
    }

    // Save category config
    await db.run(
      'INSERT OR REPLACE INTO bot_config (key, value) VALUES (?, ?)',
      [configKey, JSON.stringify({ threadId, messageId })]
    );

    // Sync FAQs inside the thread
    for (const topic of category.topics) {
      const faq = faqsByTopic.get(topic);
      if (!faq) {
        console.log(`  Topic not found in DB: ${topic}`);
        continue;
      }

      const embed = new EmbedBuilder()
        .setTitle(faq.question)
        .setColor(0x5865F2)
        .setDescription(faq.answer)
        .setFooter({ text: `Use /faq ${faq.topic} to share this answer` });

      // Try to update existing message in thread
      if (faq.message_id) {
        try {
          const existingMessage = await thread.messages.fetch(faq.message_id);
          await existingMessage.edit({ embeds: [embed] });
          console.log(`  Updated FAQ: ${topic}`);
          totalSynced++;
          continue;
        } catch (err) {
          console.log(`  Message not found for ${topic}, searching thread...`);
        }
      }

      // Search for existing message with same title (duplicate prevention)
      try {
        const messages = await thread.messages.fetch({ limit: 50 });
        const existingMsg = messages.find(m => 
          m.author.id === client.user?.id && 
          m.embeds[0]?.title === faq.question
        );
        
        if (existingMsg) {
          // Found existing, update it and save ID
          await existingMsg.edit({ embeds: [embed] });
          await db.run(
            'UPDATE faq_entries SET message_id = ? WHERE topic = ?',
            [existingMsg.id, faq.topic]
          );
          console.log(`  Found & updated existing FAQ: ${topic}`);
          totalSynced++;
          continue;
        }
      } catch (err) {
        // Couldn't search, will create new
      }

      // Post new message in thread
      try {
        const newMessage = await thread.send({ embeds: [embed] });
        await db.run(
          'UPDATE faq_entries SET message_id = ? WHERE topic = ?',
          [newMessage.id, faq.topic]
        );
        console.log(`  Posted FAQ: ${topic}`);
        totalSynced++;
      } catch (err) {
        console.error(`  Failed to post FAQ ${topic}:`, err);
      }
    }
  }

  console.log(`✅ FAQ channel synced (${totalSynced} entries in ${FAQ_CATEGORIES.length} categories)`);
}
