<template>
  <div
    class="dropzone"
    :class="{ over: isDragOver }"
    @dragover.prevent="isDragOver = true"
    @dragleave="isDragOver = false"
    @drop.prevent="onDrop"
  >
    <input
      type="file"
      :accept="accept"
      :multiple="multiple"
      @change="onInput"
      ref="inputRef"
    />
    <div class="dz-icon">
      <AppIcon :name="icon" :size="32" :stroke-width="1.5" />
    </div>
    <div class="dz-title">{{ title }}</div>
    <div class="dz-sub" v-if="subtitle">{{ subtitle }}</div>
    <button class="dz-btn" @click.prevent="inputRef?.click()">
      <Plus :size="14" />
      Pilih {{ multiple ? 'File' : 'File' }}
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Plus } from '@lucide/vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  accept:   { type: String,  default: '.pdf'        },
  multiple: { type: Boolean, default: false          },
  icon:     { type: String,  default: 'UploadCloud'  },
  title:    { type: String,  default: 'Pilih atau seret file' },
  subtitle: { type: String,  default: ''             },
  fileType: { type: String,  default: 'pdf'          },
})

const emit       = defineEmits(['files'])
const isDragOver = ref(false)
const inputRef   = ref(null)

function validate(files) {
  return files.filter((f) => {
    if (props.fileType === 'pdf')   return f.type === 'application/pdf' || f.name.endsWith('.pdf')
    if (props.fileType === 'img')   return f.type.startsWith('image/')
    if (props.fileType === 'docx')  return /\.docx?$/i.test(f.name) || f.type.includes('wordprocessingml') || f.type === 'application/msword'
    if (props.fileType === 'excel') return /\.(xlsx?|csv|ods)$/i.test(f.name) || f.type.includes('spreadsheetml') || f.type === 'text/csv'
    return true
  })
}

function onInput(e) {
  const ok = validate(Array.from(e.target.files))
  if (ok.length) emit('files', ok)
  e.target.value = ''
}

function onDrop(e) {
  isDragOver.value = false
  const ok = validate(Array.from(e.dataTransfer.files))
  if (ok.length) emit('files', ok)
}
</script>

<style scoped>
.dropzone {
  position: relative;
  border: 1.5px dashed var(--border);
  border-radius: var(--radius);
  padding: 48px 32px;
  text-align: center;
  background: var(--bg);
  transition: border-color .2s ease, background .2s ease;
  cursor: pointer;
}
.dropzone:hover,
.dropzone.over {
  border-color: var(--c-400);
  background: var(--c-100);
}
.dropzone input[type='file'] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
}
.dz-icon  { color: var(--c-400); margin-bottom: 12px; display: flex; justify-content: center; }
.dropzone:hover .dz-icon,
.dropzone.over .dz-icon { color: var(--c-700); }
.dz-title { font-size: 14.5px; font-weight: 600; margin-bottom: 4px; color: var(--text); }
.dz-sub   { font-size: 13px; color: var(--text-2); margin-bottom: 18px; }
.dz-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  border: 1.5px solid var(--border);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  font-family: var(--font);
  pointer-events: none;
  transition: all .2s ease;
}
</style>
