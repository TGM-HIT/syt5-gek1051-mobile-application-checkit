/**
 * auth.ts — username cookie helpers.
 * Cookie name: checkit_username (365 days, path /).
 */

export const USERNAME_COOKIE = 'checkit_username';

const MAX_AGE = 365 * 24 * 60 * 60; // seconds

export function getUsername(): string | null {
    const match = document.cookie
        .split(';')
        .map(c => c.trim())
        .find(c => c.startsWith(`${USERNAME_COOKIE}=`));
    if (!match) return null;
    return decodeURIComponent(match.slice(USERNAME_COOKIE.length + 1)) || null;
}

export function setUsername(name: string): void {
    document.cookie = `${USERNAME_COOKIE}=${encodeURIComponent(name)}; max-age=${MAX_AGE}; path=/; SameSite=Lax`;
}

export function clearUsername(): void {
    document.cookie = `${USERNAME_COOKIE}=; max-age=0; path=/; SameSite=Lax`;
}
