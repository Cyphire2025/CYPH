// frontend/src/lib/fetch.js
const API_BASE =
  import.meta?.env?.VITE_API_BASE ||
  (location.hostname.includes("localhost")
    ? "http://localhost:5000"
    : "https://backend.cyphire.in");

let cachedCsrf = null;
const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function getCsrf() {
  // Cache per page load
  if (cachedCsrf) return cachedCsrf;

  const res = await fetch(`${API_BASE}/csrf-token`, {
    method: "GET",
    credentials: "include", // MUST include for cross-site cookie
    mode: "cors",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch CSRF token: ${res.status}`);
  }

  const data = await res.json();
  cachedCsrf = data?.csrfToken || null;
  return cachedCsrf;
}

/**
 * apiFetch wraps fetch with:
 *  - credentials: include (cookies)
 *  - X-CSRF-Token for unsafe methods
 */
export async function apiFetch(url, options = {}) {
  const opts = { method: "GET", ...options };

  // Ensure FormData / JSON both work — do NOT set Content-Type for FormData
  const isFormData = opts.body instanceof FormData;

  if (UNSAFE.has(opts.method?.toUpperCase?.())) {
    const token = await getCsrf();
    opts.headers = {
      ...(opts.headers || {}),
      "X-CSRF-Token": token || "",
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
    };
  } else {
    // Safe methods: still copy headers if provided, but don't force content-type
    opts.headers = {
      ...(opts.headers || {}),
      ...(isFormData ? {} : opts.headers?.["Content-Type"] ? {} : {}),
    };
  }

  opts.credentials = "include";
  opts.mode = "cors";

  return fetch(url.startsWith("http") ? url : `${API_BASE}${url}`, opts);
}

export { API_BASE };
