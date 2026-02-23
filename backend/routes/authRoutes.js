import express from "express";
import * as authController from "../controllers/authController.js";
import { signupSchema, signinSchema } from "../schemas/authSchemas.js";
import { validateBody } from "../middlewares/validate.js";
import { protect } from "../middlewares/authMiddleware.js";
import { buildLimiter, authSlowDown } from "../middlewares/rateLimiter.js";

const router = express.Router();

const signinLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  prefix: "rl:auth:signin:",
  message: { error: "Too many sign-in attempts. Please try again later." },
});

/*
 * OTP routes are intentionally disabled for now.
 * Keep controller/schema implementations in place until OTP rollout resumes.
 */

// Simple email/password signup
router.post("/signup", validateBody(signupSchema), authController.emailSignup);

// Simple email/password signin
router.post(
  "/signin",
  signinLimiter,
  authSlowDown,
  validateBody(signinSchema),
  authController.emailSignin
);

// Google OAuth
router.get("/google", authController.googleAuth);
router.get("/google/callback", authController.googleCallback);

// Authenticated profile
router.get("/me", protect, authController.getMe);
router.get("/notifications", protect, authController.getNotifications);
router.post("/notifications/:idx/read", protect, authController.markNotificationRead);
router.delete("/notifications/:idx", protect, authController.deleteNotification);

// Logout aliases
router.post("/logout", protect, authController.logout);
router.post("/signout", protect, authController.logout);

export default router;
