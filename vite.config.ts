import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { imageProxyPlugin } from './server/gptimage/imageProxy'

export default defineConfig({
  plugins: [react(), imageProxyPlugin()],
  publicDir: 'assets',
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    css: false,
  },
})
