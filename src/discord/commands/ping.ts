import { SlashCommandBuilder } from 'discord.js';

import type { SlashCommand } from './_loader';

export const command: SlashCommand = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Check if the bot is responsive.'),
  execute: async (interaction) => {
    await interaction.reply({ content: 'Pong! 🏓', ephemeral: true });
  },
};
