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
});