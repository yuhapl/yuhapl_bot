// service/apiService.js

import axios from 'axios';
import dotenv from 'dotenv';
import * as log from './logging.js'

dotenv.config();

const API_URL = 'https://connect.yuha.pl:8000/api/admin/token';
let accessToken = null;

// Функция для получения токена
export const fetchAccessToken = async () => {
    try {
        const response = await axios.post(
            API_URL,
            new URLSearchParams({
                grant_type: '',
                username: process.env.LOGIN,
                password: process.env.PASSWORD,
                scope: '',
                client_id: '',
                client_secret: '',
            }),
            {
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );
        accessToken = response.data.access_token;
        log.TokenUpdate(accessToken);
    } catch (error) {
        const err = error.message
        log.TokenUpdateError(err);
    }
};

// Функция для получения текущего токена
export const getAccessToken = () => accessToken;

// Обновляем токен каждый час
fetchAccessToken();
setInterval(fetchAccessToken, 60 * 60 * 1000); // 1 час