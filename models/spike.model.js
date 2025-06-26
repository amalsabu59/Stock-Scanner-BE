const mongoose = require("mongoose");

const spikeSchema = new mongoose.Schema({
    symbol: String,
    segment: String,
    type: String,
    underlying: String,
    expiry: String,
    strikePrice: Number,
    ltp: Number,
    volumeDelta: Number,
    prevVolume: Number,
    prevTimestamp: Date,
    newVolume: Number,
    newTimestamp: Date,
    openPriceofCandle: Number,
    todayHighPrice: Number,
    todaysLowPrice: Number,
    todaysOpen: Number,
    tradeValue: Number,


    timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Spike", spikeSchema);
