import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAnniversary extends Document {
  _id: Types.ObjectId;
  coupleId: Types.ObjectId;
  title: string;
  date: Date;
  remindBefore: number;
  repeatAnnually: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const anniversarySchema = new Schema<IAnniversary>(
  {
    coupleId: {
      type: Schema.Types.ObjectId,
      ref: "Couple",
      required: [true, "Couple ID is required"],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
    remindBefore: {
      type: Number,
      default: 1,
      min: [0, "Remind before cannot be negative"],
      max: [365, "Remind before cannot exceed 365 days"],
    },
    repeatAnnually: {
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
anniversarySchema.index({ coupleId: 1 });
anniversarySchema.index({ date: 1 });
anniversarySchema.index({ coupleId: 1, date: 1 });
anniversarySchema.index({ createdAt: -1 });

// Virtual for days until anniversary
anniversarySchema.virtual("daysUntil").get(function () {
  const now = new Date();
  const anniversaryDate = new Date(this.date);

  // If it's a recurring anniversary, calculate for this year or next year
  if (this.repeatAnnually) {
    const currentYear = now.getFullYear();
    anniversaryDate.setFullYear(currentYear);

    // If the anniversary has passed this year, set it for next year
    if (anniversaryDate < now) {
      anniversaryDate.setFullYear(currentYear + 1);
    }
  }

  const diffTime = anniversaryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
});

// Virtual for reminder status
anniversarySchema.virtual("shouldRemind").get(function () {
  const now = new Date();
  const anniversaryDate = new Date(this.date);

  // If it's a recurring anniversary, calculate for this year or next year
  if (this.repeatAnnually) {
    const currentYear = now.getFullYear();
    anniversaryDate.setFullYear(currentYear);

    // If the anniversary has passed this year, set it for next year
    if (anniversaryDate < now) {
      anniversaryDate.setFullYear(currentYear + 1);
    }
  }

  const diffTime = anniversaryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays <= this.remindBefore && diffDays >= 0;
});

export const Anniversary = mongoose.model<IAnniversary>(
  "Anniversary",
  anniversarySchema
);
