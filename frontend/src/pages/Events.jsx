/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom"; // Added Link
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
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-purple-400 opacity-20 blur-[100px]"></div>
        <div className="absolute right-0 bottom-0 -z-10 h-[310px] w-[310px] rounded-full bg-fuchsia-400 opacity-20 blur-[100px]"></div>
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
            {isFiltered ? 'No matches found' : 'No events listed yet'}
        </h3>
        <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">
            {isFiltered ? 'Try adjusting your filters or search terms.' : 'Be the first to list your event for sponsorship.'}
        </p>
        {!isFiltered && (
            <Link to="/list-event" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition shadow-sm">
                <FiZap className="w-4 h-4" /> List Event
            </Link>
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
                <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                    <Filter className="h-4 w-4" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Filters</h2>
            </div>

            {/* Event Types */}
            <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Layers className="h-4 w-4 text-purple-500" /> Event Types
                </label>
                <select value={filters.selectedEvent} onChange={(e) => setters.setSelectedEvent(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 outline-none transition-all">
                    <option value="">All Events</option>
                    {eventOptions.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                </select>
            </div>

            {/* Expected Returns */}
            <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Gift className="h-4 w-4 text-fuchsia-500" /> Expected Returns
                </label>
                <select value={filters.selectedReturn} onChange={(e) => setters.setSelectedReturn(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 outline-none transition-all">
                    <option value="">Any Return</option>
                    {returnOptions.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                </select>
            </div>

            {/* Budget Range */}
            <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Wallet className="h-4 w-4 text-violet-500" /> Budget Range
                </label>
                <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                            <span>Min</span>
                            <span className="font-semibold text-slate-700">₹{Number(filters.minBudget).toLocaleString()}</span>
                        </div>
                        <input type="range" min="0" max="500000" step="10000" value={filters.minBudget} onChange={(e) => setters.setMinBudget(e.target.value)} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                    </div>
                    <div>
                        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                            <span>Max</span>
                            <span className="font-semibold text-slate-700">₹{Number(filters.maxBudget).toLocaleString()}</span>
                        </div>
                        <input type="range" min="0" max="500000" step="10000" value={filters.maxBudget} onChange={(e) => setters.setMaxBudget(e.target.value)} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                    </div>
                </div>
            </div>

            {/* Tier */}
            <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Award className="h-4 w-4 text-amber-500" /> Details
                </label>
                <div className="grid grid-cols-3 gap-2">
                    {["", "basic", "premium"].map((tierOption) => (
                        <button
                            key={tierOption}
                            onClick={() => setters.setSelectedTier(tierOption)}
                            className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all
                                ${filters.selectedTier === tierOption
                                    ? "bg-purple-600 text-white border-purple-600 shadow-sm"
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
   Main Page Component: Events Marketplace
   ====================================================== */
export default function Events() {
    const [events, setEvents] = useState([]);
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
                const res = await fetch(`${API_BASE}/api/tasks?category=Event`, { cache: "no-store", signal });
                if (!res.ok) throw new Error("Failed to fetch events");
                const data = await res.json();

                // Keep ONLY Event listings
                const onlyEvents = data.filter((t) => {
                    const cat = t?.category;
                    if (typeof cat === "string") return cat.toLowerCase() === "event";
                    if (Array.isArray(cat)) return cat.some((c) => String(c).toLowerCase() === "event");
                    return false;
                });

                // Pre-process
                const processed = onlyEvents.map((s) => ({
                    ...s,
                    budgetValue: parseInt((s.metadata?.budgetRange || "0").replace(/[^0-9]/g, "")) || 0,
                }));
                setEvents(processed);

            } catch (e) {
                if (e.name !== 'AbortError') console.error(e);
            } finally {
                setLoading(false);
            }
        })();
        return () => controller.abort();
    }, []);

    const filteredEvents = useMemo(() => {
        return events.filter((s) => {
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
    }, [events, debouncedSearch, selectedEvent, selectedReturn, minBudget, maxBudget, selectedTier]);

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
                    {/* Header */}
                    <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                                Find <span className="text-purple-600">Events</span> to Sponsor
                            </h1>
                            <p className="mt-2 text-slate-500 max-w-2xl">
                                Connect with organizers, boost brand visibility, and drive engagement.
                            </p>
                        </div>
                        <Link to="/list-event">
                            <button className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-purple-700 transition-all shadow-sm active:scale-95">
                                <span className="text-lg">+</span> List Your Event
                            </button>
                        </Link>
                    </div>

                    {/* Loading State or Content */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200 h-96 animate-pulse">
                                    <div className="h-48 bg-slate-100 rounded-xl mb-4" />
                                    <div className="h-6 bg-slate-100 rounded w-3/4 mb-3" />
                                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {/* Premium Section */}
                            {filteredEvents.some(s => s.metadata?.tier === "premium") && (
                                <section>
                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="p-1.5 bg-yellow-100 text-yellow-600 rounded-lg">
                                            <FiStar className="fill-current" />
                                        </div>
                                        <h2 className="text-xl font-bold text-slate-900">Premium Opportunities</h2>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {filteredEvents
                                            .filter(s => s.metadata?.tier === "premium")
                                            .slice(0, 4)
                                            .map((sponsor) => (
                                                <SponsorCard key={sponsor._id} sponsor={sponsor} />
                                            ))}
                                    </div>
                                </section>
                            )}

                            {/* All Listings */}
                            <section>
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-slate-900">All Upcoming Events</h2>
                                    <span className="text-slate-500 text-sm font-medium">{filteredEvents.length} results</span>
                                </div>

                                {filteredEvents.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {filteredEvents.map((sponsor) => (
                                            <SponsorCard key={sponsor._id} sponsor={sponsor} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                            <FiSearch size={24} />
                                        </div>
                                        <h3 className="text-lg font-semibold text-slate-900">No events found</h3>
                                        <p className="text-slate-500">Try adjusting your filters or search terms.</p>
                                    </div>
                                )}
                            </section>
                        </div>
                    )}
                </main>
            </div>

            {/* Mobile Filter Drawer */}
            < AnimatePresence >
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
                                className="w-full mt-8 bg-purple-600 text-white rounded-xl py-3 font-semibold hover:bg-purple-700 transition"
                            >
                                Show Results
                            </button>
                        </motion.div>
                    </motion.div>
                )
                }
            </AnimatePresence >

            <Footer />
        </div >
    );
}