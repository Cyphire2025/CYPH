import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiFetch } from "../lib/fetch";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:5000";

export default function AdminProtectedRoute({ children }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const res = await apiFetch(`${API_BASE}/api/admin/stats/users`);
        if (!active) return;
        setStatus(res.ok ? "authed" : "unauth");
      } catch {
        if (active) setStatus("unauth");
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  if (status === "checking") return null;
  if (status !== "authed") return <Navigate to="/login" replace />;

  return children;
}
