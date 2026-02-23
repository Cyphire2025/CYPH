import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
const Calendar = React.lazy(() => import('@/components/ui/Cal'));

import { format } from "date-fns"
import {
  ArrowLeft,
  UploadCloud,
  Sparkles,
  Users,
  Wallet,
  CalendarDays,
  XCircle,
  CheckCircle,
  CircleDashed,
  Lightbulb,
  ArrowUpRight,
} from "lucide-react";
import PostingOverlay from "../components/PostingOverlay";

const MAX_CATEGORIES = 3;
const MAX_ATTACHMENTS = 5;

export default function PostTask() {
  const navigate = useNavigate();

  const categories = [
    "Design",
    "Development",
    "Marketing",
    "Writing",
    "Data",
    "AI",
    "DevOps",
  ];

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [numApplicants, setNumApplicants] = useState("");
  const [price, setPrice] = useState("");
  const [deadline, setDeadline] = useState(null); // --- FIX: Use null for date objects
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [particles, setParticles] = useState([]);
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [openDeadline, setOpenDeadline] = useState(false);


  const logoInputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const newParticles = Array.from({ length: 12 }).map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: `${Math.random() * 6 + 4}px`,
      duration: `${Math.random() * 8 + 6}s`,
    }));
    setParticles(newParticles);
  }, []);

  useEffect(() => {
    if (!logo) {
      setLogoPreview("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(logo);
    setLogoPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [logo]);

  const handleCategoryClick = (category) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((c) => c !== category);
      }
      if (prev.length >= MAX_CATEGORIES) {
        alert(`You can select up to ${MAX_CATEGORIES} categories.`);
        return prev;
      }
      return [...prev, category];
    });
  };

  const handleAttachmentChange = (e) => {
    const files = Array.from(e.target.files);
    if (attachments.length + files.length <= MAX_ATTACHMENTS) {
      setAttachments((prev) => [...prev, ...files]);
    } else {
      alert(`You can upload up to ${MAX_ATTACHMENTS} attachments.`);
    }
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    try {
      setPosting(true);
      setPosted(false);

      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      
      // --- FIX: Add main category and use a different name for sub-categories ---
      formData.append("category", "Tech"); // Main category for filtering
      selectedCategories.forEach((cat) => formData.append("categories[]", cat)); // Sub-categories for tags

      formData.append("numberOfApplicants", numApplicants);
      formData.append("price", price);
      if (deadline) formData.append("deadline", deadline.toISOString());


      if (logo) formData.append("logo", logo);
      attachments.forEach((file) => formData.append("attachments", file));

      const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:5000";
      const res = await fetch(`${API_BASE}/api/tasks`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (res.ok) {
        setPosted(true);
        setTimeout(() => navigate("/tasks"), 1600);
      } else {
        const errData = await res.json();
        alert(`Failed to post task: ${errData.error || "Unknown error"}`);
        setPosting(false);
      }
    } catch (error) {
      console.error("Error posting task:", error);
      alert("An error occurred while posting the task.");
      setPosting(false);
    }
  };

  const essentials = [
    {
      id: "title",
      label: "Sharpen your title",
      hint: "Aim for a crisp, outcome-focused headline.",
      complete: Boolean(title.trim()),
    },
    {
      id: "description",
      label: "Describe the deliverable",
      hint: "Spell out scope, tone, and success metrics.",
      complete: description.trim().length > 0,
    },
    {
      id: "categories",
      label: "Tag specialties",
      hint: "Pick up to three to route talent instantly.",
      complete: selectedCategories.length > 0,
    },
    {
      id: "logistics",
      label: "Lock budget & deadline",
      hint: "Transparent expectations speed replies.",
      complete: Boolean(price) && Boolean(deadline),
    },
  ];

  const readinessScore = essentials.length
    ? Math.round((essentials.filter((item) => item.complete).length / essentials.length) * 100)
    : 0;

  const categoriesSummary = selectedCategories.length
    ? selectedCategories.join(", ")
    : "No categories selected yet";

  const attachmentsSummary = attachments.length
    ? `${attachments.length} file${attachments.length > 1 ? "s" : ""} ready`
    : "No attachments yet";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 text-white md:px-8">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-black to-pink-900 animate-gradient" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%)]" />

      {particles.map((p, i) => (
        <div
          key={i}
          className="hidden sm:block absolute rounded-full bg-purple-500/35 blur-md animate-float"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDuration: p.duration,
          }}
        />
      ))}

      <div className="relative z-10 w-full max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#141414]/85 p-6 shadow-[0_35px_120px_rgba(129,17,188,0.35)] backdrop-blur-2xl sm:p-8 md:p-10"
        >
          <div className="absolute -right-20 top-0 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-pink-500/10 blur-3xl" />

          <div className="relative grid gap-10 md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.9fr)]">
            <section className="space-y-8">
              <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <motion.h1
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.45 }}
                    className="bg-gradient-to-r from-pink-400 via-purple-300 to-purple-100 bg-clip-text text-3xl font-semibold text-transparent sm:text-4xl"
                  >
                    Post Tech Task
                  </motion.h1>
                  <p className="mt-3 text-sm text-gray-200/80 sm:text-base">
                    Submit a world-class brief and we will surface the perfect talent in hours.
                  </p>
                  <p className="mt-5 text-xs uppercase tracking-[0.35em] text-purple-200/70">
                    Step 1 of 3 | Task Details
                  </p>
                </div>

                <motion.button
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  onClick={() => navigate("/choose-category")}
                  className="group flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/90 transition hover:border-purple-300/60 hover:bg-white/10"
                >
                  <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
                  Back
                </motion.button>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-gray-200">Hero Image</p>
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => logoInputRef.current?.click()}
                  className="group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 px-6 py-8 text-center transition focus-within:border-purple-400/60 focus-within:bg-white/10 hover:border-purple-300/70 hover:bg-white/10"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20 text-purple-100 group-hover:bg-purple-500/30">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-white">Upload a cover image</p>
                  <p className="mt-1 text-xs text-gray-400">PNG or JPG | Up to 5MB</p>
                  <input
                    ref={logoInputRef}
                    id="logoInput"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                </motion.div>
                {logoPreview && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={logoPreview}
                        alt="Selected cover"
                        className="h-12 w-12 rounded-xl object-cover ring-2 ring-white/10"
                      />
                      <div>
                        <p className="text-sm font-medium text-white/90">{logo?.name}</p>
                        <p className="text-xs text-gray-400">Ready to make an impression</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLogo(null)}
                      className="text-white/60 transition hover:text-red-300"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  </motion.div>
                )}
              </div>

              <div className="space-y-6">
                <div className="relative">
                  <input
                    id="taskTitle"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Your task title"
                    className="peer block w-full rounded-2xl border border-white/12 bg-white/5 px-5 pt-7 pb-3 text-[15px] leading-relaxed text-white placeholder-transparent shadow-inner shadow-black/10 transition focus:border-pink-300/70 focus:bg-white/10 focus:outline-none focus:ring-4 focus:ring-purple-500/30"
                  />
                  <label
                    htmlFor="taskTitle"
                    className="pointer-events-none absolute left-5 top-3 text-[11px] font-medium uppercase tracking-[0.18em] text-purple-200 transition-all duration-200 peer-placeholder-shown:top-6 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-focus:top-3 peer-focus:text-[11px] peer-focus:text-purple-100"
                  >
                    Title
                  </label>
                  <p className="mt-2 text-xs text-gray-400">Capture the project in one punchy sentence.</p>
                </div>

                <div className="relative">
                  <textarea
                    id="taskDescription"
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the deliverables, tone, tech stack, success metrics..."
                    className="peer block w-full resize-none rounded-2xl border border-white/12 bg-white/5 px-5 pt-7 pb-3 text-[15px] leading-relaxed text-white placeholder-transparent shadow-inner shadow-black/10 transition focus:border-pink-300/70 focus:bg-white/10 focus:outline-none focus:ring-4 focus:ring-purple-500/30"
                  />
                  <label
                    htmlFor="taskDescription"
                    className="pointer-events-none absolute left-5 top-3 text-[11px] font-medium uppercase tracking-[0.18em] text-purple-200 transition-all duration-200 peer-placeholder-shown:top-6 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-focus:top-3 peer-focus:text-[11px] peer-focus:text-purple-100"
                  >
                    Description
                  </label>
                  <p className="mt-2 text-xs text-gray-400">Outline deliverables, context, and what success looks like.</p>
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-gray-200">Sub Categories</p>
                <div className="flex flex-wrap gap-3">
                  {categories.map((cat) => {
                    const selected = selectedCategories.includes(cat);
                    const disabled = !selected && selectedCategories.length >= MAX_CATEGORIES;
                    const chipClasses = [
                      "relative flex select-none items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
                      selected
                        ? "border-transparent bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/40"
                        : "border-white/15 bg-white/5 text-gray-200/90 hover:border-purple-300/60 hover:bg-white/10",
                      disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
                    ].join(" ");

                    return (
                      <motion.button
                        key={cat}
                        type="button"
                        layout
                        disabled={disabled}
                        aria-pressed={selected}
                        whileTap={!disabled ? { scale: 0.95 } : undefined}
                        whileHover={!disabled ? { scale: 1.03 } : undefined}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        onClick={() => !disabled && handleCategoryClick(cat)}
                        className={chipClasses}
                      >
                        <Sparkles className="h-4 w-4 opacity-70" />
                        {cat}
                      </motion.button>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-gray-400">
                  Choose up to {MAX_CATEGORIES} specialties to help pros find your brief.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {/* Applicants */}
                <div className="relative min-w-[170px]">
                  <Users className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-200/70" />
                  <input
                    id="applicants"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={numApplicants}
                    onChange={(e) => setNumApplicants(e.target.value)}
                    placeholder="0"
                    className="peer block w-full rounded-2xl border border-white/12 bg-white/5 
               px-12 pr-14 pt-8 pb-3 text-[15px] leading-relaxed text-white 
               placeholder-transparent transition focus:border-pink-300/70 
               focus:bg-white/10 focus:outline-none focus:ring-4 
               focus:ring-purple-500/30 [appearance:textfield] 
               [&::-webkit-outer-spin-button]:appearance-none 
               [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <label
                    htmlFor="applicants"
                    className="pointer-events-none absolute left-12 top-3 text-[11px] font-medium uppercase 
               tracking-[0.18em] text-purple-200 transition-all duration-200 
               peer-placeholder-shown:left-12 peer-placeholder-shown:top-1/2 
               peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-xs 
               peer-placeholder-shown:text-gray-400 peer-focus:top-3 
               peer-focus:text-[11px] peer-focus:text-purple-100"
                  >
                    Applicants
                  </label>
                </div>

                {/* Budget */}
                <div className="relative min-w-[170px]">
                  <Wallet className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-200/70" />
                  <input
                    id="price"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0"
                    className="peer block w-full rounded-2xl border border-white/12 bg-white/5 
               px-12 pr-14 pt-8 pb-3 text-[15px] leading-relaxed text-white 
               placeholder-transparent transition focus:border-pink-300/70 
               focus:bg-white/10 focus:outline-none focus:ring-4 
               focus:ring-purple-500/30 [appearance:textfield] 
               [&::-webkit-outer-spin-button]:appearance-none 
               [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <label
                    htmlFor="price"
                    className="pointer-events-none absolute left-12 top-3 text-[11px] font-medium uppercase 
               tracking-[0.18em] text-purple-200 transition-all duration-200 
               peer-placeholder-shown:left-12 peer-placeholder-shown:top-1/2 
               peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-xs 
               peer-placeholder-shown:text-gray-400 peer-focus:top-3 
               peer-focus:text-[11px] peer-focus:text-purple-100"
                  >
                    Budget (₹)
                  </label>
                </div>

                {/* Deadline */}
                <div className="relative min-w-[170px] group">
                  <Popover open={openDeadline} onOpenChange={setOpenDeadline}>
                    <PopoverTrigger asChild>
                      <div className="relative w-full">
                        <CalendarDays className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-200/70" />
                        <div
                          tabIndex={0}
                          className="peer block w-full rounded-2xl border border-white/12 bg-white/5 px-12 pt-8 pb-3 text-[15px] leading-relaxed text-white transition focus:border-pink-300/70 focus:bg-white/10 focus:outline-none focus:ring-4 focus:ring-purple-500/30 cursor-pointer"
                        >
                          {deadline ? (
                            <span className="text-white whitespace-nowrap">{format(deadline, "PP")}</span>
                          ) : (
                            <span className="text-transparent">-</span>
                          )}
                        </div>
                        <label
                          className={`pointer-events-none absolute left-12 text-[11px] font-medium uppercase tracking-[0.18em] transition-all duration-200 ${
                            deadline
                              ? "top-3 text-purple-200"
                              : "top-1/2 -translate-y-1/2 text-xs text-gray-400"
                          }`}
                        >
                          Deadline
                        </label>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-[#141414] border border-white/10 rounded-xl shadow-xl">
                      <React.Suspense fallback={<div>Loading...</div>}>
                        <Calendar
                          mode="single"
                          selected={deadline}
                          onSelect={(date) => {
                            setDeadline(date);
                            setOpenDeadline(false);
                          }}
                          fromDate={new Date()}
                          className="rounded-md border-none text-white"
                        />
                      </React.Suspense>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-gray-200">
                  Attachments <span className="text-xs text-gray-400">(Optional)</span>
                </p>
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 px-6 py-8 text-center transition focus-within:border-purple-400/60 focus-within:bg-white/10 hover:border-purple-300/70 hover:bg-white/10"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20 text-purple-100 group-hover:bg-purple-500/30">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-white">Drop files or click to browse</p>
                  <p className="mt-1 text-xs text-gray-400">Up to {MAX_ATTACHMENTS} files · PDF, ZIP, Figma, Docs</p>
                  <input
                    ref={fileInputRef}
                    id="fileInput"
                    type="file"
                    multiple
                    onChange={handleAttachmentChange}
                    className="hidden"
                  />
                </motion.div>
                <AnimatePresence>
                  {attachments.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                      className="mt-4 flex flex-wrap gap-3"
                    >
                      {attachments.map((file, index) => (
                        <motion.div
                          key={`${file.name}-${index}`}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90"
                        >
                          <span className="max-w-[150px] truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="text-white/60 transition hover:text-red-300"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className="sticky bottom-4 w-full rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 px-6 py-3 text-lg font-semibold shadow-[0_20px_60px_rgba(129,17,188,0.35)] transition hover:shadow-[0_25px_70px_rgba(129,17,188,0.45)] focus:outline-none focus:ring-4 focus:ring-purple-400/40"
                onClick={handleSubmit}
                disabled={posting}
              >
                {posting ? 'Posting...' : 'Post Task'}
              </motion.button>
            </section>

            <aside className="relative mt-2 hidden md:block space-y-6 rounded-3xl border border-white/10 bg-white/5 px-6 py-8 shadow-[0_25px_80px_rgba(15,15,35,0.45)] backdrop-blur-xl sm:px-7 sm:py-10">
              <div className="absolute -top-20 right-4 h-40 w-40 rounded-full bg-gradient-to-tr from-purple-500/35 via-pink-400/25 to-transparent blur-3xl" />
              <div className="relative space-y-6 text-sm text-white/90">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-purple-200/80">Snapshot</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-purple-100">
                      {readinessScore}% ready
                    </span>
                  </div>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div>
                      <dt className="text-xs uppercase tracking-[0.2em] text-gray-400">Title</dt>
                      <dd className="text-white/90">{title.trim() || "Title coming soon"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.2em] text-gray-400">Categories</dt>
                      <dd className="text-white/90">{categoriesSummary}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.2em] text-gray-400">Attachments</dt>
                      <dd className="text-white/90">{attachmentsSummary}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-purple-200/80">Launch checklist</p>
                  <ul className="mt-4 space-y-3 text-sm">
                    {essentials.map((item) => (
                      <li key={item.id} className="flex items-start gap-3">
                        {item.complete ? (
                          <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300" />
                        ) : (
                          <CircleDashed className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-200/70" />
                        )}
                        <div>
                          <p className="font-medium text-white/90">{item.label}</p>
                          <p className="text-xs text-gray-400">{item.hint}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-white/10 p-2">
                      <Lightbulb className="h-5 w-5 text-purple-100" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Pro tip</p>
                      <p className="text-xs text-gray-300">
                        Give examples of past work or inspiration links so applicants can mirror your style.
                      </p>
                    </div>
                  </div>
                  <a
                    href="https://help.withbriefs.com/sample-task"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:border-purple-300/60 hover:bg-white/10"
                  >
                    View sample brief
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </motion.div>
      </div>

      <PostingOverlay posting={posting} posted={posted} redirectTo="Tasks" />

      <style>{`
        @keyframes gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .animate-gradient { background-size: 220% 220%; animation: gradient 16s ease infinite; }
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-16px); } 100% { transform: translateY(0px); } }
        .animate-float { animation: float infinite ease-in-out; }
      `}</style>
    </div>
  );
}