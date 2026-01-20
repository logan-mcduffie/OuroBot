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
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [
    Partials.Message,
    Partials.Reaction,
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

  const feedsChannelId = process.env.DISCORD_GITHUB_FEEDS_CHANNEL_ID;
  const announcementsChannelId = process.env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID;

  const sendToFeeds = async (message: string) => {
    if (!feedsChannelId) return;
    const channel = await client.channels.fetch(feedsChannelId);
    if (channel && channel.isTextBased()) {
      await channel.send({ content: message });
    }
  };

  const sendToAnnouncements = async (message: string) => {
    if (!announcementsChannelId) return;
    const channel = await client.channels.fetch(announcementsChannelId);
    if (channel && channel.isTextBased()) {
      await channel.send({ content: message });
    }
  };

  try {
    // Releases → Announcements
    if (event === 'release' && payload.action === 'published') {
      await sendToAnnouncements(
        `🚀 **New Release: ${payload.release.tag_name}**\n\n${payload.release.body || 'No release notes.'}\n\n🔗 [View Release](${payload.release.html_url})`
      );
    }

    // Pushes → Feeds
    else if (event === 'push') {
      const branch = payload.ref.replace('refs/heads/', '');
      const commits = payload.commits || [];
      
      if (commits.length === 1) {
        const commit = commits[0];
        await sendToFeeds(
          `📝 **Push to \`${branch}\`**\n\`${commit.id.substring(0, 7)}\` - ${commit.message.split('\n')[0]}\n**Author:** ${commit.author.name}\n[View Commit](${commit.url})`
        );
      } else if (commits.length > 1) {
        await sendToFeeds(
          `📝 **${commits.length} commits pushed to \`${branch}\`**\n**Author:** ${commits[0].author.name}\n[View Comparison](${payload.compare})`
        );
      }
    }

    // Issues → Feeds
    else if (event === 'issues') {
      const issue = payload.issue;
      const action = payload.action;
      
      if (action === 'opened') {
        await sendToFeeds(
          `🐛 **Issue Opened:** [#${issue.number}](${issue.html_url}) ${issue.title}\n**By:** ${issue.user.login}`
        );
      } else if (action === 'closed') {
        await sendToFeeds(
          `✅ **Issue Closed:** [#${issue.number}](${issue.html_url}) ${issue.title}`
        );
      } else if (action === 'reopened') {
        await sendToFeeds(
          `🔄 **Issue Reopened:** [#${issue.number}](${issue.html_url}) ${issue.title}`
        );
      }
    }

    // Pull Requests → Feeds
    else if (event === 'pull_request') {
      const pr = payload.pull_request;
      const action = payload.action;
      
      if (action === 'opened') {
        await sendToFeeds(
          `🔀 **PR Opened:** [#${pr.number}](${pr.html_url}) ${pr.title}\n**By:** ${pr.user.login}`
        );
      } else if (action === 'closed' && pr.merged) {
        await sendToFeeds(
          `🎉 **PR Merged:** [#${pr.number}](${pr.html_url}) ${pr.title}\n**By:** ${pr.user.login}`
        );
      } else if (action === 'closed' && !pr.merged) {
        await sendToFeeds(
          `❌ **PR Closed:** [#${pr.number}](${pr.html_url}) ${pr.title}`
        );
      }
    }

    // Stars → Feeds
    else if (event === 'star' && payload.action === 'created') {
      await sendToFeeds(
        `⭐ **New Star!** ${payload.sender.login} starred the repo!\n**Total:** ${payload.repository.stargazers_count} stars`
      );
    }

    // Forks → Feeds
    else if (event === 'fork') {
      await sendToFeeds(
        `🍴 **Forked!** ${payload.sender.login} forked the repo\n[View Fork](${payload.forkee.html_url})`
      );
    }

    // Branch/Tag Created → Feeds
    else if (event === 'create') {
      if (payload.ref_type === 'branch') {
        await sendToFeeds(
          `🌿 **Branch Created:** \`${payload.ref}\`\n**By:** ${payload.sender.login}`
        );
      } else if (payload.ref_type === 'tag') {
        await sendToFeeds(
          `🏷️ **Tag Created:** \`${payload.ref}\`\n**By:** ${payload.sender.login}`
        );
      }
    }

    // Branch/Tag Deleted → Feeds
    else if (event === 'delete') {
      if (payload.ref_type === 'branch') {
        await sendToFeeds(
          `🗑️ **Branch Deleted:** \`${payload.ref}\`\n**By:** ${payload.sender.login}`
        );
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
