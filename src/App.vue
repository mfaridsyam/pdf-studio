<template>
  <div id="app-root">

    <Transition name="slide-banner">
      <div class="install-banner ios-banner" v-if="showIosBanner">
        <span>📲</span>
        <p>
          Instal: tekan
          <span class="ios-share-icon">⎙</span>
          lalu <strong>"Add to Home Screen"</strong>
        </p>
        <button class="banner-close" @click="dismissIos">✕</button>
      </div>
    </Transition>

    <header class="navbar">
      <div class="navbar-inner">
        <RouterLink to="/" class="logo">
          <div class="logo-mark">P</div>
          <span class="logo-name">PDF<span>Studio</span></span>
        </RouterLink>
        <div class="nav-spacer"></div>
        <button class="install-btn" v-if="isMobile && !isInstalled" @click="handleInstall">
          📲 Instal App
        </button>
      </div>
    </header>

    <RouterView v-slot="{ Component }">
      <Transition name="fade" mode="out-in">
        <component :is="Component" :active-cat="activeCat" @set-cat="activeCat = $event" />
      </Transition>
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

const route          = useRoute()
const deferredPrompt = ref(null)
const showIosBanner     = ref(false)
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
  deferredPrompt.value    = null
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
  background: var(--red);
  color: #fff;
  padding: 10px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}
.install-banner p { font-size: 13.5px; font-weight: 500; line-height: 1.5; }

.banner-close {
  background: none;
  border: none;
  color: rgba(255,255,255,.75);
  cursor: pointer;
  font-size: 17px;
  padding: 2px 6px;
  flex-shrink: 0;
}

.ios-banner { background: #1c1c1e; }
.ios-share-icon {
  display: inline-block;
  background: rgba(255,255,255,.2);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 14px;
  margin: 0 2px;
}

.slide-banner-enter-active, .slide-banner-leave-active { transition: all .3s ease; }
.slide-banner-enter-from, .slide-banner-leave-to { opacity: 0; transform: translateY(-100%); }

.navbar {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
}
.navbar-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
  height: 60px;
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
  width: 32px; height: 32px;
  background: var(--red);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 14px; font-weight: 700;
}
.logo-name { font-size: 16px; font-weight: 600; color: var(--text); }
.logo-name span { color: var(--red); }

.nav-spacer { flex: 1; }

.install-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: var(--red);
  border: none;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  font-family: var(--font);
  transition: all .2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}
.install-btn:hover { background: var(--red-dark); transform: translateY(-1px); }
.install-btn:active { transform: translateY(0); }

.footer {
  margin-top: auto;
  border-top: 1px solid var(--border);
  background: var(--surface);
  padding: 20px 24px;
  text-align: center;
}
.footer p { font-size: 13px; color: var(--text-3); }
.footer a { color: var(--red); text-decoration: none; font-weight: 500; }
.footer a:hover { text-decoration: underline; }

.toast {
  position: fixed; bottom: 24px; left: 50%;
  transform: translateX(-50%);
  background: #1f2937; color: #fff;
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