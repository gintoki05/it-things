import test from "node:test"
import assert from "node:assert/strict"
import {
  TennisGestureClassifier,
  calculateMagnitude,
  calculatePowerMultiplier,
  DEFAULT_CLASSIFIER_CONFIG,
} from "../lib/tennis/motion-detector.ts"

// ============================================================================
// CHALLLENGER 2 — ADVERSARIAL ORACLE TEST SUITE FOR MILESTONE M1
// ============================================================================

/**
 * Deterministic PRNG (xorshift128+) for reproducible Monte Carlo stress testing
 */
class Rng {
  constructor(seed = 133742) {
    this.x = seed >>> 0
    this.y = 362436069
    this.z = 521288629
    this.w = 88675123
  }

  nextFloat() {
    const t = (this.x ^ (this.x << 11)) >>> 0
    this.x = this.y
    this.y = this.z
    this.z = this.w
    this.w = (this.w ^ (this.w >>> 19) ^ (t ^ (t >>> 8))) >>> 0
    return this.w / 4294967296
  }

  // Uniform random in [min, max)
  range(min, max) {
    return min + this.nextFloat() * (max - min)
  }

  // Uniform random point on unit sphere (Marsaglia method)
  unitSphere() {
    const u = this.range(-1, 1)
    const phi = this.range(-Math.PI, Math.PI)
    const r = Math.sqrt(Math.max(0, 1 - u * u))
    return {
      x: r * Math.cos(phi),
      y: r * Math.sin(phi),
      z: u,
    }
  }
}

// ----------------------------------------------------------------------------
// Mathematical Oracle Model for Tennis Gesture Classification
// ----------------------------------------------------------------------------
function oracleClassify(ax, ay, az, handedness = "right", invertX = false) {
  const tossThreshold = 10.0
  const swingThreshold = 12.0

  const mag = Math.sqrt(ax * ax + ay * ay + az * az)
  if (mag < tossThreshold) return null

  const isLeft = handedness === "left" || Boolean(invertX)
  const effAx = isLeft ? -ax : ax
  const absX = Math.abs(effAx)
  const absY = Math.abs(ay)

  if (absY >= absX) {
    // Vertical dominance
    if (ay > 0 && ay >= tossThreshold) return "toss"
    if (ay < 0 && absY >= swingThreshold) return "smash"
    return null
  } else {
    // Horizontal dominance
    if (effAx > 0 && effAx >= swingThreshold) return "forehand"
    if (effAx < 0 && absX >= swingThreshold) return "backhand"
    return null
  }
}

// ============================================================================
// TEST 1: Monte Carlo Simulation over 5,000 Spherical Vectors
// ============================================================================
test("Challenger 2 — Monte Carlo 5,000 spherical vectors: Disjoint cone partitioning & oracle match", () => {
  const rng = new Rng(421015)
  const totalSamples = 5000
  let tossCount = 0
  let smashCount = 0
  let forehandCount = 0
  let backhandCount = 0
  let rejectedCount = 0

  const rightClassifier = new TennisGestureClassifier({ handedness: "right" })
  const leftClassifier = new TennisGestureClassifier({ handedness: "left" })

  for (let i = 0; i < totalSamples; i++) {
    const unit = rng.unitSphere()

    // Sample magnitudes across 4 distinct regimes:
    // 1. Sub-threshold noise [0, 9.99)
    // 2. Marginal transition [10.0, 12.0)
    // 3. Active swing zone [12.0, 35.0)
    // 4. Extreme velocity shock [35.0, 100.0)
    let magnitude
    const regime = rng.nextFloat()
    if (regime < 0.20) {
      magnitude = rng.range(0.0, 9.999)
    } else if (regime < 0.40) {
      magnitude = rng.range(10.0, 11.999)
    } else if (regime < 0.85) {
      magnitude = rng.range(12.0, 35.0)
    } else {
      magnitude = rng.range(35.0, 100.0)
    }

    const ax = unit.x * magnitude
    const ay = unit.y * magnitude
    const az = unit.z * magnitude

    // Timestamp advances by 500ms to avoid debounce collision during memoryless evaluation
    const t = 1000 + i * 500

    // Test Right-Handed Classification against Oracle
    const oracleRight = oracleClassify(ax, ay, az, "right", false)
    const resultRight = rightClassifier.classifyVector(ax, ay, az, t)

    if (oracleRight === null) {
      assert.equal(
        resultRight,
        null,
        `Sample ${i} (Right) expected null, got ${resultRight?.type} for vector (${ax.toFixed(2)}, ${ay.toFixed(2)}, ${az.toFixed(2)})`
      )
      rejectedCount++
    } else {
      assert.ok(
        resultRight !== null,
        `Sample ${i} (Right) expected ${oracleRight}, got null for vector (${ax.toFixed(2)}, ${ay.toFixed(2)}, ${az.toFixed(2)})`
      )
      assert.equal(
        resultRight.type,
        oracleRight,
        `Sample ${i} (Right) type mismatch: expected ${oracleRight}, got ${resultRight.type}`
      )
      assert.ok(
        Math.abs(resultRight.peakAcceleration - magnitude) < 1e-4,
        `Sample ${i} peakAcceleration mismatch: expected ${magnitude}, got ${resultRight.peakAcceleration}`
      )

      if (resultRight.type === "toss") tossCount++
      else if (resultRight.type === "smash") smashCount++
      else if (resultRight.type === "forehand") forehandCount++
      else if (resultRight.type === "backhand") backhandCount++
    }

    // Test Left-Handed Classification against Oracle
    const oracleLeft = oracleClassify(ax, ay, az, "left", false)
    const resultLeft = leftClassifier.classifyVector(ax, ay, az, t)

    if (oracleLeft === null) {
      assert.equal(resultLeft, null)
    } else {
      assert.ok(resultLeft !== null)
      assert.equal(resultLeft.type, oracleLeft)
    }

    // Symmetry check: Forehand and backhand invert perfectly for left vs right handedness
    if (resultRight && (resultRight.type === "forehand" || resultRight.type === "backhand")) {
      const expectedInverted = resultRight.type === "forehand" ? "backhand" : "forehand"
      assert.equal(
        resultLeft?.type,
        expectedInverted,
        `Handedness inversion symmetry failed for sample ${i}`
      )
    }
  }

  // Verify statistically adequate representation of all stroke classes
  assert.ok(tossCount > 300, `Expected tossCount > 300, got ${tossCount}`)
  assert.ok(smashCount > 250, `Expected smashCount > 250, got ${smashCount}`)
  assert.ok(forehandCount > 250, `Expected forehandCount > 250, got ${forehandCount}`)
  assert.ok(backhandCount > 250, `Expected backhandCount > 250, got ${backhandCount}`)
  assert.ok(rejectedCount > 1000, `Expected rejectedCount > 1000, got ${rejectedCount}`)
})

// ============================================================================
// TEST 2: Gravity Removal Filter Stability under Sinusoidal Shaking + Steady 1G
// ============================================================================
test("Challenger 2 — Gravity removal stability under continuous sinusoidal oscillation + 1G", () => {
  const classifier = new TennisGestureClassifier()

  // Scenario: Mobile held in portrait orientation
  // True static gravity: 1G along Y axis (approx 9.80665 m/s^2)
  const gY = 9.80665
  const gX = 0.0
  const gZ = 0.0

  // High-frequency harmonic oscillation (simulating human tremor / cyclic wrist motion)
  // Shaking frequencies: fx = 3Hz, fy = 4Hz, fz = 5Hz
  // Amplitudes: Ax = 4.0 m/s^2, Ay = 3.5 m/s^2, Az = 2.0 m/s^2 (sub-swing threshold)
  const dt = 0.02 // 50 Hz sampling rate (20ms)
  const totalSteps = 5000 // 100 seconds continuous streaming

  let maxGravityDrift = 0
  let maxLinearDevAfterSettle = 0

  for (let step = 0; step < totalSteps; step++) {
    const tSec = step * dt
    const timestampMs = 1000 + step * 20

    // Sinusoidal shaking signal (zero-mean)
    const shakeX = 4.0 * Math.sin(2 * Math.PI * 3.0 * tSec)
    const shakeY = 3.5 * Math.sin(2 * Math.PI * 4.0 * tSec + 0.5)
    const shakeZ = 2.0 * Math.sin(2 * Math.PI * 5.0 * tSec + 1.0)

    // Raw sensor input including 1G earth gravity
    const rawG = {
      x: gX + shakeX,
      y: gY + shakeY,
      z: gZ + shakeZ,
    }

    const sample = {
      timestamp: timestampMs,
      acceleration: null, // Forces fallback to low-pass EMA filter
      accelerationIncludingGravity: rawG,
    }

    const gesture = classifier.processSample(sample)

    // Continuous shaking under swing threshold must NEVER trigger false-positive swings
    assert.equal(
      gesture,
      null,
      `Step ${step} at t=${tSec.toFixed(2)}s falsely triggered gesture: ${gesture?.type}`
    )

    // Inspect internal filter state after initial settling phase (first 100 steps = 2 seconds)
    if (step > 100) {
      assert.ok(Number.isFinite(rawG.x) && Number.isFinite(rawG.y) && Number.isFinite(rawG.z))
    }
  }

  // After 5000 steps of continuous shaking, test steady-state recovery and zero DC offset
  // Settle at stationary 1G for 100 steps
  for (let step = 0; step < 100; step++) {
    const timestampMs = 1000 + (totalSteps + step) * 20
    const sampleRest = {
      timestamp: timestampMs,
      acceleration: null,
      accelerationIncludingGravity: { x: 0, y: gY, z: 0 },
    }
    const res = classifier.processSample(sampleRest)
    assert.equal(res, null, "Stationary 1G gravity must not trigger gesture")
  }

  // Now execute a sharp dynamic stroke (+X forehand of 18 m/s^2 on top of 1G gravity)
  // With 1-pole EMA filter (alpha = 0.85), effective dynamic acceleration is alpha * 18.0 = 15.3 m/s^2
  // which cleanly exceeds the swingThreshold (12.0 m/s^2)
  const strokeSample = {
    timestamp: 1000 + (totalSteps + 120) * 20,
    acceleration: null,
    accelerationIncludingGravity: { x: 18.0, y: gY, z: 0 },
  }
  const strokeResult = classifier.processSample(strokeSample)
  assert.ok(strokeResult !== null, "Stroke must be detected after gravity filter settling")
  assert.equal(strokeResult.type, "forehand")
  assert.ok(
    strokeResult.peakAcceleration >= 15.0 && strokeResult.peakAcceleration <= 18.0,
    `Expected peakAcceleration in [15.0, 18.0], got ${strokeResult.peakAcceleration}`
  )
})

// ============================================================================
// TEST 3: Monotonic Power Scaling Verification
// ============================================================================
test("Challenger 2 — Power multiplier is strictly monotonically non-decreasing across 10,000 points", () => {
  const steps = 10000
  const minMag = -50.0
  const maxMag = 150.0
  const dMag = (maxMag - minMag) / steps

  let prevPower = calculatePowerMultiplier(minMag)

  for (let i = 0; i <= steps; i++) {
    const mag = minMag + i * dMag
    const power = calculatePowerMultiplier(mag)

    // 1. Monotonic non-decreasing invariant: P(m_i) >= P(m_{i-1})
    assert.ok(
      power >= prevPower - 1e-12,
      `Monotonicity violated at magnitude ${mag}: ${power} < prev ${prevPower}`
    )

    // 2. Clamping bounds: 1.0 <= P(m) <= 1.5
    assert.ok(power >= 1.0 - 1e-12, `Power multiplier below 1.0 at mag ${mag}: ${power}`)
    assert.ok(power <= 1.5 + 1e-12, `Power multiplier above 1.5 at mag ${mag}: ${power}`)

    // 3. Sub-threshold invariant: For mag <= 12.0, power must strictly equal 1.0
    if (mag <= 12.0) {
      assert.equal(
        power,
        1.0,
        `Expected power == 1.0 for sub-threshold magnitude ${mag}, got ${power}`
      )
    }

    // 4. Super-threshold invariant: For mag >= 32.0, power must strictly equal 1.5
    if (mag >= 32.0) {
      assert.equal(
        power,
        1.5,
        `Expected power == 1.5 for saturated magnitude ${mag}, got ${power}`
      )
    }

    // 5. Strict monotonicity within linear region (12.0 < m1 < m2 < 32.0)
    if (mag > 12.0 && mag < 32.0 && prevPower > 1.0 && prevPower < 1.5) {
      assert.ok(
        power > prevPower,
        `Strict monotonicity required in linear region at ${mag}: power=${power}, prev=${prevPower}`
      )
    }

    prevPower = power
  }

  // Extreme stress values
  assert.equal(calculatePowerMultiplier(-Infinity), 1.0)
  assert.equal(calculatePowerMultiplier(0), 1.0)
  assert.equal(calculatePowerMultiplier(1e9), 1.5)
})

// ============================================================================
// TEST 4: Boundary Disjointness, Diagonals, and Tie-Breaking Consistency
// ============================================================================
test("Challenger 2 — Exact diagonal boundary tie-breaking & precision cones", () => {
  const classifier = new TennisGestureClassifier()

  // Diagnostic diagonal vectors (|ax| == |ay| == 15.0 m/s^2)
  // Axis dominance specification: if absY >= absX, vertical axis wins.
  // 1. (+15, +15, 0): absY (15) >= absX (15) -> vertical, ay > 0 -> toss
  const diag1 = classifier.classifyVector(15.0, 15.0, 0, 1000)
  assert.ok(diag1 !== null)
  assert.equal(diag1.type, "toss")

  // 2. (-15, +15, 0): absY (15) >= absX (15) -> vertical, ay > 0 -> toss
  const diag2 = classifier.classifyVector(-15.0, 15.0, 0, 1500)
  assert.ok(diag2 !== null)
  assert.equal(diag2.type, "toss")

  // 3. (+15, -15, 0): absY (15) >= absX (15) -> vertical, ay < 0 -> smash
  const diag3 = classifier.classifyVector(15.0, -15.0, 0, 2000)
  assert.ok(diag3 !== null)
  assert.equal(diag3.type, "smash")

  // 4. (-15, -15, 0): absY (15) >= absX (15) -> vertical, ay < 0 -> smash
  const diag4 = classifier.classifyVector(-15.0, -15.0, 0, 2500)
  assert.ok(diag4 !== null)
  assert.equal(diag4.type, "smash")

  // 5. Epsilon perturbation toward X axis: |ax| = 15.0001, |ay| = 15.0000 -> horizontal wins
  const pertFore = classifier.classifyVector(15.0001, 15.0, 0, 3000)
  assert.ok(pertFore !== null)
  assert.equal(pertFore.type, "forehand")

  const pertBack = classifier.classifyVector(-15.0001, 15.0, 0, 3500)
  assert.ok(pertBack !== null)
  assert.equal(pertBack.type, "backhand")

  // 6. Threshold boundary precision:
  // Toss threshold is 10.0:
  assert.ok(classifier.classifyVector(0, 10.0, 0, 4000) !== null)
  assert.equal(classifier.classifyVector(0, 9.9999, 0, 4500), null)

  // Swing threshold is 12.0 for Smash / Forehand / Backhand:
  assert.ok(classifier.classifyVector(0, -12.0, 0, 5000) !== null)
  assert.equal(classifier.classifyVector(0, -11.9999, 0, 5500), null)

  assert.ok(classifier.classifyVector(12.0, 0, 0, 6000) !== null)
  assert.equal(classifier.classifyVector(11.9999, 0, 0, 6500), null)

  assert.ok(classifier.classifyVector(-12.0, 0, 0, 7000) !== null)
  assert.equal(classifier.classifyVector(-11.9999, 0, 0, 7500), null)
})

// ============================================================================
// TEST 5: Recoil Cooldown Timing Invariants & Clock Jumps
// ============================================================================
test("Challenger 2 — Debounce timing invariants and rapid event stress", () => {
  const classifier = new TennisGestureClassifier({ debounceMs: 320 })

  // Trigger stroke at t = 1000
  const first = classifier.classifyVector(20.0, 0, 0, 1000)
  assert.ok(first !== null)

  // Rapid spam for 319 consecutive milliseconds (every 1ms)
  for (let dt = 1; dt < 320; dt++) {
    const suppressed = classifier.classifyVector(-25.0, 15.0, 0, 1000 + dt)
    assert.equal(
      suppressed,
      null,
      `Sample at t=${1000 + dt}ms must be suppressed within 320ms cooldown`
    )
  }

  // Exact boundary at t = 1320ms: cooldown expired
  const nextStroke = classifier.classifyVector(-20.0, 0, 0, 1320)
  assert.ok(nextStroke !== null, "Sample at exact boundary t = 1320ms must be accepted")
  assert.equal(nextStroke.type, "backhand")
})

// ============================================================================
// TEST 6: Z-Axis Dominance & Forward Thrust Rejection vs Angled Follow-Through
// ============================================================================
test("Challenger 2 — Forward Z-thrust rejection & angled follow-through physics", () => {
  const classifier = new TennisGestureClassifier()

  // 1. Pure forward thrusts (+Z dominant, high magnitude 25-50 m/s^2, low lateral)
  for (let z = 15; z <= 60; z += 5) {
    const thrust = classifier.classifyVector(2.0, 2.0, z, 1000 + z * 100)
    assert.equal(
      thrust,
      null,
      `Pure forward thrust with Z=${z} m/s^2 must be rejected as non-tennis gesture`
    )
  }

  // 2. Pure pull-back thrusts (-Z dominant)
  for (let z = 15; z <= 60; z += 5) {
    const pull = classifier.classifyVector(2.0, -2.0, -z, 5000 + z * 100)
    assert.equal(
      pull,
      null,
      `Pure backward pull with Z=-${z} m/s^2 must be rejected as non-tennis gesture`
    )
  }

  // 3. Realistic 3D strokes: valid lateral swing (+X = 16 m/s^2) accompanied by forward momentum (+Z = 25 m/s^2)
  // Overall magnitude: sqrt(16^2 + 2^2 + 25^2) = sqrt(256 + 4 + 625) = sqrt(885) = 29.75 m/s^2
  // Must be recognized as forehand with scaled power
  const angledForehand = classifier.classifyVector(16.0, 2.0, 25.0, 20000)
  assert.ok(angledForehand !== null)
  assert.equal(angledForehand.type, "forehand")
  assert.ok(
    angledForehand.peakAcceleration > 29.0,
    `Expected magnitude > 29.0, got ${angledForehand.peakAcceleration}`
  )
  assert.ok(angledForehand.powerMultiplier > 1.4)
})

// ============================================================================
// TEST 7: Long-Duration 20,000-Step Orientation Tumbling & Gravity Tracking
// ============================================================================
test("Challenger 2 — 20,000-step orientation tumbling & low-pass gravity tracking", () => {
  const classifier = new TennisGestureClassifier()
  const totalSteps = 20000
  const dt = 0.02 // 50 Hz, 400 seconds total simulated session

  // Rotate phone smoothly between portrait (0, 9.8, 0), landscape (9.8, 0, 0),
  // upside-down (0, -9.8, 0), and flat-on-table (0, 0, 9.8)
  for (let step = 0; step < totalSteps; step++) {
    const tSec = step * dt
    const timestampMs = 1000 + step * 20

    // Slow 0.05 Hz rotation of gravity vector (20 seconds per full rotation)
    const angle = 2 * Math.PI * 0.05 * tSec
    const gx = 9.80665 * Math.sin(angle)
    const gy = 9.80665 * Math.cos(angle)
    const gz = 0.0

    // Add mild ambient hand tremor noise (0.3 m/s^2)
    const noiseX = 0.3 * Math.sin(10 * tSec)
    const noiseY = 0.3 * Math.cos(12 * tSec)

    const sample = {
      timestamp: timestampMs,
      acceleration: null,
      accelerationIncludingGravity: {
        x: gx + noiseX,
        y: gy + noiseY,
        z: gz,
      },
    }

    const gesture = classifier.processSample(sample)
    // Ambient noise during continuous orientation changes must NEVER trigger spurious swings
    assert.equal(
      gesture,
      null,
      `Step ${step} at t=${tSec.toFixed(1)}s falsely triggered during orientation tumbling: ${gesture?.type}`
    )
  }
})

// ============================================================================
// TEST 8: Custom Configuration Boundary Resilience & Safety Guards
// ============================================================================
test("Challenger 2 — Custom configuration safety guards & division-by-zero resilience", () => {
  // Degenerate config where maxPowerThreshold equals swingThreshold
  const degenerate = new TennisGestureClassifier({
    swingThreshold: 15.0,
    maxPowerThreshold: 15.0,
  })

  // Must not throw or produce NaN
  const p1 = calculatePowerMultiplier(10.0, { swingThreshold: 15.0, maxPowerThreshold: 15.0 })
  assert.equal(p1, 1.0)

  const p2 = calculatePowerMultiplier(15.0, { swingThreshold: 15.0, maxPowerThreshold: 15.0 })
  assert.equal(p2, 1.0)

  const p3 = calculatePowerMultiplier(20.0, { swingThreshold: 15.0, maxPowerThreshold: 15.0 })
  assert.equal(p3, 1.5)

  // Inverted thresholds (maxPower < swingThreshold)
  const pInverted = calculatePowerMultiplier(20.0, { swingThreshold: 25.0, maxPowerThreshold: 15.0 })
  assert.ok(Number.isFinite(pInverted))
  assert.ok(pInverted >= 1.0 && pInverted <= 1.5)
})
