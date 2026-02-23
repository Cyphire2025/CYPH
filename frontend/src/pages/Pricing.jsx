import React, { useEffect, useState, useMemo, Suspense } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import NavbarSpon from "../components/navbarsponhome.jsx";
import NavbarHome from "../components/navbarhome.jsx";
import Footer from "../components/footer";
import {
    GradientText,
    GlassCard,
    NeonButton,
} from "./home.jsx";
import {
    CheckCircle2,
    XCircle,
    Zap,
    Shield,
    Star,
    ArrowRight,
} from "lucide-react";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:5000";

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

export default function Pricing() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const planRank = { free: 1, plus: 2, ultra: 3 };

    const plans = [
        {
            name: "Free",
            price: "₹0",
            desc: "For starters and casual freelancers.",
            limits: ["Up to 2 tasks per month", "1 active task at a time", "Basic Support"],
            popular: false,
        },
        {
            name: "Plus",
            price: "₹499",
            period: "/mo",
            desc: "For growing freelancers with steady work.",
            limits: ["Up to 20 tasks per month", "5 active tasks at a time", "Verified Badge"],
            popular: true,
        },
        {
            name: "Ultra",
            price: "₹1,499",
            period: "/mo",
            desc: "For professionals handling big volumes.",
            limits: ["Up to 50 tasks per month", "20 active tasks at a time", "Priority Support", "Agency Profile"],
            popular: false,
        },
    ];

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/auth/me`, {
                    credentials: "include",
                });
                if (res.ok) {
                    const data = await res.json();
                    setUser(data.user);
                }
            } catch (e) {
                console.error("Failed to fetch user", e);
            }
        };
        fetchUser();
    }, []);

    // Navbar selection
    const Nav = useMemo(() => {
        const last = sessionStorage.getItem("lastHomeRoute");
        return last === "/sponsorshiphome" ? NavbarSpon : NavbarHome;
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden font-sans">
            <main className="relative overflow-hidden">
                <Suspense fallback={<div className="h-16" />}>
                    <Nav />
                    <Aurora />
                    <Particles />
                </Suspense>

                {/* Header */}
                <section className="relative mx-auto max-w-6xl px-6 pt-28 pb-20 text-center">
                    <motion.h1
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tight"
                    >
                        <GradientText>Choose Your Plan</GradientText>
                    </motion.h1>
                    <motion.p
                        {...fadeUp(0.2)}
                        className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 leading-relaxed"
                    >
                        Flexible plans to match your freelance journey. Upgrade anytime as you grow.
                    </motion.p>
                </section>

                {/* Pricing Cards */}
                <section className="mx-auto max-w-7xl px-6 pb-20">
                    <div className="grid gap-8 md:grid-cols-3 items-start">
                        {plans.map((plan, i) => {
                            const userPlan = user?.plan?.toLowerCase() || "free";
                            const isCurrent = userPlan === plan.name.toLowerCase();
                            const isUnlocked = planRank[userPlan] > planRank[plan.name.toLowerCase()];

                            return (
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

                                    <GlassCard className={`p-8 h-full flex flex-col border-slate-200 bg-white shadow-sm transition hover:scale-[1.02] ${plan.popular ? 'border-blue-300 shadow-lg ring-1 ring-blue-100' : 'hover:border-blue-200 hover:shadow-md'} ${isCurrent ? 'ring-2 ring-green-500 border-green-500' : ''}`}>
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
                                        <p className="mt-4 text-slate-600 text-sm leading-relaxed">{plan.desc}</p>

                                        <ul className="mt-8 space-y-4 flex-1 mb-8">
                                            {plan.limits.map((limit, j) => (
                                                <li key={j} className="flex items-start">
                                                    <CheckCircle2 className={`h-5 w-5 shrink-0 ${isCurrent ? 'text-green-500' : 'text-blue-500'}`} />
                                                    <span className="ml-3 text-slate-700 text-sm">
                                                        {limit}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="mt-auto">
                                            {isCurrent ? (
                                                <div className="w-full rounded-lg bg-green-50 border border-green-200 py-3 text-center font-bold text-green-700 flex items-center justify-center gap-2">
                                                    <CheckCircle2 className="h-5 w-5" /> Current Plan
                                                </div>
                                            ) : isUnlocked ? (
                                                <div className="w-full rounded-lg bg-blue-50 border border-blue-200 py-3 text-center font-bold text-blue-700 flex items-center justify-center gap-2">
                                                    <CheckCircle2 className="h-5 w-5" /> Included
                                                </div>
                                            ) : (
                                                <NeonButton
                                                    onClick={() => navigate(`/checkout?plan=${plan.name.toLowerCase()}`)}
                                                    className={`w-full justify-center ${plan.popular ? 'bg-blue-600 hover:bg-blue-500' : ''}`}
                                                >
                                                    Choose {plan.name} <ArrowRight className="h-4 w-4 ml-1" />
                                                </NeonButton>
                                            )}
                                        </div>
                                    </GlassCard>
                                </motion.div>
                            );
                        })}
                    </div>
                </section>

                <Footer />
            </main>
        </div>
    );
}
