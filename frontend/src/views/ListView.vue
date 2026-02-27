<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">
        <v-card elevation="3" class="pa-4">

          <div class="d-flex align-center mb-4">
            <h1 class="text-h4 font-weight-bold flex-grow-1">
              {{ currentListName }}
            </h1>
            <v-btn
                to="/settings"
                variant="text"
                icon
                color="grey-darken-2"
                title="Einstellungen"
            >
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

    <v-dialog v-model="editDialog" max-width="400" persistent>
      <v-card title="Artikel bearbeiten">
        <v-card-text>
          <v-text-field
              v-model="editModel.name"
              label="Name"
              variant="outlined"
              class="mb-4"
          ></v-text-field>

          <v-text-field
              v-model="editModel.menge"
              label="Menge"
              variant="outlined"
          ></v-text-field>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" variant="text" @click="editDialog = false">Abbrechen</v-btn>
          <v-btn color="primary" variant="elevated" @click="saveEdit">Speichern</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Name Entry Dialog -->
    <v-dialog v-model="showNameDialog" persistent max-width="400">
      <v-card title="Bitte Namen eingeben">
        <v-card-text>
          <p class="mb-4">Um die Einkaufsliste zu nutzen, gib bitte deinen Namen ein.</p>
          <v-text-field
            v-model="nameInput"
            label="Dein Name"
            variant="outlined"
            density="comfortable"
            @keyup.enter="submitName"
            autofocus
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!nameInput.trim()"
            @click="submitName"
          >
            Bestätigen
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const router = useRouter();
const API_URL = 'http://localhost:3000/list';

// State für neue Artikel
const newItemName = ref('');
const newItemMenge = ref('');

// State für Liste und Dialog
const shoppingList = ref([]);
const editDialog = ref(false);
const selectedId = ref(null);
const editModel = ref({ name: '', menge: '' });

// Name Prompt Logic
const showNameDialog = ref(false);
const nameInput = ref('');

// Titel der Liste aus der URL (query ?list=...) auslesen
const currentListName = computed(() => {
  return route.query.list || 'Meine Einkaufsliste';
});

const headers = [
  { title: 'Name', value: 'name', align: 'start', sortable: true },
  { title: 'Menge', value: 'menge', align: 'start', sortable: true },
  { title: 'Aktionen', value: 'actions', align: 'end', sortable: false },
];

// --- FUNKTIONEN ---

const submitName = () => {
  if (nameInput.value.trim()) {
    router.replace({ query: { ...route.query, name: nameInput.value.trim() } });
    showNameDialog.value = false;
  }
};

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
    menge: newItemMenge.value || '1'
  };

  try {
    const response = await axios.post(API_URL, newItem);
    shoppingList.value.push(response.data);
  } catch (e) {
    // Lokal hinzufügen als Fallback
    shoppingList.value.push({ id: Date.now(), ...newItem });
  }

  newItemName.value = '';
  newItemMenge.value = '';
};

const removeItem = (id) => {
  // Sofort lokal löschen für bessere Geschwindigkeit
  shoppingList.value = shoppingList.value.filter(item => item.id !== id);
  axios.delete(`${API_URL}/${id}`).catch(e => console.error("Sync Fehler beim Löschen"));
};

function openEditDialog(item) {
  selectedId.value = item.id;
  editModel.value = { ...item }; // Kopie erstellen
  editDialog.value = true;
}

const saveEdit = () => {
  // 1. Fenster sofort schließen
  editDialog.value = false;

  // 2. Lokal in der Liste aktualisieren
  const index = shoppingList.value.findIndex(i => i.id === selectedId.value);
  if (index !== -1) {
    shoppingList.value[index] = { ...editModel.value };
  }

  // 3. Im Hintergrund an den Server senden
  axios.put(`${API_URL}/${selectedId.value}`, editModel.value)
      .catch(e => console.error("Sync Fehler beim Speichern"));
};

onMounted(() => {
  if (!route.query.name) {
    showNameDialog.value = true;
  }
  fetchItems();
});
</script>

<style scoped>
/* Scoped Styles für das Tabellen-Design */
:deep(.v-data-table__tr:hover) {
  background-color: #f5f5f5 !important;
}
</style>
