<template>
  <v-app>
    <v-container class="fill-height" fluid>
      <v-col class="text-center">
        <v-row justify="center" align="center">
          <v-card class="pa-8 text-center" elevation="4" rounded="lg" width="100%" max-width="500">
            <h1 class="text-h2 text-success mb-6">
              ☑️ CheckIT
            </h1>

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
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const showInput = ref(false);
const listName = ref('');

const navigateToTable = () => {
  if (listName.value) {
    // Wir übergeben den Namen als Query-Parameter in der URL
    router.push({
      path: '/list',
      query: { list: listName.value }
    });
  }
};
</script>