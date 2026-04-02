<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">
        <v-card elevation="3" class="pa-2 pa-sm-4">

          <div class="d-flex align-center mb-2">
            <div class="flex-grow-1 min-width-0">
              <h1 class="text-h5 text-sm-h4 font-weight-bold text-truncate">
                {{ currentListName }}
                <v-chip v-if="listOwner === undefined" size="small" color="secondary" variant="tonal" class="ml-2">Privat</v-chip>
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

            <v-btn v-if="listOwner !== undefined" variant="text" icon="mdi-share-variant" color="primary" @click="generateInvite" />
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

          <v-divider class="mb-4"></v-divider>

          <v-data-table
              :headers="headers"
              :items="shoppingList"
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
                <v-divider v-if="idx < filteredList.length - 1" />
              </template>
            </v-list>
          </div>

          <v-alert v-if="shoppingList.length === 0" type="info" variant="tonal" class="mt-4 empty-list-banner">
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
/* ... Script bleibt identisch ... */
</script>