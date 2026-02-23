import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Building2, CalendarDays, Sparkles } from "lucide-react";
import Navbar from "../components/navbarsponhome";
import Footer from "../components/footer";

const Background = () => (
  <div className="absolute inset-0 -z-10 h-full w-full bg-slate-50 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
    <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[320px] w-[320px] rounded-full bg-blue-400 opacity-15 blur-[100px]" />
    <div className="absolute right-0 bottom-0 -z-10 h-[320px] w-[320px] rounded-full bg-indigo-400 opacity-15 blur-[100px]" />
  </div>
);

const ModeCard = ({ icon: Icon, title, desc, mode, accent = "blue" }) => {
  const navigate = useNavigate();
  const accentClasses =
    accent === "purple"
      ? {
          chip: "border-purple-100 bg-purple-50 text-purple-700",
          border: "hover:border-purple-200 focus-visible:border-purple-300",
          arrow: "text-purple-600",
        }
      : {
          chip: "border-blue-100 bg-blue-50 text-blue-700",
          border: "hover:border-blue-200 focus-visible:border-blue-300",
          arrow: "text-blue-600",
        };

  return (
    <motion.button
      type="button"
      onClick={() => navigate(`/sponsorshiphome?mode=${mode}`)}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5 }}
      className={`group w-full rounded-3xl border border-slate-200 bg-white p-8 text-left shadow-sm transition-all hover:shadow-md focus-visible:outline-none ${accentClasses.border}`}
      aria-label={title}
    >
      <div className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${accentClasses.chip}`}>
        <Icon className="h-4 w-4" />
        Model
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
      <p className="mt-3 text-slate-600 leading-relaxed">{desc}</p>
      <div className={`mt-7 inline-flex items-center gap-2 text-sm font-semibold ${accentClasses.arrow}`}>
        Continue
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </motion.button>
  );
};

export default function SponsorshipModeChoose() {
  useEffect(() => {
    sessionStorage.setItem("lastHomeRoute", "/sponsorship-mode");
  }, []);

  return (
    <div className="relative min-h-screen bg-slate-50 font-sans text-slate-900">
      <Navbar />
      <Background />

      <main className="relative mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6">
        <header className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <Sparkles className="h-4 w-4" />
            Sponsorship Marketplace
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Choose Your Sponsorship Workflow
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Select a model to enter the same marketplace experience, pre-configured for that side.
          </p>
        </header>

        <section className="mt-12 grid gap-6 lg:grid-cols-2">
          <ModeCard
            icon={Building2}
            title="Sponsors Post, Organizers Discover"
            desc="Companies publish sponsorship opportunities and event organizers discover, evaluate, and connect."
            mode="sponsorships"
            accent="blue"
          />

          <ModeCard
            icon={CalendarDays}
            title="Event Organizers Post, Sponsors Discover"
            desc="Organizers publish events and sponsor brands discover where to invest and collaborate."
            mode="events"
            accent="purple"
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}
