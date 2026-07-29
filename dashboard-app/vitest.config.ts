import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// Standalone config for unit tests of pure business logic (formatters, helpers,
// utils). It intentionally does NOT load the app's vite.config.ts / Bitrix24 UI
// plugin — these tests need no SFC compilation, only a DOM for DOMParser.
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.ts', 'tests/e2e/**/*.{test,spec}.ts'],
    globals: false
  }
})
