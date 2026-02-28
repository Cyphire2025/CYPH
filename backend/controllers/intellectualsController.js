// controllers/intellectualsController.js

import IntellectualApplication from "../models/intellectualApplicationModel.js";
import { uploadToCloudinary } from "../utils/cloudinaryUpload.js";
import crypto from "crypto";
import { z } from "zod";

// --- Logger for audit and monitoring ---
const logger = {
  info: (...args) => req.log.info("[INTELLECTUAL]", ...args),
  warn: (...args) => req.log.warn("[INTELLECTUAL][WARN]", ...args),
  error: (...args) => req.log.error("[INTELLECTUAL][ERROR]", ...args),
};

// ---------- common profile ----------
const profileSchema = z.object({
  fullName: z.string().min(2).max(120),
  headline: z.string().max(160).optional(),
  bio: z.string().max(5000).optional(),
  languages: z.array(z.string()).optional(),
  location: z.string().max(120).optional(),
  socials: z
    .object({
      website: z.string().url().optional().or(z.literal("")),
      linkedin: z.string().url().optional().or(z.literal("")),
      twitter: z.string().url().optional().or(z.literal("")),
      youtube: z.string().url().optional().or(z.literal("")),
      instagram: z.string().url().optional().or(z.literal("")),
    })
    .optional(),
});

// ---------- category payloads ----------
const professorSchema = z.object({
  institution: z.string().min(2),
  department: z.string().min(2),
  designation: z.string().optional(),
  expertise: z.array(z.string()).optional(),
  publications: z.coerce.number().int().nonnegative().optional(),
  googleScholar: z.string().url().optional().or(z.literal("")),
});

const influencerSchema = z.object({
  niches: z.array(z.string()).min(1),
  platforms: z
    .array(
      z.object({
        name: z.enum([
          "youtube",
          "instagram",
          "x",
          "linkedin",
          "tiktok",
          "other",
        ]),
        handle: z.string().min(1),
        followers: z.coerce.number().int().nonnegative(),
      })
    )
    .min(1),
});

const industryExpertSchema = z.object({
  company: z.string().min(2),
  role: z.string().min(2),
  yearsExperience: z.coerce.number().nonnegative(),
  domains: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
});

const coachSchema = z.object({
  focusAreas: z.array(z.string()).min(1),
  sessionsOffered: z.array(z.string()).min(1),
  priceHint: z.coerce.number().nonnegative().optional(),
});

const categorySchema = z.enum([
  "professor",
  "influencer",
  "industry_expert",
  "coach",
]);

export const createApplicationSchema = z.object({
  body: z.object({
    category: categorySchema,
    profile: profileSchema,
    professor: professorSchema.optional(),
    influencer: influencerSchema.optional(),
    industry_expert: industryExpertSchema.optional(),
    coach: coachSchema.optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

// --------- helper to pick the correct block ----------
const pickCategoryBlock = (category, body) => {
  if (category === "professor")
    return { professor: professorSchema.parse(body.professor) };
  if (category === "influencer")
    return { influencer: influencerSchema.parse(body.influencer) };
  if (category === "industry_expert")
    return { industry_expert: industryExpertSchema.parse(body.industry_expert) };
  if (category === "coach") return { coach: coachSchema.parse(body.coach) };
  return {};
};

// --------- controllers ----------

/**
 * POST /api/intellectuals/applications
 * Create a new intellectual application
 */
export const createApplication = async (req, res) => {
  try {
    const userId = req.user._id;
    const { category, profile } = req.body;

    // Attachments from multipart form
    const uploads = [];
    const files = Array.isArray(req.files) ? req.files : [];
    for (const f of files) {
      const up = await uploadToCloudinary(
        f,
        `cyphire/intellectuals/${userId}`
      );
      if (up) uploads.push(up);
    }

    // Validate category-specific block
    const catBlock = pickCategoryBlock(category, req.body);

    // Idempotency fingerprint (per-day bucket)
    const fingerprint = crypto
      .createHash("sha256")
      .update(
        `${userId}:${category}:${
          (profile.fullName || "").toLowerCase()
        }:${Date.now() / 86400000 | 0}` // per-day
      )
      .digest("hex");

    const app = await IntellectualApplication.create({
      user: userId,
      category,
      status: "submitted",
      profile,
      ...catBlock,
      attachments: uploads,
      audit: [
        { action: "CREATE", by: userId, note: "New application submitted" },
      ],
      fingerprint,
    });

    req.log.info("Application created:", app._id, "user:", userId, "cat:", category);
    return res.status(201).json({ item: app });
  } catch (err) {
    req.log.error("createApplication error:", err.message);
    res.status(500).json({ error: "Failed to submit application" });
  }
};

/**
 * GET /api/intellectuals/applications/mine
 * Get all applications by the logged-in user
 */
export const getMyApplications = async (req, res) => {
  try {
    const apps = await IntellectualApplication.find({
      user: req.user._id,
    })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ items: apps });
  } catch (err) {
    req.log.error("getMyApplications error:", err.message);
    res.status(500).json({ error: "Failed to fetch applications" });
  }
};

/**
 * GET /api/intellectuals/applications/:id
 * Get a specific application by ID (owner or admin)
 */
export const getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    const app = await IntellectualApplication.findById(id).lean();
    if (!app) return res.status(404).json({ error: "Not found" });

    const isOwner = String(app.user) === String(req.user._id);
    if (!isOwner && !req.user?.isAdmin)
      return res.status(403).json({ error: "Forbidden" });

    res.json({ item: app });
  } catch (err) {
    req.log.error("getApplicationById error:", err.message);
    res.status(500).json({ error: "Failed to fetch application" });
  }
};

/**
 * GET /api/intellectuals (all applications, public or admin view)
 */
export const getAllApplications = async (req, res) => {
  try {
    const all = await IntellectualApplication.find({ status: "approved" })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const publicItems = all.map((item) => ({
      _id: item._id,
      category: item.category,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      profile: {
        fullName: item.profile?.fullName || "",
        headline: item.profile?.headline || "",
        bio: item.profile?.bio || "",
        languages: Array.isArray(item.profile?.languages) ? item.profile.languages : [],
        location: item.profile?.location || "",
        socials: item.profile?.socials || {},
        avatar: item.profile?.avatar
          ? {
            url: item.profile.avatar.url,
            contentType: item.profile.avatar.contentType || "",
          }
          : null,
      },
      professor: item.professor
        ? {
          institution: item.professor.institution || "",
          department: item.professor.department || "",
          designation: item.professor.designation || "",
          expertise: Array.isArray(item.professor.expertise) ? item.professor.expertise : [],
          publications: item.professor.publications || 0,
          googleScholar: item.professor.googleScholar || "",
        }
        : undefined,
      influencer: item.influencer
        ? {
          niches: Array.isArray(item.influencer.niches) ? item.influencer.niches : [],
          platforms: Array.isArray(item.influencer.platforms) ? item.influencer.platforms : [],
        }
        : undefined,
      industry_expert: item.industry_expert
        ? {
          company: item.industry_expert.company || "",
          role: item.industry_expert.role || "",
          yearsExperience: item.industry_expert.yearsExperience || 0,
          domains: Array.isArray(item.industry_expert.domains) ? item.industry_expert.domains : [],
          certifications: Array.isArray(item.industry_expert.certifications)
            ? item.industry_expert.certifications
            : [],
        }
        : undefined,
      coach: item.coach
        ? {
          focusAreas: Array.isArray(item.coach.focusAreas) ? item.coach.focusAreas : [],
          sessionsOffered: Array.isArray(item.coach.sessionsOffered) ? item.coach.sessionsOffered : [],
          priceHint: item.coach.priceHint || 0,
        }
        : undefined,
    }));

    res.json(publicItems);
  } catch (err) {
    req.log.error("getAllApplications error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/intellectuals/admin/applications
 * Admin: list applications with filters/search/pagination
 */
export const adminListApplications = async (req, res) => {
  try {
    const { status, category, q, page = 1, limit = 20 } = req.query;
    const where = {};
    const qText = typeof q === "string" ? q.trim().slice(0, 120) : "";
    if (status) where.status = status;
    if (category) where.category = category;
    if (qText) {
      where.$text = { $search: qText };
    }

    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;
    const [items, total] = await Promise.all([
      IntellectualApplication.find(where)
        .sort(qText ? { score: { $meta: "textScore" }, createdAt: -1 } : { createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      IntellectualApplication.countDocuments(where),
    ]);

    res.json({
      items,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    req.log.error("adminListApplications error:", err.message);
    res.status(500).json({ error: "Failed to fetch applications" });
  }
};

/**
 * PATCH /api/intellectuals/admin/applications/:id/status
 * Admin: update application status
 */
export const adminUpdateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    if (!["under_review", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const app = await IntellectualApplication.findById(id);
    if (!app) return res.status(404).json({ error: "Not found" });

    app.status = status;
    if (note) {
      app.reviewNotes = [app.reviewNotes, note].filter(Boolean).join("\n");
    }
    app.audit.push({
      action: "STATUS_CHANGE",
      by: req.user._id,
      note: `Status -> ${status}`,
    });

    await app.save();
    req.log.info("Application status updated:", id, "to", status);
    res.json({ item: app });
  } catch (err) {
    req.log.error("adminUpdateStatus error:", err.message);
    res.status(500).json({ error: "Failed to update status" });
  }
};

/**
 * POST /api/intellectuals/admin/applications/:id/review-note
 * Admin: add a review note
 */
export const adminAddReviewNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const app = await IntellectualApplication.findById(id);
    if (!app) return res.status(404).json({ error: "Not found" });

    app.reviewNotes = [app.reviewNotes, note].filter(Boolean).join("\n");
    app.audit.push({ action: "REVIEW_NOTE", by: req.user._id, note });

    await app.save();
    req.log.info("Review note added:", id);
    res.json({ item: app });
  } catch (err) {
    req.log.error("adminAddReviewNote error:", err.message);
    res.status(500).json({ error: "Failed to add review note" });
  }
};
