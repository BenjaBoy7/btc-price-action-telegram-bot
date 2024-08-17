const axios = require('axios');
const { Telegraf } = require('telegraf');
const { RSI, EMA, MACD, BollingerBands } = require('technicalindicators');

// Configuration: Add your bot token and chat ID
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Initialize the Telegram bot
const bot = new Telegraf(TELEGRAM_TOKEN);

const BINANCE_API_URL = 'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=';

async function fetchBtcPriceHistory(interval) {
    try {
        const response = await axios.get(`${BINANCE_API_URL}${interval}`);
        return response.data.map(candle => parseFloat(candle[4])); // Closing prices
    } catch (error) {
        console.error(`Error fetching BTC price history: ${error}`);
        return null;
    }
}

function sendTelegramMessage(message) {
    bot.telegram.sendMessage(TELEGRAM_CHAT_ID, message)
        .then(() => console.log(`Message sent: ${message}`))
        .catch(err => console.error(`Error sending message: ${err}`));
}

async function monitorBtcPrice() {
    const prices5Min = await fetchBtcPriceHistory('5m');
    if (prices5Min) {
        const latestPrice = prices5Min[prices5Min.length - 1];
        const message = `📈 BTC Price: $${latestPrice.toFixed(2)}`;
        sendTelegramMessage(message);
    }
}

module.exports = async (req, res) => {
    await monitorBtcPrice();
    res.status(200).send('BTC price sent to Telegram.');
};
