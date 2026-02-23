import React, { Suspense, useState, useMemo } from "react";
import NavbarSpon from "../components/navbarsponhome.jsx";
import NavbarHome from "../components/navbarhome.jsx";
import Footer from "../components/footer";
import { motion } from "framer-motion";
import {
  GradientText,
  GlassCard,
  NeonButton,
} from "../pages/home.jsx";
import {
  CheckCircle2,
  XCircle,
  Zap,
  Shield,
  Globe,
  Star,
  ArrowRight,
  ChevronDown,
  ChevronUp,
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
    {Array.from({ length: 30 }).map((_, i) => (
      <span
        key={i}
        className="absolute h-1 w-1 rounded-full bg-slate-300/40"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animation: `float${i % 3} ${6 + (i % 5)}s ease-in-out ${i * 0.2}s infinite`,
          opacity: 0.6,
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

/* ========== Pricing Data ========== */
const plans = [
  {
    name: "Starter",
    price: "Free",
    desc: "Perfect for freelancers just starting out.",
    features: [
      "5 Bids per month",
      "Basic Profile",
      "Standard Support",
      "5% Service Fee",
      "Access to Public Tasks",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Professional",
    price: "$29",
    period: "/mo",
    desc: "For serious freelancers growing their business.",
    features: [
      "50 Bids per month",
      "Verified Badge",
      "Priority Support",
      "3% Service Fee",
      "Access to Premium Tasks",
      "Workroom File Sharing (10GB)",
    ],
    cta: "Upgrade to Pro",
    popular: true,
  },
  {
    name: "Agency",
    price: "$99",
    period: "/mo",
    desc: "For teams and agencies managing multiple projects.",
    features: [
      "Unlimited Bids",
      "Agency Profile & Branding",
      "Dedicated Account Manager",
      "1% Service Fee",
      "Team Collaboration Tools",
      "API Access",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

const comparison = [
  { feature: "Bids per month", starter: "5", pro: "50", agency: "Unlimited" },
  { feature: "Service Fee", starter: "5%", pro: "3%", agency: "1%" },
  { feature: "Verified Badge", starter: false, pro: true, agency: true },
  { feature: "Priority Support", starter: false, pro: true, agency: true },
  { feature: "Team Tools", starter: false, pro: false, agency: true },
];

const faqs = [
  {
    q: "Can I cancel my subscription anytime?",
    a: "Yes, you can cancel your subscription at any time. Your benefits will last until the end of the billing period.",
  },
  {
    q: "Is there a free trial for Pro?",
    a: "We offer a 14-day free trial for the Professional plan so you can experience the benefits risk-free.",
  },
  {
    q: "How do service fees work?",
    a: "Service fees are a small percentage taken from the project value upon successful completion and payment.",
  },
];

export default function PricingPlans() {
  const [openFAQ, setOpenFAQ] = useState(null);
  const [billing, setBilling] = useState("monthly"); // 'monthly' | 'yearly'

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

        <section className="relative mx-auto max-w-6xl px-6 pt-28 pb-20 text-center">
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="text-4xl font-bold sm:text-5xl md:text-6xl text-slate-900"
          >
            <GradientText>Simple, Transparent Pricing</GradientText>
          </motion.h1>
          <motion.p
            {...fadeUp(0.2)}
            className="mx-auto mt-6 max-w-2xl text-lg text-slate-600"
          >
            Choose the plan that fits your journey. No hidden fees, cancel anytime.
          </motion.p>

          {/* Billing Toggle */}
          <motion.div {...fadeUp(0.3)} className="mt-8 flex justify-center items-center gap-4">
            <span className={`text-sm font-semibold ${billing === 'monthly' ? 'text-slate-900' : 'text-slate-500'}`}>Monthly</span>
            <button
              onClick={() => setBilling(b => b === 'monthly' ? 'yearly' : 'monthly')}
              className="relative h-7 w-12 rounded-full bg-slate-200 p-1 transition-colors hover:bg-slate-300"
            >
              <motion.div
                animate={{ x: billing === 'monthly' ? 0 : 20 }}
                className="h-5 w-5 rounded-full bg-blue-600 shadow-sm"
              />
            </button>
            <span className={`text-sm font-semibold ${billing === 'yearly' ? 'text-slate-900' : 'text-slate-500'}`}>
              Yearly <span className="text-emerald-600 text-xs ml-1">(Save 20%)</span>
            </span>
          </motion.div>
        </section>

        {/* PLANS GRID */}
        <section className="mx-auto max-w-7xl px-6 pb-20">
          <div className="grid gap-8 md:grid-cols-3 items-start">
            {plans.map((plan, i) => (
              <motion.div
                key={i}
                {...fadeUp(0.2 + i * 0.1)}
                className={`relative ${plan.popular ? 'md:-mt-4 md:mb-4 z-10' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 inset-x-0 flex justify-center">
                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                      MOST POPULAR
                    </span>
                  </div>
                )}
                <GlassCard className={`p-8 h-full flex flex-col border-slate-200 bg-white shadow-sm transition hover:scale-[1.02] ${plan.popular ? 'border-blue-300 shadow-lg ring-1 ring-blue-100' : 'hover:border-blue-200 hover:shadow-md'}`}>
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline text-slate-900">
                    <span className="text-4xl font-extrabold tracking-tight">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="ml-1 text-xl font-medium text-slate-500">
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p className="mt-4 text-slate-600 text-sm">{plan.desc}</p>

                  <ul className="mt-8 space-y-4 flex-1">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0" />
                        <span className="ml-3 text-slate-700 text-sm">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    <NeonButton
                      className={`w-full justify-center ${plan.popular ? 'bg-blue-600 hover:bg-blue-500' : ''}`}
                      onClick={() => window.location.href = '/join-us'}
                    >
                      {plan.cta}
                    </NeonButton>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* COMPARISON TABLE */}
        <section className="mx-auto max-w-4xl px-6 py-20 hidden md:block">
          <h2 className="text-2xl font-bold text-center mb-10 text-slate-900">Compare Features</h2>
          <GlassCard className="overflow-hidden border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="p-4 text-sm font-semibold text-slate-900">Feature</th>
                  <th className="p-4 text-sm font-semibold text-slate-900 text-center">Starter</th>
                  <th className="p-4 text-sm font-semibold text-blue-600 text-center">Professional</th>
                  <th className="p-4 text-sm font-semibold text-slate-900 text-center">Agency</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                    <td className="p-4 text-sm text-slate-700 font-medium">{row.feature}</td>
                    <td className="p-4 text-center text-sm text-slate-600">
                      {typeof row.starter === 'boolean' ? (
                        row.starter ? <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" /> : <XCircle className="h-5 w-5 text-slate-300 mx-auto" />
                      ) : row.starter}
                    </td>
                    <td className="p-4 text-center text-sm text-slate-900 font-semibold bg-blue-50/30">
                      {typeof row.pro === 'boolean' ? (
                        row.pro ? <CheckCircle2 className="h-5 w-5 text-blue-600 mx-auto" /> : <XCircle className="h-5 w-5 text-slate-300 mx-auto" />
                      ) : row.pro}
                    </td>
                    <td className="p-4 text-center text-sm text-slate-600">
                      {typeof row.agency === 'boolean' ? (
                        row.agency ? <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" /> : <XCircle className="h-5 w-5 text-slate-300 mx-auto" />
                      ) : row.agency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-6 py-20">
          <h2 className="text-3xl font-bold text-center mb-12 text-slate-900">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((f, i) => (
              <GlassCard key={i} className="overflow-hidden border-slate-200 bg-white shadow-sm hover:border-blue-200">
                <button
                  className="flex w-full items-center justify-between px-6 py-4 text-left text-slate-900 font-semibold"
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
            ))}
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
}
