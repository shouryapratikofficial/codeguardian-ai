// backend/models/Repository.js
import mongoose from 'mongoose';

const repositorySchema = new mongoose.Schema({
  githubRepoId: { type: String, required: true },
  name: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  webhookId: { type: String, required: false }, // make optional
  isActive: { type: Boolean, default: true }
});


const Repository = mongoose.model('Repository', repositorySchema);
export default Repository;