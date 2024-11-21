// main.js (не удалять строку)

import { Telegram } from 'puregram';  //  Телеграм-библиотека
import dotenv from 'dotenv';  //  Конфиг
import { logAction } from './service/logging.js';  //  Логирование
import {
    findOrCreateUser,
    incrementMessageCount,
    incrementInlineInteractionCount,
    toggleUserTheme
} from './service/userService.js'; //  Импорт сервисов
import mongoose from 'mongoose';
import { 
    startKeyboard, 
    settingsKeyboard, 
    backToStartKeyboard 
} from './service/keyboards.js'; //  Импорт клавиатур

// Загружаем переменные окружения из .env файла
dotenv.config();

// Подключаемся к базе данных
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Database connected'))
    .catch(err => console.error('Error connecting to database:', err));

// Инициализируем бота с токеном из /.env
const telegram = Telegram.fromToken(process.env.API_TOKEN);

// Функция для отправки стартового сообщения
const sendStartMessage = async (context) => {
    await context.send('Start', {
        reply_markup: startKeyboard,
        parse_mode: 'markdown'
    });
};

// Обработчик команды /start
telegram.updates.on('message', async (context) => {
    logAction(context);

    await incrementMessageCount(context.senderId);

    if (context.text === '/start') {
        const userData = {
            user_id: context.senderId,
            username: context.sender?.username || null // Проверяем наличие username
        };
        await findOrCreateUser(userData);
        await sendStartMessage(context);
    }
});

// Обработчик инлайн-кнопок
telegram.updates.on('callback_query', async (context) => {
    logAction(context);

    await incrementInlineInteractionCount(context.senderId);

    const action = context.data;
    switch (action) {
        case 'settings':
        case 'backToSettings':
            await context.message.editText('Settings opened', {
                reply_markup: settingsKeyboard
            });
            await context.answerCallbackQuery();
            break;

        case 'changeTheme':
            try {
                const newTheme = await toggleUserTheme(context.senderId);
                await context.message.editText(`Theme successfully switched to: ${newTheme}`, {
                    reply_markup: backToStartKeyboard
                });
            } catch (err) {
                console.error('Error while switching theme:', err);
                await context.answerCallbackQuery({
                    text: 'Error while switching theme',
                    show_alert: true
                });
            }
            await context.answerCallbackQuery();
            break;

        case 'backToStart':
            try {
                await context.message.editText('Start', {
                    reply_markup: startKeyboard,
                    parse_mode: 'markdown'
                });
            } catch (err) {
                console.error('Error while returning to start screen:', err);
                await context.answerCallbackQuery({
                    text: 'Error while returning to start screen',
                    show_alert: true
                });
            }
            await context.answerCallbackQuery();
            break;
   
        default:
            console.error(`Unknown action: ${action}`);
            await context.answerCallbackQuery({
                text: 'Unknown action',
                show_alert: true
            });
            break;
    }
});

// Запуск бота и получение информации о нём
(async () => {
    try {
        const botInfo = await telegram.api.getMe();
        const botUsername = botInfo.username;

        await telegram.updates.startPolling();
        console.log(`@${botUsername} started`);
    } catch (err) {
        console.error('Error starting bot:', err);
    }
})();
