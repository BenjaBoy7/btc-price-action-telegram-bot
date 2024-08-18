const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
  
// Replace 'YOUR_BOT_API_TOKEN' with your bot's token from the BotFather
const token =  process.env.TELEGRAM_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: false});

// Replace 'CHAT_ID' with the chat ID or the user ID you want to send the message to
const chatId =  process.env.TELEGRAM_CHAT_ID;

  // Function to get BTC price from Binance
  async function getBTCPrice() {
    try {
      const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
      return response.data.price;
    } catch (error) {
      console.error('Error fetching BTC price:', error);
      return null;
    }
  }
  
  // Function to send BTC price to Telegram every 1 minute
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
  
  // Send BTC price immediately and then every 1 minute (60,000 ms)
  sendBTCPrice();
  setInterval(sendBTCPrice, 60000);  // 60 seconds
  