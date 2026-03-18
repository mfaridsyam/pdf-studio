export const TOOLS = [
  {
    id: 'merge',
    cat: 'atur',
    icon: '⊕',
    name: 'Gabung PDF',
    desc: 'Gabungkan beberapa PDF menjadi satu dokumen.',
    color: '#E8261A',
    bg: '#fef2f1',
  },
  {
    id: 'split',
    cat: 'atur',
    icon: '✂️',
    name: 'Pisah PDF',
    desc: 'Pisahkan halaman menjadi file-file terpisah.',
    color: '#0ea5e9',
    bg: '#eff9ff',
  },
  {
    id: 'compress',
    cat: 'atur',
    icon: '🗜️',
    name: 'Kompres PDF',
    desc: 'Kurangi ukuran file PDF.',
    color: '#10b981',
    bg: '#f0fdf4',
  },
  {
    id: 'rotate',
    cat: 'atur',
    icon: '🔃',
    name: 'Putar PDF',
    desc: 'Putar halaman ke orientasi yang tepat.',
    color: '#f59e0b',
    bg: '#fffbeb',
  },
  {
    id: 'reorder',
    cat: 'atur',
    icon: '🗂️',
    name: 'Atur Halaman',
    desc: 'Sortir, hapus, dan atur ulang halaman PDF.',
    color: '#8b5cf6',
    bg: '#f5f3ff',
  },
  {
    id: 'pagenumber',
    cat: 'atur',
    icon: '🔢',
    name: 'Nomor Halaman',
    desc: 'Tambahkan nomor halaman ke PDF.',
    color: '#6366f1',
    bg: '#eef2ff',
  },
  {
    id: 'img2pdf',
    cat: 'konversi',
    icon: '🖼️',
    name: 'Gambar ke PDF',
    desc: 'Konversi JPG, PNG, WebP menjadi PDF.',
    color: '#f97316',
    bg: '#fff7ed',
  },
  {
    id: 'pdf2img',
    cat: 'konversi',
    icon: '📸',
    name: 'PDF ke Gambar',
    desc: 'Konversi halaman PDF menjadi PNG berkualitas tinggi.',
    color: '#ec4899',
    bg: '#fdf2f8',
  },
]

export function useTool(id) {
  return TOOLS.find((t) => t.id === id) || null
}

export function useToolsByCategory(cat) {
  if (cat === 'all') return TOOLS
  return TOOLS.filter((t) => t.cat === cat)
}

export const CATEGORIES = [
  { id: 'atur',     label: 'Atur PDF' },
  { id: 'konversi', label: 'Konversi' },
]
