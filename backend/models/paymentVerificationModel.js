// models/paymentVerificationModel.js
import mongoose from "mongoose";

const paymentVerificationSchema = new mongoose.Schema(
  {
    purpose: {
      type: String,
      enum: [
        "plan_upgrade",
        "sponsorship_basic_boost",
        "sponsorship_premium",
        "task_post_payment",
        "task_selection_payment",
      ],
      required: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ["plus", "ultra"],
      default: null,
    },
    listingPlan: {
      type: String,
      enum: ["basic_boost", "premium"],
      default: null,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },
    verifiedAt: {
      type: Date,
      default: Date.now,
    },
    consumedAt: {
      type: Date,
      default: null,
      index: true,
    },
    consumedByTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
      index: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

paymentVerificationSchema.index({ purpose: 1, razorpayOrderId: 1, user: 1 });

export default mongoose.models.PaymentVerification ||
  mongoose.model("PaymentVerification", paymentVerificationSchema);
