import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const PROD_CSP =
  "default-src 'self'; script-src 'self' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://res.cloudinary.com; font-src 'self' data:; connect-src 'self' blob: https://api.razorpay.com http://localhost:5000 ws://localhost:5173 ws://localhost:5174 ws://localhost:5175; worker-src 'self' blob:; child-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; frame-src https://checkout.razorpay.com https://api.razorpay.com";

const DEV_CSP =
  "default-src 'self' blob: data:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://res.cloudinary.com; font-src 'self' data:; connect-src 'self' blob: http://localhost:5000 http://127.0.0.1:5000 ws://localhost:5173 ws://localhost:5174 ws://localhost:5175 ws://127.0.0.1:5173 ws://127.0.0.1:5174 ws://127.0.0.1:5175 https://api.razorpay.com https://checkout.razorpay.com; worker-src 'self' blob:; child-src 'self' blob:; frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';";

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
  css: {
    postcss: "./postcss.config.js",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    headers: SECURITY_HEADERS(command === "serve" && mode === "development" ? "serve" : "build"),
  },
  preview: {
    headers: SECURITY_HEADERS("build"),
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
  },
  esbuild: command === "build" ? { drop: ["console", "debugger"] } : undefined,
}));
