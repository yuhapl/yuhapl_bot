// /service/logging.js (не удалять)

import { getCurrentTime } from './timer.js';

export const logAction = (context) => {
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

export const logCreateUser = (userId) => {
    const time = getCurrentTime();
    console.log(`[${time}] ${userId} added to the database.`);
};

export const logExistUser = (userId) => {
    const time = getCurrentTime();
    console.log(`[${time}] ${userId} already exists in the database.`);
};

export const logIncrementMessageCount = (userId) => {
    const time = getCurrentTime();
    console.log(`[${time}] ${userId}: Message count incremented.`);
};

export const logIncrementInlineInteractionCount = (userId) => {
    const time = getCurrentTime();
    console.log(`[${time}] ${userId}: Inline interaction count incremented.`);
};

export const logUpdateLastInteractionDate = (userId) => {
    const time = getCurrentTime();
    console.log(`[${time}] ${userId}: Last interaction date updated.`);
};

export const logToggleUserTheme = (userId, newTheme) => {
    const time = getCurrentTime();
    console.log(`[${time}] ${userId}: Theme switched to "${newTheme}".`);
};
