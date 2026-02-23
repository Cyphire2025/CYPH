/* eslint-disable no-unused-vars */
// src/pages/Tasks.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import NavbarSpon from "../components/navbarsponhome.jsx";
import NavbarHome from "../components/navbarhome.jsx";
import Footer from "../components/footer";
import { GradientText } from "./home"; // ✅ reuse your components
import { motion, useMotionValue, useTransform } from "framer-motion";
import {
  Sparkles,
  BadgeCheck,
  Flame,
  Trophy,
  Briefcase,
  Layers,
  Bolt,
  Compass,
  ChevronRight,
  ArrowRight,
  Star,
  Search,
  Filter,
  Calendar,
  Wallet,
  ToggleRight,
} from "lucide-react";


const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:5000";

const inr = (n) =>
  typeof n === "number"
    ? new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n)
    : "—";

export const NeonButton = ({ children, className = "", ...props }) => (
  <button
    {...props}
    className={`relative inline-flex items-center gap-2 rounded-md px-6 py-3 
      text-sm font-medium text-white transition-all duration-200 
      bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 shadow-sm hover:shadow-md ${className}`}
  >
    <span className="relative inline-flex items-center gap-2">{children}</span>
  </button>
);

export const TiltTaskCard = ({ task }) => {
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rotateX = useTransform(y, [0, 1], [10, -10]);
  const rotateY = useTransform(x, [0, 1], [-12, 12]);

  // Seven-day window based on createdAt
  const createdAt = new Date(task.createdAt || Date.now());
  const expireDate = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const daysLeft = Math.ceil((expireDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // Categories: show up to 3
  const cats = Array.isArray(task.category) ? task.category.slice(0, 3) : [];

  // Vacancies: show remaining of total (if applicants known)
  // Vacancies: show applied/total
  const totalSeats = Number(task.numberOfApplicants) || 0;           // capacity
  const applied = Array.isArray(task.applicants) ? task.applicants.length : 0;  // current



  return (
    <motion.div
      className="relative group rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-blue-200 overflow-hidden"
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
      {/* 🏙️ Banner / Logo */}
      <div className="h-40 w-full bg-slate-50 border-b border-slate-100 flex items-center justify-center overflow-hidden relative group-hover:bg-slate-100 transition-colors">
        {task.logo?.url ? (
          <img
            src={task.logo.url}
            alt="task-logo"
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : task.attachments?.length > 0 ? (
          <img
            src={task.attachments[0].url}
            alt="task-attachment"
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <Briefcase className="h-8 w-8 opacity-20" />
            <span className="text-xs font-medium opacity-50 uppercase tracking-widest">No Logo</span>
          </div>
        )}
      </div>

      {/* Animated border shine (Subtle Blue) */}
      <div className="pointer-events-none absolute -inset-24 opacity-0 group-hover:opacity-100 transition duration-500"
        style={{
          background:
            "radial-gradient(600px circle at var(--x,50%) var(--y,50%), rgba(59,130,246,0.05), transparent 35%)",
        }}
      />
      <div className="relative p-6">
        {/* Categories (max 3) */}
        {cats.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            {cats.map((c, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600 font-medium"
              >
                <Star className="h-3 w-3 text-slate-400" /> {c}
              </span>
            ))}
          </div>
        )}

        {/* Title + Desc */}
        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-1">{task.title}</h3>
        <p className="mt-2 text-sm text-slate-600 line-clamp-3 min-h-[3.75rem] leading-relaxed">{task.description}</p>

        {/* Price + Vacancies + Days left */}
        <div className="mt-5 grid grid-cols-3 gap-2 text-[13px] text-slate-700">
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 text-center">
            <div className="text-xs text-slate-500 mb-0.5">Budget</div>
            <div className="font-semibold text-slate-900">{inr(task.price)}</div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 text-center">
            <div className="text-xs text-slate-500 mb-0.5">Vacancies</div>
            <div className="font-semibold text-slate-900">
              {totalSeats > 0 ? `${applied}/${totalSeats} ` : "—"}
            </div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 text-center">
            <div className="text-xs text-slate-500 mb-0.5">Apply in</div>
            <div className={`font-semibold ${daysLeft <= 0 ? "text-red-600" : "text-slate-900"}`}>
              {daysLeft > 0 ? `${daysLeft}d` : "Expired"}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-5 pt-5 border-t border-slate-100 flex items-center justify-between">
          <button
            className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors group/btn"
            onClick={() => (window.location.href = `/task/${task._id || task.id}`)}
          >
            View Task <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
          </button>


          {/* Subtle pulse dot */}
          <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
            <span className={`h-1.5 w-1.5 rounded-full ${daysLeft > 0 ? "bg-emerald-500" : "bg-red-500"} ${daysLeft > 0 && "animate-pulse"}`} />
            <span className="text-xs font-medium text-slate-500">{applied} applied</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function Tasks() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const Nav = useMemo(() => {
    const last = sessionStorage.getItem("lastHomeRoute");
    return last === "/sponsorshiphome" ? NavbarSpon : NavbarHome;
  }, []);
  // Filters
  const [selectedCategory, setSelectedCategory] = useState("");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [deadlineFilter, setDeadlineFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");


  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/tasks`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch tasks");
        const data = await res.json();
        if (alive) setTasks(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Error fetching tasks:", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Filter logic
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 🚫 Skip sponsorship listings AND event listings
      const catStr = Array.isArray(task.category) ? task.category.join(" ") : String(task.category);
      if (
        catStr.toLowerCase().includes("sponsorship") ||
        catStr.toLowerCase().includes("event")
      ) {
        return false;
      }

      if (selectedCategory && !task.category.includes(selectedCategory)) return false;
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      if (minBudget && Number(task.price) < Number(minBudget)) return false;
      if (maxBudget && Number(task.price) > Number(maxBudget)) return false;

      if (deadlineFilter) {
        const deadline = new Date(task.deadline);
        const now = new Date();
        if (deadlineFilter === "week") {
          const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          if (deadline > weekFromNow) return false;
        } else if (deadlineFilter === "month") {
          const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          if (deadline > monthFromNow) return false;
        }
      }

      if (statusFilter && task.status !== statusFilter) return false;

      return true;
    });
  }, [tasks, selectedCategory, minBudget, maxBudget, deadlineFilter, statusFilter, searchQuery]);


  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Nav />

      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-20 flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full md:w-72 space-y-8 rounded-lg border border-slate-200 bg-white p-6 h-fit md:sticky md:top-24 relative shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4">
            <Filter className="h-5 w-5 text-blue-600" />
            <span>Filters</span>
          </h2>

          {/* Category */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Layers className="h-4 w-4 text-slate-500" /> Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="">All Categories</option>
              <option value="Tech">Tech</option>
              <option value="Education">Education</option>
              <option value="Architecture">Architecture</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Event Management">Event Management</option>
              <option value="Home & Safety">Home & Safety</option>
            </select>
          </div>

          {/* Budget Dual Slider */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Wallet className="h-4 w-4 text-slate-500" /> Budget Range
            </label>
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium tracking-wide">
              <span className="bg-slate-100 px-2 py-1 rounded">₹{minBudget || "0"}</span>
              <span className="bg-slate-100 px-2 py-1 rounded">₹{maxBudget || "1L+"}</span>
            </div>
            <div className="flex flex-col gap-3 py-1">
              <input
                type="range"
                min="0"
                max="100000"
                step="1000"
                value={minBudget}
                onChange={(e) => setMinBudget(e.target.value)}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <input
                type="range"
                min="0"
                max="100000"
                step="1000"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Calendar className="h-4 w-4 text-slate-500" /> Deadline
            </label>
            <select
              value={deadlineFilter}
              onChange={(e) => setDeadlineFilter(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="">Any Time</option>
              <option value="week">Ending this week</option>
              <option value="month">Ending this month</option>
            </select>
          </div>

          {/* Status Toggle */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <ToggleRight className="h-4 w-4 text-slate-500" /> Status
            </label>
            <div className="flex flex-col gap-2.5">
              {["pending", "in-progress", "completed"].map((status) => (
                <label key={status} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={statusFilter === status}
                    onChange={() => setStatusFilter(statusFilter === status ? "" : status)}
                    className="peer hidden"
                  />
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${statusFilter === status ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300 group-hover:border-blue-400"}`}>
                    {statusFilter === status && <Sparkles className="h-2.5 w-2.5 text-white" />}
                  </div>
                  <span className="capitalize text-sm text-slate-600 peer-checked:text-blue-700 peer-checked:font-medium transition-colors">{status.replace('-', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>


        {/* Task Grid */}
        <main className="flex-1">
          <h1 className="text-3xl font-bold mb-2 tracking-tight text-slate-900">
            Find Work
          </h1>
          <p className="text-slate-500 mb-8 max-w-2xl">
            Discover active briefs, apply instantly, and start earning through secure escrow.
          </p>

          {/* 🔍 Search Bar */}
          <div className="relative mb-10 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 transition-colors group-focus-within:text-blue-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks by keyword (e.g., 'React developer', 'Logo design')"
              className="w-full rounded-lg bg-white border border-slate-200 pl-12 pr-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm group-hover:border-slate-300"
            />
          </div>


          {loading ? (
            <p className="text-slate-500 text-center py-20">Loading tasks...</p>
          ) : filteredTasks.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTasks.map((task) => (
                <TiltTaskCard key={task._id} task={task} />
              ))}
            </div>
          ) : (
            <div className="text-center py-24 rounded-2xl border border-slate-200 bg-white border-dashed">
              <div className="mx-auto h-12 w-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-4">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">No tasks found</h3>
              <p className="text-slate-500 max-w-sm mx-auto mt-2">Try adjusting your search or filters to find what you're looking for.</p>
              <button
                onClick={() => { setSelectedCategory(""); setMinBudget(""); setMaxBudget(""); setDeadlineFilter(""); setStatusFilter(""); setSearchQuery(""); }}
                className="mt-6 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Clear all filters
              </button>
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}
