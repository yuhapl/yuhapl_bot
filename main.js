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
import { getAccessToken, setAccessToken } from './service/apiService.js';
import { getLocale } from './locales/index.js';

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
const generateStartMessage = async (userId, userData) => {
    const user = await findOrCreateUser({ user_id: userId });
    const locale = await getLocale(userId);

    const isActive = userData?.status === 'active';
    const expireDate = userData?.expire
        ? `${locale.messages.statusActive} ${new Date(userData.expire * 1000).toLocaleDateString()}`
        : '∞';

    const trafficInfo = isActive ? (
        userData.data_limit === null
            ? `${locale.messages.traffic} ${locale.messages.trafficUnlimited}`
            : `${locale.messages.traffic} ${((userData.data_limit - userData.used_traffic) / (1024 ** 3)).toFixed(1)}/${(userData.data_limit / (1024 ** 3)).toFixed(0)} ${locale.messages.gb}`
    ) : '';

    const status = isActive ? `${locale.messages.status} ${expireDate}` : locale.messages.statusInactive;

    return `${locale.messages.id} ${userId}\n${status}\n${trafficInfo}`;
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
        const userLanguage = user.language || 'russian';
        const imagePath = getImagePath(userTheme, userLanguage, 'start');

        const userData = await getUserData(context.senderId);
        const message = await generateStartMessage(context.senderId, userData);

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

// Обновляем функцию для получения пути к изображению UI
const getImagePath = (theme, language, imageName) => {
    return `./themes/${theme}/${language}/${imageName}.png`;
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

// Создание директорий для QR-кодов, если они не существуют
const cacheQrDirDark = './cache/qr/dark';
const cacheQrDirLight = './cache/qr/light';
if (!fs.existsSync(cacheQrDirDark)) {
    fs.mkdirSync(cacheQrDirDark, { recursive: true });
}
if (!fs.existsSync(cacheQrDirLight)) {
    fs.mkdirSync(cacheQrDirLight, { recursive: true });
}

// Обработчик инлайн-кнопок
telegram.updates.on('callback_query', async (context) => {
    log.Action(context);

    await incrementInlineInteractionCount(context.senderId);

    const action = context.data;
    switch (action) {
        case 'settings':
            try {
                const user = await findOrCreateUser({ user_id: context.senderId });
                if (!user) {
                    throw new Error('User not found in local database.');
                }
        
                const userTheme = user.theme || 'light';
                const userLanguage = user.language || 'russian';
                const imagePath = getImagePath(userTheme, userLanguage, 'settings');
        
                if (context.message.photo || context.message.document) {
                    await context.message.editMessageMedia({
                        type: 'photo',
                        media: MediaSource.path(imagePath),
                        caption: '',
                        parse_mode: 'markdown'
                    }, {
                        reply_markup: await keyboard.settings(context.senderId)
                    });
                } else {
                    await context.message.editText('Settings opened', {
                        reply_markup: await keyboard.settings(context.senderId),
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
                const user = await findOrCreateUser({ user_id: context.senderId });
                const userLanguage = user.language || 'russian';
                const imagePath = getImagePath(newTheme, userLanguage, 'settings');

                if (context.message.photo || context.message.document) {
                    await context.message.editMessageMedia({
                        type: 'photo',
                        media: MediaSource.path(imagePath),
                        caption: '',
                        parse_mode: 'markdown'
                    }, {
                        reply_markup: await keyboard.settings(context.senderId)
                    });
                } else {
                    await context.message.editText('Settings updated', {
                        reply_markup: await keyboard.settings(context.senderId),
                        parse_mode: 'markdown'
                    });
                }

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
                const user = await findOrCreateUser({ user_id: context.senderId });
                
                if (!user) {
                    throw new Error('User not found in local database.');
                }

                const userTheme = user.theme || 'light';
                const imagePath = getImagePath(userTheme, newLanguage, 'settings');

                if (context.message.photo || context.message.document) {
                    await context.message.editMessageMedia({
                        type: 'photo',
                        media: MediaSource.path(imagePath),
                        caption: '',
                        parse_mode: 'markdown'
                    }, {
                        reply_markup: await keyboard.settings(context.senderId)
                    });
                } else {
                    await context.message.editText('Settings updated', {
                        reply_markup: await keyboard.settings(context.senderId),
                        parse_mode: 'markdown'
                    });
                }
            } catch (err) {
                console.error('Error while switching language:', err);
                await context.answerCallbackQuery({
                    text: 'Ошибка при смене языка',
                    show_alert: false
                });
            }
            break;

        case 'backToStart':
            try {
                const user = await findOrCreateUser({ user_id: context.senderId });
        
                if (!user) {
                    throw new Error('User not found in local database.');
                }
        
                const userTheme = user.theme || 'light';
                const userLanguage = user.language || 'russian';
                const imagePath = getImagePath(userTheme, userLanguage, 'start');
        
                const message = await generateStartMessage(context.senderId, await getUserData(context.senderId));
        
                if (context.message.photo || context.message.document) {
                    await context.message.editMessageMedia({
                        type: 'photo',
                        media: MediaSource.path(imagePath),
                        caption: message,
                        parse_mode: 'markdown'
                    }, {
                        reply_markup: await keyboard.start(context.senderId)
                    });
                } else {
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
                const userLanguage = user.language || 'russian';
                const imagePath = getImagePath(userTheme, userLanguage, 'configList');
                const userData = await getUserData(context.senderId);

                if (context.message.photo || context.message.document) {
                    await context.message.editMessageMedia({
                        type: 'photo',
                        media: MediaSource.path(imagePath),
                        caption: '',
                        parse_mode: 'markdown'
                    }, {
                        reply_markup: await keyboard.generateConfigList(context.senderId)
                    });
                } else {
                    await context.message.editText('', {
                        reply_markup: await keyboard.generateConfigList(context.senderId),
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
            }
            break;
        }

        case 'config_auto': {
            try {
                const userData = await getUserData(context.senderId);
                if (!userData || !userData.subscription_url) {
                    await context.answerCallbackQuery({
                        text: 'Не удалось получить subscription_url',
                        show_alert: false
                    });
                    return;
                }
                
                const user = await findOrCreateUser({ user_id: context.senderId });
                if (!user) {
                    throw new Error('User not found in local database.');
                }

                const userTheme = user.theme || 'light';
                const userLanguage = user.language || 'russian';
                const configLink = userData.subscription_url;
                const configHash = generateHash(configLink);
                
                // Создаем папку для QR кодов с учетом темы и языка
                const qrCodeDir = path.join(cacheQrDir, userTheme, userLanguage);
                if (!fs.existsSync(qrCodeDir)) {
                    fs.mkdirSync(qrCodeDir, { recursive: true });
                }
                
                const qrCodePath = path.join(qrCodeDir, `${configHash}.png`);

                if (fs.existsSync(qrCodePath)) {
                    // Отправка существующего QR-кода
                    if (context.message.photo || context.message.document) {
                        await context.message.editMessageMedia({
                            type: 'photo',
                            media: MediaSource.path(qrCodePath),
                            caption: `\`${configLink}\``,
                            parse_mode: 'markdown'
                        }, {
                            reply_markup: await keyboard.config(context.senderId)
                        });
                    } else if (context.message.text) {
                        await context.message.editText(`\`${configLink}\``, {
                            reply_markup: await keyboard.config(context.senderId),
                            parse_mode: 'markdown'
                        });
                    } else {
                        await context.sendPhoto(
                            MediaSource.path(qrCodePath),
                            {
                                caption: `\`\`\`${configLink}\`\`\``,
                                reply_markup: await keyboard.config(context.senderId),
                                parse_mode: 'markdown'
                            }
                        );
                    }
                } else {
                    try {
                        // Опции для настройки цветов и разрешения QR-кода
                        const qrOptions = {
                            color: {},
                            width: 1080
                        };
                        
                        if (userTheme === 'dark') {
                            qrOptions.color = {
                                dark: '#C6C6C6',
                                light: '#2A2A2A'
                            };
                        } else if (userTheme === 'light') {
                            qrOptions.color = {
                                dark: '#474747',
                                light: '#E8E8E8'
                            };
                        }

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
                                reply_markup: await keyboard.config(context.senderId)
                            });
                        } else if (context.message.text) {
                            await context.message.editText(`\`${configLink}\``, {
                                reply_markup: await keyboard.config(context.senderId),
                                parse_mode: 'markdown'
                            });
                        } else {
                            await context.sendPhoto(
                                MediaSource.path(qrCodePath),
                                {
                                    caption: `\`\`\`${configLink}\`\`\``,
                                    reply_markup: await keyboard.config(context.senderId),
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
            } catch (err) {
                console.error('Error displaying config:', err);
                await context.answerCallbackQuery({
                    text: 'Error displaying config',
                    show_alert: false
                });
            }
            break;
        }

        case 'backToConfiList': {
            try {
                const user = await findOrCreateUser({ user_id: context.senderId });
                if (!user) {
                    throw new Error('User not found in local database.');
                }

                const userTheme = user.theme || 'light';
                const userLanguage = user.language || 'russian';
                const imagePath = getImagePath(userTheme, userLanguage, 'configList');

                if (context.message.photo || context.message.document) {
                    await context.message.editMessageMedia({
                        type: 'photo',
                        media: MediaSource.path(imagePath),
                        caption: '',
                        parse_mode: 'markdown'
                    }, {
                        reply_markup: await keyboard.generateConfigList(context.senderId)
                    });
                } else {
                    await context.message.editText('', {
                        reply_markup: await keyboard.generateConfigList(context.senderId),
                        parse_mode: 'markdown'
                    });
                }

                await context.answerCallbackQuery();
            } catch (error) {
                console.error('Error while returning to config list:', error);
                await context.answerCallbackQuery({
                    text: 'Произошла ошибка при возврате к списку конфигов.',
                    show_alert: false
                });
            }
            break;
        }

        case 'advanced_configs': {
            try {
                const user = await findOrCreateUser({ user_id: context.senderId });
                if (!user) {
                    throw new Error('User not found in local database.');
                }

                const userTheme = user.theme || 'light';
                const userLanguage = user.language || 'russian';
                const imagePath = getImagePath(userTheme, userLanguage, 'configList');
                const userData = await getUserData(context.senderId);

                if (!userData || !userData.inbounds) {
                    throw new Error('No inbounds data available');
                }

                if (context.message.photo || context.message.document) {
                    await context.message.editMessageMedia({
                        type: 'photo',
                        media: MediaSource.path(imagePath),
                        caption: '',
                        parse_mode: 'markdown'
                    }, {
                        reply_markup: await keyboard.generateAdvancedConfigList(userData, context.senderId)
                    });
                } else {
                    await context.message.editText('', {
                        reply_markup: await keyboard.generateAdvancedConfigList(userData, context.senderId),
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

        case 'config_': {
            try {
                const [, protocol, index] = action.split('_');
                const configIndex = parseInt(index, 10);

                const userData = await getUserData(context.senderId);
                if (!userData) {
                    await context.answerCallbackQuery({
                        text: 'Error retrieving config',
                        show_alert: false
                    });
                    return;
                }

                const user = await findOrCreateUser({ user_id: context.senderId });
                if (!user) {
                    throw new Error('User not found in local database.');
                }

                const userTheme = user.theme || 'light';
                const userLanguage = user.language || 'russian';
                
                const configLinks = userData.links.filter(link => link.toLowerCase().includes(protocol));
                const configLink = configLinks[configIndex];
                if (!configLink) {
                    await context.answerCallbackQuery({
                        text: 'Config not found',
                        show_alert: false
                    });
                    return;
                }

                const configHash = generateHash(configLink);
                
                // Создаем папку для QR кодов с учетом темы и языка
                const qrCodeDir = path.join(cacheQrDir, userTheme, userLanguage);
                if (!fs.existsSync(qrCodeDir)) {
                    fs.mkdirSync(qrCodeDir, { recursive: true });
                }
                
                const qrCodePath = path.join(qrCodeDir, `${configHash}.png`);

                if (fs.existsSync(qrCodePath)) {
                    if (context.message.photo || context.message.document) {
                        await context.message.editMessageMedia({
                            type: 'photo',
                            media: MediaSource.path(qrCodePath),
                            caption: `\`\`\`${configLink}\`\`\``,
                            parse_mode: 'markdown'
                        }, {
                            reply_markup: await keyboard.config(context.senderId)
                        });
                    } else if (context.message.text) {
                        await context.message.editText(`\`${configLink}\``, {
                            reply_markup: await keyboard.config(context.senderId),
                            parse_mode: 'markdown'
                        });
                    } else {
                        await context.sendPhoto(
                            MediaSource.path(qrCodePath),
                            {
                                caption: `\`\`\`${configLink}\`\`\``,
                                reply_markup: await keyboard.config(context.senderId),
                                parse_mode: 'markdown'
                            }
                        );
                    }
                } else {
                    try {
                        const qrOptions = {
                            color: {},
                            width: 1080
                        };
                        
                        if (userTheme === 'dark') {
                            qrOptions.color = {
                                dark: '#C6C6C6',
                                light: '#2A2A2A'
                            };
                        } else if (userTheme === 'light') {
                            qrOptions.color = {
                                dark: '#474747',
                                light: '#E8E8E8'
                            };
                        }

                        await QRCode.toFile(qrCodePath, configLink, qrOptions);

                        if (context.message.photo || context.message.document) {
                            await context.message.editMessageMedia({
                                type: 'photo',
                                media: MediaSource.path(qrCodePath),
                                caption: `\`\`\`${configLink}\`\`\``,
                                parse_mode: 'markdown'
                            }, {
                                reply_markup: await keyboard.config(context.senderId)
                            });
                        } else if (context.message.text) {
                            await context.message.editText(`\`${configLink}\``, {
                                reply_markup: await keyboard.config(context.senderId),
                                parse_mode: 'markdown'
                            });
                        } else {
                            await context.sendPhoto(
                                MediaSource.path(qrCodePath),
                                {
                                    caption: `\`\`\`${configLink}\`\`\``,
                                    reply_markup: await keyboard.config(context.senderId),
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
            } catch (err) {
                console.error('Error displaying config:', err);
                await context.answerCallbackQuery({
                    text: 'Error displaying config',
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
                const user = await findOrCreateUser({ user_id: context.senderId });
                if (!user) {
                    throw new Error('User not found in local database.');
                }

                const userTheme = user.theme || 'light';
                const qrCodePath = path.join(userTheme === 'dark' ? cacheQrDirDark : cacheQrDirLight, `${configHash}.png`);

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
                            reply_markup: await keyboard.config(context.senderId)
                        });
                    } else if (context.message.text) {
                        await context.message.editText(`\`${configLink}\``, {
                            reply_markup: await keyboard.config(context.senderId),
                            parse_mode: 'markdown'
                        });
                    } else {
                        await context.sendPhoto(
                            MediaSource.path(qrCodePath),
                            {
                                caption: `\`\`\`${configLink}\`\`\``,
                                reply_markup: await keyboard.config(context.senderId),
                                parse_mode: 'markdown'
                            }
                        );
                    }
                } else {
                    try {
                        // Опции для настройки цветов и разрешения QR-кода
                        const qrOptions = {
                            color: {},
                            width: 1080
                        };
                        
                        if (userTheme === 'dark') {
                            qrOptions.color = {
                                dark: '#C6C6C6',
                                light: '#2A2A2A'
                            };
                        } else if (userTheme === 'light') {
                            qrOptions.color = {
                                dark: '#474747',
                                light: '#E8E8E8'
                            };
                        }

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
                                reply_markup: await keyboard.config(context.senderId)
                            });
                        } else if (context.message.text) {
                            await context.message.editText(`\`${configLink}\``, {
                                reply_markup: await keyboard.config(context.senderId),
                                parse_mode: 'markdown'
                            });
                        } else {
                            await context.sendPhoto(
                                MediaSource.path(qrCodePath),
                                {
                                    caption: `\`\`\`${configLink}\`\`\``,
                                    reply_markup: await keyboard.config(context.senderId),
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
        // Получаем токен перед началом обработки команд
        await setAccessToken();

        const botInfo = await telegram.api.getMe();
        const botUsername = botInfo.username;

        await telegram.updates.startPolling();
        log.startPolling(botUsername);
    } catch (err) {
        log.setAccessTokenError(err);
    }
})();