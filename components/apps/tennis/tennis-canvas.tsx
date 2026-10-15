"use client"

import * as React from "react"
import * as THREE from "three"
import { loadMiiPlayerGLB, loadStadiumGLB, LoadedMiiActor } from "@/lib/tennis/glb-models"
import { createTennisBall } from "@/lib/tennis/assets"
import { TennisPhysicsEngine, ScoreState } from "@/lib/tennis/tennis-physics"
import {
  playTennisHitSound,
  playTennisBounceSound,
  playCrowdCheerSound,
  playWhistleSound,
  playVictoryFanfare,
  playTennisSwingWhoosh,
} from "@/lib/tennis/audio"
import { cn } from "@/lib/utils"

export interface TennisCanvasHandle {
  triggerServeToss: () => boolean
  executeRemoteSwing: (type: "forehand" | "backhand" | "serve" | "smash", powerMultiplier?: number) => void
  restartMatch: () => void
}

export interface TennisCanvasProps {
  viewMode?: "court" | "studio"
  onViewModeChange?: (mode: "court" | "studio") => void
  onBallHit?: () => void
  onBallContact?: (details: { hitter: "player" | "opponent"; isSmash: boolean; speed: number; quality: string }) => void
  onScoreChange?: (score: ScoreState, winner?: "player" | "opponent") => void
  className?: string
  resetTrigger?: number
}

export function classifyCanvasTouchSwipe(
  start: { x: number; y: number; time: number },
  end: { x: number; y: number; time: number },
  minSwipe = 20,
  maxTap = 15
) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const dt = end.time - start.time
  const dist = Math.hypot(dx, dy)

  if (dist < maxTap) {
    return { type: "tap" as const, action: "handleAction", dist, dt }
  }

  if (dist >= minSwipe) {
    if (Math.abs(dy) >= Math.abs(dx)) {
      return {
        type: "swipe" as const,
        direction: dy < 0 ? ("up" as const) : ("down" as const),
        action: dy < 0 ? "toss" : "smash",
        dist,
        dt,
      }
    } else {
      return {
        type: "swipe" as const,
        direction: dx > 0 ? ("right" as const) : ("left" as const),
        action: dx > 0 ? "forehand" : "backhand",
        dist,
        dt,
      }
    }
  }

  return { type: "ambiguous" as const, dist, dt }
}

export const TennisCanvas = React.forwardRef<TennisCanvasHandle, TennisCanvasProps>(
  function TennisCanvas(
    {
      viewMode: propViewMode,
      onViewModeChange,
      className,
      resetTrigger,
      onBallHit,
      onBallContact,
      onScoreChange,
    }: TennisCanvasProps,
    ref
  ) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const animFrameRef = React.useRef<number | null>(null)

  // Loading state untuk model GLB
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadingMsg, setLoadingMsg] = React.useState("Memuat model 3D Mii asli Wii Sports...")

  // Mode Tampilan: "studio" (Fokus Karakter Mii 360°) vs "court" (Arena Lapangan Penuh)
  const [internalViewMode, setInternalViewMode] = React.useState<"studio" | "court">("court")
  const viewMode = propViewMode ?? internalViewMode
  const viewModeRef = React.useRef<"studio" | "court">(viewMode)
  viewModeRef.current = viewMode

  const setViewMode = (m: "court" | "studio") => {
    setInternalViewMode(m)
    onViewModeChange?.(m)
  }

  // Animasi aktif (untuk Studio Mode)
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
  const reticleMeshRef = React.useRef<THREE.Mesh | null>(null)
  const sparkMeshRef = React.useRef<THREE.Mesh | null>(null)
  const studioPedestalRef = React.useRef<THREE.Group | null>(null)
  const stadiumGroupRef = React.useRef<THREE.Group | null>(null)
  const cameraRecoilRef = React.useRef(0)
  const lastPlayerXRef = React.useRef(0)
  const lastOpponentXRef = React.useRef(0)

  // Trigger Animasi Swing & Impact State
  const swingProgressRef = React.useRef(0)
  const playerIsSwingingRef = React.useRef(false)
  const swingStateRef = React.useRef<{
    active: boolean
    progress: number
    type: "forehand" | "backhand" | "serve" | "smash"
    powerMultiplier: number
    hitEvaluated: boolean
  }>({
    active: false,
    progress: 0,
    type: "forehand",
    powerMultiplier: 1.0,
    hitEvaluated: false,
  })

  // Score & Match State dari Physics Engine
  const [scoreState, setScoreState] = React.useState<ScoreState>({
    playerPoints: 0,
    opponentPoints: 0,
    playerGames: 0,
    opponentGames: 0,
    server: "player",
    isDeuce: false,
    pointBanner: null,
    rallyCount: 0,
    matchWinner: null,
  })

  // Feedback Notification Banner (e.g. "NICE SHOT!", "OUT!")
  const [feedback, setFeedback] = React.useState<{ text: string; color: string } | null>(null)
  const feedbackTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const showToast = (text: string, color = "#ffffff") => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
    setFeedback({ text, color })
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null)
    }, 1200)
  }

  // Visual Hit Spark (Flash Ring Effect saat Raket Menyentuh Bola)
  const triggerHitSpark = (pos: THREE.Vector3, isSuper = false) => {
    const spark = sparkMeshRef.current
    if (!spark) return

    spark.position.copy(pos)
    const baseS = isSuper ? 0.6 : 0.3
    spark.scale.set(baseS, baseS, baseS)
    spark.visible = true

    let progress = 0
    const animateSpark = () => {
      progress += isSuper ? 0.12 : 0.16
      const s = baseS + progress * (isSuper ? 3.4 : 1.6)
      spark.scale.set(s, s, s)
      const mat = spark.material as THREE.MeshBasicMaterial
      if (mat) {
        mat.opacity = Math.max(0, 1 - progress)
      }
      if (progress < 1.0) {
        requestAnimationFrame(animateSpark)
      } else {
        spark.visible = false
      }
    }
    requestAnimationFrame(animateSpark)
  }

  // Ref tracking untuk callbacks props
  const onScoreChangeRef = React.useRef(onScoreChange)
  onScoreChangeRef.current = onScoreChange
  const onBallContactRef = React.useRef(onBallContact)
  onBallContactRef.current = onBallContact
  const onBallHitRef = React.useRef(onBallHit)
  onBallHitRef.current = onBallHit

  // Tennis Physics Engine Instance
  const engineRef = React.useRef<TennisPhysicsEngine | null>(null)
  if (!engineRef.current) {
    engineRef.current = new TennisPhysicsEngine(
      (newScore) => setScoreState({ ...newScore }),
      (text, color) => showToast(text, color),
      (details) => {
        onBallContactRef.current?.(details)
        onBallHitRef.current?.()
      },
      (newScore, winner) => {
        onScoreChangeRef.current?.(newScore, winner)
      }
    )
  }

  React.useEffect(() => {
    if (engineRef.current) {
      engineRef.current.onBallContact = (details) => {
        onBallContactRef.current?.(details)
        onBallHitRef.current?.()
      }
      engineRef.current.onBallHit = (details) => {
        onBallContactRef.current?.(details)
        onBallHitRef.current?.()
      }
      engineRef.current.onScoreChange = (score, winner) => {
        onScoreChangeRef.current?.(score, winner)
      }
    }
  }, [onBallContact, onBallHit, onScoreChange])

  // Eksekusi Ayunan Raket (Forehand / Backhand / Serve / Smash)
  const executeSwing = (
    swingType: "forehand" | "backhand" | "serve" | "smash" | boolean = "forehand",
    powerMultiplier = 1.0
  ) => {
    if (swingStateRef.current.active) return

    let type: "forehand" | "backhand" | "serve" | "smash" =
      typeof swingType === "boolean"
        ? swingType ? "forehand" : "backhand"
        : swingType

    const eng = engineRef.current
    if (eng) {
      if (eng.state === "serving_toss" && (type === "forehand" || type === "backhand")) {
        type = "serve"
      }
    }

    playerIsSwingingRef.current = true
    swingStateRef.current = {
      active: true,
      progress: 0,
      type,
      powerMultiplier: powerMultiplier ?? 1.0,
      hitEvaluated: false,
    }
    setActiveAnim(type === "forehand" ? "swing_fh" : type === "backhand" ? "swing_bh" : "swing_fh")
    playTennisSwingWhoosh(type === "serve" || type === "smash" ? 1.3 : 1.0)
  }

  // Handle Tombol Servis atau Ayunan Universal (Spacebar / Click)
  const handleAction = () => {
    if (!engineRef.current || viewModeRef.current !== "court") {
      executeSwing("forehand")
      return
    }

    const eng = engineRef.current
    if (eng.state === "idle_serve" && eng.score.server === "player") {
      eng.triggerServeToss()
    } else if (eng.state === "serving_toss" && eng.score.server === "player") {
      executeSwing("serve")
    } else {
      // Auto pilih forehand jika bola di kanan pemain, backhand jika di kiri
      const isForehand = eng.ballPos.x >= eng.playerCurrentX
      executeSwing(isForehand ? "forehand" : "backhand")
    }
  }

  // Expose Imperative Controls via React Ref
  React.useImperativeHandle(ref, () => ({
    triggerServeToss: () => {
      if (!engineRef.current || viewModeRef.current !== "court") return false
      return engineRef.current.triggerServeToss()
    },
    executeRemoteSwing: (type: "forehand" | "backhand" | "serve" | "smash", powerMultiplier = 1.0) => {
      if (viewModeRef.current !== "court") return
      executeSwing(type, powerMultiplier)
    },
    restartMatch: () => {
      if (engineRef.current) engineRef.current.restartMatch()
    },
  }))

  // Setup Three.js Scene & Load Authentic GLB Models
  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let isCancelled = false
    const width = container.clientWidth || 800
    const height = container.clientHeight || 500

    // 1. Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xa7dbf5)
    scene.fog = new THREE.FogExp2(0xa7dbf5, 0.008)
    sceneRef.current = scene

    // 2. Camera: Authentic Wii Sports Broadcast Perspective (Kamera Rendah di Belakang Pemain)
    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 140)
    cameraRef.current = camera

    if (viewModeRef.current === "studio") {
      camera.position.set(0, 1.25, 3.8)
      camera.lookAt(0, 1.05, 0)
    } else {
      camera.position.set(0, 4.2, 15.6)
      camera.lookAt(0, 1.15, -1.2)
    }

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.08
    container.appendChild(renderer.domElement)

    // 4. Pencahayaan Stadion Wii Sports
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95)
    scene.add(ambientLight)

    const sunLight = new THREE.DirectionalLight(0xfffbe8, 1.6)
    // Posisi matahari di belakang-kanan pemain (Z = 16, X = 5, Y = 18)
    // Memproyeksikan bayangan karakter ke DEPAN dan sedikit ke KIRI (sesuai Wii Sports asli)
    sunLight.position.set(5, 18, 16)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 2048
    sunLight.shadow.mapSize.height = 2048
    sunLight.shadow.bias = -0.0004
    sunLight.shadow.normalBias = 0.04

    // Konfigurasi Orthographic Shadow Camera agar mencakup seluruh lapangan pertandingan
    const shadowD = 18
    sunLight.shadow.camera.left = -shadowD
    sunLight.shadow.camera.right = shadowD
    sunLight.shadow.camera.top = shadowD + 6
    sunLight.shadow.camera.bottom = -shadowD - 6
    sunLight.shadow.camera.near = 1.0
    sunLight.shadow.camera.far = 65
    sunLight.shadow.camera.updateProjectionMatrix()

    sunLight.target.position.set(0, 0, 0)
    scene.add(sunLight.target)
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
    ring.position.y = 0.005
    pedestalGroup.add(ring)
    scene.add(pedestalGroup)
    studioPedestalRef.current = pedestalGroup

    // 6. Tempat Bola Tenis & Shadow
    const ballObj = createTennisBall()
    const ballGroup = ballObj.group
    scene.add(ballGroup)
    ballGroupRef.current = ballGroup
    shadowMeshRef.current = ballObj.shadowMesh

    // Landing Reticle Indicator (Marker Prediksi Titik Jatuh Bola Presisi)
    const reticleGeo = new THREE.RingGeometry(0.16, 0.26, 24)
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const reticleMesh = new THREE.Mesh(reticleGeo, reticleMat)
    reticleMesh.rotation.x = -Math.PI / 2
    reticleMesh.position.y = 0.03
    scene.add(reticleMesh)
    reticleMeshRef.current = reticleMesh

    // Visual Hit Spark Ring (Kilatan Benturan Bola & Raket)
    const sparkGeo = new THREE.RingGeometry(0.08, 0.28, 18)
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xffea00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    })
    const sparkMesh = new THREE.Mesh(sparkGeo, sparkMat)
    sparkMesh.visible = false
    sparkMesh.rotation.x = -Math.PI / 3
    scene.add(sparkMesh)
    sparkMeshRef.current = sparkMesh

    // 7. Load Model Asli GLB (Mii Player, Mii Opponent, Stadium)
    const stadiumHolder = new THREE.Group()
    scene.add(stadiumHolder)
    stadiumGroupRef.current = stadiumHolder

    const loadAllGLBModels = async () => {
      try {
        setLoadingMsg("Memuat stadion Wii Sports GLB...")
        const { stadium, net, crowd } = await loadStadiumGLB()
        if (isCancelled) return
        stadiumHolder.add(stadium)
        stadiumHolder.add(net)
        stadiumHolder.add(crowd)

        setLoadingMsg("Memuat model 3D Mii Player...")
        const playerActor = await loadMiiPlayerGLB(false)
        if (isCancelled) return
        scene.add(playerActor.group)
        playerRef.current = playerActor

        setLoadingMsg("Memuat model 3D Mii Opponent...")
        const opponentActor = await loadMiiPlayerGLB(true)
        if (isCancelled) return
        scene.add(opponentActor.group)
        opponentRef.current = opponentActor

        // Setel visibilitas awal berdasarkan viewMode
        if (viewModeRef.current === "studio") {
          stadiumHolder.visible = false
          opponentActor.group.visible = false
          ballGroup.visible = false
          reticleMesh.visible = false
          pedestalGroup.visible = true
          playerActor.group.position.set(0, 0, 0)
        } else {
          stadiumHolder.visible = true
          opponentActor.group.visible = true
          ballGroup.visible = true
          reticleMesh.visible = true
          pedestalGroup.visible = false
          playerActor.group.position.set(0, 0, 9.2)
          playerActor.group.rotation.y = Math.PI // Hadap net di match
          opponentActor.group.position.set(0, 0, -9.2)
          opponentActor.group.rotation.y = 0 // Hadap player
        }

        setIsLoading(false)
      } catch (err) {
        console.error("Gagal memuat GLB tennis models:", err)
        setLoadingMsg("Gagal memuat model GLB.")
        setIsLoading(false)
      }
    }

    loadAllGLBModels()

    // 8. Keyboard Controls Listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault()
        handleAction()
      } else if (e.code === "KeyZ" || e.code === "ArrowLeft") {
        executeSwing("backhand")
      } else if (e.code === "KeyX" || e.code === "ArrowRight") {
        executeSwing("forehand")
      } else if (e.code === "KeyR") {
        if (engineRef.current) engineRef.current.restartMatch()
      }
    }
    window.addEventListener("keydown", handleKeyDown)

    // Deteksi kibasan mouse global di seluruh layar (Zero-Click Racket Motion)
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (viewModeRef.current !== "court") return
      const now = performance.now()
      const tracker = mouseMotionTrackerRef.current
      if (tracker.time === 0) {
        tracker.x = e.clientX
        tracker.y = e.clientY
        tracker.time = now
        return
      }

      const dt = now - tracker.time
      if (dt < 14) return
      if (dt > 130) {
        tracker.x = e.clientX
        tracker.y = e.clientY
        tracker.time = now
        return
      }

      const dx = e.clientX - tracker.x
      const dy = e.clientY - tracker.y
      const speed = Math.sqrt(dx * dx + dy * dy) / dt

      tracker.x = e.clientX
      tracker.y = e.clientY
      tracker.time = now

      if (now - lastMouseSwingTimeRef.current < 280) return
      if (swingStateRef.current.active) return

      const eng = engineRef.current
      if (!eng) return

      const isFlick = speed > 0.45 && (Math.abs(dx) > 13 || Math.abs(dy) > 13)
      if (isFlick) {
        if (eng.state === "idle_serve" && eng.score.server === "player") {
          if (dy < -12 || speed > 0.75) {
            eng.triggerServeToss()
            lastMouseSwingTimeRef.current = now
          }
          return
        }

        if (eng.state === "serving_toss" && eng.score.server === "player") {
          executeSwing("serve")
          lastMouseSwingTimeRef.current = now
          return
        }

        if (dx > 14) {
          executeSwing("forehand")
          lastMouseSwingTimeRef.current = now
        } else if (dx < -14) {
          executeSwing("backhand")
          lastMouseSwingTimeRef.current = now
        } else if (Math.abs(dy) > 16) {
          const isForehand = eng.ballPos.x >= eng.playerCurrentX
          executeSwing(isForehand ? "forehand" : "backhand")
          lastMouseSwingTimeRef.current = now
        }
      }
    }
    window.addEventListener("pointermove", handleGlobalPointerMove)

    // 9. Resize Observer
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

    // 10. Animation Loop Three.js (Menggunakan high-resolution performance.now)
    let lastTime = performance.now()
    const startTime = lastTime
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate)
      const now = performance.now()
      const dt = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now
      const time = (now - startTime) / 1000
      const isStudio = viewModeRef.current === "studio"
      const engine = engineRef.current

      // Update Animasi Swing Pemain Universal (berjalan baik di Studio 360 maupun di Court)
      if (swingStateRef.current.active) {
        const sw = swingStateRef.current
        sw.progress += dt / 0.35
        swingProgressRef.current = sw.progress

        if (playerRef.current) {
          const animType = (sw.type === "serve" || sw.type === "smash") ? "serve" : sw.type
          playerRef.current.setSwingAnimation(sw.progress, animType)
        }

        if (!sw.hitEvaluated && sw.progress >= 0.42) {
          sw.hitEvaluated = true
          if (engine && viewModeRef.current === "court") {
            const shotQuality = engine.handlePlayerSwing(sw.type, sw.powerMultiplier)
            if (shotQuality !== "miss") {
              const isSuperHit = engine.isRocketServe || engine.isSmashShot
              cameraRecoilRef.current = engine.isRocketServe ? 0.32 : engine.isSmashShot ? 0.2 : 0.06
              triggerHitSpark(engine.ballPos, isSuperHit)
            }
          }
        }

        if (sw.progress >= 1) {
          sw.active = false
          sw.progress = 0
          swingProgressRef.current = 0
          playerIsSwingingRef.current = false
          if (playerRef.current) playerRef.current.resetPose()
          setActiveAnim("idle")
        }
      }

      if (isStudio) {
        // Mode Studio: Kamera fokus ke karakter
        camera.position.lerp(new THREE.Vector3(0, 1.25, 3.8), 0.08)
        camera.lookAt(0, 1.05, 0)

        // Terapkan rotasi 360° drag user
        if (playerRef.current) {
          playerRef.current.group.rotation.y = characterRotationYRef.current
        }

        // Animasi studio player
        if (playerRef.current && swingProgressRef.current === 0) {
          if (activeAnimRef.current === "run") {
            playerRef.current.group.position.y = 0
            playerRef.current.setRunningAnimation(time, true)
          } else if (activeAnimRef.current === "jump") {
            playerRef.current.group.position.y = 0
            if (playerRef.current.setVictoryAnimation) {
              playerRef.current.setVictoryAnimation(time)
            }
          } else {
            playerRef.current.group.position.y = 0
            playerRef.current.setRunningAnimation(time, false)
          }
        }
      } else {
        // Mode Arena Match Tennis
        if (engine) {
          engine.update(dt, opponentRef.current || undefined, playerRef.current || undefined)

          // 1. Sinkronisasi Posisi Bola 3D
          if (ballGroupRef.current) {
            ballGroupRef.current.position.copy(engine.ballPos)
            ballGroupRef.current.rotation.x += engine.ballVel.z * dt * 0.4
            ballGroupRef.current.rotation.y += engine.ballVel.x * dt * 0.4
          }

          // 2. Sinkronisasi Contact Shadow Bola (bulat lembut & dinamis mengikuti ketinggian & cahaya)
          if (shadowMeshRef.current) {
            shadowMeshRef.current.position.set(
              engine.ballPos.x - engine.ballPos.y * 0.12,
              0.02,
              engine.ballPos.z - engine.ballPos.y * 0.18
            )
            const shadowScale = Math.max(0.35, 1.25 - engine.ballPos.y * 0.22)
            shadowMeshRef.current.scale.set(shadowScale, shadowScale, shadowScale)
            const mat = shadowMeshRef.current.material as THREE.MeshBasicMaterial
            if (mat) {
              mat.opacity = Math.max(0.12, 0.55 - engine.ballPos.y * 0.12)
            }
          }

          // 3. Sinkronisasi Reticle Prediksi Pendaratan
          if (reticleMeshRef.current) {
            reticleMeshRef.current.position.set(
              engine.predictedLanding.x,
              0.03,
              engine.predictedLanding.z
            )
            reticleMeshRef.current.visible = engine.state === "in_play"
          }

          // 4. Sinkronisasi Posisi & Animasi Lari Pemain
          // Hitung kecepatan perpindahan riil karakter (m/s)
          const playerDeltaX = Math.abs(engine.playerCurrentX - lastPlayerXRef.current)
          const playerSpeed = playerDeltaX / Math.max(dt, 0.001)
          lastPlayerXRef.current = engine.playerCurrentX

          if (playerRef.current) {
            playerRef.current.group.position.set(engine.playerCurrentX, 0, engine.playerZ)
            playerRef.current.group.rotation.y = Math.PI // Menghadap net

            // Kaki melangkah lari HANYA jika posisi karakter memang sedang bergeser nyata di lapangan (> 0.08 m/s)
            if (!swingStateRef.current.active) {
              const isPlayerMoving = playerSpeed > 0.08
              playerRef.current.setRunningAnimation(time, isPlayerMoving)
            }
          }

          // 5. Update Animasi Ayunan Lawan (Bot AI - Serve, Forehand, Backhand 60fps)
          if (engine.opponentSwingState.active) {
            const osw = engine.opponentSwingState
            osw.progress += dt / 0.35
            if (opponentRef.current) {
              opponentRef.current.setSwingAnimation(osw.progress, osw.type)
            }

            // Saat raket lawan mencapai sweet spot pukulan (progress >= 0.45)
            if (!osw.hitEvaluated && osw.progress >= 0.45) {
              osw.hitEvaluated = true
              if (engine.state === "serving_toss" && engine.score.server === "opponent") {
                engine.ballPos.set(
                  engine.opponentCurrentX - 0.35,
                  2.4,
                  engine.opponentZ + 0.35
                )
                engine.executeServe("opponent")
                triggerHitSpark(engine.ballPos, false)
              } else if (engine.state === "in_play") {
                engine.executeOpponentHit(osw.type === "forehand")
                triggerHitSpark(engine.ballPos, false)
              }
            }

            if (osw.progress >= 1) {
              osw.active = false
              osw.progress = 0
              if (opponentRef.current) opponentRef.current.resetPose()
            }
          }

          // 6. Sinkronisasi Posisi & Animasi Lari Lawan (Bot AI)
          const opponentDeltaX = Math.abs(engine.opponentCurrentX - lastOpponentXRef.current)
          const opponentSpeed = opponentDeltaX / Math.max(dt, 0.001)
          lastOpponentXRef.current = engine.opponentCurrentX

          if (opponentRef.current) {
            opponentRef.current.group.position.set(engine.opponentCurrentX, 0, engine.opponentZ)
            opponentRef.current.group.rotation.y = 0 // Menghadap player

            // HANYA jalankan animasi lari jika bot TIDAK sedang mengayun raket!
            if (!engine.opponentSwingState.active) {
              const isOpponentMoving = opponentSpeed > 0.08
              opponentRef.current.setRunningAnimation(time, isOpponentMoving)
            }
          }

          // 6. Solid Broadcast Camera Khas Wii Sports (Angle Rendah di Belakang Pemain)
          // Menatap lurus sejajar net ke arah lapangan lawan
          const targetCamX = THREE.MathUtils.clamp(engine.playerCurrentX * 0.16, -1.0, 1.0)

          // Decay camera shake/recoil dari Rocket Serve / Smash
          if (cameraRecoilRef.current > 0.001) {
            cameraRecoilRef.current *= 0.85
          } else {
            cameraRecoilRef.current = 0
          }
          const shakeY = Math.sin(time * 50) * cameraRecoilRef.current * 0.14
          const shakeX = Math.cos(time * 40) * cameraRecoilRef.current * 0.12

          camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX + shakeX, 0.06)
          camera.position.y = 4.2 + shakeY
          camera.position.z = 15.6
          camera.lookAt(targetCamX * 0.12, 1.15, -1.2)
        }
      }

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      isCancelled = true
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("pointermove", handleGlobalPointerMove)
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
      if (shadowMeshRef.current) shadowMeshRef.current.visible = false
      if (reticleMeshRef.current) reticleMeshRef.current.visible = false
      studioPedestalRef.current.visible = true
      playerRef.current.group.position.set(0, 0, 0)
      characterRotationYRef.current = 0
    } else {
      if (stadiumGroupRef.current) stadiumGroupRef.current.visible = true
      if (opponentRef.current) opponentRef.current.group.visible = true
      if (ballGroupRef.current) ballGroupRef.current.visible = true
      if (shadowMeshRef.current) shadowMeshRef.current.visible = true
      if (reticleMeshRef.current) reticleMeshRef.current.visible = true
      studioPedestalRef.current.visible = false
      if (engineRef.current) {
        playerRef.current.group.position.set(engineRef.current.playerCurrentX, 0, engineRef.current.playerZ)
      }
      characterRotationYRef.current = Math.PI
      setActiveAnim("idle")
    }
  }

  // Sinkronisasi viewMode jika diubah dari toolbar parent
  React.useEffect(() => {
    if (propViewMode) {
      handleToggleViewMode(propViewMode)
    }
  }, [propViewMode])

  // Sinkronisasi tombol Reset dari toolbar parent
  React.useEffect(() => {
    if (resetTrigger && resetTrigger > 0) {
      if (engineRef.current) engineRef.current.restartMatch()
    }
  }, [resetTrigger])

  // Touch swipe gesture tracking (Direct Canvas Mobile Motion)
  const touchStartRef = React.useRef<{ x: number; y: number; time: number } | null>(null)

  const handleSwipeAction = (dx: number, dy: number) => {
    if (!engineRef.current || viewModeRef.current !== "court") return
    const eng = engineRef.current

    if (Math.abs(dy) >= Math.abs(dx)) {
      if (dy < -20) {
        // Upward (dy < -20): toss ball if in idle_serve, or smash if in serving_toss
        if (eng.state === "idle_serve" && eng.score.server === "player") {
          eng.triggerServeToss()
        } else if (eng.state === "serving_toss" && eng.score.server === "player") {
          executeSwing("serve")
        } else {
          const isForehand = eng.ballPos.x >= eng.playerCurrentX
          executeSwing(isForehand ? "forehand" : "backhand")
        }
      } else if (dy > 20) {
        // Downward (dy > 20): smash in serving_toss or drop shot / smash in rally
        if (eng.state === "serving_toss" && eng.score.server === "player") {
          executeSwing("serve")
        } else if (eng.state === "in_play") {
          executeSwing("smash")
        } else {
          handleAction()
        }
      }
    } else {
      if (dx > 20) {
        // Rightward (dx > 20): forehand drive
        executeSwing("forehand")
      } else if (dx < -20) {
        // Leftward (dx < -20): backhand drive
        executeSwing("backhand")
      }
    }
  }

  // Pointer Handlers untuk Drag 360° di Studio Mode dan Touch Swipe / Mouse di Court Mode
  const handlePointerDown = (e: React.PointerEvent) => {
    if (viewMode === "studio") {
      isDraggingRef.current = true
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }
      try {
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      } catch {}
    } else {
      if (e.pointerType === "touch") {
        touchStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          time: performance.now(),
        }
      } else {
        // Di court mode dengan mouse, klik layar langsung memicu ayunan raket / servis
        handleAction()
      }
    }
  }

  // Lacak gerakan mouse sebagai ayunan raket fisik (Zero-Click Motion Racket)
  const lastMouseSwingTimeRef = React.useRef(0)
  const mouseMotionTrackerRef = React.useRef<{
    x: number
    y: number
    time: number
  }>({ x: 0, y: 0, time: 0 })

  const handlePointerMove = (e: React.PointerEvent) => {
    if (viewMode === "studio") {
      if (!isDraggingRef.current) return
      const deltaX = e.clientX - lastMousePosRef.current.x
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }
      characterRotationYRef.current += deltaX * 0.015
      return
    }

    // Touch swipe gesture differentiation on move
    if (e.pointerType === "touch" && touchStartRef.current) {
      const start = touchStartRef.current
      const now = performance.now()
      const dt = now - start.time
      if (dt <= 350) {
        const dx = e.clientX - start.x
        const dy = e.clientY - start.y
        const dist = Math.hypot(dx, dy)
        if (dist >= 20) {
          touchStartRef.current = null
          handleSwipeAction(dx, dy)
          return
        }
      }
      return
    }

    // COURT MODE: Deteksi gerakan kibas mouse sebagai ayunan raket fisik
    const now = performance.now()
    const tracker = mouseMotionTrackerRef.current
    if (tracker.time === 0) {
      tracker.x = e.clientX
      tracker.y = e.clientY
      tracker.time = now
      return
    }

    const dt = now - tracker.time
    if (dt < 14) return // Setidaknya 1 frame untuk delta stabil
    if (dt > 120) {
      // Mouse sempat diam/berhenti sejenak, perbarui titik acuan
      tracker.x = e.clientX
      tracker.y = e.clientY
      tracker.time = now
      return
    }

    const dx = e.clientX - tracker.x
    const dy = e.clientY - tracker.y
    const speed = Math.sqrt(dx * dx + dy * dy) / dt // px/ms

    tracker.x = e.clientX
    tracker.y = e.clientY
    tracker.time = now

    // Cooldown ayunan agar satu kibasan selesai dengan tuntas (~300ms)
    if (now - lastMouseSwingTimeRef.current < 300) return
    if (swingStateRef.current.active) return

    const eng = engineRef.current
    if (!eng) return

    // Ambang batas sentakan mouse (flick):
    // Kecepatan sentakan > 0.50 px/ms dan jarak pergeseran > 14px
    const isFlick = speed > 0.5 && (Math.abs(dx) > 14 || Math.abs(dy) > 14)

    if (isFlick) {
      // 1. Fase servis menunggu lemparan bola (idle_serve):
      // Kibas mouse ke ATAS (dy < -12) atau dorong maju -> Lempar Bola (Toss)!
      if (eng.state === "idle_serve" && eng.score.server === "player") {
        if (dy < -12 || speed > 0.8) {
          eng.triggerServeToss()
          lastMouseSwingTimeRef.current = now
        }
        return
      }

      // 2. Fase bola sedang melambung di udara (serving_toss):
      // Kibas ke BAWAH atau samping -> Overhead Smash Serve!
      if (eng.state === "serving_toss" && eng.score.server === "player") {
        executeSwing("serve")
        lastMouseSwingTimeRef.current = now
        return
      }

      // 3. Fase rally in_play atau latihan ayunan bebas:
      // Kibas ke KANAN -> Forehand Drive!
      // Kibas ke KIRI -> Backhand Drive!
      if (dx > 16) {
        executeSwing("forehand")
        lastMouseSwingTimeRef.current = now
      } else if (dx < -16) {
        executeSwing("backhand")
        lastMouseSwingTimeRef.current = now
      } else if (Math.abs(dy) > 18) {
        // Sentakan vertikal cepat: pilih otomatis forehand/backhand sesuai posisi bola
        const isForehand = eng.ballPos.x >= eng.playerCurrentX
        executeSwing(isForehand ? "forehand" : "backhand")
        lastMouseSwingTimeRef.current = now
      }
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (viewMode === "studio") {
      isDraggingRef.current = false
      try {
        ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {}
      return
    }

    if (e.pointerType === "touch" && touchStartRef.current) {
      const start = touchStartRef.current
      touchStartRef.current = null
      const now = performance.now()
      const dt = now - start.time
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      const dist = Math.hypot(dx, dy)

      if (dist >= 20 && dt <= 350) {
        handleSwipeAction(dx, dy)
      } else if (dist < 15) {
        // Fallback tap
        handleAction()
      }
    }
  }

  // Helper tampilan skor tenis (0 -> Love, 15, 30, 40, Ad)
  const formatScorePoint = (pts: number) => {
    if (pts === 0) return "00"
    if (pts === 45) return "AD"
    return String(pts)
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
          viewMode === "studio" ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
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

      {/* Studio Hint Pill (Hanya muncul di mode Studio Karakter) */}
      {viewMode === "studio" && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 bg-black/75 backdrop-blur-sm text-lime-400 font-mono text-xs rounded border border-lime-400/30 z-10 pointer-events-none shadow-lg">
          <span>🔄 Klik & geser mouse untuk memutar karakter 360°</span>
        </div>
      )}

      {/* Floating Retro Tennis Scoreboard (Top-Right Broadcast Style) */}
      {viewMode === "court" && (
        <div className="absolute top-3 right-3 bg-[#c0c0c0]/95 backdrop-blur-sm border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] p-1.5 shadow-2xl z-10 font-mono text-xs select-none min-w-[200px]">
          {/* Header Scoreboard */}
          <div className="flex items-center justify-between px-2 py-0.5 bg-[#000080] text-white font-bold text-[10px] tracking-wider mb-1">
            <span>🎾 WII SPORTS 98</span>
            {scoreState.isDeuce ? (
              <span className="text-yellow-300 font-black animate-pulse">DEUCE</span>
            ) : (
              <span className="text-slate-300 text-[9px]">BEST OF 3</span>
            )}
          </div>

          {/* Tabel Skor */}
          <div className="bg-black text-lime-400 p-2 rounded-sm border border-[#808080] space-y-1 text-xs">
            {/* Player Row */}
            <div className="flex items-center justify-between gap-3 font-bold">
              <div className="flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-full", scoreState.server === "player" ? "bg-amber-400 animate-ping" : "opacity-0")} />
                <span className="text-white text-[11px]">YOU (P1)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[10px]">G:{scoreState.playerGames}</span>
                <span className="text-amber-300 text-sm w-6 text-right font-black">
                  {formatScorePoint(scoreState.playerPoints)}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-slate-800" />

            {/* Opponent Row */}
            <div className="flex items-center justify-between gap-3 font-bold">
              <div className="flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-full", scoreState.server === "opponent" ? "bg-amber-400 animate-ping" : "opacity-0")} />
                <span className="text-slate-300 text-[11px]">CPU (BOT)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[10px]">G:{scoreState.opponentGames}</span>
                <span className="text-amber-300 text-sm w-6 text-right font-black">
                  {formatScorePoint(scoreState.opponentPoints)}
                </span>
              </div>
            </div>
          </div>

          {/* Rally Counter */}
          <div className="mt-1 px-1 flex items-center justify-between text-[10px] text-slate-700 font-bold">
            <span>RALLY: {scoreState.rallyCount} SHOTS</span>
            <span className={cn("text-[9px] uppercase", scoreState.server === "player" ? "text-blue-700" : "text-amber-700")}>
              {scoreState.server === "player" ? "SERVE: P1" : "SERVE: CPU"}
            </span>
          </div>
        </div>
      )}

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
              🏃 Shuffle Run
            </button>
            <button
              type="button"
              onClick={() => executeSwing("forehand")}
              className="px-2.5 py-1 text-xs font-bold bg-[#c0c0c0] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] text-slate-900 hover:bg-slate-200"
            >
              🏸 Forehand
            </button>
            <button
              type="button"
              onClick={() => executeSwing("backhand")}
              className="px-2.5 py-1 text-xs font-bold bg-[#c0c0c0] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] text-slate-900 hover:bg-slate-200"
            >
              🏸 Backhand
            </button>
            <button
              type="button"
              onClick={() => executeSwing("serve")}
              className="px-2.5 py-1 text-xs font-bold bg-[#c0c0c0] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] text-amber-900 hover:bg-slate-200"
            >
              ⚡ Serve / Smash
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
        viewMode === "court" && scoreState.server === "player" ? (
          engineRef.current?.state === "idle_serve" ? (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-center select-none">
              <p className="text-yellow-300 font-mono text-xs font-bold tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                🖱️ KIBAS MOUSE KE ATAS <span className="text-white font-normal">(atau Space/Klik)</span> UNTUK TOSS BOLA
              </p>
              <p className="text-white/85 font-mono text-[10px] tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] mt-0.5">
                Kibas Kanan: Forehand | Kibas Kiri: Backhand (Zero-Click Racket)
              </p>
            </div>
          ) : engineRef.current?.state === "serving_toss" ? (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-center select-none animate-bounce">
              <p className="text-yellow-300 font-mono text-sm font-extrabold tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                ⚡ KIBAS MOUSE KE BAWAH / SAMPING UNTUK SMASH!
              </p>
            </div>
          ) : null
        ) : null
      )}
    </div>
  )
})
TennisCanvas.displayName = "TennisCanvas"
