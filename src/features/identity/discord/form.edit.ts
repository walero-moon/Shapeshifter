import {
    SlashCommandSubcommandBuilder,
    ChatInputCommandInteraction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ModalSubmitInteraction
} from 'discord.js';
import { editForm } from '../app/EditForm';
import { listForms } from '../app/ListForms';
import { DEFAULT_ALLOWED_MENTIONS } from '../../../shared/utils/allowedMentions';
import { URL } from 'url';

export const data = new SlashCommandSubcommandBuilder()
    .setName('edit')
    .setDescription('Edit an existing form')
    .addStringOption(option =>
        option.setName('form')
            .setDescription('The form to edit')
            .setRequired(true)
            .setAutocomplete(true));

export async function execute(interaction: ChatInputCommandInteraction) {
    const formId = interaction.options.getString('form', true);

    // Get the form to prefill the modal
    const forms = await listForms(interaction.user.id);
    const form = forms.find(f => f.id === formId);

    if (!form) {
        return interaction.reply({
            content: 'Form not found.',
            allowedMentions: DEFAULT_ALLOWED_MENTIONS,
            ephemeral: true
        });
    }

    const modal = new ModalBuilder()
        .setCustomId(`edit_form:${formId}`)
        .setTitle('Edit Form');

    const nameInput = new TextInputBuilder()
        .setCustomId('name')
        .setLabel('Form Name')
        .setStyle(TextInputStyle.Short)
        .setValue(form.name)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(100);

    const avatarInput = new TextInputBuilder()
        .setCustomId('avatar_url')
        .setLabel('Avatar URL (optional)')
        .setStyle(TextInputStyle.Short)
        .setValue(form.avatarUrl || '')
        .setRequired(false)
        .setMinLength(0)
        .setMaxLength(500);

    const nameRow = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);
    const avatarRow = new ActionRowBuilder<TextInputBuilder>().addComponents(avatarInput);

    modal.addComponents(nameRow, avatarRow);

    return interaction.showModal(modal);
}

export async function handleModalSubmit(interaction: ModalSubmitInteraction) {
    const [action, formId] = interaction.customId.split(':');
    if (action !== 'edit_form' || !formId) return;

    const newName = interaction.fields.getTextInputValue('name').trim();
    const newAvatarUrl = interaction.fields.getTextInputValue('avatar_url').trim() || null;

    // Validate name
    if (!newName) {
        return interaction.reply({
            content: 'Form name cannot be empty.',
            allowedMentions: DEFAULT_ALLOWED_MENTIONS,
            ephemeral: true
        });
    }

    // Validate avatar URL if provided
    if (newAvatarUrl) {
        try {
            const url = new URL(newAvatarUrl);
            if (!['http:', 'https:'].includes(url.protocol)) {
                return interaction.reply({
                    content: 'Avatar URL must be HTTP or HTTPS.',
                    allowedMentions: DEFAULT_ALLOWED_MENTIONS,
                    ephemeral: true
                });
            }
        } catch {
            return interaction.reply({
                content: 'Invalid avatar URL format.',
                allowedMentions: DEFAULT_ALLOWED_MENTIONS,
                ephemeral: true
            });
        }
    }

    try {
        // Get old form for comparison
        const forms = await listForms(interaction.user.id);
        const oldForm = forms.find(f => f.id === formId);
        if (!oldForm) {
            return interaction.reply({
                content: 'Form not found.',
                allowedMentions: DEFAULT_ALLOWED_MENTIONS,
                ephemeral: true
            });
        }

        const updatedForm = await editForm(formId, {
            name: newName,
            avatarUrl: newAvatarUrl
        });

        let message = `✅ Form updated successfully!\n\n**Changes:**`;

        if (oldForm.name !== updatedForm.name) {
            message += `\n• Name: "${oldForm.name}" → "${updatedForm.name}"`;
        }

        if (oldForm.avatarUrl !== updatedForm.avatarUrl) {
            const oldAvatar = oldForm.avatarUrl ? `"${oldForm.avatarUrl}"` : 'None';
            const newAvatar = updatedForm.avatarUrl ? `"${updatedForm.avatarUrl}"` : 'None';
            message += `\n• Avatar: ${oldAvatar} → ${newAvatar}`;
        }

        if (oldForm.name === updatedForm.name && oldForm.avatarUrl === updatedForm.avatarUrl) {
            message += '\n• No changes made.';
        }

        return interaction.reply({
            content: message,
            allowedMentions: DEFAULT_ALLOWED_MENTIONS,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error editing form:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return interaction.reply({
            content: `Failed to edit form: ${errorMessage}`,
            allowedMentions: DEFAULT_ALLOWED_MENTIONS,
            ephemeral: true
        });
    }
}