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

const BASE_DATE = new Date("2026-01-01T00:00:00Z")

export function getTodayDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function getDailyWordlePuzzle(dateStr: string = getTodayDateString()) {
  const targetDate = new Date(`${dateStr}T00:00:00Z`)
  const diffTime = targetDate.getTime() - BASE_DATE.getTime()
  const dayIndex = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))

  const wordIndex = dayIndex % WORDLE_WORD_LIST.length
  return {
    dayNumber: dayIndex + 1,
    targetDate: dateStr,
    word: WORDLE_WORD_LIST[wordIndex],
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
