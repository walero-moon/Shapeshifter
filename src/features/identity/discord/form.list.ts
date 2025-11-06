import {
    SlashCommandSubcommandBuilder,
    ChatInputCommandInteraction,
    ButtonInteraction,
    EmbedBuilder,
    MessageFlags
} from 'discord.js';
import { listForms } from '../app/ListForms';
import { DEFAULT_ALLOWED_MENTIONS } from '../../../shared/utils/allowedMentions';
import { createPaginationComponents, parsePageFromCustomId, calculatePagination } from '../../../shared/utils/pagination';
import log from '../../../shared/utils/logger';

const FORMS_PER_PAGE = 5;

export const data = new SlashCommandSubcommandBuilder()
    .setName('list')
    .setDescription('List all your forms');

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const forms = await listForms(interaction.user.id);

        if (forms.length === 0) {
            return interaction.editReply({
                content: 'You have no forms yet. Create one with `/form add`',
                allowedMentions: DEFAULT_ALLOWED_MENTIONS
            });
        }

        const { totalPages, currentPage } = calculatePagination(forms.length, FORMS_PER_PAGE);
        const embed = buildFormsEmbed(forms, currentPage, totalPages);
        const components = createPaginationComponents({
            currentPage,
            totalPages,
            customIdPrefix: 'form_list'
        });

        return interaction.editReply({
            embeds: [embed],
            components,
            allowedMentions: DEFAULT_ALLOWED_MENTIONS
        });
    } catch (error) {
        log.error('Error listing forms', {
            component: 'identity',
            userId: interaction.user.id,
            guildId: interaction.guild?.id || undefined,
            error: error instanceof Error ? error.message : String(error),
            status: 'error'
        });
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return interaction.editReply({
            content: `Failed to list forms: ${errorMessage}`,
            allowedMentions: DEFAULT_ALLOWED_MENTIONS
        });
    }
}

export async function handleButtonInteraction(interaction: ButtonInteraction) {
    const page = parsePageFromCustomId(interaction.customId);
    if (page === null) return;

    try {
        const forms = await listForms(interaction.user.id);
        const { totalPages } = calculatePagination(forms.length, FORMS_PER_PAGE);

        if (page < 1 || page > totalPages) return;

        const embed = buildFormsEmbed(forms, page, totalPages);
        const components = createPaginationComponents({
            currentPage: page,
            totalPages,
            customIdPrefix: 'form_list'
        });

        return interaction.update({
            embeds: [embed],
            components,
            allowedMentions: DEFAULT_ALLOWED_MENTIONS
        });
    } catch (error) {
        log.error('Error handling form list pagination', {
            component: 'identity',
            userId: interaction.user.id,
            guildId: interaction.guild?.id,
            error: error instanceof Error ? error.message : String(error),
            status: 'error'
        });
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return interaction.update({
            content: `Failed to update page: ${errorMessage}`,
            embeds: [],
            components: [],
            allowedMentions: DEFAULT_ALLOWED_MENTIONS
        });
    }
}

function buildFormsEmbed(forms: Awaited<ReturnType<typeof listForms>>, page: number, totalPages: number): EmbedBuilder {
    const startIndex = (page - 1) * FORMS_PER_PAGE;
    const endIndex = Math.min(startIndex + FORMS_PER_PAGE, forms.length);
    const pageForms = forms.slice(startIndex, endIndex);

    const embed = new EmbedBuilder()
        .setTitle('Your Forms')
        .setColor(0x0099ff)
        .setFooter({ text: `Page ${page} of ${totalPages}` });

    let description = '';

    for (const form of pageForms) {
        description += `**${form.name}**`;
        if (form.avatarUrl) {
            description += ` [Avatar](${form.avatarUrl})`;
        }
        description += '\n';

        if (form.aliases.length > 0) {
            const aliasList = form.aliases.map(alias => `\`${alias.triggerRaw}\``).join(', ');
            description += `Aliases: ${aliasList}\n`;
        } else {
            description += 'No aliases\n';
        }

        description += '\n';
    }

    embed.setDescription(description.trim());

    return embed;
}