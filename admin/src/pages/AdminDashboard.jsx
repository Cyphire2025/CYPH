import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Home,
  Users,
  ClipboardList,
  MessageSquare,
  LogOut,
  Wallet,
  ReceiptText,
  FileText,
  ShieldAlert,
  Settings,
  Gavel,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import UserView from "./usersview"
import TasksView from "./tasksview";
import PaymentsView from "./paymentsview";
import QuestionsView from "./questionsview";
import TicketsView from "./ticketsview";
import { apiFetch } from "../lib/fetch";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const menuItems = [
  { id: "overview", label: "Overview", icon: <Home size={18} /> },
  { id: "users", label: "Users", icon: <Users size={18} /> },
  { id: "tasks", label: "Tasks", icon: <ClipboardList size={18} /> },
  { id: "workroom", label: "Workroom Viewer", icon: <MessageSquare size={18} /> },
  { id: "questions", label: "Questions", icon: <Gavel size={18} /> },
  { id: "tickets", label: "Tickets", icon: <MessageSquare size={18} /> },
  { id: "escrow", label: "Escrow Monitor", icon: <Wallet size={18} /> },
  { id: "payments", label: "Payment Logs", icon: <ReceiptText size={18} /> },
  { id: "reports", label: "Task Reports", icon: <FileText size={18} /> },
  { id: "flagged", label: "Flagged Users", icon: <ShieldAlert size={18} /> },
  { id: "settings", label: "Platform Settings", icon: <Settings size={18} /> },
];


export default function AdminDashboard() {
  const [active, setActive] = useState("overview");

  const handleLogout = async () => {
    try {
      await apiFetch(`${API_BASE}/api/admin/logout`, { method: "POST" });
    } catch (_) {
      // Ignore network errors and still redirect out of the dashboard.
    } finally {
      window.location.href = "/login";
    }
  };

  const renderSection = () => {
    switch (active) {
      case "overview":
        return <Overview />;
      case "users":
        return <UserView />;
      case "tasks":
        return <TasksView />;
      case "workroom":
        return <WorkroomViewer />;
      case "payments":
        return <PaymentsView />;
      case "questions":
        return <QuestionsView />;
      case "tickets":
        return <TicketsView />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-black via-[#0a0a0f] to-[#0b0b12] text-white">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="w-64 min-h-screen bg-white/5 backdrop-blur-md border-r border-white/10 p-6 space-y-6"
      >
        <h2 className="text-2xl font-bold mb-6">Admin Panel</h2>

        <nav className="space-y-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={`flex items-center gap-3 w-full text-left px-4 py-2 rounded-md transition ${active === item.id
                ? "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600 text-white"
                : "hover:bg-white/10 text-white/70"
                }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="mt-10 flex items-center gap-2 text-white/70 hover:text-red-400 transition"
        >
          <LogOut size={18} />
          Logout
        </button>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto">{renderSection()}</main>
    </div>
  );
}

// Placeholder Components
const Overview = () => {
  const [users, setUsers] = useState(null);
  const [tasks, setTasks] = useState(null);


  useEffect(() => {
        apiFetch(`${API_BASE}/api/admin/stats/users`)
      .then((res) => res.json())
      .then((data) => setUsers(data.total))
      .catch(() => setUsers("❌ Error"));

    apiFetch(`${API_BASE}/api/admin/stats/tasks`)
      .then((res) => res.json())
      .then((data) => setTasks(data.total))
      .catch(() => setTasks("❌ Error"));
  }, []);


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-3xl font-bold mb-6">Dashboard Overview</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white/5 p-5 rounded-xl border border-white/10 shadow hover:shadow-fuchsia-600/20 transition">
          <p className="text-xl font-semibold">📋 Total Tasks</p>
          <p className="text-3xl mt-2 font-mono">
            {tasks === null ? "Loading..." : tasks}
          </p>
        </div>
        <div className="bg-white/5 p-5 rounded-xl border border-white/10 shadow hover:shadow-sky-500/20 transition">
          <p className="text-xl font-semibold">👥 Total Users</p>
          <p className="text-3xl mt-2 font-mono">
            {users === null ? "Loading..." : users}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const WorkroomViewer = () => {
  const [roomId, setRoomId] = useState("");
  const [messages, setMessages] = useState([]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/workrooms/${roomId}/messages`);
      const data = await res.json();
      setMessages(data || []);
    } catch {
      alert("Error fetching messages");
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Workroom Chat Viewer</h2>
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Enter Workroom ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="px-4 py-2 rounded-md bg-white/10 border border-white/20 w-full"
        />
        <button
          onClick={fetchMessages}
          className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600 px-4 py-2 rounded-md font-semibold hover:scale-105 transition"
        >
          Load
        </button>
      </div>

      <div className="space-y-4">
        {messages.length > 0 ? (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className="bg-white/5 p-3 rounded-md border border-white/10"
            >
              <p className="text-sm text-white/70">
                <strong>User:</strong> {msg.userId || "Unknown"}
              </p>
              <p className="text-white">{msg.text}</p>
              <p className="text-xs text-white/40">
                {new Date(msg.createdAt).toLocaleString()}
              </p>
            </div>
          ))
        ) : (
          <p className="text-white/50">No messages loaded.</p>
        )}
      </div>
    </div>
  );
};


