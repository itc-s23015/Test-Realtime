"use client";

import React, { useState, useEffect } from "react";

// 板注文のコンポーネント
function OrderBoard({ stockData, onOrderAdded }) {
  const [buyPrice, setBuyPrice] = useState("");
  const [buyQty, setBuyQty] = useState(1);
  const [sellPrice, setSellPrice] = useState("");
  const [sellQty, setSellQty] = useState(1);

  const [buyOrders, setBuyOrders] = useState([]);
  const [sellOrders, setSellOrders] = useState([]);

  // 注文を追加する処理
  const addBuyOrder = () => {
    if (!buyPrice || !buyQty) return;
    const order = { price: parseInt(buyPrice), qty: buyQty, type: "buy" };
    setBuyOrders((prevOrders) => [...prevOrders, order].sort((a, b) => b.price - a.price));
    setBuyPrice("");
    setBuyQty(1);
    onOrderAdded("buy", order);
  };

  const addSellOrder = () => {
    if (!sellPrice || !sellQty) return;
    const order = { price: parseInt(sellPrice), qty: sellQty, type: "sell" };
    setSellOrders((prevOrders) => [...prevOrders, order].sort((a, b) => a.price - b.price));
    setSellPrice("");
    setSellQty(1);
    onOrderAdded("sell", order);
  };

  return (
    <div style={{ padding: "16px", maxWidth: "300px", background: "#fff", borderRadius: "8px" }}>
      <h3>板注文</h3>

      {/* 購入注文 */}
      <div style={{ marginBottom: "16px" }}>
        <h4>買い注文</h4>
        <input
          type="number"
          placeholder="価格"
          value={buyPrice}
          onChange={(e) => setBuyPrice(e.target.value)}
          style={{ padding: "8px", marginBottom: "8px", width: "100%" }}
        />
        <input
          type="number"
          placeholder="数量"
          value={buyQty}
          onChange={(e) => setBuyQty(e.target.value)}
          style={{ padding: "8px", marginBottom: "8px", width: "100%" }}
        />
        <button onClick={addBuyOrder} style={btnGreen}>注文</button>
      </div>

      {/* 売却注文 */}
      <div style={{ marginBottom: "16px" }}>
        <h4>売り注文</h4>
        <input
          type="number"
          placeholder="価格"
          value={sellPrice}
          onChange={(e) => setSellPrice(e.target.value)}
          style={{ padding: "8px", marginBottom: "8px", width: "100%" }}
        />
        <input
          type="number"
          placeholder="数量"
          value={sellQty}
          onChange={(e) => setSellQty(e.target.value)}
          style={{ padding: "8px", marginBottom: "8px", width: "100%" }}
        />
        <button onClick={addSellOrder} style={btnRed}>注文</button>
      </div>

      {/* 注文リスト */}
      <div>
        <h4>買い注文</h4>
        <ul style={{ padding: 0 }}>
          {buyOrders.map((order, index) => (
            <li key={index}>
              {order.price}円 x {order.qty}株
            </li>
          ))}
        </ul>
        <h4>売り注文</h4>
        <ul style={{ padding: 0 }}>
          {sellOrders.map((order, index) => (
            <li key={index}>
              {order.price}円 x {order.qty}株
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// 価格注文を受けて実行する関数
function OrderBoardWrapper({ stockData, onOrderAdded }) {
  return (
    <SideBar
      side="left"
      open={true}
      onToggle={() => {}}
      width="300px"
      title="板注文"
    >
      <OrderBoard stockData={stockData} onOrderAdded={onOrderAdded} />
    </SideBar>
  );
}

export default function Game() {
  const router = useRouter();

  // サイドバー開閉
  const [leftOpen, setLeftOpen] = useState(false);

  // 価格更新イベント
  const onOrderAdded = (type, order) => {
    console.log(`New order added: ${type} ${order.price} x ${order.qty}`);
  };

  return (
    <div style={{ width: "100%", minHeight: "100vh", backgroundColor: "#f5f7fb" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* ゲーム画面 */}
        <h1>株価ゲーム</h1>

        <OrderBoardWrapper stockData={[]} onOrderAdded={onOrderAdded} />
      </div>
    </div>
  );
}

// ボタンスタイル
const btnGreen = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #16a34a",
  background: "#16a34a",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const btnRed = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #ef4444",
  background: "#ef4444",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};
