// routes/paymentRoutes.js

import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  createListingOrder,
  createPlanOrder,
  createOrder,
  verifyListingPayment,
  verifyPlanPayment,
  verifyPaymentAndSelectApplicant,
} from "../controllers/paymentController.js";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";
import { validateBody } from "../middlewares/validate.js";
import {
  createListingOrderSchema,
  createPlanOrderSchema,
  createOrderSchema,
  verifyListingPaymentSchema,
  verifyPlanPaymentSchema,
  verifyPaymentAndSelectApplicantSchema,
} from "../schemas/paymentSchemas.js";
import { requireFlag } from "../middlewares/flags.js";

// --- Advanced per-endpoint rate limiting setup ---
const redisClient = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : null;

// Order creation (anti-fraud, anti-spam): e.g., 10/min per IP
const orderLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: "Too many payment orders created, please try again in a minute.",
  standardHeaders: true,
  legacyHeaders: false,
  ...(redisClient && {
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    }),
  }),
});

// Payment verification (very sensitive, e.g., 5/min per IP)
const verifyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: "Too many payment verifications, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  ...(redisClient && {
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    }),
  }),
});

// Payment verification for applicant selection (e.g., 5/min per IP)
const selectLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: "Too many selection attempts, please slow down.",
  standardHeaders: true,
  legacyHeaders: false,
  ...(redisClient && {
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    }),
  }),
});

const router = express.Router();
router.use(requireFlag("FLAG_PAYMENT", "1"));
// Public key endpoint (safe to expose; not a secret)
router.get("/public-key", (_req, res) => {
  const keyId = process.env.RAZORPAY_KEY_ID || "";
  if (!keyId) return res.status(503).json({ error: "Payment temporarily unavailable" });
  return res.json({ keyId });
});

/*
|--------------------------------------------------------------------------  
| PAYMENT ROUTES (Google/Amazon-level structure)  
|--------------------------------------------------------------------------  
*/

// --- CREATE ORDER (initiate payment intent/order) ---
router.post(
  "/create-plan-order",
  protect,
  orderLimiter,
  validateBody(createPlanOrderSchema),
  createPlanOrder
);

// --- VERIFY PLAN PAYMENT + ACTIVATE PLAN ---
router.post(
  "/verify-plan-payment",
  protect,
  verifyLimiter,
  validateBody(verifyPlanPaymentSchema),
  verifyPlanPayment
);

// --- CREATE LISTING ORDER (sponsorship boosts/premium) ---
router.post(
  "/create-listing-order",
  protect,
  orderLimiter,
  validateBody(createListingOrderSchema),
  createListingOrder
);

// --- VERIFY LISTING PAYMENT (issue one-time verification id) ---
router.post(
  "/verify-listing-payment",
  protect,
  verifyLimiter,
  validateBody(verifyListingPaymentSchema),
  verifyListingPayment
);

// --- CREATE ORDER (task/applicant payments) ---
router.post(
  "/create-order",
  protect,
  orderLimiter,
  validateBody(createOrderSchema),
  createOrder
);

// --- DEPRECATED: VERIFY PAYMENT AND CREATE TASK ---
// Kept as explicit hard-block to prevent paid-listing bypasses via legacy clients.
// Current production flow is:
//   - regular posts -> /api/tasks
//   - paid listings -> /create-listing-order + /verify-listing-payment + /api/tasks
router.post(
  "/verify-payment",
  protect,
  verifyLimiter,
  (_req, res) => {
    return res.status(410).json({
      success: false,
      error: "Deprecated endpoint. Use the new listing payment flow.",
    });
  }
);

// --- VERIFY PAYMENT AND SELECT APPLICANT ---
router.post(
  "/verify-and-select",
  protect,
  selectLimiter,
  validateBody(verifyPaymentAndSelectApplicantSchema),
  verifyPaymentAndSelectApplicant
);

export default router;
