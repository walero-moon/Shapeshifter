import { SlashCommandBuilder, MessageFlags, InteractionContextType } from 'discord.js';

import type { SlashCommand } from './_loader';
import { SystemService } from '../services/SystemService';

const systemService = new SystemService();

export const command: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName('system')
        .setDescription('Manage your system')
        .setContexts([InteractionContextType.Guild])
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new system')
                .addStringOption(option =>
                    option
                        .setName('display_name')
                        .setDescription('Display name for the system (1-32 characters)')
                        .setMinLength(1)
                        .setMaxLength(32)
                )
        ),
    execute: async (interaction) => {
        if (interaction.options.getSubcommand() !== 'create') {
            await interaction.reply({ content: 'Unknown subcommand.', flags: MessageFlags.Ephemeral });
            return;
        }

        const displayName = interaction.options.getString('display_name')?.trim();
        const userId = interaction.user.id;

        try {
            const result = await systemService.createSystem(userId, displayName);

            if (result.created) {
                await interaction.reply({ content: `System created successfully! Your system ID is: \`${result.system.id}\``, flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ content: 'You already have a system. Your system ID is: `' + result.system.id + '`', flags: MessageFlags.Ephemeral });
            }
        } catch (error: any) {
            await interaction.reply({ content: 'An error occurred while creating the system. Please try again later.', flags: MessageFlags.Ephemeral });
        }
    },
};