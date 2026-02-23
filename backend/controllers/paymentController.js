// controllers/paymentController.js

import Razorpay from "razorpay";
import crypto from "crypto";
import Task from "../models/taskModel.js";
import User from "../models/userModel.js";
import PaymentVerification from "../models/paymentVerificationModel.js";
import cloudinary from "../utils/cloudinary.js";
import { getPlanConfig, getPlanDurationMs, isPaidPlan } from "../utils/planConfig.js";
import { getListingPaymentConfig, normalizeListingCategory } from "../utils/listingPayments.js";

// --- Razorpay instance: env check and fail-fast ---
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error("[RAZORPAY] Missing credentials in env!");
}
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const getLogger = (req) => req?.log || console;
const PLAN_UPGRADE_PURPOSE = "plan_upgrade";
const TASK_POST_PAYMENT_PURPOSE = "task_post_payment";
const TASK_SELECTION_PAYMENT_PURPOSE = "task_selection_payment";

function verifyRazorpaySignature(orderId, paymentId, signature) {
  const sign = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(sign)
    .digest("hex");
  return expected === signature;
}

async function fetchOrderAndPayment(orderId, paymentId) {
  return Promise.all([razorpay.orders.fetch(orderId), razorpay.payments.fetch(paymentId)]);
}

function validateFetchedPayment({ order, payment, expectedAmount, expectedNotes, requestUserId }) {
  if (!order || !payment) return { ok: false, error: "Invalid payment details" };
  if (String(payment.order_id || "") !== String(order.id || "")) {
    return { ok: false, error: "Payment does not match order" };
  }
  if (String(order.currency || "").toUpperCase() !== "INR") {
    return { ok: false, error: "Unexpected order currency" };
  }
  if (String(payment.currency || "").toUpperCase() !== "INR") {
    return { ok: false, error: "Unexpected payment currency" };
  }
  if (Number(order.amount) !== expectedAmount || Number(payment.amount) !== expectedAmount) {
    return { ok: false, error: "Payment amount mismatch" };
  }
  if (String(payment.status || "").toLowerCase() !== "captured") {
    return { ok: false, error: "Payment not captured" };
  }

  if (expectedNotes?.purpose && String(order.notes?.purpose || "") !== expectedNotes.purpose) {
    return { ok: false, error: "Unexpected payment purpose" };
  }
  if (expectedNotes?.plan && String(order.notes?.plan || "").toLowerCase() !== expectedNotes.plan) {
    return { ok: false, error: "Plan mismatch in order notes" };
  }
  if (
    expectedNotes?.listingPlan &&
    String(order.notes?.listingPlan || "").toLowerCase() !== expectedNotes.listingPlan
  ) {
    return { ok: false, error: "Listing plan mismatch in order notes" };
  }
  if (
    expectedNotes?.category &&
    String(order.notes?.category || "").toLowerCase() !== expectedNotes.category
  ) {
    return { ok: false, error: "Listing category mismatch in order notes" };
  }
  if (requestUserId && String(order.notes?.userId || "") !== String(requestUserId)) {
    return { ok: false, error: "Order does not belong to this user" };
  }

  return { ok: true };
}

// --- Helper: upload one file (path or buffer) to Cloudinary ---
const uploadToCloudinary = (req, file) =>
  new Promise((resolve, reject) => {
    if (file?.path) {
      cloudinary.uploader.upload(
        file.path,
        { resource_type: "auto", folder: "cyphire/tasks" },
        (err, result) => {
          if (err) {
            getLogger(req).error?.("Cloudinary upload error:", err.message);
            return reject(err);
          }
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
            original_name: file.originalname || file.filename || "file",
            size: file.size || 0,
            contentType: file.mimetype || "application/octet-stream",
          });
        }
      );
      return;
    }
    if (file?.buffer) {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "auto", folder: "cyphire/tasks" },
        (err, result) => {
          if (err) {
            getLogger(req).error?.("Cloudinary upload error:", err.message);
            return reject(err);
          }
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
      return;
    }
    resolve(null);
  });

/**
 * POST /api/payment/create-order
 * Creates a new Razorpay order for the given amount.
 */
export const createOrder = async (req, res) => {
  try {
    const amount = parseInt(req.body.amount, 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      getLogger(req).warn?.("Invalid amount for order:", req.body.amount);
      return res.status(400).json({ error: "Invalid amount" });
    }
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    });
    getLogger(req).info?.("Created Razorpay order:", order.id, "for amount:", amount);
    res.json(order);
  } catch (err) {
    getLogger(req).error?.("createOrder error:", err.message);
    res.status(500).json({ error: "Failed to create order" });
  }
};

/**
 * POST /api/payment/create-plan-order
 * Creates a Razorpay order for a paid subscription plan.
 */
export const createPlanOrder = async (req, res) => {
  try {
    const plan = String(req.body?.plan || "").toLowerCase();
    if (!isPaidPlan(plan)) {
      return res.status(400).json({ error: "Invalid paid plan" });
    }

    const config = getPlanConfig(plan);
    if (!config?.amountInr || config.amountInr <= 0) {
      return res.status(400).json({ error: "Plan amount is not configured" });
    }

    const userId = String(req.user._id);
    const receipt = `plan_${userId.slice(-10)}_${Date.now()}`.slice(0, 40);

    const order = await razorpay.orders.create({
      amount: config.amountInr * 100,
      currency: "INR",
      receipt,
      notes: {
        purpose: PLAN_UPGRADE_PURPOSE,
        plan,
        userId,
      },
    });

    getLogger(req).info?.("Created plan order:", order.id, "plan:", plan, "user:", userId);
    return res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      plan,
    });
  } catch (err) {
    getLogger(req).error?.("createPlanOrder error:", err.message);
    return res.status(500).json({ error: "Failed to create plan order" });
  }
};

/**
 * POST /api/payment/verify-plan-payment
 * Verifies Razorpay payment and upgrades the user's plan.
 */
export const verifyPlanPayment = async (req, res) => {
  try {
    const {
      plan: requestedPlan,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const plan = String(requestedPlan || "").toLowerCase();
    if (!isPaidPlan(plan)) {
      return res.status(400).json({ error: "Invalid paid plan" });
    }

    const config = getPlanConfig(plan);
    if (!config?.amountInr || config.amountInr <= 0) {
      return res.status(400).json({ error: "Plan amount is not configured" });
    }

    if (!verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      getLogger(req).warn?.("Invalid plan payment signature:", razorpay_order_id);
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    const [order, payment] = await fetchOrderAndPayment(razorpay_order_id, razorpay_payment_id);
    const expectedAmount = config.amountInr * 100;
    const userId = String(req.user._id);

    if (!order || order.id !== razorpay_order_id) {
      return res.status(400).json({ error: "Invalid order" });
    }
    if (String(order.currency || "").toUpperCase() !== "INR") {
      return res.status(400).json({ error: "Unexpected order currency" });
    }
    if (Number(order.amount) !== expectedAmount) {
      return res.status(400).json({ error: "Order amount mismatch for plan" });
    }
    if (String(order.notes?.purpose || "") !== PLAN_UPGRADE_PURPOSE) {
      return res.status(400).json({ error: "Unexpected payment purpose" });
    }
    if (String(order.notes?.plan || "").toLowerCase() !== plan) {
      return res.status(400).json({ error: "Plan mismatch in order notes" });
    }
    if (String(order.notes?.userId || "") !== userId) {
      return res.status(403).json({ error: "Order does not belong to this user" });
    }

    if (!payment || String(payment.order_id || "") !== razorpay_order_id) {
      return res.status(400).json({ error: "Payment does not match order" });
    }
    if (String(payment.status || "").toLowerCase() !== "captured") {
      return res.status(400).json({ error: "Payment not captured" });
    }
    if (Number(payment.amount) !== expectedAmount) {
      return res.status(400).json({ error: "Payment amount mismatch for plan" });
    }
    if (String(payment.currency || "").toUpperCase() !== "INR") {
      return res.status(400).json({ error: "Unexpected payment currency" });
    }

    const user = await User.findById(req.user._id).select("plan planStartedAt planExpiresAt");
    if (!user) return res.status(404).json({ error: "User not found" });

    // Anti-replay: each Razorpay payment id can activate a plan only once.
    try {
      await PaymentVerification.create({
        purpose: PLAN_UPGRADE_PURPOSE,
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        user: user._id,
        plan,
        amount: Number(payment.amount),
        currency: String(payment.currency || "INR"),
      });
    } catch (err) {
      if (err?.code === 11000) {
        return res.status(409).json({ error: "This payment has already been used" });
      }
      throw err;
    }

    const durationMs = getPlanDurationMs(plan);
    const now = Date.now();
    const carryForwardFrom = Math.max(now, user.planExpiresAt?.getTime?.() || 0);

    user.plan = plan;
    user.planStartedAt = new Date(now);
    user.planExpiresAt = new Date(carryForwardFrom + durationMs);
    await user.save();

    getLogger(req).info?.(
      "Plan activated after verified payment:",
      user._id,
      plan,
      user.planExpiresAt
    );

    return res.json({
      success: true,
      plan: user.plan,
      planExpiresAt: user.planExpiresAt,
    });
  } catch (err) {
    getLogger(req).error?.("verifyPlanPayment error:", err.message);
    return res.status(500).json({ error: "Failed to verify plan payment" });
  }
};

/**
 * POST /api/payment/create-listing-order
 * Creates a Razorpay order for paid listing boosts.
 */
export const createListingOrder = async (req, res) => {
  try {
    const category = normalizeListingCategory(req.body?.category);
    const listingPlan = String(req.body?.listingPlan || "").toLowerCase();
    const config = getListingPaymentConfig(category, listingPlan);

    if (!config) {
      return res.status(400).json({ error: "Invalid listing payment request" });
    }

    const userId = String(req.user._id);
    const receipt = `list_${userId.slice(-10)}_${Date.now()}`.slice(0, 40);

    const order = await razorpay.orders.create({
      amount: config.amountInr * 100,
      currency: "INR",
      receipt,
      notes: {
        purpose: config.purpose,
        category,
        listingPlan,
        userId,
      },
    });

    getLogger(req).info?.(
      "Created listing order:",
      order.id,
      "category:",
      category,
      "listingPlan:",
      listingPlan,
      "user:",
      userId
    );

    return res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      category,
      listingPlan,
    });
  } catch (err) {
    getLogger(req).error?.("createListingOrder error:", err.message);
    return res.status(500).json({ error: "Failed to create listing order" });
  }
};

/**
 * POST /api/payment/verify-listing-payment
 * Verifies paid listing payment and returns one-time verification id for task creation.
 */
export const verifyListingPayment = async (req, res) => {
  try {
    const category = normalizeListingCategory(req.body?.category);
    const listingPlan = String(req.body?.listingPlan || "").toLowerCase();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const config = getListingPaymentConfig(category, listingPlan);
    if (!config) {
      return res.status(400).json({ error: "Invalid listing payment request" });
    }

    if (!verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      getLogger(req).warn?.("Invalid listing payment signature:", razorpay_order_id);
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    const [order, payment] = await fetchOrderAndPayment(razorpay_order_id, razorpay_payment_id);
    const expectedAmount = config.amountInr * 100;
    const validation = validateFetchedPayment({
      order,
      payment,
      expectedAmount,
      expectedNotes: {
        purpose: config.purpose,
        category,
        listingPlan,
      },
      requestUserId: req.user._id,
    });

    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    let verification;
    try {
      verification = await PaymentVerification.create({
        purpose: config.purpose,
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        user: req.user._id,
        listingPlan,
        amount: Number(payment.amount),
        currency: String(payment.currency || "INR"),
        meta: {
          category,
          listingPlan,
        },
      });
    } catch (err) {
      if (err?.code === 11000) {
        const existing = await PaymentVerification.findOne({
          razorpayPaymentId: razorpay_payment_id,
        }).select("_id user purpose consumedAt meta");

        if (
          existing &&
          String(existing.user) === String(req.user._id) &&
          existing.purpose === config.purpose &&
          !existing.consumedAt
        ) {
          return res.json({
            success: true,
            verificationId: existing._id,
            category,
            listingPlan,
          });
        }

        return res.status(409).json({ error: "This payment has already been used" });
      }
      throw err;
    }

    return res.json({
      success: true,
      verificationId: verification._id,
      category,
      listingPlan,
    });
  } catch (err) {
    getLogger(req).error?.("verifyListingPayment error:", err.message);
    return res.status(500).json({ error: "Failed to verify listing payment" });
  }
};

/**
 * POST /api/payment/verify-payment
 * Verifies a successful payment, then creates a Task with attachments.
 */
export const verifyPaymentAndCreateTask = async (req, res) => {
  let claimedVerificationId = null;
  let createdTaskId = null;
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      getLogger(req).warn?.("Invalid Razorpay signature:", razorpay_order_id);
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    // Collect fields
    const {
      title,
      description,
      numberOfApplicants,
      price,
      deadline,
      category,
      metadata,
    } = req.body;

    const expectedAmount = Math.round(Number(price) * 100);
    if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid task price" });
    }

    const [order, payment] = await fetchOrderAndPayment(razorpay_order_id, razorpay_payment_id);
    if (!order || order.id !== razorpay_order_id) {
      return res.status(400).json({ success: false, message: "Invalid order" });
    }
    if (String(order.currency || "").toUpperCase() !== "INR") {
      return res.status(400).json({ success: false, message: "Unexpected order currency" });
    }
    if (Number(order.amount) !== expectedAmount) {
      return res.status(400).json({ success: false, message: "Order amount mismatch" });
    }
    if (!payment || String(payment.order_id || "") !== razorpay_order_id) {
      return res.status(400).json({ success: false, message: "Payment does not match order" });
    }
    if (String(payment.status || "").toLowerCase() !== "captured") {
      return res.status(400).json({ success: false, message: "Payment not captured" });
    }
    if (Number(payment.amount) !== expectedAmount) {
      return res.status(400).json({ success: false, message: "Payment amount mismatch" });
    }
    if (String(payment.currency || "").toUpperCase() !== "INR") {
      return res.status(400).json({ success: false, message: "Unexpected payment currency" });
    }

    let parsedMetadata = {};
    if (typeof metadata === "string") {
      try {
        parsedMetadata = JSON.parse(metadata || "{}") || {};
      } catch {
        return res.status(400).json({ success: false, message: "Invalid metadata JSON" });
      }
    } else if (metadata && typeof metadata === "object") {
      parsedMetadata = metadata;
    }

    // Claim payment id before creating task to block replay on parallel requests.
    try {
      const claim = await PaymentVerification.create({
        purpose: TASK_POST_PAYMENT_PURPOSE,
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        user: req.user._id,
        amount: Number(payment.amount),
        currency: String(payment.currency || "INR"),
        meta: {
          category: Array.isArray(category) ? category : [category].filter(Boolean),
        },
      });
      claimedVerificationId = claim._id;
    } catch (err) {
      if (err?.code === 11000) {
        const existing = await PaymentVerification.findOne({
          razorpayPaymentId: razorpay_payment_id,
        }).select("_id purpose user consumedByTask");

        if (
          existing &&
          existing.purpose === TASK_POST_PAYMENT_PURPOSE &&
          String(existing.user) === String(req.user._id)
        ) {
          if (existing.consumedByTask) {
            const existingTask = await Task.findById(existing.consumedByTask);
            if (existingTask) {
              return res.json({ success: true, task: existingTask, idempotent: true });
            }
          }
          return res
            .status(409)
            .json({ success: false, message: "Payment is already being processed" });
        }

        return res.status(409).json({ success: false, message: "This payment has already been used" });
      }
      throw err;
    }

    // Normalize categories
    const rawCats = []
      .concat(req.body["categories[]"] || [])
      .concat(req.body.categories || [])
      .concat(req.body.category || []);
    const categories = rawCats.flat().map(String).filter(Boolean);

    // Upload attachments
    const uploadedFiles = [];
    const files = Array.isArray(req.files) ? req.files : [];
    for (const f of files) {
      const uploaded = await uploadToCloudinary(req, f);
      if (uploaded) uploadedFiles.push(uploaded);
    }

    // Create task
    const task = await Task.create({
      title: String(title || "").trim(),
      description: String(description || "").trim(),
      category: categories,
      numberOfApplicants: Number(numberOfApplicants) || 0,
      price: Number(price) || 0,
      deadline: deadline ? new Date(deadline) : null,
      createdBy: req.user._id,
      attachments: uploadedFiles,
      metadata: parsedMetadata,
    });
    createdTaskId = task._id;

    await PaymentVerification.updateOne(
      { _id: claimedVerificationId },
      {
        $set: {
          consumedAt: new Date(),
          consumedByTask: task._id,
        },
      }
    );

    getLogger(req).info?.("Created task after payment:", task._id, "by", req.user._id);

    return res.json({ success: true, task });
  } catch (err) {
    if (claimedVerificationId && !createdTaskId) {
      // Best-effort rollback: allow retry when creation fails after claim.
      await PaymentVerification.deleteOne({ _id: claimedVerificationId }).catch((cleanupErr) => {
        getLogger(req).error?.("Failed to cleanup task payment claim:", cleanupErr?.message);
      });
    }
    getLogger(req).error?.("verifyPaymentAndCreateTask error:", err.message);
    res.status(500).json({ success: false, message: "Server error posting task" });
  }
};

/**
 * POST /api/payment/verify-and-select
 * Verifies Razorpay payment, then selects applicant on a task.
 */
export const verifyPaymentAndSelectApplicant = async (req, res) => {
  let claimedVerificationId = null;
  let selectionCommitted = false;
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, taskId, applicantId } = req.body;

    if (!verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      getLogger(req).warn?.("Invalid Razorpay signature for select:", razorpay_order_id);
      return res.status(400).json({ success: false, error: "Invalid payment signature" });
    }

    const task = await Task.findById(taskId).populate("applicants", "_id name");
    if (!task) return res.status(404).json({ success: false, error: "Task not found" });

    const expectedAmount = Math.round(Number(task.price || 0) * 100);
    if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
      return res.status(400).json({ success: false, error: "Task amount is invalid" });
    }

    const [order, payment] = await fetchOrderAndPayment(razorpay_order_id, razorpay_payment_id);
    if (!order || order.id !== razorpay_order_id) {
      return res.status(400).json({ success: false, error: "Invalid order" });
    }
    if (String(order.currency || "").toUpperCase() !== "INR") {
      return res.status(400).json({ success: false, error: "Unexpected order currency" });
    }
    if (Number(order.amount) !== expectedAmount) {
      return res.status(400).json({ success: false, error: "Order amount mismatch" });
    }
    if (!payment || String(payment.order_id || "") !== razorpay_order_id) {
      return res.status(400).json({ success: false, error: "Payment does not match order" });
    }
    if (String(payment.status || "").toLowerCase() !== "captured") {
      return res.status(400).json({ success: false, error: "Payment not captured" });
    }
    if (Number(payment.amount) !== expectedAmount) {
      return res.status(400).json({ success: false, error: "Payment amount mismatch" });
    }
    if (String(payment.currency || "").toUpperCase() !== "INR") {
      return res.status(400).json({ success: false, error: "Unexpected payment currency" });
    }

    // Only owner can select
    if (String(task.createdBy) !== String(req.user._id)) {
      getLogger(req).warn?.("Unauthorized select attempt by", req.user._id, "for task", taskId);
      return res.status(403).json({ success: false, error: "Only the task owner can select an applicant" });
    }

    // Ensure applicant applied
    const applied = (task.applicants || []).some(
      (a) => String(a._id || a) === String(applicantId)
    );
    if (!applied) return res.status(400).json({ success: false, error: "This user has not applied" });

    if (task.selectedApplicant) {
      return res.status(400).json({ success: false, error: "An applicant has already been selected" });
    }

    // Claim payment id before selection to block replay across different tasks.
    try {
      const claim = await PaymentVerification.create({
        purpose: TASK_SELECTION_PAYMENT_PURPOSE,
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        user: req.user._id,
        amount: Number(payment.amount),
        currency: String(payment.currency || "INR"),
        meta: {
          taskId: String(task._id),
          applicantId: String(applicantId),
        },
      });
      claimedVerificationId = claim._id;
    } catch (err) {
      if (err?.code === 11000) {
        const existing = await PaymentVerification.findOne({
          razorpayPaymentId: razorpay_payment_id,
        }).select("_id purpose user consumedByTask");

        if (
          existing &&
          existing.purpose === TASK_SELECTION_PAYMENT_PURPOSE &&
          String(existing.user) === String(req.user._id)
        ) {
          if (existing.consumedByTask && String(existing.consumedByTask) === String(task._id)) {
            const latestTask = await Task.findById(task._id).populate("applicants", "_id name");
            if (latestTask?.selectedApplicant) {
              return res.json({ success: true, task: latestTask, idempotent: true });
            }
          }
          return res
            .status(409)
            .json({ success: false, error: "Payment is already being processed" });
        }

        return res.status(409).json({ success: false, error: "This payment has already been used" });
      }
      throw err;
    }

    // Select applicant + create workroomId
    task.selectedApplicant = applicantId;
    const { getNextWorkroomId } = await import("../utils/getNextWorkroomId.js");
    task.workroomId = await getNextWorkroomId();
    await task.save();
    selectionCommitted = true;

    await PaymentVerification.updateOne(
      { _id: claimedVerificationId },
      {
        $set: {
          consumedAt: new Date(),
          consumedByTask: task._id,
        },
      }
    );

    // Notifications (winner & all others)
    const selectedId = String(applicantId);
    const title = task.title || "your task";
    const selectedMsg = `You’ve been selected for “${title}”.`;
    const rejectedMsg = `Update on “${title}”: you weren’t selected this time.`;

    await Promise.all(
      (task.applicants || []).map((a) => {
        const uid = String(a._id || a);
        const payload = {
          type: uid === selectedId ? "selection" : "rejection",
          message: uid === selectedId ? selectedMsg : rejectedMsg,
          link: "/dashboard?tab=myApplications",
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return User.updateOne(
          { _id: uid },
          { $push: { notifications: { $each: [payload], $position: 0 } } }
        ).exec();
      })
    );

    getLogger(req).info?.("Applicant selected for task:", task._id, "applicant:", applicantId);

    return res.json({ success: true, task });
  } catch (err) {
    if (claimedVerificationId && !selectionCommitted) {
      // Best-effort rollback: allow retry when selection fails after claim.
      await PaymentVerification.deleteOne({ _id: claimedVerificationId }).catch((cleanupErr) => {
        getLogger(req).error?.("Failed to cleanup selection payment claim:", cleanupErr?.message);
      });
    }
    getLogger(req).error?.("verifyPaymentAndSelectApplicant error:", err.message);
    res.status(500).json({ success: false, error: "Server error selecting applicant" });
  }
};
