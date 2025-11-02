import { readdir } from 'node:fs/promises';
import path from 'node:path';

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';

import { logger } from '../../utils/logger';

export interface SlashCommand {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const isCommandFile = (fileName: string) => {
  if (fileName.startsWith('_')) {
    return false;
  }

  const ext = path.extname(fileName);
  return ext === '.ts' || ext === '.js';
};

export const loadSlashCommands = async (): Promise<Map<string, SlashCommand>> => {
  const directoryUrl = new URL('.', import.meta.url);
  const entries = await readdir(directoryUrl, { withFileTypes: true });

  const commandFiles = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter(isCommandFile);

  const commands = new Map<string, SlashCommand>();

  for (const fileName of commandFiles) {
    const module = await import(new URL(fileName, directoryUrl).href);
    const command: SlashCommand | undefined = module.command;

    if (!command) {
      logger.warn(`Slash command module "${fileName}" does not export a \`command\` object.`);
      continue;
    }

    if (!command.data || typeof command.execute !== 'function') {
      logger.warn(`Slash command module "${fileName}" is missing required properties.`);
      continue;
    }

    const commandName = command.data.name;

    if (!commandName) {
      logger.warn(`Slash command module "${fileName}" has no command name.`);
      continue;
    }

    commands.set(commandName, command);
  }

  return commands;
};
