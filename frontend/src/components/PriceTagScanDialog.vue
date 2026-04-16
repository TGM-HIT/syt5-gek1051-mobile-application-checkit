<template>
  <v-dialog :model-value="modelValue" max-width="560" persistent @update:model-value="$emit('update:modelValue', $event)">
    <v-card :title="scanMode === 'recipe' ? 'Rezept scannen' : 'Preisschild scannen'">
      <v-card-text>
        <v-btn-toggle
          v-model="scanMode"
          mandatory
          divided
          color="primary"
          class="mb-4"
          data-testid="scan-mode-toggle"
        >
          <v-btn value="price" prepend-icon="mdi-tag" data-testid="scan-mode-price">Preisschild</v-btn>
          <v-btn value="recipe" prepend-icon="mdi-book-open-page-variant" data-testid="scan-mode-recipe">Rezept</v-btn>
        </v-btn-toggle>

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
            <template v-if="scanMode === 'price'">
              <v-text-field v-model="recognizedName" label="Artikelname" variant="outlined" density="comfortable" class="mb-3" />
              <v-text-field v-model="recognizedPrice" label="Preis" variant="outlined" density="comfortable" prefix="EUR" />
            </template>

            <template v-else>
              <v-alert type="info" variant="tonal" density="compact" class="mb-3">
                Erkannte Zutaten werden in Rezept-Reihenfolge uebernommen.
              </v-alert>
              <v-list lines="one" density="compact" class="rounded border mb-2" data-testid="recipe-ingredient-list">
                <v-list-item v-for="ingredient in orderedIngredients" :key="ingredient.orderIndex" data-testid="recipe-ingredient-row">
                  <template #prepend>
                    <v-chip size="x-small" class="mr-2">{{ ingredient.orderIndex }}</v-chip>
                  </template>
                  <v-list-item-title>{{ ingredient.name }}</v-list-item-title>
                  <v-list-item-subtitle>Menge: {{ ingredient.menge }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item v-if="orderedIngredients.length === 0">
                  <v-list-item-title>Keine Zutaten erkannt - bitte anderes Bild probieren.</v-list-item-title>
                </v-list-item>
              </v-list>
            </template>

            <v-btn variant="text" size="small" class="mt-1" @click="resetImage">
              <v-icon start>mdi-refresh</v-icon> Anderes Bild wählen
            </v-btn>
          </div>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn color="grey-darken-1" variant="text" @click="close">Abbrechen</v-btn>
        <v-btn color="primary" variant="elevated" :disabled="!canConfirm" @click="confirm" data-testid="scan-confirm">
          Übernehmen
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { createWorker } from 'tesseract.js';
import { parseRecipeIngredients, type RecipeIngredient } from '@/utils/recipeScan';

type ScanResult =
  | { kind: 'priceTag'; name: string; preis: string }
  | { kind: 'recipe'; ingredients: RecipeIngredient[] };

type E2eScanOverride = {
  priceTag?: { name: string; preis: string };
  recipeText?: string;
  recipeIngredients?: RecipeIngredient[];
};

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'scanned', data: ScanResult): void;
}>();

const cameraInput = ref<HTMLInputElement | null>(null);
const galleryInput = ref<HTMLInputElement | null>(null);
const imageUrl = ref<string | null>(null);
const processing = ref(false);
const progress = ref(0);
const statusText = ref('');
const scanMode = ref<'price' | 'recipe'>('price');
const recognizedName = ref('');
const recognizedPrice = ref('');
const recognizedIngredients = ref<RecipeIngredient[]>([]);

const orderedIngredients = computed(() =>
  [...recognizedIngredients.value].sort((a, b) => a.orderIndex - b.orderIndex)
);

const canConfirm = computed(() => {
  if (processing.value || !imageUrl.value) return false;
  if (scanMode.value === 'recipe') return orderedIngredients.value.length > 0;
  return recognizedName.value.trim().length > 0;
});

function getE2eOverride(): E2eScanOverride | undefined {
  return (window as unknown as { __CHECKIT_E2E_SCAN_OVERRIDE__?: E2eScanOverride }).__CHECKIT_E2E_SCAN_OVERRIDE__;
}

function openCamera() {
  cameraInput.value?.click();
}

function openGallery() {
  galleryInput.value?.click();
}

function readFileAndRunOcr(file: File) {
  const reader = new FileReader();
  reader.onload = (e) => {
    imageUrl.value = e.target?.result as string;
    runOcr(imageUrl.value);
  };
  reader.readAsDataURL(file);
}

function onFileSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  readFileAndRunOcr(file);
}

async function runOcr(image: string) {
  const e2eOverride = getE2eOverride();
  if (e2eOverride) {
    if (scanMode.value === 'recipe') {
      if (e2eOverride.recipeIngredients?.length) {
        recognizedIngredients.value = e2eOverride.recipeIngredients;
      } else {
        parseRecipeText(e2eOverride.recipeText ?? '');
      }
    } else {
      recognizedName.value = e2eOverride.priceTag?.name ?? recognizedName.value;
      recognizedPrice.value = e2eOverride.priceTag?.preis ?? recognizedPrice.value;
    }
    processing.value = false;
    progress.value = 100;
    statusText.value = '';
    return;
  }

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

    if (scanMode.value === 'recipe') {
      parseRecipeText(text);
    } else {
      parsePriceText(text);
    }
  } catch (err) {
    console.error('OCR failed:', err);
    statusText.value = 'OCR fehlgeschlagen. Bitte manuell eingeben.';
  } finally {
    processing.value = false;
  }
}

function parsePriceText(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Try to find a price pattern (e.g. 1,99 or 1.99 or € 1,99)
  const priceRegex = /(\d+[.,]\d{2})\s*€?|€\s*(\d+[.,]\d{2})/;
  let foundPrice = '';
  let priceLineIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i]?.match(priceRegex);
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

function parseRecipeText(text: string) {
  recognizedIngredients.value = parseRecipeIngredients(text);
}

function resetImage() {
  imageUrl.value = null;
  recognizedName.value = '';
  recognizedPrice.value = '';
  recognizedIngredients.value = [];
  progress.value = 0;
  if (cameraInput.value) cameraInput.value.value = '';
  if (galleryInput.value) galleryInput.value.value = '';
}

function close() {
  resetImage();
  emit('update:modelValue', false);
}

function confirm() {
  if (scanMode.value === 'recipe') {
    emit('scanned', {
      kind: 'recipe',
      ingredients: orderedIngredients.value,
    });
  } else {
    emit('scanned', {
      kind: 'priceTag',
      name: recognizedName.value,
      preis: recognizedPrice.value,
    });
  }
  close();
}
</script>

