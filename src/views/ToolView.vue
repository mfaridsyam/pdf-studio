<template>
  <div class="tool-page" :style="tool ? { '--tool-clr': tool.bg } : {}">

    <div v-if="!tool" class="not-found-page">
      <p>Alat tidak ditemukan.</p>
      <RouterLink to="/"><ChevronLeft :size="14" style="vertical-align:middle" /> Kembali</RouterLink>
    </div>

    <template v-else>
      <!-- Tool Hero -->
      <div class="tool-hero">
        <div class="tool-hero-inner">
          <RouterLink to="/" class="th-back"><ChevronLeft :size="14" /> Semua Alat</RouterLink>
          <div class="th-main">
            <div class="th-icon"><AppIcon :name="tool.icon" :size="36" :stroke-width="1.6" /></div>
            <h1 class="th-title">{{ tool.name }}</h1>
            <p class="th-desc">{{ tool.desc }}</p>
          </div>
        </div>
      </div>

      <!-- Workspace -->
      <div class="tool-workspace">
        <div class="workspace-inner">
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
                  @drop.prevent.stop="onMergeAddDrop"
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

            <!-- Hasil kompresi -->
            <div class="compress-result" v-if="compressResult && results.length">
              <template v-if="compressResult.bigger">
                <div class="cr-info cr-info-full">
                  <h3 style="color:var(--text)">PDF sudah optimal</h3>
                  <p style="font-size:13px;color:var(--text-2);margin-top:6px;line-height:1.5">
                    PDF ini tidak dapat dikecilkan lebih lanjut dengan metode ini. Kemungkinan PDF sudah berisi teks/vektor yang sangat efisien atau gambar yang sudah dikompresi.
                  </p>
                  <div class="note note-blue" style="margin-top:14px;font-size:12.5px">
                    <Info :size="14" style="flex-shrink:0;margin-top:1px" />
                    <span>Coba mode <strong>Berbagi (72 DPI)</strong> atau <strong>Maks</strong> untuk PDF berbasis gambar/scan. Untuk PDF teks murni, kompresi lebih lanjut tidak dimungkinkan di browser.</span>
                  </div>
                  <div class="cr-actions" style="margin-top:16px">
                    <button class="btn btn-outline" @click="compressResult = null; reset(); files = []">Coba Level Lain</button>
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="cr-circle-wrap">
                  <svg class="cr-circle" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="var(--c-200)" stroke-width="8"/>
                    <circle cx="60" cy="60" r="52" fill="none" :stroke="tool.bg" stroke-width="8"
                      stroke-linecap="round"
                      :stroke-dasharray="326.7"
                      :stroke-dashoffset="326.7 * (1 - Math.min(compressResult.savedPct, 100) / 100)"
                      transform="rotate(-90 60 60)"
                      style="transition: stroke-dashoffset 1.2s cubic-bezier(.16,1,.3,1)"
                    />
                  </svg>
                  <div class="cr-circle-text">
                    <span class="cr-pct">{{ compressResult.savedPct }}%</span>
                    <span class="cr-label">lebih kecil</span>
                  </div>
                </div>
                <div class="cr-info">
                  <h3>PDF berhasil dikompres!</h3>
                  <p class="cr-sizes">
                    <span>{{ fmtSize(compressResult.originalSize) }}</span>
                    <ArrowRight :size="14" class="cr-arrow" />
                    <span class="cr-new">{{ fmtSize(compressResult.compressedSize) }}</span>
                  </p>
                  <p class="cr-saved">Menghemat {{ fmtSize(compressResult.saved) }}</p>
                  <p v-if="compressResult.imagesCompressed" class="cr-saved" style="color:var(--text-3);font-size:12px">
                    {{ compressResult.imagesCompressed }} dari {{ compressResult.imagesFound }} gambar dikompres
                  </p>
                  <div class="cr-actions">
                    <button class="btn btn-primary" @click="dl(results[0])">
                      <Download :size="14" /> Unduh PDF
                    </button>
                    <button class="btn btn-outline" @click="compressResult = null; reset(); files = []">
                      Kompres File Lain
                    </button>
                  </div>
                </div>
              </template>
            </div>

            <template v-else>
              <div class="compress-layout" v-if="files.length">
                <div class="compress-left">
                  <div class="compress-file-card">
                    <div class="compress-file-icon"><File :size="48" :stroke-width="1" /></div>
                    <div class="compress-file-name">{{ files[0].name }}</div>
                    <div class="compress-file-size">{{ fmtSize(files[0].size) }}</div>
                    <button class="compress-change" @click="files = []">Ganti File</button>
                  </div>
                </div>

                <div class="compress-right">
                  <!-- Mode unggulan: Smart -->
                  <div class="cl-smart-wrap">
                    <div class="cl-smart-label">Direkomendasikan untuk CV &amp; Dokumen Campuran</div>
                    <button class="cl-item cl-item-smart" :class="{ sel: compressLevel === 'smart' }" @click="compressLevel = 'smart'">
                      <div class="cl-text">
                        <div class="cl-name-row">
                          <span class="cl-name">Cerdas — Kompres Gambar Saja</span>
                          <span class="cl-badge badge-blue">Teks &amp; Link Utuh</span>
                        </div>
                        <span class="cl-desc">
                          Mencari semua foto/gambar dalam PDF → kompres gambarnya saja → teks, font, dan link <strong>tidak diubah sama sekali</strong>
                        </span>
                        <span class="cl-est">~20–60% lebih kecil · Terbaik: CV, surat lamaran, laporan dengan foto</span>
                      </div>
                      <span class="cl-check" v-if="compressLevel === 'smart'"><Check :size="11" :stroke-width="2.5" /></span>
                    </button>
                  </div>

                  <div class="cl-divider">— atau pilih manual —</div>

                  <!-- Kategori 1: Lossless -->
                  <div class="cl-category">
                    <div class="cl-cat-label">
                      <span class="cl-cat-dot" style="background:#22C55E"></span>
                      Tanpa Kehilangan Kualitas — untuk PDF Teks &amp; Dokumen
                    </div>
                    <div class="compress-list">
                      <button class="cl-item" :class="{ sel: compressLevel === 'clean' }" @click="compressLevel = 'clean'">
                        <div class="cl-text">
                          <div class="cl-name-row">
                            <span class="cl-name">Bersih Aman</span>
                            <span class="cl-badge badge-green">Teks &amp; Link Utuh</span>
                          </div>
                          <span class="cl-desc">Hapus metadata, JS, thumbnail tersembunyi</span>
                          <span class="cl-est">~5–15% lebih kecil</span>
                        </div>
                        <span class="cl-check" v-if="compressLevel === 'clean'"><Check :size="11" :stroke-width="2.5" /></span>
                      </button>

                      <button class="cl-item" :class="{ sel: compressLevel === 'deep_clean' }" @click="compressLevel = 'deep_clean'">
                        <div class="cl-text">
                          <div class="cl-name-row">
                            <span class="cl-name">Bersih Penuh</span>
                            <span class="cl-badge badge-green">Teks &amp; Link Utuh</span>
                          </div>
                          <span class="cl-desc">Hapus metadata + anotasi + bookmark + tag aksesibilitas</span>
                          <span class="cl-est">~15–40% lebih kecil</span>
                        </div>
                        <span class="cl-check" v-if="compressLevel === 'deep_clean'"><Check :size="11" :stroke-width="2.5" /></span>
                      </button>
                    </div>
                    <div class="note note-blue" v-if="['clean','deep_clean'].includes(compressLevel)" style="margin-top:8px">
                      <Info :size="13" style="flex-shrink:0;margin-top:1px" />
                      <span style="font-size:12px">Teks, gambar, dan font 100% tidak berubah. Hanya elemen tersembunyi yang dihapus. Pilihan terbaik untuk dokumen teks.</span>
                    </div>
                  </div>

                  <!-- Kategori 2: Lossy -->
                  <div class="cl-category" style="margin-top:14px">
                    <div class="cl-cat-label">
                      <span class="cl-cat-dot" style="background:#F59E0B"></span>
                      Konversi ke Gambar — khusus PDF Scan / Foto
                    </div>
                    <div class="compress-list">
                      <button class="cl-item" :class="{ sel: compressLevel === 'light' }" @click="compressLevel = 'light'">
                        <div class="cl-text">
                          <div class="cl-name-row">
                            <span class="cl-name">Cetak (108 DPI)</span>
                            <span class="cl-badge badge-yellow">Teks → Gambar</span>
                          </div>
                          <span class="cl-desc">JPEG kualitas tinggi · Cocok untuk dokumen yang perlu dicetak</span>
                          <span class="cl-est">~30–60% lebih kecil</span>
                        </div>
                        <span class="cl-check" v-if="compressLevel === 'light'"><Check :size="11" :stroke-width="2.5" /></span>
                      </button>

                      <button class="cl-item" :class="{ sel: compressLevel === 'standard' }" @click="compressLevel = 'standard'">
                        <div class="cl-text">
                          <div class="cl-name-row">
                            <span class="cl-name">Berbagi (72 DPI)</span>
                            <span class="cl-badge badge-yellow">Teks → Gambar</span>
                          </div>
                          <span class="cl-desc">JPEG standar · Cukup jelas di layar, efisien untuk kirim</span>
                          <span class="cl-est">~50–75% lebih kecil</span>
                        </div>
                        <span class="cl-check" v-if="compressLevel === 'standard'"><Check :size="11" :stroke-width="2.5" /></span>
                      </button>

                      <button class="cl-item" :class="{ sel: compressLevel === 'max' }" @click="compressLevel = 'max'">
                        <div class="cl-text">
                          <div class="cl-name-row">
                            <span class="cl-name">Maks (50 DPI)</span>
                            <span class="cl-badge badge-red">Kualitas Rendah</span>
                          </div>
                          <span class="cl-desc">Agresif, file sekecil mungkin · Hanya untuk preview</span>
                          <span class="cl-est">~65–90% lebih kecil</span>
                        </div>
                        <span class="cl-check" v-if="compressLevel === 'max'"><Check :size="11" :stroke-width="2.5" /></span>
                      </button>
                    </div>
                    <div class="note note-yellow" v-if="['light','standard','max'].includes(compressLevel)" style="margin-top:8px">
                      <AlertTriangle :size="13" style="flex-shrink:0;margin-top:1px" />
                      <span style="font-size:12px"><strong>Teks tidak bisa diseleksi, link hilang.</strong> Gunakan hanya untuk PDF scan, foto, atau brosur.</span>
                    </div>
                  </div>

                  <ProgressBar :value="progress" :label="progLabel"
                    :steps="[{pct:10,name:'Membaca'},{pct:50,name:'Kompresi'},{pct:90,name:'Menyimpan'},{pct:100,name:'Selesai'}]" />
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

              <DropZone v-else icon="Minimize2" file-type="pdf" accept=".pdf"
                title="Pilih file PDF untuk dikompres"
                subtitle="Semua diproses di browser — file tidak dikirim ke server"
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

          <!-- CROP -->
          <template v-if="tool.id === 'crop'">
            <DropZone icon="Crop" file-type="pdf" accept=".pdf"
              title="Pilih file PDF"
              subtitle="Potong margin dari semua halaman PDF"
              @files="setSingle" />
            <FileList :files="files" @remove="removeFile" />
            <div class="opts-block" v-if="files.length">
              <span class="opts-label">Margin yang dipotong (mm)</span>
              <div class="field-row">
                <div class="field"><label>Atas</label><input type="number" v-model.number="cropTop"    min="0" max="200" /></div>
                <div class="field"><label>Kanan</label><input type="number" v-model.number="cropRight"  min="0" max="200" /></div>
                <div class="field"><label>Bawah</label><input type="number" v-model.number="cropBottom" min="0" max="200" /></div>
                <div class="field"><label>Kiri</label><input type="number" v-model.number="cropLeft"   min="0" max="200" /></div>
              </div>
              <span class="opts-label" style="margin-top:14px">Preset Cepat</span>
              <div class="opts-row">
                <button class="chip" @click="cropTop=10;cropRight=10;cropBottom=10;cropLeft=10">Hapus 10mm</button>
                <button class="chip" @click="cropTop=15;cropRight=15;cropBottom=15;cropLeft=15">Hapus 15mm</button>
                <button class="chip" @click="cropTop=20;cropRight=20;cropBottom=20;cropLeft=20">Hapus 20mm</button>
                <button class="chip" @click="cropTop=0;cropRight=0;cropBottom=0;cropLeft=0">Reset</button>
              </div>
            </div>
            <div class="action-bar">
              <span></span>
              <button class="btn btn-primary" :disabled="!files.length || processing" @click="run">
                <span v-if="processing" class="spinner" />
                <Crop v-else :size="15" />
                {{ processing ? 'Memotong…' : 'Potong PDF' }}
              </button>
            </div>
          </template>

          <!-- REPAIR -->
          <template v-if="tool.id === 'repair'">
            <DropZone icon="Wrench" file-type="pdf" accept=".pdf"
              title="Pilih file PDF yang rusak"
              subtitle="Sistem akan mencoba memulihkan data dari file PDF yang bermasalah"
              @files="setSingle" />
            <FileList :files="files" @remove="removeFile" />
            <div class="note note-blue" v-if="files.length" style="margin-top:14px">
              <Info :size="14" style="flex-shrink:0;margin-top:1px" />
              <span>Proses ini memperbaiki struktur PDF yang rusak ringan hingga sedang. PDF yang sangat rusak atau terenkripsi penuh mungkin tidak dapat dipulihkan sepenuhnya.</span>
            </div>
            <div class="action-bar">
              <span></span>
              <button class="btn btn-primary" :disabled="!files.length || processing" @click="run">
                <span v-if="processing" class="spinner" />
                <Wrench v-else :size="15" />
                {{ processing ? 'Memperbaiki…' : 'Perbaiki PDF' }}
              </button>
            </div>
          </template>

          <!-- SIGN -->
          <template v-if="tool.id === 'sign'">
            <DropZone v-if="!files.length" icon="PenLine" file-type="pdf" accept=".pdf"
              title="Pilih file PDF"
              subtitle="Gambar tanda tangan dan sisipkan ke dokumen"
              @files="setSingle" />
            <div v-if="files.length" class="sign-layout">
              <div class="sign-pad-section">
                <span class="opts-label">Gambar tanda tangan</span>
                <div class="sign-pad-wrap">
                  <canvas ref="signCanvasRef" class="sign-canvas" width="380" height="190"
                    @mousedown="signStartDraw" @mousemove="signDraw" @mouseup="signEndDraw" @mouseleave="signEndDraw"
                    @touchstart.prevent="signStartDraw" @touchmove.prevent="signDraw" @touchend="signEndDraw"
                  ></canvas>
                  <div class="sign-hint" v-if="!signHasDrawing">Gambar tanda tangan di sini</div>
                </div>
                <button class="sign-clear-btn" @click="signClear">Hapus &amp; Ulangi</button>
              </div>
              <div class="sign-opts-section">
                <span class="opts-label">Halaman</span>
                <div class="opts-row">
                  <button class="chip" :class="{ sel: signPagePos === 'last' }"  @click="signPagePos = 'last'">Terakhir</button>
                  <button class="chip" :class="{ sel: signPagePos === 'first' }" @click="signPagePos = 'first'">Pertama</button>
                  <button class="chip" :class="{ sel: signPagePos === 'all' }"   @click="signPagePos = 'all'">Semua</button>
                </div>
                <span class="opts-label" style="margin-top:16px">Posisi</span>
                <div class="opts-row">
                  <button class="chip" :class="{ sel: signPosition === 'bottom-right' }"  @click="signPosition = 'bottom-right'">Kanan Bawah</button>
                  <button class="chip" :class="{ sel: signPosition === 'bottom-left' }"   @click="signPosition = 'bottom-left'">Kiri Bawah</button>
                  <button class="chip" :class="{ sel: signPosition === 'bottom-center' }" @click="signPosition = 'bottom-center'">Tengah Bawah</button>
                </div>
                <span class="opts-label" style="margin-top:16px">Ukuran</span>
                <div class="opts-row">
                  <button class="chip" :class="{ sel: signWidth === 100 }" @click="signWidth = 100">Kecil</button>
                  <button class="chip" :class="{ sel: signWidth === 150 }" @click="signWidth = 150">Sedang</button>
                  <button class="chip" :class="{ sel: signWidth === 220 }" @click="signWidth = 220">Besar</button>
                </div>
              </div>
            </div>
            <div class="action-bar" v-if="files.length">
              <button class="btn btn-outline" @click="files = []; signClear()">
                <ChevronLeft :size="14" /> Ganti File
              </button>
              <button class="btn btn-primary" :disabled="!signHasDrawing || processing" @click="run">
                <span v-if="processing" class="spinner" />
                <PenLine v-else :size="15" />
                {{ processing ? 'Menambahkan…' : 'Tambahkan Tanda Tangan' }}
              </button>
            </div>
          </template>

          <!-- REDACT -->
          <template v-if="tool.id === 'redact'">
            <DropZone v-if="!files.length" icon="Eraser" file-type="pdf" accept=".pdf"
              title="Pilih file PDF"
              subtitle="Gambar kotak hitam untuk menyamarkan area sensitif secara permanen"
              @files="loadPageThumbsFor('redact', $event)" />

            <!-- Edit halaman aktif -->
            <div v-if="files.length && rdEditingPage !== null" class="rd-edit-wrap">
              <div class="rd-edit-header">
                <button class="btn btn-outline" style="padding:7px 14px;font-size:13px" @click="rdDoneEditing">
                  <ChevronLeft :size="13" /> Kembali
                </button>
                <span class="rd-edit-title">Halaman {{ rdEditingPage + 1 }}</span>
                <span class="rd-edit-hint">Seret untuk membuat kotak redaksi</span>
              </div>
              <div class="rd-canvas-wrap">
                <canvas ref="rdCanvasRef" class="rd-draw-canvas"
                  @mousedown="rdStartRect" @mousemove="rdMoveRect"
                  @mouseup="rdEndRect" @mouseleave="rdEndRect"
                ></canvas>
              </div>
              <div class="action-bar">
                <button class="btn btn-outline" @click="rdCurrentRects = []; rdRedrawCanvas()">Hapus Semua Kotak</button>
                <button class="btn btn-primary" @click="rdDoneEditing">
                  <Check :size="14" /> Selesai Edit Halaman
                </button>
              </div>
            </div>

            <!-- Grid halaman -->
            <template v-if="files.length && rdEditingPage === null && !results.length">
              <div class="pp-info-bar">
                <span class="opts-label" style="margin:0">Klik "Edit" pada halaman untuk menambah area redaksi</span>
                <span class="pp-count-badge"
                  v-if="Object.keys(rdRedactions).filter(k => rdRedactions[k]?.length).length">
                  {{ Object.keys(rdRedactions).filter(k => rdRedactions[k]?.length).length }} halaman ditandai
                </span>
              </div>
              <div v-if="rdThumbsLoading" class="pp-loading">Memuat pratinjau halaman…</div>
              <div v-else class="pp-grid">
                <div v-for="pg in rdThumbs" :key="pg.index"
                  class="pp-item rd-pp-item"
                  :class="{ 'rd-has-redact': rdRedactions[pg.index]?.length }">
                  <img v-if="pg.thumb" :src="pg.thumb" class="pp-thumb" alt="" />
                  <div v-else class="pp-thumb-ph"><File :size="28" :stroke-width="1" /></div>
                  <div class="rd-badge" v-if="rdRedactions[pg.index]?.length">
                    {{ rdRedactions[pg.index].length }}
                  </div>
                  <div class="pp-num">{{ pg.index + 1 }}</div>
                  <button class="rd-edit-btn" @click="rdOpenPage(pg)">Edit</button>
                </div>
              </div>
              <div class="action-bar">
                <button class="btn btn-outline" @click="files = []; rdThumbs = []; rdRedactions = {}; reset()">Ganti File</button>
                <button class="btn btn-primary"
                  :disabled="!Object.keys(rdRedactions).filter(k => rdRedactions[k]?.length).length || processing"
                  @click="run">
                  <span v-if="processing" class="spinner" />
                  <Eraser v-else :size="15" />
                  {{ processing ? 'Menyamarkan…' : 'Samarkan PDF' }}
                </button>
              </div>
            </template>
          </template>

          <!-- HTML TO PDF -->
          <template v-if="tool.id === 'html2pdf'">
            <div v-if="htmlPreview" class="print-result">
              <div class="print-info">
                <span class="print-check"><Check :size="13" :stroke-width="2.5" /></span>
                <div>
                  <strong>HTML siap dikonversi ke PDF!</strong>
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
                <button class="btn btn-outline" @click="htmlPreview = null; htmlInputText = ''">
                  <ChevronLeft :size="14" /> Edit Ulang
                </button>
                <button class="btn btn-primary" @click="printHtml(htmlPreview.html)">
                  <Printer :size="15" /> Cetak / Simpan sebagai PDF
                </button>
              </div>
            </div>
            <template v-else>
              <div class="opts-block">
                <span class="opts-label">Tempel kode HTML</span>
                <textarea v-model="htmlInputText" class="html-textarea"
                  placeholder="Tempel kode HTML di sini… Bisa dokumen lengkap atau fragmen seperti &lt;h1&gt;, &lt;p&gt;, &lt;table&gt;, dll."
                ></textarea>
              </div>
              <div class="note note-blue" style="margin-top:12px">
                <Info :size="14" style="flex-shrink:0;margin-top:1px" />
                <span>Tempel kode HTML lengkap atau fragmen. Hasil akan dirender dan siap dicetak sebagai PDF lewat dialog cetak browser.</span>
              </div>
              <div class="action-bar">
                <span></span>
                <button class="btn btn-primary" :disabled="!htmlInputText.trim()" @click="run">
                  <Code2 :size="15" /> Konversi ke PDF
                </button>
              </div>
            </template>
          </template>

          <!-- SHARED: Progress + Error + Result -->
          <template v-if="tool.id !== 'compress' || !compressResult">
            <ProgressBar v-if="!htmlPreview" :value="progress" :label="progLabel" :steps="progressSteps" />
            <Transition name="err-fade">
              <div class="error-box" v-if="errMsg && tool.id !== 'compress'">
                <AlertTriangle :size="15" /> {{ errMsg }}
              </div>
            </Transition>
            <ResultBox :results="results" v-if="!['compress','word2pdf','excel2pdf','html2pdf'].includes(tool.id)" />
          </template>

          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, inject, nextTick, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
// Jangan impor ikon `Image` di sini: binding-nya akan menutupi window.Image
// global, sehingga `new Image()` di bawah melempar "Image is not a constructor".
import {
  ChevronLeft, GripVertical, X, File, Plus, GitMerge,
  Scissors, Minimize2, RotateCw, ListOrdered, Hash,
  Camera, FileText, BarChart2, FileOutput, FileSpreadsheet,
  ArrowRight, Check, AlertTriangle, Info, Download, Printer,
  Lock, Unlock, Eye, EyeOff, FileMinus, Copy, Layers,
  RefreshCw, AlignLeft, List,
  Crop, Wrench, PenLine, Eraser, Code2,
} from '@lucide/vue'
import AppIcon     from '../components/AppIcon.vue'
import DropZone    from '../components/DropZone.vue'
import FileList    from '../components/FileList.vue'
import ProgressBar from '../components/ProgressBar.vue'
import ResultBox   from '../components/ResultBox.vue'

import { useTool }                    from '../composables/useTools.js'
import { usePdfProcessor, loadPDFjs } from '../composables/usePdfProcessor.js'

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
  doCropPDF, doRepairPDF, doSignPDF, doRedactPDF,
} = usePdfProcessor()

const files    = ref([])
const previews = ref([])

const mergePreviews   = ref([])
const mergePageCounts = ref([])
const mgFrom          = ref(-1)

async function generatePdfThumbnail(file) {
  try {
    await loadPDFjs()
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
const compressLevel  = ref('smart')
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

// Crop
const cropTop    = ref(0)
const cropRight  = ref(0)
const cropBottom = ref(0)
const cropLeft   = ref(0)

// Sign
const signCanvasRef  = ref(null)
const signIsDrawing  = ref(false)
const signLastX      = ref(0)
const signLastY      = ref(0)
const signHasDrawing = ref(false)
const signPagePos    = ref('last')
const signPosition   = ref('bottom-right')
const signWidth      = ref(150)

function signStartDraw(e) {
  signIsDrawing.value = true
  const canvas = signCanvasRef.value
  const rect   = canvas.getBoundingClientRect()
  const cx = e.touches ? e.touches[0].clientX : e.clientX
  const cy = e.touches ? e.touches[0].clientY : e.clientY
  signLastX.value = (cx - rect.left) * (canvas.width / rect.width)
  signLastY.value = (cy - rect.top)  * (canvas.height / rect.height)
}
function signDraw(e) {
  if (!signIsDrawing.value) return
  const canvas = signCanvasRef.value
  const rect   = canvas.getBoundingClientRect()
  const cx = e.touches ? e.touches[0].clientX : e.clientX
  const cy = e.touches ? e.touches[0].clientY : e.clientY
  const x  = (cx - rect.left) * (canvas.width  / rect.width)
  const y  = (cy - rect.top)  * (canvas.height / rect.height)
  const ctx = canvas.getContext('2d')
  ctx.beginPath(); ctx.moveTo(signLastX.value, signLastY.value); ctx.lineTo(x, y)
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.stroke()
  signLastX.value = x; signLastY.value = y; signHasDrawing.value = true
}
function signEndDraw() { signIsDrawing.value = false }
function signClear() {
  const canvas = signCanvasRef.value
  if (!canvas) return
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
  signHasDrawing.value = false
}

// Redact
const rdThumbs        = ref([])
const rdThumbsLoading = ref(false)
const rdRedactions    = ref({})   // { pageIndex: [{relX,relY,relW,relH,x,y,w,h}] }
const rdEditingPage   = ref(null)
const rdCanvasRef     = ref(null)
const rdBaseImage     = ref(null)
const rdIsDrawing     = ref(false)
const rdStartX        = ref(0)
const rdStartY        = ref(0)
const rdCurrentRects  = ref([])
const rdCurrentDraw   = ref(null)

function rdGetXY(e) {
  const canvas = rdCanvasRef.value
  const rect   = canvas.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left) * (canvas.width  / rect.width),
    y: (e.clientY - rect.top)  * (canvas.height / rect.height),
  }
}
function rdStartRect(e) {
  rdIsDrawing.value = true
  const { x, y } = rdGetXY(e)
  rdStartX.value = x; rdStartY.value = y
}
function rdMoveRect(e) {
  if (!rdIsDrawing.value) return
  const { x, y } = rdGetXY(e)
  const rx = Math.min(rdStartX.value, x), ry = Math.min(rdStartY.value, y)
  const rw = Math.abs(x - rdStartX.value), rh = Math.abs(y - rdStartY.value)
  rdCurrentDraw.value = { x: rx, y: ry, w: rw, h: rh }
  rdRedrawCanvas()
}
function rdEndRect(e) {
  if (!rdIsDrawing.value) return
  rdIsDrawing.value = false
  const d = rdCurrentDraw.value
  if (d && d.w > 5 && d.h > 5) {
    const canvas = rdCanvasRef.value
    rdCurrentRects.value = [...rdCurrentRects.value, {
      x: d.x, y: d.y, w: d.w, h: d.h,
      relX: d.x / canvas.width, relY: d.y / canvas.height,
      relW: d.w / canvas.width, relH: d.h / canvas.height,
    }]
  }
  rdCurrentDraw.value = null
  rdRedrawCanvas()
}
function rdRedrawCanvas() {
  const canvas = rdCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (rdBaseImage.value) ctx.drawImage(rdBaseImage.value, 0, 0, canvas.width, canvas.height)
  ctx.fillStyle = 'rgba(0,0,0,0.88)'
  for (const r of rdCurrentRects.value) ctx.fillRect(r.x, r.y, r.w, r.h)
  if (rdCurrentDraw.value) {
    const d = rdCurrentDraw.value
    ctx.fillStyle = 'rgba(220,38,38,0.35)'
    ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2
    ctx.fillRect(d.x, d.y, d.w, d.h); ctx.strokeRect(d.x, d.y, d.w, d.h)
  }
}
async function rdOpenPage(pg) {
  rdEditingPage.value = pg.index
  rdCurrentRects.value = rdRedactions.value[pg.index]
    ? rdRedactions.value[pg.index].map(r => ({ ...r })) : []
  rdBaseImage.value = null; rdCurrentDraw.value = null
  try {
    await loadPDFjs()
    const ab  = await new Promise((res, rej) => {
      const r = new FileReader(); r.onload = e => res(e.target.result); r.onerror = rej; r.readAsArrayBuffer(files.value[0])
    })
    const pdf  = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise
    const page = await pdf.getPage(pg.index + 1)
    const vp   = page.getViewport({ scale: 1.5 })
    const cv   = document.createElement('canvas')
    cv.width   = Math.round(vp.width); cv.height = Math.round(vp.height)
    const ctx  = cv.getContext('2d')
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height)
    await page.render({ canvasContext: ctx, viewport: vp }).promise
    await nextTick()
    const canvasEl = rdCanvasRef.value
    if (canvasEl) {
      canvasEl.width = cv.width; canvasEl.height = cv.height
      const img = new Image()
      img.src = cv.toDataURL('image/jpeg', 0.9)
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej })
      rdBaseImage.value = img
      rdRedrawCanvas()
    }
  } catch (e) {
    rdEditingPage.value = null
    errMsg.value = 'Gagal membuka halaman: ' + e.message
  }
}
function rdDoneEditing() {
  if (rdCurrentRects.value.length) {
    rdRedactions.value = { ...rdRedactions.value, [rdEditingPage.value]: rdCurrentRects.value }
  } else {
    const copy = { ...rdRedactions.value }
    delete copy[rdEditingPage.value]
    rdRedactions.value = copy
  }
  rdEditingPage.value = null; rdCurrentRects.value = []; rdBaseImage.value = null; rdCurrentDraw.value = null
}

// HTML ke PDF
const htmlInputText = ref('')

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
  if (mode === 'remove')      { rpThumbs.value = []; rpToDelete.value = []; rpThumbsLoading.value = true }
  else if (mode === 'redact') { rdThumbs.value = []; rdRedactions.value = {}; rdThumbsLoading.value = true }
  else                        { epThumbs.value = []; epSelected.value  = []; epThumbsLoading.value = true }
  try {
    await loadPDFjs()
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
    if (mode === 'remove')      rpThumbs.value = thumbs
    else if (mode === 'redact') rdThumbs.value = thumbs
    else                        epThumbs.value = thumbs
  } catch (e) { errMsg.value = 'Gagal memuat pratinjau: ' + e.message }
  finally {
    if (mode === 'remove')      rpThumbsLoading.value = false
    else if (mode === 'redact') rdThumbsLoading.value = false
    else                        epThumbsLoading.value = false
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
    await loadPDFjs()
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
    crop:        [{ pct:20,name:'Membaca'   }, { pct:70,name:'Memotong'    }, { pct:90,name:'Menyimpan'   },{pct:100,name:'Selesai'}],
    repair:      [{ pct:30,name:'Membaca'   }, { pct:65,name:'Memulihkan'  }, { pct:88,name:'Menyimpan'   },{pct:100,name:'Selesai'}],
    sign:        [{ pct:20,name:'Membaca'   }, { pct:50,name:'Memuat Tanda'}, { pct:80,name:'Menambah'    },{pct:100,name:'Selesai'}],
    redact:      [{ pct:5, name:'Memuat'    }, { pct:30,name:'Merender'    }, { pct:80,name:'Menyamarkan' },{pct:100,name:'Selesai'}],
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
  if (id === 'crop')   await doCropPDF(files.value[0], { top: cropTop.value, right: cropRight.value, bottom: cropBottom.value, left: cropLeft.value })
  if (id === 'repair') await doRepairPDF(files.value[0])
  if (id === 'sign' && signCanvasRef.value) {
    await doSignPDF(files.value[0], signCanvasRef.value.toDataURL('image/png'), signPagePos.value, signPosition.value, signWidth.value)
  }
  if (id === 'redact') await doRedactPDF(files.value[0], rdRedactions.value)
  if (id === 'html2pdf') {
    const trimmed = htmlInputText.value.trim()
    if (!trimmed) return
    const isFullDoc = /^\s*<!doctype|^\s*<html/i.test(trimmed)
    const html = isFullDoc ? trimmed
      : `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>HTML ke PDF</title><style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11pt;line-height:1.6;color:#000;margin:0;padding:20mm}img{max-width:100%;height:auto}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:4px 8px}@media print{body{padding:15mm}}</style></head><body>${trimmed}</body></html>`
    htmlPreview.value = { html, name: 'converted.pdf' }
  }
}

function printHtml(html) {
  const w = window.open('', '_blank', 'width=900,height=700,menubar=yes,toolbar=yes')
  if (!w) { alert('Pop-up diblokir browser. Izinkan pop-up untuk situs ini.'); return }
  w.document.write(html)
  w.document.close()
  setTimeout(() => { w.focus(); w.print() }, 700)
}

function dl(r) { const a = document.createElement('a'); a.href = r.url; a.download = r.name; a.click() }

// Tidak perlu watcher untuk mereset state saat pindah tool: App.vue memberi
// :key="route.path" pada komponen rute, jadi ToolView remount dan seluruh ref
// kembali ke nilai awal. Lepas blob URL milik hasil sebelumnya.
onBeforeUnmount(reset)
</script>

<style scoped>
/* ── Tool page layout ───────────────────────────────────────── */
.tool-page { --tool-clr: #09090B; min-height: 100vh; }

/* Tool Hero */
.tool-hero {
  background: #fff;
  border-bottom: 1px solid rgba(0,0,0,.07);
  padding: 28px 0 36px;
}
.tool-hero-inner {
  max-width: 860px;
  margin: 0 auto;
  padding: 0 28px;
}
.th-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-3);
  text-decoration: none;
  margin-bottom: 20px;
  transition: color .15s;
}
.th-back:hover { color: var(--text); }
.th-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
}
.th-icon {
  width: 72px; height: 72px;
  border-radius: 20px;
  background: var(--tool-clr);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 16px color-mix(in srgb, var(--tool-clr) 40%, transparent);
}
.th-title {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -.4px;
  color: var(--c-950);
  line-height: 1.15;
}
.th-desc {
  font-size: 14px;
  color: var(--text-2);
  max-width: 440px;
  line-height: 1.6;
}

/* Tool Workspace */
.tool-workspace { padding: 36px 0 80px; }
.workspace-inner { max-width: 800px; margin: 0 auto; padding: 0 24px; }

.workspace-card {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.04);
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
.btn-primary { background: var(--tool-clr, var(--c-950)); color: #fff; }
.btn-primary:hover    { opacity: .88; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,.2); }
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

.not-found-page { text-align: center; padding: 80px 24px; color: var(--text-2); }

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

.cl-smart-wrap {
  margin-bottom: 4px;
}
.cl-smart-label {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: .5px;
  text-transform: uppercase;
  color: #6366F1;
  margin-bottom: 7px;
}
.cl-item-smart {
  border-color: #6366F1 !important;
  background: #f5f3ff !important;
}
.cl-item-smart.sel {
  background: #ede9fe !important;
}
.badge-blue { background: #ede9fe; color: #4338ca; }
.cl-divider {
  text-align: center;
  font-size: 11px;
  color: var(--text-3);
  margin: 14px 0 10px;
  position: relative;
}

.cl-category { }
.cl-cat-label {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .5px;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: 8px;
}
.cl-cat-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Compress result */
.compress-result { display: flex; align-items: center; gap: 40px; padding: 32px; animation: fadeUp .5s cubic-bezier(.16,1,.3,1); }
.cr-circle-wrap  { position: relative; flex-shrink: 0; }
.cr-circle       { width: 130px; height: 130px; }
.cr-circle-text  { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
.cr-pct          { font-size: 28px; font-weight: 800; color: var(--c-950); line-height: 1; font-variant-numeric: tabular-nums; }
.cr-label        { font-size: 11px; color: var(--text-3); font-weight: 500; }
.cr-info-full    { flex: 1; }
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
/* Sengaja bukan "fade": CSS scoped komponen anak juga berlaku di elemen root-nya,
   jadi nama "fade" akan tertimpa/menimpa transisi halaman milik App.vue. */
.err-fade-enter-active, .err-fade-leave-active { transition: all .25s ease; }
.err-fade-enter-from, .err-fade-leave-to       { opacity: 0; transform: translateY(4px); }
.list-enter-active, .list-leave-active { transition: all .2s ease; }
.list-enter-from, .list-leave-to       { opacity: 0; transform: translateX(-8px); }

@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pop    { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }

@media (max-width: 768px) {
  .tool-hero { padding: 20px 0 28px; }
  .tool-hero-inner { padding: 0 20px; }
  .th-title { font-size: 22px; }
  .th-icon  { width: 60px; height: 60px; border-radius: 16px; }
  .th-icon :deep(svg) { width: 28px; height: 28px; }
  .workspace-inner { padding: 0 16px; }
  .tool-workspace { padding: 24px 0 60px; }
}
@media (max-width: 640px) {
  .workspace-card { padding: 20px 16px; border-radius: 16px; }
  .action-bar { flex-direction: column; align-items: stretch; }
  .btn { width: 100%; justify-content: center; }
  .compress-layout { grid-template-columns: 1fr; }
  .compress-left { border-right: none; border-bottom: 1px solid var(--border); padding: 20px; border-radius: 16px 16px 0 0; }
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

/* ── Sign PDF ──────────────────────────────────────────────── */
.sign-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 20px; }
.sign-pad-section, .sign-opts-section { display: flex; flex-direction: column; gap: 10px; }
.sign-pad-wrap { position: relative; border: 1.5px dashed var(--border); border-radius: var(--radius-sm); background: #f9f9f9; overflow: hidden; }
.sign-canvas { display: block; width: 100%; cursor: crosshair; touch-action: none; user-select: none; }
.sign-hint { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 13px; color: var(--c-300); pointer-events: none; }
.sign-clear-btn { align-self: flex-start; padding: 5px 12px; border: 1px solid var(--border); border-radius: 6px; font-size: 12px; font-weight: 500; color: var(--text-2); background: var(--surface); cursor: pointer; font-family: var(--font); transition: all .15s; }
.sign-clear-btn:hover { border-color: var(--c-400); color: var(--text); }
@media (max-width: 640px) {
  .sign-layout { grid-template-columns: 1fr; }
}

/* ── Redact PDF ─────────────────────────────────────────────── */
.rd-edit-wrap { display: flex; flex-direction: column; gap: 16px; }
.rd-edit-header { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.rd-edit-title { font-size: 14px; font-weight: 600; color: var(--text); }
.rd-edit-hint  { font-size: 12px; color: var(--text-3); }
.rd-canvas-wrap { border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: auto; background: var(--bg); max-height: 62vh; display: flex; justify-content: center; align-items: flex-start; }
.rd-draw-canvas { cursor: crosshair; display: block; max-width: 100%; touch-action: none; user-select: none; }
.rd-pp-item { cursor: default; }
.rd-edit-btn { position: absolute; bottom: 22px; left: 50%; transform: translateX(-50%); white-space: nowrap; padding: 3px 9px; border: none; border-radius: 4px; font-size: 10px; font-weight: 700; background: var(--c-950); color: var(--c-white); cursor: pointer; font-family: var(--font); letter-spacing: .3px; }
.rd-edit-btn:hover { background: var(--c-700); }
.rd-has-redact { border-color: #f97316 !important; }
.rd-badge { position: absolute; top: 5px; right: 5px; background: #f97316; color: #fff; font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 3px; pointer-events: none; }

/* ── HTML ke PDF ────────────────────────────────────────────── */
.html-textarea {
  width: 100%;
  height: 240px;
  padding: 12px 14px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  font-family: ui-monospace, 'Cascadia Code', 'Fira Code', monospace;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--text);
  background: var(--surface);
  outline: none;
  resize: vertical;
  transition: border-color .15s;
}
.html-textarea:focus { border-color: var(--c-500); }
</style>
