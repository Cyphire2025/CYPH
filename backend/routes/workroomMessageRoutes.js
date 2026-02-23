// routes/workroomMessageRoutes.js

import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { upload, enforceTotalSize } from "../middlewares/uploadMiddleware.js";
import { getMessages } from "../controllers/workroomMessageController.js";
import { postMessage } from "../controllers/workroomController.js";
import { validateBody } from "../middlewares/validate.js";
import { postMessageSchema } from "../schemas/workroomSchemas.js";
import { requireFlag } from "../middlewares/flags.js";

const router = express.Router();
router.use(requireFlag("FLAG_WORKROOM_MESSAGE", "1"));

// Fetch all messages for a workroom (must be a participant)
router.get("/:workroomId/messages", protect, getMessages);

// Post a new message (text + up to 10 attachments)
router.post(
  "/:workroomId/messages",
  protect,
  upload.array("attachments", 10),
  enforceTotalSize,
  validateBody(postMessageSchema),
  postMessage
);

export default router;
