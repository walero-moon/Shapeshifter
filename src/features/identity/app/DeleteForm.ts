import { formRepo } from '../infra/FormRepo';
import { aliasRepo } from '../infra/AliasRepo';

/**
 * Delete a form and all its aliases
 *
 * @param formId The ID of the form to delete
 * @throws Error if the form doesn't exist
 */
export async function deleteForm(formId: string): Promise<void> {
    // Check if the form exists
    const form = await formRepo.getById(formId);
    if (!form) {
        throw new Error(`Form not found`);
    }

    // First delete all aliases associated with the form
    const aliases = await aliasRepo.getByForm(formId);

    // Delete each alias
    for (const alias of aliases) {
        await aliasRepo.delete(alias.id);
    }

    // Then delete the form itself
    await formRepo.delete(formId);
}