// backend/auth.js
import express from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from './models/User.js';
import cookieParser from 'cookie-parser'; // Import cookie-parser
import { encrypt } from './utils/encryption.js'; // Import encryption utility

dotenv.config();
const router = express.Router();

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;

// ... (The /github redirect route remains the same)
router.get('/github', (req, res) => {
    const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=read:user,repo`;
    res.redirect(url);
});

router.get('/github/callback', async (req, res) => {
    const { code } = req.query;
    try {
        // Exchange code for access token
        const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', null, {
            params: { client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code },
            headers: { Accept: 'application/json' },
        });
        const { access_token } = tokenResponse.data;

        // Get user data from GitHub
        const userResponse = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${access_token}` },
        });
        const githubUser = userResponse.data;
          // Find or create user in the database
            const user = await User.findOneAndUpdate(
            { githubId: githubUser.id },
            {
                username: githubUser.login,
                avatar: githubUser.avatar_url,
                accessToken: encrypt(access_token), // Store encrypted token
            },
            { new: true, upsert: true } // `upsert` creates if not found
            );
    // Create JWT containing the database user ID
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });



        // Set JWT in an httpOnly cookie
        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development', // Use secure cookies in production
            maxAge: 24 * 60 * 60 * 1000, // 1 day
        });

        // Redirect to the frontend
    res.redirect('http://localhost:5173/dashboard');

    } catch (error) {
        console.error('Error during GitHub OAuth callback', error);
        res.redirect('http://localhost:5173?error=auth_failed');
    }
});

// New route to get the logged-in user's profile
router.get('/profile', async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-accessToken'); // Don't send token to frontend

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// New route for logging out
router.post('/logout', (req, res) => {
    res.clearCookie('jwt');
    res.json({ message: 'Logged out successfully' });
});


export default router;