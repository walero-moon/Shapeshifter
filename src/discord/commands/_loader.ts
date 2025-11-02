import { readdir } from 'node:fs/promises';

import { logger } from '../../utils/logger';
import type { SlashCommand } from './types';

const isCommandFile = (fileName: string) => {
  if (fileName.startsWith('_')) {
    return false;
  }

  return fileName.endsWith('.ts') || fileName.endsWith('.js');
};

export const loadSlashCommands = async () => {
  const directoryUrl = new URL('.', import.meta.url);
  const files = await readdir(directoryUrl);
  const commands = new Map<string, SlashCommand>();

  await Promise.all(
    files
      .filter((file) => isCommandFile(file) && !file.endsWith('.d.ts'))
      .map(async (file) => {
        const moduleUrl = new URL(file, directoryUrl);
        const module = (await import(moduleUrl.href)) as { default?: SlashCommand };
        const command = module.default;

        if (!command) {
          logger.warn(`Skipping command module without default export: ${file}`);
          return;
        }

        commands.set(command.data.name, command);
      }),
  );

  return commands;
};
