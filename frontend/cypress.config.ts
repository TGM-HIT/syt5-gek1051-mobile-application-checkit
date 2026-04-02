import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    specPattern: 'cypress/e2e/**/*.{cy,spec}.{js,jsx,ts,tsx}',
    // preview (test:e2e): http://localhost:4173 | dev (test:e2e:dev): http://localhost:4173
    baseUrl: 'http://localhost:5173',
    excludeSpecPattern: 'cypress/e2e/offline-sync.cy.ts',
  },
  component: {
    specPattern: 'src/**/__tests__/*.{cy,spec}.{js,ts,jsx,tsx}',
    devServer: {
      framework: 'vue',
      bundler: 'vite',
    },
  },
})
