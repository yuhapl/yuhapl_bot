import { InlineKeyboard } from 'puregram';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

// Открываем базу данных SQLite
const db = new sqlite3.Database('/var/lib/marzban/db.sqlite3');

// Преобразуем callback-методы SQLite в промисы
const getAsync = promisify(db.get).bind(db);

// Функция для проверки, активен ли пользователь
const isUserActive = async (userId) => {
    try {
        const row = await getAsync('SELECT note, status FROM users WHERE note = ? AND status = "active"', [userId]);
        return row ? true : false;
    } catch (err) {
        console.error('Error checking user status:', err);
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
