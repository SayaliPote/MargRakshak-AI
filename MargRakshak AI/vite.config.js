import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  },
  build: {
    // Raise chunk size warning limit to avoid noise
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor: React core
          'react-vendor': ['react', 'react-dom'],
          // Routing
          'router': ['react-router-dom'],
          // Map libraries (largest dependency)
          'leaflet-vendor': ['leaflet', 'react-leaflet'],
          // Icons
          'icons': ['lucide-react'],
        }
      }
    }
  }
})
