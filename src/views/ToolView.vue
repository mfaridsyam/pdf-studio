<template>
  <div class="tool-view">
    <div class="tv-inner">

      <div v-if="!tool" class="not-found">
        <p>Alat tidak ditemukan.</p>
        <RouterLink to="/">← Kembali</RouterLink>
      </div>

      <template v-else>
        <div class="tv-header">
          <RouterLink to="/" class="back-btn">← Semua Alat</RouterLink>
          <span class="sep">/</span>
          <div class="tv-icon" :style="{ background: tool.bg }">{{ tool.icon }}</div>
          <h1>{{ tool.name }}</h1>
        </div>

        <div class="workspace-card">

          <template v-if="tool.id === 'merge'">

            <div v-if="files.length" class="merge-grid-wrap"
              @dragover.prevent="mgGridOver = true"
              @dragleave.self="mgGridOver = false"
              @drop.prevent="onMergeGridDrop"
              :class="{ 'mg-grid-over': mgGridOver }"
            >
              <div class="merge-hint">
                <span>↔</span> Seret kartu untuk mengubah urutan — urutan kiri = halaman pertama
              </div>

              <div class="merge-grid">
                <div
                  v-for="(f, i) in files" :key="f.name + i"
                  class="mg-card"
                  :class="{ 'mg-dragging': mgFrom === i }"
                  draggable="true"
                  @dragstart="mgFrom = i"
                  @dragover.prevent="mgOver(i)"
                  @dragend="mgFrom = -1"
                >
                  <div class="mg-num">{{ i + 1 }}</div>

                  <button class="mg-rm" @click="removeMergeFile(i)" title="Hapus">✕</button>

                  <div class="mg-thumb-wrap">
                    <img v-if="mergePreviews[i]" :src="mergePreviews[i]" class="mg-thumb" alt="" />
                    <div v-else class="mg-thumb-placeholder">
                      <span class="mg-thumb-icon">📄</span>
                    </div>
                  </div>

                  <div class="mg-info">
                    <div class="mg-name">{{ f.name }}</div>
                    <div class="mg-meta" v-if="mergePageCounts[i]">
                      {{ fmtSize(f.size) }} · {{ mergePageCounts[i] }} hal.
                    </div>
                    <div class="mg-meta" v-else>{{ fmtSize(f.size) }}</div>
                  </div>
                </div>

                <div class="mg-card mg-add"
                  @click="$refs.mergeAddInput.click()"
                  @dragover.prevent="mgAddOver = true"
                  @dragleave="mgAddOver = false"
                  @drop.prevent="onMergeAddDrop"
                  :class="{ 'mg-add-over': mgAddOver }"
                >
                  <input ref="mergeAddInput" type="file" accept=".pdf" multiple @change="onMergeAdd" style="display:none" />
                  <div class="mg-add-icon">＋</div>
                  <div class="mg-add-label">Tambah File</div>
                </div>
              </div>

              <div class="action-bar">
                <span class="file-count">{{ files.length }} file dipilih</span>
                <button class="btn btn-red" :disabled="files.length < 2 || processing" @click="run">
                  <span v-if="processing" class="spinner" /><span v-else>⊕</span>
                  {{ processing ? 'Menggabungkan…' : 'Gabung PDF' }}
                </button>
              </div>
            </div>

            <DropZone v-else icon="📂" file-type="pdf" accept=".pdf" :multiple="true"
              title="Pilih atau seret file PDF"
              subtitle="Pilih beberapa file — seret kartu untuk mengubah urutan"
              @files="addMergeFiles" />

          </template>

          <template v-if="tool.id === 'split'">
            <DropZone icon="✂️" file-type="pdf" accept=".pdf"
              title="Pilih satu file PDF"
              subtitle="Setiap halaman akan menjadi file terpisah"
              @files="setSingle" />
            <FileList :files="files" @remove="removeFile" />
            <div class="opts-block" v-if="files.length">
              <span class="opts-label">Mode Pisah</span>
              <div class="opts-row">
                <button class="chip" :class="{ sel: splitMode === 'all' }"   @click="splitMode = 'all'">Semua Halaman</button>
                <button class="chip" :class="{ sel: splitMode === 'range' }" @click="splitMode = 'range'">Rentang Halaman</button>
              </div>
              <div class="field-row" v-if="splitMode === 'range'">
                <div class="field"><label>Dari Halaman</label><input type="number" v-model.number="pageFrom" min="1" /></div>
                <div class="field"><label>Sampai Halaman</label><input type="number" v-model.number="pageTo" min="1" /></div>
              </div>
            </div>
            <div class="action-bar">
              <span></span>
              <button class="btn btn-red" :disabled="!files.length || processing" @click="run">
                <span v-if="processing" class="spinner" /><span v-else>✂️</span>
                {{ processing ? 'Memisahkan…' : 'Pisah PDF' }}
              </button>
            </div>
          </template>

          <template v-if="tool.id === 'compress'">

            <div class="compress-result" v-if="compressResult && results.length">
              <div class="cr-circle-wrap">
                <svg class="cr-circle" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" stroke-width="8"/>
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#E8261A" stroke-width="8"
                    stroke-linecap="round"
                    :stroke-dasharray="326.7"
                    :stroke-dashoffset="326.7 * (1 - Math.min(compressResult.savedPct, 100) / 100)"
                    transform="rotate(-90 60 60)"
                    style="transition: stroke-dashoffset 1.2s cubic-bezier(.16,1,.3,1)"
                  />
                </svg>
                <div class="cr-circle-text">
                  <span class="cr-pct">{{ compressResult.savedPct }}%</span>
                  <span class="cr-label">tersimpan</span>
                </div>
              </div>
              <div class="cr-info">
                <h3>PDF sudah dikompres!</h3>
                <p class="cr-sizes">
                  <span>{{ fmtSize(compressResult.originalSize) }}</span>
                  <span class="cr-arrow">→</span>
                  <span class="cr-new">{{ fmtSize(compressResult.compressedSize) }}</span>
                </p>
                <p class="cr-saved">Menghemat {{ fmtSize(compressResult.saved) }}</p>
                <div class="cr-actions">
                  <button class="btn btn-red" @click="dl(results[0])">↓ Unduh PDF</button>
                  <button class="btn btn-outline" @click="compressResult = null; results.value = []; files = []">Kompres File Lain</button>
                </div>
              </div>
            </div>

            <template v-else>
              <div class="compress-layout" v-if="files.length">
                <div class="compress-left">
                  <div class="compress-file-card">
                    <div class="compress-file-icon">📄</div>
                    <div class="compress-file-name">{{ files[0].name }}</div>
                    <div class="compress-file-size">{{ fmtSize(files[0].size) }}</div>
                    <button class="compress-change" @click="files = []">Ganti File</button>
                  </div>
                </div>

                <div class="compress-right">
                  <div class="compress-opts-title">Tingkat Kompresi</div>
                  <div class="compress-list">

                    <button class="cl-item" :class="{ sel: compressLevel === 'low' }" @click="compressLevel = 'low'">
                      <div class="cl-text">
                        <div class="cl-name-row">
                          <span class="cl-name">AMAN (Lossless)</span>
                          <span class="cl-badge badge-green">Link Utuh</span>
                        </div>
                        <span class="cl-desc">Hapus metadata · Link, teks, anotasi 100% terjaga</span>
                        <span class="cl-est">Estimasi: ~5–30% lebih kecil</span>
                      </div>
                      <span class="cl-check" v-if="compressLevel === 'low'">✓</span>
                    </button>

                    <button class="cl-item" :class="{ sel: compressLevel === 'recommended' }" @click="compressLevel = 'recommended'">
                      <div class="cl-text">
                        <div class="cl-name-row">
                          <span class="cl-name">SEDANG (Lossy)</span>
                          <span class="cl-badge badge-yellow">Link Hilang</span>
                        </div>
                        <span class="cl-desc">Render ulang halaman ke JPEG · Cocok untuk PDF scan/foto</span>
                        <span class="cl-est">Estimasi: ~50–80% lebih kecil</span>
                      </div>
                      <span class="cl-check" v-if="compressLevel === 'recommended'">✓</span>
                    </button>

                    <button class="cl-item" :class="{ sel: compressLevel === 'extreme' }" @click="compressLevel = 'extreme'">
                      <div class="cl-text">
                        <div class="cl-name-row">
                          <span class="cl-name">EKSTREM (Lossy)</span>
                          <span class="cl-badge badge-red">Link Hilang</span>
                        </div>
                        <span class="cl-desc">Kualitas gambar sangat rendah · Ukuran sekecil mungkin</span>
                        <span class="cl-est">Estimasi: ~70–90% lebih kecil</span>
                      </div>
                      <span class="cl-check" v-if="compressLevel === 'extreme'">✓</span>
                    </button>
                  </div>

                  <Transition name="fade">
                    <div class="note note-yellow" v-if="compressLevel !== 'low'" style="margin-top:12px">
                      <span>⚠️</span>
                      <span>
                        Level ini merender ulang setiap halaman menjadi gambar JPEG.
                        <strong>Link, teks yang bisa diseleksi, dan anotasi akan hilang.</strong>
                        Gunakan level <strong>Aman</strong> jika PDF kamu berisi link atau teks penting.
                      </span>
                    </div>
                  </Transition>

                  <ProgressBar :value="progress" :label="progLabel"
                    :steps="[{pct:10,name:'Membaca'},{pct:50,name:'Optimasi'},{pct:90,name:'Menyimpan'},{pct:100,name:'Selesai'}]" />
                  <div class="error-box" v-if="errMsg">⚠️ {{ errMsg }}</div>

                  <button class="btn btn-red cl-btn" :disabled="processing" @click="run">
                    <span v-if="processing" class="spinner" /><span v-else>🗜️</span>
                    {{ processing ? 'Mengkompres…' : 'Kompres PDF' }}
                  </button>
                </div>
              </div>

              <DropZone v-else icon="🗜️" file-type="pdf" accept=".pdf"
                title="Pilih file PDF untuk dikompres"
                subtitle="Tidak ada batas ukuran — semua diproses di browser kamu"
                @files="setSingle" />
            </template>
          </template>

          <template v-if="tool.id === 'rotate'">
            <DropZone icon="🔃" file-type="pdf" accept=".pdf" title="Pilih file PDF" subtitle="Putar semua halaman ke orientasi yang tepat" @files="setSingle" />
            <FileList :files="files" @remove="removeFile" />
            <div class="opts-block" v-if="files.length">
              <span class="opts-label">Arah Rotasi</span>
              <div class="opts-row">
                <button class="chip" :class="{ sel: rotDeg === 90  }" @click="rotDeg = 90">↻ 90° Kanan</button>
                <button class="chip" :class="{ sel: rotDeg === 180 }" @click="rotDeg = 180">↕ 180°</button>
                <button class="chip" :class="{ sel: rotDeg === 270 }" @click="rotDeg = 270">↺ 90° Kiri</button>
              </div>
            </div>
            <div class="action-bar">
              <span></span>
              <button class="btn btn-red" :disabled="!files.length || processing" @click="run">
                <span v-if="processing" class="spinner" /><span v-else>🔃</span>
                {{ processing ? 'Memutar…' : 'Putar PDF' }}
              </button>
            </div>
          </template>

          <template v-if="tool.id === 'reorder'">
            <DropZone icon="🗂️" file-type="pdf" accept=".pdf" title="Pilih file PDF" subtitle="Atur ulang, hapus, atau susun kembali halaman" @files="loadForReorder" />
            <div v-if="files.length && pageOrder.length" style="margin-top:16px">
              <span class="opts-label">Urutan Halaman — seret untuk mengatur</span>
              <div class="sort-hint" style="margin-bottom:8px">Halaman yang dihapus tidak akan masuk ke output</div>
              <div class="page-order-list">
                <TransitionGroup name="list" tag="div" class="po-inner">
                  <div v-for="(pg, i) in pageOrder" :key="pg"
                    class="po-item" :class="{ dragging: poFrom === i }"
                    draggable="true"
                    @dragstart="poFrom = i" @dragover.prevent="poOver(i)" @dragend="poFrom = -1">
                    <span class="drag-handle">⋮⋮</span>
                    <span class="po-num">{{ pg + 1 }}</span>
                    <span class="po-label">Halaman {{ pg + 1 }}</span>
                    <button class="file-rm" @click="pageOrder.splice(i, 1)">✕</button>
                  </div>
                </TransitionGroup>
              </div>
            </div>
            <div class="action-bar">
              <span></span>
              <button class="btn btn-red" :disabled="!files.length || processing" @click="run">
                <span v-if="processing" class="spinner" /><span v-else>🗂️</span>
                {{ processing ? 'Menyimpan…' : 'Simpan Urutan' }}
              </button>
            </div>
          </template>

          <template v-if="tool.id === 'pagenumber'">
            <DropZone icon="🔢" file-type="pdf" accept=".pdf" title="Pilih file PDF" subtitle="Tambahkan nomor halaman otomatis" @files="setSingle" />
            <FileList :files="files" @remove="removeFile" />
            <div class="opts-block" v-if="files.length">
              <span class="opts-label">Posisi Nomor</span>
              <div class="opts-row">
                <button class="chip" :class="{ sel: pageNumPos === 'bottom-center' }" @click="pageNumPos = 'bottom-center'">Bawah Tengah</button>
                <button class="chip" :class="{ sel: pageNumPos === 'bottom-right' }"  @click="pageNumPos = 'bottom-right'">Bawah Kanan</button>
                <button class="chip" :class="{ sel: pageNumPos === 'top-center' }"    @click="pageNumPos = 'top-center'">Atas Tengah</button>
              </div>
            </div>
            <div class="action-bar">
              <span></span>
              <button class="btn btn-red" :disabled="!files.length || processing" @click="run">
                <span v-if="processing" class="spinner" /><span v-else>🔢</span>
                {{ processing ? 'Memproses…' : 'Tambah Nomor' }}
              </button>
            </div>
          </template>

          <template v-if="tool.id === 'img2pdf'">
            <DropZone icon="🖼️" file-type="img" accept="image/*" :multiple="true"
              title="Pilih gambar (JPG, PNG, WebP)"
              subtitle="Semua gambar akan disusun dalam satu PDF"
              @files="addFiles($event, 'img')" />
            <FileList :files="files" :previews="previews" :sortable="true" @remove="removeFile" @reorder="reorderFiles" />
            <div class="opts-block" v-if="files.length">
              <span class="opts-label">Ukuran Halaman PDF</span>
              <div class="opts-row">
                <button class="chip" :class="{ sel: imgPageSz === 'A4' }"     @click="imgPageSz = 'A4'">A4</button>
                <button class="chip" :class="{ sel: imgPageSz === 'Letter' }" @click="imgPageSz = 'Letter'">Letter</button>
                <button class="chip" :class="{ sel: imgPageSz === 'fit' }"    @click="imgPageSz = 'fit'">Sesuai Gambar</button>
              </div>
            </div>
            <div class="action-bar">
              <span class="file-count">{{ files.length }} gambar</span>
              <button class="btn btn-red" :disabled="!files.length || processing" @click="run">
                <span v-if="processing" class="spinner" /><span v-else>⊕</span>
                {{ processing ? 'Membuat…' : 'Buat PDF' }}
              </button>
            </div>
          </template>

          <template v-if="tool.id === 'pdf2img'">
            <DropZone icon="📸" file-type="pdf" accept=".pdf" title="Pilih file PDF" subtitle="Setiap halaman dikonversi menjadi gambar PNG" @files="setSingle" />
            <FileList :files="files" @remove="removeFile" />
            <div class="opts-block" v-if="files.length">
              <span class="opts-label">Kualitas / Resolusi</span>
              <div class="opts-row">
                <button class="chip" :class="{ sel: imgScale === 1 }" @click="imgScale = 1">72 DPI</button>
                <button class="chip" :class="{ sel: imgScale === 2 }" @click="imgScale = 2">144 DPI (Rekomendasi)</button>
                <button class="chip" :class="{ sel: imgScale === 3 }" @click="imgScale = 3">216 DPI (Tinggi)</button>
              </div>
            </div>
            <div class="action-bar">
              <span></span>
              <button class="btn btn-red" :disabled="!files.length || processing" @click="run">
                <span v-if="processing" class="spinner" /><span v-else>📸</span>
                {{ processing ? 'Mengkonversi…' : 'Konversi ke PNG' }}
              </button>
            </div>
          </template>

          <template v-if="tool.id !== 'compress' || !compressResult">
            <ProgressBar :value="progress" :label="progLabel" :steps="progressSteps" />
            <Transition name="fade">
              <div class="error-box" v-if="errMsg && tool.id !== 'compress'">⚠️ {{ errMsg }}</div>
            </Transition>
            <ResultBox :results="results" v-if="tool.id !== 'compress'" />
          </template>

        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue'
import { useRoute } from 'vue-router'
import DropZone    from '../components/DropZone.vue'
import FileList    from '../components/FileList.vue'
import ProgressBar from '../components/ProgressBar.vue'
import ResultBox   from '../components/ResultBox.vue'

import { useTool }         from '../composables/useTools.js'
import { usePdfProcessor } from '../composables/usePdfProcessor.js'

const route     = useRoute()
const showToast = inject('showToast', () => {})

const tool = computed(() => useTool(route.params.id))

const {
  processing, progress, progLabel, results, errMsg, reset, fmtSize,
  doMerge, doSplit, doCompress, doRotate, doReorder,
  doImg2PDF, doPDF2Img, doPageNumber, doProtect, doUnlock,
} = usePdfProcessor()

const files    = ref([])
const previews = ref([])

const mergePreviews   = ref([])
const mergePageCounts = ref([])
const mgFrom          = ref(-1)

async function generatePdfThumbnail(file) {
  try {
    if (!window._pdfjsReady) {
      await new Promise((res, rej) => {
        const s = document.createElement('script')
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
        s.onload = res; s.onerror = rej; document.head.appendChild(s)
      })
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      window._pdfjsReady = true
    }
    const ab  = await new Promise((res, rej) => {
      const r = new FileReader(); r.onload = e => res(e.target.result); r.onerror = rej; r.readAsArrayBuffer(file)
    })
    const pdf  = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise
    const pg   = await pdf.getPage(1)
    const vp   = pg.getViewport({ scale: 1 })
    const sc   = Math.min(200 / vp.width, 280 / vp.height)
    const vp2  = pg.getViewport({ scale: sc })
    const cv   = document.createElement('canvas')
    cv.width   = Math.round(vp2.width); cv.height = Math.round(vp2.height)
    const ctx  = cv.getContext('2d')
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height)
    await pg.render({ canvasContext: ctx, viewport: vp2 }).promise
    return { thumb: cv.toDataURL('image/jpeg', 0.8), pages: pdf.numPages }
  } catch { return { thumb: null, pages: null } }
}

async function addMergeFiles(newFs) {
  errMsg.value = ''; results.value = []
  const start = files.value.length
  files.value = [...files.value, ...newFs]
  for (let i = 0; i < newFs.length; i++) {
    const idx = start + i
    const { thumb, pages } = await generatePdfThumbnail(newFs[i])
    mergePreviews.value[idx]   = thumb
    mergePageCounts.value[idx] = pages
    mergePreviews.value  = [...mergePreviews.value]
    mergePageCounts.value = [...mergePageCounts.value]
  }
}

const mgAddOver  = ref(false)
const mgGridOver = ref(false)

function onMergeGridDrop(e) {
  mgGridOver.value = false
  if (mgFrom.value >= 0) return
  const fs = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'))
  if (fs.length) addMergeFiles(fs)
}

function onMergeAdd(e) {
  const fs = Array.from(e.target.files).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'))
  if (fs.length) addMergeFiles(fs)
  e.target.value = ''
}

function onMergeAddDrop(e) {
  mgAddOver.value = false
  const fs = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'))
  if (fs.length) addMergeFiles(fs)
}

function removeMergeFile(i) {
  files.value        = files.value.filter((_, idx) => idx !== i)
  mergePreviews.value   = mergePreviews.value.filter((_, idx) => idx !== i)
  mergePageCounts.value = mergePageCounts.value.filter((_, idx) => idx !== i)
}

function mgOver(i) {
  if (mgFrom.value < 0 || mgFrom.value === i) return
  const fi = [...files.value],  [fm] = fi.splice(mgFrom.value, 1); fi.splice(i, 0, fm)
  const pi = [...mergePreviews.value],  [pm] = pi.splice(mgFrom.value, 1); pi.splice(i, 0, pm)
  const ci = [...mergePageCounts.value],[cm] = ci.splice(mgFrom.value, 1); ci.splice(i, 0, cm)
  files.value        = fi
  mergePreviews.value   = pi
  mergePageCounts.value = ci
  mgFrom.value = i
}

function addFiles(newFs, type) {
  errMsg.value = ''; results.value = []
  if (type === 'img') {
    const start = files.value.length
    files.value = [...files.value, ...newFs]
    newFs.forEach((f, i) => {
      const r = new FileReader()
      r.onload = (e) => { previews.value[start + i] = e.target.result }
      r.readAsDataURL(f)
    })
  } else {
    files.value = [...files.value, ...newFs]
  }
}
function setSingle(newFs) {
  files.value    = [newFs[0]]
  previews.value = []
  errMsg.value   = ''
  results.value  = []
  compressResult.value = null
}
function removeFile(i) { files.value.splice(i, 1); previews.value.splice(i, 1) }
function reorderFiles({ from, to }) {
  const a = [...files.value], [m] = a.splice(from, 1); a.splice(to, 0, m); files.value = a
  const p = [...previews.value], [mp] = p.splice(from, 1); p.splice(to, 0, mp); previews.value = p
}

const mergeSize   = ref('fit')
const splitMode   = ref('all')
const pageFrom    = ref(1)
const pageTo      = ref(1)
const rotDeg      = ref(90)
const imgPageSz   = ref('A4')
const imgScale    = ref(2)
const pageNumPos  = ref('bottom-center')
const pdfPass     = ref('')
const compressLevel  = ref('low')
const compressResult = ref(null)

const pageOrder = ref([])
const poFrom    = ref(-1)
function poOver(i) {
  if (poFrom.value < 0 || poFrom.value === i) return
  const a = [...pageOrder.value], [m] = a.splice(poFrom.value, 1); a.splice(i, 0, m)
  pageOrder.value = a; poFrom.value = i
}
async function loadForReorder(newFs) {
  files.value = [newFs[0]]
  try {
    if (!window._pdfjsReady) {
      await new Promise((res, rej) => {
        const s = document.createElement('script')
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
        s.onload = res; s.onerror = rej; document.head.appendChild(s)
      })
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      window._pdfjsReady = true
    }
    const ab  = await new Promise((res, rej) => {
      const r = new FileReader(); r.onload = e => res(e.target.result); r.onerror = rej; r.readAsArrayBuffer(newFs[0])
    })
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise
    pageOrder.value = Array.from({ length: pdf.numPages }, (_, i) => i)
  } catch (e) { errMsg.value = 'Gagal membaca halaman: ' + e.message }
}

const progressSteps = computed(() => {
  const map = {
    merge:      [{ pct:10,name:'Memuat'  }, { pct:50,name:'Menggabung'}, { pct:90,name:'Menyimpan'}, { pct:100,name:'Selesai'}],
    split:      [{ pct:10,name:'Membaca' }, { pct:60,name:'Memisah'   }, { pct:90,name:'Menyimpan'}, { pct:100,name:'Selesai'}],
    compress:   [{ pct:10,name:'Membaca' }, { pct:55,name:'Optimasi'  }, { pct:90,name:'Menyimpan'}, { pct:100,name:'Selesai'}],
    rotate:     [{ pct:10,name:'Membaca' }, { pct:70,name:'Memutar'   }, { pct:92,name:'Menyimpan'}, { pct:100,name:'Selesai'}],
    reorder:    [{ pct:30,name:'Membaca' }, { pct:65,name:'Mengatur'  }, { pct:90,name:'Menyimpan'}, { pct:100,name:'Selesai'}],
    pagenumber: [{ pct:15,name:'Membaca' }, { pct:70,name:'Menulis'   }, { pct:92,name:'Menyimpan'}, { pct:100,name:'Selesai'}],
    img2pdf:    [{ pct:10,name:'Memuat'  }, { pct:60,name:'Menyusun'  }, { pct:90,name:'Menyimpan'}, { pct:100,name:'Selesai'}],
    pdf2img:    [{ pct:5, name:'Memuat'  }, { pct:50,name:'Merender'  }, { pct:95,name:'Ekspor'   }, { pct:100,name:'Selesai'}],
    protect:    [{ pct:25,name:'Membaca' }, { pct:65,name:'Enkripsi'  }, { pct:90,name:'Menyimpan'}, { pct:100,name:'Selesai'}],
    unlock:     [{ pct:30,name:'Membaca' }, { pct:65,name:'Membuka'   }, { pct:90,name:'Menyimpan'}, { pct:100,name:'Selesai'}],
  }
  return map[tool.value?.id] || map.merge
})

async function run() {
  reset()
  const id = tool.value?.id
  if (id === 'merge')      await doMerge(files.value, mergeSize.value)
  if (id === 'split')      await doSplit(files.value[0], splitMode.value, pageFrom.value, pageTo.value)
  if (id === 'compress') {
    compressResult.value = null
    const r = await doCompress(files.value[0], compressLevel.value)
    if (r && typeof r.originalSize === 'number') compressResult.value = r
  }
  if (id === 'rotate')     await doRotate(files.value[0], rotDeg.value)
  if (id === 'reorder')    await doReorder(files.value[0], pageOrder.value)
  if (id === 'pagenumber') await doPageNumber(files.value[0], pageNumPos.value)
  if (id === 'img2pdf')    await doImg2PDF(files.value, imgPageSz.value)
  if (id === 'pdf2img')    await doPDF2Img(files.value[0], imgScale.value)
  if (id === 'protect')    await doProtect(files.value[0], pdfPass.value)
  if (id === 'unlock')     await doUnlock(files.value[0], pdfPass.value)
}

function dl(r) { const a = document.createElement('a'); a.href = r.url; a.download = r.name; a.click() }

watch(() => route.params.id, () => {
  files.value = []; previews.value = []; pageOrder.value = []
  pdfPass.value = ''; compressResult.value = null
  compressLevel.value = 'low'
  mergePreviews.value = []; mergePageCounts.value = []; mgFrom.value = -1
  reset()
})
</script>

<style scoped>
.tool-view  { padding: 40px 0 80px; }
.tv-inner   { max-width: 780px; margin: 0 auto; padding: 0 24px; }

.tv-header  { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; flex-wrap: wrap; }
.back-btn   { font-size: 13.5px; font-weight: 500; color: var(--text-2); text-decoration: none; padding: 5px 0; transition: color .2s; }
.back-btn:hover { color: var(--red); }
.sep        { color: var(--border-2); }
.tv-icon    { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 17px; }
h1          { font-size: 20px; font-weight: 700; letter-spacing: -.3px; }

.workspace-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 28px; position: relative; }

.opts-block { margin-top: 20px; }
.opts-label { display: block; font-size: 11.5px; font-weight: 600; letter-spacing: .5px; text-transform: uppercase; color: var(--text-3); margin-bottom: 8px; }
.opts-row   { display: flex; gap: 8px; flex-wrap: wrap; }
.chip       { padding: 7px 14px; border: 1.5px solid var(--border); border-radius: 7px; font-size: 13px; font-weight: 500; color: var(--text-2); cursor: pointer; background: var(--surface); font-family: var(--font); transition: all .2s ease; }
.chip:hover { border-color: var(--border-2); color: var(--text); }
.chip.sel   { border-color: var(--red); color: var(--red); background: var(--red-light); }

.note { display: flex; gap: 8px; align-items: flex-start; padding: 10px 14px; border-radius: var(--radius-sm); font-size: 12.5px; margin-top: 12px; line-height: 1.5; }
.note-yellow { background: var(--yellow-bg); border: 1px solid var(--yellow-border); color: var(--yellow-text); }
.note-blue   { background: var(--blue-bg);   border: 1px solid var(--blue-border);   color: var(--blue-text); }

.field       { display: flex; flex-direction: column; gap: 5px; margin-top: 12px; }
.field label { font-size: 12px; font-weight: 500; color: var(--text-2); }
.field input, .input-full { padding: 9px 12px; border: 1.5px solid var(--border); border-radius: 7px; font-family: var(--font); font-size: 14px; color: var(--text); background: var(--surface); outline: none; transition: border-color .2s; }
.field input { width: 110px; }
.input-full  { width: 100%; max-width: 320px; }
.field input:focus, .input-full:focus { border-color: var(--red); }
.field-row   { display: flex; gap: 14px; flex-wrap: wrap; }

.action-bar  { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border); }
.file-count  { font-size: 13px; color: var(--text-2); }

.btn         { display: inline-flex; align-items: center; gap: 7px; padding: 10px 22px; border-radius: 8px; font-family: var(--font); font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: all .2s ease; line-height: 1; }
.btn-red     { background: var(--red); color: #fff; box-shadow: 0 1px 3px rgba(232,38,26,.25); }
.btn-red:hover    { background: var(--red-dark); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(232,38,26,.3); }
.btn-red:disabled { opacity: .5; cursor: not-allowed; transform: none; box-shadow: none; }
.btn-outline { background: var(--surface); color: var(--text); border: 1.5px solid var(--border); }
.btn-outline:hover { border-color: var(--border-2); background: var(--bg); }

.spinner     { width: 15px; height: 15px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }

.error-box   { margin-top: 16px; padding: 12px 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); font-size: 13px; color: #dc2626; display: flex; gap: 8px; align-items: center; }

.po-inner  { display: flex; flex-direction: column; gap: 7px; }
.po-item   { display: flex; align-items: center; gap: 10px; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 14px; transition: opacity .15s, box-shadow .15s; }
.po-item.dragging { opacity: .45; box-shadow: var(--shadow); }
.po-num    { width: 28px; height: 28px; background: var(--red-light); color: var(--red); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; flex-shrink: 0; }
.po-label  { flex: 1; font-size: 13.5px; font-weight: 500; }
.sort-hint { font-size: 12px; color: var(--text-3); }
.drag-handle { color: var(--text-3); cursor: grab; font-size: 14px; user-select: none; }
.drag-handle:active { cursor: grabbing; }
.file-rm   { background: none; border: none; color: var(--text-3); cursor: pointer; padding: 3px 6px; border-radius: 4px; font-size: 13px; transition: color .15s, background .15s; }
.file-rm:hover { color: var(--red); background: var(--red-light); }

.not-found { text-align: center; padding: 40px; color: var(--text-2); }

.compress-layout { display: grid; grid-template-columns: 1fr 1.6fr; gap: 0; min-height: 420px; }

.compress-left { background: var(--bg); border-right: 1px solid var(--border); display: flex; align-items: center; justify-content: center; padding: 32px 24px; border-radius: var(--radius) 0 0 var(--radius); }
.compress-file-card { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; }
.compress-file-icon { font-size: 52px; }
.compress-file-name { font-size: 13px; font-weight: 600; color: var(--text); max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.compress-file-size { font-size: 12px; color: var(--text-3); }
.compress-change    { margin-top: 8px; padding: 5px 12px; border: 1px solid var(--border); border-radius: 6px; font-size: 12px; font-weight: 500; color: var(--text-2); background: var(--surface); cursor: pointer; font-family: var(--font); transition: all .2s; }
.compress-change:hover { border-color: var(--red); color: var(--red); }

.compress-right { padding: 28px 24px; display: flex; flex-direction: column; gap: 0; }
.compress-opts-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 16px; text-align: center; }

.compress-list { display: flex; flex-direction: column; border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }
.cl-item       { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 14px 16px; background: var(--surface); border: none; border-bottom: 1px solid var(--border); cursor: pointer; font-family: var(--font); text-align: left; transition: background .15s; }
.cl-item:last-child { border-bottom: none; }
.cl-item:hover { background: var(--bg); }
.cl-item.sel   { background: #fef9f9; }
.cl-text       { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.cl-name-row   { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.cl-name       { font-size: 12.5px; font-weight: 700; color: var(--red); letter-spacing: .3px; }
.cl-desc       { font-size: 12px; color: var(--text-2); }
.cl-est        { font-size: 11.5px; color: var(--text-3); font-style: italic; }
.cl-check      { width: 22px; height: 22px; background: var(--green); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; margin-top: 2px; animation: pop .3s cubic-bezier(.16,1,.3,1); }

.cl-badge      { font-size: 10.5px; font-weight: 600; padding: 2px 7px; border-radius: 20px; white-space: nowrap; }
.badge-green   { background: #dcfce7; color: #15803d; }
.badge-yellow  { background: #fef9c3; color: #a16207; }
.badge-red     { background: #fee2e2; color: #dc2626; }

.cl-btn { width: 100%; justify-content: center; margin-top: 14px; padding: 13px; font-size: 15px; }

.compress-result { display: flex; align-items: center; gap: 40px; padding: 32px; animation: fadeUp .5s cubic-bezier(.16,1,.3,1); }
.cr-circle-wrap  { position: relative; flex-shrink: 0; }
.cr-circle       { width: 140px; height: 140px; }
.cr-circle-text  { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
.cr-pct          { font-size: 28px; font-weight: 800; color: var(--red); line-height: 1; font-variant-numeric: tabular-nums; }
.cr-label        { font-size: 11px; color: var(--text-3); font-weight: 500; }
.cr-info h3      { font-size: 20px; font-weight: 700; margin-bottom: 10px; }
.cr-sizes        { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 500; color: var(--text); margin-bottom: 4px; }
.cr-arrow        { color: var(--text-3); }
.cr-new          { color: var(--green); font-weight: 700; }
.cr-saved        { font-size: 13px; color: var(--text-2); margin-bottom: 20px; }
.cr-actions      { display: flex; gap: 10px; flex-wrap: wrap; }

.fade-enter-active, .fade-leave-active { transition: all .25s ease; }
.fade-enter-from, .fade-leave-to       { opacity: 0; transform: translateY(4px); }
.list-enter-active, .list-leave-active { transition: all .2s ease; }
.list-enter-from, .list-leave-to       { opacity: 0; transform: translateX(-8px); }

@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pop    { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }

@media (max-width: 640px) {
  .tool-view { padding: 20px 0 60px; }
  .tv-inner  { padding: 0 16px; }
  .workspace-card { padding: 20px 16px; }
  .action-bar { flex-direction: column; align-items: stretch; }
  .btn { width: 100%; justify-content: center; }
  .compress-layout { grid-template-columns: 1fr; }
  .compress-left { border-right: none; border-bottom: 1px solid var(--border); padding: 20px; border-radius: var(--radius) var(--radius) 0 0; }
  .compress-right { padding: 20px 16px; }
  .compress-result { flex-direction: column; gap: 24px; padding: 24px 16px; text-align: center; }
  .cr-sizes  { justify-content: center; }
  .cr-actions { justify-content: center; }
}

.merge-mode-list {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-top: 4px;
}
.merge-opt {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background: var(--surface);
  border: none;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  font-family: var(--font);
  text-align: left;
  transition: background .15s;
}
.merge-opt:last-child { border-bottom: none; }
.merge-opt:hover      { background: var(--bg); }
.merge-opt.sel        { background: #fafffe; }
.merge-opt-left       { display: flex; flex-direction: column; gap: 5px; flex: 1; }
.merge-opt-name-row   { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.merge-opt-name       { font-size: 13px; font-weight: 700; color: var(--text); }
.merge-opt-desc       { font-size: 12px; color: var(--text-2); line-height: 1.5; }
.merge-badge          { font-size: 10.5px; font-weight: 600; padding: 2px 7px; border-radius: 20px; white-space: nowrap; }
.badge-green          { background: #dcfce7; color: #15803d; }
.badge-yellow         { background: #fef9c3; color: #a16207; }
.badge-red            { background: #fee2e2; color: #dc2626; }
.merge-check          { width: 22px; height: 22px; background: var(--green); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; margin-top: 2px; animation: pop .3s cubic-bezier(.16,1,.3,1); }


.merge-grid-wrap { display: flex; flex-direction: column; gap: 16px; }

.merge-hint {
  font-size: 12px; color: var(--text-3);
  display: flex; align-items: center; gap: 6px;
  padding: 0 2px;
}

.merge-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.mg-card {
  position: relative;
  width: 160px;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  cursor: grab;
  transition: border-color .2s, box-shadow .2s, transform .15s;
  user-select: none;
  display: flex;
  flex-direction: column;
}
.mg-card:hover       { border-color: var(--border-2); box-shadow: var(--shadow); }
.mg-card.mg-dragging { opacity: .4; transform: scale(.97); }
.mg-card:active      { cursor: grabbing; }

.mg-num {
  position: absolute; top: 8px; left: 8px;
  width: 22px; height: 22px;
  background: var(--red); color: #fff;
  border-radius: 50%;
  font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  z-index: 2; pointer-events: none;
}

.mg-rm {
  position: absolute; top: 6px; right: 6px;
  width: 22px; height: 22px;
  background: rgba(0,0,0,.45); color: #fff;
  border: none; border-radius: 50%;
  font-size: 11px; line-height: 1;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  z-index: 2; transition: background .15s;
}
.mg-rm:hover { background: var(--red); }

.mg-thumb-wrap {
  width: 100%; height: 180px;
  background: var(--bg);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
  border-bottom: 1px solid var(--border);
}
.mg-thumb {
  width: 100%; height: 100%;
  object-fit: contain;
  display: block;
}
.mg-thumb-placeholder {
  display: flex; align-items: center; justify-content: center;
  width: 100%; height: 100%;
}
.mg-thumb-icon { font-size: 40px; opacity: .4; }

.mg-info {
  padding: 10px 10px 12px;
  display: flex; flex-direction: column; gap: 3px;
}
.mg-name {
  font-size: 12px; font-weight: 600; color: var(--text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.mg-meta { font-size: 11px; color: var(--text-3); }

.mg-add {
  cursor: pointer;
  border-style: dashed;
  align-items: center; justify-content: center;
  min-height: 220px;
  gap: 8px;
  transition: border-color .2s, background .2s;
}
.mg-add:hover { border-color: var(--red); background: var(--red-light); }
.mg-add-icon  { font-size: 28px; color: var(--text-3); line-height: 1; }
.mg-add-label { font-size: 12px; font-weight: 500; color: var(--text-3); }

@media (max-width: 640px) {
  .merge-grid { gap: 10px; }
  .mg-card    { width: calc(50% - 5px); }
  .mg-thumb-wrap { height: 140px; }
}
@media (max-width: 360px) {
  .mg-card { width: 100%; }
}


.mg-add-over,
.mg-add:hover {
  border-color: var(--red) !important;
  background: var(--red-light) !important;
}
.mg-add-over .mg-add-icon,
.mg-add-over .mg-add-label {
  color: var(--red);
}
.mg-grid-over {
  outline: 2px dashed var(--red);
  outline-offset: 4px;
  border-radius: var(--radius);
}

</style>