// utils/otpService.js
import axios from "axios";

// --------------- Config & Guards -----------------

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_FROM_NUMBER,
  MSG91_AUTH_KEY,
  MSG91_SENDER_ID,      // e.g. "CYPHRE"
  MSG91_TEMPLATE_ID,    // if you're using DLT templates in India
} = process.env;

if (!MSG91_AUTH_KEY) {
  console.warn("[OTP] MSG91_AUTH_KEY not set – Indian SMS will fail until configured.");
}
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
  console.warn("[OTP] Twilio env vars not set – global SMS will fail until configured.");
}

// --------------- Region detection -----------------

/**
 * Very simple region resolver:
 * - If phone starts with +91 or is 10 digits → treat as India (MSG91)
 * - Else → treat as Global (Twilio)
 */
function resolveRegion(phoneRaw = "") {
  const phone = String(phoneRaw).trim();
  if (!phone) return "unknown";

  if (phone.startsWith("+91")) return "india";
  // naive 10-digit India mobile
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return "india";

  return "global";
}

// --------------- In-memory rate limiting (per node) -----------------

/**
 * For production multi-instance, move this to Redis.
 * For now: Map keyed by "<type>:<key>" with timestamps.
 */

const buckets = new Map();

/**
 * Check + update rate-limit bucket.
 * @param {"sms"|"otp"} type 
 * @param {string} key  e.g. phone, ip, device fingerprint
 * @param {number} limit how many events allowed in `windowMs`
 * @param {number} windowMs window in ms
 * @returns {boolean} true if allowed, false if blocked
 */
export function checkAndUpdateRateLimit(type, key, limit, windowMs) {
  if (!key) return true; // don't block if we can't key it

  const bucketKey = `${type}:${key}`;
  const now = Date.now();

  let arr = buckets.get(bucketKey) || [];
  // drop old events
  arr = arr.filter((ts) => now - ts < windowMs);

  if (arr.length >= limit) {
    return false; // blocked
  }

  arr.push(now);
  buckets.set(bucketKey, arr);
  return true;
}

// --------------- Provider clients -----------------

async function sendViaTwilio({ to, body }) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    throw new Error("Twilio not configured");
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

  const params = new URLSearchParams({
    To: to,
    From: TWILIO_FROM_NUMBER,
    Body: body,
  });

  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");

  const res = await axios.post(url, params.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    timeout: 7000,
  });

  return {
    provider: "twilio",
    sid: res.data.sid,
    status: res.data.status,
  };
}

async function sendViaMsg91({ to, otp, message }) {
  if (!MSG91_AUTH_KEY) {
    throw new Error("MSG91 not configured");
  }

  // MSG91 supports multiple APIs; this is a generic JSON call variant.
  // Adjust URL/params for your MSG91 account type/template.
  const url = "https://api.msg91.com/api/v5/flow/";

  const payload = {
    template_id: MSG91_TEMPLATE_ID, // optional if you use dynamic template
    sender: MSG91_SENDER_ID,
    short_url: "1",
    recipients: [
      {
        mobiles: normaliseIndiaNumber(to),
        OTP: otp,
        otp: otp,        // keep both keys for template flexibility
        message: message || `Your Cyphire verification code is ${otp}`,
      },
    ],
  };

  const res = await axios.post(url, payload, {
    headers: {
      "Content-Type": "application/json",
      authkey: MSG91_AUTH_KEY,
    },
    timeout: 7000,
  });

  return {
    provider: "msg91",
    requestId: res.data?.requestId || res.data?.request_id || null,
    success: res.data?.type === "success" || res.data?.success === true,
  };
}

function normaliseIndiaNumber(phoneRaw) {
  const digits = String(phoneRaw).replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 11) return `91${digits.slice(1)}`;
  return digits;
}

// --------------- Public API -----------------

/**
 * Main entrypoint to send OTP SMS.
 * Handles:
 * - Region choice (India → MSG91, global → Twilio)
 * - Basic rate limiting (per phone + per IP + per device)
 *
 * @param {object} opts
 * @param {string} opts.phone
 * @param {string} opts.otp        6-digit OTP (already generated & hashed elsewhere)
 * @param {string} [opts.ip]       client IP
 * @param {string} [opts.fingerprint] device fingerprint header from frontend
 * @param {string} [opts.purpose]  e.g. "signup", "login", "reset"
 */
export async function sendOtpSms({ phone, otp, ip, fingerprint, purpose = "generic" }) {
  const region = resolveRegion(phone);

  // --- Basic abuse protection ---
  const phoneKey = `${phone}:${purpose}`;
  const ipKey = ip ? `${ip}:${purpose}` : null;
  const fpKey = fingerprint ? `${fingerprint}:${purpose}` : null;

  // Example policy:
  // - Max 3 OTP SMS / 15min per phone
  // - Max 10 OTP SMS / 15min per IP
  // - Max 5 OTP SMS / 15min per device fingerprint

  const WINDOW = 15 * 60 * 1000;

  if (!checkAndUpdateRateLimit("otp_phone", phoneKey, 3, WINDOW)) {
    const err = new Error("Too many OTP requests for this phone. Please try again later.");
    err.code = "OTP_PHONE_RATE_LIMIT";
    throw err;
  }
  if (ipKey && !checkAndUpdateRateLimit("otp_ip", ipKey, 10, WINDOW)) {
    const err = new Error("Too many OTP requests from this IP. Please try again later.");
    err.code = "OTP_IP_RATE_LIMIT";
    throw err;
  }
  if (fpKey && !checkAndUpdateRateLimit("otp_fp", fpKey, 5, WINDOW)) {
    const err = new Error("Too many OTP requests from this device. Please try again later.");
    err.code = "OTP_FP_RATE_LIMIT";
    throw err;
  }

  const message = `Your Cyphire ${purpose} code is ${otp}. It expires in 5 minutes. Do not share this code with anyone.`;

  // --- Provider selection with fallback ---
  const meta = { region, phone };
  try {
    if (region === "india") {
      return {
        ...(await sendViaMsg91({ to: phone, otp, message })),
        ...meta,
      };
    }

    // default: global via Twilio
    return {
      ...(await sendViaTwilio({ to: phone, body: message })),
      ...meta,
    };
  } catch (primaryErr) {
    console.error("[OTP] Primary provider failed:", primaryErr.message, meta);

    // Fallback: if India/MSG91 fails, try Twilio; if global/Twilio fails, we can try MSG91 only for E.164-compatible numbers
    try {
      if (region === "india") {
        const fallback = await sendViaTwilio({ to: phone, body: message });
        return { ...fallback, ...meta, fallbackFrom: "msg91" };
      } else if (MSG91_AUTH_KEY) {
        const fallback = await sendViaMsg91({ to: phone, otp, message });
        return { ...fallback, ...meta, fallbackFrom: "twilio" };
      }
    } catch (fallbackErr) {
      console.error("[OTP] Fallback provider also failed:", fallbackErr.message, meta);
    }

    const err = new Error("Failed to send OTP. Please try again in a few minutes.");
    err.code = "OTP_DELIVERY_FAILED";
    throw err;
  }
}
