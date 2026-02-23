import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import Aurora from "../components/workroom/Aurora";

export default function WorkroomComplete() {
  const { workroomId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4">
      <Aurora />
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">Task finalized</h1>
        <p className="mt-2 text-sm text-slate-600">
          Both parties finalized workroom {workroomId}. Chat is now locked.
        </p>
        <button
          onClick={() => navigate(`/workroom/${workroomId}/payment`)}
          className="mt-6 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Continue to payout
        </button>
      </div>
    </div>
  );
}
