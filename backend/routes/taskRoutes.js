// routes/taskRoutes.js

import express from "express";
import { upload, enforceTotalSize } from "../middlewares/uploadMiddleware.js";
import { protect } from "../middlewares/authMiddleware.js";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";
import {
  createTask,
  getTasks,
  getMyTasks,
  getTaskById,
  applyToTask,
  selectApplicant,
  updateTask,
  deleteTask,
} from "../controllers/taskController.js";
import { validateBody } from "../middlewares/validate.js";
import {
  createTaskSchema,
  applyTaskSchema,
  selectApplicantSchema,
} from "../schemas/taskSchemas.js";
import { requireFlag } from "../middlewares/flags.js";

const router = express.Router();
router.use(requireFlag("FLAG_TASK", "1"));

const redisClient = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : null;

const createTaskLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 12,
  message: "Too many tasks created from this account, please try again in an hour.",
  standardHeaders: true,
  legacyHeaders: false,
  ...(redisClient && {
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    }),
  }),
});

const applyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: "Too many applications from this account, please slow down.",
  standardHeaders: true,
  legacyHeaders: false,
  ...(redisClient && {
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    }),
  }),
});

const selectLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: "Too many selection actions, please slow down.",
  standardHeaders: true,
  legacyHeaders: false,
  ...(redisClient && {
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    }),
  }),
});

/*
|--------------------------------------------------------------------------  
| TASK ROUTES (Google/Amazon-level structure)  
|--------------------------------------------------------------------------  
*/

// --- Create a new task (with attachments + metadata) ---
router.post(
  "/",
  protect,
  createTaskLimiter,
  upload.fields([
    { name: "attachments", maxCount: 20 },
    { name: "logo", maxCount: 1 },
    { name: "paymentQr", maxCount: 1 },
  ]),
  enforceTotalSize,
  validateBody(createTaskSchema),
  createTask
);

// --- Public: List all tasks (search/browse) ---
router.get("/", getTasks);

// --- Auth: List tasks created by the logged-in user ---
router.get("/mine", protect, getMyTasks);

// --- Public: Get a single task by ID ---
router.get("/:id", getTaskById);

// --- Auth: Update a task (owner only) ---
router.put(
  "/:id",
  protect,
  upload.fields([
    { name: "attachments", maxCount: 20 },
    { name: "logo", maxCount: 1 },
    { name: "paymentQr", maxCount: 1 },
  ]),
  enforceTotalSize,
  updateTask
);

// --- Auth: Select an applicant (task owner only) ---
router.post("/:id/select", protect, selectLimiter, validateBody(selectApplicantSchema), selectApplicant);

// --- Auth: Apply to a task ---
router.post("/:id/apply", protect, applyLimiter, validateBody(applyTaskSchema), applyToTask);

// --- Auth: Delete a task (owner only) ---
router.delete("/:id", protect, deleteTask);

export default router;
