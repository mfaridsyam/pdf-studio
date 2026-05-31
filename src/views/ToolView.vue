<template>
  <div class="tool-view">
    <div class="tv-inner">

      <div v-if="!tool" class="not-found">
        <p>Alat tidak ditemukan.</p>
        <RouterLink to="/">
          <ChevronLeft :size="14" style="vertical-align:middle" /> Kembali
        </RouterLink>
      </div>

      <template v-else>
        <div class="tv-header">
          <RouterLink to="/" class="back-btn">
            <ChevronLeft :size="15" />
            Semua Alat
          </RouterLink>
          <span class="sep">/</span>
          <div class="tv-icon">
            <AppIcon :name="tool.icon" :size="16" :stroke-width="1.75" />
          </div>
          <h1>{{ tool.name }}</h1>
        </div>

        <div class="workspace-card">

          <!-- MERGE -->
          <template v-if="tool.id === 'merge'">
            <div v-if="files.length" class="merge-grid-wrap"
              @dragover.prevent="mgGridOver = true"
              @dragleave.self="mgGridOver = false"
              @drop.prevent="onMergeGridDrop"
              :class="{ 'mg-grid-over': mgGridOver }"
            >
              <div class="merge-hint">
                <GripVertical :size="13" />
                Seret kartu untuk mengubah urutan
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

                  <button class="mg-rm" @click="removeMergeFile(i)" title="Hapus">
                    <X :size="10" :stroke-width="2.5" />
                  </button>

                  <div class="mg-thumb-wrap">
                    <img v-if="mergePreviews[i]" :src="mergePreviews[i]" class="mg-thumb" alt="" />
                    <div v-else class="mg-thumb-placeholder">
                      <File :size="36" :stroke-width="1" class="mg-thumb-icon" />
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
                  <Plus :size="28" class="mg-add-icon" />
                  <div class="mg-add-label">Tambah File</div>
                </div>
              </div>

              <div class="action-bar">
                <span class="file-count">{{ files.length }} file dipilih</span>
                <button class="btn btn-primary" :disabled="files.length < 2 || processing" @click="run">
                  <span v-if="processing" class="spinner" />
                  <GitMerge v-else :size="15" />
                  {{ processing ? 'Menggabungkan…' : 'Gabung PDF' }}
                </button>
              </div>
            </div>

            <DropZone v-else icon="FolderOpen" file-type="pdf" accept=".pdf" :multiple="true"
              title="Pilih atau seret file PDF"
              subtitle="Pilih beberapa file — seret kartu untuk mengubah urutan"
              @files="addMergeFiles" />
          </template>

          <!-- SPLIT -->
          <template v-if="tool.id === 'split'">
            <DropZone icon="UploadCloud" file-type="pdf" accept=".pdf"
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
              <button class="btn btn-primary" :disabled="!files.length || processing" @click="run">
                <span v-if="processing" class="spinner" />
                <Scissors v-else :size="15" />
                {{ processing ? 'Memisahkan…' : 'Pisah PDF' }}
              </button>
            </div>
          </template>

          <!-- COMPRESS -->
          <template v-if="tool.id === 'compress'">

            <div class="compress-result" v-if="compressResult && results.length">
              <div class="cr-circle-wrap">
                <svg class="cr-circle" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="var(--c-200)" stroke-width="8"/>
                  <circle cx="60" cy="60" r="52" fill="none" stroke="var(--c-950)" stroke-width="8"
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
                  <ArrowRight :size="14" class="cr-arrow" />
                  <span class="cr-new">{{ fmtSize(compressResult.compressedSize) }}</span>
                </p>
                <p class="cr-saved">Menghemat {{ fmtSize(compressResult.saved) }}</p>
                <div class="cr-actions">
                  <button class="btn btn-primary" @click="dl(results[0])">
                    <Download :size="14" /> Unduh PDF
                  </button>
                  <button class="btn btn-outline" @click="compressResult = null; results.value = []; files = []">
                    Kompres File Lain
                  </button>
                </div>
              </div>
            </div>

            <template v-else>
              <div class="compress-layout" v-if="files.length">
                <div class="compress-left">
                  <div class="compress-file-card">
                    <div class="compress-file-icon">
                      <File :size="48" :stroke-width="1" />
                    </div>
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
                      <span class="cl-check" v-if="compressLevel === 'low'">
                        <Check :size="11" :stroke-width="2.5" />
                      </span>
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
                      <span class="cl-check" v-if="compressLevel === 'recommended'">
                        <Check :size="11" :stroke-width="2.5" />
                      </span>
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
                      <span class="cl-check" v-if="compressLevel === 'extreme'">
                        <Check :size="11" :stroke-width="2.5" />
                      </span>
                    </button>
                  </div>

                  <Transition name="fade">
                    <div class="note note-yellow" v-if="compressLevel !== 'low'" style="margin-top:12px">
                      <AlertTriangle :size="14" style="flex-shrink:0;margin-top:1px" />
                      <span>
                        Level ini merender ulang setiap halaman menjadi gambar JPEG.
                        <strong>Link, teks yang bisa diseleksi, dan anotasi akan hilang.</strong>
                        Gunakan level <strong>Aman</strong> jika PDF kamu berisi link atau teks penting.
                      </span>
                    </div>
                  </Transition>

                  <ProgressBar :value="progress" :label="progLabel"
                    :steps="[{pct:10,name:'Membaca'},{pct:50,name:'Optimasi'},{pct:90,name:'Menyimpan'},{pct:100,name:'Selesai'}]" />
                  <div class="error-box" v-if="errMsg">
                    <AlertTriangle :size="15" /> {{ errMsg }}
                  </div>

                  <button class="btn btn-primary cl-btn" :disabled="processing" @click="run">
                    <span v-if="processing" class="spinner" />
                    <Minimize2 v-else :size="15" />
                    {{ processing ? 'Mengkompres…' : 'Kompres PDF' }}
                  </button>
                </div>
              </div>

              <DropZone v-else icon="UploadCloud" file-type="pdf" accept=".pdf"
                title="Pilih file PDF untuk dikompres"
                subtitle="Tidak ada batas ukuran — semua diproses di browser kamu"
                @files="setSingle" />
            </template>
          </template>

          <!-- ROTATE -->
          <template v-if="tool.id === 'rotate'">
            <DropZone icon="UploadCloud" file-type="pdf" accept=".pdf" title="Pilih file PDF" subtitle="Putar semua halaman ke orientasi yang tepat" @files="setSingle" />
            <FileList :files="files" @remove="removeFile" />
            <div class="opts-block" v-if="files.length">
              <span class="opts-label">Arah Rotasi</span>
              <div class="opts-row">
                <button class="chip" :class="{ sel: rotDeg === 90  }" @click="rotDeg = 90">90° Kanan</button>
                <button class="chip" :class="{ sel: rotDeg === 180 }" @click="rotDeg = 180">180°</button>
                <button class="chip" :class="{ sel: rotDeg === 270 }" @click="rotDeg = 270">90° Kiri</button>
              </div>
            </div>
            <div class="action-bar">
              <span></span>
              <button class="btn btn-primary" :disabled="!files.length || processing" @click="run">
                <span v-if="processing" class="spinner" />
                <RotateCw v-else :size="15" />
                {{ processing ? 'Memutar…' : 'Putar PDF' }}
              </button>
            </div>
          </template>

          <!-- REORDER -->
          <template v-if="tool.id === 'reorder'">
            <DropZone icon="UploadCloud" file-type="pdf" accept=".pdf" title="Pilih file PDF" subtitle="Atur ulang, hapus, atau susun kembali halaman" @files="loadForReorder" />
            <div v-if="files.length && pageOrder.length" style="margin-top:16px">
              <span class="opts-label">Urutan Halaman — seret untuk mengatur</span>
              <div class="sort-hint" style="margin-bottom:8px">Halaman yang dihapus tidak akan masuk ke output</div>
              <div class="page-order-list">
                <TransitionGroup name="list" tag="div" class="po-inner">
                  <div v-for="(pg, i) in pageOrder" :key="pg"
                    class="po-item" :class="{ dragging: poFrom === i }"
                    draggable="true"
                    @dragstart="poFrom = i" @dragover.prevent="poOver(i)" @dragend="poFrom = -1">
                    <GripVertical :size="14" class="drag-handle" />
                    <span class="po-num">{{ pg + 1 }}</span>
                    <span class="po-label">Halaman {{ pg + 1 }}</span>
                    <button class="file-rm" @click="pageOrder.splice(i, 1)">
                      <X :size="13" />
                    </button>
                  </div>
                </TransitionGroup>
              </div>
            </div>
            <div class="action-bar">
              <span></span>
              <button class="btn btn-primary" :disabled="!files.length || processing" @click="run">
                <span v-if="processing" class="spinner" />
                <ListOrdered v-else :size="15" />
                {{ processing ? 'Menyimpan…' : 'Simpan Urutan' }}
              </button>
            </div>
          </template>

          <!-- PAGE NUMBER -->
          <template v-if="tool.id === 'pagenumber'">
            <DropZone icon="UploadCloud" file-type="pdf" accept=".pdf" title="Pilih file PDF" subtitle="Tambahkan nomor halaman otomatis" @files="setSingle" />
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
              <button class="btn btn-primary" :disabled="!files.length || processing" @click="run">
                <span v-if="processing" class="spinner" />
                <Hash v-else :size="15" />
                {{ processing ? 'Memproses…' : 'Tambah Nomor' }}
              </button>
            </div>
          </template>

          <!-- IMG TO PDF -->
          <template v-if="tool.id === 'img2pdf'">
            <DropZone icon="Image" file-type="img" accept="image/*" :multiple="true"
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
              <button class="btn btn-primary" :disabled="!files.length || processing" @click="run">
                <span v-if="processing" class="spinner" />
                <Plus v-else :size="15" />
                {{ processing ? 'Membuat…' : 'Buat PDF' }}
              </button>
            </div>
          </template>

          <!-- PDF TO IMG -->
          <template v-if="tool.id === 'pdf2img'">
            <DropZone icon="UploadCloud" file-type="pdf" accept=".pdf" title="Pilih file PDF" subtitle="Setiap halaman dikonversi menjadi gambar PNG" @files="setSingle" />
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
              <button class="btn btn-primary" :disabled="!files.length || processing" @click="run">
                <span v-if="processing" class="spinner" />
                <Camera v-else :size="15" />
                {{ processing ? 'Mengkonversi…' : 'Konversi ke PNG' }}
              </button>
            </div>
          </template>

          <!-- WORD TO PDF -->
          <template v-if="tool.id === 'word2pdf'">
            <div v-if="htmlPreview" class="print-result">
              <div class="print-info">
                <span class="print-check">
                  <Check :size="13" :stroke-width="2.5" />
                </span>
                <div>
                  <strong>Dokumen siap dikonversi ke PDF!</strong>
                  <p>Klik tombol di bawah → pilih <strong>Simpan sebagai PDF</strong> di dialog cetak</p>
                </div>
              </div>
              <div class="print-preview-wrap">
                <iframe class="print-preview-iframe" :srcdoc="htmlPreview.html" sandbox="allow-same-origin"></iframe>
              </div>
              <div class="print-steps">
                <span class="step"><span class="step-n">1</span> Klik Cetak</span>
                <span class="step-arr">
                  <ArrowRight :size="12" />
                </span>
                <span class="step"><span class="step-n">2</span> Pilih "Simpan sebagai PDF"</span>
                <span class="step-arr">
                  <ArrowRight :size="12" />
                </span>
                <span class="step"><span class="step-n">3</span> Klik Simpan</span>
              </div>
              <div class="action-bar">
                <button class="btn btn-outline" @click="htmlPreview = null; files = []">
                  <ChevronLeft :size="14" /> Ganti File
                </button>
                <button class="btn btn-primary" @click="printHtml(htmlPreview.html)">
                  <Printer :size="15" /> Cetak / Simpan sebagai PDF
                </button>
              </div>
            </div>
            <template v-else>
              <DropZone icon="FileText" file-type="docx" accept=".docx,.doc"
                title="Pilih file Word (DOCX)"
                subtitle="Konversi dokumen Word menjadi PDF"
                @files="setSingle" />
              <FileList :files="files" @remove="removeFile" />
              <div class="action-bar" v-if="files.length">
                <span></span>
                <button class="btn btn-primary" :disabled="processing" @click="run">
                  <span v-if="processing" class="spinner" />
                  <FileText v-else :size="15" />
                  {{ processing ? 'Mengkonversi…' : 'Konversi ke PDF' }}
                </button>
              </div>
            </template>
          </template>

          <!-- EXCEL TO PDF -->
          <template v-if="tool.id === 'excel2pdf'">
            <div v-if="htmlPreview" class="print-result">
              <div class="print-info">
                <span class="print-check">
                  <Check :size="13" :stroke-width="2.5" />
                </span>
                <div>
                  <strong>Spreadsheet siap dikonversi ke PDF!</strong>
                  <p>Klik tombol di bawah → pilih <strong>Simpan sebagai PDF</strong> di dialog cetak</p>
                </div>
              </div>
              <div class="print-preview-wrap">
                <iframe class="print-preview-iframe" :srcdoc="htmlPreview.html" sandbox="allow-same-origin"></iframe>
              </div>
              <div class="print-steps">
                <span class="step"><span class="step-n">1</span> Klik Cetak</span>
                <span class="step-arr"><ArrowRight :size="12" /></span>
                <span class="step"><span class="step-n">2</span> Pilih "Simpan sebagai PDF"</span>
                <span class="step-arr"><ArrowRight :size="12" /></span>
                <span class="step"><span class="step-n">3</span> Klik Simpan</span>
              </div>
              <div class="action-bar">
                <button class="btn btn-outline" @click="htmlPreview = null; files = []">
                  <ChevronLeft :size="14" /> Ganti File
                </button>
                <button class="btn btn-primary" @click="printHtml(htmlPreview.html)">
                  <Printer :size="15" /> Cetak / Simpan sebagai PDF
                </button>
              </div>
            </div>
            <template v-else>
              <DropZone icon="BarChart2" file-type="excel" accept=".xlsx,.xls,.csv,.ods"
                title="Pilih file Excel (XLSX, CSV)"
                subtitle="Konversi spreadsheet menjadi PDF"
                @files="setSingle" />
              <FileList :files="files" @remove="removeFile" />
              <div class="action-bar" v-if="files.length">
                <span></span>
                <button class="btn btn-primary" :disabled="processing" @click="run">
                  <span v-if="processing" class="spinner" />
                  <BarChart2 v-else :size="15" />
                  {{ processing ? 'Mengkonversi…' : 'Konversi ke PDF' }}
                </button>
              </div>
            </template>
          </template>

          <!-- PDF TO DOCX -->
          <template v-if="tool.id === 'pdf2docx'">
            <DropZone icon="UploadCloud" file-type="pdf" accept=".pdf"
              title="Pilih file PDF"
              subtitle="Teks akan diekstrak ke dokumen Word (.docx)"
              @files="setSingle" />
            <FileList :files="files" @remove="removeFile" />
            <div class="note note-blue" v-if="files.length" style="margin-top:14px">
              <Info :size="14" style="flex-shrink:0;margin-top:1px" />
              <span>Konversi mengekstrak <strong>teks</strong> dari PDF. Gambar dan format kompleks tidak akan disertakan. Terbaik untuk PDF berbasis teks.</span>
            </div>
            <div class="action-bar">
              <span></span>
              <button class="btn btn-primary" :disabled="!files.length || processing" @click="run">
                <span v-if="processing" class="spinner" />
                <FileOutput v-else :size="15" />
                {{ processing ? 'Mengekstrak…' : 'Konversi ke Word' }}
              </button>
            </div>
          </template>

          <!-- PDF TO XLSX -->
          <template v-if="tool.id === 'pdf2xlsx'">
            <DropZone icon="UploadCloud" file-type="pdf" accept=".pdf"
              title="Pilih file PDF"
              subtitle="Teks setiap halaman diekstrak ke spreadsheet Excel (.xlsx)"
              @files="setSingle" />
            <FileList :files="files" @remove="removeFile" />
            <div class="note note-blue" v-if="files.length" style="margin-top:14px">
              <Info :size="14" style="flex-shrink:0;margin-top:1px" />
              <span>Konversi mengekstrak <strong>teks</strong> per baris dari PDF. Terbaik untuk PDF yang berisi tabel sederhana berbasis teks.</span>
            </div>
            <div class="action-bar">
              <span></span>
              <button class="btn btn-primary" :disabled="!files.length || processing" @click="run">
                <span v-if="processing" class="spinner" />
                <FileSpreadsheet v-else :size="15" />
                {{ processing ? 'Mengekstrak…' : 'Konversi ke Excel' }}
              </button>
            </div>
          </template>

          <!-- IMG CONVERT (jpg / png / webp) -->
          <template v-if="['img2jpg','img2png','img2webp'].includes(tool.id)">
            <DropZone icon="ImagePlus" file-type="img" accept="image/*" :multiple="true"
              title="Pilih gambar (JPG, PNG, WebP)"
              :subtitle="`Semua gambar akan dikonversi ke format ${tool.id === 'img2jpg' ? 'JPG' : tool.id === 'img2png' ? 'PNG' : 'WebP'}`"
              @files="addFiles($event, 'img')" />
            <FileList :files="files" :previews="previews" @remove="removeFile" />
            <div class="action-bar">
              <span class="file-count" v-if="files.length">{{ files.length }} gambar</span>
              <span v-else></span>
              <button class="btn btn-primary" :disabled="!files.length || processing" @click="run">
                <span v-if="processing" class="spinner" />
                <RefreshCw v-else :size="15" />
                {{ processing ? 'Mengkonversi…' : `Konversi ke ${tool.id === 'img2jpg' ? 'JPG' : tool.id === 'img2png' ? 'PNG' : 'WebP'}` }}
              </button>
            </div>
          </template>

          <!-- EXCEL TO CSV -->
          <template v-if="tool.id === 'excel2csv'">
            <DropZone icon="List" file-type="excel" accept=".xlsx,.xls,.ods"
              title="Pilih file Excel (XLSX)"
              subtitle="Setiap baris spreadsheet menjadi baris CSV"
              @files="setSingle" />
            <FileList :files="files" @remove="removeFile" />
            <div class="action-bar">
              <span></span>
              <button class="btn btn-primary" :disabled="!files.length || processing" @click="run">
                <span v-if="processing" class="spinner" />
                <List v-else :size="15" />
                {{ processing ? 'Mengkonversi…' : 'Konversi ke CSV' }}
              </button>
            </div>
          </template>

          <!-- WORD TO TXT -->
          <template v-if="tool.id === 'word2txt'">
            <DropZone icon="AlignLeft" file-type="docx" accept=".docx,.doc"
              title="Pilih file Word (DOCX)"
              subtitle="Teks murni dari dokumen Word disimpan sebagai file .txt"
              @files="setSingle" />
            <FileList :files="files" @remove="removeFile" />
            <div class="note note-blue" v-if="files.length" style="margin-top:14px">
              <Info :size="14" style="flex-shrink:0;margin-top:1px" />
              <span>Hanya teks yang diekstrak. Format, gambar, dan tabel tidak disertakan.</span>
            </div>
            <div class="action-bar">
              <span></span>
              <button class="btn btn-primary" :disabled="!files.length || processing" @click="run">
                <span v-if="processing" class="spinner" />
                <AlignLeft v-else :size="15" />
                {{ processing ? 'Mengekstrak…' : 'Ekstrak ke Teks' }}
              </button>
            </div>
          </template>

          <!-- REMOVE PAGES -->
          <template v-if="tool.id === 'removepages'">
            <DropZone v-if="!files.length" icon="FileMinus" file-type="pdf" accept=".pdf"
              title="Pilih file PDF"
              subtitle="Pilih halaman yang ingin dihapus dari dokumen"
              @files="loadPageThumbsFor('remove', $event)" />
            <template v-if="files.length && !results.length">
              <div class="pp-info-bar">
                <span class="opts-label" style="margin:0">Klik halaman untuk menandai hapus</span>
                <span class="pp-count-badge" v-if="rpToDelete.length">{{ rpToDelete.length }} halaman dipilih</span>
              </div>
              <div v-if="rpThumbsLoading" class="pp-loading">Memuat pratinjau halaman…</div>
              <div v-else class="pp-grid">
                <div
                  v-for="pg in rpThumbs" :key="pg.index"
                  class="pp-item" :class="{ 'pp-item--del': rpToDelete.includes(pg.index) }"
                  @click="toggleRpDelete(pg.index)"
                >
                  <img v-if="pg.thumb" :src="pg.thumb" class="pp-thumb" alt="" />
                  <div v-else class="pp-thumb-ph"><File :size="28" :stroke-width="1" /></div>
                  <div class="pp-overlay pp-overlay--del" v-if="rpToDelete.includes(pg.index)">
                    <X :size="22" :stroke-width="2.5" />
                  </div>
                  <div class="pp-num">{{ pg.index + 1 }}</div>
                </div>
              </div>
              <div class="action-bar">
                <button class="btn btn-outline" @click="files = []; rpThumbs = []; rpToDelete = []; reset()">Ganti File</button>
                <button class="btn btn-primary" :disabled="!rpToDelete.length || processing" @click="run">
                  <span v-if="processing" class="spinner" />
                  <FileMinus v-else :size="15" />
                  {{ processing ? 'Menghapus…' : `Hapus ${rpToDelete.length} Halaman` }}
                </button>
              </div>
            </template>
          </template>

          <!-- EXTRACT PAGES -->
          <template v-if="tool.id === 'extractpages'">
            <DropZone v-if="!files.length" icon="Copy" file-type="pdf" accept=".pdf"
              title="Pilih file PDF"
              subtitle="Pilih halaman yang ingin diekstrak sebagai PDF baru"
              @files="loadPageThumbsFor('extract', $event)" />
            <template v-if="files.length && !results.length">
              <div class="pp-info-bar">
                <span class="opts-label" style="margin:0">Klik halaman untuk memilih</span>
                <span class="pp-count-badge" v-if="epSelected.length">{{ epSelected.length }} halaman dipilih</span>
              </div>
              <div v-if="epThumbsLoading" class="pp-loading">Memuat pratinjau halaman…</div>
              <div v-else class="pp-grid">
                <div
                  v-for="pg in epThumbs" :key="pg.index"
                  class="pp-item" :class="{ 'pp-item--sel': epSelected.includes(pg.index) }"
                  @click="toggleEpSelect(pg.index)"
                >
                  <img v-if="pg.thumb" :src="pg.thumb" class="pp-thumb" alt="" />
                  <div v-else class="pp-thumb-ph"><File :size="28" :stroke-width="1" /></div>
                  <div class="pp-overlay pp-overlay--sel" v-if="epSelected.includes(pg.index)">
                    <Check :size="20" :stroke-width="2.5" />
                  </div>
                  <div class="pp-num">{{ pg.index + 1 }}</div>
                </div>
              </div>
              <div class="action-bar">
                <button class="btn btn-outline" @click="files = []; epThumbs = []; epSelected = []; reset()">Ganti File</button>
                <button class="btn btn-primary" :disabled="!epSelected.length || processing" @click="run">
                  <span v-if="processing" class="spinner" />
                  <Copy v-else :size="15" />
                  {{ processing ? 'Mengekstrak…' : `Ekstrak ${epSelected.length} Halaman` }}
                </button>
              </div>
            </template>
          </template>

          <!-- WATERMARK -->
          <template v-if="tool.id === 'watermark'">
            <DropZone icon="Layers" file-type="pdf" accept=".pdf"
              title="Pilih file PDF"
              subtitle="Teks watermark ditambahkan ke setiap halaman"
              @files="setSingle" />
            <FileList :files="files" @remove="removeFile" />
            <div class="opts-block" v-if="files.length">
              <span class="opts-label">Teks Watermark</span>
              <input type="text" v-model="wmText" placeholder="Contoh: RAHASIA, DRAFT, CONFIDENTIAL…" class="wm-input" />

              <span class="opts-label" style="margin-top:16px">Ukuran Teks</span>
              <div class="opts-row">
                <button class="chip" :class="{ sel: wmFontSize === 32 }" @click="wmFontSize = 32">Kecil</button>
                <button class="chip" :class="{ sel: wmFontSize === 48 }" @click="wmFontSize = 48">Sedang</button>
                <button class="chip" :class="{ sel: wmFontSize === 68 }" @click="wmFontSize = 68">Besar</button>
              </div>

              <span class="opts-label" style="margin-top:16px">Transparansi</span>
              <div class="opts-row">
                <button class="chip" :class="{ sel: wmOpacity === 0.10 }" @click="wmOpacity = 0.10">Samar (10%)</button>
                <button class="chip" :class="{ sel: wmOpacity === 0.20 }" @click="wmOpacity = 0.20">Sedang (20%)</button>
                <button class="chip" :class="{ sel: wmOpacity === 0.40 }" @click="wmOpacity = 0.40">Jelas (40%)</button>
              </div>

              <span class="opts-label" style="margin-top:16px">Arah</span>
              <div class="opts-row">
                <button class="chip" :class="{ sel: wmAngle === -45 }" @click="wmAngle = -45">Diagonal</button>
                <button class="chip" :class="{ sel: wmAngle === 0   }" @click="wmAngle = 0">Horizontal</button>
              </div>

              <span class="opts-label" style="margin-top:16px">Warna</span>
              <div class="opts-row">
                <button class="chip" :class="{ sel: wmColor === 'gray'  }" @click="wmColor = 'gray'">Abu-abu</button>
                <button class="chip" :class="{ sel: wmColor === 'black' }" @click="wmColor = 'black'">Hitam</button>
              </div>
            </div>
            <div class="action-bar">
              <span></span>
              <button class="btn btn-primary" :disabled="!files.length || !wmText.trim() || processing" @click="run">
                <span v-if="processing" class="spinner" />
                <Layers v-else :size="15" />
                {{ processing ? 'Menambahkan…' : 'Tambah Watermark' }}
              </button>
            </div>
          </template>

          <!-- PROTECT -->
          <template v-if="tool.id === 'protect'">
            <DropZone icon="Lock" file-type="pdf" accept=".pdf"
              title="Pilih file PDF"
              subtitle="Tambahkan kata sandi untuk melindungi dokumen"
              @files="setSingle" />
            <FileList :files="files" @remove="removeFile" />
            <div class="opts-block" v-if="files.length">
              <span class="opts-label">Kata Sandi</span>
              <div class="pass-wrap">
                <input
                  :type="showPass ? 'text' : 'password'"
                  v-model="pdfPass"
                  placeholder="Masukkan kata sandi..."
                  class="pass-input"
                  autocomplete="new-password"
                />
                <button class="pass-toggle" @click="showPass = !showPass" type="button" :title="showPass ? 'Sembunyikan' : 'Tampilkan'">
                  <EyeOff v-if="showPass" :size="15" />
                  <Eye    v-else           :size="15" />
                </button>
              </div>
              <div class="note note-blue" style="margin-top:10px">
                <Info :size="14" style="flex-shrink:0;margin-top:1px" />
                <span>Kata sandi ini dibutuhkan setiap kali file PDF dibuka.</span>
              </div>
            </div>
            <div class="action-bar">
              <span></span>
              <button class="btn btn-primary" :disabled="!files.length || !pdfPass || processing" @click="run">
                <span v-if="processing" class="spinner" />
                <Lock v-else :size="15" />
                {{ processing ? 'Mengenkripsi…' : 'Proteksi PDF' }}
              </button>
            </div>
          </template>

          <!-- UNLOCK -->
          <template v-if="tool.id === 'unlock'">
            <DropZone icon="Unlock" file-type="pdf" accept=".pdf"
              title="Pilih file PDF terproteksi"
              subtitle="Masukkan kata sandi untuk membuka perlindungan"
              @files="setSingle" />
            <FileList :files="files" @remove="removeFile" />
            <div class="opts-block" v-if="files.length">
              <span class="opts-label">Kata Sandi Saat Ini</span>
              <div class="pass-wrap">
                <input
                  :type="showPass ? 'text' : 'password'"
                  v-model="pdfPass"
                  placeholder="Kata sandi PDF..."
                  class="pass-input"
                  autocomplete="current-password"
                />
                <button class="pass-toggle" @click="showPass = !showPass" type="button" :title="showPass ? 'Sembunyikan' : 'Tampilkan'">
                  <EyeOff v-if="showPass" :size="15" />
                  <Eye    v-else           :size="15" />
                </button>
              </div>
              <div class="note note-yellow" style="margin-top:10px">
                <AlertTriangle :size="14" style="flex-shrink:0;margin-top:1px" />
                <span>Hanya bisa membuka kunci jika kamu mengetahui kata sandi yang benar.</span>
              </div>
            </div>
            <div class="action-bar">
              <span></span>
              <button class="btn btn-primary" :disabled="!files.length || processing" @click="run">
                <span v-if="processing" class="spinner" />
                <Unlock v-else :size="15" />
                {{ processing ? 'Membuka Kunci…' : 'Buka Kunci PDF' }}
              </button>
            </div>
          </template>

          <!-- SHARED: Progress + Error + Result -->
          <template v-if="tool.id !== 'compress' || !compressResult">
            <ProgressBar v-if="!htmlPreview" :value="progress" :label="progLabel" :steps="progressSteps" />
            <Transition name="fade">
              <div class="error-box" v-if="errMsg && tool.id !== 'compress'">
                <AlertTriangle :size="15" /> {{ errMsg }}
              </div>
            </Transition>
            <ResultBox :results="results" v-if="!['compress','word2pdf','excel2pdf'].includes(tool.id)" />
          </template>

        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue'
import { useRoute } from 'vue-router'
import {
  ChevronLeft, GripVertical, X, File, Plus, GitMerge,
  Scissors, Minimize2, RotateCw, ListOrdered, Hash,
  Image, Camera, FileText, BarChart2, FileOutput, FileSpreadsheet,
  ArrowRight, Check, AlertTriangle, Info, Download, Printer,
  Lock, Unlock, Eye, EyeOff, FileMinus, Copy, Layers,
  RefreshCw, AlignLeft, List,
} from '@lucide/vue'
import AppIcon     from '../components/AppIcon.vue'
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
  doWord2PDF, doExcel2PDF, doPDF2Docx, doPDF2Xlsx,
  doRemovePages, doExtractPages, doWatermark,
  doImgConvert, doExcel2Csv, doWord2Txt,
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
  htmlPreview.value    = null
}
function removeFile(i) { files.value.splice(i, 1); previews.value.splice(i, 1) }
function reorderFiles({ from, to }) {
  const a = [...files.value], [m] = a.splice(from, 1); a.splice(to, 0, m); files.value = a
  const p = [...previews.value], [mp] = p.splice(from, 1); p.splice(to, 0, mp); previews.value = p
}

const mergeSize      = ref('fit')
const splitMode      = ref('all')
const pageFrom       = ref(1)
const pageTo         = ref(1)
const rotDeg         = ref(90)
const imgPageSz      = ref('A4')
const imgScale       = ref(2)
const pageNumPos     = ref('bottom-center')
const pdfPass        = ref('')
const compressLevel  = ref('low')
const compressResult = ref(null)
const htmlPreview    = ref(null)

const pageOrder = ref([])
const poFrom    = ref(-1)

// Remove Pages
const rpThumbs        = ref([])
const rpToDelete      = ref([])
const rpThumbsLoading = ref(false)

// Extract Pages
const epThumbs        = ref([])
const epSelected      = ref([])
const epThumbsLoading = ref(false)

// Watermark
const wmText     = ref('RAHASIA')
const wmFontSize = ref(48)
const wmOpacity  = ref(0.15)
const wmAngle    = ref(-45)
const wmColor    = ref('gray')

// Password visibility (protect / unlock)
const showPass = ref(false)

function toggleRpDelete(idx) {
  if (rpToDelete.value.includes(idx)) rpToDelete.value = rpToDelete.value.filter((i) => i !== idx)
  else rpToDelete.value = [...rpToDelete.value, idx]
}
function toggleEpSelect(idx) {
  if (epSelected.value.includes(idx)) epSelected.value = epSelected.value.filter((i) => i !== idx)
  else epSelected.value = [...epSelected.value, idx]
}

async function loadPageThumbsFor(mode, newFs) {
  files.value = [newFs[0]]; errMsg.value = ''
  if (mode === 'remove') { rpThumbs.value = []; rpToDelete.value = []; rpThumbsLoading.value = true }
  else                   { epThumbs.value = []; epSelected.value  = []; epThumbsLoading.value = true }
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
      const r = new FileReader(); r.onload = (e) => res(e.target.result); r.onerror = rej; r.readAsArrayBuffer(newFs[0])
    })
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise
    const thumbs = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const pg = await pdf.getPage(i)
      const vp = pg.getViewport({ scale: 0.5 })
      const cv = document.createElement('canvas')
      cv.width = Math.round(vp.width); cv.height = Math.round(vp.height)
      const ctx = cv.getContext('2d')
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height)
      await pg.render({ canvasContext: ctx, viewport: vp }).promise
      thumbs.push({ index: i - 1, thumb: cv.toDataURL('image/jpeg', 0.75) })
    }
    if (mode === 'remove') rpThumbs.value = thumbs
    else                   epThumbs.value = thumbs
  } catch (e) { errMsg.value = 'Gagal memuat pratinjau: ' + e.message }
  finally {
    if (mode === 'remove') rpThumbsLoading.value = false
    else                   epThumbsLoading.value = false
  }
}

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
    merge:      [{ pct:10,name:'Memuat'  }, { pct:50,name:'Menggabung'  }, { pct:90,name:'Menyimpan'}, { pct:100,name:'Selesai'}],
    split:      [{ pct:10,name:'Membaca' }, { pct:60,name:'Memisah'     }, { pct:90,name:'Menyimpan'}, { pct:100,name:'Selesai'}],
    compress:   [{ pct:10,name:'Membaca' }, { pct:55,name:'Optimasi'    }, { pct:90,name:'Menyimpan'}, { pct:100,name:'Selesai'}],
    rotate:     [{ pct:10,name:'Membaca' }, { pct:70,name:'Memutar'     }, { pct:92,name:'Menyimpan'}, { pct:100,name:'Selesai'}],
    reorder:    [{ pct:30,name:'Membaca' }, { pct:65,name:'Mengatur'    }, { pct:90,name:'Menyimpan'}, { pct:100,name:'Selesai'}],
    pagenumber: [{ pct:15,name:'Membaca' }, { pct:70,name:'Menulis'     }, { pct:92,name:'Menyimpan'}, { pct:100,name:'Selesai'}],
    img2pdf:    [{ pct:10,name:'Memuat'  }, { pct:60,name:'Menyusun'   }, { pct:90,name:'Menyimpan'}, { pct:100,name:'Selesai'}],
    pdf2img:    [{ pct:5, name:'Memuat'  }, { pct:50,name:'Merender'   }, { pct:95,name:'Ekspor'   }, { pct:100,name:'Selesai'}],
    protect:    [{ pct:25,name:'Membaca' }, { pct:65,name:'Enkripsi'   }, { pct:90,name:'Menyimpan'}, { pct:100,name:'Selesai'}],
    unlock:     [{ pct:30,name:'Membaca' }, { pct:65,name:'Membuka'    }, { pct:90,name:'Menyimpan'}, { pct:100,name:'Selesai'}],
    word2pdf:   [{ pct:15,name:'Memuat'  }, { pct:40,name:'Membaca'    }, { pct:80,name:'Merender' }, { pct:100,name:'Selesai'}],
    excel2pdf:  [{ pct:15,name:'Memuat'  }, { pct:40,name:'Membaca'    }, { pct:70,name:'Merender' }, { pct:100,name:'Selesai'}],
    pdf2docx:    [{ pct:5, name:'Memuat'  }, { pct:15,name:'Membaca'    }, { pct:84,name:'Mengekstrak'},{pct:100,name:'Selesai'}],
    pdf2xlsx:    [{ pct:5, name:'Memuat'  }, { pct:15,name:'Membaca'    }, { pct:90,name:'Mengekstrak'},{pct:100,name:'Selesai'}],
    removepages: [{ pct:20,name:'Membaca'    }, { pct:55,name:'Menghapus'   }, { pct:88,name:'Menyimpan'   },{pct:100,name:'Selesai'}],
    extractpages:[{ pct:20,name:'Membaca'    }, { pct:55,name:'Mengambil'   }, { pct:88,name:'Menyimpan'   },{pct:100,name:'Selesai'}],
    watermark:   [{ pct:15,name:'Membaca'    }, { pct:70,name:'Menambah'    }, { pct:90,name:'Menyimpan'   },{pct:100,name:'Selesai'}],
    img2jpg:     [{ pct:5, name:'Memuat'     }, { pct:60,name:'Mengkonversi'}, { pct:95,name:'Menyimpan'   },{pct:100,name:'Selesai'}],
    img2png:     [{ pct:5, name:'Memuat'     }, { pct:60,name:'Mengkonversi'}, { pct:95,name:'Menyimpan'   },{pct:100,name:'Selesai'}],
    img2webp:    [{ pct:5, name:'Memuat'     }, { pct:60,name:'Mengkonversi'}, { pct:95,name:'Menyimpan'   },{pct:100,name:'Selesai'}],
    excel2csv:   [{ pct:20,name:'Memuat'     }, { pct:60,name:'Mengkonversi'}, { pct:88,name:'Menyimpan'   },{pct:100,name:'Selesai'}],
    word2txt:    [{ pct:20,name:'Memuat'     }, { pct:65,name:'Mengekstrak' }, { pct:90,name:'Menyimpan'   },{pct:100,name:'Selesai'}],
  }
  return map[tool.value?.id] || map.merge
})

async function run() {
  reset()
  htmlPreview.value = null
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
  if (id === 'word2pdf')  { const r = await doWord2PDF(files.value[0]);  if (r) htmlPreview.value = r }
  if (id === 'excel2pdf') { const r = await doExcel2PDF(files.value[0]); if (r) htmlPreview.value = r }
  if (id === 'pdf2docx')    await doPDF2Docx(files.value[0])
  if (id === 'pdf2xlsx')    await doPDF2Xlsx(files.value[0])
  if (id === 'removepages')  await doRemovePages(files.value[0], rpToDelete.value)
  if (id === 'extractpages') await doExtractPages(files.value[0], epSelected.value)
  if (id === 'watermark')    await doWatermark(files.value[0], wmText.value, { fontSize: wmFontSize.value, opacity: wmOpacity.value, angle: wmAngle.value, color: wmColor.value })
  if (['img2jpg','img2png','img2webp'].includes(id)) {
    const fmt = id === 'img2jpg' ? 'jpg' : id === 'img2png' ? 'png' : 'webp'
    await doImgConvert(files.value, fmt)
  }
  if (id === 'excel2csv') await doExcel2Csv(files.value[0])
  if (id === 'word2txt')  await doWord2Txt(files.value[0])
}

function printHtml(html) {
  const w = window.open('', '_blank', 'width=900,height=700,menubar=yes,toolbar=yes')
  if (!w) { alert('Pop-up diblokir browser. Izinkan pop-up untuk situs ini.'); return }
  w.document.write(html)
  w.document.close()
  setTimeout(() => { w.focus(); w.print() }, 700)
}

function dl(r) { const a = document.createElement('a'); a.href = r.url; a.download = r.name; a.click() }

watch(() => route.params.id, () => {
  files.value = []; previews.value = []; pageOrder.value = []
  pdfPass.value = ''; compressResult.value = null; htmlPreview.value = null
  compressLevel.value = 'low'
  mergePreviews.value = []; mergePageCounts.value = []; mgFrom.value = -1
  rpThumbs.value = []; rpToDelete.value = []; rpThumbsLoading.value = false
  epThumbs.value = []; epSelected.value = []; epThumbsLoading.value = false
  wmText.value = 'RAHASIA'; wmFontSize.value = 48; wmOpacity.value = 0.15; wmAngle.value = -45; wmColor.value = 'gray'
  showPass.value = false
  reset()
})
</script>

<style scoped>
.tool-view { padding: 40px 0 80px; }
.tv-inner  { max-width: 780px; margin: 0 auto; padding: 0 24px; }

.tv-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-2);
  text-decoration: none;
  padding: 4px 0;
  transition: color .15s;
}
.back-btn:hover { color: var(--text); }
.sep       { color: var(--c-300); font-size: 14px; }
.tv-icon   {
  width: 28px; height: 28px;
  border-radius: 6px;
  background: var(--c-100);
  color: var(--c-700);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
h1 { font-size: 18px; font-weight: 700; letter-spacing: -.3px; }

.workspace-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 28px;
  position: relative;
}

/* Options */
.opts-block { margin-top: 20px; }
.opts-label { display: block; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: var(--text-3); margin-bottom: 8px; }
.opts-row   { display: flex; gap: 8px; flex-wrap: wrap; }
.chip       { padding: 7px 14px; border: 1.5px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; color: var(--text-2); cursor: pointer; background: var(--surface); font-family: var(--font); transition: all .15s ease; }
.chip:hover { border-color: var(--border-2); color: var(--text); }
.chip.sel   { border-color: var(--c-900); color: var(--c-950); background: var(--c-100); }

/* Notes */
.note { display: flex; gap: 8px; align-items: flex-start; padding: 10px 14px; border-radius: var(--radius-sm); font-size: 12.5px; margin-top: 12px; line-height: 1.5; }
.note-yellow { background: var(--warn-bg);  border: 1px solid var(--warn-border); color: var(--warn-text); }
.note-blue   { background: var(--info-bg);  border: 1px solid var(--info-border); color: var(--info-text); }

/* Fields */
.field       { display: flex; flex-direction: column; gap: 5px; margin-top: 12px; }
.field label { font-size: 12px; font-weight: 500; color: var(--text-2); }
.field input, .input-full {
  padding: 9px 12px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  font-family: var(--font);
  font-size: 14px;
  color: var(--text);
  background: var(--surface);
  outline: none;
  transition: border-color .15s;
}
.field input { width: 110px; }
.input-full  { width: 100%; max-width: 320px; }
.field input:focus, .input-full:focus { border-color: var(--c-500); }
.field-row   { display: flex; gap: 14px; flex-wrap: wrap; }

/* Action bar */
.action-bar  { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border); }
.file-count  { font-size: 13px; color: var(--text-2); }

/* Buttons */
.btn         { display: inline-flex; align-items: center; gap: 7px; padding: 10px 20px; border-radius: var(--radius-sm); font-family: var(--font); font-size: 14px; font-weight: 500; cursor: pointer; border: none; transition: all .2s ease; line-height: 1; }
.btn-primary { background: var(--c-950); color: var(--c-white); }
.btn-primary:hover    { background: var(--c-800); transform: translateY(-1px); box-shadow: var(--shadow-md); }
.btn-primary:disabled { opacity: .4; cursor: not-allowed; transform: none; box-shadow: none; }
.btn-outline { background: var(--surface); color: var(--text); border: 1.5px solid var(--border); }
.btn-outline:hover { border-color: var(--border-2); background: var(--bg); }

/* Spinner */
.spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.25); border-top-color: rgba(255,255,255,.9); border-radius: 50%; animation: spin .7s linear infinite; display: inline-block; flex-shrink: 0; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Error */
.error-box { margin-top: 16px; padding: 12px 16px; background: var(--err-bg, #fef2f2); border: 1px solid var(--err-border, #fecaca); border-radius: var(--radius-sm); font-size: 13px; color: var(--err-text, #dc2626); display: flex; gap: 8px; align-items: center; }

/* Page order */
.po-inner  { display: flex; flex-direction: column; gap: 7px; }
.po-item   { display: flex; align-items: center; gap: 10px; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 14px; transition: opacity .15s, box-shadow .15s; }
.po-item.dragging { opacity: .45; box-shadow: var(--shadow-md); }
.po-num    { width: 26px; height: 26px; background: var(--c-100); color: var(--c-900); border-radius: 5px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; flex-shrink: 0; }
.po-label  { flex: 1; font-size: 13.5px; font-weight: 500; }
.sort-hint { font-size: 12px; color: var(--text-3); }
.drag-handle { color: var(--c-400); cursor: grab; user-select: none; flex-shrink: 0; }
.drag-handle:active { cursor: grabbing; }
.file-rm   { background: none; border: none; color: var(--c-400); cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; flex-shrink: 0; transition: color .15s, background .15s; }
.file-rm:hover { color: var(--c-950); background: var(--c-100); }

.not-found { text-align: center; padding: 40px; color: var(--text-2); }

/* Compress layout */
.compress-layout { display: grid; grid-template-columns: 1fr 1.6fr; min-height: 420px; }

.compress-left  { background: var(--bg); border-right: 1px solid var(--border); display: flex; align-items: center; justify-content: center; padding: 32px 24px; border-radius: var(--radius) 0 0 var(--radius); }
.compress-file-card { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; }
.compress-file-icon { color: var(--c-400); }
.compress-file-name { font-size: 13px; font-weight: 600; color: var(--text); max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.compress-file-size { font-size: 12px; color: var(--text-3); }
.compress-change    { margin-top: 8px; padding: 5px 12px; border: 1px solid var(--border); border-radius: 6px; font-size: 12px; font-weight: 500; color: var(--text-2); background: var(--surface); cursor: pointer; font-family: var(--font); transition: all .15s; }
.compress-change:hover { border-color: var(--c-400); color: var(--text); }

.compress-right { padding: 28px 24px; display: flex; flex-direction: column; }
.compress-opts-title { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 14px; }

.compress-list { display: flex; flex-direction: column; border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }
.cl-item       { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 14px 16px; background: var(--surface); border: none; border-bottom: 1px solid var(--border); cursor: pointer; font-family: var(--font); text-align: left; transition: background .15s; }
.cl-item:last-child { border-bottom: none; }
.cl-item:hover      { background: var(--bg); }
.cl-item.sel        { background: var(--c-50); }
.cl-text            { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.cl-name-row        { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.cl-name            { font-size: 12px; font-weight: 700; color: var(--text); letter-spacing: .4px; }
.cl-desc            { font-size: 12px; color: var(--text-2); }
.cl-est             { font-size: 11.5px; color: var(--text-3); font-style: italic; }
.cl-check           { width: 22px; height: 22px; background: var(--c-950); color: var(--c-white); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; animation: pop .3s cubic-bezier(.16,1,.3,1); }

.cl-badge     { font-size: 10.5px; font-weight: 600; padding: 2px 7px; border-radius: 20px; white-space: nowrap; }
.badge-green  { background: #dcfce7; color: #15803d; }
.badge-yellow { background: #fef9c3; color: #a16207; }
.badge-red    { background: #fee2e2; color: #dc2626; }

.cl-btn { width: 100%; justify-content: center; margin-top: 14px; padding: 12px; font-size: 14px; }

/* Compress result */
.compress-result { display: flex; align-items: center; gap: 40px; padding: 32px; animation: fadeUp .5s cubic-bezier(.16,1,.3,1); }
.cr-circle-wrap  { position: relative; flex-shrink: 0; }
.cr-circle       { width: 130px; height: 130px; }
.cr-circle-text  { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
.cr-pct          { font-size: 28px; font-weight: 800; color: var(--c-950); line-height: 1; font-variant-numeric: tabular-nums; }
.cr-label        { font-size: 11px; color: var(--text-3); font-weight: 500; }
.cr-info h3      { font-size: 18px; font-weight: 700; margin-bottom: 10px; }
.cr-sizes        { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; color: var(--text); margin-bottom: 4px; }
.cr-arrow        { color: var(--c-400); flex-shrink: 0; }
.cr-new          { color: var(--c-700); font-weight: 700; }
.cr-saved        { font-size: 13px; color: var(--text-2); margin-bottom: 20px; }
.cr-actions      { display: flex; gap: 10px; flex-wrap: wrap; }

/* Print result */
.print-result { display: flex; flex-direction: column; gap: 16px; }
.print-info   { display: flex; align-items: flex-start; gap: 12px; background: var(--c-50); border: 1px solid var(--c-200); border-radius: var(--radius-sm); padding: 14px 16px; }
.print-check  { width: 28px; height: 28px; background: var(--c-950); color: var(--c-white); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; animation: pop .4s cubic-bezier(.16,1,.3,1); }
.print-info strong { font-size: 14px; font-weight: 600; display: block; }
.print-info p      { font-size: 12.5px; color: var(--text-2); margin-top: 3px; }

.print-preview-wrap  { width: 100%; height: 380px; border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; background: var(--bg); }
.print-preview-iframe { width: 100%; height: 100%; border: none; }

.print-steps  { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12.5px; color: var(--text-2); }
.step         { display: flex; align-items: center; gap: 6px; }
.step-n       { width: 20px; height: 20px; background: var(--c-950); color: var(--c-white); border-radius: 50%; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.step-arr     { color: var(--c-400); display: flex; align-items: center; }

/* Merge grid */
.merge-grid-wrap { display: flex; flex-direction: column; gap: 16px; }
.merge-hint      { font-size: 12px; color: var(--text-3); display: flex; align-items: center; gap: 5px; padding: 0 2px; }
.merge-grid      { display: flex; flex-wrap: wrap; gap: 14px; }

.mg-card         { position: relative; width: 160px; background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--radius); overflow: hidden; cursor: grab; transition: border-color .2s, box-shadow .2s, transform .15s; user-select: none; display: flex; flex-direction: column; }
.mg-card:hover   { border-color: var(--c-300); box-shadow: var(--shadow-md); }
.mg-card.mg-dragging { opacity: .4; transform: scale(.97); }
.mg-card:active  { cursor: grabbing; }

.mg-num { position: absolute; top: 8px; left: 8px; width: 22px; height: 22px; background: var(--c-950); color: var(--c-white); border-radius: 50%; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; z-index: 2; pointer-events: none; }

.mg-rm { position: absolute; top: 6px; right: 6px; width: 22px; height: 22px; background: rgba(0,0,0,.45); color: #fff; border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 2; transition: background .15s; }
.mg-rm:hover { background: var(--c-950); }

.mg-thumb-wrap  { width: 100%; height: 180px; background: var(--bg); display: flex; align-items: center; justify-content: center; overflow: hidden; border-bottom: 1px solid var(--border); }
.mg-thumb       { width: 100%; height: 100%; object-fit: contain; display: block; }
.mg-thumb-placeholder { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
.mg-thumb-icon  { color: var(--c-300); }

.mg-info  { padding: 10px 10px 12px; display: flex; flex-direction: column; gap: 3px; }
.mg-name  { font-size: 12px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mg-meta  { font-size: 11px; color: var(--text-3); }

.mg-add   { cursor: pointer; border-style: dashed; align-items: center; justify-content: center; min-height: 220px; gap: 8px; transition: border-color .2s, background .2s; }
.mg-add-icon  { color: var(--c-400); }
.mg-add-label { font-size: 12px; font-weight: 500; color: var(--c-400); }

.mg-add-over,
.mg-add:hover {
  border-color: var(--c-400) !important;
  background: var(--c-100) !important;
}
.mg-add-over .mg-add-icon,
.mg-add-over .mg-add-label,
.mg-add:hover .mg-add-icon,
.mg-add:hover .mg-add-label { color: var(--c-700); }

.mg-grid-over { outline: 2px dashed var(--c-300); outline-offset: 4px; border-radius: var(--radius); }

/* Animations */
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
  .merge-grid { gap: 10px; }
  .mg-card    { width: calc(50% - 5px); }
  .mg-thumb-wrap { height: 140px; }
}
@media (max-width: 360px) {
  .mg-card { width: 100%; }
}

/* Page Picker (Remove / Extract) */
.pp-info-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 8px;
}
.pp-count-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 11px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: var(--c-950);
  color: var(--c-white);
  animation: pop .25s cubic-bezier(.16,1,.3,1);
}
.pp-loading {
  padding: 28px;
  text-align: center;
  color: var(--text-3);
  font-size: 13px;
}
.pp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
  margin-bottom: 4px;
}
.pp-item {
  position: relative;
  border-radius: var(--radius-sm);
  overflow: hidden;
  cursor: pointer;
  border: 2px solid var(--border);
  transition: border-color .15s, transform .15s;
  background: var(--bg);
}
.pp-item:hover { border-color: var(--c-300); transform: translateY(-1px); }
.pp-item--del  { border-color: #ef4444; }
.pp-item--sel  { border-color: var(--c-950); }
.pp-thumb {
  width: 100%;
  aspect-ratio: 3/4;
  object-fit: cover;
  display: block;
}
.pp-thumb-ph {
  width: 100%;
  aspect-ratio: 3/4;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c-300);
}
.pp-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.pp-overlay--del {
  background: rgba(239,68,68,.6);
  color: #fff;
}
.pp-overlay--sel {
  background: rgba(9,9,11,.55);
  color: #fff;
}
.pp-num {
  position: absolute;
  bottom: 5px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,.55);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  pointer-events: none;
}

/* Password input */
.pass-wrap {
  display: flex;
  align-items: center;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  max-width: 340px;
  transition: border-color .15s;
}
.pass-wrap:focus-within { border-color: var(--c-500); }
.pass-input {
  flex: 1;
  padding: 10px 14px;
  border: none;
  outline: none;
  font-family: var(--font);
  font-size: 14px;
  color: var(--text);
  background: var(--surface);
}
.pass-toggle {
  padding: 0 12px;
  background: transparent;
  border: none;
  border-left: 1px solid var(--border);
  color: var(--text-3);
  cursor: pointer;
  display: flex;
  align-items: center;
  height: 40px;
  transition: color .15s, background .15s;
}
.pass-toggle:hover { color: var(--text); background: var(--c-50); }

/* Watermark text input */
.wm-input {
  width: 100%;
  max-width: 420px;
  padding: 10px 14px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  font-family: var(--font);
  font-size: 14px;
  color: var(--text);
  background: var(--surface);
  outline: none;
  transition: border-color .15s;
}
.wm-input:focus { border-color: var(--c-500); }

@media (max-width: 640px) {
  .pp-grid { grid-template-columns: repeat(3, 1fr); }
}
</style>
