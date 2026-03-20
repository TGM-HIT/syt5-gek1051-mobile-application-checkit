<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">
        <v-card elevation="3" class="pa-2 pa-sm-4">

          <!-- Header: list name + username + actions -->
          <div class="d-flex align-center mb-2">
            <div class="flex-grow-1 min-width-0">
              <h1 class="text-h5 text-sm-h4 font-weight-bold text-truncate">
                {{ currentListName }}
              </h1>
              <div class="text-caption text-grey mt-1 hash-label">
                /list/{{ listHash }}
              </div>
            </div>

            <!-- CouchDB sync status (debug only) -->
            <v-chip
                v-if="debugMode"
                :color="syncColor"
                variant="tonal"
                size="x-small"
                class="mr-2"
                :title="'CouchDB: ' + couchDbStatus"
            >
              {{ syncLabel }}
            </v-chip>

            <!-- Debug: offline toggle -->
            <v-btn
                v-if="debugMode"
                :color="simulatedOffline ? 'error' : 'success'"
                variant="tonal"
                size="small"
                class="mr-2"
                @click="toggleOffline"
            >
              <v-icon start>{{ simulatedOffline ? 'mdi-wifi-off' : 'mdi-wifi' }}</v-icon>
              {{ simulatedOffline ? 'Offline' : 'Online' }}
            </v-btn>

            <!-- Settings -->
            <v-btn to="/settings" variant="text" icon="mdi-cog" color="grey-darken-2" />
          </div>

          <v-chip color="grey-darken-1" variant="outlined" size="small" class="mb-4">
            <v-icon start>mdi-earth</v-icon>
            {{ totalListsCreated }} Liste{{ totalListsCreated === 1 ? '' : 'n' }} insgesamt erstellt
          </v-chip>

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
            <span v-else>
              Neue Änderungen werden lokal gespeichert.
            </span>
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

  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { getListsCreated, couchDbStatus, simulatedOffline, toggleOffline, listDb, lastSyncErrorMessage, isOffline } from '@/utils/listHash';
import type { ListItem, ListMeta } from '@/utils/types';
import { currentUser } from '@/utils/auth';
import PriceTagScanDialog from '@/components/PriceTagScanDialog.vue';



const route = useRoute();

const listHash = computed(() => route.params.hash as string ?? '');
const debugMode = computed(() => route.query.debug === 'true');
const currentListName = ref<string>('Einkaufsliste');
const totalListsCreated = ref(0);

/** True when the user has no network connection (real or simulated). */
const effectivelyOffline = computed(() => isOffline.value || simulatedOffline.value);

const PRODUCT_CATEGORIES = [
  { id: 'Obst & Gemüse', label: 'Obst & Gemüse', icon: 'mdi-carrot' },
  { id: 'Milchprodukte',   label: 'Milchprodukte', icon: 'mdi-cheese' },
  { id: 'Backwaren',  label: 'Backwaren',      icon: 'mdi-bread-slice' },
  { id: 'Fleisch/Fisch',    label: 'Fleisch/Fisch',  icon: 'mdi-food-steak' },
  { id: 'Tiefkühl',  label: 'Tiefkühl',       icon: 'mdi-snowflake' },
  { id: 'Drogerie', label: 'Drogerie',     icon: 'mdi-lipstick' },
  { id: 'Haushalt', label: 'Haushalt',     icon: 'mdi-spray-bottle' },
  { id: 'Sonstiges',   label: 'Sonstiges',      icon: 'mdi-package-variant' }
];

const selectedCategory = ref('Sonstiges');

let listDoc: ListMeta | null = null;
let changeListener: any = null;

// ─── Pending sync tracking ────────────────────────────────────────────────────
/** IDs of items changed while offline that haven't been confirmed synced yet. */
const pendingItemIds = ref<string[]>([]);
const pendingCount   = computed(() => pendingItemIds.value.length);

// ─── Snackbar ─────────────────────────────────────────────────────────────────
const snackbarVisible = ref(false);
const snackbarText    = ref('');
const snackbarColor   = ref<'error' | 'warning' | 'success'>('error');
const snackbarIcon    = computed(() => ({
  error:   'mdi-sync-alert',
  warning: 'mdi-wifi-off',
  success: 'mdi-check-circle',
}[snackbarColor.value]));

function showSnackbar(text: string, color: 'error' | 'warning' | 'success' = 'error') {
  snackbarText.value  = text;
  snackbarColor.value = color;
  snackbarVisible.value = true;
}

// ─── Offline / online watcher ─────────────────────────────────────────────────
watch(effectivelyOffline, (offline) => {
  if (offline) {
    showSnackbar('Kein Internet – Änderungen werden lokal gespeichert.', 'warning');
  } else {
    // Back online: PouchDB retries automatically; clear pending indicators
    pendingItemIds.value = [];
    showSnackbar('Wieder online – Synchronisierung läuft.', 'success');
  }
});

// Forward sync errors from listHash to the snackbar
watch(lastSyncErrorMessage, (msg) => {
  if (msg) {
    showSnackbar(msg, 'error');
    lastSyncErrorMessage.value = '';
  }
});

onMounted(async () => {
  totalListsCreated.value = await getListsCreated();
  await fetchItems();

  // Listen for realtime updates (local + synced from remote)
  changeListener = listDb.changes({
    since: 'now',
    live: true,
    include_docs: true,
    doc_ids: [listHash.value]
  }).on('change', (change) => {
    if (change.id === listHash.value && change.doc) {
      listDoc = change.doc as ListMeta;
      currentListName.value = listDoc.name;
      shoppingList.value = listDoc.items || [];
    }
  });
});

onUnmounted(() => {
  if (changeListener) changeListener.cancel();
});

const syncLabel = computed(() => ({
  connecting: 'DB connecting',
  active:     'DB active',
  paused:     'DB paused',
  error:      'DB error',
  disabled:   'DB disabled',
}[couchDbStatus.value]));

const syncColor = computed(() => ({
  connecting: 'grey',
  active:     'success',
  paused:     'warning',
  error:      'error',
  disabled:   'grey',
}[couchDbStatus.value]));

const searchQuery  = ref('');
const newItemMenge = ref('');
const newItemPreis = ref('');
const shoppingList = ref<ListItem[]>([]);
const editDialog   = ref(false);
const scanDialog   = ref(false);
const selectedId   = ref<any>(null);
const editModel = ref<ListItem>({ id: '', name: '', menge: '', done: false, category: 'other' });

/** Filtered list for mobile view (respects search query). */
const filteredList = computed(() => {
  if (!searchQuery.value) return shoppingList.value;
  const q = searchQuery.value.toLowerCase();
  return shoppingList.value.filter(i => i.name.toLowerCase().includes(q));
});

const headers = [
  { title: 'Done',    key: 'done',    align: 'start' as const, sortable: false, width: '50px' },
  { title: 'Artikel', key: 'name',    align: 'start' as const, sortable: true },
  { title: 'Menge',   key: 'menge',   align: 'start' as const, sortable: true },
  { title: 'Preis',   key: 'preis',   align: 'start' as const, sortable: true },
  { title: 'Aktionen',key: 'actions', align: 'end'   as const, sortable: false },
];

const fetchItems = async () => {
  try {
    listDoc = await listDb.get<ListMeta>(listHash.value);
    currentListName.value = listDoc.name;
    shoppingList.value = listDoc.items || [];
  } catch (err: any) {
    if (err.status !== 404) console.warn('[fetchItems]', err);
  }
};

const saveItemsToDb = async (changedItemId?: string) => {
  if (!listDoc) return;
  listDoc.items = [...shoppingList.value];
  try {
    const response = await listDb.put(listDoc);
    listDoc._rev = response.rev;
    if (changedItemId) {
      const idx = shoppingList.value.findIndex(i => i.id === changedItemId);
      if (idx !== -1) {
        shoppingList.value[idx] = { ...shoppingList.value[idx], syncError: false } as ListItem;
      }
      // Mark as pending if we're offline
      if (effectivelyOffline.value) {
        if (!pendingItemIds.value.includes(changedItemId)) {
          pendingItemIds.value = [...pendingItemIds.value, changedItemId];
        }
      }
    }
  } catch (err) {
    console.warn('Save failed:', err);
    if (changedItemId) {
      const idx = shoppingList.value.findIndex(i => i.id === changedItemId);
      if (idx !== -1) shoppingList.value[idx] = { ...shoppingList.value[idx], syncError: true } as ListItem;
    }
    showSnackbar('Speichern fehlgeschlagen. Bitte Verbindung prüfen.', 'error');
    await fetchItems();
  }
};

const addItem = async () => {
  if (!searchQuery.value) return;
  const newItem: ListItem = {
    id: Date.now().toString(),
    name: searchQuery.value,
    menge: newItemMenge.value || '1',
    preis: newItemPreis.value || undefined,
    done: false,
    category: selectedCategory.value || 'Sonstiges'
  };
  shoppingList.value.push(newItem);
  searchQuery.value = '';
  newItemMenge.value = '';
  newItemPreis.value = '';
  await saveItemsToDb(newItem.id);
};

const onScanned = (data: { name: string; preis: string }) => {
  searchQuery.value = data.name;
  newItemPreis.value = data.preis;
};

const toggleDone = async (item: ListItem) => {
  await saveItemsToDb(item.id);
};

const removeItem = async (id: string | number) => {
  pendingItemIds.value = pendingItemIds.value.filter(p => p !== String(id));
  shoppingList.value = shoppingList.value.filter(item => item.id !== id);
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
  if (index !== -1) shoppingList.value[index] = { ...editModel.value };
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
</style>
