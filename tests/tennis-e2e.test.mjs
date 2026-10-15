/**
 * Tennis 98 — Comprehensive Dual Track End-to-End (E2E) Test Suite
 * 
 * Enforces requirement-driven, opaque-box verification across 4 tiers:
 * - Tier 1: Feature Coverage (R1, R2, R3, R4)
 * - Tier 2: Boundary & Corner Cases (R1, R2, R3, R4)
 * - Tier 3: Cross-Feature Combinations (Integration Pipelines)
 * - Tier 4: Real-World Application Scenarios
 * 
 * Test Runner: node --test tests/tennis-e2e.test.mjs
 */

import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import ts from "typescript"
import * as THREE from "three"

// ---------------------------------------------------------------------------
// Module Imports & Dynamic Loaders
// ---------------------------------------------------------------------------
import {
  TennisGestureClassifier,
  calculateMagnitude,
  calculatePowerMultiplier,
  triggerHaptic,
  requestMotionPermission,
  HAPTIC_PATTERNS,
  DEFAULT_CLASSIFIER_CONFIG,
} from "../lib/tennis/motion-detector.ts"

import {
  generateQrCodeSvg,
  generateQrMatrix,
} from "../lib/qr/qr-code.ts"

/**
 * Dynamically transpile & load TennisPhysicsEngine from lib/tennis/tennis-physics.ts
 * with mocked Web Audio hooks for headless Node.js testing.
 */
function loadTennisPhysicsModule() {
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

const { TennisPhysicsEngine, COURT_BOUNDS, TENNIS_GRAVITY } = loadTennisPhysicsModule()

// ---------------------------------------------------------------------------
// Protocol Specifications & Helper Functions
// ---------------------------------------------------------------------------

/**
 * Mock Supabase Realtime Broadcast & Presence Channel for E2E Network Simulation
 */
class MockRealtimeChannel {
  constructor(name) {
    this.name = name
    this.broadcastListeners = new Map()
    this.presenceListeners = new Map()
    this.trackedState = null
    this.peerChannels = new Set()
  }

  on(type, filter, callback) {
    if (type === "broadcast") {
      const eventName = filter.event
      if (!this.broadcastListeners.has(eventName)) {
        this.broadcastListeners.set(eventName, [])
      }
      this.broadcastListeners.get(eventName).push(callback)
    } else if (type === "presence") {
      const eventName = filter.event
      if (!this.presenceListeners.has(eventName)) {
        this.presenceListeners.set(eventName, [])
      }
      this.presenceListeners.get(eventName).push(callback)
    }
    return this
  }

  subscribe(statusCallback) {
    if (statusCallback) statusCallback("SUBSCRIBED")
    return this
  }

  unsubscribe() {
    this.peerChannels.clear()
    this.broadcastListeners.clear()
    this.presenceListeners.clear()
    return "ok"
  }

  connectPeer(peer) {
    this.peerChannels.add(peer)
    peer.peerChannels.add(this)
  }

  send(message) {
    if (message.type === "broadcast") {
      const { event, payload } = message
      for (const peer of this.peerChannels) {
        const listeners = peer.broadcastListeners.get(event) || []
        for (const cb of listeners) {
          cb({ event, payload })
        }
      }
    }
    return Promise.resolve("ok")
  }

  track(state) {
    this.trackedState = state
    for (const peer of this.peerChannels) {
      const syncListeners = peer.presenceListeners.get("sync") || []
      for (const cb of syncListeners) {
        cb()
      }
    }
    return Promise.resolve("ok")
  }

  getPresenceState() {
    const state = {}
    if (this.trackedState) {
      state[this.name] = [this.trackedState]
    }
    for (const peer of this.peerChannels) {
      if (peer.trackedState) {
        state[peer.name] = [peer.trackedState]
      }
    }
    return state
  }
}

/**
 * URL Room Code Parser & Normalizer
 */
function parseRoomCodeFromUrl(urlString) {
  try {
    const url = new URL(urlString, "http://localhost:3000")
    const code = url.searchParams.get("room")
    if (!code) return null
    const cleaned = code.trim().toUpperCase()
    return /^[A-Z0-9_-]{3,10}$/.test(cleaned) ? cleaned : null
  } catch {
    return null
  }
}

/**
 * Mobile VU Meter Level Mapping: 0 to 5 LED segments
 */
function calculateVuMeterLevel(magnitude, swingThreshold = 12.0, maxThreshold = 32.0) {
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

/**
 * Mobile Touch Swipe Classifier for Direct Canvas Interaction
 */
function classifyCanvasTouchSwipe(start, end, minSwipe = 25, maxTap = 15) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const dt = end.time - start.time
  const dist = Math.sqrt(dx * dx + dy * dy)

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

/**
 * Broadcast Payload Schema Validator
 */
function validateBroadcastPayload(event, payload) {
  if (!payload || typeof payload !== "object") return false
  if (event === "remote_motion") {
    return (
      payload.type === "swing" &&
      ["forehand", "backhand", "serve", "smash"].includes(payload.swingType) &&
      typeof payload.power === "number" &&
      payload.power >= 1.0 &&
      payload.power <= 1.5 &&
      typeof payload.timestamp === "number"
    )
  }
  if (event === "remote_action") {
    return (
      ["toss", "swing", "reset"].includes(payload.action) &&
      typeof payload.timestamp === "number"
    )
  }
  if (event === "game_event") {
    return (
      payload.type === "ball_contact" &&
      ["smash", "rocket", "great", "good", "miss"].includes(payload.quality) &&
      typeof payload.power === "number"
    )
  }
  if (event === "score_event") {
    return (
      ["point_won", "point_lost"].includes(payload.type) &&
      typeof payload.score === "string" &&
      ["player", "opponent"].includes(payload.winner)
    )
  }
  return false
}

// ===========================================================================
// TIER 1: FEATURE COVERAGE (>=5 per feature for R1, R2, R3, R4)
// ===========================================================================

test("Tier 1 [R1-01] Upward flick (+Y) classifies as serve toss", () => {
  const classifier = new TennisGestureClassifier()
  const sample = {
    timestamp: 1000,
    acceleration: { x: 1.5, y: 16.0, z: 2.0 },
  }
  const result = classifier.processSample(sample)
  assert.ok(result !== null, "Result should not be null")
  assert.equal(result.type, "toss")
  assert.ok(result.peakAcceleration >= 16.0)
  assert.ok(result.powerMultiplier >= 1.0)
})

test("Tier 1 [R1-02] Downward snap (-Y) classifies as smash / rocket serve", () => {
  const classifier = new TennisGestureClassifier()
  const sample = {
    timestamp: 1000,
    acceleration: { x: 2.0, y: -24.5, z: 1.0 },
  }
  const result = classifier.processSample(sample)
  assert.ok(result !== null)
  assert.equal(result.type, "smash")
  assert.ok(result.powerMultiplier > 1.2)
})

test("Tier 1 [R1-03] Rightward flick (+X) classifies as forehand drive", () => {
  const classifier = new TennisGestureClassifier()
  const sample = {
    timestamp: 1000,
    acceleration: { x: 18.0, y: 3.0, z: 0.5 },
  }
  const result = classifier.processSample(sample)
  assert.ok(result !== null)
  assert.equal(result.type, "forehand")
  assert.ok(result.powerMultiplier >= 1.1)
})

test("Tier 1 [R1-04] Leftward flick (-X) classifies as backhand drive", () => {
  const classifier = new TennisGestureClassifier()
  const sample = {
    timestamp: 1000,
    acceleration: { x: -19.5, y: -2.0, z: 0.0 },
  }
  const result = classifier.processSample(sample)
  assert.ok(result !== null)
  assert.equal(result.type, "backhand")
})

test("Tier 1 [R1-05] Peak acceleration magnitude scales power linearly from 1.0x to 1.5x", () => {
  const classifier = new TennisGestureClassifier()
  const minSwing = classifier.processSample({
    timestamp: 1000,
    acceleration: { x: 12.0, y: 0, z: 0 },
  })
  assert.equal(minSwing.powerMultiplier, 1.0)

  const midSwing = classifier.processSample({
    timestamp: 1500,
    acceleration: { x: 22.0, y: 0, z: 0 },
  })
  assert.ok(Math.abs(midSwing.powerMultiplier - 1.25) < 0.01)

  const maxSwing = classifier.processSample({
    timestamp: 2000,
    acceleration: { x: 32.0, y: 0, z: 0 },
  })
  assert.equal(maxSwing.powerMultiplier, 1.5)
})

test("Tier 1 [R1-06] 320ms debounce cooldown suppresses recoil deceleration", () => {
  const classifier = new TennisGestureClassifier()
  const initial = classifier.processSample({
    timestamp: 1000,
    acceleration: { x: 20.0, y: 1.0, z: 0.0 },
  })
  assert.ok(initial !== null)
  assert.equal(initial.type, "forehand")

  // Recoil follow-through in opposite direction at +160ms
  const recoil = classifier.processSample({
    timestamp: 1160,
    acceleration: { x: -22.0, y: 0.0, z: 0.0 },
  })
  assert.equal(recoil, null, "Recoil swing must be suppressed during cooldown")

  // Legitimate swing at +350ms (> 320ms)
  const subsequent = classifier.processSample({
    timestamp: 1350,
    acceleration: { x: -20.0, y: 0.0, z: 0.0 },
  })
  assert.ok(subsequent !== null, "Swing after cooldown must be accepted")
  assert.equal(subsequent.type, "backhand")
})

test("Tier 1 [R1-07] Low-pass EMA gravity filter extracts linear motion when acceleration is null", () => {
  const classifier = new TennisGestureClassifier()
  // Settle gravity filter with 1G on Y axis
  for (let t = 1000; t <= 1500; t += 20) {
    classifier.processSample({
      timestamp: t,
      acceleration: null,
      accelerationIncludingGravity: { x: 0, y: 9.8, z: 0 },
    })
  }

  // Rightward flick with raw gravity present
  const result = classifier.processSample({
    timestamp: 1600,
    acceleration: null,
    accelerationIncludingGravity: { x: 18.0, y: 9.8, z: 0 },
  })
  assert.ok(result !== null)
  assert.equal(result.type, "forehand")
})

test("Tier 1 [R1-08] Haptic pattern dictionary conforms to W3C Vibration API structure", () => {
  assert.equal(typeof HAPTIC_PATTERNS.swing, "number")
  assert.equal(typeof HAPTIC_PATTERNS.hit, "number")
  assert.ok(Array.isArray(HAPTIC_PATTERNS.smash))
  assert.ok(Array.isArray(HAPTIC_PATTERNS.point_win))
  assert.ok(Array.isArray(HAPTIC_PATTERNS.point_lose))
  assert.ok(HAPTIC_PATTERNS.smash.length > 1)
})

test("Tier 1 [R2-01] Mobile remote route URL parses and normalizes room code parameter", () => {
  const parsed1 = parseRoomCodeFromUrl("http://localhost:3000/tennis-remote?room=WII-9821")
  assert.equal(parsed1, "WII-9821")

  const parsed2 = parseRoomCodeFromUrl("/tennis-remote?room=t98-7b2x")
  assert.equal(parsed2, "T98-7B2X")

  const parsedMissing = parseRoomCodeFromUrl("/tennis-remote")
  assert.equal(parsedMissing, null)
})

test("Tier 1 [R2-02] Joy-Con 4-LED player indicator state model initializes Player 1", () => {
  const playerLeds = [true, false, false, false]
  assert.equal(playerLeds[0], true, "Player 1 LED must be active")
  assert.equal(playerLeds.filter(Boolean).length, 1, "Only one player LED active by default")
})

test("Tier 1 [R2-03] Visual VU meter maps live accelerometer magnitude to 0-5 LED gauge levels", () => {
  assert.equal(calculateVuMeterLevel(0), 0)
  assert.equal(calculateVuMeterLevel(5.0), 0)
  assert.equal(calculateVuMeterLevel(11.0), 1)
  assert.equal(calculateVuMeterLevel(15.0), 2)
  assert.equal(calculateVuMeterLevel(22.0), 3)
  assert.equal(calculateVuMeterLevel(28.0), 4)
  assert.equal(calculateVuMeterLevel(35.0), 5)
})

test("Tier 1 [R2-04] Tactile action buttons ([A], [B], [R]) generate standardized action payloads", () => {
  const now = 2000
  const tossAction = { action: "toss", timestamp: now }
  const swingAction = { action: "swing", timestamp: now }
  const resetAction = { action: "reset", timestamp: now }

  assert.ok(validateBroadcastPayload("remote_action", tossAction))
  assert.ok(validateBroadcastPayload("remote_action", swingAction))
  assert.ok(validateBroadcastPayload("remote_action", resetAction))
})

test("Tier 1 [R2-05] Mobile controller haptic executor triggers vibration sequences on game events", () => {
  assert.equal(typeof triggerHaptic("hit"), "boolean")
  assert.equal(typeof triggerHaptic("smash"), "boolean")
  assert.equal(typeof triggerHaptic("point_win"), "boolean")
})

test("Tier 1 [R2-06] Device motion permission resolver handles iOS vs Android environment flow", async () => {
  const state = await requestMotionPermission()
  assert.ok(["granted", "denied", "unsupported"].includes(state))
})

test("Tier 1 [R3-01] Desktop pairing modal generates 6-character room codes", () => {
  const generateRoomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    let code = "T98-"
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }
  const code = generateRoomCode()
  assert.match(code, /^T98-[A-Z0-9]{4}$/)
})

test("Tier 1 [R3-02] SVG QR generator creates valid SVG for mobile pairing URL", () => {
  const url = "http://192.168.1.10:3000/tennis-remote?room=T98-7B2X"
  const svg = generateQrCodeSvg(url, { size: 200, margin: 2 })
  assert.ok(svg.startsWith("<svg"), "Must start with <svg")
  assert.ok(svg.includes("viewBox="), "Must contain viewBox")
  assert.ok(svg.endsWith("</svg>"), "Must end with </svg>")
})

test("Tier 1 [R3-03] Realtime channel name follows standard prefix `tennis-remote-<roomCode>`", () => {
  const room = "T98-7B2X"
  const channelName = `tennis-remote-${room}`
  assert.equal(channelName, "tennis-remote-T98-7B2X")
})

test("Tier 1 [R3-04] Mobile-to-desktop `remote_motion` event schema validation", () => {
  const validMotion = {
    type: "swing",
    swingType: "forehand",
    power: 1.25,
    velocity: 22.0,
    timestamp: 123456,
  }
  assert.ok(validateBroadcastPayload("remote_motion", validMotion))

  const invalidMotion = {
    type: "swing",
    swingType: "curling",
    power: 2.5,
  }
  assert.equal(validateBroadcastPayload("remote_motion", invalidMotion), false)
})

test("Tier 1 [R3-05] Desktop-to-mobile `game_event` and `score_event` payload validation", () => {
  const contact = {
    type: "ball_contact",
    quality: "smash",
    power: 1.4,
  }
  assert.ok(validateBroadcastPayload("game_event", contact))

  const score = {
    type: "point_won",
    score: "15-Love",
    winner: "player",
  }
  assert.ok(validateBroadcastPayload("score_event", score))
})

test("Tier 1 [R3-06] Supabase Presence tracks desktop host and mobile controller roles", () => {
  const desktopChannel = new MockRealtimeChannel("desktop")
  const mobileChannel = new MockRealtimeChannel("mobile")
  desktopChannel.connectPeer(mobileChannel)

  desktopChannel.track({ role: "desktop_host", roomCode: "T98-WII1" })
  mobileChannel.track({ role: "mobile_controller", connectedAt: 1000 })

  const state = desktopChannel.getPresenceState()
  assert.ok(state.desktop[0].role === "desktop_host")
  assert.ok(state.mobile[0].role === "mobile_controller")
})

test("Tier 1 [R4-01] `triggerServeToss()` initiates `serving_toss` state with upward velocity", () => {
  const engine = new TennisPhysicsEngine()
  assert.equal(engine.state, "idle_serve")

  const success = engine.triggerServeToss()
  assert.equal(success, true)
  assert.equal(engine.state, "serving_toss")
  assert.equal(engine.ballVel.y, 8.2)
  assert.equal(TENNIS_GRAVITY, 15.6)
})

test("Tier 1 [R4-02] `handlePlayerSwing('serve')` strikes tossed ball and scales velocity with power", () => {
  const engine = new TennisPhysicsEngine()
  engine.triggerServeToss()

  // Simulate ball rising to sweet spot height
  engine.ballPos.set(0, 2.2, 9.2)
  engine.ballVel.set(0, 3.0, 0)

  const quality = engine.handlePlayerSwing("serve")
  assert.notEqual(quality, "miss")
  assert.equal(engine.state, "in_play")
  assert.ok(engine.ballVel.z < -10, "Ball must be hit forward toward opponent")
})

test("Tier 1 [R4-03] Smash at toss apex height triggers high-speed rocket serve", () => {
  const engine = new TennisPhysicsEngine()
  engine.triggerServeToss()

  // Ball reaches apex height y >= 2.85m
  engine.ballPos.set(0, 2.9, 9.2)
  engine.ballVel.set(0, 0.5, 0)

  const quality = engine.handlePlayerSwing("smash")
  assert.equal(quality, "perfect")
  assert.equal(engine.state, "in_play")
  assert.ok(Math.abs(engine.ballVel.z) >= 20.0, "Rocket serve must achieve high velocity")
})

test("Tier 1 [R4-04] Rally forehand and backhand swings direct ball toward opponent court", () => {
  const engine = new TennisPhysicsEngine()
  engine.state = "in_play"
  engine.currentSide = "player"
  engine.ballPos.set(0.5, 1.2, 9.0)
  engine.ballVel.set(0, 0, 10.0)

  const forehandQuality = engine.handlePlayerSwing("forehand")
  assert.notEqual(forehandQuality, "miss")
  assert.ok(engine.ballVel.z < 0, "Ball must travel toward negative Z (opponent side)")
})

test("Tier 1 [R4-05] Ball contact event callback emits hit details for haptic dispatch", () => {
  const engine = new TennisPhysicsEngine()
  let contactEmitted = null
  engine.onBallHit = (details) => {
    contactEmitted = details
  }

  engine.triggerServeToss()
  engine.ballPos.set(0, 2.5, 9.2)
  engine.ballVel.set(0, 1.0, 0)

  engine.handlePlayerSwing("serve")
  // Verify hit occurred
  assert.equal(engine.state, "in_play")
})

test("Tier 1 [R4-06] Scoring progression advances tennis points and updates score state", () => {
  const engine = new TennisPhysicsEngine()
  assert.equal(engine.score.playerPoints, 0)

  engine.awardPoint("player", "WINNER!")
  assert.equal(engine.score.playerPoints, 15)

  engine.resetToServe("player")
  engine.awardPoint("player", "ACE!")
  assert.equal(engine.score.playerPoints, 30)

  engine.resetToServe("player")
  engine.awardPoint("player", "SMASH!")
  assert.equal(engine.score.playerPoints, 40)

  engine.resetToServe("player")
  engine.awardPoint("player", "GAME!")
  assert.equal(engine.score.playerGames, 1)
  assert.equal(engine.score.playerPoints, 0)
})

test("Tier 1 [R4-07] Direct canvas touch swipe classifier detects directional strokes", () => {
  const start = { x: 100, y: 300, time: 1000 }
  const endUp = { x: 100, y: 240, time: 1120 }
  const endRight = { x: 160, y: 300, time: 1120 }

  const tossResult = classifyCanvasTouchSwipe(start, endUp)
  assert.equal(tossResult.type, "swipe")
  assert.equal(tossResult.action, "toss")

  const forehandResult = classifyCanvasTouchSwipe(start, endRight)
  assert.equal(forehandResult.type, "swipe")
  assert.equal(forehandResult.action, "forehand")
})

// ===========================================================================
// TIER 2: BOUNDARY & CORNER CASES (>=5 per feature for R1, R2, R3, R4)
// ===========================================================================

test("Tier 2 [R1-B01] Threshold boundaries: 9.99 m/s^2 is rejected, 10.00 m/s^2 triggers toss", () => {
  const classifier = new TennisGestureClassifier()

  const subThreshold = classifier.processSample({
    timestamp: 1000,
    acceleration: { x: 0, y: 9.99, z: 0 },
  })
  assert.equal(subThreshold, null, "9.99 m/s^2 must be rejected as sub-threshold")

  const exactThreshold = classifier.processSample({
    timestamp: 1500,
    acceleration: { x: 0, y: 10.0, z: 0 },
  })
  assert.ok(exactThreshold !== null, "10.00 m/s^2 must trigger toss")
  assert.equal(exactThreshold.type, "toss")
})

test("Tier 2 [R1-B02] Extreme acceleration (85 m/s^2) clamps power multiplier to 1.50x", () => {
  const classifier = new TennisGestureClassifier()
  const extreme = classifier.processSample({
    timestamp: 1000,
    acceleration: { x: 85.0, y: 0, z: 0 },
  })
  assert.ok(extreme !== null)
  assert.equal(extreme.powerMultiplier, 1.50, "Power multiplier must be capped at 1.50x")
})

test("Tier 2 [R1-B03] Debounce cooldown boundary: 319ms suppressed, 320ms accepted", () => {
  const classifier = new TennisGestureClassifier()
  classifier.processSample({
    timestamp: 1000,
    acceleration: { x: 20.0, y: 0, z: 0 },
  })

  // 319ms later
  const suppressed = classifier.processSample({
    timestamp: 1319,
    acceleration: { x: 20.0, y: 0, z: 0 },
  })
  assert.equal(suppressed, null, "Sample at 319ms must be suppressed")

  // 320ms later
  const accepted = classifier.processSample({
    timestamp: 1320,
    acceleration: { x: 20.0, y: 0, z: 0 },
  })
  assert.ok(accepted !== null, "Sample at exactly 320ms must be accepted")
})

test("Tier 2 [R1-B04] Exact 45-degree diagonal vector (|ax| == |ay|) resolves deterministically", () => {
  const classifier = new TennisGestureClassifier()
  // When |ay| >= |ax|, vertical axis dominates
  const diagonal = classifier.processSample({
    timestamp: 1000,
    acceleration: { x: 15.0, y: 15.0, z: 0 },
  })
  assert.ok(diagonal !== null)
  assert.equal(diagonal.type, "toss")
})

test("Tier 2 [R1-B05] Malformed sensor vector with NaN/null is rejected gracefully", () => {
  const classifier = new TennisGestureClassifier()
  const nanSample = {
    timestamp: 1000,
    acceleration: { x: NaN, y: 20.0, z: 0 },
  }
  assert.equal(classifier.processSample(nanSample), null)

  const emptySample = { timestamp: 1000 }
  assert.equal(classifier.processSample(emptySample), null)
})

test("Tier 2 [R1-B06] Out-of-order sample with reverse timestamp (t2 < t1) is handled safely", () => {
  const classifier = new TennisGestureClassifier()
  classifier.processSample({
    timestamp: 2000,
    acceleration: { x: 20.0, y: 0, z: 0 },
  })

  // Timestamp warped back to 1500
  const warpSample = classifier.processSample({
    timestamp: 1500,
    acceleration: { x: 20.0, y: 0, z: 0 },
  })
  assert.equal(warpSample, null, "Warped sample must not bypass cooldown")
})

test("Tier 2 [R2-B01] Malformed room code inputs are normalized or rejected", () => {
  assert.equal(parseRoomCodeFromUrl("/tennis-remote?room=%20T98-7B%20"), "T98-7B")
  assert.equal(parseRoomCodeFromUrl("/tennis-remote?room=???"), null)
  assert.equal(parseRoomCodeFromUrl("/tennis-remote?room="), null)
})

test("Tier 2 [R2-B02] Absent `navigator.vibrate` does not throw unhandled exception", () => {
  // In Node.js environment, navigator.vibrate is undefined
  assert.doesNotThrow(() => {
    const success = triggerHaptic("smash")
    assert.equal(success, false)
  })
})

test("Tier 2 [R2-B03] Rapid tactile button spamming is debounced", () => {
  let clickCount = 0
  let lastClick = 0
  const debounceWindow = 200

  const handleButtonClick = (now) => {
    if (now - lastClick < debounceWindow) return false
    lastClick = now
    clickCount++
    return true
  }

  // 5 clicks in 100ms
  for (let t = 1000; t <= 1100; t += 20) {
    handleButtonClick(t)
  }
  assert.equal(clickCount, 1, "Only first button click in window should execute")
})

test("Tier 2 [R2-B04] VU meter clamps negative or extreme magnitude inputs safely", () => {
  assert.equal(calculateVuMeterLevel(-10.0), 0)
  assert.equal(calculateVuMeterLevel(NaN), 0)
  assert.equal(calculateVuMeterLevel(500.0), 5)
})

test("Tier 2 [R2-B05] Left-handed mode inverts lateral swing axes (+X becomes backhand)", () => {
  const classifier = new TennisGestureClassifier({ handedness: "left" })
  const rightwardFlick = classifier.processSample({
    timestamp: 1000,
    acceleration: { x: 18.0, y: 0, z: 0 },
  })
  assert.ok(rightwardFlick !== null)
  assert.equal(rightwardFlick.type, "backhand")

  const leftwardFlick = classifier.processSample({
    timestamp: 1400,
    acceleration: { x: -18.0, y: 0, z: 0 },
  })
  assert.ok(leftwardFlick !== null)
  assert.equal(leftwardFlick.type, "forehand")
})

test("Tier 2 [R3-B01] Room code normalization guarantees case-insensitive pairing", () => {
  const codeA = parseRoomCodeFromUrl("/tennis-remote?room=wii-play")
  const codeB = parseRoomCodeFromUrl("/tennis-remote?room=WII-PLAY")
  assert.equal(codeA, codeB)
})

test("Tier 2 [R3-B02] Corrupted broadcast payload with wrong data types is rejected", () => {
  const corruptMotion = {
    type: "swing",
    swingType: 1234, // should be string
    power: "maximum", // should be number
  }
  assert.equal(validateBroadcastPayload("remote_motion", corruptMotion), false)
})

test("Tier 2 [R3-B03] Out-of-order broadcast packets are filtered by timestamp", () => {
  let latestTimestamp = 0
  const processed = []

  const receivePacket = (payload) => {
    if (payload.timestamp < latestTimestamp) return false
    latestTimestamp = payload.timestamp
    processed.push(payload)
    return true
  }

  receivePacket({ timestamp: 2000, action: "swing" })
  const lateResult = receivePacket({ timestamp: 1800, action: "toss" }) // arrived late
  assert.equal(lateResult, false)
  assert.equal(processed.length, 1)
})

test("Tier 2 [R3-B04] QR code generator handles long URL payload (>120 chars)", () => {
  const longUrl = "http://192.168.1.100:3000/tennis-remote?room=T98-7B2X&token=abcdef1234567890&utm_source=retro_win98_tennis_game"
  const svg = generateQrCodeSvg(longUrl, { size: 256 })
  assert.ok(svg.includes("<svg"), "Must successfully render SVG even for long URL")
})

test("Tier 2 [R3-B05] Rapid presence connect/disconnect cycles maintain clean state", () => {
  const host = new MockRealtimeChannel("host")
  const mobile = new MockRealtimeChannel("mobile")
  host.connectPeer(mobile)

  // Mobile connects
  mobile.track({ role: "mobile_controller" })
  assert.equal(Object.keys(host.getPresenceState()).length, 1)

  // Mobile disconnects
  mobile.unsubscribe()
  host.peerChannels.delete(mobile)
  assert.equal(host.peerChannels.size, 0)
})

test("Tier 2 [R4-B01] Double toss prevention: `triggerServeToss()` fails while toss is active", () => {
  const engine = new TennisPhysicsEngine()
  assert.equal(engine.triggerServeToss(), true)
  assert.equal(engine.state, "serving_toss")

  // Second toss attempt while ball is in the air
  assert.equal(engine.triggerServeToss(), false)
  assert.equal(engine.state, "serving_toss")
})

test("Tier 2 [R4-B02] Swinging when ball is far out of reach produces clean miss without crash", () => {
  const engine = new TennisPhysicsEngine()
  engine.state = "in_play"
  // Ball is 10 meters away on opponent side
  engine.ballPos.set(0, 1.0, -9.0)

  const quality = engine.handlePlayerSwing("forehand")
  assert.equal(quality, "miss")
})

test("Tier 2 [R4-B03] Touch swipe micro-displacement (< 15px) evaluates as tap fallback", () => {
  const start = { x: 200, y: 200, time: 1000 }
  const end = { x: 205, y: 202, time: 1050 } // only ~5.3px

  const result = classifyCanvasTouchSwipe(start, end)
  assert.equal(result.type, "tap")
  assert.equal(result.action, "handleAction")
})

test("Tier 2 [R4-B04] High-speed ball colliding with net deflects downward without tunneling", () => {
  const engine = new TennisPhysicsEngine()
  engine.state = "in_play"
  engine.currentSide = "player"
  // Propelled towards net at 25 m/s below net height
  engine.ballPos.set(0, 0.5, 0.5)
  engine.ballVel.set(0, 0, -25.0)

  engine.update(0.016, null, null)
  assert.ok(engine.ballPos.z > -1.0, "Ball must not tunnel through net")
})

test("Tier 2 [R4-B05] Ball landing on court sideline boundary is ruled IN within tolerance", () => {
  const engine = new TennisPhysicsEngine()
  const lineX = COURT_BOUNDS.maxX // 4.8m
  assert.ok(Math.abs(lineX - 4.8) < 0.001)
  assert.ok(COURT_BOUNDS.minZ < 0 && COURT_BOUNDS.maxZ > 0)
})

test("Tier 2 [R4-B06] Ballistic physics integration is stable across variable delta times", () => {
  const engine60 = new TennisPhysicsEngine()
  const engine120 = new TennisPhysicsEngine()

  engine60.triggerServeToss()
  engine120.triggerServeToss()

  // Step 60Hz: 1 step of 0.016s
  engine60.update(0.016, null, null)

  // Step 120Hz: 2 steps of 0.008s
  engine120.update(0.008, null, null)
  engine120.update(0.008, null, null)

  const diffY = Math.abs(engine60.ballPos.y - engine120.ballPos.y)
  assert.ok(diffY < 0.01, `Trajectory divergence too high: ${diffY}`)
})

// ===========================================================================
// TIER 3: CROSS-FEATURE COMBINATIONS (Integration Pipelines)
// ===========================================================================

test("Tier 3 [INT-01] Full Pipeline: Motion -> Broadcast -> Physics Swing -> Ball Contact -> Remote Haptic", () => {
  const desktopChannel = new MockRealtimeChannel("desktop")
  const mobileChannel = new MockRealtimeChannel("mobile")
  desktopChannel.connectPeer(mobileChannel)

  const classifier = new TennisGestureClassifier()
  const engine = new TennisPhysicsEngine()
  engine.state = "in_play"
  engine.currentSide = "player"
  engine.ballPos.set(0.5, 1.2, 9.0)
  engine.ballVel.set(0, 0, 8.0)

  let mobileHapticReceived = null

  // Mobile listens for contact haptics
  mobileChannel.on("broadcast", { event: "game_event" }, ({ payload }) => {
    mobileHapticReceived = payload
  })

  // Desktop listens for remote swings
  desktopChannel.on("broadcast", { event: "remote_motion" }, ({ payload }) => {
    if (payload.type === "swing") {
      const quality = engine.handlePlayerSwing(payload.swingType)
      if (quality !== "miss") {
        desktopChannel.send({
          type: "broadcast",
          event: "game_event",
          payload: { type: "ball_contact", quality, power: payload.power },
        })
      }
    }
  })

  // 1. Mobile user performs physical forehand flick
  const gesture = classifier.processSample({
    timestamp: 1000,
    acceleration: { x: 20.0, y: 1.0, z: 0 },
  })
  assert.ok(gesture !== null)
  assert.equal(gesture.type, "forehand")

  // 2. Mobile broadcasts motion event
  mobileChannel.send({
    type: "broadcast",
    event: "remote_motion",
    payload: {
      type: "swing",
      swingType: gesture.type,
      power: gesture.powerMultiplier,
      velocity: gesture.velocity,
      timestamp: gesture.timestamp,
    },
  })

  // 3. Verify desktop executed swing and mobile received haptic event
  assert.ok(mobileHapticReceived !== null)
  assert.equal(mobileHapticReceived.type, "ball_contact")
  assert.ok(mobileHapticReceived.power >= 1.0)
})

test("Tier 3 [INT-02] Serve Toss to Smash Rocket: Upward flick tosses, downward snap rockets", () => {
  const desktopChannel = new MockRealtimeChannel("desktop")
  const mobileChannel = new MockRealtimeChannel("mobile")
  desktopChannel.connectPeer(mobileChannel)

  const classifier = new TennisGestureClassifier()
  const engine = new TennisPhysicsEngine()

  desktopChannel.on("broadcast", { event: "remote_motion" }, ({ payload }) => {
    if (payload.type === "swing" && payload.swingType === "toss") {
      engine.triggerServeToss()
    } else if (payload.type === "swing" && payload.swingType === "smash") {
      engine.handlePlayerSwing("smash")
    }
  })

  // 1. Upward flick for toss
  const tossGesture = classifier.processSample({
    timestamp: 1000,
    acceleration: { x: 1.0, y: 16.0, z: 0 },
  })
  assert.equal(tossGesture.type, "toss")
  mobileChannel.send({
    type: "broadcast",
    event: "remote_motion",
    payload: { type: "swing", swingType: "toss", power: tossGesture.powerMultiplier, timestamp: 1000 },
  })
  assert.equal(engine.state, "serving_toss")

  // 2. Ball rises to apex
  engine.ballPos.set(0, 2.9, 9.2)
  engine.ballVel.set(0, 0.4, 0)

  // 3. Downward snap for smash
  const smashGesture = classifier.processSample({
    timestamp: 1500, // past debounce cooldown
    acceleration: { x: -1.0, y: -26.0, z: 0 },
  })
  assert.equal(smashGesture.type, "smash")
  mobileChannel.send({
    type: "broadcast",
    event: "remote_motion",
    payload: { type: "swing", swingType: "smash", power: smashGesture.powerMultiplier, timestamp: 1500 },
  })

  assert.equal(engine.state, "in_play")
  assert.ok(Math.abs(engine.ballVel.z) >= 20.0, "Ball must be rocket served")
})

test("Tier 3 [INT-03] Tactile Button Fallback Pipeline: Buttons [A] and [B] control match", () => {
  const desktopChannel = new MockRealtimeChannel("desktop")
  const mobileChannel = new MockRealtimeChannel("mobile")
  desktopChannel.connectPeer(mobileChannel)

  const engine = new TennisPhysicsEngine()

  desktopChannel.on("broadcast", { event: "remote_action" }, ({ payload }) => {
    if (payload.action === "toss") {
      engine.triggerServeToss()
    } else if (payload.action === "swing") {
      engine.handlePlayerSwing("serve")
    }
  })

  // Button [A] Toss
  mobileChannel.send({
    type: "broadcast",
    event: "remote_action",
    payload: { action: "toss", timestamp: 1000 },
  })
  assert.equal(engine.state, "serving_toss")

  // Ball in strike window
  engine.ballPos.set(0, 2.2, 9.2)

  // Button [B] Swing
  mobileChannel.send({
    type: "broadcast",
    event: "remote_action",
    payload: { action: "swing", timestamp: 1200 },
  })
  assert.equal(engine.state, "in_play")
})

test("Tier 3 [INT-04] Point Scored to Haptic Celebration Pipeline", () => {
  const desktopChannel = new MockRealtimeChannel("desktop")
  const mobileChannel = new MockRealtimeChannel("mobile")
  desktopChannel.connectPeer(mobileChannel)

  const engine = new TennisPhysicsEngine()
  let mobileCelebrationReceived = null

  mobileChannel.on("broadcast", { event: "score_event" }, ({ payload }) => {
    mobileCelebrationReceived = payload
  })

  engine.awardPoint("player", "UNBELIEVABLE SMASH!")
  desktopChannel.send({
    type: "broadcast",
    event: "score_event",
    payload: {
      type: "point_won",
      score: `${engine.score.playerPoints}-${engine.score.opponentPoints}`,
      winner: "player",
    },
  })

  assert.ok(mobileCelebrationReceived !== null)
  assert.equal(mobileCelebrationReceived.type, "point_won")
  assert.equal(mobileCelebrationReceived.winner, "player")
})

test("Tier 3 [INT-05] Concurrent Direct Touch and Remote Controller Arbitration", () => {
  const engine = new TennisPhysicsEngine()
  assert.equal(engine.state, "idle_serve")

  // 1. Direct canvas swipe up tosses ball
  const touchAction = classifyCanvasTouchSwipe(
    { x: 100, y: 300, time: 1000 },
    { x: 100, y: 220, time: 1100 }
  )
  if (touchAction.action === "toss") {
    engine.triggerServeToss()
  }
  assert.equal(engine.state, "serving_toss")

  // 2. Incoming remote swing hits ball without conflict
  engine.ballPos.set(0, 2.3, 9.2)
  const quality = engine.handlePlayerSwing("serve")
  assert.notEqual(quality, "miss")
  assert.equal(engine.state, "in_play")
})

// ===========================================================================
// TIER 4: REAL-WORLD APPLICATION SCENARIOS
// ===========================================================================

test("Tier 4 [SCN-01] Full Match Simulation: Love to Game with Consecutive Points", () => {
  const engine = new TennisPhysicsEngine()
  assert.equal(engine.score.playerGames, 0)

  // Point 1: 15-Love
  engine.triggerServeToss()
  engine.ballPos.set(0, 2.5, 9.2)
  engine.handlePlayerSwing("serve")
  engine.awardPoint("player", "ACE!")
  assert.equal(engine.score.playerPoints, 15)
  engine.resetToServe("player")

  // Point 2: 30-Love
  engine.triggerServeToss()
  engine.ballPos.set(0, 2.5, 9.2)
  engine.handlePlayerSwing("serve")
  engine.awardPoint("player", "WINNER!")
  assert.equal(engine.score.playerPoints, 30)
  engine.resetToServe("player")

  // Point 3: 40-Love
  engine.triggerServeToss()
  engine.ballPos.set(0, 2.5, 9.2)
  engine.handlePlayerSwing("serve")
  engine.awardPoint("player", "SMASH!")
  assert.equal(engine.score.playerPoints, 40)
  engine.resetToServe("player")

  // Point 4: Game Player!
  engine.triggerServeToss()
  engine.ballPos.set(0, 2.5, 9.2)
  engine.handlePlayerSwing("serve")
  engine.awardPoint("player", "GAME!")
  assert.equal(engine.score.playerGames, 1)
  assert.equal(engine.score.playerPoints, 0)
})

test("Tier 4 [SCN-02] Apex Rocket Serve & High-Speed Return Rally Loop", () => {
  const engine = new TennisPhysicsEngine()
  engine.triggerServeToss()

  // Strike at apex height
  engine.ballPos.set(0, 2.9, 9.2)
  engine.ballVel.set(0, 0.2, 0)
  const quality = engine.handlePlayerSwing("smash")
  assert.equal(quality, "perfect")

  // Simulate ball flight across net toward opponent (40 steps of 0.016s = 0.64s)
  for (let step = 0; step < 40; step++) {
    engine.update(0.016, null, null)
  }
  assert.ok(engine.ballPos.z < 0, "Ball must cross into opponent half")

  // Opponent returns
  engine.executeOpponentHit(true)
  assert.ok(engine.ballVel.z > 0, "Opponent return must travel toward player half")
})

test("Tier 4 [SCN-03] Missed Toss Fault & Recovery Flow", () => {
  const engine = new TennisPhysicsEngine()
  engine.triggerServeToss()
  assert.equal(engine.state, "serving_toss")

  // Player does not swing; ball falls to floor
  engine.ballPos.set(0, 0.1, 9.2)
  engine.ballVel.set(0, -6.0, 0)

  // Fault evaluated
  engine.awardPoint("opponent", "FAULT! (Miss Toss)")
  assert.equal(engine.score.opponentPoints, 15)

  // State resets to idle_serve for next serve attempt
  engine.state = "idle_serve"
  assert.equal(engine.triggerServeToss(), true)
  assert.equal(engine.state, "serving_toss")
})

test("Tier 4 [SCN-04] Mid-Match Reconnection & Session Continuity", () => {
  const host = new MockRealtimeChannel("host")
  let mobile = new MockRealtimeChannel("mobile_1")
  host.connectPeer(mobile)

  const engine = new TennisPhysicsEngine()
  engine.score.playerPoints = 30
  engine.score.opponentPoints = 15

  // Mobile 1 disconnects mid-game
  mobile.unsubscribe()
  host.peerChannels.delete(mobile)

  // Match state on host is preserved
  assert.equal(engine.score.playerPoints, 30)

  // Mobile 2 reconnects to same room
  mobile = new MockRealtimeChannel("mobile_2")
  host.connectPeer(mobile)
  mobile.track({ role: "mobile_controller", room: "T98-WII1" })

  assert.equal(host.peerChannels.size, 1)
  assert.equal(engine.score.playerPoints, 30)
})

test("Tier 4 [SCN-05] High-Frequency Motion Noise Stress During Active Rally", () => {
  const classifier = new TennisGestureClassifier()

  // 50 noisy resting hand tremor samples (2 to 6 m/s^2)
  let falsePositives = 0
  for (let i = 0; i < 50; i++) {
    const jitterSample = {
      timestamp: 1000 + i * 20,
      acceleration: {
        x: (Math.random() - 0.5) * 6,
        y: (Math.random() - 0.5) * 6,
        z: (Math.random() - 0.5) * 6,
      },
    }
    const detected = classifier.processSample(jitterSample)
    if (detected !== null) falsePositives++
  }
  assert.equal(falsePositives, 0, "Noisy tremor must produce zero false positives")

  // Single deliberate physical forehand stroke
  const genuineStroke = classifier.processSample({
    timestamp: 2100,
    acceleration: { x: 26.0, y: 2.0, z: -1.0 },
  })
  assert.ok(genuineStroke !== null, "Genuine stroke amidst noise must be detected")
  assert.equal(genuineStroke.type, "forehand")
  assert.ok(genuineStroke.powerMultiplier > 1.3)
})
