import { getDb } from './db';

const initialFaqs = [
  {
    topic: 'ollama',
    question: 'Ollama Connection Issues',
    answer: `**Ollama Connection Issues**

Make sure the Ollama service is running:
- **macOS/Linux:** Run \`ollama serve\` in a terminal
- **Windows:** Start the Ollama application from the start menu

If you see \`ECONNREFUSED 127.0.0.1:11434\`, Ollama isn't running.

**Common fixes:**
1. Restart the Ollama application
2. Make sure no other service is using port 11434
3. Try running \`ollama list\` to verify it's installed correctly

Still stuck? Use \`/support\` to open a thread.`,
    sass_level: 1
  },
  {
    topic: 'java',
    question: 'Java Version Requirements',
    answer: `**Java Version Requirements**

The Hytale Toolkit requires **Java 24 or higher**.

**Check your version:**
\`\`\`bash
java -version
\`\`\`

**Installation:**
Download from [Adoptium](https://adoptium.net/) - select the latest LTS version (24+).

**Windows users:** Make sure to check "Add to PATH" during installation.

**Multiple Java versions?** The toolkit will try to find the correct one, but you may need to set \`JAVA_HOME\` environment variable.`,
    sass_level: 1
  },
  {
    topic: 'path',
    question: 'Hytale Installation Path',
    answer: `**Hytale Installation Path**

The toolkit needs to know where Hytale is installed to read game files.

**Default locations:**
- **Windows:** \`%APPDATA%\\Hytale\\install\\release\\package\\game\\latest\`
- **macOS:** \`~/Library/Application Support/Hytale\`
- **Linux:** \`~/.local/share/Hytale\`

The setup wizard will try to auto-detect this. If it fails, you'll be prompted to enter the path manually.

**Can't find Hytale?** Make sure you've downloaded and installed Hytale from the official launcher first.`,
    sass_level: 1
  },
  {
    topic: 'voyageai',
    question: 'VoyageAI API Issues',
    answer: `**VoyageAI API Issues**

VoyageAI is a cloud-based embedding provider (alternative to Ollama).

**API Key Setup:**
1. Get your API key from [VoyageAI](https://www.voyageai.com/)
2. Set it in your environment: \`VOYAGE_API_KEY=your_key_here\`
3. Or enter it when prompted during setup

**Common errors:**
- \`401 Unauthorized\` - Your API key is invalid or not set
- \`429 Rate Limit\` - Add payment info to remove rate limits (you won't be charged unless you exceed the free tier)

**Free tier is very generous:** 200 million tokens free. Adding payment info removes rate limiting entirely - you still won't be charged unless you exceed the free tier.

**Don't want to add payment info?** Use Ollama instead for unlimited local embeddings with no account required.`,
    sass_level: 1
  },
  {
    topic: 'embeddings',
    question: 'Embedding Providers',
    answer: `**Embedding Providers**

The toolkit uses embeddings to search and understand Hytale documentation. You need ONE of these providers:

**Option 1: Ollama (Recommended)**
- Runs locally, free, unlimited usage
- Requires ~4GB disk space
- Setup: Install [Ollama](https://ollama.ai/), then run \`ollama pull nomic-embed-text\`

**Option 2: VoyageAI**
- Cloud-based, requires API key
- Faster on low-end hardware
- Has usage limits on free tier

**Switching providers:**
Run the setup wizard again and select a different provider when prompted.`,
    sass_level: 1
  },
  {
    topic: 'python',
    question: 'Python Requirements',
    answer: `**Python Requirements**

The toolkit requires **Python 3.10 or higher**.

**Check your version:**
\`\`\`bash
python --version
\`\`\`

**Installation:**
- **Windows:** Download from [python.org](https://www.python.org/downloads/). Check "Add to PATH" during install.
- **macOS:** \`brew install python\` or download from python.org
- **Linux:** \`sudo apt install python3\` (Ubuntu/Debian)

**Common issues:**
- \`python not found\` - Use \`python3\` instead, or fix your PATH
- \`pip not found\` - Run \`python -m ensurepip --upgrade\`
- Permission errors - Don't use \`sudo pip\`, use \`pip install --user\` instead`,
    sass_level: 1
  },
  {
    topic: 'node',
    question: 'Node.js Requirements',
    answer: `**Node.js Requirements**

The MCP server requires **Node.js 18 or higher**.

**Check your version:**
\`\`\`bash
node --version
\`\`\`

**Installation:**
- **Windows/macOS:** Download from [nodejs.org](https://nodejs.org/) (LTS version)
- **Linux:** Use [NodeSource](https://github.com/nodesource/distributions) or your package manager

**Verify npm is also installed:**
\`\`\`bash
npm --version
\`\`\`

**Common issues:**
- Old Node version - Uninstall and reinstall the latest LTS
- \`npm EACCES\` errors - Fix permissions or use [nvm](https://github.com/nvm-sh/nvm)`,
    sass_level: 1
  },
  {
    topic: 'mcp',
    question: 'MCP Server Configuration',
    answer: `**MCP Server Configuration**

MCP (Model Context Protocol) connects your AI assistant to the Hytale Toolkit.

**After running setup, you need to configure your IDE:**

1. The setup wizard generates a config snippet for you
2. Copy it to your IDE's MCP config file (see \`/faq vscode\` or \`/faq claude\`)
3. Restart your IDE

**Testing the connection:**
Ask your AI assistant: "What Hytale blocks are available?"

**Common issues:**
- \`spawn ENOENT\` - Node.js not in PATH, or wrong path in config
- \`Connection refused\` - MCP server not running, check the path in your config
- No response - Make sure the config JSON is valid (no trailing commas)`,
    sass_level: 1
  },
  {
    topic: 'vscode',
    question: 'VS Code Setup',
    answer: `**VS Code MCP Setup**

**Prerequisites:**
- VS Code with GitHub Copilot extension
- Copilot Chat enabled

**Configuration:**
1. Open VS Code Settings (Ctrl+,)
2. Search for "mcp"
3. Click "Edit in settings.json"
4. Add the MCP server config from the setup wizard

**Config location:** 
\`%APPDATA%\\Code\\User\\settings.json\` (Windows)
\`~/.config/Code/User/settings.json\` (Linux)
\`~/Library/Application Support/Code/User/settings.json\` (macOS)

**After adding config:**
1. Restart VS Code
2. Open Copilot Chat
3. You should see the Hytale Toolkit tools available`,
    sass_level: 1
  },
  {
    topic: 'claude',
    question: 'Claude Desktop Setup',
    answer: `**Claude Desktop MCP Setup**

**Configuration:**
1. Open Claude Desktop
2. Go to Settings > Developer > MCP Servers
3. Click "Edit Config"
4. Add the MCP server config from the setup wizard
5. Save and restart Claude Desktop

**Config file location:**
- **Windows:** \`%APPDATA%\\Claude\\claude_desktop_config.json\`
- **macOS:** \`~/Library/Application Support/Claude/claude_desktop_config.json\`

**Example config structure:**
\`\`\`json
{
  "mcpServers": {
    "hytale-toolkit": {
      "command": "node",
      "args": ["/path/to/hytale-toolkit/mcp/index.js"]
    }
  }
}
\`\`\`

**After adding config:** Restart Claude Desktop and ask about Hytale to test.`,
    sass_level: 1
  },
  {
    topic: 'rag',
    question: 'What is RAG?',
    answer: `**What is RAG (Retrieval Augmented Generation)?**

RAG is the technique that makes this toolkit actually useful.

**The Librarian Analogy:**
Without RAG, an AI answering your question is like reading through *every book on every shelf* in a library trying to find the right information. Slow, wasteful, and you'd run out of time (context window) before finding what you need.

**RAG is like having a librarian.** The librarian knows every shelf, every book, and the contents of each one. When you ask a question, they go grab exactly the relevant pages and hand them to you.

That's what this toolkit does - it's the librarian for Hytale documentation.

**In practice:**
1. You ask Claude/Copilot: "How do I create a custom block?"
2. The toolkit (librarian) searches its database for relevant Hytale docs
3. It hands those docs to the AI along with your question
4. The AI gives you an accurate answer based on real documentation

**How it actually works:**
When you ask a question, the toolkit translates your request into numbers (vectors/embeddings). It then compares those numbers against every piece of documentation in its database, finds the closest matches, and retrieves them. That's why you need Ollama or VoyageAI - they do this translation.

**Why this matters:**
- AI models don't know anything about Hytale modding - they weren't trained on it
- Without RAG, they'd just hallucinate or say "I don't know"
- With RAG, they get the exact info they need to help you

**TL;DR:** RAG = your AI gets a librarian. Ask questions naturally, get accurate answers.`,
    sass_level: 1
  },
  {
    topic: 'notllm',
    question: 'Ollama/Voyage are NOT the AI!',
    answer: `**Wait, I set up Ollama/Voyage... now what?**

This is the #1 point of confusion, so let's clear it up:

**Ollama and VoyageAI are NOT your AI assistant.**

They are **embedding providers** - they help the toolkit *search* documentation. They don't answer your questions.

**Here's what you actually need:**

| Component | What it does | Examples |
|-----------|--------------|----------|
| **Embedding Provider** | Searches docs | Ollama, VoyageAI |
| **AI Assistant** | Answers questions | Claude, GitHub Copilot, ChatGPT |
| **MCP Connection** | Connects them together | The config you copy to your IDE |

**The flow:**
1. You ask Claude/Copilot a question about Hytale
2. The MCP server uses Ollama/Voyage to search relevant docs
3. Those docs get sent to Claude/Copilot
4. Claude/Copilot answers your question using those docs

**So after running setup, you need to:**
1. Copy the MCP config to your IDE (see \`/faq vscode\` or \`/faq claude\`)
2. Restart your IDE
3. Ask your AI assistant about Hytale!

**Don't have an AI assistant?**
- **Free:** Claude Desktop, VS Code + GitHub Copilot (free tier)
- **Paid:** Claude Pro, Copilot Pro, Cursor

The toolkit is useless without an AI assistant to talk to. Ollama/Voyage just make the AI smarter about Hytale.`,
    sass_level: 2
  }
];

export const seedFaqs = async () => {
  const db = await getDb();
  
  for (const faq of initialFaqs) {
    // Use UPSERT to preserve message_id when updating existing entries
    await db.run(
      `INSERT INTO faq_entries (topic, question, answer, sass_level) 
       VALUES (?, ?, ?, ?)
       ON CONFLICT(topic) DO UPDATE SET
         question = excluded.question,
         answer = excluded.answer,
         sass_level = excluded.sass_level`,
      [faq.topic, faq.question, faq.answer, faq.sass_level]
    );
  }
  
  console.log('✅ FAQs seeded');
};
