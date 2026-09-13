"use client"

import * as React from "react"
import {
  playCraneReleaseSound,
  playTowerLandSound,
  playTowerPerfectSound,
  playTowerCrashSound,
  playRetroNotificationSound,
} from "@/lib/sound-effects"
import { Volume2, VolumeX, RotateCw, Trophy, Users, Building2, Heart, Award, Sparkles, Share2, Check } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Constants & Configurations ─────────────────────────────
const CANVAS_WIDTH = 360
const CANVAS_HEIGHT = 540
const BLOCK_WIDTH = 80
const BLOCK_HEIGHT = 54
const ROPE_LENGTH = 110
const BASE_CRANE_Y = 30
const INITIAL_LIVES = 3
const PERFECT_TOLERANCE = 6
const MAX_FALL_TOLERANCE = 38 // Half block width approx

interface Block {
  id: number
  x: number
  y: number
  width: number
  height: number
  swaySeed: number
  isPerfect?: boolean
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  alpha: number
  color: string
  size: number
}

interface ParachutePerson {
  x: number
  y: number
  vy: number
  umbrellaColor: string
}

interface FloatingText {
  id: number
  x: number
  y: number
  text: string
  color: string
  alpha: number
  scale: number
}

export function TowerBloxxApp() {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

  // Game States
  const [gameState, setGameState] = React.useState<"menu" | "playing" | "gameover">("menu")
  const [floors, setFloors] = React.useState<number>(0)
  const [population, setPopulation] = React.useState<number>(0)
  const [lives, setLives] = React.useState<number>(INITIAL_LIVES)
  const [combo, setCombo] = React.useState<number>(0)
  const [maxCombo, setMaxCombo] = React.useState<number>(0)
  const [highScore, setHighScore] = React.useState<{ floors: number; population: number }>({ floors: 0, population: 0 })
  const [isSoundMuted, setIsSoundMuted] = React.useState<boolean>(false)
  const [copied, setCopied] = React.useState(false)

  // Mutable Game Loop References (for smooth 60fps canvas)
  const gameRef = React.useRef<{
    blocks: Block[]
    craneAngle: number
    craneSpeed: number
    fallingBlock: {
      x: number
      y: number
      vx: number
      vy: number
      angle: number
      vRot: number
      isMiss: boolean
    } | null
    cameraY: number
    targetCameraY: number
    particles: Particle[]
    parachuters: ParachutePerson[]
    floatingTexts: FloatingText[]
    instability: number // 0 to 1, increases when drops are imperfect
    shakeTime: number
    lastTime: number
    isInputBlocked: boolean
  }>({
    blocks: [],
    craneAngle: 0,
    craneSpeed: 2.2,
    fallingBlock: null,
    cameraY: 0,
    targetCameraY: 0,
    particles: [],
    parachuters: [],
    floatingTexts: [],
    instability: 0,
    shakeTime: 0,
    lastTime: 0,
    isInputBlocked: false,
  })

  // Load High Score from localStorage
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("it_things_tower_bloxx_score")
      if (saved) {
        setHighScore(JSON.parse(saved))
      }
    } catch {
      // Ignore storage errors
    }
  }, [])

  // ─── Audio Helper ──────────────────────────────────────────
  const playSfx = React.useCallback(
    (fn: () => void) => {
      if (!isSoundMuted) {
        fn()
      }
    },
    [isSoundMuted]
  )

  // ─── Start / Restart Game ──────────────────────────────────
  const startGame = React.useCallback(() => {
    const groundY = CANVAS_HEIGHT - 70
    gameRef.current = {
      blocks: [
        {
          id: 0,
          x: CANVAS_WIDTH / 2 - BLOCK_WIDTH / 2,
          y: groundY,
          width: BLOCK_WIDTH,
          height: BLOCK_HEIGHT,
          swaySeed: 0,
          isPerfect: true,
        },
      ],
      craneAngle: 0,
      craneSpeed: 2.2,
      fallingBlock: null,
      cameraY: 0,
      targetCameraY: 0,
      particles: [],
      parachuters: [],
      floatingTexts: [],
      instability: 0,
      shakeTime: 0,
      lastTime: performance.now(),
      isInputBlocked: false,
    }

    setFloors(0)
    setPopulation(0)
    setLives(INITIAL_LIVES)
    setCombo(0)
    setMaxCombo(0)
    setGameState("playing")
    playSfx(() => playRetroNotificationSound(0.2))
  }, [playSfx])

  // ─── Drop Action (One-Button Controller) ────────────────────
  const handleDrop = React.useCallback(() => {
    const g = gameRef.current
    if (gameState !== "playing" || g.fallingBlock !== null || g.isInputBlocked) return

    // Calculate current tip of crane
    const pivotX = CANVAS_WIDTH / 2
    const pivotY = BASE_CRANE_Y
    const blockX = pivotX + Math.sin(g.craneAngle) * ROPE_LENGTH - BLOCK_WIDTH / 2
    const blockY = pivotY + Math.cos(g.craneAngle) * ROPE_LENGTH

    // Slight horizontal drift based on crane angular velocity
    const horizontalV = Math.cos(g.craneAngle) * g.craneSpeed * 1.5

    g.fallingBlock = {
      x: blockX,
      y: blockY,
      vx: horizontalV * 0.4,
      vy: 3.5,
      angle: 0,
      vRot: 0,
      isMiss: false,
    }

    playSfx(() => playCraneReleaseSound(0.25))
  }, [gameState, playSfx])

  // Keyboard Controller (Spacebar / ArrowDown / Enter)
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowDown" || e.code === "Enter") {
        e.preventDefault()
        if (gameState === "playing") {
          handleDrop()
        } else if (gameState === "gameover" || gameState === "menu") {
          startGame()
        }
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [gameState, handleDrop, startGame])

  // ─── Main Game Canvas Rendering Loop ───────────────────────
  React.useEffect(() => {
    let animId: number
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const loop = (currentTime: number) => {
      const g = gameRef.current
      const dt = Math.min((currentTime - (g.lastTime || currentTime)) / 1000, 0.1)
      g.lastTime = currentTime

      if (gameState === "playing") {
        // 1. Update Crane Swing
        // Crane speed increases slightly with more floors for thrill
        const currentFloorCount = Math.max(0, g.blocks.length - 1)
        const targetSpeed = 2.2 + Math.min(currentFloorCount * 0.04, 1.8)
        g.craneSpeed = targetSpeed
        g.craneAngle = Math.sin((currentTime / 1000) * g.craneSpeed) * 0.68

        // 2. Update Falling Block Physics
        if (g.fallingBlock) {
          const fb = g.fallingBlock
          fb.y += fb.vy
          fb.x += fb.vx
          fb.vy += 22 * dt // Gravity

          if (fb.isMiss) {
            fb.angle += fb.vRot
            // When falling past bottom of screen, clean up and deduct life
            if (fb.y - g.cameraY > CANVAS_HEIGHT + 100) {
              g.fallingBlock = null
              setLives((prev) => {
                const nextLives = prev - 1
                if (nextLives <= 0) {
                  setGameState("gameover")
                }
                return Math.max(0, nextLives)
              })
              setCombo(0)
            }
          } else {
            // Check collision with top block
            const topBlock = g.blocks[g.blocks.length - 1]
            const targetLandingY = topBlock.y - BLOCK_HEIGHT

            if (fb.y >= targetLandingY) {
              // Calculate horizontal accuracy
              // Take into account top block's current wobble offset
              const timeSec = currentTime / 1000
              const topSway =
                Math.sin(timeSec * 2.8 + topBlock.swaySeed) *
                (g.instability * Math.min(g.blocks.length, 25) * 0.45)
              const actualTargetX = topBlock.x + topSway
              const diffX = fb.x - actualTargetX

              if (Math.abs(diffX) <= MAX_FALL_TOLERANCE) {
                // ── LANDED SUCCESS! ──
                const isPerfect = Math.abs(diffX) <= PERFECT_TOLERANCE
                const finalX = isPerfect ? actualTargetX : fb.x

                // Add block
                g.blocks.push({
                  id: g.blocks.length,
                  x: finalX,
                  y: targetLandingY,
                  width: BLOCK_WIDTH,
                  height: BLOCK_HEIGHT,
                  swaySeed: g.blocks.length * 0.35,
                  isPerfect,
                })

                g.fallingBlock = null
                const newFloorCount = g.blocks.length - 1
                setFloors(newFloorCount)

                // Smooth camera follow (keep crane & top block centered)
                g.targetCameraY = Math.max(0, (newFloorCount - 3) * BLOCK_HEIGHT)

                if (isPerfect) {
                  // Perfect Drop!
                  setCombo((c) => {
                    const nextC = c + 1
                    setMaxCombo((m) => Math.max(m, nextC))
                    playSfx(() => playTowerPerfectSound(nextC))
                    return nextC
                  })

                  const popAdd = 100 + (g.blocks.length - 1) * 10
                  setPopulation((p) => p + popAdd)
                  g.instability = Math.max(0, g.instability - 0.08) // Stabilizes tower!

                  // Spawn Golden Stars Particles
                  for (let i = 0; i < 14; i++) {
                    const angle = (Math.PI * 2 * i) / 14
                    const speed = 40 + Math.random() * 60
                    g.particles.push({
                      x: finalX + BLOCK_WIDTH / 2,
                      y: targetLandingY + BLOCK_HEIGHT,
                      vx: Math.cos(angle) * speed,
                      vy: Math.sin(angle) * speed - 20,
                      alpha: 1,
                      color: Math.random() > 0.4 ? "#FBBF24" : "#FDE047",
                      size: 3 + Math.random() * 2,
                    })
                  }

                  // Floating text
                  g.floatingTexts.push({
                    id: Date.now() + Math.random(),
                    x: finalX + BLOCK_WIDTH / 2,
                    y: targetLandingY - 10,
                    text: "PERFECT!!",
                    color: "#FACC15",
                    alpha: 1,
                    scale: 1.2,
                  })
                } else {
                  // Good Drop (Imperfect)
                  playSfx(() => playTowerLandSound(0.28))
                  setCombo(0)
                  const popAdd = 30 + Math.floor(Math.random() * 20)
                  setPopulation((p) => p + popAdd)

                  // Tower gets slightly wobblier
                  g.instability = Math.min(1.2, g.instability + Math.abs(diffX) * 0.012)

                  // Floating text
                  g.floatingTexts.push({
                    id: Date.now() + Math.random(),
                    x: finalX + BLOCK_WIDTH / 2,
                    y: targetLandingY - 10,
                    text: "BAGUS!",
                    color: "#6EE7B7",
                    alpha: 1,
                    scale: 1.0,
                  })
                }
              } else {
                // ── MISSED / CRASHED! ──
                fb.isMiss = true
                fb.vx = diffX > 0 ? 3.5 : -3.5
                fb.vRot = diffX > 0 ? 0.08 : -0.08
                fb.vy = -2 // slight bounce off
                g.shakeTime = 0.25

                playSfx(() => playTowerCrashSound(0.35))

                // Spawn Falling Parachute Person
                g.parachuters.push({
                  x: fb.x + BLOCK_WIDTH / 2,
                  y: fb.y + 10,
                  vy: 45 + Math.random() * 20,
                  umbrellaColor: Math.random() > 0.5 ? "#EF4444" : "#3B82F6",
                })

                // Floating text
                g.floatingTexts.push({
                  id: Date.now() + Math.random(),
                  x: fb.x + BLOCK_WIDTH / 2,
                  y: fb.y - 10,
                  text: "JEBLOK!",
                  color: "#EF4444",
                  alpha: 1,
                  scale: 1.1,
                })
              }
            }
          }
        }

        // 3. Camera Smooth Interpolation (Lerp)
        g.cameraY += (g.targetCameraY - g.cameraY) * 0.1

        // 4. Update Screen Shake
        if (g.shakeTime > 0) {
          g.shakeTime -= dt
        }
      }

      // ─── Rendering Section ──────────────────────────────────
      ctx.save()

      // Screen Shake offset
      let shakeOffsetX = 0
      let shakeOffsetY = 0
      if (g.shakeTime > 0) {
        shakeOffsetX = (Math.random() - 0.5) * 8
        shakeOffsetY = (Math.random() - 0.5) * 8
      }
      ctx.translate(shakeOffsetX, shakeOffsetY)

      // 1. Dynamic Parallax Sky Background
      renderSky(ctx, g.cameraY, CANVAS_WIDTH, CANVAS_HEIGHT)

      // Apply Camera Viewport Offset
      ctx.save()
      ctx.translate(0, g.cameraY)

      // 2. Draw Ground Foundation
      renderGround(ctx, CANVAS_WIDTH, CANVAS_HEIGHT)

      // 3. Draw Stacked Blocks with Wobble Sway
      const timeSec = currentTime / 1000
      g.blocks.forEach((b, idx) => {
        let sway = 0
        if (idx > 0) {
          sway =
            Math.sin(timeSec * 2.8 + b.swaySeed) *
            (g.instability * Math.min(idx, 25) * 0.45)
        }
        renderBlock(ctx, b.x + sway, b.y, b.width, b.height, idx === 0)
      })

      // 4. Draw Falling Block (if any)
      if (g.fallingBlock) {
        ctx.save()
        ctx.translate(g.fallingBlock.x + BLOCK_WIDTH / 2, g.fallingBlock.y + BLOCK_HEIGHT / 2)
        ctx.rotate(g.fallingBlock.angle)
        renderBlock(ctx, -BLOCK_WIDTH / 2, -BLOCK_HEIGHT / 2, BLOCK_WIDTH, BLOCK_HEIGHT, false)
        ctx.restore()
      }

      // 5. Draw Parachute Characters
      g.parachuters.forEach((p, pIdx) => {
        p.y += p.vy * dt
        renderParachuter(ctx, p.x, p.y, p.umbrellaColor)
      })
      // Clean up parachuters that fell below screen
      g.parachuters = g.parachuters.filter((p) => p.y - g.cameraY < CANVAS_HEIGHT + 50)

      // 6. Draw Particles
      g.particles.forEach((pt) => {
        pt.x += pt.vx * dt
        pt.y += pt.vy * dt
        pt.alpha -= dt * 1.8
        ctx.fillStyle = pt.color
        ctx.globalAlpha = Math.max(0, pt.alpha)
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.globalAlpha = 1
      g.particles = g.particles.filter((pt) => pt.alpha > 0)

      // 7. Draw Floating Texts
      g.floatingTexts.forEach((ft) => {
        ft.y -= 35 * dt
        ft.alpha -= dt * 1.2
        ctx.save()
        ctx.globalAlpha = Math.max(0, ft.alpha)
        ctx.fillStyle = ft.color
        ctx.strokeStyle = "#000000"
        ctx.lineWidth = 3
        ctx.font = `bold ${Math.round(15 * ft.scale)}px "Tahoma", sans-serif`
        ctx.textAlign = "center"
        ctx.strokeText(ft.text, ft.x, ft.y)
        ctx.fillText(ft.text, ft.x, ft.y)
        ctx.restore()
      })
      g.floatingTexts = g.floatingTexts.filter((ft) => ft.alpha > 0)

      ctx.restore() // Restore Camera Translation

      // 8. Draw Crane & Cable (Always stays anchored at top screen)
      if (gameState === "playing" || gameState === "menu") {
        renderCrane(
          ctx,
          CANVAS_WIDTH / 2,
          BASE_CRANE_Y,
          g.craneAngle,
          ROPE_LENGTH,
          g.fallingBlock === null && gameState === "playing"
        )
      }

      ctx.restore() // Restore Screen Shake

      animId = requestAnimationFrame(loop)
    }

    animId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animId)
  }, [gameState, playSfx])

  // Save High Score on Game Over
  React.useEffect(() => {
    if (gameState === "gameover") {
      setHighScore((prev) => {
        const nextHigh = {
          floors: Math.max(prev.floors, floors),
          population: Math.max(prev.population, population),
        }
        try {
          localStorage.setItem("it_things_tower_bloxx_score", JSON.stringify(nextHigh))
        } catch {
          // Ignore
        }
        return nextHigh
      })
    }
  }, [gameState, floors, population])

  // Share Score Result
  const handleShare = () => {
    const text = `🏗️ TOWER BLOXX 98 REPORT 🏗️\nLantai: ${floors} Tingkat\nPopulasi: ${population} Warga\nMax Combo: ${maxCombo}x\nMainkan di IT-Things 98!`
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  // ─── Rank Evaluation ───────────────────────────────────────
  const getRankBadge = (floorCount: number) => {
    if (floorCount >= 50) return { title: "Arsitek Legendaris 🏆", color: "text-amber-500", grade: "S" }
    if (floorCount >= 30) return { title: "Mandor Pro Mega-Proyek ⭐", color: "text-purple-600", grade: "A" }
    if (floorCount >= 15) return { title: "Tukang Sipil Terampil 🛠️", color: "text-blue-600", grade: "B" }
    return { title: "Kuli Magang Belajar Susun 🧱", color: "text-gray-600", grade: "C" }
  }

  return (
    <div className="flex flex-col h-full bg-[#C0C0C0] font-sans text-xs select-none">
      {/* ── Win98 Classic Menu Bar ── */}
      <div className="flex items-center justify-between px-2 py-1 bg-[#D4D0C8] border-b border-[#808080] text-[11px]">
        <div className="flex items-center gap-3">
          <span className="font-bold text-black flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-[#000080]" />
            <span>TOWER_BLOXX.EXE</span>
          </span>
          <button
            onClick={startGame}
            className="px-1.5 py-0.5 hover:bg-[#000080] hover:text-white rounded-[1px] transition-colors"
          >
            Mulai Ulang
          </button>
        </div>

        {/* Mute Button */}
        <button
          onClick={() => setIsSoundMuted(!isSoundMuted)}
          className="flex items-center gap-1 px-1.5 py-0.5 border border-[#808080] active:border-black bg-[#C0C0C0] shadow-sm hover:bg-white/50 text-[10px]"
          title={isSoundMuted ? "Aktifkan Suara" : "Bisukan Suara"}
        >
          {isSoundMuted ? <VolumeX className="w-3 h-3 text-red-600" /> : <Volume2 className="w-3 h-3 text-emerald-700" />}
          <span>{isSoundMuted ? "MUTE" : "SFX ON"}</span>
        </button>
      </div>

      {/* ── Retro HUD Top Bar ── */}
      <div className="px-3 py-1.5 bg-[#B8B4AE] border-b-2 border-[#808080] flex items-center justify-between text-xs">
        {/* Floors */}
        <div className="flex items-center gap-1.5 bg-black/80 text-yellow-300 font-mono px-2 py-1 rounded border border-gray-600 shadow-inner">
          <Building2 className="w-3.5 h-3.5 text-yellow-400" />
          <span className="font-bold tracking-wider">{String(floors).padStart(3, "0")}</span>
          <span className="text-[10px] text-gray-400">LT</span>
        </div>

        {/* Residents / Population */}
        <div className="flex items-center gap-1.5 bg-black/80 text-emerald-400 font-mono px-2 py-1 rounded border border-gray-600 shadow-inner">
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-bold tracking-wider">{String(population).padStart(5, "0")}</span>
          <span className="text-[10px] text-gray-400">WARGA</span>
        </div>

        {/* Lives (Crane Blocks) */}
        <div className="flex items-center gap-1">
          {Array.from({ length: INITIAL_LIVES }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-4 h-4 border border-black/60 rounded-[2px] flex items-center justify-center transition-all",
                i < lives
                  ? "bg-red-600 shadow-[inset_1px_1px_#FFAAAA,inset_-1px_-1px_#880000]"
                  : "bg-gray-400 opacity-40"
              )}
              title={`Nyawa ${i + 1}`}
            >
              <Heart className={cn("w-2.5 h-2.5", i < lives ? "text-white fill-white" : "text-gray-600")} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Canvas Viewport Container ── */}
      <div
        className="relative flex-1 bg-black overflow-hidden cursor-pointer select-none flex items-center justify-center"
        onClick={handleDrop}
        onTouchStart={(e) => {
          e.preventDefault()
          handleDrop()
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full object-contain image-rendering-pixelated"
          style={{ imageRendering: "pixelated" }}
        />

        {/* Active Combo Indicator Overlay */}
        {combo > 1 && gameState === "playing" && (
          <div className="absolute top-4 right-4 pointer-events-none animate-bounce flex items-center gap-1 bg-amber-400/90 text-black px-2.5 py-1 rounded border-2 border-amber-600 shadow-lg font-mono font-bold text-xs">
            <Sparkles className="w-3.5 h-3.5 text-red-600" />
            <span>COMBO x{combo}!</span>
          </div>
        )}

        {/* ── Start Screen Modal ── */}
        {gameState === "menu" && (
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex flex-col items-center justify-center p-4 z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#C0C0C0] border-2 border-t-white border-l-white border-r-black border-b-black p-4 w-full max-w-[280px] shadow-2xl text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-[#000080] text-yellow-300 border-2 border-white/50 rounded flex items-center justify-center shadow">
                <Building2 className="w-8 h-8" />
              </div>

              <div>
                <h2 className="font-bold text-base text-black tracking-wide">TOWER BLOXX 98</h2>
                <p className="text-gray-600 text-[11px] mt-0.5">
                  Susun blok apartemen setinggi langit dengan ayunan crane!
                </p>
              </div>

              <div className="bg-white p-2 border border-[#808080] text-left text-[10px] w-full text-gray-700 space-y-1">
                <p>• <b>Klik / Spasi</b>: Lepas blok lantai dari crane.</p>
                <p>• <b>Pas Tengah</b>: Dapet <i>PERFECT</i> & combo warga!</p>
                <p>• <b>Meleset</b>: Gedung oleng, awas roboh!</p>
              </div>

              {highScore.floors > 0 && (
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-800 bg-amber-100 px-2 py-0.5 border border-amber-400 rounded w-full justify-center">
                  <Trophy className="w-3 h-3 text-amber-600" />
                  <span>Rekor: {highScore.floors} Lt • {highScore.population} Warga</span>
                </div>
              )}

              <button
                onClick={startGame}
                className="w-full py-2 bg-[#000080] text-white font-bold text-xs border-2 border-t-blue-300 border-l-blue-300 border-r-blue-950 border-b-blue-950 active:translate-y-0.5 shadow hover:bg-blue-800 transition-all"
              >
                MULAI BANGUN (SPASI)
              </button>
            </div>
          </div>
        )}

        {/* ── Game Over Modal ── */}
        {gameState === "gameover" && (
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#C0C0C0] border-2 border-t-white border-l-white border-r-black border-b-black p-4 w-full max-w-[300px] shadow-2xl flex flex-col gap-3">
              {/* Retro Dialog Title */}
              <div className="bg-[#000080] text-white px-2 py-0.5 flex items-center justify-between text-[11px] font-bold">
                <span>HASIL_KONSTRUKSI.LOG</span>
                <span className="font-mono text-[9px] bg-red-600 px-1 rounded">PROYEK SELESAI</span>
              </div>

              {/* Title & Rank */}
              <div className="text-center">
                <span className="text-3xl font-black text-blue-950 font-mono">
                  {getRankBadge(floors).grade}
                </span>
                <p className={cn("font-bold text-xs mt-0.5", getRankBadge(floors).color)}>
                  {getRankBadge(floors).title}
                </p>
              </div>

              {/* Stats Box */}
              <div className="bg-white p-2.5 border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white font-mono text-xs space-y-1.5">
                <div className="flex justify-between items-center text-gray-800">
                  <span className="text-gray-500">Tinggi Menara:</span>
                  <span className="font-bold text-blue-900">{floors} Lantai</span>
                </div>
                <div className="flex justify-between items-center text-gray-800">
                  <span className="text-gray-500">Total Populasi:</span>
                  <span className="font-bold text-emerald-800">{population} Warga</span>
                </div>
                <div className="flex justify-between items-center text-gray-800">
                  <span className="text-gray-500">Max Combo:</span>
                  <span className="font-bold text-amber-700">{maxCombo}x</span>
                </div>
                <div className="pt-1.5 border-t border-gray-200 flex justify-between items-center text-gray-700 text-[11px]">
                  <span className="text-gray-400">Rekor Tertinggi:</span>
                  <span className="font-bold text-gray-700">{highScore.floors} Lantai</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  className="flex-1 py-1.5 bg-[#D4D0C8] border-2 border-t-white border-l-white border-r-black border-b-black active:border-t-black active:border-l-black active:border-r-white active:border-b-white text-black font-bold text-[11px] flex items-center justify-center gap-1 hover:bg-white/60 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copied ? "TERSALIN!" : "BAGIKAN"}</span>
                </button>

                <button
                  onClick={startGame}
                  className="flex-1 py-1.5 bg-[#000080] text-white border-2 border-t-blue-300 border-l-blue-300 border-r-blue-950 border-b-blue-950 active:translate-y-0.5 font-bold text-[11px] flex items-center justify-center gap-1 hover:bg-blue-800 transition"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>MAIN LAGI</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Retro Status Bar Bottom ── */}
      <div className="px-3 py-1 bg-[#D4D0C8] border-t-2 border-[#808080] text-[10px] text-gray-600 flex items-center justify-between font-mono">
        <span>Kontrol: [SPASI] atau [KLIK KANVAS] untuk jatuhkan lantai</span>
        <span>v1.0 • TOWER BLOXX</span>
      </div>
    </div>
  )
}

// ─── Procedural Canvas Graphic Renderers ─────────────────────

/**
 * Render Dynamic Parallax Sky depending on Camera Y (height)
 */
function renderSky(ctx: CanvasRenderingContext2D, cameraY: number, w: number, h: number) {
  const floorAltitude = cameraY / BLOCK_HEIGHT

  let topColor = "#38BDF8"
  let bottomColor = "#BAE6FD"

  if (floorAltitude > 55) {
    // Deep Space / Cosmic
    topColor = "#020617"
    bottomColor = "#0F172A"
  } else if (floorAltitude > 35) {
    // Dusk / Night Stars
    topColor = "#1E1B4B"
    bottomColor = "#4338CA"
  } else if (floorAltitude > 18) {
    // Sunset
    topColor = "#EA580C"
    bottomColor = "#FDE047"
  }

  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, topColor)
  grad.addColorStop(1, bottomColor)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  // Draw Stars if dusk or space
  if (floorAltitude > 30) {
    ctx.fillStyle = "#FFFFFF"
    for (let i = 0; i < 24; i++) {
      const sx = (i * 73 + 15) % w
      const sy = (i * 47 + 25) % (h * 0.7)
      const size = (i % 3 === 0) ? 2 : 1
      ctx.fillRect(sx, sy, size, size)
    }
  }

  // Draw Pixel Clouds if daytime
  if (floorAltitude <= 30) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.65)"
    // Cloud 1
    const c1X = (w * 0.2 - cameraY * 0.05) % (w + 100) - 40
    renderCloud(ctx, c1X, 80, 70, 20)

    // Cloud 2
    const c2X = (w * 0.7 - cameraY * 0.08) % (w + 100) - 40
    renderCloud(ctx, c2X, 160, 90, 24)
  }
}

function renderCloud(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, [h / 2])
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x + w * 0.35, y - h * 0.3, h * 0.6, 0, Math.PI * 2)
  ctx.arc(x + w * 0.65, y - h * 0.2, h * 0.5, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * Render Concrete Base / Foundation
 */
function renderGround(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const groundY = h - 70
  ctx.fillStyle = "#6B7280"
  ctx.fillRect(0, groundY + BLOCK_HEIGHT, w, 100)

  // Base Foundation Slab
  ctx.fillStyle = "#4B5563"
  const baseX = w / 2 - (BLOCK_WIDTH + 20) / 2
  ctx.fillRect(baseX, groundY + BLOCK_HEIGHT - 6, BLOCK_WIDTH + 20, 10)
  ctx.fillStyle = "#9CA3AF"
  ctx.fillRect(baseX, groundY + BLOCK_HEIGHT - 6, BLOCK_WIDTH + 20, 2)
}

/**
 * Render Classic Pixel-Art Apartment Floor Block
 */
function renderBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  isBase = false
) {
  ctx.save()

  // Main Brick Color
  const brickColor = isBase ? "#854D0E" : "#C4342D"
  const highlightColor = isBase ? "#A16207" : "#E8554E"
  const shadowColor = isBase ? "#533107" : "#7A1A14"

  ctx.fillStyle = brickColor
  ctx.fillRect(x, y, w, h)

  // 3D Bevel Borders
  ctx.fillStyle = highlightColor
  ctx.fillRect(x, y, w, 3) // Top
  ctx.fillRect(x, y, 3, h) // Left

  ctx.fillStyle = shadowColor
  ctx.fillRect(x + w - 3, y, 3, h) // Right
  ctx.fillRect(x, y + h - 3, w, 3) // Bottom

  // Top Cornice / Ledge
  ctx.fillStyle = "#FFFFFF"
  ctx.fillRect(x - 2, y, w + 4, 3)
  ctx.fillStyle = "#D4D4D8"
  ctx.fillRect(x - 2, y + 3, w + 4, 1)

  // Windows (Two classic arched / rectangular windows with warm light)
  const winWidth = 18
  const winHeight = 24
  const winY = y + 14

  // Window 1
  renderWindow(ctx, x + 14, winY, winWidth, winHeight)
  // Window 2
  renderWindow(ctx, x + w - 14 - winWidth, winY, winWidth, winHeight)

  ctx.restore()
}

/**
 * Render Window with inner pane reflection
 */
function renderWindow(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  ww: number,
  wh: number
) {
  // Outer frame
  ctx.fillStyle = "#FFFFFF"
  ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4)
  ctx.fillStyle = "#71717A"
  ctx.strokeRect(wx - 2, wy - 2, ww + 4, wh + 4)

  // Glass (lit interior)
  ctx.fillStyle = "#FEF08A"
  ctx.fillRect(wx, wy, ww, wh)

  // Window Pane Mullions (cross)
  ctx.fillStyle = "#3F3F46"
  ctx.fillRect(wx + ww / 2 - 1, wy, 2, wh)
  ctx.fillRect(wx, wy + wh / 2 - 1, ww, 2)

  // Blue diagonal glass reflection
  ctx.fillStyle = "rgba(147, 197, 253, 0.45)"
  ctx.beginPath()
  ctx.moveTo(wx, wy)
  ctx.lineTo(wx + ww * 0.7, wy)
  ctx.lineTo(wx, wy + wh * 0.7)
  ctx.fill()
}

/**
 * Render Parachuting Character with Umbrella
 */
function renderParachuter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string
) {
  ctx.save()

  // Umbrella Canopy
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, 12, Math.PI, 0)
  ctx.fill()

  // Umbrella handle line
  ctx.strokeStyle = "#000000"
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y + 14)
  ctx.stroke()

  // Tiny Pixel Person
  ctx.fillStyle = "#F59E0B" // Head
  ctx.fillRect(x - 2, y + 14, 4, 4)
  ctx.fillStyle = "#2563EB" // Shirt
  ctx.fillRect(x - 2, y + 18, 4, 5)
  ctx.fillStyle = "#1E293B" // Pants
  ctx.fillRect(x - 2, y + 23, 4, 4)

  ctx.restore()
}

/**
 * Render Swinging Crane & Cable
 */
function renderCrane(
  ctx: CanvasRenderingContext2D,
  pivotX: number,
  pivotY: number,
  angle: number,
  ropeLength: number,
  isHoldingBlock: boolean
) {
  ctx.save()

  // Top Steel Pulley Bar
  ctx.fillStyle = "#374151"
  ctx.fillRect(pivotX - 30, pivotY - 14, 60, 14)
  ctx.fillStyle = "#EAB308" // Yellow caution stripes
  for (let i = -24; i < 24; i += 12) {
    ctx.fillRect(pivotX + i, pivotY - 12, 6, 10)
  }

  // Pendulum Cable tip coordinates
  const endX = pivotX + Math.sin(angle) * ropeLength
  const endY = pivotY + Math.cos(angle) * ropeLength

  // Hanging Cable
  ctx.strokeStyle = "#111827"
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(pivotX, pivotY)
  ctx.lineTo(endX, endY)
  ctx.stroke()

  // Hook / Pulley ring
  ctx.fillStyle = "#4B5563"
  ctx.beginPath()
  ctx.arc(endX, endY, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = "#9CA3AF"
  ctx.lineWidth = 1.5
  ctx.stroke()

  // If holding block, draw the block and mechanical clamps
  if (isHoldingBlock) {
    const bx = endX - BLOCK_WIDTH / 2
    const by = endY

    // Draw Block
    renderBlock(ctx, bx, by, BLOCK_WIDTH, BLOCK_HEIGHT, false)

    // Left and Right Mechanical Gripper Claws
    ctx.fillStyle = "#1F2937"
    // Left clamp
    ctx.fillRect(bx - 3, by, 5, 12)
    ctx.fillRect(bx - 3, by + 10, 8, 3)
    // Right clamp
    ctx.fillRect(bx + BLOCK_WIDTH - 2, by, 5, 12)
    ctx.fillRect(bx + BLOCK_WIDTH - 5, by + 10, 8, 3)
  }

  ctx.restore()
}
