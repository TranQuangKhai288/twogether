import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMood extends Document {
  _id: Types.ObjectId;
  coupleId: Types.ObjectId;
  userId: Types.ObjectId;
  mood: string;
  note?: string;
  createdAt: Date;
}

const moodSchema = new Schema<IMood>(
  {
    coupleId: {
      type: Schema.Types.ObjectId,
      ref: 'Couple',
      required: [true, 'Couple ID is required'],
      
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      
    },
    mood: {
      type: String,
      required: [true, 'Mood is required'],
      trim: true,
      maxlength: [50, 'Mood cannot exceed 50 characters'],
    },
    note: {
      type: String,
      trim: true,
      maxlength: [200, 'Note cannot exceed 200 characters'],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: function(_doc, ret) {
        const { __v, ...cleanRet } = ret;
        return cleanRet;
      },
    },
  }
);

// Indexes
moodSchema.index({ coupleId: 1 });
moodSchema.index({ userId: 1 });
moodSchema.index({ coupleId: 1, userId: 1 });
moodSchema.index({ coupleId: 1, createdAt: -1 });
moodSchema.index({ userId: 1, createdAt: -1 });
moodSchema.index({ createdAt: -1 });

// Compound index for finding latest mood by user in couple
moodSchema.index({ coupleId: 1, userId: 1, createdAt: -1 });

// Static method to get latest mood for a user
moodSchema.statics.getLatestMoodForUser = function(coupleId: Types.ObjectId, userId: Types.ObjectId) {
  return this.findOne({ coupleId, userId }).sort({ createdAt: -1 });
};

// Static method to get mood history for couple
moodSchema.statics.getMoodHistory = function(
  coupleId: Types.ObjectId, 
  limit: number = 50,
  skip: number = 0
) {
  return this.find({ coupleId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'name avatarUrl');
};

// Virtual for mood age
moodSchema.virtual('moodAge').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffTime = Math.abs(now.getTime() - created.getTime());
  const diffMinutes = Math.floor(diffTime / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
});

export const Mood = mongoose.model<IMood>('Mood', moodSchema);