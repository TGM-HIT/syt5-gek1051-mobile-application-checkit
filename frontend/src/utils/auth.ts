/**
 * auth.ts — simple frontend auth using localStorage for accounts and a cookie for the session.
 * Passwords are hashed with BLAKE2s-128 before storage.
 */

import { blake2sHex } from 'blakejs';
import { ref } from 'vue';

const USERNAME_COOKIE = 'checkit_username';
const MAX_AGE = 365 * 24 * 60 * 60;
const ACCOUNTS_KEY = 'checkit_accounts';

// ─── Reactive session ─────────────────────────────────────────────────────────

export const currentUser = ref<string | null>(getUsername());

// ─── Cookie helpers ───────────────────────────────────────────────────────────

function getUsername(): string | null {
    const match = document.cookie
        .split(';')
        .map(c => c.trim())
        .find(c => c.startsWith(`${USERNAME_COOKIE}=`));
    if (!match) return null;
    return decodeURIComponent(match.slice(USERNAME_COOKIE.length + 1)) || null;
}

function setUsernameCookie(name: string): void {
    document.cookie = `${USERNAME_COOKIE}=${encodeURIComponent(name)}; max-age=${MAX_AGE}; path=/; SameSite=Lax`;
}

function clearUsernameCookie(): void {
    document.cookie = `${USERNAME_COOKIE}=; max-age=0; path=/; SameSite=Lax`;
}

// ─── Account storage ──────────────────────────────────────────────────────────

function getAccounts(): Record<string, string> {
    try {
        return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '{}');
    } catch {
        return {};
    }
}

function saveAccounts(accounts: Record<string, string>): void {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function hashPassword(password: string): string {
    return blake2sHex(password, undefined, 16);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function isLoggedIn(): boolean {
    return !!getUsername();
}

export function register(username: string, password: string): { ok: boolean; error?: string } {
    const trimmed = username.trim();
    if (!trimmed) return { ok: false, error: 'Username is required.' };
    if (password.length < 4) return { ok: false, error: 'Password must be at least 4 characters.' };

    const accounts = getAccounts();
    if (accounts[trimmed]) return { ok: false, error: 'Username already taken.' };

    accounts[trimmed] = hashPassword(password);
    saveAccounts(accounts);
    setUsernameCookie(trimmed);
    currentUser.value = trimmed;
    return { ok: true };
}

export function login(username: string, password: string): { ok: boolean; error?: string } {
    const trimmed = username.trim();
    const accounts = getAccounts();
    if (!accounts[trimmed]) return { ok: false, error: 'User not found.' };
    if (accounts[trimmed] !== hashPassword(password)) return { ok: false, error: 'Wrong password.' };

    setUsernameCookie(trimmed);
    currentUser.value = trimmed;
    return { ok: true };
}

export function logout(): void {
    clearUsernameCookie();
    currentUser.value = null;
}
