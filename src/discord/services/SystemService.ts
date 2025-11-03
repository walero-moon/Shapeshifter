import { eq } from 'drizzle-orm';

import { db } from '../../db/client';
import { systems } from '../../db/schema';

export class SystemService {
    async createSystem(ownerUserId: string, displayName?: string): Promise<{ system: typeof systems.$inferSelect, created: boolean }> {
        try {
            const existing = await db
                .select()
                .from(systems)
                .where(eq(systems.ownerUserId, ownerUserId))
                .limit(1);

            if (existing.length > 0) {
                return { system: existing[0], created: false };
            }

            const result = await db
                .insert(systems)
                .values({
                    ownerUserId,
                    displayName,
                })
                .returning();
            return { system: result[0], created: true };
        } catch (error) {
            throw new Error('Failed to create system');
        }
    }
}