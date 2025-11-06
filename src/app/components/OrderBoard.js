// OrderBoard.js（注文板用コンポーネント）
import { useState } from 'react';

export default function OrderBoard({ orders, onOrderSubmit }) {
  const [orderType, setOrderType] = useState("BUY");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(15000);  // 価格は初期設定

  return (
    <div style={{ padding: "16px", background: "#f9fafb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
      <h3>注文板</h3>
      
      {/* 注文入力フォーム */}
      <div style={{ display: "flex", gap: "10px" }}>
        <select value={orderType} onChange={(e) => setOrderType(e.target.value)}>
          <option value="BUY">買い注文</option>
          <option value="SELL">売り注文</option>
        </select>
        
        <input
          type="number"
          value={qty}
          onChange={(e) => setQty(Math.max(1, e.target.value))}
          style={{ padding: "8px", borderRadius: "8px", border: "1px solid #ccc", background: "#f9fafb" }}
        />
        
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(Math.max(0, e.target.value))}
          style={{ padding: "8px", borderRadius: "8px", border: "1px solid #ccc", background: "#f9fafb" }}
        />
        
        <button
          onClick={() => onOrderSubmit(orderType, qty, price)}
          style={{ padding: "10px 16px", backgroundColor: "#10b981", color: "#fff", borderRadius: "8px", cursor: "pointer" }}
        >
          注文する
        </button>
      </div>

      {/* 注文一覧 */}
      <div style={{ marginTop: "20px", maxHeight: "300px", overflowY: "scroll" }}>
        <h4>現在の注文</h4>
        {orders.length > 0 ? (
          <ul>
            {orders.map(order => (
              <li key={order.id} style={{ padding: "8px", borderBottom: "1px solid #e5e7eb" }}>
                <strong>{order.type}</strong> {order.qty} 株 @ ¥{order.price.toLocaleString()}
                <button
                  onClick={() => removeOrder(order.id)}
                  style={{ marginLeft: "8px", color: "#f44336", cursor: "pointer" }}
                >
                  キャンセル
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>現在注文はありません</p>
        )}
      </div>
    </div>
  );
}
