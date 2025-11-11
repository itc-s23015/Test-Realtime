"use client";

import { useState, ReactNode } from "react";

type Props = {
  left?: ReactNode;
  right?: ReactNode;
  children: ReactNode; // 中央のゲーム画面
  leftWidth?: number;  // 任意: 左幅
  rightWidth?: number; // 任意: 右幅
};

export default function SidebarFrame({
  left,
  right,
  children,
  leftWidth = 240,
  rightWidth = 280,
}: Props) {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  return (
    <div style={wrap}>
      {/* Left */}
      <aside style={{ ...sideBase, width: leftOpen ? leftWidth : 56 }}>
        <button onClick={() => setLeftOpen((v) => !v)} style={{ ...toggleBtn, left: 8 }}>
          {leftOpen ? "⟨" : "⟩"}
        </button>
        <div style={{ display: leftOpen ? "block" : "none" }}>
          {left ?? <Placeholder title="Left Sidebar" />}
        </div>
      </aside>

      {/* Center */}
      <main style={center}>
        {children}
      </main>

      {/* Right */}
      <aside style={{ ...sideBase, width: rightOpen ? rightWidth : 56 }}>
        <button onClick={() => setRightOpen((v) => !v)} style={{ ...toggleBtn, right: 8 }}>
          {rightOpen ? "⟩" : "⟨"}
        </button>
        <div style={{ display: rightOpen ? "block" : "none" }}>
          {right ?? <Placeholder title="Right Sidebar" />}
        </div>
      </aside>
    </div>
  );
}

/* --- 小さなプレースホルダ --- */
function Placeholder({ title }: { title: string }) {
  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
        <li>項目 A</li>
        <li>項目 B</li>
        <li>項目 C</li>
      </ul>
    </div>
  );
}

/* --- styles --- */
const wrap: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  gap: 12,
  width: "100%",
  minHeight: "100vh",
  padding: 12,
  background: "linear-gradient(135deg,#f8fafc 0%,#eef2ff 100%)",
};

const sideBase: React.CSSProperties = {
  position: "relative",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  boxShadow: "0 6px 18px rgba(2,6,23,0.06)",
  overflow: "hidden",
};

const center: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  boxShadow: "0 6px 18px rgba(2,6,23,0.06)",
  padding: 16,
  minHeight: 520,
};

const toggleBtn: React.CSSProperties = {
  position: "absolute",
  top: 8,
  zIndex: 1,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid #cbd5e1",
  background: "#fff",
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(2,6,23,.08)",
};
