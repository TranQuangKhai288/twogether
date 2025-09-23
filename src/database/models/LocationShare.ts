import mongoose, { Schema, Document, Types } from "mongoose";

export interface ILocationShare extends Document {
  _id: Types.ObjectId;
  coupleId: Types.ObjectId;
  userId: Types.ObjectId;
  lat: number;
  lng: number;
  sharedAt: Date;
  expiresAt: Date;
}

const locationShareSchema = new Schema<ILocationShare>(
  {
    coupleId: {
      type: Schema.Types.ObjectId,
      ref: "Couple",
      required: [true, "Couple ID is required"],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    lat: {
      type: Number,
      required: [true, "Latitude is required"],
      min: [-90, "Latitude must be between -90 and 90"],
      max: [90, "Latitude must be between -90 and 90"],
    },
    lng: {
      type: Number,
      required: [true, "Longitude is required"],
      min: [-180, "Longitude must be between -180 and 180"],
      max: [180, "Longitude must be between -180 and 180"],
    },
    sharedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: [true, "Expiration date is required"],
    },
  },
  {
    timestamps: false,
    toJSON: {
      transform: function (_doc, ret) {
        const { __v, ...cleanRet } = ret;
        return cleanRet;
      },
    },
  }
);

// Indexes
locationShareSchema.index({ coupleId: 1 });
locationShareSchema.index({ userId: 1 });
locationShareSchema.index({ coupleId: 1, userId: 1 });
locationShareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
locationShareSchema.index({ sharedAt: -1 });

// Geospatial index for location-based queries
locationShareSchema.index({ location: "2dsphere" });

// Virtual for coordinate object compatible with geospatial queries
locationShareSchema.virtual("location").get(function () {
  return {
    type: "Point",
    coordinates: [this.lng, this.lat],
  };
});

// Virtual for checking if location is expired
locationShareSchema.virtual("isExpired").get(function () {
  return new Date() > this.expiresAt;
});

// Virtual for time remaining
locationShareSchema.virtual("timeRemaining").get(function () {
  const now = new Date();
  if (now > this.expiresAt) return 0;

  const diffTime = this.expiresAt.getTime() - now.getTime();
  return Math.floor(diffTime / (1000 * 60)); // Return minutes remaining
});

// Static method to get active location shares for a couple
locationShareSchema.statics.getActiveLocations = function (
  coupleId: Types.ObjectId
) {
  return this.find({
    coupleId,
    expiresAt: { $gt: new Date() },
  }).populate("userId", "name avatarUrl");
};

// Static method to create location share with default expiration
locationShareSchema.statics.createLocationShare = function (
  coupleId: Types.ObjectId,
  userId: Types.ObjectId,
  lat: number,
  lng: number,
  expirationMinutes: number = 30
) {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);

  return this.create({
    coupleId,
    userId,
    lat,
    lng,
    expiresAt,
  });
};

// Pre-save middleware to set default expiration if not provided
locationShareSchema.pre("save", function (next) {
  if (!this.expiresAt) {
    this.expiresAt = new Date();
    this.expiresAt.setMinutes(this.expiresAt.getMinutes() + 30); // Default 30 minutes
  }
  next();
});

export const LocationShare = mongoose.model<ILocationShare>(
  "LocationShare",
  locationShareSchema
);
