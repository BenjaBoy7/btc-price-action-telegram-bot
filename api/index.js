const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { RSI, EMA, MACD, BollingerBands, ATR } = require('technicalindicators');

// Environment variables from Vercel's system (already set in the dashboard)
const token = process.env.TELEGRAM_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const bot = new TelegramBot(token, { polling: false });

// Trading parameters
const RSI_PERIOD = 14;
const BOLLINGER_PERIOD = 20;
const BOLLINGER_STD_DEV = 2;
const EMA_SHORT_PERIOD = 12;
const EMA_LONG_PERIOD = 26;
const MACD_SIGNAL_PERIOD = 9;
const ATR_PERIOD = 14;

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1';

// Function to fetch BTC price history from CoinGecko
async function fetchBtcPriceHistory() {
    try {
        const response = await axios.get(COINGECKO_API_URL);
        return response.data.prices.map(price => ({
            time: price[0],
            close: price[1]
        }));
    } catch (error) {
        console.error(`Error fetching BTC price history: ${error.response?.status || error.message}`);
        console.error('Error details:', error.response?.data || 'No additional error data');
        return null;
    }
}

// Function to calculate ATR (Average True Range)
function calculateAtr(highs, lows, closes) {
    return ATR.calculate({
        high: highs,
        low: lows,
        close: closes,
        period: ATR_PERIOD
    });
}

// Function to calculate Bollinger Bands
function calculateBollingerBands(prices) {
    return BollingerBands.calculate({
        period: BOLLINGER_PERIOD,
        stdDev: BOLLINGER_STD_DEV,
        values: prices
    });
}

// Function to calculate MACD
function calculateMacd(prices) {
    return MACD.calculate({
        values: prices,
        fastPeriod: EMA_SHORT_PERIOD,
        slowPeriod: EMA_LONG_PERIOD,
        signalPeriod: MACD_SIGNAL_PERIOD
    });
}

// Function to monitor BTC price and check for support points
async function monitorBtcPrice() {
    const priceData = await fetchBtcPriceHistory();

    if (priceData && priceData.length >= RSI_PERIOD) {
        const closes = priceData.map(data => data.close);
        const highs = closes; // Since CoinGecko provides only close prices, we approximate high and low with close prices
        const lows = closes;

        // Calculate indicators
        const atrValues = calculateAtr(highs, lows, closes);
        const bollingerBands = calculateBollingerBands(closes);
        const rsiValues = RSI.calculate({ values: closes, period: RSI_PERIOD });
        const macdValues = calculateMacd(closes);
        const emaShort = EMA.calculate({ values: closes, period: EMA_SHORT_PERIOD });
        const emaLong = EMA.calculate({ values: closes, period: EMA_LONG_PERIOD });

        // Latest indicator values
        const latestRsi = rsiValues[rsiValues.length - 1];
        const latestMacd = macdValues[macdValues.length - 1];
        const latestBollinger = bollingerBands[bollingerBands.length - 1];
        const latestEmaShort = emaShort[emaShort.length - 1];
        const latestEmaLong = emaLong[emaLong.length - 1];
        const latestAtr = atrValues[atrValues.length - 1];
        const latestPrice = closes[closes.length - 1];

        // Identify support level (lowest point in the last 24 hours)
        const supportLevel = Math.min(...lows);

        // Compose the Telegram message
        const message = `
            📊 *BTC 5-Minute Update* 📊
            🕒 *Latest Price*: $${latestPrice.toFixed(2)}
            📉 *Support Level*: $${supportLevel.toFixed(2)}
            
            🧾 *Indicators*:
            - RSI: ${latestRsi.toFixed(2)}
            - MACD: ${latestMacd.MACD.toFixed(2)} (Signal: ${latestMacd.signal.toFixed(2)})
            - Bollinger Bands: Lower ${latestBollinger.lower.toFixed(2)}, Upper ${latestBollinger.upper.toFixed(2)}
            - ATR: ${latestAtr.toFixed(2)}
            - EMA: Short ${latestEmaShort.toFixed(2)}, Long ${latestEmaLong.toFixed(2)}

            _Stay informed with real-time market data!_
        `;
        
        sendTelegramMessage(message);
    } else {
        console.log('Not enough data to calculate indicators.');
    }
}

// Function to send a message via Telegram
function sendTelegramMessage(message) {
    bot.sendMessage(chatId, message)
        .then(() => console.log(`Message sent: ${message}`))
        .catch(err => console.error(`Error sending message: ${err}`));
}

// Vercel function handler
module.exports = async (req, res) => {
    await monitorBtcPrice();
    res.status(200).json({ status: 'BTC price and indicators sent.' });
};
