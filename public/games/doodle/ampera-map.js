import * as THREE from "three";

// Compressed gameplay layout, not a survey or a 1:1 reconstruction.
// References: Bina Marga's Ampera structure study; Indonesia Travel's
// Ampera/Kapitan pages; DJPb Tanjak Vol. 10/2024, pp. 12–13 (7 Ulu stairs).
export const AMPERA_BOUNDS = { minX: -70, maxX: 70, minZ: -90, maxZ: 90 };

const LETTERS = {
  A: ["010", "101", "111", "101", "101"],
  B: ["110", "101", "110", "101", "110"],
  E: ["111", "100", "110", "100", "111"],
  I: ["111", "010", "010", "010", "111"],
  K: ["101", "101", "110", "101", "101"],
  L: ["100", "100", "100", "100", "111"],
  M: ["101", "111", "111", "101", "101"],
  P: ["110", "101", "110", "100", "100"],
  R: ["110", "101", "110", "101", "101"],
  S: ["111", "100", "111", "001", "111"],
  T: ["111", "010", "010", "010", "010"],
  U: ["101", "101", "101", "101", "111"],
  Z: ["111", "001", "010", "100", "111"],
  1: ["010", "110", "010", "010", "111"],
  6: ["111", "100", "111", "101", "111"],
  7: ["111", "001", "010", "010", "010"],
};

// Return indices into arenaSpawns, keeping the existing network spawn payload.
// Internal team key "blue" still represents Green Team.
export function getAmperaTeamSpawnIndices(level, mode, teams, playerId) {
  if (level.key !== "ampera" || mode !== "tdm" || !teams || !playerId) return null;
  const team = teams.red?.includes(playerId) ? "red"
    : teams.blue?.includes(playerId) ? "blue" : null;
  return team ? level.teamSpawnIndices[team] : null;
}

export function buildAmpera(builder, colors) {
  const { L: level, box, slab, stairs, rail, cyl, ring, addGeo, collider,
    spawn, sniper, pickup } = builder;
  const { BLACK: ink, RED: red, ORANGE: brown, GREEN: green } = colors;
  level.key = "ampera";
  level.bounds = { ...AMPERA_BOUNDS };
  level.playerStart.set(-18, 0, -80);
  level.style = {
    paper: [.98, .95, .87], lines: 1,
    inks: [[.1, .19, .76], [.86, .12, .2], [.18, .2, .26],
      [.48, .32, .19], [.12, .6, .3], [.9, .4, .66]],
  };
  level.minimapTitle = "AMPERA · ILIR ↑";
  level.minimapDescription = "Minimap Ampera: kedua tepian Musi, jembatan, posisi dan arah pemain";
  level.minimapAreas = [
    { minX: -70, maxX: 70, minZ: -24, maxZ: 24, color: "#92765855" },
    { minX: -9, maxX: 9, minZ: -50, maxZ: 50, color: "#dbc9a8bb" },
  ];

  const detail = (x, y, z, width, height, depth, color = ink, fill = false) =>
    box(x, y, z, width, height, depth, { ink: color, noCollide: true, fill });
  const floor = (x1, z1, x2, z2, y = 0, tag = "ampera-floor") =>
    slab(x1, z1, x2, z2, y, .4, { ink, tag });
  const cover = (x, y, z, width = 2.6, height = 1.3, depth = 2) =>
    box(x, y, z, width, height, depth, { ink: brown, noNav: true });
  const stroke = (from, to, thickness = .1, color = ink) => {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    const direction = b.clone().sub(a);
    const geometry = new THREE.BoxGeometry(thickness, direction.length(), thickness);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0), direction.normalize()));
    geometry.translate(...a.add(b).multiplyScalar(.5).toArray());
    addGeo(geometry, color);
  };
  const sign = (text, x, y, z, scale = .22, facing = 1) => {
    // Geometry lettering works with the engine's ink/depth postprocessing.
    const width = text.length * 4 * scale;
    detail(x, y - scale, z - facing * .08, width + .8, 7 * scale, .12);
    [...text].forEach((letter, index) => {
      const rows = LETTERS[letter];
      if (!rows) return;
      rows.forEach((row, r) => [...row].forEach((pixel, c) => {
        if (pixel === "1") detail(x + facing * ((index * 4 + c + .5) * scale - width / 2),
          y + (4 - r) * scale, z, scale * .82, scale * .82, .04, ink, true);
      }));
    });
  };
  const canopy = (x, y, z, width, depth, color = brown) => {
    detail(x, y, z, width, .2, depth, color);
    // Hide canopy surfaces on the radar; do not make an extra walking floor.
    collider(x, y, z, width, .2, depth, { noNav: true, tag: "minimap-ceiling" });
    for (const dx of [-width / 2 + .15, width / 2 - .15])
      for (const dz of [-depth / 2 + .15, depth / 2 - .15])
        box(x + dx, 0, z + dz, .2, y, .2, { ink, noNav: true });
  };

  // Low-rise silhouettes give the riverfront a city backdrop. These sit
  // outside the playable boundary and deliberately have no hook colliders.
  for (const side of [-1, 1]) {
    for (let index = 0; index < 7; index++) {
      const x = -63 + index * 21, z = side * (107 + index % 2 * 7);
      const height = 7 + index % 3 * 3;
      detail(x, 0, z, 13, height, 12, index % 2 ? brown : ink);
      detail(x, height, z, 14, .5, 13, red);
      for (const dx of [-4, 0, 4]) for (let y = 2; y < height - 1; y += 3)
        detail(x + dx, y, z - side * 6.03, 1.4, 1.4, .04, ink, true);
    }
  }

  // There is deliberately no ground collider spanning the river.
  floor(-70, -90, 70, -24);
  floor(-70, 24, 70, 90);
  // Water continues beyond the arena so distant river traffic stays afloat.
  detail(0, -2, 0, 480, .08, 48, brown, true);
  for (let z = -20; z <= 20; z += 5)
    for (const x of [-50, -25, 25, 50])
      detail(x + Math.sin(z) * 3, -1.9, z, 6, .025, .045, ink);
  for (const side of [-1, 1]) {
    // Stone embankments frame the river, leaving the bridge and docks open.
    for (const [left, right] of (side < 0
      ? [[-69, -10], [10, 30], [39, 69]]
      : [[-69, -41], [-32, -10], [10, 69]])) {
      box((left + right) / 2, -2, side * 24, right - left, 2, .8, { ink, noNav: true });
      for (let x = left + 2; x < right; x += 5)
        detail(x, -1.9, side * 23.55, .07, 1.8, .06, ink);
    }
    for (let x = -60; x <= 60; x += 12) {
      if (Math.abs(x) < 10) continue;
      detail(x, .01, side * 29, .035, .02, 7, brown);
    }
  }

  // One bridge, a road and two continuous sidewalks. Ramps are shallow steps
  // compatible with both player collision and the existing navigation grid.
  floor(-9, -50, 9, 50, 6, "ampera-deck");
  stairs(0, 0, -76, "+z", 30, 18, { rise: .2, run: 26 / 30, ink });
  stairs(0, 0, 76, "-z", 30, 18, { rise: .2, run: 26 / 30, ink });
  for (const x of [-6.8, 6.8]) detail(x, 6.015, 0, .12, .03, 100, brown, true);
  for (const x of [-8.8, 8.8]) {
    // Leave an opening where the bank stairs meet the sidewalk.
    const sections = x < 0 ? [[-50, -42.2], [-37.8, 50]] : [[-50, 37.8], [42.2, 50]];
    for (const [from, to] of sections) rail(x, from, x, to, 6, { ink: red });
    detail(x, 5.4, 0, .25, .35, 100, red);
  }
  for (let z = -46; z < 50; z += 7) detail(0, 6.02, z, .12, .025, 2, brown, true);
  for (const x of [-8.45, 8.45]) for (const z of [-46, -28, 28, 46]) {
    box(x, 6, z, .22, 9, .22, { ink, noNav: true });
    const inside = x < 0 ? 1 : -1;
    detail(x + inside * .55, 14.9, z, 1.3, .15, .18);
    box(x + inside * 1.05, 14.6, z, .65, .35, .65, { ink, noNav: true });
    detail(x + inside * 1.05, 14.59, z, .5, .03, .5, brown, true);
  }

  // The two vertical-lift towers are portals, not suspension-bridge arches.
  // Visible structure accepts grapple. noNav only keeps bots off tower tops.
  for (const z of [-16, 16]) {
    for (const x of [-5.8, 5.8]) {
      box(x, -8, z, 2.1, 14, 4, { ink, noNav: true });
      box(x, 6, z, 1.8, 23, 3.4, { ink: red, noNav: true });
      box(x, 6, z, 2.2, .65, 3.8, { ink: red, noNav: true });
      for (const facing of [-1, 1]) {
        detail(x, 6.7, z + facing * 1.74, .4, 21.5, .08, red, true);
        for (const y of [10, 16, 22]) {
          detail(x, y, z + facing * 1.8, 1.85, .15, .1, red);
          stroke([x - .75, y, z + facing * 1.81], [x + .75, y + 3, z + facing * 1.81], .09, red);
        }
        // Brown/gold rings show useful swing targets below the high crossbeam.
        ring(x, 13.5, z + facing * 1.95, "z");
      }
    }
    box(0, 24.5, z, 13.4, 3.5, 3.4, { ink: red, noNav: true });
    box(0, 28, z, 14, 1, 4, { ink: red, noNav: true });
    // A solid housing prevents the front and rear clocks showing as two
    // displaced disks through the previously empty portal.
    box(0, 20.9, z, 2.8, 3.6, 3.8, { ink: red, noNav: true });
    for (const facing of [-1, 1]) {
      sign("AMPERA", 0, 25.25, z + facing * 1.76, .4, facing);
      const face = new THREE.CircleGeometry(1.08, 24);
      if (facing < 0) face.rotateY(Math.PI);
      face.translate(0, 22.65, z + facing * 1.96);
      addGeo(face, ink);
      for (let hour = 0; hour < 12; hour++) {
        const angle = hour * Math.PI / 6;
        detail(Math.sin(angle) * .88, 22.6 + Math.cos(angle) * .88,
          z + facing * 2.0, .09, .09, .035, ink, true);
      }
      stroke([0, 22.65, z + facing * 2.01], [-.42 * facing, 23.1, z + facing * 2.01], .085);
      stroke([0, 22.65, z + facing * 2.01], [.6 * facing, 23.15, z + facing * 2.01], .075);
    }
  }

  // Staggered vehicles break long sightlines; both sidewalks remain open.
  for (const [x, z, long] of [[-2.6, -36, false], [2.6, -10, true],
    [-2.6, 10, true], [2.6, 36, false]]) {
    box(x, 6, z, 2.5, 1.3, long ? 5.8 : 4.2, { ink, noNav: true });
    box(x, 7.3, z - .2, 2.2, long ? 1.7 : .8, long ? 4.8 : 2.5,
      { ink: long ? brown : red, noNav: true });
    for (const dx of [-1.3, 1.3]) for (const dz of [-1.4, 1.4])
      detail(x + dx, 6.15, z + dz, .12, .65, .65, ink, true);
  }
  for (const [x, z] of [[-6, -43], [6, -25], [-6, 0], [6, 25], [-6, 43]])
    cover(x, 6, z, 1.2, 1.25, 3);

  // Banks have local circulation beneath the landward bridge approaches.
  // Stairs at 7 Ulu follow the reference; Ilir stairs are a gameplay adaptation.
  for (const side of [-1, 1]) {
    const z = side * 40;
    const direction = side === 1 ? "-x" : "+x";
    stairs(side * 25, 0, z, direction, 16, 3.4, { rise: .2, run: 6 / 16, ink });
    // Flat landings sit between flights, never over them as a low ceiling.
    floor(side === 1 ? 15 : -19, z - 1.7, side === 1 ? 19 : -15, z + 1.7, 3.2);
    stairs(side * 15, 3.2, z, direction, 14, 3.4, { rise: .2, run: 6 / 14, ink });
    floor(side === 1 ? 7 : -9.1, z - 1.7, side === 1 ? 9.1 : -7, z + 1.7, 6);
  }

  // BKB exterior and its public plaza, on the west side of the Ilir bank.
  builder.wallX(-65, -19, -66, 0, 8, 1.2, [[-46, -38, 0, 4.2]], { ink });
  box(-65, 0, -77, 1.2, 8, 22, { ink });
  box(-19, 0, -77, 1.2, 8, 22, { ink });
  box(-42, 0, -87, 46, 8, 1.2, { ink });
  // Restrict the fort interior, leaving the gate/recess readable from the plaza.
  box(-42, 0, -71, 43, 7, 5, { ink, noNav: true });
  sign("BKB", -42, 5, -65.3, .3);
  for (let x = -63; x < -19; x += 4) detail(x, 8, -66, 1.6, .8, 1.2);
  for (const [x, z] of [[-54, -49], [-29, -50], [-45, -32]]) cover(x, 0, z, 5, 1.15, 1.8);
  canopy(-56, 3.2, -33, 8, 5);
  sign("PEMPEK", -56, 2.1, -30.4, .18);

  // Pasar 16 Ilir: two aisles, connected cross-passages and a low balcony.
  for (const x of [24, 44, 62]) for (const z of [-73, -53]) {
    box(x, 0, z, 6, 4.8, 10, { ink, noNav: true });
    canopy(x, 4.85, z, 7, 11, brown);
    cover(x, 0, z + 6.8, 5, 1.25, 1.4);
  }
  box(42, 0, -85, 45, 6, 3, { ink });
  sign("PASAR 16 ILIR", 42, 4, -83.4, .24);
  for (const x of [24, 44, 62]) for (const z of [-73, -53]) {
    // Shutters, door frames and striped awnings make kiosks read as a market.
    detail(x, .2, z + 5.02, 3.8, 2.7, .04, brown);
    for (let y = .6; y < 2.8; y += .45) detail(x, y, z + 5.06, 3.6, .045, .03);
    for (const dx of [-2.2, 2.2]) detail(x + dx, 0, z + 5.1, .14, 3.4, .08);
    for (let dx = -2.7; dx <= 2.7; dx += 1.1)
      detail(x + dx, 3.3, z + 5.5, .48, .13, 1.5, red);
  }
  floor(30, -63, 51, -59, 3);
  stairs(30, 0, -58.8, "-z", 12, 3, { rise: .25, run: .6, ink });
  stairs(51, 0, -58.8, "-z", 12, 3, { rise: .25, run: .6, ink });
  rail(32, -59, 49, -59, 3, { ink });
  rail(30, -63, 51, -63, 3, { ink });

  // Plaza 7 Ulu, shelter, river terminal and Kapitan's raised house terraces.
  canopy(38, 3.5, 34, 12, 7, red);
  sign("PLAZA 7 ULU", 38, 2.4, 37.6, .2);
  for (const [x, z] of [[-45, 33], [-26, 44], [44, 49], [22, 64]]) cover(x, 0, z, 4, 1.2, 1.8);
  for (const x of [-49, -29]) {
    floor(x - 7, 58, x + 7, 69, 1);
    stairs(x, 0, 55, "+z", 4, 3, { rise: .25, run: .75, ink });
    box(x, 1, 74, 14, 5, 10, { ink: brown, noNav: true });
    const roof = new THREE.ConeGeometry(11, 3.5, 4);
    roof.rotateY(Math.PI / 4).scale(1, 1, .8).translate(x, 7.7, 74);
    addGeo(roof, brown);
    collider(x, 6, 74, 15, 3.5, 11, { noNav: true, tag: "minimap-ceiling" });
    for (const dx of [-4.5, 4.5]) {
      detail(x + dx, 2.3, 68.94, 2.1, 1.8, .08);
      detail(x + dx, 3.15, 68.88, 2, .08, .04, brown, true);
      detail(x + dx, 2.3, 68.88, .08, 1.8, .04, brown, true);
    }
    detail(x, 1.05, 68.94, 2, 3.7, .08);
    for (const dx of [-6, 6]) box(x + dx, 1, 59, .25, 4.5, .25, { ink, noNav: true });
    rail(x - 7, 58, x - 2, 58, 1, { ink });
    rail(x + 2, 58, x + 7, 58, 1, { ink });
  }
  sign("KAPITAN", -39, 3.5, 69, .25, -1);
  // Local blocks protect Green spawns while still allowing exits on both sides.
  box(34, 0, 76, 12, 5, 10, { ink: brown, noNav: true });
  box(59, 0, 70, 12, 5, 10, { ink, noNav: true });
  canopy(47, 3.1, 59, 8, 5);
  sign("PEMPEK", 47, 2.1, 56.4, .18, -1);

  // Plaza palms stay clear of spawns, market aisles and stair entrances.
  for (const [x, z] of [[-62, -43], [-16, -30], [-58, 48], [56, 33], [51, 53]]) {
    cyl(x, 0, z, .24, 4.8, { ink: brown, noNav: true, seg: 7 });
    for (let leaf = 0; leaf < 6; leaf++) {
      const angle = leaf * Math.PI / 3;
      stroke([x, 4.8, z], [x + Math.cos(angle) * 1.7, 5.5, z + Math.sin(angle) * 1.7], .22, green);
      stroke([x + Math.cos(angle) * 1.7, 5.5, z + Math.sin(angle) * 1.7],
        [x + Math.cos(angle) * 3.1, 4.5, z + Math.sin(angle) * 3.1], .18, green);
    }
  }

  // Each dock stops locally. Boats never form another crossing of the Musi.
  floor(31, -27, 38, -16, 0, "ampera-dock");
  floor(-40, 16, -33, 27, 0, "ampera-dock");
  for (const side of [-1, 1]) {
    const x = -side * 34.5;
    rail(x - 3.3, side * 24, x - 3.3, side * 17, 0, { ink });
    rail(x + 3.3, side * 24, x + 3.3, side * 17, 0, { ink });
    for (const dx of [-6, 6]) {
      detail(x + dx, -1.4, side * 19, 2, .5, 5.8, brown);
      detail(x + dx, -.9, side * 19, 1.5, .08, 4.8, ink, true);
      detail(x + dx, -.8, side * 19, 1.6, 1, 2, brown);
    }
  }

  // Ambient traffic uses the existing animation clock, with no physics,
  // navigation or grapple colliders and no multiplayer traffic to sync.
  const ambientPart = (group, geometry, color = ink, fill = false) => {
    const part = builder.mesh(geometry, color, fill);
    group.add(part);
    return part;
  };
  const ambientBox = (group, x, y, z, width, height, depth, color = ink) =>
    ambientPart(group, new THREE.BoxGeometry(width, height, depth).translate(x, y, z), color);
  const animate = (group, update) => {
    builder.scene.add(group);
    level.meshes.push(group);
    level.animated.push({ mesh: group, update });
    update(0);
  };

  // A passenger jet passes overhead, then waits before its next flyby.
  const plane = new THREE.Group();
  ambientPart(plane, new THREE.CylinderGeometry(.75, 1.1, 17, 10)
    .rotateZ(-Math.PI / 2), ink);
  ambientPart(plane, new THREE.SphereGeometry(1, 10, 6)
    .scale(1.7, .75, .75).translate(8.8, 0, 0), ink);
  ambientBox(plane, -1, -.1, 0, 3.2, .18, 17, red);
  ambientBox(plane, -7, .2, 0, 2.3, .15, 6, red);
  ambientBox(plane, -7, 1.4, 0, 2, 2.8, .18, red);
  for (const z of [-4.5, 4.5]) ambientPart(plane,
    new THREE.CylinderGeometry(.45, .45, 2.6, 8).rotateZ(Math.PI / 2).translate(.5, -.75, z), ink);
  for (const z of [-.95, .95]) for (let x = -5; x <= 5; x += 1.2)
    ambientBox(plane, x, .18, z, .35, .35, .06, ink);
  animate(plane, time => {
    const phase = time % 85;
    plane.visible = phase < 40;
    plane.position.set(-240 + phase * 12, 55 + Math.sin(time * .12), -35);
    plane.rotation.x = Math.sin(time * .14) * .04;
  });

  // Three river lanes run along Musi (+/-X), not between the two banks.
  // All cabins clear the bridge underside and lanes avoid the tower piers.
  for (const [kind, lane, speed, offset, direction] of [
    ["cargo", 0, 2.4, 110, 1], ["passenger", -8, 4, 35, -1], ["jukung", 8, 3, 225, 1],
  ]) {
    const boat = new THREE.Group();
    const length = kind === "cargo" ? 14 : kind === "passenger" ? 8 : 5;
    const width = kind === "cargo" ? 4 : kind === "passenger" ? 2.8 : 1.4;
    ambientBox(boat, 0, 0, 0, length, .7, width, brown);
    ambientPart(boat, new THREE.ConeGeometry(width / 2, 2, 4)
      .rotateZ(-Math.PI / 2).translate(length / 2 + .7, 0, 0), brown);
    ambientBox(boat, 0, .4, 0, length - 1, .12, width - .25, ink);
    if (kind === "cargo") {
      for (const x of [-3, 0, 3]) ambientBox(boat, x, 1, 0, 2.6, 1.1, 3, x === 0 ? red : green);
      ambientBox(boat, -5.2, 1.2, 0, 2, 1.5, 3, ink);
      ambientBox(boat, -5.2, 2.2, 0, .3, .7, .3, ink);
    } else if (kind === "passenger") {
      ambientBox(boat, -.8, 1, 0, 5.5, 1.1, 2.4, ink);
      ambientBox(boat, -.8, 1.6, 0, 6, .15, 2.8, red);
      for (const z of [-1.23, 1.23]) for (const x of [-2.5, -1, .5, 2])
        ambientBox(boat, x, 1.15, z, .8, .5, .04, ink);
    } else {
      for (const x of [-1.5, 1.5]) ambientBox(boat, x, .85, 0, .12, 1, .12, ink);
      ambientBox(boat, 0, 1.4, 0, 3.8, .15, 1.7, brown);
    }
    for (const z of [-width * .7, width * .7])
      ambientPart(boat, new THREE.BoxGeometry(length * .9, .025, .045)
        .rotateY(z < 0 ? -.12 : .12).translate(-length * .8, -.52, z), ink);
    boat.rotation.y = direction === 1 ? 0 : Math.PI;
    animate(boat, time => {
      const progress = ((time * speed + offset) % 360) - 180;
      boat.position.set(direction * progress, -1.35 + Math.sin(time * 1.4 + offset) * .06, lane);
      boat.rotation.x = Math.sin(time + offset) * .015;
    });
  }

  // Visible buildings are usable grapple targets. Only boundary fences are
  // excluded; never let a skipped boundary become an out-of-map anchor.

  // Physical borders on land, invisible high fences to keep grapple in-bounds.
  for (const side of [-1, 1]) {
    for (const x of [-70, 70]) {
      box(x, 0, side * 57, 1, 4, 66, { ink, noGrapple: true });
      collider(x, 4, side * 57, 1, 40, 66, { noNav: true, noShoot: true, noGrapple: true, tag: "minimap-ceiling" });
    }
    box(0, 0, side * 90, 140, 4, 1, { ink, noGrapple: true });
    collider(0, 4, side * 90, 140, 40, 1, { noNav: true, noShoot: true, noGrapple: true, tag: "minimap-ceiling" });
  }

  // Full-height spawn screens with gaps between them for multiple exits.
  for (const [x, width] of [[-16, 24], [13, 18], [35, 16], [56, 20]])
    box(x, 0, -78, width, 3, 1, { ink: brown, noNav: true });
  for (const [x, width] of [[-11, 34], [22, 14], [47, 12], [62, 12]])
    box(x, 0, 78, width, 3, 1, { ink: brown, noNav: true });

  // Same geometry and spawn ordering in arena and solo; all clients agree.
  const redSpawns = [[-18, 0, -80], [-12, 0, -85], [15, 0, -81], [34, 0, -80], [53, 0, -80]];
  const greenSpawns = [[-16, 0, 82], [2, 0, 84], [22, 0, 83], [47, 0, 83], [62, 0, 83]];
  const fieldSpawns = [[-36, 0, -44], [33, 0, -43], [-58, 0, -57], [34, 3, -61],
    [-52, 0, 44], [44, 0, 41], [-49, 1, 65], [7.7, 6, 32]];
  level.teamSpawns = [redSpawns, greenSpawns].map(team => team.map(p => new THREE.Vector3(...p)));
  level.teamSpawnIndices = { red: [0, 1, 2, 3, 4], blue: [5, 6, 7, 8, 9] };
  for (const p of [...redSpawns, ...greenSpawns, ...fieldSpawns]) {
    spawn(...p);
    level.arenaSpawns.push(new THREE.Vector3(...p));
  }
  for (const p of [[-42, .5, -40], [34, 3.5, -61], [-39, 1.5, 65], [38, .5, 46],
    [-7.5, 6.5, -5], [7.5, 6.5, 5]]) pickup(...p);
  for (const p of [[34, 3, -61], [-49, 1, 65], [-17.5, 3.2, -40]]) sniper(...p);
  level.minimapLabels = [
    ["ILIR", 0, -84, "#a42d37"], ["BKB", -43, -54], ["16 ILIR", 43, -72],
    ["AMPERA", 0, -3, "#a42d37"], ["MUSI", 42, 6, "#755336"],
    ["7 ULU", 40, 40], ["KAPITAN", -40, 74], ["ULU", 3, 84, "#227444"],
  ];
  builder.finish();
  return level;
}
