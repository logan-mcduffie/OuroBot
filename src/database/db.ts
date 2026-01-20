import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

let db: Database | null = null;

export const initDb = async () => {
  if (db) return db;

  db = await open({
    filename: './bot.db',
    driver: sqlite3.Database
  });

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS support_threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS faq_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic TEXT UNIQUE NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      sass_level INTEGER DEFAULT 1,
      message_id TEXT
    );

    CREATE TABLE IF NOT EXISTS bot_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Migration: Add message_id column to faq_entries if it doesn't exist
  const faqColumns = await db.all("PRAGMA table_info(faq_entries)");
  const hasMessageId = faqColumns.some((col: any) => col.name === 'message_id');
  if (!hasMessageId) {
    await db.exec('ALTER TABLE faq_entries ADD COLUMN message_id TEXT');
    console.log('✅ Migrated faq_entries: added message_id column');
  }

  // Migration: Add stale thread management columns to support_threads
  const threadColumns = await db.all("PRAGMA table_info(support_threads)");
  const hasLastActivity = threadColumns.some((col: any) => col.name === 'last_activity_at');
  if (!hasLastActivity) {
    await db.exec('ALTER TABLE support_threads ADD COLUMN last_activity_at DATETIME');
    // Backfill existing rows with created_at value
    await db.exec('UPDATE support_threads SET last_activity_at = created_at WHERE last_activity_at IS NULL');
    console.log('✅ Migrated support_threads: added last_activity_at column');
  }
  const hasReminderSent = threadColumns.some((col: any) => col.name === 'reminder_sent_at');
  if (!hasReminderSent) {
    await db.exec('ALTER TABLE support_threads ADD COLUMN reminder_sent_at DATETIME');
    console.log('✅ Migrated support_threads: added reminder_sent_at column');
  }
  
  // Ensure any NULL last_activity_at values are populated (safety net)
  await db.exec('UPDATE support_threads SET last_activity_at = created_at WHERE last_activity_at IS NULL');

  console.log('✅ Database initialized');
  return db;
};

export const getDb = async () => {
  if (!db) await initDb();
  return db!;
};
