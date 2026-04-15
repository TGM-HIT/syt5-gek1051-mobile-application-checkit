# Check IT — Complete Project Explanation

## Table of Contents

1. [What is Check IT?](#1-what-is-check-it)
2. [Big Picture Architecture](#2-big-picture-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Project Structure](#4-project-structure)
5. [Frontend Deep Dive](#5-frontend-deep-dive)
   - [Entry Point & Router](#51-entry-point--router)
   - [App Shell](#52-app-shell)
   - [Views (Pages)](#53-views-pages)
   - [Utility Modules](#54-utility-modules)
   - [Components](#55-components)
6. [Data Models](#6-data-models)
7. [Offline-First & Sync](#7-offline-first--sync)
8. [Authentication](#8-authentication)
9. [Conflict Detection & Resolution](#9-conflict-detection--resolution)
10. [Invitation Codes](#10-invitation-codes)
11. [Image Recognition (OCR)](#11-image-recognition-ocr)
12. [Backend (Spring Boot)](#12-backend-spring-boot)
13. [Database (CouchDB)](#13-database-couchdb)
14. [Reverse Proxy (Caddy)](#14-reverse-proxy-caddy)
15. [Docker & Deployment](#15-docker--deployment)
16. [CI/CD (GitHub Actions)](#16-cicd-github-actions)
17. [Testing (Cypress)](#17-testing-cypress)
18. [Environment Variables & Secrets](#18-environment-variables--secrets)
19. [How Everything Connects — End-to-End Flows](#19-how-everything-connects--end-to-end-flows)

---

## 1. What is Check IT?

Check IT is a **collaborative, offline-first shopping list application**. It is designed for households, friends, or teams who want to maintain shared shopping lists that work even without an internet connection and that synchronize automatically when connectivity is restored.

### Core Value Propositions

| Feature | What it means in practice |
|---|---|
| **Offline-first** | You can add, edit, and check off items even when your phone has no signal. Changes are queued locally and pushed to the server automatically when you reconnect. |
| **Real-time collaboration** | Multiple people can edit the same list simultaneously. Changes appear on other devices within seconds. |
| **Conflict resolution** | If two people edit the same list while offline and then both come back online, the app detects the conflict and presents a user-friendly dialog to choose which version wins. |
| **Shareable via invite codes** | A list owner can generate a 6-character code that another user can enter to join the list. Codes expire after 24 hours. |
| **Private lists** | Lists without an owner are private — only accessible to someone who has the URL. |
| **Price & quantity tracking** | Each item can have a quantity (`Menge`) and a price (`Preis`). |
| **Category filtering** | Items are assigned to product categories (e.g., Obst/Gemüse, Milchprodukte, Fleisch) and can be filtered by category. |
| **Price tag scanning** | A camera/file dialog lets you photograph a product's price tag; Tesseract.js reads the price via OCR and fills in the price field automatically. |
| **Recipe scanning** | You can photograph or upload a recipe image; OCR extracts the ingredient lines and adds them as items to your list. |

---

## 2. Big Picture Architecture

The application follows a **three-tier, distributed, offline-first architecture**.

```
┌──────────────────────────────────────────────────────┐
│                  USER'S BROWSER                      │
│                                                      │
│  Vue 3 SPA (Single Page Application)                 │
│  ┌────────────────────────────────────────────────┐  │
│  │  PouchDB  (IndexedDB — lives in the browser)   │  │
│  │  ─ checkit_lists   (lists, invites, user index)│  │
│  │  ─ checkit_stats   (global list counter)       │  │
│  └────────────────────────────────────────────────┘  │
│                      ↕ live bidirectional sync        │
└──────────────────────────────────────────────────────┘
                        │ HTTPS (port 5984)
                        │
┌──────────────────────────────────────────────────────┐
│               SERVER (Docker Compose)                │
│                                                      │
│  ┌──────────────┐   ┌──────────────┐                 │
│  │  Caddy       │   │  CouchDB     │                 │
│  │  (proxy,     │──▶│  (NoSQL DB,  │                 │
│  │   HTTPS,     │   │   port 5984) │                 │
│  │   CORS)      │   └──────────────┘                 │
│  │  port 80/443 │   ┌──────────────┐                 │
│  │              │──▶│  Frontend    │                 │
│  │              │   │  (Nginx,     │                 │
│  │              │   │   port 80)   │                 │
│  │              │──▶│  Backend     │                 │
│  └──────────────┘   │  (Spring,    │                 │
│                     │   port 8080) │                 │
│                     └──────────────┘                 │
└──────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

**1. The browser is the primary database.**
PouchDB stores a complete local copy of all data in IndexedDB (a browser-native key-value store). This is why the app works offline. CouchDB on the server is a replica — not the source of truth.

**2. Sync is bidirectional and continuous.**
Once online, PouchDB maintains a persistent live sync with CouchDB. Any write to PouchDB is automatically pushed to CouchDB, and any remote change is pulled down immediately.

**3. The backend (Spring Boot) does almost nothing.**
Almost all application logic — authentication, list management, conflict resolution, invite codes — runs entirely in the browser. The Spring Boot service exists primarily as a CORS configuration endpoint and as a placeholder for future server-side features.

**4. Authentication is entirely local.**
There is no auth server. Usernames and bcrypt-hashed passwords are stored in `localStorage` on the device. The logged-in session is tracked via a browser cookie. This means accounts are device-local by default — if you log in on a new device, you need to register again (or the account doesn't exist there yet).

**5. No SQL, no schema migrations.**
CouchDB and PouchDB store everything as JSON documents. There is no schema to migrate. New fields can be added to documents at any time.

---

## 3. Technology Stack

### Frontend
| Technology | Purpose |
|---|---|
| **Vue 3** (Composition API) | UI framework. All components use `<script setup>` with `ref`, `computed`, and `watch`. |
| **TypeScript** | Type safety across the entire frontend codebase. |
| **Vuetify 3** | Material Design 3 component library (cards, dialogs, data tables, buttons, etc.). |
| **Vue Router 4** | Client-side routing with navigation guards for auth protection. |
| **Vite 7** | Build tool and dev server. Extremely fast HMR. |
| **PouchDB** | Offline-capable NoSQL database running in the browser (IndexedDB). Handles all local storage and sync. |
| **bcryptjs** | Password hashing with cost factor 12. Runs entirely in the browser. |
| **Tesseract.js** | Pure JavaScript OCR engine for price tag and recipe scanning. |
| **Web Crypto API** | Browser-native cryptographic functions used for AES-GCM-256 encryption and random ID generation. |
| **Material Design Icons** | Icon font used throughout the UI (`mdi-*`). |

### Backend
| Technology | Purpose |
|---|---|
| **Spring Boot 4.0.2** | Java web framework. Provides the backend service container. |
| **Java 21** | Runtime language for the backend. |
| **Gradle** | Build tool for the backend. |

### Infrastructure
| Technology | Purpose |
|---|---|
| **CouchDB** | Server-side NoSQL document database. Stores the master copy of all data and handles multi-client sync via its replication protocol. |
| **Caddy** | Reverse proxy. Handles HTTPS (automatic SSL via Let's Encrypt/DuckDNS), routes traffic to the correct service, and adds CORS headers for CouchDB. |
| **Nginx** | Serves the compiled Vue SPA (static files). Runs inside the frontend Docker container. |
| **Docker / Docker Compose** | Containerises all four services (frontend, backend, db, caddy) and orchestrates them together. |
| **DuckDNS** | Free dynamic DNS provider. Provides the domain `checkit-shoppinglist.duckdns.org`. |

### Testing & CI/CD
| Technology | Purpose |
|---|---|
| **Cypress** | End-to-end (E2E) testing framework. Tests run against a real browser. |
| **GitHub Actions** | CI/CD pipelines for both `dev` and `main` branches. |
| **GitHub Container Registry (GHCR)** | Hosts the built Docker images. |
| **DigitalOcean** | Cloud VM (droplet) where the production Docker Compose stack runs. |
| **GitHub Pages** | Hosts a static-only version of the frontend (without a real CouchDB backend). |

---

## 4. Project Structure

```
check-it-repo/
│
├── frontend/                   # The entire Vue 3 Single Page Application
│   ├── src/
│   │   ├── main.ts             # App entry point: Vue, Vuetify, Router setup
│   │   ├── App.vue             # Root component: app bar, offline indicator, logout
│   │   ├── assets/
│   │   │   └── main.css        # Global CSS overrides
│   │   ├── views/              # One file per page/route
│   │   │   ├── HomeView.vue    # Route: /       — list overview, invite redemption
│   │   │   ├── ListView.vue    # Route: /list/:hash — the shopping list itself
│   │   │   ├── LoginView.vue   # Route: /login
│   │   │   ├── RegisterView.vue# Route: /register
│   │   │   ├── SettingsView.vue# Route: /settings — export, reset, account info
│   │   │   └── DebugView.vue   # Route: /debug  — developer tools (no auth needed)
│   │   ├── components/
│   │   │   └── PriceTagScanDialog.vue  # Modal for OCR price scanning
│   │   └── utils/              # Shared business logic modules
│   │       ├── types.ts        # TypeScript interfaces for all data models
│   │       ├── auth.ts         # Login, register, logout, session cookie
│   │       ├── listHash.ts     # PouchDB instances, sync, list/invite CRUD
│   │       ├── crypto.ts       # AES-GCM-256 encryption helpers
│   │       └── recipeScan.ts   # OCR-based recipe ingredient extraction
│   ├── cypress/                # Automated tests
│   │   └── e2e/
│   │       ├── authentication.cy.ts
│   │       ├── stories.cy.ts
│   │       ├── offline-sync.cy.ts
│   │       ├── conflict.cy.ts
│   │       ├── InviteCode.cy.ts
│   │       └── recipe-scan.cy.ts
│   ├── Dockerfile              # Multi-stage: Node build → Nginx serve
│   ├── nginx.conf              # Nginx config (SPA fallback routing)
│   ├── package.json            # Node dependencies and scripts
│   ├── vite.config.ts          # Vite build config
│   └── tsconfig.json           # TypeScript compiler config
│
├── backend/                    # Spring Boot REST API (minimal)
│   ├── src/main/java/
│   │   ├── BackendApplication.java   # @SpringBootApplication entry point
│   │   └── CorsConfig.java           # @Configuration bean for CORS policy
│   ├── src/test/java/
│   │   └── BackendApplicationTests.java
│   ├── build.gradle            # Gradle build file
│   └── Dockerfile              # Multi-stage: JDK build → JRE run
│
├── couchdb-config/
│   └── local.ini               # CouchDB config (disables built-in CORS)
│
├── docs/                       # Project documentation
├── .github/
│   └── workflows/
│       ├── main.yml            # CI/CD for production (main branch)
│       └── dev.yml             # CI/CD for dev branch (includes E2E tests)
│
├── docker-compose.yml          # Orchestrates all four services
├── Caddyfile                   # Caddy reverse proxy routing rules
├── env-example                 # Template for the .env file
└── .env                        # Runtime secrets (gitignored)
```

---

## 5. Frontend Deep Dive

### 5.1 Entry Point & Router

**`frontend/src/main.ts`** is where the Vue application is assembled and mounted.

```
Vuetify instance (Material Design components & theme)
      +
Vue Router (with route definitions and navigation guards)
      +
Vue App (root component: App.vue)
      ↓
mounted to #app in index.html
```

**Routes defined in `main.ts`:**

| Path | Component | Auth required? |
|---|---|---|
| `/` | `HomeView` | Yes |
| `/list/:hash` | `ListView` | Yes |
| `/settings` | `SettingsView` | Yes |
| `/login` | `LoginView` | No |
| `/register` | `RegisterView` | No |
| `/debug` | `DebugView` | No |

The navigation guard (`router.beforeEach`) checks `isLoggedIn()` before every protected route. If the user is not logged in, they are redirected to `/login` with the original path preserved as a `redirect` query parameter so they land in the right place after logging in.

### 5.2 App Shell

**`App.vue`** renders the persistent shell that wraps every page:

- **Top app bar** with the Check IT logo and navigation controls
- **Logout button** (visible when logged in)
- **Online/offline status chip** that reflects `couchDbStatus` (a reactive `ref` from `listHash.ts`)
- A `<RouterView />` slot where the active page renders

The connection status chip cycles through these states:
- `connecting` — sync just started (shown briefly on page load)
- `active` — data is currently being transferred
- `paused` — sync is idle (no pending changes)
- `error` — sync failed (shown with an error message)
- `disabled` — no `VITE_COUCHDB_URL` configured, or simulated offline mode is on

### 5.3 Views (Pages)

#### HomeView (`/`)

The home page shows:
1. **Your lists** — fetched via `getUserLists(currentUser)`, displayed as clickable cards
2. **Create list** — a text field + button that calls `createList(name, username)`
3. **Invite code redemption** — a 6-character input that calls `redeemInviteCode(code)` and navigates to the list on success
4. **Total lists created** — a global counter fetched via `getListsCreated()`

#### ListView (`/list/:hash`)

This is the most complex component (~1000 lines). It is the full shopping list interface.

**What it renders:**
- List name in the header
- "Private" chip (if no owner)
- Conflict warning button (if CouchDB reports conflicting revisions)
- Offline banner (if offline, shows count of pending/unsynced items)
- Item input row: name field, category selector, quantity field, price field, add button, scan button
- Category filter chips (filter the displayed items)
- Items table (desktop) / items list (mobile), with checkboxes, inline editing, delete buttons
- Share button (generates an invite code)
- Conflict resolution dialog (if a conflict is detected)

**How items are loaded:**
1. On mount, `loadList()` reads the document from PouchDB via `getListWithRemoteFallback(hash)`
2. The list document has an `items` array — this is spread into the reactive `shoppingList` ref
3. PouchDB's `changes()` API is used to watch for remote updates. When another client edits the list, the change listener fires and reloads the list

**How items are saved:**
Every mutation (add, edit, check, delete) calls `saveList()`, which writes the entire list document back to PouchDB. PouchDB increments the `_rev` and syncs to CouchDB in the background.

**Inline editing:**
Clicking a cell in the table switches it to a text field (`editing` map tracks which cell is being edited). On blur, `saveList()` is called.

**Access control for private lists:**
If the list document has no `owner` field and the current user is not the one who created it (tracked via `user_lists:username`), an `accessDenied` flag is set and the list content is hidden behind an error message.

#### LoginView (`/login`) and RegisterView (`/register`)

Simple forms that call `login()` or `register()` from `auth.ts`. On success they redirect to `/` or to the `redirect` query parameter.

#### SettingsView (`/settings`)

Provides:
- **Account info** — shows logged-in username
- **Export** — downloads all list data as a JSON file
- **Reset** — calls `hardReset()` which destroys all local + remote data and reloads the page

#### DebugView (`/debug`)

Developer-only page (no auth guard) useful for testing and troubleshooting:
- Shows current `couchDbStatus` and last sync error
- Button to toggle simulated offline mode (calls `toggleOffline()`)
- Button to trigger a hard reset
- Shows raw PouchDB document counts

### 5.4 Utility Modules

#### `utils/types.ts`

Central TypeScript interface definitions. Everything the app stores or reads is typed here. See [Section 6 — Data Models](#6-data-models) for details.

#### `utils/auth.ts`

Handles all authentication. Because there is no server-side session, authentication is entirely browser-based:

- **Account store:** `localStorage['checkit_accounts']` is a JSON object mapping `username → bcryptHash`
- **Session:** The logged-in username is stored in a cookie (`checkit_username`, max-age 365 days, `SameSite=Lax`)
- **`register(username, password)`:** Validates input, checks for duplicate username, bcrypt-hashes the password (cost 12), saves to localStorage, sets the session cookie
- **`login(username, password)`:** Looks up the bcrypt hash, runs `bcrypt.compare()`, sets the session cookie on match
- **`logout()`:** Clears the cookie and sets the reactive `currentUser` ref to null

The reactive `currentUser` ref is exported and used in `App.vue` and views to show/hide auth-dependent UI without re-reading the cookie on every render.

**Important limitation:** Because accounts live in the browser's `localStorage`, they are device-specific. An account created on your phone does not exist on your laptop unless you register again with the same credentials.

#### `utils/listHash.ts`

The heart of the data layer. This module:

1. **Instantiates PouchDB databases:**
   ```
   listDb  = new PouchDB('checkit_lists')   // lists, invites, user indexes
   statsDb = new PouchDB('checkit_stats')   // global counter
   ```

2. **Starts live bidirectional sync** with CouchDB (if `VITE_COUCHDB_URL` is set):
   ```
   listDb.sync(COUCHDB_URL + '/checkit_lists', { live: true, retry: true })
   ```
   The `live: true` flag keeps the connection open. The `retry: true` flag makes it automatically reconnect after network failures.

3. **Exposes reactive sync status** (`couchDbStatus`, `simulatedOffline`, `isOffline`, `lastSyncErrorMessage`)

4. **Provides all list CRUD operations:**
   - `createList(name, username?)` — generates a random 32-hex-char ID, writes the document, increments the global counter
   - `getUserLists(username?)` — returns the user's list index document (or anonymous lists from localStorage)
   - `getListWithRemoteFallback(hash)` — reads from local PouchDB, falls back to directly querying CouchDB if not found locally (for first-time access to a shared list)
   - `getListName(hash)` — reads just the name field

5. **Provides invite code operations** (`createInviteCode`, `redeemInviteCode`)

6. **`toggleOffline()`** — simulates going offline by cancelling the sync handles and setting a sessionStorage flag

7. **`hardReset()`** — destroys both local PouchDB databases, wipes remote CouchDB data, clears localStorage and cookies, reloads the page

#### `utils/crypto.ts`

Provides AES-GCM-256 encryption and decryption using the browser's native Web Crypto API. Key derivation uses PBKDF2 with 200,000 iterations and SHA-256. This module is available for encrypting sensitive fields but is not yet actively used in the current list storage model.

#### `utils/recipeScan.ts`

Uses Tesseract.js to extract text from an image (photograph of a recipe). The extracted text is parsed line-by-line to identify ingredient lines. Ingredient names are returned as an array of strings, which `ListView.vue` adds as new items to the list.

### 5.5 Components

#### `components/PriceTagScanDialog.vue`

A Vuetify dialog component for scanning a product price tag. The user can:
1. Upload an image file or use the camera (on mobile)
2. The component runs Tesseract.js OCR on the image
3. The recognised text is searched with a regex for a price pattern (e.g. `1,99` or `2.50`)
4. The found price is emitted back to `ListView.vue` which fills the price field

---

## 6. Data Models

All TypeScript interfaces are defined in `frontend/src/utils/types.ts`.

### `ListItem` — a single shopping item

```typescript
interface ListItem {
    id: string;         // Unique ID: Date.now() as string (e.g. "1713189234567")
    name: string;       // Product name (e.g. "Milch")
    menge: string;      // Quantity (e.g. "2", "500g", "1 Liter")
    preis?: string;     // Price (e.g. "1,99") — optional
    done: boolean;      // Whether the item has been checked off
    category: string;   // Category ID (e.g. "milch", "obst", "fleisch")
    syncError?: boolean;// True if the last sync attempt failed for this item
    updatedAt?: string; // ISO 8601 timestamp of last modification
}
```

### `ListMeta` — a shopping list document (the top-level CouchDB document)

```typescript
interface ListMeta {
    _id: string;                      // Random 32-char hex hash (= the URL path)
    _rev?: string;                    // CouchDB revision string (e.g. "5-a3b2...")
    name: string;                     // Display name of the list
    items?: ListItem[];               // All items in the list
    conflictResolution?: ConflictResolution;  // Set after a conflict is resolved
    savedAt?: string;                 // ISO 8601 timestamp of last save
    savedBy?: string;                 // Username who saved last
    // _conflicts?: string[]          // Populated by CouchDB when conflicts exist
    //                                // (not in the interface, accessed dynamically)
}
```

### `ConflictResolution` — metadata written after resolving a conflict

```typescript
interface ConflictResolution {
    resolvedBy: string;                     // Username who resolved
    resolvedAt: string;                     // ISO 8601 timestamp
    versions?: ConflictVersionSnapshot[];   // Snapshots of all conflicting versions
}

interface ConflictVersionSnapshot {
    label: string;       // Human-readable label (e.g. "Version 1 – gespeichert von Anna")
    savedAt?: string;    // Timestamp of that version
    savedBy?: string;    // Who saved that version
    items: ListItem[];   // The items in that version
    chosen: boolean;     // Whether this was the winning version
}
```

### `GlobalStats` — global list counter

```typescript
interface GlobalStats {
    _id: string;                   // Always "global_stats"
    _rev?: string;                 // CouchDB revision
    total_lists_created: number;   // Counter incremented on every createList() call
}
```

### `UserListEntry` and `UserListsDoc` — user-owned list index

```typescript
interface UserListEntry {
    hash: string;      // The list's _id
    name: string;      // Display name
    createdAt: string; // ISO 8601 creation timestamp
    owner?: string;    // Username
}

// Stored in CouchDB as a document with _id = "user_lists:username"
interface UserListsDoc {
    _id: string;          // e.g. "user_lists:alice"
    _rev?: string;
    lists: UserListEntry[];
}
```

### `InviteDoc` — an invite code document

```typescript
// Stored in CouchDB with _id = "invite_XXXXXX"
interface InviteDoc {
    _id: string;       // e.g. "invite_AB3K7P"
    _rev?: string;
    listHash: string;  // The _id of the list this code grants access to
    listName: string;  // Display name (to show the user before they redeem)
    expiresAt: string; // ISO 8601 timestamp (24h after creation)
}
```

### Anonymous lists (no PouchDB document)

When a user is not logged in and creates a list, the list's `{ hash, name, createdAt }` is stored in `localStorage['checkit_anon_lists']` as a JSON array. There is no server-side user index for anonymous lists.

---

## 7. Offline-First & Sync

This is the most important architectural feature of Check IT. Here is exactly how it works.

### How PouchDB sync works

PouchDB uses **CouchDB's replication protocol**, which is based on revision trees. Every document has a `_rev` field that is updated on every write. When two clients sync, they exchange their revision trees and detect which documents each client is missing.

The sync is started in `listHash.ts`:

```
listDb.sync(COUCHDB_URL + '/checkit_lists', { live: true, retry: true })
```

- `live: true` — don't stop after catching up; keep a persistent connection (using long-polling or SSE)
- `retry: true` — if the connection drops, keep trying to reconnect with exponential backoff

### Offline write flow

1. User is offline (either real network outage, or simulated via `toggleOffline()`)
2. User adds or edits items in `ListView.vue`
3. `saveList()` writes the document to **local PouchDB**. This always succeeds regardless of network state.
4. The item's ID is added to `pendingItemIds` (a reactive Set). The UI shows a cloud-upload icon on those items.
5. The offline banner shows "N Änderungen wird synchronisiert, sobald du wieder online bist."

### Coming back online

1. User's network reconnects (browser fires `online` event, or `toggleOffline()` is called)
2. `startListSync()` is called — a new sync handle is created
3. PouchDB compares its local revision tree to CouchDB's
4. All locally-created revisions that CouchDB doesn't have are pushed up
5. All remote changes (from other clients) are pulled down
6. `couchDbStatus` transitions: `disabled` → `connecting` → `active` → `paused`
7. `pendingItemIds` is cleared (no more cloud-upload icons)

### What the changes listener does

`ListView.vue` calls `listDb.changes({ live: true, since: 'now', doc_ids: [hash] })` to watch for updates to the specific list document. When another user saves the list (and PouchDB pulls the change), this fires and `loadList()` is called to refresh the UI. This is how real-time collaboration works — it's not WebSockets, it's change polling via CouchDB's HTTP streaming.

---

## 8. Authentication

Check IT does **not** have a traditional auth server. All authentication is handled on the client.

### Registration

```
register("alice", "meinPasswort")
  → validate: username not empty, password ≥ 8 chars
  → load accounts from localStorage['checkit_accounts']  (JSON object)
  → check username not already taken
  → bcrypt.hash("meinPasswort", 12)  → "$2a$12$..."
  → save { alice: "$2a$12$..." } back to localStorage
  → set cookie: checkit_username=alice; max-age=31536000
  → set currentUser.value = "alice"
```

The bcrypt cost factor of 12 means roughly 300ms on a modern device per hash computation — slow enough to deter brute-force attacks, fast enough not to annoy real users.

### Login

```
login("alice", "meinPasswort")
  → load accounts from localStorage
  → look up accounts["alice"]  → "$2a$12$..."
  → bcrypt.compare("meinPasswort", "$2a$12$...")  → true/false
  → if true: set cookie, set currentUser.value
  → if false: return error "Wrong password."
```

### Session persistence

The cookie `checkit_username` has `max-age=31536000` (365 days). On every page load, `auth.ts` reads this cookie and sets `currentUser`. No server round-trip needed.

### Logout

```
logout()
  → clear cookie (max-age=0)
  → set currentUser.value = null
  → Vue Router redirects to /login
```

### Limitations

- Accounts are device-local (stored in the device's `localStorage`)
- No password recovery mechanism
- No centralised user registry (two devices can both register "alice" independently)
- Account data is not synced through CouchDB

---

## 9. Conflict Detection & Resolution

CouchDB uses **multi-version concurrency control (MVCC)**. Every document write creates a new revision. When two clients both write diverging revisions to the same document (because they were offline), CouchDB stores both revisions as **conflict revisions** on the same document. It picks one as the "winner" deterministically (by revision ID comparison), but the losing revision is preserved and can be accessed via `{ conflicts: true }`.

### Detection

`ListView.vue` fetches the list document with `{ conflicts: true }`:

```
listDb.get(hash, { conflicts: true })
```

If the response contains a `_conflicts` array (with one or more conflict revision IDs), the reactive `hasConflict` ref is set to `true`. This shows the yellow warning button in the header.

### Resolution UI

When the user clicks the conflict button:

1. The current "winning" document is loaded
2. For each revision ID in `_conflicts`, `listDb.get(hash, { rev: conflictRev })` is called to load each losing version
3. All versions (winner + losers) are displayed in a dialog. Each version shows:
   - Who saved it (`savedBy`)
   - When it was saved (`savedAt`)
   - A summary of the items it contains
4. The user clicks "Diese Version wählen" on their preferred version
5. The app writes the chosen version back as the new document revision
6. All other (losing) revisions are **deleted** via `listDb.remove(hash, conflictRev)` for each conflict rev
7. A `conflictResolution` object is written into the document recording who resolved it, when, and which versions existed

### Why this matters

Without conflict resolution, CouchDB would silently keep the "winner" revision and silently discard the others. Users would lose items added by the losing client. The explicit resolution UI ensures no items are lost without user awareness.

---

## 10. Invitation Codes

Lists can be shared with other users via 6-character invitation codes.

### Code format

Codes use the character set `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (ambiguous characters like `0`, `O`, `1`, `I` are excluded for readability). They are always 6 characters. Examples: `AB3K7P`, `XZM2Q9`.

### Creating a code

```
createInviteCode(listHash, listName)
  → generate 6 random chars from character set
  → write InviteDoc to PouchDB:
    {
      _id: "invite_AB3K7P",
      listHash: "a3f9...",
      listName: "Wocheneinkauf",
      expiresAt: "2026-04-16T14:22:00Z"   // 24h from now
    }
  → sync pushes this doc to CouchDB immediately
  → return code "AB3K7P"
```

The code is displayed to the user (with a copy button).

### Redeeming a code

```
redeemInviteCode("AB3K7P")
  → normalise: strip whitespace, uppercase → "AB3K7P"
  → validate length = 6
  → try listDb.get("invite_AB3K7P")
    → if not found locally AND online: try remoteDb.get("invite_AB3K7P")
    → if still not found: return null (code invalid)
  → check doc.expiresAt > now
    → if expired: return null
  → return { listHash: "a3f9...", listName: "Wocheneinkauf" }
```

The remote fallback is critical: the invitee may not have the invite document in their local PouchDB yet (they haven't synced it). So the app makes a direct HTTP request to CouchDB to find it.

After redemption, `HomeView.vue` navigates to `/list/:listHash`. The list is added to the user's local list index so it appears on the home page in the future.

---

## 11. Image Recognition (OCR)

### Price tag scanning

**`components/PriceTagScanDialog.vue`** allows the user to photograph or upload a price tag image. The flow:

1. User opens the dialog and selects an image
2. The image is passed to `Tesseract.js` (`createWorker('deu')` — German language model)
3. Tesseract processes the image and returns raw text
4. The text is searched with a regex like `/(\d+[.,]\d{2})/` to find a price
5. The first match is emitted as `priceFound` event
6. `ListView.vue` listens for this event and fills the `newItemPreis` field

### Recipe scanning

**`utils/recipeScan.ts`** handles full recipe images:

1. Takes an image file/blob
2. Runs Tesseract OCR (German language)
3. Splits the result into lines
4. Filters lines that look like ingredient lines (e.g., lines starting with a number or containing ingredient-like patterns)
5. Returns an array of ingredient strings
6. `ListView.vue` calls `addItem()` for each ingredient

---

## 12. Backend (Spring Boot)

The backend is intentionally minimal. Its primary role is as a CORS-enabled HTTP service that could be extended with server-side features in the future.

### `BackendApplication.java`

Standard Spring Boot entry point with `@SpringBootApplication`. Nothing unusual.

### `CorsConfig.java`

A `@Configuration` bean that registers a `CorsConfigurationSource` allowing:
- All origins (`*`)
- All HTTP methods
- All headers
- Credentials

This is what allows the Vue frontend (served from a different port) to make requests to the backend.

### `application.properties`

Contains only `spring.application.name=backend`. No database connections, no custom ports beyond the default 8080, no special configuration.

### How the backend fits in practice

The backend container is part of the Docker Compose stack. Caddy routes `checkit-shoppinglist.duckdns.org:8080` to it. But no frontend code currently sends requests to port 8080. The backend is effectively a stub.

---

## 13. Database (CouchDB)

CouchDB is a document-oriented NoSQL database with built-in HTTP REST API and replication support. It is exactly the right database for an offline-first app because its replication protocol is what PouchDB uses.

### Two databases

| Database | Contents |
|---|---|
| `checkit_lists` | All `ListMeta` documents, all `UserListsDoc` documents, all `InviteDoc` documents |
| `checkit_stats` | A single `GlobalStats` document |

### Document IDs

| Document type | `_id` format | Example |
|---|---|---|
| Shopping list | 32-char hex | `a3f9d2e1b7c4f8a2d6e3f1b9c7a4e2d8` |
| User list index | `user_lists:username` | `user_lists:alice` |
| Invite code | `invite_CODE` | `invite_AB3K7P` |
| Global stats | `global_stats` | `global_stats` |

### CouchDB configuration

`couchdb-config/local.ini` disables CouchDB's built-in CORS handling:

```ini
[cors]
enable = false
```

CORS is handled by Caddy instead (see next section). This avoids double-CORS-header issues.

CouchDB credentials are set via environment variables in `docker-compose.yml`:
```yaml
COUCHDB_USER=admin
COUCHDB_PASSWORD=${PASSWORD}
```

The `VITE_COUCHDB_URL` environment variable bakes the admin credentials directly into the compiled frontend bundle: `https://admin:${PASSWORD}@checkit-shoppinglist.duckdns.org:5984`. This is a known security trade-off — anyone who can read the frontend bundle can extract these credentials. For the scope of this project (school assignment, non-public users) this is acceptable.

---

## 14. Reverse Proxy (Caddy)

**Caddy** is a modern web server written in Go. It automatically handles HTTPS certificate provisioning and renewal via ACME/Let's Encrypt. The `Caddyfile` defines three virtual hosts:

### Port 443 (HTTPS) — Frontend

```
checkit-shoppinglist.duckdns.org {
    reverse_proxy frontend:80
}
```

HTTPS requests to the main domain are proxied to the Nginx container serving the Vue SPA.

### Port 8080 — Backend

```
checkit-shoppinglist.duckdns.org:8080 {
    reverse_proxy backend:8080
}
```

HTTPS requests on port 8080 are proxied to Spring Boot.

### Port 5984 — CouchDB

```
checkit-shoppinglist.duckdns.org:5984 {
    @options method OPTIONS
    respond @options 204                          // preflight requests

    header Access-Control-Allow-Origin "https://checkit-shoppinglist.duckdns.org"
    header Access-Control-Allow-Methods "GET, PUT, POST, DELETE, OPTIONS, HEAD"
    header Access-Control-Allow-Headers "accept, authorization, content-type, origin, referer, x-csrf-token"
    header Access-Control-Allow-Credentials "true"

    reverse_proxy db:5984
}
```

HTTPS requests on port 5984 are proxied to CouchDB, with CORS headers injected by Caddy. The `OPTIONS` preflight handler returns 204 immediately (browser CORS preflight).

---

## 15. Docker & Deployment

### Frontend Docker image (multi-stage)

```
Stage 1 (build): node:20-alpine
  → COPY package.json && yarn install
  → COPY src && vite build
  → output: dist/

Stage 2 (serve): nginx:alpine
  → COPY dist/ → /usr/share/nginx/html
  → COPY nginx.conf
  → EXPOSE 80
```

The `nginx.conf` includes a fallback rule so that all paths return `index.html` (required for Vue Router's HTML5 history mode).

### Backend Docker image (multi-stage)

```
Stage 1 (build): eclipse-temurin:21-jdk
  → COPY gradle files && ./gradlew dependencies
  → COPY src && ./gradlew bootJar
  → output: build/libs/backend.jar

Stage 2 (run): eclipse-temurin:21-jre
  → COPY backend.jar
  → ENTRYPOINT ["java", "-jar", "backend.jar"]
  → EXPOSE 8080
```

### Docker Compose

`docker-compose.yml` defines four services:

| Service | Image | Ports (via Caddy) |
|---|---|---|
| `frontend` | Built from `./frontend` | Caddy → :80 |
| `backend` | Built from `./backend` | Caddy → :8080 |
| `db` | `couchdb:latest` | Caddy → :5984 |
| `caddy` | `caddy:latest` | :80, :443, :8080, :5984 |

Named volumes preserve CouchDB data and Caddy certificates across container restarts:
- `couchdb_data` — CouchDB data directory
- `caddy_data` — TLS certificates
- `caddy_config` — Caddy runtime config

### Required `.env` file

```
PASSWORD=yourSecretPassword      # CouchDB admin password + bcrypt pepper
FRONTEND_PORT=80                 # (optional overrides)
BACKEND_PORT=8080
```

---

## 16. CI/CD (GitHub Actions)

### `dev.yml` — Development pipeline (runs on `dev` branch)

```
Trigger: push to dev

1. Build frontend
   - actions/setup-node@v4 (Node 20)
   - yarn install && vite build

2. Build backend
   - actions/setup-java@v4 (Java 21, Temurin)
   - ./gradlew bootJar

3. Run E2E tests
   - Start a real CouchDB container (service container)
   - Start the Vite dev server
   - cypress run --e2e
   - Upload screenshots/videos on failure

4. Build & push Docker images
   - docker login ghcr.io
   - docker build + push frontend image
   - docker build + push backend image

5. Deploy to DigitalOcean
   - SSH into droplet
   - git pull
   - write .env with secrets
   - docker compose pull && up -d --force-recreate
```

### `main.yml` — Production pipeline (runs on `main` branch)

Same as `dev.yml` but **skips the E2E tests**. The assumption is that code on `main` has already passed E2E tests on `dev`.

### Image tags

Images are pushed to GitHub Container Registry:
- `ghcr.io/tgm-hit/syt5-.../frontend:latest`
- `ghcr.io/tgm-hit/syt5-.../backend:latest`

On the DigitalOcean server, a `docker-compose.override.yml` is generated with the exact image references. `docker compose pull` downloads the freshly built images before `up -d --force-recreate` restarts the containers.

### GitHub Pages deployment

`main.yml` also deploys a static-only version of the frontend to GitHub Pages. This version is built with `VITE_COUCHDB_URL` and `VITE_PEPPER` set from GitHub Actions secrets. It allows the app to be used directly from `https://tgm-hit.github.io/...` without needing the Docker stack.

---

## 17. Testing (Cypress)

All tests are in `frontend/cypress/e2e/`. They run against a real browser (Electron in CI, Chrome locally).

### Test files

| File | What it tests |
|---|---|
| `authentication.cy.ts` | Register, login, logout, redirect after login |
| `stories.cy.ts` | Full user stories: create list, add items, check items off, delete |
| `offline-sync.cy.ts` | Go offline, make changes, come online, verify sync |
| `conflict.cy.ts` | Inject a conflicting revision, verify conflict UI, resolve conflict |
| `InviteCode.cy.ts` | Generate invite code, redeem code, verify access to list |
| `recipe-scan.cy.ts` | OCR recipe extraction (image fixture → items added) |

### Key testing techniques

**Accessing PouchDB from tests:**

`listHash.ts` exposes the PouchDB instance to Cypress:
```typescript
if ((window as any).Cypress) {
    (window as any).__listDb  = listDb;
    (window as any).__PouchDB = PouchDB;
}
```

Tests use this to directly read/write the database:
```typescript
cy.window().then(win => {
    return win.__listDb.put({ _id: hash, name: 'Test', items: [] });
});
```

**Injecting conflicts:**

To test conflict resolution without needing two real devices, tests write a conflicting revision directly using PouchDB's `bulkDocs` with `{ new_edits: false }`:
```typescript
cy.window().then(win => {
    return win.__listDb.bulkDocs([{
        _id: hash,
        _rev: '2-aabbcc...',   // a sibling leaf revision
        name: 'Test',
        items: [conflictingItem],
    }], { new_edits: false });
});
```
This bypasses PouchDB's normal revision tracking and creates a genuine CouchDB conflict.

**Network simulation:**

Tests call `cy.window().then(win => win.__listDb.sync.cancel())` or use the app's own `toggleOffline()` to simulate going offline.

**Custom Cypress commands:**

`cypress/support/commands.ts` defines helpers like:
- `cy.setupAuth()` — registers a test user and navigates to home
- `cy.goOffline()` / `cy.goOnline()` — toggle simulated offline state

---

## 18. Environment Variables & Secrets

### Build-time (Vite — baked into the compiled JS bundle)

| Variable | Purpose |
|---|---|
| `VITE_COUCHDB_URL` | Full CouchDB URL including credentials, e.g. `https://admin:pass@host:5984` |
| `VITE_PEPPER` | Additional secret string used as a pepper for bcrypt hashing |

These are set in `docker-compose.yml` build args (for the Docker build) and in GitHub Actions secrets (for the GitHub Pages build).

### Runtime (Docker Compose — `.env` file)

| Variable | Purpose |
|---|---|
| `PASSWORD` | CouchDB admin password (also used as `VITE_PEPPER`) |
| `FRONTEND_PORT` | Host port mapping for the frontend (optional) |
| `BACKEND_PORT` | Host port mapping for the backend (optional) |

### GitHub Actions secrets (set in repository settings)

| Secret | Purpose |
|---|---|
| `DOCKER_PASSWORD` | CouchDB admin password passed to `docker-compose.yml` |
| `DO_HOST` | DigitalOcean droplet IP address |
| `DO_SSH_KEY` | SSH private key for the droplet |
| `DO_SSH_PASSPHRASE` | Passphrase for the SSH key |
| `GH_TOKEN` | GitHub token for pulling the private repo on the droplet |

---

## 19. How Everything Connects — End-to-End Flows

### Flow 1: First time visiting the app

```
1. User opens https://checkit-shoppinglist.duckdns.org
2. Caddy receives HTTPS request → reverse_proxy → Nginx container
3. Nginx serves index.html (the compiled Vue SPA)
4. Browser runs main.ts:
   - Vue app created
   - Vuetify installed
   - Router installed (with auth guard)
5. Router evaluates current path ("/")
   - meta.requiresAuth = true
   - isLoggedIn() reads cookie: no cookie found → false
   - Redirect to /login
6. LoginView renders
7. user types username/password → login() → bcrypt.compare() → set cookie
8. Router navigates to /
9. HomeView mounts, calls getUserLists() → empty (new user)
10. listHash.ts starts PouchDB sync:
    - listDb.sync("https://admin:pass@...:5984/checkit_lists")
    - statsDb.sync(...)
    - couchDbStatus → "connecting" → "paused"
```

### Flow 2: Creating and using a list

```
1. HomeView: user types "Wocheneinkauf", clicks "Erstellen"
2. createList("Wocheneinkauf", "alice"):
   a. Generate random 32-char hex hash: "a3f9d2e1..."
   b. listDb.put({ _id: "a3f9d2e1...", name: "Wocheneinkauf", owner: "alice" })
   c. PouchDB stores locally AND syncs to CouchDB
   d. incrementListsCreated() → statsDb update → synced
   e. recordListForUser("alice", "a3f9d2e1...", "Wocheneinkauf")
3. Router navigates to /list/a3f9d2e1...
4. ListView mounts:
   a. loadList() → listDb.get("a3f9d2e1...") → { name, items: [], ... }
   b. shoppingList.value = []
   c. listDb.changes({ live: true, doc_ids: ["a3f9d2e1..."] }) started
5. User types "Milch", selects category "Milchprodukte", clicks Add
6. addItem():
   a. New ListItem: { id: "1713189234567", name: "Milch", done: false, ... }
   b. shoppingList.push(newItem)
   c. saveList():
      - Build ListMeta doc with new items array
      - listDb.put(doc) — updates _rev to "2-..."
      - PouchDB syncs to CouchDB
```

### Flow 3: Second user joins via invite code

```
1. Alice (owner) opens /list/a3f9d2e1...
2. Clicks the share button (mdi-share-variant)
3. createInviteCode("a3f9d2e1...", "Wocheneinkauf"):
   a. Generate code: "XZM2Q9"
   b. listDb.put({ _id: "invite_XZM2Q9", listHash: "a3f9...", expiresAt: "+24h" })
   c. Code syncs to CouchDB
4. Alice tells Bob the code "XZM2Q9"
5. Bob opens the app, sees the invite code input on HomeView
6. Bob types "XZM2Q9", clicks "Einlösen"
7. redeemInviteCode("XZM2Q9"):
   a. listDb.get("invite_XZM2Q9") → 404 (Bob hasn't synced this yet)
   b. Fallback: remoteDb.get("invite_XZM2Q9") → found!
   c. Check expiresAt: still valid
   d. Return { listHash: "a3f9...", listName: "Wocheneinkauf" }
8. Router navigates to /list/a3f9d2e1...
9. ListView's loadList():
   a. listDb.get("a3f9...") → 404 (not in Bob's local DB yet)
   b. Fallback: remoteDb.get("a3f9...") → found! Returned with all items.
10. Now Bob can see and edit Alice's list.
    PouchDB live sync will soon pull the document locally.
```

### Flow 4: Offline edit and conflict

```
1. Alice and Bob both have the list open
2. WiFi goes out — both are offline
3. Alice adds "Butter"
   - listDb.put({ ...list, items: [..., { name: "Butter" }], savedBy: "alice" })
   - Stored locally. Not synced.
4. Bob adds "Käse"
   - listDb.put({ ...list, items: [..., { name: "Käse" }], savedBy: "bob" })
   - Stored locally. Not synced.
5. WiFi comes back
6. Both Alice and Bob's PouchDB instances try to push their changes to CouchDB
7. One arrives first (say Alice's):
   - CouchDB accepts: revision "4-aaa..."
8. Bob's push arrives for the same base revision:
   - CouchDB stores it as a sibling leaf: revision "4-bbb..." (conflict!)
9. Next time anyone loads the list:
   - listDb.get(hash, { conflicts: true })
   - Response._conflicts = ["4-bbb..."] (or ["4-aaa..."] depending on winner)
   - hasConflict.value = true
   - Warning button appears
10. User clicks the button → conflict dialog:
    - Shows "Version von Alice" (has Butter, no Käse)
    - Shows "Version von Bob" (has Käse, no Butter)
11. User clicks "Diese Version wählen" on whichever they prefer
12. The chosen version is written as the new current revision
13. The losing revision is deleted: listDb.remove(hash, losingRev)
14. ConflictResolution metadata written into the document
```

---

*This document was written to explain every layer of the Check IT project, from the browser's IndexedDB to the DigitalOcean server, from individual TypeScript interfaces to the CI/CD pipeline.*
