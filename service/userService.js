import { User } from '../models/User.js';
import { logCreateUser, logExistUser, logIncrementMessageCount, logIncrementInlineInteractionCount, logUpdateLastInteractionDate } from './logging.js';

export const findOrCreateUser = async (userData) => {
    let user = await User.findOne({ user_id: userData.user_id });
    const userId = userData.user_id;
    if (!user) {
        user = new User(userData);
        await user.save();
        await logCreateUser(userId);
    } else {
        await logExistUser(userId);
    }
    return user;
};

export const incrementMessageCount = async (userId) => {
    await User.updateOne({ user_id: userId }, { 
        $inc: { messageCount: 1 }, 
        $set: { lastInteractionDate: new Date() }
    });
    await logIncrementMessageCount(userId);
};

export const incrementInlineInteractionCount = async (userId) => {
    await User.updateOne({ user_id: userId }, { 
        $inc: { inlineInteractionCount: 1 }, 
        $set: { lastInteractionDate: new Date() }
    });
    await logIncrementInlineInteractionCount(userId);
};

export const updateLastInteractionDate = async (userId) => {
    await User.updateOne({ user_id: userId }, { 
        $set: { lastInteractionDate: new Date() }
    });
    await logUpdateLastInteractionDate(userId);
};
