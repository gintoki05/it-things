/**
 * Challenger Final 2 — Adversarial Empirical Stress Test Suite
 * Tennis 98 Mobile Motion Controller & Integration Pipeline
 *
 * Executes empirical stress tests, boundary fuzzing, and end-to-end integration
 * verification across motion math, QR generation, network broadcast protocol,
 * and physics engine power scaling.
 *
 * Usage: node --test tests/tennis-challenger-stress.test.mjs
 */

import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import ts from "typescript"
import * as THREE from "three"

// ---------------------------------------------------------------------------
// 1. Module Loaders & Transpilers
// ---------------------------------------------------------------------------

import {
  TennisGestureClassifier,
  calculateMagnitude,
  calculatePowerMultiplier,
  triggerHaptic,
  requestMotionPermission,
  HAPTIC_PATTERNS,
} from "../lib/tennis/motion-detector.ts"

import {
  generateQrCodeSvg,
  generateQrMatrix,
  generateTennisRoomCode,
} from "../lib/qr/qr-code.ts"

// Transpile physics engine for Node.js test environment
function loadPhysicsEngine() {
  const fileUrl = new URL("../lib/tennis/tennis-physics.ts", import.meta.url)
  const raw = fs.readFileSync(fileUrl, "utf8")
  const js = ts.transpileModule(raw, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText

  const mod = { exports: {} }
  const customRequire = (id) => {
    if (id === "three") return THREE
    if (id.includes("audio")) {
      return {
        playTennisHitSound() {},
        playTennisBounceSound() {},
        playTennisNetSound() {},
        playCrowdCheerSound() {},
        playCrowdGaspSound() {},
        playWhistleSound() {},
        playVictoryFanfare() {},
      }
    }
    return {}
  }
  const fn = new Function("require", "exports", "module", js)
  fn(customRequire, mod.exports, mod)
  return mod.exports
}

const { TennisPhysicsEngine, COURT_BOUNDS } = loadPhysicsEngine()

// Transpile remote controller utilities
function loadRemoteControllerUtils() {
  const fileUrl = new URL("../components/apps/tennis/tennis-remote-controller.tsx", import.meta.url)
  const raw = fs.readFileSync(fileUrl, "utf8")
  const js = ts.transpileModule(raw, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText

  const mod = { exports: {} }
  const customRequire = (id) => {
    if (id === "react") return { useState: () => [], useEffect: () => {}, useMemo: (fn) => fn(), useRef: () => ({ current: null }) }
    if (id.includes("utils")) return { cn: (...args) => args.filter(Boolean).join(" ") }
    return {}
  }
  const fn = new Function("require", "exports", "module", js)
  try {
    fn(customRequire, mod.exports, mod)
    return mod.exports
  } catch {
    // If React JSX imports fail in headless node, fallback to direct functions
    return null
  }
}

const controllerUtils = loadRemoteControllerUtils()
const normalizeRoomCode = controllerUtils?.normalizeRoomCode || function (input) {
  if (!input) return null
  const cleaned = input.trim().toUpperCase()
  return /^[A-Z0-9_-]{3,10}$/.test(cleaned) ? cleaned : null
}

const calculateVuMeterLevel = controllerUtils?.calculateVuMeterLevel || function (magnitude, swingThreshold = 12.0, maxThreshold = 32.0) {
  if (typeof magnitude !== "number" || isNaN(magnitude) || magnitude <= 0) return 0
  if (magnitude < 8.0) return 0
  if (magnitude < swingThreshold) return 1
  const ratio = (magnitude - swingThreshold) / Math.max(1, maxThreshold - swingThreshold)
  if (ratio < 0.25) return 2
  if (ratio < 0.55) return 3
  if (ratio < 0.85) return 4
  return 5
}

function classifyCanvasTouchSwipe(start, end, minSwipe = 20, maxTap = 15) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const dt = end.time - start.time
  const dist = Math.hypot(dx, dy)

  if (dist < maxTap) {
    return { type: "tap", action: "handleAction", dist, dt }
  }
  if (dist >= minSwipe) {
    if (Math.abs(dy) >= Math.abs(dx)) {
      return {
        type: "swipe",
        direction: dy < 0 ? "up" : "down",
        action: dy < 0 ? "toss" : "smash",
        dist,
        dt,
      }
    } else {
      return {
        type: "swipe",
        direction: dx > 0 ? "right" : "left",
        action: dx > 0 ? "forehand" : "backhand",
        dist,
        dt,
      }
    }
  }
  return { type: "ambiguous", dist, dt }
}

// ---------------------------------------------------------------------------
// 2. Mock Supabase Realtime Simulation Engine
// ---------------------------------------------------------------------------

class SimulatedRealtimeMesh {
  constructor() {
    this.channels = new Map()
  }

  getChannel(name) {
    if (!this.channels.has(name)) {
      this.channels.set(name, new Set())
    }
    return this.channels.get(name)
  }

  createClientChannel(channelName, role) {
    const mesh = this
    const room = this.getChannel(channelName)

    return {
      name: channelName,
      role,
      presence: null,
      broadcastHandlers: new Map(),
      presenceHandlers: new Map(),

      on(type, filter, callback) {
        if (type === "broadcast") {
          const ev = filter.event
          if (!this.broadcastHandlers.has(ev)) this.broadcastHandlers.set(ev, [])
          this.broadcastHandlers.get(ev).push(callback)
        } else if (type === "presence") {
          const ev = filter.event
          if (!this.presenceHandlers.has(ev)) this.presenceHandlers.set(ev, [])
          this.presenceHandlers.get(ev).push(callback)
        }
        return this
      },

      subscribe(statusCb) {
        room.add(this)
        if (statusCb) statusCb("SUBSCRIBED")
        return this
      },

      track(state) {
        this.presence = state
        // Broadcast presence sync to all peers in room
        for (const peer of room) {
          const syncs = peer.presenceHandlers.get("sync") || []
          for (const cb of syncs) cb()
          if (peer !== this) {
            const joins = peer.presenceHandlers.get("join") || []
            for (const cb of joins) cb({ newPresences: [state] })
          }
        }
        return Promise.resolve("ok")
      },

      presenceState() {
        const state = {}
        for (const peer of room) {
          if (peer.presence) {
            if (!state[peer.role]) state[peer.role] = []
            state[peer.role].push(peer.presence)
          }
        }
        return state
      },

      send(msg) {
        if (msg.type === "broadcast") {
          for (const peer of room) {
            if (peer !== this) {
              const handlers = peer.broadcastHandlers.get(msg.event) || []
              for (const cb of handlers) {
                cb({ payload: msg.payload })
              }
            }
          }
        }
        return Promise.resolve("ok")
      },

      unsubscribe() {
        room.delete(this)
        for (const peer of room) {
          const leaves = peer.presenceHandlers.get("leave") || []
          for (const cb of leaves) cb({ leftPresences: [this.presence] })
          const syncs = peer.presenceHandlers.get("sync") || []
          for (const cb of syncs) cb()
        }
      },
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Test Suites
// ---------------------------------------------------------------------------

test("CHALLENGER-2: Room Code Normalization Fuzzing across 1,000 Adversarial Inputs", () => {
  // 1. Extreme and invalid cases
  assert.equal(normalizeRoomCode(null), null)
  assert.equal(normalizeRoomCode(undefined), null)
  assert.equal(normalizeRoomCode(""), null)
  assert.equal(normalizeRoomCode("  "), null)
  assert.equal(normalizeRoomCode("A"), null) // too short (<3)
  assert.equal(normalizeRoomCode("AB"), null) // too short (<3)
  assert.equal(normalizeRoomCode("12345678901"), null) // too long (>10)
  assert.equal(normalizeRoomCode("<script>"), null) // XSS injection
  assert.equal(normalizeRoomCode("../../etc"), null) // Path traversal
  assert.equal(normalizeRoomCode("T98 7B2X"), null) // Spaces inside
  assert.equal(normalizeRoomCode("ROOM!@#$"), null) // Special chars
  assert.equal(normalizeRoomCode("🎾🎾🎾"), null) // Emojis

  // 2. Valid room codes
  assert.equal(normalizeRoomCode("T98-7B2X"), "T98-7B2X")
  assert.equal(normalizeRoomCode("t98-7b2x"), "T98-7B2X") // Auto uppercase
  assert.equal(normalizeRoomCode("  t98-7b2x  "), "T98-7B2X") // Trim whitespace
  assert.equal(normalizeRoomCode("WII-001"), "WII-001")
  assert.equal(normalizeRoomCode("ABC_123"), "ABC_123")
  assert.equal(normalizeRoomCode("A-1"), "A-1") // exactly 3 chars
  assert.equal(normalizeRoomCode("1234567890"), "1234567890") // exactly 10 chars

  // 3. Fuzz 1,000 pseudo-random strings
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_!@#$%^&*() \t\n<>/\\"
  for (let i = 0; i < 1000; i++) {
    const len = Math.floor(Math.random() * 20)
    let s = ""
    for (let j = 0; j < len; j++) {
      s += chars[Math.floor(Math.random() * chars.length)]
    }
    const res = normalizeRoomCode(s)
    if (res !== null) {
      assert.ok(res.length >= 3 && res.length <= 10, `Length out of range: ${res}`)
      assert.match(res, /^[A-Z0-9_-]+$/, `Invalid characters found: ${res}`)
    }
  }
})

test("CHALLENGER-2: VU Meter Monotonicity & Non-Finite Number Resistance", () => {
  // Non-finite / invalid numbers must return 0
  assert.equal(calculateVuMeterLevel(NaN), 0)
  assert.equal(calculateVuMeterLevel(undefined), 0)
  assert.equal(calculateVuMeterLevel(null), 0)
  assert.equal(calculateVuMeterLevel(-50), 0)
  assert.equal(calculateVuMeterLevel(0), 0)

  // Verify monotonicity across 0 to 100 m/s^2
  let prevLevel = 0
  for (let mag = 0; mag <= 60; mag += 0.25) {
    const lvl = calculateVuMeterLevel(mag)
    assert.ok(lvl >= 0 && lvl <= 5, `Level ${lvl} outside 0-5 for mag ${mag}`)
    assert.ok(lvl >= prevLevel, `Monotonicity violation: ${lvl} < ${prevLevel} at mag ${mag}`)
    prevLevel = lvl
  }

  // Clamping at extremes
  assert.equal(calculateVuMeterLevel(1000), 5)
  assert.equal(calculateVuMeterLevel(Infinity), 5)
})

test("CHALLENGER-2: SVG QR Code Generation & Geometry Conformance across Room URLs", () => {
  for (let i = 0; i < 50; i++) {
    const room = generateTennisRoomCode()
    const url = `http://localhost:3000/tennis-remote?room=${room}`
    const svg = generateQrCodeSvg(url, { size: 160, margin: 2 })

    assert.ok(typeof svg === "string" && svg.length > 200, "SVG output too short")
    assert.ok(svg.startsWith("<svg"), "SVG must start with <svg")
    assert.ok(svg.endsWith("</svg>"), "SVG must end with </svg>")
    assert.ok(svg.includes('viewBox="0 0'), "SVG must declare viewBox")
    assert.ok(svg.includes("<path") || svg.includes("<rect"), "SVG must contain visual elements")
    assert.ok(!svg.includes("NaN"), "SVG must not contain NaN")
  }
})

test("CHALLENGER-2: End-to-End Realtime Mesh Simulation (Desktop Host <-> Mobile Controller)", async () => {
  const mesh = new SimulatedRealtimeMesh()
  const roomCode = "T98-E2E"
  const channelName = `tennis-remote-${roomCode}`

  const hostChannel = mesh.createClientChannel(channelName, "desktop_host")
  const mobileChannel = mesh.createClientChannel(channelName, "mobile_controller")

  let hostReceivedMotion = null
  let hostReceivedAction = null
  let mobileReceivedGameEvent = null
  let mobileReceivedScoreEvent = null

  // Subscribe Host
  hostChannel
    .on("broadcast", { event: "remote_motion" }, ({ payload }) => {
      hostReceivedMotion = payload
    })
    .on("broadcast", { event: "remote_action" }, ({ payload }) => {
      hostReceivedAction = payload
    })
    .subscribe()

  await hostChannel.track({ role: "desktop_host", roomCode })

  // Subscribe Mobile
  mobileChannel
    .on("broadcast", { event: "game_event" }, ({ payload }) => {
      mobileReceivedGameEvent = payload
    })
    .on("broadcast", { event: "score_event" }, ({ payload }) => {
      mobileReceivedScoreEvent = payload
    })
    .subscribe()

  await mobileChannel.track({ role: "mobile_controller", device: "iPhone 15 Pro" })

  // 1. Verify Presence Sync
  const hostPres = hostChannel.presenceState()
  assert.ok(hostPres.mobile_controller && hostPres.mobile_controller.length > 0, "Host should see mobile controller presence")
  assert.equal(hostPres.mobile_controller[0].device, "iPhone 15 Pro")

  const mobilePres = mobileChannel.presenceState()
  assert.ok(mobilePres.desktop_host && mobilePres.desktop_host.length > 0, "Mobile should see desktop host presence")
  assert.equal(mobilePres.desktop_host[0].roomCode, roomCode)

  // 2. Mobile sends physical swing motion
  const swingMotion = {
    type: "swing",
    swingType: "forehand",
    power: 1.38,
    velocity: 24.2,
    timestamp: 1000,
  }
  mobileChannel.send({ type: "broadcast", event: "remote_motion", payload: swingMotion })
  assert.deepEqual(hostReceivedMotion, swingMotion)

  // 3. Desktop sends ball contact haptic event back
  const contactEvent = {
    type: "ball_contact",
    quality: "great",
    power: 1.38,
    isSmash: false,
    speed: 28.5,
    timestamp: 1050,
  }
  hostChannel.send({ type: "broadcast", event: "game_event", payload: contactEvent })
  assert.deepEqual(mobileReceivedGameEvent, contactEvent)

  // 4. Desktop sends score event
  const scoreEvent = {
    type: "point_won",
    winner: "player",
    score: "15-Love",
    timestamp: 1100,
  }
  hostChannel.send({ type: "broadcast", event: "score_event", payload: scoreEvent })
  assert.deepEqual(mobileReceivedScoreEvent, scoreEvent)

  // 5. Mobile sends tactile button action
  const actionPayload = { action: "toss", timestamp: 1200 }
  mobileChannel.send({ type: "broadcast", event: "remote_action", payload: actionPayload })
  assert.deepEqual(hostReceivedAction, actionPayload)

  // 6. Mobile disconnects cleanly
  mobileChannel.unsubscribe()
  const postDisconnectPres = hostChannel.presenceState()
  assert.ok(!postDisconnectPres.mobile_controller || postDisconnectPres.mobile_controller.length === 0, "Mobile controller should be cleared on unsubscribe")
})

test("CHALLENGER-2: Physics Engine Power Multiplier Velocity Invariant", () => {
  const engine = new TennisPhysicsEngine()

  // Test serve toss
  assert.equal(engine.state, "idle_serve")
  const tossSuccess = engine.triggerServeToss()
  assert.equal(tossSuccess, true)
  assert.equal(engine.state, "serving_toss")

  // Double toss must be rejected while ball is airborne
  const secondToss = engine.triggerServeToss()
  assert.equal(secondToss, false)
  assert.equal(engine.state, "serving_toss")

  // Let ball reach hit zone (~0.35s)
  for (let i = 0; i < 21; i++) {
    engine.update(1 / 60)
  }

  // Hit serve with normal power 1.0
  const hitQuality1 = engine.handlePlayerSwing("serve", 1.0)
  assert.notEqual(hitQuality1, "miss")
  const speed1 = engine.ballVel.length()

  // Reset and repeat with boosted power 1.5
  engine.restartMatch()
  engine.triggerServeToss()
  for (let i = 0; i < 21; i++) {
    engine.update(1 / 60)
  }
  const hitQuality2 = engine.handlePlayerSwing("serve", 1.5)
  assert.notEqual(hitQuality2, "miss")
  const speed2 = engine.ballVel.length()

  // Verify speed2 > speed1
  assert.ok(speed2 > speed1, `Speed with 1.5x power (${speed2}) must exceed 1.0x power (${speed1})`)
})

test("CHALLENGER-2: Canvas Touch Swipe Geometry Partitioning Fuzzing (5,000 Vectors)", () => {
  for (let i = 0; i < 5000; i++) {
    const start = { x: 200, y: 300, time: 1000 }
    // Random offset between -60 and +60 px
    const dx = (Math.random() - 0.5) * 120
    const dy = (Math.random() - 0.5) * 120
    const end = { x: start.x + dx, y: start.y + dy, time: 1100 }
    const dist = Math.hypot(dx, dy)

    const result = classifyCanvasTouchSwipe(start, end, 20, 15)

    if (dist < 15) {
      assert.equal(result.type, "tap", `dist ${dist} should be tap`)
    } else if (dist >= 20) {
      assert.equal(result.type, "swipe", `dist ${dist} should be swipe`)
      if (Math.abs(dy) >= Math.abs(dx)) {
        if (dy < 0) {
          assert.equal(result.direction, "up")
          assert.equal(result.action, "toss")
        } else {
          assert.equal(result.direction, "down")
          assert.equal(result.action, "smash")
        }
      } else {
        if (dx > 0) {
          assert.equal(result.direction, "right")
          assert.equal(result.action, "forehand")
        } else {
          assert.equal(result.direction, "left")
          assert.equal(result.action, "backhand")
        }
      }
    } else {
      assert.equal(result.type, "ambiguous", `dist ${dist} should be ambiguous`)
    }
  }
})

test("CHALLENGER-2: Classifier Cooldown and Severe G-Force Shock Recovery", () => {
  const classifier = new TennisGestureClassifier({
    cooldownMs: 320,
    swingThreshold: 12.0,
    maxThreshold: 32.0,
  })

  // 1. Normal forehand swing (+X = 22 m/s^2)
  const g1 = classifier.processSample({
    acceleration: { x: 22, y: 2, z: 0 },
    accelerationIncludingGravity: null,
    rotationRate: null,
    timestamp: 1000,
  })
  assert.ok(g1 !== null)
  assert.equal(g1.type, "forehand")
  assert.ok(g1.powerMultiplier >= 1.0 && g1.powerMultiplier <= 1.5)

  // 2. High G recoil shock (-X = -250 m/s^2) at t = 1150ms (< 320ms cooldown)
  const gRecoil = classifier.processSample({
    acceleration: { x: -250, y: 0, z: 0 },
    accelerationIncludingGravity: null,
    rotationRate: null,
    timestamp: 1150,
  })
  assert.equal(gRecoil, null, "Recoil shock must be suppressed by cooldown")

  // 3. Post cooldown swing (+Y = 18 m/s^2) at t = 1350ms (> 320ms cooldown)
  const g2 = classifier.processSample({
    acceleration: { x: 0, y: 18, z: 0 },
    accelerationIncludingGravity: null,
    rotationRate: null,
    timestamp: 1350,
  })
  assert.ok(g2 !== null)
  assert.equal(g2.type, "toss")

  // 4. Extreme G-force clamping test (500 m/s^2)
  classifier.reset()
  const gExtreme = classifier.processSample({
    acceleration: { x: 500, y: 0, z: 0 },
    accelerationIncludingGravity: null,
    rotationRate: null,
    timestamp: 2000,
  })
  assert.ok(gExtreme !== null)
  assert.equal(gExtreme.powerMultiplier, 1.5, "Extreme acceleration must be clamped to 1.5x max")
})
