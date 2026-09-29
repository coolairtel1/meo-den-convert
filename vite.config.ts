import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Ask before swapping versions, so an update never interrupts a conversion.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Mèo Đen Convert',
        short_name: 'Mèo Đen',
        description: 'Đổi định dạng ảnh (kể cả HEIC) và tạo mã QR ngay trên máy — không upload, không đăng nhập.',
        lang: 'vi',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#fffaf0',
        theme_color: '#1d1a26',
        categories: ['utilities', 'photo', 'productivity'],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the whole app, including the HEIC/JPEG/PNG/WebP/resize WASM, so it works offline right away.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,wasm}'],
        // The AVIF encoder (2 × 3.5 MB) and rarely used font subsets are cached on first use instead.
        globIgnores: ['**/avif_enc*', '**/*-{cyrillic,cyrillic-ext,greek,devanagari}-*.woff2'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // Control the page on the very first visit (nothing to replace yet); later updates still wait for the prompt.
        clientsClaim: true,
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\/assets\/(avif_enc|.*-(cyrillic|greek|devanagari))/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'meoden-lazy-assets', expiration: { maxEntries: 20 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  // jSquash codecs locate their .wasm via import.meta.url; pre-bundling breaks that.
  optimizeDeps: {
    exclude: ['@jsquash/jpeg', '@jsquash/png', '@jsquash/webp', '@jsquash/avif', '@jsquash/resize'],
    // CommonJS/lazy deps imported from the worker: pre-bundle them up front to avoid a mid-session re-optimise.
    include: ['libheif-js/libheif-wasm/libheif.js', 'utif2', 'pako', 'gifenc', 'fflate'],
  },
  worker: {
    format: 'es',
  },
  build: {
    rolldownOptions: {
      output: {
        // Long-lived vendor chunks cache across app updates. Only eagerly used libs are listed:
        // lazy ones (QR, zip, codecs) must stay in their own on-demand chunks.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'gsap', test: /node_modules[\\/](gsap|@gsap)[\\/]/ },
            { name: 'ui', test: /node_modules[\\/](radix-ui|@radix-ui|lucide-react|i18next|react-i18next|i18next-browser-languagedetector|zustand|clsx|tailwind-merge|class-variance-authority)[\\/]/ },
          ],
        },
      },
    },
  },
})
