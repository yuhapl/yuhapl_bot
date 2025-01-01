// logging.js
import fs from 'fs';
import path from 'path';
import { createLogger, format, transports } from 'winston';
import { getCurrentTime } from './timer.js';

// Ensure the logs directory exists
const logDirectory = path.resolve('logs');
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true });
}

// Configure the logger
const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: path.join(logDirectory, 'app.log') })
    ]
});

const logMessage = (level, message) => {
    logger.log({ level, message });
};

export const Action = (context) => {
    const userId = context.senderId;
    if (context.text) {
        logMessage('info', `${userId}: User command "${context.text}" executed.`);
    } else if (context.data) {
        logMessage('info', `${userId}: User callback action "${context.data}" triggered.`);
    } else {
        logMessage('warn', `${userId}: User unrecognized action.`);
    }
};

export const CreateUser = (userId) => {
    logMessage('info', `${userId}: User added to the database.`);
};

export const ExistUser = (userId) => {
    logMessage('info', `${userId}: User already exists in the database.`);
};

export const IncrementMessageCount = (userId) => {
    logMessage('info', `${userId}: User message count incremented.`);
};

export const IncrementInlineInteractionCount = (userId) => {
    logMessage('info', `${userId}: User inline interaction count incremented.`);
};

export const UpdateLastInteractionDate = (userId) => {
    logMessage('info', `${userId}: User last interaction date updated.`);
};

export const ToggleUserTheme = (userId, newTheme) => {
    logMessage('info', `${userId}: User theme switched to "${newTheme}".`);
};

export const ToggleUserLanguage = (userId, newLanguage) => {
    logMessage('info', `${userId}: User language switched to "${newLanguage}".`);
};

export const setAccessToken = (token) => {
    logMessage('info', `API token set: ${token}.`);
};

export const setAccessTokenError = (err) => {
    logMessage('error', `Error setting API token: ${err}.`);
};

export const getAccessTokenError = (err) => {
    logMessage('error', `Error getting API token: ${err}.`);
};

export const startPolling = (botUsername) => {
    logMessage('info', `Bot started: @${botUsername}.`);
};

export const databaseConnect = () => {
    logMessage('info', `MongoDB connected.`);
};

export const databaseConnectError = (err) => {
    logMessage('error', `Error connecting to MongoDB: ${err}.`);
};

export const isUserActiveError = (err, userId) => {
    logMessage('error', `${userId}: Error checking user activity status: ${err}.`);
};

export const isUserActive = (userId, status) => {
    logMessage('info', `${userId}: User activity status check: ${status}.`);
};
