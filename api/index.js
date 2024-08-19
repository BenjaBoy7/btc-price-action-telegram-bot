// require('dotenv').config(); // Load environment variables from .env

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Environment variables
// const token = process.env.TELEGRAM_TOKEN;
// const chatId = process.env.TELEGRAM_CHAT_ID;

// Configuration: Add your bot token and chat ID
const token = process.env.TELEGRAM_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const bot = new TelegramBot(token, { polling: false });

async function getBTCPrice() {
  try {
    const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
    return response.data.price;
  } catch (error) {
    console.error('Error fetching BTC price:', error);
    return null;
  }
}

async function sendBTCPrice() {
  const btcPrice = await getBTCPrice();
  if (btcPrice) {
    const message = `Current BTC price: $${parseFloat(btcPrice).toFixed(2)}`;
    bot.sendMessage(chatId, message)
      .then(() => {
        console.log('Message sent successfully');
      })
      .catch((error) => {
        console.error('Error sending message:', error);
      });
  }
}

sendBTCPrice();
setInterval(sendBTCPrice, 60000);  // 60 seconds
