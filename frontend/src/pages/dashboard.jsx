// src/pages/dashboard.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import NavbarSpon from "../components/navbarsponhome.jsx";
import NavbarHome from "../components/navbarhome.jsx";
import Footer from "../components/footer";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Loader2,
  FolderOpenDot,
  BadgeCheck,
  Sparkles,
  Users,
  Timer,
  Target,
  Plus,
  Rocket,
  Filter,
  Search,
  PencilLine,
  Save,
  CircleX,
  Eye,
} from "lucide-react";
import { apiFetch } from "../lib/fetch";
import { safeMediaUrl, safeSlug } from "../utils/safeUrl";

/**
 * Backend + Razorpay
 * Ensure:
 *  - VITE_API_BASE (or falls back to localhost)
 *  - VITE_RAZORPAY_KEY_ID
 *  - index.html includes Razorpay:
 *    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
 */
const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:5000";
const RAZORPAY_KEY = import.meta.env?.VITE_RAZORPAY_KEY_ID;
const WORKROOM_BASE = (() => {
  const fromEnv = import.meta.env?.VITE_WORKROOM_BASE;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return `${window.location.protocol}//${host}:5174`;
  }

  return "https://workroom.cyphire.in";
})();

/* =========================================================
   Design tokens (keeps brand, adds restraint & consistency)
   ========================================================= */
const Tokens = () => (
  <style>{`
    :root {
      --brand-fg: #3b82f6;            /* blue-500 */
      --brand-fg-2: #6366f1;          /* indigo-500 */
      --text-1: #0f172a;              /* slate-900 */
      --text-2: #475569;              /* slate-600 */
      --text-3: #94a3b8;              /* slate-400 */
      --card-bg: #ffffff;
      --card-bd: #e2e8f0;             /* slate-200 */
      --surface-0: #f8fafc;           /* slate-50 */
      --radius-xl: 1rem;
      --ring: rgba(59,130,246,0.35);
    }
  `}</style>
);

/* =========================
   Reusable, semantic surfaces
   ========================= */
function Glass({ className = "", as: As = "div", elevation = 1, children, ...rest }) {
  // Light theme: white background with subtle border and shadow
  return (
    <As
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
      {...rest}
    >
      {children}
    </As>
  );
}

const Skel = ({ w = "w-full", h = "h-4", className = "" }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${w} ${h} ${className}`} />
);

/* ======================
   Dashboard main
   ====================== */
export default function DashboardPage() {
  const navigate = useNavigate();
  const Nav = useMemo(() => {
    const last = sessionStorage.getItem("lastHomeRoute");
    return last === "/sponsorshiphome" || last === "/sponsorship-mode" ? NavbarSpon : NavbarHome;
  }, []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // data
  const [me, setMe] = useState(null);
  const [tasks, setTasks] = useState([]);

  // tab (URL-shareable via ?tab=)
  const initialTab = useMemo(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    return ["myTasks", "myEvents", "myApplications", "mySponsorships"].includes(t) ? t : "myTasks";
  }, []);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [editingId, setEditingId] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    price: "",
    numberOfApplicants: "",
    deadline: "",
    category: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    contactWebsite: "",
    paymentUpiId: "",
    paymentPhone: "",
    paymentNotes: "",
    logoFile: null,
    paymentQrFile: null,
    attachmentsFiles: [],
  });

  // quick tools
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent"); // recent | priceAsc | priceDesc | deadlineAsc | deadlineDesc
  const [status, setStatus] = useState("all"); // pro-grade status filter , all | open | inProgress | completed

  // overlay (payment)
  const [paymentTask, setPaymentTask] = useState(null);
  const [paymentApplicant, setPaymentApplicant] = useState(null);
  const [showPaymentOverlay, setShowPaymentOverlay] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  // incremental rendering
  const PAGE_SIZE = 6;
  const [openShown, setOpenShown] = useState(PAGE_SIZE);
  const [progressShown, setProgressShown] = useState(PAGE_SIZE);
  const [doneShown, setDoneShown] = useState(PAGE_SIZE);
  const [openApplicantsByTask, setOpenApplicantsByTask] = useState({});

  // utils
  const inr = useMemo(() => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }), []);
  const toId = useCallback((v) => (typeof v === "string" ? v : v?._id || String(v || "")), []);
  const sameId = useCallback((a, b) => toId(a) === toId(b), [toId]);
  const toDateInputValue = useCallback((v) => {
    if (!v) return "";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  }, []);
  const listingType = useCallback((task) => {
    const cats = Array.isArray(task?.category) ? task.category : [task?.category];
    const lower = cats.map((c) => String(c || "").toLowerCase());
    if (lower.includes("sponsorship")) return "sponsorship";
    if (lower.includes("event")) return "event";
    return "task";
  }, []);

  // accessibility: keep focus in overlay
  const overlayRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setErr(""); setLoading(true);
      try {
        const [meRes, tasksRes] = await Promise.all([
          fetch(`${API_BASE}/api/auth/me`, { credentials: "include" }),
          fetch(`${API_BASE}/api/tasks`, { credentials: "include" }),
        ]);
        if (!meRes.ok) throw new Error("We couldn’t load your profile. Please try again.");
        if (!tasksRes.ok) throw new Error("We couldn’t load your tasks. Please try again.");
        const meJson = await meRes.json();
        const tasksJson = await tasksRes.json();
        if (!alive) return;
        setMe(meJson?.user || null);
        setTasks(Array.isArray(tasksJson) ? tasksJson : []);
      } catch (e) {
        if (alive) setErr(e.message || "Failed to load dashboard");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, []);

  // derived lists
  const myTasks = useMemo(() => {
    if (!me) return [];
    return tasks.filter(
      (t) => sameId(t.createdBy, me._id) && listingType(t) === "task"
    );
  }, [me, tasks, sameId, listingType]);

  const myEvents = useMemo(() => {
    if (!me) return [];
    return tasks.filter((t) => sameId(t.createdBy, me._id) && listingType(t) === "event");
  }, [me, tasks, sameId, listingType]);

  const mySponsorships = useMemo(() => {
    if (!me) return [];
    return tasks.filter(
      (t) => sameId(t.createdBy, me._id) && listingType(t) === "sponsorship"
    );
  }, [me, tasks, sameId, listingType]);

  const myApplications = useMemo(() => {
    if (!me) return [];
    return tasks.filter((t) => (Array.isArray(t.applicants) ? t.applicants : []).some((a) => sameId(a, me._id)));
  }, [me, tasks, sameId]);

  const sourceList = useMemo(() => {
    if (activeTab === "myTasks") return myTasks;
    if (activeTab === "myEvents") return myEvents;
    if (activeTab === "myApplications") return myApplications;
    return mySponsorships;
  }, [activeTab, myTasks, myEvents, myApplications, mySponsorships]);

  const currentMode = useMemo(() => {
    if (activeTab === "myEvents") return "events";
    if (activeTab === "mySponsorships") return "sponsorship";
    return "freelance";
  }, [activeTab]);

  const theme = useMemo(() => {
    if (currentMode === "events") {
      return {
        accentText: "text-purple-600",
        accentBg: "bg-purple-600 hover:bg-purple-700",
        accentSoft: "border-purple-100 bg-purple-50 text-purple-700",
        focus: "focus:ring-purple-500/20 focus:border-purple-400",
        dot: "bg-purple-500",
      };
    }
    if (currentMode === "sponsorship") {
      return {
        accentText: "text-emerald-600",
        accentBg: "bg-emerald-600 hover:bg-emerald-700",
        accentSoft: "border-emerald-100 bg-emerald-50 text-emerald-700",
        focus: "focus:ring-emerald-500/20 focus:border-emerald-400",
        dot: "bg-emerald-500",
      };
    }
    return {
      accentText: "text-blue-600",
      accentBg: "bg-blue-600 hover:bg-blue-700",
      accentSoft: "border-blue-100 bg-blue-50 text-blue-700",
      focus: "focus:ring-blue-500/20 focus:border-blue-400",
      dot: "bg-blue-500",
    };
  }, [currentMode]);

  const filteredList = useMemo(() => {
    let l = sourceList;

    // search
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      l = l.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          (t.category || []).some((c) => String(c || "").toLowerCase().includes(q))
      );
    }

    // status gating
    const isOpen = (t) => !t.paymentRequested && !t.selectedApplicant;
    const isInProgress = (t) => !!t.selectedApplicant && !t.paymentRequested;
    const isCompleted = (t) => !!t.paymentRequested;
    if (status === "open") l = l.filter(isOpen);
    else if (status === "inProgress") l = l.filter(isInProgress);
    else if (status === "completed") l = l.filter(isCompleted);


    // sort
    const byPrice = (a, b) => Number(a.price || 0) - Number(b.price || 0);
    const byDeadline = (a, b) => new Date(a.deadline || 0) - new Date(b.deadline || 0);
    const byRecent = (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    const arr = [...l];
    switch (sort) {
      case "priceAsc": arr.sort(byPrice); break;
      case "priceDesc": arr.sort((a, b) => -byPrice(a, b)); break;
      case "deadlineAsc": arr.sort(byDeadline); break;
      case "deadlineDesc": arr.sort((a, b) => -byDeadline(a, b)); break;
      default: arr.sort(byRecent);
    }
    return arr;
  }, [sourceList, query, status, sort]);

  // computed KPIs / insights
  const kpi = useMemo(() => {
    const posted = myTasks.length + myEvents.length + mySponsorships.length;
    const applied = myApplications.length;
    const completed = tasks.filter((t) => t.paymentRequested).length;
    const totalBudget = tasks.reduce((s, t) => s + Number(t.price || 0), 0);
    const allApplicants = tasks.reduce((s, t) => s + (t.applicants?.length || 0), 0);
    const selectedCount = tasks.filter((t) => t.selectedApplicant).length;
    const rate = allApplicants ? Math.round((selectedCount / allApplicants) * 100) : 0;
    return { posted, applied, completed, totalBudget, rate };
  }, [tasks, myTasks, myEvents, mySponsorships, myApplications]);

  // tab setter (shareable)
  const setTab = useCallback((tab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url);
    // reset incremental render when switching categories
    setOpenShown(PAGE_SIZE);
    setProgressShown(PAGE_SIZE);
    setDoneShown(PAGE_SIZE);
  }, []);

  // payment
  const handlePayment = useCallback(async () => {
    try {
      if (!paymentTask || !paymentApplicant) return;
      if (!window.Razorpay || !RAZORPAY_KEY) {
        alert("Payment service not available. Please try again later.");
        return;
      }
      const orderRes = await apiFetch(`${API_BASE}/api/payment/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(paymentTask.price) }),
      });
      const order = await orderRes.json();

      const rzp = new window.Razorpay({
        key: RAZORPAY_KEY,
        amount: order.amount,
        currency: order.currency,
        name: "Cyphire",
        description: `Payment for task: ${paymentTask.title}`,
        order_id: order.id,
        theme: { color: "#8B5CF6" },
        handler: async (resp) => {
          try {
            setVerifyingPayment(true);
            const vr = await apiFetch(`${API_BASE}/api/payment/verify-and-select`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
                taskId: paymentTask._id,
                applicantId: paymentApplicant._id,
              }),
            });
            const vj = await vr.json();
            if (vj.success) {
              setTasks((prev) =>
                prev.map((t) =>
                  toId(t._id) === toId(paymentTask._id)
                    ? {
                      ...t,
                      selectedApplicant: paymentApplicant._id,
                      workroomId: vj.task?.workroomId ?? t.workroomId,
                    }
                    : t
                )
              );
              setShowPaymentOverlay(false);
            } else {
              alert(vj.error || "Payment verified but selection failed.");
            }
          } catch (e) {
            console.error(e);
            alert("Payment verification failed.");
          } finally {
            setVerifyingPayment(false);
          }
        },
      });
      rzp.open();
    } catch (e) {
      console.error(e);
      alert("Failed to start payment.");
    }
  }, [paymentTask, paymentApplicant, toId]);

  // count active filters
  const activeFilters = useMemo(() => {
    let n = 0;
    if (query.trim()) n++;
    if (status !== "all") n++;
    if (sort !== "recent") n++;
    return n;
  }, [query, status, sort]);

  const startEdit = useCallback((task) => {
    const metadata = task?.metadata || {};
    setEditError("");
    setEditingId(toId(task?._id));
    setEditForm({
      title: task?.title || "",
      description: task?.description || "",
      price: task?.price != null ? String(task.price) : "",
      numberOfApplicants: task?.numberOfApplicants != null ? String(task.numberOfApplicants) : "",
      deadline: toDateInputValue(task?.deadline),
      category: Array.isArray(task?.category) ? task.category.join(", ") : String(task?.category || ""),
      contactName: metadata?.contactName || "",
      contactEmail: metadata?.contactEmail || "",
      contactPhone: metadata?.contactPhone || "",
      contactWebsite: metadata?.contactWebsite || "",
      paymentUpiId: metadata?.paymentUpiId || "",
      paymentPhone: metadata?.paymentPhone || "",
      paymentNotes: metadata?.paymentNotes || "",
      logoFile: null,
      paymentQrFile: null,
      attachmentsFiles: [],
    });
  }, [toDateInputValue, toId]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setSavingEdit(false);
    setEditError("");
  }, []);

  const saveEdit = useCallback(async (taskId) => {
    setEditError("");
    setSavingEdit(true);
    try {
      const category = editForm.category
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

      const currentTask = tasks.find((t) => toId(t._id) === toId(taskId));
      const metadata = { ...(currentTask?.metadata || {}) };

      const setOrDelete = (key, value) => {
        if (value) metadata[key] = value;
        else delete metadata[key];
      };

      setOrDelete("contactName", editForm.contactName.trim());
      setOrDelete("contactEmail", editForm.contactEmail.trim());
      setOrDelete("contactPhone", editForm.contactPhone.trim());
      setOrDelete("contactWebsite", editForm.contactWebsite.trim());
      setOrDelete("paymentUpiId", editForm.paymentUpiId.trim());
      setOrDelete("paymentPhone", editForm.paymentPhone.trim());
      setOrDelete("paymentNotes", editForm.paymentNotes.trim());

      const formData = new FormData();
      formData.append("title", editForm.title.trim());
      formData.append("description", editForm.description.trim());
      formData.append("metadata", JSON.stringify(metadata));
      category.forEach((c) => formData.append("category", c));

      if (editForm.price.trim() !== "") formData.append("price", String(Number(editForm.price)));
      if (editForm.numberOfApplicants.trim() !== "") formData.append("numberOfApplicants", String(Number(editForm.numberOfApplicants)));
      if (editForm.deadline) formData.append("deadline", new Date(editForm.deadline).toISOString());
      if (editForm.logoFile) formData.append("logo", editForm.logoFile);
      if (editForm.paymentQrFile) formData.append("paymentQr", editForm.paymentQrFile);
      editForm.attachmentsFiles.forEach((f) => formData.append("attachments", f));

      if (!editForm.title.trim() || editForm.title.trim().length < 3) throw new Error("Title must be at least 3 characters.");
      if (!editForm.description.trim() || editForm.description.trim().length < 10) throw new Error("Description must be at least 10 characters.");
      if (!category.length) throw new Error("At least one category is required.");
      if (editForm.price.trim() !== "" && Number.isNaN(Number(editForm.price))) throw new Error("Price must be a valid number.");
      if (editForm.numberOfApplicants.trim() !== "" && Number.isNaN(Number(editForm.numberOfApplicants))) throw new Error("Number of applicants must be valid.");

      const res = await apiFetch(`${API_BASE}/api/tasks/${taskId}`, {
        method: "PUT",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to update listing.");

      setTasks((prev) => prev.map((t) => (toId(t._id) === toId(taskId) ? data : t)));
      setEditingId(null);
    } catch (e) {
      setEditError(e.message || "Could not save changes.");
    } finally {
      setSavingEdit(false);
    }
  }, [editForm, toId, tasks]);
  /* ======================
     Subcomponents
     ====================== */

  const Header = () => {
    const modeTitle =
      currentMode === "freelance"
        ? "Freelance Dashboard"
        : currentMode === "sponsorship"
          ? "Sponsorship Dashboard"
          : "Events Dashboard";

    const postTo =
      currentMode === "freelance"
        ? "/choose-category"
        : currentMode === "sponsorship"
          ? "/List-Sponsorship"
          : "/list-event";

    const exploreTo =
      currentMode === "freelance"
        ? "/tasks"
        : currentMode === "sponsorship"
          ? "/sponsorships"
          : "/events";

    const postLabel =
      currentMode === "freelance"
        ? "Post Task"
        : currentMode === "sponsorship"
          ? "Post Sponsorship"
          : "Post Event";

    return (
      <div
        className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        aria-label="Dashboard header"
      >
        <div className="absolute inset-0 anim pointer-events-none" aria-hidden="true">
          <div className={`absolute -top-24 -left-16 h-72 w-72 rounded-full blur-3xl animate-pulse ${currentMode === "events" ? "bg-purple-500/10" : currentMode === "sponsorship" ? "bg-emerald-500/10" : "bg-blue-500/10"}`} />
          <div className={`absolute -bottom-16 -right-8 h-72 w-72 rounded-full blur-3xl animate-pulse [animation-delay:400ms] ${currentMode === "events" ? "bg-fuchsia-500/10" : currentMode === "sponsorship" ? "bg-teal-500/10" : "bg-indigo-500/10"}`} />
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-transparent" />
        </div>

        <div className="relative px-6 py-8 md:px-10 md:py-10">
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div>
              <div className={`flex items-center gap-2 ${theme.accentText}`}>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span className="text-xs tracking-wider uppercase font-semibold">Welcome back</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mt-1 text-slate-900">{modeTitle}</h1>
              <p className="text-slate-600 mt-1">Act on what matters next: open items, in-progress work, and payouts.</p>

              <div className="mt-4 inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
                <button
                  onClick={() => setTab("myTasks")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${currentMode === "freelance" ? `${theme.accentBg} text-white` : "text-slate-600 hover:text-slate-900"}`}
                >
                  Freelance
                </button>
                <button
                  onClick={() => setTab("mySponsorships")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${currentMode === "sponsorship" ? `${theme.accentBg} text-white` : "text-slate-600 hover:text-slate-900"}`}
                >
                  Sponsorship
                </button>
                <button
                  onClick={() => setTab("myEvents")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${currentMode === "events" ? `${theme.accentBg} text-white` : "text-slate-600 hover:text-slate-900"}`}
                >
                  Events
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <Link
                to={postTo}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] transition-colors ${theme.accentBg}`}
              >
                <Plus className="h-4 w-4" aria-hidden="true" /> {postLabel}
              </Link>
              <Link
                to={exploreTo}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors border ${theme.accentSoft}`}
              >
                <Rocket className="h-4 w-4" aria-hidden="true" /> Explore
              </Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Posted"
              value={kpi.posted}
              icon={<FolderOpenDot className="h-4 w-4" aria-hidden="true" />}
            />
            <StatCard
              label="Applications"
              value={kpi.applied}
              icon={<Users className="h-4 w-4" aria-hidden="true" />}
            />
            <StatCard
              label="Completed"
              value={kpi.completed}
              icon={<BadgeCheck className="h-4 w-4" aria-hidden="true" />}
              ring={true}
              percent={Math.min(100, Math.round((kpi.completed / Math.max(1, kpi.posted)) * 100))}
            />
            <StatCard
              label="Selection rate"
              value={`${kpi.rate}%`}
              icon={<Target className="h-4 w-4" aria-hidden="true" />}
            />
          </div>
        </div>
      </div>
    );
  };

  const Toolbox = () => (
    <Glass className="p-4" elevation={1} aria-label="Filters and search">
      {currentMode === "freelance" && (
        <div className="mb-3 inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
          <button
            onClick={() => setTab("myTasks")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${activeTab === "myTasks" ? `${theme.accentBg} text-white` : "text-slate-600 hover:text-slate-900"}`}
          >
            My Freelance Tasks
          </button>
          <button
            onClick={() => setTab("myApplications")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${activeTab === "myApplications" ? `${theme.accentBg} text-white` : "text-slate-600 hover:text-slate-900"}`}
          >
            My Applications
          </button>
        </div>
      )}
      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, description, or category"
            className={`w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-slate-900 outline-none transition-colors ${theme.focus}`}
            aria-label="Search"
          />
        </div>
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-slate-400" aria-hidden="true" />
          {/* Segmented status filter (accessible, keyboardable) */}
          <div role="tablist" aria-label="Filter by status" className="bg-slate-100 border border-slate-200 rounded-xl p-1 flex">
            {[
              { id: "all", label: "All" },
              { id: "open", label: "Open" },
              { id: "inProgress", label: "In progress" },
              { id: "completed", label: "Completed" },
            ].map((opt) => {
              const selected = status === opt.id;
              return (
                <button
                  key={opt.id}
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setStatus(opt.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition font-medium ${selected ? `${theme.accentBg} text-white shadow-sm` : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                    }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Sort control */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className={`bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none ${theme.focus}`}
            aria-label="Sort by"
          >
            <option value="recent">Sort: Recent</option>
            <option value="priceAsc">Sort: Price (Low → High)</option>     <option value="priceDesc">Sort: Price (High → Low)</option>
            <option value="deadlineAsc">Sort: Deadline (Sooner)</option>
            <option value="deadlineDesc">Sort: Deadline (Later)</option>
          </select>
        </div>
      </div>
      <div className="mt-2 text-xs text-slate-500">
        {activeFilters > 0 ? `${activeFilters} filter${activeFilters > 1 ? "s" : ""} active` : "No filters active"}
      </div>
    </Glass>
  );

  const Sidebar = () => (
    <div className="space-y-3 sticky top-24" aria-label="Sidebar">
      {/* Smart insights */}
      <Glass className="p-4" elevation={1} aria-label="Smart insights">
        <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">
          <Target className="h-4 w-4" aria-hidden="true" /> Smart Insights
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-600">Selection rate</span>
            <strong className="text-slate-900">{kpi.rate}%</strong>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-600">Avg. budget</span>
            <strong className="text-slate-900">
              {inr.format(kpi.posted ? Math.round(kpi.totalBudget / kpi.posted) : 0)}
            </strong>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-600">Nearest deadline</span>
            <span className="text-slate-900 font-medium">{nextDeadlineText(sourceList)}</span>
          </div>
        </div>
      </Glass>

      {/* Activity */}
      <Glass className="p-4" elevation={1} aria-label="Recent activity">
        <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">
          <Timer className="h-4 w-4" aria-hidden="true" /> Activity
        </div>
        <div className="space-y-3 text-sm">
          {recentActivity(tasks, me).map((a, i) => (
            <div key={i} className="flex items-center gap-3 py-1">
              <span className={`h-2 w-2 rounded-full ${theme.dot}`} aria-hidden="true" />
              <span className="text-slate-700 font-medium">{a.text}</span>
              <span className="ml-auto text-slate-400 text-xs">{a.when}</span>
            </div>
          ))}
          {recentActivity(tasks, me).length === 0 && (
            <div className="text-slate-500 italic">
              No recent changes. <Link className={`${theme.accentText} hover:underline`} to={currentMode === "events" ? "/events" : currentMode === "sponsorship" ? "/sponsorships" : "/tasks"}>Explore</Link>.
            </div>
          )}
        </div>
      </Glass>
    </div>
  );

  const renderTaskCard = (task) => {
    const taskId = toId(task._id);
    const selectedId = toId(task.selectedApplicant);
    const iAmSelected = me && sameId(selectedId, me._id);
    const isOwner = me && sameId(task.createdBy, me._id);
    const thisEditing = editingId === taskId;
    const canWorkroom = !!selectedId && (isOwner || iAmSelected);
    const workroomHref = `${WORKROOM_BASE}/workroom/${task.workroomId || taskId}`;
    const appliedCount = task.applicants?.length || 0;
    const applicantsOpen = !!openApplicantsByTask[taskId];
    const type = listingType(task);
    const isEventListing = type === "event";
    const isSponsorshipListing = type === "sponsorship";
    const viewHref = isSponsorshipListing ? `/sponsorship/${toId(task._id)}` : `/task/${toId(task._id)}`;
    const metaItems = Object.entries(task?.metadata || {})
      .filter(([k, v]) => !["paymentQrPublicId"].includes(k) && v !== "" && v != null && !(Array.isArray(v) && v.length === 0))
      .slice(0, 8);

    const StatusChip = () => {
      if (task.paymentRequested) {
        return (
          <span className="inline-flex items-center gap-1 text-emerald-300 text-[11px] px-2 py-0.5 rounded-lg border border-emerald-400/40 bg-emerald-400/10">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            Payment disbursed
          </span>
        );
      }
      if (selectedId) {
        return (
          <span className="inline-flex items-center gap-1 text-amber-700 text-[11px] px-2 py-0.5 rounded-lg border border-amber-200 bg-amber-50">
            <Users className="h-3 w-3" aria-hidden="true" />
            In progress
          </span>
        );
      }
      return (
        <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg border ${currentMode === "events" ? "text-purple-700 border-purple-200 bg-purple-50" : currentMode === "sponsorship" ? "text-emerald-700 border-emerald-200 bg-emerald-50" : "text-blue-700 border-blue-200 bg-blue-50"}`}>
          <Rocket className="h-3 w-3" aria-hidden="true" />
          Awaiting applications
        </span>
      );
    };

    return (
      <Glass key={toId(task._id)} className="p-6" elevation={1} role="article" aria-label={`Task ${task.title}`}>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          {/* left */}
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold truncate text-slate-900">{task.title}</h2>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border ${isSponsorshipListing ? "bg-blue-50 text-blue-700 border-blue-200" : isEventListing ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                {isSponsorshipListing ? "Sponsorship" : isEventListing ? "Event" : "Freelance"}
              </span>
              <StatusChip />
            </div>
            <p className="text-slate-600 text-sm mt-1 line-clamp-3 leading-relaxed">{task.description}</p>
            <div className="text-xs text-slate-500 mt-2 flex flex-wrap items-center gap-3">
              <span className="font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-600">{task.deadline ? `Deadline: ${new Date(task.deadline).toLocaleDateString()}` : "No deadline"}</span>
              <span className="opacity-30">•</span>
              <span className="font-medium text-slate-900">Budget: {inr.format(task.price ?? 0)}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(task.category || []).map((c) => (
                <span key={c} className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-[11px] text-slate-700 font-medium">
                  {c}
                </span>
              ))}
            </div>

            {metaItems.length > 0 && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Details</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {metaItems.map(([k, v]) => (
                    <div key={`${toId(task._id)}-meta-${k}`} className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {k.replace(/([A-Z])/g, " $1").trim()}
                      </div>
                      <div className="text-xs text-slate-700 truncate">
                        {Array.isArray(v) ? v.join(", ") : String(v)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {task.attachments?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {task.attachments.map((a, i) => (
                  <div key={`${toId(task._id)}-att-${i}`} className="w-24 h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                    {a.url?.match(/\.(mp4|webm|ogg)$/i) ? (
                      <video src={a.url} className="w-full h-full object-cover" controls aria-label="Attachment video" />
                    ) : (
                      <img src={a.url} className="w-full h-full object-cover" alt="Attachment" loading="lazy" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* right: contextual actions */}
          <div className="flex-shrink-0 flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(viewHref)}
                className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${currentMode === "events" ? "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100" : currentMode === "sponsorship" ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"}`}
              >
                <Eye className="h-3 w-3" aria-hidden="true" />
                View
              </button>
              {isOwner && (
                <button
                  onClick={() => (thisEditing ? cancelEdit() : startEdit(task))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {thisEditing ? <CircleX className="h-3 w-3" aria-hidden="true" /> : <PencilLine className="h-3 w-3" aria-hidden="true" />}
                  {thisEditing ? "Close" : "Edit"}
                </button>
              )}
            </div>

            {canWorkroom ? (
              <button
                onClick={() => window.open(workroomHref, "_blank", "noopener")}
                className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] transition-colors"
              >
                Open Workroom <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </button>
            ) : isOwner ? (
              <span className="text-xs text-slate-500 font-medium">Applicants: {appliedCount}</span>
            ) : iAmSelected ? (
              task.paymentRequested ? (
                <span className="text-emerald-700 text-xs px-2 py-0.5 rounded-lg border border-emerald-200 bg-emerald-50 font-semibold">
                  Task Completed
                </span>
              ) : (
                <button
                  onClick={() => (window.location.href = workroomHref)}
                  className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] transition-colors"
                >
                  Go to Workroom <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </button>
              )
            ) : (
              <span className="text-xs text-slate-500 font-medium">{selectedId ? "Not selected this time" : "Under review"}</span>
            )}
          </div>
        </div>

        {isOwner && thisEditing && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="mb-3 text-sm font-semibold text-slate-800">Edit Listing Details</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</label>
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                  className={`mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ${theme.focus}`}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</label>
                <textarea
                  rows={4}
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  className={`mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ${theme.focus}`}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Budget</label>
                <input
                  type="number"
                  value={editForm.price}
                  onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))}
                  className={`mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ${theme.focus}`}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Max Applicants</label>
                <input
                  type="number"
                  value={editForm.numberOfApplicants}
                  onChange={(e) => setEditForm((p) => ({ ...p, numberOfApplicants: e.target.value }))}
                  className={`mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ${theme.focus}`}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Deadline</label>
                <input
                  type="date"
                  value={editForm.deadline}
                  onChange={(e) => setEditForm((p) => ({ ...p, deadline: e.target.value }))}
                  className={`mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ${theme.focus}`}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Categories (comma separated)</label>
                <input
                  value={editForm.category}
                  onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                  className={`mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ${theme.focus}`}
                />
              </div>

              {(isEventListing || isSponsorshipListing) && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact Name</label>
                    <input
                      value={editForm.contactName}
                      onChange={(e) => setEditForm((p) => ({ ...p, contactName: e.target.value }))}
                      className={`mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ${theme.focus}`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact Email</label>
                    <input
                      type="email"
                      value={editForm.contactEmail}
                      onChange={(e) => setEditForm((p) => ({ ...p, contactEmail: e.target.value }))}
                      className={`mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ${theme.focus}`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact Phone</label>
                    <input
                      value={editForm.contactPhone}
                      onChange={(e) => setEditForm((p) => ({ ...p, contactPhone: e.target.value }))}
                      className={`mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ${theme.focus}`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Website</label>
                    <input
                      value={editForm.contactWebsite}
                      onChange={(e) => setEditForm((p) => ({ ...p, contactWebsite: e.target.value }))}
                      className={`mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ${theme.focus}`}
                    />
                  </div>
                </>
              )}

              {isEventListing && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">UPI ID</label>
                    <input
                      value={editForm.paymentUpiId}
                      onChange={(e) => setEditForm((p) => ({ ...p, paymentUpiId: e.target.value }))}
                      className={`mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ${theme.focus}`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payment Phone</label>
                    <input
                      value={editForm.paymentPhone}
                      onChange={(e) => setEditForm((p) => ({ ...p, paymentPhone: e.target.value }))}
                      className={`mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ${theme.focus}`}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payment Notes</label>
                    <textarea
                      rows={3}
                      value={editForm.paymentNotes}
                      onChange={(e) => setEditForm((p) => ({ ...p, paymentNotes: e.target.value }))}
                      className={`mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ${theme.focus}`}
                    />
                  </div>
                </>
              )}

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Update Attachments</label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setEditForm((p) => ({ ...p, attachmentsFiles: Array.from(e.target.files || []) }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Update Cover / Logo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditForm((p) => ({ ...p, logoFile: e.target.files?.[0] || null }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                />
              </div>

              {isEventListing && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Update Payment QR</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEditForm((p) => ({ ...p, paymentQrFile: e.target.files?.[0] || null }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  />
                </div>
              )}
            </div>

            {editError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {editError}
              </div>
            )}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={cancelEdit}
                disabled={savingEdit}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={() => saveEdit(task._id)}
                disabled={savingEdit}
                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <Save className="h-3 w-3" aria-hidden="true" />
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        )}

        {isOwner && appliedCount > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <button
              onClick={() =>
                setOpenApplicantsByTask((prev) => ({
                  ...prev,
                  [taskId]: !prev[taskId],
                }))
              }
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <span>{applicantsOpen ? "Hide Applicants" : "View Applicants"} ({appliedCount})</span>
              {applicantsOpen ? (
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        )}

        {/* creator-only: applicants list (collapsible) */}
        {isOwner && applicantsOpen && (task.applicants?.length || 0) > 0 && (
          <div className="mt-3 space-y-3" aria-label="Applicants">
            {task.applicants.map((appl, j) => {
              const a = typeof appl === "object" ? appl : { _id: appl };
              const name = a.name || "User";
              const avatar = safeMediaUrl(
                a.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
                "/user-avatar.png"
              );
              const profile = safeSlug(a.slug || "", "") || safeSlug(a._id || "", "");
              const isThisSelected = !!selectedId && sameId(selectedId, a._id);
              return (
                <div key={`${toId(a._id)}-${j}`} className="flex items-center justify-between bg-slate-50 border border-slate-100 px-4 py-2 rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={avatar} className="w-10 h-10 rounded-full object-cover border border-slate-200" alt={`${name} avatar`} loading="lazy" />
                    <div className="truncate">
                      <div className="text-sm font-semibold text-slate-800 truncate">{name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link to={profile ? `/u/${profile}` : "/profile"} className={`text-sm hover:underline font-medium ${theme.accentText}`}>
                      View Profile
                    </Link>
                    {!task.selectedApplicant ? (
                      <button
                        onClick={() => {
                          setPaymentTask(task);
                          setPaymentApplicant(a);
                          setShowPaymentOverlay(true);
                          setTimeout(() => overlayRef.current?.focus(), 0);
                        }}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] transition-colors ${currentMode === "events" ? "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100" : currentMode === "sponsorship" ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"}`}
                        aria-label={`Select ${name}`}
                      >
                        Select
                      </button>
                    ) : isThisSelected ? (
                      <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                        Selected
                      </span>
                    ) : (
                      <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500">
                        Not selected
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* creator-only: empty applicants */}
            {isOwner && !task.selectedApplicant && (task.applicants?.length || 0) === 0 && (
          <div className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            No applicants yet. <Link to={currentMode === "events" ? "/events" : currentMode === "sponsorship" ? "/sponsorships" : "/tasks"} className={`${theme.accentText} hover:underline`}>Boost visibility</Link>.
          </div>
        )}
      </Glass>
    );
  };

  /* ======================
     Render
     ====================== */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Tokens />
      <Nav />

      <main className="relative mx-auto max-w-7xl px-6 pt-24 pb-16">
        <Header />

        {err && (
          <Glass className="p-4 text-red-300 my-6 flex items-start gap-3" elevation={1} role="alert">
            <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1">
              {err}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="text-xs rounded-lg border border-white/15 bg-white/10 px-3 py-1 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  Retry
                </button>
                <Link
                  to="/tasks"
                  className="text-xs rounded-lg border border-white/15 bg-white/10 px-3 py-1 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  Go to Tasks
                </Link>
              </div>
            </div>
          </Glass>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-8">
            <aside className="md:col-span-3">
              <Glass className="p-4 space-y-3 sticky top-24" elevation={1}>
                <Skel w="w-40" h="h-9" />
                <Skel w="w-44" h="h-9" />
                <Skel w="w-48" h="h-9" />
              </Glass>
              <Glass className="p-4 space-y-2 mt-3" elevation={1}>
                <Skel w="w-28" />
                <Skel w="w-36" />
                <Skel w="w-24" />
              </Glass>
            </aside>
            <section className="md:col-span-9 space-y-6">
              <Toolbox />
              {[0, 1, 2].map((k) => (
                <Glass key={k} className="p-6 space-y-3" elevation={1}>
                  <Skel w="w-1/2" />
                  <Skel />
                  <Skel w="w-3/4" />
                </Glass>
              ))}
            </section>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-8">
            <aside className="md:col-span-3"><Sidebar /></aside>
            <section className="md:col-span-9 space-y-6" aria-live="polite" aria-busy={loading ? "true" : "false"}>
              <Toolbox />

              {/* Single list honoring status/search/sort */}
              <div className="space-y-4">
                {filteredList.length === 0 ? (
                  <Glass className="p-8 text-center" elevation={1}>
                    <div className="text-2xl mb-2 font-semibold text-slate-900">No items</div>
                    <p className="text-slate-600">
                      Try adjusting filters or{" "}
                      <Link className={`${theme.accentText} hover:underline`} to={currentMode === "events" ? "/events" : currentMode === "sponsorship" ? "/sponsorships" : "/tasks"}>
                        explore opportunities
                      </Link>.
                    </p>
                  </Glass>
                ) : (
                  filteredList.slice(0, openShown).map((t) => (
                    renderTaskCard(t)
                  ))
                )}

                {openShown < filteredList.length && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={() =>
                        setOpenShown((n) => Math.min(filteredList.length, n + PAGE_SIZE))
                      }
                      className="text-sm rounded-lg border border-slate-200 bg-white px-4 py-2 hover:bg-slate-50 text-slate-700 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] shadow-sm"
                    >
                      Load more
                    </button>
                  </div>
                )}
              </div>


              {/* Empty state for the whole tab */}
              {filteredList.length === 0 && (
                <Glass className="p-8 text-center" elevation={1}>
                  <div className="text-2xl mb-2 font-semibold text-slate-900">Nothing here yet</div>
                  <p className="text-slate-600">
                    Try adjusting filters or{" "}
                    <Link className={`${theme.accentText} hover:underline`} to={currentMode === "events" ? "/events" : currentMode === "sponsorship" ? "/sponsorships" : "/tasks"}>explore</Link>.
                  </p>
                </Glass>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Payment overlay (focus trapped) */}
      {showPaymentOverlay && paymentTask && paymentApplicant && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 text-slate-900"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm selection"
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowPaymentOverlay(false);
          }}
        >
          <Glass className="relative max-w-md w-full p-8 shadow-2xl text-center bg-white border-slate-200" elevation={2}>
            <button
              onClick={() => setShowPaymentOverlay(false)}
              className="absolute top-3 right-3 p-1 rounded hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              aria-label="Close"
              ref={overlayRef}
            >
              <X className="h-5 w-5 text-white/70" aria-hidden="true" />
            </button>

            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center shadow-lg ring-4 ring-white" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0-1.657-1.343-3-3-3S6 9.343 6 11s1.343 3 3 3 3-1.343 3-3z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7" />
              </svg>
            </div>

            <h2 className="mt-12 text-2xl font-bold mb-3 text-slate-900">
              Confirm Selection
            </h2>
            <p className="text-slate-600 mb-6">
              Make an upfront payment of{" "}
              <span className="font-bold text-slate-900">{inr.format(paymentTask.price)}</span>. Funds are held in escrow
              until completion.
            </p>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setShowPaymentOverlay(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                Continue to Payment
              </button>
            </div>
          </Glass>
        </div>
      )}

      {/* verifying overlay */}
      {verifyingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" role="alert" aria-live="assertive">
          <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-2xl shadow-2xl">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" aria-hidden="true" />
            <p className="text-slate-900 text-lg font-medium">Verifying your payment…</p>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

/* ======================
   Small building blocks
   ====================== */

function StatCard({ label, value, icon, ring = false, percent = 0 }) {
  return (
    <Glass className="p-4" elevation={1} aria-label={`${label} stat`}>
      <div className="text-slate-500 text-xs flex items-center gap-2 uppercase tracking-wide font-semibold">
        {icon} <span className="sr-only"></span>
        <span>{label}</span>
      </div>
      <div className="mt-1 flex items-end justify-between">
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        {ring ? <Ring value={percent} /> : <TinySparkline />}
      </div>
    </Glass>
  );
}

function Column({ title, count, items, onLoadMore, hasMore, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm uppercase tracking-wider text-white/60">{title}</h3>
        <span className="text-xs text-white/40">{count}</span>
      </div>
      {count === 0 ? (
        <Glass className="p-6 text-white/70" elevation={1}>
          {title === "Open" ? "No open items." : title === "In Progress" ? "Nothing in progress." : "No completed items yet."}
        </Glass>
      ) : (
        <>
          <div className="space-y-4">
            {items.map((t) => children(t))}
          </div>
          {hasMore && (
            <div className="mt-3 flex justify-center">
              <button
                onClick={onLoadMore}
                className="text-sm rounded-lg border border-white/15 bg-white/10 px-3 py-1 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- tiny visual helpers ---------- */
function TinySparkline({ flip = false }) {
  const d = flip ? "M0,14 L6,9 L12,11 L18,5 L24,8 L30,3" : "M0,6 L6,8 L12,3 L18,9 L24,5 L30,12";
  return (
    <svg width="60" height="20" viewBox="0 0 30 15" className="opacity-70" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" className="text-blue-400" strokeWidth="1.5" />
    </svg>
  );
}

function Ring({ value = 0 }) {
  const r = 16, c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const dash = (clamped / 100) * c;
  return (
    <svg width="48" height="48" className="text-slate-100" role="img" aria-label={`Completion ${clamped}%`}>
      <circle cx="24" cy="24" r={r} stroke="currentColor" strokeWidth="5" fill="none" />
      <circle
        cx="24"
        cy="24"
        r={r}
        stroke="url(#g)"
        strokeWidth="5"
        fill="none"
        strokeDasharray={`${dash} ${c - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
        className="drop-shadow-sm"
      />
      <defs>
        <linearGradient id="g" x1="0" x2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ---------- utilities ---------- */
function recentActivity(tasks, me) {
  const out = [];
  const now = Date.now();
  for (const t of tasks.slice(0, 10)) {
    if (t.paymentRequested) out.push({ text: `Marked completed · ${t.title}`, when: timeAgo(t.updatedAt || t.createdAt || now) });
    else if (t.selectedApplicant) out.push({ text: `Applicant selected · ${t.title}`, when: timeAgo(t.updatedAt || t.createdAt || now) });
    else if (me && t.createdBy && (t.createdBy._id ? t.createdBy._id === me._id : t.createdBy === me._id)) {
      out.push({ text: `Posted a task · ${t.title}`, when: timeAgo(t.createdAt || now) });
    }
  }
  return out.slice(0, 6);
}

function timeAgo(d) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function nextDeadlineText(list) {
  const upcoming = list
    .map((t) => (t.deadline ? new Date(t.deadline).getTime() : Infinity))
    .filter((n) => Number.isFinite(n) && n > Date.now())
    .sort((a, b) => a - b)[0];
  if (!upcoming) return "—";
  const days = Math.ceil((upcoming - Date.now()) / (1000 * 60 * 60 * 24));
  return days <= 0 ? "today" : `${days} day${days > 1 ? "s" : ""}`;
}
