// controllers/workroomMessageController.js

import WorkroomMessages from "../models/workroomMessageModel.js";
import Task from "../models/taskModel.js";

const canAccessWorkroom = async ({ workroomId, user }) => {
  const task = await Task.findOne({ workroomId }).select("createdBy selectedApplicant finalisedAt");
  if (!task) return { ok: false, code: 404, error: "Workroom not found" };

  const userId = String(user?._id || "");
  const isOwner = String(task.createdBy) === userId;
  const isSelected = String(task.selectedApplicant || "") === userId;
  const isAdmin = Boolean(user?.isAdmin);

  if (!isOwner && !isSelected && !isAdmin) {
    return { ok: false, code: 403, error: "Forbidden" };
  }
  return { ok: true, task };
};

/**
 * POST /api/workrooms/:workroomId/messages
 * Post a message (text + attachments) in a workroom.
 * (This could be used for legacy or non-socket endpoints)
 */
export const postMessage = async (req, res) => {
  try {
    const { workroomId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;
    const access = await canAccessWorkroom({ workroomId, user: req.user });
    if (!access.ok) return res.status(access.code).json({ error: access.error });
    const task = access.task;

    if (task.finalisedAt) return res.status(400).json({ error: "Chat is finalized" });

    const files = Array.isArray(req.files) ? req.files : [];

    // Accepts files already uploaded/processed elsewhere
    const attachments = files.map(f => ({
      url: f.path || f.secure_url || f.url,
      public_id: f.filename || f.public_id,
      type: f.mimetype?.startsWith("image/") ? "image" :
            f.mimetype?.startsWith("video/") ? "video" : "file",
      original_name: f.originalname,
      size: f.size,
      contentType: f.mimetype,
    }));

    if (!text && attachments.length === 0) {
      return res.status(400).json({ error: "Message is empty" });
    }

    const message = {
      sender: userId,
      text: text?.trim() || "",
      attachments,
      createdAt: new Date(),
      deleted: false,
      deletedAt: null,
    };

    const updated = await WorkroomMessages.findOneAndUpdate(
      { workroomId },
      {
        $push: { messages: message },
        $setOnInsert: {
          expireAt: task.finalisedAt
            ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            : null,
        },
      },
      { upsert: true, new: true }
    );

    const inserted = updated.messages[updated.messages.length - 1];
    res.status(201).json({ item: inserted });
  } catch (e) {
    req.log.error("[WORKROOM MESSAGE] postMessage error:", e);
    res.status(500).json({ error: "Failed to send message" });
  }
};

/**
 * GET /api/workrooms/:workroomId/messages
 * Fetch all messages for a workroom.
 * (returns only not-deleted messages)
 */
export const getMessages = async (req, res) => {
  try {
    const { workroomId } = req.params;
    const access = await canAccessWorkroom({ workroomId, user: req.user });
    if (!access.ok) return res.status(access.code).json({ error: access.error });

    const doc = await WorkroomMessages.findOne({ workroomId }).populate("messages.sender", "name avatar");
    if (!doc) return res.json({ items: [] });
    // Filter out deleted messages just in case
    const items = doc.messages.filter(msg => !msg.deleted);
    res.json({ items });
  } catch (e) {
    req.log.error("[WORKROOM MESSAGE] getMessages error:", e);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

/**
 * DELETE /api/workrooms/:workroomId/messages/:messageId
 * Soft delete a message (marks deleted=true, sets deletedAt)
 */
export const deleteMessage = async (req, res) => {
  try {
    const { workroomId, messageId } = req.params;
    const access = await canAccessWorkroom({ workroomId, user: req.user });
    if (!access.ok) return res.status(access.code).json({ success: false, error: access.error });

    const doc = await WorkroomMessages.findOne({ workroomId });
    if (!doc) return res.status(404).json({ success: false, error: "Workroom not found" });

    const msg = await doc.softDeleteMessage(messageId);
    if (!msg) return res.status(404).json({ success: false, error: "Message not found" });

    res.json({ success: true, data: { id: msg._id, deletedAt: msg.deletedAt } });
  } catch (e) {
    req.log.error("[WORKROOM MESSAGE] deleteMessage error:", e);
    res.status(500).json({ success: false, error: "Failed to delete message" });
  }
};
