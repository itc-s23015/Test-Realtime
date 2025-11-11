"use client";

export default function ResultModal({ open, onClose, results = [], onRetry, onBack }) {
  if (!open) return null;
  const sorted = [...results].sort((a, b) => b.score - a.score);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
      display: "grid", placeItems: "center", zIndex: 1000
    }}>
      <div style={{
        width: 520, maxWidth: "92vw", background: "#fff",
        borderRadius: 16, boxShadow: "0 10px 30px rgba(0,0,0,.2)", padding: 20
      }}>
        <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 6 }}>🏁 結果発表</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>
          スコア = 所持金 + （保有株 × 最終価格）
        </div>

        <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
          {sorted.map((r, i) => (
            <li key={r.id} style={{
              border: "1px solid #e5e7eb", borderRadius: 12, padding: 12,
              background: i === 0 ? "#fffbe6" : "#fff"
            }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{i + 1}位</div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{r.name}</div>
                <div style={{ marginLeft: "auto", fontWeight: 900, fontSize: 18 }}>
                  ¥{r.score.toLocaleString()}
                </div>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                所持金 ¥{r.money.toLocaleString()} / 保有株 {r.holding} 株 / 最終価格 ¥{r.price?.toLocaleString?.() ?? "—"}
              </div>
            </li>
          ))}
        </ol>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={onRetry} style={btnPrimary}>同じルームで再戦</button>
          <button onClick={onBack}  style={btnGhost}>ロビーへ戻る</button>
          <div style={{ marginLeft: "auto" }}>
            <button onClick={onClose} style={btnPlain}>閉じる</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const btnPrimary = {
  padding: "10px 14px", borderRadius: 10, border: "1px solid #111",
  background: "#111", color: "#fff", cursor: "pointer", fontWeight: 800,
};
const btnGhost = {
  padding: "10px 14px", borderRadius: 10, border: "1px solid #ccc",
  background: "#fff", color: "#111", cursor: "pointer", fontWeight: 800,
};
const btnPlain = {
  padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb",
  background: "#fff", color: "#111", cursor: "pointer",
};
