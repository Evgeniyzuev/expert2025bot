const TelegramBot = require('node-telegram-bot-api');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const prompts = require('../prompts');

const bot = new TelegramBot(process.env.BOT_TOKEN);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Те же функции из bot.js
async function getGeminiResponse(prompt) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Ошибка при запросе к Gemini:', error);
    return 'Извините, произошла ошибка при обработке вашего запроса.';
  }
}

async function handleUpdate(req, res) {
  try {
    const { body } = req;
    
    if (body.message) {
      const { chat: { id }, text } = body.message;
      
      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔄', callback_data: 'regenerate' },
            { text: '❤️', callback_data: 'like' },
            { text: '📝', callback_data: 'improve' }
          ]
        ]
      };

      const response = await getGeminiResponse(text);
      await bot.sendMessage(id, response, { reply_markup: keyboard });
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to process update' });
  }
}

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    await handleUpdate(req, res);
  } else {
    res.status(200).json({ ok: true });
  }
};
