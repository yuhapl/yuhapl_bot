// /service/logging.js (не удалять)

import { get } from 'http';
import { getCurrentTime } from './timer.js';

export const Action = (context) => {
    const userId = context.senderId;
    const time = getCurrentTime();

    if (context.text) {
        console.log(`[${time}] ${userId}: Command "${context.text}" executed.`);
    } else if (context.data) {
        console.log(`[${time}] ${userId}: Callback action "${context.data}" triggered.`);
    } else {
        console.log(`[${time}] ${userId}: Unrecognized action.`);
    }
};

export const CreateUser = (userId) => {
    const time = getCurrentTime();
    console.log(`[${time}] ${userId}: Added to the database.`);
};

export const ExistUser = (userId) => {
    const time = getCurrentTime();
    console.log(`[${time}] ${userId}: Already exists in the database.`);
};

export const IncrementMessageCount = (userId) => {
    const time = getCurrentTime();
    console.log(`[${time}] ${userId}: Message count incremented.`);
};

export const IncrementInlineInteractionCount = (userId) => {
    const time = getCurrentTime();
    console.log(`[${time}] ${userId}: Inline interaction count incremented.`);
};

export const UpdateLastInteractionDate = (userId) => {
    const time = getCurrentTime();
    console.log(`[${time}] ${userId}: Last interaction date updated.`);
};

export const ToggleUserTheme = (userId, newTheme) => {
    const time = getCurrentTime();
    console.log(`[${time}] ${userId}: Theme switched to "${newTheme}".`);
};

export const TokenUpdate = (token) => {
    const time = getCurrentTime();
    console.log(`[${time}] Token updated: ${token}`)
}

export const TokenUpdateError = (err) => {
    const time = getCurrentTime();
    console.log(`[${time}] Error of updating token:`, err)
}

export const StartPolling = (botUsername) => {
    const time = getCurrentTime();
    console.log(`[${time}] Bot started: @${botUsername}`)
}

export const databaseConnect = () => {
    const time = getCurrentTime();
    console.log(`[${time}] Database connected`)
}

export const databaseConnectError = (err) => {
    const time = getCurrentTime();
    console.log(`[${time}] Error connecting to database:`, err)
}
