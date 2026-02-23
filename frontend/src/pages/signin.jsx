/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import toast from "react-hot-toast";
import {
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiArrowRight,
  FiClock,
  FiTrendingUp,
} from "react-icons/fi";
import { apiFetch } from "../lib/fetch";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:5000";

/* ─────────────────────── helpers (security/a11y) ─────────────────────── */
function deviceFingerprint() {
  try {
    const ua = navigator.userAgent || "na";
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "na";
    const lang = navigator.language || "na";
    const plat = navigator.platform || "na";
    const seed = `${ua}|${tz}|${lang}|${plat}`;
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = (h << 5) - h + seed.charCodeAt(i);
      h |= 0;
    }
    return `dfp_${Math.abs(h)}`;
  } catch {
    return "dfp_na";
  }
}

/* ─────────────────────── component ─────────────────────── */
export default function Signin() {
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = useMemo(() => {
    const next = new URLSearchParams(location.search || "").get("next");
    if (next && next.startsWith("/")) return next;
    return "/choose";
  }, [location.search]);

  const [form, setForm] = useState({ email: "", password: "" });
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  const emailRef = useRef(null);
  const pwdRef = useRef(null);

  // Disable right-click
  useEffect(() => {
    const onCtx = (e) => e.preventDefault();
    document.addEventListener("contextmenu", onCtx);
    return () => document.removeEventListener("contextmenu", onCtx);
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }, []);

  const handleKeyState = useCallback((e) => {
    const cl = e.getModifierState && e.getModifierState("CapsLock");
    setCapsOn(!!cl);
    if ((e.ctrlKey || e.metaKey) && e.key?.toLowerCase() === "enter") {
      const btn = document.getElementById("signinSubmitBtn");
      btn?.click();
    }
  }, []);

  const blockClipboard = useCallback((e) => e.preventDefault(), []);

  /* ─────────────────────── network actions ─────────────────────── */
  const handleGoogle = useCallback(async () => {
    try {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 300));
      const next = encodeURIComponent(redirectPath);
      const rememberFlag = remember ? 1 : 0;
      const dfp = deviceFingerprint();
      window.location.href = `${API_BASE}/api/auth/google?mode=signin&remember=${rememberFlag}&dfp=${encodeURIComponent(
        dfp
      )}&next=${next}`;
    } catch {
      setLoading(false);
      toast.error("Google sign-in failed");
    }
  }, [redirectPath, remember]);

  const handleEmailSignin = useCallback(
    async (e) => {
      e.preventDefault();
      if (!form.email || !form.password) {
        toast.error("Enter your email and password.");
        (!form.email ? emailRef.current : pwdRef.current)?.focus();
        return;
      }
      setLoading(true);
      try {
        const res = await apiFetch(`${API_BASE}/api/auth/signin`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Device-Fingerprint": deviceFingerprint(),
          },
          body: JSON.stringify({ ...form, rememberMe: remember }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Login failed");

        navigate(redirectPath, { replace: true });
      } catch (err) {
        toast.error(err.message || "Sign-in failed");
      } finally {
        setLoading(false);
      }
    },
    [form, navigate, redirectPath, remember]
  );

  /* ─────────────────────── UI ─────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-4 py-8 relative overflow-hidden font-sans">
      {/* Dynamic Background Pattern */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-slate-50 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-400 opacity-20 blur-[100px]"></div>
        <div className="absolute right-0 bottom-0 -z-10 h-[310px] w-[310px] rounded-full bg-indigo-400 opacity-20 blur-[100px]"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="w-full max-w-5xl relative z-10"
      >
        <div className="relative flex flex-col lg:flex-row overflow-hidden rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-xl shadow-2xl">
          {/* LEFT side – Welcome Back / Stats */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="flex-1 bg-blue-900 p-8 lg:p-12 flex flex-col justify-between text-white relative overflow-hidden"
          >
            {/* Texture overlay for blue panel */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat pointer-events-none" />
            <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500 blur-3xl opacity-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-indigo-500 blur-3xl opacity-20 pointer-events-none" />

            <div className="relative z-10">
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Welcome back to <span className="text-blue-200">Cyphire</span>.
              </h1>
              <p className="mt-4 text-blue-100/90 max-w-sm text-lg leading-relaxed">
                Continue your journey of innovation, collaboration, and lightning-fast
                productivity.
              </p>

              <div className="mt-10 grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-5 flex flex-col gap-2 backdrop-blur-sm">
                  <div className="p-2 bg-white/20 rounded-lg w-fit">
                    <FiClock className="text-white h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-white/90 font-semibold text-lg">2.1x</span>
                    <span className="text-blue-100 text-xs">Faster task completion</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-5 flex flex-col gap-2 backdrop-blur-sm">
                  <div className="p-2 bg-white/20 rounded-lg w-fit">
                    <FiTrendingUp className="text-emerald-300 h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-white/90 font-semibold text-lg">+34%</span>
                    <span className="text-blue-100 text-xs">Performance boost</span>
                  </div>
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="relative z-10 mt-12 pt-8 border-t border-white/10 text-sm text-blue-100/70 italic"
            >
              “The best way to predict the future is to create it.” — Cyphire Labs
            </motion.div>
          </motion.div>

          {/* RIGHT side – Form */}
          <div className="flex-1 p-8 lg:p-12 bg-white flex items-center justify-center">
            <div className="w-full max-w-md">
              <div className="mb-8 text-center lg:text-left">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Sign in securely</h2>
                <p className="text-slate-500 mt-2">
                  To continue where you left off.
                </p>
              </div>

              <button
                onClick={handleGoogle}
                disabled={loading}
                aria-label="Continue with Google"
                className="w-full inline-flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 hover:shadow-md disabled:opacity-60 shadow-sm"
              >
                <FcGoogle size={22} />
                {!loading && <span>Continue with Google</span>}
                {loading && (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                )}
              </button>

              <div className="my-6 flex items-center gap-4 text-slate-400">
                <span className="h-px w-full bg-slate-200" />
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">or email</span>
                <span className="h-px w-full bg-slate-200" />
              </div>

              <form onSubmit={handleEmailSignin} noValidate className="space-y-5">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">
                    Email address
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                      <FiMail className="h-5 w-5" />
                    </div>
                    <input
                      ref={emailRef}
                      type="email"
                      name="email"
                      id="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@company.com"
                      autoComplete="email"
                      required
                      aria-invalid={!form.email}
                      aria-describedby="email_help"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-11 py-3.5 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                    />
                  </div>
                  <div id="email_help" aria-live="polite" className="text-xs text-emerald-600 h-4 mt-1 font-medium ml-1">
                    {form.email && form.email.includes("@") ? "Looks good ✓" : ""}
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 ml-1">
                    <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                      Password
                    </label>
                    {capsOn && (
                      <span className="text-[11px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">Caps Lock ON</span>
                    )}
                  </div>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                      <FiLock className="h-5 w-5" />
                    </div>
                    <input
                      ref={pwdRef}
                      type={showPwd ? "text" : "password"}
                      name="password"
                      id="password"
                      value={form.password}
                      onChange={handleChange}
                      onKeyUp={handleKeyState}
                      onKeyDown={handleKeyState}
                      onKeyPress={handleKeyState}
                      onPaste={blockClipboard}
                      onCopy={blockClipboard}
                      onCut={blockClipboard}
                      onDrop={blockClipboard}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      aria-invalid={!form.password}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-11 py-3.5 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((s) => !s)}
                      aria-label={showPwd ? "Hide password" : "Show password"}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    >
                      {showPwd ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Options */}
                <div className="flex items-center justify-between pt-2">
                  <label className="inline-flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer select-none hover:text-slate-900 transition-colors">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-colors"
                    />
                    Remember me
                  </label>
                  <span className="text-sm text-slate-400">
                    Password reset is temporarily unavailable
                  </span>
                </div>

                {/* Submit */}
                <motion.button
                  id="signinSubmitBtn"
                  whileHover={{ scale: loading ? 1 : 1.01 }}
                  whileTap={{ scale: loading ? 1 : 0.99 }}
                  disabled={loading}
                  type="submit"
                  className="relative w-full overflow-hidden rounded-xl bg-blue-600 px-6 py-4 font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 hover:shadow-blue-600/40 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                >
                  <span className="relative inline-flex items-center justify-center gap-2 text-base">
                    {loading && (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
                    )}
                    {loading ? "Signing in…" : "Sign In"}
                  </span>
                </motion.button>
              </form>

              <div className="mt-8 text-center text-sm text-slate-500">
                New to Cyphire?{" "}
                <Link
                  to="/signup"
                  className="text-blue-600 hover:text-blue-800 font-bold hover:underline"
                >
                  Create an account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Overlay Spinner */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50"
            role="status"
            aria-live="polite"
          >
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <div className="text-slate-900 font-medium text-lg">Authenticating…</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
