// middlewares/rateLimiter.js

import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import slowDown from "express-slow-down";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";

const redisClient = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : null;

function compositeKey(req) {
  const ip = ipKeyGenerator(req.ip); // IPv6-safe normalization for client IP
  const dfp = req.headers["x-device-fingerprint"] || "dfp_na";
  const uid = req.user?.id || req.user?._id || "anon";
  return `${ip}:${dfp}:${uid}`;
}

// (rest of your middleware exactly as before...)

export const strictLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: compositeKey,
  message: { error: "Too many requests. Please slow down and try again soon." },
  ...(redisClient && {
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: "rl:strict:",
    }),
  }),
});

// --- Application form limiter (task apply, etc.) ---
export const limitApplications = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10, // 10 submits / 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
  ...(redisClient && {
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: "rl:apply:",
    }),
  }),
});

// --- Per-endpoint custom limiter (plug into any route) ---
export const buildLimiter = (options = {}) =>
  rateLimit({
    windowMs: options.windowMs || 10 * 60 * 1000,
    max: options.max || 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator || compositeKey,
    message: options.message || { error: "Rate limit exceeded." },
    ...(redisClient && {
      store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
        prefix: options.prefix || "rl:custom:",
      }),
    }),
  });

// --- Optional: Slow-down middleware (anti-bot, after limiter) ---
export const authSlowDown = slowDown({
  windowMs: 10 * 60 * 1000, // 10 min
  delayAfter: 10, // allow 10 requests at full speed
  delayMs: (hits) => Math.min(2000, (hits - 10) * 150), // then add 150ms per hit, capped
  keyGenerator: compositeKey,
});

// --- Usage Examples ---
// router.post("/signin", strictLimiter, authSlowDown, signinHandler);
// router.post("/apply", limitApplications, applyHandler);
// router.post("/whatever", buildLimiter({ windowMs: 5*60*1000, max: 5 }), customHandler);

