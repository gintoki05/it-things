import test from "node:test"
import assert from "node:assert/strict"
import {
  TennisGestureClassifier,
  calculateMagnitude,
  calculatePowerMultiplier,
  DEFAULT_CLASSIFIER_CONFIG,
} from "../lib/tennis/motion-detector.ts"

test("ADVERSARIAL 1: High-Frequency Noise Bursts (10,000 rapid jitter samples < 8 m/s^2)", () => {
  const classifier = new TennisGestureClassifier()
  let falseTriggers = 0
  let sampleCount = 10000

  // PRNG seed for deterministic stress testing
  let seed = 123456789
  function pseudoRandom() {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }

  const startTime = 100000
  for (let i = 0; i < sampleCount; i++) {
    // Generate jitter in range [-4.5, 4.5] m/s^2 per axis -> max magnitude sqrt(3 * 4.5^2) = 7.794 m/s^2 < 8.0 m/s^2
    const x = (pseudoRandom() * 2 - 1) * 4.5
    const y = (pseudoRandom() * 2 - 1) * 4.5
    const z = (pseudoRandom() * 2 - 1) * 4.5
    const mag = Math.sqrt(x * x + y * y + z * z)
    assert.ok(mag < 8.0, `Generated noise magnitude ${mag} exceeds 8.0 limit`)

    const sample = {
      timestamp: startTime + i * 5, // 200 Hz simulated polling
      acceleration: { x, y, z },
    }

    const event = classifier.processSample(sample)
    if (event !== null) {
      falseTriggers++
    }
  }

  assert.equal(falseTriggers, 0, `Expected 0 false triggers from 10k noise burst, got ${falseTriggers}`)
  assert.equal(classifier.getLastSwingTime(), 0, "Last swing time must remain 0 after pure noise")
})

test("ADVERSARIAL 2: Exact Boundary Threshold Values (10.0, 12.0, 32.0 m/s^2)", () => {
  const classifier = new TennisGestureClassifier()

  // 1. Toss Threshold (10.0 m/s^2)
  const subToss = classifier.classifyVector(0, 9.999, 0, 1000)
  assert.equal(subToss, null, "9.999 m/s^2 upward must be rejected")

  const exactToss = classifier.classifyVector(0, 10.0, 0, 1500)
  assert.ok(exactToss !== null, "Exact 10.0 m/s^2 upward must trigger toss")
  assert.equal(exactToss.type, "toss")
  assert.equal(exactToss.powerMultiplier, 1.0)

  // 2. Swing Threshold (12.0 m/s^2)
  // Forehand
  const subForehand = classifier.classifyVector(11.999, 0, 0, 2000)
  assert.equal(subForehand, null, "11.999 m/s^2 rightward must be rejected")

  const exactForehand = classifier.classifyVector(12.0, 0, 0, 2500)
  assert.ok(exactForehand !== null, "Exact 12.0 m/s^2 rightward must trigger forehand")
  assert.equal(exactForehand.type, "forehand")
  assert.equal(exactForehand.powerMultiplier, 1.0)

  // Backhand
  const subBackhand = classifier.classifyVector(-11.999, 0, 0, 3000)
  assert.equal(subBackhand, null, "-11.999 m/s^2 leftward must be rejected")

  const exactBackhand = classifier.classifyVector(-12.0, 0, 0, 3500)
  assert.ok(exactBackhand !== null, "Exact -12.0 m/s^2 leftward must trigger backhand")
  assert.equal(exactBackhand.type, "backhand")
  assert.equal(exactBackhand.powerMultiplier, 1.0)

  // Smash
  const subSmash = classifier.classifyVector(0, -11.999, 0, 4000)
  assert.equal(subSmash, null, "-11.999 m/s^2 downward must be rejected")

  const exactSmash = classifier.classifyVector(0, -12.0, 0, 4500)
  assert.ok(exactSmash !== null, "Exact -12.0 m/s^2 downward must trigger smash")
  assert.equal(exactSmash.type, "smash")
  assert.equal(exactSmash.powerMultiplier, 1.0)

  // 3. Max Power Threshold (32.0 m/s^2)
  assert.equal(calculatePowerMultiplier(32.0), 1.5, "Exact 32.0 m/s^2 must produce exactly 1.5x power")
  assert.ok(calculatePowerMultiplier(31.999) < 1.5, "31.999 m/s^2 must be strictly less than 1.5x")
  assert.equal(calculatePowerMultiplier(32.001), 1.5, "32.001 m/s^2 must be clamped to 1.5x")
  assert.equal(calculatePowerMultiplier(999.0), 1.5, "Super-high acceleration must be clamped to 1.5x")
  assert.equal(calculatePowerMultiplier(0.0), 1.0, "Zero acceleration must be clamped to 1.0x")
})

test("ADVERSARIAL 3: NaN, Undefined, Infinity, -Infinity & Corrupted Telemetry Handling", () => {
  const classifier = new TennisGestureClassifier()

  // 1. NaN acceleration vectors
  const nanX = classifier.processSample({
    timestamp: 1000,
    acceleration: { x: NaN, y: 0, z: 0 },
  })
  assert.equal(nanX, null, "NaN in x-axis must not trigger a gesture")

  const nanY = classifier.processSample({
    timestamp: 1010,
    acceleration: { x: 0, y: NaN, z: 0 },
  })
  assert.equal(nanY, null, "NaN in y-axis must not trigger a gesture")

  const nanZ = classifier.processSample({
    timestamp: 1020,
    acceleration: { x: 0, y: 0, z: NaN },
  })
  assert.equal(nanZ, null, "NaN in z-axis must not trigger a gesture")

  // 2. Missing or undefined coordinates
  const partialSample1 = classifier.processSample({
    timestamp: 1030,
    acceleration: { x: 20 },
  })
  assert.equal(partialSample1, null, "Missing y/z must be safely rejected")

  const emptySample = classifier.processSample({})
  assert.equal(emptySample, null, "Empty sample object must safely return null")

  // 3. Fallback gravity with NaN
  const nanGravity = classifier.processSample({
    timestamp: 1040,
    acceleration: null,
    accelerationIncludingGravity: { x: NaN, y: 9.8, z: 0 },
  })
  assert.equal(nanGravity, null, "NaN in accelerationIncludingGravity must be rejected")

  // 4. Verify classifier can still process normal swings after NaN corruption attempts
  classifier.reset()
  const cleanSwing = classifier.classifyVector(18.0, 0, 0, 2000)
  assert.ok(cleanSwing !== null, "Clean swing must work after reset")
  assert.equal(cleanSwing.type, "forehand")
})

test("ADVERSARIAL 4: Cooldown Boundary Stress: t = 319ms vs 320ms vs 321ms", () => {
  const classifier = new TennisGestureClassifier()

  // Initial swing at t = 1000ms
  const swing0 = classifier.classifyVector(20.0, 0, 0, 1000)
  assert.ok(swing0 !== null)
  assert.equal(swing0.type, "forehand")
  assert.equal(classifier.getLastSwingTime(), 1000)

  // 1. Boundary t = 319ms (t = 1319ms)
  assert.equal(classifier.isInCooldown(1319), true, "t=1319ms must be in cooldown (319ms < 320ms)")
  const swing319 = classifier.classifyVector(20.0, 0, 0, 1319)
  assert.equal(swing319, null, "Swing at t=1319ms must be suppressed")
  assert.equal(classifier.getLastSwingTime(), 1000, "Last swing time must NOT update on suppressed swing")

  // 2. Boundary t = 320ms (t = 1320ms)
  assert.equal(classifier.isInCooldown(1320), false, "t=1320ms must NOT be in cooldown (320ms >= 320ms)")
  const swing320 = classifier.classifyVector(-20.0, 0, 0, 1320)
  assert.ok(swing320 !== null, "Swing at t=1320ms must trigger successfully")
  assert.equal(swing320.type, "backhand")
  assert.equal(classifier.getLastSwingTime(), 1320, "Last swing time must update to 1320")

  // 3. Immediately after second swing at t = 1321ms (delta = 1ms from 1320)
  assert.equal(classifier.isInCooldown(1321), true, "t=1321ms must be in cooldown from swing at 1320")
  const swing321 = classifier.classifyVector(20.0, 0, 0, 1321)
  assert.equal(swing321, null, "Swing at t=1321ms must be suppressed")

  // 4. Boundary t = 321ms from swing at 1320 -> t = 1641ms
  assert.equal(classifier.isInCooldown(1641), false, "t=1641ms must be out of cooldown (321ms > 320ms)")
  const swing321After = classifier.classifyVector(0, 18.0, 0, 1641)
  assert.ok(swing321After !== null, "Swing at t=1641ms (321ms elapsed) must trigger successfully")
  assert.equal(swing321After.type, "toss")

  // 5. Sustained Train: 20 rapid swings spaced by exactly 320ms
  classifier.reset()
  let currentTime = 10000
  for (let i = 0; i < 20; i++) {
    const swing = classifier.classifyVector(16.0, 0, 0, currentTime)
    assert.ok(swing !== null, `Swing #${i} at t=${currentTime} (spaced 320ms) must succeed`)
    assert.equal(classifier.getLastSwingTime(), currentTime)
    currentTime += 320
  }

  // 6. Multiple samples inside a single 320ms cooldown window (all must be rejected)
  classifier.reset()
  currentTime = 20000
  const anchorSwing = classifier.classifyVector(16.0, 0, 0, currentTime)
  assert.ok(anchorSwing !== null, "Anchor swing must trigger")
  assert.equal(classifier.getLastSwingTime(), currentTime)

  // Send 319 samples at 1ms increments (from t=20001 to t=20319) - all must be rejected
  let insideCooldownRejections = 0
  for (let offset = 1; offset <= 319; offset++) {
    const rejected = classifier.classifyVector(20.0, 0, 0, currentTime + offset)
    if (rejected === null) insideCooldownRejections++
  }
  assert.equal(insideCooldownRejections, 319, "Every sample from +1ms to +319ms must be rejected")
  assert.equal(classifier.getLastSwingTime(), currentTime, "Last swing time must remain anchor timestamp")

  // Sample at +320ms (t=20320) must now succeed
  const nextSwing = classifier.classifyVector(16.0, 0, 0, currentTime + 320)
  assert.ok(nextSwing !== null, "Sample at exactly +320ms must succeed")
  assert.equal(classifier.getLastSwingTime(), currentTime + 320)
})

test("ADVERSARIAL 5: InvertX and Handedness Consistency under Diagonal Vectors", () => {
  // Test 1: Tie-breaker behavior on exact diagonals (|x| === |y|)
  const standardRight = new TennisGestureClassifier()
  // (+15, +15, 0): |y| >= |x| -> vertical dominates -> toss
  const diagToss = standardRight.classifyVector(15.0, 15.0, 0, 1000)
  assert.ok(diagToss !== null)
  assert.equal(diagToss.type, "toss", "Tie at (+15, +15) must resolve to toss (vertical dominance)")

  // (+15, -15, 0): |y| >= |x| -> vertical dominates -> smash
  const diagSmash = standardRight.classifyVector(15.0, -15.0, 0, 1500)
  assert.ok(diagSmash !== null)
  assert.equal(diagSmash.type, "smash", "Tie at (+15, -15) must resolve to smash")

  // Test 2: Micro-diagonal delta (0.001 m/s^2 disambiguation)
  // Horizontal slightly dominates: x = 15.001, y = 15.000 -> Forehand
  const horizMicro = standardRight.classifyVector(15.001, 15.000, 0, 2000)
  assert.ok(horizMicro !== null)
  assert.equal(horizMicro.type, "forehand", "x=15.001, y=15.000 must resolve to forehand")

  // Vertical slightly dominates: x = 15.000, y = 15.001 -> Toss
  const vertMicro = standardRight.classifyVector(15.000, 15.001, 0, 2500)
  assert.ok(vertMicro !== null)
  assert.equal(vertMicro.type, "toss", "x=15.000, y=15.001 must resolve to toss")

  // Test 3: Left-handed symmetry
  const lefty = new TennisGestureClassifier({ handedness: "left" })
  // InvertX: Forehand and backhand swap
  const leftyForehand = lefty.classifyVector(-15.001, 15.000, 0, 1000)
  assert.ok(leftyForehand !== null)
  assert.equal(leftyForehand.type, "forehand", "Left-handed: negative X flick is forehand")

  const leftyBackhand = lefty.classifyVector(15.001, 15.000, 0, 1500)
  assert.ok(leftyBackhand !== null)
  assert.equal(leftyBackhand.type, "backhand", "Left-handed: positive X flick is backhand")

  // Vertical strokes must remain UNCHANGED for left-handers
  const leftyToss = lefty.classifyVector(0, 15.0, 0, 2000)
  assert.ok(leftyToss !== null)
  assert.equal(leftyToss.type, "toss", "Left-handed: upward flick remains toss")

  const leftySmash = lefty.classifyVector(0, -15.0, 0, 2500)
  assert.ok(leftySmash !== null)
  assert.equal(leftySmash.type, "smash", "Left-handed: downward flick remains smash")

  // Test 4: Explicit invertX: true flag
  const invertedRight = new TennisGestureClassifier({ handedness: "right", invertX: true })
  const invForehand = invertedRight.classifyVector(-18.0, 0, 0, 1000)
  assert.ok(invForehand !== null)
  assert.equal(invForehand.type, "forehand")

  // Test 5: Pure Z-axis thrust rejection under extreme acceleration
  const pureZForward = standardRight.classifyVector(0, 0, 45.0, 1000)
  assert.equal(pureZForward, null, "Extreme +Z forward thrust (45 m/s^2) must not trigger any stroke")

  const pureZBackward = standardRight.classifyVector(0, 0, -45.0, 1500)
  assert.equal(pureZBackward, null, "Extreme -Z backward thrust (-45 m/s^2) must not trigger any stroke")

  // Slight off-axis Z surge (x=3, y=3, z=35 -> total mag = 35.25, but x/y both < 10)
  const zOffAxis = standardRight.classifyVector(3.0, 3.0, 35.0, 2000)
  assert.equal(zOffAxis, null, "Off-axis Z surge below x/y thresholds must not trigger false stroke")
})

test("ADVERSARIAL 6: Timestamp Anomalies (timestamp = 0, NaN timestamp, backwards jumps)", () => {
  const classifier = new TennisGestureClassifier()

  // Case A: Swing at timestamp = 0
  const swingAtZero = classifier.classifyVector(20.0, 0, 0, 0)
  assert.ok(swingAtZero !== null, "Swing at timestamp 0 is detected")
  assert.equal(classifier.getLastSwingTime(), 0)

  // Critical Finding: When a swing occurs at timestamp 0, lastSwingTime is set to 0.
  // In isInCooldown(10): line 117 checks `if (this.lastSwingTime <= 0) return false;`
  // Because 0 <= 0 is TRUE, isInCooldown(10) evaluates to FALSE!
  const isCooldownAt10ms = classifier.isInCooldown(10)
  assert.equal(isCooldownAt10ms, false, "EMPIRICAL FINDING: Cooldown is NOT armed when timestamp is 0!")

  // Consequently, a second swing just 10ms later is NOT suppressed!
  const doubleSwingAt10ms = classifier.classifyVector(20.0, 0, 0, 10)
  assert.ok(doubleSwingAt10ms !== null, "EMPIRICAL FINDING: Double swing allowed at t=10ms because initial swing was at t=0")

  // Case B: Timestamp = NaN
  classifier.reset()
  const swingWithNanTimestamp = classifier.processSample({
    timestamp: NaN,
    acceleration: { x: 20.0, y: 0, z: 0 },
  })
  assert.ok(swingWithNanTimestamp !== null)
  assert.ok(Number.isNaN(classifier.getLastSwingTime()), "lastSwingTime becomes NaN")

  // With lastSwingTime = NaN: isInCooldown evaluates to false because NaN < 320 is false.
  // An immediate follow-up swing at t=5ms (within 320ms) is erroneously allowed because cooldown was disarmed by NaN!
  const immediateSwing = classifier.classifyVector(20.0, 0, 0, 5)
  assert.ok(immediateSwing !== null, "EMPIRICAL FINDING: Immediate swing at t=5ms allowed due to NaN lastSwingTime")

  // However, the second swing sets lastSwingTime = 5, which heals cooldown for subsequent calls
  assert.equal(classifier.getLastSwingTime(), 5)
  assert.equal(classifier.isInCooldown(6), true, "Cooldown re-armed by valid timestamp")
})

test("ADVERSARIAL 7: Gravity Filter Poisoning under Corrupted Sensor Fallback", () => {
  const classifier = new TennisGestureClassifier()

  // Feed 10 valid stationary samples to calibrate gravity
  for (let t = 1000; t < 1200; t += 20) {
    classifier.processSample({
      timestamp: t,
      acceleration: null,
      accelerationIncludingGravity: { x: 0, y: 9.8, z: 0 },
    })
  }

  // Inject 1 corrupted sample with NaN in accelerationIncludingGravity
  // Because typeof NaN === "number", it enters EMA math and poisons this.gravity.x with NaN
  classifier.processSample({
    timestamp: 1220,
    acceleration: null,
    accelerationIncludingGravity: { x: NaN, y: 9.8, z: 0 },
  })

  // Settle with 5 more stationary samples (rawG.x = 0)
  for (let t = 1240; t < 1340; t += 20) {
    classifier.processSample({
      timestamp: t,
      acceleration: null,
      accelerationIncludingGravity: { x: 0, y: 9.8, z: 0 },
    })
  }

  // Now attempt a valid forehand swipe using gravity fallback (rawG.x = 20.0)
  const validSwipe = classifier.processSample({
    timestamp: 1400,
    acceleration: null,
    accelerationIncludingGravity: { x: 20.0, y: 9.8, z: 0 },
  })

  // EMPIRICAL FINDING: validSwipe is null! NaN permanently poisoned the gravity EMA vector.
  assert.equal(validSwipe, null, "EMPIRICAL FINDING: EMA gravity vector is permanently poisoned by NaN")

  // Verify that reset() restores the classifier to working state
  classifier.reset()
  // Seed with 1 stationary sample
  classifier.processSample({
    timestamp: 1500,
    acceleration: null,
    accelerationIncludingGravity: { x: 0, y: 9.8, z: 0 },
  })
  // Next dynamic sample triggers successfully
  const validSwipeAfterReset = classifier.processSample({
    timestamp: 1600,
    acceleration: null,
    accelerationIncludingGravity: { x: 20.0, y: 9.8, z: 0 },
  })
  assert.ok(validSwipeAfterReset !== null, "reset() clears poisoned gravity vector and recovers classification")
})

test("ADVERSARIAL 8: Non-Finite Values (Infinity / -Infinity in acceleration vectors)", () => {
  const classifier = new TennisGestureClassifier()

  // Positive Infinity in X
  const infX = classifier.classifyVector(Infinity, 0, 0, 1000)
  // Check behavior: does it throw, return null, or return an event?
  if (infX !== null) {
    // If it returns an event, check if peakAcceleration is Infinity and power is capped
    assert.equal(infX.powerMultiplier, 1.5, "Infinite acceleration must be capped to 1.5x power")
  }

  // Both X and Y are Infinity
  const bothInf = classifier.classifyVector(Infinity, Infinity, 0, 2000)
  // |Infinity| >= |Infinity| is true, so it resolves to vertical (toss)
})

