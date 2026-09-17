"use client"

import * as React from "react"
import { Ball } from "@/lib/billiard/types"
import {
  TABLE_WIDTH,
  TABLE_HEIGHT,
  CUSHION_WIDTH,
  POCKETS,
  BALL_RADIUS,
  isValidCuePlacement,
  findClosestValidCuePlacement,
} from "@/lib/billiard/physics"

interface BilliardCanvasProps {
  balls: Ball[]
  isAiming: boolean
  isBallInHand: boolean
  canShoot: boolean
  spin?: { x: number; y: number }
  onShoot: (angle: number, power: number, spin: { x: number; y: number }) => void
  onPlaceCueBall: (x: number, y: number) => void
}

export function BilliardCanvas({
  balls,
  isAiming,
  isBallInHand,
  canShoot,
  spin = { x: 0, y: 0 },
  onShoot,
  onPlaceCueBall,
}: BilliardCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const powerBarFillRef = React.useRef<HTMLDivElement | null>(null)
  const powerKnobRef = React.useRef<HTMLDivElement | null>(null)

  // Virtual dimensions (Playfield + Cushions)
  const V_WIDTH = TABLE_WIDTH + CUSHION_WIDTH * 2 // 856
  const V_HEIGHT = TABLE_HEIGHT + CUSHION_WIDTH * 2 // 456

  // ── Mutable Interaction Refs (Zero-lag, 60fps continuous rendering without React re-render stutter) ──
  const aimAngleRef = React.useRef<number>(0)
  const lockedAimAngleRef = React.useRef<number>(0)
  const targetPowerRef = React.useRef<number>(0)
  const displayPowerRef = React.useRef<number>(0) // Lerped power for smooth cue stick weight & feel
  const isDraggingStickRef = React.useRef<boolean>(false)
  const isDraggingSliderRef = React.useRef<boolean>(false)
  const isDraggingCueBallRef = React.useRef<boolean>(false)
  const dragStartCoordsRef = React.useRef<{ x: number; y: number } | null>(null)
  const tempCuePosRef = React.useRef<{ x: number; y: number } | null>(null)

  // Props ref to keep render loop in sync without restarting
  const propsRef = React.useRef({
    balls,
    isAiming,
    isBallInHand,
    canShoot,
    spin,
    onShoot,
    onPlaceCueBall,
  })
  propsRef.current = {
    balls,
    isAiming,
    isBallInHand,
    canShoot,
    spin,
    onShoot,
    onPlaceCueBall,
  }

  // Convert client mouse/touch coordinates to internal playfield coordinates
  const getPlayfieldCoords = React.useCallback(
    (clientX: number, clientY: number) => {
      if (!canvasRef.current) return { x: 0, y: 0 }
      const rect = canvasRef.current.getBoundingClientRect()
      const scaleX = V_WIDTH / rect.width
      const scaleY = V_HEIGHT / rect.height

      const canvasX = (clientX - rect.left) * scaleX
      const canvasY = (clientY - rect.top) * scaleY

      return {
        x: canvasX - CUSHION_WIDTH,
        y: canvasY - CUSHION_WIDTH,
      }
    },
    [V_WIDTH, V_HEIGHT]
  )

  // ── Left Vertical Power Slider Interaction ──
  const handleSliderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const { canShoot, isAiming, isBallInHand, balls } = propsRef.current
    if (!canShoot) return
    // Jika masih ball-in-hand, kunci posisi bola putih saat ini lalu langsung izinkan atur power
    if (isBallInHand) {
      const cueBall = balls.find((b) => b.number === 0)
      if (cueBall) {
        const valid = findClosestValidCuePlacement(cueBall.x, cueBall.y, balls)
        propsRef.current.onPlaceCueBall(valid.x, valid.y)
      }
    }
    isDraggingSliderRef.current = true
    updateSliderPower(e.clientY)
  }

  const updateSliderPower = (clientY: number) => {
    const slider = document.getElementById("billiard-vertical-power-slider")
    if (!slider) return
    const rect = slider.getBoundingClientRect()
    const relativeY = clientY - rect.top
    // Sensitivity tuning: smooth clamping
    const rawPower = Math.min(1.0, Math.max(0.0, relativeY / rect.height))
    targetPowerRef.current = rawPower
  }

  // ── Global Pointer Handlers for Power Slider & Stick Dragging ──
  React.useEffect(() => {
    const onWindowPointerMove = (e: PointerEvent) => {
      if (isDraggingSliderRef.current) {
        updateSliderPower(e.clientY)
      } else if (isDraggingStickRef.current && dragStartCoordsRef.current) {
        // Tarik stik ke belakang: Proyeksikan gerakan mouse HANYA sepanjang sumbu berlawanan stik
        const coords = getPlayfieldCoords(e.clientX, e.clientY)
        const dx = coords.x - dragStartCoordsRef.current.x
        const dy = coords.y - dragStartCoordsRef.current.y

        // Sudut stik tetap TERKUNCI (tidak melenceng saat ditarik)
        const lockedAngle = lockedAimAngleRef.current
        const cueBackX = -Math.cos(lockedAngle)
        const cueBackY = -Math.sin(lockedAngle)

        // Dot product: seberapa jauh mouse ditarik ke belakang sumbu stik
        const projectedPull = dx * cueBackX + dy * cueBackY

        // Sensitivity realistis: maxPull 220px (tidak terlalu liar/sensitif)
        const maxPullDistance = 220
        const normalizedPower = Math.min(1.0, Math.max(0.0, projectedPull / maxPullDistance))
        targetPowerRef.current = normalizedPower
      } else if (isDraggingCueBallRef.current) {
        const coords = getPlayfieldCoords(e.clientX, e.clientY)
        tempCuePosRef.current = findClosestValidCuePlacement(
          coords.x,
          coords.y,
          propsRef.current.balls
        )
      }
    }

    const onWindowPointerUp = () => {
      if (isDraggingSliderRef.current || isDraggingStickRef.current) {
        const finalPower = targetPowerRef.current
        const finalAngle = lockedAimAngleRef.current || aimAngleRef.current

        isDraggingSliderRef.current = false
        isDraggingStickRef.current = false
        dragStartCoordsRef.current = null
        targetPowerRef.current = 0

        // Lepaskan tembakan jika power cukup (> 4%)
        if (finalPower > 0.04 && propsRef.current.canShoot && propsRef.current.isAiming) {
          propsRef.current.onShoot(
            finalAngle,
            finalPower,
            propsRef.current.spin || { x: 0, y: 0 }
          )
        }
      }

      if (isDraggingCueBallRef.current) {
        isDraggingCueBallRef.current = false
        if (tempCuePosRef.current) {
          const finalPos = findClosestValidCuePlacement(
            tempCuePosRef.current.x,
            tempCuePosRef.current.y,
            propsRef.current.balls
          )
          propsRef.current.onPlaceCueBall(finalPos.x, finalPos.y)
          tempCuePosRef.current = null
        }
      }
    }

    window.addEventListener("pointermove", onWindowPointerMove)
    window.addEventListener("pointerup", onWindowPointerUp)
    return () => {
      window.removeEventListener("pointermove", onWindowPointerMove)
      window.removeEventListener("pointerup", onWindowPointerUp)
    }
  }, [getPlayfieldCoords])

  // ── Canvas Pointer Down (Mulai Bidik / Tarik Stik / Pindahkan Bola Putih) ──
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { canShoot, isAiming, isBallInHand, balls } = propsRef.current
    if (!canShoot) return

    const cueBall = balls.find((b) => b.number === 0)
    if (!cueBall) return

    const coords = getPlayfieldCoords(e.clientX, e.clientY)

    if (isBallInHand) {
      // Izinkan klik di mana saja di meja untuk memindahkan bola putih ke titik valid terdekat
      const valid = findClosestValidCuePlacement(coords.x, coords.y, balls)
      isDraggingCueBallRef.current = true
      tempCuePosRef.current = valid
      return
    }

    if (isAiming) {
      const dx = coords.x - cueBall.x
      const dy = coords.y - cueBall.y

      // Kunci sudut bidikan saat mulai tarik stik
      lockedAimAngleRef.current = Math.atan2(dy, dx)
      aimAngleRef.current = lockedAimAngleRef.current

      isDraggingStickRef.current = true
      dragStartCoordsRef.current = { x: coords.x, y: coords.y }
      targetPowerRef.current = 0
    }
  }

  // ── Canvas Pointer Move (Arahkan Bidikan secara Halus) ──
  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { canShoot, isAiming, isBallInHand, balls } = propsRef.current
    if (!canShoot) return

    // Jika sedang dalam ball-in-hand dan sedang tidak drag, abaikan
    if (isBallInHand && !isDraggingCueBallRef.current) return
    if (!isAiming) return

    // Jika sedang tidak menarik stik (hanya mengarahkan mouse): update sudut bidik
    if (!isDraggingStickRef.current && !isDraggingSliderRef.current) {
      const cueBall = balls.find((b) => b.number === 0)
      if (!cueBall) return

      const coords = getPlayfieldCoords(e.clientX, e.clientY)
      const dx = coords.x - cueBall.x
      const dy = coords.y - cueBall.y
      aimAngleRef.current = Math.atan2(dy, dx)
      lockedAimAngleRef.current = aimAngleRef.current
    }
  }

  // ── High Performance 60FPS Render Loop ──
  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number

    const render = () => {
      const { balls, isAiming, canShoot, isBallInHand } = propsRef.current
      const cueBall = balls.find((b) => b.number === 0)

      // Smooth Easing (Lerp) untuk pergerakan stik agar terasa berbobot & mantap
      const lerpSpeed = 0.22
      displayPowerRef.current += (targetPowerRef.current - displayPowerRef.current) * lerpSpeed
      const power = displayPowerRef.current
      const aimAngle = isDraggingStickRef.current
        ? lockedAimAngleRef.current
        : aimAngleRef.current

      // Update elemen UI Power Bar via DOM langsung (tanpa re-render React)
      if (powerBarFillRef.current) {
        powerBarFillRef.current.style.height = `${power * 100}%`
      }
      if (powerKnobRef.current) {
        powerKnobRef.current.style.transform = `translateY(${power * 90}px)`
      }

      ctx.clearRect(0, 0, V_WIDTH, V_HEIGHT)

      // 1. Meja Biliar Kayu Mewah (Outer Rails dengan bevel & bayangan 3D)
      const woodGrad = ctx.createLinearGradient(0, 0, V_WIDTH, V_HEIGHT)
      woodGrad.addColorStop(0, "#5a2d12")
      woodGrad.addColorStop(0.3, "#7a3e19")
      woodGrad.addColorStop(0.7, "#5a2d12")
      woodGrad.addColorStop(1, "#3c1b09")
      ctx.fillStyle = woodGrad
      ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT)

      // Bevel luar rel kayu
      ctx.strokeStyle = "rgba(255, 215, 0, 0.25)"
      ctx.lineWidth = 1.5
      ctx.strokeRect(3, 3, V_WIDTH - 6, V_HEIGHT - 6)
      ctx.strokeStyle = "#240f04"
      ctx.lineWidth = 3
      ctx.strokeRect(1, 1, V_WIDTH - 2, V_HEIGHT - 2)

      // 8 Ball Pool Authentic Mandala / Circular Sights di Rel Kayu
      const drawSight = (x: number, y: number) => {
        // Outer Gold Ring
        ctx.fillStyle = "#D4AF37"
        ctx.beginPath()
        ctx.arc(x, y, 4.5, 0, Math.PI * 2)
        ctx.fill()
        // Inner Maroon Ring
        ctx.fillStyle = "#8B1E1E"
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.fill()
        // Center Gold Dot
        ctx.fillStyle = "#FFDF73"
        ctx.beginPath()
        ctx.arc(x, y, 1.2, 0, Math.PI * 2)
        ctx.fill()
      }

      for (let i = 1; i <= 7; i++) {
        const xPos = CUSHION_WIDTH + (TABLE_WIDTH / 8) * i
        if (i !== 4) {
          drawSight(xPos, CUSHION_WIDTH / 2)
          drawSight(xPos, V_HEIGHT - CUSHION_WIDTH / 2)
        }
      }
      for (let i = 1; i <= 3; i++) {
        const yPos = CUSHION_WIDTH + (TABLE_HEIGHT / 4) * i
        drawSight(CUSHION_WIDTH / 2, yPos)
        drawSight(V_WIDTH - CUSHION_WIDTH / 2, yPos)
      }

      // 2. Bantalan Karet 3D (Cushion)
      ctx.fillStyle = "#074826"
      ctx.fillRect(
        CUSHION_WIDTH - 5,
        CUSHION_WIDTH - 5,
        TABLE_WIDTH + 10,
        TABLE_HEIGHT + 10
      )
      // Highlight tepi cushion
      ctx.strokeStyle = "#0d6b38"
      ctx.lineWidth = 2
      ctx.strokeRect(
        CUSHION_WIDTH - 1,
        CUSHION_WIDTH - 1,
        TABLE_WIDTH + 2,
        TABLE_HEIGHT + 2
      )

      // 3. Kain Laken Hijau Emerald (Green Felt dengan Spotlight Radial Glow)
      const feltGrad = ctx.createRadialGradient(
        V_WIDTH / 2,
        V_HEIGHT / 2,
        40,
        V_WIDTH / 2,
        V_HEIGHT / 2,
        420
      )
      feltGrad.addColorStop(0, "#0e8749")
      feltGrad.addColorStop(0.65, "#0a703c")
      feltGrad.addColorStop(1, "#064b27")
      ctx.fillStyle = feltGrad
      ctx.fillRect(CUSHION_WIDTH, CUSHION_WIDTH, TABLE_WIDTH, TABLE_HEIGHT)

      // Garis Headstring tipis putih (Baulk Line)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)"
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(CUSHION_WIDTH + TABLE_WIDTH * 0.25, CUSHION_WIDTH)
      ctx.lineTo(CUSHION_WIDTH + TABLE_WIDTH * 0.25, CUSHION_WIDTH + TABLE_HEIGHT)
      ctx.stroke()

      // Titik Head Spot & Foot Spot
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)"
      ctx.beginPath()
      ctx.arc(CUSHION_WIDTH + TABLE_WIDTH * 0.25, CUSHION_WIDTH + TABLE_HEIGHT * 0.5, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(CUSHION_WIDTH + TABLE_WIDTH * 0.72, CUSHION_WIDTH + TABLE_HEIGHT * 0.5, 3, 0, Math.PI * 2)
      ctx.fill()

      // 4. Kantong Meja (Pockets) dengan Plat Kuningan Bersekrup & Lubang Dalam
      for (const p of POCKETS) {
        const px = p.x + CUSHION_WIDTH
        const py = p.y + CUSHION_WIDTH

        // Plat Kuningan (Brass Pocket Plate Rim)
        const brassGrad = ctx.createRadialGradient(px, py, p.radius * 0.7, px, py, p.radius + 6)
        brassGrad.addColorStop(0, "#B8860B")
        brassGrad.addColorStop(0.5, "#D4AF37")
        brassGrad.addColorStop(1, "#8B6508")
        ctx.fillStyle = brassGrad
        ctx.beginPath()
        ctx.arc(px, py, p.radius + 5.5, 0, Math.PI * 2)
        ctx.fill()

        // Baut / Sekrup Kuningan pada Plat
        ctx.fillStyle = "#5c4004"
        const rivetAngles = [0.25, 0.75, 1.25, 1.75]
        rivetAngles.forEach((a) => {
          const rx = px + Math.cos(a * Math.PI) * (p.radius + 3.2)
          const ry = py + Math.sin(a * Math.PI) * (p.radius + 3.2)
          ctx.beginPath()
          ctx.arc(rx, ry, 1, 0, Math.PI * 2)
          ctx.fill()
        })

        // Drop shadow dalam lubang
        const pocketHoleGrad = ctx.createRadialGradient(px, py, 2, px, py, p.radius)
        pocketHoleGrad.addColorStop(0, "#000000")
        pocketHoleGrad.addColorStop(0.75, "#050505")
        pocketHoleGrad.addColorStop(1, "#181818")
        ctx.fillStyle = pocketHoleGrad
        ctx.beginPath()
        ctx.arc(px, py, p.radius, 0, Math.PI * 2)
        ctx.fill()
      }

      // 5. Miniclip-style Aim Guideline & Ghost Ball (Saat Aiming)
      if (isAiming && canShoot && cueBall && !isBallInHand) {
        const cx = cueBall.x + CUSHION_WIDTH
        const cy = cueBall.y + CUSHION_WIDTH
        const dirX = Math.cos(aimAngle)
        const dirY = Math.sin(aimAngle)

        // Raycasting deteksi bola sasaran pertama yang terkena
        let closestHitDist = 2000
        let targetHitBall: Ball | null = null

        for (const b of balls) {
          if (b.number === 0 || b.isPocketed) continue
          const bx = b.x + CUSHION_WIDTH
          const by = b.y + CUSHION_WIDTH

          const vx = bx - cx
          const vy = by - cy
          const tClosest = vx * dirX + vy * dirY

          if (tClosest > 0) {
            const dSq = vx * vx + vy * vy - tClosest * tClosest
            const rEff = BALL_RADIUS * 2
            if (dSq < rEff * rEff) {
              const tHit = tClosest - Math.sqrt(rEff * rEff - dSq)
              if (tHit > 0 && tHit < closestHitDist) {
                closestHitDist = tHit
                targetHitBall = b
              }
            }
          }
        }

        // Jika tidak menabrak bola, cari tabrakan dinding cushion
        if (!targetHitBall) {
          let tWall = 1000
          if (dirX > 0) tWall = Math.min(tWall, (TABLE_WIDTH + CUSHION_WIDTH - BALL_RADIUS - cx) / dirX)
          if (dirX < 0) tWall = Math.min(tWall, (CUSHION_WIDTH + BALL_RADIUS - cx) / dirX)
          if (dirY > 0) tWall = Math.min(tWall, (TABLE_HEIGHT + CUSHION_WIDTH - BALL_RADIUS - cy) / dirY)
          if (dirY < 0) tWall = Math.min(tWall, (CUSHION_WIDTH + BALL_RADIUS - cy) / dirY)
          closestHitDist = Math.max(0, tWall)
        }

        const ghostX = cx + dirX * closestHitDist
        const ghostY = cy + dirY * closestHitDist

        // Garis putih utama dari bola putih ke ghost ball
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)"
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(ghostX, ghostY)
        ctx.stroke()

        // Jika menabrak bola sasaran: Gambar Ghost Ball Circle & Garis Trayektori
        if (targetHitBall) {
          const tbx = targetHitBall.x + CUSHION_WIDTH
          const tby = targetHitBall.y + CUSHION_WIDTH

          // Lingkaran Ghost Ball (Miniclip white ring indicator)
          ctx.strokeStyle = "rgba(255, 255, 255, 0.9)"
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(ghostX, ghostY, BALL_RADIUS, 0, Math.PI * 2)
          ctx.stroke()

          ctx.fillStyle = "rgba(255, 255, 255, 0.15)"
          ctx.beginPath()
          ctx.arc(ghostX, ghostY, BALL_RADIUS, 0, Math.PI * 2)
          ctx.fill()

          // Garis arah bola sasaran (Normal Vector)
          const normDx = tbx - ghostX
          const normDy = tby - ghostY
          const normLen = Math.hypot(normDx, normDy) || 1
          const normX = normDx / normLen
          const normY = normDy / normLen

          const targetLineLen = 65
          ctx.strokeStyle = "rgba(255, 255, 255, 0.85)"
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(tbx, tby)
          ctx.lineTo(tbx + normX * targetLineLen, tby + normY * targetLineLen)
          ctx.stroke()

          // Garis defleksi bola putih (Tangent Vector)
          const dot = dirX * normX + dirY * normY
          const deflX = dirX - dot * normX
          const deflY = dirY - dot * normY
          const deflLen = Math.hypot(deflX, deflY) || 1
          const deflLineLen = 40

          ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"
          ctx.lineWidth = 1.5
          ctx.setLineDash([3, 3])
          ctx.beginPath()
          ctx.moveTo(ghostX, ghostY)
          ctx.lineTo(ghostX + (deflX / deflLen) * deflLineLen, ghostY + (deflY / deflLen) * deflLineLen)
          ctx.stroke()
          ctx.setLineDash([])
        }

        // Render Stik Biliar di belakang bola putih dengan tarikan mundur halus
        const pullBackOffset = 18 + power * 75
        const cueTipX = cx - Math.cos(aimAngle) * pullBackOffset
        const cueTipY = cy - Math.sin(aimAngle) * pullBackOffset
        const cueLength = 260

        ctx.save()
        ctx.translate(cueTipX, cueTipY)
        ctx.rotate(aimAngle + Math.PI)

        // Ujung stik (Tip biru kapur)
        ctx.fillStyle = "#1E88E5"
        ctx.fillRect(0, -1.8, 4, 3.6)

        // Ferrule putih
        ctx.fillStyle = "#F5F5F0"
        ctx.fillRect(4, -2, 8, 4)

        // Shaft kayu maple
        const shaftGrad = ctx.createLinearGradient(12, 0, 160, 0)
        shaftGrad.addColorStop(0, "#F2DBB6")
        shaftGrad.addColorStop(1, "#D6B27D")
        ctx.fillStyle = shaftGrad
        ctx.beginPath()
        ctx.moveTo(12, -2.2)
        ctx.lineTo(160, -3.2)
        ctx.lineTo(160, 3.2)
        ctx.lineTo(12, 2.2)
        ctx.closePath()
        ctx.fill()

        // Handle kayu gelap
        const handleGrad = ctx.createLinearGradient(160, 0, cueLength, 0)
        handleGrad.addColorStop(0, "#3E2723")
        handleGrad.addColorStop(0.5, "#5D4037")
        handleGrad.addColorStop(1, "#211410")
        ctx.fillStyle = handleGrad
        ctx.beginPath()
        ctx.moveTo(160, -3.2)
        ctx.lineTo(cueLength, -4.5)
        ctx.lineTo(cueLength, 4.5)
        ctx.lineTo(160, 3.2)
        ctx.closePath()
        ctx.fill()

        // Bumper karet
        ctx.fillStyle = "#111111"
        ctx.fillRect(cueLength, -4.5, 6, 9)

        ctx.restore()
      }

      // 6. Gambar Bola-Bola Biliar dengan ROTASI 3D REALISTIS & ANIMASI MASUK LUBANG MULUS
      for (const b of balls) {
        const isDropping = b.pocketAnimationProgress !== undefined && b.pocketAnimationProgress < 1.0
        if (b.isPocketed && !isDropping) continue

        const isHoldingCue = isDraggingCueBallRef.current && tempCuePosRef.current && b.number === 0
        const bx = isHoldingCue
          ? tempCuePosRef.current!.x + CUSHION_WIDTH
          : b.x + CUSHION_WIDTH
        const by = isHoldingCue
          ? tempCuePosRef.current!.y + CUSHION_WIDTH
          : b.y + CUSHION_WIDTH

        ctx.save()

        const progress = b.pocketAnimationProgress || 0
        if (isDropping) {
          // Efek jatuh 3D: bola mengecil ke dasar lubang dan opacity meredup
          const dropScale = Math.max(0.1, 1 - Math.pow(progress, 1.25) * 0.78)
          const dropAlpha = Math.max(0, 1 - Math.pow(progress, 2.2) * 0.95)
          ctx.translate(bx, by)
          ctx.scale(dropScale, dropScale)
          ctx.translate(-bx, -by)
          ctx.globalAlpha = dropAlpha
        }

        // Drop shadow bola
        if (!isDropping) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.35)"
          ctx.beginPath()
          ctx.arc(bx + 2, by + 3, b.radius, 0, Math.PI * 2)
          ctx.fill()
        }

        const px = b.poleX ?? 0
        const py = b.poleY ?? 0
        const pz = b.poleZ ?? 1

        // ── Helper: Gambar Badge Nomor dengan Distorsi Perspektif Bola 3D Sejati (Dual Poles) ──
        const drawBadge = (poleSign: 1 | -1, text: string, textScale: number) => {
          const signPx = px * poleSign
          const signPy = py * poleSign
          const signPz = pz * poleSign

          // Hanya render jika menghadap kamera (belahan depan)
          if (signPz <= -0.15) return

          // Posisi proyeksi titik pada permukaan bola 3D
          const posX = bx + signPx * (b.radius * 0.72)
          const posY = by + signPy * (b.radius * 0.72)

          ctx.save()
          // Clip ke batas bola agar badge tidak tembus keluar lingkaran
          ctx.beginPath()
          ctx.arc(bx, by, b.radius - 0.4, 0, Math.PI * 2)
          ctx.clip()

          ctx.translate(posX, posY)
          const phi = Math.atan2(signPy, signPx)
          ctx.rotate(phi)

          // Distorsi Perspektif Sferis 3D:
          // Sumbu radial memipih sebanding cos(kemiringan) = signPz
          // Sumbu tangensial tetap lebar penuh
          const squash = Math.max(0.12, signPz)
          ctx.scale(squash, 1)

          // Lingkaran badge putih (terdistorsi jadi elips 3D alami)
          const badgeR = b.radius * 0.45
          ctx.fillStyle = "#FFFFFF"
          ctx.beginPath()
          ctx.arc(0, 0, badgeR, 0, Math.PI * 2)
          ctx.fill()

          // Teks angka di dalam ruang 3D
          if (signPz > 0.12) {
            ctx.fillStyle = "#000000"
            ctx.font = `bold ${Math.round(badgeR * textScale)}px sans-serif`
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            ctx.rotate(-phi)
            ctx.fillText(text, 0, 0.6)
          }

          ctx.restore()
        }

        // ── Render Bola berdasarkan Tipe ──
        if (b.type === "cue") {
          // BOLA PUTIH (Aramith Pro Cup 3D dengan 6 Titik Merah Ortogonal)
          const cueGrad = ctx.createRadialGradient(
            bx - b.radius * 0.3,
            by - b.radius * 0.3,
            1,
            bx,
            by,
            b.radius
          )
          cueGrad.addColorStop(0, "#FFFFFF")
          cueGrad.addColorStop(0.65, "#F0F0F0")
          cueGrad.addColorStop(1, "#C8C8C8")
          ctx.fillStyle = cueGrad
          ctx.beginPath()
          ctx.arc(bx, by, b.radius, 0, Math.PI * 2)
          ctx.fill()

          // Hitung 3 vektor ortogonal (u, v, w) untuk 6 titik putar
          const lenHyp = Math.hypot(px, py) || 1
          const ux = -py / lenHyp
          const uy = px / lenHyp
          const uz = 0
          const vx = py * uz - pz * uy
          const vy = pz * ux - px * uz
          const vz = px * uy - py * ux

          const dots = [
            { x: px, y: py, z: pz },
            { x: -px, y: -py, z: -pz },
            { x: ux, y: uy, z: uz },
            { x: -ux, y: -uy, z: -uz },
            { x: vx, y: vy, z: vz },
            { x: -vx, y: -vy, z: -vz },
          ]

          dots.forEach((d) => {
            if (d.z > 0.05) {
              const dotX = bx + d.x * (b.radius * 0.72)
              const dotY = by + d.y * (b.radius * 0.72)
              const dotR = 1.6 * Math.max(0.35, d.z)
              ctx.fillStyle = "#D32F2F"
              ctx.beginPath()
              ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2)
              ctx.fill()
            }
          })
        } else if (b.type === "eight") {
          // BOLA 8 HITAM (Gradasi Obsidian 3D)
          const eightGrad = ctx.createRadialGradient(
            bx - b.radius * 0.3,
            by - b.radius * 0.3,
            1,
            bx,
            by,
            b.radius
          )
          eightGrad.addColorStop(0, "#444444")
          eightGrad.addColorStop(0.55, "#1A1A1A")
          eightGrad.addColorStop(1, "#050505")
          ctx.fillStyle = eightGrad
          ctx.beginPath()
          ctx.arc(bx, by, b.radius, 0, Math.PI * 2)
          ctx.fill()

          // Render Badge di kedua kutub (+1 dan -1)
          drawBadge(1, "8", 1.2)
          drawBadge(-1, "8", 1.2)
        } else if (b.type === "solid") {
          // BOLA SOLID (Gradasi Warna Akrilik 3D Penuh)
          const solidGrad = ctx.createRadialGradient(
            bx - b.radius * 0.3,
            by - b.radius * 0.3,
            1,
            bx,
            by,
            b.radius
          )
          solidGrad.addColorStop(0, "#FFFFFF")
          solidGrad.addColorStop(0.22, b.color)
          solidGrad.addColorStop(0.85, b.color)
          solidGrad.addColorStop(1, "#0A0A0A")
          ctx.fillStyle = solidGrad
          ctx.beginPath()
          ctx.arc(bx, by, b.radius, 0, Math.PI * 2)
          ctx.fill()

          // Render Badge di kedua kutub (+1 dan -1)
          drawBadge(1, String(b.number), 1.15)
          drawBadge(-1, String(b.number), 1.15)
        } else if (b.type === "stripe") {
          // BOLA STRIPE (Dasar Putih + Sabuk Warna Melengkung 3D)
          const baseGrad = ctx.createRadialGradient(
            bx - b.radius * 0.3,
            by - b.radius * 0.3,
            1,
            bx,
            by,
            b.radius
          )
          baseGrad.addColorStop(0, "#FFFFFF")
          baseGrad.addColorStop(0.7, "#EAEAEA")
          baseGrad.addColorStop(1, "#B0B0B0")
          ctx.fillStyle = baseGrad
          ctx.beginPath()
          ctx.arc(bx, by, b.radius, 0, Math.PI * 2)
          ctx.fill()

          // Pita Warna Melingkari Ekuator Bola 3D
          ctx.save()
          ctx.beginPath()
          ctx.arc(bx, by, b.radius, 0, Math.PI * 2)
          ctx.clip()

          const stripeAngle = Math.atan2(py, px) + Math.PI / 2
          ctx.translate(bx, by)
          ctx.rotate(stripeAngle)

          const bandThickness = b.radius * 1.05
          ctx.fillStyle = b.stripeColor || "#FF5722"
          if (Math.abs(pz) < 0.28) {
            // Pandangan samping: pita tebal lurus
            ctx.fillRect(-b.radius * 1.2, -bandThickness / 2, b.radius * 2.4, bandThickness)
          } else {
            // Pandangan miring/atas: pita melengkung elips 3D
            ctx.beginPath()
            ctx.ellipse(0, 0, b.radius * 1.2, (bandThickness / 2) * (1 + Math.abs(pz) * 0.5), 0, 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.restore()

          // Render Badge di kedua kutub (+1 dan -1)
          drawBadge(1, String(b.number), 1.1)
          drawBadge(-1, String(b.number), 1.1)
        }

        // Specular highlight tetap di pojok kiri atas
        const shineGrad = ctx.createRadialGradient(
          bx - b.radius * 0.35,
          by - b.radius * 0.35,
          0.5,
          bx - b.radius * 0.35,
          by - b.radius * 0.35,
          b.radius * 0.45
        )
        shineGrad.addColorStop(0, "rgba(255, 255, 255, 0.7)")
        shineGrad.addColorStop(1, "rgba(255, 255, 255, 0)")
        ctx.fillStyle = shineGrad
        ctx.beginPath()
        ctx.arc(bx - b.radius * 0.35, by - b.radius * 0.35, b.radius * 0.45, 0, Math.PI * 2)
        ctx.fill()

        // Jika sedang jatuh ke dalam lubang: tambahkan bayangan gelap lubang di atas bola
        if (isDropping) {
          ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.85, progress * 0.9)})`
          ctx.beginPath()
          ctx.arc(bx, by, b.radius + 1, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.restore()
      }

      // 7. Ball-in-Hand Glow Halo
      if (isBallInHand && cueBall) {
        const placePos = tempCuePosRef.current || { x: cueBall.x, y: cueBall.y }
        const isValid = isValidCuePlacement(placePos.x, placePos.y, balls)
        const haloColor = isValid ? "rgba(0, 255, 255, 0.4)" : "rgba(255, 0, 0, 0.5)"
        const borderColor = isValid ? "#00FFFF" : "#FF0000"

        ctx.fillStyle = haloColor
        ctx.beginPath()
        ctx.arc(
          placePos.x + CUSHION_WIDTH,
          placePos.y + CUSHION_WIDTH,
          BALL_RADIUS * 2.2,
          0,
          Math.PI * 2
        )
        ctx.fill()

        ctx.strokeStyle = borderColor
        ctx.lineWidth = 2
        ctx.setLineDash([4, 3])
        ctx.stroke()
        ctx.setLineDash([])
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [V_WIDTH, V_HEIGHT])

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[856/456] max-w-[856px] mx-auto bg-black select-none touch-none cursor-crosshair shadow-2xl flex items-center"
    >
      {/* ── Vertical Cue Stick & Power Meter (Authentic 8 Ball Pool di Sisi Kiri) ── */}
      {propsRef.current.canShoot && (propsRef.current.isAiming || propsRef.current.isBallInHand) && (
        <div
          id="billiard-vertical-power-slider"
          onPointerDown={handleSliderPointerDown}
          className="absolute left-1.5 top-3 bottom-3 w-8 flex items-center justify-between z-20 cursor-ns-resize select-none"
          title="Tarik stik ke bawah untuk mengatur kekuatan pukulan"
        >
          {/* Calibrated Power Track Meter */}
          <div className="w-2.5 h-full bg-black/80 border border-[#444] rounded-full overflow-hidden flex flex-col justify-end relative shadow-[0_0_8px_rgba(0,0,0,0.8)]">
            <div
              ref={powerBarFillRef}
              className="w-full transition-none rounded-b-full shadow-[0_0_10px_#4CAF50]"
              style={{
                height: "0%",
                background: "linear-gradient(to top, #00E676, #FFEA00, #FF3D00)",
              }}
            />
            {/* Tick lines */}
            <div className="absolute inset-0 flex flex-col justify-between py-1 pointer-events-none opacity-40">
              {[...Array(9)].map((_, idx) => (
                <div key={idx} className="w-full h-[1px] bg-white/70" />
              ))}
            </div>
          </div>

          {/* Authentic Standing Cue Stick */}
          <div
            ref={powerKnobRef}
            className="w-4 h-full flex flex-col items-center relative transition-none filter drop-shadow-[2px_4px_4px_rgba(0,0,0,0.8)]"
          >
            {/* Blue chalk tip */}
            <div className="w-1.5 h-1 bg-[#1976D2] rounded-t-sm" />
            {/* White ferrule */}
            <div className="w-1.5 h-1.5 bg-[#F5F5F0] border-b border-gray-400" />
            {/* Maple shaft (tapered) */}
            <div
              className="w-1.5 flex-1"
              style={{
                background: "linear-gradient(to right, #F5DEB3, #E8C999, #D2B48C)",
              }}
            />
            {/* Middle Joint Ring */}
            <div className="w-2 h-1 bg-[#FFD700] shadow" />
            {/* Butt Wrap (Black / Textured Grip) */}
            <div
              className="w-2.5 h-16"
              style={{
                background: "repeating-linear-gradient(45deg, #1A1A1A, #1A1A1A 2px, #333 2px, #333 4px)",
              }}
            />
            {/* Gold Accent Ring */}
            <div className="w-2.5 h-1 bg-[#FFD700]" />
            {/* Dark Wood Butt Cap */}
            <div className="w-2.5 h-6 bg-[#2B1704] rounded-b-sm border-t border-black/40" />
            {/* Rubber Bumper */}
            <div className="w-2 h-1 bg-black rounded-b" />
          </div>
        </div>
      )}

      {/* Main Game Canvas */}
      <canvas
        ref={canvasRef}
        width={V_WIDTH}
        height={V_HEIGHT}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        className="w-full h-full block"
      />
    </div>
  )
}
