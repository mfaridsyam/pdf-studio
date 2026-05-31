<template>
  <Transition name="prog-fade">
    <div class="progress-wrap" v-if="show">
      <div class="prog-header">
        <span class="prog-label">{{ label }}</span>
        <span class="prog-pct">{{ value }}%</span>
      </div>

      <div class="prog-track">
        <div
          class="prog-fill"
          :style="{ width: value + '%' }"
          :class="{ complete: value >= 100 }"
        />
        <div class="prog-shimmer" v-if="value > 0 && value < 100" />
      </div>

      <div class="prog-steps">
        <div
          v-for="step in steps"
          :key="step.pct"
          class="prog-step"
          :class="{
            done:   value >= step.pct,
            active: value >= step.pct - 15 && value < step.pct + 5,
          }"
        >
          <div class="step-dot">
            <Check v-if="value >= step.pct" :size="10" :stroke-width="3" />
          </div>
          <span class="step-name">{{ step.name }}</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'
import { Check } from '@lucide/vue'

const props = defineProps({
  value:  { type: Number, default: 0 },
  label:  { type: String, default: '' },
  steps:  {
    type: Array,
    default: () => [
      { pct: 25,  name: 'Membaca'    },
      { pct: 60,  name: 'Memproses' },
      { pct: 90,  name: 'Menyimpan' },
      { pct: 100, name: 'Selesai'   },
    ],
  },
})

const show = computed(() => props.value > 0)
</script>

<style scoped>
.progress-wrap {
  margin-top: 24px;
  padding: 20px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  animation: fadeUp .25s ease;
}

.prog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.prog-label { font-size: 13px; color: var(--text-2); font-weight: 500; }
.prog-pct   { font-size: 13px; font-weight: 700; color: var(--text); font-variant-numeric: tabular-nums; }

.prog-track {
  position: relative;
  height: 5px;
  background: var(--c-200);
  border-radius: 99px;
  overflow: hidden;
  margin-bottom: 20px;
}
.prog-fill {
  height: 100%;
  border-radius: 99px;
  background: var(--c-900);
  transition: width .4s cubic-bezier(.16, 1, .3, 1);
  position: relative;
  z-index: 1;
}
.prog-fill.complete { background: var(--green); }

.prog-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255,255,255,.4) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  z-index: 2;
}
@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}

.prog-steps {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.prog-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  flex: 1;
  transition: all .3s ease;
}
.step-dot {
  width: 20px; height: 20px;
  border-radius: 50%;
  border: 1.5px solid var(--c-300);
  background: var(--surface);
  display: flex; align-items: center; justify-content: center;
  color: var(--surface);
  transition: all .3s cubic-bezier(.16,1,.3,1);
}
.prog-step.done .step-dot {
  background: var(--c-950);
  border-color: var(--c-950);
  color: var(--c-white);
  transform: scale(1.05);
}
.prog-step.active .step-dot {
  border-color: var(--c-700);
  background: var(--c-100);
  animation: pulse-dot .8s ease infinite;
}
@keyframes pulse-dot {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.15); }
}

.step-name {
  font-size: 11px;
  color: var(--text-3);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 70px;
  transition: color .3s;
}
.prog-step.done .step-name   { color: var(--c-700); font-weight: 500; }
.prog-step.active .step-name { color: var(--text);  font-weight: 500; }

.prog-fade-enter-active, .prog-fade-leave-active { transition: all .3s ease; }
.prog-fade-enter-from, .prog-fade-leave-to       { opacity: 0; transform: translateY(6px); }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (max-width: 480px) {
  .step-name { display: none; }
  .prog-step { flex: none; }
  .prog-steps { justify-content: space-around; }
}
</style>
