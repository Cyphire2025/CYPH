import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import bgImage from "../assets/bg.jpg";
import { apiFetch } from "../lib/fetch";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:5000";



export default function AdminLogin() {
  const [form, setForm] = useState({ email: "", password: "", secret: "" });
  const [error, setError] = useState("");
  const [show, setShow] = useState({ password: false, secret: false });
  const emailRef = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const handleLogin = async () => {
    try {
      setError("");
      if (!form.email || !form.password || !form.secret) {
        return setError("All fields are required.");
      }

      const res = await apiFetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Login failed");
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Something went wrong");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 text-white bg-cover bg-center"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-sm bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 shadow-[0_0_25px_#7f5af0] hover:shadow-[0_0_35px_#7f5af0] transition-shadow duration-500"
      >
        <h1 className="text-3xl font-bold mb-6 text-center">Admin Login</h1>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-400 bg-red-400/10 border border-red-400/30 rounded-md px-3 py-2 mb-4"
          >
            {error}
          </motion.p>
        )}

        <div className="space-y-5">
          {/* Email */}
          <input
            ref={emailRef}
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
          />

          {/* Password */}
          <div className="relative">
            <input
              type={show.password ? "text" : "password"}
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-2 pr-10 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 transition"
            />
            <button
              type="button"
              onClick={() => setShow((s) => ({ ...s, password: !s.password }))}
              className="absolute inset-y-0 right-3 flex items-center text-white/50 hover:text-white transition"
            >
              {show.password ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Secret Key */}
          <div className="relative">
            <input
              type={show.secret ? "text" : "password"}
              placeholder="Secret Key"
              value={form.secret}
              onChange={(e) => setForm({ ...form, secret: e.target.value })}
              className="w-full px-4 py-2 pr-10 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
            />
            <button
              type="button"
              onClick={() => setShow((s) => ({ ...s, secret: !s.secret }))}
              className="absolute inset-y-0 right-3 flex items-center text-white/50 hover:text-white transition"
            >
              {show.secret ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleLogin}
          className="mt-6 w-full rounded-lg bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600 px-4 py-2 font-semibold hover:shadow-md hover:shadow-fuchsia-500/30 transition-all duration-300"
        >
          Sign In
        </motion.button>
      </motion.div>
    </div>
  );
}
