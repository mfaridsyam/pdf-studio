import { ref } from 'vue'
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'

async function loadPDFjs() {
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

export function usePdfProcessor() {
  const processing = ref(false)
  const progress   = ref(0)
  const progLabel  = ref('')
  const results    = ref([])
  const errMsg     = ref('')

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
    results.value    = []
    errMsg.value     = ''
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

        function transformAnnotations(page, scale, offsetX, offsetY) {
          try {
            const { PDFArray, PDFNumber } = page.doc?.context?.constructor
              ? { PDFArray: null, PDFNumber: null }
              : { PDFArray: null, PDFNumber: null }

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
      results.value = [makeResult(await merged.save({ useObjectStreams: true }), 'merged.pdf')]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal menggabung: ' + e.message; console.error(e) }
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
        res.push(makeResult(await d.save(), `halaman_${idxs[i] + 1}.pdf`))
      }
      results.value = res
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal memisah: ' + e.message }
    finally { processing.value = false }
  }

  async function doCompress(file, level = 'recommended') {
    processing.value = true; errMsg.value = ''; results.value = []
    const originalSize = file instanceof File ? file.size : (file?.size ?? 0)
    try {
      setProgress(8, 'Membaca file…')
      const ab = await readAB(file)

      if (level === 'low') {
        setProgress(35, 'Mengoptimasi struktur PDF…')
        const doc = await PDFDocument.load(ab, { updateMetadata: false })
        try { doc.catalog.delete(doc.context.obj('Metadata')) } catch {}
        setProgress(80, 'Menyimpan…')
        const bytes = await doc.save({ useObjectStreams: true })
        const cs = bytes.length
        const saved    = Math.max(0, originalSize - cs)
        const savedPct = originalSize > 0 ? Math.max(0, Math.round(saved / originalSize * 100)) : 0
        results.value  = [makeResult(bytes, 'compressed.pdf')]
        setProgress(100, 'Selesai!')
        return { originalSize, compressedSize: cs, saved, savedPct }
      }

      setProgress(5, 'Memuat engine render…')
      await loadPDFjs()

      const quality = level === 'extreme' ? 0.40 : 0.75
      const scale   = level === 'extreme' ? 1.2  : 1.5

      const srcPDF = await pdfjsLib.getDocument({ data: ab.slice(0) }).promise
      const outDoc = await PDFDocument.create()
      const total  = srcPDF.numPages

      for (let i = 1; i <= total; i++) {
        setProgress(Math.round(10 + (i / total) * 82), `Mengkompresi halaman ${i} / ${total}…`)
        const page = await srcPDF.getPage(i)
        const vp0  = page.getViewport({ scale: 1 })
        const vp   = page.getViewport({ scale })
        const cv   = document.createElement('canvas')
        cv.width   = Math.round(vp.width); cv.height = Math.round(vp.height)
        const ctx  = cv.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, cv.width, cv.height)
        await page.render({ canvasContext: ctx, viewport: vp }).promise
        const b64   = cv.toDataURL('image/jpeg', quality).split(',')[1]
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
        const img   = await outDoc.embedJpg(bytes)
        const pg    = outDoc.addPage([vp0.width, vp0.height])
        pg.drawImage(img, { x: 0, y: 0, width: vp0.width, height: vp0.height })
      }

      setProgress(94, 'Menyimpan PDF…')
      const out  = await outDoc.save({ useObjectStreams: true })
      const cs   = out.length
      const saved    = Math.max(0, originalSize - cs)
      const savedPct = originalSize > 0 ? Math.max(0, Math.round(saved / originalSize * 100)) : 0
      results.value  = [makeResult(out, 'compressed.pdf')]
      setProgress(100, 'Selesai!')
      return { originalSize, compressedSize: cs, saved, savedPct }

    } catch (e) {
      errMsg.value = 'Kompresi gagal: ' + e.message
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
      results.value = [makeResult(await doc.save(), 'rotated.pdf')]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal memutar: ' + e.message }
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
      results.value = [makeResult(await out.save(), 'reordered.pdf')]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal mengatur ulang: ' + e.message }
    finally { processing.value = false }
  }

  async function doImg2PDF(files, pageSz = 'A4') {
    processing.value = true; errMsg.value = ''; results.value = []
    try {
      const doc   = await PDFDocument.create()
      const sizes = { A4: [595.28, 841.89], Letter: [612, 792] }
      for (let i = 0; i < files.length; i++) {
        setProgress(Math.round(5 + (i / files.length) * 88), `Gambar ${i + 1} / ${files.length}…`)
        const ab   = await readAB(files[i])
        const mime = files[i].type
        const img  = (mime === 'image/jpeg' || mime === 'image/jpg')
          ? await doc.embedJpg(ab) : await doc.embedPng(ab)
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
      results.value = [makeResult(await doc.save(), 'gambar_ke_pdf.pdf')]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal konversi: ' + e.message }
    finally { processing.value = false }
  }

  async function doPDF2Img(file, scale = 2) {
    processing.value = true; errMsg.value = ''; results.value = []
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
        res.push(makeImgResult(cv.toDataURL('image/png'), `halaman_${i}.png`))
      }
      results.value = res
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal konversi: ' + e.message }
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
      results.value = [makeResult(await doc.save(), 'numbered.pdf')]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal: ' + e.message }
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
      results.value = [makeResult(await doc.save(), 'protected.pdf')]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal enkripsi: ' + e.message }
    finally { processing.value = false }
  }

  async function doUnlock(file, password) {
    processing.value = true; errMsg.value = ''; results.value = []
    try {
      setProgress(30, 'Membaca PDF…')
      const ab  = await readAB(file)
      setProgress(60, 'Membuka kunci…')
      const doc = await PDFDocument.load(ab, { password })
      setProgress(88, 'Menyimpan…')
      results.value = [makeResult(await doc.save(), 'unlocked.pdf')]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal: Pastikan kata sandi benar.' }
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
      return { html, name: file.name.replace(/\.docx?$/i, '') + '.pdf' }
    } catch (e) {
      errMsg.value = 'Gagal konversi: ' + e.message
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

      let sheetsHtml = ''
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName]
        const tableHtml = window.XLSX.utils.sheet_to_html(ws, { editable: false })
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
td,th{border:1px solid #ccc;padding:3px 6px;vertical-align:middle;min-width:50px;white-space:pre-wrap}
tr:nth-child(even){background:#f8f8f8}
@media print{.page{padding:10mm}}
</style>
</head>
<body><div class="page">${sheetsHtml}</div></body>
</html>`

      setProgress(100, 'Siap!')
      return { html, name: file.name.replace(/\.(xlsx?|csv|ods)$/i, '') + '.pdf' }
    } catch (e) {
      errMsg.value = 'Gagal konversi: ' + e.message
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
      const outName = file.name.replace(/\.pdf$/i, '') + '.docx'
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      results.value = [{ url: URL.createObjectURL(blob), name: outName, sizeStr: fmtSize(bytes.length) }]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal konversi: ' + e.message }
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
        const outName  = files[i].name.replace(/\.[^.]+$/, '') + ext
        res.push(makeImgResult(dataUrl, outName))
      }
      results.value = res
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal konversi: ' + e.message }
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
      const outName = file.name.replace(/\.(xlsx?|ods|csv)$/i, '.csv')
      results.value = [{ url: URL.createObjectURL(blob), name: outName, sizeStr: fmtSize(blob.size) }]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal konversi: ' + e.message }
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
      const outName = file.name.replace(/\.docx?$/i, '.txt')
      results.value = [{ url: URL.createObjectURL(blob), name: outName, sizeStr: fmtSize(blob.size) }]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal konversi: ' + e.message }
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
      results.value = [makeResult(await out.save(), 'pages_removed.pdf')]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal: ' + e.message }
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
      results.value = [makeResult(await out.save(), 'extracted.pdf')]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal: ' + e.message }
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
      results.value = [makeResult(await doc.save(), 'watermarked.pdf')]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal: ' + e.message }
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

      const wb = window.XLSX.utils.book_new()

      for (let i = 1; i <= pdf.numPages; i++) {
        setProgress(Math.round(15 + (i / pdf.numPages) * 75), `Mengekstrak halaman ${i}/${pdf.numPages}...`)
        const page = await pdf.getPage(i)
        const tc = await page.getTextContent()

        const byY = new Map()
        for (const item of tc.items) {
          if (!item.str.trim()) continue
          const y = Math.round(item.transform[5] / 4) * 4
          if (!byY.has(y)) byY.set(y, [])
          byY.get(y).push({ x: item.transform[4], str: item.str })
        }

        const rows = [...byY.entries()]
          .sort((a, b) => b[0] - a[0])
          .map(([, items]) => items.sort((a, b) => a.x - b.x).map(it => it.str))

        const ws = window.XLSX.utils.aoa_to_sheet(rows)
        const sheetName = pdf.numPages === 1 ? 'Sheet1' : `Halaman ${i}`
        window.XLSX.utils.book_append_sheet(wb, ws, sheetName)
      }

      setProgress(93, 'Menyimpan...')
      const bytes = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const outName = file.name.replace(/\.pdf$/i, '') + '.xlsx'
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      results.value = [{ url: URL.createObjectURL(blob), name: outName, sizeStr: fmtSize(bytes.length) }]
      setProgress(100, 'Selesai!')
    } catch (e) { errMsg.value = 'Gagal konversi: ' + e.message }
    finally { processing.value = false }
  }

  return {
    processing, progress, progLabel, results, errMsg,
    reset, fmtSize,
    doMerge, doSplit, doCompress, doRotate, doReorder,
    doImg2PDF, doPDF2Img, doPageNumber, doProtect, doUnlock,
    doWord2PDF, doExcel2PDF, doPDF2Docx, doPDF2Xlsx,
    doRemovePages, doExtractPages, doWatermark,
    doImgConvert, doExcel2Csv, doWord2Txt,
  }
}