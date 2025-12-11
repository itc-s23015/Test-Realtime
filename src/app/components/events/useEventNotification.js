// src/app/components/events/useEventNotification.js
"use client";
import { useState, useCallback } from 'react';

/**
 * イベント通知を管理するカスタムフック
 */
export default function useEventNotification() {
  const [notification, setNotification] = useState(null);

  const showNotification = useCallback((message, icon, type, duration = 3000) => {
    setNotification({ message, icon, type, duration });
  }, []);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return {
    notification,
    showNotification,
    clearNotification,
  };
}

/**
 * イベントIDに応じた通知設定を取得
 */
export function getEventNotificationConfig(eventId) {
  const configs = {
    CLEAR_HAND: {
      icon: '🧹',
      type: 'clear',
      message: 'カード全削除！\n手札が消えました',
    },
    PRICE_SPIKE: {
      icon: '🚀',
      type: 'spike',
      message: '株価大暴騰！\n今が売り時かも！？',
    },
    PRICE_CRASH: {
      icon: '💥',
      type: 'crash',
      message: '株価大暴落！\n大ピンチ！',
    },
    FORCE_SELL: {
      icon: '📤',
      type: 'sell',
      message: '強制売却！\n全株が売却されました',
    },
    FORCED_BUY_ALL_IN: {
      icon: '💸',
      type: 'buy',
      message: '強制買い！\n全財産で購入',
    },
    SET_HOLDING: {
      icon: '📦',
      type: 'default',
      message: '保有株変更！\n株数が10株になりました',
    },
    SET_MONEY: {
      icon: '💴',
      type: 'money',
      message: '所持金リセット！\n資金が変更されました',
    },
  };

  return configs[eventId] || {
    icon: '⚡',
    type: 'default',
    message: 'イベント発生！',
  };
}