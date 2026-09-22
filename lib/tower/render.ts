import { FLOOR_HEIGHT, FLOOR_WIDTH } from "./physics"
import type { TowerGame, FloorResident } from "./physics"

function drawReleasedBalloons(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const balloonColors = ["#ef4444", "#f59e0b", "#3b82f6"]
  const offsets = [
    { dx: -4, dy: -16, r: 3 },
    { dx: 3, dy: -20, r: 3.5 },
    { dx: 8, dy: -15, r: 3 },
  ]
  const px = Math.round(x)
  const py = Math.round(y)
  const sway = Math.sin(time * 6) * 2
  for (let i = 0; i < offsets.length; i++) {
    const b = offsets[i]
    const bx = px + b.dx + sway
    const by = py + b.dy
    ctx.fillStyle = balloonColors[i % balloonColors.length]
    ctx.beginPath()
    ctx.arc(bx, by, b.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(bx - 1, by - 1.5, 1, 1)
  }
}

function drawPixelPerson(
  ctx: CanvasRenderingContext2D,
  resident: FloorResident,
  x: number,
  y: number,
  pose: "walk_left" | "walk_right" | "parachute" | "balloon" | "jetpack_left" | "jetpack_right" | "skate_left" | "skate_right" | "cheer" | "window",
  time: number
) {
  const px = Math.round(x)
  const py = Math.round(y)

  // 1. Parachute canopy
  if (pose === "parachute") {
    const chuteW = 20
    const cx = px - chuteW / 2 + 3
    const cy = py - 15
    const chuteColor = resident.chuteColor || "#ef4444"

    ctx.fillStyle = chuteColor
    ctx.fillRect(cx + 3, cy, chuteW - 6, 2)
    ctx.fillRect(cx + 1, cy + 2, chuteW - 2, 4)
    ctx.fillRect(cx, cy + 4, chuteW, 3)

    ctx.fillStyle = "#ffffff"
    ctx.fillRect(cx + 5, cy, 3, 6)
    ctx.fillRect(cx + 12, cy, 3, 6)

    ctx.strokeStyle = "rgba(40, 40, 40, 0.75)"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cx + 2, cy + 7)
    ctx.lineTo(px + 1, py + 2)
    ctx.moveTo(cx + chuteW - 2, cy + 7)
    ctx.lineTo(px + 5, py + 2)
    ctx.stroke()
  }

  // 2. Balloons held in hand
  if (pose === "balloon") {
    const balloonColors = ["#ef4444", "#f59e0b", "#3b82f6"]
    const offsets = [
      { dx: -4, dy: -18, r: 3 },
      { dx: 3, dy: -21, r: 3.5 },
      { dx: 9, dy: -17, r: 3 },
    ]
    ctx.strokeStyle = "rgba(50, 50, 50, 0.7)"
    ctx.lineWidth = 0.8
    ctx.beginPath()
    for (const b of offsets) {
      ctx.moveTo(px + 3 + b.dx, py + b.dy + b.r)
      ctx.lineTo(px + 3, py + 1)
    }
    ctx.stroke()
    for (let i = 0; i < offsets.length; i++) {
      const b = offsets[i]
      const bx = px + 3 + b.dx
      const by = py + b.dy
      ctx.fillStyle = balloonColors[i % balloonColors.length]
      ctx.beginPath()
      ctx.arc(bx, by, b.r, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(bx - 1, by - 1.5, 1, 1)
    }
  }

  // 3. Jetpack rocket tank & thruster
  if (pose === "jetpack_left" || pose === "jetpack_right") {
    const isLeft = pose === "jetpack_left"
    const tankX = isLeft ? px - 4 : px + 6
    const tankY = py + 3
    ctx.fillStyle = "#475569"
    ctx.fillRect(tankX, tankY, 4, 7)
    ctx.fillStyle = "#94a3b8"
    ctx.fillRect(tankX + 1, tankY + 1, 2, 5)
    ctx.fillStyle = "#1e293b"
    ctx.fillRect(tankX + 1, tankY + 7, 2, 2)

    const flameColors = ["#f97316", "#fde047", "#ffffff"]
    const flameLen = 4 + (Math.floor(time * 24) % 4)
    ctx.fillStyle = flameColors[Math.floor(time * 16) % flameColors.length]
    const flameX = isLeft ? tankX - 1 : tankX + 3
    ctx.fillRect(flameX, tankY + 8, 2, flameLen)
    ctx.fillStyle = "#cbd5e1"
    ctx.fillRect(isLeft ? tankX - 4 : tankX + 5, tankY + 8 + (Math.floor(time * 12) % 3), 2, 2)
  }

  // 4. Skateboard deck & wheels
  if (pose === "skate_left" || pose === "skate_right") {
    const deckX = px - 4
    const deckY = py + 11
    ctx.fillStyle = resident.accessoryColor || "#ec4899"
    ctx.fillRect(deckX, deckY, 14, 2)
    ctx.fillStyle = "#1e293b"
    ctx.fillRect(deckX + 1, deckY + 2, 2, 2)
    ctx.fillRect(deckX + 11, deckY + 2, 2, 2)
    // Backwards cap visor
    ctx.fillStyle = resident.accessoryColor || "#ec4899"
    const isLeft = pose === "skate_left"
    ctx.fillRect(isLeft ? px + 6 : px - 2, py - 1, 2, 1)
  }

  // Head
  ctx.fillStyle = resident.skinColor
  ctx.fillRect(px, py, 6, 5)
  // Hair
  ctx.fillStyle = resident.hairColor
  ctx.fillRect(px, py - 1, 6, 2)

  // Eyes or Goggles / Visor
  if (pose === "jetpack_left" || pose === "jetpack_right" || resident.kind.startsWith("jetpack")) {
    ctx.fillStyle = "#0284c7"
    ctx.fillRect(px + 1, py + 1, 4, 2)
    ctx.fillStyle = "#38bdf8"
    ctx.fillRect(px + 2, py + 1, 1, 1)
  } else {
    ctx.fillStyle = "#111"
    ctx.fillRect(px + 1, py + 2, 1, 1)
    ctx.fillRect(px + 4, py + 2, 1, 1)
    if (resident.kind.startsWith("skateboard")) {
      // Small backwards cap visor
      ctx.fillStyle = resident.accessoryColor || "#ec4899"
      ctx.fillRect(px - 2, py - 1, 2, 1)
    }
  }

  // Torso / Shirt
  ctx.fillStyle = resident.color
  ctx.fillRect(px, py + 5, 6, 4)

  if (pose === "cheer") {
    // Hands raised up \o/ with celebratory hop
    ctx.fillStyle = resident.skinColor
    const hop = (Math.floor(time * 10) % 2) * 2
    ctx.fillRect(px - 2, py + 2 - hop, 2, 2)
    ctx.fillRect(px + 6, py + 2 - hop, 2, 2)
    ctx.fillStyle = "#1e293b"
    ctx.fillRect(px + 1, py + 9, 4, 3)
  } else if (pose === "walk_left" || pose === "walk_right") {
    ctx.fillStyle = "#1e293b"
    const stride = Math.floor(time * 14) % 2
    if (stride === 0) {
      ctx.fillRect(px - 1, py + 9, 2, 3)
      ctx.fillRect(px + 4, py + 9, 2, 3)
    } else {
      ctx.fillRect(px + 1, py + 9, 4, 3)
    }
  } else if (pose === "parachute" || pose === "balloon") {
    ctx.fillStyle = resident.skinColor
    ctx.fillRect(px + 2, py + 1, 2, 2)
    ctx.fillStyle = "#1e293b"
    ctx.fillRect(px, py + 9, 2, 3)
    ctx.fillRect(px + 4, py + 9, 2, 3)
  } else if (pose === "jetpack_left" || pose === "jetpack_right") {
    ctx.fillStyle = "#1e293b"
    const isLeft = pose === "jetpack_left"
    ctx.fillRect(isLeft ? px - 1 : px + 3, py + 9, 4, 2)
  } else if (pose === "skate_left" || pose === "skate_right") {
    ctx.fillStyle = "#1e293b"
    ctx.fillRect(px, py + 9, 3, 2)
    ctx.fillRect(px + 3, py + 9, 3, 2)
  } else if (pose === "window") {
    const wave = Math.sin(time * 3 + px * 7) > 0.65
    if (wave) {
      ctx.fillStyle = resident.skinColor
      const handY = py + 1 + (Math.floor(time * 8) % 2)
      ctx.fillRect(px + 6, handY, 2, 2)
    }
  }
}

/** Original pixel buildings, drawn in local coordinates around each physics body. */
export function drawTower(ctx: CanvasRenderingContext2D, game: TowerGame, width: number, height: number) {
  const scale = Math.min(width / 12, height / 17)
  const ground = height - 42
  const screenX = (x: number) => width / 2 + x * scale
  const screenY = (y: number) => ground - (y - game.cameraBase) * scale
  ctx.imageSmoothingEnabled = false
  // Dynamic sky atmosphere based on altitude (floor count & cameraBase)
  const alt = game.count
  let skyFill = "#87bfda"
  if (alt >= 21) {
    // Cosmic Orbit / Space
    skyFill = "#030712"
  } else if (alt >= 13) {
    // Starry Night
    skyFill = "#0f172a"
  } else if (alt >= 6) {
    // Golden Sunset / Dusk
    skyFill = "#b45309"
  }

  ctx.fillStyle = skyFill
  ctx.fillRect(0, 0, width, height)

  // Sunset gradient or night sky overlay
  if (alt >= 6 && alt < 13) {
    const grad = ctx.createLinearGradient(0, 0, 0, height)
    grad.addColorStop(0, "#b45309")
    grad.addColorStop(0.5, "#ea580c")
    grad.addColorStop(1, "#fbbf24")
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)

    // Retro pixel sun sinking in the background
    const sunY = screenY(10)
    if (sunY > -40 && sunY < height + 40) {
      ctx.fillStyle = "#fef08a"
      ctx.fillRect(width * 0.7 - 20, sunY - 20, 40, 40)
      ctx.fillStyle = "#fde047"
      ctx.fillRect(width * 0.7 - 16, sunY - 16, 32, 32)
    }
  } else if (alt >= 13 && alt < 21) {
    const grad = ctx.createLinearGradient(0, 0, 0, height)
    grad.addColorStop(0, "#090d16")
    grad.addColorStop(1, "#1e1b4b")
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)

    // Retro crescent moon
    const moonY = screenY(22)
    if (moonY > -30 && moonY < height + 30) {
      ctx.fillStyle = "#fef08a"
      ctx.fillRect(width * 0.2, moonY, 18, 18)
      ctx.fillStyle = "#090d16"
      ctx.fillRect(width * 0.2 + 6, moonY - 3, 16, 16)
    }
  } else if (alt >= 21) {
    // Deep cosmic space with nebula hints
    const grad = ctx.createLinearGradient(0, 0, 0, height)
    grad.addColorStop(0, "#020617")
    grad.addColorStop(1, "#172554")
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)
  }

  // Twinkling pixel stars in Night & Space
  if (alt >= 13) {
    for (let s = 0; s < 24; s++) {
      const sx = (s * 47 + 13) % width
      const sy = (s * 73 + 19) % (height - 30)
      const twinkle = Math.sin(game.time * 4 + s) > 0.3
      ctx.fillStyle = twinkle ? "#ffffff" : "#94a3b8"
      ctx.fillRect(sx, sy, 2, 2)
      if (twinkle && s % 4 === 0) {
        ctx.fillStyle = alt >= 21 ? "#38bdf8" : "#fef08a"
        ctx.fillRect(sx - 1, sy, 4, 1)
        ctx.fillRect(sx, sy - 1, 1, 4)
      }
    }
  }

  // Quiet parallax clouds (day & sunset)
  if (alt < 13) {
    for (let i = 0; i < 6; i++) {
      const x = ((i * 137 + 24) % (width + 90)) - 45
      const y = ((i * 113 + 56 + game.cameraBase * scale * 0.2) % (height + 80)) - 40
      ctx.fillStyle = alt >= 6 ? "#9a3412" : "#68a2bd"
      ctx.fillRect(x + 5, y + 17, 74, 8)
      ctx.fillStyle = alt >= 6 ? "#fdba74" : "#d7eff2"
      ctx.fillRect(x, y + 9, 72, 12)
      ctx.fillRect(x + 15, y + 1, 36, 11)
      ctx.fillStyle = alt >= 6 ? "#ffedd5" : "#f0f7ee"
      ctx.fillRect(x + 19, y, 24, 6)
    }
  }

  // Wind streaks when wind is active
  if (game.wind !== 0) {
    const dir = Math.sign(game.wind)
    const speed = Math.abs(game.wind) * 140
    ctx.fillStyle = alt >= 13 ? "rgba(255, 255, 255, 0.28)" : "rgba(255, 255, 255, 0.55)"
    for (let w = 0; w < 5; w++) {
      const wx = ((w * 79 + game.time * speed * dir) % (width + 70) + (width + 70)) % (width + 70) - 35
      const wy = 35 + (w * 67) % (height - 70)
      const len = 14 + (w % 3) * 8
      ctx.fillRect(wx, wy, len, 1.5)
      ctx.fillRect(wx + (dir > 0 ? len : -2), wy - 0.5, 2, 2.5)
    }
  }

  if (game.cameraBase < 3) {
    for (let i = 0; i < 12; i++) {
      const x = i * 43 - 12
      const h = 24 + (i * 29) % 58
      ctx.fillStyle = i % 2 ? "#669ba9" : "#739fac"
      ctx.fillRect(x, screenY(-0.8) - h, 34, h)
      ctx.fillRect(x + 12, screenY(-0.8) - h - 8, 10, 8)
    }
  }

  const baseY = screenY(0)
  ctx.fillStyle = "#435d57"
  ctx.fillRect(0, baseY + 0.8 * scale, width, Math.max(0, height - baseY))
  ctx.fillStyle = "#d6bf7b"
  ctx.fillRect(screenX(-2.5), baseY, 5 * scale, 0.8 * scale)
  ctx.fillStyle = "#524734"
  ctx.fillRect(screenX(-2.5), baseY, 5 * scale, 5)
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 ? "#e9b942" : "#38464b"
    ctx.fillRect(screenX(-2.5) + i * 0.5 * scale, baseY + 5, 0.5 * scale, 7)
  }

  if (game.rope && game.pivot && game.current) {
    const anchor = game.rope.getAnchorB()
    const pivotX = screenX(game.pivot.getPosition().x)
    const pivotY = screenY(game.pivot.getPosition().y)
    // The rail continues offscreen to the crane structure. The trolley is
    // attached to the actual moving joint anchor, not an independent animation.
    ctx.fillStyle = "#715333"
    ctx.fillRect(0, pivotY - 21, width, 14)
    ctx.fillStyle = "#edbe56"
    ctx.fillRect(0, pivotY - 20, width, 3)
    ctx.fillRect(0, pivotY - 10, width, 3)
    ctx.strokeStyle = "#c38b3b"
    ctx.lineWidth = 3
    ctx.beginPath()
    for (let x = -12; x < width; x += 24) {
      ctx.moveTo(x, pivotY - 17)
      ctx.lineTo(x + 12, pivotY - 10)
      ctx.lineTo(x + 24, pivotY - 17)
    }
    ctx.stroke()
    ctx.fillStyle = "#253c49"
    ctx.fillRect(pivotX - 11, pivotY - 13, 22, 12)
    ctx.fillStyle = "#edbe56"
    ctx.fillRect(pivotX - 8, pivotY - 11, 16, 7)
    ctx.fillStyle = "#253c49"
    ctx.fillRect(pivotX - 2, pivotY - 4, 4, 7)
    ctx.strokeStyle = "#253c49"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(screenX(game.pivot.getPosition().x), screenY(game.pivot.getPosition().y))
    ctx.lineTo(screenX(anchor.x), screenY(anchor.y))
    ctx.stroke()
    ctx.fillStyle = "#e7b647"
    ctx.fillRect(screenX(anchor.x) - 4, screenY(anchor.y) - 5, 8, 8)
  }

  for (const [index, floor] of game.floors.entries()) {
    const body = floor.body
    const y = screenY(body.getPosition().y)
    if (y < -120 || y > height + 120) continue
    ctx.save()
    ctx.translate(screenX(body.getPosition().x), y)
    ctx.rotate(-body.getAngle())
    const w = FLOOR_WIDTH * scale
    const h = FLOOR_HEIGHT * scale
    ctx.translate(-w / 2, -h / 2)
    const palette = index % 5 === 4 ? ["#be7147", "#e69c56", "#834631"] : ["#ab3743", "#d75852", "#742e3f"]
    ctx.fillStyle = "#492f3b"
    ctx.fillRect(-1, -1, w + 2, h + 2)
    ctx.fillStyle = palette[0]
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = palette[1]
    ctx.fillRect(0, 0, w, 5)
    ctx.fillRect(0, 0, 4, h)
    ctx.fillStyle = palette[2]
    ctx.fillRect(w - 5, 4, 5, h - 4)
    ctx.fillRect(0, h - 6, w, 6)

    const isLanding = floor === game.current && game.phase === "landed"
    const progress = isLanding ? Math.min(1, (game as any).phaseTime / 0.65) : 1

    for (let j = 0; j < 3; j++) {
      const wx = w * (0.12 + j * 0.29)
      const wy = h * 0.24
      const ww = w * 0.18
      const wh = h * 0.48
      ctx.fillStyle = "#402e3a"
      ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4)

      const hasResidents = Boolean(floor.scored)
      ctx.fillStyle = hasResidents ? "#ffe082" : ((index + j) % 4 === 0 ? "#f8d984" : "#9bcee0")
      ctx.fillRect(wx, wy, ww, wh)

      if (hasResidents) {
        ctx.fillStyle = "#ffb300"
        ctx.fillRect(wx, wy, ww, 2)
        ctx.fillStyle = "#ffd54f"
        ctx.fillRect(wx, wy + wh - 4, ww, 4)
      }

      // If settled or past animation, render resident inside window
      const resident = floor.residents?.find(r => r.targetWindow === j)
      if (resident && progress >= 1) {
        const rx = wx + ww / 2 - 3
        const ry = wy + wh - 9
        drawPixelPerson(ctx, resident, rx, ry, isLanding ? "cheer" : "window", game.time)
      }

      ctx.fillStyle = "#e4e7cd"
      ctx.fillRect(wx, wy, ww, 3)
      ctx.fillStyle = "#4a5260"
      ctx.fillRect(wx + ww / 2 - 1, wy, 2, wh)
      ctx.fillRect(wx, wy + wh / 2 - 1, ww, 2)
      ctx.fillStyle = "#e6ad78"
      ctx.fillRect(wx - 3, wy + wh + 2, ww + 6, 3)
    }

    // If landing animation is in progress (< 1), render residents running/flying/skating into the floor
    if (isLanding && floor.residents && progress < 1) {
      for (const resident of floor.residents) {
        const j = resident.targetWindow
        const targetX = w * (0.12 + j * 0.29) + (w * 0.18) / 2 - 3
        const targetY = h * 0.24 + h * 0.48 - 9

        if (resident.kind === "parachute") {
          const startY = -45
          const curY = startY + (targetY - startY) * progress
          const sway = Math.sin(progress * 14) * 3
          const curX = targetX + sway
          const reached = progress >= 0.85
          drawPixelPerson(
            ctx,
            resident,
            reached ? targetX : curX,
            reached ? targetY : curY,
            reached ? "cheer" : "parachute",
            game.time
          )
        } else if (resident.kind === "balloon_left" || resident.kind === "balloon_right") {
          const isLeft = resident.kind === "balloon_left"
          const startX = isLeft ? -30 : w + 30
          const startY = -15
          const curX = startX + (targetX - startX) * progress
          const curY = startY + (targetY - startY) * progress + Math.sin(progress * 10) * 2
          const reached = progress >= 0.82
          if (reached) {
            // Released balloons float up into the sky!
            const floatY = targetY - (progress - 0.82) * 110
            drawReleasedBalloons(ctx, targetX, floatY, game.time)
            drawPixelPerson(ctx, resident, targetX, targetY, "cheer", game.time)
          } else {
            drawPixelPerson(ctx, resident, curX, curY, "balloon", game.time)
          }
        } else if (resident.kind === "jetpack_left" || resident.kind === "jetpack_right") {
          const isLeft = resident.kind === "jetpack_left"
          const startX = isLeft ? -35 : w + 35
          const curX = startX + (targetX - startX) * progress
          const curY = targetY + Math.sin(progress * 16) * 2.5
          const reached = progress >= 0.82
          drawPixelPerson(
            ctx,
            resident,
            reached ? targetX : curX,
            reached ? targetY : curY,
            reached ? "cheer" : isLeft ? "jetpack_left" : "jetpack_right",
            game.time
          )
        } else if (resident.kind === "skateboard_left" || resident.kind === "skateboard_right") {
          const isLeft = resident.kind === "skateboard_left"
          const startX = isLeft ? -25 : w + 25
          const skateProgress = Math.min(1, Math.pow(progress, 0.85))
          const curX = startX + (targetX - startX) * skateProgress
          const curY = h - 13
          const reached = progress >= 0.84
          if (reached) {
            drawPixelPerson(ctx, resident, targetX, targetY, "cheer", game.time)
          } else {
            drawPixelPerson(ctx, resident, curX, curY, isLeft ? "skate_left" : "skate_right", game.time)
            if (progress > 0.65) {
              ctx.fillStyle = "#cbd5e1"
              const dustX = isLeft ? curX - 4 : curX + 10
              ctx.fillRect(dustX, curY + 11, 2, 2)
              ctx.fillRect(dustX - 2, curY + 12, 2, 2)
            }
          }
        } else if (resident.kind === "walker_left") {
          const startX = -18
          const curX = startX + (targetX - startX) * progress
          const curY = h - 12
          const reached = curX >= targetX
          drawPixelPerson(
            ctx,
            resident,
            reached ? targetX : curX,
            reached ? targetY : curY,
            reached ? "cheer" : "walk_right",
            game.time
          )
        } else if (resident.kind === "walker_right") {
          const startX = w + 18
          const curX = startX + (targetX - startX) * progress
          const curY = h - 12
          const reached = curX <= targetX
          drawPixelPerson(
            ctx,
            resident,
            reached ? targetX : curX,
            reached ? targetY : curY,
            reached ? "cheer" : "walk_left",
            game.time
          )
        }
      }
    }

    // Celebration particles & Floating "+X Warga" badge above newly landed floor
    if (isLanding && floor.floatingText) {
      const phaseTime = (game as any).phaseTime || 0
      const popupY = -12 - phaseTime * 26
      const alpha = Math.max(0, 1 - phaseTime / 0.85)
      ctx.save()
      ctx.globalAlpha = alpha

      const isMilestone = floor.floatingText.includes("★")
      const bw = isMilestone ? 128 : 68
      const bh = 15
      const bx = w / 2 - bw / 2
      ctx.fillStyle = isMilestone ? "#451a03" : "#101820"
      ctx.fillRect(bx, popupY - 12, bw, bh)
      ctx.strokeStyle = isMilestone ? "#f59e0b" : "#fbbf24"
      ctx.lineWidth = isMilestone ? 2 : 1.5
      ctx.strokeRect(bx, popupY - 12, bw, bh)

      ctx.font = isMilestone ? "bold 8px monospace" : "bold 9px monospace"
      ctx.textAlign = "center"
      ctx.fillStyle = isMilestone ? "#fde047" : "#fef08a"
      ctx.fillText(floor.floatingText, w / 2, popupY)

      if (progress >= 0.6) {
        const icons = isMilestone ? ["★", "✦", "★"] : ["♥", "✦", "♪"]
        ctx.fillStyle = isMilestone ? "#eab308" : "#ef4444"
        ctx.font = "bold 9px monospace"
        for (let k = 0; k < 3; k++) {
          const hx = w * (0.2 + k * 0.3)
          const hy = h * 0.15 - (phaseTime - 0.4) * 18
          ctx.fillText(icons[k % icons.length], hx, hy)
        }
      }
      ctx.restore()
    }

    ctx.restore()
  }

  // Height ruler helps the player read progress without moving the tower.
  ctx.font = "bold 10px monospace"
  ctx.textAlign = "left"
  for (let floor = 5; floor <= game.count + 8; floor += 5) {
    const y = screenY(floor * FLOOR_HEIGHT)
    if (y < 24 || y > height - 20) continue
    ctx.fillStyle = game.count >= 13 ? "#94a3b8" : "#315568"
    ctx.fillRect(0, y, 10, 2)
    ctx.fillText(`${floor}F`, 15, y + 4)
  }

  // ── Retro Wind Vane HUD (bottom right of canvas) ──
  if (game.count >= 5) {
    const boxW = 86
    const boxH = 18
    const bx = width - boxW - 6
    const by = height - boxH - 6
    ctx.fillStyle = "#d4d0c8"
    ctx.fillRect(bx, by, boxW, boxH)
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(bx, by, boxW, 1)
    ctx.fillRect(bx, by, 1, boxH)
    ctx.fillStyle = "#808080"
    ctx.fillRect(bx + boxW - 1, by, 1, boxH)
    ctx.fillRect(bx, by + boxH - 1, boxW, 1)

    const absWind = Math.abs(game.wind)
    const arrow = game.wind > 0
      ? (absWind > 0.8 ? "▶▶" : "▶")
      : game.wind < 0
      ? (absWind > 0.8 ? "◀◀" : "◀")
      : "•"

    ctx.font = "bold 8.5px monospace"
    ctx.textAlign = "center"
    ctx.fillStyle = absWind > 0.8 ? "#991b1b" : absWind > 0.3 ? "#b45309" : "#166534"
    ctx.fillText(`ANGIN ${arrow} ${absWind.toFixed(1)}m/s`, bx + boxW / 2, by + 12)
  }
}
