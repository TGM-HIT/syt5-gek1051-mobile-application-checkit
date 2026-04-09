<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="5" lg="4">
        <v-card elevation="4" class="pa-8" rounded="lg">
          <h1 class="text-h4 font-weight-bold text-center mb-6">
            <v-icon color="success" class="mr-1">mdi-checkbox-marked</v-icon>CheckIT
          </h1>

          <v-alert v-if="error" type="error" variant="tonal" class="mb-4" density="compact">
            {{ error }}
          </v-alert>

          <v-text-field
              v-model="username"
              label="Username"
              variant="outlined"
              prepend-inner-icon="mdi-account"
              autofocus
              class="mb-3"
              hide-details="auto"
              @keyup.enter="submit"
          />
          <v-text-field
              v-model="password"
              label="Password"
              type="password"
              variant="outlined"
              prepend-inner-icon="mdi-lock"
              class="mb-3"
              hide-details="auto"
              @keyup.enter="submit"
          />
          <v-text-field
              v-model="passwordConfirm"
              label="Confirm Password"
              type="password"
              variant="outlined"
              prepend-inner-icon="mdi-lock-check"
              class="mb-6"
              hide-details="auto"
              @keyup.enter="submit"
          />

          <v-btn color="primary" block size="large" prepend-icon="mdi-account-plus" :loading="loading" @click="submit">
            Register
          </v-btn>

          <div class="text-center mt-4 text-body-2">
            Already have an account?
            <router-link to="/login">Login</router-link>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { register } from '@/utils/auth';

const router = useRouter();

const username        = ref('');
const password        = ref('');
const passwordConfirm = ref('');
const error           = ref('');
const loading         = ref(false);

const submit = async () => {
  error.value = '';
  if (password.value !== passwordConfirm.value) {
    error.value = 'Passwords do not match.';
    return;
  }
  loading.value = true;
  const result = await register(username.value, password.value);
  loading.value = false;
  if (!result.ok) {
    error.value = result.error ?? 'Registration failed.';
    return;
  }
  router.push('/');
};
</script>
