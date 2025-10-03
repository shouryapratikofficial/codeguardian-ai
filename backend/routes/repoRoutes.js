import express from 'express';
import axios from 'axios';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import Repository from '../models/Repository.js';

const router = express.Router();

/**
 * @route   GET /api/repos
 * @desc    Get all of a user's repositories from GitHub
 * @access  Private
 */
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const accessToken = req.user.accessToken;
    const response = await axios.get('https://api.github.com/user/repos', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { sort: 'updated', per_page: 100 },
    });

    const repos = response.data.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      url: repo.html_url,
    }));

    res.json(repos);
  } catch (error) {
    console.error('Error fetching GitHub repos:', error.message);
    res.status(500).json({ error: 'Failed to fetch repositories from GitHub.' });
  }
});

/**
 * @route   GET /api/repos/activated
 * @desc    Get all repositories actively monitored by the app
 * @access  Private
 */
router.get('/activated', isAuthenticated, async (req, res) => {
  try {
    const activeRepos = await Repository.find({ owner: req.user._id, isActive: true }).select('name _id');
    res.json(activeRepos);
  } catch (error) {
    console.error('Error fetching activated repos:', error);
    res.status(500).json({ error: 'Failed to fetch activated repositories.' });
  }
});

/**
 * @route   POST /api/repos/:owner/:repo/activate
 * @desc    Activate or reactivate a repository
 * @access  Private
 */
router.post('/:owner/:repo/activate', isAuthenticated, async (req, res) => {
  const { owner, repo } = req.params;
  const { githubRepoId } = req.body;
  const fullName = `${owner}/${repo}`;
  const accessToken = req.user.accessToken;

  try {
    let repository = await Repository.findOne({ githubRepoId: String(githubRepoId), owner: req.user._id });

    const webhookUrl = `${process.env.NGROK_FORWARDING_URL}/api/webhooks/github`;
    const webhookSecret = process.env.WEBHOOK_SECRET;
    const hookConfig = {
      name: 'web',
      active: true,
      events: ['pull_request'],
      config: { url: webhookUrl, content_type: 'json', secret: webhookSecret },
    };

    // Repository exists → reactivate
    if (repository) {
      if (repository.isActive) {
        return res.status(409).json({ message: 'Repository is already active.' });
      }

      const response = await axios.post(
        `https://api.github.com/repos/${fullName}/hooks`,
        hookConfig,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      repository.isActive = true;
      repository.webhookId = response.data.id.toString();
      await repository.save();

      return res.status(200).json({ message: 'Repository reactivated successfully!', repo: repository });
    }

    // New repository → create
    const response = await axios.post(
      `https://api.github.com/repos/${fullName}/hooks`,
      hookConfig,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const newRepo = new Repository({
      githubRepoId: String(githubRepoId),
      name: fullName,
      owner: req.user._id,
      webhookId: response.data.id.toString(),
      isActive: true,
    });
    await newRepo.save();

    return res.status(201).json({ message: 'Repository activated successfully!', repo: newRepo });

  } catch (error) {
    console.error('Error activating repository:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to activate repository.' });
  }
});

/**
 * @route   POST /api/repos/:repoId/deactivate
 * @desc    Deactivate a repository (soft delete)
 * @access  Private
 */
router.post('/:repoId/deactivate', isAuthenticated, async (req, res) => {
  try {
    const { repoId } = req.params;
    const accessToken = req.user.accessToken;

    const repo = await Repository.findOne({ _id: repoId, owner: req.user._id });
    if (!repo || !repo.isActive) {
      return res.status(404).json({ message: 'Repository not found or already inactive.' });
    }

    // Delete webhook only if it exists
    if (repo.webhookId) {
      try {
        await axios.delete(
          `https://api.github.com/repos/${repo.name}/hooks/${repo.webhookId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
      } catch (err) {
        if (err.response?.status !== 404) throw err; // ignore 404, rethrow other errors
        console.warn(`Webhook already deleted for ${repo.name}`);
      }
    }

    // Update DB
    repo.isActive = false;
    repo.webhookId = undefined; // safe if optional in schema
    await repo.save();

    res.json({ message: `Successfully deactivated ${repo.name}.` });

  } catch (error) {
    console.error('Error deactivating repository:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to deactivate repository.' });
  }
});

export default router;
