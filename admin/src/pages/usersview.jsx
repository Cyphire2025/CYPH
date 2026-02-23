import React, { useEffect, useState } from "react";
import { Eye, Trash2 } from "lucide-react";
import { apiFetch } from "../lib/fetch";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
const API_FRONTEND_BASE = import.meta.env.VITE_FRONTEND_BASE || "http://localhost:5173";

export default function UsersView() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filtered, setFiltered] = useState([]);
  const [error, setError] = useState("");

  const USERS_PER_PAGE = 100;

  // Countdown re-render trigger
  const [tick, setTick] = useState(0);

  // 🔧 Helper to format countdown
  const getRemaining = (expiresAt) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return "Expired";
    const seconds = Math.floor(diff / 1000) % 60;
    const minutes = Math.floor(diff / (1000 * 60)) % 60;
    const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  // Reusable fetch function
  const fetchUsers = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/api/admin/users`);
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) {
        console.error("Users fetch error:", data.error || res.statusText);
        setError(data.error || "Session expired, log in again");
        setUsers([]);
        setFiltered([]);
        return;
      }
      setUsers(data);
      setFiltered(data);
    } catch (err) {
      console.error("Users fetch exception:", err);
      setError("Failed to load users");
      setUsers([]);
      setFiltered([]);
    }
  };

  // 🔄 Fetch on mount + auto-refresh every 5s
  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 5000);
    return () => clearInterval(interval);
  }, []);

  // ⏱ Tick every 1s for countdown timers
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Search effect
  useEffect(() => {
    const query = search.toLowerCase();
    setFiltered(
      Array.isArray(users)
        ? users.filter(
          (u) =>
            u.email?.toLowerCase().includes(query) ||
            u.name?.toLowerCase().includes(query)
        )
        : []
    );
    setPage(1);
  }, [search, users]);

  const totalPages = Math.ceil((filtered?.length || 0) / USERS_PER_PAGE);
  const visibleUsers = Array.isArray(filtered)
    ? filtered.slice((page - 1) * USERS_PER_PAGE, page * USERS_PER_PAGE)
    : [];

  // Delete user
  const handleDelete = async (id) => {
    if (!confirm("Are you sure?")) return;
    const res = await apiFetch(`${API_BASE}/api/admin/users/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u._id !== id));
      setFiltered((prev) => prev.filter((u) => u._id !== id));
      alert("Deleted");
    } else {
      alert("Failed");
    }
  };

  // Set plan
  const handleSetPlan = async (id, plan) => {
    const res = await apiFetch(`${API_BASE}/api/admin/users/${id}/plan`, {
      method: "PATCH",
      body: JSON.stringify({ plan }),
    });

    const data = await res.json();
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) =>
          u._id === id
            ? { ...u, plan: data.plan, planExpiresAt: data.planExpiresAt }
            : u
        )
      );
      setFiltered((prev) =>
        prev.map((u) =>
          u._id === id
            ? { ...u, plan: data.plan, planExpiresAt: data.planExpiresAt }
            : u
        )
      );
    }
    else {
      alert(data.error || "Failed to update plan");
    }
  };

  // View profile
  const handleViewProfile = (slug) => {
   if (!slug) return;
  window.open(`${API_FRONTEND_BASE}/u/${slug}`, "_blank");
};

  return (
    <div>
      <h2 className="text-3xl font-bold mb-4">All Users</h2>

      {/* 🔍 Search */}
      <input
        type="text"
        placeholder="Search by name or email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-6 px-4 py-2 rounded-md bg-white/10 border border-white/20 placeholder-white/40 text-white"
      />

      {/* ⚠️ Error */}

      {error && (
        <p className="text-red-400 text-sm mb-4">
          {error}
        </p>
      )}

      {/* 👥 User List */}
      <div className="space-y-4">
        {visibleUsers.map((user, index) => {
          const remaining = getRemaining(user.planExpiresAt);

          // 🔄 If expired, trigger a refresh
          if (remaining === "Expired" && user.plan !== "free") {
            fetchUsers();
          }

          return (
            <div
              key={index}
              className="bg-white/5 p-4 rounded-lg border border-white/10 flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">{user.name || "Unnamed"}</p>
                <p className="text-white/60 text-sm">{user.email}</p>
                <p className="text-xs text-white/40 mt-1">
                  ID: {user._id?.slice(-6)} | Plan: {user.plan || "free"}
                  {user.plan !== "free" && user.planExpiresAt && (
                    <span className="ml-2 text-fuchsia-300">
                      (expires in {remaining})
                    </span>
                  )}
                </p>
              </div>

              <div className="flex gap-2">
                {/* View Profile */}
                <button
                  onClick={() => handleViewProfile(user.slug)}
                  className="hover:text-sky-400"
                  title="View Profile"
                >
                  <Eye size={18} />
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(user._id)}
                  className="hover:text-red-500"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>

                {/* Dropdown for plan selection */}
                <div className="relative inline-block w-36">
                  <select
                    value={user.plan || "free"}
                    onChange={(e) => handleSetPlan(user._id, e.target.value)}
                    className="
                      w-full appearance-none rounded-xl px-4 py-2 text-sm font-semibold
                      text-white bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600
                      border border-white/10 shadow-[0_0_20px_rgba(139,92,246,0.35)]
                      backdrop-blur-xl
                      hover:from-violet-500 hover:via-fuchsia-500 hover:to-sky-500
                      focus:outline-none focus:ring-2 focus:ring-fuchsia-400/70
                      transition-all duration-200
                    "
                  >
                    <option value="free" className="bg-[#0a0a0f] text-white">
                      🆓 Free
                    </option>
                    <option value="plus" className="bg-[#0a0a0f] text-fuchsia-200">
                      ✨ Plus
                    </option>
                    <option value="ultra" className="bg-[#0a0a0f] text-sky-200">
                      🚀 Ultra
                    </option>
                  </select>

                  {/* Chevron */}
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/80 text-xs">
                    ▼
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 📄 Pagination */}
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
    </div>
  );
}
