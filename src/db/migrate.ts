import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import { logger } from '../utils/logger';

import { db } from './client';

logger.info('Running database migrations...');

migrate(db, { migrationsFolder: 'src/db/migrations' });

logger.info('Migrations applied successfully.');