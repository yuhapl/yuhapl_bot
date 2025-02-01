// service/keyboard.js

import { InlineKeyboard } from 'puregram';
import axios from 'axios';
import dotenv from 'dotenv';
import * as log from './logging.js'
import { getAccessToken } from './apiService.js';
import { getLocale } from '../locales/index.js';

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

// Клавиатура для начального сообщения
export const start = async (userId) => {
    const keymarkup = [];
    const locale = await getLocale(userId);

    if (await isUserActive(userId)) {
        keymarkup.push([
            InlineKeyboard.textButton({
                text: locale.buttons.connections,
                payload: 'configList'
            })
        ]);
    }

    keymarkup.push([
        InlineKeyboard.textButton({
            text: locale.buttons.settings,
            payload: 'settings'
        })
    ]);

    return InlineKeyboard.keyboard(keymarkup);
};

// Клавиатура для настроек
export const settings = async (userId) => {
    const locale = await getLocale(userId);
    
    return InlineKeyboard.keyboard([
        [
            InlineKeyboard.textButton({
                text: locale.buttons.theme,
                payload: 'changeTheme'
            }),
            InlineKeyboard.textButton({
                text: locale.buttons.language,
                payload: 'changeLanguage'
            })
        ],
        [
            InlineKeyboard.textButton({
                text: locale.buttons.back,
                payload: 'backToStart'
            })
        ]
    ]);
};

export const backToStart = async (userId) => {
    const locale = await getLocale(userId);
    
    return InlineKeyboard.keyboard([
        [
            InlineKeyboard.textButton({
                text: locale.buttons.settings,
                payload: 'settings'
            })
        ]
    ]);
};

export const config = async (userId) => {
    const locale = await getLocale(userId);
    
    return InlineKeyboard.keyboard([
        [
            InlineKeyboard.textButton({
                text: locale.buttons.back,
                payload: 'backToConfiList'
            })
        ]
    ]);
};

// Генерация клавиатуры для списка конфигов
export const generateConfigList = async (userId) => {
    const locale = await getLocale(userId);
    
    const keyboard = [
        [
            InlineKeyboard.textButton({
                text: locale.buttons.auto,
                payload: 'config_auto'
            })
        ],
        [
            InlineKeyboard.textButton({
                text: locale.buttons.advanced,
                payload: 'advanced_configs'
            })
        ],
        [
            InlineKeyboard.textButton({
                text: locale.buttons.back,
                payload: 'backToStart'
            })
        ]
    ];

    return InlineKeyboard.keyboard(keyboard);
};

export const generateAdvancedConfigList = async (userConfigs, userId) => {
    const keyboard = [];
    const locale = await getLocale(userId);

    if (!userConfigs || !userConfigs.inbounds) {
        return InlineKeyboard.keyboard([
            [
                InlineKeyboard.textButton({
                    text: locale.buttons.back,
                    payload: 'backToConfiList'
                })
            ]
        ]);
    }

    const { inbounds } = userConfigs;

    if (inbounds.vless && Array.isArray(inbounds.vless)) {
        inbounds.vless.forEach((inbound, index) => {
            keyboard.push([
                InlineKeyboard.textButton({
                    text: `${inbound}`,
                    payload: `config_vless_${index}`,
                })
            ]);
        });
    }
  
    if (inbounds.vmess && Array.isArray(inbounds.vmess)) {
        inbounds.vmess.forEach((inbound, index) => {
            keyboard.push([
                InlineKeyboard.textButton({
                    text: `${inbound}`,
                    payload: `config_vmess_${index}`,
                })
            ]);
        });
    }

    if (inbounds.trojan && Array.isArray(inbounds.trojan)) {
        inbounds.trojan.forEach((inbound, index) => {
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
            text: locale.buttons.back,
            payload: 'backToConfiList'
        })
    ]);

    return InlineKeyboard.keyboard(keyboard);
};