import mongoose, { Schema, Document, Types } from 'mongoose';
import validator from 'validator';

export interface IPhoto extends Document {
  _id: Types.ObjectId;
  coupleId: Types.ObjectId;
  uploaderId: Types.ObjectId;
  url: string;
  caption?: string;
  isFavorite: boolean;
  createdAt: Date;
}

const photoSchema = new Schema<IPhoto>(
  {
    coupleId: {
      type: Schema.Types.ObjectId,
      ref: 'Couple',
      required: [true, 'Couple ID is required'],
      
    },
    uploaderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader ID is required'],
      
    },
    url: {
      type: String,
      required: [true, 'Photo URL is required'],
      validate: [validator.isURL, 'Please provide a valid URL'],
    },
    caption: {
      type: String,
      trim: true,
      maxlength: [500, 'Caption cannot exceed 500 characters'],
    },
    isFavorite: {
      type: Boolean,
      default: false,
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
photoSchema.index({ coupleId: 1 });
photoSchema.index({ uploaderId: 1 });
photoSchema.index({ coupleId: 1, isFavorite: 1 });
photoSchema.index({ coupleId: 1, createdAt: -1 });
photoSchema.index({ createdAt: -1 });

// Virtual for photo age
photoSchema.virtual('photoAge').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffTime = Math.abs(now.getTime() - created.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
});

export const Photo = mongoose.model<IPhoto>('Photo', photoSchema);