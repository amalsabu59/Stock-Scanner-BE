

const fyersService = require("./fyers.service");
const websocketService = require("./websocket.service");

const path = require('path');
const fs = require('fs');

const symbolsPath = path.join(__dirname, '../utils/underlyings.json');

const getAllSymbols = () => {
    const raw = fs.readFileSync(symbolsPath);
    return JSON.parse(raw);
};



async function updateOptionSymbols() {
    const UNDERLYINGS = getAllSymbols();
    // const newSymbols = [];
    // const sleep = ms => new Promise(r => setTimeout(r, ms));

    // for (const underlying of UNDERLYINGS) {
    //     const res = await fyersService.getOptionChain(underlying, 3);

    //     if (res.s === "ok" && res.data?.optionsChain?.length) {
    //         res.data.optionsChain.forEach(opt => {
    //             if (opt.symbol) newSymbols.push(opt.symbol);
    //         });
    //     }

    //     await sleep(1000); // prevent rate limit
    // }

    // if (newSymbols.length > 0 && websocketService.isConnected()) {
    // if (currentOptionsSymbols.length) {
    //     websocketService.unsubscribe(currentOptionsSymbols);
    // }
    // const eqSymbols = newSymbols.filter(symbol => symbol.endsWith('EQ'));

    await websocketService.subscribe(UNDERLYINGS);
    // currentOptionsSymbols = newSymbols;

    console.log(`📊 Subscribed to ${UNDERLYINGS.length} option symbols`);
    // if (eqSymbols.length > 0) {
    //     console.log(`📈 Stock symbols ending with 'EQ':`, eqSymbols.length, eqSymbols);
    // }
    // }
}

module.exports = { updateOptionSymbols, getAllSymbols };

