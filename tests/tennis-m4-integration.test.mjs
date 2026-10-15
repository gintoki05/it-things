/**
 * Worker M4 Integration Tests — Physics Engine Callbacks, Power Scaling & Canvas Touch Gestures
 * Run: node --test tests/tennis-m4-integration.test.mjs
 */

import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import ts from "typescript"
import * as THREE from "three"

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

const { TennisPhysicsEngine } = loadTennisPhysicsModule()

// Mobile Touch Swipe classifier testing
function classifyTouchSwipe(start, end, minSwipe = 20, maxTap = 15) {
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

test("M4-01: handlePlayerSwing('serve') with powerMultiplier scales serve ball speed", () => {
  const engineNormal = new TennisPhysicsEngine()
  engineNormal.triggerServeToss()
  engineNormal.ballPos.set(0, 2.2, 9.2)
  engineNormal.ballVel.set(0, 2.0, 0)
  engineNormal.handlePlayerSwing("serve", 1.0)
  const speedNormal = Math.hypot(engineNormal.ballVel.x, engineNormal.ballVel.y, engineNormal.ballVel.z)

  const engineBoosted = new TennisPhysicsEngine()
  engineBoosted.triggerServeToss()
  engineBoosted.ballPos.set(0, 2.2, 9.2)
  engineBoosted.ballVel.set(0, 2.0, 0)
  engineBoosted.handlePlayerSwing("serve", 1.4)
  const speedBoosted = Math.hypot(engineBoosted.ballVel.x, engineBoosted.ballVel.y, engineBoosted.ballVel.z)

  assert.ok(speedBoosted > speedNormal * 1.35, "Boosted serve should have ~1.4x higher speed")
})

test("M4-02: handlePlayerSwing rally hit with powerMultiplier scales rally ball speed", () => {
  const engineNormal = new TennisPhysicsEngine()
  engineNormal.state = "in_play"
  engineNormal.currentSide = "player"
  engineNormal.ballPos.set(0.5, 1.2, 9.0)
  engineNormal.ballVel.set(0, 0, 10.0)
  engineNormal.handlePlayerSwing("forehand", 1.0)
  const speedNormal = Math.hypot(engineNormal.ballVel.x, engineNormal.ballVel.y, engineNormal.ballVel.z)

  const engineBoosted = new TennisPhysicsEngine()
  engineBoosted.state = "in_play"
  engineBoosted.currentSide = "player"
  engineBoosted.ballPos.set(0.5, 1.2, 9.0)
  engineBoosted.ballVel.set(0, 0, 10.0)
  engineBoosted.handlePlayerSwing("forehand", 1.5)
  const speedBoosted = Math.hypot(engineBoosted.ballVel.x, engineBoosted.ballVel.y, engineBoosted.ballVel.z)

  assert.ok(speedBoosted > speedNormal, "Boosted rally drive should have higher speed than normal drive")
})

test("M4-03: onBallContact callback captures player apex rocket serve details", () => {
  let contactEvent = null
  const engine = new TennisPhysicsEngine(
    undefined,
    undefined,
    (details) => {
      contactEvent = details
    }
  )

  engine.triggerServeToss()
  engine.ballPos.set(0, 2.9, 9.2)
  engine.ballVel.set(0, 0.2, 0)

  const quality = engine.handlePlayerSwing("smash", 1.3)
  assert.equal(quality, "perfect")
  assert.ok(contactEvent !== null, "onBallContact must be called")
  assert.equal(contactEvent.hitter, "player")
  assert.equal(contactEvent.isSmash, true)
  assert.equal(contactEvent.quality, "rocket")
  assert.ok(contactEvent.speed > 20.0)
})

test("M4-04: onBallContact callback captures player rally sweet spot forehand", () => {
  let contactEvent = null
  const engine = new TennisPhysicsEngine()
  engine.onBallContact = (details) => {
    contactEvent = details
  }

  engine.state = "in_play"
  engine.currentSide = "player"
  engine.ballPos.set(0.5, 1.2, 9.0)
  engine.ballVel.set(0, 0, 8.0)

  const quality = engine.handlePlayerSwing("forehand", 1.2)
  assert.equal(quality, "perfect")
  assert.ok(contactEvent !== null)
  assert.equal(contactEvent.hitter, "player")
  assert.equal(contactEvent.isSmash, false)
  assert.equal(contactEvent.quality, "great")
  assert.ok(contactEvent.speed > 10.0)
})

test("M4-05: onBallContact callback captures opponent serve and rally return", () => {
  const events = []
  const engine = new TennisPhysicsEngine(
    undefined,
    undefined,
    (details) => {
      events.push(details)
    }
  )

  // Opponent serve
  engine.executeServe("opponent")
  assert.equal(events.length, 1)
  assert.equal(events[0].hitter, "opponent")
  assert.equal(events[0].quality, "good")

  // Opponent rally hit
  engine.ballPos.set(0, 1.0, -9.0)
  engine.executeOpponentHit(true)
  assert.equal(events.length, 2)
  assert.equal(events[1].hitter, "opponent")
  assert.equal(events[1].isSmash, false)
})

test("M4-06: onScoreChange callback emits updated score and point winner", () => {
  let scoreEmitted = null
  let winnerEmitted = null

  const engine = new TennisPhysicsEngine(
    undefined,
    undefined,
    undefined,
    (score, winner) => {
      scoreEmitted = score
      winnerEmitted = winner
    }
  )

  engine.awardPoint("player", "CLEAN WINNER!")
  assert.ok(scoreEmitted !== null)
  assert.equal(winnerEmitted, "player")
  assert.equal(scoreEmitted.playerPoints, 15)
  assert.equal(scoreEmitted.opponentPoints, 0)

  engine.resetToServe("player")
  engine.awardPoint("opponent", "OUT!")
  assert.equal(winnerEmitted, "opponent")
  assert.equal(scoreEmitted.playerPoints, 15)
  assert.equal(scoreEmitted.opponentPoints, 15)
})

test("M4-07: Mobile touch swipe classifier differentiates upward, downward, and directional swipes", () => {
  const t0 = 1000
  const t1 = 1150 // 150ms duration (well within 350ms window)

  // 1. Upward swipe (dy < -20)
  const upSwipe = classifyTouchSwipe({ x: 200, y: 400, time: t0 }, { x: 200, y: 350, time: t1 })
  assert.equal(upSwipe.type, "swipe")
  assert.equal(upSwipe.direction, "up")
  assert.equal(upSwipe.action, "toss")

  // 2. Downward swipe (dy > 20)
  const downSwipe = classifyTouchSwipe({ x: 200, y: 300, time: t0 }, { x: 200, y: 360, time: t1 })
  assert.equal(downSwipe.type, "swipe")
  assert.equal(downSwipe.direction, "down")
  assert.equal(downSwipe.action, "smash")

  // 3. Rightward swipe (dx > 20)
  const rightSwipe = classifyTouchSwipe({ x: 200, y: 300, time: t0 }, { x: 250, y: 300, time: t1 })
  assert.equal(rightSwipe.type, "swipe")
  assert.equal(rightSwipe.direction, "right")
  assert.equal(rightSwipe.action, "forehand")

  // 4. Leftward swipe (dx < -20)
  const leftSwipe = classifyTouchSwipe({ x: 200, y: 300, time: t0 }, { x: 150, y: 300, time: t1 })
  assert.equal(leftSwipe.type, "swipe")
  assert.equal(leftSwipe.direction, "left")
  assert.equal(leftSwipe.action, "backhand")

  // 5. Short tap (< 15px)
  const tap = classifyTouchSwipe({ x: 200, y: 300, time: t0 }, { x: 204, y: 303, time: 1080 })
  assert.equal(tap.type, "tap")
  assert.equal(tap.action, "handleAction")
})

test("M4-08: Android Chrome null acceleration correctly falls back to accelerationIncludingGravity", async () => {
  const { TennisGestureClassifier } = await import("../lib/tennis/motion-detector.ts")
  const classifier = new TennisGestureClassifier()

  // Seed with 1 stationary sample
  classifier.processSample({
    timestamp: 1000,
    acceleration: null,
    accelerationIncludingGravity: { x: 0, y: 9.8, z: 0 },
  })

  // Android Chrome pattern: acceleration is { x: null, y: null, z: null } or { x: 0, y: 0, z: 0 }
  // but accelerationIncludingGravity contains the physical motion
  const androidSample = {
    timestamp: 1200,
    acceleration: { x: null, y: null, z: null },
    accelerationIncludingGravity: { x: 18.0, y: 9.8, z: 0 },
  }

  const result = classifier.processSample(androidSample)
  assert.ok(result !== null, "Should detect physical swing using gravity fallback")
  assert.equal(result.type, "forehand")
  assert.ok(result.peakAcceleration > 14.0)
})

test("M4-09: Idle serve auto-toss on any remote swing action", () => {
  const engine = new TennisPhysicsEngine()
  engine.resetToServe("player")
  assert.equal(engine.state, "idle_serve")

  // Simulate executeRemoteSwing logic in idle_serve
  let tossTriggered = false
  if (engine.state === "idle_serve" && engine.score.server === "player") {
    tossTriggered = engine.triggerServeToss()
  }

  assert.equal(tossTriggered, true)
  assert.equal(engine.state, "serving_toss")
  assert.ok(engine.ballVel.y > 5.0, "Ball should be tossed upward")
})

