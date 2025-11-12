/**
 * カードの種類を定義
 * 今後カードを追加する場合はここで追加してください
 * CARD_DEFINITIONS にカード詳細を追加（rarity必須）
 * executeCardEffect() に効果処理を追加
 * 必要に応じて専用の実行関数を作成
 */

export const CARD_TYPES = {
    REDUCE_HOLDINGS_SMALL: 'REDUCE_HOLDINGS_SMALL',
    REDUCE_HOLDINGS_MEDIUM: 'REDUCE_HOLDINGS_MEDIUM',
    REDUCE_HOLDINGS_LARGE: 'REDUCE_HOLDINGS_LARGE',
};

// レアリティ3段階
export const RARITY = {
    NORMAL: 'NORMAL',
    RARE: 'RARE',
    SUPERRARE: 'SUPERRARE',
};

export const RARITY_META = {
    [RARITY.NORMAL]: { label: 'N', weight: 70, backgroudColor: '#6b7280' },
    [RARITY.RARE]: { label: 'R', weight: 25, backgroudColor: '#3b82f6' },
    [RARITY.SUPERRARE]: { label: 'SR', weight: 5, backgroudColor: '#f59e0b' },
};


/**
 * カードのマスターデータ
 * 
 * 各カードの定義フォーマット:
 * {
 *   id: string,           // CARD_TYPES の値
 *   name: string,         // カード名（表示用）
 *   description: string,  // 効果説明
 *   emoji: string,        // 絵文字アイコン
 *   cost: number,         // 使用コスト（将来実装用）
 *   needsTarget: boolean, // ターゲット選択が必要か
 *   color: string,        // カードの背景色
 *   hoverColor: string,   // ホバー時の色
 *   effectAmount: number, // 効果量（攻撃力など）
 *   rarity: RARITY        // ★3段階レアリティ（必須）
 * }
 */

export const CARD_DEFINITIONS = {
    [CARD_TYPES.REDUCE_HOLDINGS_SMALL]: {
        id: CARD_TYPES.REDUCE_HOLDINGS_SMALL,
        name: '小ダメージ攻撃(株)',
        description: '相手の保有株を1減らす',
        emoji: '🗡️',
        cost: 0,
        needsTarget: true,
        color: '#10b981',
        hoverColor: '#059669',
        effectAmount: -1,
        imageSrc: '/image/cards/testCard.png',
        imageAlt: '小ダメージ攻撃(株)カードの画像',
        rarity: RARITY.NORMAL,
    },
    [CARD_TYPES.REDUCE_HOLDINGS_MEDIUM]: {
        id: CARD_TYPES.REDUCE_HOLDINGS_MEDIUM,   
        name: '中ダメージ攻撃(株)',
        description: '相手の保有株を3減らす',
        emoji: '⚔️',
        cost: 0,
        needsTarget: true,
        color: '#3b82f6',
        hoverColor: '#2563eb',
        effectAmount: -3,
        rarity: RARITY.RARE,
    },
    [CARD_TYPES.REDUCE_HOLDINGS_LARGE]: {
        id: CARD_TYPES.REDUCE_HOLDINGS_LARGE,
        name: '大ダメージ攻撃(株)',
        description: '相手の保有株を5減らす',
        emoji: '💥',
        cost: 0,
        needsTarget: true,
        color: '#ef4444',
        hoverColor: '#dc2626',
        effectAmount: -5,
        rarity: RARITY.SUPERRARE,
    },
};   

// カード情報を配列へ
export const CARD_LIST = Object.values(CARD_DEFINITIONS);

// カード効果を実行する関数
export function executeCardEffect(cardType, gameState, playerId, targetId = null) {
    const card = CARD_DEFINITIONS[cardType];
    if (!card) {
        return {
            success: false,
            message: '無効なカードタイプです。',
            gameState
        };
    }
    
    // ターゲットチェック
    if (card.needsTarget && !targetId) {
        return {
            success: false,
            message: 'このカードはターゲットが必要です。',
            gameState
        };
    }

    // カードタイプごとに振り分け
    // 攻撃タイプ`
    switch (cardType) {
        case CARD_TYPES.REDUCE_HOLDINGS_SMALL:
        case CARD_TYPES.REDUCE_HOLDINGS_MEDIUM:
        case CARD_TYPES.REDUCE_HOLDINGS_LARGE:
            return executeReduceHoldingsCard(card, gameState, playerId, targetId);

    // 新しいタイプのカードを追加する場合はここに記入
        default:
            return {
                success: false,
                message: 'このカードの効果はまだ実装されていません。',
                gameState
            };
    }
}

function executeReduceHoldingsCard(card, gameState, playerId, targetId) {
    const newState = { ...gameState };
    const target = newState.players[targetId];

    if (!target) {
        return {
            success: false,
            message: 'ターゲットが見つかりません。',
            gameState
        };
    }

    // 保有株を減らす
    const prev = Number(target.holding ?? 0);
    target.holding = Math.max(0, prev + Number(card.effectAmount ?? 0));
    const actualDamage = prev - target.holding;
    
    return {
        success: true,
        message: `${card.name}success! ${target.name}の保有株が${actualDamage}減少しました！`,
        gameState: newState,
        needsSync: true
    };
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