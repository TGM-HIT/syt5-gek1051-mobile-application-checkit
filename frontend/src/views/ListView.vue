<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">
        <v-card elevation="3" class="pa-2 pa-sm-4">

          <div class="d-flex align-center mb-2">
            <div class="flex-grow-1 min-width-0">
              <h1 class="text-h5 text-sm-h4 font-weight-bold text-truncate">
                {{ currentListName }}
                <v-chip v-if="listOwner === undefined && !isLoading" size="small" color="secondary" variant="tonal" class="ml-2">Privat</v-chip>
              </h1>
              <div class="text-caption text-grey mt-1 hash-label">
                /list/{{ listHash }}
              </div>
            </div>

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

            <v-btn
                v-if="debugMode"
                :color="effectivelyOffline ? 'error' : 'success'"
                variant="tonal"
                size="small"
                class="mr-1"
                @click="toggleOffline"
            >
              {{ effectivelyOffline ? 'Offline' : 'Online' }}
            </v-btn>

            <v-btn v-if="listOwner !== undefined && !isLoading" variant="text" icon="mdi-share-variant" color="primary" @click="generateInvite" />
            <v-btn to="/settings" variant="text" icon="mdi-cog" color="grey-darken-2" />
          </div>

          <v-alert
              v-if="effectivelyOffline"
              type="warning"
              variant="tonal"
              density="compact"
              icon="mdi-wifi-off"
              class="mb-4 offline-banner"
          >
            Du bist offline.
            <span v-if="pendingCount > 0">
              {{ pendingCount }} Änderung{{ pendingCount === 1 ? '' : 'en' }} wird synchronisiert, sobald du wieder online bist.
            </span>
            <span v-else>Neue Änderungen werden lokal gespeichert.</span>
          </v-alert>

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

          <v-select
              v-model="selectedFilterCategory"
              :items="[{ id: null, label: 'Alle Kategorien' }, ...PRODUCT_CATEGORIES]"
              item-title="label"
              item-value="id"
              label="Kategorie filtern"
              variant="outlined"
              density="comfortable"
              hide-details
              clearable
              class="mb-4"
              style="max-width: 250px;"
          />

          <v-divider class="mb-4"></v-divider>

          <v-data-table
              :headers="headers"
              :items="listWithPreview"
              :search="searchQuery"
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
                'done-text': item.done,
                'sync-error-text': item.syncError,
                'sync-pending-text': !item.syncError && pendingItemIds.includes(String(item.id)),
                'preview-text': item.id === '__preview__'
              }">
                {{ item.name }}
                <v-icon v-if="item.syncError" color="error" size="small" title="Sync fehlgeschlagen">mdi-sync-alert</v-icon>
                <v-icon v-else-if="pendingItemIds.includes(String(item.id))" color="warning" size="small" title="Ausstehende Synchronisierung">mdi-cloud-upload-outline</v-icon>
              </span>
            </template>

            <template v-slot:[`item.preis`]="{ item }">
              <span v-if="item.preis">€ {{ item.preis }}</span>
            </template>

            <template v-slot:[`item.updatedAt`]="{ item }">
              <span class="text-caption text-grey">
                {{ item.updatedAt ? formatTime(item.updatedAt) : '-' }}
              </span>
            </template>

            <template v-slot:[`item.actions`]="{ item }">
              <div class="d-flex justify-end">
                <v-btn variant="text" color="blue-grey" class="mr-2" icon="mdi-pencil" size="small" @click="openEditDialog(item)" />
                <v-btn variant="text" color="error" icon="mdi-delete" size="small" @click="removeItem(item.id)" />
              </div>
            </template>
          </v-data-table>

          <div class="d-sm-none">
            <v-list v-if="shoppingList.length > 0" lines="two" class="pa-0">
              <template v-for="(item, idx) in listWithPreview" :key="item.id">
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
                    'sync-pending-text': !item.syncError && pendingItemIds.includes(String(item.id)),
                    'preview-text': item.id === '__preview__'
                  }">
                    {{ item.name }}
                    <v-icon v-if="item.syncError" color="error" size="x-small">mdi-sync-alert</v-icon>
                    <v-icon v-else-if="pendingItemIds.includes(String(item.id))" color="warning" size="x-small">mdi-cloud-upload-outline</v-icon>
                  </v-list-item-title>

                  <v-list-item-subtitle>
                    <v-chip size="x-small" variant="tonal" class="mr-1">{{ item.category }}</v-chip>
                    <span class="text-caption">{{ item.menge }}</span>
                    <span v-if="item.preis" class="text-caption ml-2 font-weight-bold">€ {{ item.preis }}</span>

                    <div class="text-caption text-grey-darken-1 mt-1">
                      <v-icon size="10" class="mr-1">mdi-clock-outline</v-icon>
                      {{ item.updatedAt ? formatTime(item.updatedAt) : 'Neu' }}
                    </div>
                  </v-list-item-subtitle>

                  <template v-slot:append>
                    <v-btn variant="text" color="blue-grey" icon="mdi-pencil" size="x-small" density="comfortable" @click="openEditDialog(item)" />
                    <v-btn variant="text" color="error" icon="mdi-delete" size="x-small" density="comfortable" @click="removeItem(item.id)" />
                  </template>
                </v-list-item>
                <v-divider v-if="idx < listWithPreview.length - 1" />
              </template>
            </v-list>
          </div>

          <v-alert v-if="shoppingList.length === 0" type="info" variant="tonal" class="mt-4">
            Die Liste ist leer.
          </v-alert>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar v-model="snackbarVisible" :color="snackbarColor" timeout="5000" location="bottom">
      <v-icon start>{{ snackbarIcon }}</v-icon>
      {{ snackbarText }}
      <template #actions>
        <v-btn variant="text" @click="snackbarVisible = false">Schließen</v-btn>
      </template>
    </v-snackbar>

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

    <PriceTagScanDialog v-model="scanDialog" @scanned="onScanned" />

    <v-dialog v-model="inviteDialog" max-width="450">
      <v-card title="Liste teilen">
        <v-card-text>
          <p class="text-body-2 mb-2">Einladungscode:</p>
          <div class="invite-code-box text-body-1 font-weight-bold text-primary pa-3 rounded mb-1">
            {{ inviteCode }}
          </div>
          <p class="text-caption text-grey mb-3">Gültig für 24 Stunden</p>
          <v-btn variant="tonal" color="primary" block prepend-icon="mdi-content-copy" class="mb-4" @click="copyInviteCode">
            Code kopieren
          </v-btn>

          <v-divider class="mb-4" />

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

    <v-dialog v-model="conflictDialog" :max-width="conflictDialogWidth" persistent>
      <v-card>
        <v-card-title class="d-flex align-center pa-4">
          <v-icon color="warning" class="mr-2">mdi-alert</v-icon>
          Synchronisierungskonflikt
        </v-card-title>

        <template v-if="conflictAlreadyResolved">
          <v-card-text>
            <v-alert type="success" variant="tonal" class="mb-4">
              Dieser Konflikt wurde bereits von
              <strong>{{ conflictResolutionInfo?.resolvedBy }}</strong> gelöst
              ({{ formatTime(conflictResolutionInfo?.resolvedAt) }}).
            </v-alert>

            <v-row v-if="conflictResolutionInfo?.versions?.length">
              <v-col
                  v-for="(v, i) in conflictResolutionInfo.versions"
                  :key="i"
                  :cols="Math.floor(12 / conflictResolutionInfo.versions.length)"
                  class="d-flex flex-column"
              >
                <v-card
                    :variant="v.chosen ? 'elevated' : 'outlined'"
                    :color="v.chosen ? 'success' : undefined"
                    class="flex-grow-1 d-flex flex-column"
                >
                  <v-card-title class="text-subtitle-2 pb-0">
                    {{ v.label }}
                    <v-icon v-if="v.chosen" size="small" class="ml-1">mdi-check-circle</v-icon>
                  </v-card-title>
                  <v-card-subtitle v-if="v.savedAt" class="text-caption">
                    {{ formatTime(v.savedAt) }}
                  </v-card-subtitle>
                  <v-card-text class="flex-grow-1 pt-2">
                    <div
                        v-for="item in v.items"
                        :key="String(item.id)"
                        class="d-flex align-center mb-1"
                    >
                      <v-icon :color="item.done ? 'success' : 'grey'" size="small" class="mr-1">
                        {{ item.done ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                      </v-icon>
                      <span class="text-body-2">{{ item.name }}</span>
                      <span class="text-caption text-grey ml-1">({{ item.menge }})</span>
                    </div>
                    <div v-if="v.items.length === 0" class="text-caption text-grey font-italic">
                      Keine Artikel
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" variant="elevated" @click="acknowledgeConflict">OK</v-btn>
          </v-card-actions>
        </template>

        <template v-else>
          <v-card-text>
            <p class="text-body-2 text-grey mb-4">
              Während du offline warst wurden gleichzeitig Änderungen gemacht. Welche Version soll übernommen werden?
            </p>

            <v-row>
              <v-col
                  v-for="(v, i) in conflictVersions"
                  :key="i"
                  :cols="Math.floor(12 / conflictVersions.length)"
                  class="d-flex flex-column"
              >
                <v-card variant="outlined" class="flex-grow-1 d-flex flex-column">
                  <v-card-title class="text-subtitle-2 pb-0">{{ v.label }}</v-card-title>
                  <v-card-subtitle v-if="v.savedAt" class="text-caption">
                    {{ formatTime(v.savedAt) }}
                  </v-card-subtitle>
                  <v-card-text class="flex-grow-1 pt-2">
                    <div
                        v-for="item in v.items"
                        :key="String(item.id)"
                        class="d-flex align-center mb-1"
                    >
                      <v-icon :color="item.done ? 'success' : 'grey'" size="small" class="mr-1">
                        {{ item.done ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                      </v-icon>
                      <span class="text-body-2">{{ item.name }}</span>
                      <span class="text-caption text-grey ml-1">({{ item.menge }})</span>
                    </div>
                    <div v-if="v.items.length === 0" class="text-caption text-grey font-italic">
                      Keine Artikel
                    </div>
                  </v-card-text>
                  <v-card-actions>
                    <v-btn color="primary" variant="elevated" block @click="applyConflictResolution(i)">
                      Diese Version wählen
                    </v-btn>
                  </v-card-actions>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="grey-darken-1" variant="text" @click="conflictDialog = false">Abbrechen</v-btn>
          </v-card-actions>
        </template>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { simulatedOffline, isOffline, lastSyncErrorMessage, listDb, createInviteCode, toggleOffline, getListWithRemoteFallback } from '@/utils/listHash';
import type { ListItem, ListMeta, ConflictResolution, ConflictVersionSnapshot } from '@/utils/types';
import { currentUser } from '@/utils/auth';
import PriceTagScanDialog from '@/components/PriceTagScanDialog.vue';

const route = useRoute();

const listHash = computed(() => route.params.hash as string ?? '');
const currentListName = ref<string>('Einkaufsliste');

const effectivelyOffline = computed(() => simulatedOffline.value || isOffline.value);
const debugMode = computed(() => route.query.debug === 'true');

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
const selectedFilterCategory = ref<string | null>(null);

interface ExtendedListMeta extends ListMeta {
  _conflicts?: string[];
  owner?: string;
}

let listDoc: ExtendedListMeta | null = null;
const listOwner = ref<string | undefined>(undefined);

let changeListener: any = null;

const isLoading = ref(false);
const pendingItemIds = ref<string[]>([]);
const pendingCount   = computed(() => pendingItemIds.value.length);

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

const acknowledgedResolutionTimes = new Set<string>();

function ackedStorageKey() {
  return `checkit_acked_${listHash.value}`;
}
function persistAcked() {
  localStorage.setItem(ackedStorageKey(), JSON.stringify([...acknowledgedResolutionTimes]));
}

interface ConflictVersion {
  items:   ListItem[];
  label:   string;
  savedAt: string | null;
  savedBy: string | null;
}

const hasConflict             = ref(false);
const conflictDialog          = ref(false);
const conflictAlreadyResolved = ref(false);
const conflictResolutionInfo  = ref<ConflictResolution | null>(null);
const conflictVersions        = ref<ConflictVersion[]>([]);

const conflictDialogWidth = computed(() =>
    Math.max(conflictVersions.value.length, conflictResolutionInfo.value?.versions?.length ?? 0) >= 3
        ? '960' : '640'
);

let pendingConflictRevs: string[] = [];
let pendingWinningDoc: (ListMeta & { _conflicts?: string[] }) | null = null;

onMounted(async () => {
  try {
    const stored = localStorage.getItem(ackedStorageKey());
    if (stored) JSON.parse(stored).forEach((t: string) => acknowledgedResolutionTimes.add(t));
  } catch { }

  await fetchItems();

  changeListener = listDb.changes({
    since: 'now',
    live: true,
    include_docs: true,
    conflicts: true,
    doc_ids: [listHash.value],
  }).on('change', (change: any) => {
    if (change.id !== listHash.value || !change.doc) return;

    const doc = change.doc as ExtendedListMeta;
    listDoc = doc;
    currentListName.value = doc.name;
    listOwner.value = doc.owner;
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

const previewItem = computed<ListItem | null>(() => {
  if (!searchQuery.value.trim()) return null;
  return {
    id: '__preview__',
    name: searchQuery.value,
    menge: newItemMenge.value || '1',
    preis: newItemPreis.value || undefined,
    done: false,
    category: selectedCategory.value || 'Sonstiges',
  };
});

const listWithPreview = computed(() => {
  const base = selectedFilterCategory.value
    ? shoppingList.value.filter(i => i.category === selectedFilterCategory.value)
    : shoppingList.value;
  if (!previewItem.value) return base;
  return [...base, previewItem.value];
});

const headers = [
  { title: 'Done',      key: 'done',     align: 'start' as const, sortable: false, width: '50px' },
  { title: 'Artikel',   key: 'name',     align: 'start' as const, sortable: true },
  { title: 'Kategorie', key: 'category', align: 'start' as const, sortable: true },
  { title: 'Menge',     key: 'menge',    align: 'start' as const, sortable: true },
  { title: 'Preis',     key: 'preis',    align: 'start' as const, sortable: true },
  { title: 'Geändert',  key: 'updatedAt', align: 'start' as const, sortable: true },
  { title: 'Aktionen',  key: 'actions',  align: 'end'   as const, sortable: false },
];

const fetchItems = async () => {
  isLoading.value = true;
  try {
    const doc = await getListWithRemoteFallback(listHash.value) as ExtendedListMeta;
    listDoc = doc;
    currentListName.value = doc.name;
    listOwner.value = doc.owner;
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
    if (err.status === 404) {
      currentListName.value = 'Liste nicht gefunden';
      listOwner.value = undefined;
    } else {
      console.warn('[fetchItems]', err);
    }
  } finally {
    isLoading.value = false;
  }
};

const saveItemsToDb = async (changedItemId?: string) => {
  if (!listDoc) return;
  listDoc.items   = [...shoppingList.value];
  listDoc.savedAt = new Date().toISOString();
  listDoc.savedBy = currentUser.value || 'Unbekannt';
  try {
    const response = await listDb.put(listDoc);
    listDoc._rev = response.rev;
    if (changedItemId) {
      const idx = shoppingList.value.findIndex(i => i.id === changedItemId);
      if (idx !== -1) shoppingList.value[idx]!.syncError = false;
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

const openConflictDialog = async () => {
  const doc = await (listDb as any).get(listHash.value, { conflicts: true }) as ListMeta & { _conflicts?: string[] };

  if (!doc._conflicts || doc._conflicts.length === 0) {
    if (doc.conflictResolution) {
      conflictAlreadyResolved.value = true;
      conflictResolutionInfo.value  = doc.conflictResolution;
      conflictVersions.value        = [];
    } else {
      hasConflict.value = false;
      return;
    }
    conflictDialog.value = true;
    return;
  }

  const allDocs: (ListMeta & { _conflicts?: string[] })[] = [doc];
  for (const rev of doc._conflicts) {
    const d = await (listDb as any).get(listHash.value, { rev }) as ListMeta;
    allDocs.push(d);
  }

  const firstItems = JSON.stringify(doc.items ?? []);
  if (allDocs.every(d => JSON.stringify(d.items ?? []) === firstItems)) {
    for (const rev of doc._conflicts) {
      try { await (listDb as any).remove(listHash.value, rev); } catch { }
    }
    hasConflict.value = false;
    return;
  }

  const user = currentUser.value || '';
  const versions: ConflictVersion[] = allDocs.map((d, i) => {
    let label: string;
    if (d.savedBy === user) {
      label = 'Deine Version';
    } else if (d.savedBy) {
      label = `Version von ${d.savedBy}`;
    } else {
      label = `Version ${String.fromCharCode(65 + i)}`;
    }
    return { items: d.items ?? [], label, savedAt: d.savedAt ?? null, savedBy: d.savedBy ?? null };
  });

  pendingConflictRevs           = doc._conflicts;
  pendingWinningDoc             = doc;
  conflictVersions.value        = versions;
  conflictAlreadyResolved.value = false;
  conflictDialog.value          = true;
};

const applyConflictResolution = async (index: number) => {
  if (!pendingWinningDoc) return;

  const chosen = conflictVersions.value[index];
  if (!chosen) return;

  const chosenItems = [...chosen.items];

  const versionSnapshots: ConflictVersionSnapshot[] = conflictVersions.value.map((v, i) => ({
    label:   v.label,
    savedAt: v.savedAt ?? undefined,
    savedBy: v.savedBy ?? undefined,
    items:   v.items,
    chosen:  i === index,
  }));

  for (const rev of pendingConflictRevs) {
    try { await (listDb as any).remove(listHash.value, rev); }
    catch (e) { console.warn('[conflict] failed to remove rev', rev, e); }
  }

  const resolvedAt  = new Date().toISOString();
  const resolvedDoc: ListMeta & { _conflicts?: string[] } = {
    ...pendingWinningDoc,
    items: chosenItems,
    conflictResolution: {
      resolvedBy: currentUser.value || 'Unbekannt',
      resolvedAt,
      versions: versionSnapshots,
    },
  };
  delete resolvedDoc._conflicts;

  const response = await listDb.put(resolvedDoc);
  listDoc = { ...resolvedDoc, _rev: response.rev };
  shoppingList.value = chosenItems;

  acknowledgedResolutionTimes.add(resolvedAt);
  persistAcked();
  hasConflict.value    = false;
  conflictDialog.value = false;
};

const acknowledgeConflict = () => {
  if (conflictResolutionInfo.value?.resolvedAt) {
    acknowledgedResolutionTimes.add(conflictResolutionInfo.value.resolvedAt);
    persistAcked();
  }
  hasConflict.value    = false;
  conflictDialog.value = false;
};

const formatTime = (iso?: string | null): string => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('de-AT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const addItem = async () => {
  if (!searchQuery.value) return;
  if (!listDoc) await fetchItems();
  if (!listDoc) return;

  const existing = shoppingList.value.find(
    i => i.name.toLowerCase() === searchQuery.value.toLowerCase()
    && i.category === (selectedCategory.value || 'Sonstiges')
  );

  if (existing) {
    const currentMenge = parseFloat(existing.menge) || 1;
    existing.menge = String(currentMenge + (parseFloat(newItemMenge.value) || 1));
    existing.updatedAt = new Date().toISOString();
    searchQuery.value = '';
    newItemMenge.value = '';
    newItemPreis.value = '';
    await saveItemsToDb(existing.id);
    return;
  }

  const newItem: ListItem = {
    id: Date.now().toString(),
    name: searchQuery.value,
    menge: newItemMenge.value || '1',
    preis: newItemPreis.value || undefined,
    done: false,
    category: selectedCategory.value || 'Sonstiges',
    updatedAt: new Date().toISOString(),
  };
  shoppingList.value.push(newItem);
  searchQuery.value = '';
  newItemMenge.value = '';
  newItemPreis.value = '';
  await saveItemsToDb(newItem.id);
};

const onScanned = (data: { name: string; preis: string }) => {
  searchQuery.value  = data.name;
  newItemPreis.value = data.preis;
};

const generateInvite = async () => {
  inviteCode.value   = await createInviteCode(listHash.value, listDoc?.name ?? '');
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
.preview-text {
  color: grey !important;
  font-style: italic;
  opacity: 0.6;
}

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
</style>