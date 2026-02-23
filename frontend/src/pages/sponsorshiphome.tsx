import React, { Suspense, useEffect, useMemo, useState, useRef, useCallback, lazy, FC, ReactNode, MouseEvent } from "react";
import { useNavigate, useSearchParams, NavigateFunction } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform, useReducedMotion, useInView } from "framer-motion";
import {
  ArrowRight, ArrowUp, ArrowUpRight, BadgeCheck, Bolt, CheckCircle2, ChevronDown, ChevronRight, Layers, Loader2, Lock, MessageSquare, ShieldCheck, Sparkles, Star, Zap, ChevronLeft, Calendar, Mic2
} from "lucide-react";
import { FiHeart, FiShare2 } from "react-icons/fi";
// import { TiltTaskCard as TasksTile } from "./Tasks"; // Removed as we are using a custom card now

// Lazy load heavy components
const Navbar = lazy(() => import("../components/navbarsponhome"));
const Footer = lazy(() => import("../components/footer"));
const SwipeCarousel = lazy(() => import("../components/HeroArt").then(module => ({ default: module.SwipeCarousel })));
// Import shared card component
import SponsorCard from "../components/SponsorCard";

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
  metadata?: {
    tier?: string;
    [key: string]: any;
  };
  logo?: {
    url: string;
  };
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

// Update GradientText to allow overriding the default text-blue-600
// Update GradientText to allow overriding the default text-blue-600
export const GradientText: FC<TextProps> = React.memo(({ children, className = "" }) => (<span className={className || "text-blue-600"}>{children}</span>));
interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> { children: ReactNode; className?: string; }
export const GlassCard: FC<GlassCardProps> = React.memo(({ children, className = "", ...props }) => (<div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`} {...props}>{children}</div>));

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { children: ReactNode; loading?: boolean; }
export const NeonButton: FC<NeonButtonProps> = React.memo(({ children, className = "", onClick, loading = false, ...props }) => (
  <button onClick={onClick} disabled={loading} {...props} className={`relative inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-all duration-200 bg-blue-600 hover:bg-blue-700 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 ${className}`}>
    <span className="relative z-10 flex items-center gap-2">{loading && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}{children}</span>
  </button>
));

const formatINR = (n: number | undefined | null): string => {
  if (typeof n !== 'number' || isNaN(n)) return "₹—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
};

const Aurora: FC = React.memo(() => (<div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none"> <div className="absolute -inset-x-40 -top-40 h-[50rem] bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.05),transparent_60%)]" /><div className="absolute inset-x-0 bottom-0 h-[40rem] bg-[radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.05),transparent_60%)]" /></div>));

const Particles: FC = React.memo(() => {
  const prefersReducedMotion = useReducedMotion();
  const [particleCount, setParticleCount] = useState(20);
  useEffect(() => { const updateCount = () => setParticleCount(window.innerWidth < 768 ? 10 : 20); updateCount(); window.addEventListener('resize', updateCount); return () => window.removeEventListener('resize', updateCount); }, []);
  if (prefersReducedMotion) return null;
  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      {Array.from({ length: particleCount }).map((_, i) => (<span key={i} className="absolute h-1 w-1 rounded-full bg-white/30 shadow-[0_0_8px_rgba(255,255,255,0.25)] will-change-transform" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animation: `float${i % 3} ${6 + (i % 5)}s ease-in-out ${i * 0.12}s infinite` }} />))}
      <style>{`@keyframes float0{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-10px,0)}} @keyframes float1{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-16px,0)}} @keyframes float2{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-22px,0)}}`}</style>
    </div>
  );
});

const Shimmer: FC<{ className?: string }> = React.memo(({ className = "" }) => (<div className={`animate-pulse rounded-xl border border-slate-200 bg-slate-50 ${className}`}> <div className="h-full w-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" /> </div>));


// --- SECTIONS (Typed) ---
interface SectionHeaderProps { id: string; eyebrow?: string; title: string; subtitle?: string; mode?: "sponsorships" | "events"; }
const SectionHeader: FC<SectionHeaderProps> = React.memo(({ id, eyebrow, title, subtitle, mode = "sponsorships" }) => {
  const ref = useRef<HTMLHeadingElement>(null); const isInView = useInView(ref, { once: true, amount: 0.8 }); const prefersReducedMotion = useReducedMotion();
  const animationProps = (delay = 0) => prefersReducedMotion ? {} : { initial: { opacity: 0, y: 10 }, animate: isInView ? { opacity: 1, y: 0 } : {}, transition: { duration: 0.4, delay } };
  const eyebrowClass = mode === "events" ? "border-purple-100 bg-purple-50 text-purple-700" : "border-blue-100 bg-blue-50 text-blue-700";
  const titleClass = mode === "events" ? "text-purple-600" : "text-blue-600";
  return (
    <header ref={ref} className="mx-auto mb-12 max-w-3xl text-center">
      {eyebrow && <motion.div {...animationProps()} className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${eyebrowClass}`}><Sparkles aria-hidden="true" className="h-3.5 w-3.5" /> {eyebrow}</motion.div>}
      <motion.h2 id={id} {...animationProps(0.1)} className="text-3xl md:text-4xl font-bold text-slate-900"><GradientText className={titleClass}>{title}</GradientText></motion.h2>
      {subtitle && <motion.p {...animationProps(0.2)} className="mt-4 text-slate-600 max-w-2xl mx-auto text-lg">{subtitle}</motion.p>}
    </header>
  );
});

const HeroSection: FC<{ navigate: NavigateFunction; mode: "sponsorships" | "events"; setMode: (m: "sponsorships" | "events") => void }> = React.memo(({ navigate, mode, setMode }) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section aria-label="Hero Section" className={`relative pt-32 pb-20 overflow-hidden bg-slate-900 transition-colors duration-700`}>
      {/* Background Atmosphere */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className={`absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl mix-blend-screen transition-colors duration-700 ${mode === 'events' ? 'bg-purple-500/20' : 'bg-blue-500/20'}`} />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full blur-[100px] mix-blend-screen transition-colors duration-700 ${mode === 'events' ? 'bg-fuchsia-500/10' : 'bg-indigo-500/10'}`} />
        <div className={`absolute bottom-0 right-0 h-[600px] w-[600px] blur-[120px] mix-blend-screen transition-colors duration-700 ${mode === 'events' ? 'bg-indigo-500/10' : 'bg-purple-500/10'}`} />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 contrast-150 mix-blend-overlay"></div>
      </div>

      <div className="relative z-10 mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            {/* Creative Mode Switcher */}
            <div className="mb-8 inline-flex p-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md relative">
              <button
                onClick={() => setMode("sponsorships")}
                className={`relative px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-300 flex items-center gap-2 ${mode === 'sponsorships' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {mode === 'sponsorships' && (
                  <motion.div
                    layoutId="hero-mode-pill"
                    className="absolute inset-0 bg-white/10 rounded-full"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2"><Zap className="w-4 h-4" /> Sponsorships</span>
              </button>
              <button
                onClick={() => setMode("events")}
                className={`relative px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-300 flex items-center gap-2 ${mode === 'events' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {mode === 'events' && (
                  <motion.div
                    layoutId="hero-mode-pill"
                    className="absolute inset-0 bg-purple-500/20 rounded-full"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2"><Calendar className="w-4 h-4" /> Events</span>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {mode === "sponsorships" ? (
                <motion.div
                  key="sponsorships"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl text-white tracking-tight">
                    <span className="block text-white">The OS for</span><GradientText className="text-blue-400">High-Trust Freelance</GradientText>
                  </h1>
                  <p className="mt-6 text-lg text-slate-300 max-w-xl leading-relaxed">
                    Your secure freelance marketplace—where trust, speed, and craftsmanship meet. Discover top executors, automate contracts, and deliver outcomes with confidence.
                  </p>
                  <div className="mt-8 flex flex-wrap items-center gap-4">
                    <NeonButton onClick={() => navigate("/List-Sponsorship")}>List as Sponsor <Zap aria-hidden="true" className="h-4 w-4" /></NeonButton>
                    <button onClick={() => navigate("/sponsorships")} className="group inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-white font-medium transition-all hover:bg-white/10 hover:border-white/20 hover:shadow-sm">
                      Explore Marketplace <ChevronRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="events"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl text-white tracking-tight">
                    <span className="block text-white">The Pulse of</span><span className="text-purple-400"> Community Events</span>
                  </h1>
                  <p className="mt-6 text-lg text-slate-300 max-w-xl leading-relaxed">
                    Discover and partner with the most vibrant tech fests, hackathons, and meetups. Connect directly with organizers and amplify your brand's reach.
                  </p>
                  <div className="mt-8 flex flex-wrap items-center gap-4">
                    <button
                      onClick={() => navigate("/list-event")}
                      className="relative inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-all duration-200 bg-purple-600 hover:bg-purple-700 hover:shadow-lg hover:shadow-purple-500/25 active:scale-[0.98]"
                    >
                      <span className="relative z-10 flex items-center gap-2">List Your Event <Mic2 aria-hidden="true" className="h-4 w-4" /></span>
                    </button>
                    <button onClick={() => navigate("/events")} className="group inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-white font-medium transition-all hover:bg-white/10 hover:border-white/20 hover:shadow-sm">
                      Find Events <ChevronRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="relative lg:ml-auto"><Suspense fallback={<Shimmer className="h-96 w-full" />}><SwipeCarousel /></Suspense></div>
        </div>

        <div className="relative overflow-hidden py-6 mt-16">

          <div className="flex w-max animate-marquee gap-10 opacity-100">
            {["Technology", "Education", "Events", "Healthcare", "Architecture", "Home & Safety", "Technology", "Education", "Events", "Healthcare", "Architecture", "Home & Safety"].map((name, i) => (
              <div key={i} className="flex min-w-[10rem] items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-300 whitespace-nowrap shadow-sm"><BadgeCheck aria-hidden="true" className={`mr-2 h-4 w-4 flex-shrink-0 ${mode === 'events' ? 'text-purple-500' : 'text-blue-500'}`} /> {name}</div>
            ))}
          </div>
          <style>{`@keyframes marquee{0%{transform:translate3d(0,0,0)}100%{transform:translate3d(-50%,0,0)}}.animate-marquee{animation:marquee 30s linear infinite}.animate-shimmer{animation:shimmer 2s infinite}@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
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
        <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} onClick={scrollToTop} title="Back to Top" aria-label="Scroll back to top" className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white backdrop-blur-xl transition-colors hover:bg-white/10">
          <ArrowUp aria-hidden="true" className="h-6 w-6" />
        </motion.button>
      )}
    </AnimatePresence>
  );
});

// Footer needs access to 'mode', but it's currently defined outside the main component where 'mode' lives.
// Simplest way is to keep footer generic or pass props. Since it's a small component, let's make it accept props or just leave it neutral.
// Actually, 'SiteFooter' is defined outside. Let's move it inside 'Home' or pass 'mode' to it.
// Moving 'SiteFooter' inside 'Home' might valid, but let's just make it neutral to avoid complexity or pass props.
// However, the user asked for "rest of the page text where ever its blue to purple".
// Let's modify SiteFooter signature to accept mode.
const SiteFooter: FC<{ mode: "sponsorships" | "events" }> = React.memo(({ mode }) => (
  <footer className="mx-auto max-w-screen-2xl px-6 py-12 text-center text-sm text-slate-500 border-t border-slate-200 mt-12 bg-slate-50">
    <div className="flex justify-center gap-8 mb-6 font-medium">
      <a href="/privacy-policy" className={`text-slate-600 transition-colors ${mode === 'events' ? 'hover:text-purple-600' : 'hover:text-blue-600'}`}>Privacy Policy</a>
      <a href="/terms-of-service" className={`text-slate-600 transition-colors ${mode === 'events' ? 'hover:text-purple-600' : 'hover:text-blue-600'}`}>Terms of Service</a>
      <a href="/contact" className={`text-slate-600 transition-colors ${mode === 'events' ? 'hover:text-purple-600' : 'hover:text-blue-600'}`}>Contact</a>
    </div>
    <p>&copy; {new Date().getFullYear()} Cyphire Technologies Inc. All rights reserved.</p>
  </footer>
));

const FAQSection: FC<{ items: FAQItem[]; mode: "sponsorships" | "events" }> = React.memo(({ items, mode }) => {
  const [openIndex, setOpenIndex] = useState(0);
  return (
    <section aria-labelledby="faq-title" className="mx-auto max-w-4xl px-6 py-16">
      <SectionHeader id="faq-title" eyebrow="Questions" title="Everything you need to know" subtitle="If you have anything else on your mind, our support team is a heartbeat away." mode={mode} />
      <div className="space-y-3">
        {items.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <GlassCard key={item.question} className="overflow-hidden">
              <button onClick={() => setOpenIndex(isOpen ? -1 : index)} aria-expanded={isOpen} aria-controls={`faq-answer-${index}`} className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left text-slate-900 hover:bg-slate-50 transition-colors">
                <span className="text-sm font-semibold sm:text-base">{item.question}</span>
                <ChevronDown aria-hidden="true" className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div id={`faq-answer-${index}`} role="region" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }}>
                    <p className="px-6 pb-5 text-sm text-slate-600 leading-relaxed">{item.answer}</p>
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
    sessionStorage.setItem("lastHomeRoute", "/sponsorshiphome");
  }, []);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const modeFromQuery = searchParams.get("mode") === "events" ? "events" : "sponsorships";

  // State for Mode (Lifted from HeroSection)
  const [mode, setMode] = useState<"sponsorships" | "events">(modeFromQuery);

  useEffect(() => {
    setMode(modeFromQuery);
  }, [modeFromQuery]);

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

  // Updated Fetch to get ALL tasks (handle filtering client side to support switching)
  useEffect(() => { const controller = new AbortController(); setLoadingTasks(true); setTaskError(""); (async () => { try { const response = await fetch(`${API_BASE}/api/tasks`, { credentials: "include", cache: "no-store", signal: controller.signal }); if (!response.ok) throw new Error("Failed to fetch tasks"); const data = await response.json(); setTasks(Array.isArray(data) ? data : []); } catch (error: any) { if (error.name !== "AbortError") { console.error("Error fetching tasks:", error); setTaskError("We couldn't load live briefs. Try again soon."); } } finally { if (!controller.signal.aborted) setLoadingTasks(false); } })(); return () => controller.abort(); }, [reloadToken]);

  // Show only PREMIUM sponsorship-related tasks
  const sponsorshipTasks = useMemo(() => {
    return (tasks || []).filter((t) => {
      const cats = Array.isArray(t?.category) ? t.category : [t?.category];
      const isSponsorship = cats.some((c) => String(c || "").toLowerCase() === "sponsorship");
      const isPremium = t?.metadata?.tier === "premium";
      return isSponsorship && isPremium;
    });
  }, [tasks]);

  // Show EVENTS (assuming events also can be filtered by category 'event' or presence of contact info)
  const eventTasks = useMemo(() => {
    return (tasks || []).filter((t) => {
      // Logic borrowed from Events.jsx
      const cats = Array.isArray(t?.category) ? t.category : [t?.category];
      const catsLower = cats.map((c) => String(c || "").toLowerCase());
      const isSponsorship = catsLower.some((c) => c === "sponsorship");
      const isEvent = catsLower.some((c) => c === "event") || (!isSponsorship && t.metadata && t.metadata.contactEmail);
      // We can add a 'featured' or 'upcoming' filter here if events have tiers, for now show all events
      return isEvent && !isSponsorship;
    });
  }, [tasks]);

  // Carousel Logic
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Determine which list to show based on mode
  const currentTasks = mode === 'events' ? eventTasks : sponsorshipTasks;

  const checkScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
    }
  }, [currentTasks]); // Depend on currentTasks now

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [currentTasks, checkScroll]);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
      setTimeout(checkScroll, 500);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 antialiased font-sans">
      <AnimatePresence>{isInitialLoading && (<motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-50"><Loader2 className={`h-8 w-8 animate-spin ${mode === 'events' ? 'text-purple-600' : 'text-blue-600'}`} /></motion.div>)}</AnimatePresence>
      <header className="sticky top-0 z-50"><Suspense fallback={<div className="h-16 bg-white/50 backdrop-blur-xl" />}><Navbar /></Suspense></header>
      <main role="main">
        {/* All JSX content from here on is identical */}
        <Aurora /><Particles />
        <HeroSection navigate={navigate} mode={mode} setMode={setMode} />

        <section aria-labelledby="features-title" className="mx-auto max-w-screen-2xl px-6 py-16">
          <SectionHeader
            id="features-title"
            eyebrow="Why Cyphire"
            title="A marketplace engineered for outcomes"
            subtitle="Purpose-built primitives that reduce risk and increase throughput for both sides."
            mode={mode}
          />
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              const primaryPalette = mode === "events"
                ? {
                    cardHover: "hover:border-purple-200",
                    badge: "border-purple-100 bg-purple-50 text-purple-700",
                    link: "text-purple-600 hover:text-purple-700",
                  }
                : {
                    cardHover: "hover:border-blue-200",
                    badge: "border-blue-100 bg-blue-50 text-blue-700",
                    link: "text-blue-600 hover:text-blue-700",
                  };
              const palettes = [
                primaryPalette,
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
                      Learn more{" "}
                      <ArrowUpRight
                        aria-hidden="true"
                        className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </button>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="live-briefs-title" className={`relative py-24 overflow-hidden transition-colors duration-700 ${mode === 'events' ? 'bg-slate-900' : 'bg-slate-900'}`}>
          {/* Background Atmosphere - Dynamic */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div className={`absolute top-0 right-1/2 translate-x-1/2 w-[1000px] h-[500px] blur-[120px] rounded-full mix-blend-screen transition-colors duration-700 ${mode === 'events' ? 'bg-fuchsia-600/10' : 'bg-blue-600/10'}`} />
            <div className={`absolute bottom-0 left-0 w-[600px] h-[400px] blur-[100px] rounded-full mix-blend-screen transition-colors duration-700 ${mode === 'events' ? 'bg-purple-600/10' : 'bg-purple-600/10'}`} />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 contrast-150 mix-blend-overlay"></div>
            {/* Gradient Mask for Smooth Transition */}
            <div className={`absolute top-0 inset-x-0 h-24 bg-gradient-to-b opacity-10 transition-colors duration-700 ${mode === 'events' ? 'from-purple-50 to-transparent' : 'from-slate-50 to-transparent'}`}></div>
          </div>

          <div className="relative z-10 max-w-screen-2xl mx-auto px-6">
            <header className="mx-auto mb-12 max-w-3xl text-center">
              <AnimatePresence mode="wait">
                {mode === "events" ? (
                  <motion.div
                    key="events-header"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1 text-xs text-purple-300 font-medium">
                      <Calendar aria-hidden="true" className="h-3.5 w-3.5" /> Upcoming events
                    </div>
                    <h2 id="live-briefs-title" className="text-3xl md:text-4xl font-bold text-white">
                      <span className="text-purple-400">Where the community meets</span>
                    </h2>
                    <p className="mt-4 text-slate-300 max-w-2xl mx-auto text-lg">Curated tech events, hackathons, and gatherings happening soon.</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="sponsorship-header"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-xs text-blue-300 font-medium">
                      <Sparkles aria-hidden="true" className="h-3.5 w-3.5" /> Live briefs
                    </div>
                    <h2 id="live-briefs-title" className="text-3xl md:text-4xl font-bold text-white"><GradientText>Fresh missions picking up signal</GradientText></h2>
                    <p className="mt-4 text-slate-300 max-w-2xl mx-auto text-lg">A snapshot of what teams are shipping on Cyphire right now.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </header>

            <div className="relative group/carousel">
              {/* Left Arrow */}
              {canScrollLeft && (
                <button
                  onClick={() => scroll("left")}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 p-3 rounded-full bg-white/10 border border-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all active:scale-95 shadow-xl"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}

              {/* Right Arrow */}
              {canScrollRight && (
                <button
                  onClick={() => scroll("right")}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 p-3 rounded-full bg-white/10 border border-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all active:scale-95 shadow-xl"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}

              <div
                ref={scrollContainerRef}
                onScroll={checkScroll}
                className="flex overflow-x-auto gap-6 pb-4 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {loadingTasks ? (
                  [0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="min-w-[280px] md:min-w-[calc(20%-1.2rem)] flex-shrink-0 snap-start">
                      <Shimmer className="h-[420px] bg-white/5 border-white/5" />
                    </div>
                  ))
                ) : currentTasks.length > 0 ? (
                  currentTasks.map((task) => (
                    <div
                      key={task._id}
                      className="flex-shrink-0 snap-start w-[85vw] sm:w-[calc(50%-12px)] md:w-[calc(33.33%-16px)] lg:w-[calc(25%-18px)] xl:w-[calc(20%-19.2px)]"
                    >
                      <div className="relative group rounded-xl overflow-hidden bg-transparent perspective-1000 h-full">
                        <SponsorCard
                          sponsor={task}
                          onClick={() => navigate(mode === "events" ? `/task/${task._id}` : `/sponsorship/${task._id}`)}
                          onContact={undefined}
                          onSave={undefined}
                          onShare={undefined}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <GlassCard className="w-full flex flex-col items-center justify-center gap-3 px-6 py-20 text-slate-500 bg-white/5 border-dashed border-white/10 mx-auto">
                    <BadgeCheck aria-hidden="true" className={`h-8 w-8 ${mode === 'events' ? 'text-purple-300' : 'text-blue-300'}`} />
                    <p className="text-slate-400">{mode === 'events' ? "No upcoming events found right now." : "No premium briefs yet—check back in a moment."}</p>
                  </GlassCard>
                )}
              </div>
            </div>

            <div className="mt-12 flex items-center justify-center">
              <button
                onClick={() => navigate(mode === 'events' ? "/events" : "/sponsorships")}
                className={`group inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-white font-medium transition-all hover:bg-white/10 hover:shadow-sm hover:text-white active:scale-95`}
              >
                {mode === 'events' ? "View all Events" : "View all Sponsorships"}
                <ChevronRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </section>

        <section aria-labelledby="security-title" className="mx-auto max-w-screen-2xl px-6 py-16">
          <SectionHeader id="security-title" eyebrow="Security & compliance" title="Enterprise-grade controls without the drag" subtitle="Cyphire builds governance into every workflow so your legal and finance teams can sleep at night." mode={mode} />
          <div className="text-center mb-10"><span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700"><ShieldCheck aria-hidden="true" className="h-5 w-5" /> SOC-2 Compliant Infrastructure</span></div>
          <div className="grid gap-6 md:grid-cols-3">{SECURITY_PILLARS.map((p, i) => { const Icon = p.icon; return (<motion.div key={p.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5, delay: i * 0.1 }}><GlassCard className="flex flex-col gap-4 p-6 h-full hover:border-emerald-300 hover:shadow-md transition-all"><div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600"><Icon aria-hidden="true" className="h-6 w-6" /></div><h3 className="text-lg font-bold text-slate-900">{p.title}</h3><p className="text-sm text-slate-600 leading-relaxed">{p.desc}</p></GlassCard></motion.div>); })}</div>
        </section>

        <section aria-labelledby="testimonials-title" className="mx-auto max-w-screen-2xl px-6 py-16">
          <SectionHeader id="testimonials-title" eyebrow="Signal over noise" title="Teams that switched to Cyphire" subtitle="Our customers ship faster because escrow, talent, and operations finally live in one environment." mode={mode} />
          <div className="grid gap-6 md:grid-cols-3">{TESTIMONIALS.map((item, i) => (<motion.div key={item.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5, delay: i * 0.1 }}><GlassCard className={`flex h-full flex-col gap-5 p-6 hover:shadow-md transition-all ${mode === 'events' ? 'hover:border-purple-200' : 'hover:border-blue-200'}`}><div className="flex items-center gap-1 text-amber-500">{[...Array(5)].map((_, i) => (<Star key={i} aria-hidden="true" className="h-4 w-4 fill-current" />))}</div><p className="text-slate-700 leading-relaxed italic">"{item.quote}"</p><div className="mt-auto text-sm text-slate-500"><div className="font-bold text-slate-900">{item.name}</div><div className="mt-0.5">{item.role}</div></div></GlassCard></motion.div>))}</div>
        </section>

        <FAQSection items={FAQ_ITEMS} mode={mode} />

        <section aria-label="Final Call to Action" className="relative mx-auto max-w-6xl px-6 pb-20 pt-8">
          <div className={`absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br blur-3xl opacity-50 transition-colors duration-700 ${mode === 'events' ? 'from-purple-500/10 via-fuchsia-500/5 to-pink-500/10' : 'from-blue-500/10 via-indigo-500/5 to-sky-500/10'}`} />
          <GlassCard className="overflow-hidden rounded-3xl border-slate-200 bg-white p-8 md:p-12 shadow-md relative z-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl space-y-4">
                <h3 className="text-3xl font-bold text-slate-900 md:text-4xl"><GradientText className={mode === 'events' ? 'text-purple-600' : 'text-blue-600'}>Ready to launch your next mission?</GradientText></h3>
                <p className="text-lg text-slate-600 leading-relaxed">Choose the runway that fits your team. Upgrade anytime—your escrow, workflows, and insights come with you.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 lg:flex-col"><NeonButton onClick={() => navigate("/signup")} className={`whitespace-nowrap ${mode === 'events' ? '!bg-purple-600 hover:!bg-purple-700' : ''}`}>Get Started Free <ArrowRight aria-hidden="true" className="h-4 w-4" /></NeonButton><button onClick={() => navigate("/contact")} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:shadow-sm hover:border-slate-300 active:scale-95">Talk to Sales <ArrowUpRight aria-hidden="true" className="h-4 w-4" /></button></div>
            </div>
          </GlassCard>
        </section>

        <Suspense fallback={null}><Footer /></Suspense>
        <SiteFooter mode={mode} />
      </main>
      <BackToTopButton />
    </div>
  );
}
