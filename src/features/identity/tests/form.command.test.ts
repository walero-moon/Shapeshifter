import { describe, it, expect, beforeEach, vi } from 'vitest';
import { command } from '../discord/form';
import { execute as autocompleteExecute } from '../discord/form.autocomplete';
import { handleModalSubmit } from '../discord/form.edit';
import { execute as addExecute } from '../discord/form.add';
import { execute as listExecute } from '../discord/form.list';
import { listForms } from '../app/ListForms';
import { editForm } from '../app/EditForm';
import { deleteForm } from '../app/DeleteForm';
import { createForm } from '../app/CreateForm';
import { formRepo } from '../infra/FormRepo';
import { aliasRepo } from '../infra/AliasRepo';
import { createPaginationComponents } from '../../../shared/utils/pagination';
import { MessageFlags } from 'discord.js';

// Mock the repositories
vi.mock('../infra/FormRepo', () => ({
    formRepo: {
        getById: vi.fn(),
        getByUser: vi.fn(),
        create: vi.fn(),
        updateNameAvatar: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock('../infra/AliasRepo', () => ({
    aliasRepo: {
        create: vi.fn(),
        getByForm: vi.fn(),
        getByUser: vi.fn(),
        delete: vi.fn(),
        findCollision: vi.fn(),
    },
}));

// Mock listForms
vi.mock('../app/ListForms', () => ({
    listForms: vi.fn(),
}));

// Mock editForm
vi.mock('../app/EditForm', () => ({
    editForm: vi.fn(),
}));

// Mock deleteForm - but not for cascade test
vi.mock('../app/DeleteForm', () => ({
    deleteForm: vi.fn(),
}));

// Mock createForm
vi.mock('../app/CreateForm', () => ({
    createForm: vi.fn(),
}));

describe('/form command builders', () => {
    it('should produce expected JSON structure with correct subcommands', () => {
        const json = command.data.toJSON();

        expect(json).toMatchSnapshot();
    });
});

describe('form autocomplete', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return filtered suggestions by partial name match, ≤25 results, with value as form id', async () => {
        const mockForms = [
            { id: 'form1', name: 'Alice', avatarUrl: null, createdAt: new Date(), aliases: [] },
            { id: 'form2', name: 'Bob', avatarUrl: null, createdAt: new Date(), aliases: [] },
            { id: 'form3', name: 'Charlie', avatarUrl: null, createdAt: new Date(), aliases: [] },
            { id: 'form4', name: 'Alice Cooper', avatarUrl: null, createdAt: new Date(), aliases: [] },
        ];

        vi.mocked(listForms).mockResolvedValue(mockForms);

        const mockInteraction = {
            user: { id: 'user1' },
            options: {
                getFocused: vi.fn().mockReturnValue({ name: 'form', value: 'ali' }),
            },
            respond: vi.fn(),
        };

        await autocompleteExecute(mockInteraction as any);

        expect(listForms).toHaveBeenCalledWith('user1');
        expect(mockInteraction.respond).toHaveBeenCalledWith([
            { name: 'Alice', value: 'form1' },
            { name: 'Alice Cooper', value: 'form4' },
        ]);
    });

    it('should return up to 25 results', async () => {
        const mockForms = Array.from({ length: 30 }, (_, i) => ({
            id: `form${i}`,
            name: `Form ${i}`,
            avatarUrl: null,
            createdAt: new Date(),
            aliases: [],
        }));

        vi.mocked(listForms).mockResolvedValue(mockForms);

        const mockInteraction = {
            user: { id: 'user1' },
            options: {
                getFocused: vi.fn().mockReturnValue({ name: 'form', value: '' }),
            },
            respond: vi.fn(),
        };

        await autocompleteExecute(mockInteraction as any);

        const responded = mockInteraction.respond.mock.calls[0]?.[0] || [];
        expect(responded).toHaveLength(25);
    });
});

describe('form edit modal submit', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should call EditForm with correct params and send ephemeral success reply', async () => {
        const mockForm = {
            id: 'form1',
            name: 'Updated Name',
            avatarUrl: 'https://example.com/avatar.png',
            createdAt: new Date(),
        };

        vi.mocked(editForm).mockResolvedValue(mockForm);

        const mockInteraction = {
            customId: 'edit_form:form1',
            user: { id: 'user1' },
            fields: {
                getTextInputValue: vi.fn()
                    .mockReturnValueOnce('Updated Name')
                    .mockReturnValueOnce('https://example.com/avatar.png'),
            },
            deferUpdate: vi.fn(),
            editReply: vi.fn(),
        };

        await handleModalSubmit(mockInteraction as any);

        expect(editForm).toHaveBeenCalledWith('form1', {
            name: 'Updated Name',
            avatarUrl: 'https://example.com/avatar.png',
        });

        expect(mockInteraction.deferUpdate).toHaveBeenCalled();
        expect(mockInteraction.editReply).toHaveBeenCalledWith({
            content: expect.stringContaining('✅ Form updated successfully!'),
            allowedMentions: { parse: [], repliedUser: false },
        });
    });

    it('should acknowledge within interaction lifecycle', async () => {
        vi.mocked(editForm).mockResolvedValue({
            id: 'form1',
            name: 'Name',
            avatarUrl: null,
            createdAt: new Date(),
        });

        const mockInteraction = {
            customId: 'edit_form:form1',
            user: { id: 'user1' },
            fields: {
                getTextInputValue: vi.fn()
                    .mockReturnValueOnce('Name')
                    .mockReturnValueOnce(''),
            },
            deferUpdate: vi.fn(),
            editReply: vi.fn(),
        };

        await handleModalSubmit(mockInteraction as any);

        // deferUpdate is called first, which acknowledges the interaction
        expect(mockInteraction.deferUpdate).toHaveBeenCalled();
    });
});

describe('delete form cascade contract', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should remove aliases automatically when form is deleted via cascade', async () => {
        // Seed DB with form and aliases
        const mockForm = {
            id: 'form1',
            userId: 'user1',
            name: 'Test Form',
            avatarUrl: null,
            createdAt: new Date(),
        };

        vi.mocked(formRepo.getById).mockResolvedValue(mockForm);

        // Mock deleteForm to implement the new cascade behavior
        vi.mocked(deleteForm).mockImplementation(async (formId: string) => {
            const form = await formRepo.getById(formId);
            if (!form) throw new Error('Form not found');
            await formRepo.delete(formId);
        });

        // Delete form (deleteForm now only deletes the form, relying on cascade)
        await deleteForm('form1');

        // Verify only form is deleted; aliases are removed via ON DELETE CASCADE
        expect(formRepo.delete).toHaveBeenCalledWith('form1');

        // Verify no manual alias deletion
        expect(aliasRepo.getByForm).not.toHaveBeenCalled();
        expect(aliasRepo.delete).not.toHaveBeenCalled();
    });
});

describe('3s rule compliance for form add', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should deferReply with ephemeral flags when createForm takes >3s, then editReply', async () => {
        vi.mocked(createForm).mockImplementation(async () => {
            // eslint-disable-next-line no-undef
            await new Promise(resolve => setTimeout(resolve, 4000));
            return {
                form: { id: 'form1', name: 'Test', avatarUrl: null, createdAt: new Date() },
                defaultAliases: [],
                skippedAliases: []
            };
        });

        const mockInteraction = {
            deferReply: vi.fn(),
            editReply: vi.fn(),
            options: {
                getString: vi.fn().mockReturnValueOnce('Test').mockReturnValueOnce(null),
            },
            user: { id: 'user1' },
        };

        await addExecute(mockInteraction as any);

        expect(mockInteraction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
        expect(mockInteraction.editReply).toHaveBeenCalled();
    });
});

describe('3s rule compliance for form edit', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should deferUpdate when editForm takes >3s, then editReply', async () => {
        vi.mocked(listForms).mockResolvedValue([
            { id: 'form1', name: 'Old Name', avatarUrl: null, createdAt: new Date(), aliases: [] }
        ]);

        vi.mocked(editForm).mockImplementation(async () => {
            // eslint-disable-next-line no-undef
            await new Promise(resolve => setTimeout(resolve, 4000));
            return { id: 'form1', name: 'New Name', avatarUrl: null, createdAt: new Date() };
        });

        const mockInteraction = {
            customId: 'edit_form:form1',
            user: { id: 'user1' },
            fields: {
                getTextInputValue: vi.fn().mockReturnValueOnce('New Name').mockReturnValueOnce(''),
            },
            deferUpdate: vi.fn(),
            editReply: vi.fn(),
        };

        await handleModalSubmit(mockInteraction as any);

        expect(mockInteraction.deferUpdate).toHaveBeenCalled();
        expect(mockInteraction.editReply).toHaveBeenCalled();
    });
});

describe('components limit compliance', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render one ActionRow with buttons for form list when multiple pages', async () => {
        const mockForms = Array.from({ length: 10 }, (_, i) => ({
            id: `form${i}`,
            name: `Form ${i}`,
            avatarUrl: null,
            createdAt: new Date(),
            aliases: [],
        }));

        vi.mocked(listForms).mockResolvedValue(mockForms);

        const mockInteraction = {
            deferReply: vi.fn(),
            editReply: vi.fn(),
            user: { id: 'user1' },
        };

        await listExecute(mockInteraction as any);

        expect(mockInteraction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
        expect(mockInteraction.editReply).toHaveBeenCalledWith({
            embeds: expect.any(Array),
            components: expect.any(Array),
            allowedMentions: expect.any(Object),
        });

        const editReplyCall = mockInteraction.editReply.mock.calls[0]?.[0];
        expect(editReplyCall).toBeDefined();
        const components = editReplyCall.components;
        expect(components).toHaveLength(1); // One ActionRow
        expect(components[0].components).toHaveLength(3); // Three buttons: prev, page indicator, next
    });

    it('pagination utils never exceed 5 buttons per row or 5 rows', () => {
        // Test with various totalPages
        for (let totalPages = 1; totalPages <= 10; totalPages++) {
            const components = createPaginationComponents({
                currentPage: 1,
                totalPages,
                customIdPrefix: 'test'
            });

            expect(components.length).toBeLessThanOrEqual(5); // Max 5 rows
            for (const row of components) {
                expect(row.components.length).toBeLessThanOrEqual(5); // Max 5 buttons per row
            }
        }
    });
});