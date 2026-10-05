import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MechaMode, MECHA_CONFIG } from '../public/games/doodle/mecha-mode.js';

test('MechaMode initialization and lifecycle', () => {
  const mecha = new MechaMode({ player: { body: { vel: new THREE.Vector3() }, alive: true } });
  assert.equal(mecha.enabled, false);
  assert.equal(mecha.boostEnergy, MECHA_CONFIG.MAX_BOOST);
  assert.equal(mecha.isOverheated, false);

  mecha.enable();
  assert.equal(mecha.enabled, true);

  mecha.disable();
  assert.equal(mecha.enabled, false);
});

test('MechaMode vertical thrust/hover drains energy and applies upward velocity', () => {
  const vel = new THREE.Vector3(0, 0, 0);
  const player = {
    body: { vel: vel, pos: new THREE.Vector3() },
    alive: true,
    eye: new THREE.Vector3(),
    forward: new THREE.Vector3(0, 0, -1),
    right: new THREE.Vector3(1, 0, 0),
  };
  const input = {
    down: (key) => key === 'jump',
    pressed: () => false,
    move: { x: 0, y: 0 },
    keys: { Space: true },
  };
  const effects = { strokeBurst() {} };
  const mecha = new MechaMode({ player, input, effects });
  mecha.enable();

  const dt = 0.1;
  mecha.update(dt, 100);

  assert.equal(mecha.isHovering, true);
  assert.ok(mecha.boostEnergy < MECHA_CONFIG.MAX_BOOST);
  assert.ok(vel.y > 0);
});

test('MechaMode boost dash consumes energy, triggers FOV kick, and resets after duration', () => {
  const vel = new THREE.Vector3(0, 0, 0);
  let fovKicked = 0;
  const player = {
    body: { vel: vel, pos: new THREE.Vector3() },
    alive: true,
    eye: new THREE.Vector3(),
    forward: new THREE.Vector3(0, 0, -1),
    right: new THREE.Vector3(1, 0, 0),
    kickFov: (deg) => { fovKicked = deg; },
  };
  let shiftPressed = true;
  const input = {
    down: () => false,
    pressed: (key) => (key === 'sprint' ? shiftPressed : false),
    move: { x: 0, y: 0 },
    keys: { ShiftLeft: true },
  };
  const effects = { strokeBurst() {}, shakeAmt: 0 };
  const audio = { dash() {} };
  const mecha = new MechaMode({ player, input, effects, audio });
  mecha.enable();

  mecha.update(0.05, 100);
  assert.equal(mecha.isDashing, true);
  assert.equal(fovKicked, 8);
  assert.ok(mecha.boostEnergy <= MECHA_CONFIG.MAX_BOOST - MECHA_CONFIG.DASH_DRAIN_COST);

  // Advance time past dash duration
  shiftPressed = false;
  input.keys = {};
  mecha.update(MECHA_CONFIG.DASH_DURATION + 0.05, 200);
  assert.equal(mecha.isDashing, false);

  // Test directional forward dash (W held: move.y = 1)
  input.move = { x: 0, y: 1 };
  mecha.triggerDash(player);
  assert.equal(mecha.dashDir.z, -1); // Forward is -Z

  // Test directional backward dash (S held: move.y = -1)
  input.move = { x: 0, y: -1 };
  mecha.triggerDash(player);
  assert.equal(mecha.dashDir.z, 1); // Backward is +Z

  // Test directional right strafe dash (D held: move.x = 1)
  input.move = { x: 1, y: 0 };
  mecha.triggerDash(player);
  assert.equal(mecha.dashDir.x, 1); // Right is +X
});

test('MechaMode overheat prevents hover/dash until cooldown finishes', () => {
  const player = {
    body: { vel: new THREE.Vector3(), pos: new THREE.Vector3() },
    alive: true,
    eye: new THREE.Vector3(),
    forward: new THREE.Vector3(0, 0, -1),
    right: new THREE.Vector3(1, 0, 0),
  };
  const input = {
    down: (key) => key === 'jump',
    pressed: () => false,
    move: { x: 0, y: 0 },
    keys: { Space: true },
  };
  const mecha = new MechaMode({ player, input, effects: {} });
  mecha.enable();

  // Force overheat
  mecha.triggerOverheat();
  assert.equal(mecha.isOverheated, true);
  assert.equal(mecha.boostEnergy, 0);

  // Update should NOT hover when overheated
  mecha.update(0.1, 100);
  assert.equal(mecha.isHovering, false);

  // Advance past overheat cooldown
  mecha.update(MECHA_CONFIG.OVERHEAT_COOLDOWN + 0.1, 200);
  assert.equal(mecha.isOverheated, false);
});

test('MechaMode lock-on targets enemies inside forward view cone and ignores targets behind', () => {
  const player = {
    alive: true,
    eye: new THREE.Vector3(0, 1.5, 0),
    forward: new THREE.Vector3(0, 0, -1),
    right: new THREE.Vector3(1, 0, 0),
    body: { vel: new THREE.Vector3() },
  };

  const targetInFront = {
    alive: true,
    state: 'active',
    center: new THREE.Vector3(0, 1.5, -20),
    body: { pos: new THREE.Vector3(0, 0, -20) },
    T: { name: 'HOSTILE DRONE' },
  };

  const targetBehind = {
    alive: true,
    state: 'active',
    center: new THREE.Vector3(0, 1.5, 20),
    body: { pos: new THREE.Vector3(0, 0, 20) },
    T: { name: 'BEHIND DRONE' },
  };

  const enemies = { enemies: [targetInFront, targetBehind] };
  const world = { hasLineOfSight: () => true };
  const mecha = new MechaMode({ player, enemies, world, input: { down: () => false, pressed: () => false } });
  mecha.enable();

  mecha.scanLockOnTarget(player);
  assert.ok(mecha.currentLockTarget !== null);
  assert.equal(mecha.currentLockTarget.entity, targetInFront);
});

test('MechaMode missile salvo spawns missiles and applies damage upon impact', () => {
  const scene = new THREE.Scene();
  const player = {
    alive: true,
    eye: new THREE.Vector3(0, 1.5, 0),
    forward: new THREE.Vector3(0, 0, -1),
    right: new THREE.Vector3(1, 0, 0),
    body: { vel: new THREE.Vector3() },
  };

  let damagedAmount = 0;
  const target = {
    alive: true,
    center: new THREE.Vector3(0, 1.5, -5),
    body: { pos: new THREE.Vector3(0, 0, -5) },
    takeDamage: (amt) => { damagedAmount = amt; },
  };

  const effects = { strokeBurst() {}, smoke() {}, tracer() {}, shakeAmt: 0 };
  const audio = { shot() {}, explode() {} };
  const mecha = new MechaMode({ scene, player, effects, audio, world: { raycast: () => null } });
  mecha.enable();
  mecha.currentLockTarget = { entity: target, center: target.center, body: target.body };

  // Fire salvo
  mecha.fireMissileSalvo(player);
  assert.equal(mecha.pendingSalvo.length, MECHA_CONFIG.MISSILE_COUNT);

  // Update to flush pending missiles into activeMissiles
  mecha.update(0.5, 100);
  assert.ok(mecha.activeMissiles.length > 0);

  // Position a missile right at target center to trigger impact
  const m = mecha.activeMissiles[0];
  m.pos.copy(target.center);
  mecha.updateMissiles(0.01);

  assert.equal(damagedAmount, MECHA_CONFIG.MISSILE_DAMAGE);
});

test('MechaMode TPP Camera calculates over-the-shoulder offset and zooms on aim', () => {
  const player = {
    alive: true,
    eye: new THREE.Vector3(0, 1.6, 0),
    forward: new THREE.Vector3(0, 0, -1),
    right: new THREE.Vector3(1, 0, 0),
    pitch: 0.1,
    yaw: 0.5,
    roll: 0,
    body: { pos: new THREE.Vector3(0, 0, 0) },
    _aiming: false,
  };

  const mecha = new MechaMode({ player });
  mecha.enable();

  const camNormal = mecha.computeTppCamera(player, null, 1.0);
  assert.ok(camNormal);
  // Default camera should be behind player (+Z since forward is -Z)
  assert.ok(camNormal.position.z > 2.0);
  // Camera should be offset to right shoulder (+X)
  assert.ok(camNormal.position.x > 0.3);
  // Camera should be elevated
  assert.ok(camNormal.position.y > 1.4);
  assert.equal(camNormal.clamped, false);

  // Test aiming zoom
  player._aiming = true;
  const camAiming = mecha.computeTppCamera(player, null, 1.0);
  assert.ok(camAiming);
  // Aiming camera should be closer to the player than normal camera
  assert.ok(camAiming.position.z < camNormal.position.z);
  // Aiming camera should shift further to the right to clear shoulder and avoid body obstruction
  assert.ok(camAiming.position.x > camNormal.position.x);
});

test('MechaMode TPP Camera clamps distance when colliding with world geometry (Spring Arm)', () => {
  const player = {
    alive: true,
    eye: new THREE.Vector3(0, 1.6, 0),
    forward: new THREE.Vector3(0, 0, -1),
    right: new THREE.Vector3(1, 0, 0),
    pitch: 0,
    yaw: 0,
    roll: 0,
    body: { pos: new THREE.Vector3(0, 0, 0) },
    _aiming: false,
  };

  // World with a wall at distance 1.2m behind player
  const world = {
    raycast: (origin, dir, maxDist) => {
      // Wall detected at 1.2 meters
      return { dist: 1.2, point: origin.clone().addScaledVector(dir, 1.2) };
    },
  };

  const mecha = new MechaMode({ player, world });
  mecha.enable();

  const camClamped = mecha.computeTppCamera(player, world, 1.0);
  assert.equal(camClamped.clamped, true);
  // The clamped camera position should be closer than 1.2m
  const distFromOrigin = camClamped.position.distanceTo(player.eye);
  assert.ok(distFromOrigin <= 1.2);
});

test('MechaMode 3D local mech model builds hierarchy and animates thrusters and stance', () => {
  const scene = new THREE.Scene();
  const player = {
    alive: true,
    eye: new THREE.Vector3(0, 1.6, 0),
    forward: new THREE.Vector3(0, 0, -1),
    right: new THREE.Vector3(1, 0, 0),
    pitch: 0.2,
    yaw: 1.0,
    roll: 0,
    body: {
      pos: new THREE.Vector3(10, 2, 5),
      vel: new THREE.Vector3(5, 0, 0),
      onGround: true,
    },
    rig: { visible: true },
  };

  const mecha = new MechaMode({ scene, player, input: { move: { x: 0.5, y: 0 } } });
  mecha.enable();

  // Model should be created and added to scene
  assert.ok(mecha.mechModel);
  assert.equal(mecha.mechModel.visible, true);
  assert.equal(scene.children.includes(mecha.mechModel), true);
  assert.equal(player.rig.visible, false); // FPP gun hidden

  // Update mech model
  mecha.updateLocalMechModel(0.016, player);
  assert.equal(mecha.mechModel.position.x, 10);
  assert.equal(mecha.mechModel.position.y, 2);
  assert.equal(mecha.mechModel.position.z, 5);
  assert.equal(mecha.mechModel.rotation.y, 1.0);

  // Thruster flames should be off on ground idle
  assert.equal(mecha.mechParts.flameL.visible, false);

  // When hovering, flames should ignite
  mecha.isHovering = true;
  mecha.updateLocalMechModel(0.016, player);
  assert.equal(mecha.mechParts.flameL.visible, true);
  assert.equal(mecha.mechParts.flameR.visible, true);

  // When disabled, mech hidden and FPP rig restored
  mecha.disable();
  assert.equal(mecha.mechModel.visible, false);
  assert.equal(player.rig.visible, true);
});

test('MechaMode KeyF or melee input fires missile salvo without switching to katana', () => {
  const scene = new THREE.Scene();
  const player = {
    alive: true,
    eye: new THREE.Vector3(0, 1.6, 0),
    forward: new THREE.Vector3(0, 0, -1),
    right: new THREE.Vector3(1, 0, 0),
    body: { vel: new THREE.Vector3(), pos: new THREE.Vector3() },
    rig: { visible: true },
  };

  let fPressed = true;
  const input = {
    down: () => false,
    pressed: (k) => k === 'melee',
    move: { x: 0, y: 0 },
    keys: { KeyF: true },
  };

  const effects = { strokeBurst() {}, smoke() {}, tracer() {} };
  const audio = { shot() {} };
  const mecha = new MechaMode({ scene, player, input, effects, audio, world: { raycast: () => null } });
  mecha.enable();

  assert.equal(mecha.pendingSalvo.length, 0);

  // Update frame with F pressed
  mecha.update(0.016, 100);

  // Missiles should be queued or launched
  assert.equal(mecha.pendingSalvo.length + mecha.activeMissiles.length, MECHA_CONFIG.MISSILE_COUNT);
  assert.equal(MECHA_CONFIG.MISSILE_COUNT, 6); // 6 missiles matching RP-06 STARLING
  assert.ok(mecha.missileCooldown > 0);
  assert.match(mecha.alertMessage, /MISSILE/);
});

test('MechaMode primary heavy linear cannon fires with high-visibility tracer, recoil, and damage', () => {
  const scene = new THREE.Scene();
  const player = {
    alive: true,
    eye: new THREE.Vector3(0, 1.6, 0),
    forward: new THREE.Vector3(0, 0, -1),
    right: new THREE.Vector3(1, 0, 0),
    body: { vel: new THREE.Vector3(), pos: new THREE.Vector3(0, 0, 0) },
    rig: { visible: true },
    recoil: () => {},
  };

  let tracerSpawned = false;
  let tracerColor = 0;
  let tracerSize = 0;
  const effects = {
    strokeBurst() {},
    tracer(o, hit, col, sz) {
      tracerSpawned = true;
      tracerColor = col;
      tracerSize = sz;
    },
    bulletImpact() {},
  };

  let damagedEntity = null;
  let damageAmt = 0;
  const enemy = {
    alive: true,
    center: new THREE.Vector3(0, 1.6, -15),
    hp: 100,
  };
  const enemies = {
    enemies: [enemy],
    raycast: (orig, dir, maxD) => ({ enemy, point: new THREE.Vector3(0, 1.6, -15), dist: 15, part: 'torso' }),
    damage: (e, dmg) => {
      damagedEntity = e;
      damageAmt = dmg;
    },
  };

  const audio = {
    shot: () => {},
  };

  const camera = {
    position: new THREE.Vector3(0, 1.6, 0),
    getWorldDirection: (v) => v.set(0, 0, -1),
  };

  const input = {
    down: (k) => k === 'fire',
    pressed: () => false,
    keys: { Mouse0: true },
    move: { x: 0, y: 0 },
  };

  const mecha = new MechaMode({ scene, player, input, effects, enemies, audio, camera, world: { raycast: () => null } });
  mecha.enable();

  assert.equal(mecha.cannonAmmo, MECHA_CONFIG.CANNON_MAX_AMMO);
  assert.equal(mecha.cannonTimer, 0);

  // Fire cannon
  mecha.update(0.016, 100);

  // Ammo should decrease
  assert.equal(mecha.cannonAmmo, MECHA_CONFIG.CANNON_MAX_AMMO - 1);
  assert.ok(mecha.cannonTimer > 0);
  assert.ok(mecha.cannonRecoil > 0);

  // Tracer should be spawned with high visibility (size ~0.085, cyan color 0x00f0ff)
  assert.equal(tracerSpawned, true);
  assert.equal(tracerColor, 0x00f0ff);
  assert.ok(tracerSize >= 0.08);

  // Damage should be dealt to enemy
  assert.equal(damagedEntity, enemy);
  assert.equal(damageAmt, MECHA_CONFIG.CANNON_DAMAGE);

  // Active kinetic tracer bolts should be in flight
  assert.ok(mecha.activeTracers.length > 0);
  assert.equal(scene.children.includes(mecha.activeTracers[0].mesh), true);
});



