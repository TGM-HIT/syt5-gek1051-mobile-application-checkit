<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <v-card elevation="3" class="pa-2 pa-sm-4">

          <div class="d-flex align-center mb-4 mb-sm-6">
            <v-btn
                icon="mdi-arrow-left"
                variant="text"
                class="mr-2"
                @click="$router.back()"
            />
            <h1 class="text-h5 text-sm-h4 font-weight-bold">Einstellungen</h1>
          </div>

          <v-list lines="two" border class="rounded-lg">
            <v-list-item>
              <template v-slot:prepend>
                <div class="text-h5 mr-4">🌓</div>
              </template>
              <v-list-item-title class="font-weight-bold">Erscheinungsbild</v-list-item-title>
              <v-list-item-subtitle>Dark Mode aktivieren oder deaktivieren</v-list-item-subtitle>
              <template v-slot:append>
                <v-switch
                    v-model="isDark"
                    color="primary"
                    hide-details
                    @change="toggleTheme"
                ></v-switch>
              </template>
            </v-list-item>

            <v-divider></v-divider>

            <v-list-item>
              <template v-slot:prepend>
                <div class="text-h5 mr-4">🧹</div>
              </template>
              <v-list-item-title class="font-weight-bold">Lokale Daten löschen</v-list-item-title>
              <v-list-item-subtitle>Löscht den lokalen PouchDB-Cache (Remote bleibt erhalten)</v-list-item-subtitle>
              <template v-slot:append>
                <v-btn color="warning" variant="tonal" :loading="clearing" @click="clearLocalData">
                  Leeren
                </v-btn>
              </template>
            </v-list-item>
          </v-list>

          <v-card-actions class="mt-6">
            <v-spacer></v-spacer>
            <v-btn color="primary" variant="text" @click="$router.back()">Fertig</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="5000">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useTheme } from 'vuetify';
import { listDb } from '@/utils/listHash';

const theme   = useTheme();
const isDark  = ref(theme.global.name.value === 'dark');
const snackbar      = ref(false);
const snackbarText  = ref('');
const snackbarColor = ref<'success' | 'error'>('success');
const clearing = ref(false);

const toggleTheme = () => {
  theme.global.name.value = isDark.value ? 'dark' : 'light';
};

const clearLocalData = async () => {
  clearing.value = true;
  try {
    // Destroy and recreate local PouchDB — remote CouchDB is untouched.
    // The next sync will pull data back from the server.
    await listDb.destroy();
    snackbarText.value  = 'Cache wurde geleert. Seite wird neu geladen…';
    snackbarColor.value = 'success';
    snackbar.value = true;
    setTimeout(() => window.location.reload(), 4000);
  } catch {
    snackbarText.value  = 'Fehler beim Löschen des Caches.';
    snackbarColor.value = 'error';
    snackbar.value = true;
  } finally {
    clearing.value = false;
  }
};
</script>
