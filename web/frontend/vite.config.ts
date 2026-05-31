import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4395',
      '/health': 'http://localhost:4395',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-tiptap': ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-placeholder', '@tiptap/extension-link', '@tiptap/extension-image'],
          'vendor-motion': ['framer-motion'],
        },
      },
    },
  },
})
