const axios = require('axios');
const { Telegraf } = require('telegraf');
const { RSI, EMA, MACD, BollingerBands, ATR } = require('technicalindicators');

// Configuration: Add your bot token and chat ID
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Initialize the Telegram bot
const bot = new Telegraf(TELEGRAM_TOKEN);

// Configuration: Trading parameters
const RSI_PERIOD = 14;
const ATR_PERIOD = 14;
const BOLLINGER_PERIOD = 20;
const BOLLINGER_STD_DEV = 2;
const EMA_SHORT_PERIOD = 12;
const EMA_LONG_PERIOD = 26;
const MACD_SIGNAL_PERIOD = 9;

const BINANCE_API_URL = 'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=';

// Function to fetch the BTC price history from Binance for a specific interval
async function fetchBtcPriceHistory(interval) {
    try {
        const response = await axios.get(`${BINANCE_API_URL}${interval}`);
        return response.data.map(candle => ({
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
        }));
    } catch (error) {
        console.error(`Error fetching BTC price history: ${error}`);
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

// Function to send a message via Telegram
function sendTelegramMessage(message) {
    bot.telegram.sendMessage(TELEGRAM_CHAT_ID, message)
        .then(() => console.log(`Message sent: ${message}`))
        .catch(err => console.error(`Error sending message: ${err}`));
}

// Function to format message
function formatMessage(price, tp1, tp2, tp3, sl, macdSignal, rsiLevel, rsiSignal, emaSignal, bbSignal, atrSignal) {
    return `
📊 *BTC Trade Update*:

📈 BUY @: $${price.toFixed(2)}

🎯 TP1: $${tp1.toFixed(2)}
🎯 TP2: $${tp2.toFixed(2)}
🎯 TP3: $${tp3.toFixed(2)}

🚨 SL: $${sl.toFixed(2)}

💹 Indicators:
- MACD: ${macdSignal ? 'BUY 📈' : 'SELL 📉'}
- RSI (${rsiLevel.toFixed(2)}): ${rsiSignal ? 'BUY 📈' : 'SELL 📉'}
- EMA: ${emaSignal ? 'BUY 📈' : 'SELL 📉'}
- Bollinger Band: ${bbSignal ? 'BUY 📈' : 'SELL 📉'}
- ATR: ${atrSignal ? 'BUY 📈' : 'SELL 📉'}

⚠️ _Always do your own research before making any trades._
`;
}

// Main function to monitor BTC price and check indicators
async function monitorBtcPrice() {
    const priceData5Min = await fetchBtcPriceHistory('5m'); // Fetch 5-minute price data
    const priceData1Hr = await fetchBtcPriceHistory('1h'); // Fetch 1-hour price data (for broader view)

    if (priceData5Min && priceData5Min.length >= RSI_PERIOD && priceData1Hr.length >= ATR_PERIOD) {
        const highs = priceData5Min.map(data => data.high);
        const lows = priceData5Min.map(data => data.low);
        const closes = priceData5Min.map(data => data.close);

        // Calculate ATR for volatility and determine support levels
        const atrValues = calculateAtr(highs, lows, closes);
        const latestAtr = atrValues[atrValues.length - 1];
        const latestPrice = closes[closes.length - 1];

        // Bollinger Bands, RSI, MACD, and EMA calculation
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

        // Determine buy/sell signals based on indicators
        const rsiSignal = latestRsi < 30;
        const macdSignal = latestMacd.MACD > latestMacd.signal;
        const emaSignal = latestEmaShort > latestEmaLong;
        const bbSignal = latestPrice <= latestBollinger.lower; // Price near lower Bollinger Band
        const atrSignal = latestPrice <= Math.min(...lows) + latestAtr; // Price near ATR low

        // Calculate Take Profit (TP) levels and Stop Loss (SL)
        const tp1 = latestPrice * 1.0075; // 0.75% increase
        const tp2 = latestPrice * 1.015;  // 1.5% increase
        const tp3 = latestPrice * 1.02;   // 2% increase
        const sl = Math.min(...lows) - latestAtr; // SL right below support (ATR-based)

        // Check if at least 2 signals align for a BUY signal
        const buySignals = [rsiSignal, macdSignal, emaSignal, bbSignal, atrSignal].filter(signal => signal).length;

        if (buySignals >= 2) { // At least 2 indicators showing BUY
            const message = formatMessage(
                latestPrice, tp1, tp2, tp3, sl,
                macdSignal, latestRsi, rsiSignal,
                emaSignal, bbSignal, atrSignal
            );
            sendTelegramMessage(message);
        } else {
            console.log('No valid buy signal: Not enough indicators aligned.');
        }
    } else {
        console.log('Not enough data to calculate indicators.');
    }
}

// Handle serverless function execution
module.exports = async (req, res) => {
    await monitorBtcPrice();
    res.status(200).send('Monitoring BTC price...');
};

// Start the bot (only needed if you're not deploying as a serverless function)
// bot.launch();
// console.log('Bot started, monitoring BTC price...');
