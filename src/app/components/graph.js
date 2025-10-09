import { useState, useEffect, useRef } from 'react';

export default function StockChart() {
    const canvasRef = useRef(null);
    const [stockData, setStockData] = useState([]);
    const [hoveredPoint, setHoveredPoint] = useState(null);

    // サンプル株価データを生成
    useEffect(() => {
        const generateData = () => {
            const data = [];
            let price = 15000;
            const startDate = new Date('2024-01-01');

            for (let i = 0; i < 180; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);

                // ランダムな価格変動
                price += (Math.random() - 0.48) * 500;
                price = Math.max(10000, Math.min(20000, price));

                data.push({
                    date: date.toISOString().split('T')[0],
                    price: Math.round(price),
                    volume: Math.floor(Math.random() * 100000000) + 50000000
                });
            }
            return data;
        };

        setStockData(generateData());

        // 2秒毎にリアルタイム更新
        const interval = setInterval(() => {
            setStockData(prevData => {
                if (prevData.length === 0) return prevData;

                const newData = [...prevData];
                const lastPrice = newData[newData.length - 1].price;

                // 新しい価格を計算（前回の価格から±3%の範囲でランダム変動）
                const change = (Math.random() - 0.5) * (lastPrice * 0.03);
                const newPrice = Math.round(Math.max(10000, Math.min(20000, lastPrice + change)));

                // 最新のデータポイントを更新
                newData[newData.length - 1] = {
                    ...newData[newData.length - 1],
                    price: newPrice,
                    volume: Math.floor(Math.random() * 100000000) + 50000000
                };

                // 古いデータを削除して新しいデータを追加（スクロール効果）
                if (newData.length >= 180) {
                    newData.shift();
                    const lastDate = new Date(newData[newData.length - 1].date);
                    lastDate.setDate(lastDate.getDate() + 1);

                    newData.push({
                        date: lastDate.toISOString().split('T')[0],
                        price: newPrice,
                        volume: Math.floor(Math.random() * 100000000) + 50000000
                    });
                }

                return newData;
            });
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!stockData.length || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        // Canvas解像度設定
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

        // 価格の最大・最小
        const prices = stockData.map(d => d.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;

        // グリッド線を描画
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;

        for (let i = 0; i <= 5; i++) {
            const y = padding.top + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartWidth, y);
            ctx.stroke();

            // Y軸ラベル
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

        // 株価ラインを描画
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

        // エリアのグラデーション
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

        // ホバーポイント
        if (hoveredPoint !== null) {
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
        }

        // タイトル
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('株価チャート', padding.left, 25);

    }, [stockData, hoveredPoint]);

    const handleMouseMove = (e) => {
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
    };

    const handleMouseLeave = () => {
        setHoveredPoint(null);
    };

    return (
        <div className="w-full h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-6">
                <canvas
                    ref={canvasRef}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    style={{ width: '100%', height: '500px', cursor: 'crosshair' }}
                    className="border border-gray-200 rounded"
                />
                <div className="mt-4 flex gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span>株価推移</span>
                    </div>
                    <div className="ml-auto">
                        最新価格: ¥{stockData[stockData.length - 1]?.price.toLocaleString()}
                    </div>
                </div>
            </div>
        </div>
    );
}