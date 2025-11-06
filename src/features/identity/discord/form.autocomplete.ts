import { AutocompleteInteraction } from 'discord.js';
import { listForms } from '../app/ListForms';
import log from '../../../shared/utils/logger';

export async function execute(interaction: AutocompleteInteraction) {
    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name !== 'form') {
        return interaction.respond([]);
    }

    try {
        const forms = await listForms(interaction.user.id);
        const partialName = focusedOption.value.toLowerCase();

        const filtered = forms
            .filter(form => form.name.toLowerCase().includes(partialName))
            .slice(0, 25)
            .map(form => ({
                name: form.name,
                value: form.id
            }));

        return interaction.respond(filtered);
    } catch (error) {
        log.error('Error in form autocomplete', {
            component: 'identity',
            userId: interaction.user.id,
            guildId: interaction.guild?.id || undefined,
            error: error instanceof Error ? error.message : String(error),
            status: 'error'
        });
        return interaction.respond([]);
    }
}