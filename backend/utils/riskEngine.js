// utils/riskEngine.js
// ------------------------------------------------------------
// Lightweight risk scoring + brute-force + lockout logic.
// This does NOT hit DB directly; controllers pass in a user doc.
// ------------------------------------------------------------

/**
 * Max failed login attempts before lock.
 */
const MAX_FAILED_LOGINS = 10;

/**
 * Risk weights (tweakable later).
 */
const RISK_WEIGHTS = {
  FAILED_LOGIN: 3,
  FAILED_OTP: 2,
  NEW_DEVICE: 5,
  NEW_COUNTRY: 7,
  SHADOW_BANNED_PREFIX: 20,
};

/**
 * Increment risk score with clamping between 0 and 100.
 */
export function bumpRiskScore(user, delta, meta = {}) {
  if (!user) return;

  const current = typeof user.riskScore === "number" ? user.riskScore : 0;
  const next = Math.max(0, Math.min(100, current + delta));

  user.riskScore = next;
  user.markModified?.("riskScore");

  // Optionally: attach lastRiskMeta if you want
  user.lastRiskMeta = meta;
  user.markModified?.("lastRiskMeta");
}

/**
 * Mark a failed login attempt and decide if account should be locked.
 */
export function registerFailedLogin(user) {
  if (!user) return;

  const now = new Date();
  user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
  user.lastFailedLoginAt = now;

  // bump risk
  bumpRiskScore(user, RISK_WEIGHTS.FAILED_LOGIN, {
    reason: "failed_login",
    at: now,
  });

  if (user.failedLoginAttempts >= MAX_FAILED_LOGINS) {
    // lock account for 30 minutes
    const lockUntil = new Date();
    lockUntil.setMinutes(lockUntil.getMinutes() + 30);
    user.accountLockedUntil = lockUntil;
  }

  user.markModified?.("failedLoginAttempts");
  user.markModified?.("accountLockedUntil");
}

/**
 * Reset failed login counters on successful login.
 */
export function clearFailedLogins(user) {
  if (!user) return;

  user.failedLoginAttempts = 0;
  user.lastFailedLoginAt = undefined;
  user.accountLockedUntil = undefined;
  user.markModified?.("failedLoginAttempts");
  user.markModified?.("accountLockedUntil");
}

/**
 * True if account is currently locked.
 */
export function isAccountLocked(user) {
  if (!user || !user.accountLockedUntil) return false;
  return new Date() < new Date(user.accountLockedUntil);
}

/**
 * Very light suspicious login detection, expand later as needed.
 * Returns a simple object so controllers can react (e.g., require extra OTP).
 */
export function detectSuspiciousLogin(user, { ip, fingerprint, countryCode } = {}) {
  const signals = [];

  if (user.shadowBanned) {
    signals.push("shadow_banned");
  }

  // new device?
  if (fingerprint) {
    const seen = (user.deviceFingerprints || []).find(
      (d) => d.fingerprint === fingerprint
    );
    if (!seen) {
      signals.push("new_device");
      bumpRiskScore(user, RISK_WEIGHTS.NEW_DEVICE, {
        reason: "new_device",
        fingerprint,
      });
    }
  }

  // TODO: if you store lastCountry, compare here
  if (countryCode && user.country && user.country !== countryCode) {
    signals.push("new_country");
    bumpRiskScore(user, RISK_WEIGHTS.NEW_COUNTRY, {
      reason: "new_country",
      from: user.country,
      to: countryCode,
    });
  }

  return {
    suspicious: signals.length > 0,
    signals,
    riskScore: user.riskScore,
  };
}
