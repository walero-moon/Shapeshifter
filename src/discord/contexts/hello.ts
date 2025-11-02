import { ApplicationCommandType, ContextMenuCommandBuilder } from 'discord.js';

import type { MessageContextCommand } from './_loader';

export const context: MessageContextCommand = {
  data: new ContextMenuCommandBuilder()
    .setName('Say hello')
    .setType(ApplicationCommandType.Message),
  execute: async (interaction) => {
    await interaction.reply({
      content: `👋 Hello from Shapeshifter, <@${interaction.user.id}>!`,
      ephemeral: true,
    });
  },
};
