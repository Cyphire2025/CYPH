// routes/helpRoutes.js

import express from "express";
import { protect, requireAdmin } from "../middlewares/authMiddleware.js";
import { upload, enforceTotalSize } from "../middlewares/uploadMiddleware.js";
import {
  createTicket,
  postComment,
  closeTicket,
  reopenTicket,
  getTicketById,
  getMyTickets,
  adminGetAllTickets,
} from "../controllers/helpController.js";
import { validateBody } from "../middlewares/validate.js";
import { createTicketSchema, postCommentSchema } from "../schemas/helpSchemas.js";
import { requireFlag } from "../middlewares/flags.js";

const router = express.Router();
router.use(requireFlag("FLAG_HELP", "1"));

// Create a ticket (initial description, attachments)
router.post(
  "/tickets",
  protect,
  upload.array("attachments", 5),
  enforceTotalSize,
  validateBody(createTicketSchema),
  createTicket
);

// Add a comment (user or admin)
router.post(
  "/tickets/:id/comments",
  protect,
  upload.array("files", 5), // up to 5 files per comment
  enforceTotalSize,
  validateBody(postCommentSchema),
  postComment
);

// Close/reopen a ticket (user or admin)
router.patch("/tickets/:id/close", protect, closeTicket);
router.patch("/tickets/:id/reopen", protect, reopenTicket);

// Fetch all my tickets
router.get("/tickets/mine", protect, getMyTickets);

// Fetch full ticket (thread/chat)
router.get("/tickets/:id", protect, getTicketById);

// Admin: fetch all tickets (with filters, pagination)
router.get("/tickets", protect, requireAdmin, adminGetAllTickets);

export default router;
