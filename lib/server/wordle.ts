// Server-side only logic for Wordle 98
// Word bank and target word computation are kept strictly on the server to prevent client-side leaks.

export const WORDLE_WORD_LIST = [
  // IT & Tech
  "KABEL", "ROBOT", "PIXEL", "MODEM", "CLOUD", "REACT", "BUILD", "STACK",
  "CACHE", "QUERY", "LOGIC", "FIBER", "CYBER", "LINUX", "PROXY", "TOKEN",
  "PATCH", "DEBUG", "MOUSE", "DRIVE", "SHIFT", "ENTER", "RESET", "SHELL",
  "CRASH", "ROUTE", "TRACK", "CLONE", "ASYNC", "ARRAY", "DIGIT", "ERROR",
  "FLASH", "INPUT", "MACRO", "PRINT", "QUEUE", "TABLE", "VIRUS", "AUDIO",
  "VIDEO", "RADIO", "BASIC", "BOARD", "CHIPS", "CODES", "PANEL", "CLICK",

  // Kultur Kantor & Pantry
  "PANTRY", "REKAP", "KARTU", "GALON", "GELAS", "MINUM", "SNACK", "SURAT",
  "LAPAK", "KURSI", "RAPAT", "SENIN", "JUMAT", "MAKAN", "LEMBUR", "BONUS",
  "TEMAN", "TIKET", "ABSEN", "HADIR", "SALDO", "BEBAN", "PULSA", "BAYAR",
  "KASIR", "KANTOR", "PESAN", "TUGAS", "ORDER", "PAKET", "MITRA", "SEGER",

  // Kata Umum Bahasa Indonesia
  "ANGIN", "BADAI", "BALON", "BATIK", "BERAS", "BINTI", "BUKAN", "BUNGA",
  "CANDI", "CERAH", "CERIA", "CINTA", "CUACA", "DANAU", "DUNIA", "ELANG",
  "GAJAH", "GELAP", "HUJAN", "HUTAN", "JALAN", "JARUM", "JERUK", "KAPAL",
  "KASIH", "KELAS", "KORAN", "KUNCI", "LAMPU", "LEBAH", "LEMON", "MACAN",
  "MANIS", "MAWAR", "MEDAN", "MELON", "MOTOR", "MUSIK", "NANAS", "OMBAK",
  "PANTAI", "PASAR", "POHON", "PULAU", "PUTIH", "RUMAH", "SABUN", "SAWAH",
  "SENJA", "SIANG", "SINAR", "SINGA", "SURGA", "TAMAN", "TANAH", "TIMUR",
  "TIANG", "UDARA", "WAJAH", "ZEBRA", "GARIS", "HITAM", "MERAH", "HIJAU",
  "BULAN", "SABTU", "SELAS", "KAMIS", "MALAM", "SUBUH",
]
  .map((w) => w.toUpperCase().trim())
  .filter((w) => w.length === 5)

export interface WordleHint {
  category: string
  clue: string
  firstLetter: string
}

export const WORDLE_HINTS: Record<string, { category: string; clue: string }> = {
  // IT & Tech
  KABEL: { category: "IT & Perangkat Keras", clue: "Penghubung fisik transmisi sinyal data atau listrik" },
  ROBOT: { category: "IT & Otomasi", clue: "Perangkat mekanis terprogram untuk mengerjakan tugas otomatis" },
  PIXEL: { category: "IT & Grafis", clue: "Titik elemen visual terkecil pada layar monitor atau citra digital" },
  MODEM: { category: "IT & Jaringan", clue: "Alat pengubah sinyal analog ke digital untuk sambungan internet" },
  CLOUD: { category: "IT & Server", clue: "Layanan komputasi dan penyimpanan data berbasis awan internet" },
  REACT: { category: "IT & Pemrograman", clue: "Library JavaScript frontend populer berbasis komponen buatan Meta" },
  BUILD: { category: "IT & Pemrograman", clue: "Proses mengompilasi kode sumber program menjadi artefak aplikasi" },
  STACK: { category: "IT & Struktur Data", clue: "Struktur data LIFO atau kombinasi kumpulan teknologi software" },
  CACHE: { category: "IT & Performa", clue: "Tempat penyimpanan data sementara berkecepatan tinggi" },
  QUERY: { category: "IT & Basis Data", clue: "Perintah permintaan untuk mengambil atau manipulasi data di database" },
  LOGIC: { category: "IT & Pemrograman", clue: "Alur penalaran terstruktur dalam algoritma dan kode program" },
  FIBER: { category: "IT & Jaringan", clue: "Kabel optik kaca berkecepatan tinggi untuk transmisi data internet" },
  CYBER: { category: "IT & Keamanan", clue: "Istilah ranah dunia maya, keamanan internet, atau sistem komputer" },
  LINUX: { category: "IT & Sistem Operasi", clue: "Sistem operasi open-source berlogo pinguin yang populer di server" },
  PROXY: { category: "IT & Jaringan", clue: "Server perantara antara perangkat klien dan internet" },
  TOKEN: { category: "IT & Keamanan", clue: "String unik atau kunci autentikasi digital untuk verifikasi sesi" },
  PATCH: { category: "IT & Software", clue: "Pembaruan kode kecil untuk memperbaiki bug atau celah keamanan" },
  DEBUG: { category: "IT & Pemrograman", clue: "Proses mencari, menganalisis, dan memperbaiki error dalam kode" },
  MOUSE: { category: "IT & Perangkat Keras", clue: "Perangkat input penunjuk kursor di layar komputer" },
  DRIVE: { category: "IT & Perangkat Keras", clue: "Perangkat keras penyimpanan file atau partisi hard disk" },
  SHIFT: { category: "IT & Perangkat Keras", clue: "Tombol keyboard untuk mengetik huruf kapital atau simbol atas" },
  ENTER: { category: "IT & Perangkat Keras", clue: "Tombol keyboard untuk mengeksekusi perintah atau baris baru" },
  RESET: { category: "IT & Sistem", clue: "Tindakan mengatur ulang sistem atau perangkat ke kondisi awal" },
  SHELL: { category: "IT & Sistem", clue: "Antarmuka baris perintah (CLI) untuk berinteraksi dengan OS kernel" },
  CRASH: { category: "IT & Sistem", clue: "Kondisi saat program tiba-tiba berhenti bekerja atau sistem tumbang" },
  ROUTE: { category: "IT & Jaringan", clue: "Jalur navigasi pengiriman paket data atau URL web" },
  TRACK: { category: "IT & Manajemen", clue: "Memantau perkembangan task bug atau alur log sistem" },
  CLONE: { category: "IT & Version Control", clue: "Perintah menduplikasi repositori Git dari remote ke lokal" },
  ASYNC: { category: "IT & Pemrograman", clue: "Operasi tak sinkron yang berjalan di latar belakang tanpa memblokir" },
  ARRAY: { category: "IT & Pemrograman", clue: "Tipe data berurutan untuk menyimpan kumpulan elemen dalam satu variabel" },
  DIGIT: { category: "IT & Matematika", clue: "Karakter angka tunggal dari 0 hingga 9" },
  ERROR: { category: "IT & Pemrograman", clue: "Kondisi kesalahan atau kegagalan eksekusi kode pada program" },
  FLASH: { category: "IT & Perangkat Keras", clue: "Tipe memori penyimpanan data non-volatile atau lampu kilat" },
  INPUT: { category: "IT & Sistem", clue: "Data atau instruksi yang dimasukkan pengguna ke dalam komputer" },
  MACRO: { category: "IT & Otomasi", clue: "Rangkaian instruksi otomatis singkat untuk mempermudah pekerjaan berulang" },
  PRINT: { category: "IT & Output", clue: "Mencetak teks ke terminal konsol atau dokumen ke kertas fisik" },
  QUEUE: { category: "IT & Struktur Data", clue: "Struktur data antrean berprinsip First In First Out (FIFO)" },
  TABLE: { category: "IT & Basis Data", clue: "Struktur baris dan kolom untuk mengorganisir data di database" },
  VIRUS: { category: "IT & Keamanan", clue: "Program malware jahat yang dapat menyebar dan merusak sistem" },
  AUDIO: { category: "IT & Multimedia", clue: "Sinyal suara atau rekaman digital yang keluar dari speaker" },
  VIDEO: { category: "IT & Multimedia", clue: "Rekaman gambar bergerak digital beserta audio" },
  RADIO: { category: "IT & Komunikasi", clue: "Teknologi transmisi sinyal nirkabel gelombang elektromagnetik" },
  BASIC: { category: "IT & Pemrograman", clue: "Tingkat dasar atau nama bahasa pemrograman legendaris retro" },
  BOARD: { category: "IT & Perangkat Keras", clue: "Papan sirkuit elektronik seperti motherboard atau kanban task" },
  CHIPS: { category: "IT & Perangkat Keras", clue: "Keping mikroprosesor semikonduktor silikon di sirkuit elektronik" },
  CODES: { category: "IT & Pemrograman", clue: "Kumpulan sintaks baris program komputer" },
  PANEL: { category: "IT & Antarmuka", clue: "Bagian dasbor antarmuka kontrol sistem atau layar display" },
  CLICK: { category: "IT & Interaksi", clue: "Aksi menekan tombol mouse komputer untuk memilih elemen" },

  // Kultur Kantor & Pantry
  REKAP: { category: "Kultur Kantor", clue: "Meringkas kumpulan data laporan kerja atau pengeluaran" },
  KARTU: { category: "Kultur Kantor", clue: "Kartu akses masuk pintu kantor atau kartu absensi RFID" },
  GALON: { category: "Pantry Kantor", clue: "Wadah air mineral besar yang ditaruh terbalik di dispenser" },
  GELAS: { category: "Pantry Kantor", clue: "Wadah minuman favorit di pantry untuk seduh kopi atau teh" },
  MINUM: { category: "Pantry Kantor", clue: "Kebutuhan vital melepas dahaga di sela-sela jam kerja" },
  SNACK: { category: "Pantry Kantor", clue: "Camilan pengganjal lapar yang sering diperebutkan di pantry" },
  SURAT: { category: "Kultur Kantor", clue: "Dokumen korespondensi resmi atau berkas pengajuan izin" },
  LAPAK: { category: "Kultur Kantor", clue: "Ruang berbagi informasi jajanan atau titipan makan siang rekan tim" },
  KURSI: { category: "Kultur Kantor", clue: "Tempat duduk kerja ergonomis di depan meja komputer kantor" },
  RAPAT: { category: "Kultur Kantor", clue: "Pertemuan tim membahas agenda kerja proyek atau evaluasi" },
  SENIN: { category: "Kultur Kantor", clue: "Hari pembuka pekan kerja yang sering disambut monday blues" },
  JUMAT: { category: "Kultur Kantor", clue: "Hari kerja penutup pekan menjelang libur akhir pekan (TGIF)" },
  MAKAN: { category: "Kultur Kantor", clue: "Aktivitas istirahat siang bersama rekan kerja jam 12" },
  LEMBUR: { category: "Kultur Kantor", clue: "Kerja ekstra di luar jam kerja reguler demi kejar deadline rilis" },
  BONUS: { category: "Kultur Kantor", clue: "Uang tambahan apresiasi di luar gaji pokok bulanan" },
  TEMAN: { category: "Kultur Kantor", clue: "Rekan seperjuangan satu divisi atau rekan kerja kantor" },
  TIKET: { category: "Kultur Kantor & Support", clue: "Laporan keluhan bug IT atau tiket tugas helpdesk yang harus diselesaikan" },
  ABSEN: { category: "Kultur Kantor", clue: "Pencatatan presensi kehadiran kerja harian kantor" },
  HADIR: { category: "Kultur Kantor", clue: "Status konfirmasi berada di tempat kerja atau pertemuan" },
  SALDO: { category: "Kultur Kantor & Keuangan", clue: "Sisa uang kas tim yang tercatat di pembukuan bendahara" },
  BEBAN: { category: "Kultur Kantor", clue: "Biaya operasional kas atau rekan tim yang suka bikin rusuh di push rank" },
  PULSA: { category: "Kultur Kantor", clue: "Satuan kredit telepon/kuota data untuk komunikasi seluler" },
  BAYAR: { category: "Kultur Kantor", clue: "Melunasi tagihan makan siang bersama atau iuran kas tim" },
  KASIR: { category: "Kultur Kantor", clue: "Orang atau tempat pembayaran transaksi belanja" },
  PESAN: { category: "Kultur Kantor", clue: "Chat teks antar rekan tim di messenger atau orderan makanan" },
  TUGAS: { category: "Kultur Kantor", clue: "Tanggung jawab pekerjaan atau task sprint yang didelegasikan" },
  ORDER: { category: "Kultur Kantor", clue: "Memesan kopi atau makanan delivery untuk cemilan sore kantor" },
  PAKET: { category: "Kultur Kantor", clue: "Kiriman kurir belanjaan online yang datang dan bikin resepsionis manggil" },
  MITRA: { category: "Kultur Kantor", clue: "Rekan kerja sama bisnis atau vendor eksternal perusahaan" },
  SEGER: { category: "Pantry Kantor", clue: "Sensasi nikmat minum es teh manis atau kopi dingin di siang terik" },

  // Kata Umum Bahasa Indonesia
  ANGIN: { category: "Alam & Fenomena", clue: "Aliran udara yang berhembus dan terasa menyejukkan" },
  BADAI: { category: "Alam & Fenomena", clue: "Cuaca ekstrem angin kencang disertai hujan lebat" },
  BALON: { category: "Benda & Umum", clue: "Kantung karet elastis yang ditiup udara atau gas helium" },
  BATIK: { category: "Budaya Nusantara", clue: "Kain tradisional Indonesia bercorak motif khas warisan budaya" },
  BERAS: { category: "Kebutuhan Pangan", clue: "Bulir padi yang telah dikupas, siap dimasak menjadi nasi" },
  BINTI: { category: "Bahasa & Silsilah", clue: "Kata penunjuk anak perempuan dari sang ayah" },
  BUKAN: { category: "Kata Bahasa Indonesia", clue: "Kata negasi untuk menyatakan sanggahan atau bantahan" },
  BUNGA: { category: "Tumbuhan & Alam", clue: "Bagian tanaman yang indah dan wangi semerbak" },
  CANDI: { category: "Sejarah & Budaya", clue: "Bangunan bersejarah peninggalan purbakala seperti Borobudur" },
  CERAH: { category: "Cuaca & Suasana", clue: "Kondisi langit terang benderang tidak berawan" },
  CERIA: { category: "Emosi & Suasana", clue: "Suasana hati gembira, berseri-seri, dan penuh semangat" },
  CINTA: { category: "Emosi & Rasa", clue: "Perasaan kasih sayang mendalam terhadap seseorang" },
  CUACA: { category: "Alam & Lingkungan", clue: "Keadaan atmosfer udara harian di suatu wilayah" },
  DANAU: { category: "Alam & Geografi", clue: "Genangan air luas di daratan yang dikelilingi tanah" },
  DUNIA: { category: "Geografi & Alam", clue: "Bumi beserta seluruh kehidupan dan peradaban di atasnya" },
  ELANG: { category: "Fauna & Hewan", clue: "Burung pemangsa berparuh tajam dengan penglihatan sangat tajam" },
  GAJAH: { category: "Fauna & Hewan", clue: "Mamalia darat berbadan raksasa dengan belalai panjang dan gading" },
  GELAP: { category: "Kondisi & Suasana", clue: "Keadaan tanpa cahaya lampu atau saat mati lampu di malam hari" },
  HUJAN: { category: "Alam & Cuaca", clue: "Titik-titik air yang berjatuhan dari awan di langit" },
  HUTAN: { category: "Alam & Lingkungan", clue: "Kawasan daratan luas yang ditumbuhi pepohonan rimbun lebat" },
  JALAN: { category: "Infrastruktur", clue: "Lintasan yang dilalui kendaraan dan pejalan kaki" },
  JARUM: { category: "Alat & Benda", clue: "Alat kecil runcing tajam dari logam untuk menjahit pakaian" },
  JERUK: { category: "Buah & Segar", clue: "Buah berkulit oranye kaya vitamin C dengan rasa asam manis" },
  KAPAL: { category: "Transportasi", clue: "Kendaraan besar yang berlayar mengarungi lautan" },
  KASIH: { category: "Emosi & Rasa", clue: "Perasaan sayang tulus atau ungkapan terima kasih" },
  KELAS: { category: "Edukasi & Ruang", clue: "Ruang tempat belajar mengajar atau tingkatan kategori" },
  KORAN: { category: "Media & Informasi", clue: "Lembaran kertas berita harian cetak pagi" },
  KUNCI: { category: "Peralatan", clue: "Alat logam pembuka gembok pintu atau solusi dari sebuah teka-teki" },
  LAMPU: { category: "Peralatan", clue: "Perangkat penerangan ruangan yang menghasilkan cahaya" },
  LEBAH: { category: "Fauna & Serangga", clue: "Serangga bersengat penghasil madu manis alami" },
  LEMON: { category: "Buah & Segar", clue: "Buah sitrus lonjong berwarna kuning cerah dengan rasa sangat masam" },
  MACAN: { category: "Fauna & Satwa", clue: "Kucing besar pemangsa karnivora berbelang di hutan" },
  MANIS: { category: "Rasa & Cita Rasa", clue: "Rasa khas gula aren atau permen cokelat" },
  MAWAR: { category: "Tumbuhan & Bunga", clue: "Bunga cantik berduri pada tangkainya dengan aroma harum" },
  MEDAN: { category: "Geografi & Tempat", clue: "Kota metropolitan di Sumatra Utara atau area medan pertempuran" },
  MELON: { category: "Buah & Segar", clue: "Buah bulat manis berdaging hijau segar atau jingga" },
  MOTOR: { category: "Transportasi", clue: "Kendaraan roda dua bermesin andalan transportasi harian" },
  MUSIK: { category: "Seni & Hiburan", clue: "Nada dan irama indah yang diputar lewat headphone saat ngoding" },
  NANAS: { category: "Buah & Segar", clue: "Buah tropis berkulit kasar berduri halus dengan mahkota daun di atasnya" },
  OMBAK: { category: "Alam & Kelautan", clue: "Gelombang air laut yang bergulung-gulung menuju pantai" },
  PANTAI: { category: "Geografi & Wisata", clue: "Tepian daratan berpasir yang berbatasan langsung dengan laut" },
  PASAR: { category: "Ekonomi & Tempat", clue: "Tempat bertemunya penjual dan pembeli untuk bertransaksi" },
  POHON: { category: "Flora & Tumbuhan", clue: "Tumbuhan berkayu besar yang rindang dan berdaun lebat" },
  PULAU: { category: "Geografi", clue: "Daratan yang seluruh sisinya dikelilingi oleh air" },
  PUTIH: { category: "Warna", clue: "Warna netral terang seperti kertas bersih atau susu murni" },
  RUMAH: { category: "Hunian & Bangunan", clue: "Tempat tinggal dan istirahat ternyaman setelah lelah bekerja" },
  SABUN: { category: "Kebersihan", clue: "Bahan pembersih untuk mandi atau cuci tangan hingga berbusa" },
  SAWAH: { category: "Pertanian & Alam", clue: "Lahan berlumpur bertingkat tempat menanam padi" },
  SENJA: { category: "Waktu & Alam", clue: "Momen pergantian sore menuju malam saat matahari terbenam jingga" },
  SIANG: { category: "Waktu", clue: "Waktu tengah hari saat matahari berada di titik tertinggi" },
  SINAR: { category: "Fisika & Cahaya", clue: "Pancaran terang cahaya matahari atau lampu" },
  SINGA: { category: "Fauna & Satwa", clue: "Raja hutan mamalia buas berkepala surai lebat" },
  SURGA: { category: "Spiritual & Harapan", clue: "Tempat kebahagiaan abadi yang penuh kedamaian" },
  TAMAN: { category: "Lingkungan & Rekreasi", clue: "Area terbuka hijau yang asri dengan rumput dan aneka bunga" },
  TANAH: { category: "Alam & Bumi", clue: "Lapisan kerak terluar bumi tempat berpijak dan bertumbuhnya tanaman" },
  TIMUR: { category: "Arah Mata Angin", clue: "Arah terbitnya sang fajar matahari pagi" },
  TIANG: { category: "Konstruksi", clue: "Pilar tegak penopang atap bangunan atau tiang bendera" },
  UDARA: { category: "Alam & Elemen", clue: "Gas oksigen tak kasat mata yang kita hirup untuk bernapas" },
  WAJAH: { category: "Tubuh Manusia", clue: "Bagian depan kepala manusia tempat mata, hidung, dan senyuman" },
  ZEBRA: { category: "Fauna & Satwa", clue: "Hewan mirip kuda bercorak belang loreng hitam putih khas Afrika" },
  GARIS: { category: "Geometri & Desain", clue: "Bentuk coretan lurus atau melengkung yang menghubungkan dua titik" },
  HITAM: { category: "Warna", clue: "Warna paling gelap tanpa pantulan cahaya" },
  MERAH: { category: "Warna", clue: "Warna berani lambang semangat dan keberanian" },
  HIJAU: { category: "Warna", clue: "Warna daun segar lambang alam dan indikator sukses" },
  BULAN: { category: "Antariksa & Waktu", clue: "Satelit alami bumi yang bersinar di langit malam atau satuan kalender" },
  SABTU: { category: "Waktu & Hari", clue: "Hari pertama di akhir pekan untuk liburan santai" },
  SELAS: { category: "Waktu & Hari", clue: "Singkatan hari Selasa, hari kedua dalam sepekan kerja" },
  KAMIS: { category: "Waktu & Hari", clue: "Hari kerja sebelum Jumat, sering pakai batik di kantor" },
  MALAM: { category: "Waktu", clue: "Waktu gelap saat matahari terbenam dan waktunya tidur" },
  SUBUH: { category: "Waktu", clue: "Waktu fajar dini hari sebelum matahari terbit" },
}

const BASE_DATE = new Date("2026-01-01T00:00:00Z")

export function getTodayDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function getDailyWordlePuzzle(dateStr: string = getTodayDateString(), quizNumber: 1 | 2 = 1) {
  const targetDate = new Date(`${dateStr}T00:00:00Z`)
  const diffTime = targetDate.getTime() - BASE_DATE.getTime()
  const dayIndex = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))

  const wordIndex =
    quizNumber === 2
      ? (dayIndex * 2 + 1) % WORDLE_WORD_LIST.length
      : (dayIndex * 2) % WORDLE_WORD_LIST.length

  const word = WORDLE_WORD_LIST[wordIndex]
  const hintInfo = WORDLE_HINTS[word] || {
    category: "Kata Bahasa Indonesia / IT",
    clue: "Kata 5 huruf misterius untuk kuis harian",
  }

  return {
    dayNumber: dayIndex + 1,
    quizNumber,
    targetDate: dateStr,
    word,
    hint: {
      category: hintInfo.category,
      clue: hintInfo.clue,
      firstLetter: word[0] || "",
    },
  }
}

export type LetterStatus = "correct" | "present" | "absent" | "empty"

export interface EvaluatedLetter {
  char: string
  status: LetterStatus
}

export function evaluateGuess(guess: string, targetWord: string): EvaluatedLetter[] {
  const cleanGuess = guess.toUpperCase().trim()
  const cleanTarget = targetWord.toUpperCase().trim()

  const result: EvaluatedLetter[] = Array.from({ length: 5 }, (_, i) => ({
    char: cleanGuess[i] || "",
    status: "absent",
  }))

  const targetChars = cleanTarget.split("")
  const letterCounts: Record<string, number> = {}

  // 1. Hitung frekuensi huruf di target
  for (const c of targetChars) {
    letterCounts[c] = (letterCounts[c] || 0) + 1
  }

  // Pass 1: Tandai 'correct' (posisi pas)
  for (let i = 0; i < 5; i++) {
    if (cleanGuess[i] === targetChars[i]) {
      result[i].status = "correct"
      letterCounts[cleanGuess[i]] -= 1
    }
  }

  // Pass 2: Tandai 'present' (ada tapi posisi beda)
  for (let i = 0; i < 5; i++) {
    if (result[i].status !== "correct") {
      const char = cleanGuess[i]
      if (char && letterCounts[char] && letterCounts[char] > 0) {
        result[i].status = "present"
        letterCounts[char] -= 1
      } else {
        result[i].status = "absent"
      }
    }
  }

  return result
}
