// controllers/paymentLogController.js

import Task from "../models/taskModel.js";
import User from "../models/userModel.js";
import PaymentLog from "../models/paymentLogModel.js";

// --- Logger for payout actions ---
const logger = {
  info: (...args) => req.log.info("[PAYOUT]", ...args),
  warn: (...args) => req.log.warn("[PAYOUT][WARN]", ...args),
  error: (...args) => req.log.error("[PAYOUT][ERROR]", ...args),
};

/**
 * POST /workrooms/:workroomId/payment-log
 * Logs payout for a completed workroom/task.
 */
export const createPaymentLog = async (req, res) => {
  try {
    const { workroomId } = req.params;
    const { upiId } = req.body;

    if (!upiId || !upiId.includes("@")) {
      req.log.warn("Invalid UPI for payout:", upiId);
      return res.status(400).json({ error: "Valid UPI ID required" });
    }

    const task = await Task.findOne({ workroomId }).populate("selectedApplicant");
    if (!task) return res.status(404).json({ error: "Task not found" });

    const requesterId = String(req.user?._id || "");
    const selectedApplicantId = String(task.selectedApplicant?._id || task.selectedApplicant || "");
    const isSelectedApplicant = requesterId && selectedApplicantId && requesterId === selectedApplicantId;
    if (!isSelectedApplicant && !req.user?.isAdmin) {
      return res.status(403).json({ error: "Only the selected applicant can request payout" });
    }

    if (!task.finalisedAt || !task.clientFinalised || !task.workerFinalised) {
      return res.status(400).json({ error: "Workroom must be finalized before payout request" });
    }

    const existingLog = await PaymentLog.findOne({ workroomId }).sort({ createdAt: -1 });
    if (existingLog) {
      return res.json({ success: true, log: existingLog, paymentRequested: true, idempotent: true });
    }

    const freelancer = await User.findById(task.selectedApplicant);
    if (!freelancer) return res.status(404).json({ error: "Freelancer not found" });

    const feePercent = 20;
    const fee = Math.round(task.price * (feePercent / 100));
    const netAmount = task.price - fee;

    const upiLink = `upi://pay?pa=${encodeURIComponent(
      upiId
    )}&pn=${encodeURIComponent(freelancer.name)}&am=${netAmount}&cu=INR&tn=${encodeURIComponent(
      "Cyphire payout for " + task.title
    )}`;

    // Save log
    const log = await PaymentLog.create({
      workroomId,
      taskId: task._id,
      freelancer: {
        _id: freelancer._id,
        name: freelancer.name,
        email: freelancer.email,
      },
      upiId,
      grossAmount: task.price,
      fee,
      netAmount,
      upiLink,
      qrData: upiLink,
    });

    // Update task
    task.paymentRequested = true;
    task.upiId = upiId;
    await task.save();

    req.log.info("Created payout log:", log._id, "for workroom:", workroomId);

    res.json({ success: true, log, paymentRequested: true });

  } catch (err) {
    req.log.error("createPaymentLog error:", err.message);
    res.status(500).json({ error: "Failed to create payment log" });
  }
};

/**
 * GET /admin/payments
 * Fetch all payout logs (admin).
 */
export const getPaymentLogs = async (req, res) => {
  try {
    const logs = await PaymentLog.find().sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    req.log.error("getPaymentLogs error:", err.message);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
};

/**
 * PATCH /admin/payments/:id/status
 * Update payout status (admin).
 */
export const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paid } = req.body;
    const log = await PaymentLog.findByIdAndUpdate(
      id,
      { paid },
      { new: true }
    );
    if (!log) return res.status(404).json({ error: "Payment log not found" });

    req.log.info("Updated payout status:", id, "to", paid);

    res.json({ success: true, paid: log.paid });
  } catch (err) {
    req.log.error("updatePaymentStatus error:", err.message);
    res.status(500).json({ error: "Failed to update status" });
  }
};
