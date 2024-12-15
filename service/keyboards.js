// service/keyboard.js

import { InlineKeyboard } from 'puregram';
import axios from 'axios';
import * as log from './logging.js'
import { getAccessToken } from './apiService.js';

// Функция для проверки, активен ли пользователь
const isUserActive = async (userId) => {
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
	const keymarkup = [
		[
			InlineKeyboard.textButton({
				text: 'Settings',
				payload: 'settings'
			})
		]
	];

	// Проверяем, является ли пользователь активным и добавляем кнопку "Configs"
	if (await isUserActive(userId)) {
		keymarkup.push([
			InlineKeyboard.textButton({
				text: 'Configs',
				payload: 'configList'
			})
		]);
	}

	return InlineKeyboard.keyboard(keymarkup);
};

// Клавиатура для настроек
export const settings = InlineKeyboard.keyboard([
    [
        InlineKeyboard.textButton({
            text: 'Themes',
            payload: 'changeTheme'
        }),
        InlineKeyboard.textButton({
            text: 'Back',
            payload: 'backToStart'
        })
    ]
]);

// Клавиатура после смены темы (если понадобится в будущем)
export const backToStart = InlineKeyboard.keyboard([
    [
        InlineKeyboard.textButton({
            text: 'Settings',
            payload: 'settings'
        })
    ]
]);

export const config = InlineKeyboard.keyboard([
    [
        InlineKeyboard.textButton({
            text: 'Back to Configs',
            payload: 'backToConfiList'
        })
    ]
]);


// Генерация клавиатуры для списка конфигов
export const generateConfigList = (userConfigs) => {
    const keyboard = userConfigs.inbounds.vless.concat(
        userConfigs.inbounds.vmess,
        userConfigs.inbounds.trojan
    ).map((inbound, index) => [
        InlineKeyboard.textButton({
            text: inbound, // Название подключения
            payload: `config_${index}` // Уникальный payload
        })
    ]);

    // Добавляем кнопку возврата в главное меню
    keyboard.push([
        InlineKeyboard.textButton({
            text: 'Back',
            payload: 'backToStart'
        })
    ]);

    return InlineKeyboard.keyboard(keyboard);
};