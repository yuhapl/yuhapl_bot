//./models/User.js (не удалять)

import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    user_id: { type: Number, required: true, unique: true },
    messageCount: { type: Number, default: 0 },
    inlineInteractionCount: { type: Number, default: 0 },
    firstMessageDate: { type: Date, default: () => new Date() },
    lastInteractionDate: { type: Date, default: () => new Date() },
    theme: { type: String, default: 'light', enum: ['dark', 'light'] },
    language: { type: String, default: 'russian', enum: ['russian', 'english'] }
});

export const User = mongoose.model('User', UserSchema);
