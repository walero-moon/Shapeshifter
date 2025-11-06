import { formRepo } from '../infra/FormRepo';

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

    // Delete the form itself; aliases are removed via ON DELETE CASCADE
    await formRepo.delete(formId);
}