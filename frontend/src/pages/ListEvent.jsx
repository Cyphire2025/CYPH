/* eslint-disable no-unused-vars */
import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import {
  FiUploadCloud, FiX, FiCheck, FiStar, FiZap, FiLayout, FiImage, FiPhone, FiMail, FiUser, FiCreditCard
} from "react-icons/fi";
import { Toaster, toast } from 'react-hot-toast';
import Navbar from "../components/navbarsponhome";
import { apiFetch } from "../lib/fetch";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:5000";

// Reusable Background Component
const Background = () => (
  <div className="absolute inset-0 -z-10 h-full w-full bg-slate-50 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
    <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-400 opacity-20 blur-[100px]"></div>
    <div className="absolute right-0 bottom-0 -z-10 h-[310px] w-[310px] rounded-full bg-indigo-400 opacity-20 blur-[100px]"></div>
  </div>
);

// Predefined Options
const EVENT_TYPES = [
  "College Fest", "Tech Seminar", "Hackathon", "Cultural Event",
  "Corporate Conference", "Community Meetup", "Concert / Festival",
];

export default function ListEvent() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const paymentQrInputRef = useRef(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventTypes, setEventTypes] = useState([]);
  const [customEvent, setCustomEvent] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  // Contact Details
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [paymentUpiId, setPaymentUpiId] = useState("");
  const [paymentPhone, setPaymentPhone] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentQr, setPaymentQr] = useState(null);
  const [paymentQrPreview, setPaymentQrPreview] = useState(null);

  // UI State
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Toggle helper for pills
  const toggleItem = (item, list, setList) => {
    setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  // File Handlers
  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleAttachments = (files) => {
    const newFiles = Array.from(files);
    if (attachments.length + newFiles.length > 5) {
      toast.error("Max 5 attachments allowed");
      return;
    }
    setAttachments([...attachments, ...newFiles]);
  };

  const handlePaymentQrChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPaymentQr(file);
      setPaymentQrPreview(URL.createObjectURL(file));
    }
  };

  // Drag & Drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleAttachments(e.dataTransfer.files);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Submission Logic
  // ─────────────────────────────────────────────────────────────────────────────
  const buildFormData = () => {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("category", "Event");
    formData.append("description", description);
    if (logo) formData.append("logo", logo);
    if (paymentQr) formData.append("paymentQr", paymentQr);

    const allEvents = [...eventTypes];
    if (customEvent.trim()) allEvents.push(customEvent.trim());

    formData.append("metadata", JSON.stringify({
      eventTypes: allEvents,
      tier: "basic", // Always free
      contactName,
      contactEmail,
      contactPhone,
      paymentUpiId: paymentUpiId.trim(),
      paymentPhone: paymentPhone.trim(),
      paymentNotes: paymentNotes.trim(),
    }));

    attachments.forEach(file => formData.append("attachments", file));
    return formData;
  };

  const handlePost = async () => {
    if (!title || !description || !contactEmail) {
      toast.error("Please fill in required fields (Title, Description, Email)");
      return;
    }

    setPosting(true);

    try {
      const formData = buildFormData();
      const res = await apiFetch(`${API_BASE}/api/tasks`, { method: "POST", body: formData });

      if (res.ok) {
        setPosted(true);
        toast.success("Event listed successfully!");
        setTimeout(() => navigate("/events"), 2500);
      } else {
        const data = await res.json();
        throw new Error(data.error || "Submission failed");
      }
    } catch (err) {
      toast.error(err.message);
      setPosting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // UI Components
  // ─────────────────────────────────────────────────────────────────────────────

  if (posted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center relative overflow-hidden">
        <Background />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-12 rounded-3xl shadow-2xl text-center max-w-md border border-slate-100">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiCheck size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Success!</h2>
          <p className="text-slate-500 mb-6">Your event listing has been posted.</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 2.5 }} className="h-full bg-green-500" />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Navbar />
      <Background />
      <Toaster position="top-center" />

      <main className="pt-28 pb-20 px-4">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
              List Your <span className="text-purple-600">Event</span>
            </h1>
            <p className="mt-2 text-slate-500 max-w-2xl mx-auto">
              Share your event details and let potential sponsors connect with you directly.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden"
          >
            {/* Form Progress/Header */}
            <div className="bg-slate-50 px-8 py-4 border-b border-slate-200 flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-500">New Event Listing (Free)</span>
            </div>

            <div className="p-8 space-y-8">

              {/* Section 1: Basic Info */}
              <div className="space-y-5">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <FiLayout className="text-purple-500" /> Event Details
                </h3>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Event Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none"
                    placeholder="e.g. Annual Tech Summit 2026"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Description <span className="text-red-500">*</span></label>
                  <textarea
                    rows={4}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none resize-none"
                    placeholder="Describe your event, expected audience, and why sponsors should care..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Section 2: Contact Info */}
              <div className="space-y-5">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <FiUser className="text-blue-500" /> Contact Information
                </h3>
                <p className="text-sm text-slate-500">Provide details for sponsors to reach you.</p>

                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Organizer Name</label>
                    <div className="relative">
                      <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-3 text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none"
                        placeholder="Your Name"
                        value={contactName}
                        onChange={e => setContactName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Phone Number</label>
                    <div className="relative">
                      <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-3 text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none"
                        placeholder="+91 98765 43210"
                        value={contactPhone}
                        onChange={e => setContactPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Email Address <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-3 text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none"
                      placeholder="sponsor@event.com"
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Section 3: Classification */}
              <div className="space-y-5">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <FiLayout className="text-pink-500" /> Classification
                </h3>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-3">Event Type</label>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_TYPES.map(type => (
                      <button
                        key={type}
                        onClick={() => toggleItem(type, eventTypes, setEventTypes)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${eventTypes.includes(type)
                          ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                          : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                          }`}
                      >
                        {type} {eventTypes.includes(type) && <FiCheck className="inline ml-1" />}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    className="mt-3 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-purple-500 outline-none"
                    placeholder="Other (Type & Press Enter)"
                    value={customEvent}
                    onChange={e => setCustomEvent(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && customEvent.trim()) {
                        toggleItem(customEvent.trim(), eventTypes, setEventTypes);
                        setCustomEvent("");
                      }
                    }}
                  />
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Section 4: Visuals */}
              <div className="space-y-5">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <FiImage className="text-orange-500" /> Visuals & Assets
                </h3>

                <div className="flex gap-6 items-start">
                  {/* Logo Upload */}
                  <div className="shrink-0 text-center">
                    <div
                      onClick={() => logoInputRef.current?.click()}
                      className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-purple-400 flex items-center justify-center cursor-pointer overflow-hidden transition-all"
                    >
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-slate-400 flex flex-col items-center gap-1">
                          <FiUploadCloud size={20} />
                          <span className="text-[10px] font-medium">Logo</span>
                        </div>
                      )}
                    </div>
                    <input type="file" ref={logoInputRef} onChange={handleLogoChange} accept="image/*" className="hidden" />
                  </div>

                  {/* Attachments Upload */}
                  <div
                    className={`flex-1 rounded-2xl border-2 border-dashed transition-all p-6 flex flex-col items-center justify-center text-center cursor-pointer
                            ${dragActive ? "border-purple-500 bg-purple-50" : "border-slate-300 bg-slate-50 hover:border-purple-400 hover:bg-slate-100"}`}
                    onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FiUploadCloud size={32} className="text-slate-400 mb-2" />
                    <p className="text-sm font-medium text-slate-700">Drop attachments here</p>
                    <p className="text-xs text-slate-400">PDF, DOCX, PPT (Max 5)</p>
                    <input
                      type="file"
                      multiple
                      ref={fileInputRef}
                      onChange={e => handleAttachments(e.target.files)}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                    />
                  </div>
                </div>

                {/* File List */}
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-sm text-slate-700 truncate">{file.name}</span>
                        <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500">
                          <FiX />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <hr className="border-slate-100" />

              {/* Section 5: Optional Anonymous Sponsorship Payments */}
              <div className="space-y-5">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <FiCreditCard className="text-emerald-600" /> Anonymous Sponsorship (Optional)
                </h3>
                <p className="text-sm text-slate-500">
                  Add payment details if you want sponsors to contribute directly and anonymously from your event detail page.
                </p>

                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">UPI ID (optional)</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                      placeholder="e.g. myevent@oksbi"
                      value={paymentUpiId}
                      onChange={e => setPaymentUpiId(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Payment Phone (optional)</label>
                    <input
                      type="tel"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                      placeholder="e.g. +91 98XXXXXXXX"
                      value={paymentPhone}
                      onChange={e => setPaymentPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Payment Note (optional)</label>
                  <textarea
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none resize-none"
                    placeholder="e.g. Mention event name in payment note for tracking."
                    value={paymentNotes}
                    onChange={e => setPaymentNotes(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 block">Payment QR (optional)</label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => paymentQrInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
                    >
                      <FiUploadCloud /> Upload QR
                    </button>
                    <input
                      ref={paymentQrInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePaymentQrChange}
                      className="hidden"
                    />
                    {paymentQr && (
                      <span className="text-sm text-slate-600 truncate max-w-[220px]">{paymentQr.name}</span>
                    )}
                  </div>
                  {paymentQrPreview && (
                    <img
                      src={paymentQrPreview}
                      alt="Payment QR preview"
                      className="mt-2 h-36 w-36 rounded-xl border border-slate-200 object-cover bg-white"
                    />
                  )}
                </div>
              </div>

            </div>

            {/* Footer / Submit */}
            <div className="bg-slate-50 px-8 py-6 border-t border-slate-200 flex justify-end gap-3 z-10 relative">
              <button
                onClick={() => navigate("/events")}
                className="px-6 py-3 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePost}
                disabled={posting}
                className="px-8 py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-lg shadow-purple-500/20 active:scale-95 transition-all flex items-center gap-2"
              >
                {posting ? "Posting..." : "List Event (Free)"}
                {!posting && <FiZap />}
              </button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
