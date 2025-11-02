import { ApplicationCommandType, ContextMenuCommandBuilder } from 'discord.js';

import type { MessageContextCommand } from './types';

const command: MessageContextCommand = {
  data: new ContextMenuCommandBuilder()
    .setName('Hello')
    .setType(ApplicationCommandType.Message),
  execute: async (interaction) => {
    const targetAuthor = interaction.targetMessage.author?.tag ?? 'there';

    await interaction.reply({
      content: `👋 Hello, ${targetAuthor}!`,
      ephemeral: true,
    });
  },
};

export default command;
