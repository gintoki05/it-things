import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as THREE from 'three';
import { buildDualKrissModel } from '../public/games/doodle/dual-kriss.js';
import { SkinSync, normalizeSkin, isValidSkin, weaponSkinInk } from '../public/games/doodle/skin-sync.js';

const source = fs.readFileSync(new URL('../public/games/doodle/game.js', import.meta.url), 'utf8');
const custom = { hat: 'crown', face: 'shades', weaponSkin: 'gold', ink: 5 };
assert.ok(isValidSkin(custom));
for (const bad of [{ ...custom, hat: 'unknown' }, { ...custom, ink: 6 }, { ...custom, ink: 1.5 }, { ...custom, extra: true }]) {
  assert.equal(isValidSkin(bad), false);
}

// Exercise the actual reliable transport, including host relay and direct peers.
const contexts = [];
function transport(id, host) {
  const context = vm.createContext({
    performance: { now: () => 1000 }, setInterval() {}, clearTimeout() {},
    e0: () => "test-session", Hs: class { allow() { return true } }, jo: new Set(), Uo: () => true,
    window: { parent: { postMessage() {} } },
  });
  const start = source.indexOf('Fi=class{');
  const end = source.indexOf(';var Oi=', start);
  const Transport = vm.runInContext(`(${source.slice(start + 3, end)})`, context);
  const net = new Transport();
  net.id = id; net.isHost = host; net.hostId = 'host'; net.peer = {}; net.connected = true;
  contexts.push(context);
  return net;
}
const host = transport('host', true), a = transport('a', false), b = transport('b', false);
const syncs = new Map([['host', new SkinSync()], ['a', new SkinSync()], ['b', new SkinSync()]]);
for (const net of [host, a, b]) net.on('skin', (skin, id) => syncs.get(net.id).receive(id, skin));
function connect(from, to, direct = false) {
  (direct ? from.direct : from.conns).set(to.id, {
    peer: to.id, open: true, send: packet => to._route(packet, from.id),
  });
}
connect(host, a); connect(a, host); connect(host, b); connect(b, host);
a.roster = b.roster = ['host', 'a', 'b'];
syncs.get('a').tick(a, custom, a.roster, 1000);
assert.equal(syncs.get('host').skins.get('a').hat, 'crown');
assert.equal(syncs.get('b').skins.get('a').face, 'shades');
connect(a, b, true); connect(b, a, true);
syncs.get('a').tick(a, { ...custom, hat: 'beret' }, a.roster, 1100);
assert.equal(syncs.get('b').skins.get('a').hat, 'beret');
const sent = a.stats.sent;
syncs.get('a').tick(a, { ...custom, hat: 'beret' }, a.roster, 1200);
assert.equal(a.stats.sent, sent, 'unchanged skin must not flood each frame');
syncs.get('a').tick(a, custom, [...a.roster, 'late'], 1300);
assert.equal(a.stats.sent, sent + 1, 'roster changes trigger a reliable skin resend');
syncs.get('a').tick(a, custom, [...a.roster, 'late'], 6300);
assert.equal(a.stats.sent, sent + 2, 'slow retry repairs dropped messages');
console.log('PASS: reliable host relay, direct peers, costume changes, join resend and bounded retry');

const rosterContext = vm.createContext({
  F: { players: new Map([['host', { name: 'Host', v: 7 }], ['a', { name: 'A', v: 7 }]]) },
  u: host, skinSync: syncs.get('host'), normalizeSkin,
  window: { __customSkin: custom, __playerInk: 5 },
});
const rosterStart = source.indexOf('function La(){'), rosterEnd = source.indexOf('function Ze()', rosterStart);
const snapshot = vm.runInContext(`${source.slice(rosterStart, rosterEnd)};La()`, rosterContext);
const late = new SkinSync();
for (const player of JSON.parse(JSON.stringify(snapshot))) late.receive(player.id, player.skin);
assert.equal(late.skins.get('host').hat, 'crown');
assert.equal(late.skins.get('a').weaponSkin, 'gold');
console.log('PASS: actual lobby snapshot includes host and client costumes for late joiners');

// Run the shipped model builders and remote player with real Three.js objects.
const k = { BLUE: 0, RED: 1, BLACK: 2, ORANGE: 3, GREEN: 4, PINK: 5 };
const context = vm.createContext({
  C: THREE, St: THREE, k, vt: Math.PI * 2, p: (a, b) => (a + b) / 2,
  normalizeSkin, weaponSkinInk, isValidSkin, buildDualKrissModel,
  gt: ({ ink = 0 } = {}) => new THREE.ShaderMaterial({ uniforms: { uInk: { value: ink } } }),
  qi: [], Qn: ['kriss', 'shotgun', 'sniper', 'blade', 'rifle'],
  window: { __doodleTdm: { enabled: false } },
});
const ast = ts.createSourceFile('game.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const builders = new Set(['qt', 'yr', 'zo', 'de', 'pi', 'ui', 'Es', 'Ao', 'br', 'Lo', 'Os']);
function visit(node) {
  if (ts.isFunctionDeclaration(node) && builders.has(node.name?.text)) vm.runInContext(node.getText(ast), context);
  if (ts.isVariableDeclaration(node) && builders.has(node.name?.text)) vm.runInContext(`var ${node.getText(ast)};`, context);
  ts.forEachChild(node, visit);
}
visit(ast);
const start = source.indexOf('Vi=class{'), end = source.indexOf(';var jo=', start);
const Remote = vm.runInContext(`(${source.slice(start + 3, end)})`, context);
const scene = new THREE.Scene();
const remote = new Remote({ scene }, 'a', 'Player A', 0, 1);
remote.setWeapon(2);
remote.root.visible = true; remote.root.position.set(1, 2, 3);
let old = remote.root;
remote.applySkin(custom);
assert.notEqual(remote.root, old);
assert.equal(old.parent, null);
assert.equal(remote.root.visible, true);
assert.deepEqual(remote.root.position.toArray(), [1, 2, 3]);
assert.equal(remote.T.hat, 'crown'); assert.equal(remote.T.face, 'shades');
assert.equal(remote.weaponIndex, 2, 'changing costume preserves equipped weapon');
assert.equal(remote.mat.uniforms.uInk.value, 5);
assert.equal(remote.weaponMat.uniforms.uInk.value, 3);
assert.ok(remote.J.gun.children.some(child => child.material === remote.weaponMat));
old = remote.root; remote.applySkin(custom);
assert.equal(remote.root, old, 'repeated snapshots must not rebuild the model');
context.window.__doodleTdm = { enabled: true, teams: { red: [], blue: ['a'] } };
remote._syncSkinInk();
assert.equal(remote.mat.uniforms.uInk.value, 4);
assert.equal(remote.tagMesh.material.uniforms.uInk.value, 4);
assert.equal(remote.weaponMat.uniforms.uInk.value, 3, 'team color must not overwrite weapon skin');
// Death queues the new appearance until respawn without rebuilding debris.
remote.corpse = true; old = remote.root;
remote.applySkin({ ...custom, hat: 'hood', face: 'angry' });
assert.equal(remote.root, old);
remote._buildModel(); remote.setWeapon(2);
assert.equal(remote.T.hat, 'hood'); assert.equal(remote.T.face, 'angry');
console.log('PASS: actual remote costume model, weapon preservation, team color, repeated snapshots and respawn');

// Validate skin packets with the real protocol guard, including lobby acceptance.
const guardStart = source.indexOf('Us=Object.freeze('), guardEnd = source.indexOf('var Jr=', guardStart);
Object.assign(context, { jo: new Set(), Ur: new Set(['skin']), $r: new Set() });
vm.runInContext(`var ${source.slice(guardStart, guardEnd)}`, context);
context.packet = { t: 'skin', relay: true, d: custom };
assert.ok(vm.runInContext('Uo(packet)', context));
context.packet.d = { ...custom, face: 'bad' };
assert.equal(vm.runInContext('Uo(packet)', context), false);
assert.ok(source.includes('["matchready","skin","stat","startreq","teamreq"].includes(n.t)'));
console.log('PASS: protocol validates allowed cosmetics and accepts skin updates in lobby');
