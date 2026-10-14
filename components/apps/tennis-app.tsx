"use client"

import * as React from "react"
import { TennisCanvas } from "./tennis/tennis-canvas"
import { Volume2, VolumeX, Sparkles, Smartphone, Trophy, Info } from "lucide-react"
import { cn } from "@/lib/utils"

export function TennisApp() {
  const [muted, setMuted] = React.useState(false)
  const [infoOpen, setInfoOpen] = React.useState(false)

  return (
    <div className="flex flex-col h-full w-full bg-[#c0c0c0] text-black select-none font-sans overflow-hidden">
      {/* 1. Retro Menu Toolbar */}
      <div className="flex items-center justify-between px-2 py-1 bg-[#c0c0c0] border-b-2 border-b-[#808080] text-xs">
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#000080] text-white font-bold text-[11px] shadow-inner">
            <span>🎾</span>
            <span>WII SPORTS 98 - TENNIS</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 ml-2 text-[11px] text-slate-700 font-mono">
            <span>[Fase 1: 3D Assets & Audio Synthesizer]</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMuted(!muted)}
            className="flex items-center gap-1 px-2 py-0.5 text-xs bg-[#c0c0c0] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] active:border-r-white active:border-b-white"
            title={muted ? "Nyalakan Suara" : "Matikan Suara"}
          >
            {muted ? <VolumeX className="w-3.5 h-3.5 text-red-600" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-700" />}
            <span className="text-[11px] font-bold">{muted ? "MUTE" : "AUDIO"}</span>
          </button>

          <button
            type="button"
            onClick={() => setInfoOpen(!infoOpen)}
            className="flex items-center gap-1 px-2 py-0.5 text-xs bg-[#c0c0c0] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] active:border-r-white active:border-b-white"
          >
            <Info className="w-3.5 h-3.5 text-blue-700" />
            <span className="text-[11px] font-bold">INFO</span>
          </button>
        </div>
      </div>

      {/* Info Popover jika dibuka */}
      {infoOpen && (
        <div className="bg-[#ffffe1] border-b-2 border-b-[#808080] p-2 text-xs text-slate-800 flex items-start justify-between gap-3 shadow-inner">
          <div className="space-y-1">
            <p className="font-bold flex items-center gap-1 text-slate-900">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Tentang Aset 3D & Audio Wii Sports (Fase 1)</span>
            </p>
            <p className="text-[11px] leading-relaxed text-slate-700">
              Semua aset 3D (lapangan tenis biru-hijau, jala net, bola bergaris kuning optic, raket bertekstur senar logo IT, dan karakter Mii) di-generate secara prosedural tanpa file eksternal berat. Audio disintesis instan via Web Audio API.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setInfoOpen(false)}
            className="text-[11px] font-bold px-1.5 py-0.5 bg-[#c0c0c0] border border-t-white border-l-white border-r-[#808080] border-b-[#808080]"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Area Game 3D Three.js */}
      <div className="flex-1 relative w-full h-full min-h-[360px] bg-black">
        <TennisCanvas />
      </div>

      {/* 3. Status Bar Bawah Khas Win98 */}
      <div className="flex items-center justify-between px-2 py-0.5 bg-[#c0c0c0] border-t-2 border-t-white text-[11px] font-mono text-slate-700">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Three.js Engine: Active (60 FPS)</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Camera: 3rd-Person Follow</span>
          <span>Assets: 100% Procedural</span>
        </div>
      </div>
    </div>
  )
}
