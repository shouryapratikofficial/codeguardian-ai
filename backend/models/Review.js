// backend/models/Review.js
import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  repository: { type: mongoose.Schema.Types.ObjectId, ref: 'Repository', required: true },
  pullRequestTitle: { type: String, required: true },
  pullRequestNumber: { type: Number, required: true },
  pullRequestUrl: { type: String, required: true },
  reviewContent: { type: String, required: true },
}, { timestamps: true });

const Review = mongoose.model('Review', reviewSchema);
export default Review;