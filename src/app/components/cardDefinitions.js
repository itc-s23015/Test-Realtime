/**
 * カードの種類を定義
 * distribution版をベースに、ガード・2枚ドロー・ATBコスト機能を追加
 */

export const CARD_TYPES = {
  REDUCE_HOLDINGS_SMALL: 'REDUCE_HOLDINGS_SMALL',
  REDUCE_HOLDINGS_MEDIUM: 'REDUCE_HOLDINGS_MEDIUM',
  REDUCE_HOLDINGS_LARGE: 'REDUCE_HOLDINGS_LARGE',

  DRAW_TWO: 'DRAW_TWO',
  REMOVE_TWO: 'REMOVE_TWO',

  INCREASE_HOLDINGS_SMALL: 'INCREASE_HOLDINGS_SMALL',
  INCREASE_HOLDINGS_MEDIUM: 'INCREASE_HOLDINGS_MEDIUM',
  INCREASE_HOLDINGS_LARGE: 'INCREASE_HOLDINGS_LARGE',

  INCREASE_MONEY_SMALL: 'INCREASE_MONEY_SMALL',
  INCREASE_MONEY_MEDIUM: 'INCREASE_MONEY_MEDIUM',
  INCREASE_MONEY_LARGE: 'INCREASE_MONEY_LARGE',

  REDUCE_MONEY_SMALL: 'REDUCE_MONEY_SMALL',
  REDUCE_MONEY_MEDIUM: 'REDUCE_MONEY_MEDIUM',
  REDUCE_MONEY_LARGE: 'REDUCE_MONEY_LARGE',

  CHART_RISE: 'CHART_RISE',
  CHART_FALL: 'CHART_FALL',
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
        // imageSrc: '/image/cards/testCard.png',
        // imageAlt: '小ダメージ攻撃(株)カードの画像',
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
      emoji: '🎴',
      rarity: RARITY.RARE,
      needsTarget: false,
      cooldownMs: 4000,
      effectAmount: 2,
      atbCost: 40,
    },
  [CARD_TYPES.INCREASE_HOLDINGS_SMALL]: {
        id: CARD_TYPES.INCREASE_HOLDINGS_SMALL,
        name: '持ち株増加(小)',
        description: '持ち株を1増やす',
        emoji: '📈',
        needsTarget: false,
        color: '#10b981',
        hoverColor: '#059669',
        effectAmount: 1,
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
        emoji: '📊',
        needsTarget: false,
        color: '#3b82f6',
        hoverColor: '#2563eb',
        effectAmount: 3,
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
        emoji: '💹',
        needsTarget: false,
        color: '#ef4444',
        hoverColor: '#dc2626',
        effectAmount: 5,
        imageSrc: '',
        imageAlt: '',
        rarity: RARITY.SUPERRARE,
        atbCost: 70,
        cooldownMs: 3000,
    },
    [CARD_TYPES.REMOVE_TWO]: {
  id: CARD_TYPES.REMOVE_TWO,
  name: '2枚削除',
  description: '相手の手札を2枚ランダムに削除する',
  emoji: '🗑️',
  rarity: RARITY.RARE,
  needsTarget: true,
  effectAmount: 2,         // 削除枚数
  atbCost: 45,             // DRAW_TWO より少し重い
  cooldownMs: 5000,        // 少し重めでバランス調整
},

     [CARD_TYPES.INCREASE_MONEY_SMALL]: {
        id: CARD_TYPES.INCREASE_MONEY_SMALL,
        name: '資金増加(小)',
        description: '資金を10000増やす',
        emoji: '💰',
        needsTarget: false,
        effectAmount: 10000,
        rarity: RARITY.NORMAL,
        atbCost: 25,
        cooldownMs: 2000,
    },
    [CARD_TYPES.INCREASE_MONEY_MEDIUM]: {
        id: CARD_TYPES.INCREASE_MONEY_MEDIUM,
        name: '資金増加(中)',
        description: '資金を30000増やす',
        emoji: '🤑',
        needsTarget: false,
        effectAmount: 30000,
        rarity: RARITY.RARE,
        atbCost: 45,
        cooldownMs: 4000,
    },
    [CARD_TYPES.INCREASE_MONEY_LARGE]: {
        id: CARD_TYPES.INCREASE_MONEY_LARGE,
        name: '資金増加(大)',
        description: '資金を50000増やす',
        emoji: '💵',
        needsTarget: false,
        effectAmount: 50000,
        rarity: RARITY.SUPERRARE,
        atbCost: 65,
        cooldownMs: 6000,
    },
        [CARD_TYPES.CHART_RISE]: {
      id: CARD_TYPES.CHART_RISE,
      name: 'チャート上昇',
      description: '市場全体の株価が上昇する',
      emoji: '📈',
      needsTarget: false,
      effectAmount: 1000,
      rarity: RARITY.RARE,
      atbCost: 60,
      cooldownMs: 7000,
      affectsChart: true,
    },
        [CARD_TYPES.REDUCE_MONEY_SMALL]: {
        id: CARD_TYPES.REDUCE_MONEY_SMALL,
        name: '資金減少(小)',
        description: '相手の資金を10000減らす',
        emoji: '🪓',
        needsTarget: true,
        effectAmount: -10000,
        rarity: RARITY.NORMAL,
        atbCost: 30,
        cooldownMs: 3000,
    },
    [CARD_TYPES.REDUCE_MONEY_MEDIUM]: {
        id: CARD_TYPES.REDUCE_MONEY_MEDIUM,
        name: '資金減少(中)',
        description: '相手の資金を30000減らす',
        emoji: '🔨',
        needsTarget: true,
        effectAmount: -30000,
        rarity: RARITY.RARE,
        atbCost: 50,
        cooldownMs: 5000,
    },
    [CARD_TYPES.REDUCE_MONEY_LARGE]: {
        id: CARD_TYPES.REDUCE_MONEY_LARGE,
        name: '資金減少(大)',
        description: '相手の資金を50000減らす',
        emoji: '💣',
        needsTarget: true,
        effectAmount: -50000,
        rarity: RARITY.SUPERRARE,
        atbCost: 70,
        cooldownMs: 8000,
    },
    [CARD_TYPES.CHART_FALL]: {
      id: CARD_TYPES.CHART_FALL,
      name: 'チャート下降',
      description: '市場全体の株価が下降する',
      emoji: '📉',
      needsTarget: false,
      effectAmount: -1000,
      rarity: RARITY.RARE,
      atbCost: 60,
      cooldownMs: 7000,
      affectsChart: true,
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

    // 🔥 修正: ディープコピーで不変性を保証
    const newState = { 
        players: Object.fromEntries(
            Object.entries(gameState.players).map(([id, data]) => [
                id,
                { ...data }
            ])
        )
    };

    // 自分の情報を取得・初期化
    if (!newState.players[playerId]) {
        newState.players[playerId] = ensurePlayerShape({});
    }
    const self = newState.players[playerId];

    let log = '';
    let drawCount = 0;
    let chartChange = 0;

    // ターゲットの決定
    const victimId = card.needsTarget ? targetId : playerId;
    
    // 🔥 修正: victimも必ず初期化
    if (!newState.players[victimId]) {
        newState.players[victimId] = ensurePlayerShape({});
    }
    const victim = newState.players[victimId];

    // カードタイプごとに効果を実行
    switch (cardType) {
        case CARD_TYPES.REDUCE_HOLDINGS_SMALL:
        case CARD_TYPES.REDUCE_HOLDINGS_MEDIUM:
        case CARD_TYPES.REDUCE_HOLDINGS_LARGE:

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
            // 🔥 修正: 自分の保有株を増やす
            const prevHolding = Number(self.holding ?? 0);
            const increaseAmount = Number(card.effectAmount ?? 0);
            self.holding = prevHolding + increaseAmount;
            
            console.log(`📊 INCREASE実行: ${prevHolding} + ${increaseAmount} = ${self.holding}`);
            
            log = `📈 ${self.name || playerId} の保有株を ${increaseAmount} 株増加`;
            return {
                success: true,
                message: `${card.name} 成功！ 保有株が${increaseAmount}増加しました！`,
                gameState: newState,
                needsSync: true,
                log,
            };

        case CARD_TYPES.INCREASE_MONEY_SMALL:
        case CARD_TYPES.INCREASE_MONEY_MEDIUM:
        case CARD_TYPES.INCREASE_MONEY_LARGE:
            // 🔥 修正: 自分の資金を増やす
            const prevMoney = Number(self.money ?? 0);
            const moneyIncrease = Number(card.effectAmount ?? 0);
            self.money = prevMoney + moneyIncrease;
            
            console.log(`💰 INCREASE_MONEY実行: ${prevMoney} + ${moneyIncrease} = ${self.money}`);
            
            log = `💰 ${self.name || playerId} の資金を ${moneyIncrease} 増加`;
            return {
                success: true,
                message: `${card.name} 成功！ 資金が${moneyIncrease}増加しました！`,
                gameState: newState,
                needsSync: true,
                log,
            };
            
        case CARD_TYPES.REDUCE_MONEY_SMALL:
        case CARD_TYPES.REDUCE_MONEY_MEDIUM:
        case CARD_TYPES.REDUCE_MONEY_LARGE:
            // 資金を減らす
            const prevVictimMoney = Number(victim.money ?? 0);
            const moneyDecrease = Number(card.effectAmount ?? 0);
            victim.money = Math.max(0, prevVictimMoney + moneyDecrease);
            const actualMoneyDecrease = prevVictimMoney - victim.money;
            
            log = `🪓 ${self.name || playerId} → ${victim.name || victimId} の資金を ${actualMoneyDecrease} 減少`;
            return {
                success: true,
                message: `${card.name} 成功！ ${victim.name}の資金が${actualMoneyDecrease}減少しました！`,
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

        case CARD_TYPES.CHART_RISE:
            // 市場全体の株価上昇
            chartChange = card.effectAmount ?? 1000;
            log = `📈 市場全体の株価が上昇！`;
            return {
                success: true,
                message: `${card.name} 成功！ 市場全体の株価が上昇しました！`,
                gameState: newState,
                needsSync: false,
                chartChange,
                log,
            };


        case CARD_TYPES.CHART_FALL:
            // 市場全体の株価下降
            chartChange = card.effectAmount ?? -1000;
            log = `📉 市場全体の株価が下降！`;
            return {
                success: true,
                message: `${card.name} 成功！ 市場全体の株価が下降しました！`,
                gameState: newState,
                needsSync: false,
                chartChange,
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

export function createSeededRng(seed = Date.now()) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

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

export function drawRandomCard({ rng } = {}) {
    const random = rng || Math.random;
    const rarity = pickRarity(random);
    const pool = CARD_LIST.filter((c) => c.rarity === rarity);
    const list = pool.length ? pool : CARD_LIST;
    const idx = Math.floor(random() * list.length);
    return list[idx];
}

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