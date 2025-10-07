import mongoose, { Schema, Document, Types } from "mongoose";

export enum NoteType {
  GENERAL = "general",
  REMINDER = "reminder",
  IMPORTANT = "important",
  ANNIVERSARY = "anniversary",
  DATE = "date",
  TODO = "todo",
}

export interface INote extends Document {
  _id: Types.ObjectId;
  coupleId: Types.ObjectId;
  authorId: Types.ObjectId;
  title: string;
  content: string;
  tags: string[];
  type: NoteType;
  isPrivate: boolean;
  reminderDate?: Date;
  notificationEnabled: boolean;
  notificationSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema<INote>(
  {
    coupleId: {
      type: Schema.Types.ObjectId,
      ref: "Couple",
      required: [true, "Couple ID is required"],
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author ID is required"],
    },
    title: {
      type: String,
      trim: true,
      required: [true, "Title is required"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      trim: true,
      maxlength: [2000, "Content cannot exceed 2000 characters"],
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function (tags: string[]) {
          return tags.length <= 10;
        },
        message: "Cannot have more than 10 tags",
      },
    },
    type: {
      type: String,
      enum: Object.values(NoteType),
      default: NoteType.GENERAL,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    reminderDate: {
      type: Date,
      required: function () {
        return this.type === NoteType.REMINDER || this.type === NoteType.DATE;
      },
    },
    notificationEnabled: {
      type: Boolean,
      default: function () {
        return (
          this.type === NoteType.REMINDER ||
          this.type === NoteType.DATE ||
          this.type === NoteType.IMPORTANT
        );
      },
    },
    notificationSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc, ret) {
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
noteSchema.index({ type: 1 });
noteSchema.index({ reminderDate: 1 });
noteSchema.index({ notificationEnabled: 1, notificationSent: 1 });
noteSchema.index({
  reminderDate: 1,
  notificationEnabled: 1,
  notificationSent: 1,
});
noteSchema.index({ createdAt: -1 });

// Text index for content search
noteSchema.index({ content: "text", tags: "text" });

// Pre-save middleware to clean tags
noteSchema.pre("save", function (next) {
  if (this.isModified("tags")) {
    this.tags = this.tags
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0)
      .filter((tag, index, array) => array.indexOf(tag) === index); // Remove duplicates
  }
  next();
});

// Virtual for content preview
noteSchema.virtual("contentPreview").get(function () {
  const maxLength = 100;
  return this.content.length > maxLength
    ? this.content.substring(0, maxLength) + "..."
    : this.content;
});

// Virtual for should remind
noteSchema.virtual("shouldRemind").get(function () {
  if (
    !this.notificationEnabled ||
    this.notificationSent ||
    !this.reminderDate
  ) {
    return false;
  }

  const now = new Date();
  const reminderTime = new Date(this.reminderDate);

  // Check if reminder time has passed and it's within 24 hours
  return (
    reminderTime <= now &&
    now.getTime() - reminderTime.getTime() < 24 * 60 * 60 * 1000
  );
});

// Virtual for days until reminder
noteSchema.virtual("daysUntilReminder").get(function () {
  if (!this.reminderDate) return null;

  const now = new Date();
  const reminderTime = new Date(this.reminderDate);
  const diffTime = reminderTime.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
});

export const Note = mongoose.model<INote>("Note", noteSchema);
