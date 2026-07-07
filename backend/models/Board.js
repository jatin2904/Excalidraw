import mongoose from 'mongoose';

const boardSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'Untitled Board' },
    elements: { type: [mongoose.Schema.Types.Mixed], default: [] },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export default mongoose.model('Board', boardSchema);
