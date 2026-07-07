import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      includeAssets: ['apple-touch-icon.png', 'favicon-32.png'],
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
      manifest: {
        name: 'Манилов — бронирование столов',
        short_name: 'Манилов',
        description: 'Бронирование столов кафе «Манилов»',
        lang: 'ru',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f2e8d0',
        theme_color: '#8a6d2a',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Тяжёлые библиотеки — отдельными чанками: при обновлении приложения
        // браузер берёт их из кэша, а не качает заново.
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})
