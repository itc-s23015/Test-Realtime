"use client";
import { useTheme } from "../theme-provider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      style={{
        padding: "6px 10px",
        borderRadius: 8,
        border: "1px solid var(--panel-border)",
        background: "var(--panel-bg)",
        color: "var(--text)",
        cursor: "pointer"
      }}
    >
      {theme === "light" ? "🌙 ダーク" : "🌞 ライト"}
    </button>
  );
}
