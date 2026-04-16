import PouchDB from 'pouchdb';
import { ref } from 'vue';
import type { ListMeta, GlobalStats } from './types';

const statsDb = new PouchDB('checkit_stats');
export const listDb = new PouchDB('checkit_lists');

// Expose db for Cypress e2e tests
if ((window as any).Cypress) {
    (window as any).__listDb  = listDb;
    (window as any).__PouchDB = PouchDB;
}

const COUCHDB_URL = import.meta.env.VITE_COUCHDB_URL ?? '';

export const couchDbStatus = ref<'connecting' | 'active' | 'paused' | 'error' | 'disabled'>(
    COUCHDB_URL ? 'connecting' : 'disabled'
);

export const lastSyncErrorMessage = ref('');

const SIM_OFFLINE_KEY = 'checkit_simoffline';

export const simulatedOffline = ref(sessionStorage.getItem(SIM_OFFLINE_KEY) === '1');

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
        couchDbStatus.value = 'disabled';
    } else {
        startStatsSync();
        startListSync();
    }
}

export function toggleOffline() {
    if (!COUCHDB_URL) return;
    if (simulatedOffline.value) {
        simulatedOffline.value = false;
        sessionStorage.removeItem(SIM_OFFLINE_KEY);
        couchDbStatus.value = 'connecting';
        startStatsSync();
        startListSync();
    } else {
        simulatedOffline.value = true;
        sessionStorage.setItem(SIM_OFFLINE_KEY, '1');
        listSync?.cancel();
        listSync = null;
        statsSync?.cancel();
        statsSync = null;
        couchDbStatus.value = 'disabled';
    }
}

export async function hardReset(): Promise<void> {
    listSync?.cancel();
    listSync = null;
    statsSync?.cancel();
    statsSync = null;

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

    await listDb.destroy();
    await statsDb.destroy();

    Object.keys(localStorage)
        .filter(k => k.startsWith('checkit_'))
        .forEach(k => localStorage.removeItem(k));

    document.cookie = 'checkit_username=; max-age=0; path=/; SameSite=Lax';
    sessionStorage.removeItem(SIM_OFFLINE_KEY);

    window.location.href = '/';
}

const STATS_ID = 'global_stats';

export async function getListsCreated(): Promise<number> {
    try {
        const doc = await statsDb.get<GlobalStats>(STATS_ID);
        return doc.total_lists_created;
    } catch (err: any) {
        if (err.status === 404) return 0;
        throw err;
    }
}

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

export interface UserListEntry {
    hash: string;
    name: string;
    createdAt: string;
    owner?: string;
    pinned?: boolean;
}

interface UserListsDoc {
    _id: string;
    _rev?: string;
    lists: UserListEntry[];
}

function userListsId(username: string): string {
    return `user_lists:${username}`;
}

const LOCAL_ANON_LISTS_KEY = 'checkit_anon_lists';

function saveAnonListLocally(hash: string, name: string) {
    let lists = [];
    try {
        lists = JSON.parse(localStorage.getItem(LOCAL_ANON_LISTS_KEY) || '[]');
    } catch { }

    if (!lists.find((l: any) => l.hash === hash)) {
        lists.push({ hash, name, createdAt: new Date().toISOString() });
        localStorage.setItem(LOCAL_ANON_LISTS_KEY, JSON.stringify(lists));
    }
}

export async function getUserLists(username?: string): Promise<UserListEntry[]> {
    let anonLists: UserListEntry[] = [];
    try {
        anonLists = JSON.parse(localStorage.getItem(LOCAL_ANON_LISTS_KEY) || '[]');
    } catch { }

    if (!username) {
        return anonLists;
    }

    try {
        const doc = await listDb.get<UserListsDoc>(userListsId(username));
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

export async function createList(name: string, username?: string): Promise<{ hash: string; newCount: number }> {
    let hash = '';
    let isUnique = false;
    for (let attempt = 0; attempt < 10; attempt++) {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        hash = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');

        try {
            await listDb.get<ListMeta>(hash);
        } catch (err: any) {
            if (err.status === 404) {
                isUnique = true;
                break;
            }
            throw err;
        }
    }

    if (!isUnique) {
        throw new Error('Konnte keine eindeutige Listen-ID erzeugen.');
    }

    await listDb.put<ListMeta & { owner?: string }>({
        _id: hash,
        name,
        owner: username
    });

    const newCount = await incrementListsCreated();

    if (username) {
        await recordListForUser(username, hash, name);
    } else {
        saveAnonListLocally(hash, name);
    }

    return { hash, newCount };
}

export async function getListName(hash: string): Promise<string | null> {
    try {
        const doc = await listDb.get<ListMeta>(hash);
        return doc.name;
    } catch (err: any) {
        if (err.status === 404) return null;
        throw err;
    }
}

export async function getListWithRemoteFallback(hash: string): Promise<ListMeta> {
    try {
        return await listDb.get<ListMeta>(hash, { conflicts: true });
    } catch (err: any) {
        if (err.status === 404 && COUCHDB_URL && !isOffline.value && !simulatedOffline.value) {
            const remoteDb = new PouchDB(`${COUCHDB_URL}/checkit_lists`);
            return await remoteDb.get<ListMeta>(hash, { conflicts: true });
        }
        throw err;
    }
}

const INVITE_CHARS    = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_CODE_LEN = 6;
const INVITE_EXPIRY_MS = 24 * 60 * 60 * 1000;

interface InviteDoc {
    _id:      string;
    _rev?:    string;
    listHash: string;
    listName: string;
    expiresAt: string;
}

function generateCode(): string {
    const bytes = new Uint8Array(INVITE_CODE_LEN);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => INVITE_CHARS[b % INVITE_CHARS.length]).join('');
}

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

export async function redeemInviteCode(code: string): Promise<{ listHash: string; listName: string } | null> {
    const clean = code.replace(/\s/g, '').toUpperCase();
    if (clean.length !== INVITE_CODE_LEN) return null;

    const docId = `invite_${clean}`;
    let doc: InviteDoc;

    try {
        doc = await listDb.get<InviteDoc>(docId);
    } catch (err: any) {
        if (err.status === 404 && COUCHDB_URL && !isOffline.value && !simulatedOffline.value) {
            try {
                const remoteDb = new PouchDB(`${COUCHDB_URL}/checkit_lists`);
                doc = await remoteDb.get<InviteDoc>(docId);
            } catch {
                return null;
            }
        } else {
            return null;
        }
    }

    if (new Date(doc.expiresAt) < new Date()) return null;
    return { listHash: doc.listHash, listName: doc.listName };
}

export async function getPinState(hash: string, username?: string): Promise<boolean> {
    if (!username) {
        let lists: UserListEntry[] = [];
        try { lists = JSON.parse(localStorage.getItem(LOCAL_ANON_LISTS_KEY) || '[]'); } catch { }
        return lists.find(l => l.hash === hash)?.pinned ?? false;
    }
    try {
        const doc = await listDb.get<UserListsDoc>(userListsId(username));
        return doc.lists.find(l => l.hash === hash)?.pinned ?? false;
    } catch {
        return false;
    }
}

export async function togglePinList(hash: string, username?: string): Promise<boolean> {
    if (!username) {
        let lists: UserListEntry[] = [];
        try { lists = JSON.parse(localStorage.getItem(LOCAL_ANON_LISTS_KEY) || '[]'); } catch { }
        const entry = lists.find(l => l.hash === hash);
        if (!entry) return false;
        entry.pinned = !entry.pinned;
        localStorage.setItem(LOCAL_ANON_LISTS_KEY, JSON.stringify(lists));
        return entry.pinned;
    }
    const id = userListsId(username);
    let doc: UserListsDoc;
    try {
        doc = await listDb.get<UserListsDoc>(id);
    } catch (err: any) {
        if (err.status !== 404) throw err;
        return false;
    }
    const entry = doc.lists.find(l => l.hash === hash);
    if (!entry) return false;
    entry.pinned = !entry.pinned;
    await listDb.put(doc);
    return entry.pinned;
}