<template>
  <v-dialog :model-value="modelValue" max-width="500" persistent @update:model-value="$emit('update:modelValue', $event)">
    <v-card title="Preisschild scannen">
      <v-card-text>
        <!-- Image source selection -->
        <div v-if="!imageUrl" class="d-flex flex-column align-center ga-3">
          <v-btn color="primary" variant="elevated" block @click="openCamera" prepend-icon="mdi-camera">
            Kamera
          </v-btn>
          <v-btn color="secondary" variant="elevated" block @click="openGallery" prepend-icon="mdi-image">
            Bild aus Galerie
          </v-btn>
          <input ref="cameraInput" type="file" accept="image/*" capture="environment" style="display:none" @change="onFileSelected" />
          <input ref="galleryInput" type="file" accept="image/*" style="display:none" @change="onFileSelected" />
        </div>

        <!-- Image preview + OCR -->
        <div v-else>
          <v-img :src="imageUrl" max-height="250" class="mb-4 rounded" contain />

          <v-progress-linear v-if="processing" :model-value="progress" color="primary" class="mb-2" />
          <p v-if="processing" class="text-center text-caption">{{ statusText }}</p>

          <!-- Recognized fields -->
          <div v-if="!processing">
            <v-text-field v-model="recognizedName" label="Artikelname" variant="outlined" density="comfortable" class="mb-3" />
            <v-text-field v-model="recognizedPrice" label="Preis" variant="outlined" density="comfortable" prefix="€" />
            <v-btn variant="text" size="small" class="mt-1" @click="resetImage">
              <v-icon start>mdi-refresh</v-icon> Anderes Bild wählen
            </v-btn>
          </div>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn color="grey-darken-1" variant="text" @click="close">Abbrechen</v-btn>
        <v-btn color="primary" variant="elevated" :disabled="processing || !imageUrl" @click="confirm">
          Übernehmen
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { createWorker } from 'tesseract.js';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'scanned', data: { name: string; preis: string }): void;
}>();

const cameraInput = ref<HTMLInputElement | null>(null);
const galleryInput = ref<HTMLInputElement | null>(null);
const imageUrl = ref<string | null>(null);
const processing = ref(false);
const progress = ref(0);
const statusText = ref('');
const recognizedName = ref('');
const recognizedPrice = ref('');

function openCamera() {
  cameraInput.value?.click();
}

function openGallery() {
  galleryInput.value?.click();
}

function onFileSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    imageUrl.value = e.target?.result as string;
    runOcr(imageUrl.value);
  };
  reader.readAsDataURL(file);
}

async function runOcr(image: string) {
  processing.value = true;
  progress.value = 0;
  statusText.value = 'OCR wird initialisiert...';

  try {
    const worker = await createWorker('deu', undefined, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          progress.value = Math.round(m.progress * 100);
          statusText.value = 'Text wird erkannt...';
        }
      },
    });

    const { data: { text } } = await worker.recognize(image);
    await worker.terminate();

    parseOcrText(text);
  } catch (err) {
    console.error('OCR failed:', err);
    statusText.value = 'OCR fehlgeschlagen. Bitte manuell eingeben.';
  } finally {
    processing.value = false;
  }
}

function parseOcrText(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Try to find a price pattern (e.g. 1,99 or 1.99 or € 1,99)
  const priceRegex = /(\d+[.,]\d{2})\s*€?|€\s*(\d+[.,]\d{2})/;
  let foundPrice = '';
  let priceLineIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const match = line.match(priceRegex);
    if (match) {
      foundPrice = (match[1] ?? match[2] ?? '').replace('.', ',');
      priceLineIndex = i;
      break;
    }
  }

  recognizedPrice.value = foundPrice;

  // Use the longest non-price line as article name, or the first line
  const nameLines = lines.filter((_, i) => i !== priceLineIndex);
  if (nameLines.length > 0) {
    recognizedName.value = nameLines.reduce((a, b) => a.length >= b.length ? a : b);
  } else {
    recognizedName.value = '';
  }
}

function resetImage() {
  imageUrl.value = null;
  recognizedName.value = '';
  recognizedPrice.value = '';
  progress.value = 0;
  if (cameraInput.value) cameraInput.value.value = '';
  if (galleryInput.value) galleryInput.value.value = '';
}

function close() {
  resetImage();
  emit('update:modelValue', false);
}

function confirm() {
  emit('scanned', {
    name: recognizedName.value,
    preis: recognizedPrice.value,
  });
  close();
}
</script>
