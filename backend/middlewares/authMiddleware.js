// middlewares/authMiddleware.js

import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

/**
 * Helper: Extracts the token from cookies or Authorization header.
 * Can support "Bearer ..." or direct token in cookie.
 */
function extractToken(req, cookieName = "token") {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.split(" ")[1];
  }
  return req.cookies?.[cookieName] || null;
}

/**
 * Middleware: Protects routes for authenticated users only.
 * - Loads user and attaches to req.user
 * - Returns 401 for any missing/invalid/expired token
 * - Logs all failures (swap for winston/sentry as needed)
 */
export const protect = async (req, res, next) => {
  try {
    const token = extractToken(req, "token");
    if (!token) {
      console.warn("[AUTH] No token found");
      return res.status(401).json({ error: "Not authenticated" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.warn("[AUTH] Token verify failed:", err.message);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const authUserId = decoded?.id || decoded?._id;
    if (!authUserId) {
      console.warn("[AUTH] Token missing user id");
      return res.status(401).json({ error: "Invalid token payload" });
    }

    const user = await User.findById(authUserId).select(
      "_id name email avatar avatarPublicId country phone skills projects slug bio professionalProfile createdAt updatedAt plan planStartedAt planExpiresAt isAdmin tokenVersion"
    );

    if (!user) {
      console.warn("[AUTH] User not found for token:", authUserId);
      return res.status(401).json({ error: "User not found" });
    }

    const tokenVersionFromJwt = Number(decoded?.tv ?? decoded?.tokenVersion ?? 0);
    const tokenVersionFromDb = Number(user.tokenVersion || 0);
    if (tokenVersionFromJwt !== tokenVersionFromDb) {
      console.warn(
        "[AUTH] Token version mismatch for user:",
        user._id,
        "jwt:",
        tokenVersionFromJwt,
        "db:",
        tokenVersionFromDb
      );
      return res.status(401).json({ error: "Session expired, please sign in again" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("[AUTH] Unknown protect error:", err.message);
    return res.status(401).json({ error: "Authentication error" });
  }
};

/**
 * Middleware: Requires user to have admin role.
 * - 403 for non-admins, 401 for missing user
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    console.warn("[ADMIN] No user found on request");
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (!req.user.isAdmin) {
    console.warn("[ADMIN] Access denied for non-admin:", req.user.email);
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

/**
 * Middleware: Protects routes for admin-only (admin panel JWT).
 * - Accepts token from Bearer or cookie ("admin_token")
 * - Verifies token with separate secret, role check
 */
export const adminProtect = (req, res, next) => {
  try {
    const token = extractToken(req, "admin_token");
    if (!token) {
      console.warn("[ADMIN][JWT] No admin token found");
      return res.status(401).json({ error: "Unauthorized" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    } catch (err) {
      console.warn("[ADMIN][JWT] Invalid or expired admin token:", err.message);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    if (decoded.role !== "admin") {
      console.warn("[ADMIN][JWT] Non-admin tried admin panel:", decoded);
      return res.status(403).json({ error: "Admin access required" });
    }

    req.admin = {
      role: "admin",
      email: decoded.email || process.env.ADMIN_EMAIL || "admin@local",
      name: decoded.name || "Admin",
      _id: decoded._id || decoded.id || null,
      avatar: decoded.avatar || "",
    };
    next();
  } catch (err) {
    console.error("[ADMIN][JWT] Middleware error:", err.message);
    return res.status(401).json({ error: "Admin authentication error" });
  }
};

/**
 * (Optional for future): Add support for magic link, SSO, or OAuth flows here.
 * You can also add "soft authentication" (if present, attach user; if not, continue as guest).
 */


// // Require that user is authenticated AND has verified email + phone
// export const requireVerifiedUser = (req, res, next) => {
//   try {
//     if (!req.user) {
//       return res.status(401).json({ error: "Not authenticated" });
//     }

//     if (!req.user.emailVerified) {
//       return res.status(403).json({ error: "Please verify your email to continue." });
//     }

//     if (!req.user.phoneVerified) {
//       return res.status(403).json({ error: "Please verify your phone number to continue." });
//     }

//     if (req.user.shadowBanned) {
//       return res.status(403).json({ error: "Account restricted. Contact support." });
//     }

//     next();
//   } catch (err) {
//     console.error("[AUTH] requireVerifiedUser error:", err.message);
//     return res.status(500).json({ error: "Authorization error" });
//   }
// };
