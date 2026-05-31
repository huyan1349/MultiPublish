import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function cspSafeViteEnv(): Plugin {
  return {
    name: 'multipublish:csp-safe-vite-env',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if ((req.url || '').split('?')[0] !== '/@vite/env') {
          next()
          return
        }

        const defines = JSON.stringify(server.config.define || {})
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/javascript')
        res.end(`const context = globalThis;
const defines = ${defines};
Object.keys(defines).forEach((key) => {
  const segments = key.split(".");
  let target = context;
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (i === segments.length - 1) {
      target[segment] = defines[key];
    } else {
      target = target[segment] || (target[segment] = {});
    }
  }
});
`)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), cspSafeViteEnv()],
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
