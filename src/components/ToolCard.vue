<template>
  <RouterLink :to="`/tool/${tool.id}`" class="tool-card">
    <div class="tc-icon" :style="{ background: tool.bg }">
      {{ tool.icon }}
    </div>
    <div class="tc-body">
      <h3>{{ tool.name }}</h3>
      <p>{{ tool.desc }}</p>
    </div>
    <span class="tc-arrow">→</span>
  </RouterLink>
</template>

<script setup>
defineProps({ tool: { type: Object, required: true } })
</script>

<style scoped>
.tool-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px;
  text-decoration: none;
  color: var(--text);
  transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease;
  position: relative;
  overflow: hidden;
}
.tool-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(232,38,26,.03), transparent);
  opacity: 0;
  transition: opacity .2s;
}
.tool-card:hover {
  border-color: v-bind('tool.color');
  box-shadow: var(--shadow);
  transform: translateY(-2px);
}
.tool-card:hover::after { opacity: 1; }

.tc-icon {
  width: 42px; height: 42px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.tc-body { flex: 1; min-width: 0; }
.tc-body h3 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 3px;
  color: var(--text);
}
.tc-body p {
  font-size: 12.5px;
  color: var(--text-2);
  line-height: 1.5;
}
.tc-arrow {
  color: var(--text-3);
  font-size: 14px;
  flex-shrink: 0;
  margin-top: 2px;
  transition: transform .2s, color .2s;
}
.tool-card:hover .tc-arrow {
  transform: translateX(3px);
  color: v-bind('tool.color');
}

@media (max-width: 640px) {
  .tc-body p { display: none; }
  .tc-arrow  { display: none; }
}
</style>
