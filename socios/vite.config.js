import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'La Gaonerita - Socios',
        short_name: 'La Gaonerita',
        description: 'Panel de socios y dueños: reportes de ventas y salud del negocio de La Gaonerita',
        theme_color: '#D6431F',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/login',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  server: {
    port: 5175,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
});
