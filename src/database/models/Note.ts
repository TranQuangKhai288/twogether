import mongoose, { Schema, Document, Types } from 'mongoose';

export interface INote extends Document {
  _id: Types.ObjectId;
  coupleId: Types.ObjectId;
  authorId: Types.ObjectId;
  content: string;
  tags: string[];
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema<INote>(
  {
    coupleId: {
      type: Schema.Types.ObjectId,
      ref: 'Couple',
      required: [true, 'Couple ID is required'],
      
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author ID is required'],
      
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      trim: true,
      maxlength: [2000, 'Content cannot exceed 2000 characters'],
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function(tags: string[]) {
          return tags.length <= 10;
        },
        message: 'Cannot have more than 10 tags',
      },
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(_doc, ret) {
        const { __v, ...cleanRet } = ret;
        return cleanRet;
      },
    },
  }
);

// Indexes
noteSchema.index({ coupleId: 1 });
noteSchema.index({ authorId: 1 });
noteSchema.index({ coupleId: 1, isPrivate: 1 });
noteSchema.index({ coupleId: 1, authorId: 1 });
noteSchema.index({ tags: 1 });
noteSchema.index({ createdAt: -1 });

// Text index for content search
noteSchema.index({ content: 'text', tags: 'text' });

// Pre-save middleware to clean tags
noteSchema.pre('save', function(next) {
  if (this.isModified('tags')) {
    this.tags = this.tags
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0)
      .filter((tag, index, array) => array.indexOf(tag) === index); // Remove duplicates
  }
  next();
});

// Virtual for content preview
noteSchema.virtual('contentPreview').get(function() {
  const maxLength = 100;
  return this.content.length > maxLength 
    ? this.content.substring(0, maxLength) + '...' 
    : this.content;
});

export const Note = mongoose.model<INote>('Note', noteSchema);