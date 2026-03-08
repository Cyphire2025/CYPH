import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const PROD_CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://res.cloudinary.com; font-src 'self' data:; connect-src 'self' http://localhost:5000 ws://localhost:5000 ws://127.0.0.1:5000 ws://localhost:5173 ws://localhost:5174 ws://localhost:5175; worker-src 'self' blob:; child-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

const DEV_CSP =
  "default-src 'self' blob: data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://res.cloudinary.com; font-src 'self' data:; connect-src 'self' blob: http://localhost:5000 http://127.0.0.1:5000 ws://localhost:5000 ws://127.0.0.1:5000 ws://localhost:5173 ws://localhost:5174 ws://localhost:5175 ws://127.0.0.1:5173 ws://127.0.0.1:5174 ws://127.0.0.1:5175; worker-src 'self' blob:; child-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';";

const SECURITY_HEADERS = (command) => ({
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Permissions-Policy": "geolocation=(), camera=(), microphone=()",
  "Content-Security-Policy": command === "serve" ? DEV_CSP : PROD_CSP,
});

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => ({
  plugins: [react()],
  server: {
    headers: SECURITY_HEADERS(command === "serve" && mode === "development" ? "serve" : "build"),
  },
  preview: {
    headers: SECURITY_HEADERS("build"),
  },
  build: {
    sourcemap: false,
  },
  esbuild: command === "build" ? { drop: ["console", "debugger"] } : undefined,
}));
