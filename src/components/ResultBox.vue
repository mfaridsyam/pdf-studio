<template>
  <Transition name="result-anim">
    <div class="result-box" v-if="results.length">
      <div class="result-header">
        <span class="result-check">
          <Check :size="13" :stroke-width="2.5" />
        </span>
        <div>
          <strong>
            {{ results.length === 1 ? 'File berhasil dibuat!' : `${results.length} file berhasil dibuat!` }}
          </strong>
          <p>Klik tombol Unduh untuk menyimpan ke perangkat Anda</p>
        </div>
      </div>

      <div class="result-files">
        <div v-for="(r, i) in results" :key="i" class="result-file">
          <span class="rf-icon">
            <File v-if="!r.isImage" :size="15" :stroke-width="1.5" />
            <Image v-else           :size="15" :stroke-width="1.5" />
          </span>
          <span class="rf-name">{{ r.name }}</span>
          <span class="rf-size" v-if="r.sizeStr">{{ r.sizeStr }}</span>
          <button class="btn-download" @click="download(r)">
            <Download :size="13" />
            Unduh
          </button>
        </div>
      </div>

      <button class="btn-all" v-if="results.length > 1" @click="downloadAll">
        <Download :size="13" />
        Unduh Semua ({{ results.length }} file)
      </button>
    </div>
  </Transition>
</template>

<script setup>
import { Check, File, Image, Download } from '@lucide/vue'

const props = defineProps({
  results: { type: Array, default: () => [] },
})

function download(r) {
  const a = document.createElement('a')
  a.href = r.url
  a.download = r.name
  a.click()
}
function downloadAll() {
  props.results.forEach((r, i) => {
    setTimeout(() => download(r), i * 300)
  })
}
</script>

<style scoped>
.result-box {
  margin-top: 24px;
  background: var(--c-50);
  border: 1px solid var(--c-200);
  border-radius: var(--radius);
  padding: 20px;
  overflow: hidden;
}

.result-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}
.result-check {
  width: 28px; height: 28px;
  background: var(--c-950);
  color: var(--c-white);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  animation: pop .4s cubic-bezier(.16,1,.3,1);
}
@keyframes pop {
  from { transform: scale(0); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}
.result-header strong { font-size: 14px; font-weight: 600; display: block; }
.result-header p      { font-size: 12.5px; color: var(--text-2); margin-top: 2px; }

.result-files {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.result-file {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  animation: slideIn .3s ease both;
}
.result-file:nth-child(1) { animation-delay: .05s; }
.result-file:nth-child(2) { animation-delay: .10s; }
.result-file:nth-child(3) { animation-delay: .15s; }
.result-file:nth-child(4) { animation-delay: .20s; }
@keyframes slideIn {
  from { opacity: 0; transform: translateX(-8px); }
  to   { opacity: 1; transform: translateX(0); }
}
.rf-icon  { color: var(--c-500); display: flex; flex-shrink: 0; }
.rf-name  { flex: 1; font-size: 13.5px; font-weight: 500; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rf-size  { font-size: 12px; color: var(--text-2); flex-shrink: 0; }

.btn-download {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  background: var(--c-950);
  color: var(--c-white);
  border: none;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: var(--font);
  flex-shrink: 0;
  transition: background .2s, transform .15s;
}
.btn-download:hover { background: var(--c-800); transform: translateY(-1px); }
.btn-download:active { transform: translateY(0); }

.btn-all {
  width: 100%;
  margin-top: 10px;
  padding: 10px;
  background: none;
  border: 1.5px dashed var(--c-300);
  border-radius: var(--radius-sm);
  color: var(--text-2);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: var(--font);
  display: flex; align-items: center; justify-content: center; gap: 6px;
  transition: background .2s, border-color .2s, color .2s;
}
.btn-all:hover { background: var(--c-100); border-color: var(--c-400); color: var(--text); }

.result-anim-enter-active { transition: all .4s cubic-bezier(.16,1,.3,1); }
.result-anim-enter-from   { opacity: 0; transform: translateY(12px); }

@media (max-width: 480px) {
  .rf-size { display: none; }
  .btn-download { padding: 7px 10px; }
}
</style>
