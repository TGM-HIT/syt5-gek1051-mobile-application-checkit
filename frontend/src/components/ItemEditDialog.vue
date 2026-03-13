<template>
  <v-dialog :model-value="modelValue" max-width="400" persistent @update:model-value="$emit('update:modelValue', $event)">
    <v-card title="Artikel bearbeiten">
      <v-card-text>
        <v-text-field 
          v-model="localItem.name" 
          label="Name" 
          variant="outlined" 
          class="mb-4"
        ></v-text-field>
        <v-text-field 
          v-model="localItem.menge" 
          label="Menge" 
          variant="outlined"
        ></v-text-field>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="grey-darken-1" variant="text" @click="$emit('update:modelValue', false)">
          Abbrechen
        </v-btn>
        <v-btn color="primary" variant="elevated" @click="handleSave">
          Speichern
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { ListItem } from '@/utils/types';

const props = defineProps<{
  modelValue: boolean;
  item: ListItem;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'save', item: ListItem): void;
}>();

const localItem = ref<ListItem>({ ...props.item });

watch(() => props.item, (newVal) => {
  localItem.value = { ...newVal };
}, { deep: true });

const handleSave = () => {
  emit('save', { ...localItem.value });
};
</script>
