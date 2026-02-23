import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import NavbarHome from "../components/navbarhome";
import NavbarSpon from "../components/navbarsponhome";
import Footer from "../components/footer";
import {
  ArrowLeft,
  Briefcase,
  CalendarClock,
  ChevronDown,
  FolderOpen,
  Globe2,
  Layers,
  Link as LinkIcon,
  Loader2,
  ShieldCheck,
  Sparkles,
  Tag,
  UserRound,
} from "lucide-react";
import { apiFetch } from "../lib/fetch";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:5000";

const DOMAIN_LABELS = {
  tech: "Technology",
  education: "Education",
  event: "Event",
  architecture: "Architecture",
};

const EXPERTISE_LABELS = {
  starter: "Starter",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
};

const AVAILABILITY_LABELS = {
  open: "Open",
  limited: "Limited",
  booked: "Booked",
  "not-looking": "Not looking",
};

const parseJsonSafe = async (res) => {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await res.json();
  const txt = await res.text();
  throw new Error(`Unexpected ${res.status} ${res.statusText}: ${txt.slice(0, 160)}`);
};

const toArray = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);

const InfoCard = ({ title, icon: Icon, children, className = "" }) => (
  <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
    <div className="mb-4 flex items-center gap-2 text-slate-900">
      {Icon ? <Icon className="h-4.5 w-4.5 text-blue-600" /> : null}
      <h2 className="text-base font-semibold">{title}</h2>
    </div>
    {children}
  </section>
);

const CollapsibleCard = ({
  title,
  icon: Icon,
  open,
  onToggle,
  badge,
  children,
  className = "",
}) => (
  <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      aria-expanded={open}
    >
      <div className="flex min-w-0 items-center gap-2">
        {Icon ? <Icon className="h-4.5 w-4.5 shrink-0 text-blue-600" /> : null}
        <h2 className="truncate text-base font-semibold text-slate-900">{title}</h2>
        {badge ? (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {badge}
          </span>
        ) : null}
      </div>
      <ChevronDown
        className={`h-4.5 w-4.5 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
      />
    </button>
    {open ? <div className="border-t border-slate-200 px-5 py-4">{children}</div> : null}
  </section>
);

const Chip = ({ children, tone = "default" }) => {
  const toneClass =
    tone === "blue"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${toneClass}`}>
      {children}
    </span>
  );
};

const ListField = ({ label, values }) => {
  const arr = toArray(values);
  if (!arr.length) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-2">
        {arr.map((v, idx) => (
          <Chip key={`${label}-${idx}`}>{v}</Chip>
        ))}
      </div>
    </div>
  );
};

const TextField = ({ label, value }) => {
  if (!String(value || "").trim()) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{value}</p>
    </div>
  );
};

const MediaTile = ({ media }) => {
  const url = media?.url || "";
  const isVideo = (media?.contentType || "").startsWith("video/") || /\.(mp4|webm|ogg)$/i.test(url);

  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="group block overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
    >
      {isVideo ? (
        <video src={url} className="h-40 w-full object-cover" controls />
      ) : (
        <img
          src={url}
          alt={media?.original_name || "Project media"}
          className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
      )}
    </a>
  );
};

export default function ViewProfilePage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const Nav = useMemo(() => {
    const last = sessionStorage.getItem("lastHomeRoute");
    return last === "/sponsorshiphome" || last === "/sponsorship-mode" ? NavbarSpon : NavbarHome;
  }, []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [profile, setProfile] = useState(null);
  const [openSections, setOpenSections] = useState({
    skills: false,
    snapshot: false,
    capabilities: false,
    domains: false,
    projects: false,
  });

  const initial = useMemo(() => {
    const n = String(profile?.name || "U").trim();
    return n ? n.charAt(0).toUpperCase() : "U";
  }, [profile]);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await apiFetch(`${API_BASE}/api/users/slug/${slug}/public`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });

        const data = await parseJsonSafe(res);
        if (!res.ok) throw new Error(data?.error || "Profile not found");

        const user = data?.user || data;
        if (!alive) return;

        setProfile({
          _id: user?._id,
          slug: user?.slug,
          name: user?.name || "",
          bio: user?.bio || "",
          avatar: user?.avatar || "",
          country: user?.country || "",
          skills: toArray(user?.skills),
          projects: toArray(user?.projects),
          professionalProfile:
            user?.professionalProfile && typeof user.professionalProfile === "object"
              ? user.professionalProfile
              : {},
        });
      } catch (e) {
        if (alive) setErr(e?.message || "Failed to load profile");
      } finally {
        if (alive) setLoading(false);
      }
    };

    if (slug) load();

    return () => {
      alive = false;
    };
  }, [slug]);

  const pp = profile?.professionalProfile || {};
  const domainDetails = pp?.domainDetails && typeof pp.domainDetails === "object" ? pp.domainDetails : {};
  const selectedDomains = toArray(pp?.domains);
  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Nav />

      <main className="relative mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6">
        <div className="pointer-events-none absolute -left-16 -top-8 h-64 w-64 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-16 h-56 w-56 rounded-full bg-indigo-200/35 blur-3xl" />

        <div className="relative mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          {profile?.slug ? (
            <Link
              to={`/u/${profile.slug}`}
              className="text-xs font-medium text-blue-700 hover:text-blue-800"
            >
              /u/{profile.slug}
            </Link>
          ) : null}
        </div>

        {err ? (
          <div className="relative mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
        ) : null}

        {loading ? (
          <div className="relative flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-sm text-slate-600">Loading profile...</span>
          </div>
        ) : profile ? (
          <div className="relative grid gap-6 lg:grid-cols-12">
            <aside className="space-y-6 lg:col-span-4 xl:col-span-3">
              <InfoCard title="Profile" icon={UserRound}>
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                    {profile.avatar ? (
                      <img
                        src={profile.avatar}
                        className="h-full w-full object-cover"
                        alt={`${profile.name || "User"} avatar`}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-slate-600">{initial}</span>
                    )}
                  </div>

                  <h1 className="text-xl font-semibold text-slate-900">{profile.name || "Unnamed user"}</h1>
                  {profile.bio ? <p className="mt-2 text-sm text-slate-600">{profile.bio}</p> : null}

                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    {profile.country ? (
                      <Chip tone="blue">
                        <span className="inline-flex items-center gap-1.5">
                          <Globe2 className="h-3.5 w-3.5" /> {profile.country}
                        </span>
                      </Chip>
                    ) : null}
                    {pp?.expertiseLevel ? <Chip tone="emerald">{EXPERTISE_LABELS[pp.expertiseLevel] || pp.expertiseLevel}</Chip> : null}
                  </div>
                </div>
              </InfoCard>

              <CollapsibleCard
                title="Skills"
                icon={Tag}
                badge={profile.skills.length ? `${profile.skills.length}` : "0"}
                open={openSections.skills}
                onToggle={() => toggleSection("skills")}
              >
                {profile.skills.length ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((s, i) => (
                      <Chip key={`${s}-${i}`}>{s}</Chip>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No skills listed.</p>
                )}
              </CollapsibleCard>
            </aside>

            <section className="space-y-6 lg:col-span-8 xl:col-span-9">
              <CollapsibleCard
                title="Professional Snapshot"
                icon={Sparkles}
                open={openSections.snapshot}
                onToggle={() => toggleSection("snapshot")}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label="Headline" value={pp?.headline} />
                  <TextField label="Value Proposition" value={pp?.valueProposition} />
                  <TextField label="Years Experience" value={pp?.yearsExperience != null ? `${pp.yearsExperience} years` : ""} />
                  <TextField label="Availability" value={AVAILABILITY_LABELS[pp?.availability] || pp?.availability} />
                  <TextField label="Response SLA" value={pp?.responseSla} />
                </div>
              </CollapsibleCard>

              <CollapsibleCard
                title="Capabilities"
                icon={Layers}
                open={openSections.capabilities}
                onToggle={() => toggleSection("capabilities")}
              >
                <div className="space-y-5">
                  <ListField label="Service Lines" values={pp?.serviceLines} />
                  <ListField label="Tools & Stack" values={pp?.toolsAndStack} />
                  <ListField label="Engagement Modes" values={pp?.engagementModes} />
                  <ListField label="Certifications" values={pp?.certifications} />
                  <ListField label="Achievements" values={pp?.achievements} />
                  <ListField label="Portfolio Highlights" values={pp?.portfolioHighlights} />
                </div>
              </CollapsibleCard>

              <CollapsibleCard
                title="Domain Details"
                icon={ShieldCheck}
                badge={selectedDomains.length ? `${selectedDomains.length}` : "0"}
                open={openSections.domains}
                onToggle={() => toggleSection("domains")}
              >
                {selectedDomains.length ? (
                  <div className="space-y-4">
                    {selectedDomains.map((domainKey) => {
                      const detail = domainDetails?.[domainKey] || {};
                      return (
                        <div key={domainKey} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <p className="mb-3 text-sm font-semibold text-slate-900">{DOMAIN_LABELS[domainKey] || domainKey}</p>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <ListField label="Focus Areas" values={detail?.focusAreas} />
                            <ListField label="Primary Stack" values={detail?.primaryStack} />
                            <ListField label="Deliverables" values={detail?.deliverables} />
                            <TextField label="Proof Points" value={detail?.proofPoints} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No domain details added.</p>
                )}
              </CollapsibleCard>

              <CollapsibleCard
                title="Projects"
                icon={FolderOpen}
                badge={profile.projects.length ? `${profile.projects.length}` : "0"}
                open={openSections.projects}
                onToggle={() => toggleSection("projects")}
              >
                {!profile.projects.length ? (
                  <p className="text-sm text-slate-500">No projects yet.</p>
                ) : (
                  <div className="space-y-5">
                    {profile.projects.map((project, idx) => {
                      const link = String(project?.link || "").trim();
                      const normalized = link && !/^https?:\/\//i.test(link) ? `https://${link}` : link;

                      return (
                        <article key={`proj-${idx}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <h3 className="text-base font-semibold text-slate-900">{project?.title || `Project ${idx + 1}`}</h3>
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
                              <Briefcase className="h-3.5 w-3.5" /> #{idx + 1}
                            </span>
                          </div>

                          <TextField label="Description" value={project?.description} />

                          {normalized ? (
                            <a
                              href={normalized}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800"
                            >
                              <LinkIcon className="h-4 w-4" /> {link}
                            </a>
                          ) : null}

                          {toArray(project?.media).length ? (
                            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {project.media.map((m, j) => (
                                <MediaTile key={`proj-${idx}-media-${j}`} media={m} />
                              ))}
                            </div>
                          ) : (
                            <p className="mt-3 text-xs text-slate-500">No media uploaded.</p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </CollapsibleCard>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-sm">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-blue-600" />
                  Public profile data shown here comes from the user's current profile settings.
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="relative rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Profile not available.
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
