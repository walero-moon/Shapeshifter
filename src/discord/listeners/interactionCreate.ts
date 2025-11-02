import { Events, type Client, type RepliableInteraction } from 'discord.js';

import type { SlashCommand } from '../commands/types';
import type { MessageContextCommand } from '../contexts/types';
import { logger } from '../../utils/logger';

const sendErrorReply = async (interaction: RepliableInteraction, message: string) => {
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({ content: message, ephemeral: true });
    return;
  }

  await interaction.reply({ content: message, ephemeral: true });
};

export const registerInteractionCreateListener = (
  client: Client,
  slashCommands: Map<string, SlashCommand>,
  contextCommands: Map<string, MessageContextCommand>,
) => {
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const command = slashCommands.get(interaction.commandName);

        if (!command) {
          logger.warn(`Received unknown slash command: ${interaction.commandName}`);
          await sendErrorReply(interaction, 'This command is not available.');
          return;
        }

        await command.execute(interaction);
        return;
      }

      if (interaction.isMessageContextMenuCommand()) {
        const command = contextCommands.get(interaction.commandName);

        if (!command) {
          logger.warn(`Received unknown context command: ${interaction.commandName}`);
          await sendErrorReply(interaction, 'This context action is not available.');
          return;
        }

        await command.execute(interaction);
      }
    } catch (error) {
      logger.error('Failed to handle interaction', error);

      if (interaction.isRepliable()) {
        await sendErrorReply(interaction, 'Something went wrong while executing this command.');
      }
    }
  });
};
