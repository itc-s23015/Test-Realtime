const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST'],
    },
});

let rooms = {}; // ルーム番号ごとの接続情報
let roomStockData = {}; // 各部屋の株価データ
let roomTimers = {}; // 各部屋の自動変動タイマー

// 株価データを生成する関数
function generateStockData() {
    const data = [];
    let price = 15000;
    const startDate = new Date('2024-01-01');

    for (let i = 0; i < 180; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);

        price += (Math.random() - 0.48) * 500;
        price = Math.max(10000, Math.min(20000, price));

        data.push({
            date: date.toISOString().split('T')[0],
            price: Math.round(price),
            volume: Math.floor(Math.random() * 100000000) + 50000000
        });
    }
    return data;
}

// 株価を自動変動させる関数
function autoUpdateStockPrice(roomNumber) {
    if (!roomStockData[roomNumber]) {
        console.log(`❌ 部屋 ${roomNumber} の株価データが存在しません`);
        return;
    }

    const stockData = roomStockData[roomNumber];
    const lastPrice = stockData[stockData.length - 1].price;

    // ランダムな変動額（-300〜+300）
    const changeAmount = Math.floor((Math.random() - 0.5) * 600);
    const newPrice = Math.round(Math.max(10000, Math.min(20000, lastPrice + changeAmount)));

    console.log(`🤖 自動変動 [部屋 ${roomNumber}]: ¥${lastPrice} → ¥${newPrice} (${changeAmount > 0 ? '+' : ''}${changeAmount})`);

    // 最後のデータを更新
    stockData[stockData.length - 1] = {
        ...stockData[stockData.length - 1],
        price: newPrice,
        volume: Math.floor(Math.random() * 100000000) + 50000000
    };

    // データが180個以上なら古いデータを削除して新しいデータを追加
    if (stockData.length >= 180) {
        stockData.shift();
        const lastDate = new Date(stockData[stockData.length - 1].date);
        lastDate.setDate(lastDate.getDate() + 1);

        stockData.push({
            date: lastDate.toISOString().split('T')[0],
            price: newPrice,
            volume: Math.floor(Math.random() * 100000000) + 50000000
        });
    }

    // 部屋の全員に更新を送信
    io.to(roomNumber).emit('stockDataUpdated', {
        stockData: roomStockData[roomNumber],
        changeAmount: changeAmount,
        isAuto: true
    });
}

// 自動変動タイマーを開始
function startAutoUpdate(roomNumber) {
    // すでにタイマーがある場合は何もしない
    if (roomTimers[roomNumber]) {
        console.log(`⏰ 部屋 ${roomNumber} は既に自動変動中`);
        return;
    }

    console.log(`⏰ 部屋 ${roomNumber} の自動変動を開始`);
    roomTimers[roomNumber] = setInterval(() => {
        autoUpdateStockPrice(roomNumber);
    }, 2000); // 2秒ごと
}

// 自動変動タイマーを停止
function stopAutoUpdate(roomNumber) {
    if (roomTimers[roomNumber]) {
        clearInterval(roomTimers[roomNumber]);
        delete roomTimers[roomNumber];
        console.log(`⏰ 部屋 ${roomNumber} の自動変動を停止`);
    }
}

io.on('connection', (socket) => {
    console.log('新しいユーザーが接続しました:', socket.id);

    // ルーム作成
    socket.on('createRoom', (roomNumber, callback) => {
        console.log(`ユーザー ${socket.id} が部屋 ${roomNumber} を作成`);

        // 部屋がすでに存在する場合、エラーメッセージを返す
        if (rooms[roomNumber]) {
            console.log(`部屋 ${roomNumber} はすでに存在するので、違う部屋を使ってね！`);
            callback({ success: false, message: 'この番号は現在使用できません！' });
            return;
        }

        // ユーザーをマップで管理
        const users = new Map();
        users.set(socket.id, 'create');

        // ユーザーをルームに追加
        rooms[roomNumber] = users;
        socket.join(roomNumber);

        // この部屋の株価データを生成
        roomStockData[roomNumber] = generateStockData();

        console.log(`現在の部屋情報:`, rooms);

        callback({ success: true });
    });

    // ルームに参加する
    socket.on('joinRoom', (roomNumber, callback) => {
        console.log(`ユーザー ${socket.id} が部屋 ${roomNumber} に参加`);

        // 部屋が存在しない場合
        if (!rooms[roomNumber]) {
            console.log('指定した部屋がないんゴ...')
            callback({ success: false, message: '指定された部屋が存在しません。' });
            return;
        }

        // 部屋が満員の場合
        if (rooms[roomNumber].size >= 2) {
            console.log('ただいま、このルームは満員なので、参加できません！')
            callback({ success: false, message: 'このルームは満員です！' });
            return;
        }

        // 部屋に参加
        rooms[roomNumber].set(socket.id, 'join');
        socket.join(roomNumber);

        // 株価データがまだない場合は生成
        if (!roomStockData[roomNumber]) {
            roomStockData[roomNumber] = generateStockData();
            console.log(`部屋 ${roomNumber} の株価データを生成しました`);
        }

        console.log(`部屋 ${roomNumber} に参加したユーザー:`, rooms);

        callback({ success: true });
    });

    // 相手がくるまで待機させる
    socket.on('ready', (roomNumber) => {
        console.log(`ユーザー ${socket.id} が部屋 ${roomNumber} で待機しています`);

        // 部屋が存在しない場合
        if (!rooms[roomNumber]) {
            console.log(`部屋 ${roomNumber} が存在しません`);
            socket.emit('error', { message: '部屋が存在しません' });
            return;
        }

        // ユーザーが部屋に存在しない場合
        if (!rooms[roomNumber].has(socket.id)) {
            console.log(`ユーザー ${socket.id} は部屋 ${roomNumber} に存在しません`);
            socket.emit('error', { message: '部屋に参加していません' });
            return;
        }

        // ステータスを ready に更新
        const currentStatus = rooms[roomNumber].get(socket.id);
        if (currentStatus === 'create' || currentStatus === 'join') {
            rooms[roomNumber].set(socket.id, 'ready');
        }

        console.log('準備が完了しました！');
        console.log(`現在の部屋情報:`, rooms);

        // Map の keys を配列に変換
        const userIds = Array.from(rooms[roomNumber].keys());

        // 部屋のユーザー数が2人で、両方とも ready ならマッチング開始
        if (rooms[roomNumber].size === 2) {
            const allReady = Array.from(rooms[roomNumber].values()).every(status => status === 'ready');

            if (allReady) {
                console.log(`部屋 ${roomNumber} で対戦相手が見つかりました！`);

                // 両方のユーザーに「対戦相手が見つかりました」イベントを送信
                io.to(userIds[0]).emit('opponentFound', { roomNumber });
                io.to(userIds[1]).emit('opponentFound', { roomNumber });

                // 自動変動を開始
                startAutoUpdate(roomNumber);
            } else {
                // 片方だけが ready の場合は待機
                socket.emit('waitingForOpponent', { message: '対戦相手を待っています...' });
            }
        } else {
            // 1人目が参加したばかりのユーザーには待機メッセージ
            socket.emit('waitingForOpponent', { message: '対戦相手を待っています...' });
        }
    });

    // ゲームルームに参加
    socket.on('joinGameRoom', (roomNumber) => {
        console.log(`ユーザー ${socket.id} がゲームルーム ${roomNumber} に参加`);
        socket.join(roomNumber);

        // 株価データが存在しない場合は生成
        if (!roomStockData[roomNumber]) {
            console.log(`部屋 ${roomNumber} の株価データが存在しないため、新規生成します`);
            roomStockData[roomNumber] = generateStockData();
        }

        // 現在の株価データを送信
        console.log(`部屋 ${roomNumber} の株価データを送信: ${roomStockData[roomNumber].length}件`);
        socket.emit('initialStockData', { stockData: roomStockData[roomNumber] });
    });

    // 株価変動の処理
    socket.on('changeStockPrice', (data) => {
        const { roomNumber, changeAmount } = data;
        console.log(`📊 部屋 ${roomNumber} で株価を ${changeAmount} 変動させます`);

        // サーバー側で株価データを更新
        if (!roomStockData[roomNumber]) {
            console.error(`❌ 部屋 ${roomNumber} の株価データが存在しません`);
            return;
        }

        const stockData = roomStockData[roomNumber];
        console.log(`現在のデータ数: ${stockData.length}件`);

        const lastPrice = stockData[stockData.length - 1].price;
        console.log(`変動前の価格: ¥${lastPrice}`);

        const newPrice = Math.round(Math.max(10000, Math.min(20000, lastPrice + changeAmount)));
        console.log(`変動後の価格: ¥${newPrice}`);

        // 最後のデータを更新
        stockData[stockData.length - 1] = {
            ...stockData[stockData.length - 1],
            price: newPrice,
            volume: Math.floor(Math.random() * 100000000) + 50000000
        };

        // データが180個以上なら古いデータを削除して新しいデータを追加
        if (stockData.length >= 180) {
            stockData.shift();
            const lastDate = new Date(stockData[stockData.length - 1].date);
            lastDate.setDate(lastDate.getDate() + 1);

            stockData.push({
                date: lastDate.toISOString().split('T')[0],
                price: newPrice,
                volume: Math.floor(Math.random() * 100000000) + 50000000
            });
        }

        console.log(`✅ 株価データ更新完了。部屋 ${roomNumber} の全員に送信します`);

        // 同じ部屋の全員（送信者を含む）に更新された株価データを送信
        io.to(roomNumber).emit('stockDataUpdated', {
            stockData: roomStockData[roomNumber],
            changeAmount: changeAmount
        });

        console.log(`📤 送信完了`);
    });

    // ICE candidate の処理
    socket.on('ice-candidate', (data) => {
        console.log('ice-candidate_log');

        // 同じ部屋の他のユーザーに送信
        for (const roomNumber in rooms) {
            if (rooms[roomNumber].has(socket.id)) {
                const userIds = Array.from(rooms[roomNumber].keys());
                userIds.forEach(userId => {
                    if (userId !== socket.id) {
                        io.to(userId).emit('ice-candidate', data);
                    }
                });
            }
        }
    });

    // ユーザーが切断された場合の処理
    socket.on('disconnect', () => {
        console.log(`ユーザー ${socket.id} が切断されました`);

        for (const roomNumber in rooms) {
            if (rooms[roomNumber].has(socket.id)) {
                rooms[roomNumber].delete(socket.id);
                console.log(`部屋 ${roomNumber} からユーザー ${socket.id} を削除しました`);

                // 残っているユーザーに通知
                const remainingUsers = Array.from(rooms[roomNumber].keys());
                remainingUsers.forEach(userId => {
                    io.to(userId).emit('opponentDisconnected', { message: '対戦相手が切断しました' });
                });

                // 部屋が空になった場合は削除
                if (rooms[roomNumber].size === 0) {
                    delete rooms[roomNumber];
                    delete roomStockData[roomNumber]; // 株価データも削除
                    stopAutoUpdate(roomNumber); // 自動変動も停止
                    console.log(`部屋 ${roomNumber} が空になったため削除されました`);
                }
            }
        }

        console.log(`切断後の部屋情報:`, rooms);
    });
}); // ← この閉じ括弧が io.on('connection', ...) の終わり

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`サーバーがポート ${PORT} で起動しました`);
});