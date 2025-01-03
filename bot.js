require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const prompts = require('./prompts');

// Инициализация Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Создаем бота
const bot = new TelegramBot(process.env.BOT_TOKEN, {polling: true});

// Сохраняем последние ответы и сообщения пользователей
const userMessages = new Map();
const lastResponses = new Map();

// Добавляем Map для отслеживания режима менеджера
const managerMode = new Map();

// Функция для получения ответа от Gemini
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

async function sendResponseWithButton(chatId, userMessage) {
  try {
    bot.sendChatAction(chatId, 'typing');
    let response = await getGeminiResponse(userMessage);
    
    // Если включен режим менеджера, добавляем ответ менеджера
    // if (managerMode.get(chatId)) {
    //   response = await getGeminiResponse(prompts.manager(response));
    // }
    
    userMessages.set(chatId, userMessage);
    lastResponses.set(chatId, response);
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔄', callback_data: 'regenerate' },
          { text: '❤️', callback_data: 'like' },
          { text: '📝', callback_data: 'improve' }
        ]
      ]
    };
    
    bot.sendMessage(chatId, response, { reply_markup: keyboard });
  } catch (error) {
    console.error('Ошибка:', error);
    bot.sendMessage(chatId, 'Произошла ошибка при обработке вашего сообщения.');
  }
}

// Обработчик для всех входящих сообщений
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text;

  // Обработка команды переключения режима менеджера
//   if (userMessage === '👨‍💼 Менеджер') {
//     const currentMode = !managerMode.get(chatId);
//     managerMode.set(chatId, currentMode);
//     const status = currentMode ? 'включен' : 'выключен';
//     bot.sendMessage(chatId, `Режим менеджера ${status}`, {
//       reply_markup: {
//         keyboard: [
//           [{ text: '👨‍💼 Менеджер' }]
//         ],
//         resize_keyboard: true
//       }
//     });
//     return;
//   }

  await sendResponseWithButton(chatId, userMessage);
});

// При старте бота отправляем клавиатуру
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  managerMode.set(chatId, false);
  
//   bot.sendMessage(chatId, 'Добро пожаловать! Используйте кнопку "Менеджер" для переключения режима.', {
//     reply_markup: {
//       keyboard: [
//         [{ text: '👨‍💼 Менеджер' }]
//       ],
//       resize_keyboard: true
//     }
//   });
});

// Обновленный обработчик для нажатия на кнопки
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  
  if (query.data === 'regenerate') {
    const lastMessage = userMessages.get(chatId);
    if (lastMessage) {
      await sendResponseWithButton(chatId, lastMessage);
    }
  } else if (query.data === 'like') {
    bot.sendMessage(chatId, '❤️ Спасибо за вашу оценку!');
  } else if (query.data === 'improve') {
    const lastResponse = lastResponses.get(chatId);
    if (lastResponse) {
      bot.sendChatAction(chatId, 'typing');
      const improvedResponse = await getGeminiResponse(prompts.improve(lastResponse));
      bot.sendMessage(chatId, improvedResponse);
    }
  }
  
  bot.answerCallbackQuery(query.id);
});

console.log('Бот запущен'); 