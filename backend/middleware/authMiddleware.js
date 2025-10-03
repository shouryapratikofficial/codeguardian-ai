// backend/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { decrypt } from '../utils/encryption.js';
import dotenv from 'dotenv';
dotenv.config();
export const isAuthenticated = async (req, res, next) => {
  const token = req.cookies.jwt;

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Decrypt the access token before attaching it to the request
    user.accessToken = decrypt(user.accessToken);
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};