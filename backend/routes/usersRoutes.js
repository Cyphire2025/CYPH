// routes/usersRoutes.js

import express from "express";
import { protect, requireAdmin } from "../middlewares/authMiddleware.js";
import { upload, enforceTotalSize } from "../middlewares/uploadMiddleware.js";
import { checkPlanExpiry } from "../middlewares/checkPlanExpiry.js";
import {
  updateMe,
  updateAvatar,
  saveProjects,
  uploadProjectMedia,
  updateProject,
  deleteProject,
  deleteProjectMedia,
  ensureSlug,
  publicProfileBySlug,
  deleteUser,
  blockUser,
  setUserPlan,
  getAllUsers,
} from "../controllers/usersController.js";
import { validateBody } from "../middlewares/validate.js";
import {
  updateMeSchema,
  saveProjectsSchema,
  uploadProjectMediaSchema,
  updateProjectSchema,
  setUserPlanSchema,
} from "../schemas/userSchemas.js";
import { requireFlag } from "../middlewares/flags.js";

const router = express.Router();
router.use(requireFlag("FLAG_USERS", "1"));

/*
|--------------------------------------------------------------------------  
| USERS ROUTES (Google/Amazon-level structure)  
|--------------------------------------------------------------------------  
*/

// --- PUBLIC ENDPOINTS (no auth needed) ---
// Public profile by slug (no email/phone)
router.get("/slug/:slug/public", publicProfileBySlug);

/** --- USER AUTHENTICATED ENDPOINTS (must be logged in) --- */
router.use(protect, checkPlanExpiry);

// Update core profile fields
router.put("/me", validateBody(updateMeSchema), updateMe);

// Upload avatar (single image)
router.post("/avatar", upload.single("avatar"), enforceTotalSize, updateAvatar);

// Create/replace projects metadata
router.post("/projects", validateBody(saveProjectsSchema), saveProjects);

// Upload up to 5 media files for a given project
router.post(
  "/projects/:index/media",
  upload.array("files", 5),
  enforceTotalSize,
  validateBody(uploadProjectMediaSchema),
  uploadProjectMedia
);

// Edit/Delete a project by index
router.put("/projects/:index", validateBody(updateProjectSchema), updateProject);
router.delete("/projects/:index", deleteProject);

// Delete one media item from a project
router.delete("/projects/:index/media/:publicId", deleteProjectMedia);

// Ensure/generate slug for logged-in user
router.post("/slug", ensureSlug);

// User can update their own plan (e.g., upgrade/downgrade)
router.patch("/me/plan", validateBody(setUserPlanSchema), setUserPlan);

/** --- ADMIN-ONLY ENDPOINTS (must be admin) --- */
router.get("/", requireAdmin, getAllUsers);
router.delete("/:id", requireAdmin, deleteUser);
router.patch("/:id/block", requireAdmin, blockUser);
router.patch("/:id/plan", requireAdmin, validateBody(setUserPlanSchema), setUserPlan);

export default router;
