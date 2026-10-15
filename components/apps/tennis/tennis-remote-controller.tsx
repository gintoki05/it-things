"use client"

import * as React from "react"
import type { RealtimeChannel } from "@supabase/supabase-js"
import {
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Smartphone,
  Zap,
  Hand,
  Check,
  ArrowLeft,
} from "lucide-react"
import {
  BrowserMotionListener,
  TennisGestureClassifier,
  triggerHaptic,
  requestMotionPermission,
  type MotionPermissionState,
  type TennisGestureType,
  type GestureEvent,
  type MotionSample,
} from "@/lib/tennis/motion-detector"
import { playTennisHitSound } from "@/lib/tennis/audio"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { cn } from "@/lib/utils"

/**
 * Normalizes and validates a room code string (3-10 chars, uppercase alphanumeric + hyphen).
 */
export function normalizeRoomCode(input: string | null | undefined): string | null {
  if (!input) return null
  const cleaned = input.trim().toUpperCase()
  return /^[A-Z0-9_-]{3,10}$/.test(cleaned) ? cleaned : null
}

/**
 * Maps live accelerometer magnitude to 0-5 LED gauge levels.
 * Conforms to E2E Tier 1 [R2-03] and Tier 2 [R2-B04] specifications.
 */
export function calculateVuMeterLevel(
  magnitude: number,
  swingThreshold = 12.0,
  maxThreshold = 32.0
): number {
  if (typeof magnitude !== "number" || isNaN(magnitude) || magnitude <= 0) {
    return 0
  }
  if (magnitude < 8.0) return 0
  if (magnitude < swingThreshold) return 1
  const ratio = (magnitude - swingThreshold) / Math.max(1, maxThreshold - swingThreshold)
  if (ratio < 0.25) return 2
  if (ratio < 0.55) return 3
  if (ratio < 0.85) return 4
  return 5
}

export interface TennisRemoteControllerProps {
  roomCode: string
  onExit?: () => void
}

interface LastGestureInfo {
  type: TennisGestureType
  power: number
  time: number
}

interface EventFeedbackInfo {
  text: string
  color: "emerald" | "blue" | "orange" | "red"
  time: number
}

export function TennisRemoteController({
  roomCode,
  onExit,
}: TennisRemoteControllerProps) {
  const normalizedRoom = React.useMemo(() => normalizeRoomCode(roomCode) || roomCode, [roomCode])

  // Connection & Presence State
  const [isChannelSubscribed, setIsChannelSubscribed] = React.useState(false)
  const [isHostConnected, setIsHostConnected] = React.useState(false)
  const channelRef = React.useRef<RealtimeChannel | null>(null)

  // Motion Detection State
  const [permissionState, setPermissionState] = React.useState<MotionPermissionState | "prompt">("granted")
  const [handedness, setHandedness] = React.useState<"right" | "left">("right")
  const [liveMagnitude, setLiveMagnitude] = React.useState(0)
  const [lastGesture, setLastGesture] = React.useState<LastGestureInfo | null>(null)
  const [eventFeedback, setEventFeedback] = React.useState<EventFeedbackInfo | null>(null)

  // Haptics & Audio Settings
  const [soundEnabled, setSoundEnabled] = React.useState(true)
  const [screenFlash, setScreenFlash] = React.useState<"" | "hit" | "smash" | "win" | "lose">("")

  // Debounce reference for tactile buttons (Tier 2 [R2-B03]: 200ms debounce)
  const lastButtonTimeRef = React.useRef(0)

  // Classifier & Listener reference
  const classifierRef = React.useRef<TennisGestureClassifier | null>(null)
  const listenerRef = React.useRef<BrowserMotionListener | null>(null)

  // 1. Detect iOS device motion permission requirement on mount
  React.useEffect(() => {
    if (typeof window === "undefined") return

    const DeviceMotion = (
      window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }
    ).DeviceMotionEvent

    if (typeof DeviceMotion?.requestPermission === "function") {
      // iOS 13+ Safari requires explicit user activation gesture
      setPermissionState("prompt")
    } else if (!("DeviceMotionEvent" in window)) {
      setPermissionState("unsupported")
    } else {
      setPermissionState("granted")
    }
  }, [])

  // 2. Initialize and manage BrowserMotionListener lifecycle
  React.useEffect(() => {
    if (permissionState !== "granted") {
      if (listenerRef.current) {
        listenerRef.current.stop()
        listenerRef.current = null
      }
      return
    }

    const classifier = new TennisGestureClassifier({ handedness })
    classifierRef.current = classifier

    const listener = new BrowserMotionListener({
      classifier,
      onGesture: (gesture: GestureEvent) => {
        // Physical swing detected
        triggerHaptic("swing")
        setLastGesture({
          type: gesture.type,
          power: gesture.powerMultiplier,
          time: Date.now(),
        })

        // Broadcast to desktop host
        if (channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "remote_motion",
            payload: {
              type: "swing",
              swingType: gesture.type === "toss" ? "toss" : gesture.type,
              power: gesture.powerMultiplier,
              velocity: gesture.velocity,
              timestamp: gesture.timestamp,
            },
          })
        }
      },
      onRawSample: (_sample: MotionSample, magnitude: number) => {
        setLiveMagnitude(magnitude)
      },
    })

    listenerRef.current = listener
    listener.start()

    return () => {
      listener.stop()
      listenerRef.current = null
      classifierRef.current = null
    }
  }, [permissionState, handedness])

  // 3. Smooth analog VU meter decay timer
  React.useEffect(() => {
    const interval = setInterval(() => {
      setLiveMagnitude((prev) => (prev > 0.4 ? prev * 0.82 : 0))
    }, 45)
    return () => clearInterval(interval)
  }, [])

  // 4. Supabase Realtime Broadcast & Presence channel lifecycle
  React.useEffect(() => {
    const client = supabase
    if (!client || !normalizedRoom) return

    const channelName = `tennis-remote-${normalizedRoom}`
    const channel = client.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: "mobile_controller" },
      },
    })
    channelRef.current = channel

    const checkHostPresence = (state: Record<string, any[]>) => {
      let hostFound = false
      for (const k of Object.keys(state)) {
        for (const p of state[k] || []) {
          if (p.role === "desktop_host") {
            hostFound = true
          }
        }
      }
      setIsHostConnected(hostFound)
    }

    channel
      .on("presence", { event: "sync" }, () => {
        checkHostPresence(channel.presenceState())
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        for (const p of newPresences || []) {
          if (p.role === "desktop_host") {
            setIsHostConnected(true)
          }
        }
      })
      .on("presence", { event: "leave" }, () => {
        checkHostPresence(channel.presenceState())
      })
      .on("broadcast", { event: "game_event" }, ({ payload }) => {
        if (payload?.type === "ball_contact") {
          const isSmash = payload.quality === "smash" || payload.quality === "rocket"
          if (isSmash) {
            triggerHaptic("smash")
            setScreenFlash("smash")
            setEventFeedback({
              text: `SMASH ROCKET! 💥 (${Math.round((payload.power ?? 1.4) * 100)}%)`,
              color: "orange",
              time: Date.now(),
            })
          } else if (payload.quality !== "miss") {
            triggerHaptic("hit")
            setScreenFlash("hit")
            setEventFeedback({
              text: `BALL HIT! 🎾 ${payload.quality ? String(payload.quality).toUpperCase() : ""}`,
              color: "emerald",
              time: Date.now(),
            })
          }
          if (soundEnabled) {
            playTennisHitSound(payload.power ?? 1.0, isSmash)
          }
          setTimeout(() => setScreenFlash(""), 260)
        }
      })
      .on("broadcast", { event: "score_event" }, ({ payload }) => {
        if (payload?.type === "point_won" || payload?.winner === "player") {
          triggerHaptic("point_win")
          setScreenFlash("win")
          setEventFeedback({
            text: `POIN MENANG! 🎉 (${payload.score ?? ""})`,
            color: "emerald",
            time: Date.now(),
          })
        } else if (payload?.type === "point_lost" || payload?.winner === "opponent") {
          triggerHaptic("point_lose")
          setScreenFlash("lose")
          setEventFeedback({
            text: `POIN LAWAN! ⚠️ (${payload.score ?? ""})`,
            color: "red",
            time: Date.now(),
          })
        }
        setTimeout(() => setScreenFlash(""), 350)
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setIsChannelSubscribed(true)
          await channel.track({
            role: "mobile_controller",
            device: "smartphone",
            connectedAt: new Date().toISOString(),
          })
        }
      })

    return () => {
      client.removeChannel(channel)
      channelRef.current = null
      setIsChannelSubscribed(false)
      setIsHostConnected(false)
    }
  }, [normalizedRoom, soundEnabled])

  // Request iOS permission on explicit user click
  const handleRequestIosPermission = async () => {
    const result = await requestMotionPermission()
    setPermissionState(result)
    if (result === "granted") {
      triggerHaptic("hit")
    }
  }

  // Toggle Handedness
  const handleToggleHandedness = () => {
    const nextHandedness = handedness === "right" ? "left" : "right"
    setHandedness(nextHandedness)
    if (classifierRef.current) {
      classifierRef.current.updateConfig({ handedness: nextHandedness })
    }
    triggerHaptic("swing")
  }

  // Tactile button actions with 200ms debounce
  const handleButtonAction = (action: "toss" | "swing" | "reset") => {
    const now = Date.now()
    if (now - lastButtonTimeRef.current < 200) {
      return
    }
    lastButtonTimeRef.current = now

    if (action === "toss") {
      triggerHaptic("swing")
      setLastGesture({ type: "toss", power: 1.0, time: now })
      setEventFeedback({ text: "SERVE TOSS ⬆️", color: "emerald", time: now })
    } else if (action === "swing") {
      triggerHaptic("swing")
      setLastGesture({ type: "forehand", power: 1.15, time: now })
      setEventFeedback({ text: "SWING! 🎾", color: "blue", time: now })
    } else if (action === "reset") {
      triggerHaptic("hit")
      setEventFeedback({ text: "RESET PERTANDINGAN 🔄", color: "red", time: now })
    }

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "remote_action",
        payload: { action, timestamp: now },
      })
    }
  }

  // Compute 0-5 VU meter level
  const vuLevel = calculateVuMeterLevel(liveMagnitude)

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#141e2e] flex flex-col items-center justify-between p-2 sm:p-4 select-none touch-manipulation font-sans overflow-x-hidden">
      {/* Full-screen Haptic Flash Fallback Overlay (crucial for iOS Safari) */}
      {screenFlash && (
        <div
          className={cn(
            "fixed inset-0 pointer-events-none z-50 transition-opacity duration-150",
            screenFlash === "hit" && "bg-cyan-400/30",
            screenFlash === "smash" && "bg-amber-400/40 animate-pulse",
            screenFlash === "win" && "bg-emerald-400/35",
            screenFlash === "lose" && "bg-rose-500/30"
          )}
        />
      )}

      {/* Controller Body Wrapper: Retro Joy-Con / Wii Remote Chassis */}
      <div className="relative w-full max-w-[340px] my-auto bg-gradient-to-b from-[#E6ECF2] via-[#D8E2EC] to-[#C8D4E2] rounded-[38px] p-4 sm:p-5 flex flex-col items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.65),inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-4px_6px_rgba(0,0,0,0.2)] border-4 border-t-white border-l-white border-r-[#8397AB] border-b-[#8397AB]">
        {/* Top Speaker / Sensor Bevel */}
        <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-[#B0C0D0]">
          {/* Back / Exit Button */}
          {onExit ? (
            <button
              type="button"
              onClick={onExit}
              className="flex items-center gap-1 text-[11px] font-mono font-bold text-slate-700 hover:text-slate-900 bg-white/70 hover:bg-white px-2 py-0.5 rounded-[3px] border border-slate-300 shadow-sm cursor-pointer"
              title="Ganti Kode Ruangan"
            >
              <ArrowLeft className="size-3" />
              <span>Ganti</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-slate-700">
              <Smartphone className="size-3.5 text-blue-700" />
              <span>WII REMOTE</span>
            </div>
          )}

          {/* Quick Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 rounded bg-white/70 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-300 shadow-sm cursor-pointer"
            title={soundEnabled ? "Nonaktifkan Suara" : "Aktifkan Suara"}
          >
            {soundEnabled ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5 text-slate-400" />}
          </button>
        </div>

        {/* Status LCD Display */}
        <div className="w-full bg-[#0B1524] border-2 border-t-[#000000] border-l-[#000000] border-r-[#687C92] border-b-[#687C92] rounded-[6px] p-2.5 mb-3 shadow-inner">
          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-slate-400 font-bold uppercase tracking-wider">ROOM CODE</span>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                {isHostConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={cn(
                    "relative inline-flex rounded-full h-2.5 w-2.5",
                    isHostConnected
                      ? "bg-emerald-500 shadow-[0_0_8px_#10b981]"
                      : isChannelSubscribed
                      ? "bg-amber-400 animate-pulse shadow-[0_0_6px_#f59e0b]"
                      : "bg-rose-500 shadow-[0_0_6px_#f43f5e]"
                  )}
                />
              </span>
              <span
                className={cn(
                  "font-bold text-[10px]",
                  isHostConnected
                    ? "text-emerald-400"
                    : isChannelSubscribed
                    ? "text-amber-300"
                    : "text-rose-400"
                )}
              >
                {isHostConnected
                  ? "DESKTOP TERHUBUNG"
                  : isChannelSubscribed
                  ? "MENUNGGU DESKTOP..."
                  : "MENGHUBUNGKAN..."}
              </span>
            </div>
          </div>

          <div className="mt-1 flex items-center justify-between">
            <span className="font-mono text-xl font-black text-[#33FF66] tracking-widest drop-shadow-[0_0_8px_rgba(51,255,102,0.4)]">
              {normalizedRoom}
            </span>
            <span className="text-[10px] font-mono text-slate-400 bg-white/10 px-1.5 py-0.5 rounded">
              P1 ACTIVE
            </span>
          </div>

          {!isSupabaseConfigured && (
            <div className="mt-1 text-[10px] text-amber-300 font-sans leading-tight">
              Mode Demo Lokal (Supabase offline). Gerakan & tombol tetap aktif.
            </div>
          )}
        </div>

        {/* iOS Permission Splash / Sensor Activation Button */}
        {permissionState === "prompt" && (
          <div className="w-full bg-amber-50 border-2 border-amber-400 rounded-lg p-2.5 mb-3 text-center shadow-md animate-in fade-in-0">
            <div className="font-mono font-bold text-xs text-amber-900 mb-1 flex items-center justify-center gap-1.5">
              <Zap className="size-3.5 text-amber-600 animate-bounce" />
              <span>IZINKAN SENSOR GERAK</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-tight mb-2">
              Safari butuh izin untuk mengaktifkan accelerometer & gyroscope.
            </p>
            <button
              type="button"
              onClick={handleRequestIosPermission}
              className="w-full py-1.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 active:from-blue-700 active:to-indigo-700 text-white font-mono font-bold text-xs rounded shadow-sm cursor-pointer"
            >
              ⚡ AKTIFKAN SENSOR GERAK
            </button>
          </div>
        )}

        {permissionState === "denied" && (
          <div className="w-full bg-rose-50 border border-rose-300 rounded p-2 mb-3 text-[11px] text-rose-800 leading-tight text-center">
            Sensor gerak ditolak di Safari. Gunakan tombol fisik [A], [B], [R] di bawah.
          </div>
        )}

        {/* Live Swing Power VU Meter */}
        <div className="w-full bg-[#0B1524] border-2 border-t-[#000000] border-l-[#000000] border-r-[#687C92] border-b-[#687C92] rounded-[6px] p-2.5 mb-3 shadow-inner space-y-1.5">
          <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span>SWING POWER / G-FORCE</span>
            <span
              className={cn(
                "font-mono font-bold",
                vuLevel >= 4
                  ? "text-rose-400 animate-pulse"
                  : vuLevel >= 2
                  ? "text-yellow-400"
                  : "text-emerald-400"
              )}
            >
              {liveMagnitude > 0 ? `${liveMagnitude.toFixed(1)} m/s²` : "READY"}
            </span>
          </div>

          {/* 5-Bar LED Gauge */}
          <div className="grid grid-cols-5 gap-1.5 h-6 p-1 bg-[#060D17] rounded border border-black shadow-inner">
            {/* LED 1: Low */}
            <div
              className={cn(
                "rounded-[2px] transition-all duration-75 border",
                vuLevel >= 1
                  ? "bg-emerald-500 border-emerald-300 shadow-[0_0_8px_#10b981]"
                  : "bg-emerald-950/40 border-emerald-950/50"
              )}
            />
            {/* LED 2: Medium-Low */}
            <div
              className={cn(
                "rounded-[2px] transition-all duration-75 border",
                vuLevel >= 2
                  ? "bg-lime-500 border-lime-300 shadow-[0_0_8px_#84cc16]"
                  : "bg-lime-950/40 border-lime-950/50"
              )}
            />
            {/* LED 3: Medium */}
            <div
              className={cn(
                "rounded-[2px] transition-all duration-75 border",
                vuLevel >= 3
                  ? "bg-yellow-400 border-yellow-200 shadow-[0_0_8px_#facc15]"
                  : "bg-yellow-950/40 border-yellow-950/50"
              )}
            />
            {/* LED 4: High */}
            <div
              className={cn(
                "rounded-[2px] transition-all duration-75 border",
                vuLevel >= 4
                  ? "bg-orange-500 border-orange-300 shadow-[0_0_10px_#f97316]"
                  : "bg-orange-950/40 border-orange-950/50"
              )}
            />
            {/* LED 5: Smash Peak */}
            <div
              className={cn(
                "rounded-[2px] transition-all duration-75 border",
                vuLevel >= 5
                  ? "bg-rose-500 border-rose-300 shadow-[0_0_12px_#f43f5e] animate-pulse"
                  : "bg-rose-950/40 border-rose-950/50"
              )}
            />
          </div>

          {/* Dynamic feedback banner */}
          <div className="min-h-[22px] flex items-center justify-between text-[11px] font-mono">
            {eventFeedback ? (
              <span
                className={cn(
                  "font-bold truncate",
                  eventFeedback.color === "emerald" && "text-emerald-400",
                  eventFeedback.color === "blue" && "text-cyan-400",
                  eventFeedback.color === "orange" && "text-amber-400 animate-pulse",
                  eventFeedback.color === "red" && "text-rose-400"
                )}
              >
                {eventFeedback.text}
              </span>
            ) : lastGesture ? (
              <span className="text-yellow-300 font-bold">
                {lastGesture.type.toUpperCase()}! ⚡ {(lastGesture.power).toFixed(2)}x
              </span>
            ) : (
              <span className="text-slate-400 italic">Ayunkan HP untuk memukul</span>
            )}

            <button
              type="button"
              onClick={handleToggleHandedness}
              className="ml-auto flex items-center gap-1 text-[10px] font-mono text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-1.5 py-0.5 rounded cursor-pointer border border-white/20"
              title="Ganti Tangan Dominan (Kanan / Kiri)"
            >
              <Hand className="size-2.5" />
              <span>{handedness === "right" ? "KANAN" : "KIRI"}</span>
            </button>
          </div>
        </div>

        {/* Center Speaker Grill (Retro Wii Remote style) */}
        <div className="flex flex-col gap-1 items-center justify-center my-1 select-none opacity-40">
          <div className="w-10 h-1 bg-slate-500 rounded-full" />
          <div className="w-14 h-1 bg-slate-500 rounded-full" />
          <div className="w-10 h-1 bg-slate-500 rounded-full" />
        </div>

        {/* Tactile Action Buttons ([A] Toss/Serve, [B] Swing, [R] Reset) */}
        <div className="w-full flex flex-col items-center gap-3 my-2">
          {/* Main Round Buttons [A] and [B] */}
          <div className="w-full flex items-center justify-center gap-5 sm:gap-6">
            {/* Big Circular Button [A] — Toss / Serve */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => handleButtonAction("toss")}
                className="size-18 sm:size-20 rounded-full bg-gradient-to-b from-[#EF4444] via-[#DC2626] to-[#B91C1C] text-white flex flex-col items-center justify-center font-black shadow-[0_6px_0_#7F1D1D,0_10px_16px_rgba(0,0,0,0.35)] active:shadow-none active:translate-y-1.5 transition-all border-4 border-t-[#FCA5A5] border-l-[#FCA5A5] border-r-[#7F1D1D] border-b-[#7F1D1D] cursor-pointer"
                title="Tombol [A]: Lempar Bola / Servis (Toss)"
              >
                <span className="text-2xl sm:text-3xl font-mono leading-none drop-shadow">A</span>
                <span className="text-[9px] font-mono font-bold tracking-tight opacity-90">TOSS</span>
              </button>
              <span className="text-[10px] font-mono font-bold text-slate-600 mt-1 uppercase">SERVE</span>
            </div>

            {/* Big Circular Button [B] — Swing */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => handleButtonAction("swing")}
                className="size-18 sm:size-20 rounded-full bg-gradient-to-b from-[#3B82F6] via-[#2563EB] to-[#1D4ED8] text-white flex flex-col items-center justify-center font-black shadow-[0_6px_0_#1E3A8A,0_10px_16px_rgba(0,0,0,0.35)] active:shadow-none active:translate-y-1.5 transition-all border-4 border-t-[#93C5FD] border-l-[#93C5FD] border-r-[#1E3A8A] border-b-[#1E3A8A] cursor-pointer"
                title="Tombol [B]: Pukul Bola (Swing)"
              >
                <span className="text-2xl sm:text-3xl font-mono leading-none drop-shadow">B</span>
                <span className="text-[9px] font-mono font-bold tracking-tight opacity-90">SWING</span>
              </button>
              <span className="text-[10px] font-mono font-bold text-slate-600 mt-1 uppercase">PUKUL</span>
            </div>
          </div>

          {/* Reset Match Button [R] */}
          <div className="w-full flex items-center justify-center pt-1">
            <button
              type="button"
              onClick={() => handleButtonAction("reset")}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-[4px] bg-[#D4DDE6] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] active:border-t-[#5E7287] active:border-l-[#5E7287] active:border-r-white active:border-b-white hover:bg-[#E2EAF2] text-xs font-mono font-bold text-rose-800 shadow-[1px_1px_0px_#5E7287] cursor-pointer"
              title="Reset Pertandingan (R)"
            >
              <RotateCcw className="size-3 text-rose-600" />
              <span>RESET PERTANDINGAN (R)</span>
            </button>
          </div>
        </div>

        {/* Player 1-4 Classic Joy-Con LEDs */}
        <div className="w-full flex flex-col items-center gap-1 pt-3 mt-1 border-t border-[#B0C0D0]">
          <div className="flex items-center gap-4">
            {/* LED 1: Active */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="size-2.5 rounded-full bg-cyan-400 border border-cyan-200 shadow-[0_0_8px_#22d3ee]" />
              <span className="text-[8px] font-mono font-bold text-slate-600">1</span>
            </div>
            {/* LED 2: Inactive */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="size-2.5 rounded-full bg-slate-700/60 border border-slate-600" />
              <span className="text-[8px] font-mono font-bold text-slate-500">2</span>
            </div>
            {/* LED 3: Inactive */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="size-2.5 rounded-full bg-slate-700/60 border border-slate-600" />
              <span className="text-[8px] font-mono font-bold text-slate-500">3</span>
            </div>
            {/* LED 4: Inactive */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="size-2.5 rounded-full bg-slate-700/60 border border-slate-600" />
              <span className="text-[8px] font-mono font-bold text-slate-500">4</span>
            </div>
          </div>

          <div className="text-[10px] font-mono font-black text-slate-500 tracking-wider mt-0.5">
            TENNIS 98
          </div>
        </div>
      </div>
    </div>
  )
}
