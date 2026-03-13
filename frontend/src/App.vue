<template>
  <v-app>
    <v-app-bar flat border="b">
      <v-app-bar-title>
        <router-link to="/" class="text-decoration-none text-success font-weight-bold">
          ☑️ CheckIT
        </router-link>
      </v-app-bar-title>

      <template v-if="currentUser">
        <span class="text-body-2 mr-3">👤 {{ currentUser }}</span>
        <v-btn variant="text" @click="handleLogout">Logout</v-btn>
      </template>
      <template v-else>
        <v-btn variant="text" to="/login">Login</v-btn>
        <v-btn variant="text" to="/register">Register</v-btn>
      </template>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { currentUser, logout } from '@/utils/auth';

const router = useRouter();

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
