"use client"

/* eslint-disable @next/next/no-img-element */
import * as React from "react"
import { PDFDocument } from "pdf-lib"
import {
  UploadCloud,
  Trash2,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  FileText,
  Minimize2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
} from "lucide-react"
import {
  formatFileSize,
  loadPdfDocument,
  renderPdfPageToDataUrl,
  downloadPdfBytes,
} from "../pdf-utils"
import { playRetroNotificationSound } from "@/lib/sound-effects"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { PdfPreviewModal } from "../pdf-preview-modal"

type CompressionPreset = "extreme" | "recommended" | "low"

interface PresetConfig {
  id: CompressionPreset
  title: string
  reductionBadge: string
  scale: number
  quality: number
  description: string
}

const PRESETS: PresetConfig[] = [
  {
    id: "recommended",
    title: "Rekomendasi (Keseimbangan Terbaik)",
    reductionBadge: "Hemat ~50% - 75%",
    scale: 1.35,
    quality: 0.68,
    description: "Keseimbangan ideal antara ukuran berkas yang ringkas dan ketajaman teks dokumen.",
  },
  {
    id: "extreme",
    title: "Kompresi Ekstrem (Ukuran Terkecil)",
    reductionBadge: "Hemat ~75% - 90%",
    scale: 1.0,
    quality: 0.45,
    description: "Kompresi agresif untuk memenuhi batas upload ketat (email, sistem portal < 1MB).",
  },
  {
    id: "low",
    title: "Kompresi Ringan (Kualitas Tinggi)",
    reductionBadge: "Hemat ~25% - 40%",
    scale: 1.8,
    quality: 0.85,
    description: "Kualitas visual tetap sangat tajam, cocok untuk dokumen yang akan dicetak.",
  },
]

interface PdfCompressToolProps {
  onDirtyChange?: (isDirty: boolean) => void
}

interface CompressResult {
  bytes: Uint8Array
  originalSize: number
  compressedSize: number
  pageCount: number
  name: string
}

export function PdfCompressTool({ onDirtyChange }: PdfCompressToolProps) {
  const [file, setFile] = React.useState<File | null>(null)
  const [fileBuffer, setFileBuffer] = React.useState<ArrayBuffer | null>(null)
  const [pageCount, setPageCount] = React.useState<number | null>(null)
  const [coverThumbnail, setCoverThumbnail] = React.useState<string | null>(null)
  const [preset, setPreset] = React.useState<CompressionPreset>("recommended")
  const [isCompressing, setIsCompressing] = React.useState(false)
  const [progress, setProgress] = React.useState<{ current: number; total: number; msg: string } | null>(null)
  const [result, setResult] = React.useState<CompressResult | null>(null)
  const [status, setStatus] = React.useState<{ type: "success" | "error" | "info"; message: string } | null>(null)
  const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false)
  const [previewTarget, setPreviewTarget] = React.useState<{ title: string; source: File | Uint8Array | null } | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Notify parent regarding unsaved state
  React.useEffect(() => {
    onDirtyChange?.(file !== null)
  }, [file, onDirtyChange])

  // Browser level beforeunload guard
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (file || isCompressing) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [file, isCompressing])

  // Handle file select
  const handleSelectFile = async (selectedFile: File) => {
    if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setStatus({ type: "error", message: "Hanya file berekstensi .pdf yang didukung." })
      return
    }

    try {
      setStatus(null)
      setResult(null)
      setFile(selectedFile)
      setCoverThumbnail(null)

      const buffer = await selectedFile.arrayBuffer()
      setFileBuffer(buffer)

      // Get page count and cover thumbnail
      const pdfJsDoc = await loadPdfDocument(buffer)
      setPageCount(pdfJsDoc.numPages)

      try {
        const cover = await renderPdfPageToDataUrl(pdfJsDoc, 1, 0.25, "image/jpeg", 0.7)
        setCoverThumbnail(cover.dataUrl)
      } catch (err) {
        console.warn("Gagal membuat cover preview:", err)
      }
    } catch (err) {
      console.error("Gagal membaca file PDF:", err)
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal membaca file PDF.",
      })
      setFile(null)
      setFileBuffer(null)
    }
  }

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectFile(e.dataTransfer.files[0])
    }
  }

  // Eksekusi Kompresi
  const handleCompress = async () => {
    if (!file) return

    const activeConfig = PRESETS.find((p) => p.id === preset) || PRESETS[0]

    try {
      setIsCompressing(true)
      setStatus(null)
      setResult(null)
      setProgress({ current: 0, total: pageCount || 1, msg: "Mempersiapkan dokumen..." })

      const freshBuffer = await file.arrayBuffer()
      const pdfJsDoc = await loadPdfDocument(freshBuffer)
      const totalPages = pdfJsDoc.numPages
      const newPdfDoc = await PDFDocument.create()

      for (let i = 1; i <= totalPages; i++) {
        setProgress({
          current: i,
          total: totalPages,
          msg: `Mengompresi halaman ${i} dari ${totalPages}...`,
        })

        // Render page to JPEG with configured scale & quality
        const { blob, width, height } = await renderPdfPageToDataUrl(
          pdfJsDoc,
          i,
          activeConfig.scale,
          "image/jpeg",
          activeConfig.quality
        )

        const imgBytes = new Uint8Array(await blob.arrayBuffer())
        const embeddedImg = await newPdfDoc.embedJpg(imgBytes)

        // Add page matching viewport proportions (points)
        const pointWidth = width / activeConfig.scale
        const pointHeight = height / activeConfig.scale

        const newPage = newPdfDoc.addPage([pointWidth, pointHeight])
        newPage.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: pointWidth,
          height: pointHeight,
        })
      }

      setProgress({ current: totalPages, total: totalPages, msg: "Menyimpan & memadatkan stream objek..." })

      // Compress PDF dictionary & object streams
      const compressedBytes = await newPdfDoc.save({ useObjectStreams: true })
      const originalSize = file.size
      const compressedSize = compressedBytes.byteLength
      const baseName = file.name.replace(/\.pdf$/i, "")
      const outputFilename = `${baseName}_compressed.pdf`

      const resData: CompressResult = {
        bytes: compressedBytes,
        originalSize,
        compressedSize,
        pageCount: totalPages,
        name: outputFilename,
      }

      setResult(resData)
      playRetroNotificationSound(0.2)

      const savedBytes = originalSize - compressedSize
      const percent = Math.round((savedBytes / originalSize) * 100)

      if (savedBytes > 0) {
        setStatus({
          type: "success",
          message: `Kompresi sukses! Ukuran berkas berkurang sebesar ${percent}% (${formatFileSize(savedBytes)} dihemat).`,
        })
      } else {
        setStatus({
          type: "info",
          message: `Dokumen sudah memiliki kompresi yang sangat padat. Ukuran hasil kompresi mirip dengan aslinya.`,
        })
      }

      // Auto download
      downloadPdfBytes(compressedBytes, outputFilename)
    } catch (err) {
      console.error("Gagal melakukan kompresi PDF:", err)
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Terjadi kesalahan saat mengompresi PDF.",
      })
    } finally {
      setIsCompressing(false)
      setProgress(null)
    }
  }

  const handleReset = () => {
    setFile(null)
    setFileBuffer(null)
    setPageCount(null)
    setCoverThumbnail(null)
    setResult(null)
    setStatus(null)
    setIsResetConfirmOpen(false)
  }

  return (
    <div className="flex h-full flex-col p-3 text-xs">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleSelectFile(e.target.files[0])
          }
          e.target.value = ""
        }}
      />

      {/* Top Toolbar */}
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-gray-400 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isCompressing}
            className="flex items-center gap-1.5 border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] px-3 py-1.5 font-bold shadow-xs active:border-gray-800 active:border-r-white active:border-b-white hover:bg-[#d4d4d4]"
          >
            <UploadCloud className="h-4 w-4 text-blue-900" />
            <span>{file ? "Ganti File PDF" : "Pilih File PDF"}</span>
          </button>

          {file && (
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              disabled={isCompressing}
              className="flex items-center gap-1 border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] px-2.5 py-1.5 text-red-700 shadow-xs active:border-gray-800 active:border-r-white active:border-b-white hover:bg-red-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {file && (
          <div className="flex items-center gap-2 text-gray-700">
            <span className="font-semibold text-gray-900" title={file.name}>
              {file.name}
            </span>
            <span>•</span>
            <span>{formatFileSize(file.size)}</span>
            <span>•</span>
            <span><b>{pageCount || 1}</b> halaman</span>
          </div>
        )}
      </div>

      {/* Status Banner */}
      {status && (
        <div
          className={`mb-2.5 flex items-center justify-between gap-2 border p-2 ${
            status.type === "success"
              ? "border-emerald-700 bg-emerald-50 text-emerald-900"
              : status.type === "info"
              ? "border-blue-700 bg-blue-50 text-blue-900"
              : "border-red-700 bg-red-50 text-red-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {status.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
            ) : status.type === "info" ? (
              <Sparkles className="h-4 w-4 shrink-0 text-blue-700" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-700" />
            )}
            <span className="font-semibold">{status.message}</span>
          </div>

          {result && (
            <button
              onClick={() => setPreviewTarget({ title: result.name, source: result.bytes })}
              className="flex items-center gap-1 border border-emerald-800 bg-emerald-700 px-2.5 py-1 font-bold text-white shadow-xs active:translate-y-px hover:bg-emerald-800"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Lihat Preview Hasil</span>
            </button>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden border border-gray-600 border-t-gray-800 border-l-gray-800 bg-white">
        {!file ? (
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 p-6 text-center hover:bg-blue-50/50"
          >
            <div className="rounded-full border border-dashed border-blue-400 bg-blue-50 p-4">
              <Minimize2 className="h-10 w-10 text-blue-700" />
            </div>
            <p className="text-sm font-bold text-gray-800">Pilih Berkas PDF untuk Dikompres</p>
            <p className="text-gray-500">
              Tarik & jatuhkan dokumen ke sini untuk memperkecil ukuran file secara lokal di memori browser.
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] text-gray-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>100% Aman & Offline • Dokumen tidak dikirim ke server mana pun</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            {/* File Info Card & Preview Cover */}
            <div className="mb-4 flex items-center gap-3 border border-gray-300 bg-gray-50 p-3">
              <div
                onClick={() => setPreviewTarget({ title: file.name, source: file })}
                className="group relative flex h-20 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden border border-gray-400 bg-white shadow-xs"
                title="Klik untuk melihat preview dokumen asli"
              >
                {coverThumbnail ? (
                  <img src={coverThumbnail} alt={file.name} className="h-full w-full object-contain" />
                ) : (
                  <FileText className="h-8 w-8 text-red-600" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <Eye className="h-4 w-4 text-white" />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-gray-900" title={file.name}>
                  {file.name}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                  <span className="font-semibold text-blue-900">
                    Ukuran Asli: {formatFileSize(file.size)}
                  </span>
                  <span>•</span>
                  <span>{pageCount ? `${pageCount} halaman` : "Menghitung halaman..."}</span>
                </div>
                <button
                  onClick={() => setPreviewTarget({ title: file.name, source: file })}
                  className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline cursor-pointer"
                >
                  <Eye className="h-3 w-3" />
                  <span>Pratinjau Dokumen Asli</span>
                </button>
              </div>
            </div>

            {/* Preset Options Section */}
            <div className="mb-4">
              <p className="mb-2 text-xs font-bold text-gray-800 uppercase tracking-wide font-mono">
                Pilih Level Kompresi:
              </p>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {PRESETS.map((p) => {
                  const isSelected = preset === p.id
                  return (
                    <div
                      key={p.id}
                      onClick={() => !isCompressing && setPreset(p.id)}
                      className={`flex cursor-pointer flex-col justify-between border-2 p-3 transition-all ${
                        isSelected
                          ? "border-[#000080] bg-blue-50/70 shadow-sm"
                          : "border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50"
                      } ${isCompressing ? "pointer-events-none opacity-60" : ""}`}
                    >
                      <div>
                        <div className="mb-1 flex items-center justify-between gap-1">
                          <span className="font-bold text-gray-900 text-xs">{p.title.split("(")[0]}</span>
                          <span
                            className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                              isSelected
                                ? "bg-[#000080] text-white"
                                : "bg-gray-200 text-gray-800"
                            }`}
                          >
                            {p.reductionBadge}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 leading-snug">{p.description}</p>
                      </div>

                      <div className="mt-2.5 flex items-center gap-1.5 pt-2 border-t border-gray-200 text-[10px] text-gray-500">
                        <span className="font-mono">
                          {p.id === "extreme" ? "100 DPI • Q45" : p.id === "recommended" ? "130 DPI • Q68" : "175 DPI • Q85"}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Comparison Box (When Result is available) */}
            {result && (
              <div className="mb-4 border-2 border-emerald-700 bg-emerald-50/60 p-3 shadow-xs">
                <p className="mb-2 font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                  Hasil Kompresi Berkas:
                </p>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 font-mono">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500 uppercase">Sebelum</p>
                      <p className="text-sm font-bold text-gray-800 line-through">
                        {formatFileSize(result.originalSize)}
                      </p>
                    </div>

                    <ArrowRight className="h-5 w-5 text-emerald-700" />

                    <div className="text-center">
                      <p className="text-[10px] text-emerald-800 uppercase font-bold">Sesudah</p>
                      <p className="text-base font-black text-emerald-700">
                        {formatFileSize(result.compressedSize)}
                      </p>
                    </div>

                    <div className="ml-2 rounded bg-emerald-700 px-2 py-1 text-xs font-bold text-white shadow-2xs">
                      {result.originalSize > result.compressedSize
                        ? `-${Math.round(((result.originalSize - result.compressedSize) / result.originalSize) * 100)}%`
                        : "0%"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewTarget({ title: result.name, source: result.bytes })}
                      className="flex items-center gap-1 border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] px-3 py-1.5 font-bold text-gray-800 active:border-gray-800 active:border-r-white active:border-b-white hover:bg-[#d4d4d4]"
                    >
                      <Eye className="h-3.5 w-3.5 text-blue-900" />
                      <span>Preview Hasil</span>
                    </button>

                    <button
                      onClick={() => downloadPdfBytes(result.bytes, result.name)}
                      className="flex items-center gap-1 border-2 border-white border-r-gray-900 border-b-gray-900 bg-[#000080] px-3 py-1.5 font-bold text-white shadow-xs active:border-gray-900 active:border-r-white active:border-b-white hover:bg-blue-900"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Unduh Ulang</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Bar: Action & Progress */}
      {file && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-gray-400 pt-2.5">
          <div className="flex items-center gap-2 text-gray-600">
            {isCompressing && progress ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-800" />
                <span className="font-semibold text-gray-800">{progress.msg}</span>
              </div>
            ) : (
              <span className="text-[11px]">
                Preset aktif: <b>{PRESETS.find((p) => p.id === preset)?.title}</b>
              </span>
            )}
          </div>

          <button
            onClick={handleCompress}
            disabled={isCompressing}
            className="flex items-center justify-center gap-2 border-2 border-white border-r-gray-900 border-b-gray-900 bg-[#000080] px-6 py-2 font-bold text-white shadow-md active:border-gray-900 active:border-r-white active:border-b-white disabled:opacity-50 hover:bg-blue-900 cursor-pointer"
          >
            {isCompressing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>MEMPROSES ({progress?.current || 0}/{progress?.total || 1})...</span>
              </>
            ) : (
              <>
                <Minimize2 className="h-4 w-4" />
                <span>KOMPRES PDF SEKARANG</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Interactive Preview Modal */}
      <PdfPreviewModal
        isOpen={Boolean(previewTarget)}
        title={previewTarget?.title || ""}
        source={previewTarget?.source || null}
        onClose={() => setPreviewTarget(null)}
      />

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        title="RESET_KOMPRES.EXE"
        message="Hapus dokumen yang sedang dipilih dan batalkan pengaturan kompresi?"
        variant="warning"
        confirmText="Ya, Reset"
        cancelText="Batal"
        onConfirm={handleReset}
        onClose={() => setIsResetConfirmOpen(false)}
      />
    </div>
  )
}
