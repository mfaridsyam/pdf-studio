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
.dz-icon  { color: var(--c-300); margin-bottom: 14px; display: flex; justify-content: center; }
.dropzone:hover .dz-icon,
.dropzone.over .dz-icon { color: var(--c-500); }
.dz-title { font-size: 15px; font-weight: 700; margin-bottom: 6px; color: var(--text); }
.dz-sub   { font-size: 13px; color: var(--text-2); margin-bottom: 20px; line-height: 1.5; max-width: 320px; margin-left: auto; margin-right: auto; }
.dz-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  border-radius: 50px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  background: var(--tool-clr, var(--c-950));
  color: #fff;
  cursor: pointer;
  font-family: var(--font);
  pointer-events: none;
  transition: opacity .2s ease, transform .2s ease;
  box-shadow: 0 2px 10px rgba(0,0,0,.15);
}
.dropzone:hover .dz-btn { opacity: .88; transform: translateY(-1px); }
</style>
