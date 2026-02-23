import React, { useEffect, useState } from "react";
import { Loader2, BadgeCheck, Eye, EyeOff, Edit3, Save, Search, BookOpen, ActivitySquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../lib/fetch";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function QuestionsView() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState({});
  const [editAnswers, setEditAnswers] = useState({});
  const [saving, setSaving] = useState({});
  const [toggling, setToggling] = useState({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [auditLog, setAuditLog] = useState([]);
  const [showAudit, setShowAudit] = useState(false);
  const [auditFor, setAuditFor] = useState(null);

  const PAGE_SIZE = 12;
  const [page, setPage] = useState(1);

  const fetchQuestions = async () => {
    setLoading(true);
    const res = await apiFetch(`${API_BASE}/api/admin/questions`);
    const data = await res.json();
    setQuestions(Array.isArray(data.items) ? data.items : []);
    setLoading(false);
  };

  useEffect(() => { fetchQuestions(); }, []);

  const filteredQuestions = questions.filter((q) => {
    const s = search.trim().toLowerCase();
    if (statusFilter !== "all" && q.status !== statusFilter) return false;
    if (!s) return true;
    return (
      q.question?.toLowerCase().includes(s) ||
      q.answer?.toLowerCase().includes(s) ||
      q.user?.email?.toLowerCase().includes(s)
    );
  });

  const paged = filteredQuestions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleEdit = (id, answer) => {
    setEditing((e) => ({ ...e, [id]: true }));
    setEditAnswers((ea) => ({ ...ea, [id]: answer }));
  };

  const handleSave = async (id) => {
    setSaving((s) => ({ ...s, [id]: true }));
    const res = await apiFetch(`${API_BASE}/api/admin/questions/${id}/answer`, {
      method: "PATCH",
      body: JSON.stringify({ answer: editAnswers[id] }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert("Failed to save answer: " + (data.error || res.status));
    }
    setEditing((e) => ({ ...e, [id]: false }));
    setSaving((s) => ({ ...s, [id]: false }));
    fetchQuestions();
  };


  const handleToggleShow = async (id, show) => {
    setToggling((t) => ({ ...t, [id]: true }));
    await apiFetch(`${API_BASE}/api/admin/questions/${id}/show`, {
      method: "PATCH",
      body: JSON.stringify({ show: !show }), // <--- CRITICAL: send the new value!
    });
    setToggling((t) => ({ ...t, [id]: false }));
    fetchQuestions();
  };


  const openAuditLog = async (id) => {
    setAuditFor(id);
    setShowAudit(true);
    const res = await apiFetch(`${API_BASE}/api/admin/questions/audit/${id}`);
    const data = await res.json();
    setAuditLog(Array.isArray(data.auditLog) ? data.auditLog : []);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-fuchsia-300 via-purple-300 to-sky-300 bg-clip-text text-transparent">Help Center Q&A</h2>

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
          <Search className="h-4 w-4" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search question, answer, email…"
            className="bg-transparent outline-none text-sm w-40 md:w-64"
          />
        </div>
        <select
          className="bg-white/10 rounded-lg px-3 py-1.5 text-sm outline-none"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="all">All</option>
          <option value="open">Pending</option>
          <option value="answered">Answered</option>
        </select>
      </div>

      {loading ? (
        <Loader2 className="h-8 w-8 animate-spin text-fuchsia-400" />
      ) : (
        <div className="space-y-6">
          {paged.length === 0 && <div className="text-white/60">No questions found.</div>}
          {paged.map((q) => (
            <div key={q._id} className="bg-white/5 p-5 rounded-xl border border-white/10 shadow flex flex-col gap-2 transition-all duration-150">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-white/90">{q.question}</div>
                <span className={`rounded-full px-3 py-0.5 font-semibold text-xs ml-2 ${q.status === "answered"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-amber-500/20 text-amber-300"
                  }`}>
                  {q.status === "answered" ? "Answered" : "Pending"}
                </span>
              </div>
              <div className="text-xs text-white/40 mb-1">
                Asked by: {q.user?.email || "User"} | {new Date(q.createdAt).toLocaleString()}
              </div>
              <div className="flex items-center gap-3">
                {editing[q._id] ? (
                  <>
                    <input
                      type="text"
                      value={editAnswers[q._id]}
                      onChange={e => setEditAnswers((ea) => ({ ...ea, [q._id]: e.target.value }))}
                      className="w-full rounded-lg bg-black/30 px-3 py-2 text-white border border-white/10"
                    />
                    <button
                      onClick={() => handleSave(q._id)}
                      disabled={saving[q._id]}
                      className="bg-emerald-500/20 hover:bg-emerald-400/30 text-emerald-100 px-4 py-2 rounded-lg font-semibold transition"
                    >
                      {saving[q._id] ? "Saving..." : "Save"}
                    </button>

                  </>
                ) : (
                  <div className="text-white/80">{q.answer || <span className="italic text-white/50">No answer yet</span>}</div>
                )}
                {!editing[q._id] && (
                  <button
                    onClick={() => handleEdit(q._id, q.answer)}
                    className="ml-2 bg-white/10 hover:bg-fuchsia-500/10 text-fuchsia-300 px-3 py-1.5 rounded-md transition"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => handleToggleShow(q._id, q.showOnHelpPage)}
                  disabled={toggling[q._id]}
                  className={`ml-2 rounded-full px-3 py-1.5 font-semibold text-xs transition flex items-center gap-1
                    ${q.showOnHelpPage ? "bg-fuchsia-500/20 text-fuchsia-200" : "bg-white/10 text-white/50"}
                  `}
                >
                  {q.showOnHelpPage ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {q.showOnHelpPage ? "Visible" : "Hidden"}
                </button>
                {/* <button
                  onClick={() => openAuditLog(q._id)}
                  className="ml-2 px-3 py-1.5 rounded-md bg-white/10 hover:bg-purple-500/20 text-purple-300 flex items-center gap-1"
                >
                  <ActivitySquare className="h-4 w-4" />
                  Audit Log
                </button> */}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70"
        >
          Prev
        </button>
        <span className="text-white/60 text-sm">
          Page {page} of {Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE))}
        </span>
        <button
          disabled={page === Math.ceil(filteredQuestions.length / PAGE_SIZE)}
          onClick={() => setPage((p) => Math.min(Math.ceil(filteredQuestions.length / PAGE_SIZE), p + 1))}
          className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70"
        >
          Next
        </button>
      </div>

      {/* Audit Log Modal
      <AnimatePresence>
        {showAudit && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
            onClick={() => setShowAudit(false)}
          >
            <div className="bg-[#19142a] rounded-xl shadow-xl p-8 min-w-[320px] max-w-[92vw] text-white" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-lg">Audit Log</span>
                <button onClick={() => setShowAudit(false)} className="ml-2 text-white/60 hover:text-fuchsia-400">&times;</button>
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto text-xs">
                {auditLog.length === 0
                  ? <div className="text-white/40">No audit events.</div>
                  : auditLog.map((e, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="inline-block w-24 text-fuchsia-300">{e.action}</span>
                      <span className="text-white/70">{new Date(e.at).toLocaleString()}</span>
                      {e.prevAnswer !== undefined && (
                        <span className="ml-2">✎ <span className="text-white/80">from</span> <span className="text-amber-400">{e.prevAnswer || <i>empty</i>}</span> <span className="text-white/80">to</span> <span className="text-emerald-400">{e.newAnswer || <i>empty</i>}</span></span>
                      )}
                      {e.prevShow !== undefined && (
                        <span className="ml-2">👁️ {e.prevShow ? "Visible" : "Hidden"} → {e.newShow ? "Visible" : "Hidden"}</span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence> */}
    </div>
  );
}
