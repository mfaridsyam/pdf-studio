<template>
  <div class="home">
    <div class="home-inner">

      <div class="hero">
        <h1>Alat PDF Lengkap,<br /><span class="hero-accent">Gratis &amp; Aman.</span></h1>
        <p class="hero-sub">Proses langsung di browser — file kamu tidak pernah dikirim ke server.</p>

        <div class="hero-search">
          <Search :size="16" class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari alat..."
            class="search-input"
            autocomplete="off"
            spellcheck="false"
          />
        </div>

        <div class="cat-tabs">
          <button
            class="cat-tab"
            :class="{ active: localCat === 'all' }"
            @click="setCat('all')"
          >Semua</button>
          <button
            v-for="cat in CATEGORIES"
            :key="cat.id"
            class="cat-tab"
            :class="{ active: localCat === cat.id }"
            @click="setCat(cat.id)"
          >{{ cat.label }}</button>
        </div>
      </div>

      <template v-if="visibleGroups.length">
        <template v-for="grp in visibleGroups" :key="grp.id">
          <div class="section-label">{{ grp.label }}</div>
          <div class="tool-grid">
            <ToolCard
              v-for="tool in grp.tools"
              :key="tool.id"
              :tool="tool"
              @open-group="openGroup"
            />
          </div>
        </template>
      </template>
      <div v-else class="empty-state">
        <Search :size="28" class="empty-icon" />
        <p>Tidak ada alat yang cocok dengan "<strong>{{ searchQuery }}</strong>"</p>
      </div>

    </div>
  </div>

  <ToolGroupPopup :group="activeGroup" @close="closeGroup" />
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Search } from '@lucide/vue'
import ToolCard       from '../components/ToolCard.vue'
import ToolGroupPopup from '../components/ToolGroupPopup.vue'
import { TOOLS, CATEGORIES } from '../composables/useTools.js'

const props = defineProps({ activeCat: { type: String, default: 'all' } })
const emit  = defineEmits(['set-cat'])

const localCat    = ref(props.activeCat)
const searchQuery = ref('')
const activeGroup = ref(null)

watch(() => props.activeCat, (v) => (localCat.value = v))

function setCat(id) {
  localCat.value = id
  emit('set-cat', id)
}
function openGroup(group) { activeGroup.value = group }
function closeGroup()     { activeGroup.value = null  }

const visibleGroups = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()

  const activeCatTools = localCat.value === 'all'
    ? TOOLS
    : TOOLS.filter((t) => t.cat === localCat.value)

  if (!q) {
    // Normal browsing: show group cards as-is
    return CATEGORIES
      .filter((c) => localCat.value === 'all' || c.id === localCat.value)
      .map((c) => ({ ...c, tools: activeCatTools.filter((t) => t.cat === c.id) }))
      .filter((g) => g.tools.length)
  }

  // Search: expand group children into individual items
  const expanded = activeCatTools.flatMap((t) => (t.isGroup ? t.children : [t]))
  const matching = expanded.filter(
    (t) => t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q),
  )
  if (!matching.length) return []

  const catIds = [...new Set(matching.map((t) => t.cat))]
  return catIds.map((catId) => {
    const cat = CATEGORIES.find((c) => c.id === catId)
    return { ...cat, tools: matching.filter((t) => t.cat === catId) }
  })
})
</script>

<style scoped>
.home { padding: 48px 0 80px; }
.home-inner { max-width: 1100px; margin: 0 auto; padding: 0 24px; }

/* Hero */
.hero { margin-bottom: 40px; }
.hero h1 {
  font-size: clamp(26px, 4.5vw, 42px);
  font-weight: 700;
  letter-spacing: -.8px;
  line-height: 1.15;
  margin-bottom: 12px;
  color: var(--text);
}
.hero-accent { color: var(--c-500); }
.hero-sub {
  font-size: 15px;
  color: var(--text-2);
  line-height: 1.6;
  margin-bottom: 24px;
  max-width: 480px;
}

/* Search */
.hero-search {
  position: relative;
  max-width: 420px;
  margin-bottom: 16px;
}
.search-icon {
  position: absolute;
  left: 13px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-3);
  pointer-events: none;
}
.search-input {
  width: 100%;
  padding: 10px 14px 10px 38px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  font-family: var(--font);
  font-size: 14px;
  color: var(--text);
  outline: none;
  transition: border-color .2s, box-shadow .2s;
}
.search-input::placeholder { color: var(--text-3); }
.search-input:focus {
  border-color: var(--c-400);
  box-shadow: 0 0 0 3px rgba(0,0,0,.06);
}

/* Category tabs */
.cat-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.cat-tab {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  border: 1.5px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  cursor: pointer;
  font-family: var(--font);
  transition: all .15s ease;
  white-space: nowrap;
}
.cat-tab:hover { border-color: var(--c-300); color: var(--text); }
.cat-tab.active { background: var(--c-950); border-color: var(--c-950); color: var(--c-white); }

/* Section label */
.section-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: 12px;
  margin-top: 32px;
}

/* Tool grid */
.tool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
  margin-bottom: 4px;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 24px;
  color: var(--text-3);
  text-align: center;
}
.empty-icon { color: var(--c-300); }
.empty-state p { font-size: 14px; color: var(--text-2); }
.empty-state strong { color: var(--text); }

@media (max-width: 640px) {
  .home { padding: 28px 0 60px; }
  .home-inner { padding: 0 16px; }
  .tool-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .hero h1 { letter-spacing: -.5px; }
}
@media (max-width: 360px) {
  .tool-grid { grid-template-columns: 1fr; }
}
</style>
