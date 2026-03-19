<template>
  <v-chip
    :color="syncColor"
    variant="tonal"
    size="x-small"
    class="mr-2"
    :title="'CouchDB: ' + couchDbStatus"
  >
    {{ syncLabel }}
  </v-chip>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { couchDbStatus } from '@/utils/db';

const syncLabel = computed(() => ({
  connecting: '🔄 DB',
  active:     '🟢 DB',
  paused:     '⏸ DB',
  error:      '🔴 DB',
  disabled:   '⚫ DB',
}[couchDbStatus.value]));

const syncColor = computed(() => ({
  connecting: 'grey',
  active:     'success',
  paused:     'warning',
  error:      'error',
  disabled:   'grey',
}[couchDbStatus.value]));
</script>
