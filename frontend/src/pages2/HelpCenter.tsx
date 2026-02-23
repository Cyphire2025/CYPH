import React, { useEffect, useRef, useState, Suspense, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, Send, X, CheckCircle2, Loader2, MessageSquare, Star, User, ShieldCheck, BadgeCheck
} from "lucide-react";
import { GradientText, GlassCard, NeonButton } from "../pages/home"; // Reuse home.tsx UI atoms

import Navbarspon from "../components/navbarsponhome.jsx";
import Navbarhome from "../components/navbarhome.jsx";
import Footer from "../components/footer";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:5000";

interface FAQ { question: string; answer: string }
const FAQS: FAQ[] = [
  { question: "How can I contact support?", answer: "Submit a ticket below or ask a question. Our team responds within 24 hours." },
  { question: "How do I track my ticket?", answer: "You'll see all tickets you've submitted with status and the full chat thread." },
  { question: "Who can see my tickets?", answer: "Only you and Cyphire support staff. Your privacy is always protected." },
  { question: "Can I attach files/screenshots?", answer: "Yes, you can attach up to 5 files per message in tickets." },
];

type TicketStatus = "open" | "in-progress" | "resolved" | "closed";
type TicketType = "payment" | "task" | "workroom" | "account" | "report" | "other";

interface Ticket {
  _id: string;
  subject: string;
  type: TicketType;
  status: TicketStatus;
  comments: TicketComment[];
  createdAt: string;
  closedAt?: string;
}
interface TicketComment {
  author: { _id: string; role: "user" | "admin"; name: string; avatar?: string };
  text: string;
  files: { url: string; original_name: string }[];
  createdAt: string;
}

interface QA {
  _id: string;
  question: string;
  answer: string;
}

function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const useFetch = <T,>(url: string, deps: any[] = [], options: RequestInit = {}) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(url, { credentials: "include", ...options })
      .then((r) => r.json())
      .then((d) => { if (mounted) setData(d.items || d.tickets || d); })
      .catch((e) => { if (mounted) setError(e.message || "Failed"); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, deps); // eslint-disable-line
  return { data, loading, error };
};

export default function HelpCenter() {
  // --- FAQ ---
  const [openFaq, setOpenFaq] = useState(0);

  // --- Navbar ---
  const Nav = useMemo(() => {
    const last = sessionStorage.getItem("lastHomeRoute");
    return last === "/sponsorshiphome" ? Navbarspon : Navbarhome;
  }, []);

  // --- Q&A ("Ask a question") ---
  const [question, setQuestion] = useState("");
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState("");
  const [qaSuccess, setQaSuccess] = useState("");
  const [recentQas, setRecentQas] = useState<QA[]>([]);
  const loadRecentQas = () => {
    fetch(`${API_BASE}/api/help/questions`)
      .then(r => r.json())
      .then(d => setRecentQas(Array.isArray(d.items) ? d.items : []));
  };
  useEffect(loadRecentQas, []);

  const askQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setQaLoading(true);
    setQaError("");
    if (question.trim().length < 8) {
      setQaError("Question must be at least 8 characters.");
      return;
    } setQaSuccess("");
    const res = await fetch(`${API_BASE}/api/help/questions`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    if (res.ok) {
      setQaSuccess("Question submitted! Our team will answer soon.");
      setQuestion("");
      loadRecentQas();
    } else {
      setQaError("Failed to submit. Please try again.");
    }
    setQaLoading(false);
  };

  // --- TICKETS: List ---
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

  const loadTickets = () => {
    setTicketLoading(true);
    fetch(`${API_BASE}/api/help/tickets/mine`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setMyTickets(Array.isArray(d.tickets) ? d.tickets : []))
      .finally(() => setTicketLoading(false));
  };
  useEffect(loadTickets, []);

  // --- NEW TICKET MODAL ---
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newTicket, setNewTicket] = useState({ type: "other", subject: "", description: "" });
  const [ticketFiles, setTicketFiles] = useState<File[]>([]);
  const [newTicketLoading, setNewTicketLoading] = useState(false);
  const [newTicketError, setNewTicketError] = useState("");

  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewTicketLoading(true); setNewTicketError("");
    const formData = new FormData();
    formData.append("type", newTicket.type);
    formData.append("subject", newTicket.subject);
    formData.append("description", newTicket.description);
    ticketFiles.forEach((f) => formData.append("attachments", f));
    const res = await fetch(`${API_BASE}/api/help/tickets`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (res.ok) {
      setShowNewTicket(false); setNewTicket({ type: "other", subject: "", description: "" }); setTicketFiles([]);
      loadTickets();
    } else {
      setNewTicketError("Failed to submit ticket. Try again.");
    }
    setNewTicketLoading(false);
  };

  // --- TICKET CHAT (Thread) ---
  const [chatText, setChatText] = useState("");
  const [chatFiles, setChatFiles] = useState<File[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const submitComment = async (ticketId: string) => {
    setChatLoading(true);
    const formData = new FormData();
    formData.append("text", chatText);
    chatFiles.forEach((f) => formData.append("files", f));
    const res = await fetch(`${API_BASE}/api/help/tickets/${ticketId}/comments`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (res.ok) {
      setChatText(""); setChatFiles([]);
      const updated = await fetch(`${API_BASE}/api/help/tickets/${ticketId}`, { credentials: "include" }).then(r => r.json());
      setActiveTicket(updated.ticket);
      loadTickets();
    }
    setChatLoading(false);
  };

  const handleTicketClose = async (ticketId: string) => {
    await fetch(`${API_BASE}/api/help/tickets/${ticketId}/close`, {
      method: "PATCH",
      credentials: "include",
    });
    const updated = await fetch(`${API_BASE}/api/help/tickets/${ticketId}`, { credentials: "include" }).then(r => r.json());
    setActiveTicket(updated.ticket);
    loadTickets();
  };

  const handleTicketReopen = async (ticketId: string) => {
    await fetch(`${API_BASE}/api/help/tickets/${ticketId}/reopen`, {
      method: "PATCH",
      credentials: "include",
    });
    const updated = await fetch(`${API_BASE}/api/help/tickets/${ticketId}`, { credentials: "include" }).then(r => r.json());
    setActiveTicket(updated.ticket);
    loadTickets();
  };

  // --- MAIN UI ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 relative overflow-x-hidden font-sans">
      {/* Aurora & particles */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute -inset-x-40 -top-40 h-[50rem] bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.05),transparent_60%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[40rem] bg-[radial-gradient(ellipse_at_bottom,rgba(14,165,233,0.05),transparent_60%)]" />
      </div>
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white to-transparent -z-10" />

      <Suspense fallback={<div className="h-16" />}>
        <Nav />
      </Suspense>

      <div className="mx-auto max-w-5xl px-4 pt-32 pb-16">
        <motion.h1 layoutId="help-title" className="text-3xl md:text-5xl font-bold text-center mb-4 text-slate-900">
          <GradientText>Help Center</GradientText>
        </motion.h1>
        <p className="text-slate-600 text-center max-w-2xl mx-auto mb-10">Your questions, feedback, and support issues all in one place—fully private, with professional support chat for every ticket.</p>

        {/* FAQ Section */}
        <section className="mb-16">
          <SectionHeader id="faq-section" eyebrow="FAQs" title="Frequently Asked" subtitle="Find answers to the most common Cyphire support questions." />
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <GlassCard key={faq.question} className="overflow-hidden border-slate-200 bg-white shadow-sm hover:border-blue-200 transition-colors">
                <button className="flex w-full items-center justify-between px-6 py-4 text-left text-slate-900 hover:bg-slate-50 transition-colors" onClick={() => setOpenFaq(openFaq === i ? -1 : i)} aria-expanded={openFaq === i}>
                  <span className="font-semibold">{faq.question}</span>
                  <ChevronDown className={classNames("h-5 w-5 transition-transform text-blue-500", openFaq === i && "rotate-180")} />
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }}>
                      <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed">{faq.answer}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* Ask a Question */}
        <section className="mb-14">
          <SectionHeader id="ask-question" eyebrow="Ask a Question" title="Not finding your answer?" subtitle="Submit a quick question—our team will reply in the feed below." />
          <form className="flex flex-col gap-4 max-w-xl mx-auto" onSubmit={askQuestion}>
            <textarea className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-blue-400 focus:ring-blue-400/20 transition-colors min-h-[60px] resize-none shadow-sm" value={question} onChange={e => setQuestion(e.target.value)} maxLength={300} required placeholder="Type your question here..." />
            <div className="flex items-center gap-3 justify-between">
              <NeonButton type="submit" loading={qaLoading} className="text-sm px-6 py-2 rounded-xl">Send <Send className="h-4 w-4" /></NeonButton>
              {qaSuccess && <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> {qaSuccess}</span>}
              {qaError && <span className="text-red-400">{qaError}</span>}
            </div>
          </form>
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-4 text-slate-900 flex items-center gap-2"><MessageSquare className="h-5 w-5 text-blue-500" /> Recently Answered Questions</h3>
            <div className="space-y-3">
              {recentQas.length === 0 && <div className="text-slate-500">No questions answered yet.</div>}
              {recentQas.map(qa => (
                <GlassCard key={qa._id} className="p-4 border-slate-200 bg-white shadow-sm">
                  <div className="font-semibold text-slate-900 mb-1">{qa.question}</div>
                  <div className="text-slate-600 text-sm">{qa.answer}</div>
                </GlassCard>
              ))}
            </div>
          </div>
        </section>

        {/* Tickets */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <SectionHeader id="tickets" eyebrow="Your Tickets" title="Track & Chat on Support Issues" />
            <NeonButton onClick={() => setShowNewTicket(true)} className="whitespace-nowrap">+ New Ticket</NeonButton>
          </div>
          {ticketLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
          ) : (
            <div className="grid gap-3">
              {myTickets.length === 0 && <GlassCard className="p-6 text-center text-slate-500 border-slate-200 bg-white border-dashed">No tickets yet. Submit a new support issue above.</GlassCard>}
              {myTickets.map(tk => (
                <GlassCard key={tk._id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div>
                    <div className="font-bold text-slate-900">{tk.subject}</div>
                    <div className="flex items-center gap-2 text-xs mt-1">
                      <span className={classNames(
                        "rounded-full px-2 py-0.5 font-semibold border",
                        tk.status === "open" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                        tk.status === "closed" && "bg-red-50 text-red-700 border-red-200",
                        tk.status === "in-progress" && "bg-amber-50 text-amber-700 border-amber-200",
                        tk.status === "resolved" && "bg-sky-50 text-sky-700 border-sky-200"
                      )}>{tk.status}</span>
                      <span className="text-slate-500">{new Date(tk.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <button onClick={() => { setActiveTicket(tk); setShowTicketModal(true); }} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:text-blue-600 hover:border-blue-200 transition font-medium">View Thread</button>
                </GlassCard>
              ))}
            </div>
          )}
        </section>
      </div>

      <Footer />

      {/* --- New Ticket Modal --- */}
      <AnimatePresence>
        {showNewTicket && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <GlassCard className="relative w-full max-w-lg p-8 mx-2 flex flex-col gap-6 bg-white border-slate-200 shadow-2xl">
              <button className="absolute right-3 top-3 text-slate-400 hover:text-slate-600" onClick={() => setShowNewTicket(false)}><X className="h-5 w-5" /></button>
              <h2 className="text-2xl font-bold mb-2 text-slate-900">New Support Ticket</h2>
              <form className="flex flex-col gap-4" onSubmit={submitTicket}>
                <div className="flex gap-3">
                  <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 flex-1 focus:border-blue-300 focus:ring-blue-300/20" required value={newTicket.type} onChange={e => setNewTicket(t => ({ ...t, type: e.target.value }))}>
                    <option value="other">Type</option>
                    <option value="payment">Payment</option>
                    <option value="task">Task</option>
                    <option value="workroom">Workroom</option>
                    <option value="account">Account</option>
                    <option value="report">Report</option>
                  </select>
                  <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 flex-1 focus:border-blue-300 focus:ring-blue-300/20" type="text" placeholder="Subject" required value={newTicket.subject} onChange={e => setNewTicket(t => ({ ...t, subject: e.target.value }))} maxLength={100} />
                </div>
                <textarea className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 min-h-[72px] focus:border-blue-300 focus:ring-blue-300/20" required maxLength={500} placeholder="Describe your issue..." value={newTicket.description} onChange={e => setNewTicket(t => ({ ...t, description: e.target.value }))} />
                <div>
                  <input type="file" multiple accept="image/*,application/pdf" onChange={e => setTicketFiles(Array.from(e.target.files || []))} />
                  <div className="text-xs text-white/50 mt-1">{ticketFiles.length > 0 && ticketFiles.map(f => f.name).join(", ")}</div>
                </div>
                {newTicketError && <div className="text-red-400 text-xs">{newTicketError}</div>}
                <div className="flex justify-end gap-2">
                  <button type="button" className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-slate-600 hover:bg-slate-50 transition" onClick={() => setShowNewTicket(false)}>Cancel</button>
                  <NeonButton type="submit" loading={newTicketLoading} className="px-8 py-2 text-sm">Submit</NeonButton>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Ticket Chat Modal --- */}
      <AnimatePresence>
        {showTicketModal && activeTicket && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <GlassCard className="relative w-full max-w-2xl p-8 mx-2 flex flex-col gap-6 min-h-[440px] bg-white border-slate-200 shadow-2xl">
              <button className="absolute right-3 top-3 text-slate-400 hover:text-slate-600" onClick={() => setShowTicketModal(false)}><X className="h-5 w-5" /></button>
              <h2 className="text-2xl font-bold mb-2 text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-blue-500" /> Ticket Thread
                <span className={classNames(
                  "ml-2 rounded-full px-2 py-0.5 text-xs font-semibold border",
                  activeTicket.status === "open" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                  activeTicket.status === "closed" && "bg-red-50 text-red-700 border-red-200",
                  activeTicket.status === "in-progress" && "bg-amber-50 text-amber-700 border-amber-200",
                  activeTicket.status === "resolved" && "bg-sky-50 text-sky-700 border-sky-200"
                )}>{activeTicket.status}</span>
              </h2>
              <div className="flex-1 min-h-[200px] max-h-[340px] overflow-y-auto space-y-3 py-2">
                {activeTicket.comments.map((msg, idx) => (
                  <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                    <div className={classNames(
                      "flex gap-3 items-start",
                      msg.author.role === "admin" ? "flex-row-reverse text-right" : ""
                    )}>
                      <img src={msg.author.avatar || (msg.author.role === "admin" ? "/admin-avatar.png" : "/user-avatar.png")} alt={msg.author.name} className="h-10 w-10 rounded-full border border-slate-200 object-cover bg-white" />
                      <div className={classNames(
                        "rounded-xl px-5 py-3 max-w-[75%] flex-1 text-sm shadow-sm",
                        msg.author.role === "admin" ? "bg-blue-50 border border-blue-100 text-slate-800" : "bg-white border border-slate-200 text-slate-800"
                      )}>
                        <div className="font-bold flex items-center gap-1.5 mb-1 text-slate-900">
                          {msg.author.name}
                          {msg.author.role === "admin" ? <BadgeCheck className="h-4 w-4 text-blue-500" /> : <User className="h-4 w-4 text-slate-400" />}
                        </div>
                        <div className="mb-1 whitespace-pre-line leading-relaxed">{msg.text}</div>
                        {msg.files && msg.files.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {msg.files.map((f, fi) => (
                              <a key={fi} href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 bg-slate-50 text-xs text-blue-600 hover:bg-blue-50 transition">
                                <Star className="h-4 w-4" /> {f.original_name}
                              </a>
                            ))}
                          </div>
                        )}
                        <div className="mt-1 text-xs text-slate-400">{new Date(msg.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              {activeTicket.status !== "closed" ? (
                <form className="flex flex-col gap-2" onSubmit={e => { e.preventDefault(); submitComment(activeTicket._id); }}>
                  <textarea className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 min-h-[50px] focus:border-blue-300 focus:ring-blue-300/20" maxLength={300} placeholder="Type your reply..." value={chatText} onChange={e => setChatText(e.target.value)} required />
                  <div className="flex gap-2 items-center">
                    <input type="file" multiple accept="image/*,application/pdf" onChange={e => setChatFiles(Array.from(e.target.files || []))} />
                    {chatFiles.length > 0 && <span className="text-xs text-slate-500">{chatFiles.map(f => f.name).join(", ")}</span>}
                    <NeonButton type="submit" loading={chatLoading} className="ml-auto text-sm">Send <Send className="h-4 w-4" /></NeonButton>
                  </div>
                </form>
              ) : (
                <div className="text-xs text-white/60 text-center py-3">Ticket is closed. You can reopen to reply.</div>
              )}
              <div className="flex justify-end gap-2">
                {activeTicket.status !== "closed" ? (
                  <NeonButton onClick={() => handleTicketClose(activeTicket._id)} className="bg-red-700/70">Close Ticket</NeonButton>
                ) : (
                  <NeonButton onClick={() => handleTicketReopen(activeTicket._id)} className="bg-emerald-700/70">Reopen Ticket</NeonButton>
                )}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
}

// UI Helper
function SectionHeader({ id, eyebrow, title, subtitle }: { id: string; eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <header id={id} className="mx-auto mb-6 text-center">
      {eyebrow && <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs text-blue-700 font-medium">{eyebrow}</div>}
      <h2 className="text-2xl md:text-3xl font-bold text-slate-900"><GradientText>{title}</GradientText></h2>
      {subtitle && <p className="mt-2 text-slate-600">{subtitle}</p>}
    </header>
  );
}
