<template>
  <!-- Regular tool → navigate to route -->
  <RouterLink v-if="!tool.isGroup" :to="`/tool/${tool.id}`" class="tool-card">
    <div class="tc-icon">
      <AppIcon :name="tool.icon" :size="19" :stroke-width="1.75" />
    </div>
    <div class="tc-body">
      <h3>{{ tool.name }}</h3>
      <p>{{ tool.desc }}</p>
    </div>
    <ArrowRight :size="14" class="tc-arrow" />
  </RouterLink>

  <!-- Group card → show popup -->
  <div v-else class="tool-card tool-card--group" @click="$emit('open-group', tool)">
    <div class="tc-icon">
      <AppIcon :name="tool.icon" :size="19" :stroke-width="1.75" />
    </div>
    <div class="tc-body">
      <h3>
        {{ tool.name }}
        <span class="tc-badge">{{ tool.children.length }}</span>
      </h3>
      <p>{{ tool.desc }}</p>
    </div>
    <ChevronDown :size="14" class="tc-arrow" />
  </div>
</template>

<script setup>
import { ArrowRight, ChevronDown } from '@lucide/vue'
import AppIcon from './AppIcon.vue'

defineProps({ tool: { type: Object, required: true } })
defineEmits(['open-group'])
</script>

<style scoped>
.tool-card {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  text-decoration: none;
  color: var(--text);
  transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease;
}
.tool-card--group {
  cursor: pointer;
  user-select: none;
}
.tool-card:hover {
  border-color: var(--c-300);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.tc-icon {
  width: 36px; height: 36px;
  border-radius: var(--radius-sm);
  display: flex; align-items: center; justify-content: center;
  background: var(--c-100);
  color: var(--c-700);
  flex-shrink: 0;
}
.tc-body { flex: 1; min-width: 0; }
.tc-body h3 {
  font-size: 13.5px;
  font-weight: 600;
  margin-bottom: 3px;
  color: var(--text);
  letter-spacing: -.1px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.tc-body p {
  font-size: 12px;
  color: var(--text-2);
  line-height: 1.5;
}
.tc-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: var(--c-200);
  color: var(--c-600);
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}
.tc-arrow {
  color: var(--c-300);
  flex-shrink: 0;
  margin-top: 3px;
  transition: transform .2s, color .2s;
}
.tool-card:hover .tc-arrow {
  transform: translateX(3px);
  color: var(--c-700);
}
.tool-card--group:hover .tc-arrow {
  transform: translateY(3px);
  color: var(--c-700);
}

@media (max-width: 640px) {
  .tc-body p  { display: none; }
  .tc-arrow   { display: none; }
}
</style>
