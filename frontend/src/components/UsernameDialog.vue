<template>
  <v-dialog :model-value="modelValue" max-width="420" persistent @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="text-h6 pt-6 pb-2 px-6">
        👋 Willkommen bei CheckIT!
      </v-card-title>
      <v-card-subtitle class="px-6 pb-4">
        Wie dürfen wir dich nennen? Dein Name wird als Cookie gespeichert (<code>checkit_username</code>).
      </v-card-subtitle>
      <v-card-text class="px-6">
        <v-text-field
          v-model="nameInput"
          label="Dein Name"
          variant="outlined"
          autofocus
          hide-details
          @keyup.enter="handleSave"
        ></v-text-field>
      </v-card-text>
      <v-card-actions class="px-6 pb-6">
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="elevated"
          :disabled="!nameInput.trim()"
          @click="handleSave"
        >
          Los geht's!
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'save', name: string): void;
}>();

const nameInput = ref('');

const handleSave = () => {
  const trimmed = nameInput.value.trim();
  if (!trimmed) return;
  emit('save', trimmed);
  nameInput.value = '';
};
</script>
