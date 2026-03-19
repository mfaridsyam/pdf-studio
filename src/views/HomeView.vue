<template>
  <div class="home">
    <div class="home-inner">

      <div class="hero">
        <h1>Alat PDF Lengkap,<br /><span class="hero-accent">Gratis &amp; Aman</span></h1>
      </div>

      <template v-for="grp in visibleGroups" :key="grp.id">
        <div class="section-label">{{ grp.label }}</div>
        <div class="tool-grid">
          <ToolCard v-for="tool in grp.tools" :key="tool.id" :tool="tool" />
        </div>
      </template>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import ToolCard from '../components/ToolCard.vue'
import { TOOLS, CATEGORIES } from '../composables/useTools.js'

const props = defineProps({ activeCat: { type: String, default: 'all' } })
const localCat = ref(props.activeCat)
watch(() => props.activeCat, (v) => (localCat.value = v))

const visibleGroups = computed(() => {
  if (localCat.value === 'all') {
    return CATEGORIES.map((c) => ({
      ...c,
      tools: TOOLS.filter((t) => t.cat === c.id),
    }))
  }
  const cat = CATEGORIES.find((c) => c.id === localCat.value)
  return cat ? [{ ...cat, tools: TOOLS.filter((t) => t.cat === cat.id) }] : []
})
</script>

<style scoped>
.home { padding: 40px 0 80px; }
.home-inner { max-width: 1100px; margin: 0 auto; padding: 0 24px; }

.hero { margin-bottom: 36px; }
.hero h1 {
  font-size: clamp(24px, 4vw, 34px);
  font-weight: 700;
  letter-spacing: -.5px;
  line-height: 1.2;
  margin-bottom: 10px;
}
.hero-accent {
  background: linear-gradient(90deg, var(--red-dark), var(--red));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hero p { font-size: 15px; color: var(--text-2); line-height: 1.7; margin-bottom: 16px; }
.hero-badges { display: flex; gap: 8px; flex-wrap: wrap; }
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-2);
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 4px 11px;
  border-radius: 20px;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: 12px;
  margin-top: 28px;
}
.section-label:first-of-type { margin-top: 0; }

.tool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  margin-bottom: 8px;
}

@media (max-width: 640px) {
  .home { padding: 24px 0 60px; }
  .home-inner { padding: 0 16px; }
  .tool-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
}
@media (max-width: 360px) {
  .tool-grid { grid-template-columns: 1fr; }
}
</style>