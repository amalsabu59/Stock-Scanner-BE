const symbolService = require('../services/symbols.service');

const getSymbols = (req, res) => {
    try {
        const symbols = symbolService.getAllSymbols();

        const query = req.query.q?.toUpperCase();
        const filtered = query
            ? symbols.filter(sym => sym.includes(query))
            : symbols;

        res.status(200).json({ symbols: filtered });
    } catch (err) {
        console.error('Error fetching symbols:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getSymbols,
};
