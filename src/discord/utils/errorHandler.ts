import { Interaction, MessageFlags } from 'discord.js';
import { logger } from '../../utils/logger';

export interface ErrorHandlerOptions {
    interaction: Interaction;
    error: any;
    customMessage?: string;
    silent?: boolean; // For errors like "Unknown interaction" where we don't want to reply
}

export const handleInteractionError = async ({
    interaction,
    error,
    customMessage = 'Something went wrong while handling that interaction. Please try again later.',
    silent = false,
}: ErrorHandlerOptions) => {
    // Log the error
    logger.error('Error while handling interaction', {
        error: error.message || error,
        interactionType: interaction.type,
        commandName: interaction.isCommand() ? interaction.commandName : undefined,
        customId: interaction.isMessageComponent() || interaction.isModalSubmit() ? interaction.customId : undefined,
        userId: interaction.user.id,
        guildId: interaction.guild?.id,
    });

    // Check if it's an "Unknown interaction" error (DiscordAPIError[10062])
    if (error.code === 10062) {
        // Silently log and do nothing to prevent crashes
        logger.warn('Unknown interaction encountered, skipping reply');
        return;
    }

    // If silent is true, don't reply
    if (silent) {
        return;
    }

    // Try to reply if the interaction is repliable and hasn't been replied to or deferred
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        try {
            await interaction.reply({
                content: customMessage,
                flags: MessageFlags.Ephemeral,
            });
        } catch (replyError: any) {
            // If replying fails (e.g., interaction expired), log and continue
            if (replyError.code === 10062 || replyError.message?.includes('Unknown interaction')) {
                logger.warn('Interaction expired or unknown, could not reply');
            } else {
                logger.error('Failed to reply to interaction', replyError);
            }
        }
    }
};