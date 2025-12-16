"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

const StockChart = ({ stockData }) => {
    const canvasRef = useRef(null);
    const overlayCanvasRef = useRef(null);
    const [hoveredPoint, setHoveredPoint] = useState(null);

    // 描画パラメータをメモ化
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

    // チャート本体の描画（ベースレイヤー - stockData変更時のみ）
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



        // 株価ライン
        // ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        // ctx.beginPath();

        for (let i = 1; i < stockData.length; i++) {
            const prev = stockData[i - 1];
            const curr = stockData[i];

            const x1 = padding.left + (chartWidth / (stockData.length - 1)) * (i - 1);
            const y1 = padding.top + chartHeight - ((prev.price - minPrice) / priceRange) * chartHeight;

            const x2 = padding.left + (chartWidth / (stockData.length - 1)) * i;
            const y2 = padding.top + chartHeight - ((curr.price - minPrice) / priceRange) * chartHeight;

            const isUp = curr.price >= prev.price;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = isUp ? '#10b981' : '#ef4444'; // 緑 or 赤
            ctx.stroke();
        }

        // stockData.forEach((point, i) => {
        //     const x = padding.left + (chartWidth / (stockData.length - 1)) * i;
        //     const y = padding.top + chartHeight - ((point.price - minPrice) / priceRange) * chartHeight;

        //     if (i === 0) {
        //         ctx.moveTo(x, y);
        //     } else {
        //         ctx.lineTo(x, y);
        //     }
        // });
        // ctx.stroke();

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
    }, [stockData, chartParams]);

    // オーバーレイレイヤーの初期化
    const initOverlay = useCallback(() => {
        if (!overlayCanvasRef.current || !canvasRef.current) return;

        const baseCanvas = canvasRef.current;
        const overlayCanvas = overlayCanvasRef.current;
        const rect = baseCanvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        overlayCanvas.width = rect.width * dpr;
        overlayCanvas.height = rect.height * dpr;
        
        const ctx = overlayCanvas.getContext('2d');
        ctx.scale(dpr, dpr);
    }, []);

    // ツールチップの描画（オーバーレイレイヤー - hoveredPoint変更時のみ）
    const drawTooltip = useCallback(() => {
        if (!overlayCanvasRef.current || hoveredPoint === null || !stockData.length || !chartParams) return;
        
        const canvas = overlayCanvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        
        const width = rect.width;
        const height = rect.height;
        const padding = { top: 40, right: 80, bottom: 60, left: 60 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        const { minPrice, priceRange } = chartParams;

        // オーバーレイをクリア
        ctx.clearRect(0, 0, width, height);

        const point = stockData[hoveredPoint];
        const x = padding.left + (chartWidth / (stockData.length - 1)) * hoveredPoint;
        const y = padding.top + chartHeight - ((point.price - minPrice) / priceRange) * chartHeight;

        // 縦線
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // ポイント
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // ツールチップ
        const tooltipWidth = 160;
        const tooltipHeight = 50;
        const tooltipX = x > width - tooltipWidth - 20 ? x - tooltipWidth - 10 : x + 10;
        const tooltipY = y - tooltipHeight / 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`¥${point.price.toLocaleString()}`, tooltipX + 10, tooltipY + 25);

        ctx.font = '12px sans-serif';
        ctx.fillText(`出来高: ${(point.volume / 1000000).toFixed(1)}M`, tooltipX + 10, tooltipY + 45);
    }, [hoveredPoint, stockData, chartParams]);

    // チャート本体の描画（stockData変更時）
    useEffect(() => {
        drawChart();
        initOverlay();
    }, [drawChart, initOverlay]);

    // ツールチップの描画（hoveredPoint変更時）
    useEffect(() => {
        if (hoveredPoint !== null) {
            requestAnimationFrame(drawTooltip);
        } else if (overlayCanvasRef.current) {
            // hoveredPointがnullの場合、オーバーレイをクリア
            const ctx = overlayCanvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
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
        const newIndex = Math.max(0, Math.min(stockData.length - 1, index));
        
        // 同じインデックスの場合は更新しない
        if (newIndex !== hoveredPoint) {
            setHoveredPoint(newIndex);
        }
    }, [stockData, hoveredPoint]);

    const handleMouseLeave = useCallback(() => {
        setHoveredPoint(null);
    }, []);

    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            padding: '24px',
            marginBottom: '24px'
        }}>
            <div style={{ position: 'relative' }}>
                <canvas
                    ref={canvasRef}
                    style={{
                        width: '100%',
                        height: '400px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        display: 'block'
                    }}
                />
                <canvas
                    ref={overlayCanvasRef}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    style={{
                        width: '100%',
                        height: '400px',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        cursor: 'crosshair',
                        pointerEvents: 'auto'
                    }}
                />
            </div>
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