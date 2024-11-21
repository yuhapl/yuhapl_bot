// service/keyboards.js (не удалять строку)

import { InlineKeyboard } from 'puregram';

// Клавиатура для начального сообщения
export const startKeyboard = InlineKeyboard.keyboard([
    [
        InlineKeyboard.textButton({
            text: 'Settings',
            payload: 'settings'
        })
    ]
]);

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
