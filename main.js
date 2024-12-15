// main.js (не удалять строку)

import { Telegram } from 'puregram';  //  Телеграм-библиотека
import dotenv from 'dotenv';  //  Конфиг
import axios from 'axios';
import * as log from './service/logging.js';
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
    backToStartKeyboard,
    generateConfigKeyboard 
} from './service/keyboards.js'; //  Импорт клавиатур
import { initializeAccessToken, getAccessToken } from './service/apiService.js'; // Импорт API сервиса

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
            await context.message.editText('Settings opened', {
                reply_markup: settingsKeyboard
            });
            await context.answerCallbackQuery();
            break;
            

        case 'backToSettings':
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
                const keyboard = await startKeyboard(context.senderId); // Корректно вызываем функцию с userId
                await context.message.editText('Start', {
                    reply_markup: keyboard, // Передаём результат вызова функции
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


        case 'configs': {
            const userData = await getUserData(context.senderId);
            
//            console.log(userData)
            
            // Генерация клавиатуры с конфигами
            const configKeyboard = generateConfigKeyboard(userData);
    
            await context.message.editText('Choose a config:', {
                reply_markup: configKeyboard,
                parse_mode: 'markdown'
            });
        
            await context.answerCallbackQuery();
            break;
        }
        
        // Возврат к списку конфигов
        case 'backToConfigs': {
            const userData = await getUserData(context.senderId);
    
            if (!userData) {
                await context.answerCallbackQuery({
                    text: 'Error retrieving configs',
                    show_alert: true
                });
                return;
            }
        
            const configKeyboard = generateConfigKeyboard(userData);
            await context.message.editText('Choose a config:', {
                reply_markup: configKeyboard,
                parse_mode: 'markdown'
            });
        
            await context.answerCallbackQuery();
            break;
        }

        // Обработка выбора конкретного конфига
        default:
            if (action.startsWith('config_')) {
                const userData = await getUserData(context.senderId);
                if (!userData) {
                    await context.answerCallbackQuery({
                        text: 'Error retrieving config',
                        show_alert: true
                    });
                    return;
                }
        
                const configIndex = parseInt(action.split('_')[1], 10);
                const configLink = userData.links[configIndex];
    
                await context.message.editText(`\`${configLink}\``, {
                    parse_mode: 'markdown'
                });
    
                await context.answerCallbackQuery();
                break;
            }
    }
});

/**
 * Асинхронная функция для получения данных пользователя
 * @param {Number} userId - ID пользователя
 * @returns {Object|null} - Данные пользователя или null в случае ошибки
 */
const getUserData = async (userId) => {
    try {
        const token = getAccessToken();
//        console.log(token)
        if (!token) throw new Error('No access token available');

        const response = await axios.get(`https://sub.yuha.pl/api/user/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        return response.data;
    } catch (error) {
        log.isUserActiveError(error.message, userId);
        return null;
    }
};

// Запуск бота и получение информации о нём
(async () => {
    try {
        const botInfo = await telegram.api.getMe();
        const botUsername = botInfo.username;

        await telegram.updates.startPolling();
        log.startPolling(botUsername);

        // Получаем токен из API сервиса
        const token = initializeAccessToken ();
    } catch (err) {
        log.setAccessTokenError(err);
    }
})();
