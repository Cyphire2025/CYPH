import React, { useEffect, useState } from "react";
import { CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { apiFetch } from "../lib/fetch";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function PaymentsView() {
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [showQr, setShowQr] = useState(null); // which log’s QR is open

  const LOGS_PER_PAGE = 20;

  // Fetch payment logs
  const fetchPayments = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/api/admin/payments`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch payments");
      setPayments(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleMarkPaid = async (id, paid) => {
    try {
      const res = await apiFetch(`${API_BASE}/api/admin/payments/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ paid }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");

      setPayments((prev) =>
        prev.map((p) => (p._id === id ? { ...p, paid: data.paid } : p))
      );
    } catch (err) {
      alert(err.message);
    }
  };

  const filtered = payments.filter(
    (p) =>
      p.freelancer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.freelancer?.email?.toLowerCase().includes(search.toLowerCase()) ||
      p.upiId?.toLowerCase().includes(search.toLowerCase()) ||
      p.workroomId?.toLowerCase().includes(search.toLowerCase()) // ✅ added
  );


  const totalPages = Math.ceil(filtered.length / LOGS_PER_PAGE);
  const visible = filtered.slice(
    (page - 1) * LOGS_PER_PAGE,
    page * LOGS_PER_PAGE
  );

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Payment Logs</h2>
      <input
        type="text"
        placeholder="Search by name, email, UPI or Workroom ID"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-6 px-4 py-2 rounded-md bg-white/10 border border-white/20 placeholder-white/40 text-white"
      />

      {error && <p className="text-red-400 mb-4">{error}</p>}

      <div className="space-y-4">
        {visible.map((pay) => {
          const upiLink = `upi://pay?pa=${encodeURIComponent(
            pay.upiId
          )}&pn=${encodeURIComponent(
            pay.freelancer?.name || "Freelancer"
          )}&am=${pay.netAmount}&cu=INR&tn=${encodeURIComponent(
            "Payout for task"
          )}`;

          return (
            <div
              key={pay._id}
              className="bg-white/5 backdrop-blur-md p-5 rounded-xl border border-white/10 shadow-md hover:shadow-lg hover:shadow-fuchsia-600/20 transition-all duration-300"
            >
              {/* Header */}
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-lg font-semibold">
                    {pay.freelancer?.name || "Unnamed"}
                  </p>
                  <p className="text-sm text-white/60">
                    {pay.freelancer?.email} | {pay.upiId}
                  </p>
                </div>
                <div>
                  {pay.paid ? (
                    <span className="flex items-center gap-1 text-emerald-400 text-sm">
                      <CheckCircle2 size={16} /> Paid
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-400 text-sm">
                      <XCircle size={16} /> Pending
                    </span>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="mt-3 grid md:grid-cols-2 gap-4 text-sm text-white/80">
                <p>
                  <span className="font-semibold">Gross Amount:</span> ₹
                  {pay.grossAmount || 0}
                </p>
                <p>
                  <span className="font-semibold">Platform Fee (20%):</span> ₹
                  {pay.fee || 0}
                </p>
                <p>
                  <span className="font-semibold">Net Amount to Pay:</span> ₹
                  {pay.netAmount || 0}
                </p>
                <p>
                  <span className="font-semibold">Task:</span>{" "}
                  {pay.task?.title || "N/A"}
                </p>
                <p>
                  <span className="font-semibold">Workroom:</span>{" "}
                  {pay.workroomId}
                </p>
                <p>
                  <span className="font-semibold">Created:</span>{" "}
                  {new Date(pay.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowQr(showQr === pay._id ? null : pay._id)}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-sky-500 to-cyan-600 hover:shadow hover:shadow-sky-500/30"
                >
                  <ExternalLink size={16} /> {showQr === pay._id ? "Hide QR" : "Pay Now"}
                </button>

                {!pay.paid ? (
                  <button
                    onClick={() => handleMarkPaid(pay._id, true)}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-emerald-500 to-teal-600 border border-emerald-400/30 hover:shadow hover:shadow-emerald-500/30"
                  >
                    <CheckCircle2 size={16} /> Mark Paid
                  </button>
                ) : (
                  <button
                    onClick={() => handleMarkPaid(pay._id, false)}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-rose-500 to-red-600 border border-rose-400/30 hover:shadow hover:shadow-rose-500/30"
                  >
                    <XCircle size={16} /> Mark Unpaid
                  </button>
                )}
              </div>

              {/* QR Modal */}
              {showQr === pay._id && (
                <div className="mt-4 flex flex-col items-center">
                  <QRCodeCanvas value={upiLink} size={180} />
                  <p className="mt-2 text-xs text-white/60">
                    Scan to pay ₹{pay.netAmount} to {pay.upiId}
                  </p>
                  <a
                    href={upiLink}
                    className="mt-2 text-blue-400 underline text-xs break-all"
                  >
                    {upiLink}
                  </a>
                </div>
              )}
            </div>
          );
        })}
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
