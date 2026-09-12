"use client"

import * as React from "react"
import { useDesktop } from "@/components/desktop/desktop-context"
import { useNotification } from "@/lib/notification-store"
import { RetroIcon } from "@/components/ui/retro-icon"
import { cn } from "@/lib/utils"
import { Play, Sparkles, Users, Gamepad2, Award } from "lucide-react"

interface GameItem {
  id: string
  appId?: "paintwar" | "wordle"
  title: string
  filename: string
  category: string
  description: string
  iconName: "game" | "task" | "idea" | "edit"
  isLive?: boolean
  isComingSoon?: boolean
}

export function GameApp() {
  const { openWindow } = useDesktop()
  const { activePaintWarCount } = useNotification()

  const games: GameItem[] = [
    {
      id: "wordle",
      appId: "wordle",
      title: "Wordle 98",
      filename: "WORDLE.EXE",
      category: "Daily Word Puzzle Asinkron",
      description:
        "Tebak kata rahasia 5 huruf harian seputar tech, kantor, dan bahasa Indonesia dalam 6 kesempatan. Dilengkapi klasemen harian tim!",
      iconName: "edit",
    },
    {
      id: "paintwar",
      appId: "paintwar",
      title: "Paint War 98",
      filename: "PAINT_WAR.EXE",
      category: "Multiplayer Tebak Gambar",
      description:
        "Adu tebak gambar live bareng tim IT pakai kanvas MS Paint. Timer 60 detik, sound effect retro, dan leaderboard realtime!",
      iconName: "game",
      isLive: activePaintWarCount > 0,
    },
    {
      id: "minesweeper",
      title: "Minesweeper 98",
      filename: "MINESWEEPER.EXE",
      category: "Single Player Puzzle",
      description:
        "Game klasik pembersih ranjau legendaris Windows 98 buat nemenin waktu nunggu compile atau deploy production.",
      iconName: "task",
      isComingSoon: true,
    },
    {
      id: "typeracer",
      title: "Type Racer 98",
      filename: "TYPE_RACER.EXE",
      category: "Multiplayer WPM Battle",
      description:
        "Adu kecepatan ngetik cuplikan syntax TypeScript & SQL. Buktikan siapa yang punya mechanical fingers tercepat di tim!",
      iconName: "idea",
      isComingSoon: true,
    },
  ]

  const handleLaunchGame = (appId?: "paintwar" | "wordle") => {
    if (appId) {
      openWindow(appId)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#C0C0C0] font-sans text-xs select-none">
      {/* ── Top Header Banner ── */}
      <div className="p-3 bg-[#D4D0C8] border-b-2 border-[#808080] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#000080] text-white rounded-[2px] border border-white/40 shadow">
            <Gamepad2 className="w-5 h-5 text-yellow-300" />
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-wide text-black flex items-center gap-1.5">
              <span>KOLEKSI GAME & ARCADE 98</span>
              <span className="px-1.5 py-0.2 bg-blue-900 text-white font-mono text-[9px] rounded">
                v1.0
              </span>
            </h2>
            <p className="text-gray-600 text-[11px]">
              Kumpulan game retro buat seru-seruan bareng tim IT saat istirahat kantor.
            </p>
          </div>
        </div>

        {activePaintWarCount > 0 && (
          <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-100 border border-emerald-500 rounded font-mono text-emerald-900 animate-pulse">
            <Users className="w-3.5 h-3.5 text-emerald-700" />
            <span className="font-bold">{activePaintWarCount} Pemain Online di Paint War!</span>
          </div>
        )}
      </div>

      {/* ── Games Grid ── */}
      <div className="flex-1 p-3 overflow-y-auto bg-[#ECE9D8] grid grid-cols-1 md:grid-cols-2 gap-3">
        {games.map((game) => (
          <div
            key={game.id}
            className={cn(
              "flex flex-col justify-between p-3 bg-[#D4D0C8] border-2 border-white border-b-[#808080] border-r-[#808080] shadow-sm transition-all group",
              game.isComingSoon ? "opacity-75" : "hover:border-[#404040]"
            )}
          >
            {/* Header info */}
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="size-11 rounded bg-[#2D4564]/30 border border-white/50 shadow-inner flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
                    <RetroIcon name={game.iconName} iconSize={48} fallbackText="🎮" className="size-8 object-contain drop-shadow" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-black flex items-center gap-1.5">
                      <span>{game.title}</span>
                      {game.isLive && (
                        <span className="px-1 py-0.2 bg-red-600 text-white font-mono text-[8px] font-bold rounded animate-pulse">
                          LIVE
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-blue-900 font-bold">
                      {game.filename}
                    </div>
                  </div>
                </div>

                {game.isComingSoon ? (
                  <span className="px-1.5 py-0.5 bg-amber-500 text-black font-mono text-[9px] font-black rounded border border-amber-600 uppercase">
                    SOON
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 bg-emerald-600 text-white font-mono text-[9px] font-bold rounded uppercase">
                    SIAP MAIN
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-gray-700 text-[11px] leading-relaxed mb-3">
                {game.description}
              </p>
            </div>

            {/* Launch Button */}
            <div className="pt-2 border-t border-[#808080]/40 flex items-center justify-between">
              <span className="text-[10px] font-mono text-gray-500">
                Kategori: {game.category}
              </span>

              {game.isComingSoon ? (
                <button
                  type="button"
                  disabled
                  className="px-3 py-1 bg-gray-300 text-gray-500 border border-gray-400 font-bold text-[10px] cursor-not-allowed"
                >
                  Segera Hadir
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleLaunchGame(game.appId)}
                  className="px-3 py-1.5 bg-[#000080] hover:bg-blue-800 text-white font-bold border-2 border-white border-b-[#404040] border-r-[#404040] active:border-[#404040] flex items-center gap-1 text-[11px] transition-all shadow-sm"
                >
                  <Play className="w-3 h-3 text-yellow-300 fill-current" />
                  <span>BUKA GAME</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Status Bar ── */}
      <div className="px-2 py-1 bg-[#D4D0C8] border-t border-[#808080] flex items-center justify-between text-[11px] text-gray-600 font-mono">
        <span>{games.length} item program game ditemukan</span>
        <span>IT-THINGS ARCADE 98</span>
      </div>
    </div>
  )
}
