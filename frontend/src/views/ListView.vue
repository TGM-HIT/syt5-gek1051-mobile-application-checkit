<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">
        <v-card elevation="3" class="pa-2 pa-sm-4">

          <div class="d-flex align-center mb-2">
            <div class="flex-grow-1 min-width-0">
              <h1 class="text-h5 text-sm-h4 font-weight-bold text-truncate">
                <v-progress-circular v-if="isLoading" indeterminate size="24" class="mr-2" color="primary"></v-progress-circular>
                {{ currentListName }}
                <v-chip v-if="listOwner === undefined && !isLoading && !accessDenied" size="small" color="secondary" variant="tonal" class="ml-2">Privat</v-chip>
              </h1>
            </div>

            <v-btn
                v-if="hasConflict && !accessDenied"
                icon="mdi-alert"
                color="warning"
                variant="tonal"
                size="small"
                class="mr-2"
                title="Synchronisierungskonflikt – klicken zum Lösen"
                data-testid="conflict-btn"
                @click="openConflictDialog"
            />

            <v-btn
                v-if="debugMode && !accessDenied"
                :color="effectivelyOffline ? 'error' : 'success'"
                variant="tonal"
                size="small"
                class="mr-1"
                @click="toggleOffline"
            >
              {{ effectivelyOffline ? 'Offline' : 'Online' }}
            </v-btn>

            <v-btn v-if="listOwner !== undefined && !isLoading && !accessDenied" variant="text" :icon="isPinned ? 'mdi-pin' : 'mdi-pin-outline'" :color="isPinned ? 'warning' : 'grey-darken-2'" :title="isPinned ? 'Liste losgelöst' : 'Liste angeheftet'" @click="pinList" />
            <v-btn v-if="listOwner !== undefined && !isLoading && !accessDenied" variant="text" icon="mdi-share-variant" color="primary" @click="generateInvite" />
            <v-btn to="/settings" variant="text" icon="mdi-cog" color="grey-darken-2" />
          </div>

          <v-alert
              v-if="effectivelyOffline && !accessDenied"
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

          <v-alert v-if="accessDenied" type="error" variant="tonal" class="mb-4 mt-4" icon="mdi-lock">
            Dies ist eine private Liste. Du hast keine Berechtigung, darauf zuzugreifen.
          </v-alert>

          <template v-else>
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
              <template v-slot:item.done="{ item }">
                <div @click.stop v-if="item.id !== '__preview__'">
                  <input
                      type="checkbox"
                      v-model="item.done"
                      style="width: 20px; height: 20px; cursor: pointer;"
                      @change="toggleDone(item)"
                  >
                </div>
              </template>

              <template v-slot:item.name="{ item }">
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

              <template v-slot:item.preis="{ item }">
                <span v-if="item.preis">€ {{ item.preis }}</span>
              </template>

              <template v-slot:item.updatedAt="{ item }">
                <span class="text-caption text-grey">
                  {{ item.updatedAt ? formatTime(item.updatedAt) : '-' }}
                </span>
              </template>

              <template v-slot:item.actions="{ item }">
                <div class="d-flex justify-end" v-if="item.id !== '__preview__'">
                  <v-btn variant="text" color="blue-grey" class="mr-2" icon="mdi-pencil" size="small" @click="openEditDialog(item)" />
                  <v-btn variant="text" color="error" icon="mdi-delete" size="small" @click="confirmDelete(item.id)" />
                </div>
              </template>
            </v-data-table>

            <div class="d-sm-none">
              <v-list v-if="listWithPreview.length > 0" lines="two" class="pa-0">
                <template v-for="(item, idx) in listWithPreview" :key="item.id">
                  <v-list-item :class="{ 'item-done': item.done }">
                    <template v-slot:prepend v-if="item.id !== '__preview__'">
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

                    <template v-slot:append v-if="item.id !== '__preview__'">
                      <v-btn variant="text" color="blue-grey" icon="mdi-pencil" size="x-small" density="comfortable" @click="openEditDialog(item)" />
                      <v-btn variant="text" color="error" icon="mdi-delete" size="x-small" density="comfortable" @click="confirmDelete(item.id)" />
                    </template>
                  </v-list-item>
                  <v-divider v-if="idx < listWithPreview.length - 1" />
                </template>
              </v-list>
            </div>

            <v-alert v-if="shoppingList.length === 0" type="info" variant="tonal" class="mt-4">
              Die Liste ist leer.
            </v-alert>
          </template>
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

    <v-dialog v-model="deleteDialog" max-width="360">
      <v-card title="Artikel löschen">
        <v-card-text>Willst du diesen Artikel wirklich löschen?</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="grey-darken-1" variant="text" @click="deleteDialog = false">Abbrechen</v-btn>
          <v-btn color="error" variant="elevated" @click="removeItem(deleteItemId); deleteDialog = false">Löschen</v-btn>
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
                        v-for="item in getConflictItems(v.items, conflictResolutionInfo?.versions ?? [])"
                        :key="String(item.id)"
                        class="d-flex align-center mb-1"
                    >
                      <v-icon :color="item.done ? 'success' : 'grey'" size="small" class="mr-1">
                        {{ item.done ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                      </v-icon>
                      <span class="text-body-2">{{ item.name }}</span>
                      <span class="text-caption text-grey ml-1">({{ item.menge }})</span>
                    </div>
                    <div v-if="getConflictItems(v.items, conflictResolutionInfo?.versions ?? []).length === 0" class="text-caption text-grey font-italic">
                      Keine Unterschiede
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
                        v-for="item in getConflictItems(v.items, conflictVersions, pendingConflictIds)"
                        :key="String(item.id)"
                        class="d-flex align-center mb-1"
                    >
                      <v-icon :color="item.done ? 'success' : 'grey'" size="small" class="mr-1">
                        {{ item.done ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                      </v-icon>
                      <span class="text-body-2">{{ item.name }}</span>
                      <span class="text-caption text-grey ml-1">({{ item.menge }})</span>
                    </div>
                    <div v-if="getConflictItems(v.items, conflictVersions, pendingConflictIds).length === 0" class="text-caption text-grey font-italic">
                      Keine Unterschiede
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
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { simulatedOffline, isOffline, lastSyncErrorMessage, listDb, createInviteCode, toggleOffline, getListWithRemoteFallback, togglePinList, getPinState } from '@/utils/listHash';
import type { ListItem, ListMeta, ConflictResolution, ConflictVersionSnapshot } from '@/utils/types';
import { currentUser } from '@/utils/auth';
import PriceTagScanDialog from '@/components/PriceTagScanDialog.vue';
import type { RecipeIngredient } from '@/utils/recipeScan';

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
const accessDenied = ref(false);
const isPinned = ref(false);
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

function itemSignature(item: ListItem) {
  return JSON.stringify({
    name: item.name,
    menge: item.menge,
    done: item.done,
    category: item.category,
    preis: item.preis ?? null,
  });
}

function getConflictItems(items: ListItem[], versions: Array<{ items: ListItem[] }>, conflictIds?: string[] | null) {
  if (conflictIds != null) {
    const idSet = new Set(conflictIds);
    return items.filter(item => idSet.has(String(item.id)));
  }

  if (!versions.length) return items;

  const allItemIds = new Set<string>();
  for (const version of versions) {
    for (const item of version.items) {
      allItemIds.add(String(item.id));
    }
  }

  return items.filter((item) => {
    const id = String(item.id);
    if (!allItemIds.has(id)) return true;

    const signatures = versions
      .map((version) => version.items.find((other) => String(other.id) === id))
      .filter((other): other is ListItem => Boolean(other))
      .map(itemSignature);

    if (signatures.length <= 1) return true;

    return signatures.some((signature) => signature !== itemSignature(item));
  });
}

async function fetchCommonAncestor(hash: string, docs: (ListMeta & { _conflicts?: string[] })[]): Promise<ListMeta | null> {
  if (docs.length < 2) return null;
  try {
    const chains: string[][] = [];
    for (const doc of docs) {
      const withRevs = await (listDb as any).get(hash, { rev: doc._rev, revs: true }) as ListMeta & { _revisions?: { start: number; ids: string[] } };
      if (withRevs._revisions) {
        const { start, ids } = withRevs._revisions;
        chains.push(ids.map((revId: string, i: number) => `${start - i}-${revId}`));
      }
    }
    if (chains.length < 2) return null;
    const firstSet = new Set(chains[0]!);
    for (const rev of chains[1]!) {
      if (firstSet.has(rev)) {
        const isCommon = chains.slice(2).every(chain => chain.includes(rev));
        if (isCommon) {
          try { return await (listDb as any).get(hash, { rev }) as ListMeta; } catch { return null; }
        }
      }
    }
  } catch { }
  return null;
}

function classifyItems(allDocs: ListMeta[], ancestor: ListMeta | null): { conflictIds: Set<string>; autoMerge: Map<string, ListItem | null> } {
  const conflictIds = new Set<string>();
  const autoMerge = new Map<string, ListItem | null>();

  const allIds = new Set<string>();
  for (const doc of allDocs) {
    for (const item of doc.items ?? []) allIds.add(String(item.id));
  }

  if (!ancestor) {
    // No ancestor available: mark all items differing between any versions as conflicts
    for (const id of allIds) {
      const sigs = new Set(allDocs.map(doc => {
        const item = (doc.items ?? []).find(i => String(i.id) === id);
        return item ? itemSignature(item) : '__deleted__';
      }));
      if (sigs.size > 1) conflictIds.add(id);
    }
    return { conflictIds, autoMerge };
  }

  const ancestorItems = ancestor.items ?? [];
  for (const item of ancestorItems) allIds.add(String(item.id));

  for (const id of allIds) {
    const ancestorItem = ancestorItems.find(i => String(i.id) === id);
    const ancestorSig = ancestorItem ? itemSignature(ancestorItem) : '__deleted__';

    const changedDocs = allDocs.filter(doc => {
      const item = (doc.items ?? []).find(i => String(i.id) === id);
      return (item ? itemSignature(item) : '__deleted__') !== ancestorSig;
    });

    if (changedDocs.length === 0) {
      // Unchanged in all versions – skip
    } else if (changedDocs.length === 1) {
      // Only one version changed this item – auto-merge
      const changedItem = (changedDocs[0]!.items ?? []).find(i => String(i.id) === id) ?? null;
      autoMerge.set(id, changedItem);
    } else {
      // Multiple versions changed this item – check if they agree
      const changedSigs = new Set(changedDocs.map(doc => {
        const item = (doc.items ?? []).find(i => String(i.id) === id);
        return item ? itemSignature(item) : '__deleted__';
      }));
      if (changedSigs.size === 1) {
        // All changed to the same state – auto-merge
        const changedItem = (changedDocs[0]!.items ?? []).find(i => String(i.id) === id) ?? null;
        autoMerge.set(id, changedItem);
      } else {
        conflictIds.add(id);
      }
    }
  }

  return { conflictIds, autoMerge };
}

const hasConflict             = ref(false);
if ((window as any).Cypress) (window as any).__hasConflict = hasConflict;
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
let pendingMergeResult: { conflictIds: Set<string>; autoMerge: Map<string, ListItem | null> } | null = null;
const pendingConflictIds = ref<string[] | null>(null);

onMounted(async () => {
  try {
    const stored = localStorage.getItem(ackedStorageKey());
    if (stored) JSON.parse(stored).forEach((t: string) => acknowledgedResolutionTimes.add(t));
  } catch { }

  await fetchItems();
  isPinned.value = await getPinState(listHash.value, currentUser.value ?? undefined);

  changeListener = listDb.changes({
    since: 'now',
    live: true,
    include_docs: true,
    conflicts: true,
    doc_ids: [listHash.value],
  }).on('change', (change: any) => {
    if (change.id !== listHash.value || !change.doc) return;

    const doc = change.doc as ExtendedListMeta;

    if (doc.owner === undefined) {
      let localAnonLists = [];
      try { localAnonLists = JSON.parse(localStorage.getItem('checkit_anon_lists') || '[]'); } catch { }
      if (!localAnonLists.some((l: any) => l.hash === listHash.value)) {
        accessDenied.value = true;
        currentListName.value = 'Zugriff verweigert';
        return;
      }
    }

    listDoc = doc;
    currentListName.value = doc.name;
    listOwner.value = doc.owner;

    shoppingList.value = doc.items || [];

    // HOT RELOAD LOGIK: Hier prüfen wir in Echtzeit, ob sich der Konflikt-Zustand geändert hat
    if (doc._conflicts && doc._conflicts.length > 0) {
      hasConflict.value = true;
      if (conflictDialog.value) {
        openConflictDialog(); // Refresh Dialog, falls jemand anderes ihn offen hat und ein neuer Konflikt entsteht
      }
    } else if (
        doc.conflictResolution &&
        !acknowledgedResolutionTimes.has(doc.conflictResolution.resolvedAt)
    ) {
      hasConflict.value = true;
      if (conflictDialog.value) {
        openConflictDialog(); // HOT RELOAD: Dialog wechselt sofort zum "Wurde gelöst"-Fenster mit "OK" Button!
      }
    } else {
      hasConflict.value = false;
      if (conflictDialog.value) {
        conflictDialog.value = false; // Dialog automatisch schließen, wenn alles erledigt ist
      }
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
const deleteDialog = ref(false);
const deleteItemId = ref<string>('');
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
  accessDenied.value = false;
  try {
    const doc = await getListWithRemoteFallback(listHash.value) as ExtendedListMeta;

    if (doc.owner === undefined) {
      let localAnonLists = [];
      try { localAnonLists = JSON.parse(localStorage.getItem('checkit_anon_lists') || '[]'); } catch { }
      if (!localAnonLists.some((l: any) => l.hash === listHash.value)) {
        accessDenied.value = true;
        currentListName.value = 'Zugriff verweigert';
        listOwner.value = undefined;
        isLoading.value = false;
        return;
      }
    }

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
if ((window as any).Cypress) {
  (window as any).__fetchItems = fetchItems;
  (window as any).__nextTick   = nextTick;
}

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
  pendingConflictIds.value = null;
  pendingMergeResult = null;

  const doc = await (listDb as any).get(listHash.value, { conflicts: true }) as ListMeta & { _conflicts?: string[] };

  if (!doc._conflicts || doc._conflicts.length === 0) {
    if (doc.conflictResolution) {
      conflictAlreadyResolved.value = true;
      conflictResolutionInfo.value  = doc.conflictResolution;
      conflictVersions.value        = [];
    } else {
      hasConflict.value = false;
      conflictDialog.value = false; // Zur Sicherheit Dialog schließen
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
    conflictDialog.value = false;
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

  const ancestor = await fetchCommonAncestor(listHash.value, allDocs);
  const mergeResult = classifyItems(allDocs, ancestor);
  pendingMergeResult            = mergeResult;
  pendingConflictIds.value      = [...mergeResult.conflictIds];

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

  let finalItems = [...chosen.items];
  if (pendingMergeResult) {
    for (const [id, mergedItem] of pendingMergeResult.autoMerge) {
      if (mergedItem === null) {
        finalItems = finalItems.filter(i => String(i.id) !== id);
      } else {
        const idx = finalItems.findIndex(i => String(i.id) === id);
        if (idx >= 0) {
          finalItems[idx] = mergedItem;
        } else {
          finalItems.push(mergedItem);
        }
      }
    }
  }
  const chosenItems = finalItems;

  const versionSnapshots: ConflictVersionSnapshot[] = conflictVersions.value.map((v, i) => ({
    label:   v.label,
    savedAt: v.savedAt ?? undefined,
    savedBy: v.savedBy ?? undefined,
    items:   v.items,
    chosen:  i === index,
  }));

  for (const rev of pendingConflictRevs) {
    try { await (listDb as any).remove(listHash.value, rev); }
    catch (e) { console.warn('[conflict] failed to remove rev', e); }
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

type ScanResult =
    | { kind: 'priceTag'; name: string; preis: string }
    | { kind: 'recipe'; ingredients: RecipeIngredient[] }
    | { name: string; preis: string };

const onScanned = async (data: ScanResult) => {
  if ('kind' in data && data.kind === 'recipe') {
    await applyRecipeIngredients(data.ingredients);
    return;
  }

  const payload = 'kind' in data
      ? { name: data.name, preis: data.preis }
      : data;

  searchQuery.value  = payload.name;
  newItemPreis.value = payload.preis;
};

const applyRecipeIngredients = async (ingredients: RecipeIngredient[]) => {
  if (!ingredients.length) {
    showSnackbar('Keine Zutaten erkannt.', 'warning');
    return;
  }

  if (!listDoc) await fetchItems();
  if (!listDoc) return;

  const now = new Date().toISOString();
  const sortedIngredients = [...ingredients].sort((a, b) => a.orderIndex - b.orderIndex);

  for (let i = 0; i < sortedIngredients.length; i++) {
    const ingredient = sortedIngredients[i]!;
    const name = ingredient.name.trim();
    if (!name) continue;

    shoppingList.value.push({
      id: `${Date.now()}_${i}`,
      name,
      menge: ingredient.menge || '1',
      done: false,
      category: 'Sonstiges',
      updatedAt: now,
    });
  }

  await saveItemsToDb();
  showSnackbar(`${sortedIngredients.length} Zutaten uebernommen.`, 'success');
};

const generateInvite = async () => {
  inviteCode.value   = await createInviteCode(listHash.value, listDoc?.name ?? '');
  inviteDialog.value = true;
};

const pinList = async () => {
  isPinned.value = await togglePinList(listHash.value, currentUser.value ?? undefined);
  showSnackbar(isPinned.value ? 'Liste angeheftet.' : 'Liste losgelöst.', 'success');
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

function confirmDelete(id: string) {
  deleteItemId.value = id;
  deleteDialog.value = true;
}

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
.min-width-0 {
  min-width: 0;
}
.sync-error-text {
  color: #d32f2f !important;
}
.sync-pending-text {
  color: #ed6c02 !important;
}
.invite-code-box {
  font-family: monospace;
  letter-spacing: 0.15em;
  background: rgba(25, 118, 210, 0.08);
  text-align: center;
  word-break: break-all;
}
</style>