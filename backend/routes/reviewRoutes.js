// backend/routes/reviewRoutes.js
import express from 'express';
import Review from '../models/Review.js';
import Repository from '../models/Repository.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET all reviews for a specific repository
router.get('/:repoId', isAuthenticated, async (req, res) => {
  try {
    const { repoId } = req.params;

    // Verify that the repo belongs to the logged-in user for security
    const repo = await Repository.findOne({ _id: repoId, owner: req.user._id });
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found or access denied.' });
    }

    const reviews = await Review.find({ repository: repoId }).sort({ createdAt: -1 });
    res.json({ repo, reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
});

export default router;