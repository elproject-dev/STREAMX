import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: [
      'directed-zigzagged-haunt.ngrok-free.dev',
      'all'
    ],
    cors: true,
    watch: {
      usePolling: true,
    },
    hmr: true,
    proxy: {
      '/blocked-request': {
        target: 'http://localhost:5173',
        bypass: (req, res) => {
          res.statusCode = 403;
          res.end('Forbidden: Request is blocked');
          return false;
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('@radix-ui') || id.includes('lucide-react')) {
              return 'vendor-ui';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            if (id.includes('plyr') || id.includes('video.js') || id.includes('hls.js')) {
              return 'vendor-player';
            }
            return 'vendor';
          }
        }
      }
    }
  }
});