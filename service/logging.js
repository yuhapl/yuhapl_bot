// logging.js (не удалять строчку)

import { get } from 'mongoose';
import { getCurrentTime } from './timer.js'; // Импортируем функцию часов

// Функция для логирования команд и действий
export const logAction = (context) => {
    const userId = context.senderId; // Получаем ID пользователя
    const time = getCurrentTime(); // Получаем текущее время

    if (context.text) {
        console.log(`[${time}] ${userId}, ${context.text}`);
    } else if (context.data) {
        console.log(`[${time}] ${userId}, ${context.data}`);
    } else {
        console.log('logAction: Неопознано действие');
    }
};

export const logCreateUser = (userId) => {
    const time = getCurrentTime();

    console.log (`[${time}] ${userId}, added in Database`)
}

export const logExistUser = (userId) => {
    const time = getCurrentTime();

    console.log (`[${time}] ${userId}, already exist in Database`)
}

export const logIncrementMessageCount = (userId) => {
    const time = getCurrentTime();

    console.log (`[${time}] ${userId}, incrementMessageCount updated`);
};

export const logIncrementInlineInteractionCount = (userId) => {
    const time = getCurrentTime();

    console.log (`[${time}] ${userId}, incrementInlineInteractionCount updated`)
}

export const logUpdateLastInteractionDate = (userId) => {
    const time = getCurrentTime();

    console.log (`[${time}] ${userId}, updateLastInteractionDate updated`)
}