//./models/User.js (не удалять)

import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    user_id: { type: Number, required: true, unique: true },
    username: { type: String, default: null },
    messageCount: { type: Number, default: 0 },
    inlineInteractionCount: { type: Number, default: 0 },
    firstMessageDate: { type: Date, default: () => new Date() },
    lastInteractionDate: { type: Date, default: () => new Date() },
    theme: { type: String, default: 'light', enum: ['dark', 'light', 'purple'] },
    language: { type: String, default: 'ru', enum: ['ru', 'en'] }
});

export const User = mongoose.model('User', UserSchema);
