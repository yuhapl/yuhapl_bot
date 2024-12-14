// /service/logging.js (не удалять)

import { get } from 'http';
import { getCurrentTime } from './timer.js';

export const Action = (context) => {
    const userId = context.senderId;
    const time = getCurrentTime();

    if (context.text) {
        console.log(`[${time}] ${userId}: User command "${context.text}" executed.`);
    } else if (context.data) {
        console.log(`[${time}] ${userId}: User callback action "${context.data}" triggered.`);
    } else {
        console.log(`[${time}] ${userId}: User unrecognized action.`);
    }
};

export const CreateUser = (userId) => {
    const time = getCurrentTime();
    console.log(`[${time}] ${userId}: User added to the database.`);
};

export const ExistUser = (userId) => {
    const time = getCurrentTime();
    console.log(`[${time}] ${userId}: User already exists in the database.`);
};

export const IncrementMessageCount = (userId) => {
    const time = getCurrentTime();
    console.log(`[${time}] ${userId}: User message count incremented.`);
};

export const IncrementInlineInteractionCount = (userId) => {
    const time = getCurrentTime();
    console.log(`[${time}] ${userId}: User inline interaction count incremented.`);
};

export const UpdateLastInteractionDate = (userId) => {
    const time = getCurrentTime();
    console.log(`[${time}] ${userId}: User last interaction date updated.`);
};

export const ToggleUserTheme = (userId, newTheme) => {
    const time = getCurrentTime();
    console.log(`[${time}] ${userId}: User theme switched to "${newTheme}".`);
};

export const TokenUpdate = (token) => {
    const time = getCurrentTime();
    console.log(`[${time}]: API token updated: ${token}`)
}

export const TokenUpdateError = (err) => {
    const time = getCurrentTime();
    console.log(`[${time}]: Error of updating API token:`, err)
}

export const getAccessTokenError = (err) => {
    const time = getCurrentTime();
    console.log(`[${time}]: Error of getting API token:`, err)
}

export const StartPolling = (botUsername) => {
    const time = getCurrentTime();
    console.log(`[${time}]: Bot started: @${botUsername}`)
}

export const databaseConnect = () => {
    const time = getCurrentTime();
    console.log(`[${time}]: MongoDB connected`)
}

export const databaseConnectError = (err) => {
    const time = getCurrentTime();
    console.log(`[${time}]: Error connecting to MongoDB:`, err)
}

export const isUserActiveError = (err) => {
    const time = getCurrentTime();
    console.log(`[${time}] ${userId}: Error checking user activity status:`, err)
}

export const isUserActiveTrue = (err) => {
    const time = getCurrentTime();
    console.log(`[${time}] ${userId}: User status check: true:`)
}

export const isUserActiveFalse = (err) => {
    const time = getCurrentTime();
    console.log(`[${time}] ${userId}: User status check: false`)
}

