<template>
  <v-app>
    <v-container class="fill-height" fluid>
      <v-col class="text-center">
        <v-row justify="center" align="center">
          <v-card class="pa-8 text-center" elevation="4" rounded="lg" width="100%" max-width="500">
            <h1 class="text-h2 text-success mb-6">
              ☑️ CheckIT
            </h1>

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

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { hashListName, incrementListsCreated, getListsCreated } from '@/utils/listHash';

const router = useRouter();
const showInput = ref(false);
const listName = ref('');
const totalListsCreated = ref(0);

onMounted(async () => {
  totalListsCreated.value = await getListsCreated();
});

const navigateToTable = async () => {
  if (listName.value) {
    const hash = hashListName(listName.value);
    totalListsCreated.value = await incrementListsCreated();
    router.push({
      path: `/list/${hash}`,
      query: { name: listName.value }
    });
  }
};
</script>