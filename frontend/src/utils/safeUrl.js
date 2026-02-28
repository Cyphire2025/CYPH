const DEFAULT_MEDIA_HOSTS = new Set([
  "res.cloudinary.com",
  "ui-avatars.com",
  "localhost",
  "127.0.0.1",
]);

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

const parseHostname = (value) => {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
};

const getAllowedMediaHosts = () => {
  const hosts = new Set(DEFAULT_MEDIA_HOSTS);

  const configured = String(import.meta.env?.VITE_TRUSTED_MEDIA_HOSTS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  for (const host of configured) hosts.add(host);

  const apiHost = parseHostname(import.meta.env?.VITE_API_BASE || "");
  if (apiHost) hosts.add(apiHost);

  if (typeof window !== "undefined" && window.location?.hostname) {
    hosts.add(String(window.location.hostname).toLowerCase());
  }

  return hosts;
};

const ALLOWED_MEDIA_HOSTS = getAllowedMediaHosts();

export function safeMediaUrl(url, fallback = "/placeholder.png") {
  if (typeof url !== "string") return fallback;
  const raw = url.trim();
  if (!raw) return fallback;

  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }

  const normalized = raw.startsWith("//") ? `https:${raw}` : raw;

  try {
    const parsed = new URL(normalized);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return fallback;
    if (!ALLOWED_MEDIA_HOSTS.has(parsed.hostname.toLowerCase())) return fallback;
    return parsed.href;
  } catch {
    return fallback;
  }
}

export function safeHttpUrl(url, fallback = "#") {
  if (typeof url !== "string") return fallback;
  const raw = url.trim();
  if (!raw) return fallback;

  const normalized = raw.startsWith("//")
    ? `https:${raw}`
    : /^[a-z][a-z0-9+.-]*:/i.test(raw)
    ? raw
    : `https://${raw}`;

  try {
    const parsed = new URL(normalized);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return fallback;
    return parsed.href;
  } catch {
    return fallback;
  }
}

export function safeExternalOpen(url) {
  if (typeof window === "undefined") return;
  const safeUrl = safeMediaUrl(url, "");
  if (!safeUrl) return;
  const target = safeUrl.startsWith("/") ? `${window.location.origin}${safeUrl}` : safeUrl;
  window.open(target, "_blank", "noopener,noreferrer");
}

export function safeSlug(slug, fallback = "") {
  const value = String(slug || "").trim().toLowerCase();
  return /^[a-z0-9-]+$/.test(value) ? value : fallback;
}
