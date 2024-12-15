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
            log.isUserActiveTrue(userId);
            return true;
        } else {
            log.isUserActiveFalse(userId);
            return false;
        }
    } catch (error) {
        const statusCode = error.response ? error.response.status : 'No Response';
        log.isUserActiveError(error.message, userId);
        return false;
    }
};


// Клавиатура для начального сообщения с условной кнопкой "Configs"
export const startKeyboard = async (userId) => {
	const keyboard = [
		[
			InlineKeyboard.textButton({
				text: 'Settings',
				payload: 'settings'
			})
		]
	];

	// Проверяем, является ли пользователь активным и добавляем кнопку "Configs"
	if (await isUserActive(userId)) {
		keyboard.push([
			InlineKeyboard.textButton({
				text: 'Configs',
				payload: 'configs'
			})
		]);
	}

	return InlineKeyboard.keyboard(keyboard);
};

// Клавиатура для настроек
export const settingsKeyboard = InlineKeyboard.keyboard([
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
export const backToStartKeyboard = InlineKeyboard.keyboard([
    [
        InlineKeyboard.textButton({
            text: 'Settings',
            payload: 'settings'
        })
    ]
]);
