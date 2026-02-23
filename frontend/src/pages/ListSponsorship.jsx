/* eslint-disable no-unused-vars */
import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import {
  FiUploadCloud, FiX, FiCheck, FiStar, FiZap, FiLayout, FiImage, FiDollarSign
} from "react-icons/fi";
import { Toaster, toast } from 'react-hot-toast';
import Navbar from "../components/navbarsponhome";
import Footer from "../components/footer";
import { apiFetch } from "../lib/fetch";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:5000";

// Reusable Background Component (consistent with Auth pages)
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
const RETURN_OPTIONS = [
  "Logo on Posters", "Stall at Venue", "Social Media Mentions",
  "Brochure Mentions", "VIP Invites", "Venue Banner", "Merch Branding",
];

export default function SponsorshipPostTask() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);

  // Form State
  const [title, setTitle] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [description, setDescription] = useState("");
  const [eventTypes, setEventTypes] = useState([]);
  const [expectedReturns, setExpectedReturns] = useState([]);
  const [customEvent, setCustomEvent] = useState("");
  const [customReturn, setCustomReturn] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactWebsite, setContactWebsite] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

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
  // Submission Logic (Preserved & Cleaned)
  // ─────────────────────────────────────────────────────────────────────────────
  const buildFormData = ({ tier, listingPlan, paymentVerificationId = null }) => {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("category", "Sponsorship");
    formData.append("description", description);
    if (logo) formData.append("logo", logo);

    const allEvents = [...eventTypes];
    if (customEvent.trim()) allEvents.push(customEvent.trim());

    const allReturns = [...expectedReturns];
    if (customReturn.trim()) allReturns.push(customReturn.trim());

    formData.append("metadata", JSON.stringify({
      budgetRange,
      eventTypes: allEvents,
      expectedReturns: allReturns,
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      contactWebsite: contactWebsite.trim(),
      tier,
      listingPlan,
      ...(paymentVerificationId ? { paymentVerificationId } : {}),
    }));

    attachments.forEach(file => formData.append("attachments", file));
    return formData;
  };

  const handlePost = async ({ tier = "basic", listingPlan = "free" } = {}) => {
    if (!title || !budgetRange || !description || !contactName || !contactEmail || !contactPhone) {
      toast.error("Please fill in all required fields, including contact details");
      return;
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim());
    if (!emailOk) {
      toast.error("Please enter a valid contact email");
      return;
    }

    setPosting(true);

    try {
      if (listingPlan === "free") {
        await submitTask({ tier, listingPlan });
        return;
      }

      if (!window.Razorpay) {
        throw new Error("Payment checkout is unavailable right now");
      }

      const keyRes = await apiFetch(`${API_BASE}/api/payment/public-key`);
      const keyData = await keyRes.json().catch(() => ({}));
      if (!keyRes.ok || !keyData?.keyId) {
        throw new Error(keyData?.error || "Payment is temporarily unavailable");
      }

      const orderRes = await apiFetch(`${API_BASE}/api/payment/create-listing-order`, {
        method: "POST",
        body: JSON.stringify({
          category: "sponsorship",
          listingPlan,
        }),
      });
      const order = await orderRes.json().catch(() => ({}));
      if (!orderRes.ok || !order?.id) {
        throw new Error(order?.error || "Failed to initialize listing payment");
      }

      const paymentVerificationId = await new Promise((resolve, reject) => {
        const razor = new window.Razorpay({
          key: keyData.keyId,
          amount: order.amount,
          currency: order.currency || "INR",
          name: "Cyphire Sponsorship",
          description: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Listing`,
          order_id: order.id,
          theme: { color: "#2563eb" },
          modal: {
            ondismiss: () => reject(new Error("Payment was cancelled")),
          },
          handler: async (response) => {
            try {
              const verifyRes = await apiFetch(`${API_BASE}/api/payment/verify-listing-payment`, {
                method: "POST",
                body: JSON.stringify({
                  category: "sponsorship",
                  listingPlan,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });
              const verifyData = await verifyRes.json().catch(() => ({}));
              if (!verifyRes.ok || !verifyData?.verificationId) {
                throw new Error(verifyData?.error || "Payment verification failed");
              }
              resolve(verifyData.verificationId);
            } catch (verifyErr) {
              reject(verifyErr);
            }
          },
        });

        razor.on("payment.failed", (event) => {
          reject(new Error(event?.error?.description || "Payment failed"));
        });

        razor.open();
      });

      await submitTask({ tier, listingPlan, paymentVerificationId });
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Initialization failed");
      setPosting(false);
    }
  };

  const submitTask = async ({ tier, listingPlan, paymentVerificationId = null }) => {
    try {
      const formData = buildFormData({ tier, listingPlan, paymentVerificationId });
      const res = await apiFetch(`${API_BASE}/api/tasks`, { method: "POST", body: formData });

      if (res.ok) {
        setPosted(true);
        toast.success("Listing posted successfully!");
        setTimeout(() => navigate("/sponsorships"), 2500);
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
          <p className="text-slate-500 mb-6">Your sponsorship listing has been posted.</p>
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
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
              List Your <span className="text-blue-600">Sponsorship</span> Opportunity
            </h1>
            <p className="mt-2 text-slate-500 max-w-2xl mx-auto">
              Connect with brands looking to invest in your event. Choose a plan that fits your visibility needs.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 items-start">

            {/* Left Panel: Benefits/Context */}
            <div className="w-full lg:w-1/3 space-y-6 top-24 lg:sticky">
              {/* Benefit Card 1 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FiZap /></div>
                  <h3 className="font-bold text-slate-900">Why List Here?</h3>
                </div>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li className="flex gap-2"><FiCheck className="text-green-500 shrink-0" /> Access network of 1200+ sponsors</li>
                  <li className="flex gap-2"><FiCheck className="text-green-500 shrink-0" /> smart matching by industry</li>
                  <li className="flex gap-2"><FiCheck className="text-green-500 shrink-0" /> Secure escrow payments</li>
                </ul>
              </div>

              {/* Pricing Context */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
                <h3 className="font-bold text-lg mb-2">Premium Benefits</h3>
                <p className="text-blue-100 text-sm mb-4">Get 3x more visibility with a premium listing.</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                    <FiStar className="text-yellow-300" />
                    <span className="text-sm font-medium">Featured in Spotlight</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                    <FiLayout className="text-blue-200" />
                    <span className="text-sm font-medium">Rich Media Gallery</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel: The Form */}
            <div className="w-full lg:w-2/3">
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden"
              >
                {/* Form Progress/Header */}
                <div className="bg-slate-50 px-8 py-4 border-b border-slate-200 flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-500">New Listing</span>
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  </div>
                </div>

                <div className="p-8 space-y-8">

                  {/* Section 1: Basic Info */}
                  <div className="space-y-5">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <FiLayout className="text-blue-500" /> Core Details
                    </h3>

                    <div className="grid md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Listing Title <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                          placeholder="e.g. TechFest 2026 Title Sponsor"
                          value={title}
                          onChange={e => setTitle(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Budget / Ask <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-3 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                            placeholder="e.g. ₹50,000 - ₹1 Lakh"
                            value={budgetRange}
                            onChange={e => setBudgetRange(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Description <span className="text-red-500">*</span></label>
                      <textarea
                        rows={4}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none resize-none"
                        placeholder="Tell sponsors about your event, audience demographics, and why they should partner with you..."
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Contact Person <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                          placeholder="e.g. Divyanshu Sharma"
                          value={contactName}
                          onChange={e => setContactName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Contact Email <span className="text-red-500">*</span></label>
                        <input
                          type="email"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                          placeholder="e.g. sponsor@yourorg.com"
                          value={contactEmail}
                          onChange={e => setContactEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Contact Phone <span className="text-red-500">*</span></label>
                        <input
                          type="tel"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                          placeholder="e.g. +91 9876543210"
                          value={contactPhone}
                          onChange={e => setContactPhone(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Website (optional)</label>
                        <input
                          type="text"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                          placeholder="e.g. www.yourorg.com"
                          value={contactWebsite}
                          onChange={e => setContactWebsite(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  {/* Section 2: Visuals */}
                  <div className="space-y-5">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <FiImage className="text-purple-500" /> Visuals & Assets
                    </h3>

                    <div className="flex gap-6 items-start">
                      {/* Logo Upload */}
                      <div className="shrink-0 text-center">
                        <div
                          onClick={() => logoInputRef.current?.click()}
                          className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-blue-400 flex items-center justify-center cursor-pointer overflow-hidden transition-all"
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
                            ${dragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-slate-100"}`}
                        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="p-3 bg-white rounded-full shadow-sm mb-2 text-blue-600">
                          <FiUploadCloud size={24} />
                        </div>
                        <p className="text-sm font-medium text-slate-700">Click to upload documents</p>
                        <p className="text-xs text-slate-400 mt-1">PDFs, Docs, Sheets, Images (Max 5)</p>
                        <input type="file" ref={fileInputRef} onChange={e => handleAttachments(e.target.files)} multiple className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*" />
                      </div>
                    </div>

                    {/* File List */}
                    {attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {attachments.map((file, i) => (
                          <div key={i} className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 shadow-sm">
                            <span className="truncate max-w-[150px]">{file.name}</span>
                            <button onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500"><FiX /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <hr className="border-slate-100" />

                  {/* Section 3: Classifications */}
                  <div className="space-y-6">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <FiZap className="text-amber-500" /> Classification
                    </h3>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">Event Type</label>
                      <div className="flex flex-wrap gap-2">
                        {EVENT_TYPES.map(type => (
                          <button
                            key={type} onClick={() => toggleItem(type, eventTypes, setEventTypes)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border 
                                ${eventTypes.includes(type) ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">Expected Returns</label>
                      <div className="flex flex-wrap gap-2">
                        {RETURN_OPTIONS.map(opt => (
                          <button
                            key={opt} onClick={() => toggleItem(opt, expectedReturns, setExpectedReturns)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border 
                                ${expectedReturns.includes(opt) ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20" : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"}`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions / Plan Selection */}
                  <div className="bg-slate-50 -mx-8 -mb-8 mt-8 p-8 border-t border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Select Plan & Post</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                      {/* Free */}
                      <button
                        onClick={() => handlePost({ tier: "basic", listingPlan: "free" })}
                        disabled={posting}
                        className="group relative flex flex-col items-center p-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-400 hover:shadow-md transition-all text-center"
                      >
                        <span className="text-slate-900 font-bold mb-1">Free Listing</span>
                        <span className="text-xs text-slate-500 mb-3">Standard visibility</span>
                        <div className="mt-auto w-full py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold group-hover:bg-slate-200 transition-colors">
                          Post Free
                        </div>
                      </button>

                      {/* Basic Paid */}
                      <button
                        onClick={() => handlePost({ tier: "basic", listingPlan: "basic_boost" })}
                        disabled={posting}
                        className="group relative flex flex-col items-center p-4 bg-white border border-blue-100 rounded-2xl hover:border-blue-300 hover:shadow-lg transition-all text-center ring-1 ring-blue-500/5"
                      >
                        <span className="text-blue-600 font-bold mb-1">Basic Boost</span>
                        <span className="text-xs text-slate-500 mb-3">₹1000 • Verified Badge</span>
                        <div className="mt-auto w-full py-2 rounded-xl bg-blue-50 text-blue-600 text-sm font-semibold group-hover:bg-blue-100 transition-colors">
                          Pay & Post
                        </div>
                      </button>

                      {/* Premium Paid */}
                      <button
                        onClick={() => handlePost({ tier: "premium", listingPlan: "premium" })}
                        disabled={posting}
                        className="group relative flex flex-col items-center p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl shadow-blue-500/30 text-center transform hover:scale-[1.02] transition-all"
                      >
                        <div className="absolute top-2 right-2 text-yellow-300"><FiStar fill="currentColor" size={12} /></div>
                        <span className="text-white font-bold mb-1">Premium</span>
                        <span className="text-xs text-blue-100 mb-3">₹2000 • Top Visibility</span>
                        <div className="mt-auto w-full py-2 rounded-xl bg-white/20 text-white text-sm font-semibold hover:bg-white/30 transition-colors">
                          Pay & Post
                        </div>
                      </button>

                    </div>
                    {posting && (
                      <div className="mt-4 text-center text-sm text-blue-600 font-medium animate-pulse">
                        Processing your listing...
                      </div>
                    )}
                  </div>

                </div>
              </motion.div>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
