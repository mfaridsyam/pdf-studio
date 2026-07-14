<template>
  <div class="home">

    <!-- ── Hero ── -->
    <section class="hero-section">
      <div class="hero-inner">
        <h1>
          Semua Alat PDF dalam<br />
          <span class="hero-accent">Satu Tempat, Gratis.</span>
        </h1>
        <p class="hero-sub">
          Proses langsung di browser — file kamu tidak pernah dikirim ke server.
        </p>

        <div class="hero-search">
          <Search :size="17" class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari alat PDF…"
            class="search-input"
            autocomplete="off"
            spellcheck="false"
          />
        </div>

        <div class="cat-tabs">
          <button class="cat-tab" :class="{ active: localCat === 'all' }" @click="setCat('all')">
            Semua
          </button>
          <button
            v-for="cat in CATEGORIES"
            :key="cat.id"
            class="cat-tab"
            :class="{ active: localCat === cat.id }"
            @click="setCat(cat.id)"
          >
            {{ cat.label }}
          </button>
        </div>
      </div>
    </section>

    <!-- ── Tool Grid ── -->
    <section class="grid-section">
      <div class="grid-inner">
        <div v-if="visibleTools.length" class="tool-grid">
          <ToolCard v-for="tool in visibleTools" :key="tool.id" :tool="tool" />
        </div>
        <div v-else class="empty-state">
          <Search :size="32" class="empty-icon" />
          <p>Tidak ada alat yang cocok dengan "<strong>{{ searchQuery }}</strong>"</p>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Search } from '@lucide/vue'
import ToolCard  from '../components/ToolCard.vue'
import { TOOLS, CATEGORIES } from '../composables/useTools.js'

const props = defineProps({ activeCat: { type: String, default: 'all' } })
const emit  = defineEmits(['set-cat'])

const localCat    = ref(props.activeCat)
const searchQuery = ref('')

watch(() => props.activeCat, (v) => (localCat.value = v))

function setCat(id) { localCat.value = id; emit('set-cat', id) }

const visibleTools = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  const base = localCat.value === 'all'
    ? TOOLS
    : TOOLS.filter((t) => t.cat === localCat.value)
  if (!q) return base
  return base.filter(
    (t) => t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q),
  )
})
</script>

<style scoped>
.home { min-height: 100vh; }

/* ── Hero ──────────────────────────────────────────────────── */
.hero-section {
  background: linear-gradient(160deg, #fff 0%, #fff5f5 45%, #f5f0ff 100%);
  padding: 60px 24px 44px;
  border-bottom: 1px solid rgba(0,0,0,.06);
}
.hero-inner {
  max-width: 860px;
  margin: 0 auto;
  text-align: center;
}
.hero-inner h1 {
  font-size: clamp(28px, 5vw, 48px);
  font-weight: 800;
  letter-spacing: -.8px;
  line-height: 1.12;
  margin-bottom: 14px;
  color: var(--c-950);
}
.hero-accent {
  background: linear-gradient(125deg, #E02B20 0%, #FF6C2F 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hero-sub {
  font-size: 15px;
  color: var(--text-2);
  margin-bottom: 30px;
  max-width: 460px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
}

/* Search */
.hero-search {
  position: relative;
  max-width: 500px;
  margin: 0 auto 24px;
}
.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-3);
  pointer-events: none;
}
.search-input {
  width: 100%;
  padding: 14px 20px 14px 46px;
  border: 1.5px solid var(--c-200);
  border-radius: 50px;
  background: #fff;
  font-family: var(--font);
  font-size: 14.5px;
  color: var(--text);
  outline: none;
  box-shadow: 0 2px 10px rgba(0,0,0,.07);
  transition: border-color .2s, box-shadow .2s;
}
.search-input::placeholder { color: var(--text-3); }
.search-input:focus {
  border-color: var(--c-400);
  box-shadow: 0 0 0 4px rgba(0,0,0,.06), 0 2px 10px rgba(0,0,0,.07);
}

/* Category tabs */
.cat-tabs {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
  justify-content: center;
}
.cat-tab {
  padding: 8px 18px;
  border-radius: 50px;
  font-size: 13px;
  font-weight: 500;
  border: 1.5px solid var(--c-200);
  background: #fff;
  color: var(--text-2);
  cursor: pointer;
  font-family: var(--font);
  transition: all .15s ease;
  white-space: nowrap;
}
.cat-tab:hover { border-color: var(--c-300); color: var(--text); }
.cat-tab.active {
  background: #E02B20;
  border-color: #E02B20;
  color: #fff;
  box-shadow: 0 2px 8px rgba(224,43,32,.3);
}

/* ── Grid ──────────────────────────────────────────────────── */
.grid-section { padding: 40px 24px 80px; }
.grid-inner { max-width: 1200px; margin: 0 auto; }

.tool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
  gap: 14px;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 80px 24px;
  color: var(--text-3);
  text-align: center;
}
.empty-icon { color: var(--c-300); }
.empty-state p { font-size: 14px; color: var(--text-2); }
.empty-state strong { color: var(--text); }

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 768px) {
  .hero-section { padding: 44px 20px 36px; }
  .tool-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
}
@media (max-width: 480px) {
  .hero-section { padding: 32px 16px 28px; }
  .grid-section { padding: 24px 16px 60px; }
  .tool-grid { grid-template-columns: repeat(3, 1fr); gap: 8px; }
}
@media (max-width: 360px) {
  .tool-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
