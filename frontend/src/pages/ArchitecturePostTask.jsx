import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
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
  ChevronLeft,
  ChevronRight,
  Building2,
  Ruler,
  Loader2
} from "lucide-react";

import { apiFetch } from "../lib/fetch";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:5000";

const MAX_PROJECT_TYPES = 5;
const MAX_STYLES = 5;
const MAX_ATTACHMENTS = 10;

// Shared Light Theme Components
const GradientText = ({ children, className = "" }) => (
  <span className={`text-blue-600 font-bold tracking-tight ${className}`}>
    {children}
  </span>
);

export default function ArchitecturePostTask() {
  const navigate = useNavigate();

  // Architecture options
  const projectTypeOptions = [
    "2D Floor Plans",
    "3D Elevations / Rendering",
    "Interior Design",
    "Landscape Design",
    "Structural Design",
    "Walkthrough Animation",
    "Urban Planning",
  ];

  const styleOptions = [
    "Modern",
    "Minimalist",
    "Traditional",
    "Industrial",
    "Luxury",
    "Sustainable",
  ];

  const propertyTypeOptions = [
    "Residential",
    "Apartment",
    "Office",
    "Commercial",
    "Landscape",
  ];

  const suggestedAreas = [
    "Up to 500 sq.ft",
    "500 – 1500 sq.ft",
    "1500 – 3000 sq.ft",
    "3000 – 5000 sq.ft",
    "5000+ sq.ft",
  ];

  // State
  const [projectTypes, setProjectTypes] = useState([]);
  const [styles, setStyles] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [title, setTitle] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [areaSize, setAreaSize] = useState("");
  const [description, setDescription] = useState("");
  const [numApplicants, setNumApplicants] = useState("");
  const [price, setPrice] = useState("");
  const [deadline, setDeadline] = useState(null);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [openDeadline, setOpenDeadline] = useState(false);

  const logoInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // logo preview
  useEffect(() => {
    if (!logo) {
      setLogoPreview("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(logo);
    setLogoPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [logo]);

  // chips
  const handleProjectTypeClick = (value) => {
    setProjectTypes((prev) => {
      if (prev.includes(value)) {
        return prev.filter((c) => c !== value);
      }
      if (prev.length >= MAX_PROJECT_TYPES) {
        alert(`You can select up to ${MAX_PROJECT_TYPES} components.`);
        return prev;
      }
      return [...prev, value];
    });
  };

  const handleStyleClick = (value) => {
    setStyles((prev) => {
      if (prev.includes(value)) {
        return prev.filter((c) => c !== value);
      }
      if (prev.length >= MAX_STYLES) {
        alert(`You can select up to ${MAX_STYLES} styles.`);
        return prev;
      }
      return [...prev, value];
    });
  };

  // attachments
  const handleAttachmentChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (attachments.length + files.length <= MAX_ATTACHMENTS) {
      setAttachments((prev) => [...prev, ...files]);
    } else {
      alert(`You can upload up to ${MAX_ATTACHMENTS} attachments.`);
    }
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // submit
  const handleSubmit = async () => {
    try {
      setPosting(true);
      setPosted(false);

      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("numberOfApplicants", numApplicants);
      formData.append("price", price);
      if (deadline) formData.append("deadline", deadline.toISOString());

      formData.append("category", "Architecture");
      formData.append(
        "metadata",
        JSON.stringify({
          propertyType,
          areaSize,
          projectTypes,
          styles,
        })
      );

      if (logo) formData.append("logo", logo);
      attachments.forEach((file) => formData.append("attachments", file));

      const res = await apiFetch(`${API_BASE}/api/tasks`, {
        method: "POST",
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

  // readiness
  const essentials = [
    {
      id: "title",
      label: "Sharpen your title",
      hint: "Aim for a crisp, outcome-focused headline.",
      complete: Boolean(title.trim()),
    },
    {
      id: "propertyType",
      label: "Specify property type",
      hint: "Call out residential, commercial, landscape, etc.",
      complete: Boolean(propertyType.trim()),
    },
    {
      id: "projectTypes",
      label: "Pick project components",
      hint: "Select up to five key deliverables.",
      complete: projectTypes.length > 0,
    },
    {
      id: "description",
      label: "Describe the scope",
      hint: "Outline rooms, constraints, style preferences, and metrics.",
      complete: description.trim().length > 0,
    },
    {
      id: "logistics",
      label: "Lock budget & deadline",
      hint: "Transparent expectations speed replies.",
      complete: Boolean(price) && Boolean(deadline),
    },
  ];

  const readinessScore = essentials.length
    ? Math.round(
      (essentials.filter((item) => item.complete).length /
        essentials.length) *
      100
    )
    : 0;

  const projectTypesSummary = projectTypes.length
    ? projectTypes.join(", ")
    : "No project components selected yet";

  const stylesSummary = styles.length
    ? styles.join(", ")
    : "No styles selected yet";

  const attachmentsSummary = attachments.length
    ? `${attachments.length} file${attachments.length > 1 ? "s" : ""} ready`
    : "No attachments yet";

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 py-10 px-4 md:px-8 font-sans">
      {/* Background decoration */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-white to-transparent pointer-events-none -z-10" />

      <div className="relative z-10 w-full max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl p-6 md:p-10 shadow-xl border border-slate-200"
        >
          <div className="relative grid gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <section className="space-y-8">
              <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <motion.h1
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight"
                  >
                    Post <GradientText>Architecture Task</GradientText>
                  </motion.h1>
                  <p className="mt-2 text-slate-600 text-lg">
                    Share a polished design brief and match with top architects fast.
                  </p>
                </div>

                <motion.button
                  whileHover={{ x: -4 }}
                  onClick={() => navigate("/choose-category")}
                  className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </motion.button>
              </div>

              {/* Hero Image */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700">Hero Image</label>
                {!logoPreview ? (
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => logoInputRef.current?.click()}
                    className="group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-blue-400 hover:bg-blue-50/50"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-900">Upload a cover image</p>
                    <p className="text-xs text-slate-500 mt-1">Floor plans, moodboards, or site photos | Up to 5MB</p>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                  </motion.div>
                ) : (
                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                      <img
                        src={logoPreview}
                        alt="Preview"
                        className="h-16 w-16 rounded-lg object-cover border border-slate-200"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{logo?.name}</p>
                        <p className="text-xs text-slate-500">Ready to inspire</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setLogo(null)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <label htmlFor="taskTitle" className="block text-sm font-medium text-slate-700 mb-1">
                    Task Title
                  </label>
                  <input
                    id="taskTitle"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Modern 3BHK Apartment Layout"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">Capture the project in one punchy sentence.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="propertyType" className="block text-sm font-medium text-slate-700 mb-1">
                      Property Type
                    </label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <select
                        id="propertyType"
                        value={propertyType}
                        onChange={(e) => setPropertyType(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                      >
                        <option value="" disabled>Select Type</option>
                        {propertyTypeOptions.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="areaSize" className="block text-sm font-medium text-slate-700 mb-1">
                      Area Size
                    </label>
                    <div className="relative">
                      <Ruler className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        id="areaSize"
                        type="text"
                        value={areaSize}
                        onChange={(e) => setAreaSize(e.target.value)}
                        placeholder="e.g. 2500 sq.ft"
                        className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Suggested Areas */}
                <div className="flex flex-wrap gap-2">
                  {suggestedAreas.map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => setAreaSize(area)}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    >
                      {area}
                    </button>
                  ))}
                </div>

                <div>
                  <label htmlFor="taskDescription" className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="taskDescription"
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe spaces, constraints, inspiration references, codes, and deliverables..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">Outline rooms, number of floors, parking, bylaws, and what success looks like.</p>
                </div>
              </div>

              {/* Project Types */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Project Types</label>
                <div className="flex flex-wrap gap-3">
                  {projectTypeOptions.map((type) => {
                    const selected = projectTypes.includes(type);
                    const disabled = !selected && projectTypes.length >= MAX_PROJECT_TYPES;

                    return (
                      <button
                        key={type}
                        type="button"
                        disabled={disabled}
                        onClick={() => !disabled && handleProjectTypeClick(type)}
                        className={`
                          flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all
                          ${selected
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 hover:bg-blue-700"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                          }
                          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                        `}
                      >
                        <Sparkles className={`h-3.5 w-3.5 ${selected ? "text-blue-200" : "text-slate-400"}`} />
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Styles */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Preferred Styles</label>
                <div className="flex flex-wrap gap-3">
                  {styleOptions.map((type) => {
                    const selected = styles.includes(type);
                    const disabled = !selected && styles.length >= MAX_STYLES;

                    return (
                      <button
                        key={type}
                        type="button"
                        disabled={disabled}
                        onClick={() => !disabled && handleStyleClick(type)}
                        className={`
                          flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all
                          ${selected
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 hover:bg-blue-700"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                          }
                          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                        `}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-3">
                <div>
                  <label htmlFor="applicants" className="block text-sm font-medium text-slate-700 mb-1">Max Applicants</label>
                  <div className="relative">
                    <Users className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      id="applicants"
                      type="number"
                      min="1"
                      value={numApplicants}
                      onChange={(e) => setNumApplicants(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-slate-700 mb-1">Budget (₹)</label>
                  <div className="relative">
                    <Wallet className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      id="price"
                      type="number"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <button
                      type="button"
                      onClick={() => setOpenDeadline(!openDeadline)}
                      className={`w-full rounded-xl border px-3 pl-10 py-2.5 text-left text-sm transition-all outline-none focus:ring-4 focus:ring-blue-500/10
                        ${deadline ? "bg-white border-slate-200 text-slate-900 font-medium" : "bg-white border-slate-200 text-slate-500"}
                         ${openDeadline ? "border-blue-500 ring-4 ring-blue-500/10" : ""}
                       `}
                    >
                      {deadline ? format(deadline, "PP") : "Select date"}
                    </button>

                    <AnimatePresence>
                      {openDeadline && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full left-0 mt-2 z-50 rounded-xl bg-white p-4 shadow-xl border border-slate-100 w-[280px]"
                        >
                          <SimpleCalendar
                            selected={deadline}
                            onSelect={(date) => {
                              setDeadline(date);
                              setOpenDeadline(false);
                            }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Attachments */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Attachments</label>
                  <span className="text-xs text-slate-400">Optional</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
                  >
                    <div className="p-2 bg-white rounded-full shadow-sm mb-2">
                      <UploadCloud className="h-5 w-5 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-700">Add files</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, ZIP, Docs</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleAttachmentChange}
                      className="hidden"
                    />
                  </motion.div>

                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                    {attachments.length === 0 && (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                        No attachments yet
                      </div>
                    )}
                    <AnimatePresence>
                      {attachments.map((file, index) => (
                        <motion.div
                          key={`${file.name}-${index}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, width: 0 }}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className="p-1.5 bg-white rounded shadow-sm text-blue-600">
                              <CheckCircle className="h-3 w-3" />
                            </div>
                            <span className="text-sm text-slate-700 truncate max-w-[120px]">{file.name}</span>
                          </div>
                          <button onClick={() => removeAttachment(index)} className="text-slate-400 hover:text-red-500">
                            <XCircle className="h-4 w-4" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  className="w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                  onClick={handleSubmit}
                  disabled={posting}
                >
                  {posting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Publishing Task...
                    </span>
                  ) : (
                    "Post Task"
                  )}
                </button>
              </div>
            </section>

            <aside className="hidden lg:block">
              <div className="sticky top-10 space-y-6">
                {/* Snapshot */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Snapshot</h3>
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${readinessScore === 100 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {readinessScore}% Ready
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Title</p>
                      <p className={`text-sm ${title ? "text-slate-900 font-medium" : "text-slate-400 italic"}`}>
                        {title || "Untitled Task"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Property</p>
                      <p className={`text-sm ${propertyType ? "text-slate-900 font-medium" : "text-slate-400 italic"}`}>
                        {propertyType || "Not specified"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Project Types</p>
                      <p className={`text-sm ${projectTypes.length ? "text-slate-900 font-medium" : "text-slate-400 italic"}`}>
                        {projectTypesSummary}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Styles</p>
                      <p className={`text-sm ${styles.length ? "text-slate-900 font-medium" : "text-slate-400 italic"}`}>
                        {stylesSummary}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Checklist */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Launch Checklist</h3>
                  <ul className="space-y-4">
                    {essentials.map((item) => (
                      <li key={item.id} className="flex gap-3">
                        {item.complete ? (
                          <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <CircleDashed className="h-5 w-5 text-slate-300 flex-shrink-0" />
                        )}
                        <div>
                          <p className={`text-sm font-medium ${item.complete ? "text-slate-900" : "text-slate-600"}`}>
                            {item.label}
                          </p>
                          <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{item.hint}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Pro Tip */}
                <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-5">
                  <div className="flex gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm h-fit">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Pro Tip</h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Detailed descriptions with clear deliverables attract top-tier talent 20% faster.
                      </p>
                    </div>
                  </div>
                  <a
                    href="#"
                    className="mt-4 block w-full rounded-lg bg-white border border-blue-200 px-3 py-2 text-center text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
                  >
                    View Sample Brief <ArrowUpRight className="inline h-3 w-3 ml-1" />
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </motion.div>
      </div>

      {/* Posting Overlay */}
      <AnimatePresence>
        {(posting || posted) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="rounded-3xl bg-white p-12 text-center shadow-2xl max-w-sm w-full mx-4"
            >
              {posting && !posted && (
                <>
                  <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Publishing...</h3>
                  <p className="text-slate-500">We're pushing your brief live.</p>
                </>
              )}

              {posted && (
                <>
                  <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Success!</h3>
                  <p className="text-slate-500">Redirecting to task board...</p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Simple inline calendar component
function SimpleCalendar({ selected, onSelect }) {
  const [currentMonth, setCurrentMonth] = useState(selected || new Date());

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const isSelected = (day) => {
    if (!selected) return false;
    return (
      selected.getDate() === day &&
      selected.getMonth() === currentMonth.getMonth() &&
      selected.getFullYear() === currentMonth.getFullYear()
    );
  };

  const isPast = (day) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return checkDate < today;
  };

  return (
    <div className="w-full text-slate-800">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1 rounded hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="font-semibold text-sm">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </div>
        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1 rounded hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div key={day} className="text-center text-xs font-semibold text-slate-400 py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <div key={index} className="aspect-square">
            {day ? (
              <button
                type="button"
                disabled={isPast(day)}
                onClick={() => {
                  if (!isPast(day)) {
                    onSelect(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
                  }
                }}
                className={`w-full h-full rounded-md text-sm flex items-center justify-center transition-all ${isSelected(day)
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                  : isPast(day)
                    ? "text-slate-300 cursor-not-allowed"
                    : "text-slate-700 hover:bg-blue-50 hover:text-blue-600"
                  }`}
              >
                {day}
              </button>
            ) : (
              <div />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
