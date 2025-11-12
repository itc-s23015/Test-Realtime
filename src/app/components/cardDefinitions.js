/**
 * カードの種類を定義
 * distribution版をベースに、ガード・2枚ドロー・ATBコスト機能を追加
 */

export const CARD_TYPES = {
  REDUCE_HOLDINGS_SMALL: 'REDUCE_HOLDINGS_SMALL',
  REDUCE_HOLDINGS_MEDIUM: 'REDUCE_HOLDINGS_MEDIUM',
  REDUCE_HOLDINGS_LARGE: 'REDUCE_HOLDINGS_LARGE',
  DRAW_TWO: 'DRAW_TWO',
  GUARD_SHIELD: 'GUARD_SHIELD',
  INCREASE_HOLDINGS_SMALL: 'INCREASE_HOLDINGS_SMALL',
  INCREASE_HOLDINGS_MEDIUM: 'INCREASE_HOLDINGS_MEDIUM',
  INCREASE_HOLDINGS_LARGE: 'INCREASE_HOLDINGS_LARGE',
};

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

// 基本定義：UI用の名前・説明、要ターゲット、クールダウンなど
export const CARD_DEFINITIONS = {
    [CARD_TYPES.REDUCE_HOLDINGS_SMALL]: {
        id: CARD_TYPES.REDUCE_HOLDINGS_SMALL,
        name: '小ダメージ攻撃(株)',
        description: '相手の保有株を1減らす',
        emoji: '🗡️',
        needsTarget: true,
        color: '#10b981',
        hoverColor: '#059669',
        effectAmount: -1,
        imageSrc: '/image/cards/testCard.png',
        imageAlt: '小ダメージ攻撃(株)カードの画像',
        rarity: RARITY.NORMAL,
        atbCost: 30,
        cooldownMs: 3000,
    },
    [CARD_TYPES.REDUCE_HOLDINGS_MEDIUM]: {
        id: CARD_TYPES.REDUCE_HOLDINGS_MEDIUM,   
        name: '中ダメージ攻撃(株)',
        description: '相手の保有株を3減らす',
        emoji: '⚔️',
        needsTarget: true,
        color: '#3b82f6',
        hoverColor: '#2563eb',
        effectAmount: -3,
        rarity: RARITY.RARE,
        atbCost: 50,
        cooldownMs: 5000,
    },
    [CARD_TYPES.REDUCE_HOLDINGS_LARGE]: {
        id: CARD_TYPES.REDUCE_HOLDINGS_LARGE,
        name: '大ダメージ攻撃(株)',
        description: '相手の保有株を5減らす',
        emoji: '💥',
        needsTarget: true,
        color: '#ef4444',
        hoverColor: '#dc2626',
        effectAmount: -5,
        rarity: RARITY.SUPERRARE,
        atbCost: 70,
        cooldownMs: 8000,
    },
    [CARD_TYPES.DRAW_TWO]: {
      id: CARD_TYPES.DRAW_TWO,
      name: '追加ドロー',
      description: 'カードを2枚ドロー（自分専用）',
      rarity: RARITY.RARE,
      needsTarget: false,
      cooldownMs: 4000,
      effectAmount: 2,
      atbCost: 40,
    },
    [CARD_TYPES.GUARD_SHIELD]: {
      id: CARD_TYPES.GUARD_SHIELD,
      name: 'ガード',
      description: '次の被弾を1回だけ無効化（自分専用）',
      rarity: RARITY.NORMAL,
      needsTarget: false,
      cooldownMs: 6000,
      effectAmount: 1,
      atbCost: 35,
  },
  [CARD_TYPES.INCREASE_HOLDINGS_SMALL]: {
        id: CARD_TYPES.INCREASE_HOLDINGS_SMALL,
        name: '持ち株増加(小)',
        description: '持ち株を1増やす',
        emoji: '🗡️',
        needsTarget: false,
        color: '#10b981',
        hoverColor: '#059669',
        effectAmount: +1,
        imageSrc: '',
        imageAlt: '',
        rarity: RARITY.NORMAL,
        atbCost: 30,
        cooldownMs: 3000,
    },
    [CARD_TYPES.INCREASE_HOLDINGS_MEDIUM]: {
        id: CARD_TYPES.INCREASE_HOLDINGS_MEDIUM,
        name: '持ち株増加(中)',
        description: '持ち株を3増やす',
        emoji: '🗡️',
        needsTarget: false,
       color: '#3b82f6',
        hoverColor: '#2563eb',
        effectAmount: +3,
        imageSrc: '',
        imageAlt: '',
        rarity: RARITY.RARE,
        atbCost: 50,
        cooldownMs: 3000,
    },
    [CARD_TYPES.INCREASE_HOLDINGS_LARGE]: {
        id: CARD_TYPES.INCREASE_HOLDINGS_LARGE,
        name: '持ち株増加(大)',
        description: '持ち株を5増やす',
        emoji: '🗡️',
        needsTarget: false,
        color: '#ef4444',
        hoverColor: '#dc2626',
        effectAmount: +5,
        imageSrc: '',
        imageAlt: '',
        rarity: RARITY.SUPERRARE,
        atbCost: 70,
        cooldownMs: 3000,
    },
};   

// カード情報を配列へ
export const CARD_LIST = Object.values(CARD_DEFINITIONS);

// プレイヤーステートの形状を保証
function ensurePlayerShape(p) {
    return {
        name: p?.name ?? '',
        money: typeof p?.money === 'number' ? p.money : 0,
        holding: typeof p?.holding === 'number' ? p.holding : 0,
        guards: typeof p?.guards === 'number' ? p.guards : 0, // ガードスタック
    };
}

export function executeCardEffect(cardType, gameState, playerId, targetId = null, opts = {}) {
    const card = CARD_DEFINITIONS[cardType];
    if (!card) {
        return {
            success: false,
            message: '無効なカードタイプです。',
            gameState,
            needsSync: false,
            log: '無効なカードタイプ',
        };
    }
    
    // ターゲットチェック
    if (card.needsTarget && !targetId) {
        return {
            success: false,
            message: 'このカードはターゲットが必要です。',
            gameState,
            needsSync: false,
            log: 'ターゲット未選択',
        };
    }

    // 不変コピー
    const newState = { players: { ...gameState.players } };
    const self = ensurePlayerShape(newState.players[playerId] || {});
    newState.players[playerId] = self;

    let log = '';
    let drawCount = 0;

    // ターゲットの決定（自分専用カードは自分がターゲット）
    const victimId = card.needsTarget ? targetId : playerId;
    const victim = ensurePlayerShape(newState.players[victimId] || {});
    newState.players[victimId] = victim;

    // ガード消費ヘルパー（攻撃カードのみ）
    const consumeGuardIfAny = () => {
        if (victim.guards > 0) {
            victim.guards -= 1;
            return true; // ガードで無効化
        }
        return false;
    };

    // カードタイプごとに効果を実行
    switch (cardType) {
        case CARD_TYPES.REDUCE_HOLDINGS_SMALL:
        case CARD_TYPES.REDUCE_HOLDINGS_MEDIUM:
        case CARD_TYPES.REDUCE_HOLDINGS_LARGE:
            // 攻撃系：ガード判定
            if (consumeGuardIfAny()) {
                log = `🛡️ ${victim.name || victimId} のガードが発動し、効果は無効化！`;
                return { 
                    success: true, 
                    needsSync: true, 
                    gameState: newState, 
                    log,
                    message: log,
                };
            }

            // 保有株を減らす
            const prev = Number(victim.holding ?? 0);
            victim.holding = Math.max(0, prev + Number(card.effectAmount ?? 0));
            const actualDamage = prev - victim.holding;
            
            log = `⚔️ ${self.name || playerId} → ${victim.name || victimId} の保有株を ${actualDamage} 株削減`;
            return {
                success: true,
                message: `${card.name} 成功！ ${victim.name}の保有株が${actualDamage}減少しました！`,
                gameState: newState,
                needsSync: true,
                log,
            };

        case CARD_TYPES.INCREASE_HOLDINGS_SMALL:
        case CARD_TYPES.INCREASE_HOLDINGS_MEDIUM:
        case CARD_TYPES.INCREASE_HOLDINGS_LARGE:
            // 保有株を増やす
            const prevHolding = Number(self.holding ?? 0);
            const increaseAmount = Number(card.effectAmount ?? 0);
            self.holding = prevHolding + increaseAmount;
            
            log = `➕ ${self.name || playerId} → ${victim.name || victimId} の保有株を ${actualIncrease} 株増加`;
            return {
                success: true,
                message: `${card.name} 成功！ ${victim.name}の保有株が${actualIncrease}増加しました！`,
                gameState: newState,
                needsSync: true,
                log,
            };

        case CARD_TYPES.DRAW_TWO:
            // 2枚ドロー（自分専用）
            drawCount = card.effectAmount ?? 2;
            log = `🃏 ${self.name || playerId} がカードを ${drawCount} 枚ドロー`;
            return {
                success: true,
                message: `${card.name} 成功！ ${drawCount}枚ドローします`,
                gameState: newState,
                needsSync: false,
                drawCount,
                log,
            };

        case CARD_TYPES.GUARD_SHIELD:
            // ガード付与（自分専用）
            self.guards += card.effectAmount ?? 1;
            log = `🛡️ ${self.name || playerId} にガードを付与（残り${self.guards}）`;
            return {
                success: true,
                message: `${card.name} 成功！ガードを獲得しました`,
                gameState: newState,
                needsSync: true,
                log,
            };

        default:
            return {
                success: false,
                message: 'このカードの効果はまだ実装されていません。',
                gameState,
                needsSync: false,
                log: '未実装カード',
            };
    }
}

// ===================== ランダムドロー（重み付き） =====================

// 再現性が必要な時のシード付き乱数
export function createSeededRng(seed = Date.now()) {
    // Park–Miller (minimal standard)
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// レアリティを重みで1つ選ぶ
function pickRarity(rng = Math.random) {
    const entries = [
        [RARITY.NORMAL, RARITY_META[RARITY.NORMAL].weight],
        [RARITY.RARE, RARITY_META[RARITY.RARE].weight],
        [RARITY.SUPERRARE, RARITY_META[RARITY.SUPERRARE].weight],
    ];
    const total = entries.reduce((a, [, w]) => a + w, 0);
    let r = rng() * total;
    for (const [rarity, w] of entries) {
        r -= w;
        if (r < 0) return rarity;
    }
    return RARITY.NORMAL;
}

// レアリティを決めて、その中から1枚
export function drawRandomCard({ rng } = {}) {
    const random = rng || Math.random;
    const rarity = pickRarity(random);
    const pool = CARD_LIST.filter((c) => c.rarity === rarity);
    const list = pool.length ? pool : CARD_LIST;
    const idx = Math.floor(random() * list.length);
    return list[idx];
}

// n枚ドロー（noDuplicates で同じIDを避ける）
export function drawCards(n = 1, { rng, noDuplicates = false } = {}) {
    const random = rng || Math.random;
    const result = [];
    const seen = new Set();
    for (let i = 0; i < n; i++) {
        let card = drawRandomCard({ rng: random });
        if (noDuplicates) {
            let guard = 0;
            while (seen.has(card.id) && guard++ < 20) {
                card = drawRandomCard({ rng: random });
            }
            seen.add(card.id);
        }
        result.push(card);
    }
    return result;
}

// デッキ生成＆シャッフル
export function buildDeck({ size = 40, rng } = {}) {
    const random = rng || Math.random;
    const deck = [];
    for (let i = 0; i < size; i++) deck.push(drawRandomCard({ rng: random }));
    return shuffle(deck, random);
}

export function shuffle(arr, rng = Math.random) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}