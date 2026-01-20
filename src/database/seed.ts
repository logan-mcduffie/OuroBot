import { getDb } from './db';

const initialFaqs = [
  {
    topic: 'ollama',
    question: 'Ollama Connection Issues',
    answer: '**Ollama Connection Issues**\n\nMake sure the Ollama service is running:\n- **macOS/Linux:** Run `ollama serve` in a terminal\n- **Windows:** Start the Ollama application from the start menu.\n\nStill stuck? Use `/support` to open a thread.',
    sass_level: 2
  },
  {
    topic: 'java',
    question: 'Java Version Requirements',
    answer: '**Java Version Requirements**\n\nHytale requires Java 21+. We recommend creating a mod using our tool which will automatically handle the java setup for you. If you need to install it manually, download from [Adoptium](https://adoptium.net/).',
    sass_level: 1
  },
  {
    topic: 'path',
    question: 'Hytale Installation Path',
    answer: '**Hytale Installation Path**\n\nOn Windows, the default path is usually `C:\\Program Files (x86)\\Hytale` or `%LOCALAPPDATA%\\Hytale`. \n\nOur toolkit tries to auto-detect this, but if it fails, you may need to set it manually in your config.',
    sass_level: 1
  }
];

export const seedFaqs = async () => {
  const db = await getDb();
  
  for (const faq of initialFaqs) {
    await db.run(
      `INSERT OR IGNORE INTO faq_entries (topic, question, answer, sass_level) VALUES (?, ?, ?, ?)`,
      [faq.topic, faq.question, faq.answer, faq.sass_level]
    );
  }
  
  console.log('✅ FAQs seeded');
};
