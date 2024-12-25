// main.js (не удалять строку)

import { Telegram, MediaSource } from 'puregram';
import dotenv from 'dotenv';
import axios from 'axios';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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

    const isActive = userData?.status === 'active';
    const expireDate = userData?.expire
        ? `до ${new Date(userData.expire * 1000).toLocaleDateString('ru-RU')}`
        : '∞';

    const trafficInfo = isActive ? (
        userData.data_limit === null
            ? `Трафик: ∞ ГБ`
            : `Трафик: ${((userData.data_limit - userData.used_traffic) / (1024 ** 3)).toFixed(1)}/${(userData.data_limit / (1024 ** 3)).toFixed(0)} ГБ`
    ) : '';

    const status = isActive ? `Статус: ${expireDate}` : 'Не активен';

    return `#️⃣ ID: ${userId}\n📅 ${status}\n📶 ${trafficInfo}`;
};

// Функция для отправки стартового сообщения
const sendStartMessage = async (context) => {
    try {
        // Получение данных пользователя из MongoDB
        const user = await findOrCreateUser({ user_id: context.senderId });
        if (!user) {
            throw new Error('User not found in local database.');
        }

        const userTheme = user.theme || 'light';
        const imagePath = `./themes/${userTheme}/start.png`;

        const userData = await getUserData(context.senderId);
        const message = generateStartMessage(context.senderId, userData);

        // Отправка картинки с сообщением
        await context.sendPhoto(
            MediaSource.path(imagePath),
            {
                caption: message,
                reply_markup: await keyboard.start(context.senderId),
                parse_mode: 'markdown'
            }
        );
    } catch (error) {
        console.error('Error sending start message:', error);
        await context.send('Произошла ошибка при загрузке данных пользователя.');
    }
};

// Функция для генерации хэша
function generateHash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

// Создание директории, если она не существует
const cacheQrDir = './cache/qr';
if (!fs.existsSync(cacheQrDir)) {
    fs.mkdirSync(cacheQrDir, { recursive: true });
}

// Обработчик инлайн-кнопок
telegram.updates.on('callback_query', async (context) => {
    log.Action(context);

    await incrementInlineInteractionCount(context.senderId);

    const action = context.data;
    switch (action) {
        case 'settings':
            try {
                // Получение данных пользователя из MongoDB
                const user = await findOrCreateUser({ user_id: context.senderId });
                if (!user) {
                    throw new Error('User not found in local database.');
                }
        
                const userTheme = user.theme || 'light';
                const imagePath = `./themes/${userTheme}/settings.png`;
        
                // Редактирование сообщения с медиа
                if (context.message.photo || context.message.document) {
                    await context.message.editMessageMedia({
                        type: 'photo',
                        media: MediaSource.path(imagePath),
                        caption: '',
                        parse_mode: 'markdown'
                    }, {
                        reply_markup: keyboard.settings
                    });
                } else {
                    await context.message.editText('Settings opened', {
                        reply_markup: keyboard.settings,
                        parse_mode: 'markdown'
                    });
                }
        
                await context.answerCallbackQuery();
            } catch (error) {
                console.error('Error while opening settings:', error);
        
                await context.answerCallbackQuery({
                    text: 'Произошла ошибка при открытии настроек.',
                    show_alert: false
                });
            }
            break;

        case 'changeTheme':
            try {
                const newTheme = await toggleUserTheme(context.senderId);
                const imagePath = `./themes/${newTheme}/settings.png`;

                if (context.message.photo || context.message.document) {
                    await context.message.editMessageMedia({
                        type: 'photo',
                        media: MediaSource.path(imagePath),
                        caption: '',
                        parse_mode: 'markdown'
                    }, {
                        reply_markup: keyboard.settings
                    });
                } else {
                    await context.message.editText('Settings updated', {
                        reply_markup: keyboard.settings,
                        parse_mode: 'markdown'
                    });
                }

                await context.answerCallbackQuery({
                    text: `Тема изменена: ${newTheme}`,
                    show_alert: false
                });
            } catch (err) {
                console.error('Error while switching theme:', err);
                await context.answerCallbackQuery({
                    text: 'Error while switching theme',
                    show_alert: false
                });
            }
            break;

        case 'changeLanguage':
            try {
                const newLanguage = await toggleUserLanguage(context.senderId);
                await context.answerCallbackQuery({
                    text: `Функция в разработке.\nЯзык изменён ${newLanguage}`,
                    show_alert: false
                });
            } catch (err) {
                console.error('Error while switching language', err);
                await context.answerCallbackQuery({
                    text: 'Error while switching language',
                    show_alert: false
                });
            }
            break

        case 'backToStart':
            try {
                // Получение данных пользователя из локальной базы MongoDB
                const user = await findOrCreateUser({ user_id: context.senderId });
        
                if (!user) {
                    throw new Error('User not found in local database.');
                }
        
                const userTheme = user.theme || 'light';
                const imagePath = `./themes/${userTheme}/start.png`;
        
                const message = generateStartMessage(context.senderId, await getUserData(context.senderId));
        
                // Проверяем, содержит ли сообщение медиа или текст
                if (context.message.photo || context.message.document) {
                    // Если сообщение содержит медиа, редактируем его через editMessageMedia
                    await context.message.editMessageMedia({
                        type: 'photo',
                        media: MediaSource.path(imagePath),
                        caption: message,
                        parse_mode: 'markdown'
                    }, {
                        reply_markup: await keyboard.start(context.senderId)
                    });
                } else {
                    // Если сообщение содержит текст, редактируем текст
                    await context.message.editText(message, {
                        reply_markup: await keyboard.start(context.senderId),
                        parse_mode: 'markdown'
                    });
                }
        
                await context.answerCallbackQuery();
            } catch (err) {
                console.error('Error while returning to start screen:', err);
        
                await context.answerCallbackQuery({
                    text: 'Произошла ошибка при возврате в главное меню.',
                    show_alert: false
                });
            }
            break;

        case 'configList': {
            try {
                const user = await findOrCreateUser({ user_id: context.senderId });
                if (!user) {
                    throw new Error('User not found in local database.');
                }
        
                const userTheme = user.theme || 'light';
                const imagePath = `./themes/${userTheme}/configList.png`;
                const userData = await getUserData(context.senderId);
        
                if (context.message.photo || context.message.document) {
                    await context.message.editMessageMedia({
                        type: 'photo',
                        media: MediaSource.path(imagePath),
                        caption: '',
                        parse_mode: 'markdown'
                    }, {
                        reply_markup: keyboard.generateConfigList(userData)
                    });
                } else {
                    await context.message.editText('', {
                        reply_markup: keyboard.generateConfigList(userData),
                        parse_mode: 'markdown'
                    });
                }
        
                await context.answerCallbackQuery();
            } catch (error) {
                console.error('Error while displaying config list:', error);
        
                await context.answerCallbackQuery({
                    text: 'Произошла ошибка при загрузке списка конфигов.',
                    show_alert: false
                });
            } break;
        }
              
        case 'config_auto': {
            const userData = await getUserData(context.senderId);
            if (!userData || !userData.subscription_url) {
                await context.answerCallbackQuery({
                    text: 'Не удалось получить subscription_url',
                    show_alert: false
                });
                return;
            }
        
            const configLink = userData.subscription_url;
            const configHash = generateHash(configLink);
            const qrCodePath = path.join(cacheQrDir, `${configHash}.png`);
        
            if (fs.existsSync(qrCodePath)) {
                // Отправка существующего QR-кода
                if (context.message.photo || context.message.document) {
                    await context.message.editMessageMedia({
                        type: 'photo',
                        media: MediaSource.path(qrCodePath),
                        caption: `\`\`\`${configLink}\`\`\``,
                        parse_mode: 'markdown'
                    }, {
                        reply_markup: keyboard.config
                    });
                } else if (context.message.text) {
                    await context.message.editText(`\`\`\`${configLink}\`\`\``, {
                        reply_markup: keyboard.config,
                        parse_mode: 'markdown'
                    });
                } else {
                    await context.sendPhoto(
                        MediaSource.path(qrCodePath),
                        {
                            caption: `\`\`\`${configLink}\`\`\``,
                            reply_markup: keyboard.config,
                            parse_mode: 'markdown'
                        }
                    );
                }
            } else {
                try {
                    // Опции для настройки цветов и разрешения QR-кода
                    const qrOptions = {
                        color: {
                            dark: '#474747',
                            light: '#E8E8E8'
                        },
                        width: 720
                    };

                    // Генерация нового QR-кода с опциями
                    await QRCode.toFile(qrCodePath, configLink, qrOptions);

                    // Отправка нового QR-кода
                    if (context.message.photo || context.message.document) {
                        await context.message.editMessageMedia({
                            type: 'photo',
                            media: MediaSource.path(qrCodePath),
                            caption: `\`\`\`${configLink}\`\`\``,
                            parse_mode: 'markdown'
                        }, {
                            reply_markup: keyboard.config
                        });
                    } else if (context.message.text) {
                        await context.message.editText(`\`${configLink}\``, {
                            reply_markup: keyboard.config,
                            parse_mode: 'markdown'
                        });
                    } else {
                        await context.sendPhoto(
                            MediaSource.path(qrCodePath),
                            {
                                caption: `\`\`\`${configLink}\`\`\``,
                                reply_markup: keyboard.config,
                                parse_mode: 'markdown'
                            }
                        );
                    }
                } catch (err) {
                    console.error('Error displaying config:', err);
                    await context.answerCallbackQuery({
                        text: 'Error displaying config',
                        show_alert: false
                    });
                }
            } break;
        }

        case 'backToConfiList': {
            const userData = await getUserData(context.senderId);
    
            if (!userData) {
                await context.answerCallbackQuery({
                    text: 'Error retrieving configs',
                    show_alert: false
                });
                return;
            }

            if (context.message.text) {
                await context.message.editText('Choose a config:', {
                    reply_markup: keyboard.generateConfigList(userData),
                    parse_mode: 'markdown'
                });
            } else if (context.message.photo || context.message.document) {
                await context.message.editMessageMedia({
                    type: 'photo',
                    media: MediaSource.path('./themes/light/configList.png'),
                    caption: 'Choose a config:',
                    parse_mode: 'markdown'
                }, {
                    reply_markup: keyboard.generateConfigList(userData)
                });
            } else {
                await context.send('Choose a config:', {
                    reply_markup: keyboard.generateConfigList(userData),
                    parse_mode: 'markdown'
                });
            }
        
            await context.answerCallbackQuery();
            break;
        }

        case 'advanced_configs': {
            try {
                const userData = await getUserData(context.senderId);
                
                if (!userData) {
                    await context.answerCallbackQuery({
                        text: 'Error retrieving configs',
                        show_alert: false
                    });
                    return;
                }

                if (context.message.photo || context.message.document) {
                    await context.message.editMessageMedia({
                        type: 'photo',
                        media: MediaSource.path('./themes/light/configList.png'),
                        caption: 'Choose a config:',
                        parse_mode: 'markdown'
                    }, {
                        reply_markup: keyboard.generateAdvancedConfigList(userData)
                    });
                } else {
                    await context.message.editText('Choose a config:', {
                        reply_markup: keyboard.generateAdvancedConfigList(userData),
                        parse_mode: 'markdown'
                    });
                }

                await context.answerCallbackQuery();
            } catch (error) {
                console.error('Error while displaying advanced config list:', error);
                await context.answerCallbackQuery({
                    text: 'Произошла ошибка при загрузке расширенного списка.',
                    show_alert: false
                });
            }
            break;
        }

        default:
            if (action.startsWith('config_')) {
                const userData = await getUserData(context.senderId);

                if (!userData) {
                    await context.answerCallbackQuery({
                        text: 'Error retrieving config',
                        show_alert: false
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
                        show_alert: false
                    });
                    
                    return;
                }

                // Генерация хэша для конфигурации
                const configHash = generateHash(configLink);
                const qrCodePath = path.join(cacheQrDir, `${configHash}.png`);

                // Проверка, существует ли уже QR-код
                if (fs.existsSync(qrCodePath)) {
                    // Отправка существующего QR-кода
                    if (context.message.photo || context.message.document) {
                        await context.message.editMessageMedia({
                            type: 'photo',
                            media: MediaSource.path(qrCodePath),
                            caption: `\`\`\`${configLink}\`\`\``,
                            parse_mode: 'markdown'
                        }, {
                            reply_markup: keyboard.config
                        });
                    } else if (context.message.text) {
                        await context.message.editText(`\`${configLink}\``, {
                            reply_markup: keyboard.config,
                            parse_mode: 'markdown'
                        });
                    } else {
                        await context.sendPhoto(
                            MediaSource.path(qrCodePath),
                            {
                                caption: `\`\`\`${configLink}\`\`\``,
                                reply_markup: keyboard.config,
                                parse_mode: 'markdown'
                            }
                        );
                    }
                } else {
                    try {
                        // Опции для настройки цветов и разрешения QR-кода
                        const qrOptions = {
                            color: {
                                dark: '#474747',
                                light: '#E8E8E8'
                            },
                            width: 720
                        };

                        // Генерация нового QR-кода с опциями
                        await QRCode.toFile(qrCodePath, configLink, qrOptions);

                        // Отправка нового QR-кода
                        if (context.message.photo || context.message.document) {
                            await context.message.editMessageMedia({
                                type: 'photo',
                                media: MediaSource.path(qrCodePath),
                                caption: `\`\`\`${configLink}\`\`\``,
                                parse_mode: 'markdown'
                            }, {
                                reply_markup: keyboard.config
                            });
                        } else if (context.message.text) {
                            await context.message.editText(`\`${configLink}\``, {
                                reply_markup: keyboard.config,
                                parse_mode: 'markdown'
                            });
                        } else {
                            await context.sendPhoto(
                                MediaSource.path(qrCodePath),
                                {
                                    caption: `\`\`\`${configLink}\`\`\``,
                                    reply_markup: keyboard.config,
                                    parse_mode: 'markdown'
                                }
                            );
                        }
                    } catch (err) {
                        console.error('Error displaying config:', err);
                        await context.answerCallbackQuery({
                            text: 'Error displaying config',
                            show_alert: false
                        });
                    }
                }

                await context.answerCallbackQuery();
                break;
            }
    }
});

const getUserData = async (userId) => {
    try {
        const token = getAccessToken();
        if (!token) throw new Error('No access token available');

        const response = await axios.get(`${process.env.API_LINK}/api/user/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        return response.data;
    } catch (error) {
        log.isUserActiveError(error.message, userId);
        return null;
    }
};

(async () => {
    try {
        const botInfo = await telegram.api.getMe();
        const botUsername = botInfo.username;

        await telegram.updates.startPolling();
        log.startPolling(botUsername);
        const token = initializeAccessToken ();
    } catch (err) {
        log.setAccessTokenError(err);
    }
})();