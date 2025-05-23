// service/apiService.js

import axios from 'axios';
import dotenv from 'dotenv';
import * as log from './logging.js'

dotenv.config();

const API_URL = `${process.env.API_LINK}/api/admin/token`;
let accessToken = null;

// Функция для обновления токена
export const setAccessToken = async () => {
    try {
        const response = await axios.post(
            API_URL,
            new URLSearchParams({
                grant_type: 'password',
                username: process.env.LOGIN,
                password: process.env.PASSWORD,
                scope: '',
                client_id: 'string',
                client_secret: 'string',
            }),
            {
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );
        accessToken = response.data.access_token;
        log.setAccessToken(accessToken);
    } catch (error) {
        const err = error.message
        log.setAccessTokenError(err);
    }
};

// Функция для получения текущего токена
export const getAccessToken = () => accessToken;

// Обновление API токена
export const initializeAccessToken = async () => {
    await setAccessToken(); // Запрашиваем токен один раз при старте
    setInterval(setAccessToken, 60 * 60 * 1000); // Обновляем токен каждый час
};