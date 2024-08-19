const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Environment variables from Vercel's system (already set in the dashboard)
const token = process.env.TELEGRAM_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const bot = new TelegramBot(token, { polling: false });

// Function to get BTC price
async function getBTCPrice() {
  try {
    const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
    return response.data.price;
  } catch (error) {
    console.error('Error fetching BTC price:', error);
    return null;
  }
}

// Vercel function handler
module.exports = async (req, res) => {
  const btcPrice = await getBTCPrice();
  if (btcPrice) {
    const message = `Current BTC price: $${parseFloat(btcPrice).toFixed(2)}`;
    bot.sendMessage(chatId, message)
      .then(() => {
        console.log('Message sent successfully');
        res.status(200).json({ status: 'success', message: 'Message sent' });
      })
      .catch((error) => {
        console.error('Error sending message:', error);
        res.status(500).json({ status: 'error', message: 'Failed to send message' });
      });
  } else {
    res.status(500).json({ status: 'error', message: 'Failed to fetch BTC price' });
  }
};
