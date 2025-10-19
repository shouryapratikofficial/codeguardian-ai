import express from 'express';
import axios from 'axios';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import Repository from '../models/Repository.js';

const router = express.Router();

console.log('repoRoutes: initialized', { timestamp: new Date().toISOString() });

/**
 * @route   GET /api/repos
 * @desc    Get all of a user's repositories from GitHub
 * @access  Private
 */
router.get('/', isAuthenticated, async (req, res) => {
  console.log('GET /api/repos: called', {
    userId: req.user?._id?.toString?.() || null,
    username: req.user?.username || null,
    timestamp: new Date().toISOString()
  });

  try {
    const accessToken = req.user.accessToken;
    console.log('GET /api/repos: accessToken present:', !!accessToken, { tokenLength: accessToken ? accessToken.length : 0 });

    const url = 'https://api.github.com/user/repos';
    console.log('GET /api/repos: fetching from GitHub', { url, params: { sort: 'updated', per_page: 100 } });

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { sort: 'updated', per_page: 100 },
    });

    console.log('GET /api/repos: github responded', { status: response.status, returned: Array.isArray(response.data) ? response.data.length : typeof response.data });

    const repos = response.data.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      url: repo.html_url,
    }));

    console.log('GET /api/repos: mapped repos', { reposCount: repos.length });

    res.json(repos);
  } catch (error) {
    console.error('GET /api/repos: Error fetching GitHub repos:', {
      message: error.message,
      responseData: error.response ? (error.response.data || error.response.status) : null
    });
    res.status(500).json({ error: 'Failed to fetch repositories from GitHub.' });
  }
});

/**
 * @route   GET /api/repos/activated
 * @desc    Get all repositories actively monitored by the app
 * @access  Private
 */
router.get('/activated', isAuthenticated, async (req, res) => {
  console.log('GET /api/repos/activated: called', {
    userId: req.user?._id?.toString?.() || null,
    timestamp: new Date().toISOString()
  });

  try {
    const activeRepos = await Repository.find({ owner: req.user._id, isActive: true }).select('name _id');
    console.log('GET /api/repos/activated: db returned', { count: activeRepos.length });
    res.json(activeRepos);
  } catch (error) {
    console.error('GET /api/repos/activated: Error fetching activated repos:', { message: error.message });
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

  console.log('POST /api/repos/:owner/:repo/activate: called', {
    params: { owner, repo, fullName },
    body: { githubRepoId },
    userId: req.user?._id?.toString?.() || null,
    timestamp: new Date().toISOString()
  });

  try {
    let repository = await Repository.findOne({ githubRepoId: String(githubRepoId), owner: req.user._id });
    console.log('POST activate: repository lookup result', { found: !!repository, repositoryId: repository?._id?.toString?.() || null });

    const webhookUrl = `${process.env.BACKEND_URL}/api/webhooks/github`;
    const webhookSecret = process.env.WEBHOOK_SECRET;
    const hookConfig = {
      name: 'web',
      active: true,
      events: ['pull_request'],
      config: { url: webhookUrl, content_type: 'json', secret: webhookSecret },
    };

    console.log('POST activate: webhook config prepared', { webhookUrl, hasSecret: !!webhookSecret });

    // Repository exists → reactivate
    if (repository) {
      if (repository.isActive) {
        console.log('POST activate: repository already active', { fullName });
        return res.status(409).json({ message: 'Repository is already active.' });
      }

      console.log('POST activate: creating webhook for existing repository', { fullName });
      const response = await axios.post(
        `https://api.github.com/repos/${fullName}/hooks`,
        hookConfig,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      console.log('POST activate: webhook created', { status: response.status, webhookId: response.data?.id });

      repository.isActive = true;
      repository.webhookId = response.data.id.toString();
      await repository.save();
      console.log('POST activate: repository reactivated and saved', { repositoryId: repository._id?.toString?.() });

      return res.status(200).json({ message: 'Repository reactivated successfully!', repo: repository });
    }

    // New repository → create
    console.log('POST activate: creating webhook for new repository', { fullName });
    const response = await axios.post(
      `https://api.github.com/repos/${fullName}/hooks`,
      hookConfig,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    console.log('POST activate: webhook created for new repo', { status: response.status, webhookId: response.data?.id });

    const newRepo = new Repository({
      githubRepoId: String(githubRepoId),
      name: fullName,
      owner: req.user._id,
      webhookId: response.data.id.toString(),
      isActive: true,
    });
    await newRepo.save();

    console.log('POST activate: new repository saved', { newRepoId: newRepo._id?.toString?.(), name: newRepo.name });

    return res.status(201).json({ message: 'Repository activated successfully!', repo: newRepo });

  } catch (error) {
    console.error('POST /api/repos/:owner/:repo/activate: Error activating repository:', {
      message: error.message,
      responseData: error.response ? (error.response.data || error.response.status) : null
    });
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
    console.log('POST /api/repos/:repoId/deactivate: called', { repoId, userId: req.user?._id?.toString?.() || null, timestamp: new Date().toISOString() });

    const accessToken = req.user.accessToken;
    console.log('POST deactivate: accessToken present:', !!accessToken, { tokenLength: accessToken ? accessToken.length : 0 });

    const repo = await Repository.findOne({ _id: repoId, owner: req.user._id });
    console.log('POST deactivate: db lookup result', { found: !!repo, repoName: repo?.name || null, isActive: repo?.isActive || false });

    if (!repo || !repo.isActive) {
      console.log('POST deactivate: not found or already inactive', { repoId });
      return res.status(404).json({ message: 'Repository not found or already inactive.' });
    }

    // Delete webhook only if it exists
    if (repo.webhookId) {
      try {
        console.log('POST deactivate: deleting webhook', { repoName: repo.name, webhookId: repo.webhookId });
        await axios.delete(
          `https://api.github.com/repos/${repo.name}/hooks/${repo.webhookId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        console.log('POST deactivate: webhook delete request sent');
      } catch (err) {
        if (err.response?.status !== 404) {
          console.error('POST deactivate: error deleting webhook', { message: err.message, responseData: err.response?.data });
          throw err; // rethrow other errors
        }
        console.warn('POST deactivate: webhook already deleted (404) - continuing', { repoName: repo.name });
      }
    } else {
      console.log('POST deactivate: no webhookId present for repo', { repoName: repo.name });
    }

    // Update DB
    repo.isActive = false;
    repo.webhookId = undefined; // safe if optional in schema
    await repo.save();
    console.log('POST deactivate: repository updated in DB', { repoId: repo._id?.toString?.(), isActive: repo.isActive });

    res.json({ message: `Successfully deactivated ${repo.name}.` });

  } catch (error) {
    console.error('POST /api/repos/:repoId/deactivate: Error deactivating repository:', {
      message: error.message,
      responseData: error.response ? (error.response.data || error.response.status) : null
    });
    res.status(500).json({ error: 'Failed to deactivate repository.' });
  }
});

export default router;
