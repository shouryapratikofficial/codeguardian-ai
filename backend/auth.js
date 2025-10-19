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
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

console.log('auth.js: initialized', {
  NODE_ENV: process.env.NODE_ENV,
  FRONTEND_URL: process.env.FRONTEND_URL ? 'set' : 'unset',
  GITHUB_CLIENT_ID: GITHUB_CLIENT_ID ? 'set' : 'unset',
  JWT_SECRET: JWT_SECRET ? 'set' : 'unset',
});

// GitHub OAuth start - redirect to GitHub
router.get('/github', (req, res) => {
    console.log('GET /api/auth/github: incoming request', {
      ip: req.ip,
      query: req.query,
      timestamp: new Date().toISOString()
    });
    const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=read:user,repo`;
    console.log('GET /api/auth/github: redirecting to GitHub OAuth URL', { url });
    res.redirect(url);
});

// GitHub OAuth callback
router.get('/github/callback', async (req, res) => {
    console.log('GET /api/auth/github/callback: called', { query: req.query });
    const { code } = req.query;
    if (!code) {
      console.error('GET /api/auth/github/callback: missing code query param');
      return res.redirect(`${frontendUrl}/?error=missing_code`);
    }

    try {
        console.log('GET /api/auth/github/callback: exchanging code for access token');
        // Exchange code for access token
        const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', null, {
            params: { client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code },
            headers: { Accept: 'application/json' },
        });

        console.log('GET /api/auth/github/callback: token endpoint responded', {
          status: tokenResponse.status,
          dataKeys: tokenResponse.data ? Object.keys(tokenResponse.data) : null
        });

        const { access_token } = tokenResponse.data;
        if (!access_token) {
          console.error('GET /api/auth/github/callback: no access_token in response', { responseData: tokenResponse.data });
          return res.redirect(`${frontendUrl}/?error=no_token`);
        }
        console.log('GET /api/auth/github/callback: received access token (masked)');

        // Get user data from GitHub
        console.log('GET /api/auth/github/callback: fetching GitHub user info');
        const userResponse = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        console.log('GET /api/auth/github/callback: github user response', {
          status: userResponse.status,
          dataKeys: userResponse.data ? Object.keys(userResponse.data) : null
        });

        const githubUser = userResponse.data;
        console.log('GET /api/auth/github/callback: githubUser', {
          id: githubUser.id,
          login: githubUser.login,
          avatar_url: !!githubUser.avatar_url
        });

        // Find or create user in the database
        console.log('GET /api/auth/github/callback: upserting user in DB', { githubId: githubUser.id, username: githubUser.login });
        const user = await User.findOneAndUpdate(
            { githubId: githubUser.id },
            {
                username: githubUser.login,
                avatar: githubUser.avatar_url,
                accessToken: encrypt(access_token), // Store encrypted token
            },
            { new: true, upsert: true } // `upsert` creates if not found
        );

        console.log('GET /api/auth/github/callback: user upsert result', {
          userId: user?._id?.toString?.() || null,
          username: user?.username || null
        });

        // Create JWT containing the database user ID
        console.log('GET /api/auth/github/callback: signing JWT for user', { userId: user._id?.toString?.() });
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });

        // Set JWT in an httpOnly cookie
        console.log('GET /api/auth/github/callback: setting cookie jwt (httpOnly)', { secure: process.env.NODE_ENV !== 'development' });
        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development', // Use secure cookies in production
            maxAge: 24 * 60 * 60 * 1000, // 1 day
        });

        console.log('GET /api/auth/github/callback: redirecting to frontend dashboard', { frontendUrl: `${frontendUrl}/dashboard` });
        res.redirect(`${frontendUrl}/dashboard`);

    } catch (error) {
        console.error('GET /api/auth/github/callback: Error during GitHub OAuth callback', error && error.response ? {
          message: error.message,
          status: error.response.status,
          data: error.response.data
        } : { message: error.message });
       console.log('GET /api/auth/github/callback: redirecting to frontend with error', { frontendUrl: `${frontendUrl}/?error=oauth_failed` });
       res.redirect(`${frontendUrl}/?error=oauth_failed`);
    }
});

// New route to get the logged-in user's profile
router.get('/profile', async (req, res) => {
  console.log('GET /api/auth/profile: called', { cookies: !!req.cookies, timestamp: new Date().toISOString() });
  try {
    const token = req.cookies && req.cookies.jwt;
    console.log('GET /api/auth/profile: token present:', !!token);
    if (!token) {
      console.warn('GET /api/auth/profile: no jwt cookie found');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('GET /api/auth/profile: decoded token', { decoded });

    const user = await User.findById(decoded.id).select('-accessToken'); // Don't send token to frontend
    console.log('GET /api/auth/profile: db lookup result', { userId: user?._id?.toString?.() || null });

    if (!user) {
      console.warn('GET /api/auth/profile: user not found for id', decoded.id);
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('GET /api/auth/profile: error', { message: error.message });
    res.status(401).json({ error: 'Invalid token' });
  }
});

// New route for logging out
router.post('/logout', (req, res) => {
    console.log('POST /api/auth/logout: clearing cookie and logging out', { timestamp: new Date().toISOString() });
    res.clearCookie('jwt');
    res.json({ message: 'Logged out successfully' });
});

export default router;