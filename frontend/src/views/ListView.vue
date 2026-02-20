<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <v-card elevation="3" class="pa-4">

          <div class="d-flex align-center mb-4">
            <h1 class="text-h4 font-weight-bold flex-grow-1">Einkaufsliste</h1>
            <v-btn
                variant="text"
                icon="mdi-cog"
                color="grey-darken-2"
                title="Einstellungen"
            >
              ⚙️
            </v-btn>
          </div>

          <v-row class="mb-4" align="center">
            <v-col cols="8">
              <v-text-field
                  v-model="newItemName"
                  label="Neuer Artikel"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  @keyup.enter="addItem"
              ></v-text-field>
            </v-col>
            <v-col cols="4">
              <v-btn
                  color="grey-lighten-1"
                  height="48"
                  block
                  elevation="1"
                  @click="addItem"
              >
                HINZUFÜGEN
              </v-btn>
            </v-col>
          </v-row>

          <v-divider class="mb-6"></v-divider>

          <div v-for="(item, index) in shoppingList" :key="index" class="mb-3">
            <v-card variant="flat" border class="bg-grey-lighten-5 rounded-lg">
              <div class="d-flex align-center pa-3">

                <span class="text-body-1 flex-grow-1 font-weight-medium">
                  {{ item.name }}
                </span>

                <div class="d-flex align-center">
                  <v-btn
                      variant="text"
                      color="blue-grey"
                      class="mr-2"
                      icon
                      @click="editItem(index)"
                  >
                    ✏️
                  </v-btn>
                  <v-btn
                      variant="text"
                      color="error"
                      icon
                      @click="removeItem(index)"
                  >
                    🗑️
                  </v-btn>
                </div>

              </div>
            </v-card>
          </div>

          <v-alert
              v-if="shoppingList.length === 0"
              type="info"
              variant="tonal"
              class="mt-4"
          >
            Lade Daten vom Server...
          </v-alert>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const API_URL = 'http://localhost:3000/list';
const newItemName = ref('');

// Die 3 Dummy-Artikel aus deinem Screenshot
const shoppingList = ref([
  { name: 'Milch' },
  { name: 'Brot' },
  { name: 'Eier' }
]);

const fetchItems = async () => {
  try {
    const response = await axios.get(API_URL);
    if (response.data && Array.isArray(response.data)) {
      // API Daten werden zu den Dummies hinzugefügt
      shoppingList.value = [...shoppingList.value, ...response.data];
    }
  } catch (error) {
    console.warn('Backend nicht erreichbar - zeige nur lokale Liste.');
  }
};

const addItem = () => {
  newItemName.value = ''; // Feld leeren, sonst nichts
};

const editItem = (index) => {
  // Aktuell ohne Funktion
};

const removeItem = (index) => {
  shoppingList.value.splice(index, 1); // Löscht lokal aus der Ansicht
};

onMounted(fetchItems);
</script>

<style scoped>
/* Zusätzliches Styling für die Abstände wie im Bild */
.v-card {
  transition: all 0.2s ease;
}
.v-card:hover {
  background-color: #f5f5f5 !important;
}
</style>