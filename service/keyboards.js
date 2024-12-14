// service/keyboard.js

import { InlineKeyboard } from 'puregram';
import axios from 'axios';
import * as log from './logging.js'

// Функция для проверки, активен ли пользователь
const isUserActive = async (userId) => {
	try {
		const token = getAccessToken(); // Получаем токен
		if (!token) {
            const err = ("isUserActve no access token available")
			log.getAccessTokenError(err)
		}

		// Выполняем запрос к API для получения данных о пользователе
		const response = await axios.get(`https://sub.yuha.pl/api/user/${userId}`, {
			headers: {
				'accept': 'application/json',
				'Authorization': `Bearer ${token}`, // Передаем токен в заголовке
			},
		});

		const { status } = response.data; // Извлекаем статус пользователя из ответа

		// Проверяем, активен ли пользователь
		return status === 'active'; // Возвращаем true, если статус "active", иначе false
        log.isUserActiveTrue(userId);
	} catch (err) {
		log.isUserActiveError(err, userId);
        log.isUserActiveFalse(userId);
		return false; // Возвращаем false в случае ошибки
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
