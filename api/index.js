const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { RSI, EMA, MACD, BollingerBands } = require('technicalindicators');

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

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1&interval=minute';

// Function to fetch BTC price history from CoinGecko
async function fetchBtcPriceHistory() {
    try {
        const response = await axios.get(COINGECKO_API_URL);
        return response.data.prices.map(price => ({
            close: price[1]
        }));
    } catch (error) {
        console.error(`Error fetching BTC price history: ${error.response?.status || error.message}`);
        console.error('Error details:', error.response?.data || 'No additional error data');
        return null;
    }
}

// Function to calculate indicators
async function calculateIndicators() {
    const priceData = await fetchBtcPriceHistory();

    if (priceData && priceData.length >= RSI_PERIOD) {
        const closes = priceData.map(data => data.close);

        // Calculate indicators
        const bollingerBands = BollingerBands.calculate({
            period: BOLLINGER_PERIOD,
            stdDev: BOLLINGER_STD_DEV,
            values: closes
        });
        const rsiValues = RSI.calculate({ values: closes, period: RSI_PERIOD });
        const macdValues = MACD.calculate({
            values: closes,
            fastPeriod: EMA_SHORT_PERIOD,
            slowPeriod: EMA_LONG_PERIOD,
            signalPeriod: MACD_SIGNAL_PERIOD
        });
        const emaShort = EMA.calculate({ values: closes, period: EMA_SHORT_PERIOD });
        const emaLong = EMA.calculate({ values: closes, period: EMA_LONG_PERIOD });

        return {
            latestPrice: closes[closes.length - 1],
            latestRsi: rsiValues[rsiValues.length - 1],
            latestMacd: macdValues[macdValues.length - 1],
            latestBollinger: bollingerBands[bollingerBands.length - 1],
            latestEmaShort: emaShort[emaShort.length - 1],
            latestEmaLong: emaLong[emaLong.length - 1]
        };
    } else {
        console.log('Not enough data to calculate indicators.');
        return null;
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
    const indicators = await calculateIndicators();

    if (indicators) {
        const { latestPrice, latestRsi, latestMacd, latestBollinger, latestEmaShort, latestEmaLong } = indicators;

        const message = `
            📈 *BTC Update* 📈
            💰 Price: $${latestPrice.toFixed(2)}
            🧾 Indicators:
            - RSI: ${latestRsi.toFixed(2)}
            - MACD: ${latestMacd.MACD.toFixed(2)} (Signal: ${latestMacd.signal.toFixed(2)})
            - Bollinger Bands: Lower ${latestBollinger.lower.toFixed(2)}, Upper ${latestBollinger.upper.toFixed(2)}
            - EMA: Short ${latestEmaShort.toFixed(2)}, Long ${latestEmaLong.toFixed(2)}
            
            _Stay informed with real-time market data!_
        `;
        sendTelegramMessage(message);
    }

    res.status(200).json({ status: 'BTC price and indicators sent.' });
};

