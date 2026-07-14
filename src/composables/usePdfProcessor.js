import { ref } from 'vue'
// @cantoo/pdf-lib, bukan pdf-lib. API-nya sama persis, bedanya fork ini punya
// dukungan enkripsi: doc.encrypt() dan PDFDocument.load(bytes, { password }).
// pdf-lib asli tidak punya keduanya, jadi Proteksi & Buka Kunci PDF mustahil.
import { PDFDocument, rgb, StandardFonts, degrees, PDFRawStream, PDFName } from '@cantoo/pdf-lib'

export async function loadPDFjs() {
  if (window._pdfjsReady) return
  await new Promise((res, rej) => {
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    s.onload = res; s.onerror = rej
    document.head.appendChild(s)
  })
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
  window._pdfjsReady = true
}

function loadScriptOnce(src, windowKey) {
  if (window[windowKey]) return Promise.resolve()
  return new Promise((res, rej) => {
    const s = document.createElement('script')
    s.src = src
    s.onload = res
    s.onerror = () => rej(new Error('Gagal memuat library: ' + src))
    document.head.appendChild(s)
  })
}

async function loadMammoth() {
  await loadScriptOnce(
    'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
    'mammoth'
  )
}

async function loadXLSX() {
  await loadScriptOnce(
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'XLSX'
  )
}

async function loadJSZip() {
  await loadScriptOnce(
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    'JSZip'
  )
}

// Nama berkas hasil selalu "<nama asli>_pdfstudio<.ext>", mis. "Laporan Q3.pdf"
// menjadi "Laporan Q3_pdfstudio.pdf". `suffix` dipakai bila satu sumber
// menghasilkan banyak berkas (mis. per halaman saat split / PDF ke JPG).
function outputName(source, ext, suffix = '') {
  const raw  = typeof source === 'string' ? source : (source?.name || '')
  const base = raw
    .replace(/\.[^.]+$/, '')        // buang ekstensi asli
    .replace(/[\\/:*?"<>|]/g, '_')  // karakter yang ilegal di nama berkas
    .trim()
  return `${base || 'dokumen'}${suffix}_pdfstudio${ext}`
}

// pdf-lib melempar string biasa, bukan objek Error, di beberapa jalur (mis.
// embedPng menolak berkas non-PNG). Membaca .message dari string menghasilkan
// undefined, sehingga user melihat "Gagal konversi: undefined".
function pesanError(e) {
  return e?.message ?? String(e ?? 'kesalahan tidak diketahui')
}

function escXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Cluster a list of numeric values into groups based on proximity tolerance
function clusterValues(values, tolerance) {
  const sorted = [...values].sort((a, b) => a - b)
  const clusters = []
  for (const v of sorted) {
    const last = clusters[clusters.length - 1]
    if (!last || v - last.max > tolerance) {
      clusters.push({ max: v, sum: v, count: 1 })
    } else {
      last.max = v; last.sum += v; last.count++
    }
  }
  return clusters.map(c => c.sum / c.count)
}

// Group items by Y position (descending = top-to-bottom in PDF)
function groupByRow(items, tolerance) {
  const sorted = [...items].sort((a, b) => b.y - a.y)
  const groups = []
  for (const item of sorted) {
    const last = groups[groups.length - 1]
    if (!last || Math.abs(item.y - last[0].y) > tolerance) groups.push([item])
    else last.push(item)
  }
  return groups
}

// Find index of nearest center
function nearestIdx(centers, val) {
  let best = 0, bestD = Infinity
  for (let i = 0; i < centers.length; i++) {
    const d = Math.abs(centers[i] - val)
    if (d < bestD) { bestD = d; best = i }
  }
  return best
}

export function usePdfProcessor() {
  const processing = ref(false)
  const progress   = ref(0)
  const progLabel  = ref('')
  const results    = ref([])
  const errMsg     = ref('')
  // Kabar yang bukan kegagalan — mis. seberapa jauh sebuah PDF rusak bisa dipulihkan.
  const noticeMsg  = ref('')

  let _raf = null
  function setProgress(target, label = '') {
    progLabel.value = label
    cancelAnimationFrame(_raf)
    const start = progress.value
    const t0    = performance.now()
    function step(now) {
      const t = Math.min((now - t0) / 400, 1)
      const e = 1 - Math.pow(1 - t, 3)
      progress.value = Math.round(start + (target - start) * e)
      if (t < 1) _raf = requestAnimationFrame(step)
    }
    _raf = requestAnimationFrame(step)
  }

  function reset() {
    cancelAnimationFrame(_raf)
    processing.value = false
    progress.value   = 0
    progLabel.value  = ''
    // Blob URL tetap menahan memori file sampai di-revoke secara eksplisit.
    results.value.forEach((r) => r.url && URL.revokeObjectURL(r.url))
    results.value    = []
    errMsg.value     = ''
    noticeMsg.value  = ''
  }

  function readAB(file) {
    return new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = (e) => res(e.target.result)
      r.onerror = rej
      r.readAsArrayBuffer(file)
    })
  }
  function fmtSize(b) {
    if (b < 1024)    return b + ' B'
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
    return (b / 1048576).toFixed(2) + ' MB'
  }
  function makeResult(bytes, name) {
    const blob = new Blob([bytes], { type: 'application/pdf' })
    return { url: URL.createObjectURL(blob), name, size: bytes.length, sizeStr: fmtSize(bytes.length) }
  }
  function makeImgResult(dataUrl, name) {
    const arr  = dataUrl.split(',')
    const mime = arr[0].match(/:(.*?);/)[1]
    const bin  = atob(arr[1])
    const u8   = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i)
    const blob = new Blob([u8], { type: mime })
    return { url: URL.createObjectURL(blob), name, isImage: true, sizeStr: fmtSize(blob.size) }
  }

  async function doMerge(files, sizeMode = 'original') {
    processing.value = true; errMsg.value = ''; results.value = []
    try {
      const merged = await PDFDocument.create()

      if (sizeMode === 'original') {
        for (let i = 0; i < files.length; i++) {
          setProgress(Math.round(5 + (i / files.length) * 90), `Menggabung file ${i + 1} / ${files.length}…`)
          const ab    = await readAB(files[i])
          const doc   = await PDFDocument.load(ab, { ignoreEncryption: true })
          const pages = await merged.copyPages(doc, doc.getPageIndices())
          pages.forEach(p => merged.addPage(p))
        }

      } else if (sizeMode === 'fit') {
        const A4W = 595.28, A4H = 841.89

        // Halaman diskalakan, jadi kotak anotasi (link, komentar) harus ikut
        // digeser — kalau tidak, area kliknya meleset dari isinya.
        function transformAnnotations(page, scale, offsetX, offsetY) {
          try {
            const node = page.node
            const ctx  = node.context

            const annotsKey = ctx.obj('Annots')
            if (!node.has(annotsKey)) return

            const annotsVal  = node.get(annotsKey)
            const annotArray = ctx.lookup(annotsVal)
            if (!annotArray) return

            const count = annotArray.size()
            for (let ai = 0; ai < count; ai++) {
              try {
                const annotVal = annotArray.get(ai)
                const annot    = ctx.lookup(annotVal)
                if (!annot) continue

                const rectKey = ctx.obj('Rect')
                if (!annot.has(rectKey)) continue

                const rectVal = annot.get(rectKey)
                const rect    = ctx.lookup(rectVal)
                if (!rect || !rect.size || rect.size() < 4) continue

                const getRectVal = (idx) => {
                  const v = rect.get(idx)
                  return v?.asNumber?.() ?? v?.numberValue ?? v?.value ?? 0
                }

                const x1 = getRectVal(0), y1 = getRectVal(1)
                const x2 = getRectVal(2), y2 = getRectVal(3)

                const nx1 = x1 * scale + offsetX
                const ny1 = y1 * scale + offsetY
                const nx2 = x2 * scale + offsetX
                const ny2 = y2 * scale + offsetY

                const newRect = ctx.obj([nx1, ny1, nx2, ny2])
                annot.set(rectKey, newRect)
              } catch {  }
            }
          } catch { }
        }

        for (let i = 0; i < files.length; i++) {
          setProgress(Math.round(5 + (i / files.length) * 90), `Menyesuaikan file ${i + 1} / ${files.length}…`)
          const ab  = await readAB(files[i])
          const doc = await PDFDocument.load(ab, { ignoreEncryption: true })
          const srcPages = await merged.copyPages(doc, doc.getPageIndices())

          for (const page of srcPages) {
            const { width, height } = page.getSize()

            merged.addPage(page)

            if (Math.abs(width - A4W) < 2 && Math.abs(height - A4H) < 2) continue

            const scale   = Math.min(A4W / width, A4H / height)
            const offsetX = (A4W - width  * scale) / 2
            const offsetY = (A4H - height * scale) / 2

            page.setSize(A4W, A4H)
            page.scaleContent(scale, scale)
            page.translateContent(offsetX, offsetY)

            transformAnnotations(page, scale, offsetX, offsetY)
          }
        }

      } else {
        setProgress(5, 'Memuat engine render…')
        await loadPDFjs()

        let targetW = 595.28, targetH = 841.89
        if (sizeMode === 'first') {
          const ab0 = await readAB(files[0])
          const d0  = await PDFDocument.load(ab0)
          const s   = d0.getPage(0).getSize()
          targetW = s.width; targetH = s.height
        }

        for (let i = 0; i < files.length; i++) {
          const ab     = await readAB(files[i])
          const pdfDoc = await pdfjsLib.getDocument({ data: ab.slice(0) }).promise
          for (let pn = 1; pn <= pdfDoc.numPages; pn++) {
            const pct = Math.round(8 + ((i + pn / pdfDoc.numPages) / files.length) * 84)
            setProgress(pct, `File ${i + 1}/${files.length} — hal. ${pn}/${pdfDoc.numPages}…`)
            const page = await pdfDoc.getPage(pn)
            const vp0  = page.getViewport({ scale: 1 })
            const sc   = Math.min(targetW / vp0.width, targetH / vp0.height) * 2
            const vp   = page.getViewport({ scale: sc })
            const cv   = document.createElement('canvas')
            cv.width   = Math.round(vp.width); cv.height = Math.round(vp.height)
            const ctx  = cv.getContext('2d')
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height)
            await page.render({ canvasContext: ctx, viewport: vp }).promise
            const pngBytes = await new Promise(r => cv.toBlob(b => b.arrayBuffer().then(r), 'image/png'))
            const img = await merged.embedPng(pngBytes)
            const np  = merged.addPage([targetW, targetH])
            const iw  = img.width / 2, ih = img.height / 2
            np.drawImage(img, { x: (targetW - iw) / 2, y: (targetH - ih) / 2, width: iw, height: ih })
          }
        }
      }

      setProgress(96, 'Menyimpan…')
      results.value = [makeResult(await merged.save({ useObjectStreams: true }), outputName(files[0], '.pdf'))]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal menggabung: ' + pesanError(e); console.error(e) }
    finally { processing.value = false }
  }

  async function doSplit(file, mode = 'all', from = 1, to = 1) {
    processing.value = true; errMsg.value = ''; results.value = []
    try {
      const ab    = await readAB(file)
      const src   = await PDFDocument.load(ab)
      const total = src.getPageCount()
      const idxs  = mode === 'all'
        ? Array.from({ length: total }, (_, i) => i)
        : Array.from(
            { length: Math.min(total, to) - Math.max(1, from) + 1 },
            (_, i) => Math.max(1, from) - 1 + i
          )

      const res = []
      for (let i = 0; i < idxs.length; i++) {
        setProgress(Math.round(5 + (i / idxs.length) * 90), `Memisah halaman ${i + 1} / ${idxs.length}…`)
        const d = await PDFDocument.create()
        const [p] = await d.copyPages(src, [idxs[i]])
        d.addPage(p)
        res.push(makeResult(await d.save(), outputName(file, '.pdf', `_halaman_${idxs[i] + 1}`)))
      }
      results.value = res
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal memisah: ' + pesanError(e) }
    finally { processing.value = false }
  }

  async function doCompress(file, level = 'standard') {
    processing.value = true; errMsg.value = ''; results.value = []
    const originalSize = file instanceof File ? file.size : (file?.size ?? 0)
    try {
      setProgress(8, 'Membaca file…')
      const ab = await readAB(file)

      // ── Lossless modes ────────────────────────────────────────
      if (level === 'clean' || level === 'deep_clean') {
        setProgress(25, 'Memuat struktur PDF…')
        const doc = await PDFDocument.load(ab, { updateMetadata: false, ignoreEncryption: true })
        const ctx = doc.context

        // Selalu hapus (tidak terlihat oleh pengguna)
        try { doc.catalog.delete(ctx.obj('Metadata')) } catch {}   // XMP metadata
        try { doc.catalog.delete(ctx.obj('Names')) } catch {}      // JS tertanam / named JS
        try { doc.catalog.delete(ctx.obj('AA')) } catch {}         // Additional actions (auto-trigger)
        try { doc.catalog.delete(ctx.obj('OpenAction')) } catch {} // Aksi saat buka PDF
        try {
          doc.getPages().forEach(p => {
            try { p.node.delete(ctx.obj('Thumb')) } catch {}        // Thumbnail halaman
          })
        } catch {}

        if (level === 'deep_clean') {
          setProgress(45, 'Menghapus elemen opsional…')
          // Hapus bookmark (outline) — tidak wajib untuk membaca konten
          try { doc.catalog.delete(ctx.obj('Outlines')) } catch {}
          // Hapus tagged PDF structure — hanya untuk aksesibilitas, bukan konten
          try { doc.catalog.delete(ctx.obj('MarkInfo')) } catch {}
          try { doc.catalog.delete(ctx.obj('Lang')) } catch {}
          try { doc.catalog.delete(ctx.obj('StructTreeRoot')) } catch {}
          // Hapus per-halaman
          doc.getPages().forEach(p => {
            try { p.node.delete(ctx.obj('Annots')) } catch {}         // Anotasi (komentar, highlight)
            try { p.node.delete(ctx.obj('Trans')) } catch {}           // Transisi halaman
            try { p.node.delete(ctx.obj('AA')) } catch {}              // Additional actions per halaman
            try { p.node.delete(ctx.obj('StructParents')) } catch {}  // Tagged PDF reference
            try { p.node.delete(ctx.obj('Tabs')) } catch {}           // Tab order form
          })
        }

        setProgress(78, 'Mengoptimasi & menyimpan…')
        const bytes = await doc.save({ useObjectStreams: true })
        const cs       = bytes.length
        const saved    = originalSize - cs
        const savedPct = originalSize > 0 ? Math.max(0, Math.round(saved / originalSize * 100)) : 0
        results.value  = [makeResult(bytes, outputName(file, '.pdf'))]
        setProgress(100, 'Selesai!')
        return { originalSize, compressedSize: cs, saved: Math.max(0, saved), savedPct, bigger: cs >= originalSize }
      }

      // ── Smart: kompres gambar tertanam, teks tetap utuh ─────────
      if (level === 'smart') {
        setProgress(15, 'Memuat PDF…')
        const doc = await PDFDocument.load(ab, { ignoreEncryption: true, updateMetadata: false })
        const ctx = doc.context

        // Lossless cleanup dulu
        try { doc.catalog.delete(ctx.obj('Metadata')) } catch {}
        try { doc.catalog.delete(ctx.obj('Names'))    } catch {}
        try { doc.catalog.delete(ctx.obj('AA'))       } catch {}
        try { doc.catalog.delete(ctx.obj('OpenAction')) } catch {}
        try { doc.getPages().forEach(p => {
          try { p.node.delete(ctx.obj('Thumb'))  } catch {}
          try { p.node.delete(ctx.obj('Annots')) } catch {}
        })} catch {}

        // Kumpulkan semua image XObject ber-filter JPEG (DCTDecode)
        setProgress(25, 'Mencari gambar tertanam…')
        const imgObjects = []
        for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
          if (!(obj instanceof PDFRawStream)) continue
          const dict = obj.dict
          const subtype = dict.get(PDFName.of('Subtype'))
          if (subtype?.toString() !== '/Image') continue
          const filter = dict.get(PDFName.of('Filter'))
          if (filter?.toString() !== '/DCTDecode') continue
          if (dict.get(PDFName.of('SMask'))) continue  // skip transparansi kompleks
          imgObjects.push({ ref, obj, dict })
        }

        let compressed = 0
        const QUALITY  = 0.72

        for (let i = 0; i < imgObjects.length; i++) {
          const { ref, obj, dict } = imgObjects[i]
          setProgress(
            Math.round(28 + (i / Math.max(imgObjects.length, 1)) * 60),
            `Mengompres gambar ${i + 1}/${imgObjects.length}…`
          )
          try {
            const origBytes = obj.contents
            const blob = new Blob([origBytes], { type: 'image/jpeg' })
            const url  = URL.createObjectURL(blob)
            const img  = new Image()
            await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url })
            URL.revokeObjectURL(url)

            const cv  = document.createElement('canvas')
            cv.width  = img.naturalWidth; cv.height = img.naturalHeight
            const c2d = cv.getContext('2d')
            c2d.drawImage(img, 0, 0)

            const newB64   = cv.toDataURL('image/jpeg', QUALITY).split(',')[1]
            const newBytes = Uint8Array.from(atob(newB64), c => c.charCodeAt(0))

            if (newBytes.length < origBytes.length) {
              dict.set(PDFName.of('Length'), ctx.obj(newBytes.length))
              ctx.assign(ref, PDFRawStream.of(dict, newBytes))
              compressed++
            }
          } catch { /* skip gambar yang tidak bisa diproses */ }
        }

        setProgress(92, 'Menyimpan…')
        const bytes    = await doc.save({ useObjectStreams: true })
        const cs       = bytes.length
        const saved    = originalSize - cs
        const savedPct = originalSize > 0 ? Math.max(0, Math.round(saved / originalSize * 100)) : 0
        results.value  = [makeResult(bytes, outputName(file, '.pdf'))]
        setProgress(100, 'Selesai!')
        return {
          originalSize, compressedSize: cs,
          saved: Math.max(0, saved), savedPct,
          bigger: cs >= originalSize,
          imagesFound: imgObjects.length,
          imagesCompressed: compressed,
        }
      }

      // ── Lossy JPEG re-render ──────────────────────────────────
      // Scale = pixel per PDF-point saat render.
      // Semakin KECIL scale → gambar lebih kecil → file lebih kecil.
      // Contoh A4 (595×842 pt):
      //   scale 1.5 → 893×1263 px  (~108 DPI)  kualitas tinggi
      //   scale 1.0 → 595× 842 px  (~72  DPI)  sedang
      //   scale 0.7 → 416× 589 px  (~50  DPI)  kecil
      const cfg = {
        light:    { scale: 1.5,  quality: 0.90 },
        standard: { scale: 1.0,  quality: 0.78 },
        max:      { scale: 0.70, quality: 0.65 },
      }[level] || { scale: 1.0, quality: 0.78 }

      setProgress(5, 'Memuat engine render…')
      await loadPDFjs()

      const srcPDF = await pdfjsLib.getDocument({ data: ab.slice(0) }).promise
      const outDoc = await PDFDocument.create()
      const total  = srcPDF.numPages

      for (let i = 1; i <= total; i++) {
        setProgress(Math.round(10 + (i / total) * 82), `Halaman ${i} / ${total}…`)
        const page = await srcPDF.getPage(i)
        const vp0  = page.getViewport({ scale: 1 })
        const vp   = page.getViewport({ scale: cfg.scale })
        const cv   = document.createElement('canvas')
        cv.width   = Math.round(vp.width); cv.height = Math.round(vp.height)
        const ctx  = cv.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, cv.width, cv.height)
        await page.render({ canvasContext: ctx, viewport: vp }).promise
        const b64   = cv.toDataURL('image/jpeg', cfg.quality).split(',')[1]
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
        const img   = await outDoc.embedJpg(bytes)
        const pg    = outDoc.addPage([vp0.width, vp0.height])
        pg.drawImage(img, { x: 0, y: 0, width: vp0.width, height: vp0.height })
      }

      setProgress(94, 'Menyimpan PDF…')
      const out      = await outDoc.save({ useObjectStreams: true })
      const cs       = out.length
      const saved    = originalSize - cs
      const savedPct = originalSize > 0 ? Math.max(0, Math.round(saved / originalSize * 100)) : 0
      results.value  = [makeResult(out, outputName(file, '.pdf'))]
      setProgress(100, 'Selesai!')
      return { originalSize, compressedSize: cs, saved: Math.max(0, saved), savedPct, bigger: cs >= originalSize }

    } catch (e) {
      errMsg.value = 'Kompresi gagal: ' + pesanError(e)
      console.error('[doCompress]', e)
      return null
    } finally { processing.value = false }
  }

  async function doRotate(file, deg = 90) {
    processing.value = true; errMsg.value = ''; results.value = []
    try {
      const ab    = await readAB(file)
      const doc   = await PDFDocument.load(ab)
      const pages = doc.getPages()
      pages.forEach((p, i) => {
        setProgress(Math.round(5 + (i / pages.length) * 88), `Memutar halaman ${i + 1}…`)
        p.setRotation(degrees((p.getRotation().angle + deg) % 360))
      })
      setProgress(96, 'Menyimpan…')
      results.value = [makeResult(await doc.save(), outputName(file, '.pdf'))]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal memutar: ' + pesanError(e) }
    finally { processing.value = false }
  }

  async function doReorder(file, order) {
    processing.value = true; errMsg.value = ''; results.value = []
    try {
      setProgress(30, 'Membaca halaman…')
      const ab  = await readAB(file)
      const src = await PDFDocument.load(ab)
      const out = await PDFDocument.create()
      setProgress(60, 'Mengatur ulang…')
      const pages = await out.copyPages(src, order)
      pages.forEach(p => out.addPage(p))
      setProgress(88, 'Menyimpan…')
      results.value = [makeResult(await out.save(), outputName(file, '.pdf'))]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal mengatur ulang: ' + pesanError(e) }
    finally { processing.value = false }
  }

  // pdf-lib hanya bisa menanam JPEG dan PNG. WebP, GIF, BMP, dan AVIF ditolak
  // mentah-mentah — padahal DropZone menerima image/* dan menawarkan WebP.
  // Format lain dinormalkan dulu lewat canvas menjadi PNG. Jenis berkas dikenali
  // dari magic bytes, bukan file.type, yang bisa kosong saat berkas diseret.
  async function siapkanGambar(file) {
    const ab = await readAB(file)
    const b  = new Uint8Array(ab)
    const jpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
    const png  = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
    if (jpeg) return { data: ab, jenis: 'jpeg' }
    if (png)  return { data: ab, jenis: 'png' }

    const img = await new Promise((res, rej) => {
      const el  = new Image()
      const url = URL.createObjectURL(file)
      el.onload  = () => { URL.revokeObjectURL(url); res(el) }
      el.onerror = () => { URL.revokeObjectURL(url); rej(new Error(`Format gambar "${file.name}" tidak didukung browser.`)) }
      el.src = url
    })
    const cv = document.createElement('canvas')
    cv.width = img.naturalWidth; cv.height = img.naturalHeight
    cv.getContext('2d').drawImage(img, 0, 0)
    const b64 = cv.toDataURL('image/png').split(',')[1]
    return { data: Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)), jenis: 'png' }
  }

  async function doImg2PDF(files, pageSz = 'A4') {
    processing.value = true; errMsg.value = ''; results.value = []
    try {
      const doc   = await PDFDocument.create()
      const sizes = { A4: [595.28, 841.89], Letter: [612, 792] }
      for (let i = 0; i < files.length; i++) {
        setProgress(Math.round(5 + (i / files.length) * 88), `Gambar ${i + 1} / ${files.length}…`)
        const { data, jenis } = await siapkanGambar(files[i])
        const img = jenis === 'jpeg' ? await doc.embedJpg(data) : await doc.embedPng(data)
        let pw, ph
        if (pageSz === 'fit') { pw = img.width; ph = img.height }
        else { const s = sizes[pageSz] || sizes.A4; pw = s[0]; ph = s[1] }
        const sc = Math.min(pw / img.width, ph / img.height)
        const pg = doc.addPage([pw, ph])
        pg.drawImage(img, {
          x: (pw - img.width * sc) / 2, y: (ph - img.height * sc) / 2,
          width: img.width * sc, height: img.height * sc,
        })
      }
      setProgress(96, 'Menyimpan…')
      results.value = [makeResult(await doc.save(), outputName(files[0], '.pdf'))]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal konversi: ' + pesanError(e) }
    finally { processing.value = false }
  }

  // Tool ini bernama "PDF ke JPG" tapi dulu selalu mengeluarkan PNG.
  async function doPDF2Img(file, scale = 2, format = 'jpg') {
    processing.value = true; errMsg.value = ''; results.value = []
    const mime = format === 'png' ? 'image/png' : 'image/jpeg'
    const ext  = format === 'png' ? '.png' : '.jpg'
    try {
      setProgress(5, 'Memuat engine render…')
      await loadPDFjs()
      const ab  = await readAB(file)
      const pdf = await pdfjsLib.getDocument({ data: ab }).promise
      const res = []
      for (let i = 1; i <= pdf.numPages; i++) {
        setProgress(Math.round(8 + (i / pdf.numPages) * 88), `Halaman ${i} / ${pdf.numPages}…`)
        const pg = await pdf.getPage(i)
        const vp = pg.getViewport({ scale })
        const cv = document.createElement('canvas')
        cv.width = vp.width; cv.height = vp.height
        const ctx = cv.getContext('2d')
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height)
        await pg.render({ canvasContext: ctx, viewport: vp }).promise
        res.push(makeImgResult(cv.toDataURL(mime, 0.92), outputName(file, ext, `_halaman_${i}`)))
      }
      results.value = res
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal konversi: ' + pesanError(e) }
    finally { processing.value = false }
  }

  async function doPageNumber(file, pos = 'bottom-center') {
    processing.value = true; errMsg.value = ''; results.value = []
    try {
      setProgress(15, 'Membaca PDF…')
      const ab    = await readAB(file)
      const doc   = await PDFDocument.load(ab)
      const font  = await doc.embedFont(StandardFonts.Helvetica)
      const pages = doc.getPages()
      pages.forEach((pg, i) => {
        setProgress(Math.round(15 + (i / pages.length) * 78), `Halaman ${i + 1}…`)
        const { width, height } = pg.getSize()
        const txt = `${i + 1}`, fs = 11
        const tw  = font.widthOfTextAtSize(txt, fs)
        let x, y
        if (pos === 'bottom-center')     { x = (width - tw) / 2; y = 20 }
        else if (pos === 'bottom-right') { x = width - tw - 20;  y = 20 }
        else                             { x = (width - tw) / 2; y = height - 30 }
        pg.drawText(txt, { x, y, size: fs, font, color: rgb(0.45, 0.45, 0.45) })
      })
      setProgress(94, 'Menyimpan…')
      results.value = [makeResult(await doc.save(), outputName(file, '.pdf'))]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal: ' + pesanError(e) }
    finally { processing.value = false }
  }

  async function doProtect(file, password) {
    processing.value = true; errMsg.value = ''; results.value = []
    try {
      setProgress(25, 'Membaca PDF…')
      const ab  = await readAB(file)
      const doc = await PDFDocument.load(ab)
      setProgress(60, 'Mengenkripsi…')
      doc.encrypt({ userPassword: password, ownerPassword: password + '_owner' })
      setProgress(88, 'Menyimpan…')
      results.value = [makeResult(await doc.save(), outputName(file, '.pdf'))]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal enkripsi: ' + pesanError(e) }
    finally { processing.value = false }
  }

  async function doUnlock(file, password) {
    processing.value = true; errMsg.value = ''; results.value = []
    try {
      setProgress(30, 'Membaca PDF…')
      const ab = await readAB(file)

      // Deteksi dulu apakah dokumennya memang terkunci. Tanpa ini, PDF biasa
      // ikut diproses diam-diam dan user tidak tahu sandinya tak pernah dipakai.
      let terkunci = true
      try {
        terkunci = (await PDFDocument.load(ab)).isEncrypted
      } catch {
        terkunci = true  // gagal dimuat tanpa sandi = memang terenkripsi
      }
      if (!terkunci) {
        errMsg.value = 'PDF ini tidak terkunci — tidak perlu dibuka.'
        return
      }

      setProgress(55, 'Membuka kunci…')
      let src
      try {
        src = await PDFDocument.load(ab, { password })
      } catch {
        errMsg.value = 'Kata sandi salah. Periksa lagi lalu coba ulang.'
        return
      }

      // Menyimpan ulang dokumen yang sama tetap meninggalkan rujukan /Encrypt
      // di kamus xref, sehingga sebagian pembaca PDF masih menganggapnya
      // terkunci. Menyalin halaman ke dokumen baru menghasilkan berkas bersih.
      setProgress(80, 'Menyimpan…')
      const out   = await PDFDocument.create()
      const pages = await out.copyPages(src, src.getPageIndices())
      pages.forEach((p) => out.addPage(p))

      results.value = [makeResult(await out.save(), outputName(file, '.pdf'))]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal membuka kunci: ' + pesanError(e) }
    finally { processing.value = false }
  }

  async function doWord2PDF(file) {
    processing.value = true; errMsg.value = ''; results.value = []
    try {
      setProgress(15, 'Memuat konverter Word...')
      await loadMammoth()

      setProgress(40, 'Membaca dokumen Word...')
      const ab = await readAB(file)
      const r = await window.mammoth.convertToHtml({ arrayBuffer: ab })

      if (!r.value && r.messages.some(m => m.type === 'error')) {
        throw new Error(r.messages.find(m => m.type === 'error').message)
      }

      setProgress(80, 'Menyiapkan tampilan...')

      const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>${escHtml(file.name)}</title>
<style>
*{box-sizing:border-box}
body{font-family:'Calibri','Arial',sans-serif;font-size:11pt;line-height:1.6;color:#000;margin:0;padding:0}
.page{width:210mm;min-height:297mm;padding:25mm 30mm;margin:0 auto;background:#fff}
h1{font-size:20pt}h2{font-size:16pt}h3{font-size:13pt}
p{margin:.35em 0}
table{border-collapse:collapse;width:100%;margin:6px 0}
td,th{border:1px solid #ccc;padding:4px 8px;vertical-align:top}
th{background:#f0f0f0;font-weight:700}
img{max-width:100%;height:auto}
ul,ol{margin:.3em 0;padding-left:1.4em}
@media print{body{padding:0}.page{width:100%;padding:15mm 20mm}}
</style>
</head>
<body><div class="page">${r.value || '<p><em>Dokumen kosong atau tidak dapat dibaca.</em></p>'}</div></body>
</html>`

      setProgress(100, 'Siap!')
      return { html, name: outputName(file, '.pdf') }
    } catch (e) {
      errMsg.value = 'Gagal konversi: ' + pesanError(e)
      return null
    } finally { processing.value = false }
  }

  async function doExcel2PDF(file) {
    processing.value = true; errMsg.value = ''; results.value = []
    try {
      setProgress(15, 'Memuat konverter Excel...')
      await loadXLSX()

      setProgress(40, 'Membaca file Excel...')
      const ab = await readAB(file)
      const wb = window.XLSX.read(new Uint8Array(ab), { type: 'array' })

      setProgress(70, 'Merender tabel...')

      // Convert Excel date serial to DD/MM/YYYY using pure UTC arithmetic (no timezone)
      const p2 = n => String(n).padStart(2, '0')
      function excelDateToStr(serial) {
        const d = new Date(Math.round((serial - 25569) * 86400 * 1000))
        return `${p2(d.getUTCDate())}/${p2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
      }

      let sheetsHtml = ''
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName]

        if (!ws['!ref']) continue

        const range = window.XLSX.utils.decode_range(ws['!ref'])

        let tableHtml = '<table>'
        for (let ri = range.s.r; ri <= range.e.r; ri++) {
          const cells = []
          let rowHasContent = false

          for (let ci = range.s.c; ci <= range.e.c; ci++) {
            const ref  = window.XLSX.utils.encode_cell({ r: ri, c: ci })
            const cell = ws[ref]
            let val = ''
            if (cell) {
              const fmt = (cell.z || '').toLowerCase()
              const isDate = cell.t === 'n' && typeof cell.v === 'number' && /[dy]/.test(fmt)
              if (isDate) {
                val = excelDateToStr(cell.v)
              } else {
                val = cell.w !== undefined ? cell.w : String(cell.v ?? '')
              }
            }
            if (val.trim()) rowHasContent = true
            cells.push(val)
          }

          if (!rowHasContent) continue  // Skip baris benar-benar kosong

          const isHeader = ri === range.s.r
          tableHtml += '<tr>' +
            cells.map(v => isHeader
              ? `<th>${escHtml(v)}</th>`
              : `<td>${escHtml(v)}</td>`
            ).join('') +
          '</tr>'
        }
        tableHtml += '</table>'

        sheetsHtml += `<div class="sheet-wrap"><h2 class="sheet-title">${escHtml(sheetName)}</h2>${tableHtml}</div>`
      }

      const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>${escHtml(file.name)}</title>
<style>
*{box-sizing:border-box}
body{font-family:'Calibri','Arial',sans-serif;font-size:10pt;color:#000;margin:0;padding:0}
.page{padding:15mm 10mm;margin:0 auto;background:#fff}
.sheet-wrap{margin-bottom:20px;page-break-after:always}
.sheet-wrap:last-child{page-break-after:avoid}
.sheet-title{font-size:13pt;font-weight:700;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #333}
table{border-collapse:collapse;width:100%;font-size:9pt}
td,th{border:1px solid #ccc;padding:4px 8px;vertical-align:middle;min-width:40px;white-space:pre-wrap}
th{background:#e8e8e8;font-weight:700;text-align:left}
tr:nth-child(even) td{background:#f8f8f8}
@media print{.page{padding:10mm}}
</style>
</head>
<body><div class="page">${sheetsHtml}</div></body>
</html>`

      setProgress(100, 'Siap!')
      return { html, name: outputName(file, '.pdf') }
    } catch (e) {
      errMsg.value = 'Gagal konversi: ' + pesanError(e)
      return null
    } finally { processing.value = false }
  }

  async function doPDF2Docx(file) {
    processing.value = true; errMsg.value = ''; results.value = []
    try {
      setProgress(5, 'Memuat engine...')
      await loadPDFjs()
      await loadJSZip()

      setProgress(15, 'Membaca PDF...')
      const ab = await readAB(file)
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise

      const pageTexts = []
      for (let i = 1; i <= pdf.numPages; i++) {
        setProgress(Math.round(15 + (i / pdf.numPages) * 65), `Mengekstrak halaman ${i}/${pdf.numPages}...`)
        const page = await pdf.getPage(i)
        const tc = await page.getTextContent()

        const byY = new Map()
        for (const item of tc.items) {
          if (!item.str) continue
          const y = Math.round(item.transform[5] / 3) * 3
          if (!byY.has(y)) byY.set(y, [])
          byY.get(y).push({ x: item.transform[4], str: item.str })
        }

        const lines = [...byY.entries()]
          .sort((a, b) => b[0] - a[0])
          .map(([, items]) => items.sort((a, b) => a.x - b.x).map(i => i.str).join(''))
          .filter(l => l.trim())

        pageTexts.push(lines)
      }

      setProgress(84, 'Membuat dokumen Word...')

      const paragraphs = pageTexts.map((lines, pi) => {
        const paras = lines.map(l =>
          `<w:p><w:r><w:t xml:space="preserve">${escXml(l)}</w:t></w:r></w:p>`
        ).join('')
        const brk = pi < pageTexts.length - 1
          ? `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`
          : ''
        return paras + brk
      }).join('')

      const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`
      const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`
      const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`
      const wordRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`

      const zip = new JSZip()
      zip.file('[Content_Types].xml', contentTypes)
      zip.file('_rels/.rels', rels)
      zip.file('word/document.xml', docXml)
      zip.file('word/_rels/document.xml.rels', wordRels)

      setProgress(95, 'Menyimpan...')
      const bytes = await zip.generateAsync({ type: 'uint8array' })
      const outName = outputName(file, '.docx')
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      results.value = [{ url: URL.createObjectURL(blob), name: outName, sizeStr: fmtSize(bytes.length) }]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal konversi: ' + pesanError(e) }
    finally { processing.value = false }
  }

  async function doImgConvert(files, format) {
    processing.value = true; errMsg.value = ''; results.value = []
    const mime = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
    const ext  = format === 'jpg' ? '.jpg' : format === 'webp' ? '.webp' : '.png'
    const quality = format === 'jpg' ? 0.92 : 1.0
    try {
      const res = []
      for (let i = 0; i < files.length; i++) {
        setProgress(Math.round(5 + (i / files.length) * 88), `Mengkonversi ${i + 1}/${files.length}…`)
        const img = await new Promise((resolve, reject) => {
          const el = new Image()
          const url = URL.createObjectURL(files[i])
          el.onload = () => { URL.revokeObjectURL(url); resolve(el) }
          el.onerror = reject
          el.src = url
        })
        const cv = document.createElement('canvas')
        cv.width = img.naturalWidth; cv.height = img.naturalHeight
        const ctx = cv.getContext('2d')
        if (format === 'jpg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height) }
        ctx.drawImage(img, 0, 0)
        const dataUrl  = cv.toDataURL(mime, quality)
        const outName  = outputName(files[i], ext)
        res.push(makeImgResult(dataUrl, outName))
      }
      results.value = res
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal konversi: ' + pesanError(e) }
    finally { processing.value = false }
  }

  async function doExcel2Csv(file) {
    processing.value = true; errMsg.value = ''; results.value = []
    try {
      setProgress(20, 'Memuat library…')
      await loadXLSX()
      setProgress(55, 'Membaca file Excel…')
      const ab = await readAB(file)
      const wb = window.XLSX.read(new Uint8Array(ab), { type: 'array' })
      setProgress(80, 'Mengkonversi ke CSV…')
      const parts = wb.SheetNames.map((name) => {
        const csv = window.XLSX.utils.sheet_to_csv(wb.Sheets[name])
        return wb.SheetNames.length > 1 ? `# Sheet: ${name}\n${csv}` : csv
      })
      const blob    = new Blob([parts.join('\n\n')], { type: 'text/csv;charset=utf-8;' })
      const outName = outputName(file, '.csv')
      results.value = [{ url: URL.createObjectURL(blob), name: outName, sizeStr: fmtSize(blob.size) }]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal konversi: ' + pesanError(e) }
    finally { processing.value = false }
  }

  async function doWord2Txt(file) {
    processing.value = true; errMsg.value = ''; results.value = []
    try {
      setProgress(20, 'Memuat konverter Word…')
      await loadMammoth()
      setProgress(65, 'Mengekstrak teks…')
      const ab = await readAB(file)
      const r  = await window.mammoth.extractRawText({ arrayBuffer: ab })
      setProgress(90, 'Menyimpan…')
      const blob    = new Blob([r.value], { type: 'text/plain;charset=utf-8;' })
      const outName = outputName(file, '.txt')
      results.value = [{ url: URL.createObjectURL(blob), name: outName, sizeStr: fmtSize(blob.size) }]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal konversi: ' + pesanError(e) }
    finally { processing.value = false }
  }

  async function doRemovePages(file, toDelete) {
    processing.value = true; errMsg.value = ''; results.value = []
    try {
      setProgress(20, 'Membaca PDF…')
      const ab    = await readAB(file)
      const src   = await PDFDocument.load(ab)
      const total = src.getPageCount()
      const keep  = Array.from({ length: total }, (_, i) => i).filter((i) => !toDelete.includes(i))
      if (!keep.length) throw new Error('Tidak ada halaman tersisa setelah penghapusan.')
      setProgress(55, 'Menghapus halaman…')
      const out   = await PDFDocument.create()
      const pages = await out.copyPages(src, keep)
      pages.forEach((p) => out.addPage(p))
      setProgress(88, 'Menyimpan…')
      results.value = [makeResult(await out.save(), outputName(file, '.pdf'))]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal: ' + pesanError(e) }
    finally { processing.value = false }
  }

  async function doExtractPages(file, selected) {
    processing.value = true; errMsg.value = ''; results.value = []
    try {
      setProgress(20, 'Membaca PDF…')
      const ab   = await readAB(file)
      const src  = await PDFDocument.load(ab)
      const idxs = [...selected].sort((a, b) => a - b)
      if (!idxs.length) throw new Error('Pilih minimal satu halaman.')
      setProgress(55, 'Mengekstrak halaman…')
      const out   = await PDFDocument.create()
      const pages = await out.copyPages(src, idxs)
      pages.forEach((p) => out.addPage(p))
      setProgress(88, 'Menyimpan…')
      results.value = [makeResult(await out.save(), outputName(file, '.pdf'))]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal: ' + pesanError(e) }
    finally { processing.value = false }
  }

  async function doWatermark(file, text, opts = {}) {
    const { fontSize = 48, opacity = 0.15, angle = -45, color = 'gray' } = opts
    processing.value = true; errMsg.value = ''; results.value = []
    try {
      setProgress(15, 'Membaca PDF…')
      const ab    = await readAB(file)
      const doc   = await PDFDocument.load(ab)
      const font  = await doc.embedFont(StandardFonts.HelveticaBold)
      const pages = doc.getPages()
      const colorMap = { black: rgb(0,0,0), gray: rgb(0.5,0.5,0.5), white: rgb(1,1,1) }
      const c = colorMap[color] ?? colorMap.gray
      const tw = font.widthOfTextAtSize(text, fontSize)
      pages.forEach((pg, i) => {
        setProgress(Math.round(15 + (i / pages.length) * 72), `Halaman ${i + 1}…`)
        const { width, height } = pg.getSize()
        pg.drawText(text, {
          x: (width - tw) / 2,
          y: height / 2 - fontSize / 2,
          size: fontSize,
          font,
          color: c,
          opacity,
          rotate: degrees(angle),
        })
      })
      setProgress(90, 'Menyimpan…')
      results.value = [makeResult(await doc.save(), outputName(file, '.pdf'))]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal: ' + pesanError(e) }
    finally { processing.value = false }
  }

  async function doPDF2Xlsx(file) {
    processing.value = true; errMsg.value = ''; results.value = []
    try {
      setProgress(5, 'Memuat engine...')
      await loadPDFjs()
      await loadXLSX()

      setProgress(15, 'Membaca PDF...')
      const ab = await readAB(file)
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise

      // Pass 1: collect ALL items with font size, filtering browser print headers/footers
      setProgress(20, 'Mendeteksi kolom...')
      const pageItems = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const vp = page.getViewport({ scale: 1 })
        const tc = await page.getTextContent()
        // Exclude items in top/bottom 6% of page (browser print header/footer area)
        const marginY = vp.height * 0.06
        const items = tc.items
          .filter(it => it.str.trim())
          .filter(it => it.transform[5] > marginY && it.transform[5] < vp.height - marginY)
          .map(it => ({
            x: it.transform[4],
            y: it.transform[5],
            str: it.str.trim(),
            size: Math.abs(it.transform[3])
          }))
        pageItems.push(items)
      }

      const allItems = pageItems.flat()

      // Detect base (body) font size = most frequent size
      const sizeFreq = {}
      allItems.forEach(it => { const s = Math.round(it.size); sizeFreq[s] = (sizeFreq[s] || 0) + 1 })
      const baseSize = Number(Object.entries(sizeFreq).sort((a, b) => b[1] - a[1])[0][0])

      // Global column detection using X positions from all pages
      const colCenters = clusterValues(allItems.map(it => it.x), 20)
      const numCols = colCenters.length

      // Pass 2: build sections — each section title (large font) → new sheet
      const thin = { style: 'thin', color: { rgb: '000000' } }
      const borderAll = { top: thin, bottom: thin, left: thin, right: thin }

      const sections = []
      let cur = { name: 'Sheet1', rows: [] }

      const sanitizeSheetName = s => s.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Sheet'

      for (let i = 0; i < pageItems.length; i++) {
        setProgress(Math.round(30 + (i / pdf.numPages) * 60), `Mengekstrak halaman ${i + 1}/${pdf.numPages}...`)
        const items = pageItems[i]
        if (items.length === 0) continue

        const rowGroups = groupByRow(items, 12)

        for (const rowItems of rowGroups) {
          const avgSize = rowItems.reduce((s, it) => s + it.size, 0) / rowItems.length
          const isTitle = avgSize > baseSize * 1.25 && rowItems.length <= 4

          if (isTitle) {
            if (cur.rows.length > 0) sections.push(cur)
            cur = { name: sanitizeSheetName(rowItems.map(it => it.str).join(' ')), rows: [] }
          } else {
            const row = new Array(numCols).fill('')
            for (const item of rowItems) {
              const c = nearestIdx(colCenters, item.x)
              row[c] = row[c] ? row[c] + ' ' + item.str : item.str
            }
            // Merge continuation rows: only exactly 1 cell filled AND that column
            // already has content in the previous row (true wrap continuation)
            const nonEmpty = row.filter(v => v).length
            const filledIdx = nonEmpty === 1 ? row.findIndex(v => v) : -1
            if (filledIdx >= 0 && cur.rows.length > 0 && cur.rows[cur.rows.length - 1][filledIdx]) {
              cur.rows[cur.rows.length - 1][filledIdx] += ' ' + row[filledIdx]
            } else {
              cur.rows.push(row)
            }
          }
        }
      }
      if (cur.rows.length > 0) sections.push(cur)
      if (sections.length === 0) sections.push({ name: 'Sheet1', rows: [] })

      // Build workbook — one sheet per section
      const wb = window.XLSX.utils.book_new()
      const usedNames = new Set()
      for (const sec of sections) {
        let sheetName = sec.name
        if (usedNames.has(sheetName)) { let n = 2; while (usedNames.has(sheetName + n)) n++; sheetName += n }
        usedNames.add(sheetName)

        const colWidths = new Array(numCols).fill(4)
        sec.rows.forEach(row => row.forEach((val, c) => { if (val.length > colWidths[c]) colWidths[c] = val.length }))

        const ws = {}
        sec.rows.forEach((row, r) => {
          for (let c = 0; c < numCols; c++) {
            ws[window.XLSX.utils.encode_cell({ r, c })] = { t: 's', v: row[c] || '', s: { border: borderAll } }
          }
        })
        if (sec.rows.length > 0) {
          ws['!ref'] = window.XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: sec.rows.length - 1, c: numCols - 1 } })
          ws['!cols'] = colWidths.map(w => ({ wch: Math.max(6, Math.min(w + 2, 50)) }))
        }
        window.XLSX.utils.book_append_sheet(wb, ws, sheetName)
      }

      setProgress(93, 'Menyimpan...')
      const bytes = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true })
      const outName = outputName(file, '.xlsx')
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      results.value = [{ url: URL.createObjectURL(blob), name: outName, sizeStr: fmtSize(blob.size) }]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal konversi: ' + pesanError(e) }
    finally { processing.value = false }
  }

  async function doCropPDF(file, { top = 0, right = 0, bottom = 0, left = 0 } = {}) {
    processing.value = true; errMsg.value = ''; results.value = []
    try {
      setProgress(20, 'Membaca PDF…')
      const ab  = await readAB(file)
      const doc = await PDFDocument.load(ab)
      const MM  = 2.8346
      const pages = doc.getPages()
      pages.forEach((page, i) => {
        setProgress(Math.round(20 + (i / pages.length) * 65), `Memotong halaman ${i + 1}…`)
        const { width, height } = page.getSize()
        const x = left * MM
        const y = bottom * MM
        const w = width  - (left + right)  * MM
        const h = height - (top  + bottom) * MM
        if (w > 0 && h > 0) page.setCropBox(x, y, w, h)
      })
      setProgress(90, 'Menyimpan…')
      results.value = [makeResult(await doc.save(), outputName(file, '.pdf'))]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal memotong: ' + pesanError(e) }
    finally { processing.value = false }
  }

  // Header yang hilang atau tertimpa sampah (mis. halaman error HTML ikut
  // terunduh di depan berkas) membuat pdf-lib menolak PDF yang isinya masih
  // utuh. Diuji: memperbaiki header memulihkan 3/3 halaman dengan teks tetap
  // berupa teks — jauh lebih baik daripada langsung merender ulang jadi gambar.
  function perbaikiHeader(u8) {
    const awal = new TextDecoder('latin1').decode(u8.subarray(0, 1024))
    const at   = awal.indexOf('%PDF-')
    if (at === 0) return u8
    if (at > 0)   return u8.subarray(at)   // buang sampah sebelum header
    const out = new Uint8Array(9 + u8.length)
    out.set(new TextEncoder().encode('%PDF-1.7\n'), 0)
    out.set(u8, 9)
    return out
  }

  const keLatin1 = (u8) => new TextDecoder('latin1').decode(u8)
  const dariLatin1 = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xff)

  // Bila tabel xref, pohon halaman, atau katalog ikut hancur, kedua parser
  // menyerah atas seluruh berkas — padahal halaman yang sehat masih ada di
  // dalamnya. Di sini objek dipindai langsung dari byte mentah, halaman yang
  // isinya masih utuh diselamatkan, lalu pohon halaman + katalog + xref
  // disusun baru. Teks tetap teks (tidak dirasterisasi).
  // Catatan: hanya untuk PDF berstruktur klasik. PDF yang objeknya dipadatkan
  // dalam object stream tidak terbaca di sini — itu ditangani tahap pdf.js.
  function rekonstruksiObjek(u8) {
    const txt  = keLatin1(u8)
    const objs = new Map()
    const re   = /(\d+)\s+(\d+)\s+obj\b/g
    let m
    while ((m = re.exec(txt))) {
      const end = txt.indexOf('endobj', re.lastIndex)
      if (end === -1) continue          // objek terpotong — buang
      objs.set(Number(m[1]), txt.slice(m.index, end + 6))
    }

    // /Contents bisa berupa rujukan langsung ("8 0 R") atau array ("[ 6 0 R ]")
    const refsIsi = (raw) => {
      const c = raw.match(/\/Contents\s*(\[[^\]]*\]|\d+\s+\d+\s+R)/)
      return c ? [...c[1].matchAll(/(\d+)\s+\d+\s+R/g)].map((x) => Number(x[1])) : []
    }

    const halaman = []
    for (const [n, raw] of objs) {
      if (!/\/Type\s*\/Page[^s]/.test(raw)) continue
      const isi = refsIsi(raw)
      if (!isi.length || !isi.every((r) => objs.has(r))) continue  // isinya hilang — halaman tak berguna
      halaman.push(n)
    }
    if (!halaman.length) return null

    const maxN     = Math.max(...objs.keys())
    const refPages = maxN + 1
    const refCat   = maxN + 2

    for (const n of halaman) {
      const raw = objs.get(n)
      objs.set(n, /\/Parent\s+\d+\s+\d+\s+R/.test(raw)
        ? raw.replace(/\/Parent\s+\d+\s+\d+\s+R/, `/Parent ${refPages} 0 R`)
        : raw.replace(/>>\s*endobj\s*$/, `/Parent ${refPages} 0 R\n>>\nendobj`))
    }
    objs.set(refPages, `${refPages} 0 obj\n<< /Type /Pages /Kids [${halaman.map((n) => `${n} 0 R`).join(' ')}] /Count ${halaman.length} >>\nendobj`)
    objs.set(refCat,   `${refCat} 0 obj\n<< /Type /Catalog /Pages ${refPages} 0 R >>\nendobj`)

    let out = '%PDF-1.7\n'
    const off = new Map()
    for (const n of [...objs.keys()].sort((a, b) => a - b)) {
      off.set(n, out.length)
      out += objs.get(n) + '\n'
    }
    const size   = maxN + 3
    const xrefAt = out.length
    out += `xref\n0 ${size}\n0000000000 65535 f \n`
    for (let i = 1; i < size; i++) {
      out += off.has(i)
        ? String(off.get(i)).padStart(10, '0') + ' 00000 n \n'
        : '0000000000 65535 f \n'
    }
    out += `trailer\n<< /Size ${size} /Root ${refCat} 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`
    return { bytes: dariLatin1(out), halaman: halaman.length }
  }

  // Jelaskan kenapa sebuah berkas benar-benar tidak bisa ditolong, alih-alih
  // membocorkan pesan internal parser seperti "Invalid PDF structure".
  function diagnosaKerusakan(u8) {
    const txt = keLatin1(u8)
    if (!/\d+\s+\d+\s+obj\b/.test(txt))
      return 'Struktur objek PDF hancur total — tidak ada satu pun objek yang masih bisa dibaca.'
    if (!/\bstream\b/.test(txt))
      return 'Isi halaman sudah tidak ada di dalam berkas — bagian itu tertimpa data lain. Tidak ada yang tersisa untuk dipulihkan.'
    if (!/\/Type\s*\/Page[^s]/.test(txt))
      return 'Tidak ada objek halaman yang tersisa di dalam berkas.'
    return 'Semua halaman yang tersisa sudah kehilangan isinya, jadi tidak ada yang bisa diselamatkan.'
  }

  async function doRepairPDF(file) {
    processing.value = true; errMsg.value = ''; noticeMsg.value = ''; results.value = []
    try {
      setProgress(15, 'Membaca berkas…')
      const bytes = perbaikiHeader(new Uint8Array(await readAB(file)))

      // Tahap 1 — parse ulang lalu simpan. Ini membangun kembali tabel xref yang
      // rusak dan membuang objek yatim. Teks tetap teks.
      setProgress(45, 'Menyusun ulang struktur…')
      try {
        const doc = await PDFDocument.load(bytes, {
          ignoreEncryption: true, updateMetadata: false, throwOnInvalidObject: false,
        })
        const out = await doc.save({ useObjectStreams: true })
        await PDFDocument.load(out, { ignoreEncryption: true })  // pastikan hasilnya sungguh terbuka
        results.value  = [makeResult(out, outputName(file, '.pdf'))]
        noticeMsg.value = `Struktur berhasil disusun ulang. ${doc.getPageCount()} halaman pulih dan teks tetap bisa disalin.`
        setProgress(100, 'Selesai!')
        return
      } catch { /* pdf-lib menyerah — lanjut ke rekonstruksi */ }

      // Tahap 2 — susun ulang dari objek mentah. Didahulukan sebelum rasterisasi
      // karena teks tetap berupa teks, dan halaman yang sehat bisa diselamatkan
      // walau sebagian halaman lain hancur.
      setProgress(60, 'Menyelamatkan halaman yang tersisa…')
      try {
        const rk = rekonstruksiObjek(bytes)
        if (rk) {
          const doc = await PDFDocument.load(rk.bytes, {
            ignoreEncryption: true, updateMetadata: false, throwOnInvalidObject: false,
          })
          const out = await doc.save({ useObjectStreams: true })
          await PDFDocument.load(out, { ignoreEncryption: true })
          results.value  = [makeResult(out, outputName(file, '.pdf'))]
          noticeMsg.value = `${rk.halaman} halaman berhasil diselamatkan dan teksnya tetap bisa disalin. Halaman yang isinya sudah tertimpa tidak bisa dikembalikan.`
          setProgress(100, 'Selesai!')
          return
        }
      } catch { /* rekonstruksi gagal — lanjut ke pemulihan darurat */ }

      // Tahap 3 — pdf.js punya parser pemulihan yang lebih toleran (termasuk untuk
      // PDF ber-object stream yang tak terbaca tahap 2), tapi tidak bisa menulis PDF
      // vektor. Halaman dirender ulang jadi gambar: isinya kembali, tapi teksnya
      // tidak lagi bisa disalin. Upaya terakhir.
      setProgress(75, 'Pemulihan darurat…')
      await loadPDFjs()
      const pdf = await pdfjsLib.getDocument({ data: bytes.slice(0), stopAtErrors: false }).promise
      const out = await PDFDocument.create()
      for (let i = 1; i <= pdf.numPages; i++) {
        setProgress(Math.round(75 + (i / pdf.numPages) * 20), `Merender ulang halaman ${i}/${pdf.numPages}…`)
        const pg  = await pdf.getPage(i)
        const vp0 = pg.getViewport({ scale: 1 })
        const vp  = pg.getViewport({ scale: 2 })
        const cv  = document.createElement('canvas')
        cv.width  = Math.round(vp.width); cv.height = Math.round(vp.height)
        const ctx = cv.getContext('2d')
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height)
        await pg.render({ canvasContext: ctx, viewport: vp }).promise
        const b64 = cv.toDataURL('image/jpeg', 0.92).split(',')[1]
        const img = await out.embedJpg(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)))
        out.addPage([vp0.width, vp0.height])
           .drawImage(img, { x: 0, y: 0, width: vp0.width, height: vp0.height })
      }
      results.value  = [makeResult(await out.save({ useObjectStreams: true }), outputName(file, '.pdf'))]
      noticeMsg.value = `Kerusakan berat. ${pdf.numPages} halaman diselamatkan dengan render ulang — isinya kembali terlihat, tapi teks kini menjadi gambar dan tidak bisa disalin.`
      setProgress(100, 'Selesai!')
    } catch {
      // Jangan tampilkan pesan internal parser — jelaskan apa yang sebenarnya hilang.
      try {
        errMsg.value = diagnosaKerusakan(new Uint8Array(await readAB(file)))
      } catch {
        errMsg.value = 'PDF ini terlalu rusak untuk dipulihkan.'
      }
    } finally { processing.value = false }
  }

  async function doSignPDF(file, pngDataUrl, pageTarget = 'last', position = 'bottom-right', widthPt = 150) {
    processing.value = true; errMsg.value = ''; results.value = []
    try {
      setProgress(20, 'Membaca PDF…')
      const ab  = await readAB(file)
      const doc = await PDFDocument.load(ab)
      setProgress(45, 'Memuat tanda tangan…')
      const b64      = pngDataUrl.split(',')[1]
      const sigBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
      const sigImg   = await doc.embedPng(sigBytes)
      const pages    = doc.getPages()
      const total    = pages.length
      const targets  = pageTarget === 'first' ? [0]
                     : pageTarget === 'all'   ? pages.map((_, i) => i)
                     :                         [total - 1]
      setProgress(65, 'Menambahkan tanda tangan…')
      for (const idx of targets) {
        const page = pages[idx]
        const { width, height } = page.getSize()
        const ratio = sigImg.height / sigImg.width
        const sigW  = widthPt
        const sigH  = widthPt * ratio
        const pad   = 24
        const x = position === 'bottom-left'   ? pad
                : position === 'bottom-center'  ? (width - sigW) / 2
                :                                 width - sigW - pad
        page.drawImage(sigImg, { x, y: pad, width: sigW, height: sigH })
      }
      setProgress(90, 'Menyimpan…')
      results.value = [makeResult(await doc.save(), outputName(file, '.pdf'))]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal: ' + pesanError(e) }
    finally { processing.value = false }
  }

  async function doRedactPDF(file, redactions) {
    // redactions: { pageIndex: [{relX, relY, relW, relH}] }
    processing.value = true; errMsg.value = ''; results.value = []
    try {
      setProgress(5, 'Memuat engine…')
      await loadPDFjs()
      setProgress(15, 'Membaca PDF…')
      const ab     = await readAB(file)
      const srcDoc = await PDFDocument.load(ab, { ignoreEncryption: true })
      const srcJs  = await pdfjsLib.getDocument({ data: ab.slice(0) }).promise
      const outDoc = await PDFDocument.create()
      const total  = srcDoc.getPageCount()
      for (let i = 0; i < total; i++) {
        setProgress(Math.round(15 + (i / total) * 78), `Halaman ${i + 1}/${total}…`)
        const rects = redactions[i]
        if (!rects || !rects.length) {
          const [copied] = await outDoc.copyPages(srcDoc, [i])
          outDoc.addPage(copied)
        } else {
          const pdfPage = await srcJs.getPage(i + 1)
          const vp  = pdfPage.getViewport({ scale: 2 })
          const cv  = document.createElement('canvas')
          cv.width  = Math.round(vp.width); cv.height = Math.round(vp.height)
          const ctx = cv.getContext('2d')
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height)
          await pdfPage.render({ canvasContext: ctx, viewport: vp }).promise
          ctx.fillStyle = '#000'
          for (const r of rects) {
            ctx.fillRect(r.relX * cv.width, r.relY * cv.height, r.relW * cv.width, r.relH * cv.height)
          }
          const b64   = cv.toDataURL('image/jpeg', 0.92).split(',')[1]
          const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
          const img   = await outDoc.embedJpg(bytes)
          const { width, height } = srcDoc.getPage(i).getSize()
          const newPg = outDoc.addPage([width, height])
          newPg.drawImage(img, { x: 0, y: 0, width, height })
        }
      }
      setProgress(95, 'Menyimpan…')
      results.value = [makeResult(await outDoc.save({ useObjectStreams: true }), outputName(file, '.pdf'))]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal: ' + pesanError(e) }
    finally { processing.value = false }
  }

  return {
    processing, progress, progLabel, results, errMsg, noticeMsg,
    reset, fmtSize,
    doMerge, doSplit, doCompress, doRotate, doReorder,
    doImg2PDF, doPDF2Img, doPageNumber, doProtect, doUnlock,
    doWord2PDF, doExcel2PDF, doPDF2Docx, doPDF2Xlsx,
    doRemovePages, doExtractPages, doWatermark,
    doImgConvert, doExcel2Csv, doWord2Txt,
    doCropPDF, doRepairPDF, doSignPDF, doRedactPDF,
  }
}