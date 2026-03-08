// src/pages/ChooseMode.jsx
import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Megaphone, GraduationCap, ArrowRight, ArrowLeft, LogIn, HelpCircle, Sun, Moon, Sunrise, Sunset } from "lucide-react";
import brandQuotes from "../config/brandQuotes";
import { springSoft, pageFadeSlide } from "../config/motionTokens";
import useMicroFeedback from "../hooks/useMicroFeedback";
import FullscreenLoader from "../components/FullscreenLoader";


// Lazy-load components for smaller initial bundle
const ActionTile = lazy(() => import("../components/ActionTile"));
const MotionLogo = lazy(() => import("../components/MotionLogo"));

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:5000";
// --- time-based greeting helpers ---
function partOfDay(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "evening";
}
function greetingLabel(pod) {
  switch (pod) {
    case "morning": return "Good morning";
    case "afternoon": return "Good afternoon";
    case "evening": return "Good evening";
    default: return "Good Evening";
  }
}
function firstNameOnly(str = "") {
  return String(str).trim().split(" ")[0] || str;
}


export default function ChooseMode() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qIndex, setQIndex] = useState(0);
  const [smallBlurPx, setSmallBlurPx] = useState(24);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [hoverNone, setHoverNone] = useState(false);
  const [exitingTo, setExitingTo] = useState(null); // for route exit animation
  const clickFeedback = useMicroFeedback();
  const [showLoader, setShowLoader] = useState(false);


  // ===== Prefers reduced motion =====
  useEffect(() => {
    const mq = window?.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const apply = () => setReduceMotion(!!mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    mq.addListener?.(apply);
    return () => {
      mq.removeEventListener?.("change", apply);
      mq.removeListener?.(apply);
    };
  }, []);

  // ===== Hover availability (touch) =====
  useEffect(() => {
    const mq = window?.matchMedia?.("(hover: none)");
    if (!mq) return;
    const set = () => setHoverNone(!!mq.matches);
    set();
    mq.addEventListener?.("change", set);
    mq.addListener?.(set);
    return () => {
      mq.removeEventListener?.("change", set);
      mq.removeListener?.(set);
    };
  }, []);

  // ===== Blur scaling for tiny devices (perf) =====
  useEffect(() => {
    const mq = window?.matchMedia?.("(max-width: 420px)");
    if (!mq) return;
    const set = () => setSmallBlurPx(mq.matches ? 14 : 24);
    set();
    mq.addEventListener?.("change", set);
    mq.addListener?.(set);
    return () => {
      mq.removeEventListener?.("change", set);
      mq.removeListener?.(set);
    };
  }, []);

  // ===== Auth (read-only) =====
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include", cache: "no-store" });
        const json = res.ok ? await res.json() : {};
        if (!alive) return;
        setMe(json?.user || null);
      } catch {
        // not signed in is okay here
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // ===== Hidden keyboard shortcuts (no UI mention) =====
  useEffect(() => {
    const onKey = (e) => {
      if (e?.metaKey || e?.ctrlKey || e?.altKey) return;
      const t = e?.target;
      if (t?.closest?.('[contenteditable="true"]') || ["INPUT", "TEXTAREA", "SELECT"].includes(t?.tagName)) return;
      const k = e?.key?.toLowerCase?.();
      if (k === "1") startExit("/home");
      if (k === "2") startExit("/sponsorship-mode");
      if (k === "3") startExit("/intellectuals");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ===== Quotes rotation (brand voice) =====
  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setQIndex((i) => (i + 1) % brandQuotes.length), 3000);
    return () => clearInterval(id);
  }, [reduceMotion]);

  const [greetState, setGreetState] = useState(() => {
    const pod = partOfDay();
    return { pod, label: greetingLabel(pod) };
  });
  useEffect(() => {
    const update = () => {
      const pod = partOfDay();
      setGreetState({ pod, label: greetingLabel(pod) });
    };
    update();
    const id = setInterval(update, 60 * 1000); // refresh each minute
    return () => clearInterval(id);
  }, []);


  // ===== Optional route prefetch (replace with real module paths) =====
  const prefetchHome = () => { try { /* import("../home/Home.jsx") */ } catch { } };
  const prefetchSponsor = () => { try { /* import("../sponsorship/SponsorshipHome.jsx") */ } catch { } };
  const prefetchIntellectuals = () => { try { /* import("../intellectuals/Intellectuals.jsx") */ } catch { } };

  // ===== Idle prefetch for faster perceived nav + assets prefetch =====
  useEffect(() => {
    const idle = (cb) => ("requestIdleCallback" in window ? window.requestIdleCallback(cb) : setTimeout(cb, 300));
    idle(() => {
      prefetchHome?.();
      prefetchSponsor?.();

      // low-priority asset prefetch (gradients/icons are mostly inline, but pattern stays)
      try {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.as = "image";
        link.href = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLz4="; // tiny placeholder
        document.head.appendChild(link);
      } catch { }
    });
  }, []);

  // ===== Page exit animation before navigate =====
  const containerRef = useRef(null);
  const startExit = (path) => {
    clickFeedback();            // your micro haptic/sound
    setShowLoader(true);        // show loader immediately
    setExitingTo(path);         // keep your existing exit flow
  };

  const handleAnimationComplete = () => {
    if (exitingTo) navigate(exitingTo);
  };

  // ===== Tooltip toggle (for "Choose your mode") =====
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <AnimatePresence >
      <FullscreenLoader visible={showLoader} label="Preparing your workspace…" />
      <motion.main
        key="choose-mode"
        className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans"
        variants={pageFadeSlide}
        initial="initial"
        animate={exitingTo ? "exit" : "animate"}
        onAnimationComplete={handleAnimationComplete}
        ref={containerRef}
      >
        {/* Subtle top light gradient */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-[40vh] bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.08),transparent_60%)]" />
        </div>

        {/* Top header bar — brand left, greeting right (no Back button) */}
        <div className="relative z-20 flex w-full items-start justify-between px-8 pt-8">
          {/* Cyphire brand (bigger, gradient, clickable) */}
          <React.Suspense fallback={<div className="h-8 w-32 rounded bg-white/10" />}>
            <MotionLogo onClick={() => navigate("/")} />
          </React.Suspense>

          {/* Greeting capsule (refined light mode) */}
          <div className="relative">
            <div
              className={[
                "relative z-10 flex items-center gap-3 rounded-full",
                "border border-slate-200 bg-white shadow-sm",
                "px-4 py-2 ring-1 ring-slate-100",
                "transition-all duration-300 hover:shadow-md hover:ring-blue-100",
              ].join(" ")}
            >
              {/* glowing orb icon (subtle blue) */}
              <div className="relative grid h-6 w-6 place-items-center rounded-full border border-blue-100 bg-blue-50 overflow-hidden">
                <span className="relative h-2.5 w-2.5 rounded-full bg-blue-500 shadow-sm" aria-hidden="true" />
              </div>

              {/* greeting text */}
              <div className="hidden sm:block text-sm font-medium text-slate-700 tracking-wide">
                {`${greetState.label}, ${firstNameOnly(me?.name || me?.username || "there")}`}{" "}
                <span aria-hidden>👋</span>
              </div>

            </div>
          </div>

        </div>


        {/* Hero + rest of page content scaled to ~110% (header unchanged) */}
        <div className="origin-top scale-[1]">
          {/* Hero */}
          <section className="relative z-20 mx-auto max-w-6xl px-6 pt-10 overflow-hidden">
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-[clamp(2.5rem,5vw,3.5rem)] font-sans font-extrabold tracking-tight text-slate-900"
            >
              Choose your{" "}
              <span className="text-blue-600">
                mode
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.05 }}
              className="mt-4 max-w-2xl text-lg text-slate-600 leading-relaxed"
            >
              Three focused paths. No clutter. Decide and dive in.
            </motion.p>

            {/* Soft tagline below hero */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="mt-3 text-slate-500 font-medium"
            >
              <span className="text-sm">Empowering creators with certainty.</span>
            </motion.div>

            {/* Tiles */}
            {/* <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3"> */}
            <div className="mt-10 grid grid-cols-1 gap-1 md:grid-cols-2 justify-center place-items-center">
              <Suspense fallback={<SkeletonTile />}>
                <ActionTile
                  icon={Briefcase}
                  title="Freelance Marketplace"
                  desc="Explore briefs, apply fast, and work with confidence."
                  bullets={[
                    "Live tasks with escrow",
                    "One-click proposals",
                    "Verified clients",
                  ]}
                  onPress={() => startExit("/home")}
                  onHoverPrefetch={prefetchHome}
                  gradient="from-blue-100/50 via-slate-50 to-white"
                  reduceMotion={reduceMotion}
                  smallBlurPx={smallBlurPx}
                  hoverNone={hoverNone}
                  describedById="tile-1-desc"
                />
              </Suspense>

              <Suspense fallback={<SkeletonTile />}>
                <ActionTile
                  icon={Megaphone}
                  title="Sponsorship Marketplace"
                  desc="Find brand partners or list your events effortlessly."
                  bullets={[
                    "Qualified brand leads",
                    "Fast outreach tools",
                    "Clear deliverables",
                  ]}
                  onPress={() => startExit("/sponsorship-mode")}
                  onHoverPrefetch={prefetchSponsor}
                  gradient="from-blue-100/50 via-slate-50 to-white"
                  reduceMotion={reduceMotion}
                  smallBlurPx={smallBlurPx}
                  hoverNone={hoverNone}
                  describedById="tile-2-desc"
                />
              </Suspense>

              {/* NEW — Intellectual Mind */}
              {/* <Suspense fallback={<SkeletonTile />}>
                <ActionTile
                  icon={GraduationCap}
                  title="Intellectual Mind"
                  desc="Invite professors, experts, or creators for talks, workshops, and mentoring."
                  bullets={[
                    "Verified profiles & badges",
                    "Escrow-protected sessions",
                    "Smart scheduling"
                  ]}
                  onPress={() => startExit("/intellectuals")}  // TODO: change to /intellectuals when page is ready
      onHoverPrefetch={prefetchIntellectuals}
      gradient="from-emerald-600/25 via-teal-600/10 to-cyan-500/20"
      reduceMotion={reduceMotion}
      smallBlurPx={smallBlurPx}
      hoverNone={hoverNone}
      describedById="tile-3-desc"
      indexForAsymmetry={2}
    />
  </Suspense>
*/}
            </div>
          </section>

          {/* Inspirational brand quote section */}
          <section className="relative z-20 mx-auto mt-12 max-w-6xl px-6 pb-24">
            <div className="border-t border-slate-200 pt-10">
              <div
                className="relative mx-auto max-w-3xl text-center"
                style={{ contentVisibility: "auto", containIntrinsicSize: "250px" }}
              >
                <div aria-live="polite" className="relative h-[4.5rem] md:h-[2rem]">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.blockquote
                      key={qIndex}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                      className="absolute inset-0 flex items-center justify-center text-balance text-2xl font-medium leading-relaxed text-slate-700 md:text-3xl italic"
                    >
                      “{brandQuotes[qIndex]}”
                    </motion.blockquote>
                  </AnimatePresence>
                </div>

                <div className="mx-auto mt-6 h-px w-24 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                <div className="mt-3 text-sm text-slate-500">Designed with care • Cyphire</div>
              </div>
            </div>
          </section>
        </div>


        {/* Bottom ambient */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[18rem] bg-[radial-gradient(ellipse_at_bottom,rgba(59,130,246,0.05),transparent_60%)]" />
      </motion.main>
    </AnimatePresence>
  );
}

/** Skeleton while lazy tiles load */
function SkeletonTile() {
  return (
    <div className="h-[220px] rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="h-5 w-24 rounded bg-slate-100" />
      <div className="mt-4 h-4 w-48 rounded bg-slate-100" />
      <div className="mt-2 h-4 w-40 rounded bg-slate-100" />
      <div className="mt-6 h-4 w-24 rounded bg-slate-100" />
    </div>
  );
}
