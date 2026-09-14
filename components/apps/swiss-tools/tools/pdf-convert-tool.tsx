"use client"

/* eslint-disable @next/next/no-img-element */
import * as React from "react"
import { PDFDocument } from "pdf-lib"
import {
  Image as ImageIcon,
  FileText,
  UploadCloud,
  Trash2,
  ArrowUp,
  ArrowDown,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FolderArchive,
  Plus,
} from "lucide-react"
import {
  formatFileSize,
  loadPdfDocument,
  renderPdfPageToDataUrl,
  downloadPdfBytes,
  downloadBlob,
  downloadFilesAsZip,
} from "../pdf-utils"
import { playRetroNotificationSound } from "@/lib/sound-effects"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface ImageItem {
  id: string
  file: File
  name: string
  size: number
  previewUrl: string
}

interface PdfPagePreview {
  pageNumber: number
  dataUrl: string
  blob: Blob
}

interface PdfConvertToolProps {
  onDirtyChange?: (isDirty: boolean) => void
}

export function PdfConvertTool({ onDirtyChange }: PdfConvertToolProps) {
  const [activeTab, setActiveTab] = React.useState<"img2pdf" | "pdf2img">("img2pdf")

  // State: Image to PDF
  const [images, setImages] = React.useState<ImageItem[]>([])
  const [pageSizeMode, setPageSizeMode] = React.useState<"fit" | "a4_portrait" | "a4_landscape">("fit")
  const [marginSize, setMarginSize] = React.useState<0 | 20 | 40>(0)
  const [imgPdfName, setImgPdfName] = React.useState("converted_images")
  const [isConvertingImg, setIsConvertingImg] = React.useState(false)
  const [imgStatus, setImgStatus] = React.useState<{ type: "success" | "error"; message: string } | null>(null)
  const imgInputRef = React.useRef<HTMLInputElement>(null)

  // State: PDF to Image
  const [pdfFile, setPdfFile] = React.useState<File | null>(null)
  const [pdfPages, setPdfPages] = React.useState<PdfPagePreview[]>([])
  const [exportFormat, setExportFormat] = React.useState<"image/jpeg" | "image/png">("image/jpeg")
  const [exportScale, setExportScale] = React.useState<number>(1.5) // ~150 DPI
  const [isLoadingPdf, setIsLoadingPdf] = React.useState(false)
  const [pdfLoadingMsg, setPdfLoadingMsg] = React.useState<string | null>(null)
  const [pdfStatus, setPdfStatus] = React.useState<{ type: "success" | "error"; message: string } | null>(null)
  const pdfInputRef = React.useRef<HTMLInputElement>(null)

  // Track if any active files exist
  const hasActiveFiles = images.length > 0 || pdfFile !== null

  React.useEffect(() => {
    onDirtyChange?.(hasActiveFiles)
  }, [hasActiveFiles, onDirtyChange])

  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasActiveFiles || isConvertingImg || isLoadingPdf) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasActiveFiles, isConvertingImg, isLoadingPdf])

  const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false)

  // -------------------------
  // Handlers: Image to PDF
  // -------------------------
  const handleAddImages = (fileList: FileList | File[]) => {
    setImgStatus(null)
    const validImgs = Array.from(fileList).filter((f) =>
      f.type.startsWith("image/") || /\.(jpe?g|png|webp|bmp)$/i.test(f.name)
    )

    if (validImgs.length === 0) {
      setImgStatus({ type: "error", message: "Hanya file gambar (JPG, PNG, WebP) yang didukung." })
      return
    }

    const newItems: ImageItem[] = validImgs.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      name: file.name,
      size: file.size,
      previewUrl: URL.createObjectURL(file),
    }))

    setImages((prev) => [...prev, ...newItems])
  }

  const moveImgUp = (index: number) => {
    if (index <= 0) return
    setImages((prev) => {
      const copy = [...prev]
      const temp = copy[index - 1]
      copy[index - 1] = copy[index]
      copy[index] = temp
      return copy
    })
  }

  const moveImgDown = (index: number) => {
    if (index >= images.length - 1) return
    setImages((prev) => {
      const copy = [...prev]
      const temp = copy[index + 1]
      copy[index + 1] = copy[index]
      copy[index] = temp
      return copy
    })
  }

  const removeImage = (id: string) => {
    setImages((prev) => {
      const item = prev.find((i) => i.id === id)
      if (item) URL.revokeObjectURL(item.previewUrl)
      return prev.filter((i) => i.id !== id)
    })
  }

  // Convert File to ArrayBuffer as JPG or PNG for pdf-lib
  const getImageBytesForPdf = async (
    file: File
  ): Promise<{ bytes: Uint8Array; format: "jpg" | "png"; width: number; height: number }> => {
    const isJpg = file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name)
    const isPng = file.type === "image/png" || /\.png$/i.test(file.name)

    if (isJpg || isPng) {
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      // Get dimensions via Image object
      const dims = await new Promise<{ width: number; height: number }>((resolve) => {
        const img = new Image()
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
        img.src = URL.createObjectURL(file)
      })
      return { bytes, format: isJpg ? "jpg" : "png", width: dims.width, height: dims.height }
    }

    // Convert other formats (WebP, BMP) to PNG via canvas
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const canvas = document.createElement("canvas")
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext("2d")
        if (!ctx) return reject(new Error("Canvas context error"))
        ctx.drawImage(img, 0, 0)
        canvas.toBlob(async (blob) => {
          if (!blob) return reject(new Error("Blob error"))
          const arrayBuffer = await blob.arrayBuffer()
          resolve({
            bytes: new Uint8Array(arrayBuffer),
            format: "png",
            width: canvas.width,
            height: canvas.height,
          })
        }, "image/png")
      }
      img.onerror = () => reject(new Error("Gagal membaca gambar"))
      img.src = url
    })
  }

  const handleConvertImagesToPdf = async () => {
    if (images.length === 0) {
      setImgStatus({ type: "error", message: "Tambahkan minimal 1 gambar." })
      return
    }

    try {
      setIsConvertingImg(true)
      setImgStatus(null)

      const pdfDoc = await PDFDocument.create()

      for (const item of images) {
        const { bytes, format, width: imgW, height: imgH } = await getImageBytesForPdf(item.file)
        const embeddedImg =
          format === "jpg" ? await pdfDoc.embedJpg(bytes) : await pdfDoc.embedPng(bytes)

        let pageWidth = imgW
        let pageHeight = imgH
        let drawX = 0
        let drawY = 0
        let drawW = imgW
        let drawH = imgH

        if (pageSizeMode === "a4_portrait") {
          pageWidth = 595.28 // A4 points
          pageHeight = 841.89
        } else if (pageSizeMode === "a4_landscape") {
          pageWidth = 841.89
          pageHeight = 595.28
        }

        if (pageSizeMode !== "fit") {
          const availW = pageWidth - marginSize * 2
          const availH = pageHeight - marginSize * 2
          const scale = Math.min(availW / imgW, availH / imgH)
          drawW = imgW * scale
          drawH = imgH * scale
          drawX = marginSize + (availW - drawW) / 2
          drawY = marginSize + (availH - drawH) / 2
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight])
        page.drawImage(embeddedImg, {
          x: drawX,
          y: drawY,
          width: drawW,
          height: drawH,
        })
      }

      const pdfBytes = await pdfDoc.save()
      const safeName = (imgPdfName.trim() || "converted_images").replace(/\.pdf$/i, "")
      downloadPdfBytes(pdfBytes, `${safeName}.pdf`)

      playRetroNotificationSound(0.2)
      setImgStatus({
        type: "success",
        message: `Berhasil mengonversi ${images.length} gambar ke dalam file PDF!`,
      })
    } catch (err) {
      console.error("Gagal convert gambar ke PDF:", err)
      setImgStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal mengonversi gambar ke PDF.",
      })
    } finally {
      setIsConvertingImg(false)
    }
  }

  // -------------------------
  // Handlers: PDF to Image
  // -------------------------
  const handleSelectPdfForImages = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setPdfStatus({ type: "error", message: "Hanya file .pdf yang didukung." })
      return
    }

    try {
      setIsLoadingPdf(true)
      setPdfStatus(null)
      setPdfFile(file)
      setPdfPages([])
      setPdfLoadingMsg("Membaca dokumen PDF...")

      const buffer = await file.arrayBuffer()
      const pdfJsDoc = await loadPdfDocument(buffer)
      const count = pdfJsDoc.numPages

      const renderedPages: PdfPagePreview[] = []
      for (let i = 1; i <= count; i++) {
        setPdfLoadingMsg(`Mengekstrak halaman (${i}/${count})...`)
        const result = await renderPdfPageToDataUrl(pdfJsDoc, i, exportScale, exportFormat, 0.9)
        renderedPages.push({
          pageNumber: i,
          dataUrl: result.dataUrl,
          blob: result.blob,
        })
        setPdfPages([...renderedPages])
      }

      setPdfLoadingMsg(null)
    } catch (err) {
      console.error("Gagal render PDF ke gambar:", err)
      setPdfStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal memproses PDF.",
      })
      setPdfFile(null)
      setPdfPages([])
    } finally {
      setIsLoadingPdf(false)
      setPdfLoadingMsg(null)
    }
  }

  // Re-render jika format atau resolusi diubah
  const handleRerenderPdf = async () => {
    if (!pdfFile) return
    await handleSelectPdfForImages(pdfFile)
  }

  const handleDownloadSingleImage = (page: PdfPagePreview) => {
    if (!pdfFile) return
    const baseName = pdfFile.name.replace(/\.pdf$/i, "")
    const ext = exportFormat === "image/jpeg" ? "jpg" : "png"
    downloadBlob(page.blob, `${baseName}_page_${page.pageNumber}.${ext}`)
    playRetroNotificationSound(0.15)
  }

  const handleDownloadAllImagesZip = async () => {
    if (!pdfFile || pdfPages.length === 0) return
    const baseName = pdfFile.name.replace(/\.pdf$/i, "")
    const ext = exportFormat === "image/jpeg" ? "jpg" : "png"
    const files = pdfPages.map((p) => ({
      name: `${baseName}_page_${p.pageNumber}.${ext}`,
      blob: p.blob,
    }))

    await downloadFilesAsZip(files, `${baseName}_images_${ext}.zip`)
    playRetroNotificationSound(0.2)
    setPdfStatus({
      type: "success",
      message: `Semua ${pdfPages.length} halaman berhasil diunduh sebagai file ZIP!`,
    })
  }

  return (
    <div className="flex h-full flex-col p-3 text-xs">
      {/* Tab Switcher */}
      <div className="mb-3 flex items-center gap-1 border-b border-gray-400 pb-1">
        <button
          onClick={() => setActiveTab("img2pdf")}
          className={`flex items-center gap-1.5 border px-3 py-1.5 font-bold transition-all ${
            activeTab === "img2pdf"
              ? "border-b-white bg-white text-blue-900 border-gray-400 shadow-xs"
              : "border-transparent bg-[#c0c0c0] text-gray-700 hover:bg-[#d4d4d4]"
          }`}
        >
          <ImageIcon className="h-4 w-4" />
          <span>Gambar ke PDF</span>
        </button>

        <button
          onClick={() => setActiveTab("pdf2img")}
          className={`flex items-center gap-1.5 border px-3 py-1.5 font-bold transition-all ${
            activeTab === "pdf2img"
              ? "border-b-white bg-white text-blue-900 border-gray-400 shadow-xs"
              : "border-transparent bg-[#c0c0c0] text-gray-700 hover:bg-[#d4d4d4]"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>PDF ke Gambar (JPG/PNG)</span>
        </button>
      </div>

      {/* ==================================================== */}
      {/* MODE 1: GAMBAR KE PDF                               */}
      {/* ==================================================== */}
      {activeTab === "img2pdf" && (
        <div className="flex flex-1 flex-col overflow-hidden">
          <input
            ref={imgInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/bmp"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleAddImages(e.target.files)
              e.target.value = ""
            }}
          />

          {/* Top Options Bar */}
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-gray-300 pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => imgInputRef.current?.click()}
                disabled={isConvertingImg}
                className="flex items-center gap-1 border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] px-3 py-1.5 font-bold shadow-xs active:border-gray-800 active:border-r-white active:border-b-white hover:bg-[#d4d4d4]"
              >
                <Plus className="h-4 w-4 text-blue-900" />
                <span>Tambah Gambar</span>
              </button>

              {images.length > 0 && (
                <button
                  onClick={() => setIsResetConfirmOpen(true)}
                  disabled={isConvertingImg}
                  className="flex items-center gap-1 border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] px-2.5 py-1.5 text-red-700 shadow-xs active:border-gray-800 active:border-r-white active:border-b-white hover:bg-red-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Kosongkan</span>
                </button>
              )}
            </div>

            {/* Layout Options */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-gray-700">Ukuran Halaman:</span>
                <select
                  value={pageSizeMode}
                  onChange={(e) => setPageSizeMode(e.target.value as typeof pageSizeMode)}
                  className="border border-gray-600 bg-white px-1.5 py-0.5 text-xs outline-none"
                >
                  <option value="fit">Sesuai Ukuran Gambar</option>
                  <option value="a4_portrait">A4 Tegak (Portrait)</option>
                  <option value="a4_landscape">A4 Lebar (Landscape)</option>
                </select>
              </div>

              {pageSizeMode !== "fit" && (
                <div className="flex items-center gap-1">
                  <span className="text-gray-700">Margin:</span>
                  <select
                    value={marginSize}
                    onChange={(e) => setMarginSize(Number(e.target.value) as typeof marginSize)}
                    className="border border-gray-600 bg-white px-1.5 py-0.5 text-xs outline-none"
                  >
                    <option value={0}>Tanpa Margin (0)</option>
                    <option value={20}>Kecil (20px)</option>
                    <option value={40}>Besar (40px)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Status Message */}
          {imgStatus && (
            <div
              className={`mb-2 flex items-center gap-2 border p-2 ${
                imgStatus.type === "success"
                  ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                  : "border-red-700 bg-red-50 text-red-900"
              }`}
            >
              {imgStatus.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-700" />
              )}
              <span className="font-semibold">{imgStatus.message}</span>
            </div>
          )}

          {/* Drop area & List */}
          <div className="flex flex-1 flex-col overflow-hidden border border-gray-600 border-t-gray-800 border-l-gray-800 bg-white">
            {images.length === 0 ? (
              <div
                onClick={() => imgInputRef.current?.click()}
                className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 p-6 text-center hover:bg-blue-50/50"
              >
                <div className="rounded-full border border-dashed border-blue-400 bg-blue-50 p-4">
                  <UploadCloud className="h-10 w-10 text-blue-700" />
                </div>
                <p className="text-sm font-bold text-gray-800">Tarik & Jatuhkan Gambar ke Sini</p>
                <p className="text-gray-500">Mendukung format JPG, PNG, WebP. Urutan gambar dapat disesuaikan.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-2">
                <div className="flex flex-col gap-1.5">
                  {images.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 border border-gray-300 bg-gray-50 p-2 hover:bg-blue-50/50"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-200 font-mono text-[10px] font-bold text-gray-700">
                          {idx + 1}
                        </span>
                        <div className="h-10 w-10 shrink-0 overflow-hidden border border-gray-300 bg-white">
                          <img
                            src={item.previewUrl}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="truncate">
                          <p className="truncate font-semibold text-gray-800" title={item.name}>
                            {item.name}
                          </p>
                          <p className="text-[10px] text-gray-500">{formatFileSize(item.size)}</p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => moveImgUp(idx)}
                          disabled={idx === 0 || isConvertingImg}
                          title="Pindah ke Atas"
                          className="border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] p-1 disabled:opacity-40 hover:bg-[#d4d4d4]"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => moveImgDown(idx)}
                          disabled={idx === images.length - 1 || isConvertingImg}
                          title="Pindah ke Bawah"
                          className="border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] p-1 disabled:opacity-40 hover:bg-[#d4d4d4]"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => removeImage(item.id)}
                          disabled={isConvertingImg}
                          title="Hapus gambar"
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

          {/* Bottom Bar: Action */}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <label className="shrink-0 font-semibold text-gray-700">Nama File PDF:</label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={imgPdfName}
                  onChange={(e) => setImgPdfName(e.target.value)}
                  disabled={isConvertingImg}
                  className="w-48 border border-gray-600 border-t-gray-800 border-l-gray-800 bg-white px-2 py-1 text-xs outline-none"
                />
                <span className="ml-1 text-gray-600">.pdf</span>
              </div>
            </div>

            <button
              onClick={handleConvertImagesToPdf}
              disabled={images.length === 0 || isConvertingImg}
              className="flex items-center justify-center gap-2 border-2 border-white border-r-gray-900 border-b-gray-900 bg-[#000080] px-5 py-2 font-bold text-white shadow-md active:border-gray-900 active:border-r-white active:border-b-white disabled:opacity-50 hover:bg-blue-900"
            >
              {isConvertingImg ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Mengonversi...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>BUAT PDF ({images.length} Gambar)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODE 2: PDF KE GAMBAR                               */}
      {/* ==================================================== */}
      {activeTab === "pdf2img" && (
        <div className="flex flex-1 flex-col overflow-hidden">
          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleSelectPdfForImages(e.target.files[0])
              }
              e.target.value = ""
            }}
          />

          {/* Controls Bar */}
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-gray-300 pb-2">
            <button
              onClick={() => pdfInputRef.current?.click()}
              disabled={isLoadingPdf}
              className="flex items-center gap-1.5 border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] px-3 py-1.5 font-bold shadow-xs active:border-gray-800 active:border-r-white active:border-b-white hover:bg-[#d4d4d4]"
            >
              <UploadCloud className="h-4 w-4 text-blue-900" />
              <span>{pdfFile ? "Ganti File PDF" : "Pilih File PDF"}</span>
            </button>

            {/* Export Settings */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-gray-700">Format:</span>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}
                  className="border border-gray-600 bg-white px-1.5 py-0.5 text-xs outline-none"
                >
                  <option value="image/jpeg">JPG (Ringan)</option>
                  <option value="image/png">PNG (Tajam / Lossless)</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-gray-700">Kualitas:</span>
                <select
                  value={exportScale}
                  onChange={(e) => setExportScale(Number(e.target.value))}
                  className="border border-gray-600 bg-white px-1.5 py-0.5 text-xs outline-none"
                >
                  <option value={1.0}>Standar (96 DPI)</option>
                  <option value={1.5}>Sedang (150 DPI)</option>
                  <option value={2.0}>Tinggi (200 DPI)</option>
                </select>
              </div>

              {pdfFile && (
                <button
                  onClick={handleRerenderPdf}
                  disabled={isLoadingPdf}
                  title="Render ulang dengan pengaturan baru"
                  className="border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] px-2 py-0.5 text-[11px] active:border-gray-800 active:border-r-white active:border-b-white hover:bg-[#d4d4d4]"
                >
                  Terapkan
                </button>
              )}
            </div>
          </div>

          {/* Status Message */}
          {pdfStatus && (
            <div
              className={`mb-2 flex items-center gap-2 border p-2 ${
                pdfStatus.type === "success"
                  ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                  : "border-red-700 bg-red-50 text-red-900"
              }`}
            >
              {pdfStatus.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-700" />
              )}
              <span className="font-semibold">{pdfStatus.message}</span>
            </div>
          )}

          {/* Main Area: Drop zone or Grid of Rendered Pages */}
          <div className="flex flex-1 flex-col overflow-hidden border border-gray-600 border-t-gray-800 border-l-gray-800 bg-white">
            {!pdfFile ? (
              <div
                onClick={() => pdfInputRef.current?.click()}
                className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 p-6 text-center hover:bg-blue-50/50"
              >
                <div className="rounded-full border border-dashed border-blue-400 bg-blue-50 p-4">
                  <UploadCloud className="h-10 w-10 text-blue-700" />
                </div>
                <p className="text-sm font-bold text-gray-800">Pilih Berkas PDF untuk Dikonversi ke Gambar</p>
                <p className="text-gray-500">Tiap lembar halaman akan diubah menjadi file gambar berkualitas tinggi.</p>
              </div>
            ) : isLoadingPdf ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-800" />
                <p className="font-semibold text-gray-800">{pdfLoadingMsg || "Memproses..."}</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {pdfPages.map((page) => (
                    <div
                      key={page.pageNumber}
                      className="flex flex-col border border-gray-300 bg-gray-50 p-2 shadow-2xs"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-gray-800">
                          Hal {page.pageNumber}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {formatFileSize(page.blob.size)}
                        </span>
                      </div>

                      <div className="flex h-36 items-center justify-center overflow-hidden border border-gray-300 bg-white p-1">
                        <img
                          src={page.dataUrl}
                          alt={`Halaman ${page.pageNumber}`}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>

                      <button
                        onClick={() => handleDownloadSingleImage(page)}
                        className="mt-2 flex items-center justify-center gap-1 border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] py-1 text-[11px] font-semibold active:border-gray-800 active:border-r-white active:border-b-white hover:bg-[#d4d4d4]"
                      >
                        <Download className="h-3 w-3 text-blue-900" />
                        <span>Unduh Lembar Ini</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bar: Action to Download All */}
          {pdfPages.length > 0 && (
            <div className="mt-3 flex items-center justify-between border-t border-gray-300 pt-2.5">
              <span className="text-gray-600">
                Total <b>{pdfPages.length}</b> halaman siap diunduh.
              </span>

              <button
                onClick={handleDownloadAllImagesZip}
                className="flex items-center gap-2 border-2 border-white border-r-gray-900 border-b-gray-900 bg-[#000080] px-4 py-2 font-bold text-white shadow-md active:border-gray-900 active:border-r-white active:border-b-white hover:bg-blue-900"
              >
                <FolderArchive className="h-4 w-4" />
                <span>Unduh Semua Gambar (ZIP)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        title="KOSONGKAN_GAMBAR.EXE"
        message="Hapus semua gambar dari daftar antrean?"
        variant="destructive"
        confirmText="Ya, Kosongkan"
        cancelText="Batal"
        onConfirm={() => {
          images.forEach((img) => URL.revokeObjectURL(img.previewUrl))
          setImages([])
          setImgStatus(null)
          setIsResetConfirmOpen(false)
        }}
        onClose={() => setIsResetConfirmOpen(false)}
      />
    </div>
  )
}
