import React from "react";
import { RefreshCcw, WifiOff, CheckCircle2, Clock3 } from "lucide-react";

const formatCurrency = (value) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return "--";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
};

const formatDate = (value) => {
  if (!value) return "No deadline";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No deadline";
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function WorkroomHeader({
  meta,
  workroomId,
  isOnline,
  bothFinalised,
  onRefresh,
  onFinalize,
  finalizing,
}) {
  return (
    <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">{meta?.title || "Workroom"}</h1>
            <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
              {meta?.role === "client" ? "Client" : "Freelancer"}
            </span>
            {bothFinalised ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Finalized
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                <Clock3 className="h-3.5 w-3.5" /> In progress
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500">
            Room {String(workroomId || "").slice(0, 12)} | Budget {formatCurrency(meta?.price)} | Due {formatDate(meta?.deadline)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isOnline && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
              <WifiOff className="h-3.5 w-3.5" /> Offline
            </span>
          )}

          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCcw className="h-4 w-4" /> Refresh
          </button>

          {!bothFinalised && (
            <button
              onClick={onFinalize}
              disabled={finalizing}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {finalizing ? "Finalizing..." : "Finalize"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
