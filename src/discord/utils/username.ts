/**
 * Clamps and trims a username to 1-80 characters for Discord webhook username overrides.
 * Trims whitespace and ensures the length is between 1 and 80 characters inclusive.
 * If the input is empty after trimming, defaults to "User".
 *
 * @param username - The input username string
 * @returns The processed username string
 */
export function clampUsername(username: string): string {
    const trimmed = username.trim();
    if (trimmed.length === 0) {
        return "User";
    }
    return trimmed.slice(0, 80);
}