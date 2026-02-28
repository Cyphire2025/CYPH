// models/userModel.js
import mongoose from "mongoose";
import BlockedIp from "./blockedIpModel.js";

function slugify(name = "") {
  return name
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

const NotificationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["selection", "rejection"], required: true },
    message: { type: String, required: true },
    link: { type: String, default: "/dashboard?tab=myApplications" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// High-level security / audit events
const SecurityEventSchema = new mongoose.Schema(
  {
    type: { type: String, required: true }, // e.g. "login_failed", "otp_sent", "account_locked"
    ip: { type: String },
    userAgent: { type: String },
    createdAt: { type: Date, default: Date.now },
    meta: { type: mongoose.Schema.Types.Mixed }, // extra info (reason, riskScore, etc.)
  },
  { _id: false }
);

// Detailed audit logs for sensitive changes
const AuditLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "email_change",
        "phone_change",
        "password_reset",
        "login",
        "login_failed",
        "otp_sent",
        "otp_failed",
        "account_locked",
        "account_unlocked",
      ],
      required: true,
    },
    oldValue: { type: String },
    newValue: { type: String },
    ip: { type: String },
    userAgent: { type: String },
    createdAt: { type: Date, default: Date.now },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const DeviceFingerprintSchema = new mongoose.Schema(
  {
    fingerprint: { type: String, required: true },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    trustLevel: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
  },
  { _id: false }
);

const ProjectMediaSchema = new mongoose.Schema(
  {
    url: String,
    public_id: String,
    original_name: String,
    contentType: String,
  },
  { _id: false }
);

const ProjectSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    link: String,
    media: [ProjectMediaSchema],
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String },

    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },

    // hashed password for manual signup
    passwordHash: { type: String },

    // Google OAuth user id (for "Continue with Google")
    googleId: { type: String },

    avatar: { type: String },

    // public profile
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, "Invalid slug format"],
    },

    bio: { type: String, maxlength: 300 },

    notifications: { type: [NotificationSchema], default: [] },

    country: { type: String },

    // phone tied to account (uniqueness enforced when verified)
    phone: {
      type: String,
      trim: true,
    },

    // verification flags
    emailVerified: {
      type: Boolean,
      default: false,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },

    // Email verification OTP (for manual email signup)
    emailOtpHash: { type: String },
    emailOtpExpiresAt: { type: Date },
    emailOtpResendCount: { type: Number, default: 0 },

    // Phone verification OTP (for signup / adding phone)
    phoneOtpHash: { type: String },
    phoneOtpExpiresAt: { type: Date },
    phoneOtpAttempts: { type: Number, default: 0 }, // max ~5 attempts
    phoneOtpResendCount: { type: Number, default: 0 }, // max ~3 resends

    // Login OTP (2FA after password)
    loginOtpHash: { type: String },
    loginOtpChannel: {
      type: String,
      enum: ["email", "phone"],
    },
    loginOtpExpiresAt: { type: Date },
    loginOtpAttempts: { type: Number, default: 0 },

    // Session invalidation: bump when password/email/phone changes
    tokenVersion: {
      type: Number,
      default: 0,
    },

    // Brute-force & account lock
    failedLoginAttempts: { type: Number, default: 0 },
    lastFailedLoginAt: { type: Date },
    accountLockedUntil: { type: Date }, // if set in future => locked
    lastLoginAt: { type: Date },
    lastLoginIp: { type: String },

    // Risk & shadow-ban
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100, // 0 = safe, 100 = max risk
    },
    shadowBanned: {
      type: Boolean,
      default: false,
    },

    // Devices seen for this user
    deviceFingerprints: { type: [DeviceFingerprintSchema], default: [] },

    // Security events (lightweight, for quick checks)
    securityEvents: { type: [SecurityEventSchema], default: [] },

    // Audit logs (sensitive changes)
    auditLogs: { type: [AuditLogSchema], default: [] },

    skills: [{ type: String }],

    isAdmin: { type: Boolean, default: false },

    plan: { type: String, enum: ["free", "plus", "ultra"], default: "free" },

    planStartedAt: { type: Date },
    planExpiresAt: { type: Date },

    upiId: { type: String },
    accountNumber: { type: String },
    ifsc: { type: String },

    // Professional-only profile data for marketplace discovery (non-personal details)
    professionalProfile: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // IP tracking for anti-abuse/anti-multiaccount
    signupIp: { type: String, index: true },
    signinIpHistory: [{ type: String }], // last N signins, for admin/audit

    projects: [ProjectSchema],
  },
  { timestamps: true }
);

/**
 * DB-level guarantee:
 * One verified phone number can only belong to a single user.
 */
userSchema.index(
  { phone: 1 },
  {
    unique: true,
    partialFilterExpression: { phoneVerified: true },
  }
);

// Auto-generate slug on save
userSchema.pre("save", async function () {
  if (!this.isModified("name") && this.slug) return;

  const baseSource = this.name || this.email || "user";
  const base = slugify(baseSource) || Math.random().toString(36).slice(2, 8);
  let candidate = base;
  let i = 0;

  while (
    await this.constructor.exists({
      slug: candidate,
      _id: { $ne: this._id },
    })
  ) {
    i += 1;
    candidate = `${base}-${i}`;
  }

  this.slug = candidate;
});

// Optional: static to globally block IPs
userSchema.statics.isIpBlocked = async function (ip) {
  if (!ip) return false;
  return !!(await BlockedIp.exists({ ip }));
};

export default mongoose.models.User || mongoose.model("User", userSchema);
