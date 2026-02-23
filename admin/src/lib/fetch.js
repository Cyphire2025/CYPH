const API_BASE =
  import.meta?.env?.VITE_API_BASE ||
  (location.hostname.includes("localhost")
    ? "http://localhost:5000"
    : "https://cyphire.onrender.com");

let cachedCsrf = null;
const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function getCsrf() {
  if (cachedCsrf) return cachedCsrf;

  const res = await fetch(`${API_BASE}/csrf-token`, {
    method: "GET",
    credentials: "include",
    mode: "cors",
  });

  if (!res.ok) throw new Error(`Failed to fetch CSRF token: ${res.status}`);
  const data = await res.json();
  cachedCsrf = data?.csrfToken || null;
  return cachedCsrf;
}

export async function apiFetch(url, options = {}) {
  const opts = { method: "GET", ...options };
  const isFormData = opts.body instanceof FormData;
  const method = opts.method?.toUpperCase?.() || "GET";

  if (UNSAFE.has(method)) {
    const token = await getCsrf();
    opts.headers = {
      ...(opts.headers || {}),
      "X-CSRF-Token": token || "",
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
    };
  } else {
    opts.headers = { ...(opts.headers || {}) };
  }

  opts.credentials = "include";
  opts.mode = "cors";

  return fetch(url.startsWith("http") ? url : `${API_BASE}${url}`, opts);
}

export { API_BASE };
