import mongoose, { Schema, Document, Types } from "mongoose";
import validator from "validator";

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  gender: "male" | "female" | "other";
  birthday?: Date;
  avatarUrl?: string;
  coupleId?: Types.ObjectId | null;
  preferences: {
    notifications: boolean;
    darkMode: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    passwordHash: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    gender: {
      type: String,
      enum: {
        values: ["male", "female", "other"],
        message: "Gender must be male, female, or other",
      },
      required: [true, "Gender is required"],
    },
    birthday: {
      type: Date,
      validate: {
        validator: function (value: Date) {
          return !value || value < new Date();
        },
        message: "Birthday cannot be in the future",
      },
    },
    avatarUrl: {
      type: String,
      validate: [validator.isURL, "Please provide a valid URL"],
    },
    coupleId: {
      type: Schema.Types.ObjectId,
      ref: "Couple",
      default: null,
    },
    preferences: {
      notifications: {
        type: Boolean,
        default: true,
      },
      darkMode: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc, ret) {
        const { passwordHash, __v, ...cleanRet } = ret;
        return cleanRet;
      },
    },
    toObject: {
      transform: function (_doc, ret) {
        const { passwordHash, __v, ...cleanRet } = ret;
        return cleanRet;
      },
    },
  }
);

// Indexes
userSchema.index({ coupleId: 1 }); // CoupleId index
userSchema.index({ createdAt: -1 }); // CreatedAt index for sorting

// Virtual for age calculation
userSchema.virtual("age").get(function () {
  if (!this.birthday) return null;
  const today = new Date();
  const birthDate = new Date(this.birthday);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
});

// Pre-save middleware
userSchema.pre("save", function (next) {
  if (this.isModified("email")) {
    this.email = this.email.toLowerCase();
  }
  next();
});

export const User = mongoose.model<IUser>("User", userSchema);
