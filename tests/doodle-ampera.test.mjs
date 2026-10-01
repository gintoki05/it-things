import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { buildAmpera, getAmperaTeamSpawnIndices } from "../public/games/doodle/ampera-map.js";
import { MapMinimap } from "../public/games/doodle/minimap.js";

// Exercise the actual engine collision/builder/navigation code without a
// browser, WebGL context, network connection or game simulation.
const source = fs.readFileSync(new URL("../public/games/doodle/game.js", import.meta.url), "utf8");
const ast = ts.createSourceFile("game.js", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const snippets = new Map();
function visit(node) {
  if (ts.isVariableDeclaration(node) && ["hi", "Ks", "Po"].includes(node.name.getText(ast)))
    snippets.set(node.name.getText(ast), node.initializer.getText(ast));
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "Pi") {
    const method = node.initializer.members.find(m => m.name?.getText(ast) === "_findGrappleTarget");
    snippets.set("findGrapple", method.getText(ast));
  }
  if (ts.isFunctionDeclaration(node) && ["wr", "Ma", "Ha", "amperaSpawnPool"].includes(node.name?.text))
    snippets.set(node.name.text, node.getText(ast));
  ts.forEachChild(node, visit);
}
visit(ast);
const colors = { BLUE: 0, RED: 1, BLACK: 2, ORANGE: 3, GREEN: 4, PINK: 5 };
const context = vm.createContext({
  w: THREE, xe: THREE, ki: THREE, k: colors,
  Ne: 1e-4, wo: ["x", "y", "z"], qs: new THREE.Vector3(), Vs: new THREE.Vector3(), gs: [],
  Ue: new THREE.Vector3(), $e: new THREE.Vector3(), Io: [],
  Ot: new THREE.Vector3(), _r: box => !!box.data.noGrapple,
  Rr: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]],
  gt: () => new THREE.MeshBasicMaterial(), Dn: mergeGeometries,
});
for (const name of ["hi", "Po", "Ks"]) vm.runInContext(`var ${name} = ${snippets.get(name)}`, context);
vm.runInContext(snippets.get("wr"), context);
const world = vm.runInContext("new hi()", context);
const builder = context.wr(new THREE.Scene(), world);
const level = buildAmpera(builder, colors);
context.world = world;
context.bounds = level.bounds;
const nav = vm.runInContext("new Ks(world, bounds, 1).build()", context);

test("all spawn points have support and room for the player", () => {
  assert.equal(level.arenaSpawns.length, 18);
  for (const point of level.arenaSpawns) {
    const ground = world.groundBelow(point.x, point.y + .1, point.z);
    assert.ok(Math.abs(ground - point.y) < 1e-6, `Missing floor at ${point.toArray()}`);
    const min = new THREE.Vector3(point.x - .35, point.y + .05, point.z - .35);
    const max = new THREE.Vector3(point.x + .35, point.y + 1.8, point.z + .35);
    assert.equal(world.overlapsAABB(min, max), false, `Blocked spawn at ${point.toArray()}`);
  }
});

test("river has no hidden walkable floor or second crossing", () => {
  for (const x of [-60, -20, 20, 60]) {
    assert.equal(world.raycast(new THREE.Vector3(x, 5, 0), new THREE.Vector3(0, -1, 0), 40), null,
      `Unexpected river floor at ${x}`);
    assert.equal(nav.nearestNode(new THREE.Vector3(x, 0, 0), 1, 2), -1);
  }
  assert.equal(world.groundBelow(0, 7, 0), 6, "Missing central bridge deck");
});

test("both banks and all spawns connect through the bridge", () => {
  const target = level.arenaSpawns[5];
  for (const point of level.arenaSpawns) {
    const path = nav.findPath(point, target);
    assert.ok(path?.complete, `Disconnected spawn at ${point.toArray()}`);
  }
  for (const x of [-7.7, 0, 7.7]) {
    const path = nav.findPath(new THREE.Vector3(x, 6, -45), new THREE.Vector3(x, 6, 45));
    assert.ok(path?.complete, `Broken bridge route at x=${x}`);
  }
  for (const side of [-1, 1]) {
    const path = nav.findPath(new THREE.Vector3(side * 26, 0, side * 40),
      new THREE.Vector3(side * 7.7, 6, side * 40));
    assert.ok(path?.complete, `Disconnected bank stairs on side ${side}`);
    assert.ok(path.length < 32, `Bank stairs require a detour via the road ramp on side ${side}`);
  }
});

test("opposing initial spawns do not have direct eye-level sightlines", () => {
  for (const red of level.teamSpawns[0]) for (const green of level.teamSpawns[1]) {
    const a = red.clone().add(new THREE.Vector3(0, 1.5, 0));
    const b = green.clone().add(new THREE.Vector3(0, 1.5, 0));
    assert.equal(world.hasLineOfSight(a, b), false, `Exposed spawns ${red.toArray()} / ${green.toArray()}`);
  }
});

test("TDM spawn indices use the player's bank while FFA and other maps retain the generic pool", () => {
  const teams = { red: ["r"], blue: ["g"] };
  assert.deepEqual(getAmperaTeamSpawnIndices(level, "tdm", teams, "r"), [0, 1, 2, 3, 4]);
  assert.deepEqual(getAmperaTeamSpawnIndices(level, "tdm", teams, "g"), [5, 6, 7, 8, 9]);
  assert.equal(getAmperaTeamSpawnIndices(level, "ffa", teams, "r"), null);
  assert.equal(getAmperaTeamSpawnIndices(level, "bomb", teams, "r"), null);
  assert.equal(getAmperaTeamSpawnIndices({ key: "luxville" }, "tdm", teams, "r"), null);
  assert.equal(getAmperaTeamSpawnIndices(level, "tdm", teams, "late-unassigned"), null);
});

test("engine respawn and host late-join selection stay on the assigned bank", () => {
  Object.assign(context, {
    getAmperaTeamSpawnIndices, Et: level, po: () => level.arenaSpawns,
    u: { id: "r", active: true }, F: { gameMode: "tdm", teams: { red: ["r"], blue: ["g"] } },
    Rt: new Map(), B: { alive: true, body: { pos: level.arenaSpawns[0] } }, Fe: values => values[0],
  });
  for (const name of ["amperaSpawnPool", "Ma", "Ha"]) vm.runInContext(snippets.get(name), context);
  const red = context.Ma();
  assert.ok(level.teamSpawns[0].some(p => p.equals(red)));
  assert.ok(level.teamSpawnIndices.blue.includes(context.Ha("g")));
  context.u.id = "g";
  assert.ok(level.teamSpawns[1].some(p => p.equals(context.Ma())));
  context.F.gameMode = "ffa";
  assert.equal(context.amperaSpawnPool(), null);
  context.F.gameMode = "tdm";
  context.u.active = false;
  assert.equal(context.amperaSpawnPool(), null);
});

test("tower surfaces accept grapple while bots remain off tower tops", () => {
  const towers = world.boxes.filter(b => b.min.y >= 6 && b.max.y >= 24 && !b.data.noShoot);
  assert.ok(towers.length >= 8);
  for (const box of towers) {
    assert.equal(box.data.noGrapple, false);
    assert.equal(box.data.noNav, true);
  }
});

test("the real grapple targeting method reaches tower rings and crossbeams", () => {
  const find = vm.runInContext(`(function ${snippets.get("findGrapple")})`, context);
  const eye = new THREE.Vector3(0, 7.5, 5);
  const target = level.rings.find(p => p.x > 0 && p.z > 0 && p.z < 16);
  const fixture = {
    ctx: { world, level, enemies: { raycast: () => null, enemies: [] } },
    eye, forward: target.clone().sub(eye).normalize(),
  };
  const hook = find.call(fixture);
  assert.ok(hook, "Ring did not produce a grapple target");
  assert.ok(hook.point.distanceTo(target) < .01);
  fixture.eye = new THREE.Vector3(0, 7.5, 0);
  fixture.forward = new THREE.Vector3(3, 26, 14.3).sub(fixture.eye).normalize();
  const beam = find.call(fixture);
  assert.ok(beam && beam.point.y >= 24, "Visible crossbeam rejected grapple");
});

test("boundary walls still collide but cannot become grapple targets", () => {
  const eye = new THREE.Vector3(-68, 2, 57), direction = new THREE.Vector3(-1, 0, 0);
  const boundary = world.raycast(eye, direction, 10);
  assert.ok(boundary?.box.data.noGrapple);
  assert.equal(world.raycast(eye, direction, 10, box => box.data.noGrapple), null);
});

test("minimap shows both supported maps and hides on other maps or menus", () => {
  const radar = { canvas: {}, ctx: null };
  const update = key => MapMinimap.prototype.update.call(radar, { key }, world, null, null, true, 0);
  for (const key of ["ampera", "luxville"]) { update(key); assert.equal(radar.canvas.hidden, false); }
  update("district"); assert.equal(radar.canvas.hidden, true);
  MapMinimap.prototype.update.call(radar, level, world, null, null, false, 0);
  assert.equal(radar.canvas.hidden, true);
});
