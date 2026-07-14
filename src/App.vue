<template>
  <div id="app-root">

    <Transition name="slide-banner">
      <div class="install-banner" v-if="showIosBanner">
        <Smartphone :size="15" />
        <p>
          Instal: tekan tombol <strong>Share</strong>
          lalu pilih <strong>"Add to Home Screen"</strong>
        </p>
        <button class="banner-close" @click="dismissIos">
          <X :size="15" />
        </button>
      </div>
    </Transition>

    <header class="navbar">
      <div class="navbar-inner">
        <RouterLink to="/" class="logo">
          <div class="logo-mark">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 2h7l3 3v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/>
              <path d="M10 2v3h3M5 8h6M5 11h4"/>
            </svg>
          </div>
          <span class="logo-name">PDF<span>Studio</span></span>
        </RouterLink>
        <div class="nav-spacer"></div>
        <button class="install-btn" v-if="isMobile && !isInstalled" @click="handleInstall">
          <Download :size="14" />
          Instal App
        </button>
      </div>
    </header>

    <RouterView v-slot="{ Component }">
      <component :is="Component" :key="route.path" :active-cat="activeCat" @set-cat="activeCat = $event" />
    </RouterView>

    <footer class="footer">
      <p>Dibuat oleh <a href="https://mfaridsyam.vercel.app" target="_blank" rel="noopener">MFaridS</a></p>
    </footer>

    <Transition name="toast-anim">
      <div class="toast" v-if="toastMsg">{{ toastMsg }}</div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, provide } from 'vue'
import { useRoute } from 'vue-router'
import { Smartphone, X, Download } from '@lucide/vue'

const route          = useRoute()
const deferredPrompt = ref(null)
const showIosBanner  = ref(false)
const toastMsg       = ref('')
const activeCat      = ref('all')

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}
function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true
}

const isMobile   = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)
const isInstalled = isInStandaloneMode()

function handleInstall() {
  if (deferredPrompt.value) {
    installPWA()
  } else if (isIos()) {
    showIosBanner.value = true
  }
}

onMounted(() => {
  if (isIos() && !isInStandaloneMode()) {
    const dismissed = sessionStorage.getItem('ios-banner-dismissed')
    if (!dismissed) showIosBanner.value = true
  }
})

function dismissIos() {
  showIosBanner.value = false
  sessionStorage.setItem('ios-banner-dismissed', '1')
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt.value = e
})

async function installPWA() {
  if (!deferredPrompt.value) return
  deferredPrompt.value.prompt()
  await deferredPrompt.value.userChoice
  deferredPrompt.value = null
}

function showToast(msg, ms = 2500) {
  toastMsg.value = msg
  setTimeout(() => (toastMsg.value = ''), ms)
}
provide('showToast', showToast)
</script>

<style scoped>
#app-root { display: flex; flex-direction: column; min-height: 100vh; }

.install-banner {
  background: var(--c-950);
  color: var(--c-white);
  padding: 10px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}
.install-banner p { font-size: 13px; font-weight: 400; line-height: 1.5; }

.banner-close {
  background: none;
  border: none;
  color: var(--c-400);
  cursor: pointer;
  padding: 3px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  transition: color .15s;
}
.banner-close:hover { color: var(--c-white); }

.slide-banner-enter-active, .slide-banner-leave-active { transition: all .3s ease; }
.slide-banner-enter-from, .slide-banner-leave-to { opacity: 0; transform: translateY(-100%); }

.navbar {
  background: rgba(255,255,255,.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(0,0,0,.07);
  position: sticky;
  top: 0;
  z-index: 100;
}
.navbar-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 28px;
  height: 62px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.logo {
  display: flex;
  align-items: center;
  gap: 9px;
  text-decoration: none;
  flex-shrink: 0;
}
.logo-mark {
  width: 30px; height: 30px;
  background: #E02B20;
  border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  color: var(--c-white);
  flex-shrink: 0;
}
.logo-name {
  font-size: 16px;
  font-weight: 800;
  color: var(--c-950);
  letter-spacing: -.4px;
}
.logo-name span { color: #E02B20; font-weight: 800; }

.nav-spacer { flex: 1; }

.install-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: var(--c-950);
  border: none;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  color: var(--c-white);
  cursor: pointer;
  font-family: var(--font);
  transition: all .2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}
.install-btn:hover { background: var(--c-800); transform: translateY(-1px); }
.install-btn:active { transform: translateY(0); }

.footer {
  margin-top: auto;
  border-top: 1px solid rgba(0,0,0,.07);
  background: #fff;
  padding: 24px 28px;
  text-align: center;
}
.footer p { font-size: 13px; color: var(--text-3); }
.footer a { color: #E02B20; text-decoration: none; font-weight: 500; transition: color .15s; }
.footer a:hover { color: #b91c1c; }

.toast {
  position: fixed; bottom: 24px; left: 50%;
  transform: translateX(-50%);
  background: var(--c-950); color: var(--c-white);
  padding: 10px 20px; border-radius: 8px;
  font-size: 13.5px; font-weight: 500;
  z-index: 9999;
  box-shadow: 0 4px 16px rgba(0,0,0,.2);
  white-space: nowrap; pointer-events: none;
}
.toast-anim-enter-active, .toast-anim-leave-active { transition: all .3s cubic-bezier(.16,1,.3,1); }
.toast-anim-enter-from, .toast-anim-leave-to { opacity: 0; transform: translateX(-50%) translateY(12px); }


@media (max-width: 640px) {
  .navbar-inner { padding: 0 16px; }
}
</style>
