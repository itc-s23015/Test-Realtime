// app/components/cardDefinitions.js
// 既存の import を崩さない互換API（CARD_TYPES / CARD_DEFINITIONS / executeCardEffect / drawRandomCard）

export const RARITY = {
  NORMAL: 'NORMAL',
  RARE: 'RARE',
  SUPERRARE: 'SUPERRARE',
};

export const RARITY_META = {
  [RARITY.NORMAL]: { label: 'N', weight: 70 },
  [RARITY.RARE]: { label: 'R', weight: 25 },
  [RARITY.SUPERRARE]: { label: 'SR', weight: 5 },
};

export const CARD_TYPES = {
  // 既存
  REDUCE_HOLDINGS_SMALL: 'REDUCE_HOLDINGS_SMALL',
  REDUCE_HOLDINGS_MEDIUM: 'REDUCE_HOLDINGS_MEDIUM',
  REDUCE_HOLDINGS_LARGE: 'REDUCE_HOLDINGS_LARGE',
  // 追加（自己効果）
  DRAW_TWO: 'DRAW_TWO',
  GUARD_SHIELD: 'GUARD_SHIELD',
};

// 基本定義：UI用の名前・説明、要ターゲット、クールダウンなど
export const CARD_DEFINITIONS = {
  [CARD_TYPES.REDUCE_HOLDINGS_SMALL]: {
    id: CARD_TYPES.REDUCE_HOLDINGS_SMALL,
    name: 'ホールディング削減・小',
    desc: '対象の保有株を1株減らす（ガードで無効化）',
    rarity: RARITY.NORMAL,
    cost: 0,
    needsTarget: true,
    cooldownMs: 3000,
    effect: { type: 'REDUCE_HOLDINGS', amount: 1 },
    atbCost: 30,
  },
  [CARD_TYPES.REDUCE_HOLDINGS_MEDIUM]: {
    id: CARD_TYPES.REDUCE_HOLDINGS_MEDIUM,
    name: 'ホールディング削減・中',
    desc: '対象の保有株を2株減らす（ガードで無効化）',
    rarity: RARITY.RARE,
    cost: 0,
    needsTarget: true,
    cooldownMs: 5000,
    effect: { type: 'REDUCE_HOLDINGS', amount: 2 },
    atbCost: 50,
  },
  [CARD_TYPES.REDUCE_HOLDINGS_LARGE]: {
    id: CARD_TYPES.REDUCE_HOLDINGS_LARGE,
    name: 'ホールディング削減・大',
    desc: '対象の保有株を3株減らす（ガードで無効化）',
    rarity: RARITY.SUPERRARE,
    cost: 0,
    needsTarget: true,
    cooldownMs: 8000,
    effect: { type: 'REDUCE_HOLDINGS', amount: 3 },
    atbCost: 70,
  },
  [CARD_TYPES.DRAW_TWO]: {
    id: CARD_TYPES.DRAW_TWO,
    name: '追加ドロー',
    desc: 'カードを2枚ドロー（自分専用）',
    rarity: RARITY.RARE,
    cost: 0,
    needsTarget: false,
    cooldownMs: 4000,
    effect: { type: 'DRAW', count: 2 },
  },
  [CARD_TYPES.GUARD_SHIELD]: {
    id: CARD_TYPES.GUARD_SHIELD,
    name: 'ガード',
    desc: '次の被弾を1回だけ無効化（自分専用）',
    rarity: RARITY.NORMAL,
    cost: 0,
    needsTarget: false,
    cooldownMs: 6000,
    effect: { type: 'GUARD', stacks: 1 },
  },
};

// 重み付きランダムドロー（手札補充などに使用）
export function drawRandomCard() {
  const pool = Object.values(CARD_DEFINITIONS);
  // レアリティに応じて重み付け
  const weighted = [];
  for (const c of pool) {
    const w = RARITY_META[c.rarity]?.weight || 1;
    for (let i = 0; i < w; i++) weighted.push(c.id);
  }
  const pick = weighted[Math.floor(Math.random() * weighted.length)];
  return { id: pick };
}

// ガード状態を扱うため各プレイヤーのステートに guards:number を持てるようにする
function ensurePlayerShape(p) {
  return {
    name: p?.name ?? '',
    money: typeof p?.money === 'number' ? p.money : 0,
    holding: typeof p?.holding === 'number' ? p.holding : 0,
    guards: typeof p?.guards === 'number' ? p.guards : 0, // 追加
  };
}

// 実行エンジン（被弾側/自分側どちらでも同じ関数を使える）
// 引数 gameState は { players: { [id]: {name, money, holding, guards?} } }
// 返り値：{ success, needsSync, gameState, drawCount?, log? }
export function executeCardEffect(cardId, gameState, playerId, targetId, opts = {}) {
  const def = CARD_DEFINITIONS[cardId];
  if (!def) return { success: false, needsSync: false, gameState, log: '未定義カード' };
  const type = def.effect?.type;

  // 不変コピー
  const next = { players: { ...gameState.players } };
  const self = ensurePlayerShape(next.players[playerId] || {});
  next.players[playerId] = self;

  let log = '';
  let drawCount = 0;

  // 自分専用カードのターゲットは無視
  const targetRequired = def.needsTarget;
  let victimId = targetRequired ? targetId : playerId;

  if (targetRequired && !victimId) {
    return { success: false, needsSync: false, gameState, log: 'ターゲット未選択' };
  }

  // victim を用意
  const victim = ensurePlayerShape(next.players[victimId] || {});
  next.players[victimId] = victim;

  // ガード適用のヘルパ
  const consumeGuardIfAny = () => {
    if (victim.guards > 0) {
      victim.guards -= 1;
      return true; // ガードで無効化
    }
    return false;
  };

  switch (type) {
    case 'REDUCE_HOLDINGS': {
      // ネガティブ効果：まずガード判定
      if (consumeGuardIfAny()) {
        log = `🛡️ ${victim.name || victimId} のガードが発動し、効果は無効化！`;
        return { success: true, needsSync: true, gameState: next, log };
      }
      const k = Math.max(0, victim.holding - (def.effect.amount ?? 1));
      const diff = k - victim.holding;
      victim.holding = k;
      log = `⚔️ ${self.name || playerId} → ${victim.name || victimId} の保有株を ${Math.abs(diff)} 株削減`;
      return { success: true, needsSync: true, gameState: next, log };
    }

    case 'DRAW': {
      drawCount = def.effect.count ?? 1;
      log = `🃏 ${self.name || playerId} がカードを ${drawCount} 枚ドロー`;
      return { success: true, needsSync: false, gameState: next, drawCount, log };
    }

    case 'GUARD': {
      self.guards += def.effect.stacks ?? 1;
      log = `🛡️ ${self.name || playerId} にガードを付与（残り${self.guards}）`;
      return { success: true, needsSync: true, gameState: next, log };
    }

    default:
      return { success: false, needsSync: false, gameState, log: '未実装の効果' };
  }
}
