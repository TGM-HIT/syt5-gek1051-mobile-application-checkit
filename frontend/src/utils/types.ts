// Shared TypeScript interfaces for the CheckIT frontend.

export interface ListItem {
    id: string;
    name: string;
    menge: string;
    preis?: string;
    done: boolean;
    category: string;
    syncError?: boolean;
    updatedAt?: string;
}

export interface ConflictResolution {
    resolvedBy: string;
    resolvedAt: string;
}

export interface ListMeta {
    _id: string;
    _rev?: string;
    name: string;
    items?: ListItem[];
    conflictResolution?: ConflictResolution;
    savedAt?: string;
}

export interface GlobalStats {
    _id: string;
    _rev?: string;
    total_lists_created: number;
}
