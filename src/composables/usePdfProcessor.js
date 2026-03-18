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

  return {
    processing, progress, progLabel, results, errMsg,
    reset, fmtSize,
    doMerge, doSplit, doCompress, doRotate, doReorder,
    doImg2PDF, doPDF2Img, doPageNumber, doProtect, doUnlock,
  }
}