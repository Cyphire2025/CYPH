const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const DEFAULT_MEDIA_HOSTS = new Set([
  "res.cloudinary.com",
  "ui-avatars.com",
  "localhost",
  "127.0.0.1",
]);

const parseHost = (value) => {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
};

const getAllowedHosts = () => {
  const hosts = new Set(DEFAULT_MEDIA_HOSTS);
  const apiHost = parseHost(import.meta.env?.VITE_API_BASE || "");
  const frontendHost = parseHost(import.meta.env?.VITE_FRONTEND_BASE || "");
  if (apiHost) hosts.add(apiHost);
  if (frontendHost) hosts.add(frontendHost);
  if (typeof window !== "undefined" && window.location?.hostname) {
    hosts.add(window.location.hostname.toLowerCase());
  }
  return hosts;
};

const ALLOWED_MEDIA_HOSTS = getAllowedHosts();

export function safeMediaUrl(url, fallback = "/admin-avatar.png") {
  if (typeof url !== "string") return fallback;
  const raw = url.trim();
  if (!raw) return fallback;

  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;

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

export function safeSlug(slug, fallback = "") {
  const value = String(slug || "").trim().toLowerCase();
  return /^[a-z0-9-]+$/.test(value) ? value : fallback;
}
