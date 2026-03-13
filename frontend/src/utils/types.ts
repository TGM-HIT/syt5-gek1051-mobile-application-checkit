// Shared TypeScript interfaces for the CheckIT frontend.

export interface ListItem {
    id: string;
    name: string;
    menge: string;
    done: boolean;
}

export interface ListMeta {
    _id: string;
    _rev?: string;
    name: string;
    items?: ListItem[];
}

export interface GlobalStats {
    _id: string;
    _rev?: string;
    total_lists_created: number;
}
