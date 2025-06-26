const Spike = require('../models/spike.model');

const { parseFyersSymbol } = require('../utils/symbolParser');

async function checkSpikes(volumeBuckets, threshold = 10000) {
    const now = Date.now();

    for (const [symbol, buckets] of volumeBuckets.entries()) {
        for (const [bucketKey, data] of Object.entries(buckets)) {
            const bucketStartTs = new Date(bucketKey).getTime();
            const bucketEndTs = bucketStartTs + 60 * 1000;

            if (now >= bucketEndTs + 4000) {
                const delta = data.endVol - data.startVol;

                if (delta > threshold) {
                    console.log(`🚨 SPIKE: ${symbol} Δ=${delta} at ${bucketKey}`);

                    const parsed = parseFyersSymbol(symbol);

                    const spike = new Spike({
                        symbol,
                        ltp: data.ltp,
                        volumeDelta: delta,
                        prevVolume: data.startVol,
                        prevTimestamp: data.startTs,
                        newVolume: data.endVol,
                        newTimestamp: data.endTs,
                        segment: parsed.segment,
                        type: parsed.type,
                        underlying: parsed.underlying,
                        expiry: parsed.expiry,
                        strikePrice: parsed.strikePrice,
                        timestamp: data.endTs,

                        // New fields
                        openPriceofCandle: data.openPrice,
                        todayHighPrice: data.highPrice,
                        todaysLowPrice: data.lowPrice,
                        todaysOpen: data.todayOpen,
                        tradeValue: data.openPrice * delta,
                    });


                    await spike.save();
                }

                delete buckets[bucketKey];
            }
        }

        if (Object.keys(buckets).length === 0) {
            volumeBuckets.delete(symbol);
        }
    }
}

module.exports = {
    checkSpikes
};
