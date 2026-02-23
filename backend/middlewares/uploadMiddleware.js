// middlewares/uploadMiddleware.js

import multer from "multer";

// --- File size limits (in bytes): 50MB per file, 200MB total ---
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file
const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 200MB total per request

// --- Allowed MIME types/extensions (enterprise-safe) ---
const allowedTypes = [
  /^image\//,                                  // All images
  /^video\//,                                  // All videos
  /^application\/pdf$/,                        // PDFs
  /^application\/msword$/,                     // .doc
  /^application\/vnd\.openxmlformats-officedocument/, // .docx, .pptx, .xlsx
  /^text\/plain$/,                             // .txt
];

// --- Helper: Audit log for uploads (can plug into winston/sentry etc) ---
const logger = {
  info: (...args) => console.log("[UPLOAD]", ...args),
  warn: (...args) => console.warn("[UPLOAD][WARN]", ...args),
  error: (...args) => console.error("[UPLOAD][ERROR]", ...args),
};

/**
 * Advanced file filter for multer
 * - Enforces allowed mime types
 * - Enforces max size
 * - Optionally: could check for viruses (plug into ClamAV or similar)
 */
const fileFilter = (req, file, cb) => {
  const { mimetype, originalname, size } = file;

  // Type check
  const typeAllowed = allowedTypes.some((regex) => regex.test(mimetype));
  if (!typeAllowed) {
    logger.warn("Rejected file upload: type", mimetype, "name", originalname);
    return cb(new Error("Invalid file type"), false);
  }

  // Size check (single file)
  if (typeof file.size === "number" && file.size > MAX_FILE_SIZE) {
    logger.warn("Rejected file upload: size", file.size, "name", originalname);
    return cb(new Error("File too large (max 50MB each)"), false);
  }

  // Optionally: could add ClamAV/virus scan here (for prod scale)
  cb(null, true);
};

// --- Storage: In-memory (safe for cloud uploads/stream to S3/Cloudinary) ---
const storage = multer.memoryStorage();

/**  
 * Advanced middleware: also enforces total request size (sum of all files)
 * NOTE: multer only handles single file size, not total batch; enforce post-upload.
 */
function enforceTotalSize(req, res, next) {
  if (!req.files) return next();
  let total = 0;
  const allFiles = Array.isArray(req.files)
    ? req.files
    : Object.values(req.files).flat();
  for (const f of allFiles) {
    total += f.size || 0;
    if (f.size > MAX_FILE_SIZE) {
      logger.warn("File too large in request:", f.originalname, f.size);
      return res.status(400).json({ error: "A file exceeds the max 50MB size." });
    }
  }
  if (total > MAX_TOTAL_SIZE) {
    logger.warn("Total upload too large:", total);
    return res.status(400).json({ error: "Total upload size exceeds 200MB." });
  }
  next();
}

// --- Exported uploader: use upload.single("avatar"), upload.array("files", N), upload.fields([...]) ---
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE, // Enforced per file by multer
  },
});

// Attach enforceTotalSize as needed for batch endpoints:
export { enforceTotalSize };

// Usage in route example:
// router.post("/some-endpoint",
//   upload.array("files", 10),
//   enforceTotalSize,
//   controllerFn
// );

