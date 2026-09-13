import test from "node:test"
import assert from "node:assert/strict"
import { Vec2, Box } from "planck"
import { createTowerWorld, createFloor, hasSupport, TowerGame, TowerClock, STEP, FLOOR_HEIGHT } from "../lib/tower/physics.ts"

function settle(world, seconds) {
  for (let i = 0; i < seconds / STEP; i++) {
    world.step(STEP / 2, 12, 8)
    world.step(STEP / 2, 12, 8)
  }
}

test("30 aligned dynamic floors stay standing for 30 seconds", () => {
  const { world, foundation } = createTowerWorld()
  const floors = Array.from({ length: 30 }, (_, i) => createFloor(world, 0, 0.82 + i * (FLOOR_HEIGHT + 0.015)))
  settle(world, 30)
  for (const [i, body] of floors.entries()) {
    assert.equal(body.getType(), "dynamic")
    assert.ok(Math.abs(body.getAngle()) < 0.04, `floor ${i} angle ${body.getAngle()}`)
    assert.ok(Math.abs(body.getPosition().x) < 0.1)
    assert.ok(Math.abs(body.getPosition().y - (0.8 + i * 1.615)) < 0.6)
    assert.ok(hasSupport(body, foundation))
  }
})

test("a small off-center landing settles; a large overhang falls", () => {
  const { world, foundation } = createTowerWorld()
  const lower = createFloor(world, 0, 0.82)
  settle(world, 1)
  const upper = createFloor(world, 0.35, 4)
  settle(world, 5)
  assert.ok(hasSupport(upper, foundation))
  assert.ok(Math.abs(upper.getAngle()) < 0.05)
  const overhang = createFloor(world, 3.2, 6)
  settle(world, 6)
  assert.ok(overhang.getPosition().y < -2)
  assert.equal(lower.getType(), "dynamic")
})

test("a lateral impact propagates into the lower stack", () => {
  const { world } = createTowerWorld()
  const floors = Array.from({ length: 10 }, (_, i) => createFloor(world, 0, 0.82 + i * 1.615))
  settle(world, 3)
  floors[4].applyLinearImpulse(Vec2(160, 0), floors[4].getWorldPoint(Vec2(0, 0.7)), true)
  settle(world, 8)
  assert.ok(floors.slice(1).some(body => Math.abs(body.getAngle()) > 0.5))
  assert.ok(floors[2].getPosition().x > 0.1 || Math.abs(floors[2].getAngle()) > 0.1)
})

test("a fast falling floor does not tunnel through the foundation", () => {
  const { world, foundation } = createTowerWorld()
  const floor = createFloor(world, 0, 8)
  floor.setLinearVelocity(Vec2(0, -80))
  settle(world, 3)
  assert.ok(floor.getPosition().y > 0.7)
  assert.ok(hasSupport(floor, foundation))
})

test("release keeps momentum and cannot be triggered twice", () => {
  const game = new TowerGame()
  game.start()
  for (let i = 0; i < 60; i++) game.step()
  const velocity = game.current.body.getLinearVelocity().clone()
  assert.ok(Math.abs(velocity.x) > 0.05)
  assert.equal(game.release(), true)
  assert.equal(game.rope, null)
  assert.equal(game.release(), false)
  assert.equal(game.current.body.getLinearVelocity().x, velocity.x)
})

test("a supported landing earns score once and spawns the next floor", () => {
  const game = new TowerGame()
  game.start()
  for (let i = 0; i < 106; i++) game.step()
  assert.equal(game.release(), true)
  for (let i = 0; i < 180; i++) game.step()
  assert.equal(game.count, 1)
  assert.equal(game.score, 150)
  assert.ok(game.residents > 0, "residents should increase")
  assert.equal(game.floors[0].residents?.length, 3)
  assert.equal(game.snapshot().residents, game.residents)
  assert.equal(game.phase, "swinging")
  assert.equal(game.floors[0].body.getType(), "dynamic")
})

test("a missed floor ends the game without awarding points", () => {
  const game = new TowerGame()
  game.start()
  for (let i = 0; i < 20; i++) game.step()
  assert.equal(game.release(), true)
  game.current.body.setPosition(Vec2(8, 4))
  for (let i = 0; i < 240; i++) game.step()
  assert.equal(game.phase, "over")
  assert.equal(game.score, 0)
})

test("spamming release on spawn fails or drops off-center and misses", () => {
  const game = new TowerGame()
  game.start()
  // Immediate release fails during arming window (< 0.25s)
  assert.equal(game.release(), false)
  // Step right past the arming window (16 steps = ~0.26s)
  for (let i = 0; i < 16; i++) game.step()
  // Premature drop while block is still swinging near outer edge
  assert.equal(game.release(), true)
  assert.ok(Math.abs(game.current.body.getPosition().x) > 2.0)
  for (let i = 0; i < 240; i++) game.step()
  assert.equal(game.phase, "over")
  assert.equal(game.score, 0)
})

test("30, 60 and 120 FPS produce the same simulated trajectory", () => {
  const results = [30, 60, 120].map(fps => {
    const game = new TowerGame()
    const clock = new TowerClock()
    game.start()
    for (let frame = 0; frame < fps * 2; frame++) clock.advance(1 / fps, () => game.step())
    return { time: game.time, x: game.current.body.getPosition().x, angle: game.current.body.getAngle() }
  })
  assert.deepEqual(results[0], results[1])
  assert.deepEqual(results[1], results[2])
})

test("long stalls have bounded catch-up and pause clears partial ticks", () => {
  const clock = new TowerClock()
  assert.equal(clock.advance(60, () => {}), 6)
  clock.advance(STEP / 2, () => {})
  clock.reset()
  assert.equal(clock.advance(STEP / 2, () => {}), 0)
})


test("30 floors dropped sequentially stay supported", () => {
  const { world, foundation } = createTowerWorld()
  const floors = []
  for (let i = 0; i < 30; i++) {
    const top = floors.length ? floors.at(-1).getPosition().y + 0.8 : 0
    floors.push(createFloor(world, 0, top + 4))
    settle(world, 3)
  }
  assert.ok(floors.at(-1).getPosition().y > 47)
  for (const body of floors) {
    assert.ok(hasSupport(body, foundation))
    assert.ok(Math.abs(body.getAngle()) < 0.04)
  }
})

test("landing beside the tower cannot count as another floor", () => {
  const game = new TowerGame()
  // A wide test foundation makes a second, separate supported stack possible.
  game.foundation.createFixture(Box(8, 0.4), { friction: 0.8 })
  game.start()
  for (let i = 0; i < 106; i++) game.step()
  assert.equal(game.release(), true)
  for (let i = 0; i < 180; i++) game.step()
  for (let i = 0; i < 20; i++) game.step()
  assert.equal(game.release(), true)
  game.current.body.setPosition(Vec2(4, 0.82))
  game.current.body.setLinearVelocity(Vec2(0, 0))
  for (let i = 0; i < 180; i++) game.step()
  assert.ok(hasSupport(game.current.body, game.foundation))
  assert.equal(game.count, 1)
  assert.equal(game.score, 150)
})

test("santai mode has higher damping, calmer swing, and stabilizes off-center landings", () => {
  const game = new TowerGame("santai")
  assert.equal(game.difficulty, "santai")
  assert.equal(game.snapshot().difficulty, "santai")
  game.start()
  for (let i = 0; i < 140; i++) game.step()
  assert.equal(game.release(), true)
  for (let i = 0; i < 200; i++) game.step()
  assert.equal(game.count, 1)
  assert.ok(game.floors[0].body.getAngularDamping() > 0.5)
})

test("normal mode balances dynamic swing and stabilization", () => {
  const game = new TowerGame("normal")
  assert.equal(game.difficulty, "normal")
  assert.equal(game.snapshot().difficulty, "normal")
  game.start()
  for (let i = 0; i < 120; i++) game.step()
  assert.equal(game.release(), true)
  for (let i = 0; i < 200; i++) game.step()
  assert.equal(game.count, 1)
})
