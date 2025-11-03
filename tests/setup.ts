import { beforeAll, beforeEach, vi } from 'vitest';

// Reset call count before each test
let selectCallCount = 0;

beforeAll(() => {
    selectCallCount = 0;
});

// Mock better-sqlite3 to avoid native module issues in tests
vi.mock('better-sqlite3', () => {
    class MockStatement {
        all() { return []; }
        get() { return null; }
        run() { return { changes: 0, lastInsertRowid: 1 }; }
        finalize() { }
        raw = true;
        columns() { return []; }
        values() { return this; }
        stmt = { raw: true };
    }

    class MockDatabase {
        pragma() { }
        close() { }
        prepare() {
            return new MockStatement();
        }
    }
    return {
        default: MockDatabase,
    };
});

// Mock drizzle-orm to avoid database operations
vi.mock('drizzle-orm/better-sqlite3', () => ({
    drizzle: vi.fn(() => ({
        select: vi.fn(() => ({
            from: vi.fn(() => ({
                where: vi.fn(() => ({
                    limit: vi.fn(() => ({
                        execute: vi.fn(() => {
                            const result = selectCallCount++ === 0 ? [] : [{ id: 1, ownerUserId: 'user123', displayName: null, createdAt: Date.now() }];
                            return result;
                        }),
                    })),
                })),
            })),
        })),
        insert: vi.fn(() => ({
            values: vi.fn(() => ({
                returning: vi.fn(() => ({
                    execute: vi.fn(() => {
                        selectCallCount = 1; // Reset for next test
                        return [{ id: 1, ownerUserId: 'user123', displayName: null, createdAt: Date.now() }];
                    }),
                })),
            })),
        })),
    })),
}));

// Reset call count before each test
beforeEach(() => {
    selectCallCount = 0;
});

// Mock the env module
vi.mock('../src/config/env', () => ({
    env: {
        DATABASE_PATH: ':memory:',
    },
}));
