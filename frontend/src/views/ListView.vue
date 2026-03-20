<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">
        <v-card elevation="3" class="pa-4">

          <!-- Header: list name + username + actions -->
          <div class="d-flex align-center mb-2">
            <div class="flex-grow-1">
              <h1 class="text-h4 font-weight-bold">
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


          <v-row class="mb-4" dense>
            <v-col cols="12" sm="4">
              <v-text-field
                  v-model="searchQuery"
                  label="Artikel..."
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  @keyup.enter="addItem"
              ></v-text-field>
            </v-col>
            <v-col cols="6" sm="3">
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
            <v-col cols="3" sm="2">
              <v-text-field
                  v-model="newItemMenge"
                  label="Menge"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  @keyup.enter="addItem"
              ></v-text-field>
            </v-col>
            <v-col cols="3" sm="3">
              <v-btn color="primary" height="48" block elevation="1" @click="addItem">
                <v-icon>mdi-plus</v-icon>
              </v-btn>
            </v-col>
          </v-row>

          <v-divider class="mb-6"></v-divider>

          <v-data-table
              :headers="headers"
              :items="shoppingList"
              :search="searchQuery"
              :group-by="[{ key: 'category', order: 'asc' }]"
              class="elevation-0"
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
              <span :class="{ 'done-text': item.done, 'sync-error-text': item.syncError }">
                {{ item.name }}
                <v-icon v-if="item.syncError" color="error" size="small" title="Sync fehlgeschlagen">mdi-sync-alert</v-icon>
              </span>
            </template>

            <template v-slot:[`item.actions`]="{ item }">
              <div class="d-flex justify-end">
                <v-btn variant="text" color="blue-grey" class="mr-2" icon="mdi-pencil" @click="openEditDialog(item)" />
                <v-btn variant="text" color="error" icon="mdi-delete" @click="removeItem(item.id)" />
              </div>
            </template>
          </v-data-table>

          <v-alert v-if="shoppingList.length === 0" type="info" variant="tonal" class="mt-4">
            Die Liste ist leer.
          </v-alert>
        </v-card>
      </v-col>
    </v-row>

    <!-- Sync error snackbar -->
    <v-snackbar v-model="syncErrorSnackbar" color="error" timeout="5000" location="bottom">
      <v-icon start>mdi-sync-alert</v-icon>
      {{ syncErrorText }}
      <template #actions>
        <v-btn variant="text" @click="syncErrorSnackbar = false">Schließen</v-btn>
      </template>
    </v-snackbar>

    <!-- Edit dialog -->
    <v-dialog v-model="editDialog" max-width="400" persistent>
      <v-card title="Artikel bearbeiten">
        <v-card-text>
          <v-text-field v-model="editModel.name" label="Name" variant="outlined" class="mb-4"></v-text-field>
          <v-text-field v-model="editModel.menge" label="Menge" variant="outlined"></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" variant="text" @click="editDialog = false">Abbrechen</v-btn>
          <v-btn color="primary" variant="elevated" @click="saveEdit">Speichern</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { getListsCreated, couchDbStatus, simulatedOffline, toggleOffline, listDb, lastSyncErrorMessage } from '@/utils/listHash';
import type { ListItem, ListMeta } from '@/utils/types';
import { currentUser } from '@/utils/auth';



const route = useRoute();

const listHash = computed(() => route.params.hash as string ?? '');
const debugMode = computed(() => route.query.debug === 'true');
const currentListName = ref<string>('Einkaufsliste');
const totalListsCreated = ref(0);

// Ergänze dies oben bei deinen anderen Konstanten
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

const selectedCategory = ref('produce'); // Standardwert für neue Artikel

let listDoc: ListMeta | null = null;
let changeListener: any = null;

onMounted(async () => {
  totalListsCreated.value = await getListsCreated();
  await fetchItems();
  
  // listen for realtime updates
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
const shoppingList = ref<ListItem[]>([]);
const editDialog   = ref(false);
const selectedId   = ref<any>(null);
const editModel = ref<ListItem>({ id: '', name: '', menge: '', done: false, category: 'other' });

const syncErrorSnackbar = ref(false);
const syncErrorText = ref('');

watch(lastSyncErrorMessage, (msg) => {
  if (msg) {
    syncErrorText.value = msg;
    syncErrorSnackbar.value = true;
    lastSyncErrorMessage.value = '';
  }
});

const headers = [
  { title: 'Done',    key: 'done',    align: 'start' as const, sortable: false, width: '50px' },
  { title: 'Artikel', key: 'name',    align: 'start' as const, sortable: true },
  { title: 'Menge',   key: 'menge',   align: 'start' as const, sortable: true },
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
    // Clear syncError on success for the saved item
    if (changedItemId) {
      const idx = shoppingList.value.findIndex(i => i.id === changedItemId);
      if (idx !== -1) shoppingList.value[idx] = { ...shoppingList.value[idx], syncError: false };
    }
  } catch (err) {
    console.warn('Save failed:', err);
    // Mark affected item with syncError
    if (changedItemId) {
      const idx = shoppingList.value.findIndex(i => i.id === changedItemId);
      if (idx !== -1) shoppingList.value[idx] = { ...shoppingList.value[idx], syncError: true };
    }
    syncErrorText.value = 'Speichern fehlgeschlagen. Bitte Verbindung prüfen.';
    syncErrorSnackbar.value = true;
    await fetchItems();
  }
};

const addItem = async () => {
  if (!searchQuery.value) return;
  const newItem: ListItem = {
    id: Date.now().toString(),
    name: searchQuery.value,
    menge: newItemMenge.value || '1',
    done: false,
    category: selectedCategory.value // WICHTIG: Damit die Auswahl gespeichert wird
  };
  shoppingList.value.push(newItem);
  searchQuery.value = '';
  newItemMenge.value = '';
  await saveItemsToDb(newItem.id);
};


const toggleDone = async (item: ListItem) => {
  await saveItemsToDb(item.id);
};

const removeItem = async (id: string | number) => {
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
input[type="checkbox"] {
  accent-color: #4caf50;
}
.hash-label {
  font-family: monospace;
  font-size: 0.75rem;
  word-break: break-all;
}
.sync-error-text {
  color: rgb(var(--v-theme-error)) !important;
}
</style>
