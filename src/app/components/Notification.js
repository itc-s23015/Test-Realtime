"use client";

import { useState, useEffect } from 'react';

export default function Notification({ message, type = 'info', duration = 3000 }) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration]);

    if (!visible) return null;

    const colors = {
        info: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
        success: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
        warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
        danger: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
    };

    const color = colors[type] || colors.info;

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: color.bg,
            border: `2px solid ${color.border}`,
            borderRadius: '8px',
            padding: '16px 24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
            minWidth: '300px',
            animation: 'slideIn 0.3s ease-out'
        }}>
            <p style={{
                margin: 0,
                color: color.text,
                fontWeight: 'bold',
                fontSize: '14px'
            }}>
                {message}
            </p>
        </div>
    );
}