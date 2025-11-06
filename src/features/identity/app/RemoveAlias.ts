import { aliasRepo } from '../infra/AliasRepo';

/**
 * Remove an alias from a form
 *
 * @param aliasId The ID of the alias to remove
 * @param userId The ID of the user who owns the alias
 */
export async function removeAlias(aliasId: string, userId: string): Promise<void> {
    // First verify that the alias belongs to the user
    const userAliases = await aliasRepo.getByUser(userId);
    const alias = userAliases.find(a => a.id === aliasId);

    // Check if alias exists and belongs to the user
    if (!alias || alias.userId !== userId) {
        throw new Error('Alias not found or does not belong to user');
    }

    // Delete the alias
    await aliasRepo.delete(aliasId);
}