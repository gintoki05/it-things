"use client"

import * as React from "react"

export type WallpaperDisplayMode = "fill" | "fit" | "tile" | "center"

export type WallpaperType = "preset-color" | "preset-gradient" | "preset-image" | "custom-image" | "custom-color"

export type WallpaperCategory = "all" | "retro" | "aesthetic" | "gradient"

export interface WallpaperConfig {
  id: string
  name: string
  type: WallpaperType
  category?: "retro" | "aesthetic" | "gradient"
  value: string // hex color, css gradient, image url, or base64 data url
  mode: WallpaperDisplayMode
  showGridTexture: boolean
  showWatermark: boolean
}

export const WALLPAPER_PRESETS: WallpaperConfig[] = [
  // --- Kategori: Retro 98 ---
  {
    id: "it-things-default",
    name: "IT-Things 98 (Default)",
    type: "preset-color",
    category: "retro",
    value: "#1A365D",
    mode: "fill",
    showGridTexture: true,
    showWatermark: true,
  },
  {
    id: "win98-teal",
    name: "Windows 98 Classic Teal",
    type: "preset-color",
    category: "retro",
    value: "#008080",
    mode: "fill",
    showGridTexture: false,
    showWatermark: true,
  },
  {
    id: "win2k-blue",
    name: "Windows 2000 Pro Blue",
    type: "preset-color",
    category: "retro",
    value: "#3A6EA5",
    mode: "fill",
    showGridTexture: false,
    showWatermark: true,
  },
  {
    id: "matrix-cyber",
    name: "Matrix Terminal",
    type: "preset-color",
    category: "retro",
    value: "#0A0E14",
    mode: "fill",
    showGridTexture: true,
    showWatermark: true,
  },
  {
    id: "win98-setup",
    name: "Setup 98 Gradient",
    type: "preset-gradient",
    category: "retro",
    value: "linear-gradient(180deg, #000080 0%, #000040 100%)",
    mode: "fill",
    showGridTexture: false,
    showWatermark: true,
  },
  {
    id: "xp-bliss",
    name: "XP Bliss Landscape",
    type: "preset-image",
    category: "retro",
    value: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1920&auto=format&fit=crop",
    mode: "fill",
    showGridTexture: false,
    showWatermark: true,
  },

  // --- Kategori: Aesthetic & Populer (Foto / Scene) ---
  {
    id: "cyberpunk-tokyo",
    name: "Cyberpunk Tokyo Night",
    type: "preset-image",
    category: "aesthetic",
    value: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1920&auto=format&fit=crop",
    mode: "fill",
    showGridTexture: false,
    showWatermark: true,
  },
  {
    id: "nordic-mist-forest",
    name: "Nordic Mist Pine Forest",
    type: "preset-image",
    category: "aesthetic",
    value: "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?q=80&w=1920&auto=format&fit=crop",
    mode: "fill",
    showGridTexture: false,
    showWatermark: true,
  },
  {
    id: "cosmic-nebula",
    name: "Cosmic Deep Space",
    type: "preset-image",
    category: "aesthetic",
    value: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1920&auto=format&fit=crop",
    mode: "fill",
    showGridTexture: false,
    showWatermark: true,
  },
  {
    id: "cozy-rainy-cafe",
    name: "Cozy Rainy Cafe",
    type: "preset-image",
    category: "aesthetic",
    value: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?q=80&w=1920&auto=format&fit=crop",
    mode: "fill",
    showGridTexture: false,
    showWatermark: true,
  },
  {
    id: "alpine-sunrise",
    name: "Alpine Mountain Peaks",
    type: "preset-image",
    category: "aesthetic",
    value: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1920&auto=format&fit=crop",
    mode: "fill",
    showGridTexture: false,
    showWatermark: true,
  },
  {
    id: "anime-sky",
    name: "Pastel Twilight Sea",
    type: "preset-image",
    category: "aesthetic",
    value: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1920&auto=format&fit=crop",
    mode: "fill",
    showGridTexture: false,
    showWatermark: true,
  },
  {
    id: "neon-bokeh-night",
    name: "Neon Glow City Bokeh",
    type: "preset-image",
    category: "aesthetic",
    value: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1920&auto=format&fit=crop",
    mode: "fill",
    showGridTexture: false,
    showWatermark: true,
  },
  {
    id: "hacker-code",
    name: "Digital Matrix Stream",
    type: "preset-image",
    category: "aesthetic",
    value: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1920&auto=format&fit=crop",
    mode: "fill",
    showGridTexture: false,
    showWatermark: true,
  },

  // --- Kategori: Modern Gradient & Minimal ---
  {
    id: "macos-dark-fluid",
    name: "macOS Dark Fluid Wave",
    type: "preset-gradient",
    category: "gradient",
    value: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 35%, #312E81 70%, #4F46E5 100%)",
    mode: "fill",
    showGridTexture: false,
    showWatermark: true,
  },
  {
    id: "catppuccin-mocha",
    name: "Catppuccin Mocha",
    type: "preset-gradient",
    category: "gradient",
    value: "linear-gradient(135deg, #1E1E2E 0%, #313244 45%, #CBA6F7 85%, #F38BA8 100%)",
    mode: "fill",
    showGridTexture: false,
    showWatermark: true,
  },
  {
    id: "dracula-dark",
    name: "Dracula Dark Tech",
    type: "preset-gradient",
    category: "gradient",
    value: "linear-gradient(135deg, #181920 0%, #282A36 50%, #44475A 100%)",
    mode: "fill",
    showGridTexture: false,
    showWatermark: true,
  },
  {
    id: "aurora-green",
    name: "Aurora Borealis Glow",
    type: "preset-gradient",
    category: "gradient",
    value: "linear-gradient(135deg, #051923 0%, #003554 35%, #006466 70%, #2EC4B6 100%)",
    mode: "fill",
    showGridTexture: false,
    showWatermark: true,
  },
  {
    id: "retro-synthwave",
    name: "80s Synthwave Sunset",
    type: "preset-gradient",
    category: "gradient",
    value: "linear-gradient(135deg, #1A102F 0%, #2A0845 35%, #6441A5 70%, #FE8C00 100%)",
    mode: "fill",
    showGridTexture: false,
    showWatermark: true,
  },
  {
    id: "retro-vaporwave",
    name: "Vaporwave Neon",
    type: "preset-gradient",
    category: "gradient",
    value: "linear-gradient(135deg, #2D112C 0%, #0D2B45 50%, #C44569 100%)",
    mode: "fill",
    showGridTexture: true,
    showWatermark: true,
  },
  {
    id: "midnight-slate",
    name: "Midnight Charcoal",
    type: "preset-color",
    category: "gradient",
    value: "#12161A",
    mode: "fill",
    showGridTexture: true,
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
