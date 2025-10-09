"use client";
import React from "react";

const HoverableButton = ({ text, amount, bg, bgHover, onChange }) => {
    const baseStyle = {
        padding: "16px 32px",
        fontSize: "18px",
        fontWeight: "bold",
        cursor: "pointer",
        backgroundColor: bg,
        color: "white",
        border: "none",
        borderRadius: "8px",
        transition: "all 0.2s",
    };

    return (
        <button
            onClick={() => onChange(amount)}
            style={baseStyle}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = bgHover)}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = bg)}
        >
            {text}
        </button>
    );
};

export default function StockControls({ onChange }) {
    return (
        <div
            style={{
                backgroundColor: "white",
                borderRadius: "12px",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                padding: "24px",
            }}
        >
            <h2 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: "bold" }}>
                株価を変動させる
            </h2>

            <div
                style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}
            >
                <HoverableButton
                    text="+500円 📈"
                    amount={500}
                    bg="#10b981"
                    bgHover="#059669"
                    onChange={onChange}
                />
                <HoverableButton
                    text="+1000円 🚀"
                    amount={1000}
                    bg="#3b82f6"
                    bgHover="#2563eb"
                    onChange={onChange}
                />
                <HoverableButton
                    text="-500円 📉"
                    amount={-500}
                    bg="#f59e0b"
                    bgHover="#d97706"
                    onChange={onChange}
                />
                <HoverableButton
                    text="-1000円 💥"
                    amount={-1000}
                    bg="#ef4444"
                    bgHover="#dc2626"
                    onChange={onChange}
                />
            </div>

            <p style={{ marginTop: "16px", textAlign: "center", color: "#6b7280", fontSize: "14px" }}>
                ボタンをクリックすると、両方の画面で株価が変動します
            </p>
        </div>
    );
}
