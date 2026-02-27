<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <v-card elevation="3" class="pa-4">

          <div class="d-flex align-center mb-6">
            <v-btn
                icon
                variant="text"
                class="mr-2"
                @click="$router.push('/list')"
            >
              ⬅️
            </v-btn>
            <h1 class="text-h4 font-weight-bold">Einstellungen</h1>
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
              <v-list-item-title class="font-weight-bold">App-Daten</v-list-item-title>
              <v-list-item-subtitle>Lokale Liste und Cache löschen</v-list-item-subtitle>
              <template v-slot:append>
                <v-btn
                    color="error"
                    variant="tonal"
                    @click="clearCache"
                >
                  Leeren
                </v-btn>
              </template>
            </v-list-item>
          </v-list>

          <v-card-actions class="mt-6">
            <v-spacer></v-spacer>
            <v-btn color="primary" variant="text" @click="$router.push('/list')">Fertig</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar v-model="snackbar" timeout="2000" color="grey-darken-3">
      Cache wurde geleert
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useTheme } from 'vuetify';

const theme = useTheme();
const isDark = ref(theme.global.name.value === 'dark');
const snackbar = ref(false);

const toggleTheme = () => {
  theme.global.name.value = isDark.value ? 'dark' : 'light';
};

const clearCache = () => {
  // Simulierter Cache-Clear
  snackbar.value = true;
};
</script>
