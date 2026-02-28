// controllers/authController.js

import bcrypt from "bcrypt";
import passport from "passport";
import User from "../models/userModel.js";
import { signJwt } from "../utils/jwt.js";
import { setAuthCookie, clearAuthCookie } from "../utils/authCookie.js";
import {
  generateOtp,
  hashOtp,
  verifyOtp,
  getOtpExpiry,
  isOtpExpired,
  isMaxAttemptsReached,
  isMaxResendsReached,
  OTP_CONFIG,
} from "../utils/otp.js";
import {
  addAuditLog,
  addSecurityEvent,
  logEmailChange,
  logPhoneChange,
  logPasswordReset,
  logLogin,
  logLoginFailed,
  logOtpSent,
  logOtpFailed,
  logAccountLocked,
  logAccountUnlocked,
} from "../utils/auditLogger.js";
import {
  registerFailedLogin,
  clearFailedLogins,
  isAccountLocked,
  detectSuspiciousLogin,
  bumpRiskScore,
} from "../utils/riskEngine.js";
import { sendOtpSms } from "../utils/otpService.js";

const trimSlash = (url = "") => String(url || "").replace(/\/+$/, "");

// Helper: get real client IP (trusts reverse proxy headers)
const getClientIp = (req) =>
  req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
  req.connection?.remoteAddress ||
  req.ip;

function sanitizeNextPath(next) {
  const allowedPaths = new Set(["/", "/choose", "/dashboard", "/profile", "/signin", "/login"]);
  if (typeof next !== "string") return "/";

  const candidate = next.trim();
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("..")) {
    return "/";
  }

  try {
    const parsed = new URL(candidate, "https://cyphire.local");
    if (!allowedPaths.has(parsed.pathname)) return "/";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}

function encodeState(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}
function decodeState(str) {
  try {
    return JSON.parse(Buffer.from(str, "base64url").toString());
  } catch {
    return null;
  }
}
const getFrontendBase = () => trimSlash(process.env.FRONTEND_URL) || "http://localhost:5173";

const normalizeEmail = (email = "") => email.trim().toLowerCase();
const normalizePhone = (phone = "") => phone.trim();
const buildAuthToken = (user) =>
  signJwt({ id: user._id, tv: Number(user.tokenVersion || 0) });

// ---------------------------------------------------------------------------
// EXISTING SIMPLE EMAIL SIGNUP (kept as-is for compatibility)
// ---------------------------------------------------------------------------

/**
 * POST /api/auth/signup
 */
export const emailSignup = async (req, res, next) => {
  try {
    const { name, email, password, rememberMe } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email & password required" });

    const signupIp = getClientIp(req);
    if (await User.isIpBlocked?.(signupIp)) {
      req.log?.warn?.("Blocked IP tried to signup:", signupIp);
      return res.status(403).json({ error: "Signup blocked from your network." });
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await User.countDocuments({ signupIp, createdAt: { $gte: since } });
    if (count >= 3) {
      req.log?.warn?.("Signup rate limit hit for IP:", signupIp);
      return res.status(429).json({ error: "Too many signups from your network, try again later." });
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email: normalizedEmail,
      passwordHash,
      signupIp,
      signinIpHistory: [signupIp],
    });

    const token = buildAuthToken(user);
    setAuthCookie(res, token, { remember: !!rememberMe });

    req.log?.info?.("User signup:", user.email, user._id, "ip:", signupIp);

    res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar },
    });
  } catch (err) {
    req.log?.error?.("emailSignup error:", err);
    next(err);
  }
};

/**
 * POST /api/auth/signin
 */
export const emailSignin = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !user.passwordHash) return res.status(401).json({ error: "Invalid credentials" });

    if (isAccountLocked(user)) {
      logAccountLocked(user, { reason: "locked_email_signin", ip: getClientIp(req) });
      await user.save();
      return res.status(423).json({ error: "Account temporarily locked due to many failed attempts." });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      registerFailedLogin(user);
      logLoginFailed(user, { ip: getClientIp(req) });
      if (isAccountLocked(user)) {
        logAccountLocked(user, { reason: "too_many_failed_email_signin", ip: getClientIp(req) });
      }
      await user.save();
      return res.status(401).json({ error: "Invalid credentials" });
    }

    clearFailedLogins(user);

    const signinIp = getClientIp(req);
    if (await User.isIpBlocked?.(signinIp)) {
      req.log?.warn?.("Blocked IP tried to signin:", signinIp);
      return res.status(403).json({ error: "Signin blocked from your network." });
    }

    user.signinIpHistory = [signinIp, ...(user.signinIpHistory || [])].slice(0, 5);
    user.lastLoginAt = new Date();
    user.lastLoginIp = signinIp;

    logLogin(user, { ip: signinIp });

    await user.save();

    const token = buildAuthToken(user);
    setAuthCookie(res, token, { remember: !!rememberMe });

    req.log?.info?.("User login:", user.email, user._id, "ip:", signinIp);

    res.json({
      user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar },
    });
  } catch (err) {
    req.log?.error?.("emailSignin error:", err);
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GOOGLE OAUTH (unchanged, just slight hardening if needed)
// ---------------------------------------------------------------------------

/**
 * GET /api/auth/google
 */
export const googleAuth = (req, res, next) => {
  try {
    const remember = req.query.remember === "1" ? "1" : "0";
    const nextPath = sanitizeNextPath(req.query.next);
    const state = encodeState({ remember, next: nextPath });

    req.log?.info?.("Google OAuth initiated", { remember, nextPath });

    passport.authenticate("google", {
      scope: ["profile", "email"],
      session: false,
      state,
      prompt: "select_account",
    })(req, res, next);
  } catch (err) {
    req.log?.error?.("googleAuth error:", err);
    next(err);
  }
};

/**
 * GET /api/auth/google/callback
 */
export const googleCallback = (req, res, next) => {
  passport.authenticate("google", { session: false }, (err, user) => {
    if (err || !user) return res.redirect(`${getFrontendBase()}/signin?error=oauth_failed`);
    try {
      const token = buildAuthToken(user);

      let rememberMe = false;
      let nextPath = "/choose";

      const { state } = req.query;
      if (state === "1" || state === "0" || state === undefined) {
        rememberMe = state === "1";
      } else {
        const parsed = decodeState(state);
        if (parsed) {
          rememberMe =
            parsed.remember === "1" || parsed.remember === true || parsed.remember === "true";
          nextPath = sanitizeNextPath(parsed.next) || "/choose";
        }
      }

      setAuthCookie(res, token, { remember: !!rememberMe });

      res.setHeader("Cache-Control", "no-store");
      return res.redirect(`${getFrontendBase()}${nextPath}`);
    } catch (e) {
      console.error("googleCallback error:", e);
      return res.redirect(`${getFrontendBase()}/signin?error=server_error`);
    }
  })(req, res, next);
};

/**
 * POST /api/auth/signout
 */
export const signout = (_req, res, next) => {
  try {
    clearAuthCookie(res);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// alias for routes using /logout
export const logout = signout;

/**
 * GET /api/auth/me
 */
export const me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select(
      "_id name email avatar plan planStartedAt planExpiresAt country phone skills projects slug bio professionalProfile emailVerified phoneVerified riskScore shadowBanned"
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.plan !== "free" && user.planExpiresAt && Date.now() > user.planExpiresAt) {
      user.plan = "free";
      user.planExpiresAt = null;
      await user.save();
    }

    res.json({ user });
  } catch (err) {
    req.log?.error?.("authController.me error:", err);
    next(err);
  }
};

// alias for routes using getMe
export const getMe = me;

// ---------------------------------------------------------------------------
// Notifications (unchanged)
// ---------------------------------------------------------------------------

export const getNotifications = async (req, res, next) => {
  try {
    const me = await User.findById(req.user._id).select("notifications");
    res.json(me?.notifications || []);
  } catch (err) {
    next(err);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const idx = Number(req.params.idx);
    const me = await User.findById(req.user._id).select("notifications");
    if (!me) return res.status(404).json({ error: "User not found" });
    if (!Number.isInteger(idx) || idx < 0 || idx >= me.notifications.length) {
      return res.status(400).json({ error: "Invalid index" });
    }
    me.notifications[idx].read = true;
    await me.save();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const idx = Number(req.params.idx);
    const me = await User.findById(req.user._id).select("notifications");
    if (!me) return res.status(404).json({ error: "User not found" });
    if (!Number.isInteger(idx) || idx < 0 || idx >= me.notifications.length) {
      return res.status(400).json({ error: "Invalid index" });
    }
    me.notifications.splice(idx, 1);
    await me.save();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// NEW: Multi-step manual email signup (OTP + password)
// ---------------------------------------------------------------------------

/**
 * STEP 1: Request email OTP for signup
 * POST /api/auth/signup/email/request-otp
 */
export const requestEmailOtp = async (req, res, next) => {
  try {
    const { name, email, deviceFingerprint } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const ip = getClientIp(req);
    const userAgent = req.headers["user-agent"];

    if (await User.isIpBlocked?.(ip)) {
      return res.status(403).json({ error: "Signup blocked from your network." });
    }

    let user = await User.findOne({ email: normalizedEmail });

    // If fully registered + verified, don't allow another signup
    if (user && user.emailVerified && user.passwordHash) {
      return res.status(409).json({ error: "Email already registered" });
    }

    if (!user) {
      user = await User.create({
        name,
        email: normalizedEmail,
        signupIp: ip,
        signinIpHistory: [ip],
        emailVerified: false,
        phoneVerified: false,
      });
    }

    // Enforce resend limit
    if (isMaxResendsReached(user.emailOtpResendCount ?? 0)) {
      return res.status(429).json({
        error: "Too many email OTP requests. Please try again later.",
      });
    }

    const otp = generateOtp();
    const hash = await hashOtp(otp);
    const expiresAt = getOtpExpiry();

    user.emailOtpHash = hash;
    user.emailOtpExpiresAt = expiresAt;
    user.emailOtpResendCount = (user.emailOtpResendCount || 0) + 1;

    addSecurityEvent(user, {
      type: "otp_sent",
      ip,
      userAgent,
      meta: { channel: "email", purpose: "signup" },
    });
    logOtpSent(user, { channel: "email", ip, userAgent, meta: { purpose: "signup" } });

    await user.save();

    if (process.env.NODE_ENV !== "production") {
      const safeEmail = String(normalizedEmail).replace(/[\r\n]/g, "");
      console.log("[DEV ONLY] Email OTP for:", safeEmail, otp);
    }

    res.json({
      ok: true,
      message: "If this email is valid, an OTP has been sent.",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * STEP 2: Verify email OTP
 * POST /api/auth/signup/email/verify-otp
 */
export const verifyEmailOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const ip = getClientIp(req);
    const userAgent = req.headers["user-agent"];

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(400).json({ error: "Invalid email or OTP" });

    if (!user.emailOtpHash || !user.emailOtpExpiresAt || isOtpExpired(user.emailOtpExpiresAt)) {
      logOtpFailed(user, {
        channel: "email",
        reason: "expired",
        ip,
        userAgent,
        meta: { purpose: "signup" },
      });
      await user.save();
      return res.status(400).json({ error: "OTP expired, request a new one." });
    }

    const valid = await verifyOtp(otp, user.emailOtpHash);
    if (!valid) {
      logOtpFailed(user, {
        channel: "email",
        reason: "invalid",
        ip,
        userAgent,
        meta: { purpose: "signup" },
      });
      await user.save();
      return res.status(400).json({ error: "Invalid OTP" });
    }

    user.emailVerified = true;
    user.emailOtpHash = undefined;
    user.emailOtpExpiresAt = undefined;
    user.emailOtpResendCount = 0;

    addAuditLog(user, {
      type: "otp_sent",
      ip,
      userAgent,
      meta: { channel: "email", purpose: "signup_verify" },
    });

    await user.save();

    res.json({ ok: true, message: "Email verified successfully." });
  } catch (err) {
    next(err);
  }
};

/**
 * STEP 3: Set password after email verification
 * POST /api/auth/signup/email/set-password
 */
export const setPassword = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const ip = getClientIp(req);
    const userAgent = req.headers["user-agent"];

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(400).json({ error: "User not found" });

    if (!user.emailVerified) {
      return res.status(403).json({ error: "Email not verified." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const oldHashed = user.passwordHash ? "set" : "unset";

    user.passwordHash = passwordHash;
    user.tokenVersion = (user.tokenVersion || 0) + 1;

    logPasswordReset(user, {
      ip,
      userAgent,
      meta: { flow: "signup_set_password", oldState: oldHashed },
    });

    await user.save();

    res.json({ ok: true, message: "Password set successfully." });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Phone verification (for both manual + Google signup)
// Requires user to be authenticated (req.user._id)
// ---------------------------------------------------------------------------

/**
 * STEP 4: Request phone OTP
 * POST /api/auth/signup/phone/request-otp
 */
export const requestPhoneOtp = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { phone, context } = req.body;
    const ip = getClientIp(req);
    const userAgent = req.headers["user-agent"];

    const normalizedPhone = normalizePhone(phone);

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.shadowBanned) {
      return res.status(403).json({ error: "Account restricted. Contact support." });
    }

    // Check if phone is already verified for another account
    const existingPhoneOwner = await User.findOne({
      _id: { $ne: user._id },
      phone: normalizedPhone,
      phoneVerified: true,
    });

    if (existingPhoneOwner) {
      return res.status(409).json({ error: "This phone number is already linked to another account." });
    }

    // Enforce resend limit
    if (isMaxResendsReached(user.phoneOtpResendCount ?? 0)) {
      return res.status(429).json({
        error: "Too many phone OTP requests. Please try again later.",
      });
    }

    const otp = generateOtp();
    const hash = await hashOtp(otp);
    const expiresAt = getOtpExpiry();

    user.phone = normalizedPhone;
    user.phoneOtpHash = hash;
    user.phoneOtpExpiresAt = expiresAt;
    user.phoneOtpAttempts = 0;
    user.phoneOtpResendCount = (user.phoneOtpResendCount || 0) + 1;

    logOtpSent(user, {
      channel: "phone",
      ip,
      userAgent,
      meta: { purpose: context || "signup_phone" },
    });

    await user.save();

    try {
      await sendOtpSms({
        phone: normalizedPhone,
        otp,
        ip,
        fingerprint: req.headers["x-device-fingerprint"],
        purpose: context || "signup",
      });
    } catch (smsErr) {
      console.error("sendOtpSms error:", smsErr);
      // We don't leak OTP, but we inform that SMS might be delayed
      return res.status(500).json({
        error: "Failed to send OTP SMS. Please try again later.",
      });
    }

    res.json({ ok: true, message: "OTP sent to your phone number." });
  } catch (err) {
    next(err);
  }
};

/**
 * STEP 5: Verify phone OTP
 * POST /api/auth/signup/phone/verify-otp
 */
export const verifyPhoneOtp = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { phone, otp } = req.body;
    const ip = getClientIp(req);
    const userAgent = req.headers["user-agent"];
    const normalizedPhone = normalizePhone(phone);

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.phone !== normalizedPhone) {
      return res.status(400).json({ error: "Phone number mismatch." });
    }

    if (!user.phoneOtpHash || !user.phoneOtpExpiresAt || isOtpExpired(user.phoneOtpExpiresAt)) {
      logOtpFailed(user, {
        channel: "phone",
        reason: "expired",
        ip,
        userAgent,
        meta: { purpose: "signup_phone" },
      });
      await user.save();
      return res.status(400).json({ error: "OTP expired, request a new one." });
    }

    if (isMaxAttemptsReached(user.phoneOtpAttempts ?? 0)) {
      return res.status(429).json({
        error: "Too many incorrect OTP attempts. Request a new OTP.",
      });
    }

    const valid = await verifyOtp(otp, user.phoneOtpHash);
    if (!valid) {
      user.phoneOtpAttempts = (user.phoneOtpAttempts || 0) + 1;
      bumpRiskScore(user, 2, { reason: "phone_otp_invalid" });
      logOtpFailed(user, {
        channel: "phone",
        reason: "invalid",
        ip,
        userAgent,
        meta: { purpose: "signup_phone" },
      });
      await user.save();
      return res.status(400).json({ error: "Invalid OTP" });
    }

    user.phoneVerified = true;
    user.phoneOtpHash = undefined;
    user.phoneOtpExpiresAt = undefined;
    user.phoneOtpAttempts = 0;
    user.phoneOtpResendCount = 0;

    logPhoneChange(user, { oldPhone: user.phone, newPhone: normalizedPhone, ip, userAgent });

    await user.save();

    res.json({ ok: true, message: "Phone number verified successfully." });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Login with 2FA (identifier + password → OTP → session)
// ---------------------------------------------------------------------------

/**
 * STEP 1: Check password, then send OTP to email or phone
 * POST /api/auth/login/request-otp
 */
export const loginRequestOtp = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    const ip = getClientIp(req);
    const userAgent = req.headers["user-agent"];
    const fingerprint = req.headers["x-device-fingerprint"];

    const isEmail = identifier.includes("@");
    const query = isEmail
      ? { email: normalizeEmail(identifier) }
      : { phone: normalizePhone(identifier), phoneVerified: true };

    const user = await User.findOne(query);
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (isAccountLocked(user)) {
      logAccountLocked(user, { reason: "locked_login", ip, userAgent });
      await user.save();
      return res.status(423).json({ error: "Account temporarily locked." });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      registerFailedLogin(user);
      logLoginFailed(user, { ip, userAgent });
      if (isAccountLocked(user)) {
        logAccountLocked(user, { reason: "too_many_failed_login", ip, userAgent });
      }
      await user.save();
      return res.status(401).json({ error: "Invalid credentials" });
    }

    clearFailedLogins(user);

    // suspicious login detection based on device/IP
    const suspicion = detectSuspiciousLogin(user, { ip, fingerprint });
    if (suspicion.suspicious) {
      addSecurityEvent(user, {
        type: "suspicious_login",
        ip,
        userAgent,
        meta: { signals: suspicion.signals, riskScore: suspicion.riskScore },
      });
    }

    // update device fingerprints
    if (fingerprint) {
      let existingDevice = (user.deviceFingerprints || []).find(
        (d) => d.fingerprint === fingerprint
      );
      if (!existingDevice) {
        user.deviceFingerprints = user.deviceFingerprints || [];
        user.deviceFingerprints.push({
          fingerprint,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
          trustLevel: "medium",
        });
      } else {
        existingDevice.lastSeenAt = new Date();
      }
    }

    // create login OTP
    const otp = generateOtp();
    const hash = await hashOtp(otp);
    const expiresAt = getOtpExpiry();

    user.loginOtpHash = hash;
    user.loginOtpChannel = isEmail ? "email" : "phone";
    user.loginOtpExpiresAt = expiresAt;
    user.loginOtpAttempts = 0;

    logOtpSent(user, {
      channel: user.loginOtpChannel,
      ip,
      userAgent,
      meta: { purpose: "login" },
    });

    await user.save();

    if (isEmail) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[DEV ONLY] Login email OTP for ${user.email}:`, otp);
      }
    } else {
      try {
        await sendOtpSms({
          phone: user.phone,
          otp,
          ip,
          fingerprint,
          purpose: "login",
        });
      } catch (errSms) {
        console.error("loginRequestOtp sendOtpSms error:", errSms);
        return res.status(500).json({ error: "Failed to send OTP SMS. Try again later." });
      }
    }

    res.json({
      ok: true,
      channel: user.loginOtpChannel,
      message: `OTP sent to your ${user.loginOtpChannel}.`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * STEP 2: Verify login OTP and issue session
 * POST /api/auth/login/verify-otp
 */
export const loginVerifyOtp = async (req, res, next) => {
  try {
    const { identifier, otp } = req.body;
    const ip = getClientIp(req);
    const userAgent = req.headers["user-agent"];
    const fingerprint = req.headers["x-device-fingerprint"];

    const isEmail = identifier.includes("@");
    const query = isEmail
      ? { email: normalizeEmail(identifier) }
      : { phone: normalizePhone(identifier), phoneVerified: true };

    const user = await User.findOne(query);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    if (isAccountLocked(user)) {
      logAccountLocked(user, { reason: "locked_login_verify", ip, userAgent });
      await user.save();
      return res.status(423).json({ error: "Account temporarily locked." });
    }

    if (!user.loginOtpHash || !user.loginOtpExpiresAt || isOtpExpired(user.loginOtpExpiresAt)) {
      logOtpFailed(user, {
        channel: user.loginOtpChannel || (isEmail ? "email" : "phone"),
        reason: "expired",
        ip,
        userAgent,
        meta: { purpose: "login" },
      });
      await user.save();
      return res.status(400).json({ error: "OTP expired, please login again." });
    }

    if (isMaxAttemptsReached(user.loginOtpAttempts ?? 0)) {
      return res.status(429).json({
        error: "Too many incorrect OTP attempts. Please login again.",
      });
    }

    const valid = await verifyOtp(otp, user.loginOtpHash);
    if (!valid) {
      user.loginOtpAttempts = (user.loginOtpAttempts || 0) + 1;
      bumpRiskScore(user, 2, { reason: "login_otp_invalid" });
      logOtpFailed(user, {
        channel: user.loginOtpChannel || (isEmail ? "email" : "phone"),
        reason: "invalid",
        ip,
        userAgent,
        meta: { purpose: "login" },
      });
      await user.save();
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // OTP is valid → clear OTP fields
    user.loginOtpHash = undefined;
    user.loginOtpExpiresAt = undefined;
    user.loginOtpAttempts = 0;

    user.lastLoginAt = new Date();
    user.lastLoginIp = ip;

    logLogin(user, { ip, userAgent, meta: { via: "otp_2fa" } });

    await user.save();

    const token = buildAuthToken(user);
    setAuthCookie(res, token, { remember: false });

    res.json({
      ok: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Password reset via email OTP (basic secure flow)
// ---------------------------------------------------------------------------

/**
 * POST /api/auth/password/request-reset
 */
export const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const ip = getClientIp(req);
    const userAgent = req.headers["user-agent"];

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Don't reveal user existence
      return res.json({ ok: true, message: "If this email exists, a reset OTP has been sent." });
    }

    // reuse email OTP fields for reset as well
    if (isMaxResendsReached(user.emailOtpResendCount ?? 0)) {
      return res.status(429).json({
        error: "Too many OTP requests. Please try again later.",
      });
    }

    const otp = generateOtp();
    const hash = await hashOtp(otp);
    const expiresAt = getOtpExpiry();

    user.emailOtpHash = hash;
    user.emailOtpExpiresAt = expiresAt;
    user.emailOtpResendCount = (user.emailOtpResendCount || 0) + 1;

    logOtpSent(user, {
      channel: "email",
      ip,
      userAgent,
      meta: { purpose: "password_reset" },
    });

    await user.save();

    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV ONLY] Password reset OTP for ${user.email}:`, otp);
    }

    res.json({ ok: true, message: "If this email exists, a reset OTP has been sent." });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/password/reset
 */
export const resetPasswordWithOtp = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const ip = getClientIp(req);
    const userAgent = req.headers["user-agent"];

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(400).json({ error: "Invalid email or OTP" });

    if (!user.emailOtpHash || !user.emailOtpExpiresAt || isOtpExpired(user.emailOtpExpiresAt)) {
      logOtpFailed(user, {
        channel: "email",
        reason: "expired",
        ip,
        userAgent,
        meta: { purpose: "password_reset" },
      });
      await user.save();
      return res.status(400).json({ error: "OTP expired, request a new one." });
    }

    const valid = await verifyOtp(otp, user.emailOtpHash);
    if (!valid) {
      logOtpFailed(user, {
        channel: "email",
        reason: "invalid",
        ip,
        userAgent,
        meta: { purpose: "password_reset" },
      });
      await user.save();
      return res.status(400).json({ error: "Invalid OTP" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordHash = passwordHash;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.emailOtpHash = undefined;
    user.emailOtpExpiresAt = undefined;
    user.emailOtpResendCount = 0;

    logPasswordReset(user, {
      ip,
      userAgent,
      meta: { flow: "password_reset_with_otp" },
    });

    await user.save();

    res.json({ ok: true, message: "Password reset successfully." });
  } catch (err) {
    next(err);
  }
};
