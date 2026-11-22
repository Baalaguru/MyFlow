import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    fs: {
      allow: ['../..'],
    },
    proxy: {
      '/healthz': 'http://127.0.0.1:8080',
      '/v1': 'http://127.0.0.1:8080',
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
  },
})
