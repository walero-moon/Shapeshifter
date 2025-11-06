import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { createForm } from '../app/CreateForm';
import { DEFAULT_ALLOWED_MENTIONS } from '../../../shared/utils/allowedMentions';
import { URL } from 'url';
import log from '../../../shared/utils/logger';

export const data = new SlashCommandSubcommandBuilder()
    .setName('add')
    .setDescription('Create a new form')
    .addStringOption(option =>
        option.setName('name')
            .setDescription('The name of the form')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('avatar_url')
            .setDescription('The avatar URL for the form')
            .setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const name = interaction.options.getString('name', true);
    const avatarUrl = interaction.options.getString('avatar_url');

    // Validate name
    if (!name.trim()) {
        return interaction.editReply({
            content: 'Form name cannot be empty.',
            allowedMentions: DEFAULT_ALLOWED_MENTIONS
        });
    }

    // Validate avatar URL if provided
    if (avatarUrl) {
        try {
            const url = new URL(avatarUrl);
            if (!['http:', 'https:'].includes(url.protocol)) {
                return interaction.editReply({
                    content: 'Avatar URL must be HTTP or HTTPS.',
                    allowedMentions: DEFAULT_ALLOWED_MENTIONS
                });
            }
        } catch {
            return interaction.editReply({
                content: 'Invalid avatar URL format.',
                allowedMentions: DEFAULT_ALLOWED_MENTIONS
            });
        }
    }

    try {
        const result = await createForm(interaction.user.id, {
            name: name.trim(),
            avatarUrl: avatarUrl?.trim() || null
        });

        let message = `✅ Form "${result.form.name}" created successfully!`;

        if (result.defaultAliases.length > 0) {
            message += '\n\n**Default aliases created:**';
            for (const alias of result.defaultAliases) {
                message += `\n• \`${alias.triggerRaw}\``;
            }
        }

        if (result.skippedAliases.length > 0) {
            message += '\n\n**Aliases skipped:**';
            for (const skipped of result.skippedAliases) {
                message += `\n• \`${skipped.triggerRaw}\` - ${skipped.reason}`;
            }
        }

        return interaction.editReply({
            content: message,
            allowedMentions: DEFAULT_ALLOWED_MENTIONS
        });
    } catch (error) {
        log.error('Error creating form', {
            component: 'identity',
            userId: interaction.user.id,
            guildId: interaction.guild?.id || undefined,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            status: 'error'
        });
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return interaction.editReply({
            content: `Failed to create form: ${errorMessage}`,
            allowedMentions: DEFAULT_ALLOWED_MENTIONS
        });
    }
}