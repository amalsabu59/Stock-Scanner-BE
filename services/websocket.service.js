const { fyersDataSocket } = require("fyers-api-v3");
let socket = null;
let volumeHistoryMap = new Map();
let subscribedSymbols = new Set();

function getVolumeHistoryMap() {
    return volumeHistoryMap;
}

let isFirstConnect = true;

async function initSocket(fullToken, onMessageHandler) {
    socket = fyersDataSocket.getInstance(fullToken, "./", true);

    socket.on("connect", async () => {
        console.log("✅ WebSocket connected");

        if (isFirstConnect) {
            isFirstConnect = false;
            // Initial connect — don’t re-subscribe here
            return;
        }

        const symbolsToResubscribe = Array.from(subscribedSymbols);
        if (symbolsToResubscribe.length > 0) {
            console.log(`🔁 Re-subscribing after reconnect: ${symbolsToResubscribe.length}`);
            await subscribe(symbolsToResubscribe);
        }
    });

    socket.on("message", onMessageHandler);
    socket.on("error", console.error);
    socket.on("close", () => console.log("⚠️ WebSocket closed"));

    socket.autoreconnect(40);
    socket.connect();
}


async function subscribe(symbols) {
    const chunkSize = 50;
    for (let i = 0; i < symbols.length; i += chunkSize) {
        const chunk = symbols.slice(i, i + chunkSize);
        socket.subscribe(chunk);
        chunk.forEach(sym => subscribedSymbols.add(sym));
        await new Promise(r => setTimeout(r, 500));
    }
}

function unsubscribe(symbols) {
    if (!socket) return;
    socket.unsubscribe(symbols);
    symbols.forEach(sym => subscribedSymbols.delete(sym));
}

function isConnected() {
    return socket?.isConnected || false;
}

function getSubscribedSymbols() {
    return Array.from(subscribedSymbols);
}

module.exports = {
    initSocket,
    subscribe,
    unsubscribe,
    isConnected,
    getVolumeHistoryMap,
    getSubscribedSymbols,
};
