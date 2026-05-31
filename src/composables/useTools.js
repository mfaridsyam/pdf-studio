const shared = { color: '#18181B', bg: '#F4F4F5' }

export const TOOLS = [
  // ── ATUR PDF ──────────────────────────────────────────────────
  { id: 'merge',        cat: 'atur',     icon: 'GitMerge',    name: 'Gabung PDF',       desc: 'Gabungkan beberapa PDF menjadi satu dokumen.',         ...shared },
  { id: 'split',        cat: 'atur',     icon: 'Scissors',    name: 'Pisah PDF',        desc: 'Pisahkan halaman menjadi file-file terpisah.',          ...shared },
  { id: 'removepages',  cat: 'atur',     icon: 'FileMinus',   name: 'Hapus Halaman',    desc: 'Pilih dan hapus halaman tertentu dari dokumen.',        ...shared },
  { id: 'extractpages', cat: 'atur',     icon: 'Copy',        name: 'Ekstrak Halaman',  desc: 'Ambil halaman tertentu sebagai PDF baru.',              ...shared },
  { id: 'compress',     cat: 'atur',     icon: 'Minimize2',   name: 'Kompres PDF',      desc: 'Kurangi ukuran file PDF.',                             ...shared },
  { id: 'rotate',       cat: 'atur',     icon: 'RotateCw',    name: 'Putar PDF',        desc: 'Putar halaman ke orientasi yang tepat.',               ...shared },
  { id: 'reorder',      cat: 'atur',     icon: 'ListOrdered', name: 'Atur Halaman',     desc: 'Sortir, hapus, dan atur ulang halaman PDF.',           ...shared },
  { id: 'pagenumber',   cat: 'atur',     icon: 'Hash',        name: 'Nomor Halaman',    desc: 'Tambahkan nomor halaman ke PDF.',                      ...shared },

  // ── EDIT PDF ──────────────────────────────────────────────────
  { id: 'watermark',    cat: 'edit',     icon: 'Layers',      name: 'Watermark',        desc: 'Tambahkan teks watermark ke setiap halaman PDF.',      ...shared },

  // ── KEAMANAN ──────────────────────────────────────────────────
  { id: 'protect',      cat: 'keamanan', icon: 'Lock',        name: 'Proteksi PDF',     desc: 'Tambahkan kata sandi untuk melindungi file PDF.',      ...shared },
  { id: 'unlock',       cat: 'keamanan', icon: 'Unlock',      name: 'Buka Kunci PDF',   desc: 'Hapus proteksi kata sandi dari file PDF.',             ...shared },

  // ── KONVERSI (grup) ───────────────────────────────────────────
  {
    id: 'to-pdf',
    cat: 'konversi',
    icon: 'FileInput',
    name: '... ke PDF',
    desc: 'Konversi Gambar, Word, atau Excel ke PDF.',
    isGroup: true,
    children: [
      { id: 'img2pdf',   icon: 'Image',          name: 'Gambar ke PDF', desc: 'JPG, PNG, WebP → PDF', cat: 'konversi', ...shared },
      { id: 'word2pdf',  icon: 'FileText',        name: 'Word ke PDF',   desc: 'DOCX → PDF',           cat: 'konversi', ...shared },
      { id: 'excel2pdf', icon: 'BarChart2',       name: 'Excel ke PDF',  desc: 'XLSX, CSV → PDF',      cat: 'konversi', ...shared },
    ],
    ...shared,
  },
  {
    id: 'from-pdf',
    cat: 'konversi',
    icon: 'FileOutput',
    name: 'PDF ke ...',
    desc: 'Konversi PDF ke Gambar, Word, atau Excel.',
    isGroup: true,
    children: [
      { id: 'pdf2img',   icon: 'Camera',          name: 'PDF ke Gambar', desc: 'PDF → PNG',            cat: 'konversi', ...shared },
      { id: 'pdf2docx',  icon: 'FileOutput',      name: 'PDF ke Word',   desc: 'PDF → DOCX',           cat: 'konversi', ...shared },
      { id: 'pdf2xlsx',  icon: 'FileSpreadsheet', name: 'PDF ke Excel',  desc: 'PDF → XLSX',           cat: 'konversi', ...shared },
    ],
    ...shared,
  },
  {
    id: 'img-conv',
    cat: 'konversi',
    icon: 'ImagePlus',
    name: 'Konversi Gambar',
    desc: 'Ubah format gambar JPG, PNG, dan WebP.',
    isGroup: true,
    children: [
      { id: 'img2jpg',  icon: 'Image', name: 'Ke Format JPG',  desc: 'PNG, WebP → JPG',  cat: 'konversi', ...shared },
      { id: 'img2png',  icon: 'Image', name: 'Ke Format PNG',  desc: 'JPG, WebP → PNG',  cat: 'konversi', ...shared },
      { id: 'img2webp', icon: 'Image', name: 'Ke Format WebP', desc: 'JPG, PNG → WebP',  cat: 'konversi', ...shared },
    ],
    ...shared,
  },
  {
    id: 'doc-conv',
    cat: 'konversi',
    icon: 'Shuffle',
    name: 'Konversi Dokumen',
    desc: 'Excel ke CSV, Word ke teks, dan lainnya.',
    isGroup: true,
    children: [
      { id: 'excel2csv', icon: 'List',      name: 'Excel ke CSV',   desc: 'XLSX → CSV',  cat: 'konversi', ...shared },
      { id: 'word2txt',  icon: 'AlignLeft', name: 'Word ke Teks',   desc: 'DOCX → TXT',  cat: 'konversi', ...shared },
    ],
    ...shared,
  },
]

export function useTool(id) {
  for (const t of TOOLS) {
    if (t.id === id) return t
    if (t.children) {
      const c = t.children.find((c) => c.id === id)
      if (c) return c
    }
  }
  return null
}

export function useToolsByCategory(cat) {
  if (cat === 'all') return TOOLS
  return TOOLS.filter((t) => t.cat === cat)
}

export const CATEGORIES = [
  { id: 'atur',     label: 'Atur PDF'  },
  { id: 'edit',     label: 'Edit PDF'  },
  { id: 'keamanan', label: 'Keamanan'  },
  { id: 'konversi', label: 'Konversi'  },
]
