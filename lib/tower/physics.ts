import { World, Vec2, Box, DistanceJoint } from "planck"
import type { Body, Joint } from "planck"

export const STEP = 1 / 60
export const FLOOR_WIDTH = 3.2
export const FLOOR_HEIGHT = 1.6
export type TowerPhase = "ready" | "swinging" | "falling" | "landed" | "over"
export type TowerDifficulty = "santai" | "normal" | "ekstrim"

export interface DifficultyConfig {
  speedBase: number
  speedScale: number
  linearDamping: number
  angularDamping: number
  lateralReleaseMomentum: number
  stableAngle: number
  dangerAngle: number
  dangerTime: number
  foundationHalfWidth: number
  foundationFriction: number
  name: string
  badge: string
  description: string
}

export const DIFFICULTY_CONFIGS: Record<TowerDifficulty, DifficultyConfig> = {
  santai: {
    speedBase: 0.58,
    speedScale: 0.008,
    linearDamping: 0.35,
    angularDamping: 0.75,
    lateralReleaseMomentum: 0.35,
    stableAngle: 0.42,
    dangerAngle: 1.25,
    dangerTime: 0.65,
    foundationHalfWidth: 2.8,
    foundationFriction: 0.9,
    name: "Santai",
    badge: "SANTAI",
    description: "Menara stabil & redaman tinggi, ayunan tenang, cocok untuk main santai.",
  },
  normal: {
    speedBase: 0.72,
    speedScale: 0.012,
    linearDamping: 0.20,
    angularDamping: 0.45,
    lateralReleaseMomentum: 0.65,
    stableAngle: 0.35,
    dangerAngle: 1.15,
    dangerTime: 0.55,
    foundationHalfWidth: 2.6,
    foundationFriction: 0.85,
    name: "Normal",
    badge: "NORMAL",
    description: "Tantangan seimbang, ayunan dinamis, goyangan menara terukur.",
  },
  ekstrim: {
    speedBase: 0.85,
    speedScale: 0.018,
    linearDamping: 0.08,
    angularDamping: 0.18,
    lateralReleaseMomentum: 1.0,
    stableAngle: 0.30,
    dangerAngle: 1.05,
    dangerTime: 0.45,
    foundationHalfWidth: 2.5,
    foundationFriction: 0.8,
    name: "Ekstrim",
    badge: "EKSTRIM",
    description: "Simulasi fisika murni, ayunan cepat & rawan oleng.",
  },
}

export type ResidentEntryKind =
  | "parachute"
  | "balloon_left"
  | "balloon_right"
  | "jetpack_left"
  | "jetpack_right"
  | "skateboard_left"
  | "skateboard_right"
  | "walker_left"
  | "walker_right"

export interface FloorResident {
  kind: ResidentEntryKind
  color: string
  hairColor: string
  skinColor: string
  targetWindow: number
  chuteColor?: string
  accessoryColor?: string
}

export interface Floor {
  body: Body
  scored: boolean
  placedY: number
  dangerTime: number
  residents?: FloorResident[]
  residentCount?: number
  floatingText?: string
}

export interface TowerSnapshot {
  phase: TowerPhase
  difficulty: TowerDifficulty
  score: number
  floors: number
  combo: number
  residents: number
  message: string
  wind: number
  milestone?: string
}

export function createTowerWorld(foundationHalfWidth = 2.5, friction = 0.8) {
  const world = new World(Vec2(0, -10))
  world.setContinuousPhysics(true)
  const foundation = world.createBody(Vec2(0, -0.4))
  foundation.createFixture(Box(foundationHalfWidth, 0.4), { friction })
  return { world, foundation }
}

export function createFloor(
  world: World,
  x: number,
  y: number,
  angle = 0,
  damping = { linear: 0.08, angular: 0.18 }
) {
  const body = world.createDynamicBody({
    position: Vec2(x, y), angle, bullet: true,
    linearDamping: damping.linear, angularDamping: damping.angular,
    allowSleep: true,
  })
  body.createFixture(Box(FLOOR_WIDTH / 2, FLOOR_HEIGHT / 2), {
    density: 1, friction: 0.75, restitution: 0.015,
  })
  return body
}

// Only upward support connected to the foundation counts as a landing.
// A side collision or contact with another falling floor cannot earn points.
// maxDepth prevents pathological recursion in degenerate contact graphs; 64 is
// well above any reachable tower height so normal play is never affected.
export function hasSupport(body: Body, foundation: Body, visited = new Set<Body>(), depth = 0): boolean {
  if (body === foundation) return true
  if (visited.has(body) || depth > 64) return false
  visited.add(body)
  for (let edge = body.getContactList(); edge; edge = edge.next) {
    if (!edge.other || !edge.contact.isTouching()) continue
    if (edge.other.getPosition().y >= body.getPosition().y - FLOOR_HEIGHT * 0.35) continue
    if (hasSupport(edge.other, foundation, visited, depth + 1)) return true
  }
  return false
}

export class TowerGame {
  readonly world: World
  readonly foundation: Body
  readonly floors: Floor[] = []
  readonly difficulty: TowerDifficulty
  pivot: Body | null = null
  rope: Joint | null = null
  current: Floor | null = null
  phase: TowerPhase = "ready"
  score = 0
  combo = 0
  count = 0
  residents = 0
  time = 0
  cameraBase = 0
  message = "Mulai menara retro kamu."
  wind = 0
  milestone = ""
  private phaseTime = 0
  private stableTime = 0
  private swingTime = 0
  private pivotCenter = 0
  private dropBase = 0
  private swingDirection = 1

  constructor(difficulty: TowerDifficulty = "ekstrim") {
    this.difficulty = difficulty
    const config = DIFFICULTY_CONFIGS[difficulty]
    const { world, foundation } = createTowerWorld(config.foundationHalfWidth, config.foundationFriction)
    this.world = world
    this.foundation = foundation
  }

  snapshot(): TowerSnapshot {
    return {
      phase: this.phase,
      difficulty: this.difficulty,
      score: this.score,
      floors: this.count,
      combo: this.combo,
      residents: this.residents,
      message: this.message,
      wind: this.wind,
      milestone: this.milestone || undefined,
    }
  }

  top() {
    return this.floors.reduce((top, floor) => floor.scored
      ? Math.max(top, floor.body.getPosition().y + FLOOR_HEIGHT / 2) : top, 0)
  }

  start() {
    if (this.phase === "ready") this.spawn()
  }

  private spawn() {
    const config = DIFFICULTY_CONFIGS[this.difficulty]
    const top = this.top()
    const previous = this.floors.filter(floor => floor.scored).at(-1)
    this.pivotCenter = Math.max(-2, Math.min(2, previous?.body.getPosition().x ?? 0))
    this.swingDirection = this.count % 2 === 0 ? 1 : -1
    this.swingTime = 0
    // Dynamic wind kicks in after floor 4 (floor count >= 5)
    if (this.count >= 5) {
      const cycle = Math.sin(this.count * 1.57)
      const maxWind = this.difficulty === "santai" ? 0.6 : this.difficulty === "normal" ? 1.0 : 1.4
      this.wind = Math.round(cycle * maxWind * 10) / 10
    } else {
      this.wind = 0
    }
    const startX = this.pivotCenter + this.swingDirection * 2.8
    this.pivot = this.world.createKinematicBody(Vec2(startX, top + 8.2))
    const body = createFloor(this.world, startX, top + 4.2, 0, {
      linear: config.linearDamping,
      angular: config.angularDamping,
    })
    this.current = { body, scored: false, placedY: 0, dangerTime: 0 }
    this.floors.push(this.current)
    this.rope = this.world.createJoint(new DistanceJoint({ length: 3.2, collideConnected: false },
      this.pivot, body, this.pivot.getPosition(), body.getWorldPoint(Vec2(0, FLOOR_HEIGHT / 2))))
    this.phase = "swinging"
    this.phaseTime = 0
    this.message = "Tap atau Spasi untuk lepas."
  }

  release() {
    if (this.phase !== "swinging" || !this.rope || this.phaseTime < 0.25) return false
    this.world.destroyJoint(this.rope)
    this.rope = null
    if (this.pivot) this.world.destroyBody(this.pivot)
    this.pivot = null
    const config = DIFFICULTY_CONFIGS[this.difficulty]
    if (config.lateralReleaseMomentum < 1.0 && this.current) {
      const vel = this.current.body.getLinearVelocity()
      this.current.body.setLinearVelocity(Vec2(vel.x * config.lateralReleaseMomentum, vel.y))
    }
    this.phase = "falling"
    this.phaseTime = 0
    this.stableTime = 0
    this.dropBase = this.top()
    this.message = "Tunggu lantainya stabil..."
    return true
  }

  private finish(message: string) {
    if (this.phase === "over") return
    this.phase = "over"
    this.phaseTime = 0
    this.message = message
    if (this.rope) this.world.destroyJoint(this.rope)
    if (this.pivot) this.world.destroyBody(this.pivot)
    this.rope = null
    this.pivot = null
  }

  step() {
    if (this.phase === "ready" || (this.phase === "over" && this.phaseTime > 3)) return
    this.time += STEP
    this.phaseTime += STEP
    const config = DIFFICULTY_CONFIGS[this.difficulty]
    if (this.pivot) {
      this.swingTime += STEP
      const speed = config.speedBase + Math.min(this.count, 35) * config.speedScale
      const target = this.pivotCenter + this.swingDirection * 2.8 * Math.cos(this.swingTime * speed)
      this.pivot.setLinearVelocity(Vec2((target - this.pivot.getPosition().x) / STEP, 0))
    }
    // Two short physics steps improve contacts in tall stacks. Rendering never
    // changes these intervals, even on a 120 Hz display or after resizing.
    this.world.step(STEP / 2, 12, 8)
    this.world.step(STEP / 2, 12, 8)
    const targetCamera = Math.max(0, this.top() - 6)
    if (this.phase !== "over") this.cameraBase += (targetCamera - this.cameraBase) * 0.035

    if (this.phase === "over") return
    for (const floor of this.floors) {
      if (!floor.scored) continue
      const fallen = floor.body.getPosition().y < floor.placedY - 1.2 || Math.abs(floor.body.getAngle()) > config.dangerAngle
      floor.dangerTime = fallen ? floor.dangerTime + STEP : 0
      if (floor.dangerTime > config.dangerTime) {
        this.finish("Menaranya roboh. Coba lagi!")
        return
      }
    }
    if (this.phase === "landed" && this.phaseTime > 0.85) this.spawn()
    if (this.phase !== "falling" || !this.current) return
    const body = this.current.body
    if (this.wind !== 0) {
      body.applyForceToCenter(Vec2(this.wind * 1.8, 0), true)
    }
    const position = body.getPosition()
    // Timeout scales with floor count: tall towers need more time for the whole
    // stack to settle. Cap at 24 s to keep the game from feeling broken.
    const fallingTimeout = Math.min(12 + this.count * 0.4, 24)
    if (position.y < this.dropBase - 5 || Math.abs(position.x) > 12 || this.phaseTime > fallingTimeout) {
      this.finish("Lantainya gagal bertahan.")
      return
    }
    const below = this.floors.filter(floor => floor.scored).at(-1)?.body ?? this.foundation
    // Require foundation support immediately; require support from the floor
    // directly below only after a short grace window so that micro-oscillations
    // in a tall stack don't permanently prevent the hasSupport check from passing.
    const supportedByFoundation = hasSupport(body, this.foundation)
    const supportedByBelow = this.stableTime > 0.3 ? true : hasSupport(body, below)
    const stable = body.getLinearVelocity().length() < 0.22 && Math.abs(body.getAngularVelocity()) < 0.12
      && Math.abs(body.getAngle()) < config.stableAngle && supportedByFoundation && supportedByBelow
    this.stableTime = stable ? this.stableTime + STEP : 0
    if (this.stableTime < 0.45) return
    const perfect = Math.abs(position.x - below.getPosition().x) < 0.18 && Math.abs(body.getAngle()) < 0.06
    this.combo = perfect ? this.combo + 1 : 0
    const points = 100 + (perfect ? 50 * Math.min(this.combo, 5) : 0)
    const newResidents = perfect ? 15 + 5 * Math.min(this.combo, 5) : 10
    this.residents += newResidents
    this.score += points
    this.count++
    this.current.scored = true
    this.current.placedY = position.y
    this.phase = "landed"
    this.phaseTime = 0

    const MILESTONES: Record<number, string> = {
      5: "GEDUNG TINGKAT DUA",
      10: "KOMPLEKS PERKANTORAN",
      15: "PENCAKAR LANGIT",
      20: "MENEMBUS AWAN",
      25: "STRATOSFER RETRO",
      30: "STASIUN ORBIT 98",
    }
    const hitMilestone = MILESTONES[this.count]
    if (hitMilestone) {
      this.milestone = hitMilestone
      this.message = `★ ${hitMilestone}! (+${points} POIN) ★`
    } else {
      this.milestone = ""
      this.message = perfect ? `PERFECT! +${points} • +${newResidents} Warga!` : `Mantap! +${points} • +${newResidents} Warga!`
    }

    const residentColors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"]
    const hairColors = ["#451a03", "#1f2937", "#b45309", "#78350f", "#374151"]
    const skinColors = ["#fed7aa", "#fcd34d", "#fdba74", "#fbcfe8"]
    const chuteColors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"]
    const accessoryColors = ["#ec4899", "#84cc16", "#06b6d4", "#f97316", "#8b5cf6"]

    const leftPool: ResidentEntryKind[] = ["balloon_left", "jetpack_left", "skateboard_left", "walker_left"]
    const midPool: ResidentEntryKind[] = ["parachute", "parachute", "balloon_left", "balloon_right"]
    const rightPool: ResidentEntryKind[] = ["jetpack_right", "balloon_right", "skateboard_right", "walker_right"]

    const leftKind = leftPool[this.count % leftPool.length]
    const midKind = midPool[this.count % midPool.length]
    const rightKind = rightPool[(this.count + 1) % rightPool.length]

    const residents: FloorResident[] = [
      {
        kind: leftKind,
        color: residentColors[(this.count * 3) % residentColors.length],
        hairColor: hairColors[this.count % hairColors.length],
        skinColor: skinColors[this.count % skinColors.length],
        chuteColor: chuteColors[this.count % chuteColors.length],
        accessoryColor: accessoryColors[this.count % accessoryColors.length],
        targetWindow: 0,
      },
      {
        kind: midKind,
        color: residentColors[(this.count * 3 + 1) % residentColors.length],
        hairColor: hairColors[(this.count + 1) % hairColors.length],
        skinColor: skinColors[(this.count + 1) % skinColors.length],
        chuteColor: chuteColors[(this.count + 1) % chuteColors.length],
        accessoryColor: accessoryColors[(this.count + 1) % accessoryColors.length],
        targetWindow: 1,
      },
      {
        kind: rightKind,
        color: residentColors[(this.count * 3 + 2) % residentColors.length],
        hairColor: hairColors[(this.count + 2) % hairColors.length],
        skinColor: skinColors[(this.count + 2) % skinColors.length],
        chuteColor: chuteColors[(this.count + 2) % chuteColors.length],
        accessoryColor: accessoryColors[(this.count + 2) % accessoryColors.length],
        targetWindow: 2,
      },
    ]

    this.current.residents = residents
    this.current.residentCount = newResidents
    this.current.floatingText = `+${newResidents} WARGA`
  }
}

// Bound catch-up work after a slow frame. Pauses must reset the clock instead
// of feeding background-tab elapsed time into the simulation.
export class TowerClock {
  private accumulator = 0
  advance(seconds: number, tick: () => void) {
    this.accumulator += Math.max(0, Math.min(seconds, 0.1))
    let steps = 0
    while (this.accumulator + 1e-9 >= STEP) {
      tick()
      this.accumulator = Math.max(0, this.accumulator - STEP)
      steps++
    }
    return steps
  }
  reset() { this.accumulator = 0 }
}
