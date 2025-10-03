// backend/models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  githubId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  avatar: { type: String },
  accessToken: { type: String, required: true }, // Encrypted access token
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;