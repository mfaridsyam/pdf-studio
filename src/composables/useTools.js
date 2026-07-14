// Icon color palette — iLovePDF-inspired
const O  = { bg: '#FF6C2F', color: '#fff' }  // orange  — organize/merge
const G  = { bg: '#22C55E', color: '#fff' }  // green   — compress/fix
const B  = { bg: '#3B82F6', color: '#fff' }  // blue    — security/word
const P  = { bg: '#A855F7', color: '#fff' }  // purple  — edit/AI
const K  = { bg: '#EC4899', color: '#fff' }  // pink    — rotate/crop
const A  = { bg: '#F59E0B', color: '#fff' }  // amber   — number/html
const WB = { bg: '#185ABD', color: '#fff' }  // Word blue
const XG = { bg: '#217346', color: '#fff' }  // Excel green
const I  = { bg: '#6366F1', color: '#fff' }  // indigo  — sign
const C  = { bg: '#06B6D4', color: '#fff' }  // cyan    — unlock
const R  = { bg: '#EF4444', color: '#fff' }  // red     — remove

export const TOOLS = [
  // ── ATUR PDF ──────────────────────────────────────────────────
  { id: 'merge',        cat: 'atur',     icon: 'GitMerge',        name: 'Gabungkan PDF',     desc: 'Gabungkan PDF dengan urutan yang Anda inginkan dengan penggabungan PDF termudah.',                                                          ...O  },
  { id: 'split',        cat: 'atur',     icon: 'Scissors',        name: 'Pisahkan PDF',      desc: 'Pisahkan satu halaman atau semuanya agar mudah dikonversi menjadi file PDF terpisah.',                                                       ...O  },
  { id: 'removepages',  cat: 'atur',     icon: 'FileMinus',       name: 'Hapus Halaman PDF', desc: 'Hapus halaman yang tidak diinginkan dari file PDF dengan memilihnya secara visual.',                                                          ...R  },
  { id: 'extractpages', cat: 'atur',     icon: 'Copy',            name: 'Ekstrak Halaman',   desc: 'Pilih halaman tertentu dari PDF dan ekstrak menjadi file PDF baru yang terpisah.',                                                            ...O  },
  { id: 'compress',     cat: 'atur',     icon: 'Minimize2',       name: 'Kompres PDF',       desc: 'Kurangi ukuran file dengan tetap mengoptimalkan kualitas PDF maksimal.',                                                                      ...G  },
  { id: 'rotate',       cat: 'atur',     icon: 'RotateCw',        name: 'Putar PDF',         desc: 'Putar PDF sesuai kebutuhan. Anda bahkan dapat memutar beberapa PDF sekaligus!',                                                               ...K  },
  { id: 'reorder',      cat: 'atur',     icon: 'ListOrdered',     name: 'Atur PDF',          desc: 'Sortir halaman file PDF Anda sesuai keinginan. Hapus atau tambahkan halaman PDF ke dokumen Anda dengan mudah.',                               ...O  },
  { id: 'pagenumber',   cat: 'atur',     icon: 'Hash',            name: 'Nomor Halaman',     desc: 'Tambahkan nomor halaman ke PDF dengan mudah. Pilih posisi, dimensi, tipografi Anda.',                                                         ...A  },
  { id: 'crop',         cat: 'atur',     icon: 'Crop',            name: 'Potong PDF',        desc: 'Potong margin dari dokumen PDF atau pilih area tertentu, kemudian terapkan perubahan ke satu halaman atau ke seluruh dokumen.',                ...K  },
  { id: 'repair',       cat: 'atur',     icon: 'Wrench',          name: 'Perbaiki PDF',      desc: 'Perbaiki PDF yang rusak dan pulihkan data dari PDF yang rusak. Perbaiki file PDF dengan alat Perbaikan kami.',                                 ...G  },

  // ── EDIT PDF ──────────────────────────────────────────────────
  { id: 'watermark',    cat: 'edit',     icon: 'Layers',          name: 'Tanda Air',         desc: 'Tempelkan gambar atau teks di atas PDF Anda dalam hitungan detik. Pilih tipografi, transparansi dan posisinya.',                              ...B  },
  { id: 'sign',         cat: 'edit',     icon: 'PenLine',         name: 'Tanda Tangani PDF', desc: 'Tanda tangani oleh Anda sendiri atau minta tanda tangan elektronik dari orang lain.',                                                         ...I  },
  { id: 'redact',       cat: 'edit',     icon: 'Eraser',          name: 'Samarkan PDF',      desc: 'Hapus permanen grafik dan teks yang terlihat dari dokumen. Gunakan alat Samarkan PDF untuk menutupi teks PDF dan informasi sensitif.',         ...P  },

  // ── KEAMANAN ──────────────────────────────────────────────────
  { id: 'protect',      cat: 'keamanan', icon: 'Lock',            name: 'Proteksi PDF',      desc: 'Proteksi file PDF dengan kata sandi. Enkripsi dokumen PDF untuk mencegah akses yang tidak berhak.',                                           ...B  },
  { id: 'unlock',       cat: 'keamanan', icon: 'Unlock',          name: 'Buka PDF Terkunci', desc: 'Hapus keamanan kata sandi PDF, sehingga Anda bebas menggunakan PDF sesuai keinginan.',                                                        ...C  },

  // ── KONVERSI ──────────────────────────────────────────────────
  { id: 'pdf2img',      cat: 'konversi', icon: 'Camera',          name: 'PDF ke JPG',        desc: 'Konversi setiap halaman PDF ke JPG atau ekstrak semua gambar yang tersimpan dalam PDF.',                                                      ...O  },
  { id: 'pdf2docx',     cat: 'konversi', icon: 'FileOutput',      name: 'PDF ke Word',       desc: 'Konversi file PDF dengan mudah menjadi dokumen DOC dan DOCX yang mudah diedit.',                                                              ...WB },
  { id: 'pdf2xlsx',     cat: 'konversi', icon: 'FileSpreadsheet', name: 'PDF ke Excel',      desc: 'Ambil data langsung dari PDF menjadi spreadsheet Excel dalam beberapa detik.',                                                                 ...XG },
  { id: 'img2pdf',      cat: 'konversi', icon: 'ImagePlus',       name: 'JPG ke PDF',        desc: 'Konversi gambar JPG ke PDF dalam hitungan detik. Sesuaikan orientasi dan margin dengan mudah.',                                                ...O  },
  { id: 'word2pdf',     cat: 'konversi', icon: 'FileText',        name: 'Word ke PDF',       desc: 'Buat file DOC dan DOCX mudah dibaca dengan dikonversi ke PDF.',                                                                                ...WB },
  { id: 'excel2pdf',    cat: 'konversi', icon: 'BarChart2',       name: 'Excel ke PDF',      desc: 'Buat spreadsheet EXCEL mudah dibaca dengan dikonversi ke PDF.',                                                                                ...XG },
  { id: 'html2pdf',     cat: 'konversi', icon: 'Code2',           name: 'HTML ke PDF',       desc: 'Konversi halaman web di HTML ke PDF. Salin dan tempelkan URL dari halaman yang Anda inginkan.',                                                ...A  },
  { id: 'img2jpg',      cat: 'konversi', icon: 'Image',           name: 'PNG ke JPG',        desc: 'Konversi gambar PNG atau WebP ke format JPG dengan cepat dan mudah.',                                                                          ...A  },
  { id: 'img2png',      cat: 'konversi', icon: 'Image',           name: 'JPG ke PNG',        desc: 'Konversi gambar JPG atau WebP ke format PNG berkualitas tinggi.',                                                                               ...G  },
  { id: 'img2webp',     cat: 'konversi', icon: 'Image',           name: 'Ke Format WebP',    desc: 'Konversi gambar JPG atau PNG ke format WebP modern untuk web yang lebih cepat.',                                                               ...B  },
  { id: 'excel2csv',    cat: 'konversi', icon: 'List',            name: 'Excel ke CSV',      desc: 'Konversi spreadsheet Excel ke format CSV yang universal dan mudah dibaca.',                                                                     ...XG },
  { id: 'word2txt',     cat: 'konversi', icon: 'AlignLeft',       name: 'Word ke Teks',      desc: 'Ekstrak teks murni dari dokumen Word ke file TXT yang ringan.',                                                                                ...WB },
]

export function useTool(id) {
  return TOOLS.find((t) => t.id === id) || null
}

export const CATEGORIES = [
  { id: 'atur',     label: 'Atur PDF'     },
  { id: 'edit',     label: 'Edit PDF'     },
  { id: 'keamanan', label: 'Keamanan PDF' },
  { id: 'konversi', label: 'Konversi PDF' },
]
