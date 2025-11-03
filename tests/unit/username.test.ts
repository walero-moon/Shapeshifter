import { describe, it, expect } from 'vitest';
import { clampUsername } from '../../src/discord/utils/username';

describe('clampUsername', () => {
    it('should trim whitespace and clamp to 80 characters', () => {
        const longName = 'a'.repeat(100);
        expect(clampUsername(longName)).toBe('a'.repeat(80));
    });

    it('should return "User" for empty string after trimming', () => {
        expect(clampUsername('   ')).toBe('User');
        expect(clampUsername('')).toBe('User');
    });

    it('should trim leading and trailing whitespace', () => {
        expect(clampUsername('  test  ')).toBe('test');
    });

    it('should handle names exactly 80 characters', () => {
        const name80 = 'a'.repeat(80);
        expect(clampUsername(name80)).toBe(name80);
    });

    it('should handle names shorter than 80 characters', () => {
        expect(clampUsername('short')).toBe('short');
    });
});