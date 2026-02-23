// routes/adminRoutes.js

import express from "express";
import {
  loginAdmin,
  logoutAdmin,
  getTotalUsers,
  getTotalTasks,
  listAllUsers,
  deleteUser,
  setUserPlan,
  listAllTasks,
  updateTaskStatus,
  deleteTask,
  flagTask,
  listAllTickets,
  getTicketByIdAdmin,
  replyToTicketAdmin,
  // --- Help Center Q&A Admin ---
  listAllQuestions,
  answerQuestionAdmin,
  editAnswerAdmin,
  toggleShowOnHelpPage,
} from "../controllers/adminController.js"; // or helpQuestionController.js for Q&A routes
import { adminProtect } from "../middlewares/authMiddleware.js";
import { buildLimiter } from "../middlewares/rateLimiter.js";
import { validateBody } from "../middlewares/validate.js";
import { adminLoginSchema } from "../schemas/adminSchemas.js";
import slowDown from "express-slow-down";
import { ipKeyGenerator } from "express-rate-limit";
import { upload } from "../middlewares/uploadMiddleware.js";

const router = express.Router();
const loginKey = (req) =>
  `${ipKeyGenerator(req.ip)}:${req.headers["x-device-fingerprint"] || "dfp_na"}:admin_login`;

const adminLoginLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 6,
  keyGenerator: loginKey,
  prefix: "rl:admin:login:",
  message: { error: "Too many admin login attempts. Please try again later." },
});

const adminLoginSlowDown = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 2,
  delayMs: (hits) => Math.min(3000, (hits - 2) * 300),
  keyGenerator: loginKey,
});

/**
 * ADMIN ROUTES — All except /login are protected by admin JWT.
 */

// --- Admin Login (returns JWT) ---
router.post("/login", adminLoginLimiter, adminLoginSlowDown, validateBody(adminLoginSchema), loginAdmin);
router.post("/logout", logoutAdmin);

// --- Protect everything below with admin JWT ---
router.use(adminProtect);

// --- Stats, User, Task, Tickets Management (existing routes) ---
router.get("/stats/users", getTotalUsers);
router.get("/stats/tasks", getTotalTasks);
router.get("/tasks", listAllTasks);
router.patch("/tasks/:id/status", updateTaskStatus);
router.delete("/tasks/:id", deleteTask);
router.patch("/tasks/:id/flag", flagTask);
router.delete("/users/:id", deleteUser);
router.patch("/users/:id/plan", setUserPlan);
router.get("/users", listAllUsers);
router.get("/tickets", listAllTickets);
router.get("/tickets/:id", getTicketByIdAdmin);
router.post("/tickets/:id/reply", upload.array("files", 5), replyToTicketAdmin);

// --- Help Center Q&A Management ---
// Get all questions (with filters/search/pagination)
router.get("/questions", adminProtect, listAllQuestions);

// Answer a question (admin)
router.patch("/questions/:id/answer", adminProtect, answerQuestionAdmin);

// Edit an answer (admin)
router.patch("/questions/:id/edit", adminProtect, editAnswerAdmin);

// Toggle show/hide on Help Page (admin)
router.patch("/questions/:id/show", adminProtect, toggleShowOnHelpPage);

export default router;
