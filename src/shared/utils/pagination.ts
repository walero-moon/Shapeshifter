import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function parsePageFromCustomId(customId: string | null): number | null {
    if (!customId) return null;
    const match = customId.match(/page:(\d+)/);
    return (match && match[1]) ? parseInt(match[1], 10) : null;
}

export function createCustomId(prefix: string, page: number): string {
    return `${prefix}:page:${page}`;
}

export interface PaginationOptions {
    currentPage: number;
    totalPages: number;
    customIdPrefix: string;
}

export function createPaginationComponents(options: PaginationOptions): ActionRowBuilder<ButtonBuilder>[] {
    const { currentPage, totalPages, customIdPrefix } = options;

    if (totalPages <= 1) {
        return [];
    }

    const buttons: ButtonBuilder[] = [];

    if (currentPage > 1) {
        buttons.push(new ButtonBuilder()
            .setCustomId(createCustomId(customIdPrefix, currentPage - 1))
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⬅️'));
    } else {
        buttons.push(new ButtonBuilder()
            .setCustomId('disabled')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⬅️')
            .setDisabled(true));
    }

    buttons.push(new ButtonBuilder()
        .setCustomId('page-indicator')
        .setLabel(`${currentPage} / ${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true));

    if (currentPage < totalPages) {
        buttons.push(new ButtonBuilder()
            .setCustomId(createCustomId(customIdPrefix, currentPage + 1))
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('➡️'));
    } else {
        buttons.push(new ButtonBuilder()
            .setCustomId('disabled')
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('➡️')
            .setDisabled(true));
    }

    return [
        new ActionRowBuilder<ButtonBuilder>()
            .addComponents(buttons)
    ];
}

export interface PaginationInfo {
    totalPages: number;
    currentPage: number;
    startIndex: number;
    endIndex: number;
}

export function calculatePagination(totalItems: number, itemsPerPage: number): PaginationInfo {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    return {
        totalPages,
        currentPage: 1,
        startIndex: 0,
        endIndex: Math.min(itemsPerPage, totalItems)
    };
}