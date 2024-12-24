// main.js (не удалять строку)

import { Telegram } from 'puregram';
import dotenv from 'dotenv';
import axios from 'axios';
import * as log from './service/logging.js';
import {
    findOrCreateUser,
    incrementMessageCount,
    incrementInlineInteractionCount,
    toggleUserTheme,
    toggleUserLanguage
} from './service/userService.js';
import mongoose from 'mongoose';
import * as keyboard from './service/keyboards.js';
import { initializeAccessToken, getAccessToken } from './service/apiService.js';

dotenv.config();

// Подключаемся к базе данных
mongoose.connect(process.env.MONGO_URI)
    .then(() => log.databaseConnect())
    .catch(err => log.databaseConnectError(err));

const telegram = Telegram.fromToken(process.env.API_TOKEN);

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

// Функция для формирования стартового сообщения
const generateStartMessage = (userId, userData) => {
    // Если данные отсутствуют, пользователь считается неактивным
    const isActive = userData?.status === 'active';
    const expireDate = userData?.expire
        ? new Date(userData.expire * 1000).toLocaleDateString('ru-RU')
        : 'Неизвестно';

    let trafficInfo = '';
    if (isActive) {
        const remainingTraffic = ((userData.data_limit - userData.used_traffic) / (1024 ** 3)).toFixed(1); // ГБ
        const totalTraffic = (userData.data_limit / (1024 ** 3)).toFixed(0); // ГБ
        trafficInfo = `\nТрафик: ${remainingTraffic}/${totalTraffic} ГБ`;
    }

    const status = isActive ? `до ${expireDate}` : 'Не активен';

    // Формируем сообщение
    return `ID: ${userId}\nСтатус: ${status}${trafficInfo}`;
};

// Функция для отправки стартового сообщения
const sendStartMessage = async (context) => {
    try {
        const userData = await getUserData(context.senderId);
        const message = generateStartMessage(context.senderId, userData);

        await context.send(message, {
            reply_markup: await keyboard.start(context.senderId),
            parse_mode: 'markdown'
        });
    } catch (error) {
        console.error('Error sending start message:', error);
        await context.send('Произошла ошибка при загрузке данных пользователя.');
    }
};

// Обработчик инлайн-кнопок
telegram.updates.on('callback_query', async (context) => {
    log.Action(context);

    await incrementInlineInteractionCount(context.senderId);

    const action = context.data;
    switch (action) {
        case 'settings':
            await context.message.editText('Settings opened', {
                reply_markup: keyboard.settings
            });
            await context.answerCallbackQuery();
            break;
            

        case 'backToSettings':
            break;


        case 'changeTheme':
            try {
                const newTheme = await toggleUserTheme(context.senderId);
                await context.answerCallbackQuery({
                    text: `Theme successfully switched to: ${newTheme}`,
                    show_alert: true
                });
            } catch (err) {
                console.error('Error while switching theme:', err);
                await context.answerCallbackQuery({
                    text: 'Error while switching theme',
                    show_alert: true
                });
            }
            break;

        case 'changeLanguage':
            try {
                const newLanguage = await toggleUserLanguage(context.senderId);
                await context.answerCallbackQuery({
                    text: `Language successfully switched to: ${newLanguage}`,
                    show_alert: true
                });
            } catch (err) {
                console.error('Error while switching language', err);
                await context.answerCallbackQuery({
                    text: 'Error while switching language',
                    show_alert: true
                });
            }
            break

        case 'backToStart':
            try {
                const userData = await getUserData(context.senderId);
                const message = generateStartMessage(context.senderId, userData);

                await context.message.editText(message, {
                    reply_markup: await keyboard.start(context.senderId),
                    parse_mode: 'markdown'
                });
            } catch (err) {
                console.error('Error while returning to start screen:', err);
                await context.answerCallbackQuery({
                    text: 'Произошла ошибка при возврате в главное меню.',
                    show_alert: true
                });
            }
            await context.answerCallbackQuery();
            break;

        case 'configList': {
            const userData = await getUserData(context.senderId);
            
            // Генерация клавиатуры с конфигами
            await context.message.editText('Choose a config:', {
                reply_markup: keyboard.generateConfigList(userData),
                parse_mode: 'markdown'
            });
        
            await context.answerCallbackQuery();
            break;
        }
        
        // Возврат к списку конфигов
        case 'backToConfiList': {
            const userData = await getUserData(context.senderId);
    
            if (!userData) {
                await context.answerCallbackQuery({
                    text: 'Error retrieving configs',
                    show_alert: true
                });
                return;
            }
        
            await context.message.editText('Choose a config:', {
                reply_markup: keyboard.generateConfigList(userData),
                parse_mode: 'markdown'
            });
        
            await context.answerCallbackQuery();
        break;
        }

        case 'refreshStatus':
            try {
                const userData = await getUserData(context.senderId);
                const newMessage = generateStartMessage(context.senderId, userData);
                const currentMessage = context.message.text;
        
                // Проверяем, отличается ли новое сообщение от текущего
                if (currentMessage !== newMessage) {
                    // Обновляем сообщение только если оно изменилось
                    await context.message.editText(newMessage, {
                        reply_markup: await keyboard.start(context.senderId),
                        parse_mode: 'markdown'
                    });
                } else {
                    // Уведомляем пользователя, что изменений нет
                    await context.answerCallbackQuery({
                        text: 'Нет изменений',
                        show_alert: false // Отображение уведомления в нижней части экрана
                    });
                }
            } catch (err) {
                console.error('Error refreshing status:', err);
                await context.answerCallbackQuery({
                    text: 'Ошибка при обновлении информации. Попробуйте позже',
                    show_alert: true
                });
            }
            break;
                
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

                // Парсинг action для получения типа протокола и индекса
                const [, protocol, index] = action.split('_'); // Пример: config_vless_0 -> [config, vless, 0]
                const configIndex = parseInt(index, 10);

                // Получение ссылки по протоколу и индексу
                const configLinks = userData.links.filter(link => link.toLowerCase().includes(protocol));
                const configLink = configLinks[configIndex]; // Индексация по фильтрованному массиву

                if (!configLink) {
                    await context.answerCallbackQuery({
                    text: 'Config not found',
                    show_alert: true
                    });
                    
                    return;
                }   

                try {
                    // Отправляем сообщение с конфигом и кнопкой "Back"
                    await context.message.editText(`\`${configLink}\``, {
                        reply_markup: keyboard.config,
                        parse_mode: 'markdown'
                    });
                } catch (err) {
                    console.error('Error displaying config:', err);
                    await context.answerCallbackQuery({
                        text: 'Error displaying config',
                        show_alert: true
                    });
                }

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
