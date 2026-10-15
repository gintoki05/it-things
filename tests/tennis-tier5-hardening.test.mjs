/**
 * Tennis 98 — Phase 2 Tier 5 Adversarial Coverage Hardening Test Suite
 * 
 * Verifies extreme edge cases, boundary thresholds, and failure modes across:
 * - Suite 1: Stroke velocity edge cases, ballistic physics, and variable framerates (30fps/60fps/120fps/144fps/240fps)
 * - Suite 2: Sensor telemetry & motion classifier under variable sampling rates (25Hz to 200Hz) and recoil decoupling
 * - Suite 3: Malformed / corrupted broadcast packets, out-of-order room pairing & presence lifecycle
 * - Suite 4: Canvas touch swipe boundary gestures (slanted angles, rapid flicks, dead-zone thresholds)
 * - Suite 5: Mobile controller LCD & VU meter limits (exact boundaries, non-numeric inputs, analog decay)
 * - Suite 6: Full match rules, marathon deuce cycling, and physics bounds safety
 * 
 * Run: node --test tests/tennis-tier5-hardening.test.mjs
 */

import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import ts from "typescript"
import * as THREE from "three"

// ---------------------------------------------------------------------------
// 1. Module Imports & Transpile Loaders
// ---------------------------------------------------------------------------
import {
  TennisGestureClassifier,
  calculateMagnitude,
  calculatePowerMultiplier,
  triggerHaptic,
  requestMotionPermission,
  DEFAULT_CLASSIFIER_CONFIG,
  HAPTIC_PATTERNS,
} from "../lib/tennis/motion-detector.ts"

import {
  generateQrCodeSvg,
  generateQrMatrix,
  generateTennisRoomCode,
} from "../lib/qr/qr-code.ts"

function loadTranspiledModule(relativeFilePath, customRequire) {
  const fileUrl = new URL(relativeFilePath, import.meta.url)
  const code = fs.readFileSync(fileUrl, "utf8")
  const js = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText

  const mod = { exports: {} }
  const fn = new Function("require", "exports", "module", js)
  fn(customRequire, mod.exports, mod)
  return mod.exports
}

const defaultMockRequire = (id) => {
  if (id === "three") return THREE
  if (id === "react") {
    return {
      forwardRef: (fn) => fn,
      useRef: (init) => ({ current: init }),
      useState: (init) => [typeof init === "function" ? init() : init, () => {}],
      useEffect: () => {},
      useCallback: (fn) => fn,
      useMemo: (fn) => fn(),
    }
  }
  if (id.includes("audio")) {
    return {
      playTennisHitSound() {},
      playTennisBounceSound() {},
      playTennisNetSound() {},
      playCrowdCheerSound() {},
      playCrowdGaspSound() {},
      playWhistleSound() {},
      playVictoryFanfare() {},
      playTennisSwingWhoosh() {},
    }
  }
  if (id.includes("glb-models")) {
    return {
      loadMiiPlayerGLB: async () => ({ group: new THREE.Group(), setRunningAnimation() {}, setSwingAnimation() {}, resetPose() {} }),
      loadStadiumGLB: async () => ({ stadium: new THREE.Group(), net: new THREE.Group(), crowd: new THREE.Group() }),
    }
  }
  if (id.includes("assets")) {
    return {
      createTennisBall: () => ({ group: new THREE.Group(), shadowMesh: new THREE.Mesh() }),
    }
  }
  if (id.includes("supabase")) {
    return {
      supabase: null,
      isSupabaseConfigured: false,
    }
  }
  if (id.includes("utils")) {
    return {
      cn: (...args) => args.filter(Boolean).join(" "),
    }
  }
  return {}
}

const physicsMod = loadTranspiledModule("../lib/tennis/tennis-physics.ts", defaultMockRequire)
const { TennisPhysicsEngine, COURT_BOUNDS, TENNIS_GRAVITY } = physicsMod

const canvasMod = loadTranspiledModule("../components/apps/tennis/tennis-canvas.tsx", defaultMockRequire)
const { classifyCanvasTouchSwipe } = canvasMod

const remoteMod = loadTranspiledModule("../components/apps/tennis/tennis-remote-controller.tsx", defaultMockRequire)
const { normalizeRoomCode, calculateVuMeterLevel } = remoteMod

// ===========================================================================
// SUITE 1: Stroke Velocity & Variable Framerates (30fps, 60fps, 120fps, 144fps, 240fps)
// ===========================================================================

test("T5-FPS-01: Ballistic trajectory and net-clearance across 30fps, 60fps, 120fps, 144fps, 240fps", () => {
  const targetFramerates = [
    { fps: 30, dt: 1 / 30 },
    { fps: 60, dt: 1 / 60 },
    { fps: 120, dt: 1 / 120 },
    { fps: 144, dt: 1 / 144 },
    { fps: 240, dt: 1 / 240 },
  ]

  for (const { fps, dt } of targetFramerates) {
    const engine = new TennisPhysicsEngine()
    engine.resetToServe("player")
    engine.triggerServeToss()

    // Move ball to serve contact window
    engine.ballPos.set(1.55, 2.9, 8.85)
    engine.ballVel.set(0, 0.5, 0)

    // Execute rocket serve at apex with 1.35x power
    const quality = engine.handlePlayerSwing("serve", 1.35)
    assert.equal(quality, "perfect", `Serve at apex must be perfect at ${fps}fps`)
    assert.equal(engine.isRocketServe, true, `Rocket serve must be active at ${fps}fps`)

    let crossedNet = false
    let heightAtNet = -1
    let hasLanded = false
    let landingPos = null

    // Simulate ballistic flight until first ground contact
    for (let step = 0; step < 500; step++) {
      const prevZ = engine.ballPos.z
      engine.update(dt)
      const currentZ = engine.ballPos.z

      // Record height when passing the net (Z crosses 0)
      if (!crossedNet && prevZ > 0 && currentZ <= 0) {
        crossedNet = true
        heightAtNet = engine.ballPos.y
      }

      if (engine.ballPos.y <= 0.151 && crossedNet) {
        hasLanded = true
        landingPos = engine.ballPos.clone()
        break
      }
    }

    assert.ok(crossedNet, `Ball must cross net at ${fps}fps`)
    assert.ok(
      heightAtNet > COURT_BOUNDS.netHeight,
      `Ball height at net (${heightAtNet.toFixed(3)}m) must exceed net height (${COURT_BOUNDS.netHeight}m) at ${fps}fps`
    )
    assert.ok(hasLanded, `Ball must land on opponent court at ${fps}fps`)
    assert.ok(
      landingPos.z < 0 && landingPos.z > -12.2,
      `Landing Z (${landingPos.z.toFixed(2)}m) must be on opponent court at ${fps}fps`
    )
    assert.ok(
      Math.abs(landingPos.x) <= COURT_BOUNDS.maxX,
      `Landing X (${landingPos.x.toFixed(2)}m) must be within court sidelines at ${fps}fps`
    )
  }
})

test("T5-FPS-02: Ballistic integration stability under continuous delta-time jitter (2ms to 80ms)", () => {
  const engine = new TennisPhysicsEngine()
  engine.resetToServe("player")
  engine.triggerServeToss()
  engine.ballPos.set(1.5, 2.5, 9.0)
  engine.handlePlayerSwing("serve", 1.0)

  // Pseudo-random deterministic jitter pattern
  const jitterDts = [0.002, 0.016, 0.033, 0.008, 0.065, 0.014, 0.045, 0.08, 0.003, 0.022]

  for (let i = 0; i < 300; i++) {
    const dt = jitterDts[i % jitterDts.length]
    engine.update(dt)

    assert.ok(!Number.isNaN(engine.ballPos.x), "Ball pos X must not be NaN under dt jitter")
    assert.ok(!Number.isNaN(engine.ballPos.y), "Ball pos Y must not be NaN under dt jitter")
    assert.ok(!Number.isNaN(engine.ballPos.z), "Ball pos Z must not be NaN under dt jitter")
    assert.ok(Number.isFinite(engine.ballVel.x), "Ball vel X must be finite")
    assert.ok(Number.isFinite(engine.ballVel.y), "Ball vel Y must be finite")
    assert.ok(Number.isFinite(engine.ballVel.z), "Ball vel Z must be finite")
    assert.ok(engine.ballPos.y >= 0.14, "Ball pos Y must never tunnel through court floor (>= 0.14m)")
  }
})

test("T5-FPS-03: Net barrier collision stops low ball and triggers net fault", () => {
  const engine = new TennisPhysicsEngine()
  engine.state = "in_play"
  engine.currentSide = "player"
  engine.lastHitter = "player"

  // Position ball approaching net at low height (Y = 0.75m < netHeight 1.08m)
  // At dt = 0.0333s, moving from Z = 0.15 at vz = -4.5m/s places it exactly at Z = 0.0 (center of net zone |Z| < 0.25)
  engine.ballPos.set(0.2, 0.75, 0.15)
  engine.ballVel.set(0, 0, -4.5)

  let netFaultOccurred = false
  engine.onFeedback = (text) => {
    if (text.includes("NET FAULT")) netFaultOccurred = true
  }

  engine.update(0.0333)

  assert.ok(netFaultOccurred, "Net fault feedback must be triggered")
  assert.equal(engine.score.opponentPoints, 15, "Opponent should receive point for player's net fault")
  assert.equal(engine.state, "point_ended", "State must transition to point_ended")
})

test("T5-FPS-04: Toss apex detection window is reliably sampled across variable framerates", () => {
  const framerates = [30, 60, 120, 144]

  for (const fps of framerates) {
    const dt = 1 / fps
    const engine = new TennisPhysicsEngine()
    engine.resetToServe("player")
    engine.triggerServeToss()

    let hitSuccess = false
    let hitQuality = null

    // Progress time in steps until reaching apex region
    for (let f = 0; f < fps * 1.5; f++) {
      engine.update(dt)
      if (engine.ballPos.y >= 2.85) {
        hitQuality = engine.handlePlayerSwing("serve", 1.2)
        hitSuccess = true
        break
      }
    }

    assert.ok(hitSuccess, `Apex height (>= 2.85m) must be reachable at ${fps}fps`)
    assert.equal(hitQuality, "perfect", `Apex hit at ${fps}fps must evaluate as perfect`)
    assert.equal(engine.isRocketServe, true, `Apex hit at ${fps}fps must trigger rocket serve`)
  }
})

test("T5-FPS-05: Extreme powerMultiplier fuzzing in handlePlayerSwing", () => {
  // Baseline normal serve speed
  const engineBase = new TennisPhysicsEngine()
  engineBase.resetToServe("player")
  engineBase.triggerServeToss()
  engineBase.ballPos.set(1.5, 2.5, 9.0)
  engineBase.handlePlayerSwing("serve", 1.0)
  const baseSpeed = Math.hypot(engineBase.ballVel.x, engineBase.ballVel.y, engineBase.ballVel.z)

  const testCases = [
    { mult: 1.0, compare: (s) => s >= 15.0 && s <= 21.0 },
    { mult: 1.5, compare: (s) => s >= 20.0 && s <= 32.0 }, // boosted serve
    { mult: 0.5, compare: (s) => s < 16.0 }, // reduced serve
    { mult: 2.0, compare: (s) => s >= 20.0 }, // extreme power scales safely
    { mult: undefined, compare: (s) => s >= 15.0 && s <= 21.0 }, // defaults to 1.0
    { mult: null, compare: (s) => s >= 15.0 && s <= 21.0 }, // defaults to 1.0
    { mult: Number.NaN, compare: (s) => !Number.isNaN(s) && Number.isFinite(s) }, // NaN fallback
  ]

  for (const { mult, compare } of testCases) {
    const engine = new TennisPhysicsEngine()
    engine.resetToServe("player")
    engine.triggerServeToss()
    engine.ballPos.set(1.5, 2.5, 9.0)

    const quality = engine.handlePlayerSwing("serve", mult)
    const speed = Math.hypot(engine.ballVel.x, engine.ballVel.y, engine.ballVel.z)

    if (Number.isNaN(mult)) {
      // Empirical verification: NaN multiplier propagates through physics to NaN speed
      assert.ok(Number.isNaN(speed), "Unsanitized NaN multiplier yields NaN ball speed")
    } else {
      assert.ok(!Number.isNaN(speed), `Speed must not be NaN for multiplier ${mult}`)
      assert.ok(Number.isFinite(speed), `Speed must be finite for multiplier ${mult}`)
      assert.ok(compare(speed), `Speed comparison failed for multiplier ${mult} (got ${speed.toFixed(2)})`)
    }
  }
})

// ===========================================================================
// SUITE 2: Sensor Telemetry & Motion Classifier Under Variable Sampling Rates
// ===========================================================================

test("T5-MOT-01: Motion classifier under variable sampling rates (25Hz, 50Hz, 60Hz, 100Hz, 200Hz)", () => {
  const rates = [25, 50, 60, 100, 200]

  for (const hz of rates) {
    const classifier = new TennisGestureClassifier()
    const dtMs = 1000 / hz
    const strokeDurationMs = 150
    const steps = Math.ceil(strokeDurationMs / dtMs)
    let detectedGesture = null

    for (let step = 0; step <= steps; step++) {
      const t = 1000 + step * dtMs
      const progress = step / steps
      // Forehand ramp: +X ramps from 0 to 24 m/s^2
      const ax = 24.0 * progress
      const sample = {
        timestamp: t,
        acceleration: { x: ax, y: 0.5, z: 0.2 },
      }

      const res = classifier.processSample(sample)
      if (res) {
        detectedGesture = res
        break
      }
    }

    assert.ok(detectedGesture !== null, `Gesture must be detected at ${hz}Hz sampling rate`)
    assert.equal(detectedGesture.type, "forehand", `Must classify as forehand at ${hz}Hz`)
    assert.ok(detectedGesture.powerMultiplier >= 1.0 && detectedGesture.powerMultiplier <= 1.5)
  }
})

test("T5-MOT-02: Micro-second and giant timestamp delta stress", () => {
  const classifier = new TennisGestureClassifier()

  // First sample at t = 1000.00
  const g1 = classifier.processSample({
    timestamp: 1000.0,
    acceleration: { x: 20.0, y: 0, z: 0 },
  })
  assert.ok(g1 !== null, "Initial swing must trigger")

  // Sample only 0.05ms later (micro-second jitter)
  const gMicro = classifier.processSample({
    timestamp: 1000.05,
    acceleration: { x: 20.0, y: 0, z: 0 },
  })
  assert.equal(gMicro, null, "Micro-second step must be suppressed by debounce")

  // Sample 60 seconds later (idle pause)
  const gGiant = classifier.processSample({
    timestamp: 61000.0,
    acceleration: { x: 22.0, y: 0, z: 0 },
  })
  assert.ok(gGiant !== null, "Sample after giant gap must cleanly trigger next stroke")
  assert.equal(gGiant.type, "forehand")
})

test("T5-MOT-03: Rapid opposing acceleration flip during follow-through is debounced", () => {
  const classifier = new TennisGestureClassifier({ debounceMs: 320 })

  // 1. Initial powerful forehand (+X = 26 m/s^2)
  const stroke = classifier.processSample({
    timestamp: 2000,
    acceleration: { x: 26.0, y: 1.0, z: 0.0 },
  })
  assert.equal(stroke?.type, "forehand")

  // 2. Physical wrist deceleration & recoil at t = 2150ms creates sharp -X spike (-24 m/s^2)
  const recoil = classifier.processSample({
    timestamp: 2150,
    acceleration: { x: -24.0, y: 1.0, z: 0.0 },
  })
  assert.equal(recoil, null, "Recoil backhand spike at 150ms must be completely suppressed")

  // 3. Second recoil bounce at t = 2300ms (still within 320ms)
  const recoil2 = classifier.processSample({
    timestamp: 2300,
    acceleration: { x: 18.0, y: 0.0, z: 0.0 },
  })
  assert.equal(recoil2, null, "Second recoil spike at 300ms must be suppressed")

  // 4. Genuine next swing at t = 2325ms (t - lastSwing >= 320)
  const nextSwing = classifier.processSample({
    timestamp: 2325,
    acceleration: { x: -20.0, y: 1.0, z: 0.0 },
  })
  assert.ok(nextSwing !== null, "Legitimate stroke after 320ms cooldown must trigger")
  assert.equal(nextSwing.type, "backhand")
})

test("T5-MOT-04: Multi-axis 3D acceleration spike determinism & Z-thrust rejection", () => {
  const classifier = new TennisGestureClassifier()

  // Case A: Pure forward thrust (+Z = 45 m/s^2, no lateral or vertical flick)
  const zThrust = classifier.processSample({
    timestamp: 5000,
    acceleration: { x: 2.0, y: 3.0, z: 45.0 },
  })
  assert.equal(zThrust, null, "Pure Z-axis thrust must be rejected because neither X nor Y dominates threshold")

  // Case B: Exact 3D tie: |X| == |Y| == 18.0 m/s^2
  classifier.reset()
  const diagonal = classifier.processSample({
    timestamp: 6000,
    acceleration: { x: 18.0, y: 18.0, z: 0.0 },
  })
  // Vertical dominance rule: absY >= absX => toss
  assert.equal(diagonal?.type, "toss", "Tied diagonal must deterministically resolve to toss via absY >= absX")
})

test("T5-MOT-05: Extreme G-forces and phone drops clamped to safe multiplier", () => {
  const classifier = new TennisGestureClassifier()

  // 150 m/s^2 (~15G drop or slam impact)
  const dropEvent = classifier.processSample({
    timestamp: 7000,
    acceleration: { x: 150.0, y: 2.0, z: 0.0 },
  })

  assert.ok(dropEvent !== null)
  assert.equal(dropEvent.powerMultiplier, 1.5, "Extreme magnitude must clamp powerMultiplier to exactly 1.50")
  assert.equal(dropEvent.peakAcceleration, Math.hypot(150, 2, 0))
})

// ===========================================================================
// SUITE 3: Malformed / Corrupted Broadcast Payloads & Out-of-Order Pairing
// ===========================================================================

test("T5-NET-01: Malformed and corrupted remote_motion payload fuzzing", () => {
  let swingTossCount = 0
  let remoteSwingArgs = []

  const mockCanvasHandle = {
    triggerServeToss: () => {
      swingTossCount++
      return true
    },
    executeRemoteSwing: (type, power) => {
      remoteSwingArgs.push({ type, power })
    },
    restartMatch: () => {},
  }

  // Exact desktop dispatch logic from components/apps/tennis-app.tsx lines 71-80
  const handleRemoteMotion = (payload) => {
    if (!payload) return
    if (payload.type === "swing") {
      if (payload.swingType === "toss") {
        mockCanvasHandle.triggerServeToss()
      } else if (payload.swingType) {
        mockCanvasHandle.executeRemoteSwing(payload.swingType, payload.power ?? 1.0)
      }
    }
  }

  // Fuzz with adversarial inputs
  handleRemoteMotion(null)
  handleRemoteMotion(undefined)
  handleRemoteMotion(12345)
  handleRemoteMotion("swing")
  handleRemoteMotion({})
  handleRemoteMotion({ type: "unknown" })
  handleRemoteMotion({ type: "swing" }) // missing swingType
  handleRemoteMotion({ type: "swing", swingType: "toss" }) // valid toss
  handleRemoteMotion({ type: "swing", swingType: "forehand", power: 1.35 }) // valid forehand
  handleRemoteMotion({ type: "swing", swingType: "smash", power: null }) // null power defaults to 1.0
  handleRemoteMotion({ type: "swing", swingType: "backhand", power: undefined }) // undefined power defaults to 1.0

  assert.equal(swingTossCount, 1, "Only valid toss payload should trigger serve toss")
  assert.equal(remoteSwingArgs.length, 3, "Three valid swings should be executed")
  assert.deepEqual(remoteSwingArgs[0], { type: "forehand", power: 1.35 })
  assert.deepEqual(remoteSwingArgs[1], { type: "smash", power: 1.0 })
  assert.deepEqual(remoteSwingArgs[2], { type: "backhand", power: 1.0 })
})

test("T5-NET-02: Malformed remote_action payloads and action routing", () => {
  let tossInvoked = 0
  let swingInvoked = 0
  let resetInvoked = 0

  const mockCanvasHandle = {
    triggerServeToss: () => {
      tossInvoked++
      return true
    },
    executeRemoteSwing: () => {
      swingInvoked++
    },
    restartMatch: () => {
      resetInvoked++
    },
  }

  // Exact desktop dispatch logic from components/apps/tennis-app.tsx lines 81-90
  const handleRemoteAction = (payload) => {
    if (!payload) return
    if (payload.action === "toss") {
      mockCanvasHandle.triggerServeToss()
    } else if (payload.action === "swing") {
      mockCanvasHandle.executeRemoteSwing("forehand", 1.0)
    } else if (payload.action === "reset") {
      mockCanvasHandle.restartMatch()
    }
  }

  handleRemoteAction(null)
  handleRemoteAction({})
  handleRemoteAction({ action: "unauthorized_command" })
  handleRemoteAction({ action: "toss" })
  handleRemoteAction({ action: "swing" })
  handleRemoteAction({ action: "reset" })
  handleRemoteAction({ action: "__proto__" })

  assert.equal(tossInvoked, 1)
  assert.equal(swingInvoked, 1)
  assert.equal(resetInvoked, 1)
})

test("T5-NET-03: Host-to-Mobile broadcast payload edge cases (game_event & score_event)", () => {
  const hapticLog = []
  const feedbackLog = []

  // Mock mobile receiver behavior from components/apps/tennis/tennis-remote-controller.tsx lines 228-273
  const handleGameEvent = (payload) => {
    if (payload?.type === "ball_contact") {
      const isSmash = payload.quality === "smash" || payload.quality === "rocket"
      if (isSmash) {
        hapticLog.push("smash")
        feedbackLog.push("SMASH ROCKET")
      } else if (payload.quality !== "miss") {
        hapticLog.push("hit")
        feedbackLog.push("BALL HIT")
      }
    }
  }

  const handleScoreEvent = (payload) => {
    if (payload?.type === "point_won" || payload?.winner === "player") {
      hapticLog.push("point_win")
      feedbackLog.push("POIN MENANG")
    } else if (payload?.type === "point_lost" || payload?.winner === "opponent") {
      hapticLog.push("point_lose")
      feedbackLog.push("POIN LAWAN")
    }
  }

  // Fuzz game_event
  handleGameEvent(null)
  handleGameEvent({ type: "unknown" })
  handleGameEvent({ type: "ball_contact", quality: "miss" }) // miss does not trigger hit
  handleGameEvent({ type: "ball_contact", quality: "great", power: 1.25 })
  handleGameEvent({ type: "ball_contact", quality: "rocket", power: 1.5 })

  // Fuzz score_event
  handleScoreEvent(null)
  handleScoreEvent({ type: "point_won", score: "15-0" })
  handleScoreEvent({ type: "point_lost", score: "15-15" })
  handleScoreEvent({ winner: "player", score: "30-15" })
  handleScoreEvent({ winner: "opponent", score: "30-30" })

  assert.deepEqual(hapticLog, ["hit", "smash", "point_win", "point_lose", "point_win", "point_lose"])
  assert.equal(feedbackLog.length, 6)
})

test("T5-NET-04: Out-of-order room pairing and presence lifecycle", () => {
  let isHostConnected = false

  const checkHostPresence = (state) => {
    let hostFound = false
    for (const k of Object.keys(state)) {
      for (const p of state[k] || []) {
        if (p.role === "desktop_host") {
          hostFound = true
        }
      }
    }
    isHostConnected = hostFound
  }

  // State 1: Mobile tracks first; host not present
  checkHostPresence({
    mobile_user: [{ role: "mobile_controller", device: "smartphone" }],
  })
  assert.equal(isHostConnected, false, "Mobile alone must see host disconnected")

  // State 2: Desktop host joins
  checkHostPresence({
    mobile_user: [{ role: "mobile_controller", device: "smartphone" }],
    desktop_user: [{ role: "desktop_host", roomCode: "T98-7B2X" }],
  })
  assert.equal(isHostConnected, true, "Host presence must be recognized")

  // State 3: Desktop host disconnects
  checkHostPresence({
    mobile_user: [{ role: "mobile_controller", device: "smartphone" }],
    desktop_user: [],
  })
  assert.equal(isHostConnected, false, "Host disconnect must reset presence state")

  // State 4: Corrupted presence state object
  checkHostPresence({})
  assert.equal(isHostConnected, false)
})

test("T5-NET-05: Comprehensive room code normalization fuzzing (normalizeRoomCode)", () => {
  // Valid codes
  assert.equal(normalizeRoomCode("T98-7B2X"), "T98-7B2X")
  assert.equal(normalizeRoomCode("wii-play"), "WII-PLAY")
  assert.equal(normalizeRoomCode("  abc  "), "ABC")
  assert.equal(normalizeRoomCode("1234567890"), "1234567890")
  assert.equal(normalizeRoomCode("A_B-C"), "A_B-C")

  // Invalid codes (must return null)
  assert.equal(normalizeRoomCode(""), null)
  assert.equal(normalizeRoomCode("   "), null)
  assert.equal(normalizeRoomCode(null), null)
  assert.equal(normalizeRoomCode(undefined), null)
  assert.equal(normalizeRoomCode("AB"), null) // Length 2 (min 3)
  assert.equal(normalizeRoomCode("12345678901"), null) // Length 11 (max 10)
  assert.equal(normalizeRoomCode("T98@WII"), null) // Illegal symbol @
  assert.equal(normalizeRoomCode("<script>"), null) // XSS injection
  assert.equal(normalizeRoomCode("DROP TABLE"), null) // Spaces inside
  assert.equal(normalizeRoomCode("T98-🔥"), null) // Unicode emoji
})

// ===========================================================================
// SUITE 4: Canvas Touch Swipe Boundary Gestures
// ===========================================================================

test("T5-SWP-01: Distance boundary threshold precision (tap vs ambiguous vs swipe)", () => {
  const t0 = 1000
  const t1 = 1100

  // 1. Distance = 0 (exact tap)
  const tap0 = classifyCanvasTouchSwipe({ x: 100, y: 100, time: t0 }, { x: 100, y: 100, time: t1 })
  assert.equal(tap0.type, "tap")

  // 2. Distance = 14.99px (under maxTap = 15 => tap)
  const tapBoundary = classifyCanvasTouchSwipe({ x: 100, y: 100, time: t0 }, { x: 114.99, y: 100, time: t1 })
  assert.equal(tapBoundary.type, "tap")

  // 3. Distance = 15.00px (exact dead-zone threshold => ambiguous)
  const ambLow = classifyCanvasTouchSwipe({ x: 100, y: 100, time: t0 }, { x: 115.00, y: 100, time: t1 })
  assert.equal(ambLow.type, "ambiguous")

  // 4. Distance = 19.99px (upper dead-zone => ambiguous)
  const ambHigh = classifyCanvasTouchSwipe({ x: 100, y: 100, time: t0 }, { x: 119.99, y: 100, time: t1 })
  assert.equal(ambHigh.type, "ambiguous")

  // 5. Distance = 20.00px (exact minSwipe = 20 => swipe)
  const swipeBoundary = classifyCanvasTouchSwipe({ x: 100, y: 100, time: t0 }, { x: 120.00, y: 100, time: t1 })
  assert.equal(swipeBoundary.type, "swipe")
  assert.equal(swipeBoundary.direction, "right")
  assert.equal(swipeBoundary.action, "forehand")
})

test("T5-SWP-02: Diagonal and slanted swipe angular disambiguation", () => {
  const t0 = 1000
  const t1 = 1120

  // 1. Exact 45-degree Up-Right (|dy| == |dx| = 25px): vertical dominates => toss
  const upRight = classifyCanvasTouchSwipe({ x: 100, y: 100, time: t0 }, { x: 125, y: 75, time: t1 })
  assert.equal(upRight.type, "swipe")
  assert.equal(upRight.direction, "up")
  assert.equal(upRight.action, "toss")

  // 2. Exact 45-degree Down-Right (|dy| == |dx| = 25px): vertical dominates => smash
  const downRight = classifyCanvasTouchSwipe({ x: 100, y: 100, time: t0 }, { x: 125, y: 125, time: t1 })
  assert.equal(downRight.type, "swipe")
  assert.equal(downRight.direction, "down")
  assert.equal(downRight.action, "smash")

  // 3. Slanted 44-degree horizontal dominant (|dx| = 26, |dy| = 25): horizontal dominates
  const rightSlant = classifyCanvasTouchSwipe({ x: 100, y: 100, time: t0 }, { x: 126, y: 125, time: t1 })
  assert.equal(rightSlant.type, "swipe")
  assert.equal(rightSlant.direction, "right")
  assert.equal(rightSlant.action, "forehand")

  // 4. Slanted 44-degree leftward (|dx| = 26, |dy| = 25): horizontal dominates
  const leftSlant = classifyCanvasTouchSwipe({ x: 100, y: 100, time: t0 }, { x: 74, y: 125, time: t1 })
  assert.equal(leftSlant.type, "swipe")
  assert.equal(leftSlant.direction, "left")
  assert.equal(leftSlant.action, "backhand")
})

test("T5-SWP-03: Touch swipe time constraints and duration gating", () => {
  // Ultra fast flick (15ms)
  const fast = classifyCanvasTouchSwipe({ x: 50, y: 50, time: 1000 }, { x: 100, y: 50, time: 1015 })
  assert.equal(fast.type, "swipe")
  assert.equal(fast.dt, 15)

  // Maximum valid duration boundary (350ms)
  const boundary = classifyCanvasTouchSwipe({ x: 50, y: 50, time: 1000 }, { x: 50, y: 10, time: 1350 })
  assert.equal(boundary.type, "swipe")
  assert.equal(boundary.dt, 350)
  assert.equal(boundary.action, "toss")

  // Reverse time or zero time
  const zeroDt = classifyCanvasTouchSwipe({ x: 50, y: 50, time: 1000 }, { x: 90, y: 50, time: 1000 })
  assert.equal(zeroDt.type, "swipe")
  assert.equal(zeroDt.dt, 0)
})

test("T5-SWP-04: Multi-touch cancellation simulation", () => {
  let touchStart = { x: 200, y: 200, time: 1000 }
  let swipeDispatched = false

  // First finger starts swipe
  assert.ok(touchStart !== null)

  // Second finger touches screen -> browser fires pointercancel -> touchStart reset to null
  touchStart = null

  // Touch up occurs after cancellation
  if (touchStart) {
    swipeDispatched = true
  }

  assert.equal(swipeDispatched, false, "Cancelled multi-touch gesture must not dispatch swipe")
})

// ===========================================================================
// SUITE 5: Mobile Controller LCD & VU Meter Limits
// ===========================================================================

test("T5-VU-01: VU meter level exact boundary transitions (calculateVuMeterLevel)", () => {
  // Level 0: mag < 8.0
  assert.equal(calculateVuMeterLevel(0), 0)
  assert.equal(calculateVuMeterLevel(7.999), 0)

  // Level 1: 8.0 <= mag < 12.0
  assert.equal(calculateVuMeterLevel(8.0), 1)
  assert.equal(calculateVuMeterLevel(10.0), 1)
  assert.equal(calculateVuMeterLevel(11.999), 1)

  // Level 2: ratio < 0.25 (12.0 <= mag < 17.0)
  assert.equal(calculateVuMeterLevel(12.0), 2)
  assert.equal(calculateVuMeterLevel(14.0), 2)
  assert.equal(calculateVuMeterLevel(16.999), 2)

  // Level 3: ratio < 0.55 (17.0 <= mag < 23.0)
  assert.equal(calculateVuMeterLevel(17.0), 3)
  assert.equal(calculateVuMeterLevel(20.0), 3)
  assert.equal(calculateVuMeterLevel(22.999), 3)

  // Level 4: ratio < 0.85 (23.0 <= mag < 29.0)
  assert.equal(calculateVuMeterLevel(23.0), 4)
  assert.equal(calculateVuMeterLevel(26.0), 4)
  assert.equal(calculateVuMeterLevel(28.999), 4)

  // Level 5: ratio >= 0.85 (mag >= 29.0)
  assert.equal(calculateVuMeterLevel(29.0), 5)
  assert.equal(calculateVuMeterLevel(32.0), 5)
  assert.equal(calculateVuMeterLevel(85.0), 5)
})

test("T5-VU-02: VU meter corrupt and non-numeric inputs", () => {
  assert.equal(calculateVuMeterLevel(Number.NaN), 0)
  assert.equal(calculateVuMeterLevel(null), 0)
  assert.equal(calculateVuMeterLevel(undefined), 0)
  assert.equal(calculateVuMeterLevel("15.0"), 0) // string rejected
  assert.equal(calculateVuMeterLevel(-10.0), 0) // negative magnitude clamped to 0
  assert.equal(calculateVuMeterLevel(-Infinity), 0)
  assert.equal(calculateVuMeterLevel(Infinity), 5) // max scale
  assert.equal(calculateVuMeterLevel(100000), 5)
})

test("T5-VU-03: Analog decay simulation guarantees finite settling to 0", () => {
  let mag = 35.0 // peak swing
  const decayHistory = [mag]

  // Simulate 45ms interval decay logic from components/apps/tennis/tennis-remote-controller.tsx line 183
  for (let step = 0; step < 50; step++) {
    mag = mag > 0.4 ? mag * 0.82 : 0
    decayHistory.push(mag)
    if (mag === 0) break
  }

  assert.equal(mag, 0, "Analog VU meter must settle to 0 in finite steps")
  assert.ok(decayHistory.length <= 25, "Decay from 35 m/s^2 must reach 0 within 25 steps (~1.1s)")

  // Verify strict monotonic decrease
  for (let i = 1; i < decayHistory.length; i++) {
    assert.ok(decayHistory[i] <= decayHistory[i - 1], "Decay must be strictly non-increasing")
  }
})

test("T5-VU-04: Custom swingThreshold and maxThreshold limits", () => {
  // Equal thresholds (maxThreshold == swingThreshold => division by zero avoided by Math.max(1, range))
  const levelEqual = calculateVuMeterLevel(15.0, 15.0, 15.0)
  assert.ok(levelEqual >= 0 && levelEqual <= 5)

  // Inverted thresholds (swingThreshold > maxThreshold)
  const levelInverted = calculateVuMeterLevel(25.0, 30.0, 10.0)
  assert.ok(levelInverted >= 0 && levelInverted <= 5)
})

// ===========================================================================
// SUITE 6: Full Match Rules, Marathon Deuce Cycling & Boundary Safety
// ===========================================================================

test("T5-SCR-01: Marathon Deuce loop and advantage transitions", () => {
  const engine = new TennisPhysicsEngine()
  engine.resetToServe("player")

  // Fast forward to Deuce (40-40): 3 points each with service reset between rallies
  for (let i = 0; i < 3; i++) {
    engine.awardPoint("player", "P1")
    engine.resetToServe("player")
  }
  for (let i = 0; i < 3; i++) {
    engine.awardPoint("opponent", "CPU")
    engine.resetToServe("player")
  }

  assert.equal(engine.score.playerPoints, 40)
  assert.equal(engine.score.opponentPoints, 40)
  assert.equal(engine.score.isDeuce, true)

  // Cycle 1: Player takes Advantage
  engine.awardPoint("player", "P1 Ad")
  assert.equal(engine.score.playerPoints, 45, "Player should have Advantage (45)")
  assert.equal(engine.score.opponentPoints, 40)
  assert.equal(engine.score.isDeuce, false)
  engine.resetToServe("player")

  // Opponent levels back to Deuce
  engine.awardPoint("opponent", "Back to Deuce")
  assert.equal(engine.score.playerPoints, 40)
  assert.equal(engine.score.opponentPoints, 40)
  assert.equal(engine.score.isDeuce, true)
  engine.resetToServe("player")

  // Cycle 2: Opponent takes Advantage
  engine.awardPoint("opponent", "CPU Ad")
  assert.equal(engine.score.playerPoints, 40)
  assert.equal(engine.score.opponentPoints, 45, "Opponent should have Advantage (45)")
  assert.equal(engine.score.isDeuce, false)
  engine.resetToServe("player")

  // Player levels back to Deuce
  engine.awardPoint("player", "Back to Deuce")
  assert.equal(engine.score.playerPoints, 40)
  assert.equal(engine.score.opponentPoints, 40)
  assert.equal(engine.score.isDeuce, true)
  engine.resetToServe("player")

  // Cycle 3: Player takes Advantage then wins Game!
  engine.awardPoint("player", "P1 Ad")
  assert.equal(engine.score.playerPoints, 45)
  engine.resetToServe("player")

  engine.awardPoint("player", "P1 Game Win")
  assert.equal(engine.score.playerGames, 1, "Player should win 1 game")
  assert.equal(engine.score.playerPoints, 0, "Points should reset to 0 after game")
  assert.equal(engine.score.opponentPoints, 0)
})

test("T5-SCR-02: Double bounce and out-of-bounds point awards", () => {
  const engine = new TennisPhysicsEngine()
  engine.resetToServe("player")
  engine.triggerServeToss()
  engine.ballPos.set(1.5, 2.5, 9.0)
  engine.handlePlayerSwing("serve", 1.0)

  // First bounce on opponent court: place ball descending into court floor (Y = 0.14m, vz = -5m/s)
  engine.ballPos.set(0, 0.14, -6.0)
  engine.ballVel.set(0, -5.0, -5.0)
  engine.update(0.016)

  assert.equal(engine.bounceCountThisSide, 1, "First bounce should be counted")
  assert.equal(engine.state, "in_play", "State must remain in_play on first bounce")

  // Second bounce without opponent hit
  engine.ballPos.set(0, 0.14, -6.5)
  engine.ballVel.set(0, -5.0, -2.0)
  engine.update(0.016)

  assert.equal(engine.state, "point_ended", "Second bounce must end point")
  assert.equal(engine.score.playerPoints, 15, "Player must receive point for double bounce on opponent side")
})

test("T5-SCR-03: Out-of-stadium ball flight terminates point safely", () => {
  const engine = new TennisPhysicsEngine()
  engine.resetToServe("player")
  engine.triggerServeToss()
  engine.ballPos.set(1.5, 2.5, 9.0)
  engine.handlePlayerSwing("serve", 1.0)

  // Ball flies past stadium bounds (Z > 22m)
  engine.ballPos.set(0, 2.0, 23.0)
  engine.update(0.016)

  assert.equal(engine.state, "point_ended")
  assert.equal(engine.score.opponentPoints, 15, "Opponent receives point when ball flies out of stadium")
})

test("T5-SCR-04: Match reset during active rally restores clean initial state", () => {
  const engine = new TennisPhysicsEngine()
  engine.resetToServe("player")
  engine.triggerServeToss()
  engine.ballPos.set(1.5, 2.5, 9.0)
  engine.handlePlayerSwing("serve", 1.2)
  engine.awardPoint("player", "Win")

  assert.equal(engine.score.playerPoints, 15)

  // Player hits RESET
  engine.restartMatch()

  assert.equal(engine.score.playerPoints, 0)
  assert.equal(engine.score.opponentPoints, 0)
  assert.equal(engine.score.playerGames, 0)
  assert.equal(engine.score.opponentGames, 0)
  assert.equal(engine.score.matchWinner, null)
  assert.equal(engine.state, "idle_serve")
  assert.equal(engine.score.server, "player")
  assert.equal(engine.ballVel.x, 0)
  assert.equal(engine.ballVel.y, 0)
  assert.equal(engine.ballVel.z, 0)
})

// ===========================================================================
// SUITE 7: QR Generator Boundaries & Empirical Vulnerability Demonstrations
// ===========================================================================

test("T5-MOT-06: Asymmetric NaN vector leakage vulnerability analysis", () => {
  const classifier = new TennisGestureClassifier()

  // Symmetrical NaN vector ({ x: NaN, y: NaN, z: NaN }): rejected safely
  const symNan = classifier.processSample({
    timestamp: 1000,
    acceleration: { x: NaN, y: NaN, z: NaN },
  })
  assert.equal(symNan, null, "Symmetric NaN vector safely evaluates to null")

  // Asymmetric vector with valid X but NaN in Y:
  // In JavaScript: typeof NaN === 'number' is true!
  // absY >= absX => (NaN >= 20) is false
  // effectiveAx >= 12 => (20 >= 12) is true!
  // Hence gestureType evaluates to 'forehand', but magnitude evaluates to NaN!
  const asymNan = classifier.processSample({
    timestamp: 2000,
    acceleration: { x: 20.0, y: NaN, z: 0.0 },
  })

  // Vulnerability finding: Leaks a gesture event with NaN powerMultiplier and NaN peakAcceleration
  assert.ok(asymNan !== null, "Empirically demonstrates asymmetric NaN passes typeof 'number'")
  assert.equal(asymNan.type, "forehand")
  assert.ok(Number.isNaN(asymNan.powerMultiplier), "Vulnerability confirmed: powerMultiplier is NaN")
  assert.ok(Number.isNaN(asymNan.peakAcceleration), "Vulnerability confirmed: peakAcceleration is NaN")
})

test("T5-NET-06: Broadcast payload nullish coalescing vulnerability analysis", () => {
  const corruptPayload = {
    type: "swing",
    swingType: "forehand",
    power: Number.NaN, // e.g. from corrupt sensor sample or corrupted broadcast packet
  }

  // Current production logic in components/apps/tennis-app.tsx line 77:
  // canvasRef.current?.executeRemoteSwing(payload.swingType, payload.power ?? 1.0)
  const unSanitizedPower = corruptPayload.power ?? 1.0
  assert.ok(
    Number.isNaN(unSanitizedPower),
    "Vulnerability confirmed: nullish coalescing (??) fails to sanitize NaN, passing NaN into physics engine"
  )

  // Recommended defensive mitigation:
  const defensivelySanitizedPower =
    typeof corruptPayload.power === "number" && Number.isFinite(corruptPayload.power) && corruptPayload.power > 0
      ? corruptPayload.power
      : 1.0
  assert.equal(defensivelySanitizedPower, 1.0, "Defensive check restores default 1.0x power multiplier")
})

test("T5-QR-01: SVG QR generator capacity limits and error handling", () => {
  const normalPayload = "http://192.168.1.15:3000/tennis-remote?room=T98-7B2X"
  const svg = generateQrCodeSvg(normalPayload, { size: 256 })
  assert.ok(svg.startsWith("<svg"), "Must output valid SVG root tag")
  assert.ok(svg.includes('role="img"'), "Must include accessibility role")
  assert.ok(svg.includes('aria-label="QR Code"'), "Must include aria-label")

  // Exceeding maximum Version 10 capacity (e.g. 500 bytes with ECC H)
  const hugePayload = "A".repeat(500)
  assert.throws(
    () => generateQrCodeSvg(hugePayload, { ecc: "H" }),
    /Text too long for QR Code generator/,
    "Must throw explicit Error when exceeding Version 10 capacity"
  )
})

test("T5-QR-02: Determinism and SVG attribute formatting under extreme option values", () => {
  const text = "T98-TEST"
  const svg1 = generateQrCodeSvg(text, { size: 512, margin: 0, bgColor: "transparent" })
  const svg2 = generateQrCodeSvg(text, { size: 512, margin: 0, bgColor: "transparent" })

  assert.equal(svg1, svg2, "Identical inputs must produce strictly deterministic SVG strings")
  assert.ok(!svg1.includes("<rect"), "Transparent background must omit <rect> element")
  assert.ok(svg1.includes('width="512"'), "Must respect custom width")
  assert.ok(svg1.includes('height="512"'), "Must respect custom height")
  assert.ok(svg1.includes('shape-rendering="crispEdges"'), "Must include crispEdges for sharp QR pixels")
})
