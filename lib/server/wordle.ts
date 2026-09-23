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
}

export const WORDLE_HINTS: Record<string, { category: string }> = {
  // IT & Tech
  KABEL: { category: "IT & Perangkat Keras" },
  ROBOT: { category: "IT & Otomasi" },
  PIXEL: { category: "IT & Grafis" },
  MODEM: { category: "IT & Jaringan" },
  CLOUD: { category: "IT & Server" },
  REACT: { category: "IT & Pemrograman" },
  BUILD: { category: "IT & Pemrograman" },
  STACK: { category: "IT & Struktur Data" },
  CACHE: { category: "IT & Performa" },
  QUERY: { category: "IT & Basis Data" },
  LOGIC: { category: "IT & Pemrograman" },
  FIBER: { category: "IT & Jaringan" },
  CYBER: { category: "IT & Keamanan" },
  LINUX: { category: "IT & Sistem Operasi" },
  PROXY: { category: "IT & Jaringan" },
  TOKEN: { category: "IT & Keamanan" },
  PATCH: { category: "IT & Software" },
  DEBUG: { category: "IT & Pemrograman" },
  MOUSE: { category: "IT & Perangkat Keras" },
  DRIVE: { category: "IT & Perangkat Keras" },
  SHIFT: { category: "IT & Perangkat Keras" },
  ENTER: { category: "IT & Perangkat Keras" },
  RESET: { category: "IT & Sistem" },
  SHELL: { category: "IT & Sistem" },
  CRASH: { category: "IT & Sistem" },
  ROUTE: { category: "IT & Jaringan" },
  TRACK: { category: "IT & Manajemen" },
  CLONE: { category: "IT & Version Control" },
  ASYNC: { category: "IT & Pemrograman" },
  ARRAY: { category: "IT & Pemrograman" },
  DIGIT: { category: "IT & Matematika" },
  ERROR: { category: "IT & Pemrograman" },
  FLASH: { category: "IT & Perangkat Keras" },
  INPUT: { category: "IT & Sistem" },
  MACRO: { category: "IT & Otomasi" },
  PRINT: { category: "IT & Output" },
  QUEUE: { category: "IT & Struktur Data" },
  TABLE: { category: "IT & Basis Data" },
  VIRUS: { category: "IT & Keamanan" },
  AUDIO: { category: "IT & Multimedia" },
  VIDEO: { category: "IT & Multimedia" },
  RADIO: { category: "IT & Komunikasi" },
  BASIC: { category: "IT & Pemrograman" },
  BOARD: { category: "IT & Perangkat Keras" },
  CHIPS: { category: "IT & Perangkat Keras" },
  CODES: { category: "IT & Pemrograman" },
  PANEL: { category: "IT & Antarmuka" },
  CLICK: { category: "IT & Interaksi" },

  // Kultur Kantor & Pantry
  REKAP: { category: "Kultur Kantor" },
  KARTU: { category: "Kultur Kantor" },
  GALON: { category: "Pantry Kantor" },
  GELAS: { category: "Pantry Kantor" },
  MINUM: { category: "Pantry Kantor" },
  SNACK: { category: "Pantry Kantor" },
  SURAT: { category: "Kultur Kantor" },
  LAPAK: { category: "Kultur Kantor" },
  KURSI: { category: "Kultur Kantor" },
  RAPAT: { category: "Kultur Kantor" },
  SENIN: { category: "Kultur Kantor" },
  JUMAT: { category: "Kultur Kantor" },
  MAKAN: { category: "Kultur Kantor" },
  LEMBUR: { category: "Kultur Kantor" },
  BONUS: { category: "Kultur Kantor" },
  TEMAN: { category: "Kultur Kantor" },
  TIKET: { category: "Kultur Kantor & Support" },
  ABSEN: { category: "Kultur Kantor" },
  HADIR: { category: "Kultur Kantor" },
  SALDO: { category: "Kultur Kantor & Keuangan" },
  BEBAN: { category: "Kultur Kantor" },
  PULSA: { category: "Kultur Kantor" },
  BAYAR: { category: "Kultur Kantor" },
  KASIR: { category: "Kultur Kantor" },
  PESAN: { category: "Kultur Kantor" },
  TUGAS: { category: "Kultur Kantor" },
  ORDER: { category: "Kultur Kantor" },
  PAKET: { category: "Kultur Kantor" },
  MITRA: { category: "Kultur Kantor" },
  SEGER: { category: "Pantry Kantor" },

  // Kata Umum Bahasa Indonesia
  ANGIN: { category: "Alam & Fenomena" },
  BADAI: { category: "Alam & Fenomena" },
  BALON: { category: "Benda & Umum" },
  BATIK: { category: "Budaya Nusantara" },
  BERAS: { category: "Kebutuhan Pangan" },
  BINTI: { category: "Bahasa & Silsilah" },
  BUKAN: { category: "Kata Bahasa Indonesia" },
  BUNGA: { category: "Tumbuhan & Alam" },
  CANDI: { category: "Sejarah & Budaya" },
  CERAH: { category: "Cuaca & Suasana" },
  CERIA: { category: "Emosi & Suasana" },
  CINTA: { category: "Emosi & Rasa" },
  CUACA: { category: "Alam & Lingkungan" },
  DANAU: { category: "Alam & Geografi" },
  DUNIA: { category: "Geografi & Alam" },
  ELANG: { category: "Fauna & Hewan" },
  GAJAH: { category: "Fauna & Hewan" },
  GELAP: { category: "Kondisi & Suasana" },
  HUJAN: { category: "Alam & Cuaca" },
  HUTAN: { category: "Alam & Lingkungan" },
  JALAN: { category: "Infrastruktur" },
  JARUM: { category: "Alat & Benda" },
  JERUK: { category: "Buah & Segar" },
  KAPAL: { category: "Transportasi" },
  KASIH: { category: "Emosi & Rasa" },
  KELAS: { category: "Edukasi & Ruang" },
  KORAN: { category: "Media & Informasi" },
  KUNCI: { category: "Peralatan" },
  LAMPU: { category: "Peralatan" },
  LEBAH: { category: "Fauna & Serangga" },
  LEMON: { category: "Buah & Segar" },
  MACAN: { category: "Fauna & Satwa" },
  MANIS: { category: "Rasa & Cita Rasa" },
  MAWAR: { category: "Tumbuhan & Bunga" },
  MEDAN: { category: "Geografi & Tempat" },
  MELON: { category: "Buah & Segar" },
  MOTOR: { category: "Transportasi" },
  MUSIK: { category: "Seni & Hiburan" },
  NANAS: { category: "Buah & Segar" },
  OMBAK: { category: "Alam & Kelautan" },
  PANTAI: { category: "Geografi & Wisata" },
  PASAR: { category: "Ekonomi & Tempat" },
  POHON: { category: "Flora & Tumbuhan" },
  PULAU: { category: "Geografi" },
  PUTIH: { category: "Warna" },
  RUMAH: { category: "Hunian & Bangunan" },
  SABUN: { category: "Kebersihan" },
  SAWAH: { category: "Pertanian & Alam" },
  SENJA: { category: "Waktu & Alam" },
  SIANG: { category: "Waktu" },
  SINAR: { category: "Fisika & Cahaya" },
  SINGA: { category: "Fauna & Satwa" },
  SURGA: { category: "Spiritual & Harapan" },
  TAMAN: { category: "Lingkungan & Rekreasi" },
  TANAH: { category: "Alam & Bumi" },
  TIMUR: { category: "Arah Mata Angin" },
  TIANG: { category: "Konstruksi" },
  UDARA: { category: "Alam & Elemen" },
  WAJAH: { category: "Tubuh Manusia" },
  ZEBRA: { category: "Fauna & Satwa" },
  GARIS: { category: "Geometri & Desain" },
  HITAM: { category: "Warna" },
  MERAH: { category: "Warna" },
  HIJAU: { category: "Warna" },
  BULAN: { category: "Antariksa & Waktu" },
  SABTU: { category: "Waktu & Hari" },
  SELAS: { category: "Waktu & Hari" },
  KAMIS: { category: "Waktu & Hari" },
  MALAM: { category: "Waktu" },
  SUBUH: { category: "Waktu" },
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
    category: "Kata Pilihan",
  }

  return {
    dayNumber: dayIndex + 1,
    quizNumber,
    targetDate: dateStr,
    word,
    hint: {
      category: hintInfo.category,
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
