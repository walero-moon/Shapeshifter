import { SlashCommandBuilder } from 'discord.js';

import type { SlashCommand } from './types';

const command: SlashCommand = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
  execute: async (interaction) => {
    await interaction.reply({
      content: '🏓 Pong! Shapeshifter is online.',
      ephemeral: true,
    });
  },
};

export default command;
