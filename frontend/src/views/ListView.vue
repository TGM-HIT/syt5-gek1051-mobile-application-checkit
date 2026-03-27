<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">
        <v-card elevation="3" class="pa-2 pa-sm-4">

          <!-- Header: list name + actions -->
          <div class="d-flex align-center mb-2">
            <div class="flex-grow-1 min-width-0">
              <h1 class="text-h5 text-sm-h4 font-weight-bold text-truncate">
                {{ currentListName }}
              </h1>
              <div class="text-caption text-grey mt-1 hash-label">
                /list/{{ listHash }}
              </div>
            </div>

            <!-- Conflict warning icon -->
            <v-btn
                v-if="hasConflict"
                icon="mdi-alert"
                color="warning"
                variant="tonal"
                size="small"
                class="mr-2"
                title="Synchronisierungskonflikt – klicken zum Lösen"
                @click="openConflictDialog"
            />

            <!-- Share -->
            <v-btn variant="text" icon="mdi-share-variant" color="primary" @click="generateInvite" />
            <!-- Settings -->
            <v-btn to="/settings" variant="text" icon="mdi-cog" color="grey-darken-2" />
          </div>

          <!-- Offline banner -->
          <v-alert
              v-if="effectivelyOffline"
              type="warning"
              variant="tonal"
              density="compact"
              icon="mdi-wifi-off"
              class="mb-4"
          >
            Du bist offline.
            <span v-if="pendingCount > 0">
              {{ pendingCount }} Änderung{{ pendingCount === 1 ? '' : 'en' }} wird synchronisiert, sobald du wieder online bist.
            </span>
            <span v-else>Neue Änderungen werden lokal gespeichert.</span>
          </v-alert>

          <!-- Add item form -->
          <v-row class="mb-4" dense>
            <v-col cols="12" sm="6" md="3">
              <v-text-field
                  v-model="searchQuery"
                  label="Artikel..."
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  @keyup.enter="addItem"
              ></v-text-field>
            </v-col>
            <v-col cols="6" sm="6" md="2">
              <v-select
                  v-model="selectedCategory"
                  :items="PRODUCT_CATEGORIES"
                  item-title="label"
                  item-value="id"
                  label="Kategorie"
                  variant="outlined"
                  density="comfortable"
                  hide-details
              >
                <template v-slot:item="{ props, item }">
                  <v-list-item v-bind="props" :prepend-icon="item.raw.icon"></v-list-item>
                </template>
              </v-select>
            </v-col>
            <v-col cols="3" sm="4" md="2">
              <v-text-field
                  v-model="newItemMenge"
                  label="Menge"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  @keyup.enter="addItem"
              ></v-text-field>
            </v-col>
            <v-col cols="3" sm="4" md="2">
              <v-text-field
                  v-model="newItemPreis"
                  label="Preis (€)"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  @keyup.enter="addItem"
              ></v-text-field>
            </v-col>
            <v-col cols="6" sm="2" md="1">
              <v-btn color="primary" height="48" block elevation="1" @click="addItem">
                <v-icon>mdi-plus</v-icon>
              </v-btn>
            </v-col>
            <v-col cols="6" sm="2" md="2">
              <v-btn color="secondary" height="48" block elevation="1" @click="scanDialog = true">
                <v-icon start>mdi-camera</v-icon>
                Scan
              </v-btn>
            </v-col>
          </v-row>

          <v-divider class="mb-4"></v-divider>

          <!-- Desktop: data table -->
          <v-data-table
              :headers="headers"
              :items="shoppingList"
              :search="searchQuery"
              :group-by="[{ key: 'category', order: 'asc' }]"
              class="elevation-0 d-none d-sm-block"
              hide-default-footer
          >
            <template v-slot:[`item.done`]="{ item }">
              <div @click.stop>
                <input
                    type="checkbox"
                    v-model="item.done"
                    style="width: 20px; height: 20px; cursor: pointer;"
                    @change="toggleDone(item)"
                >
              </div>
            </template>

            <template v-slot:[`item.name`]="{ item }">
              <span :class="{
                'done-text':         item.done,
                'sync-error-text':   item.syncError,
                'sync-pending-text': !item.syncError && pendingItemIds.includes(String(item.id))
              }">
                {{ item.name }}
                <v-icon v-if="item.syncError" color="error" size="small" title="Sync fehlgeschlagen">mdi-sync-alert</v-icon>
                <v-icon v-else-if="pendingItemIds.includes(String(item.id))" color="warning" size="small" title="Ausstehende Synchronisierung">mdi-cloud-upload-outline</v-icon>
              </span>
            </template>

            <template v-slot:[`item.preis`]="{ item }">
              <span v-if="item.preis">€ {{ item.preis }}</span>
            </template>

            <template v-slot:[`item.actions`]="{ item }">
              <div class="d-flex justify-end">
                <v-btn variant="text" color="blue-grey" class="mr-2" icon="mdi-pencil" size="small" @click="openEditDialog(item)" />
                <v-btn variant="text" color="error" icon="mdi-delete" size="small" @click="removeItem(item.id)" />
              </div>
            </template>
          </v-data-table>

          <!-- Mobile: card list -->
          <div class="d-sm-none">
            <v-list v-if="shoppingList.length > 0" lines="two" class="pa-0">
              <template v-for="(item, idx) in filteredList" :key="item.id">
                <v-list-item :class="{ 'item-done': item.done }">
                  <template v-slot:prepend>
                    <input
                        type="checkbox"
                        v-model="item.done"
                        style="width: 22px; height: 22px; cursor: pointer; margin-right: 12px;"
                        @change="toggleDone(item)"
                    >
                  </template>

                  <v-list-item-title :class="{
                    'done-text':         item.done,
                    'sync-error-text':   item.syncError,
                    'sync-pending-text': !item.syncError && pendingItemIds.includes(String(item.id))
                  }">
                    {{ item.name }}
                    <v-icon v-if="item.syncError" color="error" size="x-small">mdi-sync-alert</v-icon>
                    <v-icon v-else-if="pendingItemIds.includes(String(item.id))" color="warning" size="x-small">mdi-cloud-upload-outline</v-icon>
                  </v-list-item-title>

                  <v-list-item-subtitle>
                    <v-chip size="x-small" variant="tonal" class="mr-1">{{ item.category }}</v-chip>
                    <span class="text-caption">{{ item.menge }}</span>
                    <span v-if="item.preis" class="text-caption ml-2 font-weight-bold">€ {{ item.preis }}</span>
                  </v-list-item-subtitle>

                  <template v-slot:append>
                    <v-btn variant="text" color="blue-grey" icon="mdi-pencil" size="x-small" density="comfortable" @click="openEditDialog(item)" />
                    <v-btn variant="text" color="error" icon="mdi-delete" size="x-small" density="comfortable" @click="removeItem(item.id)" />
                  </template>
                </v-list-item>
                <v-divider v-if="idx < filteredList.length - 1" />
              </template>
            </v-list>
          </div>

          <v-alert v-if="shoppingList.length === 0" type="info" variant="tonal" class="mt-4">
            Die Liste ist leer.
          </v-alert>
        </v-card>
      </v-col>
    </v-row>

    <!-- Status snackbar (error / warning / success) -->
    <v-snackbar v-model="snackbarVisible" :color="snackbarColor" timeout="5000" location="bottom">
      <v-icon start>{{ snackbarIcon }}</v-icon>
      {{ snackbarText }}
      <template #actions>
        <v-btn variant="text" @click="snackbarVisible = false">Schließen</v-btn>
      </template>
    </v-snackbar>

    <!-- Edit dialog -->
    <v-dialog v-model="editDialog" max-width="400" persistent>
      <v-card title="Artikel bearbeiten">
        <v-card-text>
          <v-text-field v-model="editModel.name" label="Name" variant="outlined" class="mb-4"></v-text-field>
          <v-text-field v-model="editModel.menge" label="Menge" variant="outlined" class="mb-4"></v-text-field>
          <v-text-field v-model="editModel.preis" label="Preis (€)" variant="outlined"></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" variant="text" @click="editDialog = false">Abbrechen</v-btn>
          <v-btn color="primary" variant="elevated" @click="saveEdit">Speichern</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Price tag scan dialog -->
    <PriceTagScanDialog v-model="scanDialog" @scanned="onScanned" />

    <!-- Invite code dialog -->
    <v-dialog v-model="inviteDialog" max-width="450">
      <v-card title="Liste teilen">
        <v-card-text>
          <!-- Invite code -->
          <p class="text-body-2 mb-2">Einladungscode:</p>
          <div class="invite-code-box text-body-1 font-weight-bold text-primary pa-3 rounded mb-1">
            {{ inviteCode }}
          </div>
          <p class="text-caption text-grey mb-3">Gültig für 24 Stunden</p>
          <v-btn variant="tonal" color="primary" block prepend-icon="mdi-content-copy" class="mb-4" @click="copyInviteCode">
            Code kopieren
          </v-btn>

          <v-divider class="mb-4" />

          <!-- Direct link -->
          <p class="text-body-2 mb-2">Oder direkter Link:</p>
          <v-text-field
              :model-value="shareLink"
              variant="outlined"
              density="compact"
              readonly
              hide-details
              append-inner-icon="mdi-content-copy"
              @click:append-inner="copyShareLink"
              @focus="$event.target.select()"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="grey-darken-1" variant="text" @click="inviteDialog = false">Schließen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Conflict dialog -->
    <v-dialog v-model="conflictDialog" max-width="640" persistent>
      <v-card>
        <v-card-title class="d-flex align-center pa-4">
          <v-icon color="warning" class="mr-2">mdi-alert</v-icon>
          Synchronisierungskonflikt
        </v-card-title>

        <!-- Already resolved by someone else -->
        <template v-if="conflictAlreadyResolved">
          <v-card-text>
            <v-alert type="success" variant="tonal">
              Dieser Konflikt wurde bereits von
              <strong>{{ conflictResolutionInfo?.resolvedBy }}</strong> gelöst
              ({{ formatTime(conflictResolutionInfo?.resolvedAt) }}).
            </v-alert>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" variant="elevated" @click="acknowledgeConflict">OK</v-btn>
          </v-card-actions>
        </template>

        <!-- Conflict picker -->
        <template v-else>
          <v-card-text>
            <p class="text-body-2 text-grey mb-4">
              Während du offline warst wurden gleichzeitig Änderungen gemacht. Bitte wähle für jeden Eintrag die gewünschte Version.
            </p>

            <div v-for="entry in conflictEntries" :key="String(entry.itemId)" class="mb-5">
              <div class="text-subtitle-2 mb-2 font-weight-bold">
                {{ entry.versionA?.name ?? entry.versionB?.name }}
              </div>
              <v-row>
                <!-- Version A -->
                <v-col cols="6">
                  <v-card
                      :variant="entry.chosen === 'A' ? 'elevated' : 'outlined'"
                      :color="entry.chosen === 'A' ? 'primary' : undefined"
                      class="pa-3 cursor-pointer h-100"
                      @click="entry.chosen = 'A'"
                  >
                    <div class="text-caption font-weight-medium mb-1">Version A</div>
                    <div v-if="conflictVersionATime" class="text-caption text-grey mb-2">
                      {{ formatTime(conflictVersionATime) }}
                    </div>
                    <template v-if="entry.versionA">
                      <div class="d-flex align-center mb-1">
                        <v-icon :color="entry.versionA.done ? 'success' : 'grey'" size="small">
                          {{ entry.versionA.done ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                        </v-icon>
                        <span class="ml-2 text-body-2">{{ entry.versionA.done ? 'Erledigt' : 'Offen' }}</span>
                      </div>
                      <div class="text-body-2">{{ entry.versionA.name }}</div>
                      <div class="text-caption text-grey">Menge: {{ entry.versionA.menge }}</div>
                      <div v-if="entry.versionA.preis" class="text-caption text-grey">Preis: € {{ entry.versionA.preis }}</div>
                      <div v-if="entry.versionA.updatedAt" class="text-caption text-grey mt-1">
                        Geändert: {{ formatTime(entry.versionA.updatedAt) }}
                      </div>
                    </template>
                    <template v-else>
                      <div class="text-body-2 text-grey font-italic">Artikel nicht vorhanden</div>
                    </template>
                  </v-card>
                </v-col>

                <!-- Version B -->
                <v-col cols="6">
                  <v-card
                      :variant="entry.chosen === 'B' ? 'elevated' : 'outlined'"
                      :color="entry.chosen === 'B' ? 'primary' : undefined"
                      class="pa-3 cursor-pointer h-100"
                      @click="entry.chosen = 'B'"
                  >
                    <div class="text-caption font-weight-medium mb-1">Version B</div>
                    <div v-if="conflictVersionBTime" class="text-caption text-grey mb-2">
                      {{ formatTime(conflictVersionBTime) }}
                    </div>
                    <template v-if="entry.versionB">
                      <div class="d-flex align-center mb-1">
                        <v-icon :color="entry.versionB.done ? 'success' : 'grey'" size="small">
                          {{ entry.versionB.done ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                        </v-icon>
                        <span class="ml-2 text-body-2">{{ entry.versionB.done ? 'Erledigt' : 'Offen' }}</span>
                      </div>
                      <div class="text-body-2">{{ entry.versionB.name }}</div>
                      <div class="text-caption text-grey">Menge: {{ entry.versionB.menge }}</div>
                      <div v-if="entry.versionB.preis" class="text-caption text-grey">Preis: € {{ entry.versionB.preis }}</div>
                      <div v-if="entry.versionB.updatedAt" class="text-caption text-grey mt-1">
                        Geändert: {{ formatTime(entry.versionB.updatedAt) }}
                      </div>
                    </template>
                    <template v-else>
                      <div class="text-body-2 text-grey font-italic">Artikel nicht vorhanden</div>
                    </template>
                  </v-card>
                </v-col>
              </v-row>
            </div>

            <v-alert v-if="hasMultipleConflicts" type="warning" variant="tonal" density="compact" class="mt-2">
              Es gibt mehrere Konfliktvarianten. Nur die erste wird hier angezeigt. Nach der Auflösung kann ein weiterer Konflikt sichtbar werden.
            </v-alert>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="grey-darken-1" variant="text" @click="conflictDialog = false">Abbrechen</v-btn>
            <v-btn
                color="primary"
                variant="elevated"
                :disabled="conflictEntries.some(e => e.chosen === null)"
                @click="applyConflictResolution"
            >
              Übernehmen
            </v-btn>
          </v-card-actions>
        </template>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { simulatedOffline, isOffline, lastSyncErrorMessage, listDb, createInviteCode, formatInviteCode } from '@/utils/listHash';
import type { ListItem, ListMeta, ConflictResolution } from '@/utils/types';
import { currentUser } from '@/utils/auth';
import PriceTagScanDialog from '@/components/PriceTagScanDialog.vue';

const route = useRoute();

const listHash        = computed(() => route.params.hash as string ?? '');
const currentListName = ref<string>('Einkaufsliste');

/** True when the user has no network connection (real or simulated). */
const effectivelyOffline = computed(() => simulatedOffline.value || isOffline.value);

const PRODUCT_CATEGORIES = [
  { id: 'Obst & Gemüse',  label: 'Obst & Gemüse', icon: 'mdi-carrot' },
  { id: 'Milchprodukte',  label: 'Milchprodukte',  icon: 'mdi-cheese' },
  { id: 'Backwaren',      label: 'Backwaren',       icon: 'mdi-bread-slice' },
  { id: 'Fleisch/Fisch',  label: 'Fleisch/Fisch',   icon: 'mdi-food-steak' },
  { id: 'Tiefkühl',       label: 'Tiefkühl',        icon: 'mdi-snowflake' },
  { id: 'Drogerie',       label: 'Drogerie',        icon: 'mdi-lipstick' },
  { id: 'Haushalt',       label: 'Haushalt',        icon: 'mdi-spray-bottle' },
  { id: 'Sonstiges',      label: 'Sonstiges',       icon: 'mdi-package-variant' },
];

const selectedCategory = ref('Sonstiges');

let listDoc: (ListMeta & { _conflicts?: string[] }) | null = null;
let changeListener: any = null;

// ── Pending sync tracking ──────────────────────────────────────────────────────

const pendingItemIds = ref<string[]>([]);
const pendingCount   = computed(() => pendingItemIds.value.length);

// ── Snackbar ──────────────────────────────────────────────────────────────────

const snackbarVisible = ref(false);
const snackbarText    = ref('');
const snackbarColor   = ref<'error' | 'warning' | 'success'>('error');
const snackbarIcon    = computed(() => ({
  error:   'mdi-sync-alert',
  warning: 'mdi-wifi-off',
  success: 'mdi-check-circle',
}[snackbarColor.value]));

function showSnackbar(text: string, color: 'error' | 'warning' | 'success' = 'error') {
  snackbarText.value    = text;
  snackbarColor.value   = color;
  snackbarVisible.value = true;
}

// ── Offline / online watcher ───────────────────────────────────────────────────

watch(effectivelyOffline, (offline) => {
  if (offline) {
    showSnackbar('Kein Internet – Änderungen werden lokal gespeichert.', 'warning');
  } else {
    pendingItemIds.value = [];
    showSnackbar('Wieder online – Synchronisierung läuft.', 'success');
  }
});

watch(lastSyncErrorMessage, (msg) => {
  if (msg) {
    showSnackbar(msg, 'error');
    lastSyncErrorMessage.value = '';
  }
});

// ── Conflict state ────────────────────────────────────────────────────────────

// Tracks conflict resolutions acknowledged in this session so the resolver
// doesn't see their own resolution as a foreign warning, and the other user
// sees the warning exactly once until they click OK.
const acknowledgedResolutionTimes = new Set<string>();

interface ConflictEntry {
  itemId: string;
  versionA: ListItem | null;
  versionB: ListItem | null;
  chosen: 'A' | 'B' | null;
}

const hasConflict             = ref(false);
const conflictDialog          = ref(false);
const conflictAlreadyResolved = ref(false);
const conflictResolutionInfo  = ref<ConflictResolution | null>(null);
const conflictEntries         = ref<ConflictEntry[]>([]);
const conflictVersionATime    = ref<string | null>(null);
const conflictVersionBTime    = ref<string | null>(null);
const hasMultipleConflicts    = ref(false);

let pendingConflictRevs: string[] = [];
let pendingWinningDoc: (ListMeta & { _conflicts?: string[] }) | null = null;

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  await fetchItems();

  changeListener = listDb.changes({
    since: 'now',
    live: true,
    include_docs: true,
    conflicts: true,
    doc_ids: [listHash.value],
  }).on('change', (change: any) => {
    if (change.id !== listHash.value || !change.doc) return;
    const doc = change.doc as ListMeta & { _conflicts?: string[] };

    listDoc = doc;
    currentListName.value = doc.name;
    shoppingList.value = doc.items || [];

    if (doc._conflicts && doc._conflicts.length > 0) {
      hasConflict.value = true;
    } else if (
      doc.conflictResolution &&
      !acknowledgedResolutionTimes.has(doc.conflictResolution.resolvedAt)
    ) {
      hasConflict.value = true;
    } else {
      hasConflict.value = false;
    }
  });
});

onUnmounted(() => {
  if (changeListener) changeListener.cancel();
});

// ── List state ────────────────────────────────────────────────────────────────

const searchQuery  = ref('');
const newItemMenge = ref('');
const newItemPreis = ref('');
const shoppingList = ref<ListItem[]>([]);
const editDialog   = ref(false);
const scanDialog   = ref(false);
const inviteDialog  = ref(false);
const inviteCode    = ref('');
const selectedId   = ref<string>('');
const editModel    = ref<ListItem>({ id: '', name: '', menge: '', done: false, category: 'Sonstiges' });

/** Filtered list for mobile view (respects search query). */
const filteredList = computed(() => {
  if (!searchQuery.value) return shoppingList.value;
  const q = searchQuery.value.toLowerCase();
  return shoppingList.value.filter(i => i.name.toLowerCase().includes(q));
});

const headers = [
  { title: 'Done',     key: 'done',    align: 'start' as const, sortable: false, width: '50px' },
  { title: 'Artikel',  key: 'name',    align: 'start' as const, sortable: true },
  { title: 'Menge',    key: 'menge',   align: 'start' as const, sortable: true },
  { title: 'Preis',    key: 'preis',   align: 'start' as const, sortable: true },
  { title: 'Aktionen', key: 'actions', align: 'end'   as const, sortable: false },
];

// ── DB operations ─────────────────────────────────────────────────────────────

const fetchItems = async () => {
  try {
    const doc = await (listDb as any).get(listHash.value, { conflicts: true }) as ListMeta & { _conflicts?: string[] };
    listDoc = doc;
    currentListName.value = doc.name;
    shoppingList.value = doc.items || [];

    if (doc._conflicts && doc._conflicts.length > 0) {
      hasConflict.value = true;
    } else if (
      doc.conflictResolution &&
      !acknowledgedResolutionTimes.has(doc.conflictResolution.resolvedAt)
    ) {
      hasConflict.value = true;
    }
  } catch (err: any) {
    if (err.status !== 404) console.warn('[fetchItems]', err);
  }
};

const saveItemsToDb = async (changedItemId?: string) => {
  if (!listDoc) return;
  listDoc.items  = [...shoppingList.value];
  listDoc.savedAt = new Date().toISOString();
  try {
    const response = await listDb.put(listDoc);
    listDoc._rev = response.rev;
    if (changedItemId) {
      const idx = shoppingList.value.findIndex(i => i.id === changedItemId);
      if (idx !== -1) shoppingList.value[idx]!.syncError = false;
      // Track pending if offline
      if (effectivelyOffline.value && !pendingItemIds.value.includes(changedItemId)) {
        pendingItemIds.value = [...pendingItemIds.value, changedItemId];
      }
    }
  } catch (err) {
    console.warn('Save failed:', err);
    if (changedItemId) {
      const idx = shoppingList.value.findIndex(i => i.id === changedItemId);
      if (idx !== -1) shoppingList.value[idx]!.syncError = true;
    }
    showSnackbar('Speichern fehlgeschlagen. Bitte Verbindung prüfen.', 'error');
    await fetchItems();
  }
};

// ── Conflict resolution ───────────────────────────────────────────────────────

const openConflictDialog = async () => {
  const doc = await (listDb as any).get(listHash.value, { conflicts: true }) as ListMeta & { _conflicts?: string[] };

  // No active CouchDB conflicts — check if already resolved
  if (!doc._conflicts || doc._conflicts.length === 0) {
    if (doc.conflictResolution) {
      conflictAlreadyResolved.value = true;
      conflictResolutionInfo.value  = doc.conflictResolution;
    } else {
      hasConflict.value = false;
      return;
    }
    conflictDialog.value = true;
    return;
  }

  hasMultipleConflicts.value = doc._conflicts.length > 1;

  const winningDoc     = doc;
  const conflictRev    = doc._conflicts[0]!;
  const conflictingDoc = await (listDb as any).get(listHash.value, { rev: conflictRev }) as ListMeta;

  const winItems = winningDoc.items    || [];
  const conItems = conflictingDoc.items || [];

  const entries: ConflictEntry[] = [];
  const seenIds = new Set<string>();

  // Items present in the winning version
  for (const wi of winItems) {
    seenIds.add(String(wi.id));
    const ci = conItems.find((c: ListItem) => c.id === wi.id);
    if (ci) {
      // Both versions have this item — show if any field differs
      const differs =
        wi.done     !== ci.done     ||
        wi.name     !== ci.name     ||
        wi.menge    !== ci.menge    ||
        (wi.preis   ?? '') !== (ci.preis ?? '') ||
        wi.category !== ci.category;
      if (differs) {
        entries.push({ itemId: String(wi.id), versionA: { ...wi }, versionB: { ...ci }, chosen: null });
      }
    } else {
      // Item exists in A but not in B (added in A or deleted in B)
      entries.push({ itemId: String(wi.id), versionA: { ...wi }, versionB: null, chosen: null });
    }
  }

  // Items only in the conflicting version (added in B or deleted in A)
  for (const ci of conItems) {
    if (!seenIds.has(String(ci.id))) {
      entries.push({ itemId: String(ci.id), versionA: null, versionB: { ...ci }, chosen: null });
    }
  }

  if (entries.length === 0) {
    // Revisions are identical in content — just delete the losing revision
    for (const rev of doc._conflicts) {
      try { await (listDb as any).remove(listHash.value, rev); } catch { /* ignore */ }
    }
    hasConflict.value = false;
    return;
  }

  pendingConflictRevs           = doc._conflicts;
  pendingWinningDoc             = winningDoc;
  conflictEntries.value         = entries;
  conflictAlreadyResolved.value = false;
  conflictVersionATime.value    = winningDoc.savedAt    ?? null;
  conflictVersionBTime.value    = conflictingDoc.savedAt ?? null;
  conflictDialog.value          = true;
};

const applyConflictResolution = async () => {
  if (!pendingWinningDoc) return;

  // Start with a mutable copy of the winning doc's items
  const mergedItems = [...(pendingWinningDoc.items || [])];

  for (const entry of conflictEntries.value) {
    const idx = mergedItems.findIndex(i => String(i.id) === entry.itemId);

    if (entry.chosen === 'A') {
      if (entry.versionA) {
        // Keep/overwrite with version A
        if (idx !== -1) mergedItems[idx] = { ...entry.versionA };
        // If not present (was only in B), leave it absent
      } else {
        // Version A has no such item → delete it
        if (idx !== -1) mergedItems.splice(idx, 1);
      }
    } else if (entry.chosen === 'B') {
      if (entry.versionB) {
        if (idx !== -1) {
          mergedItems[idx] = { ...entry.versionB };
        } else {
          // Item only existed in B → add it
          mergedItems.push({ ...entry.versionB });
        }
      } else {
        // Version B has no such item → delete it
        if (idx !== -1) mergedItems.splice(idx, 1);
      }
    }
  }

  // Delete all losing conflict revisions
  for (const rev of pendingConflictRevs) {
    try { await (listDb as any).remove(listHash.value, rev); }
    catch (e) { console.warn('[conflict] failed to remove rev', rev, e); }
  }

  const resolvedAt = new Date().toISOString();
  const resolvedDoc: ListMeta & { _conflicts?: string[] } = {
    ...pendingWinningDoc,
    items: mergedItems,
    conflictResolution: { resolvedBy: currentUser.value || 'Unbekannt', resolvedAt },
  };
  delete resolvedDoc._conflicts;

  const response = await listDb.put(resolvedDoc);
  listDoc = { ...resolvedDoc, _rev: response.rev };
  shoppingList.value = mergedItems;

  acknowledgedResolutionTimes.add(resolvedAt);
  hasConflict.value    = false;
  conflictDialog.value = false;
};

const acknowledgeConflict = () => {
  if (conflictResolutionInfo.value?.resolvedAt) {
    acknowledgedResolutionTimes.add(conflictResolutionInfo.value.resolvedAt);
  }
  hasConflict.value    = false;
  conflictDialog.value = false;
};

const formatTime = (iso?: string | null): string => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('de-AT');
};

// ── List operations ───────────────────────────────────────────────────────────

const addItem = async () => {
  if (!searchQuery.value) return;
  const newItem: ListItem = {
    id:        Date.now().toString(),
    name:      searchQuery.value,
    menge:     newItemMenge.value || '1',
    preis:     newItemPreis.value || undefined,
    done:      false,
    category:  selectedCategory.value || 'Sonstiges',
    updatedAt: new Date().toISOString(),
  };
  shoppingList.value.push(newItem);
  searchQuery.value  = '';
  newItemMenge.value = '';
  newItemPreis.value = '';
  await saveItemsToDb(newItem.id);
};

const onScanned = (data: { name: string; preis: string }) => {
  searchQuery.value  = data.name;
  newItemPreis.value = data.preis;
};

const generateInvite = () => {
  const raw = createInviteCode(listHash.value);
  inviteCode.value  = formatInviteCode(raw);
  inviteDialog.value = true;
};

const shareLink = computed(() => {
  const base = window.location.origin + (import.meta.env.BASE_URL || '/');
  return `${base}list/${listHash.value}`;
});

const copyInviteCode = async () => {
  try {
    await navigator.clipboard.writeText(inviteCode.value);
    showSnackbar('Code kopiert!', 'success');
  } catch {
    showSnackbar('Kopieren fehlgeschlagen.', 'error');
  }
};

const copyShareLink = async () => {
  try {
    await navigator.clipboard.writeText(shareLink.value);
    showSnackbar('Link kopiert!', 'success');
  } catch {
    showSnackbar('Kopieren fehlgeschlagen.', 'error');
  }
};

const toggleDone = async (item: ListItem) => {
  item.updatedAt = new Date().toISOString();
  await saveItemsToDb(item.id);
};

const removeItem = async (id: string) => {
  pendingItemIds.value = pendingItemIds.value.filter(p => p !== id);
  shoppingList.value   = shoppingList.value.filter(item => item.id !== id);
  await saveItemsToDb();
};

function openEditDialog(item: ListItem) {
  selectedId.value = item.id;
  editModel.value  = { ...item };
  editDialog.value = true;
}

const saveEdit = async () => {
  editDialog.value = false;
  const index = shoppingList.value.findIndex(i => i.id === selectedId.value);
  if (index !== -1) {
    shoppingList.value[index] = { ...editModel.value, updatedAt: new Date().toISOString() };
  }
  await saveItemsToDb(selectedId.value);
};
</script>

<style scoped>
.done-text {
  text-decoration: line-through !important;
  color: grey !important;
}
.item-done {
  opacity: 0.6;
}
input[type="checkbox"] {
  accent-color: #4caf50;
}
.hash-label {
  font-family: monospace;
  font-size: 0.75rem;
  word-break: break-all;
}
.min-width-0 {
  min-width: 0;
}
.sync-error-text {
  color: rgb(var(--v-theme-error)) !important;
}
.sync-pending-text {
  color: rgb(var(--v-theme-warning)) !important;
}
.invite-code-box {
  font-family: monospace;
  letter-spacing: 0.15em;
  background: rgba(var(--v-theme-primary), 0.08);
  text-align: center;
  word-break: break-all;
}
.cursor-pointer {
  cursor: pointer;
}
</style>
