const TelegramBot = require('node-telegram-bot-api');

// Replace 'YOUR_BOT_API_TOKEN' with your bot's token from the BotFather
const token =  process.env.TELEGRAM_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: false});

// Replace 'CHAT_ID' with the chat ID or the user ID you want to send the message to
const chatId =  process.env.TELEGRAM_CHAT_ID;

// Message to send
const message = 'Hello from my Telegram bot!';

// Send the message
bot.sendMessage(chatId, message)
  .then(() => {
    console.log('Message sent successfully');
  })
  .catch((error) => {
    console.error('Error sending message:', error);
  });

