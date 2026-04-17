# Database Schema

The app uses an offline-first approach with **PouchDB** on the client, synced bidirectionally to **CouchDB** on the server.

## Two databases

| Database        | Synced to CouchDB | Purpose                              |
| --------------- | ----------------- | ------------------------------------ |
| `checkit_lists` | yes               | all list data, user indexes, invites |
| `checkit_stats` | yes               | global counter                       |

---

## `checkit_lists` — 3 document types

### 1. Shopping List Document

`_id` = 32-char random hex (e.g. `"a3f9bc..."`), used as the list hash in the URL.

```json
{
  "_id":     "a3f9bc...",
  "_rev":    "5-xyz",
  "name":    "Wocheneinkauf",
  "owner":   "alice",
  "savedAt": "2026-04-17T10:00:00Z",
  "savedBy": "alice",
  "items":   [],
  "conflictResolution": {}
}
```

`owner` is `undefined` for anonymous lists. `conflictResolution` is only present after a sync conflict has been resolved.

**`items` array — each entry:**

```json
{
  "id":        "1713340800000",
  "name":      "Milch",
  "menge":     "2",
  "preis":     "1.29",
  "done":      false,
  "category":  "Milchprodukte",
  "updatedAt": "2026-04-17T10:01:00Z"
}
```

`id` is `Date.now()` as a string. `preis` is optional.

**`conflictResolution` — written after a sync conflict is resolved:**

```json
{
  "resolvedBy": "alice",
  "resolvedAt": "2026-04-17T11:00:00Z",
  "versions": [
    { "label": "Deine Version",    "savedAt": "...", "savedBy": "alice", "items": [], "chosen": true },
    { "label": "Version von bob",  "savedAt": "...", "savedBy": "bob",   "items": [], "chosen": false }
  ]
}
```

**When is this document changed?**

| Action                                 | What changes                                                       |
| -------------------------------------- | ------------------------------------------------------------------ |
| `createList()`                         | document created with `name`, optional `owner`, empty `items`      |
| `addItem()`                            | new entry appended to `items`, `savedAt`/`savedBy` updated         |
| `addItem()` on duplicate name+category | existing item's `menge` incremented, `updatedAt` updated           |
| `toggleDone()`                         | item's `done` flipped, item's `updatedAt` updated                  |
| `saveEdit()`                           | item fields updated, item's `updatedAt` updated                    |
| `removeItem()`                         | item removed from `items` array                                    |
| `applyConflictResolution()`            | `items` replaced with chosen version, `conflictResolution` written |

---

### 2. User Lists Index Document

`_id` = `"user_lists:<username>"`. One document per logged-in user, tracks which lists they own and whether they are pinned.

```json
{
  "_id":  "user_lists:alice",
  "_rev": "3-xyz",
  "lists": [
    {
      "hash":      "a3f9bc...",
      "name":      "Wocheneinkauf",
      "createdAt": "2026-04-17T09:00:00Z",
      "owner":     "alice",
      "pinned":    true
    }
  ]
}
```

Anonymous users never get this document — their list references are stored in `localStorage` only.

**When is this document changed?**

| Action                        | What changes                                          |
| ----------------------------- | ----------------------------------------------------- |
| `createList()` (logged in)    | new entry appended to `lists`                         |
| `togglePinList()` (logged in) | entry's `pinned` flipped; entry is created if missing |

---

### 3. Invite Document

`_id` = `"invite_<6-char code>"` (e.g. `"invite_AB3X7K"`). Created when a user shares a list, valid for 24 hours.

```json
{
  "_id":       "invite_AB3X7K",
  "_rev":      "1-xyz",
  "listHash":  "a3f9bc...",
  "listName":  "Wocheneinkauf",
  "expiresAt": "2026-04-18T10:00:00Z"
}
```

**When is this document changed?**

| Action               | What changes                    |
| -------------------- | ------------------------------- |
| `createInviteCode()` | document created, never updated |
| `redeemInviteCode()` | read only, not modified         |

Expired invite documents are never deleted — they just fail the `expiresAt` check on redemption.

---

## `checkit_stats` — 1 document

`_id` = `"global_stats"`. Only one document ever exists in this database.

```json
{
  "_id":                 "global_stats",
  "_rev":                "42-xyz",
  "total_lists_created": 42
}
```

**When is this document changed?**

| Action         | What changes                           |
| -------------- | -------------------------------------- |
| `createList()` | `total_lists_created` incremented by 1 |

---

## localStorage (browser-only, not synced)

Anonymous users' list references never leave the browser. Stored under the key `checkit_anon_lists`.

```json
[
  { "hash": "a3f9bc...", "name": "Meine Liste", "createdAt": "...", "pinned": false }
]
```

**When is this changed?**

| Action                    | What changes             |
| ------------------------- | ------------------------ |
| `createList()` (guest)    | entry appended           |
| `togglePinList()` (guest) | entry's `pinned` flipped |

---

## Summary

| What you want to know    | Where to look                                               |
| ------------------------ | ----------------------------------------------------------- |
| List content & items     | Shopping list doc (`_id` = hash)                            |
| Who owns a list          | `owner` field in shopping list doc                          |
| Which lists a user has   | `user_lists:<username>` doc                                 |
| Whether a list is pinned | `pinned` in `user_lists` doc (or `localStorage` for guests) |
| A share invite           | `invite_<code>` doc                                         |
| Total lists ever created | `global_stats` doc in `checkit_stats`                       |
