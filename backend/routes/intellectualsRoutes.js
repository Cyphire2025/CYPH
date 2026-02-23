// routes/intellectualsRoutes.js

import express from "express";
import { protect, requireAdmin } from "../middlewares/authMiddleware.js";
import { upload, enforceTotalSize } from "../middlewares/uploadMiddleware.js";
import { validateBody } from "../middlewares/validate.js";
import { limitApplications } from "../middlewares/rateLimiter.js";
import { coerceJson } from "../middlewares/coerceJson.js";
import {
  createApplication,
  getMyApplications,
  getApplicationById,
  getAllApplications,
  adminListApplications,
  adminUpdateStatus,
  adminAddReviewNote,
} from "../controllers/intellectualsController.js";
import { createApplicationSchema, adminUpdateStatusSchema, adminAddReviewNoteSchema } from "../schemas/intellectualsSchemas.js";
import { requireFlag } from "../middlewares/flags.js";

const router = express.Router();
router.use(requireFlag("FLAG_INTELLECTUALS", "1"));

// Public: All intellectuals (listing)
router.get("/", getAllApplications);

// User: Submit new application
router.post(
  "/applications",
  protect,
  limitApplications,
  upload.array("attachments", 10),
  enforceTotalSize,
  coerceJson(["profile", "professor", "influencer", "industry_expert", "coach"]),
  validateBody(createApplicationSchema),
  createApplication
);

// User: List their own applications
router.get("/applications/mine", protect, getMyApplications);

// User/Admin: View single application (auth required)
router.get("/applications/:id", protect, getApplicationById);

// Admin: List/search all applications
router.get("/admin/applications", protect, requireAdmin, adminListApplications);

// Admin: Update status
router.patch(
  "/admin/applications/:id/status",
  protect,
  requireAdmin,
  validateBody(adminUpdateStatusSchema),
  adminUpdateStatus
);

// Admin: Add review note
router.post(
  "/admin/applications/:id/review-note",
  protect,
  requireAdmin,
  validateBody(adminAddReviewNoteSchema),
  adminAddReviewNote
);

export default router;
