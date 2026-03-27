<template>
  <v-app>
    <v-app-bar flat border="b" density="comfortable">
      <v-app-bar-title>
        <router-link to="/" class="text-decoration-none text-success font-weight-bold">
          <v-icon color="success" class="mr-1">mdi-checkbox-marked</v-icon>CheckIT
        </router-link>
      </v-app-bar-title>

      <!-- Online / Offline indicator -->
      <v-chip
          :color="effectivelyOffline ? 'error' : 'success'"
          variant="tonal"
          size="small"
          class="mr-3"
      >
        <v-icon start size="14">{{ effectivelyOffline ? 'mdi-wifi-off' : 'mdi-wifi' }}</v-icon>
        {{ effectivelyOffline ? 'Offline' : 'Online' }}
      </v-chip>

      <template v-if="currentUser">
        <!-- Desktop -->
        <v-icon class="mr-1 d-none d-sm-inline">mdi-account</v-icon>
        <span class="text-body-2 mr-3 d-none d-sm-inline">{{ currentUser }}</span>
        <v-btn variant="text" prepend-icon="mdi-logout" class="d-none d-sm-flex" @click="handleLogout">Logout</v-btn>
        <!-- Mobile -->
        <v-btn variant="text" icon="mdi-logout" class="d-sm-none" @click="handleLogout" />
      </template>
      <template v-else>
        <!-- Desktop -->
        <v-btn variant="text" prepend-icon="mdi-login" to="/login" class="d-none d-sm-flex">Login</v-btn>
        <v-btn variant="text" prepend-icon="mdi-account-plus" to="/register" class="d-none d-sm-flex">Register</v-btn>
        <!-- Mobile -->
        <v-btn variant="text" icon="mdi-login" to="/login" class="d-sm-none" />
        <v-btn variant="text" icon="mdi-account-plus" to="/register" class="d-sm-none" />
      </template>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { currentUser, logout } from '@/utils/auth';
import { simulatedOffline, isOffline } from '@/utils/listHash';

const router = useRouter();

const effectivelyOffline = computed(() => simulatedOffline.value || isOffline.value);

const handleLogout = () => {
  logout();
  router.push('/login');
};
</script>

<style>
:root {
  font-family: 'Inter', sans-serif;
}
</style>
