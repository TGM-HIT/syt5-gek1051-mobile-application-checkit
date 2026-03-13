<template>
  <v-container fluid class="pa-6">
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">

        <!-- Create list card -->
        <v-card elevation="4" rounded="lg" class="pa-8 text-center mb-6">
          <h1 class="text-h2 text-success mb-6">
            <v-icon size="48" color="success">mdi-checkbox-marked</v-icon> CheckIT
          </h1>

          <v-chip v-if="totalListsCreated > 0" color="grey-darken-1" variant="outlined" class="mb-6">
            <v-icon start>mdi-earth</v-icon>
            {{ totalListsCreated }} Liste{{ totalListsCreated === 1 ? '' : 'n' }} erstellt
          </v-chip>

          <v-btn
              v-if="!showInput"
              color="primary"
              size="large"
              prepend-icon="mdi-plus"
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
              />
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

        <!-- User's lists -->
        <v-card v-if="userLists.length > 0" elevation="2" rounded="lg">
          <v-card-title class="pa-4 pb-0">Deine Listen</v-card-title>
          <v-list lines="two">
            <v-list-item
                v-for="entry in userLists"
                :key="entry.hash"
                :to="`/list/${entry.hash}`"
                :title="entry.name"
                :subtitle="formatDate(entry.createdAt)"
                prepend-icon="mdi-format-list-checks"
            >
              <template #append>
                <v-icon color="grey">mdi-chevron-right</v-icon>
              </template>
            </v-list-item>
          </v-list>
        </v-card>

      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { createList, getListsCreated, getUserLists, type UserListEntry } from '@/utils/listHash';
import { currentUser } from '@/utils/auth';

const router    = useRouter();
const showInput = ref(false);
const listName  = ref('');
const creating  = ref(false);
const totalListsCreated = ref(0);
const userLists = ref<UserListEntry[]>([]);

onMounted(async () => {
  totalListsCreated.value = await getListsCreated();
  if (currentUser.value) {
    userLists.value = await getUserLists(currentUser.value);
  }
});

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });

const navigateToTable = async () => {
  if (!listName.value || creating.value) return;
  creating.value = true;
  try {
    const { hash, newCount } = await createList(listName.value, currentUser.value ?? undefined);
    totalListsCreated.value = newCount;
    if (currentUser.value) {
      userLists.value = await getUserLists(currentUser.value);
    }
    router.push(`/list/${hash}`);
  } finally {
    creating.value = false;
  }
};
</script>
