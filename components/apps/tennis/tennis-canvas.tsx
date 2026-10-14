"use client"

import * as React from "react"
import * as THREE from "three"
import { loadMiiPlayerGLB, loadStadiumGLB, LoadedMiiActor } from "@/lib/tennis/glb-models"
import { createTennisBall } from "@/lib/tennis/assets"
import {
  playTennisHitSound,
  playTennisBounceSound,
  playCrowdCheerSound,
  playWhistleSound,
  playVictoryFanfare,
} from "@/lib/tennis/audio"
import { cn } from "@/lib/utils"

export interface TennisCanvasProps {
  onBallHit?: () => void
  className?: string
}

export function TennisCanvas({ className }: TennisCanvasProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const animFrameRef = React.useRef<number | null>(null)

  // Loading state untuk model GLB
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadingMsg, setLoadingMsg] = React.useState("Memuat model 3D Mii asli Wii Sports...")

  // Mode Tampilan: "studio" (Fokus Karakter Mii 360°) vs "court" (Arena Lapangan Penuh)
  const [viewMode, setViewMode] = React.useState<"studio" | "court">("studio")
  const viewModeRef = React.useRef<"studio" | "court">("studio")
  viewModeRef.current = viewMode

  // Animasi aktif
  const [activeAnim, setActiveAnim] = React.useState<"idle" | "run" | "swing_fh" | "swing_bh" | "jump">("idle")
  const activeAnimRef = React.useRef(activeAnim)
  activeAnimRef.current = activeAnim

  // Drag 360° Orbit untuk Mode Studio
  const isDraggingRef = React.useRef(false)
  const lastMousePosRef = React.useRef({ x: 0, y: 0 })
  const characterRotationYRef = React.useRef(0)

  // References Three.js
  const sceneRef = React.useRef<THREE.Scene | null>(null)
  const cameraRef = React.useRef<THREE.PerspectiveCamera | null>(null)
  const playerRef = React.useRef<LoadedMiiActor | null>(null)
  const opponentRef = React.useRef<LoadedMiiActor | null>(null)
  const ballGroupRef = React.useRef<THREE.Group | null>(null)
  const shadowMeshRef = React.useRef<THREE.Mesh | null>(null)
  const studioPedestalRef = React.useRef<THREE.Group | null>(null)
  const stadiumGroupRef = React.useRef<THREE.Group | null>(null)

  // Trigger Animasi Swing
  const swingProgressRef = React.useRef(0)

  const triggerSwing = (isForehand = true) => {
    setActiveAnim(isForehand ? "swing_fh" : "swing_bh")
    playTennisHitSound(1.2, true)
    let p = 0
    const step = () => {
      p += 0.045
      swingProgressRef.current = p
      if (playerRef.current) {
        playerRef.current.setSwingAnimation(p, isForehand)
      }
      if (p < 1) {
        requestAnimationFrame(step)
      } else {
        swingProgressRef.current = 0
        if (playerRef.current) playerRef.current.resetPose()
        setActiveAnim("idle")
      }
    }
    requestAnimationFrame(step)
  }

  // Setup Three.js Scene & Load Authentic GLB Models
  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth || 800
    const height = container.clientHeight || 500

    // 1. Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xa7dbf5)
    scene.fog = new THREE.FogExp2(0xa7dbf5, 0.008)
    sceneRef.current = scene

    // 2. Camera: Di Mode Studio diarahkan sejajar dada/wajah agar seluruh badan Mii pas di layar
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 140)
    cameraRef.current = camera

    if (viewModeRef.current === "studio") {
      camera.position.set(0, 1.25, 3.8)
      camera.lookAt(0, 1.05, 0)
    } else {
      camera.position.set(0, 10.5, 20.5)
      camera.lookAt(0, 1.2, -1.0)
    }

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.08
    container.appendChild(renderer.domElement)

    // 4. Pencahayaan Stadion Wii Sports
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95)
    scene.add(ambientLight)

    const sunLight = new THREE.DirectionalLight(0xfffbe8, 1.5)
    sunLight.position.set(10, 24, 14)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 2048
    sunLight.shadow.mapSize.height = 2048
    sunLight.shadow.bias = -0.0005
    scene.add(sunLight)

    const fillLight = new THREE.DirectionalLight(0xbbe1fa, 0.55)
    fillLight.position.set(-12, 14, -8)
    scene.add(fillLight)

    // 5. Pedestal Studio untuk Mii Character Showcase
    const pedestalGroup = new THREE.Group()
    const pedGeo = new THREE.CylinderGeometry(1.5, 1.7, 0.12, 32)
    const pedMat = new THREE.MeshStandardMaterial({ color: 0x225c2b, roughness: 0.4 })
    const pedestal = new THREE.Mesh(pedGeo, pedMat)
    pedestal.position.y = -0.06
    pedestal.receiveShadow = true
    pedestalGroup.add(pedestal)

    const ringGeo = new THREE.TorusGeometry(1.52, 0.035, 12, 32)
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = Math.PI / 2
    pedestalGroup.add(ring)

    scene.add(pedestalGroup)
    studioPedestalRef.current = pedestalGroup

    // 6. Bola Tenis 3D
    const { shadowMesh, group: ballGroup } = createTennisBall()
    ballGroup.position.set(0, 1.4, 6.2)
    scene.add(ballGroup)
    ballGroupRef.current = ballGroup
    shadowMeshRef.current = shadowMesh

    // 7. Load Model Asli GLB secara Asynchronous
    let isCancelled = false
    async function loadAllGLBModels() {
      try {
        setLoadingMsg("Memuat karakter Mii Player asli...")
        const playerActor = await loadMiiPlayerGLB(false)
        if (isCancelled) return
        playerRef.current = playerActor
        scene.add(playerActor.group)

        setLoadingMsg("Memuat karakter Mii Lawan...")
        const opponentActor = await loadMiiPlayerGLB(true)
        if (isCancelled) return
        opponentRef.current = opponentActor
        opponentActor.group.position.set(1.4, 0, -8.8)
        scene.add(opponentActor.group)

        setLoadingMsg("Memuat arena stadion Wii Sports...")
        const { stadium, net, crowd } = await loadStadiumGLB()
        if (isCancelled) return
        const stadiumHolder = new THREE.Group()
        stadiumHolder.add(stadium)
        stadiumHolder.add(net)
        stadiumHolder.add(crowd)
        scene.add(stadiumHolder)
        stadiumGroupRef.current = stadiumHolder

        // Atur posisi awal sesuai viewMode
        if (viewModeRef.current === "studio") {
          stadiumHolder.visible = false
          opponentActor.group.visible = false
          ballGroup.visible = false
          pedestalGroup.visible = true
          playerActor.group.position.set(0, 0, 0)
          playerActor.group.rotation.y = 0
        } else {
          stadiumHolder.visible = true
          opponentActor.group.visible = true
          ballGroup.visible = true
          pedestalGroup.visible = false
          playerActor.group.position.set(0, 0, 9.2)
          playerActor.group.rotation.y = Math.PI // Hadap net di match
        }

        setIsLoading(false)
      } catch (err) {
        console.error("Gagal memuat GLB tennis models:", err)
        setLoadingMsg("Gagal memuat model GLB.")
        setIsLoading(false)
      }
    }

    loadAllGLBModels()

    // 8. Resize Observer
    const handleResize = () => {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)

    // 9. Animation Loop
    const clock = new THREE.Clock()
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate)
      const time = clock.getElapsedTime()
      const isStudio = viewModeRef.current === "studio"

      // Kamera interpolasi halus
      if (isStudio) {
        camera.position.lerp(new THREE.Vector3(0, 1.25, 3.8), 0.08)
        camera.lookAt(0, 1.05, 0)

        // Terapkan rotasi 360° drag user
        if (playerRef.current) {
          playerRef.current.group.rotation.y = characterRotationYRef.current
        }
      } else {
        camera.position.lerp(new THREE.Vector3(0, 10.5, 20.5), 0.08)
        camera.lookAt(0, 1.2, -1.0)
        if (playerRef.current) {
          playerRef.current.group.rotation.y = Math.PI
        }
      }

      // Animasi Karakter Player
      if (playerRef.current && swingProgressRef.current === 0) {
        if (activeAnimRef.current === "run") {
          playerRef.current.setRunningAnimation(time, true)
        } else if (activeAnimRef.current === "jump") {
          const jumpHeight = Math.abs(Math.sin(time * 6)) * 0.45
          playerRef.current.group.position.y = jumpHeight
        } else {
          playerRef.current.group.position.y = 0
          playerRef.current.setRunningAnimation(time, false)
        }
      }

      // Animasi Karakter Lawan: Berdiri Siaga Tenang di Lapangan Seberang (Ready Stance)
      if (!isStudio && opponentRef.current) {
        opponentRef.current.group.position.x = 1.2
        opponentRef.current.setRunningAnimation(time, false)
      }

      // Animasi Bola Tenis
      if (!isStudio && ballGroupRef.current) {
        const bounceHeight = Math.abs(Math.sin(time * 3.8)) * 1.4 + 0.26
        ballGroupRef.current.position.y = bounceHeight
        ballGroupRef.current.rotation.x += 0.04
        ballGroupRef.current.rotation.y += 0.05
        if (shadowMeshRef.current) {
          const shadowScale = Math.max(0.45, 1.25 - bounceHeight * 0.4)
          shadowMeshRef.current.scale.set(shadowScale, shadowScale, shadowScale)
        }
      }

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      isCancelled = true
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      resizeObserver.disconnect()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  // Switch Mode Tampilan (Studio vs Court)
  const handleToggleViewMode = (mode: "studio" | "court") => {
    setViewMode(mode)
    if (!playerRef.current || !studioPedestalRef.current) return

    if (mode === "studio") {
      if (stadiumGroupRef.current) stadiumGroupRef.current.visible = false
      if (opponentRef.current) opponentRef.current.group.visible = false
      if (ballGroupRef.current) ballGroupRef.current.visible = false
      studioPedestalRef.current.visible = true
      playerRef.current.group.position.set(0, 0, 0)
      characterRotationYRef.current = 0
    } else {
      if (stadiumGroupRef.current) stadiumGroupRef.current.visible = true
      if (opponentRef.current) opponentRef.current.group.visible = true
      if (ballGroupRef.current) ballGroupRef.current.visible = true
      studioPedestalRef.current.visible = false
      playerRef.current.group.position.set(0, 0, 9.2)
      characterRotationYRef.current = Math.PI
      setActiveAnim("idle")
    }
  }

  // Pointer Handlers untuk Drag 360° di Studio Mode
  const handlePointerDown = (e: React.PointerEvent) => {
    if (viewMode !== "studio") return
    isDraggingRef.current = true
    lastMousePosRef.current = { x: e.clientX, y: e.clientY }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || viewMode !== "studio") return
    const deltaX = e.clientX - lastMousePosRef.current.x
    lastMousePosRef.current = { x: e.clientX, y: e.clientY }
    characterRotationYRef.current += deltaX * 0.015
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
  }

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-900 select-none overflow-hidden">
      {/* 3D Canvas Viewport */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={cn(
          "flex-1 w-full h-full relative touch-none",
          viewMode === "studio" ? "cursor-grab active:cursor-grabbing" : "cursor-default"
        )}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-900/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30 text-white font-mono">
          <div className="w-10 h-10 border-4 border-lime-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold tracking-wide text-lime-300 animate-pulse">
            {loadingMsg}
          </p>
        </div>
      )}

      {/* Top Switcher Bar: Studio vs Arena */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none z-10">
        <div className="pointer-events-auto flex items-center p-1 bg-[#c0c0c0] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] shadow-xl">
          <button
            type="button"
            onClick={() => handleToggleViewMode("studio")}
            className={cn(
              "px-3 py-1 text-xs font-bold transition-all",
              viewMode === "studio"
                ? "bg-[#000080] text-white shadow-inner"
                : "bg-transparent text-slate-800 hover:bg-slate-200"
            )}
          >
            👤 STUDIO KARAKTER MII (360° GLB)
          </button>
          <button
            type="button"
            onClick={() => handleToggleViewMode("court")}
            className={cn(
              "px-3 py-1 text-xs font-bold transition-all",
              viewMode === "court"
                ? "bg-[#000080] text-white shadow-inner"
                : "bg-transparent text-slate-800 hover:bg-slate-200"
            )}
          >
            🎾 ARENA LAPANGAN STADION (GLB)
          </button>
        </div>

        {viewMode === "studio" && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-black/75 backdrop-blur-sm text-lime-400 font-mono text-xs rounded-full border border-lime-400/30">
            <span>🔄 Klik & geser mouse untuk memutar karakter 360°</span>
          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      {viewMode === "studio" ? (
        <div className="absolute bottom-3 left-3 right-3 bg-[#c0c0c0] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] p-2.5 shadow-2xl flex flex-wrap items-center justify-between gap-2 z-10">
          {/* Quick Rotate Buttons */}
          <div className="flex items-center gap-1 text-xs">
            <span className="font-mono text-slate-800 font-bold mr-1">SUDUT PANDANG:</span>
            <button
              type="button"
              onClick={() => { characterRotationYRef.current = 0 }}
              className="px-2.5 py-1 bg-[#c0c0c0] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] font-bold text-slate-900 hover:bg-slate-200"
            >
              Depan (Front)
            </button>
            <button
              type="button"
              onClick={() => { characterRotationYRef.current = Math.PI }}
              className="px-2.5 py-1 bg-[#c0c0c0] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] font-bold text-slate-900 hover:bg-slate-200"
            >
              Belakang (Back)
            </button>
            <button
              type="button"
              onClick={() => { characterRotationYRef.current = Math.PI / 2 }}
              className="px-2.5 py-1 bg-[#c0c0c0] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] font-bold text-slate-900 hover:bg-slate-200"
            >
              Samping (Profile)
            </button>
          </div>

          {/* Action & Animation Triggers */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-800 font-mono mr-1">ANIMASI MII:</span>
            <button
              type="button"
              onClick={() => setActiveAnim("idle")}
              className={cn(
                "px-2.5 py-1 text-xs font-bold border-2",
                activeAnim === "idle"
                  ? "bg-[#000080] text-white border-t-[#808080] border-l-[#808080] border-r-white border-b-white"
                  : "bg-[#c0c0c0] text-slate-900 border-t-white border-l-white border-r-[#808080] border-b-[#808080] hover:bg-slate-200"
              )}
            >
              🧘 Ready Stance
            </button>
            <button
              type="button"
              onClick={() => setActiveAnim("run")}
              className={cn(
                "px-2.5 py-1 text-xs font-bold border-2",
                activeAnim === "run"
                  ? "bg-[#000080] text-white border-t-[#808080] border-l-[#808080] border-r-white border-b-white"
                  : "bg-[#c0c0c0] text-slate-900 border-t-white border-l-white border-r-[#808080] border-b-[#808080] hover:bg-slate-200"
              )}
            >
              🏃 Shuffle Run (Kaki Melangkah)
            </button>
            <button
              type="button"
              onClick={() => triggerSwing(true)}
              className="px-2.5 py-1 text-xs font-bold bg-[#c0c0c0] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] text-slate-900 hover:bg-slate-200"
            >
              🏸 Forehand Swing
            </button>
            <button
              type="button"
              onClick={() => triggerSwing(false)}
              className="px-2.5 py-1 text-xs font-bold bg-[#c0c0c0] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] text-slate-900 hover:bg-slate-200"
            >
              🏸 Backhand Swing
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveAnim("jump")
                playVictoryFanfare()
              }}
              className={cn(
                "px-2.5 py-1 text-xs font-bold border-2",
                activeAnim === "jump"
                  ? "bg-[#000080] text-white border-t-[#808080] border-l-[#808080] border-r-white border-b-white"
                  : "bg-[#c0c0c0] text-amber-900 border-t-white border-l-white border-r-[#808080] border-b-[#808080] hover:bg-slate-200"
              )}
            >
              ⭐ Victory Jump
            </button>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-3 left-3 right-3 bg-[#c0c0c0] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] p-2 flex flex-wrap items-center justify-between gap-2 shadow-xl z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 font-mono">
              🎾 ARENA WII SPORTS (AUTHENTIC GLB)
            </span>
            <span className="text-[10px] bg-emerald-700 text-white px-1.5 py-0.5 rounded font-mono font-bold">
              GLB ACTIVE
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => triggerSwing(true)}
              className="px-2.5 py-1 text-xs font-bold bg-[#c0c0c0] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] text-slate-900 hover:bg-slate-200"
            >
              🏸 Forehand Swing
            </button>
            <button
              type="button"
              onClick={() => triggerSwing(false)}
              className="px-2.5 py-1 text-xs font-bold bg-[#c0c0c0] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] text-slate-900 hover:bg-slate-200"
            >
              🏸 Backhand Swing
            </button>
            <button
              type="button"
              onClick={() => playTennisBounceSound()}
              className="px-2 py-1 text-xs font-bold bg-[#c0c0c0] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] text-slate-800"
            >
              🔊 Bounce
            </button>
            <button
              type="button"
              onClick={() => playCrowdCheerSound()}
              className="px-2 py-1 text-xs font-bold bg-[#c0c0c0] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] text-slate-800"
            >
              👏 Cheer
            </button>
            <button
              type="button"
              onClick={() => playWhistleSound()}
              className="px-2 py-1 text-xs font-bold bg-[#c0c0c0] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] text-slate-800"
            >
              🎺 Whistle
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
