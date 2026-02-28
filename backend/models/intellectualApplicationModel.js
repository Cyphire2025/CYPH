// backend/models/intellectualApplicationModel.js
import mongoose from "mongoose";

// --- Cloud file sub-schema (secure, auditable, reusable) ---
const CLOUD_FILE = new mongoose.Schema({
  url: { type: String, required: true },
  public_id: { type: String, required: true },
  original_name: { type: String, default: "" },
  size: { type: Number, default: 0 },
  contentType: { type: String, default: "application/octet-stream" },
}, { _id: false });

// --- Audit trail sub-schema ---
const AUDIT = new mongoose.Schema({
  at: { type: Date, default: Date.now },
  by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: { type: String, enum: ["CREATE", "UPDATE", "STATUS_CHANGE", "REVIEW_NOTE"], required: true },
  note: { type: String, default: "" },
}, { _id: false });

// --- Profile (common fields for all intellectuals) ---
const BASE_PROFILE = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  headline: { type: String, default: "" },       // short one-liner under name
  bio: { type: String, default: "" },
  avatar: CLOUD_FILE,                             // optional portrait
  languages: { type: [String], default: [] },
  location: { type: String, default: "" },
  socials: {
    website: { type: String, default: "" },
    linkedin: { type: String, default: "" },
    twitter: { type: String, default: "" },
    youtube: { type: String, default: "" },
    instagram: { type: String, default: "" },
  }
}, { _id: false });

// --- Category-specific schemas ---
const PROFESSOR = new mongoose.Schema({
  institution: { type: String, required: true },
  department: { type: String, required: true },
  designation: { type: String, default: "" },
  expertise: { type: [String], default: [] },
  publications: { type: Number, default: 0 },
  googleScholar: { type: String, default: "" },
  proofDocs: { type: [CLOUD_FILE], default: [] },
}, { _id: false });

const INFLUENCER = new mongoose.Schema({
  niches: { type: [String], default: [] },
  platforms: [{
    name: { type: String, enum: ["youtube","instagram","x","linkedin","tiktok","other"], required: true },
    handle: { type: String, default: "" },
    followers: { type: Number, default: 0 },
  }],
  mediaKit: CLOUD_FILE,
  proofDocs: { type: [CLOUD_FILE], default: [] },
}, { _id: false });

const INDUSTRY_EXPERT = new mongoose.Schema({
  company: { type: String, required: true },
  role: { type: String, required: true },
  yearsExperience: { type: Number, min: 0, default: 0 },
  domains: { type: [String], default: [] },
  certifications: { type: [String], default: [] },
  proofDocs: { type: [CLOUD_FILE], default: [] },
}, { _id: false });

const COACH = new mongoose.Schema({
  focusAreas: { type: [String], default: [] },
  sessionsOffered: { type: [String], default: [] },
  priceHint: { type: Number, min: 0, default: 0 },
  proofDocs: { type: [CLOUD_FILE], default: [] },
}, { _id: false });

// --- Main Intellectual Application schema ---
const IntellectualApplicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  category: { type: String, enum: ["professor","influencer","industry_expert","coach"], required: true, index: true },
  status: { type: String, enum: ["draft","submitted","under_review","approved","rejected"], default: "submitted", index: true },
  profile: { type: BASE_PROFILE, required: true },

  // Category-specific sections
  professor: PROFESSOR,
  influencer: INFLUENCER,
  industry_expert: INDUSTRY_EXPERT,
  coach: COACH,

  attachments: { type: [CLOUD_FILE], default: [] }, // Common uploads (e.g., CV)
  reviewNotes: { type: String, default: "" },
  audit: { type: [AUDIT], default: [] },

  // Dedupe/idempotency
  fingerprint: { type: String, default: "", index: true, unique: false },

}, { timestamps: true });

// Compound index for admin dashboards
IntellectualApplicationSchema.index({ category: 1, status: 1, createdAt: -1 });
IntellectualApplicationSchema.index(
  {
    "profile.fullName": "text",
    "profile.socials.linkedin": "text",
    "profile.socials.twitter": "text",
  },
  {
    name: "profile_text_search_idx",
    weights: {
      "profile.fullName": 10,
      "profile.socials.linkedin": 5,
      "profile.socials.twitter": 5,
    },
  }
);

export default mongoose.model("IntellectualApplication", IntellectualApplicationSchema);
