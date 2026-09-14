"use client"

/* eslint-disable @next/next/no-img-element */
import * as React from "react"
import { PDFDocument, degrees } from "pdf-lib"
import {
  UploadCloud,
  Trash2,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  FileX,
  Layers,
  FolderArchive,
  RefreshCw,
  Eye,
} from "lucide-react"
import {
  formatFileSize,
  loadPdfDocument,
  renderPdfPageToDataUrl,
  downloadPdfBytes,
  downloadFilesAsZip,
} from "../pdf-utils"
import { playRetroNotificationSound } from "@/lib/sound-effects"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface PageState {
  pageNumber: number // 1-based
  rotation: number // 0, 90, 180, 270 (tambahan rotasi)
  isSelected: boolean // true = diikutsertakan
  thumbnailUrl: string | null
  originalRotation: number
}

interface PdfSplitToolProps {
  onDirtyChange?: (isDirty: boolean) => void
}

export function PdfSplitTool({ onDirtyChange }: PdfSplitToolProps) {
  const [file, setFile] = React.useState<File | null>(null)
  const [fileBuffer, setFileBuffer] = React.useState<ArrayBuffer | null>(null)
  const [pages, setPages] = React.useState<PageState[]>([])
  const [isLoadingDoc, setIsLoadingDoc] = React.useState(false)
  const [loadingProgress, setLoadingProgress] = React.useState<string | null>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [status, setStatus] = React.useState<{ type: "success" | "error"; message: string } | null>(null)
  const [rangeInput, setRangeInput] = React.useState("")
  const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Notify parent regarding unsaved state
  React.useEffect(() => {
    onDirtyChange?.(file !== null)
  }, [file, onDirtyChange])

  // Browser level beforeunload guard
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (file || isProcessing || isLoadingDoc) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [file, isProcessing, isLoadingDoc])

  // Load PDF file
  const handleSelectFile = async (selectedFile: File) => {
    if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setStatus({ type: "error", message: "Hanya file .pdf yang didukung." })
      return
    }

    try {
      setIsLoadingDoc(true)
      setStatus(null)
      setFile(selectedFile)
      setLoadingProgress("Membaca berkas PDF...")

      const buffer = await selectedFile.arrayBuffer()
      setFileBuffer(buffer)

      // Load with pdf-lib to get original rotations
      const pdfLibDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
      const pageCount = pdfLibDoc.getPageCount()

      // Inisialisasi daftar halaman dasar
      const initialPages: PageState[] = Array.from({ length: pageCount }, (_, i) => {
        const page = pdfLibDoc.getPage(i)
        return {
          pageNumber: i + 1,
          rotation: 0,
          isSelected: true,
          thumbnailUrl: null,
          originalRotation: page.getRotation().angle || 0,
        }
      })
      setPages(initialPages)

      // Render thumbnail dengan PDF.js
      setLoadingProgress(`Membuat thumbnail (0/${pageCount})...`)
      const pdfJsDoc = await loadPdfDocument(buffer)

      for (let i = 1; i <= pageCount; i++) {
        try {
          const { dataUrl } = await renderPdfPageToDataUrl(pdfJsDoc, i, 0.3, "image/jpeg", 0.75)
          setPages((prev) =>
            prev.map((p) => (p.pageNumber === i ? { ...p, thumbnailUrl: dataUrl } : p))
          )
          setLoadingProgress(`Membuat thumbnail (${i}/${pageCount})...`)
        } catch (renderErr) {
          console.warn(`Gagal render preview halaman ${i}:`, renderErr)
        }
      }
    } catch (err) {
      console.error("Gagal membuka PDF:", err)
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal memproses file PDF ini.",
      })
      setFile(null)
      setFileBuffer(null)
      setPages([])
    } finally {
      setIsLoadingDoc(false)
      setLoadingProgress(null)
    }
  }

  // Rotate single page 90 degrees
  const handleRotatePage = (pageNumber: number) => {
    setPages((prev) =>
      prev.map((p) =>
        p.pageNumber === pageNumber ? { ...p, rotation: (p.rotation + 90) % 360 } : p
      )
    )
  }

  // Toggle page selection
  const handleToggleSelect = (pageNumber: number) => {
    setPages((prev) =>
      prev.map((p) =>
        p.pageNumber === pageNumber ? { ...p, isSelected: !p.isSelected } : p
      )
    )
  }

  // Batch Select Helpers
  const handleSelectAll = (select: boolean) => {
    setPages((prev) => prev.map((p) => ({ ...p, isSelected: select })))
  }

  const handleSelectOdd = () => {
    setPages((prev) => prev.map((p) => ({ ...p, isSelected: p.pageNumber % 2 !== 0 })))
  }

  const handleSelectEven = () => {
    setPages((prev) => prev.map((p) => ({ ...p, isSelected: p.pageNumber % 2 === 0 })))
  }

  // Apply custom range (misal: 1-3, 5, 8-10)
  const handleApplyRange = (e: React.FormEvent) => {
    e.preventDefault()
    if (!rangeInput.trim()) return

    const selectedSet = new Set<number>()
    const parts = rangeInput.split(",")

    for (const part of parts) {
      const trimmed = part.trim()
      if (trimmed.includes("-")) {
        const [startStr, endStr] = trimmed.split("-")
        const start = parseInt(startStr, 10)
        const end = parseInt(endStr, 10)
        if (!isNaN(start) && !isNaN(end)) {
          const min = Math.max(1, Math.min(start, end))
          const max = Math.min(pages.length, Math.max(start, end))
          for (let i = min; i <= max; i++) {
            selectedSet.add(i)
          }
        }
      } else {
        const num = parseInt(trimmed, 10)
        if (!isNaN(num) && num >= 1 && num <= pages.length) {
          selectedSet.add(num)
        }
      }
    }

    if (selectedSet.size === 0) {
      setStatus({ type: "error", message: "Rentang halaman tidak valid atau di luar jangkauan." })
      return
    }

    setPages((prev) =>
      prev.map((p) => ({ ...p, isSelected: selectedSet.has(p.pageNumber) }))
    )
    setStatus({
      type: "success",
      message: `${selectedSet.size} halaman berhasil dipilih dari rentang "${rangeInput}".`,
    })
  }

  // Export Mode 1: Simpan halaman terpilih jadi 1 PDF tunggal
  const handleSaveSelectedAsSinglePdf = async () => {
    const selectedPages = pages.filter((p) => p.isSelected)
    if (!file || !fileBuffer || selectedPages.length === 0) {
      setStatus({ type: "error", message: "Pilih minimal 1 halaman untuk disimpan." })
      return
    }

    try {
      setIsProcessing(true)
      setStatus(null)

      const sourceDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true })
      const newDoc = await PDFDocument.create()

      for (const p of selectedPages) {
        const [copiedPage] = await newDoc.copyPages(sourceDoc, [p.pageNumber - 1])
        const currentRot = copiedPage.getRotation().angle || 0
        copiedPage.setRotation(degrees((currentRot + p.rotation) % 360))
        newDoc.addPage(copiedPage)
      }

      const pdfBytes = await newDoc.save()
      const baseName = file.name.replace(/\.pdf$/i, "")
      downloadPdfBytes(pdfBytes, `${baseName}_organized.pdf`)

      playRetroNotificationSound(0.2)
      setStatus({
        type: "success",
        message: `Berhasil mengekspor ${selectedPages.length} halaman ke dalam 1 dokumen PDF!`,
      })
    } catch (err) {
      console.error("Gagal simpan PDF:", err)
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal mengekspor PDF.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Export Mode 2: Pecah tiap halaman terpilih jadi file terpisah (ZIP)
  const handleSplitToZip = async () => {
    const selectedPages = pages.filter((p) => p.isSelected)
    if (!file || !fileBuffer || selectedPages.length === 0) {
      setStatus({ type: "error", message: "Pilih minimal 1 halaman untuk dipecah." })
      return
    }

    try {
      setIsProcessing(true)
      setStatus(null)

      const sourceDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true })
      const baseName = file.name.replace(/\.pdf$/i, "")
      const splitFiles: { name: string; blob: Blob }[] = []

      for (let i = 0; i < selectedPages.length; i++) {
        const p = selectedPages[i]
        const singleDoc = await PDFDocument.create()
        const [copiedPage] = await singleDoc.copyPages(sourceDoc, [p.pageNumber - 1])
        const currentRot = copiedPage.getRotation().angle || 0
        copiedPage.setRotation(degrees((currentRot + p.rotation) % 360))
        singleDoc.addPage(copiedPage)

        const bytes = await singleDoc.save()
        const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" })
        splitFiles.push({
          name: `${baseName}_page_${p.pageNumber}.pdf`,
          blob,
        })
      }

      if (splitFiles.length === 1) {
        downloadPdfBytes(
          new Uint8Array(await splitFiles[0].blob.arrayBuffer()),
          splitFiles[0].name
        )
      } else {
        await downloadFilesAsZip(splitFiles, `${baseName}_split_pages.zip`)
      }

      playRetroNotificationSound(0.2)
      setStatus({
        type: "success",
        message: `Berhasil memecah ${splitFiles.length} lembar PDF ke format ${
          splitFiles.length === 1 ? "PDF" : "ZIP"
        }!`,
      })
    } catch (err) {
      console.error("Gagal split ke ZIP:", err)
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal memecah PDF.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const selectedCount = pages.filter((p) => p.isSelected).length

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

      {/* Top Bar: File Upload / Info */}
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-gray-400 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoadingDoc || isProcessing}
            className="flex items-center gap-1.5 border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] px-3 py-1.5 font-bold shadow-xs active:border-gray-800 active:border-r-white active:border-b-white hover:bg-[#d4d4d4]"
          >
            <UploadCloud className="h-4 w-4 text-blue-900" />
            <span>{file ? "Ganti File PDF" : "Pilih File PDF"}</span>
          </button>

          {file && (
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              disabled={isLoadingDoc || isProcessing}
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
            <span>
              <b>{selectedCount}</b> dari {pages.length} dipilih
            </span>
          </div>
        )}
      </div>

      {/* Controls Bar (Saat file sudah di-load) */}
      {file && pages.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 bg-[#d4d0c8] p-1.5 border border-gray-400">
          {/* Quick Select Buttons */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => handleSelectAll(true)}
              className="border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] px-2 py-0.5 text-[11px] active:border-gray-800 active:border-r-white active:border-b-white"
            >
              Pilih Semua
            </button>
            <button
              onClick={() => handleSelectAll(false)}
              className="border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] px-2 py-0.5 text-[11px] active:border-gray-800 active:border-r-white active:border-b-white"
            >
              Batal Semua
            </button>
            <button
              onClick={handleSelectOdd}
              className="border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] px-2 py-0.5 text-[11px] active:border-gray-800 active:border-r-white active:border-b-white"
            >
              Lembar Ganjil
            </button>
            <button
              onClick={handleSelectEven}
              className="border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] px-2 py-0.5 text-[11px] active:border-gray-800 active:border-r-white active:border-b-white"
            >
              Lembar Genap
            </button>
          </div>

          {/* Range Selection Form */}
          <form onSubmit={handleApplyRange} className="flex items-center gap-1">
            <label className="text-[11px] font-semibold text-gray-700">Range:</label>
            <input
              type="text"
              placeholder="Contoh: 1-3, 5"
              value={rangeInput}
              onChange={(e) => setRangeInput(e.target.value)}
              className="w-28 border border-gray-600 border-t-gray-800 border-l-gray-800 bg-white px-1.5 py-0.5 text-[11px] outline-none"
            />
            <button
              type="submit"
              className="border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] px-2 py-0.5 text-[11px] font-semibold active:border-gray-800 active:border-r-white active:border-b-white"
            >
              Terapkan
            </button>
          </form>
        </div>
      )}

      {/* Status Banner */}
      {status && (
        <div
          className={`mb-2.5 flex items-center gap-2 border p-2 ${
            status.type === "success"
              ? "border-emerald-700 bg-emerald-50 text-emerald-900"
              : "border-red-700 bg-red-50 text-red-900"
          }`}
        >
          {status.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-700" />
          )}
          <span className="font-semibold">{status.message}</span>
        </div>
      )}

      {/* Main Container: Drop zone or Page Thumbnails Grid */}
      <div className="flex flex-1 flex-col overflow-hidden border border-gray-600 border-t-gray-800 border-l-gray-800 bg-white">
        {!file ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 p-6 text-center hover:bg-blue-50/50"
          >
            <div className="rounded-full border border-dashed border-blue-400 bg-blue-50 p-4">
              <UploadCloud className="h-10 w-10 text-blue-700" />
            </div>
            <p className="text-sm font-bold text-gray-800">Pilih Berkas PDF untuk Dipecah / Diatur</p>
            <p className="text-gray-500">Klik atau drag file PDF ke sini untuk melihat visual preview lembar dokumen.</p>
          </div>
        ) : isLoadingDoc ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-800" />
            <p className="font-semibold text-gray-800">{loadingProgress || "Memuat dokumen..."}</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {pages.map((p) => {
                const totalRotation = (p.originalRotation + p.rotation) % 360
                return (
                  <div
                    key={p.pageNumber}
                    className={`relative flex flex-col border p-1.5 transition-all ${
                      p.isSelected
                        ? "border-blue-700 bg-blue-50/40 shadow-xs"
                        : "border-gray-300 bg-gray-100 opacity-60"
                    }`}
                  >
                    {/* Header Card: Page Number & Selection Checkbox */}
                    <div className="mb-1 flex items-center justify-between">
                      <span className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-gray-800">
                        Hal {p.pageNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleSelect(p.pageNumber)}
                        title={p.isSelected ? "Abaikan halaman ini" : "Pilih halaman ini"}
                        className="cursor-pointer"
                      >
                        {p.isSelected ? (
                          <FileCheck className="h-4 w-4 text-blue-700" />
                        ) : (
                          <FileX className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>

                    {/* Visual Thumbnail Preview */}
                    <div
                      onClick={() => handleToggleSelect(p.pageNumber)}
                      className="flex h-36 cursor-pointer items-center justify-center overflow-hidden border border-gray-300 bg-gray-50 p-1"
                    >
                      {p.thumbnailUrl ? (
                        <img
                          src={p.thumbnailUrl}
                          alt={`Halaman ${p.pageNumber}`}
                          className="max-h-full max-w-full object-contain transition-transform duration-200"
                          style={{
                            transform: `rotate(${p.rotation}deg)`,
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-gray-400">
                          <Eye className="h-6 w-6" />
                          <span className="text-[9px]">Memuat...</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action: Rotate Button */}
                    <div className="mt-1 flex items-center justify-between pt-1 border-t border-gray-200">
                      <span className="text-[9px] text-gray-500 font-mono">
                        {totalRotation}°
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRotatePage(p.pageNumber)}
                        title="Putar 90° searah jarum jam"
                        className="flex items-center gap-0.5 border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] px-1.5 py-0.5 text-[10px] active:border-gray-800 active:border-r-white active:border-b-white hover:bg-gray-200"
                      >
                        <RotateCw className="h-3 w-3 text-gray-700" />
                        <span>+90°</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Export Action Buttons */}
      {file && pages.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-gray-400 pt-2.5">
          <button
            onClick={handleSplitToZip}
            disabled={selectedCount === 0 || isProcessing}
            title="Pecah setiap halaman terpilih menjadi file PDF satuan di dalam archive ZIP"
            className="flex items-center gap-1.5 border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] px-3 py-2 font-bold shadow-xs active:border-gray-800 active:border-r-white active:border-b-white disabled:opacity-50 hover:bg-[#d4d4d4]"
          >
            <FolderArchive className="h-4 w-4 text-amber-700" />
            <span>Pecah Jadi File Terpisah (ZIP)</span>
          </button>

          <button
            onClick={handleSaveSelectedAsSinglePdf}
            disabled={selectedCount === 0 || isProcessing}
            title="Simpan halaman yang terpilih dengan susunan rotasi barunya menjadi 1 file PDF utuh"
            className="flex items-center gap-2 border-2 border-white border-r-gray-900 border-b-gray-900 bg-[#000080] px-4 py-2 font-bold text-white shadow-md active:border-gray-900 active:border-r-white active:border-b-white disabled:opacity-50 hover:bg-blue-900"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <Layers className="h-4 w-4" />
                <span>Simpan {selectedCount} Halaman (1 PDF)</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        title="RESET_DOKUMEN.EXE"
        message="Hapus dokumen yang sedang dibuka dan batalkan semua perubahan rotasi/seleksi?"
        variant="warning"
        confirmText="Ya, Tutup Dokumen"
        cancelText="Batal"
        onConfirm={() => {
          setFile(null)
          setFileBuffer(null)
          setPages([])
          setStatus(null)
          setIsResetConfirmOpen(false)
        }}
        onClose={() => setIsResetConfirmOpen(false)}
      />
    </div>
  )
}
