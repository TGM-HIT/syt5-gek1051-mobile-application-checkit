import { blake2sHex } from 'blakejs';
import PouchDB from 'pouchdb';
import { ref } from 'vue';
import type { ListItem, ListMeta, GlobalStats } from './types';

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

const SIM_OFFLINE_KEY = 'checkit_simoffline';

/** Reactive flag indicating simulated offline mode — persisted in sessionStorage. */
export const simulatedOffline = ref(sessionStorage.getItem(SIM_OFFLINE_KEY) === '1');

/** Reactive flag indicating real browser network offline status. */
export const isOffline = ref(!navigator.onLine);
window.addEventListener('online',  () => { isOffline.value = false; });
window.addEventListener('offline', () => { isOffline.value = true; });

let listSync:  ReturnType<typeof listDb.sync> | null = null;
let statsSync: ReturnType<typeof statsDb.sync> | null = null;

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

function startStatsSync() {
    statsSync = statsDb.sync(`${COUCHDB_URL}/checkit_stats`, { live: true, retry: true })
        .on('error', (err: unknown) => console.warn('[sync:stats]', err));
}

if (COUCHDB_URL) {
    if (simulatedOffline.value) {
        // Offline mode was active before reload — stay offline
        couchDbStatus.value = 'disabled';
    } else {
        startStatsSync();
        startListSync();
    }
}

/**
 * Toggle simulated offline mode (pauses/resumes both CouchDB syncs).
 */
export function toggleOffline() {
    if (!COUCHDB_URL) return;
    if (simulatedOffline.value) {
        // Go online
        simulatedOffline.value = false;
        sessionStorage.removeItem(SIM_OFFLINE_KEY);
        couchDbStatus.value = 'connecting';
        startStatsSync();
        startListSync();
    } else {
        // Go offline — cancel both syncs
        simulatedOffline.value = true;
        sessionStorage.setItem(SIM_OFFLINE_KEY, '1');
        listSync?.cancel();
        listSync = null;
        statsSync?.cancel();
        statsSync = null;
        couchDbStatus.value = 'disabled';
    }
}

/**
 * Hard reset: cancels all sync, wipes all documents from both remote CouchDB
 * databases, destroys both local PouchDB databases, then reloads the page.
 */
export async function hardReset(): Promise<void> {
    // 1. Stop all sync
    listSync?.cancel();
    listSync = null;
    statsSync?.cancel();
    statsSync = null;

    // 2. Wipe remote CouchDB by bulk-deleting all documents
    if (COUCHDB_URL) {
        for (const dbName of ['checkit_lists', 'checkit_stats']) {
            try {
                const remoteDb = new PouchDB(`${COUCHDB_URL}/${dbName}`);
                const all = await remoteDb.allDocs();
                if (all.rows.length > 0) {
                    await remoteDb.bulkDocs(
                        all.rows.map(row => ({ _id: row.id, _rev: row.value.rev, _deleted: true }))
                    );
                }
                await remoteDb.close();
            } catch (err) {
                console.warn(`[hardReset] could not wipe remote ${dbName}:`, err);
            }
        }
    }

    // 3. Destroy local PouchDB databases
    await listDb.destroy();
    await statsDb.destroy();

    // 4. Wipe all checkit entries from localStorage (accounts, etc.)
    Object.keys(localStorage)
        .filter(k => k.startsWith('checkit_'))
        .forEach(k => localStorage.removeItem(k));

    // 5. Clear session cookie and simulated-offline flag
    document.cookie = 'checkit_username=; max-age=0; path=/; SameSite=Lax';
    sessionStorage.removeItem(SIM_OFFLINE_KEY);

    // 6. Reload to a clean state
    window.location.href = '/';
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
    createdAt: string;
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
 * Result: 32 chars, displayed in groups of 4 for readability.
 */
export function createInviteCode(listHash: string): string {
    const hashBytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
        hashBytes[i] = parseInt(listHash.slice(i * 2, i * 2 + 2), 16);
    }
    const expiryHours = Math.floor(Date.now() / 3600000) + INVITE_EXPIRY_HOURS;
    const expiryBytes = new Uint8Array(4);
    new DataView(expiryBytes.buffer).setUint32(0, expiryHours);
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
    let listHash = '';
    for (let i = 0; i < 16; i++) listHash += (bytes[i] ?? 0).toString(16).padStart(2, '0');
    const expiryHours = new DataView(bytes.buffer).getUint32(16);
    const nowHours = Math.floor(Date.now() / 3600000);
    if (nowHours > expiryHours) return null;
    const name = await getListName(listHash);
    if (!name) return null;
    return { listHash, listName: name };
}
