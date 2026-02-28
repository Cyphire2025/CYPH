import React, { useEffect, useState } from "react";
import {
  Eye,
  Trash2,
  Flag,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
} from "lucide-react";
import { apiFetch } from "../lib/fetch";
import { safeSlug } from "../utils/safeUrl";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
const FRONTEND_BASE = import.meta.env.VITE_FRONTEND_BASE || "http://localhost:5173";

export default function TasksView() {
  const [tasks, setTasks] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  const TASKS_PER_PAGE = 20;

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await apiFetch(`${API_BASE}/api/admin/tasks`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch tasks");
        setTasks(data);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchTasks();
  }, []);

  const handleAction = async (id, action, body = null) => {
    try {
      let method = "PATCH";
      let url = `${API_BASE}/api/admin/tasks/${id}/${action}`;

      if (action === "delete") {
        method = "DELETE";
        url = `${API_BASE}/api/admin/tasks/${id}`;   // ✅ FIXED
      }
      if (action === "status") {
        url = `${API_BASE}/api/admin/tasks/${id}/status`;
      }

      const res = await apiFetch(url, {
        method,
        body: body ? JSON.stringify(body) : null,
      });


      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");

      if (action === "delete") {
        setTasks((prev) => prev.filter((t) => t._id !== id));
      } else if (data.task) {
        setTasks((prev) => prev.map((t) => (t._id === id ? { ...t, ...data.task } : t)));
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const openProfile = (slug) => {
    const safe = safeSlug(slug, "");
    if (!safe) return;
    window.open(`${FRONTEND_BASE}/u/${safe}`, "_blank", "noopener,noreferrer");
  };

  const filtered = tasks.filter(
    (t) =>
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.createdBy?.email?.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / TASKS_PER_PAGE);
  const visible = filtered.slice((page - 1) * TASKS_PER_PAGE, page * TASKS_PER_PAGE);

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">All Tasks</h2>

      <input
        type="text"
        placeholder="Search by title or client email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-6 px-4 py-2 rounded-md bg-white/10 border border-white/20 placeholder-white/40 text-white"
      />

      {error && <p className="text-red-400 mb-4">{error}</p>}

      <div className="space-y-4">
        {visible.map((task) => (
          <div
            key={task._id}
            className="bg-white/5 backdrop-blur-md p-5 rounded-xl border border-white/10 shadow-md hover:shadow-lg hover:shadow-fuchsia-600/20 transition-all duration-300"
          >
            {/* Header */}
            <div
              className="flex justify-between items-center cursor-pointer"
              onClick={() => setExpanded(expanded === task._id ? null : task._id)}
            >
              <div>
                <p className="text-lg font-semibold">{task.title}</p>
                <p className="text-sm text-white/50">
                  {task.createdBy?.name || "Unknown"} ({task.createdBy?.email})
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs px-3 py-1 rounded-full font-medium border shadow-sm ${task.flagged
                    ? "bg-gradient-to-r from-rose-500/30 to-red-600/30 border-red-400/30 text-red-300"
                    : task.status === "completed"
                      ? "bg-gradient-to-r from-emerald-500/30 to-teal-600/30 border-emerald-400/30 text-emerald-300"
                      : "bg-gradient-to-r from-violet-500/30 to-fuchsia-600/30 border-fuchsia-400/30 text-fuchsia-300"
                    }`}
                >
                  {task.flagged ? "Flagged" : task.status || "Pending"}
                </span>
                {expanded === task._id ? (
                  <ChevronUp size={18} className="text-white/50" />
                ) : (
                  <ChevronDown size={18} className="text-white/50" />
                )}
              </div>
            </div>

            {/* Expanded section */}
            {expanded === task._id && (
              <div className="mt-4 space-y-3 text-sm">
                <div className="grid md:grid-cols-2 gap-4">
                  <p><span className="font-semibold">Budget:</span> ₹{task.price || 0}</p>
                  <p><span className="font-semibold">Deadline:</span> {task.deadline ? new Date(task.deadline).toLocaleDateString() : "No deadline"}</p>
                  <p><span className="font-semibold">Category:</span> {task.category?.join(", ") || "N/A"}</p>
                  <p><span className="font-semibold">Freelancer:</span> {task.selectedApplicant?.name || "Not assigned"}</p>
                </div>

                <p className="text-white/70">{task.description}</p>

                {/* Applicants dropdown */}
                {task.applicants?.length > 0 && (
                  <details className="rounded-lg overflow-hidden border border-white/10 bg-white/5">
                    <summary className="px-4 py-2 cursor-pointer font-medium flex justify-between items-center hover:bg-white/10">
                      Applicants ({task.applicants.length})
                      <span className="text-xs text-white/40">click to expand</span>
                    </summary>
                    <ul className="px-4 pb-3 space-y-2">
                      {task.applicants.map((a, i) => (
                        <li key={i} className="flex justify-between items-center gap-3">
                          <div>
                            <p>{a.name || "Unnamed"}</p>
                            <p className="text-xs text-white/50">{a.email}</p>
                          </div>
                          <button
                            onClick={() => openProfile(a.slug)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-gradient-to-r from-sky-500/20 to-cyan-500/20 border border-sky-400/30 text-sky-200 hover:from-sky-500/30 hover:to-cyan-500/30"
                          >
                            <Eye size={14} /> View Profile
                          </button>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                {/* Admin controls */}
                <div className="flex flex-wrap gap-3 mt-4">
                  <button
                    onClick={() => handleAction(task._id, "status", { status: "completed" })}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-emerald-500 to-teal-600 border border-emerald-400/30 hover:shadow hover:shadow-emerald-500/30"
                  >
                    <CheckCircle2 size={16} /> Mark Completed
                  </button>
                  <button
                    onClick={() => handleAction(task._id, "flag")}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-amber-500 to-orange-600 border border-amber-400/30 hover:shadow hover:shadow-amber-500/30"
                  >
                    <Flag size={16} /> Flag
                  </button>
                  <button
                    onClick={() => handleAction(task._id, "delete")}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-rose-600 to-red-700 border border-rose-400/30 hover:shadow hover:shadow-rose-500/30"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8 gap-2">
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded ${page === i + 1
                ? "bg-fuchsia-600 text-white"
                : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}








