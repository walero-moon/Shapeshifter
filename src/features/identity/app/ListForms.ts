import { formRepo } from '../infra/FormRepo';
import { aliasRepo } from '../infra/AliasRepo';

export interface FormWithAliases {
    id: string;
    name: string;
    avatarUrl?: string | null;
    createdAt: Date;
    aliases: Array<{
        id: string;
        triggerRaw: string;
        triggerNorm: string;
        kind: 'prefix' | 'pattern';
        createdAt: Date;
    }>;
}

/**
 * List all forms for a user with their aliases
 * 
 * @param userId The ID of the user
 * @returns List of forms with their aliases
 */
export async function listForms(userId: string): Promise<FormWithAliases[]> {
    const forms = await formRepo.getByUser(userId);

    // Get all aliases for all forms and group them
    const formsWithAliases: FormWithAliases[] = [];

    for (const form of forms) {
        const aliases = await aliasRepo.getByForm(form.id);

        formsWithAliases.push({
            id: form.id,
            name: form.name,
            avatarUrl: form.avatarUrl || null,
            createdAt: form.createdAt,
            aliases: aliases.map(alias => ({
                id: alias.id,
                triggerRaw: alias.triggerRaw,
                triggerNorm: alias.triggerNorm,
                kind: alias.kind,
                createdAt: alias.createdAt,
            })),
        });
    }

    return formsWithAliases;
}