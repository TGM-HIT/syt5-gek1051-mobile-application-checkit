import { blake2sHex } from 'blakejs';
import PouchDB from 'pouchdb';
import { ref } from 'vue';

// ─── PouchDB instances ────────────────────────────────────────────────────────

const statsDb = new PouchDB('checkit_stats');
export const listDb = new PouchDB('checkit_lists');

// ─── CouchDB live sync ────────────────────────────────────────────────────────

const COUCHDB_URL = import.meta.env.VITE_COUCHDB_URL ?? '';

/** Reactive CouchDB sync status exposed to Vue components. */
export const couchDbStatus = ref<'connecting' | 'active' | 'paused' | 'error' | 'disabled'>(
    COUCHDB_URL ? 'connecting' : 'disabled'
);

/** Reactive sync error message (empty string when no error). */
export const lastSyncErrorMessage = ref('');

/** Reactive flag indicating simulated offline mode (debug only). */
export const simulatedOffline = ref(false);

/** Reactive flag indicating real browser network offline status. */
export const isOffline = ref(!navigator.onLine);
window.addEventListener('online',  () => { isOffline.value = false; });
window.addEventListener('offline', () => { isOffline.value = true; });

let listSync: ReturnType<typeof listDb.sync> | null = null;

function startListSync() {
    listSync = listDb.sync(`${COUCHDB_URL}/checkit_lists`, { live: true, retry: true })
        .on('active', () => { couchDbStatus.value = 'active'; })
        .on('paused', () => { couchDbStatus.value = 'paused'; })
        .on('error', (err: unknown) => {
            couchDbStatus.value = 'error';
            lastSyncErrorMessage.value = 'Synchronisation fehlgeschlagen. Bitte Verbindung prüfen.';
            console.warn('[sync:lists]', err);
        });
}

if (COUCHDB_URL) {
    statsDb.sync(`${COUCHDB_URL}/checkit_stats`, { live: true, retry: true })
        .on('error', (err: unknown) => console.warn('[sync:stats]', err));
    startListSync();
}

/** Toggle simulated offline mode (pauses/resumes CouchDB sync). */
export function toggleOffline() {
    if (!COUCHDB_URL) return;
    if (simulatedOffline.value) {
        simulatedOffline.value = false;
        couchDbStatus.value = 'connecting';
        startListSync();
    } else {
        simulatedOffline.value = true;
        listSync?.cancel();
        listSync = null;
        couchDbStatus.value = 'disabled';
    }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface GlobalStats {
    _id: string;
    _rev?: string;
    total_lists_created: number;
}

export interface ListItem {
    id: string | number;
    name: string;
    menge: string;
    done: boolean;
    syncError?: boolean;
}

export interface ListMeta {
    _id: string;
    _rev?: string;
    name: string;
    items?: ListItem[];
}

// ─── Global stats (counter) ───────────────────────────────────────────────────

const STATS_ID = 'global_stats';

/** Returns the current total_lists_created value (0 if not yet created). */
export async function getListsCreated(): Promise<number> {
    try {
        const doc = await statsDb.get<GlobalStats>(STATS_ID);
        return doc.total_lists_created;
    } catch (err: any) {
        if (err.status === 404) return 0;
        throw err;
    }
}

/** Increments total_lists_created and returns the NEW value. */
async function incrementListsCreated(): Promise<number> {
    let stats: GlobalStats;
    try {
        const doc = await statsDb.get<GlobalStats>(STATS_ID);
        stats = { ...doc, total_lists_created: doc.total_lists_created + 1 };
    } catch (err: any) {
        if (err.status === 404) {
            stats = { _id: STATS_ID, total_lists_created: 1 };
        } else {
            throw err;
        }
    }
    await statsDb.put(stats);
    return stats.total_lists_created;
}

// ─── User list index ──────────────────────────────────────────────────────────

export interface UserListEntry {
    hash: string;
    name: string;
    createdAt: string; // ISO date string
}

interface UserListsDoc {
    _id: string;
    _rev?: string;
    lists: UserListEntry[];
}

function userListsId(username: string): string {
    return `user_lists:${username}`;
}

export async function getUserLists(username: string): Promise<UserListEntry[]> {
    try {
        const doc = await listDb.get<UserListsDoc>(userListsId(username));
        return doc.lists;
    } catch (err: any) {
        if (err.status === 404) return [];
        throw err;
    }
}

async function recordListForUser(username: string, hash: string, name: string): Promise<void> {
    const id = userListsId(username);
    let doc: UserListsDoc;
    try {
        doc = await listDb.get<UserListsDoc>(id);
    } catch (err: any) {
        if (err.status !== 404) throw err;
        doc = { _id: id, lists: [] };
    }
    doc.lists.push({ hash, name, createdAt: new Date().toISOString() });
    await listDb.put(doc);
}

// ─── List creation ────────────────────────────────────────────────────────────

/**
 * Creates a new list:
 *  1. Reads the current counter (BEFORE incrementing) to use as hash input.
 *  2. Hashes  String(count) + VITE_PEPPER  with BLAKE2s-128 → 32-char hex.
 *  3. Saves the list document { _id: hash, name } to PouchDB (synced to CouchDB).
 *  4. Increments the counter.
 *
 * Returns { hash, newCount }.
 */
export async function createList(name: string, username?: string): Promise<{ hash: string; newCount: number }> {
    const pepper = import.meta.env.VITE_PEPPER ?? '';
    const currentCount = await getListsCreated();
    const hash = blake2sHex(String(currentCount) + pepper, undefined, 16);

    // Idempotency guard: if the hash already exists, just return it
    try {
        await listDb.get<ListMeta>(hash);
        return { hash, newCount: currentCount };
    } catch (err: any) {
        if (err.status !== 404) throw err;
    }

    await listDb.put<ListMeta>({ _id: hash, name });
    const newCount = await incrementListsCreated();
    if (username) await recordListForUser(username, hash, name);
    return { hash, newCount };
}

// ─── List name lookup ─────────────────────────────────────────────────────────

/**
 * Returns the stored name for a list hash, or null if unknown.
 * Does NOT create a document — use createList() for that.
 */
export async function getListName(hash: string): Promise<string | null> {
    try {
        const doc = await listDb.get<ListMeta>(hash);
        return doc.name;
    } catch (err: any) {
        if (err.status === 404) return null;
        throw err;
    }
}

// ─── Invite codes (self-contained, no DB lookup needed) ─────────────────────

const INVITE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars, no I/O/0/1
const INVITE_EXPIRY_HOURS = 24;

/**
 * Encodes a 32-char hex hash + expiry timestamp into a self-contained invite code.
 * Format: BASE32(hash_bytes + expiry_uint32_be)
 * Result: ~36 chars, displayed in groups of 4 for readability.
 */
export function createInviteCode(listHash: string): string {
    const hashBytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
        hashBytes[i] = parseInt(listHash.slice(i * 2, i * 2 + 2), 16);
    }
    // Expiry as hours since epoch (fits in 4 bytes for centuries)
    const expiryHours = Math.floor(Date.now() / 3600000) + INVITE_EXPIRY_HOURS;
    const expiryBytes = new Uint8Array(4);
    new DataView(expiryBytes.buffer).setUint32(0, expiryHours);
    // Combine: 16 hash bytes + 4 expiry bytes = 20 bytes
    const combined = new Uint8Array(20);
    combined.set(hashBytes);
    combined.set(expiryBytes, 16);
    // Base32 encode (5 bits per char): 20 bytes = 160 bits = 32 chars
    let bits = '';
    for (const b of combined) bits += b.toString(2).padStart(8, '0');
    let code = '';
    for (let i = 0; i < bits.length; i += 5) {
        code += INVITE_CHARS[parseInt(bits.slice(i, i + 5), 2)];
    }
    return code;
}

/** Formats a code with dashes for display: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX */
export function formatInviteCode(code: string): string {
    return code.match(/.{1,4}/g)?.join('-') ?? code;
}

/** Decodes an invite code back to listHash + checks expiry. */
export async function redeemInviteCode(code: string): Promise<{ listHash: string; listName: string } | null> {
    const clean = code.toUpperCase().replace(/[^A-Z2-9]/g, '');
    if (clean.length !== 32) return null;
    // Base32 decode
    let bits = '';
    for (const c of clean) {
        const idx = INVITE_CHARS.indexOf(c);
        if (idx < 0) return null;
        bits += idx.toString(2).padStart(5, '0');
    }
    const bytes = new Uint8Array(20);
    for (let i = 0; i < 20; i++) {
        bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
    }
    // Extract hash (first 16 bytes)
    let listHash = '';
    for (let i = 0; i < 16; i++) listHash += bytes[i]!.toString(16).padStart(2, '0');
    // Extract and check expiry (last 4 bytes)
    const expiryHours = new DataView(bytes.buffer).getUint32(16);
    const nowHours = Math.floor(Date.now() / 3600000);
    if (nowHours > expiryHours) return null; // expired
    // Verify list exists
    const name = await getListName(listHash);
    if (!name) return null;
    return { listHash, listName: name };
}

// ─── Username cookie ──────────────────────────────────────────────────────────

const USERNAME_COOKIE = 'checkit_username';
const COOKIE_MAX_AGE_DAYS = 365;

/** Returns the stored username from the cookie, or null if not set. */
export function getUsername(): string | null {
    const match = document.cookie
        .split(';')
        .map(c => c.trim())
        .find(c => c.startsWith(USERNAME_COOKIE + '='));
    if (!match) return null;
    return decodeURIComponent(match.substring(USERNAME_COOKIE.length + 1)) || null;
}

/** Persists the username as a 1-year cookie. */
export function setUsername(name: string): void {
    const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
    document.cookie = `${USERNAME_COOKIE}=${encodeURIComponent(name)}; max-age=${maxAge}; path=/; SameSite=Lax`;
}

/** Deletes the username cookie (logout). */
export function clearUsername(): void {
    document.cookie = `${USERNAME_COOKIE}=; max-age=0; path=/; SameSite=Lax`;
}
