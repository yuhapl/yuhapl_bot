// service/keyboard.js

import { InlineKeyboard } from 'puregram';
import axios from 'axios';
import dotenv from 'dotenv';
import * as log from './logging.js'
import { getAccessToken } from './apiService.js';
import ru from '../locales/ru.js';

// Функция для проверки, активен ли пользователь
export const isUserActive = async (userId) => {
    try {
        const token = getAccessToken();

        if (!token) {
            const err = 'No access token available';
            log.setAccessTokenError(err);
            return false;
        }

        const response = await axios.get(`${process.env.API_LINK}/api/user/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        const { status } = response.data;

        if (status === 'active') {
            log.isUserActive(userId, true);
            return true;
        } else {
            log.isUserActive(userId, false);
            return false;
        }
    } catch (error) {
        const statusCode = error.response ? error.response.status : 'No Response';
        log.isUserActiveError(error.message, userId);
        return false;
    }
};

// Клавиатура для начального сообщения с условной кнопкой "Configs"
export const start = async (userId) => {
    const keymarkup = [];

    if (await isUserActive(userId)) {
        keymarkup.push([
            InlineKeyboard.textButton({
                text: ru.buttons.connections,
                payload: 'configList'
            })
        ]);
    }

    keymarkup.push([
        InlineKeyboard.textButton({
            text: ru.buttons.settings,
            payload: 'settings'
        })
    ]);

    return InlineKeyboard.keyboard(keymarkup);
};

// Клавиатура для настроек
export const settings = InlineKeyboard.keyboard([
    [
        InlineKeyboard.textButton({
            text: ru.buttons.theme,
            payload: 'changeTheme'
        }),
        InlineKeyboard.textButton({
            text: ru.buttons.language,
            payload: 'changeLanguage'
        })
    ],
    [
        InlineKeyboard.textButton({
            text: ru.buttons.back,
            payload: 'backToStart'
        })
    ]
]);

export const backToStart = InlineKeyboard.keyboard([
    [
        InlineKeyboard.textButton({
            text: ru.buttons.settings,
            payload: 'settings'
        })
    ]
]);

export const config = InlineKeyboard.keyboard([
    [
        InlineKeyboard.textButton({
            text: ru.buttons.back,
            payload: 'backToConfiList'
        })
    ]
]);

// Генерация клавиатуры для списка конфигов
export const generateConfigList = () => {
    const keyboard = [
        [
            InlineKeyboard.textButton({
                text: ru.buttons.auto,
                payload: 'config_auto'
            })
        ],
        [
            InlineKeyboard.textButton({
                text: ru.buttons.advanced,
                payload: 'advanced_configs'
            })
        ],
        [
            InlineKeyboard.textButton({
                text: ru.buttons.back,
                payload: 'backToStart'
            })
        ]
    ];

    return InlineKeyboard.keyboard(keyboard);
};

export const generateAdvancedConfigList = (userConfigs) => {
    const keyboard = [];

    if (userConfigs.inbounds.vless) {
        userConfigs.inbounds.vless.forEach((inbound, index) => {
            keyboard.push([
                InlineKeyboard.textButton({
                    text: `${inbound}`,
                    payload: `config_vless_${index}`,
                })
            ]);
        });
    }
  
    if (userConfigs.inbounds.vmess) {
        userConfigs.inbounds.vmess.forEach((inbound, index) => {
            keyboard.push([
                InlineKeyboard.textButton({
                    text: `${inbound}`,
                    payload: `config_vmess_${index}`,
                })
            ]);
        });
    }

    if (userConfigs.inbounds.trojan) {
        userConfigs.inbounds.trojan.forEach((inbound, index) => {
            keyboard.push([
                InlineKeyboard.textButton({
                    text: `${inbound}`,
                    payload: `config_trojan_${index}`,
                })
            ]);
        });
    }

    keyboard.push([
        InlineKeyboard.textButton({
            text: ru.buttons.back,
            payload: 'backToConfiList'
        })
    ]);

    return InlineKeyboard.keyboard(keyboard);
};