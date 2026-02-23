// src/pages/HowItWorks.jsx
// Immersive "How It Works" page for Cyphire
// Premium design: Aurora + Particles, Framer Motion, GradientText, GlassCard, NeonButton
// Sections: Hero, Client Flow, Freelancer Flow, Comparison, FAQ, Trust, Global, CTA

import React, { Suspense, useState, useMemo } from "react";
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
  Sparkles,
  Users,
  CheckCircle2,
  MessageSquare,
  Wallet,
  Clock,
  Gavel,
  ShieldCheck,
  Globe,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Heart,
  Target,
  Rocket,
} from "lucide-react";

/* ========== Backgrounds ========== */
const Aurora = () => (
  <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
    <div className="absolute -inset-x-40 -top-40 h-[50rem] bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.05),transparent_60%)]" />
    <div className="absolute -inset-x-20 -top-20 h-[50rem] bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.05),transparent_60%)]" />
    <div className="absolute inset-x-0 bottom-0 h-[40rem] bg-[radial-gradient(ellipse_at_bottom,rgba(14,165,233,0.05),transparent_60%)]" />
  </div>
);

const Particles = () => (
  <div className="pointer-events-none absolute inset-0 -z-10">
    {Array.from({ length: 40 }).map((_, i) => (
      <span
        key={i}
        className="absolute h-1 w-1 rounded-full bg-slate-300/40"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animation: `float${i % 3} ${6 + (i % 5)}s ease-in-out ${i * 0.2}s infinite`,
          opacity: 0.8,
        }}
      />
    ))}
    <style>{`
      @keyframes float0 {0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
      @keyframes float1 {0%,100%{transform:translateY(0)}50%{transform:translateY(-18px)}}
      @keyframes float2 {0%,100%{transform:translateY(0)}50%{transform:translateY(-24px)}}
    `}</style>
  </div>
);

/* ========== Animation Utils ========== */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.7, ease: "easeOut" },
  viewport: { once: true },
});

/* ========== Content Data ========== */
const clientSteps = [
  {
    icon: <Sparkles className="h-7 w-7" />,
    title: "Post a Task",
    desc: "Share what you need done — from building websites to creative design. Set your budget and deadline with clarity.",
  },
  {
    icon: <Users className="h-7 w-7" />,
    title: "Receive Applications",
    desc: "Talented freelancers review your task and apply. You’re in control of how many applications are allowed.",
  },
  {
    icon: <CheckCircle2 className="h-7 w-7" />,
    title: "Choose Your Match",
    desc: "Browse applicants, explore their profiles, and select the freelancer who fits your project best.",
  },
  {
    icon: <MessageSquare className="h-7 w-7" />,
    title: "Collaborate in a Workroom",
    desc: "A secure space opens for you and your freelancer to chat, share updates, and stay aligned.",
  },
  {
    icon: <Wallet className="h-7 w-7" />,
    title: "Finalize Together",
    desc: "Once you’re satisfied and both sides agree, the project is finalized and the freelancer gets paid seamlessly.",
  },
];

const freelancerSteps = [
  {
    icon: <Users className="h-7 w-7" />,
    title: "Discover Tasks",
    desc: "Browse open opportunities that match your skills, budget expectations, and timeline.",
  },
  {
    icon: <Target className="h-7 w-7" />,
    title: "Apply Confidently",
    desc: "When you find a project you can deliver, apply with your profile and experience.",
  },
  {
    icon: <CheckCircle2 className="h-7 w-7" />,
    title: "Get Selected",
    desc: "If the client selects you, a dedicated workroom opens for secure communication and project tracking.",
  },
  {
    icon: <MessageSquare className="h-7 w-7" />,
    title: "Deliver with Transparency",
    desc: "Share progress updates, milestones, and drafts inside the workroom to keep everything crystal clear.",
  },
  {
    icon: <Wallet className="h-7 w-7" />,
    title: "Finalize & Earn",
    desc: "When both sides finalize, payment is released to you instantly and securely.",
  },
];

const comparison = [
  {
    for: "Clients",
    benefits: [
      "Post tasks in minutes",
      "Predefined budgets & deadlines",
      "Access to global talent",
      "Secure workroom collaboration",
      "Finalize only when satisfied",
    ],
  },
  {
    for: "Freelancers",
    benefits: [
      "Browse relevant tasks",
      "Apply to projects you value",
      "Protected work environment",
      "Clear communication with clients",
      "Instant payout on finalization",
    ],
  },
];

const faqs = [
  {
    q: "How long is a task listed?",
    a: "Each task remains live for up to 7 days, ensuring freshness and urgency in applications.",
  },
  {
    q: "What if no one applies?",
    a: "If no freelancer applies, the task simply expires. You can always repost or adjust your details.",
  },
  {
    q: "What happens if work isn’t satisfactory?",
    a: "In rare cases of disputes, our team reviews workroom activity and chats to make a fair decision.",
  },
  {
    q: "Can clients and freelancers connect outside Cyphire?",
    a: "For safety and fairness, all collaboration must happen on Cyphire. External dealings violate our terms.",
  },
];

/* ========== Page ========== */
export default function HowItWorks() {
  const [openFAQ, setOpenFAQ] = useState(null);
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
            <GradientText>How It Works</GradientText>
          </motion.h1>
          <motion.p
            {...fadeUp(0.2)}
            className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 leading-relaxed"
          >
            Simple, secure, and transparent — whether you’re posting a task or
            completing one, Cyphire makes collaboration effortless.
          </motion.p>
        </section>

        {/* CLIENT JOURNEY */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <header className="text-center mb-14">
            <h2 className="text-3xl font-bold md:text-4xl text-slate-900">
              <GradientText>For Clients</GradientText>
            </h2>
            <p className="mt-3 text-slate-600">
              From idea to completion — here’s your journey.
            </p>
          </header>
          <div className="relative border-l border-slate-200 pl-10 space-y-12">
            {clientSteps.map((step, i) => (
              <motion.div
                key={i}
                {...fadeUp(i * 0.15)}
                className="relative flex items-start"
              >
                {/* Icon circle */}
                <div className="absolute -left-6 top-1 flex h-10 w-10 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-600 shadow-sm">
                  {step.icon}
                </div>
                {/* Text */}
                <div className="ml-8">
                  <h3 className="text-xl font-bold text-slate-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-slate-600 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FREELANCER JOURNEY */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <header className="text-center mb-14">
            <h2 className="text-3xl font-bold md:text-4xl text-slate-900">
              <GradientText>For Freelancers</GradientText>
            </h2>
            <p className="mt-3 text-slate-600">
              Your path from opportunity to reward.
            </p>
          </header>
          <div className="grid gap-8 md:grid-cols-2">
            {freelancerSteps.map((step, i) => (
              <motion.div
                key={i}
                {...fadeUp(i * 0.2)}
                className="h-full flex"
              >
                <GlassCard className="p-6 flex flex-col gap-3 w-full transition hover:scale-[1.03] hover:shadow-md border-slate-200 bg-white hover:border-blue-200">
                  <div className="text-blue-600">{step.icon}</div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* COMPARISON GRID */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <header className="text-center mb-12">
            <h2 className="text-3xl font-bold md:text-4xl text-slate-900">
              <GradientText>At a Glance</GradientText>
            </h2>
            <p className="mt-3 text-slate-600">
              How Cyphire empowers both sides of the marketplace.
            </p>
          </header>
          <div className="grid gap-8 md:grid-cols-2">
            {comparison.map((col, i) => (
              <motion.div key={i} {...fadeUp(i * 0.2)}>
                <GlassCard className="p-8 h-full transition hover:scale-[1.02] border-slate-200 bg-white shadow-md">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">
                    {col.for}
                  </h3>
                  <ul className="space-y-2">
                    {col.benefits.map((b, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-2 text-sm text-slate-600"
                      >
                        <CheckCircle2 className="h-4 w-4 text-blue-500" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <header className="text-center mb-12">
            <h2 className="text-3xl font-bold md:text-4xl text-slate-900">
              <GradientText>FAQs</GradientText>
            </h2>
            <p className="mt-3 text-slate-600">
              Answers to common questions about how Cyphire works.
            </p>
          </header>
          <div className="space-y-4">
            {faqs.map((f, i) => (
              <motion.div key={i} {...fadeUp(i * 0.1)}>
                <GlassCard className="overflow-hidden border-slate-200 bg-white shadow-sm hover:border-blue-200">
                  <button
                    className="flex w-full items-center justify-between px-6 py-4 text-left text-slate-900 font-bold"
                    onClick={() => setOpenFAQ(openFAQ === i ? null : i)}
                  >
                    {f.q}
                    {openFAQ === i ? (
                      <ChevronUp className="h-5 w-5 text-blue-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-blue-500" />
                    )}
                  </button>
                  {openFAQ === i && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.3 }}
                      className="px-6 pb-4 text-sm text-slate-600 leading-relaxed"
                    >
                      {f.a}
                    </motion.div>
                  )}
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* TRUST SECTION */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <header className="text-center mb-12">
            <h2 className="text-3xl font-bold md:text-4xl text-slate-900">
              <GradientText>Why Cyphire</GradientText>
            </h2>
            <p className="mt-3 text-slate-600">
              We’ve designed every detail to make collaboration seamless and safe.
            </p>
          </header>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: <ShieldCheck className="h-8 w-8 text-blue-600" />,
                title: "Trusted Platform",
                desc: "Built with transparency and accountability at its core.",
              },
              {
                icon: <Clock className="h-8 w-8 text-blue-600" />,
                title: "Time Bound",
                desc: "Tasks run with clear deadlines to ensure progress never stalls.",
              },
              {
                icon: <Heart className="h-8 w-8 text-blue-600" />,
                title: "People First",
                desc: "Everything we do is designed to empower clients and freelancers alike.",
              },
            ].map((item, i) => (
              <motion.div key={i} {...fadeUp(i * 0.2)}>
                <GlassCard className="p-8 h-full transition hover:scale-[1.02] text-center border-slate-200 bg-white shadow-md hover:shadow-lg">
                  <div className="mb-4 flex justify-center">{item.icon}</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* GLOBAL */}
        <section className="relative mx-auto max-w-6xl px-6 py-20">
          <div className="absolute inset-0 -z-10 bg-[url('/images/about/world-map-dark.png')] bg-cover bg-center opacity-10" style={{ filter: 'invert(1)' }} />
          <div className="relative rounded-3xl border border-slate-200 bg-white/50 p-8 backdrop-blur-sm shadow-sm">
            <h2 className="text-3xl font-bold text-center text-slate-900">
              <GradientText>Global Collaboration</GradientText>
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-center text-slate-600">
              Cyphire brings together individuals and companies across the world,
              unlocking talent and opportunities without borders.
            </p>
            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6">
              {["India", "USA", "Europe", "Asia-Pacific"].map((region, i) => (
                <GlassCard key={i} className="p-6 text-center border-slate-200 bg-white shadow-sm">
                  <h4 className="font-bold text-slate-900">{region}</h4>
                  <p className="mt-2 text-sm text-slate-500">Growing presence</p>
                </GlassCard>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative mx-auto max-w-6xl px-6 py-20">
          <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-sky-500/10 blur-2xl opacity-70" />
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 md:p-12 shadow-md">
            <div className="flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <h3 className="text-2xl font-bold md:text-3xl text-slate-900">
                  <GradientText>Ready to Get Started?</GradientText>
                </h3>
                <p className="mt-3 text-slate-600">
                  Join Cyphire today and experience a better way to collaborate —
                  simple, transparent, and rewarding.
                </p>
              </div>
              <NeonButton onClick={() => (window.location.href = "/join-us")}>
                Start Now <ArrowRight className="h-4 w-4" />
              </NeonButton>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
}
