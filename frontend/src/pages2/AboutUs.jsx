// src/pages/About.jsx
// Immersive, showcase-style "About Us" page for Cyphire
// Extends Home.jsx theme with Aurora, Particles, Timeline, Vision, Map, Testimonials, CTA

import React, { Suspense, useMemo } from "react";
import About1 from "../assets/about1.jpg"
import About2 from "../assets/about2.jpg"
import NavbarSpon from "../components/navbarsponhome.jsx";
import NavbarHome from "../components/navbarhome.jsx";
import Footer from "../components/footer";
import { motion, useMotionValue, useTransform } from "framer-motion";
import {
  GradientText,
  GlassCard,
  NeonButton,
} from "../pages/home.jsx"; // re-use shared exports
import {
  Sparkles,
  Users,
  Globe,
  Target,
  Heart,
  ArrowRight,
  Compass,
  Rocket,
  Star,
  Quote,
} from "lucide-react";

/* ========== Background Components ========== */

const Aurora = ({ className = "" }) => (
  <div className={`absolute inset-0 -z-10 overflow-hidden pointer-events-none ${className}`}>
    <div className="absolute -inset-x-40 -top-40 h-[50rem] bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.05),transparent_60%)]" />
    <div className="absolute inset-x-0 bottom-0 h-[40rem] bg-[radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.05),transparent_60%)]" />
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
          animation: `float${i % 3} ${6 + (i % 5)}s ease-in-out ${i * 0.2}s infinite`,
          opacity: 100,
        }}
      />
    ))}
    <style>{`
      @keyframes float0 { 0%,100%{ transform: translateY(0)} 50%{ transform: translateY(-10px)} }
      @keyframes float1 { 0%,100%{ transform: translateY(0)} 50%{ transform: translateY(-16px)} }
      @keyframes float2 { 0%,100%{ transform: translateY(0)} 50%{ transform: translateY(-22px)} }
    `}</style>
  </div>
);

/* ========== Utilities ========== */

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.7 },
  viewport: { once: true },
});

const TiltCard = ({ children, className = "" }) => {
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rotateX = useTransform(y, [0, 1], [10, -10]);
  const rotateY = useTransform(x, [0, 1], [-12, 12]);

  return (
    <motion.div
      className={`relative group rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        x.set(px);
        y.set(py);
        e.currentTarget.style.setProperty("--x", `${px * 100}%`);
        e.currentTarget.style.setProperty("--y", `${py * 100}%`);
      }}
      onMouseLeave={() => {
        x.set(0.5);
        y.set(0.5);
      }}
    >
      <div
        className="pointer-events-none absolute -inset-24 opacity-0 group-hover:opacity-100 transition duration-500"
        style={{
          background:
            "radial-gradient(600px circle at var(--x,50%) var(--y,50%), rgba(168,85,247,0.18), transparent 35%)",
        }}
      />
      <motion.div
        className="relative rounded-2xl bg-white p-1"
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

/* ========== Content Data ========== */

const values = [
  {
    icon: <Target className="h-6 w-6" />,
    title: "Precision",
    desc: "We prioritize clarity, speed, and excellence so every project runs smoothly from start to end.",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Community",
    desc: "We're Building a trusted network where clients and freelancers grow together through opportunity and collaboration.",
  },
  {
    icon: <Heart className="h-6 w-6" />,
    title: "Integrity",
    desc: "Escrow, transparency, and fairness aren't add-ons , they're built into the foundation of Cyphire",
  },
  {
    icon: <Globe className="h-6 w-6" />,
    title: "Impact",
    desc: "We measure success by helping freelancers and clients succeed, everywhere.",
  },
];

const timeline = [
  {
    year: "2023",
    title: "The Idea",
    desc: "Cyphire began as a vision: a safer, smarter freelance marketplace driven by trust.",
    icon: <Sparkles className="h-5 w-5" />,
  },
  {
    year: "2024",
    title: "Prototype & Early Traction",
    desc: "We launched our MVP, onboarded our first users, and validated escrow-backed collaboration.",
    icon: <Compass className="h-5 w-5" />,
  },
  {
    year: "2025",
    title: "Scaling Up",
    desc: "With refined features, global outreach, and robust infra, Cyphire is scaling worldwide.",
    icon: <Rocket className="h-5 w-5" />,
  },
];

const vision = [
  {
    icon: <Star className="h-6 w-6" />,
    title: "Our Mission",
    desc: "To redefine freelance work by removing barriers of mistrust and inefficiency, ensuring both clients and executors thrive.",
  },
  {
    icon: <Globe className="h-6 w-6" />,
    title: "Our Vision",
    desc: "A truly global ecosystem where collaboration transcends borders, and every project builds confidence in the future of work.",
  },
];

const testimonials = [
  {
    quote:
      "Cyphire is the safest freelance platform we've used. Escrow + milestones = peace of mind.",
    name: "Ananya Gupta",
    role: "Startup Founder",
  },
  {
    quote:
      "As a freelancer, I finally feel protected. Payments are smooth, transparent, and fair.",
    name: "Leo Martins",
    role: "UI/UX Designer",
  },
  {
    quote:
      "The discovery tools are brilliant — I can find the right talent in minutes, not days.",
    name: "Sarah Lee",
    role: "Product Manager",
  },
];

/* ========== Page ========== */

export default function About() {
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-4xl font-bold sm:text-5xl md:text-6xl text-slate-900 tracking-tight"
          >
            <GradientText>About Cyphire</GradientText>
          </motion.h1>
          <motion.p
            {...fadeUp(0.2)}
            className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 leading-relaxed"
          >
            Where trust meets talent — building the future of work, one milestone
            at a time.
          </motion.p>
        </section>

        {/* STORY SECTIONS */}
        <section className="mx-auto max-w-7xl px-6 py-16 space-y-32">
          <motion.div {...fadeUp()} className="grid items-center gap-10 md:grid-cols-2">
            <img
              src={About1}
              alt="Collaboration"
              loading="lazy"
              className="rounded-2xl object-cover w-full h-[28rem]"
            />

            <GlassCard className="p-6 md:p-8 text-lg leading-relaxed text-slate-600">
              Cyphire was born from a simple but powerful belief — that trust and
              talent can redefine collaboration. Traditional marketplaces often
              leave clients anxious and freelancers vulnerable. We’re rewriting that
              story with escrow-secured payments, automated contracts, and a design
              philosophy built on transparency and empowerment.
            </GlassCard>
          </motion.div>

          <motion.div {...fadeUp(0.15)} className="grid items-center gap-10 md:grid-cols-2">
            {/* Text first */}
            {/* Text first */}
            <GlassCard className="order-2 md:order-1 p-6 md:p-8 text-lg leading-relaxed text-slate-600">
              Our mission is to create a global ecosystem where brilliant ideas find
              the right executors in seconds. Whether you’re posting your first task
              or scaling to your hundredth milestone, Cyphire gives you the confidence
              to focus on outcomes, not obstacles.
            </GlassCard>

            {/* Image second */}
            <img
              src={About2}
              alt="Innovation"
              loading="lazy"
              className="order-1 md:order-2 rounded-2xl object-cover w-full h-[28rem]"
            />
          </motion.div>
        </section>

        {/* VALUES */}
        <section className="mx-auto max-w-7xl px-6 py-16">
          <header className="mx-auto mb-12 max-w-2xl text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs text-blue-700 font-medium">
              <Sparkles className="h-4 w-4" aria-hidden="true" /> Our Values
            </div>
            <h2 className="text-3xl font-bold md:text-4xl text-slate-900">
              <GradientText>What drives us</GradientText>
            </h2>
          </header>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 auto-rows-fr">
            {values.map((v, i) => (
              <motion.div key={i} {...fadeUp(i * 0.1)} className="h-full">
                <GlassCard className="p-6 transition hover:scale-[1.03] h-full flex flex-col hover:border-blue-200 hover:shadow-md">
                  <div className="mb-4 text-blue-600">{v.icon}</div>
                  <h3 className="text-lg font-bold text-slate-900">{v.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{v.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>

        </section>

        {/* VISION + MISSION */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-8 md:grid-cols-2">
            {vision.map((v, i) => (
              <motion.div key={i} {...fadeUp(i * 0.2)}>
                <GlassCard className="p-8 h-full transition hover:scale-[1.02] hover:border-blue-200 hover:shadow-md">
                  <div className="mb-5 text-blue-600">{v.icon}</div>
                  <h3 className="text-xl font-bold text-slate-900">{v.title}</h3>
                  <p className="mt-3 text-slate-600 leading-relaxed">{v.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* TIMELINE */}
        <section className="mx-auto max-w-5xl px-6 py-20">
          <header className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold md:text-4xl text-slate-900">
              <GradientText>Our Journey</GradientText>
            </h2>
            <p className="mt-4 text-slate-600">
              From a spark of an idea to a growing global platform.
            </p>
          </header>
          <div className="relative border-l border-slate-200 pl-10 space-y-12">
            {timeline.map((step, i) => (
              <motion.div
                key={i}
                {...fadeUp(i * 0.1)}
                className="relative flex items-start"
              >
                {/* Circle */}
                <div className="absolute -left-5 top-1 flex h-10 w-10 items-center justify-center 
                      rounded-full border border-blue-100 bg-blue-50 text-blue-600 shadow-sm">
                  {step.icon}
                </div>

                {/* Text block */}
                <div className="ml-12">  {/* 👈 This margin fixes overlap */}
                  <h3 className="text-xl font-bold text-slate-900">
                    {step.year} — {step.title}
                  </h3>
                  <p className="mt-2 text-slate-600">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

        </section>

        {/* GLOBAL MAP MOCKUP */}
        <section className="relative mx-auto max-w-6xl px-6 py-20">
          <div className="absolute inset-0 -z-10 bg-[url('/images/about/world-map-dark.png')] bg-cover bg-center opacity-10" style={{ filter: 'invert(1)' }} />
          <div className="relative rounded-3xl border border-slate-200 bg-white/50 p-8 backdrop-blur-sm shadow-sm">
            <h2 className="text-3xl font-bold text-center">
              <GradientText>Global Reach</GradientText>
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-center text-white/70">
              Cyphire empowers clients and freelancers across continents. Our
              platform is designed for scale — secure, fast, and borderless.
            </p>
            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6">
              {["India", "USA", "Europe", "Asia-Pacific"].map((region, i) => (
                <GlassCard key={i} className="p-6 text-center shadow-sm">
                  <h4 className="font-bold text-slate-900">{region}</h4>
                  <p className="mt-2 text-sm text-slate-500">Growing presence</p>
                </GlassCard>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIAL SLIDER */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-bold text-center md:text-4xl text-slate-900">
            <GradientText>What People Say</GradientText>
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div key={i} {...fadeUp(i * 0.2)}>
                <GlassCard className="p-6 h-full flex flex-col justify-between hover:shadow-md transition-all">
                  <Quote className="h-6 w-6 text-blue-300 mb-4" />
                  <p className="text-slate-700 italic">“{t.quote}”</p>
                  <div className="mt-6">
                    <div className="font-bold text-slate-900">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.role}</div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="relative mx-auto max-w-6xl px-6 py-20">
          <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-sky-500/10 blur-2xl opacity-70" />
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 md:p-12 shadow-md">
            <div className="flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl text-slate-900">
                <h3 className="text-2xl font-bold md:text-3xl text-slate-900">
                  <GradientText>Join us on this journey</GradientText>
                </h3>
                <p className="mt-3 text-slate-600 leading-relaxed">
                  Be part of a platform where trust meets talent. Explore open
                  roles, partnerships, or start collaborating today.
                </p>
              </div>
              <NeonButton onClick={() => (window.location.href = "/join-us")}>
                Explore Careers <ArrowRight className="h-4 w-4" />
              </NeonButton>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
}