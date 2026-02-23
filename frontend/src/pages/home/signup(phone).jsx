/* eslint-disable no-unused-vars */
import React, {
  memo,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import {
  FiEye,
  FiEyeOff,
  FiShield,
  FiLock,
  FiMail,
  FiUser,
  FiCheck,
  FiX,
  FiZap,
  FiCpu,
  FiActivity,
  FiPhone,
  FiClock,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { apiFetch } from "../../lib/fetch";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:5000";

/* ───────────────────────────── Helpers ─────────────────────────── */

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const COMMON_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "proton.me",
  "live.com",
];

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      m[i][j] =
        b[i - 1] === a[j - 1]
          ? m[i - 1][j - 1]
          : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
    }
  }
  return m[b.length][a.length];
}

function domainHint(email) {
  const parts = email.split("@");
  if (parts.length !== 2) return null;
  const domain = parts[1].toLowerCase();
  let best = null;
  let score = Infinity;
  for (const d of COMMON_DOMAINS) {
    const s = levenshtein(domain, d);
    if (s < score) {
      score = s;
      best = d;
    }
  }
  return best && best !== domain && score <= 2
    ? `${parts[0]}@${best}`
    : null;
}

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

/* ───────────────────────── Field Component ─────────────────────── */

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
  error,
  successHint,
  describedById,
  inputRef,
  onBlur,
  onFocus,
}) {
  return (
    <div className="group">
      <label htmlFor={name} className="text-xs tracking-wide text-white/70">
        {label}
      </label>
      <div className="mt-1 relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70">
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
          className={`w-full rounded-xl border bg-black/30 px-10 py-3 outline-none ring-0 focus:border-fuchsia-400/40 transition-colors
            ${
              error
                ? "border-rose-400/60 focus:border-rose-400/80"
                : "border-white/10"
            }`}
        />
        {rightSlot && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightSlot}
          </div>
        )}
      </div>

      <div id={describedById} aria-live="polite" className="min-h-[1.25rem]">
        {error ? (
          <p className="text-sm text-rose-300">{error}</p>
        ) : successHint ? (
          <p className="text-sm text-emerald-300">{successHint}</p>
        ) : null}
      </div>
    </div>
  );
});

/* ─────────────────────────── Component ─────────────────────────── */

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();

  const urlParams = useMemo(
    () => new URLSearchParams(location.search || ""),
    [location.search]
  );
  const fromGoogle = urlParams.get("fromGoogle") === "1";

  // secure redirect (after full signup + phone)
  const redirectPath = useMemo(() => {
    const next = new URLSearchParams(location.search || "").get("next");
    if (next && next.startsWith("/")) return next;
    return "/choose";
  }, [location.search]);

  const cleanedRedirect = useCallback(() => {
    try {
      const url = new URL(window.location.origin + redirectPath);
      url.searchParams.delete("mode");
      url.searchParams.delete("fromGoogle");
      url.searchParams.delete("next");
      return (
        url.pathname +
        (url.searchParams.size ? `?${url.searchParams.toString()}` : "")
      );
    } catch {
      return redirectPath.split("?")[0] || "/choose";
    }
  }, [redirectPath]);

  /* ─────────────── State ─────────────── */

  // overall stage:
  // "email_collect" -> "email_otp" -> "email_password" -> "phone"
  // If fromGoogle=true, we start directly at "phone" for Google flow.
  const [stage, setStage] = useState(fromGoogle ? "phone" : "email_collect");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  const [emailSuggestion, setEmailSuggestion] = useState(null);
  const [acceptedSuggestion, setAcceptedSuggestion] = useState(false);

  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });

  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const pwdRef = useRef(null);
  const confirmRef = useRef(null);
  const otpEmailRef = useRef(null);
  const phoneRef = useRef(null);
  const phoneOtpRef = useRef(null);

  const [emailOtp, setEmailOtp] = useState("");
  const [phoneValue, setPhoneValue] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);

  const [emailVerified, setEmailVerified] = useState(false);

  const rootRef = useRef(null);

  // prevent right-click
  useEffect(() => {
    const onCtx = (e) => e.preventDefault();
    document.addEventListener("contextmenu", onCtx);
    return () => document.removeEventListener("contextmenu", onCtx);
  }, []);

  /* ───────────── Password strength ───────────── */

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

  /* ───────────── Validation helpers ───────────── */

  const validateEmailStep = useCallback(() => {
    const e = { name: "", email: "" };
    if (!form.name.trim()) e.name = "Please enter your name.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!emailRegex.test(form.email))
      e.email = "Enter a valid email address.";
    setErrors((prev) => ({ ...prev, ...e }));
    const first =
      (e.name && nameRef.current) || (e.email && emailRef.current);
    if (first) first.focus({ preventScroll: false });
    return Object.values(e).find(Boolean) || "";
  }, [form.name, form.email]);

  const validatePasswordStep = useCallback(() => {
    const e = { password: "", confirm: "" };
    if (form.password.length < 10)
      e.password = "Password must be at least 10 characters.";
    if (form.password !== form.confirm)
      e.confirm = "Passwords do not match.";
    setErrors((prev) => ({ ...prev, ...e }));
    const first =
      (e.password && pwdRef.current) || (e.confirm && confirmRef.current);
    if (first) first.focus({ preventScroll: false });
    return Object.values(e).find(Boolean) || "";
  }, [form.password, form.confirm]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }, []);

  const handleKeyState = useCallback((e) => {
    const cl = e.getModifierState && e.getModifierState("CapsLock");
    setCapsOn(!!cl);
    if ((e.ctrlKey || e.metaKey) && e.key?.toLowerCase() === "enter") {
      const btn = document.getElementById("signupSubmitBtn");
      btn?.click();
    }
  }, []);

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

  /* ───────────── Google OAuth (goes to phone step after) ───────────── */

  const handleGoogle = useCallback(async () => {
    try {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 320));
      const dfp = deviceFingerprint();
      // After Google signup, always come back to /signup?fromGoogle=1
      const next = encodeURIComponent("/signup?fromGoogle=1");
      const rememberFlag = remember ? 1 : 0;
      window.location.href = `${API_BASE}/api/auth/google?mode=signup&remember=${rememberFlag}&dfp=${encodeURIComponent(
        dfp
      )}&next=${next}`;
    } catch (e) {
      setLoading(false);
      toast.error("Google sign-in failed. Please try again.");
    }
  }, [remember]);

  /* ───────────── Email Signup Flow ───────────── */

  // STEP 1: request email OTP
  const handleEmailRequestOtp = useCallback(
    async (e) => {
      e.preventDefault();
      const v = validateEmailStep();
      if (v) {
        toast.error(v);
        return;
      }
      setLoading(true);
      try {
        const res = await apiFetch(
          `${API_BASE}/api/auth/signup/email/request-otp`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Device-Fingerprint": deviceFingerprint(),
            },
            body: JSON.stringify({
              name: form.name.trim(),
              email: form.email.trim(),
            }),
          }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(data.error || data.message || "Failed to send OTP");
        toast.success(
          data.message || "OTP sent to your email. Please check your inbox."
        );
        setStage("email_otp");
        setEmailOtp("");
        setEmailVerified(false);
        setTimeout(() => otpEmailRef.current?.focus(), 100);
      } catch (err) {
        toast.error(err.message || "Failed to send OTP");
      } finally {
        setLoading(false);
      }
    },
    [form.name, form.email, validateEmailStep]
  );

  // STEP 2: verify email OTP
  const handleEmailVerifyOtp = useCallback(
    async (e) => {
      e.preventDefault();
      if (!emailOtp || emailOtp.length !== 6) {
        toast.error("Enter the 6-digit OTP sent to your email.");
        otpEmailRef.current?.focus();
        return;
      }
      setLoading(true);
      try {
        const res = await apiFetch(
          `${API_BASE}/api/auth/signup/email/verify-otp`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Device-Fingerprint": deviceFingerprint(),
            },
            body: JSON.stringify({
              email: form.email.trim(),
              otp: emailOtp.trim(),
            }),
          }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(
            data.error || data.message || "Email OTP verification failed"
          );
        toast.success(data.message || "Email verified. Set your password.");
        setEmailVerified(true);
        setStage("email_password");
        setTimeout(() => pwdRef.current?.focus(), 100);
      } catch (err) {
        toast.error(err.message || "Verification failed");
      } finally {
        setLoading(false);
      }
    },
    [emailOtp, form.email]
  );

  // STEP 3: set password (does not redirect; goes to phone stage)
  const handleSetPassword = useCallback(
    async (e) => {
      e.preventDefault();
      const v = validatePasswordStep();
      if (v) {
        toast.error(v);
        return;
      }
      if (!emailVerified) {
        toast.error("Please verify your email OTP first.");
        return;
      }
      setLoading(true);
      try {
        const res = await apiFetch(
          `${API_BASE}/api/auth/signup/email/set-password`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Device-Fingerprint": deviceFingerprint(),
            },
            body: JSON.stringify({
              email: form.email.trim(),
              password: form.password,
              rememberMe: remember,
            }),
          }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(
            data.error || data.message || "Failed to set password"
          );

        toast.success(
          data.message ||
            "Password set. Add your phone number to secure your account."
        );
        setStage("phone");
        setTimeout(() => phoneRef.current?.focus(), 100);
      } catch (err) {
        toast.error(err.message || "Failed to set password");
      } finally {
        setLoading(false);
      }
    },
    [emailVerified, form.email, form.password, remember, validatePasswordStep]
  );

  /* ───────────── Phone OTP (for both flows) ───────────── */

  const handlePhoneRequestOtp = useCallback(
    async (e) => {
      e.preventDefault();
      if (!phoneValue.trim()) {
        toast.error("Enter a valid phone number.");
        phoneRef.current?.focus();
        return;
      }
      setLoading(true);
      try {
        const res = await apiFetch(
          `${API_BASE}/api/auth/signup/phone/request-otp`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Device-Fingerprint": deviceFingerprint(),
            },
            body: JSON.stringify({
              phone: phoneValue.trim(),
              context: fromGoogle ? "google_signup" : "email_signup",
            }),
          }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(
            data.error || data.message || "Failed to send phone OTP"
          );
        toast.success(
          data.message || "OTP sent to your phone. Please enter it below."
        );
        setPhoneOtp("");
        setPhoneOtpSent(true);
        setTimeout(() => phoneOtpRef.current?.focus(), 100);
      } catch (err) {
        toast.error(err.message || "Failed to send OTP");
      } finally {
        setLoading(false);
      }
    },
    [phoneValue, fromGoogle]
  );

  const handlePhoneVerifyOtp = useCallback(
    async (e) => {
      e.preventDefault();
      if (!phoneOtp || phoneOtp.length !== 6) {
        toast.error("Enter the 6-digit OTP sent to your phone.");
        phoneOtpRef.current?.focus();
        return;
      }
      setLoading(true);
      try {
        const res = await apiFetch(
          `${API_BASE}/api/auth/signup/phone/verify-otp`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Device-Fingerprint": deviceFingerprint(),
            },
            body: JSON.stringify({
              phone: phoneValue.trim(),
              otp: phoneOtp.trim(),
              context: fromGoogle ? "google_signup" : "email_signup",
            }),
          }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(
            data.error || data.message || "Phone OTP verification failed"
          );

        toast.success(
          data.message || "Phone verified. Your Cyphire account is ready."
        );
        navigate(cleanedRedirect(), { replace: true });
      } catch (err) {
        toast.error(err.message || "Verification failed");
      } finally {
        setLoading(false);
      }
    },
    [phoneValue, phoneOtp, fromGoogle, remember, navigate, cleanedRedirect]
  );

  /* ───────────── Window keyboard shortcut ───────────── */

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

  const ChecklistItem = ({ ok, text }) => (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full border 
        ${
          ok
            ? "border-emerald-400/50 bg-emerald-400/10"
            : "border-white/20 bg-white/5"
        }`}
      >
        {ok ? (
          <FiCheck className="text-emerald-300" />
        ) : (
          <FiX className="text-white/50" />
        )}
      </span>
      <span className={ok ? "text-emerald-300" : "text-white/60"}>{text}</span>
    </div>
  );

  /* ───────────── Render ───────────── */

  return (
    <div
      ref={rootRef}
      className="min-h-screen relative overflow-hidden bg-[#05050a] text-white"
    >
      {/* background */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -top-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/25 blur-[120px]"
          animate={{ x: [-10, 15, -10], y: [0, 25, 0] }}
          transition={{ repeat: Infinity, duration: 14, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-44 -right-40 h-[30rem] w-[30rem] rounded-full bg-violet-500/25 blur-[120px]"
          animate={{ x: [10, -15, 10], y: [0, -25, 0] }}
          transition={{ repeat: Infinity, duration: 16, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/4 left-1/4 h-[22rem] w-[22rem] rounded-full bg-sky-500/20 blur-[100px]"
          animate={{ scale: [0.95, 1.05, 0.95] }}
          transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
        />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(ellipse at 40% 30%, rgba(0,0,0,1), transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-10 lg:py-16">
        {/* header */}
        <div className="mb-10 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white transition"
          >
            <FiZap />
            <span className="font-semibold tracking-wide">Cyphire</span>
          </Link>
          <Link to="/signin" className="text-sm text-white/70 hover:text-white">
            Already have an account? Sign in
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative flex flex-col lg:flex-row bg-white/[0.045] backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.4)]"
        >
          <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-r from-violet-500/40 via-fuchsia-500/20 to-sky-500/40 blur-2xl pointer-events-none" />

          {/* left hero unchanged */}
          <div className="flex-1 flex flex-col justify-between bg-gradient-to-br from-[#160024]/80 via-[#080018]/80 to-[#001020]/80 p-8 lg:p-12">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-3xl font-bold leading-tight text-white/95"
              >
                Join the network where work feels{" "}
                <span className="text-fuchsia-300">effortless</span>.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-3 text-white/70 max-w-sm"
              >
                Secure escrow by default. Lightning-fast workflows. Designed
                for builders who never compromise on precision.
              </motion.p>

              <div className="mt-3 text-sm text-emerald-300/90">
                Trusted by 1,200+ teams • ₹12cr+ payouts processed
              </div>

              <div className="mt-6 space-y-4">
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 }}
                  className="flex items-start gap-3"
                >
                  <div className="rounded-lg border border-white/15 bg-black/30 p-2">
                    <FiShield className="text-fuchsia-300" />
                  </div>
                  <div>
                    <div className="font-medium text-white/90">
                      Bank-grade protection
                    </div>
                    <div className="text-sm text-white/60">
                      End-to-end secure flows and multi-layered checks.
                    </div>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 }}
                  className="flex items-start gap-3"
                >
                  <div className="rounded-lg border border-white/15 bg-black/30 p-2">
                    <FiCpu className="text-violet-300" />
                  </div>
                  <div>
                    <div className="font-medium text-white/90">
                      Performance-first design
                    </div>
                    <div className="text-sm text-white/60">
                      Micro-interactions tuned for clarity and speed.
                    </div>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 }}
                  className="flex items-start gap-3"
                >
                  <div className="rounded-lg border border-white/15 bg-black/30 p-2">
                    <FiActivity className="text-sky-300" />
                  </div>
                  <div>
                    <div className="font-medium text-white/90">
                      Live status & insights
                    </div>
                    <div className="text-sm text-white/60">
                      Real-time updates keep you one step ahead.
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20, rotate: -2 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mt-10 rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-sky-500/10 p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white/70">Your journey</div>
                  <div className="text-lg font-semibold text-white/95">
                    Begin in under a minute
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                  <FiLock className="opacity-80" />
                </div>
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-sky-500"
                  initial={{ width: "0%" }}
                  animate={{ width: "85%" }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          </div>

          {/* right panel */}
          <div className="flex-1 p-8 lg:p-12 bg-[#05050a]/80 backdrop-blur-2xl flex items-center justify-center">
            <div className="w-full max-w-md">
              <div className="mb-6 text-center lg:text-left">
                <h2 className="text-2xl md:text-3xl font-bold">
                  {stage === "phone"
                    ? fromGoogle
                      ? "Add your phone number"
                      : "Secure your account"
                    : "Create your account"}
                </h2>
                <p className="text-white/60 mt-2">
                  {stage === "phone"
                    ? "We use your phone number for one-time codes and suspicious login checks."
                    : "Welcome to Cyphire — choose Google or email, then verify with OTP."}
                </p>
              </div>

              {/* Only show Google + divider when we are in email stages */}
              {stage !== "phone" && (
                <>
                  <button
                    onClick={handleGoogle}
                    disabled={loading}
                    aria-label="Continue with Google"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium transition hover:bg-white/15 disabled:opacity-60"
                  >
                    <FcGoogle size={22} />
                    {!loading && <span>Continue with Google</span>}
                    {loading && (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
                    )}
                  </button>

                  <div className="my-5 flex items-center gap-4 text-white/50">
                    <span className="h-px w-full bg-white/10" />
                    <span className="text-xs">or</span>
                    <span className="h-px w-full bg-white/10" />
                  </div>
                </>
              )}

              {/* Stage-specific content */}
              {stage === "email_collect" && (
                <form onSubmit={handleEmailRequestOtp} className="space-y-4" noValidate>
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
                    successHint={
                      emailRegex.test(form.email) && !errors.email
                        ? "Looks good ✓"
                        : ""
                    }
                    describedById="email_help"
                    inputRef={emailRef}
                  />

                  {emailSuggestion && !acceptedSuggestion && (
                    <div
                      className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200"
                      role="status"
                      aria-live="polite"
                    >
                      Did you mean{" "}
                      <button
                        type="button"
                        className="underline decoration-amber-300 hover:text-amber-100"
                        onClick={acceptSuggestion}
                      >
                        {emailSuggestion}
                      </button>
                      ?
                      <button
                        type="button"
                        className="ml-2 rounded border border-white/20 px-2 py-0.5 text-xs text-white/80 hover:bg-white/10"
                        onClick={() => setEmailSuggestion(null)}
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <label className="inline-flex items-center gap-2 text-sm text-white/70 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="h-4 w-4 rounded border-white/20 bg-black/30"
                      />
                      Remember me
                    </label>
                    <div className="text-xs text-white/50">
                      We’ll use email OTP to verify it belongs to you.
                    </div>
                  </div>

                  <motion.button
                    id="signupSubmitBtn"
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    disabled={loading}
                    type="submit"
                    className="relative w-full overflow-hidden rounded-2xl px-4 py-3 font-semibold disabled:opacity-60"
                  >
                    <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600" />
                    <span className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-violet-400/40 via-fuchsia-400/30 to-sky-400/30 blur-md" />
                    <span className="relative inline-flex items-center justify-center gap-2">
                      {loading && (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
                      )}
                      {loading ? "Sending OTP..." : "Send email OTP"}
                    </span>
                  </motion.button>
                </form>
              )}

              {stage === "email_otp" && (
                <form onSubmit={handleEmailVerifyOtp} className="space-y-4">
                  <p className="text-sm text-white/70">
                    We&apos;ve sent a 6-digit code to{" "}
                    <span className="font-medium text-white">
                      {form.email}
                    </span>
                    . Enter it below to verify your email.
                  </p>
                  <div>
                    <label
                      htmlFor="emailOtp"
                      className="text-xs tracking-wide text-white/70"
                    >
                      Email OTP
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70">
                        <FiClock />
                      </div>
                      <input
                        ref={otpEmailRef}
                        id="emailOtp"
                        name="emailOtp"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={emailOtp}
                        onChange={(e) =>
                          setEmailOtp(e.target.value.replace(/[^\d]/g, ""))
                        }
                        className="w-full rounded-xl border bg-black/30 px-10 py-3 outline-none ring-0 border-white/10 focus:border-fuchsia-400/40 tracking-[0.4em] text-center"
                        placeholder="● ● ● ● ● ●"
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-white/60">
                      Code expires in 10 minutes. Never share your OTP with
                      anyone.
                    </p>
                  </div>

                  <motion.button
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    disabled={loading}
                    type="submit"
                    className="relative w-full overflow-hidden rounded-2xl px-4 py-3 font-semibold disabled:opacity-60"
                  >
                    <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600" />
                    <span className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-violet-400/40 via-fuchsia-400/30 to-sky-400/30 blur-md" />
                    <span className="relative inline-flex items-center justify-center gap-2">
                      {loading && (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
                      )}
                      {loading ? "Verifying..." : "Verify email"}
                    </span>
                  </motion.button>

                  <button
                    type="button"
                    className="w-full text-xs text-white/60 hover:text-white/90"
                    onClick={() => setStage("email_collect")}
                  >
                    Edit email or name
                  </button>
                </form>
              )}

              {stage === "email_password" && (
                <form onSubmit={handleSetPassword} className="space-y-4">
                  <p className="text-sm text-white/70">
                    Email verified for{" "}
                    <span className="font-medium text-white">
                      {form.email}
                    </span>
                    . Now set a strong password for your account.
                  </p>

                  {/* password */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="password"
                        className="text-xs tracking-wide text-white/70"
                      >
                        Password
                      </label>
                      {capsOn && (
                        <span className="text-[11px] text-amber-300/90">
                          Caps Lock is ON
                        </span>
                      )}
                    </div>
                    <div className="mt-1 relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70">
                        <FiLock />
                      </div>
                      <input
                        ref={pwdRef}
                        id="password"
                        name="password"
                        type={showPwd ? "text" : "password"}
                        value={form.password}
                        onChange={handleChange}
                        onKeyUp={(e) => {
                          handleKeyState(e);
                          if (
                            (e.ctrlKey || e.metaKey) &&
                            e.key?.toLowerCase() === "v"
                          )
                            e.preventDefault();
                        }}
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
                        className={`w-full rounded-xl border bg-black/30 px-10 py-3 outline-none ring-0 focus:border-fuchsia-400/40 transition-colors
                          ${
                            errors.password
                              ? "border-rose-400/60 focus:border-rose-400/80"
                              : "border-white/10"
                          }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
                        aria-label={showPwd ? "Hide password" : "Show password"}
                      >
                        {showPwd ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>

                    {/* strength meter */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/60">Strength</span>
                        <span
                          className={
                            strengthLabel === "Strong"
                              ? "text-emerald-300"
                              : strengthLabel === "Good"
                              ? "text-sky-300"
                              : strengthLabel === "Weak"
                              ? "text-amber-300"
                              : "text-red-300"
                          }
                        >
                          {strengthLabel}
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500"
                          initial={{ width: "0%" }}
                          animate={{
                            width: `${(strengthScore / 8) * 100}%`,
                          }}
                          transition={{ duration: 0.35 }}
                        />
                      </div>
                    </div>
                    <div
                      id="password_help"
                      aria-live="polite"
                      className="min-h-[1.25rem]"
                    >
                      {errors.password ? (
                        <p className="text-sm text-rose-300">
                          {errors.password}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* confirm */}
                  <div>
                    <label
                      htmlFor="confirm"
                      className="text-xs tracking-wide text-white/70"
                    >
                      Confirm Password
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70">
                        <FiLock />
                      </div>
                      <input
                        ref={confirmRef}
                        id="confirm"
                        name="confirm"
                        type={showConfirm ? "text" : "password"}
                        value={form.confirm}
                        onChange={handleChange}
                        onKeyUp={(e) => {
                          handleKeyState(e);
                          if (
                            (e.ctrlKey || e.metaKey) &&
                            e.key?.toLowerCase() === "v"
                          )
                            e.preventDefault();
                        }}
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
                        className={`w-full rounded-xl border bg-black/30 px-10 py-3 outline-none ring-0 focus:border-fuchsia-400/40 transition-colors
                          ${
                            errors.confirm
                              ? "border-rose-400/60 focus:border-rose-400/80"
                              : "border-white/10"
                          }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
                        aria-label={
                          showConfirm ? "Hide confirmation" : "Show confirmation"
                        }
                      >
                        {showConfirm ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                    <div
                      id="confirm_help"
                      aria-live="polite"
                      className="min-h-[1.25rem]"
                    >
                      {errors.confirm ? (
                        <p className="text-sm text-rose-300">
                          {errors.confirm}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
                      <ChecklistItem
                        ok={strengthChecks.length}
                        text="10+ characters"
                      />
                      <ChecklistItem
                        ok={strengthChecks.number}
                        text="Number"
                      />
                      <ChecklistItem
                        ok={strengthChecks.upper}
                        text="Uppercase letter"
                      />
                      <ChecklistItem
                        ok={strengthChecks.lower}
                        text="Lowercase letter"
                      />
                      <ChecklistItem
                        ok={strengthChecks.symbol}
                        text="Symbol"
                      />
                      <ChecklistItem
                        ok={strengthChecks.match}
                        text="Passwords match"
                      />
                    </div>
                  </div>

                  <motion.button
                    id="signupSubmitBtn"
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    disabled={loading}
                    type="submit"
                    className="relative w-full overflow-hidden rounded-2xl px-4 py-3 font-semibold disabled:opacity-60"
                  >
                    <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600" />
                    <span className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-violet-400/40 via-fuchsia-400/30 to-sky-400/30 blur-md" />
                    <span className="relative inline-flex items-center justify-center gap-2">
                      {loading && (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
                      )}
                      {loading ? "Saving..." : "Continue to phone verification"}
                    </span>
                  </motion.button>
                </form>
              )}

              {stage === "phone" && (
                <form
                  onSubmit={
                    phoneOtpSent ? handlePhoneVerifyOtp : handlePhoneRequestOtp
                  }
                  className="space-y-4"
                >
                  <Field
                    label="Phone number"
                    name="phone"
                    type="tel"
                    value={phoneValue}
                    onChange={(e) => setPhoneValue(e.target.value)}
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                    icon={<FiPhone />}
                    error=""
                    describedById="phone_help"
                    inputRef={phoneRef}
                  />
                  <p
                    id="phone_help"
                    className="text-[11px] text-white/60 -mt-2 mb-1"
                  >
                    Use a number you control. One number can be linked to only
                    one Cyphire account.
                  </p>

                  {phoneOtpSent && (
                    <div>
                      <label
                        htmlFor="phoneOtp"
                        className="text-xs tracking-wide text-white/70"
                      >
                        Phone OTP
                      </label>
                      <div className="mt-1 relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70">
                          <FiClock />
                        </div>
                        <input
                          ref={phoneOtpRef}
                          id="phoneOtp"
                          name="phoneOtp"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={phoneOtp}
                          onChange={(e) =>
                            setPhoneOtp(e.target.value.replace(/[^\d]/g, ""))
                          }
                          className="w-full rounded-xl border bg-black/30 px-10 py-3 outline-none ring-0 border-white/10 focus:border-fuchsia-400/40 tracking-[0.4em] text-center"
                          placeholder="● ● ● ● ● ●"
                        />
                      </div>
                      <p className="mt-2 text-[11px] text-white/60">
                        Codes expire quickly. If it doesn&apos;t arrive, wait a
                        bit and then request a new one.
                      </p>
                    </div>
                  )}

                  <motion.button
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    disabled={loading}
                    type="submit"
                    className="relative w-full overflow-hidden rounded-2xl px-4 py-3 font-semibold disabled:opacity-60"
                  >
                    <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600" />
                    <span className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-violet-400/40 via-fuchsia-400/30 to-sky-400/30 blur-md" />
                    <span className="relative inline-flex items-center justify-center gap-2">
                      {loading && (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
                      )}
                      {loading
                        ? phoneOtpSent
                          ? "Verifying..."
                          : "Sending OTP..."
                        : phoneOtpSent
                        ? "Verify & complete signup"
                        : "Send OTP to phone"}
                    </span>
                  </motion.button>

                  {!fromGoogle && (
                    <button
                      type="button"
                      className="w-full text-xs text-white/60 hover:text-white/90"
                      onClick={() => {
                        setStage("email_password");
                      }}
                    >
                      Go back to password step
                    </button>
                  )}
                </form>
              )}

              {stage !== "phone" && (
                <div className="mt-4 text-xs text-white/50 text-center">
                  By continuing, you agree to our{" "}
                  <Link
                    to="/legal/terms"
                    className="text-fuchsia-300 hover:text-fuchsia-200"
                  >
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="/legal/privacy"
                    className="text-fuchsia-300 hover:text-fuchsia-200"
                  >
                    Privacy Policy
                  </Link>
                  .
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <div className="mt-8 text-center text-white/50 text-xs">
          © {new Date().getFullYear()} Cyphire. All rights reserved.
        </div>
      </div>

      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center"
            role="status"
            aria-live="polite"
          >
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-fuchsia-400 border-t-transparent" />
              <div className="text-white/90">Setting things up…</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
