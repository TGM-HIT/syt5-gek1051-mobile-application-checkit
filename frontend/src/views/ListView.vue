<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">
        <v-card elevation="3" class="pa-4">

          <div class="d-flex align-center mb-4">
            <h1 class="text-h4 font-weight-bold flex-grow-1">
              {{ currentListName }}
            </h1>
            <v-btn to="/settings" variant="text" icon color="grey-darken-2">
              ⚙️
            </v-btn>
          </div>

          <v-row class="mb-4" dense>
            <v-col cols="12" sm="6">
              <v-text-field
                  v-model="searchQuery"
                  label="Suchen oder neu hinzufügen..."
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  prepend-inner-icon="🔍"
                  clearable
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
              <v-btn color="primary" height="48" block elevation="1" @click="addItem">
                HINZUFÜGEN
              </v-btn>
            </v-col>
          </v-row>

          <v-divider class="mb-6"></v-divider>

          <v-data-table
              :headers="headers"
              :items="shoppingList"
              :search="searchQuery"
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
              <span :class="{ 'done-text': item.done }">
                {{ item.name }}
              </span>
            </template>

            <template v-slot:[`item.actions`]="{ item }">
              <div class="d-flex justify-end">
                <v-btn variant="text" color="blue-grey" class="mr-2" icon @click="openEditDialog(item)">
                  ✏️
                </v-btn>
                <v-btn variant="text" color="error" icon @click="removeItem(item.id)">
                  🗑️
                </v-btn>
              </div>
            </template>
          </v-data-table>

          <v-alert v-if="shoppingList.length === 0" type="info" variant="tonal" class="mt-4">
            Die Liste ist leer.
          </v-alert>
        </v-card>
      </v-col>
    </v-row>

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

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const API_URL = 'http://localhost:3000/list';

const searchQuery = ref('');
const newItemMenge = ref('');
const shoppingList = ref([]);
const editDialog = ref(false);
const selectedId = ref(null);
const editModel = ref({ name: '', menge: '', done: false });

const currentListName = computed(() => route.query.list || 'Einkaufsliste');

// WICHTIG: Nutze 'key' für die Zuweisung
const headers = [
  { title: 'Done', key: 'done', align: 'start', sortable: false, width: '50px' },
  { title: 'Artikel', key: 'name', align: 'start', sortable: true },
  { title: 'Menge', key: 'menge', align: 'start', sortable: true },
  { title: 'Aktionen', key: 'actions', align: 'end', sortable: false },
];

const fetchItems = async () => {
  try {
    const response = await axios.get(API_URL);
    shoppingList.value = response.data.map(item => ({ ...item, done: item.done || false }));
  } catch (error) {
    shoppingList.value = [
      { id: 1, name: 'Milch', menge: '2L', done: false },
      { id: 2, name: 'Brot', menge: '1 Stk.', done: true },
      { id: 3, name: 'Eier', menge: '10 Stk.', done: false }
    ];
  }
};

const addItem = async () => {
  if (!searchQuery.value) return;
  const newItem = { name: searchQuery.value, menge: newItemMenge.value || '1', done: false };
  try {
    const response = await axios.post(API_URL, newItem);
    shoppingList.value.push(response.data);
  } catch (e) {
    shoppingList.value.push({ id: Date.now(), ...newItem });
  }
  searchQuery.value = '';
  newItemMenge.value = '';
};

const toggleDone = (item) => {
  axios.put(`${API_URL}/${item.id}`, item).catch(() => {});
};

const removeItem = (id) => {
  shoppingList.value = shoppingList.value.filter(item => item.id !== id);
  axios.delete(`${API_URL}/${id}`).catch(() => {});
};

function openEditDialog(item) {
  selectedId.value = item.id;
  editModel.value = { ...item };
  editDialog.value = true;
}

const saveEdit = () => {
  editDialog.value = false;
  const index = shoppingList.value.findIndex(i => i.id === selectedId.value);
  if (index !== -1) {
    shoppingList.value[index] = { ...editModel.value };
  }
  axios.put(`${API_URL}/${selectedId.value}`, editModel.value).catch(() => {});
};

onMounted(fetchItems);
</script>

<style scoped>
.done-text {
  text-decoration: line-through !important;
  color: grey !important;
}
/* Standard HTML Checkbox Styling */
input[type="checkbox"] {
  accent-color: #4caf50;
}
</style>