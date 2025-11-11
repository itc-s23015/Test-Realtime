"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

const StockChart = ({ stockData }) => {
    const canvasRef = useRef(null);
    const [hoveredPoint, setHoveredPoint] = useState(null);

    // 🔧 修正: 描画パラメータをメモ化
    const chartParams = useMemo(() => {
        if (!stockData.length) return null;

        const prices = stockData.map(d => d.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;

        return {
            prices,
            minPrice,
            maxPrice,
            priceRange,
            dataLength: stockData.length,
        };
    }, [stockData]);

    // 🔧 修正: チャート本体の描画（stockData変更時のみ）
    const drawChart = useCallback(() => {
        if (!stockData.length || !canvasRef.current || !chartParams) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;
        const padding = { top: 40, right: 80, bottom: 60, left: 60 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // 背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        const { minPrice, maxPrice, priceRange } = chartParams;

        // グリッド線
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;

        for (let i = 0; i <= 5; i++) {
            const y = padding.top + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartWidth, y);
            ctx.stroke();

            const price = maxPrice - (priceRange / 5) * i;
            ctx.fillStyle = '#6b7280';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`¥${price.toLocaleString()}`, padding.left - 10, y + 4);
        }

        // X軸の日付ラベル
        const dateInterval = Math.floor(stockData.length / 6);
        for (let i = 0; i < stockData.length; i += dateInterval) {
            const x = padding.left + (chartWidth / (stockData.length - 1)) * i;
            const date = new Date(stockData[i].date);
            const label = `${date.getMonth() + 1}/${date.getDate()}`;

            ctx.fillStyle = '#6b7280';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(label, x, height - padding.bottom + 20);
        }

        // 株価ライン
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();

        stockData.forEach((point, i) => {
            const x = padding.left + (chartWidth / (stockData.length - 1)) * i;
            const y = padding.top + chartHeight - ((point.price - minPrice) / priceRange) * chartHeight;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // グラデーション
        const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();

        stockData.forEach((point, i) => {
            const x = padding.left + (chartWidth / (stockData.length - 1)) * i;
            const y = padding.top + chartHeight - ((point.price - minPrice) / priceRange) * chartHeight;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
        ctx.lineTo(padding.left, padding.top + chartHeight);
        ctx.closePath();
        ctx.fill();

        // タイトル
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('株価チャート', padding.left, 25);

        // hoveredPoint は別途描画するため、ここでは保存
        canvas.dataset.chartDrawn = 'true';
    }, [stockData, chartParams]);

    // 🔧 修正: ツールチップの描画（hoveredPoint変更時のみ）
    const drawTooltip = useCallback(() => {
        if (!canvasRef.current || hoveredPoint === null || !stockData.length || !chartParams) return;
        
        // 最初にチャートが描画されていない場合はスキップ
        if (canvasRef.current.dataset.chartDrawn !== 'true') return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        const width = rect.width;
        const height = rect.height;
        const padding = { top: 40, right: 80, bottom: 60, left: 60 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        const { minPrice, priceRange } = chartParams;

        // 既存のチャートを再描画（ツールチップをクリア）
        drawChart();

        const point = stockData[hoveredPoint];
        const x = padding.left + (chartWidth / (stockData.length - 1)) * hoveredPoint;
        const y = padding.top + chartHeight - ((point.price - minPrice) / priceRange) * chartHeight;

        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        const tooltipWidth = 160;
        const tooltipHeight = 70;
        const tooltipX = x > width - tooltipWidth - 20 ? x - tooltipWidth - 10 : x + 10;
        const tooltipY = y - tooltipHeight / 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`¥${point.price.toLocaleString()}`, tooltipX + 10, tooltipY + 25);

        ctx.font = '12px sans-serif';
        ctx.fillText(point.date, tooltipX + 10, tooltipY + 45);
        ctx.fillText(`出来高: ${(point.volume / 1000000).toFixed(1)}M`, tooltipX + 10, tooltipY + 62);
    }, [hoveredPoint, stockData, chartParams, drawChart]);

    // 🔧 修正: チャート本体の描画（stockData変更時）
    useEffect(() => {
        drawChart();
    }, [drawChart]);

    // 🔧 修正: ツールチップの描画（hoveredPoint変更時）
    useEffect(() => {
        if (hoveredPoint !== null) {
            // requestAnimationFrame で描画を最適化
            requestAnimationFrame(drawTooltip);
        }
    }, [hoveredPoint, drawTooltip]);

    const handleMouseMove = useCallback((e) => {
        if (!canvasRef.current || !stockData.length) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const padding = { left: 60, right: 80 };
        const chartWidth = rect.width - padding.left - padding.right;

        if (x < padding.left || x > rect.width - padding.right) {
            setHoveredPoint(null);
            return;
        }

        const index = Math.round(((x - padding.left) / chartWidth) * (stockData.length - 1));
        setHoveredPoint(Math.max(0, Math.min(stockData.length - 1, index)));
    }, [stockData]);

    const handleMouseLeave = useCallback(() => {
        setHoveredPoint(null);
        // ツールチップをクリアするため再描画
        drawChart();
    }, [drawChart]);

    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            padding: '24px',
            marginBottom: '24px'
        }}>
            <canvas
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{
                    width: '100%',
                    height: '400px',
                    cursor: 'crosshair',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                }}
            />
            <div style={{
                marginTop: '16px',
                display: 'flex',
                gap: '16px',
                fontSize: '14px',
                color: '#6b7280',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: '#3b82f6',
                        borderRadius: '50%'
                    }}></div>
                    <span>株価推移</span>
                </div>
                <div style={{ marginLeft: 'auto', fontWeight: 'bold', fontSize: '16px', color: '#111827' }}>
                    最新価格: ¥{stockData[stockData.length - 1]?.price?.toLocaleString() || "読込中..."}
                </div>
            </div>
        </div>
    );
}
export default StockChart;