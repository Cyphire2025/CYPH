import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { InteractiveNebulaShader } from "@/components/ui/liquid-shader";

const API_BASE =
  import.meta?.env?.VITE_API_BASE ||
  (typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:5000"
    : "https://cyphire.onrender.com");

export default function LandingNewPage() {
  const navigate = useNavigate();

  const handleGetStarted = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
      if (res.ok) {
        navigate("/choose");
        return;
      }
    } catch {
      // ignore auth check failures and route to signup
    }
    navigate("/signup?next=/choose");
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <InteractiveNebulaShader className="z-0" disableCenterDimming />
      <div className="absolute inset-0 z-[1] bg-black/5 pointer-events-none" />

      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          aria-hidden="true"
          className="absolute h-40 w-72 rounded-full blur-3xl bg-gradient-to-r from-cyphirePurple/45 via-fuchsia-500/45 to-cyphirePink/45"
          animate={{ scale: [1, 1.15, 1], opacity: [0.65, 1, 0.65] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.h1
          className="relative text-6xl sm:text-7xl md:text-8xl font-extrabold tracking-tight bg-clip-text text-transparent bg-[length:220%_220%] bg-gradient-to-r from-violet-300 via-fuchsia-400 to-purple-300 drop-shadow-[0_12px_34px_rgba(168,85,247,0.55)]"
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            scale: [1, 1.015, 1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        >
          Cyphire
        </motion.h1>

        <motion.button
          type="button"
          onClick={handleGetStarted}
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.97 }}
          className="group relative mt-10 rounded-2xl p-[1.5px] bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 shadow-[0_12px_40px_rgba(192,132,252,0.45)]"
        >
          <span className="relative inline-flex items-center justify-center min-w-[210px] rounded-2xl bg-black/55 backdrop-blur-xl px-8 py-3 text-base font-semibold text-white border border-white/20 overflow-hidden">
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ["-120%", "140%"] }}
              transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 0.7, ease: "easeInOut" }}
            />
            <span className="relative">Get Started</span>
          </span>
        </motion.button>
      </section>
    </main>
  );
}
