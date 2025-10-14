"use client";

export default function PlayerInfo({ money = 0, roomNumber = "" }) {
    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            padding: '24px',
            marginBottom: '24px'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px'
            }}>
                <div>
                    <div style={{
                        fontSize: '14px',
                        color: '#6b7280',
                        marginBottom: '8px'
                    }}>
                        ルーム番号
                    </div>
                    <div style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: '#111827'
                    }}>
                        {roomNumber}
                    </div>
                </div>
                
                <div style={{
                    textAlign: 'right'
                }}>
                    <div style={{
                        fontSize: '14px',
                        color: '#6b7280',
                        marginBottom: '8px'
                    }}>
                        所持金
                    </div>
                    <div style={{
                        fontSize: '32px',
                        fontWeight: 'bold',
                        color: '#10b981'
                    }}>
                        ¥{(money || 0).toLocaleString()}
                    </div>
                </div>
            </div>
            
            <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#f0fdf4',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <span style={{ fontSize: '20px' }}>🤖</span>
                <span style={{
                    fontSize: '14px',
                    color: '#059669'
                }}>
                    自動変動中（2秒ごと）
                </span>
            </div>
        </div>
    );
}