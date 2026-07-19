import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In production (Vercel), set VITE_API_URL to your Railway backend URL.
// In dev, the proxy below forwards /api → localhost:4000 (no CORS needed).
const API_TARGET = process.env['VITE_API_URL'] ?? 'http://localhost:4000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
      '/health': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
})
