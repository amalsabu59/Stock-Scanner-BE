const volumeBuckets = new Map(); // symbol => { bucketKey => { startVol, endVol, startTs, endTs, ltp } }

function getMinuteBucket(ts) {
    const dt = new Date(ts);
    dt.setSeconds(0, 0);
    return dt.toISOString();
}

function handleTick(msg) {
    // console.log("msg>>>>", msg)
    if (!msg || msg.type !== "sf" || !msg.symbol) return;

    const symbol = msg.symbol;
    const ts = (msg.exch_feed_time || 0) * 1000;
    const bucketKey = getMinuteBucket(ts);

    if (!volumeBuckets.has(symbol)) volumeBuckets.set(symbol, {});
    const buckets = volumeBuckets.get(symbol);

    if (!buckets[bucketKey]) {
        buckets[bucketKey] = {
            startVol: msg.vol_traded_today,
            endVol: msg.vol_traded_today,
            startTs: ts,
            endTs: ts,
            ltp: msg.ltp,
            openPrice: msg.open_price,
            lowPrice: msg.low_price,
            highPrice: msg.high_price

        };
    } else {
        buckets[bucketKey].endVol = msg.vol_traded_today;
        buckets[bucketKey].endTs = ts;
        buckets[bucketKey].ltp = msg.ltp;
        buckets[bucketKey].lowPrice = msg.open_price;
        buckets[bucketKey].highPrice = Math.max(buckets[bucketKey].highPrice, msg.high_price);
        buckets[bucketKey].lowPrice = Math.min(buckets[bucketKey].lowPrice, msg.low_price);
    }
}

function getVolumeBuckets() {
    return volumeBuckets;
}

module.exports = {
    handleTick,
    getVolumeBuckets
};
