const API_BASE =
  (import.meta as any)?.env?.VITE_API_BASE ||
  (location.hostname.includes("localhost")
    ? "http://localhost:5000"
    : "https://cyphire.onrender.com");

let cachedCsrf: string | null = null;
const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function getCsrf() {
  if (cachedCsrf) return cachedCsrf;

  const res = await fetch(`${API_BASE}/csrf-token`, {
    method: "GET",
    credentials: "include",
    mode: "cors",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch CSRF token: ${res.status}`);
  }

  const data = await res.json();
  cachedCsrf = data?.csrfToken || null;
  return cachedCsrf;
}

export async function apiFetch(url: string, options: RequestInit = {}) {
  const opts: RequestInit = { method: "GET", ...options };
  const method = (opts.method || "GET").toUpperCase();
  const isUnsafe = UNSAFE.has(method);
  const isFormData = opts.body instanceof FormData;

  const headers = new Headers(opts.headers || {});
  if (isUnsafe) {
    const token = await getCsrf();
    headers.set("X-CSRF-Token", token || "");
    if (!isFormData && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  const init: RequestInit = {
    ...opts,
    headers,
    credentials: "include",
    mode: "cors",
  };
  const target = url.startsWith("http") ? url : `${API_BASE}${url}`;
  return fetch(target, init);
}
