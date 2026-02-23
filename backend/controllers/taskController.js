// controllers/taskController.js

import mongoose from "mongoose";
import Task from "../models/taskModel.js";
import PaymentVerification from "../models/paymentVerificationModel.js";
import cloudinary from "../utils/cloudinary.js";
import { getListingPaymentConfig, normalizeListingCategory } from "../utils/listingPayments.js";

/* --------------------------- shared config/helpers -------------------------- */

const SAFE_USER_SELECT = "_id name avatar slug";

const TASK_POPULATE = [
  { path: "createdBy", select: SAFE_USER_SELECT },
  { path: "applicants", select: SAFE_USER_SELECT }, // applicants is [ObjectId]
];

const log = (req) => ({
  info: (...a) => (req?.log?.info ? req.log.info(...a) : console.log("[INFO]", ...a)),
  warn: (...a) => (req?.log?.warn ? req.log.warn(...a) : console.warn("[WARN]", ...a)),
  error: (...a) => (req?.log?.error ? req.log.error(...a) : console.error("[ERROR]", ...a)),
});

const isObjectId = (v) => typeof v === "string" && mongoose.isValidObjectId(v);

/** Upload a single file buffer to Cloudinary */
const uploadToCloudinary = async (file, folder) => {
  if (!file?.buffer) return null;
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto", use_filename: true, unique_filename: true, overwrite: false },
      (err, res) => (err ? reject(err) : resolve(res))
    );
    stream.end(file.buffer);
  });
};

/** Upload multiple files to Cloudinary */
const uploadAttachments = async (files, folder) => {
  if (!Array.isArray(files) || files.length === 0) return [];
  const out = [];
  for (const f of files) {
    // eslint-disable-next-line no-await-in-loop
    const up = await uploadToCloudinary(f, folder);
    if (up?.secure_url) {
      out.push({
        url: up.secure_url,
        public_id: up.public_id,
        original_name: f.originalname || "file",
        size: f.size || 0,
        contentType: f.mimetype || "application/octet-stream",
        width: up.width || 0,
        height: up.height || 0,
        format: up.format || "",
        bytes: up.bytes || 0,
      });
    }
  }
  return out;
};

const populateTaskById = (id) => Task.findById(id).populate(TASK_POPULATE).lean();

/* --------------------------------- create ---------------------------------- */

/**
 * POST /api/tasks
 * Create a new task with optional attachments/logo
 */
export const createTask = async (req, res, next) => {
  const logger = log(req);
  try {
    const userId = req?.user?._id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const {
      title,
      description,
      category, // can be string or array
      price,
      numberOfApplicants,
      deadline,
      metadata, // can be object or JSON string
    } = req.body;

    if (!title || String(title).trim().length < 3)
      return res.status(400).json({ error: "Title must be at least 3 characters" });
    if (!description || String(description).trim().length < 10)
      return res.status(400).json({ error: "Description must be at least 10 characters" });

    const parsedCategory = Array.isArray(category) ? category.filter(Boolean) : [category].filter(Boolean);
    const normalizedCategory = normalizeListingCategory(parsedCategory);

    let parsedMetadata = {};
    if (typeof metadata === "string") {
      try {
        parsedMetadata = JSON.parse(metadata || "{}") || {};
      } catch {
        return res.status(400).json({ error: "Invalid metadata JSON" });
      }
    } else if (metadata && typeof metadata === "object") {
      parsedMetadata = metadata;
    }

    // Paid listing enforcement (currently for sponsorship boosts/premium).
    // Client must provide a fresh `paymentVerificationId` for paid listing plans.
    const fallbackPlanFromTier =
      String(parsedMetadata?.tier || "").toLowerCase() === "premium" ? "premium" : "";
    const requestedListingPlan = String(
      parsedMetadata?.listingPlan || fallbackPlanFromTier
    ).toLowerCase();
    const listingPaymentConfig = getListingPaymentConfig(normalizedCategory, requestedListingPlan);
    const paymentVerificationId = String(parsedMetadata?.paymentVerificationId || "").trim();

    if (
      requestedListingPlan &&
      !listingPaymentConfig &&
      ["premium", "basic_boost"].includes(requestedListingPlan)
    ) {
      return res.status(400).json({ error: "Unsupported paid listing plan for this category" });
    }

    if (listingPaymentConfig) {
      if (!isObjectId(paymentVerificationId)) {
        return res.status(400).json({ error: "Paid listing requires a valid payment verification id" });
      }

      const verification = await PaymentVerification.findOne({
        _id: paymentVerificationId,
        user: userId,
        purpose: listingPaymentConfig.purpose,
        consumedAt: null,
        consumedByTask: null,
      }).select("_id amount currency");

      if (!verification) {
        return res.status(403).json({ error: "Listing payment verification not found or already used" });
      }

      const expectedAmount = listingPaymentConfig.amountInr * 100;
      if (
        Number(verification.amount) !== expectedAmount ||
        String(verification.currency || "").toUpperCase() !== "INR"
      ) {
        return res.status(400).json({ error: "Listing payment verification amount mismatch" });
      }
    }

    const metadataForStorage = { ...(parsedMetadata || {}) };
    delete metadataForStorage.paymentVerificationId;
    if (requestedListingPlan) {
      metadataForStorage.listingPlan = requestedListingPlan;
    }

    const attachmentsFiles = req.files?.attachments || [];
    const logoFile = Array.isArray(req.files?.logo) ? req.files.logo[0] : null;
    const paymentQrFile = Array.isArray(req.files?.paymentQr) ? req.files.paymentQr[0] : null;

    const uploadedAttachments = await uploadAttachments(attachmentsFiles, "cyphire/tasks");
    const uploadedLogo = logoFile ? await uploadToCloudinary(logoFile, "cyphire/tasks/logo") : null;
    const uploadedPaymentQr = paymentQrFile
      ? await uploadToCloudinary(paymentQrFile, "cyphire/tasks/payment")
      : null;

    if (uploadedPaymentQr?.secure_url) {
      metadataForStorage.paymentQrUrl = uploadedPaymentQr.secure_url;
      metadataForStorage.paymentQrPublicId = uploadedPaymentQr.public_id;
    }

    const doc = {
      title: String(title).trim(),
      description: String(description).trim(),
      category: parsedCategory,
      price: price != null ? Number(price) : undefined,
      numberOfApplicants: numberOfApplicants != null ? Number(numberOfApplicants) : undefined,
      deadline: deadline ? new Date(deadline) : undefined,
      metadata: metadataForStorage,
      attachments: uploadedAttachments,
      logo: uploadedLogo?.secure_url
        ? { url: uploadedLogo.secure_url, public_id: uploadedLogo.public_id }
        : undefined,
      createdBy: userId,
      applicants: [],
      status: "pending", // pending | in-progress | completed | cancelled

    };

    const task = await Task.create(doc);

    if (listingPaymentConfig) {
      const consumed = await PaymentVerification.findOneAndUpdate(
        {
          _id: paymentVerificationId,
          user: userId,
          purpose: listingPaymentConfig.purpose,
          consumedAt: null,
          consumedByTask: null,
        },
        {
          $set: {
            consumedAt: new Date(),
            consumedByTask: task._id,
          },
        },
        { new: true }
      );

      if (!consumed) {
        try {
          await Task.findByIdAndDelete(task._id);
        } catch (rollbackErr) {
          logger.error("Failed to rollback task after payment verification race", rollbackErr);
        }
        return res.status(409).json({ error: "Listing payment verification already used" });
      }
    }

    const populated = await populateTaskById(task._id);

    logger.info("Task created", { taskId: String(task._id), by: String(userId) });
    // return a single task object
    return res.status(201).json(populated);
  } catch (e) {
    log(req).error("createTask error:", e);
    return next(e);
  }
};

/* --------------------------------- reads ----------------------------------- */

/**
 * GET /api/tasks
 * Public list (supports ?category= for your Sponsorships page)
 * Returns a PLAIN ARRAY because the frontend expects Array.isArray(response) === true.
 */
export const getTasks = async (req, res, next) => {
  const logger = log(req);
  try {
    const { category } = req.query;
    const q = {};
    if (category) {
      // accept string or array categories in DB, match case-insensitive
      q.$or = [
        { category: { $regex: `^${String(category)}$`, $options: "i" } },
        { category: { $elemMatch: { $regex: `^${String(category)}$`, $options: "i" } } },
      ];
    }
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);

    const tasks = await Task.find(q)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate(TASK_POPULATE)
      .lean();

    // IMPORTANT: return an array (frontend sets it directly)
    return res.json(tasks);
  } catch (e) {
    logger.error("getTasks error:", e);
    return next(e);
  }
};

/**
 * GET /api/tasks/mine
 * Dashboard list for the task owner
 * (You can map this to your route; if not used, feel free to remove.)
 */
export const getMyTasks = async (req, res, next) => {
  const logger = log(req);
  try {
    const userId = req?.user?._id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const tasks = await Task.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .populate(TASK_POPULATE)
      .lean();

    // Dashboard also expects array
    return res.json(tasks);
  } catch (e) {
    logger.error("getMyTasks error:", e);
    return next(e);
  }
};

/**
 * GET /api/tasks/:id
 * Single task
 */
export const getTaskById = async (req, res, next) => {
  const logger = log(req);
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ error: "Invalid task id" });

    const task = await Task.findById(id).populate(TASK_POPULATE).lean();
    if (!task) return res.status(404).json({ error: "Task not found" });

    return res.json(task);
  } catch (e) {
    logger.error("getTaskById error:", e);
    return next(e);
  }
};

/* ----------------------------- applications flow ---------------------------- */

/**
 * POST /api/tasks/:id/apply
 * Current user applies to a task
 */
export const applyToTask = async (req, res, next) => {
  const logger = log(req);
  try {
    const { id } = req.params;
    const userId = req?.user?._id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!isObjectId(id)) return res.status(400).json({ error: "Invalid task id" });

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (String(task.createdBy) === String(userId))
      return res.status(400).json({ error: "You cannot apply to your own task" });
    if (task.status !== "pending")
      return res.status(400).json({ error: "Task is not accepting applications" });


    const already = task.applicants.some((a) => String(a) === String(userId));
    if (already) return res.status(400).json({ error: "Already applied" });

    task.applicants.push(userId);
    await task.save();

    const populated = await populateTaskById(task._id);
    // return the updated, populated task object
    return res.json(populated);
  } catch (e) {
    logger.error("applyToTask error:", e);
    return next(e);
  }
};

/**
 * POST /api/tasks/:id/withdraw
 * Current user withdraws their application
 */
export const withdrawApplication = async (req, res, next) => {
  const logger = log(req);
  try {
    const { id } = req.params;
    const userId = req?.user?._id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!isObjectId(id)) return res.status(400).json({ error: "Invalid task id" });

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const before = task.applicants.length;
    task.applicants = task.applicants.filter((a) => String(a) !== String(userId));
    if (task.applicants.length === before)
      return res.status(400).json({ error: "You have not applied to this task" });

    await task.save();
    const populated = await populateTaskById(task._id);
    return res.json(populated);
  } catch (e) {
    logger.error("withdrawApplication error:", e);
    return next(e);
  }
};

/**
 * POST /api/tasks/:id/select
 * Task owner selects an applicant (typically followed by payment/escrow)
 */
export const selectApplicant = async (req, res, next) => {
  const logger = log(req);
  try {
    const { id } = req.params;
    const { applicantId } = req.body;
    const userId = req?.user?._id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!isObjectId(id)) return res.status(400).json({ error: "Invalid task id" });
    if (!isObjectId(applicantId)) return res.status(400).json({ error: "Invalid applicant id" });

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (String(task.createdBy) !== String(userId))
      return res.status(403).json({ error: "Forbidden" });

    if (!task.applicants.some((a) => String(a) === String(applicantId)))
      return res.status(400).json({ error: "Applicant not found in this task" });

    task.selectedApplicant = applicantId;
    task.status = "in-progress";
    await task.save();

    const populated = await populateTaskById(task._id);
    return res.json(populated);
  } catch (e) {
    logger.error("selectApplicant error:", e);
    return next(e);
  }
};

/* --------------------------------- updates --------------------------------- */

/**
 * PUT /api/tasks/:id
 * Owner updates task fields; optional attachments/logo replacement
 */
export const updateTask = async (req, res, next) => {
  const logger = log(req);
  try {
    const { id } = req.params;
    const userId = req?.user?._id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!isObjectId(id)) return res.status(400).json({ error: "Invalid task id" });

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (String(task.createdBy) !== String(userId))
      return res.status(403).json({ error: "Forbidden" });

    const allowed = [
      "title",
      "description",
      "price",
      "numberOfApplicants",
      "deadline",
      "category",
      "metadata",
      "status",
    ];

    for (const key of allowed) {
      if (key in req.body) {
        if (key === "category") {
          task.category = Array.isArray(req.body.category)
            ? req.body.category.filter(Boolean)
            : [req.body.category].filter(Boolean);
        } else if (key === "metadata") {
          task.metadata =
            typeof req.body.metadata === "string"
              ? (JSON.parse(req.body.metadata || "{}") || {})
              : (req.body.metadata || {});
        } else if (key === "price" || key === "numberOfApplicants") {
          task[key] = req.body[key] != null ? Number(req.body[key]) : undefined;
        } else if (key === "deadline") {
          task.deadline = req.body.deadline ? new Date(req.body.deadline) : undefined;
        } else {
          task[key] = req.body[key];
        }
      }
    }

    // optional: replace media
    const attachmentsFiles = req.files?.attachments || [];
    const logoFile = Array.isArray(req.files?.logo) ? req.files.logo[0] : null;
    const paymentQrFile = Array.isArray(req.files?.paymentQr) ? req.files.paymentQr[0] : null;

    if (attachmentsFiles.length) {
      task.attachments = await uploadAttachments(attachmentsFiles, "cyphire/tasks");
    }
    if (logoFile) {
      const up = await uploadToCloudinary(logoFile, "cyphire/tasks/logo");
      task.logo = up?.secure_url ? { url: up.secure_url, public_id: up.public_id } : undefined;
    }
    if (paymentQrFile) {
      const up = await uploadToCloudinary(paymentQrFile, "cyphire/tasks/payment");
      if (!task.metadata || typeof task.metadata !== "object") task.metadata = {};
      if (up?.secure_url) {
        task.metadata.paymentQrUrl = up.secure_url;
        task.metadata.paymentQrPublicId = up.public_id;
      }
    }

    await task.save();
    const populated = await populateTaskById(task._id);
    return res.json(populated);
  } catch (e) {
    logger.error("updateTask error:", e);
    return next(e);
  }
};

/* --------------------------------- delete ---------------------------------- */

/**
 * DELETE /api/tasks/:id
 * Owner-only delete
 */
export const deleteTask = async (req, res, next) => {
  const logger = log(req);
  try {
    const { id } = req.params;
    const userId = req?.user?._id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!isObjectId(id)) return res.status(400).json({ error: "Invalid task id" });

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (String(task.createdBy) !== String(userId))
      return res.status(403).json({ error: "Forbidden" });

    await task.deleteOne();
    return res.json({ success: true });
  } catch (e) {
    logger.error("deleteTask error:", e);
    return next(e);
  }
};
