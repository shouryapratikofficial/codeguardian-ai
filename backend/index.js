// backend/index.js
import express from 'express';
import dotenv from 'dotenv';
import authRouter from './auth.js';
import cookieParser from 'cookie-parser'; // Import cookie-parser
import repoRouter from './routes/repoRoutes.js'
import connectDB from './config/db.js';
import webhookRouter from './routes/webhookRoutes.js'; // Import webhook router
import reviewRouter from './routes/reviewRoutes.js'; // Import review router

dotenv.config();
connectDB(); // Connect to the database

const app = express();
app.use(express.json({
  verify: (req, res, buf) => {
    // This saves the raw body to a new property on the request object
    req.rawBody = buf.toString();
  }
}));
const port = process.env.PORT || 5000;

app.use(cookieParser()); // Use cookie-parser middleware
import cors from 'cors';
app.use(cors({
  origin: ['https://codeguardian-ai.vercel.app'] // frontend domain
}));

app.use('/api/auth', authRouter);
app.use('/api/repos', repoRouter); // Use the repo router
app.use('/api/webhooks', webhookRouter); // Use the webhook router
app.use('/api/reviews', reviewRouter); // Use the review router

app.get('/api', (req, res) => {
  res.json({ message: 'Hello from CodeGuardian AI Backend! 👋' });
});

app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});