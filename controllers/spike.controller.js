const Spike = require("../models/spike.model");

async function getSpikes(req, res) {
    try {
        const {
            segment,
            type,
            volume,
            from,
            page = 1,
            limit = 20,
            sortBy = 'timestamp',     // NEW: Default sort
            sortOrder = 'desc'        // NEW: Default order
        } = req.query;

        let rawSymbols = req.query.symbols;
        if (!rawSymbols && req.query['symbols[]']) {
            rawSymbols = req.query['symbols[]'];
        }

        const volThreshold = parseInt(volume, 10) || 100000;
        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

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

        if (rawSymbols) {
            let symbolsArr;
            if (Array.isArray(rawSymbols)) {
                symbolsArr = rawSymbols;
            } else if (typeof rawSymbols === 'string') {
                symbolsArr = rawSymbols.split(',').map(s => s.trim()).filter(Boolean);
            }
            if (symbolsArr.length) {
                query.symbol = { $in: symbolsArr };
            }
        }

        // 🆕 Sort handling
        const allowedFields = ['timestamp', 'volumeDelta', 'tradeValue'];
        const sortField = allowedFields.includes(sortBy) ? sortBy : 'timestamp';
        const sortDirection = sortOrder === 'asc' ? 1 : -1;
        const sortConfig = { [sortField]: sortDirection };

        const spikes = await Spike.find(query)
            .sort(sortConfig)
            .skip(skip)
            .limit(parseInt(limit, 10));

        const total = await Spike.countDocuments(query);

        res.json({ spikes, total });
    } catch (err) {
        console.error("Error fetching spikes:", err);
        res.status(500).json({ error: "Failed to fetch spikes" });
    }
}

module.exports = { getSpikes };
