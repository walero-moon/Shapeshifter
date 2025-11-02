import { env } from './config/env';
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

  // This is a placeholder for the real bot initialization.
  // The token is loaded to ensure it's present, but not used yet.
  logger.info(`Loaded token for client ID: ${env.CLIENT_ID}`);
  logger.info('Application bootstrapped successfully.');
  logger.info('Next step: Implement Discord client initialization.');
};

main().catch((err) => {
  logger.error('Unhandled error during startup:', err);
  process.exit(1);
});