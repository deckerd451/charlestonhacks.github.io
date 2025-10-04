import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/app/',
  build: {
    outDir: '../dist/app',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    proxy: {
      // Proxy API requests to avoid CORS during dev
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      }
    },
    // Serve files from parent directory (for legacy HTML files)
    fs: {
      allow: ['..']
    }
  }
})
