"use client"

import * as React from "react"
import { TennisCanvas } from "./tennis/tennis-canvas"
import { Volume2, VolumeX, Sparkles, Smartphone, Trophy, Info, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

export function TennisApp() {
  const [muted, setMuted] = React.useState(false)
  const [infoOpen, setInfoOpen] = React.useState(false)
  const viewMode = "court"
  const [resetKey, setResetKey] = React.useState(0)

  return (
    <div className="flex flex-col h-full w-full bg-[#c0c0c0] text-black select-none font-sans overflow-hidden">
      {/* 1. Retro Menu Toolbar */}
      <div className="flex items-center justify-between px-2 py-1 bg-[#c0c0c0] border-b-2 border-b-[#808080] text-xs gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#000080] text-white font-bold text-[11px] shadow-inner">
            <span>🎾</span>
            <span>TENNIS 98</span>
          </div>

          <span className="text-[11px] font-mono text-slate-600 font-bold ml-1">
            WII SPORTS 3D MATCH
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setResetKey((k) => k + 1)}
            className="flex items-center gap-1 px-2 py-0.5 text-xs bg-[#c0c0c0] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] active:border-r-white active:border-b-white text-red-700 hover:bg-red-50"
            title="Reset Skor & Pertandingan (R)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-red-600" />
            <span className="text-[11px] font-bold">RESET</span>
          </button>

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
              <span>Gameplay Tennis 3D (Fase 2)</span>
            </p>
            <p className="text-[11px] leading-relaxed text-slate-700">
              Pertandingan tenis 3D lengkap bergaya Wii Sports! Auto-run mengarahkan pemain ke titik jatuh bola, AI Bot membalas servis & rally, fisika balistik bola dengan gravitasi, pantulan net, out-of-bounds, serta skor otentik (Love, 15, 30, 40, Deuce, Game).
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
        <TennisCanvas
          viewMode="court"
          resetTrigger={resetKey}
        />
      </div>
    </div>
  )
}
