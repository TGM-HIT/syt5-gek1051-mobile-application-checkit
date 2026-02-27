<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">
        <v-card elevation="3" class="pa-4">

          <div class="d-flex align-center mb-4">
            <h1 class="text-h4 font-weight-bold flex-grow-1">Einkaufsliste</h1>
            <v-btn to="/settings" variant="text" icon color="grey-darken-2" title="Einstellungen">
              ⚙️
            </v-btn>
          </div>

          <v-row class="mb-4" dense>
            <v-col cols="12" sm="6">
              <v-text-field
                  v-model="newItemName"
                  label="Artikel Name"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  @keyup.enter="addItem"
              ></v-text-field>
            </v-col>
            <v-col cols="8" sm="3">
              <v-text-field
                  v-model="newItemMenge"
                  label="Menge"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  @keyup.enter="addItem"
              ></v-text-field>
            </v-col>
            <v-col cols="4" sm="3">
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

          <v-data-table
              :headers="headers"
              :items="shoppingList"
              class="elevation-0"
              hide-default-footer
          >
            <template v-slot:item.actions="{ item }">
              <div class="d-flex justify-end">
                <v-btn
                    variant="text"
                    color="blue-grey"
                    class="mr-2"
                    icon
                    @click="openEditDialog(item)"
                    @mouseenter="registerActivator($event)"
                >
                  ✏️
                </v-btn>
                <v-btn
                    variant="text"
                    color="error"
                    icon
                    @click="removeItem(item.id)"
                >
                  🗑️
                </v-btn>
              </div>
            </template>
          </v-data-table>

          <v-alert v-if="shoppingList.length === 0" type="info" variant="tonal" class="mt-4">
            Lade Daten vom Server...
          </v-alert>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="editDialog" :activator="activator" max-width="400">
      <v-confirm-edit
          v-model="editModel"
          ok-text="Speichern"
          cancel-text="Abbrechen"
          @cancel="editDialog = false"
          @save="saveEdit"
      >
        <template v-slot:default="{ model: proxyModel, actions }">
          <v-card title="Artikel bearbeiten">
            <v-card-text>
              <v-text-field
                  v-model="proxyModel.value.name"
                  label="Name"
                  variant="outlined"
                  class="mb-4"
              ></v-text-field>

              <v-text-field
                  v-model="proxyModel.value.menge"
                  label="Menge"
                  variant="outlined"
              ></v-text-field>
            </v-card-text>

            <template v-slot:actions>
              <v-spacer></v-spacer>
              <component :is="actions"></component>
            </template>
          </v-card>
        </template>
      </v-confirm-edit>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const API_URL = 'http://localhost:3000/list';

// State für neue Artikel
const newItemName = ref('');
const newItemMenge = ref('');

// State für die Liste und Dialog
const shoppingList = ref([]);
const editDialog = ref(false);
const activator = ref(null);
const selectedId = ref(null);
const editModel = ref({ name: '', menge: '' });

const headers = [
  { title: 'Name', value: 'name', align: 'start', sortable: true },
  { title: 'Menge', value: 'menge', align: 'start', sortable: true },
  { title: 'Aktionen', value: 'actions', align: 'end', sortable: false },
];

// --- FUNKTIONEN ---

const fetchItems = async () => {
  try {
    const response = await axios.get(API_URL);
    shoppingList.value = response.data;
  } catch (error) {
    console.warn('Backend offline - Nutze Demo-Daten');
    shoppingList.value = [
      { id: 1, name: 'Milch', menge: '2L' },
      { id: 2, name: 'Brot', menge: '1 Laib' }
    ];
  }
};

const addItem = async () => {
  if (!newItemName.value) return;

  const newItem = {
    name: newItemName.value,
    menge: newItemMenge.value || '1' // Standardwert 1, falls leer
  };

  try {
    const response = await axios.post(API_URL, newItem);
    shoppingList.value.push(response.data);
  } catch (e) {
    shoppingList.value.push({ id: Date.now(), ...newItem });
  }

  // Felder leeren
  newItemName.value = '';
  newItemMenge.value = '';
};

const removeItem = async (id) => {
  shoppingList.value = shoppingList.value.filter(item => item.id !== id);
  try {
    await axios.delete(`${API_URL}/${id}`);
  } catch (e) {
    console.error("Server-Fehler beim Löschen");
  }
};

function registerActivator(event) {
  activator.value = event.currentTarget;
}

function openEditDialog(item) {
  selectedId.value = item.id;
  editModel.value = { name: item.name, menge: item.menge };
  editDialog.value = true;
}

const saveEdit = async () => {
  const updatedItem = { ...editModel.value };

  try {
    await axios.put(`${API_URL}/${selectedId.value}`, updatedItem);
  } catch (e) {
    console.warn("Nur lokal gespeichert");
  }

  const index = shoppingList.value.findIndex(i => i.id === selectedId.value);
  if (index !== -1) {
    shoppingList.value[index] = { ...shoppingList.value[index], ...updatedItem };
  }
  editDialog.value = false;
};

onMounted(fetchItems);
</script>