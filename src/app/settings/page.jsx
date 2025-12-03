"use client";

import ThemeToggle from "../components/ThemeToggle";

export default function SettingsPage() {
  return (
    <main className="pageContainer">
      
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <ThemeToggle />
      </div>

      <h1 className="pageTitle">設定 / Settings</h1>

      <p className="text">テーマ切り替えや、将来追加する設定を管理できます。</p>

    </main>
  );
}
