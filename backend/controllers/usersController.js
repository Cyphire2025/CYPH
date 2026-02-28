// controllers/usersController.js

import User from "../models/userModel.js";
import cloudinary from "../utils/cloudinary.js";
import { getPlanDurationMs, isPaidPlan } from "../utils/planConfig.js";

const SAFE_SLUG_RE = /^[a-z0-9-]+$/;

// --- Simple logger; swap with Winston/Sentry in production ---
const logger = {
  info: (...args) => req.log.info("[INFO]", ...args),
  warn: (...args) => req.log.warn("[WARN]", ...args),
  error: (...args) => req.log.error("[ERROR]", ...args),
};

/**
 * Cloudinary helper for memory files (multer.memoryStorage)
 */
const uploadToCloudinary = (file, folder) =>
  new Promise((resolve, reject) => {
    if (!file?.buffer) return resolve(null);
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "auto", folder },
      (err, result) => {
        if (err) return reject(err);
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          original_name: file.originalname || "file",
          size: file.size || 0,
          contentType: file.mimetype || "application/octet-stream",
        });
      }
    );
    stream.end(file.buffer);
  });

const toStringArray = (value, max = 20, maxLen = 120) => {
  if (Array.isArray(value)) {
    return value
      .map((v) => String(v || "").trim())
      .filter(Boolean)
      .slice(0, max)
      .map((v) => v.slice(0, maxLen));
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .slice(0, max)
      .map((v) => v.slice(0, maxLen));
  }
  return [];
};

const normalizeProfessionalProfile = (raw = {}) => {
  const src = raw && typeof raw === "object" ? raw : {};
  const level = ["starter", "intermediate", "advanced", "expert"].includes(String(src.expertiseLevel || ""))
    ? String(src.expertiseLevel)
    : "";
  const availability = ["open", "limited", "booked", "not-looking"].includes(String(src.availability || ""))
    ? String(src.availability)
    : "";
  const yearsNum = Number(src.yearsExperience);
  const yearsExperience = Number.isFinite(yearsNum) ? Math.max(0, Math.min(60, Math.floor(yearsNum))) : undefined;

  const allowedDomains = new Set(["tech", "education", "event", "architecture"]);
  const domains = toStringArray(src.domains, 4, 32).filter((d) => allowedDomains.has(d));

  const domainIn = src.domainDetails && typeof src.domainDetails === "object" ? src.domainDetails : {};
  const makeDomain = (key) => {
    const d = domainIn[key] && typeof domainIn[key] === "object" ? domainIn[key] : {};
    return {
      focusAreas: toStringArray(d.focusAreas, 20, 64),
      primaryStack: toStringArray(d.primaryStack, 30, 64),
      deliverables: toStringArray(d.deliverables, 20, 80),
      proofPoints: String(d.proofPoints || "").trim().slice(0, 500),
    };
  };

  return {
    headline: String(src.headline || "").trim().slice(0, 140),
    valueProposition: String(src.valueProposition || "").trim().slice(0, 280),
    expertiseLevel: level,
    yearsExperience,
    availability,
    responseSla: String(src.responseSla || "").trim().slice(0, 64),
    domains,
    serviceLines: toStringArray(src.serviceLines, 30, 64),
    toolsAndStack: toStringArray(src.toolsAndStack, 40, 64),
    engagementModes: toStringArray(src.engagementModes, 20, 64),
    certifications: toStringArray(src.certifications, 20, 120),
    achievements: toStringArray(src.achievements, 20, 160),
    portfolioHighlights: toStringArray(src.portfolioHighlights, 20, 160),
    domainDetails: {
      tech: makeDomain("tech"),
      education: makeDomain("education"),
      event: makeDomain("event"),
      architecture: makeDomain("architecture"),
    },
  };
};

/**
 * PUT /api/users/me  -> update profile fields (name/country/phone/skills/bio)
 * Triggers slug (re)generation logic in model if name changed
 */
export const updateMe = async (req, res, next) => {
  try {
    const { name, country, phone, skills, bio, professionalProfile } = req.body;

    // normalize skills (array OR comma-separated)
    let normalizedSkills = [];
    if (Array.isArray(skills)) {
      normalizedSkills = skills.map((s) => String(s).trim()).filter(Boolean).slice(0, 20);
    } else if (typeof skills === "string") {
      normalizedSkills = skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20);
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // assign fields
    if (typeof name === "string") user.name = name.trim();
    if (typeof country === "string") user.country = country.trim();
    if (typeof phone === "string") user.phone = phone.trim();
    if (Array.isArray(normalizedSkills)) user.skills = normalizedSkills;
    if (typeof bio === "string") user.bio = bio.trim().slice(0, 300);
    if (professionalProfile && typeof professionalProfile === "object") {
      user.professionalProfile = normalizeProfessionalProfile(professionalProfile);
    }

    await user.save();

    // return a clean projection
    const fresh = await User.findById(user._id).select(
      "_id name email avatar avatarPublicId country phone skills projects slug bio professionalProfile createdAt updatedAt"
    );

    req.log.info("User updated profile:", user.email, user._id);

    return res.json({ user: fresh });
  } catch (e) {
    req.log.error("updateMe error:", e);
    next(e);
  }
};

/**
 * POST /api/users/avatar  -> change profile picture (field: avatar)
 */
export const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No avatar file uploaded" });

    const uploaded = await uploadToCloudinary(req.file, "cyphire/avatars");
    if (!uploaded) return res.status(400).json({ error: "Upload failed" });

    // delete previous avatar if we have its public_id
    if (req.user.avatarPublicId) {
      try {
        await cloudinary.uploader.destroy(req.user.avatarPublicId);
      } catch (err) {
        req.log.warn("Failed to destroy old avatar:", err?.message);
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: uploaded.url, avatarPublicId: uploaded.public_id },
      {
        new: true,
        select:
          "_id name email avatar avatarPublicId country phone skills projects slug bio professionalProfile createdAt updatedAt",
      }
    );

    req.log.info("User updated avatar:", user.email, user._id);

    return res.json({ user });
  } catch (e) {
    req.log.error("updateAvatar error:", e);
    next(e);
  }
};

/**
 * POST /api/users/projects  -> set projects metadata (max per plan)
 */
export const saveProjects = async (req, res, next) => {
  try {
    let { projects } = req.body;

    if (!Array.isArray(projects)) {
      return res.status(400).json({ error: "projects must be an array" });
    }

    // plan-based limits
    const planLimits = { free: 3, plus: 5, ultra: 10 };
    const user = await User.findById(req.user._id).select("plan projects");
    if (!user) return res.status(404).json({ error: "User not found" });

    const limit = planLimits[user.plan || "free"];
    if (projects.length > limit) {
      return res.status(400).json({ error: `Maximum of ${limit} projects allowed for your plan` });
    }

    // sanitize & clamp
    projects = projects.map((p) => ({
      title: String(p?.title || "").trim(),
      description: String(p?.description || "").trim(),
      link: String(p?.link || "").trim(),
    }));

    if (projects.some((p) => !p.title)) {
      return res.status(400).json({ error: "Each project must have a title" });
    }

    // preserve existing media
    const existing = user.projects || [];
    const merged = projects.map((p, idx) => ({
      title: p.title,
      description: p.description,
      link: p.link,
      media: Array.isArray(existing[idx]?.media) ? existing[idx].media : [],
    }));

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { projects: merged },
      {
        new: true,
        runValidators: true,
        select: "_id name email avatar plan projects bio slug",
      }
    );

    req.log.info("User updated projects:", user.email, user._id);

    return res.json({ user: updated });
  } catch (e) {
    req.log.error("saveProjects error:", e);
    next(e);
  }
};

/**
 * POST /api/users/projects/:index/media  -> upload up to 5 media files for a project
 */
export const uploadProjectMedia = async (req, res, next) => {
  try {
    const index = Number(req.params.index);
    if (!Number.isInteger(index) || index < 0 || index > 2) {
      return res.status(400).json({ error: "Project index must be 0, 1, or 2" });
    }

    const user = await User.findById(req.user._id).select("projects");
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!Array.isArray(user.projects) || !user.projects[index]) {
      return res.status(400).json({ error: "Project metadata missing; save it first" });
    }

    const files = Array.isArray(req.files) ? req.files.slice(0, 5) : [];
    if (files.length === 0) return res.status(400).json({ error: "No files uploaded" });

    // Current media + new ones (clamp to 5)
    const currentMedia = Array.isArray(user.projects[index].media)
      ? user.projects[index].media
      : [];

    // Upload all new files
    const uploadedAll = [];
    for (const f of files) {
      const uploaded = await uploadToCloudinary(f, "cyphire/projects");
      if (uploaded) uploadedAll.push(uploaded);
    }

    const nextMedia = [...currentMedia, ...uploadedAll].slice(0, 5);
    user.projects[index].media = nextMedia;

    await user.save();

    const refreshed = await User.findById(req.user._id).select(
      "_id name email avatar avatarPublicId country phone skills projects slug bio professionalProfile createdAt updatedAt"
    );

    req.log.info("User uploaded project media:", user.email, user._id, "project", index);

    return res.json({ user: refreshed });
  } catch (e) {
    req.log.error("uploadProjectMedia error:", e);
    next(e);
  }
};

/**
 * PUT /api/users/projects/:index  -> edit a project's title/description/link
 */
export const updateProject = async (req, res, next) => {
  try {
    const index = Number(req.params.index);
    if (!Number.isInteger(index) || index < 0 || index > 2) {
      return res.status(400).json({ error: "Project index must be 0, 1, or 2" });
    }

    const { title, description, link } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Ensure projects has slot
    if (!Array.isArray(user.projects)) user.projects = [];
    while (user.projects.length < index + 1)
      user.projects.push({ title: "", description: "", media: [] });

    user.projects[index].title = String(title).trim();
    user.projects[index].description = String(description || "").trim();
    user.projects[index].link = typeof link === "string" ? link.trim() : (user.projects[index].link || "");

    await user.save();

    const refreshed = await User.findById(req.user._id)
      .select("_id name email avatar projects slug bio createdAt updatedAt");

    req.log.info("User updated project:", user.email, user._id, "project", index);

    return res.json({ user: refreshed });
  } catch (e) {
    req.log.error("updateProject error:", e);
    next(e);
  }
};

/**
 * DELETE /api/users/projects/:index  -> delete a whole project (and its media)
 */
export const deleteProject = async (req, res, next) => {
  try {
    const index = Number(req.params.index);
    if (!Number.isInteger(index) || index < 0 || index > 2) {
      return res.status(400).json({ error: "Project index must be 0, 1, or 2" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!Array.isArray(user.projects) || !user.projects[index]) {
      return res.status(404).json({ error: "Project not found" });
    }

    // delete media from Cloudinary
    const media = user.projects[index].media || [];
    for (const m of media) {
      if (m?.public_id) {
        try {
          await cloudinary.uploader.destroy(m.public_id, { resource_type: "auto" });
        } catch (err) {
          req.log.warn("Failed to destroy project media:", err?.message);
        }
      }
    }

    user.projects.splice(index, 1);
    await user.save();

    const refreshed = await User.findById(req.user._id).select(
      "_id name email avatar projects slug bio createdAt updatedAt"
    );

    req.log.info("User deleted project:", user.email, user._id, "project", index);

    return res.json({ user: refreshed });
  } catch (e) {
    req.log.error("deleteProject error:", e);
    next(e);
  }
};

/**
 * DELETE /api/users/projects/:index/media/:publicId  -> remove a single media item
 */
export const deleteProjectMedia = async (req, res, next) => {
  try {
    const index = Number(req.params.index);
    const { publicId } = req.params;

    if (!Number.isInteger(index) || index < 0 || index > 2) {
      return res.status(400).json({ error: "Project index must be 0, 1, or 2" });
    }
    if (!publicId) return res.status(400).json({ error: "publicId required" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!Array.isArray(user.projects) || !user.projects[index]) {
      return res.status(404).json({ error: "Project not found" });
    }

    // remove from Cloudinary
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
    } catch (err) {
      req.log.warn("Failed to destroy project media:", err?.message);
    }

    // remove from document
    user.projects[index].media = (user.projects[index].media || []).filter(
      (m) => m.public_id !== publicId
    );
    await user.save();

    const refreshed = await User.findById(req.user._id).select(
      "_id name email avatar projects slug bio createdAt updatedAt"
    );

    req.log.info("User deleted project media:", user.email, user._id, "project", index, "publicId", publicId);

    return res.json({ user: refreshed });
  } catch (e) {
    req.log.error("deleteProjectMedia error:", e);
    next(e);
  }
};

/**
 * GET /api/users/slug/:slug/public  -> Safe public profile (no email/phone)
 */
export const publicProfileBySlug = async (req, res, next) => {
  try {
    const slug = String(req.params?.slug || "").trim().toLowerCase();
    if (!SAFE_SLUG_RE.test(slug)) {
      return res.status(400).json({ error: "Invalid slug" });
    }

    const user = await User.findOne({ slug }).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    const safe = {
      _id: user._id,
      name: user.name || "",
      avatar: user.avatar || "",
      country: user.country || "",
      skills: Array.isArray(user.skills) ? user.skills : [],
      bio: user.bio || "",
      professionalProfile:
        user.professionalProfile && typeof user.professionalProfile === "object"
          ? user.professionalProfile
          : {},
      projects: Array.isArray(user.projects) ? user.projects : [],
      slug: user.slug,
    };

    return res.json({ user: safe });
  } catch (e) {
    req.log.error("publicProfileBySlug error:", e);
    next(e);
  }
};

/**
 * POST /api/users/slug  -> Ensure/generate a slug for the logged-in user
 */
export const ensureSlug = async (req, res, next) => {
  try {
    const me = await User.findById(req.user._id);
    if (!me) return res.status(404).json({ error: "User not found" });

    if (!me.slug) {
      await me.save();
    }
    return res.json({ slug: me.slug });
  } catch (e) {
    req.log.error("ensureSlug error:", e);
    next(e);
  }
};

/**
 * --- ADMIN ENDPOINTS ---
 */

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find();
    const now = new Date();

    const updatedUsers = await Promise.all(
      users.map(async (u) => {
        if (u.plan !== "free" && u.planExpiresAt && u.planExpiresAt < now) {
          u.plan = "free";
          u.planStartedAt = null;
          u.planExpiresAt = null;
          await u.save();
        }
        return u;
      })
    );

    res.json(updatedUsers);
  } catch (err) {
    req.log.error("getAllUsers error:", err);
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch (err) {
    req.log.error("deleteUser error:", err);
    next(err);
  }
};

export const blockUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    user.isBlocked = true;
    await user.save();
    res.json({ message: "User blocked" });
  } catch (err) {
    req.log.error("blockUser error:", err);
    next(err);
  }
};

export const setUserPlan = async (req, res, next) => {
  try {
    const { id } = req.params; // admin override OR
    const requestedPlan = String(req.body?.plan || "").toLowerCase(); // frontend request
    const userId = id || req.user._id; // if no id, fallback to logged-in user
    const isAdminOverride = Boolean(id);

    if (!["free", "plus", "ultra"].includes(requestedPlan)) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    // User-side hardening: paid plans can only be activated after verified payment.
    if (!isAdminOverride && isPaidPlan(requestedPlan)) {
      return res.status(403).json({
        error: "Paid plans must be activated through payment verification.",
      });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const now = Date.now();
    user.plan = requestedPlan;
    user.planStartedAt = new Date(now);

    const durationMs = getPlanDurationMs(requestedPlan);
    if (!durationMs) {
      user.planExpiresAt = null;
    } else {
      const carryForwardFrom = Math.max(now, user.planExpiresAt?.getTime?.() || 0);
      user.planExpiresAt = new Date(carryForwardFrom + durationMs);
    }

    await user.save();
    res.json({
      success: true,
      plan: user.plan,
      planExpiresAt: user.planExpiresAt,
    });

  } catch (err) {
    req.log.error("setUserPlan error:", err);
    next(err);
  }
};
