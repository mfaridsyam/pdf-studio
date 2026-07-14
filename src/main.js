import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './assets/main.css'

// Kill-switch: proyek ini tidak punya folder public/, jadi /sw.js selalu
// dijawab index.html oleh rewrite di vercel.json. Service worker lama yang
// masih terpasang di browser bisa menyajikan index.html basi yang menunjuk
// ke nama chunk lama — import() rute jadi gagal dan halaman tampil kosong.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => {})
  if (window.caches) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {})
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/',           component: () => import('./views/HomeView.vue') },
    { path: '/tool/:id',   component: () => import('./views/ToolView.vue') },
    { path: '/:pathMatch(.*)*', component: () => import('./views/NotFoundView.vue') },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

// Kalau chunk rute gagal di-import (deploy baru mengganti hash file, atau
// cache basi), navigasi berhenti tanpa merender apa pun — layar kosong sampai
// user refresh manual. Reload sekali secara otomatis; flag di sessionStorage
// mencegah loop reload kalau ternyata memang error lain.
router.onError((err, to) => {
  const isChunkError = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(err?.message || '')
  if (!isChunkError) return
  if (sessionStorage.getItem('chunk-reload') === to.fullPath) return
  sessionStorage.setItem('chunk-reload', to.fullPath)
  window.location.assign(to.fullPath)
})

router.isReady().then(() => sessionStorage.removeItem('chunk-reload'))

createApp(App).use(router).mount('#app')
