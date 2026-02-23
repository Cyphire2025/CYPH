// src/pages/JoinUs.jsx
// Detailed Join Us Page for Cyphire
// For now, shows "not hiring" but still premium and professional

import React, { Suspense, useMemo } from "react";
import NavbarSpon from "../components/navbarsponhome.jsx";
import NavbarHome from "../components/navbarhome.jsx";
import Footer from "../components/footer";
import { motion } from "framer-motion";
import {
  GradientText,
  GlassCard,
  NeonButton,
} from "../pages/home.jsx"; // re-use shared exports
import {
  Users,
  Sparkles,
  Heart,
  Globe,
  Coffee,
  Laptop,
  ArrowRight,
  Smile,
} from "lucide-react";

/* ===== Background ===== */

const Aurora = () => (
  <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
    <div className="absolute -inset-x-40 -top-40 h-[50rem] bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.05),transparent_60%)]" />
    <div className="absolute -inset-x-20 -top-20 h-[50rem] bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.05),transparent_60%)]" />
    <div className="absolute inset-x-0 bottom-0 h-[40rem] bg-[radial-gradient(ellipse_at_bottom,rgba(14,165,233,0.05),transparent_60%)]" />
  </div>
);

const Particles = () => (
  <div className="pointer-events-none absolute inset-0 -z-10">
    {Array.from({ length: 30 }).map((_, i) => (
      <span
        key={i}
        className="absolute h-1 w-1 rounded-full bg-slate-300/40"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animation: `float${i % 3} ${6 + (i % 5)}s ease-in-out ${i * 0.15}s infinite`,
          opacity: 0.6,
        }}
      />
    ))}
    <style>{`
      @keyframes float0 { 0%,100%{ transform: translateY(0)} 50%{ transform: translateY(-12px)} }
      @keyframes float1 { 0%,100%{ transform: translateY(0)} 50%{ transform: translateY(-18px)} }
      @keyframes float2 { 0%,100%{ transform: translateY(0)} 50%{ transform: translateY(-24px)} }
    `}</style>
  </div>
);

/* ===== Anim Utils ===== */

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.8, ease: "easeOut" },
  viewport: { once: true },
});

/* ===== Content ===== */

const perks = [
  {
    icon: <Laptop className="h-6 w-6" />,
    title: "Remote-First",
    desc: "Work from anywhere in the world with async-first collaboration.",
  },
  {
    icon: <Coffee className="h-6 w-6" />,
    title: "Healthy Balance",
    desc: "We respect work-life harmony — focus when you work, rest when you don’t.",
  },
  {
    icon: <Heart className="h-6 w-6" />,
    title: "Inclusive Culture",
    desc: "Diversity, empathy, and respect aren’t extras — they’re foundations.",
  },
  {
    icon: <Globe className="h-6 w-6" />,
    title: "Global Impact",
    desc: "Your work here scales across borders, empowering millions worldwide.",
  },
];

export default function JoinUs() {
  const Nav = useMemo(() => {
    const last = sessionStorage.getItem("lastHomeRoute");
    return last === "/sponsorshiphome" ? NavbarSpon : NavbarHome;
  }, []);
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden font-sans">
      <main className="relative overflow-hidden">
        <Suspense fallback={<div className="text-center p-6">Loading...</div>}>
          <Nav />
          <Aurora />
          <Particles />
        </Suspense>

        {/* HERO */}
        <section className="relative mx-auto max-w-6xl px-6 pt-28 pb-20 text-center">
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="text-4xl font-bold sm:text-5xl md:text-6xl text-slate-900 tracking-tight"
          >
            <GradientText>Join Us</GradientText>
          </motion.h1>
          <motion.p
            {...fadeUp(0.3)}
            className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 leading-relaxed"
          >
            At Cyphire, we’re reimagining how the world works together.
            But right now — we’re not hiring. Stay tuned!
          </motion.p>
        </section>

        {/* NOT HIRING NOTICE */}
        <section className="mx-auto max-w-4xl px-6 py-16">
          <GlassCard className="p-8 text-center border-slate-200 bg-white shadow-md">
            <Sparkles className="mx-auto h-8 w-8 text-blue-500 mb-4" />
            <h3 className="text-2xl font-bold text-slate-900">
              We’re not hiring at the moment
            </h3>
            <p className="mt-3 text-slate-600">
              Our team is small, focused, and fully staffed.
              But Cyphire is growing fast — new roles will open soon.
            </p>
            <div className="mt-6">
              <NeonButton onClick={() => (window.location.href = "/home")}>
                Back to Home <ArrowRight className="h-4 w-4" />
              </NeonButton>
            </div>
          </GlassCard>
        </section>

        {/* CULTURE HIGHLIGHTS */}
        <section className="mx-auto max-w-6xl px-6 py-20 space-y-20">
          <motion.div {...fadeUp(0.1)} className="grid md:grid-cols-2 gap-12 items-center">
            <img src="/images/team/culture1.jpg" alt="Culture" className="rounded-2xl w-full h-[26rem] object-cover" />
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Collaboration First</h3>
              <p className="mt-4 text-slate-600 leading-relaxed">
                Even though we’re not hiring right now, collaboration drives everything we do.
                We blend engineering, design, and strategy seamlessly.
              </p>
            </div>
          </motion.div>

          <motion.div {...fadeUp(0.2)} className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Remote by DNA</h3>
              <p className="mt-4 text-slate-600 leading-relaxed">
                Our remote-first culture means talent comes from everywhere.
                Future hires will join a truly global workplace.
              </p>
            </div>
            <img src="/images/team/culture2.jpg" alt="Remote" className="rounded-2xl w-full h-[26rem] object-cover" />
          </motion.div>
        </section>

        {/* PERKS (WHY JOIN LATER) */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-bold text-center md:text-4xl text-slate-900">
            <GradientText>Why Join Cyphire?</GradientText>
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {perks.map((p, i) => (
              <motion.div key={i} {...fadeUp(i * 0.2)}>
                <GlassCard className="p-6 text-center transition hover:scale-[1.05] hover:shadow-md hover:border-blue-200">
                  <div className="mb-4 flex justify-center text-blue-600">{p.icon}</div>
                  <h3 className="text-lg font-bold text-slate-900">{p.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{p.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="relative mx-auto max-w-6xl px-6 py-20">
          <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-sky-500/10 blur-2xl opacity-70" />
          <GlassCard className="p-12 text-center border-slate-200 bg-white shadow-md">
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900">
              <GradientText>Stay in the Loop</GradientText>
            </h3>
            <p className="mt-4 text-slate-600">
              We’ll announce new roles soon.
              Follow us, subscribe, or check back regularly to be the first to know.
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <NeonButton>Follow on LinkedIn</NeonButton>
              <NeonButton>Subscribe to Updates</NeonButton>
            </div>
          </GlassCard>
        </section>

        <Footer />
      </main>
    </div>
  );
}
