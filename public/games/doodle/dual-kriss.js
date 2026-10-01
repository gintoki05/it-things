import { BoxGeometry, CylinderGeometry, Group, Mesh, Object3D } from "three";

// Doodle balance, inspired by PB's dual SMG; these are not PB's exact stats.
export const DUAL_KRISS_STATS = {
  name: "DUAL KRISS", hint: "dual SMG · close range · hip fire", kind: "kriss",
  magSize: 60, reserve: 240, maxReserve: 480, interval: 1 / 20,
  damage: 16, headMul: 1.6, pellets: 1,
  spread: 0.028, adsSpread: 0.028, spreadKick: 0.004, spreadMax: 0.09,
  adsFov: 82, sight: [0, 0.18, 0, 0.36],
  camKick: [0.006, 0.004], modelKick: [0.14, 0.16, 1.5, -2, 0.7, 1.3],
  fovKick: 0.65, reloadDur: 2.2, reloadType: "mag", auto: true,
  falloff: [10, 30, 0.22], pvp: [13, 1.6, [8, 26, 0.2]],
  tracer: 0.014, flashScale: 0.7, sound: "shot", moveSpread: 0.0013,
};

export function buildDualKrissModel(root, ink, dark, firstPerson = true) {
  const box = (group, size, position, material = ink) => {
    const mesh = new Mesh(new BoxGeometry(...size), material);
    mesh.position.set(...position);
    group.add(mesh);
    return mesh;
  };
  return [-1, 1].map(side => {
    const group = new Group();
    group.position.set(firstPerson ? side * 0.38 : (side < 0 ? -0.55 : 0), 0, 0);
    if (!firstPerson) group.rotation.y = Math.PI;
    root.add(group);
    // Short barrel and deep Super V receiver distinguish the Vector silhouette.
    box(group, [0.11, 0.12, 0.4], [0, 0.06, -0.12]);
    box(group, [0.13, 0.22, 0.18], [0, -0.06, -0.13]);
    box(group, [0.055, 0.16, 0.07], [0, -0.11, 0.1], dark).rotation.x = -0.18;
    box(group, [0.05, 0.1, 0.1], [0, 0.015, 0.31]);
    box(group, [0.025, 0.04, 0.25], [0, 0.065, 0.23], dark);
    box(group, [0.025, 0.025, 0.3], [0, 0.13, -0.11], dark);
    const barrel = new Mesh(new CylinderGeometry(0.018, 0.018, 0.22, 7), dark);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.06, -0.41);
    group.add(barrel);
    const magazine = box(group, [0.05, 0.23, 0.075], [0, -0.25, -0.17], dark);
    const muzzle = new Object3D();
    muzzle.position.set(0, 0.06, -0.53);
    group.add(muzzle);
    const eject = new Object3D();
    eject.position.set(side * 0.065, 0.06, -0.08);
    group.add(eject);
    return { group, magazine, muzzle, eject };
  });
}

export function createDualKrissClass(Gun, { flash, hand, shellInk }) {
  return class DualKriss extends Gun {
    constructor(ctx) {
      super(ctx, "kriss");
      this.basePos.set(0, -0.18, -0.36);
      this.aimPos.copy(this.basePos);
      this.shell = [0.016, shellInk];
      this.nextBarrel = 0;
    }

    build() {
      this.barrels = buildDualKrissModel(this.root, this.mat, this.dark);
      for (const [index, barrel] of this.barrels.entries()) {
        barrel.flash = flash(barrel.group, 0, 0.06, -0.53, 0.7);
        hand(this.mat, 0.02, -0.14, 0.1, barrel.group, [0.5, index ? -0.6 : 0.6, 1]);
      }
      const first = this.barrels[0];
      this.magMesh = first.magazine;
      this.magY = first.magazine.position.y;
      this.muzzle = first.muzzle;
      this.ejectPt = first.eject;
      this.flash = first.flash;
    }

    fire(state) {
      const barrel = this.barrels[this.nextBarrel];
      this.nextBarrel = 1 - this.nextBarrel;
      this.muzzle = barrel.muzzle;
      this.ejectPt = barrel.eject;
      this.flash = barrel.flash;
      super.fire({ ...state, aim: false });
      // Each hand has an independent flash lifetime when shots alternate.
      barrel.flashLeft = 0.045;
      barrel.group.position.z = 0.045;
    }

    update(dt, state) {
      for (const barrel of this.barrels) {
        barrel.flashLeft = Math.max(0, (barrel.flashLeft || 0) - dt);
        barrel.flash.visible = barrel.flashLeft > 0;
        barrel.group.position.z *= Math.exp(-22 * dt);
      }
      super.update(dt, { ...state, aim: false });
      const second = this.barrels[1].magazine;
      second.position.y = this.magMesh.position.y;
      second.rotation.z = -this.magMesh.rotation.z;
      if (!this.reloading) {
        for (const barrel of this.barrels) {
          barrel.magazine.position.y = this.magY;
          barrel.magazine.rotation.z = 0;
        }
      }
    }
  };
}
