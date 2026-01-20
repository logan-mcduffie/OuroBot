import { EmbedBuilder, Message, TextChannel, ThreadChannel } from 'discord.js';

// Pattern to identify Hytale Toolkit logs
const LOG_HEADER_PATTERN = /=== (setup|hytale-rag) started ===/;
const LOG_LINE_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \[(INFO|DEBUG|WARNING|ERROR)\]/m;

// Error patterns and their solutions
const ERROR_PATTERNS = [
  {
    name: 'Ollama Connection Refused',
    pattern: /ECONNREFUSED.*11434|connect ECONNREFUSED 127\.0\.0\.1:11434/i,
    solution: `**Ollama isn't running.**

Start the Ollama service:
- **Windows:** Launch the Ollama application from the Start menu
- **macOS/Linux:** Run \`ollama serve\` in a terminal

Then try again.`
  },
  {
    name: 'Ollama Not Found',
    pattern: /FileNotFoundError.*ollama|ollama.*ENOENT|'ollama' is not recognized/i,
    solution: `**Ollama is not installed or not in PATH.**

1. Download and install Ollama from [ollama.ai](https://ollama.ai/)
2. Restart your terminal after installation
3. Verify with: \`ollama --version\``
  },
  {
    name: 'Ollama Model Not Found',
    pattern: /model.*not found|pull.*model|Error: model '.*' not found/i,
    solution: `**The required Ollama model isn't downloaded.**

Pull the embedding model:
\`\`\`bash
ollama pull nomic-embed-text
\`\`\`

This may take a few minutes depending on your connection.`
  },
  {
    name: 'Java Version Too Old',
    pattern: /java version "?(1\.|[0-9]|1[0-9]|2[0-3])[\."]/i,
    solution: `**Your Java version is too old.** The toolkit requires Java 24+.

1. Download Java 24+ from [Adoptium](https://adoptium.net/)
2. During installation, check "Add to PATH"
3. Restart your terminal
4. Verify with: \`java -version\``
  },
  {
    name: 'Java Not Found',
    pattern: /java.*ENOENT|'java' is not recognized|java: command not found/i,
    solution: `**Java is not installed or not in PATH.**

1. Download Java 24+ from [Adoptium](https://adoptium.net/)
2. During installation, check "Add to PATH"
3. Restart your terminal
4. Verify with: \`java -version\``
  },
  {
    name: 'Python Version Too Old',
    pattern: /Python 3\.[0-9]\./,
    solution: `**Your Python version is too old.** The toolkit requires Python 3.10+.

1. Download Python 3.10+ from [python.org](https://www.python.org/downloads/)
2. During installation, check "Add to PATH"
3. Restart your terminal
4. Verify with: \`python --version\``
  },
  {
    name: 'VoyageAI Unauthorized',
    pattern: /401.*voyage|voyage.*unauthorized|Invalid API key.*voyage/i,
    solution: `**Your VoyageAI API key is invalid or not set.**

1. Get your API key from [VoyageAI](https://www.voyageai.com/)
2. Run setup again and enter the correct key
3. Or set the environment variable: \`VOYAGE_API_KEY=your_key_here\``
  },
  {
    name: 'VoyageAI Rate Limited',
    pattern: /429.*voyage|voyage.*rate.?limit|Too many requests.*voyage/i,
    solution: `**VoyageAI rate limit hit.**

Options:
1. **Wait a few minutes** and try again
2. **Add payment info** to your VoyageAI account (removes rate limits, still free up to 200M tokens)
3. **Switch to Ollama** for unlimited local embeddings (run setup again)`
  },
  {
    name: 'VoyageAI Not Configured',
    pattern: /VOYAGE_API_KEY.*not set|Missing.*VOYAGE_API_KEY|voyage.*api.*key.*required/i,
    solution: `**VoyageAI API key not configured.**

1. Get your API key from [VoyageAI](https://www.voyageai.com/)
2. Run the setup wizard again: \`python setup.py\`
3. Select VoyageAI and enter your key when prompted`
  },
  {
    name: 'Hytale Path Not Found',
    pattern: /ENOENT.*hytale|Hytale.*not found|Invalid.*installation.*missing/i,
    solution: `**Hytale installation not found.**

1. Make sure Hytale is installed via the official launcher
2. Default location: \`%APPDATA%\\Hytale\\install\\release\\package\\game\\latest\`
3. Run setup again and enter the correct path when prompted`
  },
  {
    name: 'Node.js Not Found',
    pattern: /node.*ENOENT|'node' is not recognized|node: command not found/i,
    solution: `**Node.js is not installed or not in PATH.**

1. Download Node.js 18+ from [nodejs.org](https://nodejs.org/) (LTS version)
2. Restart your terminal after installation
3. Verify with: \`node --version\``
  },
  {
    name: 'npm Not Found',
    pattern: /npm.*ENOENT|'npm' is not recognized|npm: command not found/i,
    solution: `**npm is not installed or not in PATH.**

npm comes with Node.js. Reinstall Node.js:
1. Download from [nodejs.org](https://nodejs.org/) (LTS version)
2. Restart your terminal
3. Verify with: \`npm --version\``
  },
  {
    name: 'Database Not Found',
    pattern: /Database.*not found|lancedb.*not found|vector.*store.*missing/i,
    solution: `**The vector database is missing.**

Run setup again and select "Yes" when asked to download the database:
\`\`\`bash
python setup.py
\`\`\`

Or re-download manually by deleting the \`data\` folder and running setup.`
  }
];

/**
 * Check if text content is a Hytale Toolkit log
 */
export function isHytaleLog(content: string): boolean {
  return LOG_HEADER_PATTERN.test(content) || LOG_LINE_PATTERN.test(content);
}

/**
 * Detect errors in log content and return matches
 */
export function detectErrors(content: string): Array<{ name: string; solution: string }> {
  const matches: Array<{ name: string; solution: string }> = [];
  
  for (const errorPattern of ERROR_PATTERNS) {
    if (errorPattern.pattern.test(content)) {
      matches.push({
        name: errorPattern.name,
        solution: errorPattern.solution
      });
    }
  }
  
  return matches;
}

// Track recently processed messages to prevent duplicates
const processedMessages = new Set<string>();

/**
 * Process a message in a support thread for auto-error detection
 */
export async function processMessageForErrors(message: Message): Promise<void> {
  // Only process in threads
  if (!message.channel.isThread()) return;
  
  // Only process in support threads
  const thread = message.channel as ThreadChannel;
  const supportChannelId = process.env.DISCORD_SUPPORT_CHANNEL_ID;
  if (thread.parentId !== supportChannelId) return;
  
  // Don't process bot messages
  if (message.author.bot) return;
  
  // Don't process if this is a reply to a bot message (prevents loops from quote previews)
  if (message.reference?.messageId) {
    try {
      const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);
      if (referencedMessage.author.bot) return;
    } catch (err) {
      // Couldn't fetch referenced message, continue anyway
    }
  }
  
  // Prevent duplicate processing
  if (processedMessages.has(message.id)) return;
  processedMessages.add(message.id);
  
  // Clean up old entries after 1 minute
  setTimeout(() => processedMessages.delete(message.id), 60000);
  
  let contentToScan = message.content;
  
  // Also check attachments for .log files
  for (const attachment of message.attachments.values()) {
    if (attachment.name?.endsWith('.log') || attachment.contentType?.includes('text')) {
      try {
        const response = await fetch(attachment.url);
        const text = await response.text();
        contentToScan += '\n' + text;
      } catch (err) {
        console.error('Failed to fetch attachment:', err);
      }
    }
  }
  
  // Check if this looks like a Hytale Toolkit log
  if (!isHytaleLog(contentToScan)) return;
  
  // Detect errors
  const errors = detectErrors(contentToScan);
  if (errors.length === 0) return;
  
  // Build response embed
  const embed = new EmbedBuilder()
    .setTitle('🤖 Detected Issue' + (errors.length > 1 ? 's' : ''))
    .setColor(0xFFA500)
    .setDescription('I found the following issue' + (errors.length > 1 ? 's' : '') + ' in your log:')
    .setFooter({ text: 'Did this resolve your issue? React with ✅ or ❌' });
  
  for (const error of errors.slice(0, 3)) { // Limit to 3 errors
    embed.addFields({
      name: `⚠️ ${error.name}`,
      value: error.solution
    });
  }
  
  if (errors.length > 3) {
    embed.addFields({
      name: '\u200B',
      value: `*...and ${errors.length - 3} more issue(s). Fix the above first.*`
    });
  }
  
  const reply = await message.reply({ embeds: [embed] });
  
  // Add reaction options
  await reply.react('✅');
  await reply.react('❌');
}
