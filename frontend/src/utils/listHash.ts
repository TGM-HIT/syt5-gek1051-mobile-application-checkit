import { blake2sHex } from 'blakejs';
import PouchDB from 'pouchdb';

/**
 * Hashes a list name with the VITE_PEPPER from .env using BLAKE2s (128-bit / 16 bytes).
 * Returns a 32-character lowercase hex string suitable for use as a URL segment.
 */
export function hashListName(name: string): string {
    const pepper = import.meta.env.VITE_PEPPER ?? '';
    // 16 bytes output = 128 bits = 32 hex chars
    return blake2sHex(name + pepper, undefined, 16);
}

// --- Global Stats helpers (PouchDB) ---

const db = new PouchDB('checkit_stats');
const STATS_ID = 'global_stats';

interface GlobalStats {
    _id: string;
    _rev?: string;
    total_lists_created: number;
}

/** Increments total_lists_created and returns the new value. */
export async function incrementListsCreated(): Promise<number> {
    let stats: GlobalStats;
    try {
        const doc = await db.get<GlobalStats>(STATS_ID);
        stats = { ...doc, total_lists_created: doc.total_lists_created + 1 };
    } catch (err: any) {
        if (err.status === 404) {
            stats = { _id: STATS_ID, total_lists_created: 1 };
        } else {
            throw err;
        }
    }
    await db.put(stats);
    return stats.total_lists_created;
}

/** Returns the current total_lists_created value. */
export async function getListsCreated(): Promise<number> {
    try {
        const doc = await db.get<GlobalStats>(STATS_ID);
        return doc.total_lists_created;
    } catch (err: any) {
        if (err.status === 404) {
            return 0;
        }
        throw err;
    }
}
