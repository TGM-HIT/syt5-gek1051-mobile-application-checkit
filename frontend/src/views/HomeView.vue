<template>
  <v-container fluid class="pa-6">
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">

        <v-card elevation="4" rounded="lg" class="pa-4 pa-sm-8 text-center mb-6">
          <h1 class="text-h4 text-sm-h2 text-success mb-4 mb-sm-6">
            <v-icon size="48" color="success">mdi-checkbox-marked</v-icon>
            CheckIT
          </h1>

          <v-chip v-if="totalListsCreated > 0" color="grey-darken-1" variant="outlined" class="mb-6">
            <v-icon start>mdi-earth</v-icon>
            {{ totalListsCreated }} Liste{{ totalListsCreated === 1 ? '' : 'n' }} erstellt
          </v-chip>

          <div v-if="!showInput" class="d-flex flex-column flex-sm-row justify-center ga-4">
            <v-btn
                color="primary"
                size="large"
                prepend-icon="mdi-account-group"
                @click="prepareCreate(false)"
            >
              Geteilte Liste erstellen
            </v-btn>
            <v-btn
                color="secondary"
                variant="outlined"
                size="large"
                prepend-icon="mdi-incognito"
                @click="prepareCreate(true)"
            >
              Private (anonyme) Liste
            </v-btn>
          </div>

          <v-expand-transition>
            <div v-if="showInput">
              <v-text-field
                  v-model="listName"
                  :label="isPrivate ? 'Name der privaten Liste' : 'Name der geteilten Liste'"
                  :prepend-inner-icon="isPrivate ? 'mdi-incognito' : 'mdi-account-group'"
                  variant="outlined"
                  class="mt-4"
                  autofocus
                  @keyup.enter="navigateToTable"
              />
              <div class="d-flex ga-2">
                <v-btn variant="text" @click="showInput = false">Abbrechen</v-btn>
                <v-btn
                    color="success"
                    class="flex-grow-1"
                    :disabled="!listName"
                    :loading="creating"
                    @click="navigateToTable"
                >
                  {{ isPrivate ? 'Anonym starten' : 'Erstellen & Teilen' }}
                </v-btn>
              </div>
            </div>
          </v-expand-transition>
        </v-card>

        <v-card v-if="!isPrivate || !showInput" elevation="2" rounded="lg" class="pa-4 pa-sm-6 mb-6">
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
                :disabled="cleanCode.length < 6"
                @click="redeemCode"
            >
              Beitreten
            </v-btn>
          </div>
          <v-alert v-if="redeemError" type="error" variant="tonal" density="compact" class="mt-3">
            {{ redeemError }}
          </v-alert>
        </v-card>

        <v-card v-if="pinnedLists.length > 0" elevation="2" rounded="lg" class="mb-4">
          <v-card-title class="pa-4 pb-0 d-flex align-center">
            <v-icon start color="warning">mdi-pin</v-icon>
            Angeheftet
          </v-card-title>
          <v-list lines="two">
            <v-list-item
                v-for="entry in pinnedLists"
                :key="entry.hash"
                :to="`/list/${entry.hash}`"
                :title="entry.name"
                :subtitle="formatDate(entry.createdAt)"
            >
              <template #prepend>
                <v-avatar :color="entry.owner ? 'primary-lighten-4' : 'grey-lighten-3'">
                  <v-icon :color="entry.owner ? 'primary' : 'grey-darken-1'">
                    {{ entry.owner ? 'mdi-format-list-checks' : 'mdi-incognito' }}
                  </v-icon>
                </v-avatar>
              </template>
              <template #append>
                <v-chip v-if="!entry.owner" size="x-small" color="secondary" variant="tonal" class="mr-2">Privat</v-chip>
                <v-btn icon="mdi-pin-off" variant="text" size="small" color="warning" title="Losgelöst" @click.prevent="unpinFromHome(entry.hash)" />
              </template>
            </v-list-item>
          </v-list>
        </v-card>

        <v-card v-if="regularLists.length > 0" elevation="2" rounded="lg">
          <v-card-title class="pa-4 pb-0 d-flex align-center">
            Deine Listen
            <v-spacer />
            <v-chip size="x-small">Lokal gespeichert</v-chip>
          </v-card-title>
          <v-list lines="two">
            <v-list-item
                v-for="entry in regularLists"
                :key="entry.hash"
                :to="`/list/${entry.hash}`"
                :title="entry.name"
                :subtitle="formatDate(entry.createdAt)"
            >
              <template #prepend>
                <v-avatar :color="entry.owner ? 'primary-lighten-4' : 'grey-lighten-3'">
                  <v-icon :color="entry.owner ? 'primary' : 'grey-darken-1'">
                    {{ entry.owner ? 'mdi-format-list-checks' : 'mdi-incognito' }}
                  </v-icon>
                </v-avatar>
              </template>
              <template #append>
                <v-chip v-if="!entry.owner" size="x-small" color="secondary" variant="tonal" class="mr-2">Privat</v-chip>
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
import { createList, getListsCreated, getUserLists, redeemInviteCode, togglePinList, type UserListEntry } from '@/utils/listHash';
import { currentUser } from '@/utils/auth';

const router    = useRouter();
const showInput = ref(false);
const isPrivate = ref(false); // NEU: Status für Privatsphäre
const listName  = ref('');
const creating  = ref(false);
const totalListsCreated = ref(0);
const userLists = ref<UserListEntry[]>([]);
const inviteCode    = ref('');
const cleanCode     = computed(() => inviteCode.value.replace(/\s/g, '').toUpperCase());
const redeemLoading = ref(false);
const redeemError   = ref('');

onMounted(async () => {
  await refreshLists();
});

const refreshLists = async () => {
  totalListsCreated.value = await getListsCreated();
  // getUserLists sollte so implementiert sein/werden, dass es
  // bei currentUser = null nur die lokalen (anonymen) Listen zurückgibt.
  userLists.value = await getUserLists(currentUser.value ?? undefined);
};

const pinnedLists  = computed(() => userLists.value.filter(l => l.pinned));
const regularLists = computed(() => userLists.value.filter(l => !l.pinned));

const unpinFromHome = async (hash: string) => {
  await togglePinList(hash, currentUser.value ?? undefined);
  await refreshLists();
};

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });

const prepareCreate = (privateMode: boolean) => {
  isPrivate.value = privateMode;
  showInput.value = true;
};

const navigateToTable = async () => {
  if (!listName.value || creating.value) return;
  creating.value = true;
  try {
    // Wenn privat, übergeben wir explizit undefined als Owner
    const owner = isPrivate.value ? undefined : (currentUser.value ?? undefined);
    const { hash, newCount } = await createList(listName.value, owner);

    totalListsCreated.value = newCount;
    await refreshLists();
    router.push(`/list/${hash}`);
  } finally {
    creating.value = false;
  }
};

const redeemCode = async () => {
  if (cleanCode.value.length < 6 || redeemLoading.value) return;
  redeemError.value = '';
  redeemLoading.value = true;
  try {
    const result = await redeemInviteCode(inviteCode.value);
    if (!result) {
      redeemError.value = 'Ungültiger oder abgelaufener Code.';
      return;
    }
    await refreshLists();
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