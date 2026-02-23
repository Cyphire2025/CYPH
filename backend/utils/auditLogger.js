// utils/auditLogger.js
// ------------------------------------------------------------
// Centralized audit + security event logging for User accounts.
// No direct HTTP/DB logic here. Controllers will call these helpers.
// ------------------------------------------------------------

/**
 * Pushes an audit log entry into user.auditLogs (in-memory).
 * Controller must call `await user.save()` afterwards.
 *
 * @param {import("../models/userModel.js").default} user - Mongoose user document
 * @param {{
 *   type: string,
 *   oldValue?: string | null,
 *   newValue?: string | null,
 *   ip?: string | null,
 *   userAgent?: string | null,
 *   meta?: Record<string, any>
 * }} payload
 */
export function addAuditLog(user, payload) {
  if (!user) return;

  const entry = {
    type: payload.type,
    oldValue: payload.oldValue ?? undefined,
    newValue: payload.newValue ?? undefined,
    ip: payload.ip ?? undefined,
    userAgent: payload.userAgent ?? undefined,
    meta: payload.meta ?? undefined,
    createdAt: new Date(),
  };

  user.auditLogs = user.auditLogs || [];
  user.auditLogs.push(entry);

  // keep only the latest 100 logs to avoid unbounded growth
  if (user.auditLogs.length > 100) {
    user.auditLogs = user.auditLogs.slice(-100);
  }

  user.markModified?.("auditLogs");
}

/**
 * Pushes a lightweight security event to user.securityEvents.
 * These are used for quick checks, dashboards, or anomaly detection.
 *
 * @param {import("../models/userModel.js").default} user
 * @param {{
 *   type: string,
 *   ip?: string | null,
 *   userAgent?: string | null,
 *   meta?: Record<string, any>
 * }} payload
 */
export function addSecurityEvent(user, payload) {
  if (!user) return;

  const entry = {
    type: payload.type,
    ip: payload.ip ?? undefined,
    userAgent: payload.userAgent ?? undefined,
    meta: payload.meta ?? undefined,
    createdAt: new Date(),
  };

  user.securityEvents = user.securityEvents || [];
  user.securityEvents.push(entry);

  // keep only the latest 200 events
  if (user.securityEvents.length > 200) {
    user.securityEvents = user.securityEvents.slice(-200);
  }

  user.markModified?.("securityEvents");
}

/**
 * Convenience helpers for common audit types.
 * These will be used in auth controllers later.
 */

export function logEmailChange(user, { oldEmail, newEmail, ip, userAgent }) {
  addAuditLog(user, {
    type: "email_change",
    oldValue: oldEmail,
    newValue: newEmail,
    ip,
    userAgent,
  });
}

export function logPhoneChange(user, { oldPhone, newPhone, ip, userAgent }) {
  addAuditLog(user, {
    type: "phone_change",
    oldValue: oldPhone,
    newValue: newPhone,
    ip,
    userAgent,
  });
}

export function logPasswordReset(user, { ip, userAgent, meta } = {}) {
  addAuditLog(user, {
    type: "password_reset",
    ip,
    userAgent,
    meta,
  });
}

export function logLogin(user, { ip, userAgent, meta } = {}) {
  addAuditLog(user, {
    type: "login",
    ip,
    userAgent,
    meta,
  });
  addSecurityEvent(user, {
    type: "login",
    ip,
    userAgent,
    meta,
  });
}

export function logLoginFailed(user, { ip, userAgent, meta } = {}) {
  addAuditLog(user, {
    type: "login_failed",
    ip,
    userAgent,
    meta,
  });
  addSecurityEvent(user, {
    type: "login_failed",
    ip,
    userAgent,
    meta,
  });
}

export function logOtpSent(user, { channel, ip, userAgent, meta } = {}) {
  addAuditLog(user, {
    type: "otp_sent",
    ip,
    userAgent,
    meta: { channel, ...meta },
  });
  addSecurityEvent(user, {
    type: "otp_sent",
    ip,
    userAgent,
    meta: { channel, ...meta },
  });
}

export function logOtpFailed(user, { channel, reason, ip, userAgent, meta } = {}) {
  addAuditLog(user, {
    type: "otp_failed",
    ip,
    userAgent,
    meta: { channel, reason, ...meta },
  });
  addSecurityEvent(user, {
    type: "otp_failed",
    ip,
    userAgent,
    meta: { channel, reason, ...meta },
  });
}

export function logAccountLocked(user, { reason, ip, userAgent, meta } = {}) {
  addAuditLog(user, {
    type: "account_locked",
    ip,
    userAgent,
    meta: { reason, ...meta },
  });
  addSecurityEvent(user, {
    type: "account_locked",
    ip,
    userAgent,
    meta: { reason, ...meta },
  });
}

export function logAccountUnlocked(user, { ip, userAgent, meta } = {}) {
  addAuditLog(user, {
    type: "account_unlocked",
    ip,
    userAgent,
    meta,
  });
  addSecurityEvent(user, {
    type: "account_unlocked",
    ip,
    userAgent,
    meta,
  });
}
