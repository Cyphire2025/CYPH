// src/components/ActionTile.jsx
import React, { useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { listStagger, itemFadeUp, springSoft } from "../config/motionTokens";

/**
 * Lightweight “pre-blurred” gloss overlay using an SVG gradient (no runtime blur()).
 * It’s cheap on low-end GPUs compared to CSS filter: blur().
 */
function GlossOverlay({ small }) {
  return (
    <div className="pointer-events-none absolute inset-0 rounded-3xl [mask-image:linear-gradient(to_bottom,black,black,transparent)]">
      <svg
        className="absolute -top-24 left-0 right-0"
        width="100%"
        height={small ? 96 : 128}
        viewBox={`0 0 100 ${small ? 30 : 40}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="rgba(0,0,0,0.03)" />
            <stop offset="1" stopColor="rgba(0,0,0,0.00)" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="100" height={small ? 30 : 40} fill="url(#g)" />
      </svg>
    </div>
  );
}

export default function ActionTile({
  icon: Icon,
  title,
  desc,
  bullets,
  onPress,
  onHoverPrefetch,
  gradient,
  reduceMotion,
  smallBlurPx, // kept for API compat; not used now that gloss is SVG
  hoverNone,
  describedById,
  indexForAsymmetry = 0,
}) {
  const tileRef = useRef(null);

  return (
    <motion.button
      ref={tileRef}
      role="button"
      onClick={onPress}
      onMouseEnter={() => onHoverPrefetch?.()}
      onFocus={() => onHoverPrefetch?.()}
      whileHover={reduceMotion || hoverNone ? undefined : { y: -6, scale: 1.01 }}
      whileTap={reduceMotion || hoverNone ? undefined : { scale: 0.985 }}
      transition={springSoft}
      /* asymmetry: second tile offset on desktop for visual rhythm */
      className={[
        "group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl",
        "border border-slate-200 bg-white p-6 text-left transition shadow-sm hover:shadow-md",
        "transform-gpu will-change-transform will-change-opacity focus:outline-none",
        "focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        "md:shadow-sm",
        "lg:shadow-md",
        indexForAsymmetry === 1 ? "md:translate-y-2 lg:translate-y-3" : "",
      ].join(" ")}
      aria-label={title}
      aria-describedby={describedById}
    >
      {/* Aura frame */}
      <div
        className={`pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-br ${gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
        aria-hidden="true"
      />

      {/* Inner glass stroke for premium definition */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-slate-100" aria-hidden="true" />

      {/* Top gloss — SVG (no blur()) */}
      <GlossOverlay small={smallBlurPx <= 14} />

      {/* Corner accent */}
      <div className="pointer-events-none absolute right-4 top-4 h-10 w-10 rounded-full bg-white/8 blur-xl opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />

      {/* Content */}
      <div className="relative z-10 text-left">
        <div className="mb-4 inline-flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-blue-100 bg-blue-50">
            <Icon className="h-6 w-6 text-blue-600" aria-hidden="true" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        </div>
        <p id={describedById} className="max-w-[48ch] text-slate-600">{desc}</p>
        {Array.isArray(bullets) && bullets.length > 0 && (
          <motion.ul className="mt-4 grid gap-2 text-sm text-slate-500" variants={listStagger} initial="hidden" animate="show">
            {bullets.map((b, i) => (
              <motion.li key={i} variants={itemFadeUp} className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-500" aria-hidden="true" /> {b}
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>

      <div className="relative z-10 mt-6 inline-flex items-center gap-2 text-sm text-blue-700 font-medium group-hover:text-blue-800">
        Go <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </div>

      {/* Click ripple */}
      <span
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-[opacity] duration-500 group-active:opacity-20"
        style={{ background: "radial-gradient(circle at var(--x,50%) var(--y,50%), rgba(255,255,255,0.35), transparent 40%)" }}
        aria-hidden="true"
      />
    </motion.button>
  );
}
