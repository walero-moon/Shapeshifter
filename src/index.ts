import { env } from './config/env';
import { loadSlashCommands } from './discord/commands/_loader';
import { loadMessageContextCommands } from './discord/contexts/_loader';
import { createClient } from './discord/client';
import { registerInteractionCreateListener } from './discord/listeners/interactionCreate';
import { logger } from './utils/logger';

const BANNER = `
███████╗██╗  ██╗ █████╗ ██████╗ ███████╗███████╗██╗██╗  ██╗███████╗████████╗
██╔════╝██║  ██║██╔══██╗██╔══██╗██╔════╝██╔════╝██║██║  ██║██╔════╝╚══██╔══╝
███████╗███████║███████║██████╔╝█████╗  █████╗  ██║███████║█████╗     ██║   
╚════██║██╔══██║██╔══██║██╔═══╝ ██╔══╝  ██╔══╝  ██║██╔══██║██╔══╝     ██║   
███████║██║  ██║██║  ██║██║     ███████╗███████╗██║██║  ██║███████╗   ██║   
╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚══════╝╚══════╝╚═╝╚═╝  ╚═╝╚══════╝   ╚═╝   
`;

const main = async () => {
  console.log(BANNER);
  logger.info('Starting Shapeshifter...');

  const [slashCommands, contextCommands] = await Promise.all([
    loadSlashCommands(),
    loadMessageContextCommands(),
  ]);

  logger.info(`Loaded ${slashCommands.size} slash command(s) and ${contextCommands.size} context action(s).`);

  const client = createClient();

  registerInteractionCreateListener(client, slashCommands, contextCommands);

  await client.login(env.DISCORD_TOKEN);

  logger.info(`Discord client authenticated for application ${env.CLIENT_ID}.`);
};

main().catch((err) => {
  logger.error('Unhandled error during startup:', err);
  process.exit(1);
});