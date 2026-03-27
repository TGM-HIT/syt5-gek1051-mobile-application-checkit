# CheckIT – Refactor & Conflict System Plan

## AMAU Ticket Status

| Story | Description                              | Status |
|-------|------------------------------------------|--------|
| #5    | Docker environment                       | ✅ Done |
| #7    | Offline work with local storage          | ✅ Done |
| #8    | Auto-sync + conflict handling            | ✅ Done |
| #10   | Technical Report                         | ✅ Done |
| #23   | Authentication                           | ✅ Done (localStorage accounts + cookie session) |

---

## Offline Sync Architecture

### How it works

1. All reads/writes go to local **PouchDB** (`checkit_lists`, `checkit_stats`).
2. PouchDB continuously syncs to **CouchDB** in the background (`listHash.ts: startListSync / startStatsSync`).
3. When offline (real or simulated), writes stay in PouchDB and sync automatically on reconnect.
4. The reactive `effectivelyOffline` computed in `ListView.vue` drives the offline banner and pending-item tracking.

### Offline toggle (simulated offline, for testing)

- **In-app**: ListView shows a toggle button (`Online` / `Offline`) when the URL includes `?debug=true`.
  - `cy.goOffline()` / `cy.goOnline()` use this button in e2e tests.
- **Debug page**: `/debug` shows CouchDB status, toggle, and hard reset.
- `toggleOffline()` in `listHash.ts` cancels **both** `listSync` and `statsSync` when going offline, and restarts both when going online.

### Pending item tracking

- `pendingItemIds` in `ListView.vue` accumulates item IDs saved while `effectivelyOffline` is true.
- The offline banner shows "N Änderung(en) wird synchronisiert…".
- On reconnect, `pendingItemIds` is cleared immediately (sync runs in the background via PouchDB).

---

## Conflict System

**Definition:** A conflict occurs when two or more users edit a list while offline simultaneously, causing CouchDB to produce diverging revision trees (`_conflicts` non-empty).

**Flow:**
1. Any online user loading the list sees a `mdi-alert` warning icon if `_conflicts` is non-empty.
2. Clicking opens the conflict dialog — all differing items shown side-by-side (Version A | Version B).
3. **Differences detected:** `name`, `menge`, `preis`, `category`, `done` — plus items present in one version but absent in the other.
4. **First person** to submit a resolution locks it — stored as `conflictResolution: { resolvedBy, resolvedAt }`.
5. Losing CouchDB revisions are deleted after resolution.
6. **Other users** see "already resolved by X" and can only click **Acknowledge**.
7. After acknowledging they can manually edit items freely.

---

## What is implemented

### Offline sync
- ✅ PouchDB ↔ CouchDB live sync for both `checkit_lists` and `checkit_stats`
- ✅ `toggleOffline()` cancels/restarts **both** syncs
- ✅ `simulatedOffline` persisted in `sessionStorage` (survives page reload)
- ✅ Real network offline detected via `window online/offline` events
- ✅ `effectivelyOffline = simulatedOffline || isOffline` drives all UI
- ✅ Inline debug toggle in ListView via `?debug=true` (for e2e tests)
- ✅ `/debug` page with CouchDB status, toggle, hard reset

### Conflict system
- ✅ Detects all field differences (not just `done`)
- ✅ Shows items present in one version but not the other
- ✅ Per-item `updatedAt` timestamp shown in the conflict picker
- ✅ First resolver locks it; others see "already resolved" and acknowledge
- ✅ Multiple-conflict warning when `_conflicts.length > 1`

### Dead code removed
- ✅ `SyncChip.vue`, `UsernameDialog.vue`, `ItemEditDialog.vue`, `icons/` — deleted
- ✅ `getUsername`, `setUsername`, `clearUsername` — removed from `listHash.ts` (auth.ts is canonical)
- ✅ `db.ts` — deleted (duplicate PouchDB instances, nobody imported it)
- ✅ `constants.ts` — deleted (unused, incompatible category IDs)

### Bug fixes
- ✅ `toggleOffline()` cancels **both** `listSync` and `statsSync` when going offline
- ✅ `SettingsView.vue` "Leeren" button actually destroys local PouchDB (was a no-op stub)

### Types consolidated
- ✅ `ListItem`, `ListMeta`, `GlobalStats` defined only in `types.ts`
- ✅ `listHash.ts` imports from `types.ts` (no duplicates)
- ✅ `updatedAt?: string` added to `ListItem`

---

## Open Questions

### Q1 — 3+ simultaneous conflicts
If three users all go offline and all make changes, `_conflicts` can have 2+ entries.
Currently only `_conflicts[0]` is compared against the winner. A warning is shown.
Should we do a full multi-way merge instead?

### Q2 — Conflict history / audit trail
After resolution, the losing revision is deleted. The `conflictResolution` field records
who resolved it and when, but not what the conflict was.
Is an audit trail needed, or is the current approach sufficient?
