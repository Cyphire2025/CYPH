/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSearch, FiX, FiExternalLink, FiHeart, FiShare2, FiZap } from "react-icons/fi";
import { Filter, Layers, Wallet, Gift, Star, TrendingUp, Shield, Award } from "lucide-react";
import Navbar from "../components/navbarsponhome";
import Footer from "../components/footer";
import toast from "react-hot-toast";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:5000";

// Custom hook to debounce input
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};

/* ======================================================
   Background Effects (Light Theme)
   ====================================================== */
const Background = React.memo(() => (
    <div className="absolute inset-0 -z-10 h-full w-full bg-slate-50 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-400 opacity-20 blur-[100px]"></div>
        <div className="absolute right-0 bottom-0 -z-10 h-[310px] w-[310px] rounded-full bg-indigo-400 opacity-20 blur-[100px]"></div>
    </div>
));

/* ======================================================
   Sponsor Card
   ====================================================== */
import SponsorCard from "../components/SponsorCard";


/* ======================================================
   Empty State
   ====================================================== */
const EmptyState = ({ isFiltered }) => (
    <div className="text-center py-20 px-4 md:col-span-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-4xl"
        >
            {isFiltered ? '🔍' : '✨'}
        </motion.div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">
            {isFiltered ? 'No matches found' : 'No sponsors listed yet'}
        </h3>
        <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">
            {isFiltered ? 'Try adjusting your filters or search terms.' : 'Be the first to list your brand as a sponsor and gain visibility.'}
        </p>
        {!isFiltered && (
            <a href="/List-Sponsorship" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition shadow-sm shadow-blue-500/20">
                <FiZap className="w-4 h-4" /> List as Sponsor
            </a>
        )}
    </div>
);


/* ======================================================
   Filter Sidebar Component
   ====================================================== */
const FilterControls = ({
    eventOptions,
    returnOptions,
    filters,
    setters,
}) => {
    return (
        <aside className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                    <Filter className="h-4 w-4" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Filters</h2>
            </div>

            {/* Event Types */}
            <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Layers className="h-4 w-4 text-blue-500" /> Event Types
                </label>
                <select value={filters.selectedEvent} onChange={(e) => setters.setSelectedEvent(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all">
                    <option value="">All Events</option>
                    {eventOptions.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                </select>
            </div>

            {/* Expected Returns */}
            <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Gift className="h-4 w-4 text-emerald-500" /> Expected Returns
                </label>
                <select value={filters.selectedReturn} onChange={(e) => setters.setSelectedReturn(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all">
                    <option value="">Any Return</option>
                    {returnOptions.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                </select>
            </div>

            {/* Budget Range */}
            <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Wallet className="h-4 w-4 text-purple-500" /> Budget Range
                </label>
                <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                            <span>Min</span>
                            <span className="font-semibold text-slate-700">₹{Number(filters.minBudget).toLocaleString()}</span>
                        </div>
                        <input type="range" min="0" max="500000" step="10000" value={filters.minBudget} onChange={(e) => setters.setMinBudget(e.target.value)} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                    </div>
                    <div>
                        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                            <span>Max</span>
                            <span className="font-semibold text-slate-700">₹{Number(filters.maxBudget).toLocaleString()}</span>
                        </div>
                        <input type="range" min="0" max="500000" step="10000" value={filters.maxBudget} onChange={(e) => setters.setMaxBudget(e.target.value)} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                    </div>
                </div>
            </div>

            {/* Tier */}
            <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Award className="h-4 w-4 text-amber-500" /> Sponsor Tier
                </label>
                <div className="grid grid-cols-3 gap-2">
                    {["", "basic", "premium"].map((tierOption) => (
                        <button
                            key={tierOption}
                            onClick={() => setters.setSelectedTier(tierOption)}
                            className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all
                                ${filters.selectedTier === tierOption
                                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                        >
                            {tierOption === "" ? "Any" : tierOption.charAt(0).toUpperCase() + tierOption.slice(1)}
                        </button>
                    ))}
                </div>
            </div>
        </aside>
    );
};


/* ======================================================
   Main Page Component
   ====================================================== */
export default function Sponsorships() {
    const [sponsorships, setSponsorships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFilterOpen, setFilterOpen] = useState(false);

    // Filter states
    const [minBudget, setMinBudget] = useState("0");
    const [maxBudget, setMaxBudget] = useState("500000");
    const [selectedTier, setSelectedTier] = useState("");
    const [search, setSearch] = useState("");
    const [selectedEvent, setSelectedEvent] = useState("");
    const [selectedReturn, setSelectedReturn] = useState("");

    const debouncedSearch = useDebounce(search, 300);

    const eventOptions = useMemo(() => [
        "College Fest", "Tech Seminar", "Hackathon", "Cultural Event",
        "Corporate Conference", "Community Meetup", "Concert / Festival",
    ], []);
    const returnOptions = useMemo(() => [
        "Logo on Posters / Flyers", "Stall / Booth at Venue", "Social Media Mentions",
        "Mentions in Brochure / Announcements", "Free Passes / VIP Invites",
        "Banner Display at Venue", "Branding on Merchandise",
    ], []);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        (async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE}/api/tasks?category=Sponsorship`, { cache: "no-store", signal });
                if (!res.ok) throw new Error("Failed to fetch sponsorships");
                const data = await res.json();

                // Keep ONLY true Sponsorship listings
                const onlySponsorships = data.filter((t) => {
                    const cat = t?.category;
                    if (typeof cat === "string") return cat.toLowerCase() === "sponsorship";
                    if (Array.isArray(cat)) return cat.some((c) => String(c).toLowerCase() === "sponsorship");
                    return false;
                });

                // Pre-process
                const processed = onlySponsorships.map((s) => ({
                    ...s,
                    budgetValue: parseInt((s.metadata?.budgetRange || "0").replace(/[^0-9]/g, "")) || 0,
                }));
                setSponsorships(processed);

            } catch (e) {
                if (e.name !== 'AbortError') console.error(e);
            } finally {
                setLoading(false);
            }
        })();
        return () => controller.abort();
    }, []);

    const filteredSponsors = useMemo(() => {
        return sponsorships.filter((s) => {
            const searchLower = debouncedSearch.toLowerCase();
            const inSearch = !debouncedSearch ||
                s.title.toLowerCase().includes(searchLower) ||
                (s.description || "").toLowerCase().includes(searchLower);

            const eventsOk = !selectedEvent || (s.metadata?.eventTypes || []).includes(selectedEvent);
            const returnsOk = !selectedReturn || (s.metadata?.expectedReturns || []).includes(selectedReturn);

            const budgetOk = s.budgetValue >= parseInt(minBudget) && s.budgetValue <= parseInt(maxBudget);
            const tierOk = !selectedTier || s.metadata?.tier === selectedTier;

            return inSearch && eventsOk && returnsOk && budgetOk && tierOk;
        });
    }, [sponsorships, debouncedSearch, selectedEvent, selectedReturn, minBudget, maxBudget, selectedTier]);

    const filterProps = {
        eventOptions,
        returnOptions,
        filters: { minBudget, maxBudget, selectedTier, selectedEvent, selectedReturn },
        setters: { setMinBudget, setMaxBudget, setSelectedTier, setSelectedEvent, setSelectedReturn }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 relative font-sans">
            <Navbar />
            <Background />

            {/* Main Content Layout */}
            <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-20 flex flex-col md:flex-row gap-8 relative z-10">

                {/* Sidebar Filters */}
                <aside className="w-full md:w-72 h-fit md:sticky md:top-28 relative">
                    <div className="md:block hidden">
                        {/* Reusing FilterControls but stripped slightly if needed, or just as is */}
                        <FilterControls {...filterProps} />
                    </div>
                    {/* Mobile Toggle Button (only visible on small screens when we are not showing the full sidebar) */}
                    <button
                        onClick={() => setFilterOpen(true)}
                        className="w-full md:hidden flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold shadow-sm active:scale-95 transition-all mb-4"
                    >
                        <Filter className="h-4 w-4" />
                        Filters & Sort
                    </button>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 min-w-0">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="mb-8"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm">
                            <FiZap className="w-3 h-3" /> Event Partnerships
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4">
                            Find the perfect <span className="text-blue-600">Sponsor</span>.
                        </h1>
                        <p className="max-w-2xl text-lg text-slate-600">
                            Connect with top brands and organizations ready to support your next big event.
                        </p>
                    </motion.div>

                    {/* Search Bar */}
                    <div className="mb-8 relative group max-w-2xl">
                        <div className="absolute inset-0 bg-blue-500/5 rounded-2xl blur-xl group-hover:bg-blue-500/10 transition-all duration-300" />
                        <div className="relative bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 flex items-center p-2 focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-400 transition-all">
                            <div className="pl-4 text-slate-400">
                                <FiSearch className="h-5 w-5" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search sponsors by name, industry, or description..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-transparent border-none px-4 py-3 text-slate-900 placeholder-slate-400 focus:ring-0 outline-none text-base"
                            />
                            {search && (
                                <button onClick={() => setSearch("")} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                                    <FiX />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Sponsorship Grid */}
                    <div>
                        {loading ? (
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                    <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 h-80 animate-pulse">
                                        <div className="h-32 bg-slate-100 rounded-xl mb-4" />
                                        <div className="h-4 bg-slate-100 rounded w-3/4 mb-3" />
                                        <div className="h-3 bg-slate-100 rounded w-1/2 mb-6" />
                                        <div className="space-y-2">
                                            <div className="h-3 bg-slate-100 rounded w-full" />
                                            <div className="h-3 bg-slate-100 rounded w-5/6" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredSponsors.length > 0 ? (
                            <div className="space-y-8">
                                {/* Premium/Featured Section (only if not searching) */}
                                {!search && !selectedEvent && !selectedTier && filteredSponsors.some(s => s.metadata?.tier === "premium") && (
                                    <div className="mb-8">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Star className="h-5 w-5 text-yellow-400 fill-current" />
                                            <h2 className="text-xl font-bold text-slate-800">Premium Sponsors</h2>
                                        </div>
                                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                            {filteredSponsors
                                                .filter(s => s.metadata?.tier === "premium")
                                                .slice(0, 4)
                                                .map((s) => (
                                                    <SponsorCard
                                                        key={s._id}
                                                        sponsor={s}
                                                        onContact={(id) => console.log('Contacted', id)}
                                                        onSave={(id, saved) => console.log('Saved', id, saved)}
                                                        onShare={(id) => console.log('Shared', id)}
                                                    />
                                                ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    {(!search && !selectedEvent && !selectedTier && filteredSponsors.some(s => s.metadata?.tier === "premium")) && (
                                        <h3 className="text-lg font-bold text-slate-700 mb-4 px-1">All Sponsors</h3>
                                    )}
                                    <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                        <AnimatePresence>
                                            {filteredSponsors
                                                // Avoid showing premium ones twice if we showed the featured section
                                                .filter(s => search || selectedEvent || selectedTier || s.metadata?.tier !== "premium" || filteredSponsors.filter(x => x.metadata?.tier === "premium").length > 3)
                                                .map((s) => (
                                                    <SponsorCard
                                                        key={s._id}
                                                        sponsor={s}
                                                        onContact={(id) => console.log('Contacted', id)}
                                                        onSave={(id, saved) => console.log('Saved', id, saved)}
                                                        onShare={(id) => console.log('Shared', id)}
                                                    />
                                                ))}
                                        </AnimatePresence>
                                    </motion.div>
                                </div>
                            </div>
                        ) : (
                            <EmptyState isFiltered={sponsorships.length > 0} />
                        )}
                    </div>
                </main>
            </div>

            {/* Mobile Filter Drawer */}
            <AnimatePresence>
                {isFilterOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 md:hidden"
                        onClick={() => setFilterOpen(false)}
                    >
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute inset-y-0 right-0 w-full max-w-xs bg-white shadow-2xl p-6 overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-slate-900">Filters</h2>
                                <button onClick={() => setFilterOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                                    <FiX size={24} />
                                </button>
                            </div>
                            <FilterControls {...filterProps} />
                            <button
                                onClick={() => setFilterOpen(false)}
                                className="w-full mt-8 bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 transition"
                            >
                                Show Results
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Footer />
        </div>
    );
}