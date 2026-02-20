<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <v-card elevation="3" class="pa-4">
          <v-card-title class="text-h4 font-weight-bold mb-4 d-flex align-center">
            <v-icon icon="mdi-cart" class="mr-2" color="primary"></v-icon>
            Einkaufsliste
          </v-card-title>

          <v-row class="mb-4">
            <v-col cols="9">
              <v-text-field
                  label="Neuer Artikel (derzeit deaktiviert)"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  disabled
              ></v-text-field>
            </v-col>
            <v-col cols="3">
              <v-btn
                  color="grey-lighten-1"
                  height="48"
                  block
                  elevation="0"
                  readonly
              >
                Hinzufügen
              </v-btn>
            </v-col>
          </v-row>

          <v-divider class="mb-6"></v-divider>

          <v-list lines="one" class="bg-transparent">
            <v-list-item
                v-for="(item, index) in shoppingList"
                :key="index"
                border
                class="mb-3 rounded-lg bg-grey-lighten-4"
            >
              <template v-slot:default>
                <div class="d-flex align-center w-100 pa-2">
                  <span class="text-body-1 flex-grow-1">
                    {{ item.name }}
                  </span>

                  <div class="ml-4">
                    <v-btn
                        icon="mdi-pencil-outline"
                        variant="text"
                        color="grey"
                        size="small"
                        @click.prevent
                    ></v-btn>
                    <v-btn
                        icon="mdi-trash-can-outline"
                        variant="text"
                        color="grey"
                        size="small"
                        @click.prevent
                    ></v-btn>
                  </div>
                </div>
              </template>
            </v-list-item>
          </v-list>

          <v-alert
              v-if="shoppingList.length === 0"
              type="info"
              variant="tonal"
              text="Lade Daten vom Server..."
              class="mt-4"
          ></v-alert>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const API_URL = 'http://localhost:3000/list';
const shoppingList = ref([]);

// Einzige aktive Funktion: Daten vom Backend holen
const fetchItems = async () => {
  try {
    const response = await axios.get(API_URL);
    // Erwartet ein Array von Objekten, z.B. [{name: 'Apfel'}, {name: 'Brot'}]
    shoppingList.value = response.data;
  } catch (error) {
    console.error('Backend nicht erreichbar:', error);
  }
};

onMounted(fetchItems);
</script>

<style scoped>
/* Optisches Feedback für die Liste, aber keine Interaktion */
.v-list-item {
  cursor: default;
}
</style>