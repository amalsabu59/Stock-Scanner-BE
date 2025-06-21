require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const { fyersModel, fyersDataSocket } = require("fyers-api-v3");
const cors = require("cors");

const app = express();
const port = 3000;

const fyers = new fyersModel();
const {
    APP_ID,
    REDIRECT_URL,
    FYERS_AUTH_TOKEN,
    SECRET_KEY,
    MONGODB_URI,
} = process.env;

fyers.setAppId(APP_ID);
fyers.setRedirectUrl(REDIRECT_URL);
// fyers.setAccessToken(FYERS_AUTH_TOKEN);

const UNDERLYINGS = [
    "NSE:ADANIENSOL-EQ",
    "NSE:ADANIGREEN-EQ",
    "NSE:ADANIPORTS-EQ",
    "NSE:AMBUJACEM-EQ",
    "NSE:ANGELONE-EQ",
    "NSE:APLAOLLO-EQ",
    "NSE:ASIANPAINT-EQ",
    "NSE:ATGL-EQ",
    "NSE:AUBANK-EQ",
    "NSE:AUROPHARMA-EQ",
    "NSE:BAJAJ-AUTO-EQ",
    "NSE:BAJAJFINSV-EQ",
    "NSE:BAJFINANCE-EQ",
    "NSE:BHARATFORG-EQ",
    "NSE:BHARTIARTL-EQ",
    "NSE:BSE-EQ",
    "NSE:CAMS-EQ",
    "NSE:CDSL-EQ",
    "NSE:CGPOWER-EQ",
    "NSE:CHAMBLEFERT-EQ",
    "NSE:CHOLAFIN-EQ",
    "NSE:CIPLA-EQ",
    "NSE:CYIENT-EQ",
    "NSE:DEEPAKNTR-EQ",
    "NSE:DIVISLAB-EQ",
    "NSE:DIXON-EQ",
    "NSE:DLF-EQ",
    "NSE:DMART-EQ",
    "NSE:DRREDDY-EQ",
    "NSE:EICHERMOT-EQ",
    "NSE:ESCORTS-EQ",
    "NSE:GODREJCP-EQ",
    "NSE:GODREJPROP-EQ",
    "NSE:HAL-EQ",
    "NSE:HAVELLS-EQ",
    "NSE:HCLTECH-EQ",
    "NSE:HDFCAMC-EQ",
    "NSE:HDFCLIFE-EQ",
    "NSE:HINDALCO-EQ",
    "NSE:HINDUNILVR-EQ",
    "NSE:ICICIGI-EQ",
    "NSE:INDHOTEL-EQ",
    "NSE:INDIANB-EQ",
    "NSE:INDIGO-EQ",
    "NSE:INDUSINDBK-EQ",
    "NSE:INFY-EQ",
    "NSE:IRCTC-EQ",
    "NSE:JINDALSTEL-EQ",
    "NSE:JSL-EQ",
    "NSE:JSWENERGY-EQ",
    "NSE:JSWSTEEL-EQ",
    "NSE:JUBLFOOD-EQ",
    "NSE:KALYANKJIL-EQ",
    "NSE:KEI-EQ",
    "NSE:LAURUSLABS-EQ",
    "NSE:LICHSGFIN-EQ",
    "NSE:LODHA-EQ",
    "NSE:LUPIN-EQ",
    "NSE:MARUTI-EQ",
    "NSE:MAXHEALTH-EQ",
    "NSE:MCX-EQ",
    "NSE:MFSL-EQ",
    "NSE:MGL-EQ",
    "NSE:MPHASIS-EQ",
    "NSE:MUTHOOTFIN-EQ",
    "NSE:NAUKRI-EQ",
    "NSE:OBEROIRLTY-EQ",
    "NSE:PAYTM-EQ",
    "NSE:PERSISTENT-EQ",
    "NSE:PHOEXIXLTD-EQ",
    "NSE:PIDILITIND-EQ",
    "NSE:PIINDI-EQ",
    "NSE:POLICYBZR-EQ",
    "NSE:POLYCAB-EQ",
    "NSE:PRESTIGE-EQ",
    "NSE:RAMCOCEM-EQ",
    "NSE:SHREECEM-EQ",
    "NSE:SHRIRAMFIN-EQ",
    "NSE:SIEMENS-EQ",
];
const STRIKE_COUNT = 4;
const VOLUME_SPIKE_THRESHOLD = 10000;

let dataSocket = null;
let currentOptionsSymbols = [];
const volumeHistoryMap = new Map();
let monitoringStarted = false;

app.use(cors());
// 📦 MongoDB Setup
mongoose.connect(MONGODB_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch(err => console.error("MongoDB connection error:", err));
const spikeSchema = new mongoose.Schema({
    symbol: String,
    segment: String, // Equity / Options / Futures
    type: String,    // CE / PE / EQ / FUT
    underlying: String,
    expiry: String,
    strikePrice: Number,

    ltp: Number,
    volumeDelta: Number,

    prevVolume: Number,
    prevTimestamp: Date,
    newVolume: Number,
    newTimestamp: Date,

    timestamp: { type: Date, default: Date.now }
});

const Spike = mongoose.model("Spike", spikeSchema);

// 🔌 WebSocket
async function initializeWebSocket(fullToken) {

    dataSocket = fyersDataSocket.getInstance(fullToken, "./", true);

    dataSocket.on("connect", async () => {
        console.log("✅ WebSocket connected");
        if (currentOptionsSymbols.length > 0) {
            console.log("🔁 Re-subscribing to previously subscribed symbols...");
            await subscribeInChunks(currentOptionsSymbols);
        }
    });

    dataSocket.on("message", (msg) => {
        if (msg && msg.type === "sf" && msg.symbol) {
            const symbol = msg.symbol;
            const volume = msg.vol_traded_today || 0;
            const ltp = msg.ltp || 0;
            const tradedAt = (msg.last_traded_time || 0) * 1000; // convert to ms

            if (!volumeHistoryMap.has(symbol)) {
                volumeHistoryMap.set(symbol, []);
            }

            const history = volumeHistoryMap.get(symbol);

            history.push({ timestamp: tradedAt, volume, ltp });

            // Keep only entries from the last 2 minutes
            const cutoff = Date.now() - 2 * 60 * 1000;
            while (history.length && history[0].timestamp < cutoff) {
                history.shift();
            }
        }
    });


    dataSocket.on("error", err => console.error("WebSocket error:", err));
    dataSocket.on("close", () => console.log("WebSocket closed"));
    dataSocket.autoreconnect(20);


    dataSocket.connect();
}

// 🧠 Start Monitoring
function startVolumeMonitoring() {
    setInterval(async () => {
        const now = Date.now();
        const oneMinuteAgo = now - 60 * 1000;

        console.log("⏱️ Checking for volume spikes...");
        for (const [symbol, history] of volumeHistoryMap.entries()) {
            if (history.length < 2) continue;

            const past = [...history].reverse().find(e => e.timestamp <= oneMinuteAgo);
            const latest = history[history.length - 1];

            if (!past || !latest) continue;

            const delta = latest.volume - past.volume;
            if (delta > VOLUME_SPIKE_THRESHOLD) {
                console.log(`🚨 VOLUME SPIKE: ${symbol} | Δ=${delta} | LTP=${latest.ltp}`);

                const parsed = parseFyersSymbol(symbol);


                const spike = new Spike({
                    symbol,
                    ltp: latest.ltp,
                    volumeDelta: delta,

                    prevVolume: past.volume,
                    prevTimestamp: past.timestamp,
                    newVolume: latest.volume,
                    newTimestamp: latest.timestamp,

                    segment: parsed.segment,
                    type: parsed.type,
                    underlying: parsed.underlying,
                    expiry: parsed.expiry,
                    strikePrice: parsed.strikePrice,

                    timestamp: latest.timestamp,
                });

                await spike.save();
            }
        }
    }, 60 * 1000);
}


// 🔄 Fetch Option Chain
async function updateOptionSymbols() {
    const newSymbols = [];
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    for (const underlying of UNDERLYINGS) {
        const res = await fyers.getOptionChain({
            symbol: underlying,
            strikecount: 3,
            timestamp: ""
        });

        if (res.s === "ok" && res.data?.optionsChain?.length) {
            res.data.optionsChain.forEach(opt => {
                if (opt.symbol) newSymbols.push(opt.symbol);
            });
        }


        await sleep(1000);
    }

    if (newSymbols.length > 0 && dataSocket?.isConnected) {
        if (currentOptionsSymbols.length) {
            dataSocket.unsubscribe(currentOptionsSymbols);
        }
        await subscribeInChunks(newSymbols);

        currentOptionsSymbols = newSymbols;
        console.log(`📊 Subscribed to ${newSymbols.length} symbols`);

        if (!monitoringStarted) {
            startVolumeMonitoring();
            monitoringStarted = true;
        }
    }
}

async function subscribeInChunks(symbols) {
    const chunkSize = 50;
    for (let i = 0; i < symbols.length; i += chunkSize) {
        const chunk = symbols.slice(i, i + chunkSize);
        dataSocket.subscribe(chunk);
        console.log(`📡 Subscribed to ${chunk.length} symbols`);
        await new Promise(r => setTimeout(r, 500)); // Delay to avoid overload
    }
}


async function initialize() {
    try {
        const tokenResp = await fyers.generate_access_token({
            client_id: APP_ID,
            secret_key: SECRET_KEY,
            auth_code: FYERS_AUTH_TOKEN
        });

        if (tokenResp.s === "ok") {
            const fullToken = `${APP_ID}:${tokenResp.access_token}`;
            fyers.setAccessToken(tokenResp.access_token);

            // ✅ Await until the WebSocket is connected
            await initializeWebSocket(fullToken);

            // ✅ Now it's safe to start updates and monitoring
            await updateOptionSymbols();
            // setInterval(updateOptionSymbols, 10 * 60 * 1000);

            if (!monitoringStarted) {
                startVolumeMonitoring();
                monitoringStarted = true;
            }
        } else {
            console.error("Token generation failed:", tokenResp);
        }
    } catch (err) {
        console.error("Initialization error:", err);
    }
}


// 

// 🚀 Express API
app.get("/api/spikes", async (req, res) => {
    try {
        const { segment, type, volume, from, page = 1, limit = 20 } = req.query;

        const volThreshold = parseInt(volume) || 100000;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        let fromDate = new Date();
        if (from) {
            const parsed = new Date(from);
            if (!isNaN(parsed.getTime())) {
                fromDate = parsed;
            }
        } else {
            fromDate.setHours(0, 0, 0, 0);
        }

        const query = {
            timestamp: { $gte: fromDate },
            volumeDelta: { $gte: volThreshold },
        };

        if (segment) query.segment = segment;
        if (type) query.type = type;

        const spikes = await Spike.find(query)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Spike.countDocuments(query);

        res.json({ spikes, total });
    } catch (err) {
        console.error("Error fetching spikes:", err);
        res.status(500).json({ error: "Failed to fetch spikes" });
    }
});



// Start server
app.listen(port, () => {
    console.log(`📡 Server running on http://localhost:${port}`);
    initialize();
});

function parseFyersSymbol(symbol) {
    const clean = symbol.replace(/^NSE:/, '');

    if (clean.endsWith('-EQ')) {
        return {
            segment: 'Equity',
            type: 'EQ',
            underlying: clean.replace(/-EQ$/, ''),
            expiry: null,
            strikePrice: null,
        };
    }

    const optionRegex = /^([A-Z]+)(\d{2}[A-Z]{3})(\d+)(CE|PE)$/;
    const futureRegex = /^([A-Z]+)(\d{2}[A-Z]{3})FUT$/;

    if (optionRegex.test(clean)) {
        const [, underlying, expiry, strike, optType] = clean.match(optionRegex);
        return {
            segment: 'Options',
            type: optType,
            underlying,
            expiry,
            strikePrice: Number(strike),
        };
    }

    if (futureRegex.test(clean)) {
        const [, underlying, expiry] = clean.match(futureRegex);
        return {
            segment: 'Futures',
            type: 'FUT',
            underlying,
            expiry,
            strikePrice: null,
        };
    }

    return {
        segment: 'Unknown',
        type: null,
        underlying: clean,
        expiry: null,
        strikePrice: null,
    };
}