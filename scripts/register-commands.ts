import { REST, Routes } from 'discord.js';

import { env } from '../src/config/env';
import { loadSlashCommands } from '../src/discord/commands/_loader';
import { loadMessageContextCommands } from '../src/discord/contexts/_loader';
import { logger } from '../src/utils/logger';

export const registerGuildCommands = async (guildId: string, dryRun = false) => {
  const [slashCommands, messageContexts] = await Promise.all([
    loadSlashCommands(),
    loadMessageContextCommands(),
  ]);

  const allCommands = [
    ...Array.from(slashCommands.values(), (command) => ({ name: command.data.name, data: command.data.toJSON() })),
    ...Array.from(messageContexts.values(), (context) => ({ name: context.data.name, data: context.data.toJSON() })),
  ];

  const toRegister = allCommands.filter(cmd => cmd.name !== 'member' && cmd.name !== 'proxy');
  const toRemove = allCommands.filter(cmd => cmd.name === 'member' || cmd.name === 'proxy');

  if (dryRun) {
    logger.info(`Dry run: Would register ${toRegister.length} commands to guild ${guildId}: ${toRegister.map(c => c.name).join(', ')}`);
    if (toRemove.length > 0) {
      logger.info(`Dry run: Would remove legacy commands: ${toRemove.map(c => c.name).join(', ')}`);
    }
    return;
  }

  const payload = toRegister.map(c => c.data);
  const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

  // Clear existing global commands to prevent duplicates
  await rest.put(Routes.applicationCommands(env.CLIENT_ID), { body: [] });
  logger.info('Cleared global commands.');
  await rest.put(Routes.applicationGuildCommands(env.CLIENT_ID, guildId), { body: payload });
  logger.info(`Registered ${payload.length} command(s) to guild ${guildId}.`);
};

export const registerGlobalCommands = async (dryRun = false) => {
  const [slashCommands, messageContexts] = await Promise.all([
    loadSlashCommands(),
    loadMessageContextCommands(),
  ]);

  const allCommands = [
    ...Array.from(slashCommands.values(), (command) => ({ name: command.data.name, data: command.data.toJSON() })),
    ...Array.from(messageContexts.values(), (context) => ({ name: context.data.name, data: context.data.toJSON() })),
  ];

  const toRegister = allCommands.filter(cmd => cmd.name !== 'member' && cmd.name !== 'proxy');
  const toRemove = allCommands.filter(cmd => cmd.name === 'member' || cmd.name === 'proxy');

  if (dryRun) {
    logger.info(`Dry run: Would register ${toRegister.length} commands globally: ${toRegister.map(c => c.name).join(', ')}`);
    if (toRemove.length > 0) {
      logger.info(`Dry run: Would remove legacy commands: ${toRemove.map(c => c.name).join(', ')}`);
    }
    return;
  }

  const payload = toRegister.map(c => c.data);
  const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

  await rest.put(Routes.applicationCommands(env.CLIENT_ID), { body: payload });
  logger.info(`Registered ${payload.length} command(s) globally.`);
};

const main = async () => {
  const isGlobal = process.argv.includes('--global');
  const isDryRun = process.argv.includes('--dry-run');

  if (isGlobal) {
    await registerGlobalCommands(isDryRun);
  } else {
    if (!env.DEV_GUILD_ID) {
      throw new Error('DEV_GUILD_ID must be set to register guild commands. Set it in your .env file or use --global flag.');
    }
    await registerGuildCommands(env.DEV_GUILD_ID, isDryRun);
  }
};

main().catch((error) => {
  logger.error('Failed to register application commands', error);
  process.exit(1);
});
