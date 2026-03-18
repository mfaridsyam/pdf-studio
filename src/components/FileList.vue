<template>
  <div class="file-list" v-if="files.length">
    <div class="sort-hint" v-if="sortable">
      <span>↕</span> Seret untuk mengubah urutan
    </div>

    <TransitionGroup name="list" tag="div" class="list-inner">
      <div
        v-for="(f, i) in files"
        :key="f.name + i"
        class="file-item"
        :class="{ dragging: dragIdx === i }"
        :draggable="sortable"
        @dragstart="onDragStart(i)"
        @dragover.prevent="onDragOver(i)"
        @dragend="dragIdx = -1"
      >
        <span class="drag-handle" v-if="sortable">⋮⋮</span>

        <img
          v-if="previews && previews[i]"
          :src="previews[i]"
          class="file-thumb"
          alt=""
        />
        <span v-else class="file-icon">{{ isPdf(f) ? '📄' : '🖼️' }}</span>

        <div class="file-meta">
          <div class="file-name">{{ f.name }}</div>
          <div class="file-size">{{ fmtSize(f.size) }}</div>
        </div>

        <slot name="badge" :file="f" :index="i" />

        <button class="file-rm" @click="$emit('remove', i)" title="Hapus">✕</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  files:    { type: Array,   required: true },
  previews: { type: Array,   default: () => [] },
  sortable: { type: Boolean, default: false },
})

const emit = defineEmits(['remove', 'reorder'])
const dragIdx = ref(-1)

function isPdf(f) {
  return f.type === 'application/pdf' || f.name?.endsWith('.pdf')
}
function fmtSize(b) {
  if (b < 1024)      return b + ' B'
  if (b < 1048576)   return (b / 1024).toFixed(1) + ' KB'
  return (b / 1048576).toFixed(2) + ' MB'
}
function onDragStart(i) { dragIdx.value = i }
function onDragOver(i) {
  if (dragIdx.value < 0 || dragIdx.value === i) return
  emit('reorder', { from: dragIdx.value, to: i })
  dragIdx.value = i
}
</script>

<style scoped>
.file-list  { margin-top: 16px; }
.sort-hint  {
  font-size: 12px;
  color: var(--text-3);
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 2px 8px;
}
.list-inner { display: flex; flex-direction: column; gap: 8px; }

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 11px 14px;
  transition: border-color .15s ease, box-shadow .15s ease, opacity .15s ease;
}
.file-item:hover       { border-color: var(--border-2); }
.file-item.dragging    { opacity: .5; box-shadow: var(--shadow); }

.drag-handle {
  color: var(--text-3);
  cursor: grab;
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
  user-select: none;
}
.drag-handle:active { cursor: grabbing; }

.file-icon  { font-size: 20px; flex-shrink: 0; }
.file-thumb {
  width: 36px; height: 36px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid var(--border);
}
.file-meta  { flex: 1; min-width: 0; }
.file-name  {
  font-size: 13.5px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.file-size  { font-size: 12px; color: var(--text-3); margin-top: 1px; }

.file-rm {
  background: none;
  border: none;
  color: var(--text-3);
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 5px;
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
  transition: color .15s, background .15s;
}
.file-rm:hover { color: var(--red); background: var(--red-light); }
</style>
