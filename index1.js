// seedDummySpikes.js
require('dotenv').config();
const mongoose = require('mongoose');

const { MONGODB_URI } = process.env;

// Define the Spike schema (match your app’s schema)
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
    timestamp: Date
});
const Spike = mongoose.model('Spike', spikeSchema);

async function seed() {
    try {
        await mongoose.connect("", { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('✅ Connected to MongoDB');

        // Remove any existing spikes for today (optional)
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        await Spike.deleteMany({ timestamp: { $gte: startOfDay } });
        console.log('🗑️  Cleared existing spikes for today');

        // Build some dummy entries
        const now = new Date();
        const minuteAgo = new Date(now.getTime() - 60 * 1000);
        const twoMinAgo = new Date(now.getTime() - 2 * 60 * 1000);

        const dummySpikes = [
            {
                symbol: 'NSE:RELIANCE25JUN2400CE',
                segment: 'Options',
                type: 'CE',
                underlying: 'RELIANCE',
                expiry: '25JUN24',
                strikePrice: 2400,
                ltp: 52.10,
                volumeDelta: 150000,
                prevVolume: 50000,
                prevTimestamp: twoMinAgo,
                newVolume: 200000,
                newTimestamp: minuteAgo,
                timestamp: now
            },
            {
                symbol: 'NSE:INFY-EQ',
                segment: 'Equity',
                type: 'EQ',
                underlying: 'INFY',
                expiry: null,
                strikePrice: null,
                ltp: 1485.75,
                volumeDelta: 120000,
                prevVolume: 30000,
                prevTimestamp: twoMinAgo,
                newVolume: 150000,
                newTimestamp: minuteAgo,
                timestamp: now
            },
            {
                symbol: 'NSE:TCS25JUN3300PE',
                segment: 'Options',
                type: 'PE',
                underlying: 'TCS',
                expiry: '25JUN24',
                strikePrice: 3300,
                ltp: 18.25,
                volumeDelta: 180000,
                prevVolume: 20000,
                prevTimestamp: twoMinAgo,
                newVolume: 200000,
                newTimestamp: minuteAgo,
                timestamp: now
            }
        ];

        await Spike.insertMany(dummySpikes);
        console.log(`💾 Inserted ${dummySpikes.length} dummy spike records`);

    } catch (err) {
        console.error('❌ Seeding error:', err);
    } finally {
        mongoose.disconnect();
    }
}

seed();
