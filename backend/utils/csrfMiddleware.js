import crypto from "crypto";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const EXEMPT_PREFIXES = [
  "/api/admin/login",
  "/api/auth/signin",
  "/api/auth/signup",
  "/api/auth/google",
  "/api/payment/webhook",
];

function normalizeSameSite(value, isProd) {
  const candidate = String(value || "").trim().toLowerCase();
  if (candidate === "strict" || candidate === "lax" || candidate === "none") return candidate;
  return isProd ? "strict" : "lax";
}

function cookieOptions(isProd) {
  const sameSite = normalizeSameSite(process.env.COOKIE_SAMESITE, isProd);
  return {
    sameSite,
    secure: sameSite === "none" ? true : isProd,
    path: "/",
  };
}

export function ensureCsrfCookie(req, res, next) {
  const existing = req.cookies?.csrfToken;
  if (existing && typeof existing === "string" && existing.length >= 32) {
    return next();
  }

  const isProd = process.env.NODE_ENV === "production";
  const csrfToken = crypto.randomBytes(32).toString("base64url");
  res.cookie("csrfToken", csrfToken, {
    httpOnly: false,
    ...cookieOptions(isProd),
    maxAge: 12 * 60 * 60 * 1000,
  });
  return next();
}

export function verifyDoubleSubmitCsrf(req, res, next) {
  if (!UNSAFE_METHODS.has(req.method)) return next();
  if (EXEMPT_PREFIXES.some((prefix) => req.path.startsWith(prefix))) return next();

  const headerToken = req.get("x-csrf-token") || req.get("X-CSRF-Token");
  const cookieToken = req.cookies?.csrfToken;

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return res.status(403).json({ error: "Missing or invalid CSRF token" });
  }
  return next();
}
