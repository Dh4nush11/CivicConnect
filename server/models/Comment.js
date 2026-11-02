const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  issueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Issue',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: [true, 'Comment text is required'],
    trim: true,
    maxlength: [500, 'Comment cannot exceed 500 characters'],
  },
}, {
  timestamps: true,
});

commentSchema.index({ issueId: 1 });
commentSchema.index({ userId: 1 });

module.exports = mongoose.model('Comment', commentSchema);
