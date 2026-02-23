import React, { Suspense, useEffect, useMemo, useState, useRef, useCallback, lazy, FC, ReactNode, MouseEvent } from "react";
import { useNavigate, NavigateFunction } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform, useReducedMotion, useInView } from "framer-motion";
import {
  ArrowRight, ArrowUp, ArrowUpRight, BadgeCheck, Bolt, CheckCircle2, ChevronDown, ChevronRight, Layers, Loader2, Lock, MessageSquare, ShieldCheck, Sparkles, Star, Zap, Briefcase
} from "lucide-react";
import Footer from "../components/footer";
import { TiltTaskCard as TasksTile } from "./Tasks";

// Lazy load heavy components
const Navbar = lazy(() => import("../components/navbarhome"));

const SwipeCarousel = lazy(() => import("../components/HeroArt").then(module => ({ default: module.SwipeCarousel })));

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:5000";



// --- TypeScript: Define Core Data Types ---
interface Task {
  _id: string;
  title: string;
  description: string;
  price: number;
  category: string[];
  numberOfApplicants: number;
  applicants: unknown[];
  createdAt: string;
  logo?: { url: string };
  attachments?: { url: string }[];
}

interface FAQItem {
  question: string;
  answer: string;
}

interface FeatureItem {
  icon: React.ElementType;
  title: string;
  desc: string;
  badge: string;
}

// --- CONSTANTS ---
const FEATURES: FeatureItem[] = [{ icon: ShieldCheck, title: "Escrow that thinks ahead", desc: "Automated release conditions, dispute fallbacks, and audit-ready ledgers keep every sprint accountable.", badge: "Trust" }, { icon: Bolt, title: "Signal-based matching", desc: "Reputation graphs and intent data surface the right talent in minutes, not weeks.", badge: "Speed" }, { icon: Layers, title: "Reusable workflow packs", desc: "Bundle briefs, milestones, NDAs, and payment rails into templates your team can clone instantly.", badge: "Efficiency" }, { icon: MessageSquare, title: "Live workrooms", desc: "Context-rich threads, asset vaults, and approvals stay in a sealed room with escrow-aware status updates.", badge: "Collaboration" }];
const SECURITY_PILLARS = [{ icon: ShieldCheck, title: "SOC-ready controls", desc: "Audit trails, IP whitelisting, and immutable escrow logs ship by default." }, { icon: Lock, title: "Vaulted asset storage", desc: "Uploads live in encrypted object stores with scoped share links and expiry timers." }, { icon: CheckCircle2, title: "Compliance coverage", desc: "GST invoices, TDS reports, and KYC workflows bundled into every payout." }];
const TESTIMONIALS = [{ quote: "Cyphire gave us a delivery pod in 36 hours flat. Escrow kept finance comfortable and the workroom kept engineering honest.", name: "Serena Patel", role: "Director of Product @ Quanticode" }, { quote: "We sunset five tools after moving to Cyphire. Payments, briefs, legal—everything finally talks to each other.", name: "Jonas Meyer", role: "Founder @ Nova Digital" }, { quote: "Our compliance team loves the paper trail, our creatives love the pace. Rare to see both sides happy.", name: "Harshita Rao", role: "Ops Lead @ Nimbus Labs" }];
const FAQ_ITEMS: FAQItem[] = [{ question: "How fast can I launch a new brief?", answer: "Most teams publish within 4–6 minutes using the guided brief builder. Templates mean recurring work takes seconds." }, { question: "What protections do freelancers get?", answer: "Every mission funds escrow up-front. Milestones release only after your approval, with dedicated dispute support if anything slips." }, { question: "Can I bring my existing contractors?", answer: "Yes. Invite them by email, drop them into a workroom, and Cyphire will still handle contracts, payouts, and analytics." }, { question: "Is Cyphire available internationally?", answer: "We currently support teams across 22 countries with multi-currency escrow and localised tax paperwork." }];


// --- UTILITY COMPONENTS (Typed) ---

interface TextProps { children: ReactNode; className?: string; }
export const GradientText: FC<TextProps> = React.memo(({ children, className = "" }) => (<span className={`text-blue-600 font-bold tracking-tight ${className}`}>{children}</span>));
export const GlassCard: FC<React.HTMLAttributes<HTMLDivElement>> = React.memo(({ children, className = "", ...props }) => (<div {...props} className={`rounded-lg border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md ${className}`}>{children}</div>));

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { children: ReactNode; loading?: boolean; }
export const NeonButton: FC<NeonButtonProps> = React.memo(({ children, className = "", onClick, loading = false, ...props }) => (
  <button onClick={onClick} disabled={loading} {...props} className={`relative inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-medium text-white transition-all duration-200 bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 shadow-sm hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70 ${className}`}>
    <span className="relative z-10 flex items-center gap-2">{loading && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}{children}</span>
  </button>
));

const formatINR = (n: number | undefined | null): string => {
  if (typeof n !== 'number' || isNaN(n)) return "₹—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
};

const Aurora: FC = React.memo(() => (<div className="absolute inset-0 -z-10 overflow-hidden bg-slate-50"> <div className="absolute -inset-x-40 -top-40 h-[50rem] bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.08),transparent_60%)] will-change-transform" /><div className="absolute inset-x-0 bottom-0 h-[40rem] bg-[radial-gradient(ellipse_at_bottom,rgba(59,130,246,0.05),transparent_60%)] will-change-transform" /></div>));

const Particles: FC = React.memo(() => null);

const Shimmer: FC<{ className?: string }> = React.memo(({ className = "" }) => (<div className={`animate-pulse rounded-2xl bg-gray-200 ${className}`}> <div className="h-full w-full bg-gradient-to-r from-transparent via-gray-100 to-transparent animate-shimmer" /> </div>));


// --- TASK CARD ---
interface TiltTaskCardProps { task: Task; onView: (task: Task) => void; onApply: (task: Task) => void; }
const TiltTaskCard: FC<TiltTaskCardProps> = React.memo(({ task, onView, onApply }) => {
  const prefersReducedMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, { once: true, amount: 0.2 });
  const x = useMotionValue(0.5); const y = useMotionValue(0.5); const rotateX = useTransform(y, [0, 1], [6, -6]); const rotateY = useTransform(x, [0, 1], [-8, 8]);
  const createdAt = useMemo(() => new Date(task?.createdAt || Date.now()), [task?.createdAt]);
  const daysLeft = useMemo(() => Math.ceil(((new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000)).getTime() - Date.now()) / (1000 * 60 * 60 * 24)), [createdAt]);
  const isNew = useMemo(() => (Date.now() - createdAt.getTime()) < (24 * 60 * 60 * 1000), [createdAt]); const isUrgent = daysLeft > 0 && daysLeft <= 2;
  const categories = Array.isArray(task?.category) ? task.category.slice(0, 3) : []; const capacity = Number(task?.numberOfApplicants) || 0; const applied = Array.isArray(task?.applicants) ? task.applicants.length : 0;

  const handleMouseMove = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left) / rect.width);
    y.set((event.clientY - rect.top) / rect.height);
    event.currentTarget.style.setProperty("--x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
    event.currentTarget.style.setProperty("--y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
  }, [prefersReducedMotion, x, y]);
  const handleMouseLeave = useCallback(() => { x.set(0.5); y.set(0.5); }, [x, y]);

  return (
    <motion.div ref={cardRef} initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} whileHover={prefersReducedMotion ? {} : { y: -5, scale: 1.01 }} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} tabIndex={0} aria-labelledby={`task-title-${task._id}`} className="relative group rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-blue-200 overflow-hidden will-change-transform focus:outline-none">
      <div className="pointer-events-none absolute -inset-24 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: `radial-gradient(600px circle at var(--x,50%) var(--y,50%), rgba(59,130,246,0.05), transparent 35%)` }} />
      <motion.div style={prefersReducedMotion ? {} : { rotateX, rotateY }} className="relative rounded-2xl bg-white h-full flex flex-col overflow-hidden">
        {/* 🏙️ Banner / Logo */}
        <div className="h-40 w-full bg-slate-50 border-b border-slate-100 flex items-center justify-center overflow-hidden relative group-hover:bg-slate-100 transition-colors">
          {task.logo?.url ? (
            <img src={task.logo.url} alt="task-logo" loading="lazy" className="w-full h-full object-cover" />
          ) : task.attachments && task.attachments.length > 0 ? (
            <img src={task.attachments[0].url} alt="task-attachment" loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <Briefcase className="h-8 w-8 opacity-20" />
              <span className="text-xs font-medium opacity-50 uppercase tracking-widest">No Logo</span>
            </div>
          )}
        </div>

        <div className="p-6 flex flex-col flex-grow">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            {isNew && <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 font-medium text-blue-700"> <Sparkles aria-hidden="true" className="h-3 w-3" /> New </span>}
            {isUrgent && <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 font-medium text-amber-700"> <Zap aria-hidden="true" className="h-3 w-3" /> Urgent </span>}
            {categories.slice(0, 1).map((cat) => (<span key={cat} className="inline-flex items-center gap-1.5 rounded-full border border-slate-100 bg-slate-50 px-2 py-1 text-slate-600"> <Star aria-hidden="true" className="h-3 w-3" /> {cat} </span>))}
          </div>
          <h3 id={`task-title-${task._id}`} className="text-lg font-bold text-slate-900 line-clamp-2 group-hover:text-blue-700 transition-colors">{task?.title}</h3>
          <p className="mt-2 text-sm text-slate-600 line-clamp-3 flex-grow">{task?.description}</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-[13px] text-gray-700">
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5 text-center"><div className="text-xs text-gray-500">Budget</div><div className="font-medium text-gray-900">{formatINR(task?.price)}</div></div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5 text-center"><div className="text-xs text-gray-500">Slots</div><div className="font-medium text-gray-900">{capacity > 0 ? `${applied}/${capacity}` : "∞"}</div></div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5 text-center"><div className="text-xs text-gray-500">Ends in</div><div className={`font-medium ${daysLeft <= 0 ? "text-red-600" : "text-gray-900"}`}>{daysLeft > 0 ? `${daysLeft}d` : "Expired"}</div></div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
            <div className="flex -space-x-2 overflow-hidden">{['S', 'J'].map((initial, i) => (<div key={i} className={`inline-block h-6 w-6 rounded-full ring-2 ring-white text-white text-[10px] flex items-center justify-center ${i === 0 ? 'bg-indigo-600' : 'bg-emerald-600'}`}>{initial}</div>))}</div>
            <span>{applied} applied so far</span>
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <NeonButton title={`Apply for: ${task?.title}`} className="w-full text-xs" onClick={() => onApply?.(task)}>Apply Now <ArrowRight aria-hidden="true" className="h-4 w-4" /></NeonButton>
            <button title={`View details for: ${task?.title}`} onClick={() => onView?.(task)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-95">View Details</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

// --- SECTIONS (Typed) ---
interface SectionHeaderProps { id: string; eyebrow?: string; title: string; subtitle?: string; }
const SectionHeader: FC<SectionHeaderProps> = React.memo(({ id, eyebrow, title, subtitle }) => {
  const ref = useRef<HTMLHeadingElement>(null); const isInView = useInView(ref, { once: true, amount: 0.8 }); const prefersReducedMotion = useReducedMotion();
  const animationProps = (delay = 0) => prefersReducedMotion ? {} : { initial: { opacity: 0, y: 10 }, animate: isInView ? { opacity: 1, y: 0 } : {}, transition: { duration: 0.4, delay } };
  return (
    <header ref={ref} className="mx-auto mb-12 max-w-3xl text-center">
      {eyebrow && <motion.div {...animationProps()} className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700 font-medium"><Sparkles aria-hidden="true" className="h-4 w-4" /> {eyebrow}</motion.div>}
      <motion.h2 id={id} {...animationProps(0.1)} className="text-3xl md:text-3xl font-bold text-gray-900 tracking-tight">{title}</motion.h2>
      {subtitle && <motion.p {...animationProps(0.2)} className="mt-4 text-gray-600 text-lg">{subtitle}</motion.p>}
    </header>
  );
});

const HeroSection: FC<{ navigate: NavigateFunction }> = React.memo(({ navigate }) => {
  const prefersReducedMotion = useReducedMotion();
  return (
    <section aria-label="Hero Section" className="relative pt-32 pb-20 overflow-hidden bg-slate-900">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl mix-blend-screen" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-[100px] mix-blend-screen" />
        <div className="absolute bottom-0 right-0 h-[600px] w-[600px] bg-purple-500/10 blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 contrast-150 mix-blend-overlay"></div>
      </div>

      <div className="relative z-10 mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <motion.h1 initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl text-white tracking-tight">
              <span className="block text-white">The OS for</span><GradientText>High-Trust Freelance</GradientText>
            </motion.h1>
            <motion.p initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }} className="mt-6 text-lg text-slate-300 max-w-xl leading-relaxed">
              Your secure freelance marketplace—where trust, speed, and craftsmanship meet. Discover top executors, automate contracts, and deliver outcomes with confidence.
            </motion.p>
            <motion.div initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }} className="mt-8 flex flex-wrap items-center gap-4">
              <NeonButton onClick={() => navigate("/choose-category")} title="Post a new task">Post a Task <Zap aria-hidden="true" className="h-4 w-4" /></NeonButton>
              <button onClick={() => navigate("/tasks")} title="Explore all available tasks" className="group inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-white font-medium transition-all hover:bg-white/10 hover:border-white/20 hover:shadow-sm">
                Explore Marketplace <ChevronRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </motion.div>
          </div>
          <div className="relative lg:ml-auto"><Suspense fallback={<Shimmer className="h-96 w-full" />}><SwipeCarousel /></Suspense></div>
        </div>
        <div className="relative overflow-hidden py-6 mt-16">

          <div className="flex w-max animate-marquee gap-10 opacity-100 h-full items-center">
            {["Technology", "Education", "Events", "Healthcare", "Architecture", "Home & Safety", "Technology", "Education", "Events", "Healthcare", "Architecture", "Home & Safety"].map((name, i) => (
              <div key={i} className="flex min-w-[10rem] items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-300 whitespace-nowrap shadow-sm"><BadgeCheck aria-hidden="true" className="mr-2 h-4 w-4 flex-shrink-0 text-blue-500" /> {name}</div>
            ))}
          </div>
          <style>{`@keyframes marquee{0%{transform:translate3d(0,0,0)}100%{transform:translate3d(-50%,0,0)}}.animate-marquee{animation:marquee 40s linear infinite}.animate-shimmer{animation:shimmer 2s infinite}@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
        </div>
      </div>
    </section>
  );
});

const BackToTopButton: FC = React.memo(() => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => { const toggleVisibility = () => setIsVisible(window.scrollY > 300); window.addEventListener("scroll", toggleVisibility); return () => window.removeEventListener("scroll", toggleVisibility); }, []);
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} onClick={scrollToTop} title="Back to Top" aria-label="Scroll back to top" className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-lg transition-colors hover:bg-gray-50 hover:text-emerald-600">
          <ArrowUp aria-hidden="true" className="h-6 w-6" />
        </motion.button>
      )}
    </AnimatePresence>
  );
});

const SiteFooter: FC = React.memo(() => (
  <footer className="mx-auto max-w-screen-2xl px-6 py-8 text-center text-sm text-gray-500 border-t border-gray-100 mt-20">
    <div className="flex justify-center gap-6 mb-4">
      <a href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</a>
      <a href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</a>
      <a href="/contact" className="hover:text-white transition-colors">Contact</a>
    </div>
    <p>&copy; {new Date().getFullYear()} Cyphire Technologies Inc. All rights reserved.</p>
  </footer>
));

const FAQSection: FC<{ items: FAQItem[] }> = React.memo(({ items }) => {
  const [openIndex, setOpenIndex] = useState(0);
  return (
    <section aria-labelledby="faq-title" className="mx-auto max-w-3xl px-6 py-16">
      <SectionHeader id="faq-title" eyebrow="FAQ" title="Common Questions" subtitle="Details on how we protect your work and payments." />
      <div className="space-y-3">
        {items.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <GlassCard key={item.question} className="overflow-hidden bg-white">
              <button onClick={() => setOpenIndex(isOpen ? -1 : index)} aria-expanded={isOpen} aria-controls={`faq-answer-${index}`} className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left text-gray-900 hover:bg-gray-50 transition-colors focus:outline-none">
                <span className="text-sm font-medium sm:text-base">{item.question}</span>
                <ChevronDown aria-hidden="true" className={`h-5 w-5 flex-shrink-0 text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div id={`faq-answer-${index}`} role="region" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }}>
                    <p className="px-6 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-3">{item.answer}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          );
        })}
      </div>
    </section>
  );
});


// --- MAIN HOME COMPONENT ---
export default function Home() {
  useEffect(() => {
    sessionStorage.setItem("lastHomeRoute", "/home");
  }, []);
  const navigate = useNavigate();
  // TypeScript: Type state with our `Task` interface
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [taskError, setTaskError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // SEO and Meta Tags
  useEffect(() => {
    document.title = "Cyphire | The OS for High-Trust Freelance";
    const setMeta = (name: string, content: string) => {
      let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.name = name;
        document.head.appendChild(element);
      }
      element.content = content;
    };
    const description = "Your secure freelance marketplace—where trust, speed, and craftsmanship meet. Discover top talent, automate contracts, and deliver outcomes with confidence.";
    setMeta('description', description);
    setMeta('og:title', document.title);
    setMeta('og:description', description);
  }, []);

  // Initial loader effect
  useEffect(() => { const timer = setTimeout(() => setIsInitialLoading(false), 800); return () => clearTimeout(timer); }, []);

  // Auth is handled by route guards in App.jsx
  useEffect(() => { const controller = new AbortController(); setLoadingTasks(true); setTaskError(""); (async () => { try { const response = await fetch(`${API_BASE}/api/tasks`, { credentials: "include", cache: "no-store", signal: controller.signal }); if (!response.ok) throw new Error("Failed to fetch tasks"); const data = await response.json(); setTasks(Array.isArray(data) ? data : []); } catch (error) { if (error.name !== "AbortError") { console.error("Error fetching tasks:", error); setTaskError("We couldn't load live briefs. Try again soon."); } } finally { if (!controller.signal.aborted) setLoadingTasks(false); } })(); return () => controller.abort(); }, [reloadToken]);

  // Keep only non-sponsorship AND non-event tasks for Home "Recently Posted"
  const nonSponsorshipTasks = useMemo(() => {
    return (tasks || []).filter((t) => {
      // category might be a string or an array
      const cats = Array.isArray(t?.category) ? t.category : [t?.category];
      const catsLower = cats.map(c => String(c ?? "").toLowerCase());

      const isSponsorship = catsLower.some((c) => c.includes("sponsorship"));
      const isEvent = catsLower.some((c) => c.includes("event"));

      return !isSponsorship && !isEvent;
    });
  }, [tasks]);

  const liveTasks = useMemo(() => nonSponsorshipTasks.slice(0, 4), [nonSponsorshipTasks]);


  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 antialiased font-sans">
      <AnimatePresence>{isInitialLoading && (<motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0f]"><Loader2 className="h-8 w-8 animate-spin text-fuchsia-400" /></motion.div>)}</AnimatePresence>
      <header className="sticky top-0 z-50"><Suspense fallback={<div className="h-16 bg-white/5 backdrop-blur-xl" />}><Navbar /></Suspense></header>
      <main role="main">
        {/* All JSX content from here on is identical */}
        <Aurora /><Particles />
        <HeroSection navigate={navigate} />

        <section aria-labelledby="features-title" className="mx-auto max-w-screen-2xl px-6 py-16">
          <SectionHeader id="features-title" eyebrow="Why Cyphire" title="A marketplace engineered for outcomes" subtitle="Purpose-built primitives that reduce risk and increase throughput for both sides." />
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              const palettes = [
                {
                  cardHover: "hover:border-blue-200",
                  badge: "border-blue-100 bg-blue-50 text-blue-700",
                  link: "text-blue-600 hover:text-blue-700",
                },
                {
                  cardHover: "hover:border-amber-200",
                  badge: "border-amber-100 bg-amber-50 text-amber-700",
                  link: "text-amber-600 hover:text-amber-700",
                },
                {
                  cardHover: "hover:border-purple-200",
                  badge: "border-purple-100 bg-purple-50 text-purple-700",
                  link: "text-purple-600 hover:text-purple-700",
                },
                {
                  cardHover: "hover:border-emerald-200",
                  badge: "border-emerald-100 bg-emerald-50 text-emerald-700",
                  link: "text-emerald-600 hover:text-emerald-700",
                },
              ];
              const palette = palettes[index % palettes.length];
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <GlassCard className={`flex flex-col gap-5 p-6 h-full transition-all hover:shadow-md ${palette.cardHover}`}>
                    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium w-fit ${palette.badge}`}>
                      <Icon aria-hidden="true" className="h-4 w-4" />
                      <span>{feature.badge}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{feature.title}</h3>
                      <p className="mt-2 text-sm text-slate-600 leading-relaxed">{feature.desc}</p>
                    </div>
                    <button className={`mt-auto inline-flex items-center gap-2 text-sm font-medium transition-colors group ${palette.link}`}>
                      Learn more <ArrowUpRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </button>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="live-briefs-title" className="relative py-24 bg-slate-900 overflow-hidden">
          {/* Background Atmosphere */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute top-0 right-1/2 translate-x-1/2 w-[1000px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[400px] bg-purple-600/10 blur-[100px] rounded-full mix-blend-screen" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 contrast-150 mix-blend-overlay"></div>
            {/* Gradient Mask for Smooth Transition */}
            <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-slate-50 to-transparent opacity-10"></div>
          </div>

          <div className="relative z-10 max-w-screen-2xl mx-auto px-6">
            <header className="mx-auto mb-12 max-w-3xl text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-xs text-blue-300 font-medium">
                <Sparkles aria-hidden="true" className="h-4 w-4" /> Live Briefs
              </div>
              <h2 id="live-briefs-title" className="text-3xl md:text-4xl font-bold text-white tracking-tight">Recently Posted</h2>
              <p className="mt-4 text-slate-300 text-lg">Apply fast these openings won’t last long.</p>
            </header>

            {taskError && (<GlassCard role="alert" aria-live="polite" className="mb-6 flex items-center justify-between px-5 py-4 text-sm text-gray-700 bg-red-50 border-red-100"><span>{taskError}</span><button onClick={() => setReloadToken(t => t + 1)} className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs uppercase tracking-wider text-red-600 hover:bg-red-50 transition-colors">Retry</button></GlassCard>)}

            {/*Updated task tiles*/}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
              {loadingTasks ? (
                [0, 1, 2].map((i) => <Shimmer key={i} className="h-[420px]" />)
              ) : liveTasks.length > 0 ? (
                liveTasks.map((task) => (
                  <div key={task._id} className="h-full">
                    <TiltTaskCard
                      task={task}
                      onView={() => navigate("/tasks")}
                      onApply={() => navigate("/tasks")}
                    />
                  </div>
                ))
              ) : (
                <GlassCard className="col-span-full flex flex-col items-center justify-center gap-3 px-6 py-20 text-gray-500 bg-white/5 border-dashed border-white/10 mx-auto w-full">
                  <BadgeCheck aria-hidden="true" className="h-8 w-8 text-emerald-400" />
                  <p className="text-slate-400">No live briefs yet—check back in a moment.</p>
                </GlassCard>
              )}
            </div>

            <div className="mt-12 flex items-center justify-center relative z-10"><button onClick={() => navigate("/tasks")} className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-white shadow-sm transition-all hover:bg-white/10 hover:border-white/20 active:scale-95">View all tasks <ChevronRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" /></button></div>
          </div>
        </section>

        <section aria-labelledby="security-title" className="mx-auto max-w-screen-2xl px-6 py-16">
          <SectionHeader id="security-title" eyebrow="Security & compliance" title="Enterprise-grade controls without the drag" subtitle="Cyphire builds governance into every workflow so your legal and finance teams can sleep at night." />
          <div className="text-center mb-10"><span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700"><ShieldCheck aria-hidden="true" className="h-5 w-5" /> SOC-2 Compliant Infrastructure</span></div>
          <div className="grid gap-6 md:grid-cols-3">{SECURITY_PILLARS.map((p, i) => { const Icon = p.icon; return (<motion.div key={p.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5, delay: i * 0.1 }}><GlassCard className="flex flex-col gap-4 p-6 h-full hover:border-emerald-300 transition-colors"><div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600"><Icon aria-hidden="true" className="h-6 w-6" /></div><h3 className="text-lg font-bold text-gray-900">{p.title}</h3><p className="text-sm text-gray-600 leading-relaxed">{p.desc}</p></GlassCard></motion.div>); })}</div>
        </section>

        <section aria-labelledby="testimonials-title" className="mx-auto max-w-screen-2xl px-6 py-16">
          <SectionHeader id="testimonials-title" eyebrow="Signal over noise" title="Teams that switched to Cyphire" subtitle="Our customers ship faster because escrow, talent, and operations finally live in one environment." />
          <div className="grid gap-6 md:grid-cols-3">{TESTIMONIALS.map((item, i) => (<motion.div key={item.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5, delay: i * 0.1 }}><GlassCard className="flex h-full flex-col gap-5 p-6 hover:border-blue-200 hover:shadow-md transition-all"><div className="flex items-center gap-1 text-amber-500">{[...Array(5)].map((_, i) => (<Star key={i} aria-hidden="true" className="h-4 w-4 fill-current" />))}</div><p className="text-slate-700 leading-relaxed italic">"{item.quote}"</p><div className="mt-auto text-sm text-slate-500"><div className="font-bold text-slate-900">{item.name}</div><div className="mt-0.5">{item.role}</div></div></GlassCard></motion.div>))}</div>
        </section>

        <FAQSection items={FAQ_ITEMS} />

        <section aria-label="Final Call to Action" className="relative mx-auto max-w-6xl px-6 pb-20 pt-8">
          <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-emerald-50 to-white rounded-3xl" />
          <GlassCard className="overflow-hidden rounded-3xl border-gray-200 bg-white p-8 md:p-12 shadow-md">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl space-y-4">
                <h3 className="text-3xl font-bold text-gray-900 md:text-4xl">Ready to launch your next mission?</h3>
                <p className="text-lg text-gray-600 leading-relaxed">Choose the runway that fits your team. Upgrade anytime—your escrow, workflows, and insights come with you.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 lg:flex-col"><NeonButton onClick={() => navigate("/signup")} className="whitespace-nowrap">Get Started Free <ArrowRight aria-hidden="true" className="h-4 w-4" /></NeonButton><button onClick={() => navigate("/contact")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-95">Talk to Sales <ArrowUpRight aria-hidden="true" className="h-4 w-4" /></button></div>
            </div>
          </GlassCard>
        </section>
        <Footer />
        <SiteFooter />
      </main>
      <BackToTopButton />
    </div >
  );
}
