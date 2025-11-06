import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { deleteForm } from '../app/DeleteForm';
import { DEFAULT_ALLOWED_MENTIONS } from '../../../shared/utils/allowedMentions';

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
        console.error('Error deleting form:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return interaction.editReply({
            content: `Failed to delete form: ${errorMessage}`,
            allowedMentions: DEFAULT_ALLOWED_MENTIONS
        });
    }
}