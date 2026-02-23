import React, { useEffect, useState } from "react";
import { Loader2, BadgeCheck, User, X, Send } from "lucide-react";
import { apiFetch } from "../lib/fetch";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function TicketsView() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);
  const [reply, setReply] = useState("");
  const [replyFiles, setReplyFiles] = useState([]);
  const [replying, setReplying] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    const res = await apiFetch(`${API_BASE}/api/admin/tickets`);
    const data = await res.json();
    setTickets(Array.isArray(data.tickets) ? data.tickets : []);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, []);

  const openTicket = async (id) => {
    const res = await apiFetch(`${API_BASE}/api/admin/tickets/${id}`);
    const data = await res.json();
    setActiveTicket(data.ticket);
  };

  const sendReply = async (ticketId) => {
    setReplying(true);
    const formData = new FormData();
    formData.append("text", reply);
    replyFiles.forEach(f => formData.append("files", f));
    await apiFetch(`${API_BASE}/api/admin/tickets/${ticketId}/reply`, {
      method: "POST",
      body: formData,
    });
    openTicket(ticketId); // Refresh chat
    setReply(""); setReplyFiles([]);
    setReplying(false);
  };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">All Support Tickets</h2>
      {loading ? (
        <Loader2 className="h-8 w-8 animate-spin text-fuchsia-400" />
      ) : activeTicket ? (
        <div className="bg-white/5 p-6 rounded-xl border border-white/10 shadow flex flex-col gap-4">
          <button className="self-end mb-3 text-white/60 hover:text-fuchsia-300" onClick={() => setActiveTicket(null)}>
            <X size={20} />
          </button>
          <div className="font-bold text-2xl mb-2">{activeTicket.subject}</div>
          <div className="text-sm text-white/60 mb-4">Type: {activeTicket.type} | Status: {activeTicket.status} | User: {activeTicket.user?.email || activeTicket.user}</div>
          <div className="max-h-72 overflow-y-auto flex flex-col gap-3 mb-4">
            {activeTicket.comments.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.author.role === "admin" ? "flex-row-reverse text-right" : ""} gap-4`}>
                <img src={msg.author.avatar || "/admin-avatar.png"} alt="avatar" className="h-9 w-9 rounded-full border border-white/10" />
                <div className="bg-white/10 rounded-lg px-4 py-2 text-white flex-1">
                  <div className="font-semibold flex items-center gap-1 mb-1">
                    {msg.author.name}
                    {msg.author.role === "admin" ? <BadgeCheck className="h-4 w-4 text-fuchsia-400" title="Support" /> : <User className="h-4 w-4 text-white/70" />}
                  </div>
                  <div>{msg.text}</div>
                  {msg.files && msg.files.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {msg.files.map((f, fi) => (
                        <a key={fi} href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded border border-white/20 bg-black/20 text-xs text-fuchsia-200 hover:bg-fuchsia-900/20">
                          {f.original_name}
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="mt-1 text-xs text-white/40">{new Date(msg.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
          <form className="flex gap-3" onSubmit={e => { e.preventDefault(); sendReply(activeTicket._id); }}>
            <input className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white" placeholder="Type reply..." value={reply} onChange={e => setReply(e.target.value)} required />
            <input type="file" multiple onChange={e => setReplyFiles(Array.from(e.target.files || []))} />
            <button type="submit" disabled={replying || !reply.trim()} className="px-5 py-2 rounded-lg bg-gradient-to-r from-fuchsia-600 to-sky-600 text-white font-semibold">
              {replying ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Send className="h-4 w-4" /> Send</>}
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.length === 0 && <p className="text-white/60">No tickets yet.</p>}
          {tickets.map((tk) => (
            <div key={tk._id} className="bg-white/5 p-4 rounded-xl border border-white/10 shadow flex justify-between items-center">
              <div>
                <div className="font-medium text-white mb-1">{tk.subject}</div>
                <div className="text-xs text-white/50">{tk.type} | {tk.status} | {new Date(tk.createdAt).toLocaleString()}</div>
              </div>
              <button className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition" onClick={() => openTicket(tk._id)}>
                View Thread
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
