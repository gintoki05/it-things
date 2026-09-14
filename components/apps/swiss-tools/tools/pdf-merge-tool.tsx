"use client"

/* eslint-disable @next/next/no-img-element */
import * as React from "react"
import { PDFDocument } from "pdf-lib"
import {
  FileText,
  UploadCloud,
  Trash2,
  ArrowUp,
  ArrowDown,
  FilePlus,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Download,
  Eye,
} from "lucide-react"
import {
  formatFileSize,
  downloadPdfBytes,
  loadPdfDocument,
  renderPdfPageToDataUrl,
} from "../pdf-utils"
import { playRetroNotificationSound } from "@/lib/sound-effects"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { PdfPreviewModal } from "../pdf-preview-modal"

interface MergeFileItem {
  id: string
  file: File
  name: string
  size: number
  pageCount: number | null
  thumbnailUrl: string | null
}

interface PdfMergeToolProps {
  onDirtyChange?: (isDirty: boolean) => void
}

export function PdfMergeTool({ onDirtyChange }: PdfMergeToolProps) {
  const [files, setFiles] = React.useState<MergeFileItem[]>([])
  const [outputName, setOutputName] = React.useState("merged_document")
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [progressMsg, setProgressMsg] = React.useState<string | null>(null)
  const [status, setStatus] = React.useState<{ type: "success" | "error"; message: string } | null>(null)
  const [isClearConfirmOpen, setIsClearConfirmOpen] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Preview Modal State
  const [previewTarget, setPreviewTarget] = React.useState<{
    title: string
    source: File | Uint8Array | null
  } | null>(null)

  // Last merged result cache for quick preview / re-download
  const [lastMergedResult, setLastMergedResult] = React.useState<{
    bytes: Uint8Array
    name: string
    pageCount: number
  } | null>(null)

  // Notify parent regarding unsaved state
  React.useEffect(() => {
    onDirtyChange?.(files.length > 0)
  }, [files.length, onDirtyChange])

  // Browser level beforeunload guard
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (files.length > 0 || isProcessing) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [files.length, isProcessing])

  // Handle file input / drop
  const handleAddFiles = async (fileList: FileList | File[]) => {
    setStatus(null)
    const validPdfs = Array.from(fileList).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    )

    if (validPdfs.length === 0) {
      setStatus({ type: "error", message: "Hanya file berekstensi .pdf yang didukung." })
      return
    }

    const newItems: MergeFileItem[] = validPdfs.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      name: file.name,
      size: file.size,
      pageCount: null,
      thumbnailUrl: null,
    }))

    setFiles((prev) => [...prev, ...newItems])

    // Load page counts and cover thumbnail asynchronously
    for (const item of newItems) {
      try {
        const buffer = await item.file.arrayBuffer()
        const pdfLibDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
        const count = pdfLibDoc.getPageCount()

        // Render cover thumbnail (halaman 1)
        let thumbUrl: string | null = null
        try {
          const pdfJsDoc = await loadPdfDocument(buffer)
          const rendered = await renderPdfPageToDataUrl(pdfJsDoc, 1, 0.22, "image/jpeg", 0.7)
          thumbUrl = rendered.dataUrl
        } catch (e) {
          console.warn("Gagal render cover thumbnail:", e)
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, pageCount: count, thumbnailUrl: thumbUrl } : f
          )
        )
      } catch {
        setFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, pageCount: 0 } : f))
        )
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files)
    }
  }

  const moveUp = (index: number) => {
    if (index <= 0) return
    setFiles((prev) => {
      const copy = [...prev]
      const temp = copy[index - 1]
      copy[index - 1] = copy[index]
      copy[index] = temp
      return copy
    })
  }

  const moveDown = (index: number) => {
    if (index >= files.length - 1) return
    setFiles((prev) => {
      const copy = [...prev]
      const temp = copy[index + 1]
      copy[index + 1] = copy[index]
      copy[index] = temp
      return copy
    })
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const clearAllFiles = () => {
    setFiles([])
    setStatus(null)
    setLastMergedResult(null)
    setIsClearConfirmOpen(false)
  }

  // Eksekusi Merge PDF
  const handleMergePdf = async () => {
    if (files.length < 2) {
      setStatus({ type: "error", message: "Tambahkan minimal 2 file PDF untuk digabungkan." })
      return
    }

    try {
      setIsProcessing(true)
      setStatus(null)
      setProgressMsg("Menginisialisasi dokumen baru...")

      const mergedPdf = await PDFDocument.create()

      for (let i = 0; i < files.length; i++) {
        const item = files[i]
        setProgressMsg(`Menggabungkan file ${i + 1}/${files.length}: ${item.name}...`)

        const buffer = await item.file.arrayBuffer()
        const donorPdf = await PDFDocument.load(buffer, { ignoreEncryption: true })
        const copiedPages = await mergedPdf.copyPages(donorPdf, donorPdf.getPageIndices())

        for (const page of copiedPages) {
          mergedPdf.addPage(page)
        }
      }

      setProgressMsg("Menyimpan berkas akhir...")
      const pdfBytes = await mergedPdf.save()
      const safeName = (outputName.trim() || "merged_document").replace(/\.pdf$/i, "")
      const fullName = `${safeName}.pdf`

      // Simpan cache hasil agar bisa langsung di-preview
      setLastMergedResult({
        bytes: pdfBytes,
        name: fullName,
        pageCount: mergedPdf.getPageCount(),
      })

      // Download instan
      downloadPdfBytes(pdfBytes, fullName)

      playRetroNotificationSound(0.2)
      setStatus({
        type: "success",
        message: `Berhasil menggabungkan ${files.length} file (${mergedPdf.getPageCount()} halaman). File telah diunduh!`,
      })
    } catch (err) {
      console.error("Gagal merge PDF:", err)
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Terjadi kesalahan saat menggabungkan PDF.",
      })
    } finally {
      setIsProcessing(false)
      setProgressMsg(null)
    }
  }

  const totalPages = files.reduce((acc, curr) => acc + (curr.pageCount || 0), 0)
  const totalSize = files.reduce((acc, curr) => acc + curr.size, 0)

  return (
    <div className="flex h-full flex-col p-3 text-xs">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleAddFiles(e.target.files)
          e.target.value = ""
        }}
      />

      {/* Top Toolbar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-gray-400 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center gap-1.5 border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] px-3 py-1.5 font-bold shadow-xs active:border-gray-800 active:border-r-white active:border-b-white hover:bg-[#d4d4d4]"
          >
            <FilePlus className="h-4 w-4 text-blue-900" />
            <span>Tambah PDF</span>
          </button>

          {files.length > 0 && (
            <button
              onClick={() => setIsClearConfirmOpen(true)}
              disabled={isProcessing}
              className="flex items-center gap-1 border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] px-2.5 py-1.5 shadow-xs active:border-gray-800 active:border-r-white active:border-b-white hover:bg-red-100"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-700" />
              <span>Kosongkan</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-gray-700">
          <span>Total: <b>{files.length}</b> file</span>
          <span>•</span>
          <span><b>{totalPages}</b> halaman</span>
          <span>•</span>
          <span>{formatFileSize(totalSize)}</span>
        </div>
      </div>

      {/* Feedback Banner with Preview Action */}
      {status && (
        <div
          className={`mb-3 flex flex-wrap items-center justify-between gap-2 border p-2 ${
            status.type === "success"
              ? "border-emerald-700 bg-emerald-50 text-emerald-900"
              : "border-red-700 bg-red-50 text-red-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {status.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-700" />
            )}
            <span className="font-semibold">{status.message}</span>
          </div>

          {status.type === "success" && lastMergedResult && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() =>
                  setPreviewTarget({
                    title: lastMergedResult.name,
                    source: lastMergedResult.bytes,
                  })
                }
                className="flex items-center gap-1 border border-emerald-800 bg-emerald-700 px-2.5 py-1 font-bold text-white shadow-xs active:translate-y-px hover:bg-emerald-800"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Lihat Preview Hasil</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Drop Area & List */}
      <div className="flex flex-1 flex-col overflow-hidden border border-gray-600 border-t-gray-800 border-l-gray-800 bg-white">
        {files.length === 0 ? (
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 p-6 text-center hover:bg-blue-50/50"
          >
            <div className="rounded-full border border-dashed border-blue-400 bg-blue-50 p-4">
              <UploadCloud className="h-10 w-10 text-blue-700" />
            </div>
            <p className="text-sm font-bold text-gray-800">Tarik & Jatuhkan File PDF ke Sini</p>
            <p className="text-gray-500">
              Klik atau drop file untuk mengurutkan dan menggabungkan dokumen.
            </p>
            <p className="mt-1 text-[10px] text-gray-400">
              * Dilengkapi preview visual cover tiap lembar dokumen & modal penampil halaman.
            </p>
          </div>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="flex-1 overflow-y-auto p-2"
          >
            <div className="flex flex-col gap-1.5">
              {files.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 border border-gray-300 bg-gray-50 p-2 hover:bg-blue-50/60"
                >
                  {/* Left: Index, Thumbnail Cover, File details */}
                  <div
                    onClick={() => setPreviewTarget({ title: item.name, source: item.file })}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5"
                    title="Klik untuk membuka preview dokumen"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-200 font-mono text-[10px] font-bold text-gray-700">
                      {idx + 1}
                    </span>

                    {/* Thumbnail Preview Box */}
                    <div className="relative flex h-12 w-10 shrink-0 items-center justify-center overflow-hidden border border-gray-400 bg-white shadow-2xs group">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.name}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <FileText className="h-5 w-5 text-red-600" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <Eye className="h-4 w-4 text-white" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 truncate">
                      <p className="truncate font-semibold text-gray-800 group-hover:text-blue-900">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {formatFileSize(item.size)} •{" "}
                        {item.pageCount === null
                          ? "Memuat halaman..."
                          : `${item.pageCount} halaman`}
                        <span className="ml-2 font-semibold text-blue-700 hover:underline">
                          [Klik untuk Preview]
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => setPreviewTarget({ title: item.name, source: item.file })}
                      disabled={isProcessing}
                      title="Buka Preview Dokumen"
                      className="border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] p-1 text-blue-900 active:border-gray-800 active:border-r-white active:border-b-white hover:bg-blue-100"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0 || isProcessing}
                      title="Pindah ke Atas"
                      className="border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] p-1 disabled:opacity-40 hover:bg-[#d4d4d4]"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => moveDown(idx)}
                      disabled={idx === files.length - 1 || isProcessing}
                      title="Pindah ke Bawah"
                      className="border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] p-1 disabled:opacity-40 hover:bg-[#d4d4d4]"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => removeFile(item.id)}
                      disabled={isProcessing}
                      title="Hapus dari antrean"
                      className="border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] p-1 text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar: Output Name & Merge Trigger */}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <label className="shrink-0 font-semibold text-gray-700">Nama File:</label>
          <div className="flex items-center">
            <input
              type="text"
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              disabled={isProcessing}
              placeholder="merged_document"
              className="w-48 border border-gray-600 border-t-gray-800 border-l-gray-800 bg-white px-2 py-1 text-xs outline-none"
            />
            <span className="ml-1 text-gray-600">.pdf</span>
          </div>
        </div>

        <button
          onClick={handleMergePdf}
          disabled={files.length < 2 || isProcessing}
          className="flex items-center justify-center gap-2 border-2 border-white border-r-gray-900 border-b-gray-900 bg-[#000080] px-5 py-2 font-bold text-white shadow-md active:border-gray-900 active:border-r-white active:border-b-white active:translate-y-px disabled:opacity-50 hover:bg-blue-900"
        >
          {isProcessing ? (
            <>
              <RotateCw className="h-4 w-4 animate-spin" />
              <span>{progressMsg || "Memproses..."}</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>GABUNGKAN PDF ({files.length})</span>
            </>
          )}
        </button>
      </div>

      {/* Interactive PDF Preview Modal */}
      <PdfPreviewModal
        isOpen={Boolean(previewTarget)}
        title={previewTarget?.title || ""}
        source={previewTarget?.source || null}
        onClose={() => setPreviewTarget(null)}
      />

      {/* Clear Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        title="KOSONGKAN_LIST.EXE"
        message="Hapus semua file PDF dari antrean penggabungan?"
        variant="destructive"
        confirmText="Ya, Kosongkan"
        cancelText="Batal"
        onConfirm={clearAllFiles}
        onClose={() => setIsClearConfirmOpen(false)}
      />
    </div>
  )
}
