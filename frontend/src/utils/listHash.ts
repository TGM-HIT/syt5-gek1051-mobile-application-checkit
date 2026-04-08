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
    owner?: string; // HINZUGEFÜGT FÜR PRIVATE LISTEN
}

interface UserListsDoc {
    _id: string;
    _rev?: string;
    lists: UserListEntry[];
}

function userListsId(username: string): string {
    return `user_lists:${username}`;
}

// LOKALER SPEICHER FÜR ANONYME LISTEN
const LOCAL_ANON_LISTS_KEY = 'checkit_anon_lists';

function saveAnonListLocally(hash: string, name: string) {
    let lists = [];
    try {
        lists = JSON.parse(localStorage.getItem(LOCAL_ANON_LISTS_KEY) || '[]');
    } catch { /* ignore */ }

    if (!lists.find((l: any) => l.hash === hash)) {
        lists.push({ hash, name, createdAt: new Date().toISOString() });
        localStorage.setItem(LOCAL_ANON_LISTS_KEY, JSON.stringify(lists));
    }
}

export async function getUserLists(username?: string): Promise<UserListEntry[]> {
    let anonLists: UserListEntry[] = [];
    try {
        anonLists = JSON.parse(localStorage.getItem(LOCAL_ANON_LISTS_KEY) || '[]');
    } catch { /* ignore */ }

    if (!username) {
        return anonLists; // Wenn nicht eingeloggt, nur private/anonyme Listen zeigen
    }

    try {
        const doc = await listDb.get<UserListsDoc>(userListsId(username));
        // Zusammenführen: User-Listen + lokale Anonyme
        return [...doc.lists, ...anonLists];
    } catch (err: any) {
        if (err.status === 404) return anonLists;
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
    doc.lists.push({ hash, name, createdAt: new Date().toISOString(), owner: username });
    await listDb.put(doc);
}

// ─── List creation ────────────────────────────────────────────────────────────

/**
 * Creates a new list:
 * 1. Reads the current counter (BEFORE incrementing) to use as hash input.
 * 2. Hashes  String(count) + VITE_PEPPER  with BLAKE2s-128 → 32-char hex.
 * 3. Saves the list document { _id: hash, name } to PouchDB (synced to CouchDB).
 * 4. Increments the counter.
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

    // LIST DOC UMSCHLAGEN: owner Feld hinzufügen
    await listDb.put<ListMeta & { owner?: string }>({
        _id: hash,
        name,
        owner: username // Wenn nicht übergeben = undefined (Anonyme Liste)
    });

    const newCount = await incrementListsCreated();

    if (username) {
        await recordListForUser(username, hash, name);
    } else {
        // LOKAL SPEICHERN WENN ANONYM
        saveAnonListLocally(hash, name);
    }

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

// ─── Invite codes (DB-backed, 6-char) ────────────────────────────────────────

const INVITE_CHARS    = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1
const INVITE_CODE_LEN = 6;
const INVITE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface InviteDoc {
    _id:      string;
    _rev?:    string;
    listHash: string;
    listName: string;
    expiresAt: string; // ISO timestamp
}

function generateCode(): string {
    const bytes = new Uint8Array(INVITE_CODE_LEN);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => INVITE_CHARS[b % INVITE_CHARS.length]).join('');
}

/**
 * Creates a 6-char alphanumeric invite code stored in CouchDB.
 * The code expires after 24 hours.
 */
export async function createInviteCode(listHash: string, listName: string): Promise<string> {
    const code = generateCode();
    await listDb.put<InviteDoc>({
        _id:       `invite_${code}`,
        listHash,
        listName,
        expiresAt: new Date(Date.now() + INVITE_EXPIRY_MS).toISOString(),
    });
    return code;
}

/** Redeems a 6-char invite code. Returns { listHash, listName } or null if invalid/expired. */
export async function redeemInviteCode(code: string): Promise<{ listHash: string; listName: string } | null> {
    const clean = code.replace(/\s/g, '').toUpperCase();
    if (clean.length !== INVITE_CODE_LEN) return null;
    try {
        const doc = await listDb.get<InviteDoc>(`invite_${clean}`);
        if (new Date(doc.expiresAt) < new Date()) return null;
        return { listHash: doc.listHash, listName: doc.listName };
    } catch (err: any) {
        if (err.status === 404) return null;
        throw err;
    }
}

/** * Holt eine Liste. Wenn sie lokal noch nicht synchronisiert wurde,
 * fragt sie als Fallback direkt den Remote-Server.
 */
export async function getListWithRemoteFallback(hash: string): Promise<ListMeta> {
    try {
        return await listDb.get<ListMeta>(hash, { conflicts: true });
    } catch (err: any) {
        // FALLBACK: Wenn lokal 404 und wir online sind, frage direkt den Server!
        if (err.status === 404 && COUCHDB_URL && !isOffline.value && !simulatedOffline.value) {
            const remoteDb = new PouchDB(`${COUCHDB_URL}/checkit_lists`);
            return await remoteDb.get<ListMeta>(hash, { conflicts: true });
        }
        throw err;
    }
}