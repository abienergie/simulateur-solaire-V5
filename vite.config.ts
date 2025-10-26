import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Simulateur Solaire',
        short_name: 'Simulateur',
        description: 'Votre simulateur solaire intelligent',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          {
            src: './favicon.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: './logo-simulateur.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      // Désactiver complètement le service worker
      disable: true,
      devOptions: {
        enabled: false
      }
    })
  ],
  base: './', // Utiliser des chemins relatifs
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          pdf: ['jspdf', 'jspdf-autotable', 'pdf-lib']
        }
      }
    }
  },
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    hmr: true,
    proxy: {
      '/pvgis-api': {
        target: 'https://re.jrc.ec.europa.eu',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pvgis-api/, '/api'),
        secure: true,
        headers: {
          'Origin': 'https://re.jrc.ec.europa.eu'
        }
      },
      '/switchgrid-api': {
        target: 'https://app.switchgrid.tech/enedis/v2',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/switchgrid-api/, ''),
        secure: true,
        headers: {
          'Origin': 'https://app.switchgrid.tech'
        }
      },
      '/api/switchgrid-proxy': {
        target: 'https://app.switchgrid.tech/enedis/v2',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/switchgrid-proxy/, ''),
        secure: true,
        headers: {
          'Authorization': 'Bearer c85136b872194092cf9d013c6fe6ce5c',
          'Origin': 'https://app.switchgrid.tech',
          'User-Agent': 'ABI-Energie-Simulator/1.0'
        }
      },
      '/supabase': {
        target: 'https://xpxbxfuckljqdvkajlmx.supabase.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/supabase/, ''),
      },
      '/functions/v1': {
        target: 'https://xpxbxfuckljqdvkajlmx.supabase.co',
        changeOrigin: true,
        secure: true,
      }
    }
  },
  envPrefix: 'VITE_'
});