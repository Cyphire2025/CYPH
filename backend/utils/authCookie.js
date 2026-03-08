// utils/authCookie.js
import crypto from "crypto";

function normalizeSameSite(value, isProd) {
  const candidate = String(value || "").trim().toLowerCase();
  if (candidate === "strict" || candidate === "lax" || candidate === "none") return candidate;
  return isProd ? "strict" : "lax";
}

function resolveCookieOptions(isProd) {
  const sameSite = normalizeSameSite(process.env.COOKIE_SAMESITE, isProd);
  return {
    sameSite,
    secure: sameSite === "none" ? true : isProd,
  };
}

/**
 * setAuthCookie(res, token, { remember = false })
 * - Sets httpOnly 'token' + JS-readable 'csrfToken' (double-submit).
 * - Returns csrfToken (optional to expose).
 */
export function setAuthCookie(res, token, { remember = false } = {}) {
  const isProd = process.env.NODE_ENV === "production";
  const { sameSite, secure } = resolveCookieOptions(isProd);

  const maxAge = remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // ms
  if (typeof token !== "string") throw new Error("setAuthCookie: token must be a string");

  // Auth cookie (httpOnly)
  res.cookie("token", token, {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    maxAge,
  });

  // CSRF cookie (readable by JS)
  const csrfToken = crypto.randomBytes(20).toString("hex");
  const csrfMaxAge = 2 * 60 * 60 * 1000; // 2h

  res.cookie("csrfToken", csrfToken, {
    httpOnly: false,
    secure,
    sameSite,
    path: "/",
    maxAge: csrfMaxAge,
  });

  return csrfToken;
}

/** Clears both cookies */
export function clearAuthCookie(res) {
  const isProd = process.env.NODE_ENV === "production";
  const { sameSite, secure } = resolveCookieOptions(isProd);

  res.clearCookie("token", { httpOnly: true, secure, sameSite, path: "/" });
  res.clearCookie("csrfToken", { httpOnly: false, secure, sameSite, path: "/" });
}

/** Prefer Authorization Bearer; fallback to cookie */
export function extractBearerToken(req) {
  const auth = (req.get && req.get("Authorization")) || req.headers?.authorization || "";
  if (typeof auth === "string" && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  if (req.cookies && req.cookies.token) return req.cookies.token;
  return null;
}
