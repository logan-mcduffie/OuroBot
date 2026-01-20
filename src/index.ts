import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import express from 'express';
import bodyParser from 'body-parser';
import { initDb } from './database/db';

dotenv.config();

// Initialize Client
const client: any = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();

// Load Commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const command = require(filePath);
  if ('data' in command.default && 'execute' in command.default) {
    client.commands.set(command.default.data.name, command.default);
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

// Load Events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args: any[]) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args: any[]) => event.execute(...args, client));
  }
}

// Initialize Database
initDb();

// Login
client.login(process.env.DISCORD_BOT_TOKEN);

// --- Express Server for Webhooks ---
const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

app.post('/webhook/github', async (req: any, res: any) => {
  const event = req.headers['x-github-event'];
  const payload = req.body;

  if (!event || !payload) {
    return res.status(400).send('Invalid request');
  }

  try {
    if (event === 'release' && payload.action === 'published') {
      const channelId = process.env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID;
      if (channelId) {
        const channel = await client.channels.fetch(channelId);
        if (channel && channel.isTextBased()) {
          await channel.send({
            content: `🚀 **New Release: ${payload.release.tag_name}**\n\n${payload.release.body}\n\n🔗 [View Release](${payload.release.html_url})`
          });
        }
      }
    } else if (event === 'push' && payload.ref === 'refs/heads/main') {
        const channelId = process.env.DISCORD_GITHUB_FEEDS_CHANNEL_ID;
        if (channelId) {
            const channel = await client.channels.fetch(channelId);
            if (channel && channel.isTextBased()) {
                const commit = payload.commits[0];
                if (commit) {
                    await channel.send({
                        content: `📝 **New Commit to main**\n\`${commit.id.substring(0, 7)}\` - ${commit.message}\n**Author:** ${commit.author.name}\n[View Commit](${commit.url})`
                    });
                }
            }
        }
    }
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error processing webhook');
  }
});

app.listen(PORT, () => {
  console.log(`🌍 Webhook server listening on port ${PORT}`);
});
