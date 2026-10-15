"use client"

import * as React from "react"
import { TennisCanvas, TennisCanvasHandle } from "./tennis/tennis-canvas"
import { TennisRemoteModal } from "./tennis/tennis-remote-modal"
import { Volume2, VolumeX, Sparkles, Smartphone, Trophy, Info, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { generateTennisRoomCode } from "@/lib/qr/qr-code"
import { supabase } from "@/lib/supabase"
import type { ScoreState } from "@/lib/tennis/tennis-physics"
import type { RealtimeChannel } from "@supabase/supabase-js"

export function TennisApp() {
  const [muted, setMuted] = React.useState(false)
  const [infoOpen, setInfoOpen] = React.useState(false)
  const [viewMode, setViewMode] = React.useState<"studio" | "court">("studio")
  const [resetKey, setResetKey] = React.useState(0)
  const canvasRef = React.useRef<TennisCanvasHandle | null>(null)

  // Mobile Remote Motion Controller (Pairing & Presence)
  const [roomCode, setRoomCode] = React.useState<string>(() => generateTennisRoomCode())
  const [remoteModalOpen, setRemoteModalOpen] = React.useState(false)
  const [isMobileConnected, setIsMobileConnected] = React.useState(false)
  const [connectedDevice, setConnectedDevice] = React.useState<string>("")
  const channelRef = React.useRef<RealtimeChannel | null>(null)

  // Supabase Realtime Channel & Presence lifecycle
  React.useEffect(() => {
    const client = supabase
    if (!client || !roomCode) return

    const channelName = `tennis-remote-${roomCode}`
    const channel = client.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: "desktop_host" },
      },
    })
    channelRef.current = channel

    const checkMobilePresence = (state: Record<string, any[]>) => {
      let foundMobile = false
      let device = ""
      for (const k of Object.keys(state)) {
        for (const p of state[k] || []) {
          if (p.role === "mobile_controller") {
            foundMobile = true
            if (p.device) device = p.device
            if (p.handedness === "right" || p.handedness === "left") {
              canvasRef.current?.setHandedness(p.handedness)
            }
          }
        }
      }
      setIsMobileConnected(foundMobile)
      if (device) setConnectedDevice(device)
    }

    channel
      .on("presence", { event: "sync" }, () => {
        checkMobilePresence(channel.presenceState())
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        for (const p of newPresences || []) {
          if (p.role === "mobile_controller") {
            setIsMobileConnected(true)
            if (p.device) setConnectedDevice(p.device)
            if (p.handedness === "right" || p.handedness === "left") {
              canvasRef.current?.setHandedness(p.handedness)
            }
          }
        }
      })
      .on("presence", { event: "leave" }, () => {
        checkMobilePresence(channel.presenceState())
      })
      .on("broadcast", { event: "remote_settings" }, ({ payload }) => {
        if (!payload) return
        if (payload.handedness === "right" || payload.handedness === "left") {
          canvasRef.current?.setHandedness(payload.handedness)
        }
      })
      .on("broadcast", { event: "remote_motion" }, ({ payload }) => {
        if (!payload) return
        if (payload.type === "swing") {
          if (payload.swingType === "toss") {
            canvasRef.current?.triggerServeToss()
          } else if (payload.swingType) {
            canvasRef.current?.executeRemoteSwing(payload.swingType, payload.power ?? 1.0)
          }
        }
      })
      .on("broadcast", { event: "remote_orientation" }, ({ payload }) => {
        if (!payload) return
        canvasRef.current?.setLiveRemotePose?.(payload)
      })
      .on("broadcast", { event: "remote_action" }, ({ payload }) => {
        if (!payload) return
        if (payload.action === "toss") {
          canvasRef.current?.triggerServeToss()
        } else if (payload.action === "swing") {
          canvasRef.current?.executeRemoteSwing("forehand", 1.0)
        } else if (payload.action === "reset") {
          canvasRef.current?.restartMatch()
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            role: "desktop_host",
            roomCode,
            joinedAt: new Date().toISOString(),
          })
        }
      })

    return () => {
      client.removeChannel(channel)
      channelRef.current = null
    }
  }, [roomCode])

  const handleBallContact = React.useCallback(
    (details: { hitter: "player" | "opponent"; isSmash: boolean; speed: number; quality: string }) => {
      if (details.hitter === "player" && channelRef.current) {
        const power = details.isSmash
          ? 1.4
          : details.quality === "rocket"
          ? 1.5
          : details.quality === "great"
          ? 1.25
          : 1.0
        channelRef.current.send({
          type: "broadcast",
          event: "game_event",
          payload: {
            type: "ball_contact",
            quality: details.quality,
            power,
            isSmash: details.isSmash,
            speed: details.speed,
            timestamp: Date.now(),
          },
        })
      }
    },
    []
  )

  const handleScoreChange = React.useCallback(
    (score: ScoreState, winner?: "player" | "opponent") => {
      if (channelRef.current && winner) {
        const formatScorePoint = (pts: number) => {
          if (pts === 0) return "Love"
          if (pts === 45) return "AD"
          return String(pts)
        }
        channelRef.current.send({
          type: "broadcast",
          event: "score_event",
          payload: {
            type: winner === "player" ? "point_won" : "point_lost",
            winner,
            score: `${formatScorePoint(score.playerPoints)}-${formatScorePoint(score.opponentPoints)}`,
            timestamp: Date.now(),
          },
        })
      }
    },
    []
  )

  const handleTestRumble = React.useCallback(() => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "game_event",
        payload: {
          type: "ball_contact",
          quality: "great",
          power: 1.0,
          timestamp: Date.now(),
        },
      })
    }
  }, [])


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

          {/* Mode Switcher: Studio (Warm-up / Latihan Ayunan) vs Court (Pertandingan) */}
          <div className="flex items-center bg-[#808080] p-0.5 border border-t-[#808080] border-l-[#808080] border-r-white border-b-white ml-1">
            <button
              type="button"
              onClick={() => setViewMode("studio")}
              className={cn(
                "px-2 py-0.5 text-[11px] font-bold cursor-pointer transition-colors",
                viewMode === "studio"
                  ? "bg-[#000080] text-white shadow-inner"
                  : "bg-[#c0c0c0] text-slate-800 hover:bg-[#d4d0c8]"
              )}
              title="Mode Latihan Ayunan & Uji Coba Gerakan Karakter (Wii Warm-up)"
            >
              🏸 LATIHAN
            </button>
            <button
              type="button"
              onClick={() => setViewMode("court")}
              className={cn(
                "px-2 py-0.5 text-[11px] font-bold cursor-pointer transition-colors",
                viewMode === "court"
                  ? "bg-[#000080] text-white shadow-inner"
                  : "bg-[#c0c0c0] text-slate-800 hover:bg-[#d4d0c8]"
              )}
              title="Mode Pertandingan Lapangan Tenis 3D (Wii Match)"
            >
              🎾 TANDING
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setRemoteModalOpen(true)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-0.5 text-xs border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] active:border-r-white active:border-b-white transition-colors cursor-pointer",
              isMobileConnected
                ? "bg-emerald-100 text-emerald-950 font-bold hover:bg-emerald-200"
                : "bg-[#c0c0c0] text-slate-900 hover:bg-[#d0d0d0]"
            )}
            title="Sambungkan HP sebagai Wireless Motion Controller (Wii Remote)"
          >
            <span className="relative flex h-2 w-2">
              {isMobileConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={cn(
                  "relative inline-flex rounded-full h-2 w-2",
                  isMobileConnected
                    ? "bg-emerald-500 shadow-[0_0_6px_#10b981]"
                    : "bg-amber-400"
                )}
              />
            </span>
            <Smartphone className="w-3.5 h-3.5 text-indigo-700" />
            <span className="text-[11px] font-bold">
              {isMobileConnected ? "HP AKTIF (P1)" : "SAMBUNGKAN HP"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setResetKey((k) => k + 1)
              canvasRef.current?.restartMatch()
            }}
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
          ref={canvasRef}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          resetTrigger={resetKey}
          onBallContact={handleBallContact}
          onScoreChange={handleScoreChange}
        />
      </div>

      {/* 3. Pairing Modal REMOTE_CONNECT.EXE */}
      <TennisRemoteModal
        isOpen={remoteModalOpen}
        onClose={() => setRemoteModalOpen(false)}
        roomCode={roomCode}
        onRegenerateRoomCode={() => setRoomCode(generateTennisRoomCode())}
        isMobileConnected={isMobileConnected}
        connectedDevice={connectedDevice}
        onTestRumble={handleTestRumble}
      />
    </div>
  )
}
