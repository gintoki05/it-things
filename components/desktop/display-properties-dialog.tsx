"use client"

import * as React from "react"
import { X, Monitor, Upload, Palette, Check, RotateCcw, Image as ImageIcon, Sparkles, AlertTriangle, Loader2 } from "lucide-react"
import { useWallpaper, WALLPAPER_PRESETS, WallpaperConfig, WallpaperDisplayMode } from "@/lib/wallpaper-store"
import { cn } from "@/lib/utils"

export function DisplayPropertiesDialog() {
  const { wallpaper, isDialogOpen, storageWarning, closeDialog, setWallpaper, resetWallpaper, getBackgroundStyle } = useWallpaper()

  const [activeTab, setActiveTab] = React.useState<"presets" | "custom" | "options">("presets")
  const [draftConfig, setDraftConfig] = React.useState<WallpaperConfig>(wallpaper)
  const [customUrlInput, setCustomUrlInput] = React.useState("")
  const [urlErrorMessage, setUrlErrorMessage] = React.useState<string | null>(null)
  const [isUrlChecking, setIsUrlChecking] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Sync draft state with currently active wallpaper when dialog opens
  React.useEffect(() => {
    if (isDialogOpen) {
      setDraftConfig(wallpaper)
      setUrlErrorMessage(null)
      setIsUrlChecking(false)
      if (wallpaper.type === "custom-image" && wallpaper.value.startsWith("http")) {
        setCustomUrlInput(wallpaper.value)
      }
    }
  }, [isDialogOpen, wallpaper])

  // Handle keyboard navigation (Esc to close)
  React.useEffect(() => {
    if (!isDialogOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        closeDialog()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isDialogOpen, closeDialog])

  if (!isDialogOpen) return null

  const handleApply = () => {
    setWallpaper(draftConfig)
  }

  const handleOk = () => {
    setWallpaper(draftConfig)
    closeDialog()
  }

  const handleCancel = () => {
    setDraftConfig(wallpaper)
    closeDialog()
  }

  const handleSelectPreset = (preset: WallpaperConfig) => {
    setDraftConfig({
      ...preset,
      mode: draftConfig.mode,
      showGridTexture: preset.showGridTexture,
      showWatermark: draftConfig.showWatermark,
    })
  }

  const handleCustomColor = (hex: string) => {
    setDraftConfig({
      id: "custom-color",
      name: `Warna (${hex.toUpperCase()})`,
      type: "custom-color",
      value: hex,
      mode: draftConfig.mode,
      showGridTexture: draftConfig.showGridTexture,
      showWatermark: draftConfig.showWatermark,
    })
  }

  const handleApplyUrl = () => {
    const trimmed = customUrlInput.trim()
    if (!trimmed) {
      setUrlErrorMessage("Masukkan URL gambar terlebih dahulu.")
      return
    }
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("data:image/")) {
      setUrlErrorMessage("URL harus diawali dengan http:// atau https://")
      return
    }
    setUrlErrorMessage(null)
    setIsUrlChecking(true)

    const testImg = new Image()
    let resolved = false

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true
        setIsUrlChecking(false)
        setDraftConfig({
          id: "custom-url-" + Date.now(),
          name: "Gambar Web",
          type: "custom-image",
          value: trimmed,
          mode: draftConfig.mode,
          showGridTexture: draftConfig.showGridTexture,
          showWatermark: draftConfig.showWatermark,
        })
      }
    }, 2500)

    testImg.onload = () => {
      if (!resolved) {
        resolved = true
        clearTimeout(timeout)
        setIsUrlChecking(false)
        setUrlErrorMessage(null)
        setDraftConfig({
          id: "custom-url-" + Date.now(),
          name: "Gambar Web",
          type: "custom-image",
          value: trimmed,
          mode: draftConfig.mode,
          showGridTexture: draftConfig.showGridTexture,
          showWatermark: draftConfig.showWatermark,
        })
      }
    }

    testImg.onerror = () => {
      if (!resolved) {
        resolved = true
        clearTimeout(timeout)
        setIsUrlChecking(false)
        setUrlErrorMessage("Gambar tidak dapat dimuat (link rusak atau diblokir).")
      }
    }

    testImg.src = trimmed
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string
      if (!rawDataUrl) return

      const img = new Image()
      img.onload = () => {
        // Kompresi optimal max 1280px & JPEG 0.75 agar aman di localStorage (~60-100KB)
        const maxDim = 1280
        let w = img.width
        let h = img.height

        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w)
            w = maxDim
          } else {
            w = Math.round((w * maxDim) / h)
            h = maxDim
          }
        }

        const canvas = document.createElement("canvas")
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext("2d")

        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h)
          const compressed = canvas.toDataURL("image/jpeg", 0.75)
          setDraftConfig({
            id: "custom-upload-" + Date.now(),
            name: file.name.length > 18 ? file.name.slice(0, 15) + "..." : file.name,
            type: "custom-image",
            value: compressed,
            mode: draftConfig.mode,
            showGridTexture: draftConfig.showGridTexture,
            showWatermark: draftConfig.showWatermark,
          })
        }
      }
      img.src = rawDataUrl
    }
    reader.readAsDataURL(file)
  }

  const previewStyle = getBackgroundStyle(draftConfig)

  const RETRO_PALETTE = [
    "#1A365D", // Default Navy
    "#008080", // Win98 Teal
    "#3A6EA5", // Win2K Steel Blue
    "#000080", // Pure Navy
    "#0A0E14", // Pitch Black Matrix
    "#1E293B", // Slate
    "#374151", // Charcoal
    "#4C1D95", // Deep Purple
    "#831843", // Burgundy
    "#064E3B", // Forest Green
    "#78350F", // Retro Amber Brown
    "#1E3A8A", // Royal Blue
  ]

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-3 select-none animate-in fade-in-0 duration-150"
      onClick={closeDialog}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="retro-window-frame max-w-lg w-full rounded-[3px] overflow-hidden shadow-[6px_6px_0px_rgba(0,0,0,0.4)] bg-[#D4DDE6] flex flex-col border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287]"
      >
        {/* Retro Titlebar */}
        <div className="bg-gradient-to-r from-[#102A45] via-[#1E4E8C] to-[#2E6FB5] px-2.5 py-1.5 flex items-center justify-between font-mono text-xs font-bold text-white shadow-inner">
          <div className="flex items-center gap-1.5">
            <Monitor className="size-3.5 text-yellow-300" />
            <span>desk.cpl - Properti Tampilan (Display Properties)</span>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            className="hover:bg-red-600 hover:text-white px-1.5 py-0.5 rounded-[2px] transition-colors leading-none cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-3 space-y-3">
          {/* Mini Retro CRT Monitor Preview */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="w-52 h-36 bg-[#CCD7E2] rounded-t-lg p-2 border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] shadow-md flex flex-col items-center justify-between relative">
              {/* Screen Bezel */}
              <div className="w-full h-24 bg-[#1B2838] p-1.5 rounded border-2 border-[#5E7287] shadow-inner relative overflow-hidden">
                {/* CRT Screen Live Content */}
                <div
                  className="w-full h-full relative overflow-hidden rounded-[2px]"
                  style={previewStyle}
                >
                  {/* Grid overlay preview */}
                  {draftConfig.showGridTexture && (
                    <div
                      className="absolute inset-0 opacity-30 pointer-events-none"
                      style={{
                        backgroundImage: `radial-gradient(#FFFFFF 1px, transparent 1px)`,
                        backgroundSize: "8px 8px",
                      }}
                    />
                  )}

                  {/* Mini Desktop Icons Simulation */}
                  <div className="absolute top-1 left-1 flex flex-col gap-1 pointer-events-none">
                    <div className="size-2 bg-blue-300 rounded-[1px] shadow-sm" />
                    <div className="size-2 bg-amber-300 rounded-[1px] shadow-sm" />
                    <div className="size-2 bg-emerald-300 rounded-[1px] shadow-sm" />
                  </div>

                  {/* Mini Watermark Simulation */}
                  {draftConfig.showWatermark && (
                    <div className="absolute bottom-1 right-1 font-mono text-[5px] text-white/40 font-bold leading-none select-none">
                      IT-98
                    </div>
                  )}

                  {/* CRT Scanline effect */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.2)_50%)] bg-[length:100%_2px] pointer-events-none" />
                </div>
              </div>

              {/* Monitor Controls & Power LED */}
              <div className="w-full flex items-center justify-between px-2 pt-1 text-[9px] font-mono text-[#5E7287]">
                <div className="flex items-center gap-1">
                  <div className="size-1 bg-[#8599AC] rounded-full" />
                  <div className="size-1 bg-[#8599AC] rounded-full" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[7px]">SYNC</span>
                  <div className="size-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_4px_#10B981]" />
                </div>
              </div>
            </div>
            {/* Monitor Stand Base */}
            <div className="w-20 h-2 bg-[#B8C5D3] border-x border-[#5E7287]" />
            <div className="w-32 h-2.5 bg-[#CCD7E2] rounded-b border-2 border-t-[#CCD7E2] border-l-white border-r-[#5E7287] border-b-[#5E7287] shadow" />
          </div>

          {/* Retro Tabs */}
          <div className="flex items-center gap-1 border-b-2 border-[#5E7287] pt-1 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab("presets")}
              className={cn(
                "px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-bold rounded-t-[3px] border-t-2 border-l-2 border-r-2 transition-colors relative -mb-[2px] whitespace-nowrap shrink-0",
                activeTab === "presets"
                  ? "bg-[#D4DDE6] border-t-white border-l-white border-r-[#5E7287] text-[#102A45] z-10"
                  : "bg-[#B8C5D3] border-t-white/80 border-l-white/80 border-r-[#5E7287] text-gray-600 hover:bg-[#C5D2E0]"
              )}
            >
              Preset Wallpaper
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("custom")}
              className={cn(
                "px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-bold rounded-t-[3px] border-t-2 border-l-2 border-r-2 transition-colors relative -mb-[2px] whitespace-nowrap shrink-0",
                activeTab === "custom"
                  ? "bg-[#D4DDE6] border-t-white border-l-white border-r-[#5E7287] text-[#102A45] z-10"
                  : "bg-[#B8C5D3] border-t-white/80 border-l-white/80 border-r-[#5E7287] text-gray-600 hover:bg-[#C5D2E0]"
              )}
            >
              Upload & Warna
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("options")}
              className={cn(
                "px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-bold rounded-t-[3px] border-t-2 border-l-2 border-r-2 transition-colors relative -mb-[2px] whitespace-nowrap shrink-0",
                activeTab === "options"
                  ? "bg-[#D4DDE6] border-t-white border-l-white border-r-[#5E7287] text-[#102A45] z-10"
                  : "bg-[#B8C5D3] border-t-white/80 border-l-white/80 border-r-[#5E7287] text-gray-600 hover:bg-[#C5D2E0]"
              )}
            >
              Opsi Tampilan
            </button>
          </div>

          {/* Tab 1: Presets List */}
          {activeTab === "presets" && (
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#14253D] block">
                Pilih Wallpaper Klasik:
              </label>
              <div className="bg-white border-2 border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white max-h-44 overflow-y-auto p-1 space-y-0.5">
                {WALLPAPER_PRESETS.map((preset) => {
                  const isSelected = draftConfig.id === preset.id
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={cn(
                        "w-full text-left px-2 py-1 text-xs flex items-center justify-between rounded-[2px] cursor-pointer",
                        isSelected
                          ? "bg-[#1E4E8C] text-white font-bold"
                          : "text-gray-800 hover:bg-blue-50"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="size-3.5 rounded-[2px] border border-black/20 shrink-0"
                          style={{
                            background: preset.type === "preset-image" ? `url(${preset.value}) center/cover` : preset.value,
                          }}
                        />
                        <span className="truncate">{preset.name}</span>
                      </div>
                      {isSelected && <Check className="size-3 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tab 2: Custom Upload & Color */}
          {activeTab === "custom" && (
            <div className="space-y-3">
              {/* File Upload Button */}
              <div className="p-2.5 bg-white/60 border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] space-y-1.5">
                <div className="text-[11px] font-bold text-[#14253D] flex items-center gap-1.5">
                  <Upload className="size-3.5 text-[#1E4E8C]" />
                  <span>Upload Gambar Sendiri dari Komputer:</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1 bg-[#D4DDE6] hover:bg-[#C2D0DE] text-xs font-bold text-[#14253D] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] shadow-sm active:translate-y-px cursor-pointer flex items-center gap-1.5"
                  >
                    <ImageIcon className="size-3.5" />
                    <span>Pilih Berkas Foto...</span>
                  </button>
                  <span className="text-[10px] text-gray-500 font-mono">
                    PNG, JPG, WebP (Maks. 5MB)
                  </span>
                </div>
              </div>

              {/* URL Input */}
              <div className="p-2.5 bg-white/60 border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] space-y-1.5">
                <div className="text-[11px] font-bold text-[#14253D] flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-[#1E4E8C]" />
                  <span>Atau Tempel URL Gambar dari Internet:</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={customUrlInput}
                    onChange={(e) => {
                      setCustomUrlInput(e.target.value)
                      setUrlErrorMessage(null)
                    }}
                    className={cn(
                      "flex-1 px-2 py-1 text-xs bg-white border-2 border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white focus:outline-none",
                      urlErrorMessage && "border-red-500 text-red-600"
                    )}
                  />
                  <button
                    type="button"
                    disabled={isUrlChecking}
                    onClick={handleApplyUrl}
                    className="px-2.5 py-1 bg-[#D4DDE6] hover:bg-[#C2D0DE] disabled:opacity-50 text-xs font-bold text-[#14253D] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] shadow-sm active:translate-y-px cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    {isUrlChecking ? (
                      <>
                        <Loader2 className="size-3 animate-spin" />
                        <span>Mengecek...</span>
                      </>
                    ) : (
                      <span>Gunakan URL</span>
                    )}
                  </button>
                </div>
                {urlErrorMessage && (
                  <p className="text-[10px] text-red-600 font-semibold flex items-center gap-1">
                    <AlertTriangle className="size-3 shrink-0" />
                    <span>{urlErrorMessage}</span>
                  </p>
                )}
              </div>

              {/* Solid Color Palette */}
              <div className="p-2.5 bg-white/60 border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] space-y-1.5">
                <div className="text-[11px] font-bold text-[#14253D] flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Palette className="size-3.5 text-[#1E4E8C]" />
                    <span>Warna Solid (Palet Retro):</span>
                  </div>
                  {/* Native Color Picker */}
                  <label className="flex items-center gap-1 text-[10px] text-[#1E4E8C] font-semibold cursor-pointer hover:underline">
                    <span>Pilih Bebas:</span>
                    <input
                      type="color"
                      value={draftConfig.type === "custom-color" ? draftConfig.value : "#1A365D"}
                      onChange={(e) => handleCustomColor(e.target.value)}
                      className="size-4 p-0 border-0 cursor-pointer rounded bg-transparent"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-6 gap-1.5 pt-1">
                  {RETRO_PALETTE.map((hex) => {
                    const isSelected = draftConfig.value.toLowerCase() === hex.toLowerCase()
                    return (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => handleCustomColor(hex)}
                        title={hex}
                        style={{ backgroundColor: hex }}
                        className={cn(
                          "h-6 rounded-[2px] border-2 transition-transform hover:scale-105 flex items-center justify-center cursor-pointer",
                          isSelected
                            ? "border-white shadow-[0_0_0_2px_#102A45]"
                            : "border-black/30"
                        )}
                      >
                        {isSelected && <Check className="size-3 text-white drop-shadow" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Options */}
          {activeTab === "options" && (
            <div className="space-y-3">
              {/* Display Mode */}
              <div className="p-2.5 bg-white/60 border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] space-y-1.5">
                <label className="text-[11px] font-bold text-[#14253D] block">
                  Posisi & Skala Wallpaper:
                </label>
                <select
                  value={draftConfig.mode}
                  onChange={(e) =>
                    setDraftConfig({
                      ...draftConfig,
                      mode: e.target.value as WallpaperDisplayMode,
                    })
                  }
                  className="w-full px-2 py-1 text-xs bg-white border-2 border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white focus:outline-none cursor-pointer"
                >
                  <option value="fill">Penuh Layar / Cover (Rekomendasi)</option>
                  <option value="fit">Sesuai Rasio / Fit</option>
                  <option value="tile">Ubin Berulang / Tile (Pola Kecil)</option>
                  <option value="center">Posisi Tengah / Center</option>
                </select>
              </div>

              {/* Toggles */}
              <div className="p-2.5 bg-white/60 border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-[#14253D] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftConfig.showGridTexture}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        showGridTexture: e.target.checked,
                      })
                    }
                    className="size-3.5 accent-[#1E4E8C] cursor-pointer"
                  />
                  <span>Tampilkan efek tekstur grid titik-titik retro</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-[#14253D] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftConfig.showWatermark}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        showWatermark: e.target.checked,
                      })
                    }
                    className="size-3.5 accent-[#1E4E8C] cursor-pointer"
                  />
                  <span>Tampilkan watermark teks branding IT-THINGS di pojok desktop</span>
                </label>
              </div>
            </div>
          )}

          {/* Peringatan jika kuota localStorage browser penuh */}
          {storageWarning && (
            <div className="p-2 bg-amber-100 border border-amber-400 rounded-[2px] text-[10px] text-amber-900 flex items-center gap-1.5 font-mono">
              <AlertTriangle className="size-3.5 text-amber-700 shrink-0" />
              <span>{storageWarning}</span>
            </div>
          )}

          {/* Action Buttons Bar */}
          <div className="pt-2 border-t border-[#A4B5C6] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={resetWallpaper}
              title="Kembalikan ke wallpaper awal"
              className="px-2 py-1 bg-[#D4DDE6] hover:bg-[#C2D0DE] text-[11px] font-bold text-gray-700 border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] shadow-sm active:translate-y-px cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="size-3" />
              <span>Reset Default</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOk}
                className="px-3.5 py-1 bg-[#1E4E8C] hover:bg-[#153A6B] text-xs font-bold text-white border-2 border-t-white/80 border-l-white/80 border-r-[#102A45] border-b-[#102A45] shadow-sm active:translate-y-px cursor-pointer"
              >
                OK
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1 bg-[#D4DDE6] hover:bg-[#C2D0DE] text-xs font-bold text-[#14253D] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] shadow-sm active:translate-y-px cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-3 py-1 bg-[#D4DDE6] hover:bg-[#C2D0DE] text-xs font-bold text-[#14253D] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] shadow-sm active:translate-y-px cursor-pointer"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
