import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../types';

const LINE = '\u200B';

const setupCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Get step-by-step instructions for setting up the Hytale Toolkit'),

  execute: async (interaction) => {
    const embed = new EmbedBuilder()
      .setTitle('Hytale Toolkit Setup Guide')
      .setColor(0x00FF99)
      .setDescription(`Follow these steps to get the Hytale Toolkit up and running.\n${LINE}`)
      .addFields(
        { name: 'Step 1: Prerequisites', value: 
`\u200B
Make sure you have the following:
- **GitHub Account** - [Sign up](https://github.com/signup)
- **Git** - [Download](https://git-scm.com/downloads)
- **Python 3.10+** - [Download](https://www.python.org/downloads/)
${LINE}` 
        },
        { name: 'Step 2: Open a Terminal', value: 
`\u200B
**Windows:** Press \`Win + R\`, type \`cmd\`, and press Enter
**macOS:** Press \`Cmd + Space\`, type \`Terminal\`, and press Enter
**Linux:** Press \`Ctrl + Alt + T\`

Navigate to where you want to install (e.g. Documents):
\`\`\`bash
cd Documents
\`\`\`${LINE}` 
        },
        { name: 'Step 3: Clone the Repository', value: 
`\u200B
Copy and paste this command, then press Enter:
\`\`\`bash
git clone https://github.com/logan-mcduffie/Hytale-Toolkit.git
\`\`\`
Then enter the folder:
\`\`\`bash
cd Hytale-Toolkit
\`\`\`${LINE}` 
        },
        { name: 'Step 4: Run Setup', value: 
`\u200B
Copy and paste this command, then press Enter:
\`\`\`bash
python hytale-rag/setup.py
\`\`\`The install wizard will guide you through the rest.
${LINE}` 
        },
        { name: '❓ Need More Help?', value: 
`Check https://discord.com/channels/1462988917560053935/1463208771496050710 for common issues, or use \`/support\` if you're stuck after completing setup.

Check out the repo: https://github.com/logan-mcduffie/Hytale-Toolkit` }
      );

    await interaction.reply({ embeds: [embed] });
  }
};

export default setupCommand;
