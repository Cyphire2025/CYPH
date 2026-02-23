/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/navbarsponhome";
import Footer from "../components/footer";
import {
  ArrowLeft,
  Calendar,
  Paperclip,
  Users,
  Wallet,
  Clock,
  Star,
  Briefcase,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  FileText,
  FileSpreadsheet,
  File,
  QrCode,
  HandCoins,
  Smartphone,
} from "lucide-react";
import { apiFetch } from "../lib/fetch";
import toast, { Toaster } from 'react-hot-toast';

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:5000";

const Background = () => (
  <div className="absolute inset-0 -z-10 h-full w-full bg-slate-50 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
    <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-400 opacity-20 blur-[100px]"></div>
    <div className="absolute right-0 bottom-0 -z-10 h-[310px] w-[310px] rounded-full bg-indigo-400 opacity-20 blur-[100px]"></div>
  </div>
);

const Card = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
    {children}
  </div>
);

const Label = ({ icon: Icon, children }) => (
  <div className="mb-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
    {Icon ? <Icon className="h-3.5 w-3.5 text-blue-500" /> : null}
    {children}
  </div>
);

const inr = (n) => {
  if (n == null) return "—";
  const num = typeof n === "string" ? Number(n.replace(/[^\d.]/g, "")) : Number(n);
  if (Number.isNaN(num)) return "—";
  return `₹${num.toLocaleString("en-IN")}`;
};

const CountdownTimer = ({ createdAt }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const endTime = new Date(createdAt).getTime() + 7 * 24 * 60 * 60 * 1000;
    const update = () => {
      const now = Date.now();
      const diff = Math.max(endTime - now, 0);
      setTimeLeft(diff);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 border border-indigo-100">
      <Clock className="h-3 w-3" />
      <span>{days}d {hours}h left</span>
    </span>
  );
};

export default function ViewTask() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [isOwner, setIsOwner] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [showContact, setShowContact] = useState(false);

  const categoriesLower = useMemo(() => {
    const cats = Array.isArray(task?.category) ? task.category : [task?.category];
    return cats.map((c) => String(c || "").toLowerCase());
  }, [task]);

  const isEvent = categoriesLower.includes("event");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setErr("");
      try {
        const [meRes, taskRes] = await Promise.all([
          fetch(`${API_BASE}/api/auth/me`, { cache: "no-store", credentials: "include" }),
          fetch(`${API_BASE}/api/tasks/${id}`, { cache: "no-store", credentials: "include" }),
        ]);

        const meJson = meRes.ok ? await meRes.json() : { user: null };
        const tJson = taskRes.ok ? await taskRes.json() : null;

        if (!alive) return;

        const meUser = meJson?.user || null;
        setMe(meUser);

        if (!tJson) throw new Error("Task not found");

        const categories = Array.isArray(tJson.category) ? tJson.category : [tJson.category];
        const isSponsorshipTask = categories.some((c) => String(c || "").toLowerCase() === "sponsorship");
        if (isSponsorshipTask) {
          navigate(`/sponsorship/${id}`, { replace: true });
          return;
        }

        setTask(tJson);
        if (meUser?._id && Array.isArray(tJson.applicants)) {
          const alreadyApplied = tJson.applicants.some((u) => String(u?._id || u) === String(meUser._id));
          setApplied(alreadyApplied);
          // Handle populated createdBy
          const creatorId = tJson.createdBy?._id || tJson.createdBy;
          setIsOwner(String(creatorId) === String(meUser._id));
        }
      } catch (e) {
        if (alive) setErr(e.message || "Failed to load task");
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [id, navigate]);

  const deadlineDaysLeft = useMemo(() => {
    if (!task?.deadline) return null;
    return Math.ceil((new Date(task.deadline).getTime() - Date.now()) / 86400000);
  }, [task]);

  const categoryLabels = useMemo(() => {
    const cats = [];
    if (typeof task?.category === 'string' && task.category !== 'Sponsorship') cats.push(task.category);
    if (Array.isArray(task?.category)) cats.push(...task.category);
    if (Array.isArray(task?.categories)) cats.push(...task.categories);
    return [...new Set(cats)]; // Deduplicate
  }, [task]);

  const isSponsorship = task?.category === 'Sponsorship';
  const appliedCount = Array.isArray(task?.applicants) ? task.applicants.length : 0;
  const totalSeats = Number(task?.numberOfApplicants) || 0;

  const handleApply = async () => {
    if (!me?._id) {
      toast.error("Please sign in to apply");
      setTimeout(() => navigate("/signin"), 1500);
      return;
    }
    if (isOwner) {
      toast.error("You cannot apply to your own task");
      return;
    }
    if (applied) return;

    setApplying(true);
    try {
      const res = await apiFetch(`${API_BASE}/api/tasks/${task._id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to apply");

      setTask((prev) => ({
        ...prev,
        applicants: [...(prev?.applicants || []), me._id],
      }));
      setApplied(true);
      toast.success("Application submitted successfully!");
    } catch (e) {
      toast.error(e.message || "Could not apply right now.");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900">
        <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Loading details...</p>
      </div>
    );
  }

  if (err || !task) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Couldn't load task</h2>
          <p className="text-slate-500 mb-6">{err || "Task not found"}</p>
          <button onClick={() => navigate(-1)} className="px-5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative">
      <Navbar />
      <Background />
      <Toaster position="top-center" />

      <main className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-24 pb-16">

        {/* Navigation Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-all"
          >
            <ArrowLeft className="h-4 w-4" /> Back to listings
          </button>
          {isOwner && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wide">
              <ShieldCheck className="w-3.5 h-3.5" /> Your Post
            </span>
          )}
        </div>

        <div className={`grid gap-8 ${isSponsorship ? "grid-cols-1" : "lg:grid-cols-3"}`}>

          {/* MAIN CONTENT COLUMN */}
          <div className={`space-y-6 ${isSponsorship ? "max-w-4xl mx-auto" : "lg:col-span-2"}`}>

            {/* Hero Card */}
            <div className="rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
              {/* Header Image */}
              <div className="h-48 md:h-64 w-full bg-slate-100 relative overflow-hidden group">
                {task.logo?.url ? (
                  <img src={task.logo.url} alt="Task Header" className="w-full h-full object-cover" />
                ) : task.attachments?.length > 0 && /\.(jpg|jpeg|png|webp)$/i.test(task.attachments[0].url) ? (
                  <img src={task.attachments[0].url} alt="Task Attachment" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center text-slate-400">
                    <Briefcase className="w-12 h-12 mb-2 opacity-50" />
                    <span className="text-sm font-medium">No cover image</span>
                  </div>
                )}

                {/* Status Badge Overlay */}
                {task.createdAt && (
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm text-xs font-bold text-slate-700 border border-white/20">
                    Posted {new Date(task.createdAt).toLocaleDateString()}
                  </div>
                )}
              </div>

              <div className="p-6 md:p-8">
                {/* Tags */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {categoryLabels.map((cat, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
                      <Briefcase className="w-3 h-3" /> {cat}
                    </span>
                  ))}
                  {task.createdAt && <CountdownTimer createdAt={task.createdAt} />}
                </div>

                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-4 leading-tight">
                  {task.title}
                </h1>

                <div className="prose prose-slate max-w-none text-slate-600 mb-8 leading-relaxed">
                  {task.description}
                </div>

                {/* Metadata Grid */}
                {task?.metadata && Object.keys(task.metadata).length > 0 && (
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                      <ShieldCheck className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-slate-800">Specifications</h3>
                    </div>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                      {Object.entries(task.metadata).map(([key, value]) => {
                        // Hide internal or contact fields from general value grid
                        if (["contactName", "contactEmail", "contactPhone", "contactWebsite", "paymentUpiId", "paymentPhone", "paymentNotes", "paymentQrUrl", "paymentQrPublicId", "tier"].includes(key)) return null;

                        if (!value || (Array.isArray(value) && value.length === 0)) return null;
                        const displayValue = Array.isArray(value) ? value.join(", ") : String(value);
                        return (
                          <div key={key}>
                            <dt className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">{key.replace(/([A-Z])/g, " $1")}</dt>
                            <dd className="text-sm font-medium text-slate-700">{displayValue}</dd>
                          </div>
                        );
                      })}
                    </dl>
                  </div>
                )}

                {/* Attachments */}
                {Array.isArray(task.attachments) && task.attachments.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-2">
                      <Paperclip className="w-4 h-4" /> Attachments
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {task.attachments.map((file, i) => {
                        const rawUrl = file.url || file;
                        const name = file.original_name || file.name || `Attachment ${i + 1}`;

                        // Check for Cloudinary and non-image types to force download
                        const isCloudinary = rawUrl.includes("cloudinary.com") && rawUrl.includes("/upload/");
                        const isImage = /\.(jpg|jpeg|png|webp|gif|svg|bmp)$/i.test(rawUrl);

                        let href = rawUrl;
                        if (isCloudinary && !isImage) {
                          // Inject fl_attachment to force download header from Cloudinary
                          href = rawUrl.replace("/upload/", "/upload/fl_attachment/");
                        }

                        return (
                          <a key={i} href={href} target="_blank" rel="noreferrer" download={!isImage}
                            className="group relative aspect-video bg-slate-100 rounded-xl border border-slate-200 overflow-hidden hover:border-blue-300 transition-all flex items-center justify-center">
                            {isImage ? (
                              <img src={rawUrl} alt={name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                            ) : (
                              <div className="flex flex-col items-center text-slate-400">
                                {(() => {
                                  const ext = name.split('.').pop()?.toLowerCase();
                                  if (ext === 'pdf') return <FileText className="w-8 h-8 mb-1 text-red-500" />;
                                  if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet className="w-8 h-8 mb-1 text-emerald-500" />;
                                  if (['doc', 'docx'].includes(ext)) return <FileText className="w-8 h-8 mb-1 text-blue-500" />;
                                  if (['ppt', 'pptx'].includes(ext)) return <File className="w-8 h-8 mb-1 text-orange-500" />;
                                  return <Paperclip className="w-8 h-8 mb-1" />;
                                })()}
                                <span className="text-[10px] uppercase font-bold text-slate-500 max-w-[90%] truncate">
                                  {name.split('.').pop()?.toUpperCase() || 'FILE'}
                                </span>
                              </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 bg-white/90 backdrop-blur p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                              <p className="text-xs truncate font-medium text-slate-700 text-center">{name}</p>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contact Details Modal for Events */}
          <AnimatePresence>
            {false && task?.metadata && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
                onClick={() => setShowContact(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full relative overflow-hidden"
                >
                  <button onClick={() => setShowContact(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition">
                    <AlertCircle className="w-5 h-5 text-slate-500" />
                  </button>

                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">{task.metadata.contactName || "Organizer"}</h3>
                    <p className="text-slate-500">Event Contact Details</p>
                  </div>

                  <div className="space-y-4">
                    <a href={`mailto:${task.metadata.contactEmail}`} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-purple-200 transition-colors group">
                      <div className="p-3 bg-white rounded-lg shadow-sm text-blue-500 group-hover:scale-110 transition-transform"><FileText className="w-5 h-5" /></div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Email</p>
                        <p className="font-semibold text-slate-700 break-all">{task.metadata.contactEmail}</p>
                      </div>
                    </a>

                    {task.metadata.contactPhone && (
                      <a href={`tel:${task.metadata.contactPhone}`} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-purple-200 transition-colors group">
                        <div className="p-3 bg-white rounded-lg shadow-sm text-green-500 group-hover:scale-110 transition-transform"><FileSpreadsheet className="w-5 h-5" /></div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Phone</p>
                          <p className="font-semibold text-slate-700">{task.metadata.contactPhone}</p>
                        </div>
                      </a>
                    )}
                  </div>

                  <div className="mt-8 text-center">
                    <button onClick={() => setShowContact(false)} className="text-sm font-semibold text-slate-500 hover:text-slate-800">
                      Close
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* SIDEBAR COLUMN */}
          {!isSponsorship && (
            <div className="space-y-6">
              {isEvent ? (
                <Card className="border-purple-100 shadow-lg shadow-purple-500/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <QrCode size={96} className="text-purple-500 transform rotate-12 translate-x-8 -translate-y-6" />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-sm text-slate-500 font-medium mb-3">Want to sponsor this event?</div>
                      {isOwner ? (
                        <button
                          onClick={() => navigate("/dashboard")}
                          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 shadow-lg shadow-purple-500/20 transition-all"
                        >
                          View Dashboard <ExternalLink size={18} />
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowContact(!showContact)}
                          className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg 
                            ${showContact
                              ? "bg-purple-100 text-purple-700 border border-purple-200 shadow-none"
                              : "bg-purple-600 text-white hover:bg-purple-700 shadow-purple-500/20"}`}
                        >
                          <HandCoins size={18} /> {showContact ? "Hide Sponsorship Details" : "Sponsor Anonymously"}
                        </button>
                      )}
                    </div>

                    <AnimatePresence>
                      {showContact && task?.metadata && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
                            <h4 className="font-bold text-base text-purple-900 mb-4 flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                                <HandCoins className="w-4 h-4" />
                              </span>
                              Anonymous Sponsorship Details
                            </h4>

                            <div className="space-y-3">
                              {task.metadata.paymentQrUrl ? (
                                <a
                                  href={task.metadata.paymentQrUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="bg-white p-3 rounded-xl border border-purple-100 shadow-sm flex flex-col items-center"
                                >
                                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 self-start">Scan QR to Sponsor</p>
                                  <img
                                    src={task.metadata.paymentQrUrl}
                                    alt="Sponsorship payment QR"
                                    className="h-48 w-48 rounded-lg border border-slate-200 object-cover"
                                  />
                                </a>
                              ) : (
                                <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-sm">
                                  <p className="text-sm font-semibold text-slate-600">
                                    No QR uploaded yet. Use payment details below.
                                  </p>
                                </div>
                              )}

                              {task.metadata.paymentUpiId && (
                                <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-sm">
                                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">UPI ID</p>
                                  <p className="text-sm font-bold text-slate-800 break-all">{task.metadata.paymentUpiId}</p>
                                </div>
                              )}

                              {task.metadata.paymentPhone && (
                                <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-sm">
                                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">Payment Phone</p>
                                  <a href={`tel:${task.metadata.paymentPhone}`} className="inline-flex items-center gap-2 text-sm font-bold text-slate-800 hover:text-green-600">
                                    <Smartphone className="w-4 h-4" />
                                    {task.metadata.paymentPhone}
                                  </a>
                                </div>
                              )}

                              {task.metadata.paymentNotes && (
                                <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-sm">
                                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">Payment Note</p>
                                  <p className="text-sm font-semibold text-slate-700">{task.metadata.paymentNotes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Card>
              ) : (
                <Card className="border-blue-100 shadow-lg shadow-blue-500/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Briefcase size={100} className="text-blue-500 transform rotate-12 translate-x-10 -translate-y-10" />
                  </div>

                  <div className="relative z-10">
                    <div className="mb-4">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Project Budget</span>
                      <div className="text-3xl font-extrabold text-slate-900 mt-1">{inr(task.price)}</div>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={isOwner ? () => navigate("/dashboard") : handleApply}
                      disabled={!isOwner && (applied || applying)}
                      className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all 
                                  ${isOwner
                          ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20"
                          : applied
                            ? "bg-green-50 text-green-700 border border-green-200 cursor-default shadow-none"
                            : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20"
                        }`}
                    >
                      {isOwner ? (
                        <>View Dashboard <ExternalLink size={16} /></>
                      ) : applied ? (
                        <><CheckCircle size={18} /> Applied Successfully</>
                      ) : applying ? (
                        "Processing..."
                      ) : (
                        "Apply Now"
                      )}
                    </motion.button>
                    {!isOwner && !applied && (
                      <p className="text-xs text-center text-slate-400 mt-3">
                        Applications close on {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'expiry'}.
                      </p>
                    )}
                  </div>
                </Card>
              )}

              <Card className="space-y-6">
                <div>
                  <Label icon={Calendar}>Deadline</Label>
                  <div className="font-semibold text-slate-800 mt-1">
                    {task.deadline ? new Date(task.deadline).toLocaleDateString(undefined, {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    }) : "No deadline"}
                  </div>
                  {deadlineDaysLeft !== null && (
                    <span className={`text-xs font-medium ${deadlineDaysLeft < 0 ? "text-red-500" : "text-emerald-600"}`}>
                      {deadlineDaysLeft < 0 ? "Expired" : `${deadlineDaysLeft} days remaining`}
                    </span>
                  )}
                </div>

                <div className="h-px bg-slate-100" />

                <div>
                  <Label icon={Users}>Applicants</Label>
                  <div className="font-semibold text-slate-800 mt-1 text-lg flex items-center gap-2">
                    {appliedCount}
                    {totalSeats > 0 && <span className="text-slate-400 text-base font-normal">/ {totalSeats} seats</span>}
                  </div>
                  {totalSeats > 0 && (
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`${isEvent ? "bg-purple-500" : "bg-blue-500"} h-full rounded-full transition-all duration-1000`}
                        style={{ width: `${Math.min((appliedCount / totalSeats) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}
