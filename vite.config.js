import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,        // No source maps in production
    rollupOptions: {
      output: {
        manualChunks: {
          html2canvas: ['html2canvas'],  // Split into separate chunk (lazy loaded)
        }
      }
    }
  }
})
