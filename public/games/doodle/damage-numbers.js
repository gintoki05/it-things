import { Vector3 } from "three";

// Local hit feedback only; never sends additional multiplayer packets.
export class DamageNumbers {
  constructor(root, camera) {
    this.camera = camera;
    this.projected = new Vector3();
    this.entries = [];
    this.layer = document.createElement("div");
    this.layer.className = "damage-numbers";
    this.layer.setAttribute("aria-hidden", "true");
    root.appendChild(this.layer);
  }

  hit(amount, point, crit = false, targetId = null) {
    const damage = Math.round(Number(amount));
    if (!point || !Number.isFinite(damage) || damage <= 0) return;
    // Shotgun pellets from the same shot share one small number.
    const recent = targetId === null ? null : this.entries.find(
      entry => entry.targetId === targetId && entry.age < 0.08
    );
    if (recent) {
      recent.damage += damage;
      recent.node.textContent = String(recent.damage);
      recent.node.classList.toggle("crit", recent.crit ||= crit);
      return;
    }
    if (this.entries.length >= 16) this.entries.shift().node.remove();
    const node = document.createElement("span");
    node.className = `damage-number${crit ? " crit" : ""}`;
    node.textContent = String(damage);
    node.style.visibility = "hidden";
    this.layer.appendChild(node);
    this.entries.push({ node, point: point.clone(), damage, crit, targetId, age: 0 });
  }

  update(dt, active = true) {
    if (!active) {
      for (const entry of this.entries) entry.node.remove();
      this.entries.length = 0;
      return;
    }
    for (let index = this.entries.length - 1; index >= 0; index--) {
      const entry = this.entries[index];
      entry.age += dt;
      if (entry.age >= 0.65) {
        entry.node.remove();
        this.entries.splice(index, 1);
        continue;
      }
      this.projected.copy(entry.point).project(this.camera);
      const { x, y, z } = this.projected;
      const visible = z >= -1 && z <= 1 && Math.abs(x) <= 1 && Math.abs(y) <= 1;
      entry.node.style.visibility = visible ? "visible" : "hidden";
      if (!visible) continue;
      entry.node.style.left = `${(x * 0.5 + 0.5) * 100}%`;
      entry.node.style.top = `${(-y * 0.5 + 0.5) * 100}%`;
      entry.node.style.transform = `translate(-50%, ${-16 - entry.age * 30}px)`;
      entry.node.style.opacity = String(Math.min(1, (0.65 - entry.age) / 0.25));
    }
  }
}
