// /service/userService.js (не удалять)

import { User } from '../models/User.js';
import * as log from './logging.js';

// Создать или найти пользователя
export const findOrCreateUser = async (userData) => {
    const { user_id} = userData;

    // Пытаемся найти пользователя
    let user = await User.findOne({ user_id });

    if (!user) {
        // Создаём нового пользователя, если он отсутствует
        user = new User(userData);
        await user.save();
        await log.CreateUser(user_id);
    } else {
        await log.ExistUser(user_id);
    }
    return user;
};

// Переключение темы пользователя
export const toggleUserTheme = async (userId) => {
    const user = await User.findOne({ user_id: userId });
    if (!user) throw new Error('User not found');

    user.theme = user.theme === 'dark' ? 'light' : 'dark';
    await user.save();

    await log.ToggleUserTheme(userId, user.theme);

    return user.theme;
};

// Увеличить количество сообщений
export const incrementMessageCount = async (userId) => {
    await User.updateOne(
        { user_id: userId }, 
        { 
            $inc: { messageCount: 1 }, 
            $set: { lastInteractionDate: new Date() }
        }
    );
    await log.IncrementMessageCount(userId);
};

// Увеличить количество взаимодействий с инлайн-кнопками
export const incrementInlineInteractionCount = async (userId) => {
    await User.updateOne(
        { user_id: userId }, 
        { 
            $inc: { inlineInteractionCount: 1 }, 
            $set: { lastInteractionDate: new Date() }
        }
    );
    await log.IncrementInlineInteractionCount(userId);
};

// Обновить дату последнего взаимодействия
export const updateLastInteractionDate = async (userId) => {
    await User.updateOne(
        { user_id: userId }, 
        { 
            $set: { lastInteractionDate: new Date() }
        }
    );
    await log.UpdateLastInteractionDate(userId);
};
