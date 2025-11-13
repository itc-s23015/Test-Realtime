// イベントIDとメタ定義（重み・パラメータ）
export const EVENT_IDS = {
  CLEAR_HAND: "CLEAR_HAND",
  SET_MONEY: "SET_MONEY",
  PRICE_SPIKE: "PRICE_SPIKE",
  PRICE_CRASH: "PRICE_CRASH",
  FORCE_SELL: "FORCE_SELL",
};

// 重み・各種パラメータ
export const EVENT_DEFS = {
  [EVENT_IDS.CLEAR_HAND]: { label: "カード全削除", weight: 1 },
  [EVENT_IDS.SET_MONEY]:  { label: "所持金を一定値", weight: 1, amount: 50000 },
  [EVENT_IDS.PRICE_SPIKE]:{ label: "株の大幅上昇", weight: 1, pctMin: 0.10, pctMax: 0.20 },
  [EVENT_IDS.PRICE_CRASH]:{ label: "株の大幅下落", weight: 1, pctMin: 0.10, pctMax: 0.20 },
  [EVENT_IDS.FORCE_SELL]: { label: "株を強制売却", weight: 1 },
};

// 重み付き抽選
export function pickWeightedId() {
  const pairs = Object.entries(EVENT_DEFS);
  const total = pairs.reduce((s, [, def]) => s + (def.weight ?? 1), 0);
  let r = Math.random() * total;
  for (const [id, def] of pairs) {
    r -= def.weight ?? 1;
    if (r <= 0) return id;
  }
  return pairs[pairs.length - 1][0];
}
