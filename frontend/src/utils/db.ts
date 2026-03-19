import { blake2sHex } from 'blakejs';
import PouchDB from 'pouchdb';
import { ref } from 'vue';
import type { GlobalStats, ListMeta } from './types';

// ─── PouchDB instances ────────────────────────────────────────────────────────

export const statsDb = new PouchDB('checkit_stats');
export const listDb = new PouchDB('checkit_lists');

// ─── CouchDB live sync ────────────────────────────────────────────────────────

const COUCHDB_URL = import.meta.env.VITE_COUCHDB_URL ?? '';

/** Reactive CouchDB sync status exposed to Vue components. */
export const couchDbStatus = ref<'connecting' | 'active' | 'paused' | 'error' | 'disabled'>(
    COUCHDB_URL ? 'connecting' : 'disabled'
);

if (COUCHDB_URL) {
    // Sync stats — quiet
    statsDb.sync(`${COUCHDB_URL}/checkit_stats`, { live: true, retry: true })
        .on('error', (err: unknown) => console.warn('[sync:stats]', err));

    // Sync lists — drive the status indicator
    listDb.sync(`${COUCHDB_URL}/checkit_lists`, { live: true, retry: true })
        .on('active', () => { couchDbStatus.value = 'active'; })
        .on('paused', () => { couchDbStatus.value = 'paused'; })
        .on('error', (err: unknown) => {
            couchDbStatus.value = 'error';
            console.warn('[sync:lists]', err);
        });
}

// ─── Counter Logic ────────────────────────────────────────────────────────────

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

// ─── List CRUD ───────────────────────────────────────────────────────────────

export async function createList(name: string): Promise<{ hash: string; newCount: number }> {
    const pepper = import.meta.env.VITE_PEPPER ?? '';
    const currentCount = await getListsCreated();
    const hash = blake2sHex(String(currentCount) + pepper, undefined, 16);

    try {
        // Check if exists
        await listDb.get(hash);
        return { hash, newCount: currentCount };
    } catch (err: any) {
        if (err.status !== 404) throw err;
    }

    const newList: ListMeta = {
        _id: hash,
        name,
        items: []
    };

    await listDb.put(newList);
    const newCount = await incrementListsCreated();
    return { hash, newCount };
}

export async function getListName(hash: string): Promise<string | null> {
    try {
        const doc = await listDb.get<ListMeta>(hash);
        return doc.name;
    } catch {
        return null;
    }
}
