import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICouple extends Document {
  _id: Types.ObjectId;
  users: Types.ObjectId[];
  anniversaryDate: Date;
  inviteCode: string;
  status: "active" | "inactive" | "pending" | "blocked";
  settings: {
    allowLocationShare: boolean;
    theme: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const coupleSchema = new Schema<ICouple>(
  {
    users: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      validate: {
        validator: function (users: Types.ObjectId[]) {
          return users.length === 2;
        },
        message: "A couple must have exactly 2 users",
      },
      required: true,
    },
    anniversaryDate: {
      type: Date,
      required: [true, "Anniversary date is required"],
      validate: {
        validator: function (value: Date) {
          return value <= new Date();
        },
        message: "Anniversary date cannot be in the future",
      },
    },
    inviteCode: {
      type: String,
      required: [true, "Invite code is required"],
      unique: true,
      minlength: [6, "Invite code must be at least 6 characters"],
      maxlength: [12, "Invite code cannot exceed 12 characters"],
      uppercase: true,
    },
    status: {
      type: String,
      enum: {
        values: ["active", "inactive", "pending", "blocked"],
        message: "Status must be one of: active, inactive, pending, blocked",
      },
      default: "pending",
    },
    settings: {
      allowLocationShare: {
        type: Boolean,
        default: false,
      },
      theme: {
        type: String,
        default: "default",
      },
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
coupleSchema.index({ users: 1 });
coupleSchema.index({ anniversaryDate: 1 });
coupleSchema.index({ createdAt: -1 });

// Virtual for relationship duration
coupleSchema.virtual("relationshipDuration").get(function () {
  if (!this.anniversaryDate) return null;

  const now = new Date();
  const anniversary = new Date(this.anniversaryDate);
  const diffTime = Math.abs(now.getTime() - anniversary.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    days: diffDays,
    years: Math.floor(diffDays / 365),
    months: Math.floor((diffDays % 365) / 30),
    remainingDays: diffDays % 30,
  };
});

// Static method to generate unique invite code
coupleSchema.statics.generateInviteCode = async function (): Promise<string> {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code: string;
  let isUnique = false;

  do {
    code = "";
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    const existingCouple = await this.findOne({ inviteCode: code });
    isUnique = !existingCouple;
  } while (!isUnique);

  return code;
};

// Pre-save middleware to generate invite code if not provided
coupleSchema.pre("save", async function (next) {
  if (!this.inviteCode) {
    this.inviteCode = await (this.constructor as any).generateInviteCode();
  }
  next();
});

export const Couple = mongoose.model<ICouple>("Couple", coupleSchema);
