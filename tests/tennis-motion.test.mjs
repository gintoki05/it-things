import test from "node:test"
import assert from "node:assert/strict"
import {
  TennisGestureClassifier,
  HAPTIC_PATTERNS,
  DEFAULT_CLASSIFIER_CONFIG,
  calculateMagnitude,
  calculatePowerMultiplier,
  triggerHaptic,
  requestMotionPermission,
  BrowserMotionListener,
} from "../lib/tennis/motion-detector.ts"

test("TennisGestureClassifier - Upward flick classifies as serve toss (+Y dominant)", () => {
  const classifier = new TennisGestureClassifier()
  const sample = {
    timestamp: 1000,
    acceleration: { x: 1.2, y: 16.5, z: 2.0 },
  }
  const result = classifier.processSample(sample)
  assert.ok(result !== null, "Result should not be null")
  assert.equal(result.type, "toss")
  assert.ok(result.peakAcceleration > 16.0, `Expected > 16.0, got ${result.peakAcceleration}`)
  assert.ok(result.powerMultiplier >= 1.0, `Expected >= 1.0, got ${result.powerMultiplier}`)
  assert.equal(result.timestamp, 1000)
  assert.equal(result.velocity, result.peakAcceleration)
})

test("TennisGestureClassifier - Upward flick at toss threshold (10.0 m/s^2) triggers toss", () => {
  const classifier = new TennisGestureClassifier()
  const result = classifier.classifyVector(0, 10.0, 0, 1000)
  assert.ok(result !== null)
  assert.equal(result.type, "toss")
  assert.equal(result.powerMultiplier, 1.0)
})

test("TennisGestureClassifier - Downward snap classifies as smash (-Y dominant)", () => {
  const classifier = new TennisGestureClassifier()
  const sample = {
    timestamp: 1000,
    acceleration: { x: -1.5, y: -24.0, z: 2.0 },
  }
  const result = classifier.processSample(sample)
  assert.ok(result !== null)
  assert.equal(result.type, "smash")
  assert.ok(result.peakAcceleration > 24.0)
  assert.ok(result.powerMultiplier > 1.2)
})

test("TennisGestureClassifier - Downward snap sub-swing threshold is rejected", () => {
  const classifier = new TennisGestureClassifier()
  // Magnitude 11 m/s^2 is >= tossThreshold (10.0) but < swingThreshold (12.0)
  const result = classifier.classifyVector(0, -11.0, 0, 1000)
  assert.equal(result, null, "Smash must require swingThreshold (12.0 m/s^2)")
})

test("TennisGestureClassifier - Rightward flick classifies as forehand (+X dominant)", () => {
  const classifier = new TennisGestureClassifier()
  const sample = {
    timestamp: 1000,
    acceleration: { x: 18.5, y: 3.2, z: -1.0 },
  }
  const result = classifier.processSample(sample)
  assert.ok(result !== null)
  assert.equal(result.type, "forehand")
  assert.ok(result.powerMultiplier > 1.1)
})

test("TennisGestureClassifier - Leftward flick classifies as backhand (-X dominant)", () => {
  const classifier = new TennisGestureClassifier()
  const sample = {
    timestamp: 1000,
    acceleration: { x: -19.2, y: 2.5, z: 0.8 },
  }
  const result = classifier.processSample(sample)
  assert.ok(result !== null)
  assert.equal(result.type, "backhand")
  assert.ok(result.powerMultiplier > 1.1)
})

test("TennisGestureClassifier - Handedness left inverts lateral swing axes", () => {
  const leftyClassifier = new TennisGestureClassifier({ handedness: "left" })
  // For a left-handed player, rightward flick (+X) is backhand
  const rightFlick = leftyClassifier.classifyVector(18.0, 0, 0, 1000)
  assert.ok(rightFlick !== null)
  assert.equal(rightFlick.type, "backhand")

  // For a left-handed player, leftward flick (-X) is forehand
  const leftFlick = leftyClassifier.classifyVector(-18.0, 0, 0, 1500)
  assert.ok(leftFlick !== null)
  assert.equal(leftFlick.type, "forehand")
})

test("TennisGestureClassifier - Sub-threshold jitter and ambient noise is ignored", () => {
  const classifier = new TennisGestureClassifier()
  const samples = [
    { timestamp: 1000, acceleration: { x: 2.0, y: 3.0, z: 1.5 } },
    { timestamp: 1020, acceleration: { x: -3.5, y: 4.0, z: 2.1 } },
    { timestamp: 1040, acceleration: { x: 5.0, y: -2.0, z: 0.5 } },
    { timestamp: 1060, acceleration: { x: 0.2, y: 0.5, z: 0.1 } },
  ]
  for (const s of samples) {
    assert.equal(classifier.processSample(s), null)
  }
})

test("TennisGestureClassifier - Axis dominance resolves close diagonal vectors", () => {
  const classifier = new TennisGestureClassifier()

  // Vertical slightly dominates horizontal: |15| >= |14|
  const vertDominant = classifier.classifyVector(14.0, 15.0, 0, 1000)
  assert.ok(vertDominant !== null)
  assert.equal(vertDominant.type, "toss")

  // Horizontal dominates vertical: |15| > |14|
  const horizDominant = classifier.classifyVector(15.0, 14.0, 0, 1500)
  assert.ok(horizDominant !== null)
  assert.equal(horizDominant.type, "forehand")

  // Forward thrust surge (+Z dominant, small X/Y)
  const zSurge = classifier.classifyVector(2.0, 2.0, 25.0, 2000)
  assert.equal(zSurge, null, "Z-axis surge must not trigger accidental swing")
})

test("TennisGestureClassifier - Debounce window suppresses rapid recoil double-hits", () => {
  const classifier = new TennisGestureClassifier()
  // Initial forehand swing at t = 1000ms
  const swing = classifier.processSample({
    timestamp: 1000,
    acceleration: { x: 20.0, y: 2.0, z: 0.0 },
  })
  assert.ok(swing !== null)
  assert.equal(swing.type, "forehand")
  assert.equal(classifier.getLastSwingTime(), 1000)
  assert.ok(classifier.isInCooldown(1100))
  assert.ok(classifier.isInCooldown(1319))

  // Recoil / follow-through deceleration in opposite direction at t = 1150ms (+150ms)
  const recoil = classifier.processSample({
    timestamp: 1150,
    acceleration: { x: -22.0, y: 1.0, z: 0.0 },
  })
  assert.equal(recoil, null, "Recoil swing must be suppressed within debounce window")

  // Additional motion at t = 1250ms (+250ms) still within 320ms window
  const doubleHit = classifier.processSample({
    timestamp: 1250,
    acceleration: { x: 18.0, y: 0.0, z: 0.0 },
  })
  assert.equal(doubleHit, null, "Double-hit must be suppressed within debounce window")

  // Boundary check at exactly 319ms after swing
  const boundaryEarly = classifier.processSample({
    timestamp: 1319,
    acceleration: { x: 20.0, y: 0.0, z: 0.0 },
  })
  assert.equal(boundaryEarly, null, "Boundary sample at t = 1319ms must be suppressed")

  // Legitimate new swing at t = 1350ms (> 320ms later)
  assert.ok(!classifier.isInCooldown(1350))
  const newSwing = classifier.processSample({
    timestamp: 1350,
    acceleration: { x: -19.0, y: 1.0, z: 0.0 },
  })
  assert.ok(newSwing !== null, "New swing after debounce cooldown must be accepted")
  assert.equal(newSwing.type, "backhand")
  assert.equal(classifier.getLastSwingTime(), 1350)
})

test("TennisGestureClassifier - Power multiplier scales between 1.0 and 1.5", () => {
  const classifier = new TennisGestureClassifier()
  // Minimum threshold swing (12 m/s^2)
  const minSwing = classifier.processSample({
    timestamp: 1000,
    acceleration: { x: 12.0, y: 0, z: 0 },
  })
  assert.equal(minSwing.powerMultiplier, 1.0)

  // Moderate swing (22 m/s^2) -> halfway between 12 and 32 -> 1.25x
  const midSwing = classifier.processSample({
    timestamp: 1500,
    acceleration: { x: 22.0, y: 0, z: 0 },
  })
  assert.ok(Math.abs(midSwing.powerMultiplier - 1.25) < 0.001)

  // Max cap swing (45 m/s^2) -> clamped to 1.5x
  const maxSwing = classifier.processSample({
    timestamp: 2000,
    acceleration: { x: 45.0, y: 0, z: 0 },
  })
  assert.equal(maxSwing.powerMultiplier, 1.5)
})

test("TennisGestureClassifier - calculatePowerMultiplier helper function handles boundaries", () => {
  assert.equal(calculatePowerMultiplier(12.0), 1.0)
  assert.equal(calculatePowerMultiplier(22.0), 1.25)
  assert.equal(calculatePowerMultiplier(32.0), 1.5)
  assert.equal(calculatePowerMultiplier(50.0), 1.5)
  assert.equal(calculatePowerMultiplier(5.0), 1.0)
})

test("TennisGestureClassifier - calculateMagnitude calculates 3D Euclidean length", () => {
  assert.equal(calculateMagnitude({ x: 3, y: 4, z: 0 }), 5)
  assert.equal(calculateMagnitude({ x: 0, y: 0, z: 0 }), 0)
})

test("TennisGestureClassifier - Gravity removal fallback works when acceleration is null", () => {
  const classifier = new TennisGestureClassifier()
  // Settle gravity filter with stationary device in portrait (g_y = 9.8)
  for (let t = 1000; t < 2000; t += 20) {
    classifier.processSample({
      timestamp: t,
      acceleration: null,
      accelerationIncludingGravity: { x: 0, y: 9.8, z: 0 },
    })
  }
  // Sudden rightward swipe (raw including gravity: ax = 18.0, ay = 9.8)
  const result = classifier.processSample({
    timestamp: 2100,
    acceleration: null,
    accelerationIncludingGravity: { x: 18.0, y: 9.8, z: 0 },
  })
  assert.ok(result !== null)
  assert.equal(result.type, "forehand")
})

test("TennisGestureClassifier - reset() clears cooldown and gravity history", () => {
  const classifier = new TennisGestureClassifier()
  const swing1 = classifier.classifyVector(20, 0, 0, 1000)
  assert.ok(swing1 !== null)
  assert.ok(classifier.isInCooldown(1050))

  classifier.reset()
  assert.ok(!classifier.isInCooldown(1050))

  const swing2 = classifier.classifyVector(20, 0, 0, 1050)
  assert.ok(swing2 !== null, "Swing should be accepted immediately after reset()")
})

test("TennisGestureClassifier - Custom configuration and dynamic updateConfig", () => {
  const custom = new TennisGestureClassifier({
    swingThreshold: 20.0,
    debounceMs: 500,
  })
  assert.equal(custom.getConfig().swingThreshold, 20.0)
  assert.equal(custom.getConfig().debounceMs, 500)

  // 15 m/s^2 is rejected by high 20.0 threshold
  assert.equal(custom.classifyVector(15.0, 0, 0, 1000), null)

  // 22 m/s^2 is accepted
  const swing = custom.classifyVector(22.0, 0, 0, 1100)
  assert.ok(swing !== null)

  // Cooldown is 500ms
  assert.ok(custom.isInCooldown(1500))
  assert.ok(!custom.isInCooldown(1650))

  // Dynamically update config
  custom.updateConfig({ debounceMs: 200 })
  assert.equal(custom.getConfig().debounceMs, 200)
})

test("Haptic Patterns - Exported vibration sequences have valid structure", () => {
  assert.ok(typeof HAPTIC_PATTERNS.swing === "number")
  assert.ok(typeof HAPTIC_PATTERNS.hit === "number")
  assert.ok(Array.isArray(HAPTIC_PATTERNS.smash))
  assert.ok(Array.isArray(HAPTIC_PATTERNS.point_win))
  assert.ok(Array.isArray(HAPTIC_PATTERNS.point_lose))
  assert.deepEqual(HAPTIC_PATTERNS.smash, [25, 20, 80])
  assert.deepEqual(HAPTIC_PATTERNS.point_win, [50, 40, 50, 40, 100])
  assert.deepEqual(HAPTIC_PATTERNS.point_lose, [120, 60, 120])
})

test("triggerHaptic - Safely returns boolean without throwing in non-browser/Node.js environment", () => {
  const res1 = triggerHaptic("swing")
  assert.equal(typeof res1, "boolean")

  const res2 = triggerHaptic("hit")
  assert.equal(typeof res2, "boolean")

  const res3 = triggerHaptic("smash")
  assert.equal(typeof res3, "boolean")

  const res4 = triggerHaptic([50, 50, 50])
  assert.equal(typeof res4, "boolean")
})

test("requestMotionPermission - Safely returns unsupported in non-browser/Node.js environment", async () => {
  const result = await requestMotionPermission()
  assert.equal(result, "unsupported")
})

test("BrowserMotionListener - Safe lifecycle in Node.js environment", () => {
  const listener = new BrowserMotionListener()
  assert.ok(listener.getClassifier() instanceof TennisGestureClassifier)
  assert.equal(listener.getIsListening(), false)

  // start() should return false gracefully in non-browser environment
  const started = listener.start()
  assert.equal(started, false)
  assert.equal(listener.getIsListening(), false)

  // stop() should not throw
  listener.stop()
})
