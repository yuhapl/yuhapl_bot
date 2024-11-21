// main.js (не удалять строку)

import { Telegram } from 'puregram';  //  Телеграм-библиотека
import dotenv from 'dotenv';  //  Конфиг
import * as log from './service/logging.js';
import {
    findOrCreateUser,
    incrementMessageCount,
    incrementInlineInteractionCount,
    toggleUserTheme
} from './service/userService.js'; //  Импорт сервисов
import mongoose from 'mongoose';
import { startKeyboard, settingsKeyboard, backToStartKeyboard } from './service/keyboards.js'; //  Импорт клавиатур
import { getAccessToken } from './service/apiService.js'; // Импорт API сервиса

// Загружаем переменные окружения из .env файла
dotenv.config();

// Подключаемся к базе данных
mongoose.connect(process.env.MONGO_URI)
    .then(() => log.databaseConnect())
    .catch(err => log.databaseConnectError(err));

// Инициализируем бота с токеном из /.env
const telegram = Telegram.fromToken(process.env.API_TOKEN);

// Функция для отправки стартового сообщения
const sendStartMessage = async (context) => {
    await context.send('Start', {
        reply_markup: await startKeyboard(context.senderId),  // Используем асинхронный вызов для startKeyboard
        parse_mode: 'markdown'
    });
};

// Обработчик команды /start
telegram.updates.on('message', async (context) => {
    log.Action(context);
    await incrementMessageCount(context.senderId);

    if (context.text === '/start') {
        const userData = {
            user_id: context.senderId,
        };
        await findOrCreateUser(userData);
        await sendStartMessage(context);
    }
});

// Обработчик инлайн-кнопок
telegram.updates.on('callback_query', async (context) => {
    log.Action(context);

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

        case 'configs':
            await context.answerCallbackQuery({
                text: 'Temp text',  // Отправляем текст при нажатии на кнопку "Configs"
                show_alert: true
            });
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
        log.StartPolling(botUsername);

        // Получаем токен из API сервиса
        const token = getAccessToken();
        log.TokenUpdate(token);

    } catch (err) {
        log.TokenUpdateError(err);
    }
})();
