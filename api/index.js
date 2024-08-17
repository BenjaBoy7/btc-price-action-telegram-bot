const axios = require('axios');
const { Telegraf } = require('telegraf');
const { RSI, EMA, MACD, BollingerBands } = require('technicalindicators');

// Configuration: Add your bot token and chat ID
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Initialize the Telegram bot
const bot = new Telegraf(TELEGRAM_TOKEN);

// Configuration: Trading parameters
const RSI_PERIOD = 14;
const SHORT_EMA_PERIOD = 12;
const LONG_EMA_PERIOD = 26;
const BOLLINGER_PERIOD = 20;
const BOLLINGER_STD_DEV = 2;

const BINANCE_API_URL = 'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=';

// Store price history for 5-minute and 15-minute charts
let priceHistory5Min = [];
let priceHistory15Min = [];

// Function to fetch the BTC price history from Binance for a specific interval
async function fetchBtcPriceHistory(interval) {
    try {
        const response = await axios.get(`${BINANCE_API_URL}${interval}`);
        return response.data.map(candle => parseFloat(candle[4])); // Closing prices
    } catch (error) {
        console.error(`Error fetching BTC price history: ${error}`);
        return null;
    }
}

// Function to send a message via Telegram
async function sendTelegramMessage(message) {
    try {
        await bot.telegram.sendMessage(TELEGRAM_CHAT_ID, message);
        console.log(`Message sent: ${message}`);
    } catch (err) {
        console.error(`Error sending message: ${err}`);
    }
}

// Function to send a test message via Telegram
async function sendTestTelegramMessage() {
    try {
        await sendTelegramMessage('This is a test message from your bot.');
    } catch (error) {
        console.error('Error sending test message:', error);
    }
}

// Function to calculate RSI
function calculateRsi(prices) {
    return RSI.calculate({ values: prices, period: RSI_PERIOD });
}

// Function to calculate MACD
function calculateMacd(prices) {
    return MACD.calculate({
        values: prices,
        fastPeriod: SHORT_EMA_PERIOD,
        slowPeriod: LONG_EMA_PERIOD,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false
    });
}

// Function to calculate EMA (Exponential Moving Average)
function calculateEma(prices, period) {
    return EMA.calculate({ values: prices, period: period });
}

// Function to calculate Bollinger Bands
function calculateBollingerBands(prices) {
    return BollingerBands.calculate({
        period: BOLLINGER_PERIOD,
        values: prices,
        stdDev: BOLLINGER_STD_DEV
    });
}

// Function to calculate Support and Resistance Levels
function calculateSupportResistance(prices) {
    const supportLevels = [];
    const resistanceLevels = [];

    for (let i = 1; i < prices.length - 1; i++) {
        const prev = prices[i - 1];
        const curr = prices[i];
        const next = prices[i + 1];

        // Check for local low (support level)
        if (curr < prev && curr < next) {
            supportLevels.push(curr);
        }

        // Check for local high (resistance level)
        if (curr > prev && curr > next) {
            resistanceLevels.push(curr);
        }
    }

    const latestSupport = Math.min(...supportLevels);
    const latestResistance = Math.max(...resistanceLevels);

    return { latestSupport, latestResistance };
}

// Trading strategy based on RSI, MACD, EMA, and Bollinger Bands
function tradingStrategy(prices5Min, prices15Min) {
    const rsi5Min = calculateRsi(prices5Min);
    const macd5Min = calculateMacd(prices5Min);
    const bollingerBands5Min = calculateBollingerBands(prices5Min);

    const rsi15Min = calculateRsi(prices15Min);
    const macd15Min = calculateMacd(prices15Min);
    const bollingerBands15Min = calculateBollingerBands(prices15Min);

    const ema50_5Min = calculateEma(prices5Min, 50);
    const ema200_5Min = calculateEma(prices5Min, 200);
    const ema50_15Min = calculateEma(prices15Min, 50);
    const ema200_15Min = calculateEma(prices15Min, 200);

    const latestRsi5Min = rsi5Min[rsi5Min.length - 1];
    const latestRsi15Min = rsi15Min[rsi15Min.length - 1];

    const latestMacd5Min = macd5Min[macd5Min.length - 1];
    const latestMacd15Min = macd15Min[macd15Min.length - 1];

    const latestBollinger5Min = bollingerBands5Min[bollingerBands5Min.length - 1];
    const latestBollinger15Min = bollingerBands15Min[bollingerBands15Min.length - 1];

    const latestEma50_5Min = ema50_5Min[ema50_5Min.length - 1];
    const latestEma200_5Min = ema200_5Min[ema200_5Min.length - 1];
    const latestEma50_15Min = ema50_15Min[ema50_15Min.length - 1];
    const latestEma200_15Min = ema200_15Min[ema200_15Min.length - 1];

    // Define buy/sell strategy
    if (latestRsi5Min < 30 && latestRsi15Min < 30 && latestMacd5Min.MACD > latestMacd5Min.signal && latestMacd15Min.MACD > latestMacd15Min.signal) {
        return 'buy';  // RSI oversold and MACD bullish crossover on both 5-min and 15-min charts
    } else if (latestRsi5Min > 70 && latestRsi15Min > 70 && latestMacd5Min.MACD < latestMacd5Min.signal && latestMacd15Min.MACD < latestMacd15Min.signal) {
        return 'sell'; // RSI overbought and MACD bearish crossover on both 5-min and 15-min charts
    } else if (latestEma50_5Min > latestEma200_5Min && latestEma50_15Min > latestEma200_15Min) {
        return 'buy'; // Golden cross on both 5-min and 15-min charts (EMA 50 > EMA 200)
    } else if (latestEma50_5Min < latestEma200_5Min && latestEma50_15Min < latestEma200_15Min) {
        return 'sell'; // Death cross on both 5-min and 15-min charts (EMA 50 < EMA 200)
    } else {
        return 'hold'; // No action
    }
}

// Main function to monitor BTC price and apply the trading strategy
async function monitorBtcPrice() {
    const prices5Min = await fetchBtcPriceHistory('5m');  // Fetch 5-minute price history
    const prices15Min = await fetchBtcPriceHistory('15m'); // Fetch 15-minute price history

    if (prices5Min && prices15Min) {
        priceHistory5Min = prices5Min;
        priceHistory15Min = prices15Min;

        console.log('Fetched price history for both 5m and 15m intervals.');

        if (priceHistory5Min.length >= LONG_EMA_PERIOD && priceHistory15Min.length >= LONG_EMA_PERIOD) {
            const action = tradingStrategy(priceHistory5Min, priceHistory15Min);
            const currentPrice = priceHistory5Min[priceHistory5Min.length - 1]; // Latest 5-min price

            const { latestSupport, latestResistance } = calculateSupportResistance(priceHistory15Min);

            if (action === 'buy') {
                const message = `📈 BUY BTC NOW! 
                Price: $${currentPrice.toFixed(2)} 
                Stop Loss: Below support level at $${latestSupport.toFixed(2)}
                Take Profit at resistance level: $${latestResistance.toFixed(2)}
                (RSI/MACD/Bollinger/EMA strategy)`;
                await sendTelegramMessage(message);
            } else if (action === 'sell') {
                const message = `📉 SELL BTC NOW! Price: $${currentPrice.toFixed(2)} (RSI/MACD/Bollinger/EMA strategy)`;
                await sendTelegramMessage(message);
            } else {
                console.log('Hold action, no trade.');
            }
        }
    } else {
        console.log('Could not fetch BTC price history.');
    }
}

// Vercel serverless function handler
module.exports = async (req, res) => {
    try {
        await monitorBtcPrice();
        res.status(200).send('Monitoring BTC price...');
    } catch (error) {
        console.error('Error in serverless function:', error);
        res.status(500).send('Internal Server Error');
    }
};
