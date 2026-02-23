// authSchemas.js
// ------------------------------------------------------------
// Zod validation schemas for all auth-related endpoints.
// Multi-step signup, phone/email OTP, and 2FA login.
// ------------------------------------------------------------

import { z } from "zod";

// ------------------------------------------------------------
// Legacy simple schemas (can still be used if needed)
// ------------------------------------------------------------
export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(10, "Password must be at least 10 characters"),
});

export const signinSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ------------------------------------------------------------
// Common reusable pieces
// ------------------------------------------------------------

const otpSchema = z
  .string()
  .regex(/^\d{6}$/, "OTP must be a 6-digit code");

const deviceFingerprintSchema = z
  .string()
  .min(10, "Invalid device fingerprint")
  .max(500)
  .optional();

const passwordStrongSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128, "Password is too long");

// optionally you can enforce complexity here:
// .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
// .regex(/[a-z]/, "Password must contain at least one lowercase letter")
// .regex(/\d/, "Password must contain at least one digit")
// .regex(/[^A-Za-z0-9]/, "Password must contain at least one symbol");

// ------------------------------------------------------------
// Manual Email Signup (multi-step)
// ------------------------------------------------------------

// STEP 1: request OTP to email (manual signup)
export const requestEmailOtpSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name is too long"),
  email: z.string().email("Invalid email address"),
  deviceFingerprint: deviceFingerprintSchema,
});

// STEP 2: verify email OTP
export const verifyEmailOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: otpSchema,
  deviceFingerprint: deviceFingerprintSchema,
});

// STEP 3: set password after email is verified
export const setPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: passwordStrongSchema,
  deviceFingerprint: deviceFingerprintSchema,
});

// ------------------------------------------------------------
// Phone verification (used for both manual + Google signup)
// ------------------------------------------------------------

// STEP 4: request OTP to phone
export const requestPhoneOtpSchema = z.object({
  phone: z
    .string()
    .min(6, "Phone number is too short")
    .max(20, "Phone number is too long")
    .trim(),
  // optional context, e.g. "signup" | "login" | "change_phone"
  context: z.string().optional(),
  deviceFingerprint: deviceFingerprintSchema,
});

// STEP 5: verify phone OTP
export const verifyPhoneOtpSchema = z.object({
  phone: z
    .string()
    .min(6, "Phone number is too short")
    .max(20, "Phone number is too long")
    .trim(),
  otp: otpSchema,
  deviceFingerprint: deviceFingerprintSchema,
});

// ------------------------------------------------------------
// Login with 2FA (email or phone + password + OTP)
// ------------------------------------------------------------

// STEP 1: password check + send OTP
export const loginRequestOtpSchema = z.object({
  identifier: z
    .string()
    .min(3, "Enter a valid email or phone")
    .max(100, "Identifier is too long"), // can be email or phone
  password: z.string().min(1, "Password is required"),
  deviceFingerprint: deviceFingerprintSchema,
});

// STEP 2: verify login OTP
export const loginVerifyOtpSchema = z.object({
  identifier: z
    .string()
    .min(3, "Enter a valid email or phone")
    .max(100, "Identifier is too long"),
  otp: otpSchema,
  deviceFingerprint: deviceFingerprintSchema,
});

// ------------------------------------------------------------
// Optional: password reset / change flows (for later)
// ------------------------------------------------------------

export const requestPasswordResetSchema = z.object({
  email: z.string().email("Invalid email address"),
  deviceFingerprint: deviceFingerprintSchema,
});

export const resetPasswordWithOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: otpSchema,
  newPassword: passwordStrongSchema,
  deviceFingerprint: deviceFingerprintSchema,
});
