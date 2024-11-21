//main.js (не удалять строку)

import { Telegram, InlineKeyboard } from 'puregram';
import dotenv from 'dotenv';
import { logAction } from './service/logging.js'; // Импортируем функцию логирования
import { 
    findOrCreateUser, 
    incrementMessageCount, 
    incrementInlineInteractionCount,
    toggleUserTheme // Импортируем функцию переключения темы
} from './service/userService.js';
import mongoose from 'mongoose';

// Загружаем переменные окружения из .env файла
dotenv.config();

// Подключаемся к базе данных
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('База данных подключена'))
    .catch(err => console.error('Ошибка подключения к БД:', err));

// Инициализируем бота с токеном из переменной окружения
const telegram = Telegram.fromToken(process.env.API_TOKEN);

// Функция для отправки стартового сообщения с инлайн-клавиатурой
const sendStartMessage = async (context) => {
    const keyboard = InlineKeyboard.keyboard([
        [
            InlineKeyboard.textButton({
                text: 'Настройки',
                payload: 'settings'
            })
        ]
    ]);

    await context.send('Старт', {
        reply_markup: keyboard,
        parse_mode: 'markdown'
    });
};

// Обработчик команды /start
telegram.updates.on('message', async (context) => {
    logAction(context);

    if (context.text === '/start') {
        const userData = {
            user_id: context.senderId,
            username: context.sender?.username || null // Проверяем наличие username
        };
        await findOrCreateUser(userData);
        await sendStartMessage(context);
    } else {
        await incrementMessageCount(context.senderId);
    }
});

// Обработчик инлайн-кнопок
telegram.updates.on('callback_query', async (context) => {
    logAction(context);

    await incrementInlineInteractionCount(context.senderId);

    const action = context.data;
    switch (action) {
        case 'settings':
            await context.message.editText('Открыты настройки', {
                reply_markup: InlineKeyboard.keyboard([
                    [
                        InlineKeyboard.textButton({
                            text: 'Темы',
                            payload: 'changeTheme'
                        }),
                        InlineKeyboard.textButton({
                            text: 'Назад',
                            payload: 'back_start'
                        })
                    ]
                ])
            });
            await context.answerCallbackQuery();
            break;

        case 'changeTheme':
            try {
                // Переключаем тему пользователя
                const newTheme = await toggleUserTheme(context.senderId);

// Раскомментировать, когда сделаешь картинки. При нажатии нужно менять тему у картинки (темная/светлая)

//                await context.message.editText(`Тема успешно переключена на: ${newTheme}`, {
//                    reply_markup: InlineKeyboard.keyboard([
//                        [
//                            InlineKeyboard.textButton({
//                                text: 'Назад',
//                                payload: 'back_start'
//                            })
//                        ]
//                    ])
//                });
            } catch (err) {
                console.error('Ошибка при переключении темы:', err);
                await context.answerCallbackQuery({ text: 'Ошибка при переключении темы', show_alert: true });
            }
            await context.answerCallbackQuery();
            break;

        default:
            console.error(`Неизвестное действие: ${action}`);
            await context.answerCallbackQuery({ text: 'Неизвестное действие', show_alert: true });
            break;
    }
});

// Запуск бота и получение информации о нём
(async () => {
    try {
        const botInfo = await telegram.api.getMe(); // Получаем информацию о боте
        const botUsername = botInfo.username; // Получаем имя пользователя бота

        await telegram.updates.startPolling();
        console.log(`@${botUsername} запущен`); // Не менять текст
    } catch (err) {
        console.error('Ошибка при запуске:', err);
    }
})();
