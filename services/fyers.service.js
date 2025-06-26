const { fyersModel } = require("fyers-api-v3");
const fyers = new fyersModel();

function initFyers({ APP_ID, REDIRECT_URL }) {
    fyers.setAppId(APP_ID);
    fyers.setRedirectUrl(REDIRECT_URL);
}

function setAccessToken(token) {
    fyers.setAccessToken(token);
}

function generateToken({ APP_ID, SECRET_KEY, FYERS_AUTH_TOKEN }) {
    return fyers.generate_access_token({
        client_id: APP_ID,
        secret_key: SECRET_KEY,
        auth_code: FYERS_AUTH_TOKEN,
    });
}

function getOptionChain(symbol, strikecount = 3) {
    return fyers.getOptionChain({
        symbol,
        strikecount,
        timestamp: "",
    });
}

module.exports = {
    initFyers,
    setAccessToken,
    generateToken,
    getOptionChain,
};
