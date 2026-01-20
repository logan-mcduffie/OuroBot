import { Client, EmbedBuilder, TextChannel, ThreadChannel } from 'discord.js';
import { getDb } from '../database/db';

const REMINDER_DAYS = 3;
const AUTO_CLOSE_DAYS = 5;
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

let intervalId: NodeJS.Timeout | null = null;

interface StaleThread {
  id: number;
  thread_id: string;
  user_id: string;
  title: string;
  status: string;
  created_at: string;
  last_activity_at: string;
  reminder_sent_at: string | null;
}

/**
 * Updates the last activity timestamp for a thread
 */
export const updateThreadActivity = async (threadId: string): Promise<void> => {
  const db = await getDb();
  await db.run(
    'UPDATE support_threads SET last_activity_at = CURRENT_TIMESTAMP WHERE thread_id = ? AND status = ?',
    [threadId, 'open']
  );
};

/**
 * Sends a reminder to a stale thread
 */
const sendStaleReminder = async (client: Client, thread: StaleThread): Promise<boolean> => {
  try {
    const channel = await client.channels.fetch(thread.thread_id) as ThreadChannel;
    if (!channel || !channel.isThread()) return false;

    const reminderEmbed = new EmbedBuilder()
      .setTitle('Thread Inactive')
      .setColor(0xFEE75C) // Discord yellow/warning
      .setDescription(
        `Hey <@${thread.user_id}>, this support thread has been inactive for **${REMINDER_DAYS} days**.\n\n` +
        `If your issue is resolved, please use \`/resolve\` to close this thread.\n\n` +
        `If you still need help, please reply with an update on your situation.\n\n` +
        `**This thread will be automatically closed in ${AUTO_CLOSE_DAYS - REMINDER_DAYS} days if there's no activity.**`
      )
      .setFooter({ text: 'Stale thread reminder' })
      .setTimestamp();

    await channel.send({ embeds: [reminderEmbed] });

    // Update database to mark reminder as sent
    const db = await getDb();
    await db.run(
      'UPDATE support_threads SET reminder_sent_at = CURRENT_TIMESTAMP WHERE thread_id = ?',
      [thread.thread_id]
    );

    console.log(`Sent stale reminder for thread: ${thread.title} (${thread.thread_id})`);
    return true;
  } catch (error) {
    console.error(`Failed to send reminder for thread ${thread.thread_id}:`, error);
    return false;
  }
};

/**
 * Auto-closes a very stale thread
 */
const autoCloseThread = async (client: Client, thread: StaleThread): Promise<boolean> => {
  try {
    const channel = await client.channels.fetch(thread.thread_id) as ThreadChannel;
    if (!channel || !channel.isThread()) {
      // Thread doesn't exist anymore, mark as resolved in DB
      const db = await getDb();
      await db.run(
        'UPDATE support_threads SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE thread_id = ?',
        ['resolved', thread.thread_id]
      );
      return true;
    }

    // Send closure message
    const closeEmbed = new EmbedBuilder()
      .setTitle('Thread Auto-Closed')
      .setColor(0x5865F2) // Discord blurple
      .setDescription(
        `This support thread has been automatically closed due to **${AUTO_CLOSE_DAYS} days of inactivity**.\n\n` +
        `If you still need help with this issue, please create a new support request using \`/support\`.`
      )
      .setFooter({ text: 'Auto-closed due to inactivity' })
      .setTimestamp();

    await channel.send({ embeds: [closeEmbed] });

    // Update thread name to show it's closed (hourglass emoji for auto-closed)
    const currentName = channel.name;
    let newName = currentName;
    if (currentName.startsWith('📋')) {
      newName = currentName.replace('📋', '⏳');
    } else if (!currentName.startsWith('⏳') && !currentName.startsWith('✅')) {
      newName = `⏳ ${currentName}`;
    }
    await channel.setName(newName);

    // Update the starter message embed if possible
    try {
      const starterMessage = await channel.fetchStarterMessage();
      if (starterMessage && starterMessage.embeds.length > 0) {
        const oldEmbed = starterMessage.embeds[0];
        const closedEmbed = EmbedBuilder.from(oldEmbed)
          .setColor(0x5865F2) // Discord blurple for auto-closed
          .setFooter({ text: 'Auto-closed due to inactivity' });
        await starterMessage.edit({ embeds: [closedEmbed] });
      }
    } catch (err) {
      // Starter message might not be accessible, that's okay
    }

    // Update database
    const db = await getDb();
    await db.run(
      'UPDATE support_threads SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE thread_id = ?',
      ['auto-closed', thread.thread_id]
    );

    // Archive the thread
    setTimeout(async () => {
      try {
        await channel.setArchived(true);
      } catch (err) {
        console.error('Failed to archive auto-closed thread:', err);
      }
    }, 3000);

    console.log(`Auto-closed stale thread: ${thread.title} (${thread.thread_id})`);
    return true;
  } catch (error) {
    console.error(`Failed to auto-close thread ${thread.thread_id}:`, error);
    return false;
  }
};

/**
 * Checks for stale threads and processes them
 */
export const checkStaleThreads = async (client: Client): Promise<void> => {
  console.log('Checking for stale support threads...');
  
  const db = await getDb();
  
  // Get all open threads
  const openThreads = await db.all<StaleThread[]>(
    'SELECT * FROM support_threads WHERE status = ?',
    ['open']
  );

  if (openThreads.length === 0) {
    console.log('No open threads to check');
    return;
  }

  const now = new Date();
  let remindersSet = 0;
  let threadsClosed = 0;

  for (const thread of openThreads) {
    const lastActivity = new Date(thread.last_activity_at || thread.created_at);
    const daysSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);

    // Check for auto-close (5+ days)
    if (daysSinceActivity >= AUTO_CLOSE_DAYS) {
      const success = await autoCloseThread(client, thread);
      if (success) threadsClosed++;
      continue;
    }

    // Check for reminder (3+ days, no reminder sent yet)
    if (daysSinceActivity >= REMINDER_DAYS && !thread.reminder_sent_at) {
      const success = await sendStaleReminder(client, thread);
      if (success) remindersSet++;
    }
  }

  console.log(`Stale thread check complete: ${remindersSet} reminders sent, ${threadsClosed} threads auto-closed`);
};

/**
 * Starts the periodic stale thread checker
 */
export const startStaleThreadManager = (client: Client): void => {
  if (intervalId) {
    console.log('Stale thread manager already running');
    return;
  }

  // Run immediately on startup
  checkStaleThreads(client);

  // Then run every hour
  intervalId = setInterval(() => {
    checkStaleThreads(client);
  }, CHECK_INTERVAL_MS);

  console.log('Stale thread manager started (checking every hour)');
};

/**
 * Stops the periodic stale thread checker
 */
export const stopStaleThreadManager = (): void => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('Stale thread manager stopped');
  }
};
