require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const spikeRoutes = require("./routes/spike.routes");
const fyersService = require("./services/fyers.service");
const websocketService = require("./services/websocket.service");
const spikeService = require("./services/spike.service");
const { updateOptionSymbols } = require("./services/symbols.service");
const volumeTrackerService = require('./services/volumeTracker.service');




const {
    APP_ID,
    REDIRECT_URL,
    FYERS_AUTH_TOKEN,
    SECRET_KEY,
    MONGODB_URI,
} = process.env;

const app = express();
const port = 3000;

app.use(cors());
app.use("/api", spikeRoutes);

connectDB(MONGODB_URI);
fyersService.initFyers({ APP_ID, REDIRECT_URL });

async function initialize() {
    try {
        const tokenResp = await fyersService.generateToken({
            APP_ID,
            SECRET_KEY,
            FYERS_AUTH_TOKEN
        });

        console.log("tokenResp", tokenResp);
        if (tokenResp.s === "ok") {
            const accessToken = tokenResp.access_token;
            fyersService.setAccessToken(accessToken);
            const fullToken = `${APP_ID}:${accessToken}`;

            let volumeSnapshot = new Map(); // symbol -> {minute, volume}

            await websocketService.initSocket(fullToken, (msg) => {
                volumeTrackerService.handleTick(msg); // this replaces inline tick handling
            });


            await updateOptionSymbols();

            setInterval(async () => {
                const buckets = volumeTrackerService.getVolumeBuckets();
                await spikeService.checkSpikes(buckets);
            }, 10 * 1000);

        }
    } catch (err) {
        console.error("Init error:", err);
    }
}

app.listen(port, () => {
    console.log(`📡 Server running on http://localhost:${port}`);
    initialize();
});
