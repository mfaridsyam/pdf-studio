import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // Pre-bundle keduanya supaya Vite tidak menemukan dependensi baru saat rute
  // /tool/:id dibuka pertama kali — penemuan itu memicu "re-optimize + full
  // reload" yang tampak seperti halaman kosong sesaat di mode dev.
  optimizeDeps: {
    include: ['@cantoo/pdf-lib', '@lucide/vue'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-lib': ['@cantoo/pdf-lib'],
        },
      },
    },
  },
})
