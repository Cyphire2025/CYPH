// // utils/csrfMiddleware.js

// // Unsafe HTTP methods we protect
// const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// // Exempt endpoints that must work before a CSRF cookie exists
// // (auth bootstraps, OAuth callbacks, payment webhooks, health/metrics)
// const EXEMPT_PREFIXES = [
//   "/api/auth/signin",
//   "/api/auth/signup",
//   "/api/auth/google/callback",
//   "/api/payment/webhook",   // ok if not present; harmless exemption
//   "/metrics",
// ];

// // Exact paths you want to allow as-is
// const EXEMPT_EXACT = new Set([
//   "/", // health
// ]);

// export function verifyDoubleSubmitCsrf(req, res, next) {
//   if (!UNSAFE.has(req.method)) return next();

//   if (EXEMPT_EXACT.has(req.path)) return next();
//   for (const p of EXEMPT_PREFIXES) {
//     if (req.path.startsWith(p)) return next();
//   }

//   const headerToken = req.get("X-CSRF-Token") || req.get("x-csrf-token");
//   const cookieToken = req.cookies?.csrfToken;

//   if (!headerToken || !cookieToken) {
//     return res.status(403).json({ error: "Missing CSRF token" });
//   }
//   if (headerToken !== cookieToken) {
//     return res.status(403).json({ error: "Invalid CSRF token" });
//   }
//   return next();
// }

// utils/csrfMiddleware.js

// utils/csrfMiddleware.js

import crypto from "crypto";

/**
 * Issue/refresh a CSRF cookie for the API origin.
 * We use a non-HttpOnly cookie so the SPA can read it via /csrf-token,
 * while still requiring a matching header (double-submit).
 */
export function ensureCsrfCookie(req, res, next) {
  const name = "csrfToken";
  const existing = req.cookies?.[name];

  // If no cookie exists, create one
  if (!existing) {
    const token = crypto.randomBytes(32).toString("base64url");
    const isProd = process.env.NODE_ENV === "production";

    res.cookie(name, token, {
      httpOnly: false,                 // SPA needs to read it (via endpoint)
      sameSite: isProd ? "none" : "lax",
      secure: isProd,                  // status depends on ENV
      path: "/",
      maxAge: 1000 * 60 * 60 * 12,     // 12h
    });
  }
  next();
}

/**
 * Verify double-submit: header must exactly match cookie
 * for state-changing methods.
 */
export function verifyDoubleSubmitCsrf(req, res, next) {
  const unsafe = ["POST", "PUT", "PATCH", "DELETE"];
  if (!unsafe.includes(req.method)) return next();

  // Exemptions
  const exemptPrefixes = [
    "/api/admin/login",
    "/api/auth/login",
    "/api/auth/signup",
    "/api/auth/google",
    "/api/payment/webhook"
  ];

  if (exemptPrefixes.some(prefix => req.path.startsWith(prefix))) {
    return next();
  }

  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.get("X-CSRF-Token") || req.get("x-csrf-token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    console.warn(`[CSRF] Blocked ${req.method} ${req.path} - Cookie: ${cookieToken ? 'Yes' : 'No'}, Header: ${headerToken ? 'Yes' : 'No'}`);
    return res.status(403).json({ message: "Missing or invalid CSRF token" });
  }
  next();
}
