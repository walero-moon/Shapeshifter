import { REST, Routes } from 'discord.js';

import { env } from '../src/config/env';
import { loadSlashCommands } from '../src/discord/commands/_loader';
import { loadMessageContextCommands } from '../src/discord/contexts/_loader';
import { logger } from '../src/utils/logger';

const isGlobalRegistration = process.argv.includes('--global');

if (!isGlobalRegistration && !env.DEV_GUILD_ID) {
  logger.error(
    'A development guild ID is required when registering commands without the --global flag.',
  );
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

const register = async () => {
  const [slashCommands, contextCommands] = await Promise.all([
    loadSlashCommands(),
    loadMessageContextCommands(),
  ]);

  const payload = [
    ...Array.from(slashCommands.values()).map((command) => command.data.toJSON()),
    ...Array.from(contextCommands.values()).map((command) => command.data.toJSON()),
  ];

  try {
    const route = isGlobalRegistration
      ? Routes.applicationCommands(env.CLIENT_ID)
      : Routes.applicationGuildCommands(env.CLIENT_ID, env.DEV_GUILD_ID!);

    await rest.put(route, { body: payload });

    const scope = isGlobalRegistration ? 'global' : `guild ${env.DEV_GUILD_ID}`;
    logger.info(`Registered ${payload.length} command(s) to ${scope}.`);
  } catch (error) {
    logger.error('Failed to register application commands', error);
    process.exit(1);
  }
};

register();
