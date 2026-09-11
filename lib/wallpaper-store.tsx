"use client"

import * as React from "react"

export type WallpaperDisplayMode = "fill" | "fit" | "tile" | "center"

export type WallpaperType = "preset-color" | "preset-gradient" | "preset-image" | "custom-image" | "custom-color"

export interface WallpaperConfig {
  id: string
  name: string
  type: WallpaperType
  value: string // hex color, css gradient, image url, or base64 data url
  mode: WallpaperDisplayMode
  showGridTexture: boolean
  showWatermark: boolean
}

export const WALLPAPER_PRESETS: WallpaperConfig[] = [
  {
    id: "it-things-default",
    name: "IT-Things 98 (Default)",
    type: "preset-color",
    value: "#1A365D",
    mode: "fill",
    showGridTexture: true,
    showWatermark: true,
  },
  {
    id: "win98-teal",
    name: "Windows 98 Classic Teal",
    type: "preset-color",
    value: "#008080",
    mode: "fill",
    showGridTexture: false,
    showWatermark: true,
  },
  {
    id: "win2k-blue",
    name: "Windows 2000 Pro Blue",
    type: "preset-color",
    value: "#3A6EA5",
    mode: "fill",
    showGridTexture: false,
    showWatermark: true,
  },
  {
    id: "matrix-cyber",
    name: "Matrix Terminal",
    type: "preset-color",
    value: "#0A0E14",
    mode: "fill",
    showGridTexture: true,
    showWatermark: true,
  },
  {
    id: "win98-setup",
    name: "Setup 98 Gradient",
    type: "preset-gradient",
    value: "linear-gradient(180deg, #000080 0%, #000040 100%)",
    mode: "fill",
    showGridTexture: false,
    showWatermark: true,
  },
  {
    id: "retro-synthwave",
    name: "80s Synthwave Sunset",
    type: "preset-gradient",
    value: "linear-gradient(135deg, #1A102F 0%, #2A0845 35%, #6441A5 70%, #FE8C00 100%)",
    mode: "fill",
    showGridTexture: false,
    showWatermark: true,
  },
  {
    id: "retro-vaporwave",
    name: "Vaporwave Neon",
    type: "preset-gradient",
    value: "linear-gradient(135deg, #2D112C 0%, #0D2B45 50%, #C44569 100%)",
    mode: "fill",
    showGridTexture: true,
    showWatermark: true,
  },
  {
    id: "midnight-slate",
    name: "Midnight Charcoal",
    type: "preset-color",
    value: "#12161A",
    mode: "fill",
    showGridTexture: true,
    showWatermark: true,
  },
  {
    id: "xp-bliss",
    name: "XP Bliss Landscape",
    type: "preset-image",
    value: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1920&auto=format&fit=crop",
    mode: "fill",
    showGridTexture: false,
    showWatermark: true,
  },
]

export const DEFAULT_WALLPAPER: WallpaperConfig = WALLPAPER_PRESETS[0]

const STORAGE_KEY = "it_things_wallpaper_config"

interface WallpaperContextType {
  wallpaper: WallpaperConfig
  isDialogOpen: boolean
  storageWarning: string | null
  openDialog: () => void
  closeDialog: () => void
  setWallpaper: (config: WallpaperConfig) => void
  resetWallpaper: () => void
  getBackgroundStyle: (config?: WallpaperConfig) => React.CSSProperties
}

const WallpaperContext = React.createContext<WallpaperContextType | undefined>(undefined)

export function WallpaperProvider({ children }: { children: React.ReactNode }) {
  const [wallpaper, setWallpaperState] = React.useState<WallpaperConfig>(DEFAULT_WALLPAPER)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [storageWarning, setStorageWarning] = React.useState<string | null>(null)

  // Load wallpaper from localStorage on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as WallpaperConfig
        if (parsed && parsed.value) {
          setWallpaperState(parsed)
        }
      }
    } catch (err) {
      console.warn("Gagal memuat wallpaper dari localStorage:", err)
    }
  }, [])

  const setWallpaper = React.useCallback((next: WallpaperConfig) => {
    setWallpaperState(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setStorageWarning(null)
    } catch (err) {
      console.warn("Gagal menyimpan wallpaper ke localStorage (mungkin kuota penuh):", err)
      setStorageWarning("Penyimpanan browser penuh! Wallpaper aktif di sesi ini namun mungkin tidak tersimpan permanen.")
    }
  }, [])

  const resetWallpaper = React.useCallback(() => {
    setWallpaper(DEFAULT_WALLPAPER)
  }, [setWallpaper])

  const openDialog = React.useCallback(() => {
    setIsDialogOpen(true)
  }, [])

  const closeDialog = React.useCallback(() => {
    setIsDialogOpen(false)
  }, [])

  // Helper untuk generate inline CSS style background
  const getBackgroundStyle = React.useCallback((targetConfig?: WallpaperConfig): React.CSSProperties => {
    const config = targetConfig || wallpaper

    if (config.type === "preset-color" || config.type === "custom-color") {
      return {
        backgroundColor: config.value,
        backgroundImage: "none",
      }
    }

    if (config.type === "preset-gradient") {
      return {
        backgroundImage: config.value,
        backgroundSize: "cover",
      }
    }

    if (config.type === "preset-image" || config.type === "custom-image") {
      const isTile = config.mode === "tile"
      const isFit = config.mode === "fit"
      const isCenter = config.mode === "center"

      return {
        backgroundColor: "#0F172A",
        backgroundImage: `url("${config.value}")`,
        backgroundRepeat: isTile ? "repeat" : "no-repeat",
        backgroundPosition: isTile ? "top left" : "center",
        backgroundSize: isTile ? "auto" : isFit ? "contain" : isCenter ? "auto" : "cover",
      }
    }

    return {
      backgroundColor: "#1A365D",
    }
  }, [wallpaper])

  return (
    <WallpaperContext.Provider
      value={{
        wallpaper,
        isDialogOpen,
        storageWarning,
        openDialog,
        closeDialog,
        setWallpaper,
        resetWallpaper,
        getBackgroundStyle,
      }}
    >
      {children}
    </WallpaperContext.Provider>
  )
}

export function useWallpaper() {
  const context = React.useContext(WallpaperContext)
  if (!context) {
    throw new Error("useWallpaper harus digunakan di dalam <WallpaperProvider>")
  }
  return context
}
