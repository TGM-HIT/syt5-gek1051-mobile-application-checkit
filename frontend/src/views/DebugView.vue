<template>
  <v-container class="pa-6">
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">

        <div class="d-flex align-center mb-6">
          <v-icon color="warning" class="mr-2" size="28">mdi-bug</v-icon>
          <h1 class="text-h5 font-weight-bold">Debug Panel</h1>
        </div>

        <!-- Database connection status -->
        <v-card elevation="2" rounded="lg" class="mb-4">
          <v-card-title class="text-subtitle-1 font-weight-bold pa-4 pb-2">
            Datenbankverbindung
          </v-card-title>
          <v-card-text>
            <div class="d-flex align-center mb-3">
              <span class="text-body-2 text-grey mr-3">CouchDB Status:</span>
              <v-chip :color="syncColor" size="small" variant="tonal">
                <v-icon start size="14">{{ syncIcon }}</v-icon>
                {{ syncLabel }}
              </v-chip>
            </div>

            <div class="d-flex align-center mb-3">
              <span class="text-body-2 text-grey mr-3">Netzwerk:</span>
              <v-chip :color="simulatedOffline ? 'error' : 'success'" size="small" variant="tonal">
                <v-icon start size="14">{{ simulatedOffline ? 'mdi-wifi-off' : 'mdi-wifi' }}</v-icon>
                {{ simulatedOffline ? 'Simuliert Offline' : 'Online' }}
              </v-chip>
            </div>

            <v-alert
                v-if="lastSyncErrorMessage"
                type="error"
                variant="tonal"
                density="compact"
                class="mt-2"
            >
              {{ lastSyncErrorMessage }}
            </v-alert>

            <v-alert
                v-if="!lastSyncErrorMessage && couchDbStatus !== 'disabled'"
                type="success"
                variant="tonal"
                density="compact"
                class="mt-2"
            >
              Keine Fehler.
            </v-alert>

            <v-alert
                v-if="couchDbStatus === 'disabled'"
                type="warning"
                variant="tonal"
                density="compact"
                class="mt-2"
            >
              CouchDB URL nicht konfiguriert (VITE_COUCHDB_URL fehlt).
            </v-alert>
          </v-card-text>
        </v-card>

        <!-- Actions -->
        <v-card elevation="2" rounded="lg" class="mb-4">
          <v-card-title class="text-subtitle-1 font-weight-bold pa-4 pb-2">
            Aktionen
          </v-card-title>
          <v-card-text class="d-flex flex-column gap-3">

            <v-btn
                :color="simulatedOffline ? 'success' : 'warning'"
                variant="tonal"
                prepend-icon="mdi-wifi-off"
                @click="toggleOffline"
            >
              {{ simulatedOffline ? 'Wieder Online gehen' : 'Offline simulieren' }}
            </v-btn>

            <v-btn
                color="error"
                variant="tonal"
                prepend-icon="mdi-nuke"
                @click="confirmReset = true"
            >
              Hard Reset (PouchDB + CouchDB löschen)
            </v-btn>

          </v-card-text>
        </v-card>

      </v-col>
    </v-row>

    <!-- Hard reset confirmation dialog -->
    <v-dialog v-model="confirmReset" max-width="440" persistent>
      <v-card>
        <v-card-title class="d-flex align-center pa-4">
          <v-icon color="error" class="mr-2">mdi-alert</v-icon>
          Hard Reset bestätigen
        </v-card-title>
        <v-card-text>
          <p class="text-body-2">
            Dies löscht <strong>alle Daten</strong> aus der lokalen PouchDB
            <strong>und</strong> aus CouchDB. Alle Listen gehen verloren und
            können nicht wiederhergestellt werden.
          </p>
          <p class="text-body-2 mt-2 font-weight-bold text-error">
            Bist du sicher?
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" variant="text" @click="confirmReset = false">Abbrechen</v-btn>
          <v-btn color="error" variant="elevated" :loading="resetting" @click="doHardReset">
            Ja, alles löschen
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { couchDbStatus, lastSyncErrorMessage, simulatedOffline, toggleOffline, hardReset } from '@/utils/listHash';

const confirmReset = ref(false);
const resetting    = ref(false);

const syncLabel = computed(() => ({
  connecting: 'Verbinde…',
  active:     'Aktiv',
  paused:     'Pausiert',
  error:      'Fehler',
  disabled:   'Deaktiviert',
}[couchDbStatus.value]));

const syncColor = computed(() => ({
  connecting: 'grey',
  active:     'success',
  paused:     'warning',
  error:      'error',
  disabled:   'grey',
}[couchDbStatus.value]));

const syncIcon = computed(() => ({
  connecting: 'mdi-sync',
  active:     'mdi-check-circle',
  paused:     'mdi-pause-circle',
  error:      'mdi-alert-circle',
  disabled:   'mdi-cancel',
}[couchDbStatus.value]));

const doHardReset = async () => {
  resetting.value = true;
  await hardReset();
  // hardReset() redirects, so this line is never reached
};
</script>
