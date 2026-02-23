/* eslint-disable no-unused-vars */
import React, { memo, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import {
  FiEye, FiEyeOff, FiShield, FiLock, FiMail, FiUser, FiCheck, FiX, FiZap, FiCpu, FiActivity,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { apiFetch } from "../lib/fetch";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:5000";

/* ───────────────────────────── Helpers (invisible UX) ─────────────────────────── */

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const COMMON_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "proton.me", "live.com"];

function levenshtein(a, b) {
  if (a === b) return 0; const m = []; for (let i = 0; i <= b.length; i++)m[i] = [i]; for (let j = 0; j <= a.length; j++)m[0][j] = j;
  for (let i = 1; i <= b.length; i++) { for (let j = 1; j <= a.length; j++) { m[i][j] = b[i - 1] === a[j - 1] ? m[i - 1][j - 1] : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1) } } return m[b.length][a.length]
}

function domainHint(email) {
  const parts = email.split("@"); if (parts.length !== 2) return null;
  const domain = parts[1].toLowerCase(); let best = null, score = Infinity;
  for (const d of COMMON_DOMAINS) { const s = levenshtein(domain, d); if (s < score) { score = s; best = d } }
  return (best && best !== domain && score <= 2) ? `${parts[0]}@${best}` : null;
}

function deviceFingerprint() {
  try {
    const ua = navigator.userAgent || "na";
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "na";
    const lang = navigator.language || "na";
    const plat = navigator.platform || "na";
    const seed = `${ua}|${tz}|${lang}|${plat}`;
    let h = 0; for (let i = 0; i < seed.length; i++) { h = (h << 5) - h + seed.charCodeAt(i); h |= 0; }
    return `dfp_${Math.abs(h)}`;
  } catch { return "dfp_na"; }
}

/* ───────────────────────────── Accessible Field ─────────────────────────── */

const Field = memo(function Field({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  icon,
  rightSlot,
  onKeyEvent,
  // a11y additions:
  error,
  successHint,
  describedById,
  inputRef,
  onBlur,
  onFocus,
}) {
  return (
    <div className="group">
      <label htmlFor={name} className="text-sm font-medium text-slate-700">{label}</label>
      <div className="mt-1 relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </div>
        <input
          ref={inputRef}
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onKeyUp={onKeyEvent}
          onKeyDown={onKeyEvent}
          onKeyPress={onKeyEvent}
          onBlur={onBlur}
          onFocus={onFocus}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={describedById}
          className={`w-full rounded-xl border bg-slate-50 pl-10 pr-4 py-3.5 outline-none ring-0 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all 
            ${error ? "border-red-300 focus:border-red-500 text-red-900 placeholder:text-red-300" : "border-slate-200 focus:border-blue-500 text-slate-900 placeholder:text-slate-400"}`}
        />
        {rightSlot && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>
        )}
      </div>

      {/* Inline SR-friendly region */}
      <div id={describedById} aria-live="polite" className="min-h-[1.25rem] mt-1">
        {error ? (
          <p className="text-xs text-red-500 font-medium">{error}</p>
        ) : successHint ? (
          <p className="text-xs text-emerald-600 font-medium">{successHint}</p>
        ) : null}
      </div>
    </div>
  );
});

/* ───────────────────────────────── Component ────────────────────────────── */

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();

  // secure redirect (on-site only)
  const redirectPath = useMemo(() => {
    const next = new URLSearchParams(location.search || "").get("next");
    if (next && next.startsWith("/")) return next;
    return "/choose";
  }, [location.search]);

  // scrub ?mode=signup etc. on success
  const cleanedRedirect = useCallback(() => {
    try {
      const url = new URL(window.location.origin + redirectPath);
      url.searchParams.delete("mode");
      return url.pathname + (url.searchParams.size ? `?${url.searchParams}` : "");
    } catch {
      return redirectPath.split("?")[0] || "/choose";
    }
  }, [redirectPath]);

  // form state
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [remember, setRemember] = useState(true);

  // ui state
  const [loading, setLoading] = useState(false);

  // password UI helpers
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  // email UX
  const [emailSuggestion, setEmailSuggestion] = useState(null);
  const [acceptedSuggestion, setAcceptedSuggestion] = useState(false);

  // a11y errors + refs
  const [errors, setErrors] = useState({ name: "", email: "", password: "", confirm: "" });
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const pwdRef = useRef(null);
  const confirmRef = useRef(null);

  // keyboard submit (Ctrl/Cmd + Enter)
  const rootRef = useRef(null);

  // prevent right-click for the whole page
  useEffect(() => {
    const onCtx = (e) => e.preventDefault();
    document.addEventListener("contextmenu", onCtx);
    return () => document.removeEventListener("contextmenu", onCtx);
  }, []);

  // --- Validators (kept logic + a11y mapping) ---
  const strengthChecks = useMemo(() => {
    const pw = form.password || "";
    const checks = {
      length: pw.length >= 10,
      number: /\d/.test(pw),
      upper: /[A-Z]/.test(pw),
      lower: /[a-z]/.test(pw),
      symbol: /[^A-Za-z0-9]/.test(pw),
      match: pw.length > 0 && pw === form.confirm,
    };
    return checks;
  }, [form.password, form.confirm]);

  const strengthScore = useMemo(() => {
    let score = 0;
    if (strengthChecks.length) score += 2;
    if (strengthChecks.upper) score += 1;
    if (strengthChecks.lower) score += 1;
    if (strengthChecks.number) score += 1;
    if (strengthChecks.symbol) score += 2;
    if (form.password.length >= 14) score += 1;
    return Math.min(score, 8);
  }, [strengthChecks, form.password.length]);

  const strengthLabel = useMemo(() => {
    if (strengthScore <= 2) return "Very weak";
    if (strengthScore <= 4) return "Weak";
    if (strengthScore <= 6) return "Good";
    return "Strong";
  }, [strengthScore]);

  const validate = useCallback(() => {
    const e = { name: "", email: "", password: "", confirm: "" };
    if (!form.name.trim()) e.name = "Please enter your name.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!emailRegex.test(form.email)) e.email = "Enter a valid email address.";
    if (form.password.length < 10) e.password = "Password must be at least 10 characters.";
    if (form.password !== form.confirm) e.confirm = "Passwords do not match.";
    setErrors(e);

    // focus first invalid
    const first =
      (e.name && nameRef.current) ||
      (e.email && emailRef.current) ||
      (e.password && pwdRef.current) ||
      (e.confirm && confirmRef.current);
    if (first) first.focus({ preventScroll: false });

    // preserve original toast experience
    return Object.values(e).find(Boolean) || "";
  }, [form]);

  // unified setter
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" })); // clear inline error on edit
  }, []);

  // Caps lock detection for password inputs
  const handleKeyState = useCallback((e) => {
    const cl = e.getModifierState && e.getModifierState("CapsLock");
    setCapsOn(!!cl);
    // Ctrl/Cmd + Enter submits
    if ((e.ctrlKey || e.metaKey) && e.key?.toLowerCase() === "enter") {
      const btn = document.getElementById("signupSubmitBtn");
      btn?.click();
    }
  }, []);

  // email domain hint
  const onEmailBlur = useCallback(() => {
    if (!form.email || !emailRegex.test(form.email)) {
      setEmailSuggestion(null);
      setAcceptedSuggestion(false);
      return;
    }
    setEmailSuggestion(domainHint(form.email));
  }, [form.email]);

  const acceptSuggestion = useCallback(() => {
    if (emailSuggestion) {
      setForm((p) => ({ ...p, email: emailSuggestion }));
      setEmailSuggestion(null);
      setAcceptedSuggestion(true);
      setErrors((prev) => ({ ...prev, email: "" }));
    }
  }, [emailSuggestion]);

  // Google OAuth (redirect, keeps your original behavior) + spinner overlay
  const handleGoogle = useCallback(async () => {
    try {
      setLoading(true);
      // short delay so the overlay is perceptible and "Continue with Google" text vanishes
      await new Promise((r) => setTimeout(r, 320));
      const next = encodeURIComponent(redirectPath);
      const rememberFlag = remember ? 1 : 0;
      const dfp = deviceFingerprint();
      window.location.href = `${API_BASE}/api/auth/google?mode=signup&remember=${rememberFlag}&dfp=${encodeURIComponent(dfp)}&next=${next}`;
    } catch (e) {
      setLoading(false);
      toast.error("Google sign-in failed. Please try again.");
    }
  }, [redirectPath, remember]);

  // Email signup (cookie session is set server-side)
  const handleEmailSignup = useCallback(
    async (e) => {
      e.preventDefault();
      const v = validate();
      if (v) {
        toast.error(v);
        return;
      }
      setLoading(true);
      try {
        const res = await apiFetch(`${API_BASE}/api/auth/signup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Device-Fingerprint": deviceFingerprint(), // for server-side rate-limit composite key
          },
          body: JSON.stringify({ name: form.name, email: form.email, password: form.password, rememberMe: remember }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Failed to sign up");
        setTimeout(() => navigate(cleanedRedirect(), { replace: true }), 650);
      } catch (e) {
        toast.error(e.message || "Something went wrong");
        // focus first field to speed retry
        (nameRef.current || emailRef.current || pwdRef.current || confirmRef.current)?.focus({ preventScroll: false });
      } finally {
        setLoading(false);
      }
    },
    [form, remember, navigate, cleanedRedirect, validate]
  );

  // Keyboard shortcut submit (kept)
  useEffect(() => {
    const el = rootRef.current;
    const handler = (e) => {
      const isMetaEnter = (e.ctrlKey || e.metaKey) && e.key === "Enter";
      if (isMetaEnter && !loading) {
        const formEl = el?.querySelector("form");
        if (formEl) formEl.requestSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [loading]);

  // UI helpers (kept)
  const strengthPct = (strengthScore / 8) * 100;

  const ChecklistItem = ({ ok, text }) => (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full border 
        ${ok ? "border-emerald-500 bg-emerald-100" : "border-slate-200 bg-slate-50"}`}
      >
        {ok ? <FiCheck className="text-emerald-600 w-3 h-3" /> : <FiX className="text-slate-300 w-3 h-3" />}
      </span>
      <span className={`${ok ? "text-emerald-700 font-medium" : "text-slate-500"}`}>{text}</span>
    </div>
  );

  // clipboard/paste blocking for password fields
  const blockClipboard = useCallback((e) => e.preventDefault(), []);
  const blockKeyboardPaste = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key?.toLowerCase() === "v") e.preventDefault();
  }, []);

  return (
    <div
      ref={rootRef}
      className="min-h-screen relative overflow-hidden bg-slate-50 text-slate-900 font-sans"
    >
      {/* Dynamic Background Pattern */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-slate-50 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-400 opacity-20 blur-[100px]"></div>
        <div className="absolute right-0 bottom-0 -z-10 h-[310px] w-[310px] rounded-full bg-indigo-400 opacity-20 blur-[100px]"></div>
      </div>

      {/* PAGE CONTENT */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 py-10 lg:py-16">
        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-900 hover:text-blue-600 transition"
          >
            <FiZap className="text-blue-600 h-6 w-6" />
            <span className="font-bold tracking-tight text-xl">Cyphire</span>
          </Link>
          <Link
            to="/signin"
            className="text-sm font-medium text-slate-600 hover:text-blue-600 transition"
          >
            Already have an account? <span className="underline decoration-slate-300 hover:decoration-blue-300 underline-offset-2">Sign in</span>
          </Link>
        </div>

        {/* Split Card (joined center) */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative flex flex-col lg:flex-row bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* LEFT: Hero / Value Panel */}
          <div className="flex-1 flex flex-col justify-between bg-blue-900 p-8 lg:p-12 text-white relative overflow-hidden">
            {/* Texture overlay */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat pointer-events-none" />
            <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500 blur-3xl opacity-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-indigo-500 blur-3xl opacity-20 pointer-events-none" />

            <div className="relative z-10">
              <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-3xl font-bold leading-tight text-white tracking-tight">
                Join the network where work feels <span className="text-blue-300">effortless</span>.
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-4 text-blue-100/80 max-w-sm text-lg leading-relaxed">
                Secure escrow by default. Lightning-fast workflows. Designed for builders
                who never compromise on precision.
              </motion.p>

              <div className="mt-6 text-sm font-semibold text-emerald-300 bg-emerald-900/40 w-fit px-4 py-1.5 rounded-full border border-emerald-500/30 shadow-sm backdrop-blur-md">
                Trusted by 1,200+ teams • ₹12cr+ payouts processed
              </div>

              <div className="mt-10 space-y-5">
                <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }} className="flex items-start gap-4 group">
                  <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm shadow-sm border border-white/5 group-hover:bg-white/20 transition-colors"><FiShield className="text-blue-200 h-5 w-5" /></div>
                  <div><div className="font-semibold text-white">Bank-grade protection</div><div className="text-sm text-blue-100/70 mt-0.5 leading-relaxed">End-to-end secure flows and multi-layered checks.</div></div>
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }} className="flex items-start gap-4 group">
                  <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm shadow-sm border border-white/5 group-hover:bg-white/20 transition-colors"><FiCpu className="text-purple-200 h-5 w-5" /></div>
                  <div><div className="font-semibold text-white">Performance-first design</div><div className="text-sm text-blue-100/70 mt-0.5 leading-relaxed">Micro-interactions tuned for clarity and speed.</div></div>
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }} className="flex items-start gap-4 group">
                  <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm shadow-sm border border-white/5 group-hover:bg-white/20 transition-colors"><FiActivity className="text-sky-200 h-5 w-5" /></div>
                  <div><div className="font-semibold text-white">Live status & insights</div><div className="text-sm text-blue-100/70 mt-0.5 leading-relaxed">Real-time updates keep you one step ahead.</div></div>
                </motion.div>
              </div>
            </div>

            {/* Decorative progress holo */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }} className="relative z-10 mt-12 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-blue-200 font-medium">Your journey</div>
                  <div className="text-lg font-bold text-white">Begin in under a minute</div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/5">
                  <FiLock className="text-white/80" />
                </div>
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-black/20">
                <motion.div className="h-full bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]" initial={{ width: "0%" }} animate={{ width: "85%" }} transition={{ duration: 1.2, ease: "easeOut" }} />
              </div>
            </motion.div>
          </div>

          {/* RIGHT: Form Panel */}
          <div className="flex-1 p-8 lg:p-12 bg-white flex items-center justify-center">
            <div className="w-full max-w-md">
              <div className="mb-8 text-center lg:text-left">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Create your account</h2>
                <p className="text-slate-500 mt-2 text-lg">Welcome to Cyphire — let’s set you up</p>
              </div>

              {/* Google button (hide text while loading; spinner overlay also shows) */}
              <button
                onClick={handleGoogle}
                disabled={loading}
                aria-label="Continue with Google"
                className="w-full inline-flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 hover:shadow-md disabled:opacity-60 shadow-sm"
              >
                <FcGoogle size={22} />
                {!loading && <span>Continue with Google</span>}
                {loading && <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />}
              </button>

              <div className="my-6 flex items-center gap-4 text-slate-300">
                <span className="h-px w-full bg-slate-200" />
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">or email</span>
                <span className="h-px w-full bg-slate-200" />
              </div>

              {/* Email Signup Form */}
              <form onSubmit={handleEmailSignup} className="space-y-5" noValidate>
                <Field
                  label="Full Name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Ada Lovelace"
                  autoComplete="name"
                  icon={<FiUser />}
                  error={errors.name}
                  describedById="name_help"
                  inputRef={nameRef}
                />

                <Field
                  label="Email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  onKeyEvent={handleKeyState}
                  onBlur={onEmailBlur}
                  placeholder="you@company.com"
                  autoComplete="email"
                  icon={<FiMail />}
                  error={errors.email}
                  successHint={emailRegex.test(form.email) && !errors.email ? "Looks good ✓" : ""}
                  describedById="email_help"
                  inputRef={emailRef}
                />

                {emailSuggestion && !acceptedSuggestion && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800" role="status" aria-live="polite">
                    Did you mean{" "}
                    <button type="button" className="underline decoration-amber-500 font-medium hover:text-amber-900" onClick={acceptSuggestion}>
                      {emailSuggestion}
                    </button>
                    ?
                    <button type="button" className="ml-2 rounded border border-amber-300/50 px-2 py-0.5 text-xs text-amber-700 hover:bg-amber-100" onClick={() => setEmailSuggestion(null)}>
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Password field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 ml-1">
                    <label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</label>
                    {capsOn && <span className="text-[11px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">Caps Lock ON</span>}
                  </div>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                      <FiLock className="h-5 w-5" />
                    </div>
                    <input
                      ref={pwdRef}
                      id="password"
                      name="password"
                      type={showPwd ? "text" : "password"}
                      value={form.password}
                      onChange={handleChange}
                      onKeyUp={(e) => { handleKeyState(e); if ((e.ctrlKey || e.metaKey) && e.key?.toLowerCase() === "v") e.preventDefault(); }}
                      onKeyDown={handleKeyState}
                      onKeyPress={handleKeyState}
                      onPaste={(e) => e.preventDefault()}
                      onCopy={(e) => e.preventDefault()}
                      onCut={(e) => e.preventDefault()}
                      onDrop={(e) => e.preventDefault()}
                      placeholder="Create a strong password"
                      autoComplete="new-password"
                      required
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby="password_help"
                      className={`w-full rounded-xl border bg-slate-50 px-11 py-3.5 outline-none ring-0 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all 
                        ${errors.password ? "border-red-300 focus:border-red-500 text-red-900 placeholder:text-red-300" : "border-slate-200 focus:border-blue-500 text-slate-900 placeholder:text-slate-400"}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      aria-label={showPwd ? "Hide password" : "Show password"}
                    >
                      {showPwd ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                    </button>
                  </div>

                  {/* strength meter */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs font-medium mb-1.5 ml-1">
                      <span className="text-slate-500">Strength</span>
                      <span className={
                        strengthLabel === "Strong" ? "text-emerald-600" :
                          strengthLabel === "Good" ? "text-blue-500" :
                            strengthLabel === "Weak" ? "text-amber-500" : "text-red-500"
                      }>
                        {strengthLabel}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <motion.div
                        className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500 shadow-sm"
                        initial={{ width: "0%" }}
                        animate={{ width: `${(strengthScore / 8) * 100}%` }}
                        transition={{ duration: 0.35 }}
                      />
                    </div>
                  </div>
                  <div id="password_help" aria-live="polite" className="min-h-[1.25rem] mt-1 ml-1">
                    {errors.password ? <p className="text-xs text-red-500 font-medium">{errors.password}</p> : null}
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirm" className="text-sm font-semibold text-slate-700 ml-1">Confirm Password</label>
                  <div className="mt-1.5 relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                      <FiLock className="h-5 w-5" />
                    </div>
                    <input
                      ref={confirmRef}
                      id="confirm"
                      name="confirm"
                      type={showConfirm ? "text" : "password"}
                      value={form.confirm}
                      onChange={handleChange}
                      onKeyUp={(e) => { handleKeyState(e); if ((e.ctrlKey || e.metaKey) && e.key?.toLowerCase() === "v") e.preventDefault(); }}
                      onKeyDown={handleKeyState}
                      onKeyPress={handleKeyState}
                      onPaste={(e) => e.preventDefault()}
                      onCopy={(e) => e.preventDefault()}
                      onCut={(e) => e.preventDefault()}
                      onDrop={(e) => e.preventDefault()}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      required
                      aria-invalid={Boolean(errors.confirm)}
                      aria-describedby="confirm_help"
                      className={`w-full rounded-xl border bg-slate-50 px-11 py-3.5 outline-none ring-0 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all
                        ${errors.confirm ? "border-red-300 focus:border-red-500 text-red-900 placeholder:text-red-300" : "border-slate-200 focus:border-blue-500 text-slate-900 placeholder:text-slate-400"}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      aria-label={showConfirm ? "Hide confirmation" : "Show confirmation"}
                    >
                      {showConfirm ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                    </button>
                  </div>
                  <div id="confirm_help" aria-live="polite" className="min-h-[1.25rem] mt-1 ml-1">
                    {errors.confirm ? <p className="text-xs text-red-500 font-medium">{errors.confirm}</p> : null}
                  </div>

                  {/* Password checklist */}
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 mt-2">
                    <ChecklistItem ok={strengthChecks.length} text="10+ characters" />
                    <ChecklistItem ok={strengthChecks.number} text="Number" />
                    <ChecklistItem ok={strengthChecks.upper} text="Uppercase char" />
                    <ChecklistItem ok={strengthChecks.lower} text="Lowercase char" />
                    <ChecklistItem ok={strengthChecks.symbol} text="Symbol" />
                    <ChecklistItem ok={strengthChecks.match} text="Passwords match" />
                  </div>
                </div>

                {/* Remember + shortcut (kept) */}
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
                  <div className="text-xs text-slate-400 font-medium">
                    Press <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-slate-500 text-[10px] shadow-sm">Ctrl</kbd> +
                    <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-slate-500 text-[10px] shadow-sm">Enter</kbd>
                  </div>
                </div>

                <motion.button
                  id="signupSubmitBtn"
                  whileHover={{ scale: loading ? 1 : 1.01 }}
                  whileTap={{ scale: loading ? 1 : 0.99 }}
                  disabled={loading}
                  type="submit"
                  className="relative w-full overflow-hidden rounded-xl bg-blue-600 px-6 py-4 font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 hover:shadow-blue-600/40 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                >
                  <span className="relative inline-flex items-center justify-center gap-2 text-base">
                    {loading && <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />}
                    {loading ? "Creating account..." : "Create Account"}
                  </span>
                </motion.button>

                <div className="text-xs text-slate-500 text-center leading-relaxed mt-4">
                  By continuing, you agree to our{" "}
                  <Link to="/legal/terms" className="text-blue-600 hover:underline font-medium">Terms</Link>{" "}
                  and{" "}
                  <Link to="/legal/privacy" className="text-blue-600 hover:underline font-medium">Privacy Policy</Link>.
                </div>
              </form>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="mt-8 text-center text-slate-400 text-xs">
          © {new Date().getFullYear()} Cyphire. All rights reserved.
        </div>
      </div>

      {/* FULLSCREEN LOADING OVERLAY (covers Google + email flows) */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-white/60 backdrop-blur-sm flex items-center justify-center"
            role="status"
            aria-live="polite"
          >
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <div className="text-slate-900 font-medium text-lg">Setting things up…</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
