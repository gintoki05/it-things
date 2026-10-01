const HATS = ["cap", "beret", "band", "helmet", "hood", "crown", "cowboy", "horns", "none"];
const FACES = ["classic", "psycho", "shades", "angry", "derp"];
const WEAPONS = ["classic", "gold", "dragon", "cyber", "shadow"];

export function isValidSkin(skin) {
  return !!skin && typeof skin === "object" && !Array.isArray(skin)
    && Object.keys(skin).length === 4
    && HATS.includes(skin.hat) && FACES.includes(skin.face)
    && WEAPONS.includes(skin.weaponSkin)
    && Number.isInteger(skin.ink) && skin.ink >= 0 && skin.ink <= 5;
}

export function normalizeSkin(skin = {}, ink = skin?.ink) {
  return {
    hat: HATS.includes(skin?.hat) ? skin.hat : "cap",
    face: FACES.includes(skin?.face) ? skin.face : "classic",
    weaponSkin: WEAPONS.includes(skin?.weaponSkin) ? skin.weaponSkin : "classic",
    ink: Number.isInteger(ink) && ink >= 0 && ink <= 5 ? ink : 0,
  };
}

export function weaponSkinInk(skin, bodyInk) {
  return ({ gold: 3, dragon: 1, cyber: 4, shadow: 2 })[skin.weaponSkin] ?? bodyInk;
}

// Send reliably on change/join, with a slow retry for lost relay messages.
// Keep cosmetics out of the 20 Hz position stream.
export class SkinSync {
  constructor() {
    this.skins = new Map();
    this.key = "";
    this.nextSend = 0;
  }

  receive(id, skin, apply) {
    if (!id || !isValidSkin(skin)) return false;
    const clean = normalizeSkin(skin);
    this.skins.set(id, clean);
    apply?.(clean);
    return true;
  }

  tick(net, skin, roster, now) {
    if (!net.active) return;
    const clean = normalizeSkin(skin);
    const key = JSON.stringify([net.id, net.code, roster, clean]);
    this.skins.set(net.id, clean);
    if (key !== this.key || now >= this.nextSend) {
      this.key = key;
      this.nextSend = now + 5000;
      net.broadcast("skin", clean);
    }
  }

  clear() {
    this.skins.clear();
    this.key = "";
    this.nextSend = 0;
  }
}
