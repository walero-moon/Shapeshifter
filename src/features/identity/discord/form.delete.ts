import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { deleteForm } from '../app/DeleteForm';
import { DEFAULT_ALLOWED_MENTIONS } from '../../../shared/utils/allowedMentions';
import log from '../../../shared/utils/logger';

export const data = new SlashCommandSubcommandBuilder()
    .setName('delete')
    .setDescription('Delete a form and all its aliases')
    .addStringOption(option =>
        option.setName('form')
            .setDescription('The form to delete')
            .setRequired(true)
            .setAutocomplete(true));

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const formId = interaction.options.getString('form', true);

    try {
        await deleteForm(formId);

        return interaction.editReply({
            content: '✅ Form deleted successfully.',
            allowedMentions: DEFAULT_ALLOWED_MENTIONS
        });
    } catch (error) {
        log.error('Error deleting form', {
            component: 'identity',
            userId: interaction.user.id,
            guildId: interaction.guild?.id || undefined,
            error: error instanceof Error ? error.message : String(error),
            status: 'error'
        });
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return interaction.editReply({
            content: `Failed to delete form: ${errorMessage}`,
            allowedMentions: DEFAULT_ALLOWED_MENTIONS
        });
    }
}