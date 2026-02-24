import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { apiFetch, API_BASE } from "../lib/fetch";
import Aurora from "../components/workroom/Aurora";

const parseJsonSafe = async (res) => {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await res.json();
  const txt = await res.text();
  throw new Error(`Unexpected ${res.status} ${res.statusText}: ${txt.slice(0, 200)}`);
};

export default function WorkroomPayment() {
  const { workroomId } = useParams();
  const navigate = useNavigate();

  const [meta, setMeta] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [upiId, setUpiId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await apiFetch(`${API_BASE}/api/workrooms/${workroomId}/meta`, { credentials: "include" });
        const data = await parseJsonSafe(res);
        if (!res.ok) throw new Error(data?.error || "Unable to load workroom");
        if (!mounted) return;
        setMeta(data);
        setUpiId(data?.upiId || "");
      } catch (err) {
        if (mounted) setError(err?.message || "Unable to load workroom details");
      } finally {
        if (mounted) setLoadingMeta(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [workroomId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const trimmed = upiId.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Enter a valid UPI ID.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await apiFetch(`${API_BASE}/api/workrooms/${workroomId}/payment-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upiId: trimmed }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok || !data?.success) throw new Error(data?.error || data?.message || "Failed to request payout");

      setDone(true);
      setTimeout(() => {
        if (window.location.hostname === "localhost") {
          window.location.href = "http://localhost:5173/dashboard";
          return;
        }
        window.location.href = "/dashboard";
      }, 1800);
    } catch (err) {
      setError(err?.message || "Failed to request payout");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingMeta) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-slate-50">
        <Aurora />
        <Loader2 className="relative h-7 w-7 animate-spin text-blue-600" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Aurora />
        <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
          <h1 className="mt-4 text-2xl font-semibold text-slate-900">Payout requested</h1>
          <p className="mt-2 text-sm text-slate-600">You will be redirected to dashboard automatically.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <Aurora />

      <div className="relative mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <button
          onClick={() => navigate(`/workroom/${workroomId}`)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Back to workroom
        </button>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Freelancer payout</h1>
        <p className="mt-2 text-sm text-slate-600">
          Submit your UPI ID to receive payout for workroom <span className="font-medium text-slate-700">{workroomId}</span>.
        </p>

        {meta?.role !== "worker" ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Only the selected freelancer can submit payout details.
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            UPI ID
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="yourname@upi"
              disabled={meta?.role !== "worker" || submitting}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </label>

          <button
            type="submit"
            disabled={meta?.role !== "worker" || submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? "Submitting..." : "Submit payout request"}
          </button>
        </form>
      </div>
    </div>
  );
}
