<template>
  <RouterLink :to="`/tool/${tool.id}`" class="tool-card">
    <div class="tc-icon" :style="{ background: tool.bg }">
      <AppIcon :name="tool.icon" :size="26" :stroke-width="1.75" />
    </div>
    <h3 class="tc-name">{{ tool.name }}</h3>
    <p class="tc-desc">{{ tool.desc }}</p>
  </RouterLink>
</template>

<script setup>
import AppIcon from './AppIcon.vue'
defineProps({ tool: { type: Object, required: true } })
</script>

<style scoped>
.tool-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
  background: #fff;
  border-radius: 18px;
  padding: 22px 20px 20px;
  text-decoration: none;
  color: var(--text);
  box-shadow: 0 1px 2px rgba(0,0,0,.04), 0 4px 14px rgba(0,0,0,.06);
  transition: transform .22s cubic-bezier(.16,1,.3,1), box-shadow .22s cubic-bezier(.16,1,.3,1);
}
.tool-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 28px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.06);
}

.tc-icon {
  width: 58px;
  height: 58px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.tc-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--c-900);
  letter-spacing: -.15px;
  line-height: 1.3;
}

.tc-desc {
  font-size: 12px;
  color: var(--text-2);
  line-height: 1.55;
  flex: 1;
}

@media (max-width: 640px) {
  .tool-card { padding: 16px 14px; gap: 11px; border-radius: 14px; }
  .tc-icon { width: 48px; height: 48px; border-radius: 11px; }
  .tc-icon :deep(svg) { width: 22px; height: 22px; }
  .tc-desc { display: none; }
}
</style>
