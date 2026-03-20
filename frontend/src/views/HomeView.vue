<template>
  <v-container fluid class="pa-6">
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">

        <!-- Create list card -->
        <v-card elevation="4" rounded="lg" class="pa-4 pa-sm-8 text-center mb-6">
          <h1 class="text-h4 text-sm-h2 text-success mb-4 mb-sm-6">
            <v-icon size="36" color="success" class="d-sm-none">mdi-checkbox-marked</v-icon>
            <v-icon size="48" color="success" class="d-none d-sm-inline">mdi-checkbox-marked</v-icon>
            CheckIT
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

        <!-- Join list by invite code -->
        <v-card elevation="2" rounded="lg" class="pa-4 pa-sm-6 mb-6">
          <h2 class="text-h6 font-weight-bold mb-3">
            <v-icon start>mdi-ticket-confirmation</v-icon>
            Einladungscode einlösen
          </h2>
          <div class="d-flex ga-2">
            <v-text-field
                v-model="inviteCode"
                label="Einladungscode einfügen"
                variant="outlined"
                density="comfortable"
                hide-details
                class="invite-input"
                @keyup.enter="redeemCode"
            />
            <v-btn
                color="primary"
                height="48"
                :loading="redeemLoading"
                :disabled="cleanCode.length < 32"
                @click="redeemCode"
            >
              Beitreten
            </v-btn>
          </div>
          <v-alert v-if="redeemError" type="error" variant="tonal" density="compact" class="mt-3">
            {{ redeemError }}
          </v-alert>
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
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { createList, getListsCreated, getUserLists, redeemInviteCode, type UserListEntry } from '@/utils/listHash';
import { currentUser } from '@/utils/auth';

const router    = useRouter();
const showInput = ref(false);
const listName  = ref('');
const creating  = ref(false);
const totalListsCreated = ref(0);
const userLists = ref<UserListEntry[]>([]);
const inviteCode    = ref('');
const cleanCode     = computed(() => inviteCode.value.toUpperCase().replace(/[^A-Z2-9]/g, ''));
const redeemLoading = ref(false);
const redeemError   = ref('');

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

const redeemCode = async () => {
  if (cleanCode.value.length < 32 || redeemLoading.value) return;
  redeemError.value = '';
  redeemLoading.value = true;
  try {
    const result = await redeemInviteCode(inviteCode.value);
    if (!result) {
      redeemError.value = 'Ungültiger oder abgelaufener Code.';
      return;
    }
    router.push(`/list/${result.listHash}`);
  } catch {
    redeemError.value = 'Fehler beim Einlösen des Codes.';
  } finally {
    redeemLoading.value = false;
  }
};
</script>

<style scoped>
.invite-input :deep(input) {
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-family: monospace;
  font-weight: bold;
}
</style>
