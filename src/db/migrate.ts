import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

import { logger } from '../utils/logger';

import { db } from './client';

logger.info('Running database migrations...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

const migrationsFolder = join(__dirname, 'migrations');

if (!existsSync(migrationsFolder)) {
  logger.warn(`Migrations folder not found at ${migrationsFolder}. Skipping migrations.`);
} else {
  migrate(db, { migrationsFolder });
  logger.info('Migrations applied successfully.');
}