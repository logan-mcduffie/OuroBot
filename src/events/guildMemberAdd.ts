import { Events, GuildMember, EmbedBuilder, TextChannel } from 'discord.js';

const JOINS_LEAVES_CHANNEL_ID = process.env.DISCORD_JOINS_CHANNEL_ID!;

const MEMBER_ROLE_ID = process.env.DISCORD_MEMBER_ROLE_ID!;

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member: GuildMember, client: any) {
    // Don't process bots
    if (member.user.bot) return;

    // Auto-assign Member role
    try {
      if (MEMBER_ROLE_ID) {
        await member.roles.add(MEMBER_ROLE_ID);
        console.log(`Assigned Member role to ${member.user.tag}`);
      }
    } catch (error) {
      console.error(`Failed to assign Member role to ${member.user.tag}:`, error);
    }

    const welcomeEmbed = new EmbedBuilder()
      .setTitle('Welcome to Hytale Toolkit!')
      .setColor(0x5865F2) // Discord blurple
      .setDescription(
        `Thanks for joining the **Hytale Toolkit** community!\n\n` +
        `This server is your hub for support, updates, and discussion about the toolkit.`
      )
      .addFields(
        {
          name: 'Getting Started',
          value: 
            `**1.** Check out the [GitHub repo](https://github.com/Hytale-Toolkit/hytale-toolkit) for installation\n` +
            `**2.** Use \`/setup\` in the server for a quick start guide\n` +
            `**3.** Browse the <#${process.env.DISCORD_FAQ_CHANNEL_ID}> channel for common questions`
        },
        {
          name: 'Need Help?',
          value: 
            `Head to <#${process.env.DISCORD_SUPPORT_CHANNEL_ID}> and use the \`/support\` command to open a ticket.\n` +
            `**Pro tip:** Have your \`setup.log\` file ready - we can't help without it!`
        },
        {
          name: 'Stay Updated',
          value: 
            `<#${process.env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID}> - New releases and important news\n` +
            `<#${process.env.DISCORD_GITHUB_FEEDS_CHANNEL_ID}> - Live commit feed`
        }
      )
      .setFooter({ text: 'Hytale Toolkit Support' })
      .setTimestamp();

    try {
      const channel = await client.channels.fetch(JOINS_LEAVES_CHANNEL_ID) as TextChannel;
      if (channel && channel.isTextBased()) {
        await channel.send({ 
          content: `Welcome <@${member.id}>!`,
          embeds: [welcomeEmbed] 
        });
        console.log(`Welcomed ${member.user.tag} in joins/leaves channel`);
      }
    } catch (error) {
      console.error(`Failed to send welcome message for ${member.user.tag}:`, error);
    }
  },
};
