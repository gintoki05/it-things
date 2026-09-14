export type SwissToolCategory = "format" | "crypto" | "generator" | "text"

export type SwissToolId =
  | "json"
  | "pdf-merge"
  | "pdf-split"
  | "pdf-convert"
  | "pdf-compress"
  | "jwt"
  | "hash"
  | "encode"
  | "uuid"
  | "timestamp"
  | "case"
  | "regex"

export interface SwissToolDefinition {
  id: SwissToolId
  name: string
  command: string
  category: SwissToolCategory
  description: string
  badge?: string
}

export const SWISS_TOOLS: SwissToolDefinition[] = [
  {
    id: "json",
    name: "JSON Formatter & Validator",
    command: "JSON_FMT.EXE",
    category: "format",
    description: "Prettify, minify, validasi syntax error, dan perbaiki format JSON.",
    badge: "Populer",
  },
  {
    id: "pdf-merge",
    name: "PDF Merge",
    command: "PDF_MERGE.EXE",
    category: "format",
    description: "Gabungkan banyak dokumen PDF menjadi satu file dalam urutan yang ditentukan.",
    badge: "PDF",
  },
  {
    id: "pdf-split",
    name: "PDF Split & Organize",
    command: "PDF_SPLIT.EXE",
    category: "format",
    description: "Pecah halaman, putar orientasi (rotate), buang lembar, dan preview visual thumbnail.",
    badge: "PDF",
  },
  {
    id: "pdf-convert",
    name: "PDF & Image Converter",
    command: "PDF_CONV.EXE",
    category: "format",
    description: "Konversi gambar (JPG/PNG) ke PDF atau ekstrak halaman PDF menjadi gambar berkualitas tinggi.",
    badge: "PDF",
  },
  {
    id: "pdf-compress",
    name: "Kompres PDF",
    command: "PDF_COMPRESS.EXE",
    category: "format",
    description: "Perkecil ukuran file PDF (Ekstrem, Rekomendasi, Ringan) untuk batas upload email atau portal.",
    badge: "PDF",
  },
  {
    id: "jwt",
    name: "JWT Inspector",
    command: "JWT_DECODE.EXE",
    category: "crypto",
    description: "Decode token Header & Payload, cek status kedaluwarsa secara offline.",
    badge: "Security",
  },
  {
    id: "hash",
    name: "Hash Generator",
    command: "HASH_GEN.EXE",
    category: "crypto",
    description: "Generate MD5, SHA-1, SHA-256, dan SHA-512 instan dari string.",
  },
  {
    id: "encode",
    name: "Base64 & URL Encoder",
    command: "BASE64_URL.EXE",
    category: "format",
    description: "Encode / decode Base64 (UTF-8 / URL-safe) dan URL string.",
  },
  {
    id: "uuid",
    name: "UUID & ID Generator",
    command: "UUID_GEN.EXE",
    category: "generator",
    description: "Generate UUID v4 dan NanoID acak secara satuan atau borongan (batch).",
  },
  {
    id: "timestamp",
    name: "Konversi Waktu & Zona Dunia",
    command: "TIME_CONV.EXE",
    category: "generator",
    description: "Konversi Unix timestamp, zona waktu dunia (WIB, UTC, JST, PST), dan kalkulator durasi.",
  },
  {
    id: "case",
    name: "Case & Text Converter",
    command: "CASE_CONV.EXE",
    category: "text",
    description: "Ubah teks ke camelCase, snake_case, kebab-case, CONSTANT_CASE, dll.",
  },
  {
    id: "regex",
    name: "Regex Tester",
    command: "REGEXP_TEST.EXE",
    category: "text",
    description: "Uji pola RegExp dengan berbagai flags dan sorot kecocokan realtime.",
  },
]
