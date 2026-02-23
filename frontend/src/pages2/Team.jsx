import React, { Suspense, useMemo } from "react";
import { motion } from "framer-motion";
import { Building2, Cpu, Handshake, ShieldCheck } from "lucide-react";
import NipunImg from "../assets/nipun.jpeg";
import KhushiImg from "../assets/khushi.jpeg";
import NavbarSpon from "../components/navbarsponhome.jsx";
import NavbarHome from "../components/navbarhome.jsx";
import Footer from "../components/footer";
import { GradientText, GlassCard } from "../pages/home.jsx";

const Aurora = () => (
  <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
    <div className="absolute -inset-x-40 -top-40 h-[50rem] bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.05),transparent_60%)]" />
    <div className="absolute -inset-x-20 -top-20 h-[50rem] bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.05),transparent_60%)]" />
    <div className="absolute inset-x-0 bottom-0 h-[40rem] bg-[radial-gradient(ellipse_at_bottom,rgba(14,165,233,0.05),transparent_60%)]" />
  </div>
);

const Particles = () => (
  <div className="pointer-events-none absolute inset-0 -z-10">
    {Array.from({ length: 40 }).map((_, i) => (
      <span
        key={i}
        className="absolute h-1 w-1 rounded-full bg-slate-300/40"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animation: `float${i % 3} ${6 + (i % 5)}s ease-in-out ${i * 0.15}s infinite`,
          opacity: 0.6,
        }}
      />
    ))}
    <style>{`
      @keyframes float0 { 0%,100%{ transform: translateY(0)} 50%{ transform: translateY(-12px)} }
      @keyframes float1 { 0%,100%{ transform: translateY(0)} 50%{ transform: translateY(-18px)} }
      @keyframes float2 { 0%,100%{ transform: translateY(0)} 50%{ transform: translateY(-24px)} }
    `}</style>
  </div>
);

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.8, ease: "easeOut" },
  viewport: { once: true },
});

const founders = [
  {
    name: "Nipun Vashistha",
    role: "Founder - Technology",
    img: NipunImg,
    imagePosition: "center 18%",
    bio: "Nipun leads Cyphire's product and engineering, building the core platform architecture and technical execution.",
    focus: "Platform Architecture & Product Engineering",
  },
  {
    name: "Khushi Khanna",
    role: "Co-Founder - Business Operations",
    img: KhushiImg,
    imagePosition: "center 20%",
    bio: "Khushi drives early business operations, focusing on foundational outreach, partner coordination, and operational basics.",
    focus: "Business Operations & Partner Coordination",
  },
];

const operatingPrinciples = [
  {
    title: "Technical Rigor",
    desc: "Engineering decisions are made for reliability, performance, and long-term scale.",
    icon: <Cpu className="h-5 w-5" />,
  },
  {
    title: "Operational Clarity",
    desc: "Execution runs on clear ownership, lean processes, and measurable milestones.",
    icon: <Building2 className="h-5 w-5" />,
  },
  {
    title: "Trust by Design",
    desc: "Product and operations are aligned to keep every collaboration secure and transparent.",
    icon: <ShieldCheck className="h-5 w-5" />,
  },
];

export default function Teams() {
  const Nav = useMemo(() => {
    const last = sessionStorage.getItem("lastHomeRoute");
    return last === "/sponsorshiphome" ? NavbarSpon : NavbarHome;
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden font-sans">
      <main className="relative overflow-hidden">
        <Suspense fallback={<div className="text-center p-6">Loading...</div>}>
          <Nav />
          <Aurora />
          <Particles />
        </Suspense>

        <section className="relative mx-auto max-w-6xl px-6 pt-28 pb-16 text-center">
          <motion.div
            {...fadeUp(0.05)}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
          >
            <Handshake className="h-4 w-4" />
            Founding Leadership
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="text-4xl font-bold sm:text-5xl md:text-6xl text-slate-900 tracking-tight"
          >
            <GradientText>Meet the Team</GradientText>
          </motion.h1>

          <motion.p
            {...fadeUp(0.25)}
            className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 leading-relaxed"
          >
            Cyphire is currently led by a focused two-person founding team.
          </motion.p>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-3xl font-bold text-center md:text-4xl text-slate-900">
            <GradientText>Founding Team</GradientText>
          </h2>

          <div className="mx-auto mt-12 grid max-w-5xl gap-8 md:grid-cols-2">
            {founders.map((member, i) => (
              <motion.div key={member.name} {...fadeUp(i * 0.15)}>
                <GlassCard className="h-full overflow-hidden border-slate-200 bg-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-xl hover:border-blue-200">
                  <div className="flex justify-center border-b border-slate-100 bg-gradient-to-b from-slate-100 to-slate-50 p-5">
                    <div className="relative aspect-[3/4] w-44 overflow-hidden rounded-2xl ring-1 ring-slate-200 shadow-sm sm:w-52">
                      <img
                        src={member.img}
                        alt={member.name}
                        style={{ objectPosition: member.imagePosition }}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 p-6">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">{member.name}</h3>
                      <p className="mt-1 text-sm font-medium text-blue-600">{member.role}</p>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600">{member.bio}</p>
                    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                      {member.focus}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <motion.div {...fadeUp(0.05)}>
            <GlassCard className="overflow-hidden border-slate-200 bg-white shadow-md">
              <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-sky-50 p-6">
                <h3 className="text-2xl font-bold text-slate-900">
                  <GradientText>How We Operate</GradientText>
                </h3>
                <p className="mt-2 max-w-3xl text-slate-600">
                  Cyphire is being built with a high-bar operating style: product depth, disciplined execution, and trust-first systems.
                </p>
              </div>

              <div className="grid gap-5 p-6 md:grid-cols-3">
                {operatingPrinciples.map((item, i) => (
                  <motion.div
                    key={item.title}
                    {...fadeUp(0.1 + i * 0.1)}
                    className="rounded-2xl border border-slate-200 bg-white p-5"
                  >
                    <div className="mb-3 inline-flex rounded-lg bg-blue-50 p-2 text-blue-600">{item.icon}</div>
                    <h4 className="text-base font-semibold text-slate-900">{item.title}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </section>

        <Footer />
      </main>
    </div>
  );
}
