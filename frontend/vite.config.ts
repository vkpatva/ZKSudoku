import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  optimizeDeps: {
    exclude: ['@aztec/bb.js'],
  },
  resolve: {
    alias: {
      // Use the browser bundle so workers don’t resolve the Node entry (avoids bad backend fallback).
      '@aztec/bb.js': path.join(rootDir, 'node_modules/@aztec/bb.js/dest/browser/index.js'),
      pino: path.join(rootDir, 'node_modules/pino/browser.js'),
    },
  },
})
