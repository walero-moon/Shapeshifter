import { readdir } from 'node:fs/promises';

import { logger } from '../../utils/logger';
import type { MessageContextCommand } from './types';

const isContextFile = (fileName: string) => {
  if (fileName.startsWith('_')) {
    return false;
  }

  return fileName.endsWith('.ts') || fileName.endsWith('.js');
};

export const loadMessageContextCommands = async () => {
  const directoryUrl = new URL('.', import.meta.url);
  const files = await readdir(directoryUrl);
  const commands = new Map<string, MessageContextCommand>();

  await Promise.all(
    files
      .filter((file) => isContextFile(file) && !file.endsWith('.d.ts'))
      .map(async (file) => {
        const moduleUrl = new URL(file, directoryUrl);
        const module = (await import(moduleUrl.href)) as {
          default?: MessageContextCommand;
        };
        const command = module.default;

        if (!command) {
          logger.warn(`Skipping context command without default export: ${file}`);
          return;
        }

        commands.set(command.data.name, command);
      }),
  );

  return commands;
};
