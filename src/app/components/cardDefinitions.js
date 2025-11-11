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