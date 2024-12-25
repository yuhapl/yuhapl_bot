// service/keyboard.js

import { InlineKeyboard } from 'puregram';
import axios from 'axios';
import * as log from './logging.js'
import { getAccessToken } from './apiService.js';

// Функция для проверки, активен ли пользователь
export const isUserActive = async (userId) => {
    try {
        const token = getAccessToken();

        if (!token) {
            const err = 'No access token available';
            log.setAccessTokenError(err);
            return false;
        }

        const response = await axios.get(`https://sub.yuha.pl/api/user/${userId}`, {
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
                text: '🌐 Подключения',
                payload: 'configList'
            })
        ]);
    }

    keymarkup.push([
        InlineKeyboard.textButton({
            text: '⚙️ Настройки',
            payload: 'settings'
        })
    ]);

    return InlineKeyboard.keyboard(keymarkup);
};

// Клавиатура для настроек
export const settings = InlineKeyboard.keyboard([
    [
        InlineKeyboard.textButton({
            text: 'Тема',
            payload: 'changeTheme'
        }),
        InlineKeyboard.textButton({
            text: 'Язык',
            payload: 'changeLanguage'
        })
    ],
    [
        InlineKeyboard.textButton({
            text: '⬅️ Назад',
            payload: 'backToStart'
        })
    ]
]);

export const backToStart = InlineKeyboard.keyboard([
    [
        InlineKeyboard.textButton({
            text: 'Настройки',
            payload: 'settings'
        })
    ]
]);

export const config = InlineKeyboard.keyboard([
    [
        InlineKeyboard.textButton({
            text: '⬅️ Назад',
            payload: 'backToConfiList'
        })
    ]
]);


// Генерация клавиатуры для списка конфигов
export const generateConfigList = () => {
    const keyboard = [
        [
            InlineKeyboard.textButton({
                text: '⭐️ Авто',
                payload: 'config_auto'
            })
        ],
        [
            InlineKeyboard.textButton({
                text: '🛠 Продвинутое',
                payload: 'advanced_configs'
            })
        ],
        [
            InlineKeyboard.textButton({
                text: '⬅️ Назад',
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
            text: '⬅️ Назад',
            payload: 'backToConfiList'
        })
    ]);

    return InlineKeyboard.keyboard(keyboard);
};