import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import { DUAL_KRISS_STATS, createDualKrissClass, buildDualKrissModel } from '../public/games/doodle/dual-kriss.js';

const source = fs.readFileSync(new URL('../public/games/doodle/game.js', import.meta.url), 'utf8');
class Base {
  constructor(ctx) {
    this.ctx = ctx; this.root = new THREE.Group();
    this.basePos = new THREE.Vector3(); this.aimPos = new THREE.Vector3();
    this.recoil = this.recoilRot = { kick() {} };
  }
  setSight() {}
}
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const context = vm.createContext({
  Si: Base, zr: { kriss: DUAL_KRISS_STATS },
  gt: () => new THREE.MeshBasicMaterial(), k: { BLUE: 1, BLACK: 2, RED: 3, ORANGE: 4 },
  Q: clamp, st: (n, target, rate, dt) => n + (target - n) * (1 - Math.exp(-rate * dt)),
  p: (low, high) => (low + high) / 2, vt: Math.PI * 2,
  Ge: new THREE.Vector3(), fe: new THREE.Vector3(), we: new THREE.Vector3(),
  D: { shot() {}, reload() {}, empty() {} }, setTimeout() {}, window: {},
  jo: new Set(), $r: new Set(["pdmg", "parry", "cut"]), Ur: new Set(["ps", "shots"]),
});
const start = source.indexOf('js=class extends Si');
const end = source.indexOf(',zi=class', start);
const Gun = vm.runInContext(`(${source.slice(start + 3, end)})`, context);
const Kriss = createDualKrissClass(Gun, {
  flash: root => { const flash = new THREE.Object3D(); root.add(flash); return flash; },
  hand() {}, shellInk: 4,
});
let distance = 5;
const damage = [], tracers = [];
const target = { id: 'enemy' };
const ctx = {
  player: { eye: new THREE.Vector3(), forward: new THREE.Vector3(0, 0, -1), right: new THREE.Vector3(1, 0, 0), aimDir: () => new THREE.Vector3(0, 0, -1), recoil() {}, kickFov() {} },
  enemies: { raycast: () => null }, world: { raycast: () => null },
  raycastPlayers: () => ({ player: target, dist: distance, part: 'torso', point: new THREE.Vector3(0, 0, -distance) }),
  hitPlayer: (_, amount) => damage.push(amount),
  effects: { strokeBurst() {}, smoke() {}, shell() {}, tracer: from => tracers.push(from.clone()), shakeAmt: 0 },
  input: { rumble() {} }, game: { hitstop() {} },
};
const weapon = new Kriss(ctx);
weapon.root.updateMatrixWorld(true);
assert.equal(weapon.mag, 60);
weapon.fire({ aim: false }); weapon.fire({ aim: false });
assert.equal(weapon.mag, 58);
assert.ok(tracers[0].x < 0 && tracers[1].x > 0, 'shots must alternate between actual left/right muzzles');
distance = 35; weapon.fire({ aim: false });
assert.equal(damage[0], 13);
assert.ok(Math.abs(damage[2] - 2.6) < 0.001, 'long-range damage must fall to 20%');
const state = { aim: false, speed: 0, grounded: true, fire: false, firePressed: false };
weapon.startReload(); weapon.update(2.3, state);
assert.equal(weapon.mag, 60); assert.equal(weapon.reserve, 237);
for (const barrel of weapon.barrels) assert.equal(barrel.magazine.position.y, weapon.magY);
weapon.update(0.05, { ...state, fire: true });
assert.equal(weapon.mag, 59);
assert.ok(weapon.flash.visible, 'new muzzle flash must survive a 50ms simulation tick');
const remote = new THREE.Group();
assert.equal(buildDualKrissModel(remote, weapon.mat, weapon.dark, false).length, 2);
assert.equal(remote.children.length, 2);
console.log('PASS: dual model, alternating muzzles, close/far damage, ammo, reload and muzzle flash');

// Validate the actual protocol guards, rather than accepting a new weapon only locally.
const guardStart = source.indexOf('Us=Object.freeze(');
const guardEnd = source.indexOf('var Jr=', guardStart);
vm.runInContext(`var ${source.slice(guardStart, guardEnd)}`, context);
context.shot = { t: 'shots', d: { k: 'kriss', e: [0, 0, -5] } };
context.hit = { t: 'pdmg', d: { src: 'kriss', amount: 21, from: [0, 0, 0] } };
context.death = { t: 'pdead', d: { killer: 'host', how: 'kriss' } };
assert.ok(vm.runInContext('Uo(shot) && Uo(hit) && Uo(death)', context));
context.hit.d.amount = 100;
assert.equal(vm.runInContext('Uo(hit)', context), false);
assert.ok(vm.runInContext('ia(new Hs(() => 0), shot, "player", "host", () => {})', context));
console.log('PASS: multiplayer accepts Kriss shots, damage and kill source; rejects excessive damage');
