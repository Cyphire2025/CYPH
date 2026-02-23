import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:5000";
const SIGN_IN_ROUTE = "/signin";
const HOME_ROUTE = "/home";

let inflightAuthCheck: Promise<boolean> | null = null;

async function readSessionStatus(): Promise<boolean> {
  if (inflightAuthCheck) return inflightAuthCheck;

  inflightAuthCheck = fetch(`${API_BASE}/api/auth/me`, {
    credentials: "include",
    cache: "no-store",
  })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      inflightAuthCheck = null;
    });

  return inflightAuthCheck;
}

function useCookieAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      const ok = await readSessionStatus();
      if (!alive) return;
      setIsAuthenticated(ok);
      setIsLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  return { isLoading, isAuthenticated };
}

// If user is not authenticated by cookie-backed session, redirect to sign-in.
export const ProtectedRoute = () => {
  const { isLoading, isAuthenticated } = useCookieAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50" role="status" aria-label="Checking session" />
    );
  }
  return isAuthenticated ? <Outlet /> : <Navigate to={SIGN_IN_ROUTE} replace />;
};

// If user is already authenticated, redirect away from public-only pages.
export const PublicOnlyRoute = () => {
  const { isLoading, isAuthenticated } = useCookieAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50" role="status" aria-label="Checking session" />
    );
  }
  return isAuthenticated ? <Navigate to={HOME_ROUTE} replace /> : <Outlet />;
};
