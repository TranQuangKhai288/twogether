import mongoose, { Schema, Document, Types, Model } from "mongoose";

export interface ICoupleInvitation extends Document {
  _id: Types.ObjectId;
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  anniversaryDate: Date;
  message?: string;
  status: "pending" | "accepted" | "rejected" | "expired";
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  isExpired(): boolean;
}

export interface ICoupleInvitationModel extends Model<ICoupleInvitation> {
  // Static methods
  cleanupExpired(): Promise<any>;
}

const coupleInvitationSchema = new Schema<ICoupleInvitation>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender is required"],
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Receiver is required"],
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
    message: {
      type: String,
      maxlength: [500, "Message cannot exceed 500 characters"],
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "accepted", "rejected", "expired"],
        message: "Status must be one of: pending, accepted, rejected, expired",
      },
      default: "pending",
    },
    expiresAt: {
      type: Date,
      required: [true, "Expiration date is required"],
      default: function () {
        // Default expiration: 7 days from creation
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
coupleInvitationSchema.index({ receiver: 1, status: 1 });
coupleInvitationSchema.index({ sender: 1, status: 1 });
coupleInvitationSchema.index({ expiresAt: 1 });

// Compound index to prevent duplicate pending invitations
coupleInvitationSchema.index(
  { sender: 1, receiver: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
  }
);

// Pre-save middleware to prevent self-invitation
coupleInvitationSchema.pre("save", function (next) {
  if (this.sender.equals(this.receiver)) {
    return next(new Error("Cannot send invitation to yourself"));
  }
  next();
});

// Instance method to check if invitation is expired
coupleInvitationSchema.methods.isExpired = function () {
  return this.expiresAt < new Date() || this.status === "expired";
};

// Static method to cleanup expired invitations
coupleInvitationSchema.statics.cleanupExpired = function () {
  return this.updateMany(
    {
      status: "pending",
      expiresAt: { $lt: new Date() },
    },
    {
      $set: { status: "expired" },
    }
  );
};

export const CoupleInvitation = mongoose.model<
  ICoupleInvitation,
  ICoupleInvitationModel
>("CoupleInvitation", coupleInvitationSchema);
