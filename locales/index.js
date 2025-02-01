import russian from './russian.js';
import english from './english.js';
import { User } from '../models/User.js';

export const getLocale = async (userId) => {
    const user = await User.findOne({ user_id: userId });
    return user?.language === 'english' ? english : russian;
}; 