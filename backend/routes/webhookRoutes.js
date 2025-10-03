import express from 'express';
import crypto from 'crypto';
import axios from 'axios';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Repository from '../models/Repository.js';
import User from '../models/User.js';
import { decrypt } from '../utils/encryption.js';
import Review from '../models/Review.js';
const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


// This new async function will do the slow work in the background
const processPullRequest = async (payload) => {
    try {
        const repoName = payload.repository.full_name;
        const prNumber = payload.pull_request.number;
        const diffUrl = payload.pull_request.diff_url;
        
        // 1. Fetch the code changes ("diff")
        const diffResponse = await axios.get(diffUrl);
        const diff = diffResponse.data;

        // Add checks for empty or overly large diffs
        if (!diff || diff.length === 0) {
            console.log(`[${repoName}#${prNumber}] Diff is empty, skipping review.`);
            return;
        }
        if (diff.length > 4000) {
            console.log(`[${repoName}#${prNumber}] Diff is too large, skipping review.`);
            // Optionally, post a comment saying the diff is too large
            // await postComment(repoName, prNumber, "This pull request is too large for an automated review.");
            return;
        }

        // 2. Prepare the prompt for the AI
        const prompt = `
            You are an expert code reviewer. Review the following code diff.
            Focus on potential bugs, performance optimizations, and code clarity.
            Provide feedback as a concise, bulleted list. If all is well, say "Looks good to me!".

            Code Diff:
            \`\`\`diff
            ${diff}
            \`\`\`
        `;

       // 3. Send to Google Gemini for review (This is the new part)
        console.log(`[${repoName}#${prNumber}] Sending diff to Google Gemini for review...`);
// NEW, CORRECT LINE
        // NEW, STABLE LINE
        const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-pro"});
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const review = response.text();
        console.log(`[${repoName}#${prNumber}] Review received from Gemini.`);
        // 4. Find the user who owns this repo to get their access token
        const repository = await Repository.findOne({ name: repoName });
        if (!repository) {
            console.log(`[${repoName}] Repository not found in our database. Cannot post comment.`);
            return;
        }
        const user = await User.findById(repository.owner);
        const accessToken = decrypt(user.accessToken);

        // 5. Post the review as a comment on the pull request
        console.log(`[${repoName}#${prNumber}] Posting review comment to GitHub...`);
        await axios.post(
            `https://api.github.com/repos/${repoName}/issues/${prNumber}/comments`,
            { body: `**CodeGuardian AI Review:**\n\n${review}` },
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        console.log(`[${repoName}#${prNumber}] Review posted successfully!`);

                // NEW: 6. Save the review to our database
        const newReview = new Review({
            repository: repository._id,
            pullRequestTitle: payload.pull_request.title,
            pullRequestNumber: prNumber,
            pullRequestUrl: payload.pull_request.html_url,
            reviewContent: review,
        });
        await newReview.save();
        console.log(`[${repoName}#${prNumber}] Review saved to database.`);

    } catch (error) {
        // Log errors that happen during the background processing
        console.error('Error processing pull request in background:', error.response ? error.response.data : error.message);
    }
};

// Middleware to verify the webhook signature
const verifyGitHubSignature = (req, res, next) => {
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
        return res.status(401).send('No signature found');
    }

    const hmac = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET);
    // Use the rawBody saved by express.json middleware
    const digest = `sha256=${hmac.update(req.rawBody).digest('hex')}`;

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
        return res.status(401).send('Invalid signature');
    }

    next();
};

// The main webhook handler route
router.post('/github', verifyGitHubSignature, (req, res) => {
    // The rawBody is already attached by our updated express.json config in index.js
    const payload = JSON.parse(req.rawBody);
    
    // Check for relevant PR actions
    if (payload.action === 'opened' || payload.action === 'reopened') {
        // Acknowledge the request immediately to prevent timeout
        res.status(200).send('Event received. Processing will start shortly.');
        
        // Perform the slow tasks in the background
        processPullRequest(payload);
    } else {
        // For other actions, just acknowledge and do nothing
        res.status(200).send('Event ignored');
    }
});

export default router;