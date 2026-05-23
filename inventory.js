/** 道具定義與背包 */

export const ITEM_DEFS = {
  cola: {
    name: "可樂",
    desc: "使用後短時間加速",
    passive: false,
    color: 0x3366ff,
  },
  smoke: {
    name: "煙霧彈",
    desc: "使用後隱身一段時間",
    passive: false,
    color: 0xaaaaaa,
  },
  bandage: {
    name: "繃帶",
    desc: "使用後恢復 HP",
    passive: false,
    color: 0xff4444,
  },
  speed: {
    name: "加速鞋",
    desc: "常駐：衝刺恢復更快",
    passive: true,
  },
  doublejump: {
    name: "二段跳靴",
    desc: "常駐：可空中再跳一次",
    passive: true,
  },
  bolt: {
    name: "破門撬",
    desc: "鑰匙模式：可強制打開一扇門（不需對應鑰匙）",
    passive: false,
    keyhuntOnly: true,
  },
};

export function ensureInventory(p) {
  if (!p.inventory) p.inventory = {};
  if (!p.passives) p.passives = {};
}

export function addInventoryItem(p, type, count = 1) {
  const def = ITEM_DEFS[type];
  if (!def) return;
  ensureInventory(p);
  if (def.passive) {
    p.passives[type] = true;
    applyPassive(p, type);
    return;
  }
  p.inventory[type] = (p.inventory[type] || 0) + count;
}

export function applyPassive(p, type) {
  if (type === "doublejump") {
    p.jumpsMax = Math.max(p.jumpsMax || 1, 2);
    p._airJumpReady = true;
    p._djRechargeUntil = 0;
  }
  if (type === "speed") {
    p._speedShoes = true;
    p.sprintMeter = 100;
    p.sprintExhausted = false;
  }
}

export function useInventoryItem(p, type) {
  const def = ITEM_DEFS[type];
  if (!def || def.passive) return false;
  ensureInventory(p);
  if ((p.inventory[type] || 0) <= 0) return false;
  p.inventory[type]--;
  if (p.inventory[type] <= 0) delete p.inventory[type];
  if (type === "cola") p.effects.speedBoost = Math.max(p.effects.speedBoost || 0, 5);
  if (type === "smoke") p.effects.invisible = Math.max(p.effects.invisible || 0, 5);
  if (type === "bandage") p.hp = Math.min(p.maxHp ?? 100, (p.hp ?? 100) + 35);
  if (type === "bolt") return false;
  return true;
}

export function getActiveInventoryList(p) {
  ensureInventory(p);
  return Object.entries(p.inventory).filter(([, n]) => n > 0);
}

export function getPassiveList(p) {
  ensureInventory(p);
  return Object.keys(p.passives).filter((k) => p.passives[k]);
}
