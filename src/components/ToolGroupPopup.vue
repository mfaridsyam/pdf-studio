<template>
  <Teleport to="body">
    <Transition name="popup-fade">
      <div v-if="group" class="popup-backdrop" @click.self="$emit('close')" @keydown.esc="$emit('close')">
        <div class="popup-card" role="dialog" :aria-label="group.name">
          <div class="popup-header">
            <div class="popup-title-row">
              <div class="popup-icon">
                <AppIcon :name="group.icon" :size="16" :stroke-width="1.75" />
              </div>
              <h2 class="popup-title">{{ group.name }}</h2>
            </div>
            <button class="popup-close" @click="$emit('close')" aria-label="Tutup">
              <X :size="16" :stroke-width="2" />
            </button>
          </div>

          <div class="popup-list">
            <RouterLink
              v-for="child in group.children"
              :key="child.id"
              :to="`/tool/${child.id}`"
              class="popup-item"
              @click="$emit('close')"
            >
              <div class="pi-icon">
                <AppIcon :name="child.icon" :size="18" :stroke-width="1.75" />
              </div>
              <div class="pi-body">
                <span class="pi-name">{{ child.name }}</span>
                <span class="pi-desc">{{ child.desc }}</span>
              </div>
              <ArrowRight :size="13" class="pi-arrow" />
            </RouterLink>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { X, ArrowRight } from '@lucide/vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({ group: { type: Object, default: null } })
const emit  = defineEmits(['close'])

function onKey(e) { if (e.key === 'Escape') emit('close') }
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.popup-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, .35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.popup-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 20px 60px rgba(0,0,0,.18), 0 4px 16px rgba(0,0,0,.08);
  width: 100%;
  max-width: 400px;
  overflow: hidden;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 14px;
  border-bottom: 1px solid var(--border);
}
.popup-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.popup-icon {
  width: 30px; height: 30px;
  border-radius: var(--radius-sm);
  background: var(--c-100);
  color: var(--c-700);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.popup-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: -.1px;
}
.popup-close {
  width: 28px; height: 28px;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s, color .15s;
}
.popup-close:hover {
  background: var(--c-100);
  color: var(--text);
}

.popup-list {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.popup-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: calc(var(--radius) - 2px);
  text-decoration: none;
  color: var(--text);
  transition: background .15s;
  cursor: pointer;
}
.popup-item:hover {
  background: var(--c-50);
}
.popup-item:hover .pi-arrow { color: var(--c-700); transform: translateX(3px); }

.pi-icon {
  width: 34px; height: 34px;
  border-radius: var(--radius-sm);
  background: var(--c-100);
  color: var(--c-700);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.pi-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pi-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: -.1px;
}
.pi-desc {
  font-size: 11.5px;
  color: var(--text-2);
}
.pi-arrow {
  color: var(--c-300);
  flex-shrink: 0;
  transition: transform .2s, color .2s;
}

/* Transition */
.popup-fade-enter-active, .popup-fade-leave-active {
  transition: opacity .2s ease;
}
.popup-fade-enter-from, .popup-fade-leave-to { opacity: 0; }
.popup-fade-enter-active .popup-card,
.popup-fade-leave-active .popup-card {
  transition: transform .2s cubic-bezier(.16,1,.3,1), opacity .2s ease;
}
.popup-fade-enter-from .popup-card { transform: scale(.96) translateY(8px); opacity: 0; }
.popup-fade-leave-to .popup-card   { transform: scale(.96) translateY(8px); opacity: 0; }
</style>
