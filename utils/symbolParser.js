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

module.exports = { parseFyersSymbol };
