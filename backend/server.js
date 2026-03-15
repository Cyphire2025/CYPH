// server.js
// Cyphire API – hardened for Vercel (frontend) → Render (backend) with CSRF, CORS, CSP, sockets.
// Paste this whole file. No TODOs, no placeholders.

import dotenv from "dotenv";
dotenv.config(); // must be first

import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import compression from "compression";
import passport from "passport";
import { Server } from "socket.io";

// metrics & logging (optional but kept production-friendly)
import client from "prom-client";
import pino from "pino";
import pinoHttp from "pino-http";
import { v4 as uuidv4 } from "uuid";

// DB + auth + models
import { connectDB } from "./config/mongodb.js";
import "./config/passport.js";
import { verifyJwt } from "./utils/jwt.js";
import Task from "./models/taskModel.js";
import User from "./models/userModel.js";

// CSRF middleware from your utils (double-submit validator)
import { ensureCsrfCookie, verifyDoubleSubmitCsrf } from "./utils/csrfMiddleware.js";

// Routes (keep all existing)
import authRoutes from "./routes/authRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import usersRoutes from "./routes/usersRoutes.js";
import intellectualsRoutes from "./routes/intellectualsRoutes.js";
import helpRoutes from "./routes/helpRoutes.js";
import helpQuestionRoutes from "./routes/helpQuestionRoutes.js";
import workroomRoutes from "./routes/workroomRoutes.js";
import workroomMessageRoutes from "./routes/workroomMessageRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import paymentLogRoutes from "./routes/paymentLogRoutes.js";

// ───────────────────────────────────────────────────────────────────────────────
// App & HTTP server
// ───────────────────────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const IS_PROD = process.env.NODE_ENV === "production";

app.set("trust proxy", 1); // required behind Render/Cloudflare
app.disable("x-powered-by");
app.set("etag", false);

// ───────────────────────────────────────────────────────────────────────────────
// Structured logging (pino) + HTTP trace IDs
// ───────────────────────────────────────────────────────────────────────────────
const logger = pino({
  level: process.env.LOG_LEVEL || (IS_PROD ? "info" : "debug"),
  transport: IS_PROD ? undefined : { target: "pino-pretty", options: { colorize: true } },
});
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.headers["x-request-id"]?.toString() || uuidv4(),
  })
);

// ───────────────────────────────────────────────────────────────────────────────
// Prometheus basic metrics
// ───────────────────────────────────────────────────────────────────────────────
client.collectDefaultMetrics();
const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_ms",
  help: "Duration of HTTP requests in ms",
  labelNames: ["method", "route", "status_code"],
  buckets: [50, 100, 200, 400, 800, 1600, 3200],
});
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const route = req.route?.path || req.path || "unknown";
    httpRequestDuration.labels(req.method, route, String(res.statusCode)).observe(Date.now() - start);
  });
  next();
});

// ───────────────────────────────────────────────────────────────────────────────
// Security headers (Helmet) + CSP tuned for your stack
// ───────────────────────────────────────────────────────────────────────────────
app.use(
  helmet({
    frameguard: { action: "deny" },
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true,
    },
    permissionsPolicy: {
      features: {
        geolocation: [],
        camera: [],
        microphone: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "same-origin" },
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'"],
        "style-src": ["'self'"],
        "img-src": ["'self'", "data:", "https://res.cloudinary.com", "https://ui-avatars.com"],
        "connect-src": ["'self'"],
        "base-uri": ["'self'"],
        "form-action": ["'self'"],
        "object-src": ["'none'"],
        "frame-ancestors": ["'none'"],
      },
    },
  })
);

// ───────────────────────────────────────────────────────────────────────────────
// Core middleware
// ───────────────────────────────────────────────────────────────────────────────
app.use(compression());
app.use(morgan(IS_PROD ? "combined" : "dev"));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use(cookieParser());
app.use(passport.initialize());
app.use(
  "/uploads",
  express.static("uploads", {
    etag: false,
    lastModified: false,
    cacheControl: false,
  })
);

// ───────────────────────────────────────────────────────────────────────────────
// CORS for Vercel (prod + previews) and local dev
// ───────────────────────────────────────────────────────────────────────────────
const parseOriginList = (value = "") =>
  String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((origin) => origin.replace(/\/+$/, ""));

const DEFAULT_PROD_ORIGINS = [
  "https://cyphire.in",
  "https://www.cyphire.in",
  "https://workroom.cyphire.in",
  "https://admin.cyphire.in",
  "https://cyphire.vercel.app",
  "https://cyphirechat.vercel.app",
];

const PROD_ORIGINS = [
  ...parseOriginList(process.env.CORS_ALLOWED_ORIGINS),
  ...parseOriginList(process.env.FRONTEND_URL),
  ...parseOriginList(process.env.ADMIN_FRONTEND_URL),
  ...parseOriginList(process.env.WORKROOM_FRONTEND_URL),
  ...DEFAULT_PROD_ORIGINS,
];

const DEV_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
];

const ALLOWED_ORIGINS = new Set([...PROD_ORIGINS, ...DEV_ORIGINS]);

const isAllowedCorsOrigin = (origin) => {
  if (!origin) return true;
  return ALLOWED_ORIGINS.has(String(origin).replace(/\/+$/, ""));
};

app.use((_, res, next) => {
  // better cache behavior with varying origins
  res.header("Vary", "Origin");
  next();
});

const corsOptions = {
  origin(origin, cb) {
    if (isAllowedCorsOrigin(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-CSRF-Token",
    "X-Requested-With",
    "Cache-Control",
    "Pragma",
    "If-Modified-Since",
    "If-None-Match",
    "X-Device-Fingerprint",
  ],
  maxAge: 600,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

if (IS_PROD && process.env.FORCE_HTTPS === "1") {
  app.use((req, res, next) => {
    if (req.secure) return next();
    const host = req.headers.host;
    if (!host) return res.status(400).send("Bad Request");
    return res.redirect(308, `https://${host}${req.originalUrl || req.url}`);
  });
}

// ───────────────────────────────────────────────────────────────────────────────
/**
 * CSRF: issue readable cookie early (SameSite=None; Secure in prod),
 * provide `/csrf-token` for the SPA to fetch, then verify on unsafe methods.
 * This matches your double-submit strategy and works cross-site (Vercel → Render).
 */
// ───────────────────────────────────────────────────────────────────────────────
app.use(ensureCsrfCookie);

app.use((req, res, next) => {
  if (req.path === "/csrf-token" || req.path.startsWith("/api/")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Surrogate-Control", "no-store");
  }
  next();
});

// 2) SPA reads the token here (your frontend helper should call this)
app.get("/csrf-token", (req, res) => {
  res.json({ csrfToken: req.cookies?.csrfToken || null });
});

// 3) verify header vs cookie on unsafe methods
app.use(verifyDoubleSubmitCsrf);

// ───────────────────────────────────────────────────────────────────────────────
// Health & metrics
// ───────────────────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => res.send("Cyphire API up"));
app.get("/readyz", (_req, res) => res.send("ready"));
app.get("/metrics", async (req, res) => {
  if (IS_PROD && process.env.ENABLE_PUBLIC_METRICS !== "1") {
    return res.status(404).send("Not found");
  }
  const metricsToken = process.env.METRICS_TOKEN;
  if (metricsToken && req.get("x-metrics-token") !== metricsToken) {
    return res.status(401).send("Unauthorized");
  }
  res.set("Content-Type", client.register.contentType);
  return res.end(await client.register.metrics());
});

// ───────────────────────────────────────────────────────────────────────────────
// REST routes
// ───────────────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/intellectuals", intellectualsRoutes);
app.use("/api/workrooms", workroomRoutes);
app.use("/api/workrooms", workroomMessageRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api", paymentLogRoutes);
app.use("/api/help", helpRoutes);
app.use("/api/help/questions", helpQuestionRoutes);

// ───────────────────────────────────────────────────────────────────────────────
// Socket.IO (JWT auth; restrict rooms to task owner/assignee/admin)
// ───────────────────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (isAllowedCorsOrigin(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  },
});

const parseCookieHeader = (cookieHeader = "") => {
  if (!cookieHeader || typeof cookieHeader !== "string") return {};
  return cookieHeader.split(";").reduce((acc, segment) => {
    const trimmed = segment.trim();
    if (!trimmed) return acc;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) return acc;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key) {
      try {
        acc[key] = decodeURIComponent(value);
      } catch {
        acc[key] = value;
      }
    }
    return acc;
  }, {});
};

const getSocketToken = (socket) => {
  const authToken = socket.handshake.auth?.token;
  if (authToken) return authToken;

  const authHeader = socket.handshake.headers?.authorization || "";
  if (typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  const cookies = parseCookieHeader(socket.handshake.headers?.cookie || "");
  return cookies.token || "";
};

const assertSocketCanAccessWorkroom = async (workroomId, socketUser) => {
  const task = await Task.findOne({ workroomId }).select("createdBy selectedApplicant");
  if (!task) return { ok: false, code: "not_found" };

  const uid = socketUser?._id;
  const allowed =
    !!uid &&
    (String(task.createdBy) === uid ||
      String(task.selectedApplicant || "") === uid ||
      socketUser?.isAdmin);

  if (!allowed) return { ok: false, code: "forbidden" };
  return { ok: true };
};

io.use(async (socket, next) => {
  try {
    const raw = getSocketToken(socket);
    if (!raw) return next(new Error("Unauthorized"));
    const payload = verifyJwt(raw);
    const authUserId = String(payload?._id || payload?.id || "");
    if (!authUserId) return next(new Error("Unauthorized"));

    const user = await User.findById(authUserId).select("_id isAdmin tokenVersion name");
    if (!user) return next(new Error("Unauthorized"));

    const tokenVersionFromJwt = Number(payload?.tv ?? payload?.tokenVersion ?? 0);
    const tokenVersionFromDb = Number(user.tokenVersion || 0);
    if (tokenVersionFromJwt !== tokenVersionFromDb) {
      return next(new Error("Unauthorized"));
    }

    socket.user = { _id: String(user._id), isAdmin: !!user.isAdmin, name: user.name || "User" };
    return next();
  } catch (err) {
    return next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  logger.info(`socket connected ${socket.id}`);

  socket.on("workroom:join", async ({ workroomId }) => {
    try {
      const access = await assertSocketCanAccessWorkroom(workroomId, socket.user);
      if (!access.ok) {
        return socket.emit("error", access.code === "not_found" ? "Workroom not found" : "Forbidden");
      }
      socket.join(`workroom:${workroomId}`);
      socket.emit("joined", { ok: true });
    } catch {
      socket.emit("error", "Join failed");
    }
  });

  socket.on("message:new", async ({ workroomId, text, attachments = [] }, ack) => {
    try {
      const access = await assertSocketCanAccessWorkroom(workroomId, socket.user);
      if (!access.ok) {
        return ack?.({
          ok: false,
          error: access.code === "not_found" ? "Workroom not found" : "Forbidden",
        });
      }
      const uid = socket.user?._id;
      io.to(`workroom:${workroomId}`).emit("message:new", {
        workroomId,
        text,
        attachments,
        sender: { _id: uid, name: socket.user?.name || "User" },
        senderId: uid,
        createdAt: new Date().toISOString(),
      });
      ack?.({ ok: true });
    } catch {
      ack?.({ ok: false, error: "Failed" });
    }
  });

  socket.on("typing", async ({ workroomId }) => {
    try {
      const access = await assertSocketCanAccessWorkroom(workroomId, socket.user);
      if (!access.ok) return;
      socket.to(`workroom:${workroomId}`).emit("typing", {
        workroomId,
        userId: socket.user?._id,
        senderName: socket.user?.name || "Collaborator",
      });
    } catch {
      // no-op
    }
  });

  socket.on("typing:stop", async ({ workroomId }) => {
    try {
      const access = await assertSocketCanAccessWorkroom(workroomId, socket.user);
      if (!access.ok) return;
      socket.to(`workroom:${workroomId}`).emit("typing:stop", {
        workroomId,
        userId: socket.user?._id,
      });
    } catch {
      // no-op
    }
  });

  socket.on("message:react", async ({ workroomId, messageId, reaction }) => {
    try {
      const access = await assertSocketCanAccessWorkroom(workroomId, socket.user);
      if (!access.ok) return;
      io.to(`workroom:${workroomId}`).emit("message:reaction", {
        workroomId,
        messageId,
        reaction: reaction || null,
        senderId: socket.user?._id,
        senderName: socket.user?.name || "User",
      });
    } catch {
      // no-op
    }
  });

  socket.on("disconnect", () => logger.info(`socket disconnected ${socket.id}`));
});

app.set("io", io);
// ───────────────────────────────────────────────────────────────────────────────
// Global error handler
// ───────────────────────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  req.log?.error?.(err);
  logger.error({ err, url: req.originalUrl }, "GLOBAL ERROR");
  const status = Number(err?.status || 500);
  const safeMessage = IS_PROD && status >= 500 ? "Internal Server Error" : err?.message || "Request failed";
  res.status(status).json({
    error: safeMessage,
    stack: IS_PROD ? undefined : err?.stack,
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// Start
// ───────────────────────────────────────────────────────────────────────────────
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      logger.info(`✅ API & Sockets listening on :${PORT}`);
    });
  })
  .catch((err) => {
    logger.error({ err }, "Mongo connection failed");
    process.exit(1);
  });

// graceful shutdown
["SIGINT", "SIGTERM"].forEach((sig) =>
  process.on(sig, () => {
    logger.info(`↪ shutting down on ${sig}`);
    server.close(() => {
      try {
        const mongoose = require("mongoose");
        if (mongoose?.connection?.close) {
          mongoose.connection.close(false, () => logger.info("MongoDB closed"));
        }
      } catch { }
      process.exit(0);
    });
  })
);
