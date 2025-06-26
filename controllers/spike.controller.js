const Spike = require("../models/spike.model");

async function getSpikes(req, res) {
    try {
        const { segment, type, volume, from, page = 1, limit = 20 } = req.query;
        const volThreshold = parseInt(volume) || 100000;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        let fromDate = new Date();
        if (from) {
            const parsed = new Date(from);
            if (!isNaN(parsed.getTime())) fromDate = parsed;
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
}

module.exports = { getSpikes };
