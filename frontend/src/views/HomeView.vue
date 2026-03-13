<template>
  <v-app>
    <v-container class="fill-height" fluid>
      <v-col class="text-center">
        <v-row justify="center" align="center">
          <v-card class="pa-8 text-center" elevation="4" rounded="lg" width="100%" max-width="500">
            <h1 class="text-h2 text-success mb-4">
              ☑️ CheckIT
            </h1>

            <!-- Greeting + logout when logged in -->
            <div v-if="username" class="d-flex align-center justify-center mb-4 gap-2">
              <v-chip color="primary" variant="tonal">
                👤 Hallo, {{ username }}!
              </v-chip>
              <v-btn
                  size="small"
                  variant="text"
                  color="grey-darken-1"
                  @click="logout"
              >
                🚪 Abmelden
              </v-btn>
            </div>

            <v-chip v-if="totalListsCreated > 0" color="grey-darken-1" variant="outlined" class="mb-4">
              🌐 {{ totalListsCreated }} Liste{{ totalListsCreated === 1 ? '' : 'n' }} erstellt
            </v-chip>

            <v-btn
                v-if="!showInput"
                color="primary"
                size="large"
                @click="showInput = true"
            >
              Einkaufsliste erstellen
            </v-btn>

            <v-expand-transition>
              <div v-if="showInput">
                <v-text-field
                    v-model="listName"
                    label="Name der Liste (z.B. Wocheneinkauf)"
                    variant="outlined"
                    class="mt-4"
                    autofocus
                    @keyup.enter="navigateToTable"
                ></v-text-field>

                <v-btn
                    color="success"
                    block
                    :disabled="!listName"
                    :loading="creating"
                    @click="navigateToTable"
                >
                  Los geht's!
                </v-btn>
              </div>
            </v-expand-transition>
          </v-card>
        </v-row>
      </v-col>
    </v-container>
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { createList, getListsCreated, getUsername, clearUsername } from '@/utils/listHash';

const router   = useRouter();
const showInput = ref(false);
const listName  = ref('');
const creating  = ref(false);
const totalListsCreated = ref(0);
const username = ref<string | null>(null);

onMounted(async () => {
  totalListsCreated.value = await getListsCreated();
  username.value = getUsername();
});

const logout = () => {
  clearUsername();
  username.value = null;
};

const navigateToTable = async () => {
  if (!listName.value || creating.value) return;
  creating.value = true;
  try {
    const { hash, newCount } = await createList(listName.value);
    totalListsCreated.value = newCount;
    router.push(`/list/${hash}`);
  } finally {
    creating.value = false;
  }
};
</script>